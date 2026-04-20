import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isMockMode } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);   // undefined = loading, null = logged out
  const [role, setRole] = useState(null);         // 'customer' | 'professional' | 'labour'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Restore role from localStorage set at login time
        const savedRole = localStorage.getItem(`kaam_role_${firebaseUser.uid}`);
        setRole(savedRole || null);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /** Call this right after a successful login to persist the role. */
  const saveRole = (uid, roleValue) => {
    localStorage.setItem(`kaam_role_${uid}`, roleValue);
    setRole(roleValue);
  };

  const logout = async () => {
    if (!isMockMode) await auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, saveRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
