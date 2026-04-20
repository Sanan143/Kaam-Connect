import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, CheckCircle, ArrowRight, User, Wrench, FileText, MapPin, ChevronLeft } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || 'customer'; 
  const prefilledPhone = location.state?.phone || '';
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: prefilledPhone,
    address: '',
    skillset: [],
    aadhaarFile: null,
    aadhaarNumber: '',
    profilePic: null
  });

  const skillsList = ['Plumber', 'Electrician', 'Painter', 'Carpenter', 'Cleaning', 'Movers'];

  const handleProfilePicChange = (e) => {
    if (e.target.files?.[0]) setFormData(prev => ({ ...prev, profilePic: e.target.files[0] }));
  };

  const handleSkillChange = (e) => {
    setFormData(prev => ({ ...prev, skillset: [e.target.value] }));
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFormData(prev => ({ ...prev, aadhaarFile: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { auth } = await import('../lib/firebase');
      const { supabase } = await import('../supabaseClient');
      const user = auth.currentUser;
      if (!user) { alert("You need to be logged in."); return; }

      try {
        if (role === 'customer') {
          const { error } = await supabase.from('customer_profiles').upsert({
            user_id: user.uid, full_name: formData.fullName, address: formData.address
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('labour_profiles').upsert({
            user_id: user.uid, full_name: formData.fullName,
            skillset: formData.skillset, is_online: false, aadhar_status: 'pending'
          });
          if (error) throw error;
        }
      } catch(err) {
        if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
          console.warn('[MOCK] Supabase is offline/invalid. Simulating successful save.');
        } else {
          throw err;
        }
      }

      navigate(role === 'customer' ? '/dashboard' : '/worker-dashboard');
    } catch (err) {
      alert("Failed to save profile: " + err.message);
    }
  };

  const inputStyle = {
    width: '100%', height: 50, borderRadius: 14, border: '2px solid #e5e7eb',
    background: '#fff', padding: '0 16px', fontSize: 15, color: '#111',
    outline: 'none', fontFamily: 'Inter, sans-serif',
  };
  const labelStyle = { fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6, display: 'block' };

  return (
    <div className="mobile-page" style={{ background: '#f5f5f5' }}>

      {/* Header */}
      <header style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 #eee', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={24} color="#333" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>Complete Profile</h1>
      </header>

      <main style={{ padding: '20px 16px 40px', overflowY: 'auto' }}>
        {/* Role badge */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 10px', borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(34,197,94,0.25)' }}>
            {role === 'customer' ? <User size={28} color="#fff" /> : <Wrench size={28} color="#fff" />}
          </div>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
            Registering as <span style={{ color: '#16a34a', fontWeight: 700, textTransform: 'capitalize' }}>{role}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Profile pic (professionals) */}
          {role === 'professional' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', cursor: 'pointer' }}>
                <input type="file" accept="image/*" capture="user" onChange={handleProfilePicChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                <div style={{
                  width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: formData.profilePic ? '3px solid #16a34a' : '3px dashed #ccc', background: '#f9f9f9',
                }}>
                  {formData.profilePic ? (
                    <img src={URL.createObjectURL(formData.profilePic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}><User size={28} color="#bbb" /><p style={{ fontSize: 9, color: '#aaa', margin: '4px 0 0', fontWeight: 700 }}>Selfie</p></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal fields */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '20px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} color="#888" /> Personal Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Full Name</label><input style={inputStyle} required value={formData.fullName} onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))} placeholder="Enter your full name" /></div>
              <div><label style={labelStyle}>Username</label><input style={inputStyle} required value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} placeholder="Choose a username" /></div>
              <div><label style={labelStyle}>Mobile</label><input style={inputStyle} type="tel" required value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile number" /></div>
              <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="you@gmail.com" /></div>
            </div>
          </div>

          {/* Address (customer) */}
          {role === 'customer' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: '20px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="#888" /> Address
              </h3>
              <textarea required value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                style={{ ...inputStyle, height: 80, padding: 16, resize: 'none', lineHeight: 1.5 }}
                placeholder="Flat, street, landmark…" />
            </div>
          )}

          {/* Skills (professional) */}
          {role === 'professional' && (
            <>
              <div style={{ background: '#fff', borderRadius: 20, padding: '20px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wrench size={16} color="#888" /> Your Profession
                </h3>
                <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 12px' }}>Select your primary service</p>
                <div style={{ position: 'relative' }}>
                  <select 
                    required 
                    value={formData.skillset[0] || ''} 
                    onChange={handleSkillChange} 
                    style={{ ...inputStyle, paddingRight: 40, appearance: 'none', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="" disabled>Choose an occupation...</option>
                    {skillsList.map(skill => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#888', fontSize: 12 }}>▼</div>
                </div>
              </div>

              {/* Aadhaar */}
              <div style={{ background: '#fff', borderRadius: 20, padding: '20px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="#888" /> Aadhaar Verification
                </h3>
                <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 12px' }}>Mandatory for trust & safety</p>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Aadhaar Number</label>
                  <input style={{ ...inputStyle, letterSpacing: 3, fontFamily: 'monospace' }} required maxLength="12" value={formData.aadhaarNumber}
                    onChange={e => setFormData(p => ({ ...p, aadhaarNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="12-digit number" />
                </div>
                <div style={{ position: 'relative', border: '2px dashed #ddd', borderRadius: 16, padding: '24px 16px', textAlign: 'center', background: '#fafafa' }}>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileChange} required
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  <Upload size={28} color="#bbb" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#555', margin: 0 }}>
                    {formData.aadhaarFile ? formData.aadhaarFile.name : "Upload Aadhaar"}
                  </p>
                  <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>JPEG, PNG or PDF up to 5MB</p>
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <button type="submit" style={{
            width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(130deg, #16a34a, #22c55e)', color: '#fff',
            fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 6px 20px rgba(34,197,94,0.3)', marginBottom: 20,
          }}>
            Complete Registration <ArrowRight size={18} />
          </button>
        </form>
      </main>
    </div>
  );
};

export default Register;
