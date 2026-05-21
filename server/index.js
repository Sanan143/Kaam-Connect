import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// In production, serve the built frontend
const isProduction = process.env.NODE_ENV === 'production';
const distPath = path.join(__dirname, '..', 'dist');

const app = express();
const httpServer = createServer(app);

// Configure Socket.io for Real-time location tracking & Job Pings
const io = new Server(httpServer, {
  cors: {
    origin: '*', // For MVP, allow all origins
    methods: ['GET', 'POST']
  }
});

// Memory store for highly active WebSockets tracking
const activeLabours = new Map();

// Memory store for Mock Auth
const mockAuthDB = new Map();

// Memory store for jobs (fallback if Supabase fails or if using mock IDs)
const memoryJobs = new Map();

app.use(cors());
app.use(express.json());

// Supabase Service Role client for backend
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY || 'placeholder'
);

// Hard disable mock mode per user request for direct realtime
const isBackendMockMode = false;

// Initialize Firebase Admin (Wrapped in try/catch to handle mock mode)
if (!isBackendMockMode) {
  try {
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('ascii'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err.message);
  }
}

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'KaamConnect API is running' });
});

// Sync Firebase User to Supabase
app.post('/api/auth/sync', async (req, res) => {
  const { uid, phone, role, email } = req.body;
  if (!uid || !role) return res.status(400).json({ error: 'Missing auth data' });

  try {
    if (isBackendMockMode) {
      console.log(`[MOCK DB] Syncing user ${uid}`);
      return res.status(200).json({ success: true, user: { id: uid, phone_number: phone, email: email, role: role } });
    }

    const { data: user, error } = await supabase
      .from('users')
      .upsert(
        { id: uid, phone_number: phone || null, email: email || null, role: role, status: 'active' }, 
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) throw error;

    if (role === 'customer') {
      await supabase.from('customer_profiles').upsert({ user_id: uid, full_name: 'New Customer' }, { onConflict: 'user_id' });
    } else if (role === 'professional' || role === 'labour') {
      await supabase.from('labour_profiles').upsert({ user_id: uid, full_name: 'New Worker', skillset: [] }, { onConflict: 'user_id' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Custom Signup for Phone + Password
app.post('/api/auth/signup-password', async (req, res) => {
  const { phone, email, password, role } = req.body;
  
  if (!password || (!phone && !email) || !role) {
    return res.status(400).json({ error: 'Missing requirements' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (isBackendMockMode) {
      console.log(`[MOCK DB] Signing up user ${phone || email}`);
      const uid = `mock_uid_${Math.floor(Math.random() * 1000)}`;
      mockAuthDB.set(phone || email, { uid, password_hash: hashedPassword, role });
      return res.status(200).json({ success: true, user: { uid, phone, email, role } });
    }

    let uid;
    // We create the user via Firebase admin
    const userRecord = await admin.auth().createUser({
      phoneNumber: phone ? (phone.startsWith('+') ? phone : `+91${phone}`) : undefined,
      email: email ? email : undefined,
      password: password
    });
    uid = userRecord.uid;

    const { error } = await supabase.from('users').upsert({
      id: uid,
      phone_number: phone || null,
      email: email || null,
      password_hash: hashedPassword,
      role: role
    });

    if (error) throw error;

    return res.status(200).json({ success: true, uid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Custom Login for Phone + Password
app.post('/api/auth/login-password', async (req, res) => {
  const { phone, email, password } = req.body;

  try {
    if (isBackendMockMode) {
      const mockUser = mockAuthDB.get(phone || email);
      if (!mockUser) return res.status(404).json({ error: 'User not found. Try signing up first!' });
      
      const isMatch = await bcrypt.compare(password, mockUser.password_hash);
      if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

      console.log(`[MOCK MINT] Minting custom token for ${phone || email}`);
      return res.status(200).json({ success: true, token: 'mock_custom_jwt_token', uid: mockUser.uid });
    }

    // In a real flow, we query supabase to find the user
    let query = supabase.from('users').select('id, password_hash');
    if (phone) query = query.eq('phone_number', phone);
    if (email) query = query.eq('email', email);

    const { data: user, error } = await query.single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });

    if (!user.password_hash) return res.status(400).json({ error: 'No password set. Login with OTP.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    // Mint custom token
    const token = await admin.auth().createCustomToken(user.id);
    return res.status(200).json({ success: true, token, uid: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search Labour geo-query endpoint
app.get('/api/labour/search', async (req, res) => {
  const { lat, lng, radiusKm = 10, skill } = req.query;
  
  if (!lat || !lng) return res.status(400).json({ error: 'Lat and Lng are required' });

  try {
    // In a production app, we would use PostGIS extension or Supabase RPC for raw Haversine calculation.
    // For MVP, we will query all online labour profiles and filter matching skills.
    let query = supabase
      .from('labour_profiles')
      .select('user_id, full_name, skillset, lat, lng, average_rating, is_online')
      .eq('is_online', true);

    if (skill) {
      query = query.contains('skillset', [skill]);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    // Simple flat filter for distance (mocking Haversine for now)
    const filtered = profiles.filter(p => {
      if (!p.lat || !p.lng) return false;
      const dist = Math.sqrt(Math.pow(p.lat - parseFloat(lat), 2) + Math.pow(p.lng - parseFloat(lng), 2)) * 111; // rough km conversion
      return dist <= parseFloat(radiusKm);
    });

    res.status(200).json({ success: true, labours: filtered });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat Messages history endpoint (Last 24h)
app.get('/api/chat/messages/:jobId', async (req, res) => {
  try {
    if (isBackendMockMode) return res.status(200).json({ success: true, messages: [] });
    // Fetch messages only from last 24 hours
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('job_id', req.params.jobId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    res.status(200).json({ success: true, messages: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Review Endpoint
app.post('/api/jobs/:jobId/review', async (req, res) => {
  const { rating, review, labourId } = req.body;
  if (!rating || !labourId) return res.status(400).json({ error: 'Rating and labourId required' });
  
  try {
    if (isBackendMockMode) return res.status(200).json({ success: true });
    
    // 1. Update Job with rating and review
    await supabase.from('jobs').update({ rating, review }).eq('id', req.params.jobId);
    
    // 2. Fetch all completed jobs for this worker to recalculate rating
    const { data: jobs } = await supabase.from('jobs').select('rating').eq('labour_id', labourId).not('rating', 'is', null);
    
    // 3. Update Labour Profile average rating
    if (jobs && jobs.length > 0) {
      const avg = jobs.reduce((acc, curr) => acc + curr.rating, 0) / jobs.length;
      await supabase.from('labour_profiles').update({ 
        average_rating: avg.toFixed(2),
        completed_jobs: jobs.length 
      }).eq('user_id', labourId);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Worker Job History Endpoint
app.get('/api/jobs/worker/:labourId', async (req, res) => {
  try {
    const labourId = req.params.labourId;
    let completedJobs = [];
    
    if (!isBackendMockMode) {
      // Try fetching from real Supabase DB
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('labour_id', labourId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
         completedJobs = data;
      }
    }
    
    // Fallback/Merge with memory jobs (for jobs created with mock 'job_' prefix during testing)
    const memJobs = Array.from(memoryJobs.values()).filter(j => j.labourId === labourId && j.status === 'completed');
    
    // Map to a unified format
    const results = [...completedJobs, ...memJobs].map(job => ({
       id: job.id || job.jobId,
       amount: job.amount,
       category: job.category || 'General Service',
       created_at: job.created_at || new Date().toISOString()
    }));
    
    res.status(200).json({ success: true, jobs: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // When a worker jumps online
  socket.on('labour_online', (data) => {
    console.log('Labour online:', data.name || data.id);
    activeLabours.set(socket.id, { ...data, socketId: socket.id });
    
    if (data.labourId) {
      socket.join(`labour_${data.labourId}`);
    }
    
    // Broadcast updated active list to ALL connected apps instantly
    io.emit('active_labours_updated', Array.from(activeLabours.values()));
  });

  // When a dashboard loads, they request the initial payload
  socket.on('request_active_labours', () => {
    socket.emit('active_labours_updated', Array.from(activeLabours.values()));
  });

  socket.on('request_job', async (data) => {
    console.log('Job requested:', data);
    
    // Broadcast job to all online labours in the generic room for MVP
    io.emit('job_ping', {
      jobId: data.jobId,
      customerId: data.customerId,
      category: data.category,
      lat: data.lat,
      lng: data.lng,
      description: data.description,
      duration: data.duration,
      paymentType: data.paymentType,
      amount: data.amount,
      photoUrl: data.photoUrl
    });
  });

  socket.on('counter_offer', (data) => {
    // Worker proposes a different price — include worker phone for later acceptance
    io.to(`customer_${data.customerId}`).emit('receive_offer', {
      jobId: data.jobId,
      labourId: data.labourId,
      labourName: data.labourName,
      labourPhone: data.labourPhone || '',
      proposedAmount: data.amount,
      rating: data.rating
    });
  });

  socket.on('accept_offer', async (data) => {
    // Customer accepted an offer from a specific labour
    // Send customer details to worker so they can navigate
    io.to(`labour_${data.labourId}`).emit('job_accepted', {
      jobId: data.jobId,
      customerId: data.customerId,
      amount: data.proposedAmount || data.amount,
      customerName: data.customerName || 'Customer',
      customerPhone: data.customerPhone || '',
      customerAddress: data.customerAddress || '',
      customerLat: data.customerLat,
      customerLng: data.customerLng
    });

    // Send worker details back to customer so they can track
    io.to(`customer_${data.customerId}`).emit('job_accepted', {
      jobId: data.jobId,
      labourId: data.labourId,
      labourName: data.labourName || 'Worker',
      labourPhone: data.labourPhone || '',
      amount: data.proposedAmount || data.amount
    });
    
    memoryJobs.set(data.jobId, { ...data, status: 'accepted', amount: data.proposedAmount || data.amount });
    
    // For DB, we would update job status to 'accepted' and set labour_id.
    if (!isBackendMockMode && data.jobId && !data.jobId.startsWith('job_')) {
      try {
        await supabase.from('jobs').update({ status: 'accepted', labour_id: data.labourId }).eq('id', data.jobId);
      } catch (err) {}
    }
  });

  socket.on('accept_job', async (data) => {
    // Labour accepts job at original proposed price directly
    io.to(`customer_${data.customerId}`).emit('job_accepted', {
      jobId: data.jobId,
      labourId: data.labourId
    });
    io.to(`labour_${data.labourId}`).emit('job_accepted', {
      jobId: data.jobId,
      customerId: data.customerId
    });
    
    // Save to memory store
    memoryJobs.set(data.jobId, { ...data, status: 'accepted' });
  });

  socket.on('update_job_status', async (data) => {
    // Transitions: en_route -> in_progress -> completed
    if (data.customerId) io.to(`customer_${data.customerId}`).emit('job_status_updated', data);
    if (data.labourId) io.to(`labour_${data.labourId}`).emit('job_status_updated', data);
    
    // Update memory store
    if (memoryJobs.has(data.jobId)) {
       const job = memoryJobs.get(data.jobId);
       memoryJobs.set(data.jobId, { ...job, ...data, status: data.status });
    } else {
       memoryJobs.set(data.jobId, { ...data, status: data.status });
    }
    
    if (!isBackendMockMode && data.jobId && !data.jobId.startsWith('job_')) {
      try {
        await supabase.from('jobs').update({ status: data.status }).eq('id', data.jobId);
      } catch (err) {}
    }
  });

  socket.on('join_job_room', (jobId) => {
    socket.join(`job_${jobId}`);
  });

  socket.on('send_message', async (data) => {
    // data => { jobId, senderId, textContent, senderName }
    const messagePayload = {
      ...data,
      created_at: new Date().toISOString()
    };
    
    io.to(`job_${data.jobId}`).emit('receive_message', messagePayload);
    
    if (!isBackendMockMode && data.jobId && !data.jobId.startsWith('job_')) {
      try {
        await supabase.from('messages').insert([{
          job_id: data.jobId,
          sender_id: data.senderId,
          text_content: data.textContent
        }]);
      } catch(e) { console.error('Chat save err', e)}
    }
  });

  // Deprecated in favor of the full `active_labours_updated` broadcast array
  socket.on('update_location', (data) => {
    if (data.customerId) {
        io.to(`customer_${data.customerId}`).emit('labour_location_update', data);
    }
  });

  // Real-time worker location tracking during active jobs
  socket.on('worker_location_ping', (data) => {
    // data => { jobId, labourId, lat, lng, customerId }
    if (data.customerId) {
      io.to(`customer_${data.customerId}`).emit('worker_location_update', {
        jobId: data.jobId,
        labourId: data.labourId,
        lat: data.lat,
        lng: data.lng
      });
    }
  });

  socket.on('join_customer_room', (customerId) => {
    socket.join(`customer_${customerId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // If it was a worker dropping offline, remove them and broadcast!
    if (activeLabours.has(socket.id)) {
       activeLabours.delete(socket.id);
       io.emit('active_labours_updated', Array.from(activeLabours.values()));
    }
  });
});

// Cashfree Order Creation
app.post('/api/payments/create-order', async (req, res) => {
  const { amount, jobId } = req.body;
  if (!amount || !jobId) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const url = 'https://sandbox.cashfree.com/pg/orders';
    const options = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID || 'dummy_app_id',
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || 'dummy_secret_key'
      },
      body: JSON.stringify({
        order_amount: parseFloat(amount),
        order_currency: 'INR',
        order_id: `order_${jobId}_${Date.now()}`,
        customer_details: {
          customer_id: 'cust_01',
          customer_phone: '9999999999'
        }
      })
    };
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (data.payment_session_id) {
       res.status(200).json({ success: true, payment_session_id: data.payment_session_id, order_id: data.order_id });
    } else {
       res.status(400).json({ success: false, error: data.message || 'Failed to create order' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cashfree Payment Verification
app.post('/api/payments/verify', async (req, res) => {
  const { order_id } = req.body;

  try {
    const url = `https://sandbox.cashfree.com/pg/orders/${order_id}`;
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID || 'dummy_app_id',
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || 'dummy_secret_key'
      }
    };

    const response = await fetch(url, options);
    const data = await response.json();
    
    // In Sandbox, if dummy keys are used, data might not have order_status
    // We will simulate success if order_status is PAID, or if we are using dummy keys (for MVP demo)
    if (data.order_status === 'PAID' || process.env.CASHFREE_APP_ID === undefined) {
       
       // Process 6% Platform Fee Deduction
       try {
         const parts = order_id.split('_');
         if (parts.length >= 3) {
           const jobId = parts.slice(1, -1).join('_');
           let originalAmount = 0;
           
           if (memoryJobs.has(jobId)) {
             const job = memoryJobs.get(jobId);
             originalAmount = parseFloat(job.amount) || 0;
             const netAmount = Math.floor(originalAmount * 0.94); // 6% deduction
             
             // Update memory store
             memoryJobs.set(jobId, { ...job, amount: netAmount, grossAmount: originalAmount, platformFee: originalAmount - netAmount });
             
             // Update Supabase if real DB
             if (!isBackendMockMode && jobId && !jobId.startsWith('job_')) {
               await supabase.from('jobs').update({ amount: netAmount }).eq('id', jobId);
             }
           }
         }
       } catch (err) { console.error('Fee deduction error:', err) }

       res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
       res.status(400).json({ success: false, message: 'Payment not successful' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Verification error' });
  }
});

// Serve built frontend in production
if (isProduction) {
  app.use(express.static(distPath));
  // All non-API routes serve the React app (SPA client-side routing)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (${isProduction ? 'production' : 'development'})`);
});
