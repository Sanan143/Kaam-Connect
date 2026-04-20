import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 50,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #eee',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: 16,
        }}>K</div>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#111' }}>KaamConnect</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link to="/login" style={{
          fontSize: 13, fontWeight: 700, color: '#555', textDecoration: 'none',
          padding: '8px 14px',
        }}>
          Login
        </Link>
        <Link to="/signup" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'linear-gradient(130deg, #16a34a, #22c55e)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '8px 16px',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(34,197,94,0.25)',
          }}>
            Sign Up
          </button>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
