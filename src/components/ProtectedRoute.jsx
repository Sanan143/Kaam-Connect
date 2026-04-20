import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — guards a route based on auth state and role.
 *
 * Props:
 *  - allowedRole: 'customer' | 'professional' | 'labour' — the required role
 *  - children: the page to render if allowed
 *
 * Behaviour:
 *  - Still loading  → show spinner
 *  - Not logged in  → redirect to /login
 *  - Wrong role     → redirect to /unauthorized
 *  - OK             → render children
 */
export default function ProtectedRoute({ allowedRole, children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          fontFamily: "'Inter', sans-serif",
          background: '#f5f5f5',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '4px solid #e5e7eb',
            borderTopColor: '#22c55e',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#888', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  // Not authenticated at all
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but wrong role
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
