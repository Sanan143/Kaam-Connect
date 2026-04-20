import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        background: '#f5f5f5',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <ShieldX size={36} color="#dc2626" />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
        Access Denied
      </h1>
      <p style={{ fontSize: 14, color: '#888', maxWidth: 320, margin: '0 0 28px', lineHeight: 1.6 }}>
        You don't have permission to view this page. Please log in with the correct account type.
      </p>
      <Link
        to="/login"
        style={{
          background: 'linear-gradient(130deg, #16a34a, #22c55e)',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          padding: '14px 36px',
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
        }}
      >
        Go to Login
      </Link>
    </div>
  );
}
