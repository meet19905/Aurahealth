import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, LogIn, ArrowRight, Activity, Home } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      const role = res.data.user.role;
      if (role === 'PATIENT') navigate('/patient');
      else if (role === 'DOCTOR') navigate('/doctor');
      else if (role === 'ADMIN') navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left-content">
          <Activity size={64} className="mb-4" />
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>Welcome Back.</h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>
            Sign in to access your appointments, medical history, and personalized care plans.
          </p>
        </div>
      </div>
      
      <div className="auth-right" style={{ position: 'relative' }}>
        <Link to="/" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, padding: '0.5rem' }}>
          <Home size={20} /> Home
        </Link>
        <div className="auth-form-wrapper">
          <div className="text-center mb-4">
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>Sign In</h2>
            <p className="text-muted">Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={20} />
                <input 
                  type="email" 
                  required 
                  className="form-input" 
                  placeholder="name@example.com"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={20} />
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary btn-block mt-4" disabled={isLoading}>
              {isLoading ? 'Signing In...' : (
                <>
                  Sign In <LogIn size={20} style={{ marginLeft: '0.5rem' }} />
                </>
              )}
            </button>
          </form>
          
          <p className="text-center mt-4 text-muted">
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
              Create one <ArrowRight size={16} style={{ marginLeft: '4px' }}/>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
