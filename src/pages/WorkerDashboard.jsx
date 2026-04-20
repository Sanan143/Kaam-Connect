import { useState, useEffect } from 'react';
import { MapPin, Power, PowerOff, Star, Clock, IndianRupee, Navigation, Bell, User, Home, Settings, ChevronRight, Wrench } from 'lucide-react';
import { socket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';

export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Detecting…');
  const [jobPings, setJobPings] = useState([]);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ 
    name: 'Test Plumber', 
    username: 'worker_1',
    email: 'plumber@kaamconnect.online',
    phone: '+91 9876543210',
    address: 'Connaught Place, New Delhi',
    profession: 'Plumber',
    aadhaarNumber: '123412341234',
    profilePic: null 
  });

  // Get location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setLocation(coords);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`
          );
          const json = await res.json();
          setLocationLabel(
            json.address?.city || json.address?.town || json.address?.suburb || 'Your Area'
          );
        } catch {
          setLocationLabel('Your Area');
        }
      },
      () => setLocationLabel('Location unavailable')
    );
  }, []);

  // Socket: go online / offline + listen for job pings
  useEffect(() => {
    socket.connect();

    socket.on('job_ping', (data) => {
      setJobPings((prev) => [data, ...prev].slice(0, 20));
    });

    return () => {
      socket.off('job_ping');
    };
  }, []);

  const toggleOnline = () => {
    if (!isOnline) {
      // Go online
      socket.emit('labour_online', {
        id: user?.uid || `worker_${Math.random().toString(36).substring(7)}`,
        name: profileData.name || 'Worker',
        role: profileData.profession || 'Professional',
        coords: location || [12.97, 77.59],
        hourlyRate: 200,
      });
      setIsOnline(true);
    } else {
      socket.disconnect();
      socket.connect(); // reconnect without online status
      setIsOnline(false);
    }
  };

  const STATS = [
    { label: 'Today\'s Earnings', value: '₹1,240', icon: IndianRupee, color: '#16a34a' },
    { label: 'Jobs Done', value: '3', icon: Star, color: '#f59e0b' },
    { label: 'Hours Active', value: '4.5h', icon: Clock, color: '#3b82f6' },
  ];

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
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#fff',
          padding: '16px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 0 #eee',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: isOnline ? '#dcfce7' : '#fee2e2',
              border: `1.5px solid ${isOnline ? '#22c55e40' : '#dc262640'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={18} color={isOnline ? '#22c55e' : '#dc2626'} strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#888', margin: 0, fontWeight: 500 }}>
              {isOnline ? '● Online' : '○ Offline'}
            </p>
            <p style={{ fontSize: 15, color: '#111', margin: 0, fontWeight: 700 }}>{locationLabel}</p>
          </div>
        </div>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
        >
          <Bell size={22} color="#555" />
          {jobPings.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#dc2626',
                color: '#fff',
                fontSize: 9,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {jobPings.length}
            </span>
          )}
        </button>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
        {activeTab === 'home' && (
          <>
            {/* Go Online Toggle */}
            <div style={{ padding: '20px 16px 0' }}>
              <button
                onClick={toggleOnline}
                style={{
                  width: '100%',
                  padding: '20px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  background: isOnline
                    ? 'linear-gradient(130deg, #dc2626, #ef4444)'
                    : 'linear-gradient(130deg, #16a34a, #22c55e)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  boxShadow: isOnline
                    ? '0 6px 24px rgba(220,38,38,0.3)'
                    : '0 6px 24px rgba(34,197,94,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {isOnline ? <PowerOff size={24} /> : <Power size={24} />}
                <span style={{ fontWeight: 800, fontSize: 17 }}>
                  {isOnline ? 'Go Offline' : 'Go Online — Start Receiving Jobs'}
                </span>
              </button>
            </div>

            {/* Stats */}
            <div style={{ padding: '20px 16px 0', display: 'flex', gap: 10 }}>
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    style={{
                      flex: 1,
                      background: '#fff',
                      borderRadius: 16,
                      padding: '16px 12px',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Icon size={20} color={s.color} style={{ marginBottom: 8 }} />
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: '#111' }}>{s.value}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#aaa' }}>{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Job Pings */}
            <div style={{ padding: '24px 16px 0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: '0 0 14px' }}>
                Incoming Job Requests
              </h3>
              {jobPings.length === 0 ? (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '32px 20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <Navigation size={32} color="#ddd" style={{ marginBottom: 12 }} />
                  <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
                    {isOnline ? 'Waiting for job requests…' : 'Go online to receive jobs'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jobPings.map((job, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#fff',
                        borderRadius: 16,
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12 }}>
                        {job.photoUrl ? (
                          <img src={job.photoUrl} alt="Job" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', background: '#f5f5f5' }} />
                        ) : (
                          <div style={{ width: 64, height: 64, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wrench size={24} color="#16a34a" />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#111' }}>
                                {job.category || 'General Work'}
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888', fontWeight: 600 }}>
                                Job #{job.jobId || i + 1}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ margin: 0, fontWeight: 800, color: '#16a34a', fontSize: 16 }}>
                                ₹{job.amount || 'N/A'}
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666', background: '#f5f5f5', padding: '2px 6px', borderRadius: 6, display: 'inline-block' }}>
                                {job.paymentType === 'lump_sum' ? 'Lump Sum' : 'Per Hour'}
                              </p>
                            </div>
                          </div>
                          {job.duration && (
                            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} /> {job.duration}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {job.description && (
                        <div style={{ background: '#fafafa', padding: 10, borderRadius: 8, fontSize: 13, color: '#444', lineHeight: 1.4, border: '1px solid #eee' }}>
                          <span style={{ fontWeight: 700, color: '#333', display: 'block', marginBottom: 4 }}>Description:</span>
                          {job.description}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          onClick={() => setJobPings((prev) => prev.filter((_, idx) => idx !== i))}
                          style={{
                            flex: 1,
                            background: '#fff',
                            color: '#555',
                            border: '1px solid #ddd',
                            borderRadius: 10,
                            padding: '10px',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                          }}
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => {
                            socket.emit('accept_job', {
                              jobId: job.jobId,
                              labourId: user?.uid || 'worker_1',
                              customerId: job.customerId,
                            });
                            setJobPings((prev) => prev.filter((_, idx) => idx !== i));
                          }}
                          style={{
                            flex: 1,
                            background: 'linear-gradient(130deg, #16a34a, #22c55e)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '10px',
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                          }}
                        >
                          Accept Job
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'earnings' && (
          <div style={{ padding: '24px 16px' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 20px' }}>Your Earnings</h2>
            <div style={{ background: 'linear-gradient(130deg, #16a34a, #22c55e)', borderRadius: 20, padding: '24px', color: '#fff', boxShadow: '0 4px 12px rgba(34,197,94,0.3)', marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, opacity: 0.9, fontWeight: 600 }}>Total Balance</p>
              <h3 style={{ margin: 0, fontSize: 36, fontWeight: 800 }}>₹1,240</h3>
              <button style={{ marginTop: 16, background: '#fff', color: '#16a34a', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>
                Withdraw Funds
              </button>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 16px' }}>Recent Transactions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map((item) => (
                <div key={item} style={{ background: '#fff', borderRadius: 16, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IndianRupee size={20} color="#16a34a" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>Payment Received</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>Job #{120 + item} • Plumber</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>+₹{item === 1 ? '400' : '350'}</span>
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
                  id="profilePicInput"
                  disabled={!isEditingProfile}
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      setProfileData({...profileData, profilePic: URL.createObjectURL(e.target.files[0])});
                    }
                  }} 
                  style={{ display: 'none' }}
                />
                <label htmlFor="profilePicInput" style={{ cursor: isEditingProfile ? 'pointer' : 'default' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(130deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 800, overflow: 'hidden', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>
                    {profileData.profilePic ? (
                      <img src={profileData.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      profileData.name.charAt(0).toUpperCase()
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
                  <input type="text" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} placeholder="Username" style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none' }} />
                  <input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} placeholder="Email" style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none' }} />
                  <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} placeholder="Phone" style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none' }} />
                  <textarea value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} placeholder="Address" style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none', resize: 'none' }} />
                  <div style={{ position: 'relative', width: '100%' }}>
                    <select 
                      value={profileData.profession || ''} 
                      onChange={e => setProfileData({...profileData, profession: e.target.value})} 
                      style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', paddingRight: 24, width: '100%', outline: 'none', appearance: 'none', background: '#fff' }}
                    >
                      <option value="" disabled>Select Profession</option>
                      {['Plumber', 'Electrician', 'Painter', 'Carpenter', 'Cleaning', 'Movers'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#888', fontSize: 10 }}>▼</div>
                  </div>
                  <input type="text" value={profileData.aadhaarNumber} onChange={e => setProfileData({...profileData, aadhaarNumber: e.target.value})} placeholder="Aadhaar Number" maxLength="12" style={{ textAlign: 'center', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '8px', width: '100%', outline: 'none' }} />
                </div>
              ) : (
                <>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111' }}>{profileData.name}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888', fontWeight: 500 }}>{profileData.profession}</p>
                  
                  <div style={{ marginTop: 24, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Working as</span>
                      <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 800 }}>{profileData.profession}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Username</span>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600 }}>{profileData.username}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Phone</span>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600 }}>{profileData.phone}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Email</span>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600 }}>{profileData.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Aadhaar</span>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600 }}>XXXX-XXXX-{(profileData.aadhaarNumber || '0000').slice(-4)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Address</span>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{profileData.address}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {[
                { icon: User, label: 'Personal Information' },
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
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
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
          { id: 'earnings', label: 'Earnings', Icon: IndianRupee },
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
    </div>
  );
}
