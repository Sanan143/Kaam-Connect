import { useState, useEffect, useRef } from 'react';
import { MapPin, Menu, Search, ShoppingBag, User, Home, Wrench, Zap, PaintBucket, Hammer, Leaf, Truck, Star, ChevronRight, X, Bell, CheckCircle, Upload, ImageIcon, Settings, PowerOff, MessageSquare, Send, Phone, Navigation } from 'lucide-react';
import { socket } from '../lib/socket';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const userIcon = new L.DivIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const workerIcon = new L.DivIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color: #22c55e; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

/* ─── Service categories ────────────────────────────────────── */
const SERVICES = [
  {
    id: 'plumber',
    label: 'Plumber',
    icon: Wrench,
    bg: 'hsl(220 80% 93%)',
    iconColor: 'hsl(220 70% 50%)',
  },
  {
    id: 'electrician',
    label: 'Electrician',
    icon: Zap,
    bg: 'hsl(45 90% 90%)',
    iconColor: 'hsl(40 90% 45%)',
  },
  {
    id: 'painter',
    label: 'Painter',
    icon: PaintBucket,
    bg: 'hsl(340 80% 93%)',
    iconColor: 'hsl(340 65% 55%)',
  },
  {
    id: 'carpenter',
    label: 'Carpenter',
    icon: Hammer,
    bg: 'hsl(25 90% 92%)',
    iconColor: 'hsl(25 80% 50%)',
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    icon: Leaf,
    bg: 'hsl(140 60% 90%)',
    iconColor: 'hsl(140 60% 35%)',
  },
  {
    id: 'movers',
    label: 'Movers',
    icon: Truck,
    bg: 'hsl(270 60% 93%)',
    iconColor: 'hsl(270 60% 50%)',
  },
];

/* ─── Mock nearby workers removed - strictly realtime now ───────────────── */
/* ─── Tab enum ──────────────────────────────────────────────── */
const TABS = ['home', 'orders', 'profile'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationLabel, setLocationLabel] = useState('Detecting location…');
  const [userCoords, setUserCoords] = useState([28.6139, 77.2090]); // Default to Delhi
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [liveWorkers, setLiveWorkers] = useState([]);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ 
    name: user?.user_metadata?.full_name || 'Aman Kumar', 
    phone: user?.user_metadata?.phone || '+91 9876543210',
    email: user?.email || 'aman@example.com',
    address: 'Saket, New Delhi',
    profilePic: null 
  });

  // Booking Flow States
  const [bookingWorker, setBookingWorker] = useState(null);
  const [bookingDescription, setBookingDescription] = useState('');
  const [bookingDuration, setBookingDuration] = useState('');
  const [bookingPaymentType, setBookingPaymentType] = useState('hourly');
  const [bookingAmount, setBookingAmount] = useState('');
  const [bookingPhotoFile, setBookingPhotoFile] = useState(null);
  const [bookingPhotoPreview, setBookingPhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  const [activeJobRequest, setActiveJobRequest] = useState(null);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [workerLocation, setWorkerLocation] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePhotoSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Maximum file size is 5MB");
        return;
      }
      setBookingPhotoFile(file);
      setBookingPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingDescription.trim() || !bookingAmount.trim()) {
       alert("Please provide description and amount.");
       return;
    }
    
    setIsUploadingPhoto(true);
    let photoUrl = null;

    if (bookingPhotoFile) {
      try {
        const fileExt = bookingPhotoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('job_photos')
          .upload(filePath, bookingPhotoFile);

        if (uploadError) {
          console.error("Error uploading photo:", uploadError);
          alert("Photo upload failed, continuing without photo MVP");
        } else {
          const { data } = supabase.storage.from('job_photos').getPublicUrl(filePath);
          photoUrl = data.publicUrl;
        }
      } catch (err) {
        console.error("Photo upload exception:", err);
      }
    }

    setIsUploadingPhoto(false);
    
    // Generate a job id
    const jobId = `job_${Math.floor(Math.random() * 10000)}`;
    
    const requestPayload = {
      jobId,
      customerId: user?.uid || 'user_mock_123',
      category: selectedService?.label || 'General',
      lat: userCoords[0],
      lng: userCoords[1],
      description: bookingDescription,
      duration: bookingDuration,
      paymentType: bookingPaymentType,
      amount: bookingAmount,
      photoUrl
    };
    
    socket.emit('request_job', requestPayload);
    setActiveJobRequest(requestPayload);
    setReceivedOffers([]);

    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setBookingDescription('');
      setBookingAmount('');
      setBookingPhotoFile(null);
      setBookingPhotoPreview(null);
      setSelectedService(null);
    }, 2500);
  };

  /* Get city name from coords via reverse geocode */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          setUserCoords([lat, lng]);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const json = await res.json();
          const city =
            json.address?.city ||
            json.address?.town ||
            json.address?.village ||
            json.address?.state ||
            'Current Area';
          setLocationLabel(city);
        } catch {
          setLocationLabel('Current Location');
        }
      },
      () => setLocationLabel('Select Location')
    );
  }, []);

  /* WebSocket Setup */
  useEffect(() => {
    socket.connect();
    
    if (user?.uid) {
      socket.emit('join_customer_room', user.uid);
    } else {
      socket.emit('join_customer_room', 'user_mock_123'); // fallback mock
    }

    socket.emit('request_active_labours');
    socket.on('active_labours_updated', setLiveWorkers);
    
    socket.on('receive_offer', (offer) => {
      setReceivedOffers(prev => [...prev, offer]);
    });

    socket.on('job_accepted', async (data) => {
      setActiveJobRequest(null);
      setActiveJob({ ...data, status: 'accepted' });
      socket.emit('join_job_room', data.jobId);
      
      try {
        const res = await fetch(`/api/chat/messages/${data.jobId}`);
        const json = await res.json();
        if (json.success) setChatMessages(json.messages);
      } catch (err) {}
    });

    socket.on('job_status_updated', (data) => {
      setActiveJob(prev => prev ? { ...prev, status: data.status } : null);
      if (data.status === 'completed') {
        setWorkerLocation(null);
        setPaymentModalOpen(true);
      }
    });

    socket.on('receive_message', (data) => {
      setChatMessages((prev) => [...prev, data]);
    });

    socket.on('worker_location_update', (data) => {
      setWorkerLocation([data.lat, data.lng]);
    });

    return () => {
      socket.off('active_labours_updated');
      socket.off('receive_offer');
      socket.off('job_accepted');
      socket.off('job_status_updated');
      socket.off('receive_message');
      socket.off('worker_location_update');
    };
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeJob) return;
    socket.emit('send_message', {
      jobId: activeJob.jobId,
      senderId: user?.uid || 'user_mock_123',
      senderName: profileData.name,
      textContent: chatInput
    });
    setChatInput('');
  };
  
  const handlePayment = async () => {
    if (!activeJob) return;
    setIsProcessingPayment(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: activeJob.amount, jobId: activeJob.jobId })
      });
      const orderData = await res.json();
      
      if (!orderData.success) {
        alert('Could not initiate payment');
        setIsProcessingPayment(false);
        return;
      }

      const cashfree = window.Cashfree({ mode: "sandbox" });
      
      cashfree.checkout({
        paymentSessionId: orderData.payment_session_id
      }).then(async (result) => {
        if(result.error){
            alert(result.error.message);
            setIsProcessingPayment(false);
        }
        if(result.paymentDetails){
            try {
               await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ order_id: orderData.order_id })
               });
               setPaymentModalOpen(false);
               setReviewModalOpen(true);
            } catch(err) {
               alert('Payment verification failed');
            }
        }
      });
    } catch (err) {
      console.error(err);
      alert('Error processing payment');
      setIsProcessingPayment(false);
    }
  };

  const submitReview = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/jobs/${activeJob.jobId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, review: reviewText, labourId: activeJob.labourId })
      });
      setReviewModalOpen(false);
      setActiveJob(null);
    } catch (err) {
      console.error(err);
      setReviewModalOpen(false);
      setActiveJob(null);
    }
  };

  const handleServiceClick = (svc) => setSelectedService(svc);
  const closeServiceModal = () => setSelectedService(null);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        style={{
          background: '#fff',
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 0 #eee',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: '1.5px solid #22c55e40',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={18} color="#22c55e" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#888', margin: 0, fontWeight: 500 }}>Current Location</p>
            <p style={{ fontSize: 15, color: '#111', margin: 0, fontWeight: 700, lineHeight: '1.2' }}>
              {locationLabel}
            </p>
          </div>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
          aria-label="Menu"
        >
          <span style={{ display: 'block', width: 22, height: 2, background: '#222', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#222', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#222', borderRadius: 2 }} />
        </button>
      </header>

      {/* ── Scrollable Content ──────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {activeTab === 'home' && (
          <>
            {activeJob ? (
              <div style={{ padding: '24px 16px' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 16px' }}>Active Order</h2>

                {/* Worker Contact Card */}
                <div style={{ background: 'linear-gradient(135deg, #111827, #1e293b)', borderRadius: 20, padding: '20px', marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0, boxShadow: '0 4px 12px rgba(34,197,94,0.4)' }}>
                      {(activeJob.labourName || 'W').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>{activeJob.labourName || 'Worker'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                        {activeJob.status === 'accepted' ? '📍 Assigned to your job' : activeJob.status === 'en_route' ? '🚗 On the way to you' : '🔧 Working at your location'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {activeJob.labourPhone && (
                        <a href={`tel:${activeJob.labourPhone}`} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(34,197,94,0.4)', textDecoration: 'none' }}>
                          <Phone size={18} />
                        </a>
                      )}
                      <button onClick={() => setChatOpen(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(59,130,246,0.4)' }}>
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  </div>
                  {activeJob.labourPhone && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Phone size={14} color="#94a3b8" />
                      <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{activeJob.labourPhone}</span>
                    </div>
                  )}
                </div>

                {/* Live Tracking Map */}
                {(activeJob.status === 'en_route' || activeJob.status === 'accepted') && (
                  <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '2px solid #e2e8f0' }}>
                    <div style={{ background: '#f0fdf4', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
                      <Navigation size={16} color="#16a34a" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                        {activeJob.status === 'en_route' ? 'Tracking Worker Live' : 'Worker Location'}
                      </span>
                      {activeJob.status === 'en_route' && (
                        <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                      )}
                    </div>
                    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
                    <div style={{ height: 200, zIndex: 0 }}>
                      <MapContainer center={workerLocation || userCoords} zoom={14} style={{ width: '100%', height: '100%', zIndex: 0 }} zoomControl={false} attributionControl={false}>
                        <ChangeView center={workerLocation || userCoords} />
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                        <Marker position={userCoords} icon={userIcon}>
                          <Popup>Your Location</Popup>
                        </Marker>
                        {workerLocation && (
                          <Marker position={workerLocation} icon={workerIcon}>
                            <Popup>{activeJob.labourName || 'Worker'}</Popup>
                          </Marker>
                        )}
                      </MapContainer>
                    </div>
                  </div>
                )}

                {/* Status + Price Card */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: '#888', fontWeight: 600 }}>Job #{activeJob.jobId}</p>
                    </div>
                  </div>
                  <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 12, display: 'flex', gap: 10, marginBottom: 20 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Agreed Price</p>
                      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: '#16a34a' }}>₹{activeJob.amount}</p>
                    </div>
                    <div style={{ width: 1, background: '#ddd' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Status</p>
                      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 800, color: '#333' }}>
                        {activeJob.status === 'accepted' ? 'Worker Assigned' : activeJob.status === 'en_route' ? 'Worker En Route' : 'Job In Progress'}
                      </p>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
                    {[
                      { key: 'accepted', label: 'Worker Assigned', emoji: '✅', desc: 'Your worker has been confirmed' },
                      { key: 'en_route', label: 'On The Way', emoji: '🚗', desc: 'Worker is heading to your location' },
                      { key: 'in_progress', label: 'Work Started', emoji: '🔧', desc: 'Worker arrived and started the job' },
                      { key: 'completed', label: 'Completed', emoji: '🎉', desc: 'Job finished!' }
                    ].map((step, idx, arr) => {
                      const statusOrder = ['accepted', 'en_route', 'in_progress', 'completed'];
                      const currentIdx = statusOrder.indexOf(activeJob.status);
                      const stepIdx = statusOrder.indexOf(step.key);
                      const isDone = stepIdx <= currentIdx;
                      const isCurrent = stepIdx === currentIdx;
                      return (
                        <div key={step.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? '#16a34a' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, border: isCurrent ? '2px solid #16a34a' : 'none', boxShadow: isCurrent ? '0 0 0 4px rgba(34,197,94,0.15)' : 'none' }}>
                              {isDone ? <span style={{ color: '#fff', fontSize: 14 }}>✓</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</span>}
                            </div>
                            {idx < arr.length - 1 && (
                              <div style={{ width: 2, height: 24, background: isDone ? '#16a34a' : '#e2e8f0', margin: '2px 0' }} />
                            )}
                          </div>
                          <div style={{ paddingBottom: idx < arr.length - 1 ? 8 : 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isDone ? '#111' : '#94a3b8' }}>{step.emoji} {step.label}</p>
                            {isCurrent && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#888' }}>{step.desc}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeJob.status === 'en_route' && (
                    <div style={{ background: '#e0f2fe', color: '#0369a1', padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                       🚗 The worker is on their way to your location!
                    </div>
                  )}
                  {activeJob.status === 'in_progress' && (
                    <div style={{ background: '#fef3c7', color: '#b45309', padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                       🔧 The worker has arrived and started the job.
                    </div>
                  )}
                </div>
              </div>
            ) : activeJobRequest ? (
              <div style={{ padding: '24px 16px' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 16px' }}>Finding Workers...</h2>
                <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                   <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #16a34a', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                      <p style={{ color: '#555', fontSize: 14, fontWeight: 600 }}>Waiting for nearby workers to respond...</p>
                   </div>
                   
                   {receivedOffers.length > 0 && (
                     <div>
                       <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#111' }}>Offers Received ({receivedOffers.length})</h4>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                         {receivedOffers.map((offer, i) => (
                           <div key={i} style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div>
                               <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>{offer.labourName}</p>
                               <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                 <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                 <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{offer.rating}</span>
                               </div>
                             </div>
                             <div style={{ textAlign: 'right' }}>
                               <p style={{ margin: '0 0 4px', fontWeight: 800, color: '#16a34a', fontSize: 16 }}>₹{offer.proposedAmount}</p>
                               <button onClick={() => socket.emit('accept_offer', { ...offer, customerId: user?.uid || 'user_mock_123', customerName: profileData.name, customerPhone: profileData.phone, customerAddress: profileData.address, customerLat: userCoords[0], customerLng: userCoords[1] })} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                                 Accept
                               </button>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                </div>
              </div>
            ) : (
              <>
            {/* Search */}
            <div style={{ padding: '14px 16px 0' }}>
              <div
                style={{
                  background: '#f0f0f0',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 16px',
                }}
              >
                <Search size={17} color="#aaa" strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="Search for services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    fontSize: 14,
                    color: '#333',
                  }}
                />
              </div>
            </div>

            {/* Hero Banner */}
            <div style={{ padding: '16px 16px 0' }}>
              <div
                style={{
                  background: 'linear-gradient(130deg, #16a34a 0%, #22c55e 100%)',
                  borderRadius: 20,
                  padding: '24px 22px',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 150,
                }}
              >
                {/* Decorative wrench watermark */}
                <div
                  style={{
                    position: 'absolute',
                    right: -10,
                    bottom: -10,
                    opacity: 0.12,
                    fontSize: 130,
                    lineHeight: 1,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  🔧
                </div>

                <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.2 }}>
                  Instant Labour
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, margin: '0 0 18px', maxWidth: 200, lineHeight: 1.5 }}>
                  Professional help at your doorstep within 10 minutes.
                </p>
                <button
                  style={{
                    background: '#fff',
                    color: '#16a34a',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 22px',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                    transition: 'transform 0.15s',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  Book Now
                </button>
              </div>
            </div>

            {/* Service Grid */}
            <div style={{ padding: '22px 16px 0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: '0 0 14px' }}>
                What are you looking for?
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                }}
              >
                {SERVICES.filter((s) =>
                  !searchQuery || s.label.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((svc) => {
                  const Icon = svc.icon;
                  return (
                    <button
                      key={svc.id}
                      onClick={() => handleServiceClick(svc)}
                      style={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: 16,
                        padding: '18px 8px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.95)';
                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                      }}
                    >
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          background: svc.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={26} color={svc.iconColor} strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{svc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nearby Workers Section */}
            <div style={{ padding: '24px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>Nearby Workers</h3>
                <button style={{ background: 'none', border: 'none', color: '#22c55e', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                  See all <ChevronRight size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {liveWorkers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#888', padding: '20px 0', fontSize: 13 }}>No live workers online near you right now. Turn on a worker profile to see them here!</p>
                ) : liveWorkers.map((w, i) => {
                  const worker = {
                    id: `live_${i}`,
                    name: w.name || 'Live Worker',
                    role: w.role || 'Worker',
                    rating: 4.8,
                    reviews: 0,
                    dist: 'Nearby',
                    rate: w.hourlyRate || 150,
                    available: true,
                    avatar: (w.name || 'LW').slice(0, 2).toUpperCase(),
                  };
                  return (
                    <div
                      key={worker.id}
                      style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {worker.avatar}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>{worker.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{worker.role} · {worker.dist}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Star size={11} color="#f59e0b" fill="#f59e0b" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{worker.rating}</span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>({worker.reviews})</span>
                      </div>
                    </div>
                    {/* Rate + availability */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800, color: '#16a34a', fontSize: 14 }}>₹{worker.rate}/hr</p>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 20,
                          background: worker.available ? '#dcfce7' : '#fee2e2',
                          color: worker.available ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {worker.available ? 'Available' : 'Busy'}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </>
    )}

    {activeTab === 'orders' && (
      <div style={{ padding: '24px 16px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 20px' }}>Your Bookings</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2].map(num => (
            <div key={num} style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{num === 1 ? 'Emergency Plumber' : 'House Cleaning'}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>{num === 1 ? 'Oct 14, 2:30 PM' : 'Oct 10, 10:00 AM'}</p>
                </div>
                <span style={{ background: num === 1 ? '#dcfce7' : '#f3f4f6', color: num === 1 ? '#16a34a' : '#6b7280', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, height: 'fit-content' }}>
                  {num === 1 ? 'Completed' : 'Cancelled'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                  {num === 1 ? 'RK' : 'AD'}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{num === 1 ? 'Ramesh Kumar' : 'Anita Devi'}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 800 }}>₹{num === 1 ? '400' : '150'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

        {activeTab === 'profile' && (
          <div style={{ padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: 0 }}>Your Profile</h2>
              <button 
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {isEditingProfile ? 'Save' : 'Edit'}
              </button>
            </div>
            
            <div style={{ background: '#fff', borderRadius: 20, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="customerProfilePicInput"
                  disabled={!isEditingProfile}
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      setProfileData({...profileData, profilePic: URL.createObjectURL(e.target.files[0])});
                    }
                  }} 
                  style={{ display: 'none' }}
                />
                <label htmlFor="customerProfilePicInput" style={{ cursor: isEditingProfile ? 'pointer' : 'default' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(130deg, #3b82f6, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 800, overflow: 'hidden', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
                    {profileData.profilePic ? (
                      <img src={profileData.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (profileData.name || 'C').charAt(0).toUpperCase()
                    )}
                  </div>
                  {isEditingProfile && (
                    <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#111', borderRadius: '50%', padding: '6px', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={12} color="#fff" />
                    </div>
                  )}
                </label>
              </div>

              {isEditingProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 10 }}>
                  <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} placeholder="Full Name" style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none' }} />
                  <input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} placeholder="Email" style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none' }} />
                  <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} placeholder="Phone Number" style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none' }} />
                  <textarea value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} placeholder="Address" style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none', resize: 'none' }} />
                </div>
              ) : (
                <>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111' }}>{profileData.name}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888', fontWeight: 500 }}>Customer</p>
                  
                  <div style={{ marginTop: 24, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Phone</span>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600 }}>{profileData.phone}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Email</span>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600 }}>{profileData.email}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Primary Address</span>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{profileData.address}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {[
                { icon: User, label: 'Personal Information' },
                { icon: Home, label: 'Manage Addresses' },
                { icon: Settings, label: 'Account Settings' },
                { icon: PowerOff, label: 'Log Out', color: '#dc2626', action: logout }
              ].map((item, i, arr) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      borderBottom: i < arr.length - 1 ? '1px solid #f5f5f5' : 'none',
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={22} color={item.color || '#555'} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: item.color || '#333' }}>{item.label}</span>
                    {item.label !== 'Log Out' && <ChevronRight size={18} color="#ccc" style={{ marginLeft: 'auto' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Nav ──────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '10px 0 16px',
          zIndex: 100,
        }}
      >
        {[
          { id: 'home', label: 'Home', Icon: Home },
          { id: 'orders', label: 'Orders', Icon: ShoppingBag },
          { id: 'profile', label: 'Profile', Icon: User },
        ].map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '2px 20px',
              }}
            >
              <Icon size={22} color={active ? '#22c55e' : '#aaa'} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#22c55e' : '#aaa' }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Slide-in Menu Drawer ────────────────────────────── */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ flex: 1, background: 'rgba(0,0,0,0.45)' }}
          />
          {/* Drawer */}
          <div
            style={{
              width: 260,
              background: '#fff',
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: '#111' }}>KaamConnect</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} color="#555" />
              </button>
            </div>
            {['My Bookings', 'Become a Worker', 'Settings', 'Help & Support', 'Log Out'].map((item) => (
              <button
                key={item}
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: 15,
                  fontWeight: 600,
                  color: item === 'Log Out' ? '#dc2626' : '#333',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Service Detail Bottom Sheet ─────────────────────── */}
      {selectedService && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div onClick={closeServiceModal} style={{ flex: 1, background: 'rgba(0,0,0,0.45)' }} />
          <div
            style={{
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 36px',
              maxWidth: 480,
              width: '100%',
              margin: '0 auto',
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: selectedService.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <selectedService.icon size={28} color={selectedService.iconColor} strokeWidth={2} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: '#111' }}>{selectedService.label}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Trusted professionals near you</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Avg. Rating', value: '4.8 ⭐' },
                { label: 'Workers', value: '12 near you' },
                { label: 'Avg. Rate', value: '₹180/hr' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    background: '#f9f9f9',
                    borderRadius: 12,
                    padding: '10px 8px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#111' }}>{s.value}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#aaa' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Live Map of Nearby Workers */}
            <div style={{ width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 20, zIndex: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1) inset' }}>
              <MapContainer center={userCoords} zoom={13} style={{ width: '100%', height: '100%', zIndex: 0 }} zoomControl={false} attributionControl={false}>
                <ChangeView center={userCoords} />
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {/* User Marker */}
                <Marker position={userCoords} icon={userIcon}>
                  <Popup>You</Popup>
                </Marker>

                {/* Live Workers Markers (Filtered by Category) */}
                {liveWorkers
                  .filter(w => (w.role || '').toLowerCase().includes((selectedService?.label || '').toLowerCase()))
                  .map((w, idx) => (
                  <Marker key={idx} position={w.coords || [userCoords[0] + (Math.random() - 0.5) * 0.02, userCoords[1] + (Math.random() - 0.5) * 0.02]} icon={workerIcon}>
                    <Popup>
                      <b>{w.name || 'Worker'}</b><br/>
                      {w.role || 'Available '}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Workers List in Bottom Sheet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
              {liveWorkers.filter(w => (w.role || '').toLowerCase().includes((selectedService?.label || '').toLowerCase())).length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '10px 0', fontSize: 13, margin: 0 }}>No workers available for this category right now.</p>
              ) : (
                liveWorkers
                  .filter(w => (w.role || '').toLowerCase().includes((selectedService?.label || '').toLowerCase()))
                  .map((w, i) => {
                    const worker = {
                      id: w.id || `live_${i}`,
                      name: w.name || 'Live Worker',
                      role: w.role || 'Worker',
                      rating: 4.8,
                      reviews: 0,
                      dist: 'Nearby',
                      rate: w.hourlyRate || 150,
                      avatar: (w.name || 'LW').slice(0, 2).toUpperCase(),
                    };
                    return (
                      <div
                        key={worker.id}
                        style={{
                          background: '#fff',
                          borderRadius: 16,
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          border: '1px solid #f0f0f0',
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 15,
                            flexShrink: 0,
                          }}
                        >
                          {worker.avatar}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>{worker.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Star size={11} color="#f59e0b" fill="#f59e0b" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{worker.rating}</span>
                            <span style={{ fontSize: 11, color: '#aaa' }}>· ₹{worker.rate}/hr</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setBookingWorker(worker)}
                          style={{
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '8px 14px',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                          }}
                        >
                          Book
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Form Modal ─────────────────────── */}
      {bookingWorker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={() => !bookingSuccess && setBookingWorker(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} />
          
          <div style={{ position: 'relative', background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            {bookingSuccess ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <CheckCircle size={64} color="#16a34a" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#111' }}>Request Sent!</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.5 }}>
                  {bookingWorker.name} has been notified. They will contact you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div style={{ background: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
                    {bookingWorker.avatar}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>{bookingWorker.name}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{selectedService?.label}</p>
                  </div>
                  <button type="button" onClick={() => setBookingWorker(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
                    <X size={20} color="#888" />
                  </button>
                </div>

                <div style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>
                    What do you need help with?
                  </label>
                  <textarea 
                    value={bookingDescription}
                    onChange={(e) => setBookingDescription(e.target.value)}
                    placeholder={`E.g., I have a leaking pipe that needs fixing...`}
                    required
                    maxLength={300}
                    style={{
                      width: '100%',
                      height: 80,
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid #ddd',
                      fontSize: 14,
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      background: '#fcfcfc',
                      marginBottom: 16
                    }}
                  />

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>
                        Estimated Duration
                      </label>
                      <input 
                        type="text"
                        value={bookingDuration}
                        onChange={(e) => setBookingDuration(e.target.value)}
                        placeholder="e.g. 2 hours"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>
                        Payment Type
                      </label>
                      <select 
                        value={bookingPaymentType}
                        onChange={(e) => setBookingPaymentType(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, outline: 'none', background: '#fff' }}
                      >
                        <option value="hourly">Per Hour</option>
                        <option value="lump_sum">Lump Sum</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>
                      Proposed Amount (₹)
                    </label>
                    <input 
                      type="number"
                      value={bookingAmount}
                      onChange={(e) => setBookingAmount(e.target.value)}
                      placeholder="e.g. 500"
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, outline: 'none' }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>
                      Upload Photo (Optional)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {bookingPhotoPreview ? (
                        <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 10, overflow: 'hidden', border: '1px solid #ddd' }}>
                          <img src={bookingPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button" 
                            onClick={() => { setBookingPhotoPreview(null); setBookingPhotoFile(null); }}
                            style={{ position: 'absolute', top: -5, right: -5, background: '#fff', borderRadius: '50%', padding: 2, border: '1px solid #ddd', cursor: 'pointer' }}
                          >
                            <X size={12} color="#dc2626" />
                          </button>
                        </div>
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: 10, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc' }}>
                          <ImageIcon size={24} color="#aaa" />
                        </div>
                      )}
                      
                      <div style={{ flex: 1 }}>
                        <input 
                          type="file" 
                          id="bookingPhotoUpload" 
                          accept="image/*" 
                          onChange={handlePhotoSelect} 
                          style={{ display: 'none' }} 
                        />
                        <label 
                          htmlFor="bookingPhotoUpload" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f0fdf4', color: '#16a34a', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid #bbf7d0' }}
                        >
                          <Upload size={16} /> Choose Photo
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!bookingDescription.trim() || !bookingAmount.trim() || isUploadingPhoto}
                    style={{
                      width: '100%',
                      background: (bookingDescription.trim() && bookingAmount.trim() && !isUploadingPhoto) ? 'linear-gradient(130deg, #16a34a, #22c55e)' : '#e2e8f0',
                      color: (bookingDescription.trim() && bookingAmount.trim() && !isUploadingPhoto) ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderRadius: 14,
                      padding: '15px',
                      fontWeight: 800,
                      fontSize: 16,
                      cursor: (bookingDescription.trim() && bookingAmount.trim() && !isUploadingPhoto) ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isUploadingPhoto ? 'Uploading Request...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && activeJob && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Job Completed!</h3>
              <p style={{ margin: '4px 0 0', color: '#555', fontSize: 14 }}>Please complete your payment of <strong style={{ color: '#16a34a' }}>₹{activeJob.amount}</strong> to the worker.</p>
            </div>
            <button
               onClick={handlePayment}
               disabled={isProcessingPayment}
               style={{ width: '100%', background: isProcessingPayment ? '#e2e8f0' : '#16a34a', color: isProcessingPayment ? '#94a3b8' : '#fff', border: 'none', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: isProcessingPayment ? 'not-allowed' : 'pointer' }}
            >
               {isProcessingPayment ? 'Processing...' : 'Pay via Cashfree'}
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Job Completed!</h3>
              <p style={{ margin: '4px 0 0', color: '#555', fontSize: 14 }}>Please rate your experience with the worker.</p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <Star size={32} color={star <= reviewRating ? '#f59e0b' : '#cbd5e1'} fill={star <= reviewRating ? '#f59e0b' : 'none'} />
                </button>
              ))}
            </div>
            
            <textarea
              placeholder="Leave a review (optional)..."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 12, padding: 12, minHeight: 80, fontSize: 14, outline: 'none', marginBottom: 20, resize: 'vertical' }}
            />
            
            <button
               onClick={submitReview}
               style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}
            >
               Submit Review
            </button>
          </div>
        </div>
      )}

      {/* Chat Mobile Overlay */}
      {chatOpen && activeJob && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#fff', display: 'flex', flexDirection: 'column' }}>
          <header style={{ background: '#111', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#aaa', fontWeight: 600 }}>Chat securely (visible 24h)</p>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Worker Chat</h3>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: '#333', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Close</button>
          </header>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, background: '#ddd', padding: '2px 8px', borderRadius: 10, color: '#555' }}>Your number is hidden</span>
            </div>
            {chatMessages.map((msg, i) => {
              const isMine = msg.senderId === (user?.uid || 'user_mock_123');
              return (
                <div key={i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  {!isMine && <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>Worker</span>}
                  <div style={{ background: isMine ? '#16a34a' : '#fff', color: isMine ? '#fff' : '#111', padding: '10px 14px', borderRadius: 16, borderBottomRightRadius: isMine ? 4 : 16, borderBottomLeftRadius: isMine ? 16 : 4, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', fontSize: 14 }}>
                    {msg.textContent}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendChatMessage} style={{ padding: 12, background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
            <input 
               type="text" 
               placeholder="Type a message..." 
               value={chatInput}
               onChange={e => setChatInput(e.target.value)}
               style={{ flex: 1, border: '1px solid #ddd', borderRadius: 24, padding: '12px 16px', fontSize: 14, outline: 'none' }}
            />
            <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
