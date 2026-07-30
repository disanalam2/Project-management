import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Lock, User, ArrowRight } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import '../index.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuthUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const envUser = import.meta.env.VITE_APP_USERNAME;
    const envPass = import.meta.env.VITE_APP_PASSWORD;

    let userData = null;

    try {
      if (email === envUser && password === envPass) {
        userData = { name: 'Master Admin', email: envUser, role: 'admin' };
      } 
      else {
        const cleanEmail = email.trim().toLowerCase();
        const userDocRef = doc(db, 'users', cleanEmail);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const dbUser = userDoc.data();
          if (dbUser.password === password) {
            userData = { name: dbUser.name, email: dbUser.email, role: dbUser.role };
          } else {
            setError('Incorrect password');
          }
        } else {
          setError('User not found. Please contact admin.');
        }
      }

      if (userData) {
        try {
          const docId = userData.name === 'Master Admin' ? envUser : userData.email.trim().toLowerCase();
          await setDoc(doc(db, 'members', docId), {
            name: userData.name,
            role: userData.role,
            lastActive: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.error("Failed to log member activity:", err);
        }

        setAuthUser(userData);
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during login. Check connection. Ensure you are connected to the internet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)', padding: '16px' }}>
      <div className="glass-panel modal-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', marginBottom: '16px' }}>
            <Lock size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Welcome Back</h1>
          <p className="text-muted" style={{ marginTop: '8px' }}>Sign in to continue to Project Hub</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={{ width: '100%', paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ width: '100%', paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', marginTop: '8px', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
