import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_FIREBASE_API_KEY';

// Hard disable mock mode per user request for direct realtime
export const isMockMode = false;

let authInstance = null;

if (!isMockMode) {
  const firebaseConfig = {
    apiKey: apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  };
  const app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
} else {
  // Console warning
  console.warn("Using FIREBASE MOCK MODE for UI Testing. Real OTPs will not be sent.");
  authInstance = { mock: true };
}

export const auth = authInstance;

export const setupRecaptcha = (buttonId) => {
  if (isMockMode) return { type: 'mock_verifier' };
  
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch(e) { console.error('Error clearing recaptcha', e); }
    window.recaptchaVerifier = null;
  }
  
  window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible'
  });
  
  return window.recaptchaVerifier;
};

// Mock wrapped.
