import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import WorkerDashboard from './pages/WorkerDashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import Unauthorized from './pages/Unauthorized'

// Navbar only shown on the landing page — all other pages have their own mobile headers
const NAVBAR_ROUTES = ['/'];

function AppContent() {
  const location = useLocation();
  const showNavbar = NAVBAR_ROUTES.includes(location.pathname);

  return (
    <div className="relative flex min-h-screen flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Customer-only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="customer">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Worker-only (professional / labour) */}
          <Route
            path="/worker-dashboard"
            element={
              <ProtectedRoute allowedRole="professional">
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
