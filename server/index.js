import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
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

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret'
});

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

  socket.on('accept_job', async (data) => {
    // Labour accepts job
    io.to(`customer_${data.customerId}`).emit('job_accepted', {
      jobId: data.jobId,
      labourId: data.labourId
    });
  });

  // Deprecated in favor of the full `active_labours_updated` broadcast array
  socket.on('update_location', (data) => {
    if (data.customerId) {
        io.to(`customer_${data.customerId}`).emit('labour_location_update', data);
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

// Razorpay Order Creation
app.post('/api/payments/create-order', async (req, res) => {
  const { amount, jobId } = req.body;
  if (!amount || !jobId) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_job_${jobId}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Razorpay Webhook Verification
import crypto from 'crypto';
app.post('/api/payments/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, jobId } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    // Payment is verified
    // 1. Update job status
    // 2. Add transaction record
    // 3. Update labour wallet
    res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid signature' });
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
