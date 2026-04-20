import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Phone, ArrowRight, CheckCircle, Mail, Lock } from "lucide-react"
import { auth, setupRecaptcha, isMockMode } from "../lib/firebase"
import { signInWithPhoneNumber, createUserWithEmailAndPassword } from "firebase/auth"
import { useAuth } from "../context/AuthContext"

function Signup() {
  const [authMode, setAuthMode] = useState("customer") 
  const [authMethod, setAuthMethod] = useState("otp")
  
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  
  const [status, setStatus] = useState("idle")
  const [confirmationResult, setConfirmationResult] = useState(null)
  const navigate = useNavigate()
  const { saveRole } = useAuth()

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

  const sendOTP = async (e) => {
    e.preventDefault();
    if (!phone) return;
    setStatus("loading");
    try {
      let formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      let confirmation;
      if (isMockMode) {
        confirmation = { mock: true, confirm: async () => ({ user: { uid: 'mock_uid_123', phoneNumber: formattedPhone } }) };
      } else {
        const appVerifier = setupRecaptcha('recaptcha-container');
        confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      }
      setConfirmationResult(confirmation);
      setStatus("otp");
    } catch (error) {
      alert("Failed to send OTP: " + error.message);
      setStatus("idle");
    }
  }

  const verifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;
    setStatus("verifying");
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      const syncResponse = await fetch(`${backendUrl}/api/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, phone: user.phoneNumber, role: authMode })
      });
      if (!syncResponse.ok) console.error('Failed to sync');
      saveRole(user.uid, authMode);
      navigate('/register', { state: { role: authMode, phone } });
    } catch (error) {
      alert("Invalid OTP or expired.");
      setStatus("otp");
    }
  }

  const handlePasswordSignup = async (e) => {
    e.preventDefault();
    if ((!phone && !email) || !password) return;
    setStatus("loading");
    try {
      if (email && !phone) {
        let user;
        if (isMockMode) {
          user = { uid: 'mock_uid_email_123', email };
        } else {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          user = result.user;
        }
        await fetch(`${backendUrl}/api/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, email: user.email, role: authMode })
        });
        saveRole(user.uid, authMode);
        navigate('/register', { state: { role: authMode, email } });
      } else if (phone) {
        const response = await fetch(`${backendUrl}/api/auth/signup-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password, role: authMode })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        navigate('/register', { state: { role: authMode, phone } });
      }
    } catch (error) {
      alert(error.message || "Failed to create account.");
      setStatus("idle");
    }
  }

  const inputStyle = {
    width: '100%', height: 50, borderRadius: 14, border: '2px solid #e5e7eb',
    background: '#fff', padding: '0 16px 0 44px', fontSize: 15, color: '#111',
    outline: 'none', fontFamily: 'Inter, sans-serif',
  };
  const iconWrap = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' };
  const btnPrimary = {
    width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(130deg, #16a34a, #22c55e)', color: '#fff',
    fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 6px 20px rgba(34,197,94,0.3)',
  };

  return (
    <div className="mobile-page" style={{ background: '#f5f5f5', justifyContent: 'center', padding: '20px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '32px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: 16, background: 'linear-gradient(135deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
            <span style={{ color: '#fff', fontSize: 28, fontWeight: 900 }}>K</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>Create Account</h1>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Join KaamConnect today</p>
        </div>

        {/* Role toggle */}
        <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 12, padding: 3, marginBottom: 16 }}>
          {[{ id: 'customer', label: 'Hire Workers' }, { id: 'professional', label: 'Find Work' }].map((r) => (
            <button key={r.id} onClick={() => setAuthMode(r.id)} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: authMode === r.id ? '#fff' : 'transparent',
              color: authMode === r.id ? '#16a34a' : '#888',
              fontWeight: 700, fontSize: 13,
              boxShadow: authMode === r.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Auth method tabs */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
          {['otp', 'password'].map((m) => (
            <button key={m} onClick={() => { setAuthMethod(m); setStatus('idle'); }} style={{
              background: 'none', border: 'none', cursor: 'pointer', paddingBottom: 6,
              borderBottom: authMethod === m ? '2px solid #16a34a' : '2px solid transparent',
              color: authMethod === m ? '#16a34a' : '#aaa', fontWeight: 700, fontSize: 13,
            }}>
              {m === 'otp' ? 'Use OTP' : 'Use Password'}
            </button>
          ))}
        </div>

        {/* OTP verify */}
        {authMethod === 'otp' && (status === "otp" || status === "verifying") ? (
          <form onSubmit={verifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6, display: 'block' }}>Enter OTP</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrap}><CheckCircle size={18} color="#aaa" /></div>
                <input style={inputStyle} placeholder="Enter 6-digit code" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} disabled={status === "verifying"} required />
              </div>
            </div>
            <button style={btnPrimary} type="submit" disabled={status === "verifying" || !otp}>
              {status === "verifying" ? "Verifying..." : "Verify & Sign Up"}
            </button>
            <button type="button" onClick={() => setStatus("idle")} style={{ ...btnPrimary, background: '#fff', color: '#16a34a', border: '2px solid #22c55e20', boxShadow: 'none' }}>
              Change Number
            </button>
          </form>
        ) : authMethod === 'otp' ? (
          <form onSubmit={sendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6, display: 'block' }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrap}><Phone size={18} color="#aaa" /></div>
                <input style={inputStyle} placeholder="Enter 10-digit number" maxLength="10" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={status === "loading"} required />
              </div>
            </div>
            <button id="send-otp-btn" style={btnPrimary} type="submit" disabled={status === "loading" || !phone}>
              {status === "loading" ? "Sending..." : "Continue"} <ArrowRight size={18} />
            </button>
            <div id="recaptcha-container" style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}></div>
          </form>
        ) : (
          <form onSubmit={handlePasswordSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6, display: 'block' }}>Email or Phone</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrap}><Mail size={18} color="#aaa" /></div>
                <input style={inputStyle} placeholder="Email or 10-digit phone" type="text"
                  onChange={(e) => { const val = e.target.value; if (!isNaN(val) && val.length > 5) { setPhone(val); setEmail(""); } else { setEmail(val); setPhone(""); } }}
                  disabled={status === "loading"} required
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6, display: 'block' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrap}><Lock size={18} color="#aaa" /></div>
                <input style={inputStyle} placeholder="Create a password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={status === "loading"} required />
              </div>
            </div>
            <button style={{ ...btnPrimary, marginTop: 4 }} type="submit" disabled={status === "loading" || (!phone && !email) || !password}>
              {status === "loading" ? "Creating..." : "Create Account"} <ArrowRight size={18} />
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ fontSize: 13, color: '#888' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
