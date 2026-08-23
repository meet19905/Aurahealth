import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, UserPlus, ArrowRight, HeartPulse, Stethoscope, Home } from 'lucide-react';

export default function Register() {
  const [role, setRole] = useState('PATIENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      if (role === 'DOCTOR') {
        const res = await axios.post('http://localhost:5001/api/auth/register-doctor-request', { name, email, password, specialization });
        setSuccess(res.data.message);
        setName(''); setEmail(''); setPassword(''); setSpecialization('');
      } else {
        await axios.post('http://localhost:5001/api/auth/register', { name, email, password });
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left auth-left-register">
        <div className="auth-left-content">
          <HeartPulse size={64} className="mb-4" />
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>Join Our Clinic.</h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>
            Experience seamless healthcare management. Book appointments, track your history, and connect with doctors instantly.
          </p>
        </div>
      </div>
      
      <div className="auth-right" style={{ position: 'relative' }}>
        <Link to="/" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, padding: '0.5rem' }}>
          <Home size={20} /> Home
        </Link>
        <div className="auth-form-wrapper">
          <div className="text-center mb-4">
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>Create Account</h2>
            <p className="text-muted">Fill in your details to get started</p>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-color)', padding: '0.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <button 
              className="btn"
              type="button"
              style={{ flex: 1, padding: '0.5rem', background: role === 'PATIENT' ? 'var(--card-bg)' : 'transparent', color: role === 'PATIENT' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: role === 'PATIENT' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
              onClick={() => setRole('PATIENT')}
            >
              Patient
            </button>
            <button 
              className="btn"
              type="button"
              style={{ flex: 1, padding: '0.5rem', background: role === 'DOCTOR' ? 'var(--card-bg)' : 'transparent', color: role === 'DOCTOR' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: role === 'DOCTOR' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
              onClick={() => setRole('DOCTOR')}
            >
              Doctor
            </button>
          </div>

          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}
          {success && (
            <div className="alert-error" style={{ backgroundColor: '#d1fae5', borderLeftColor: 'var(--success)', color: 'var(--success)' }}>
              {success}
            </div>
          )}
          
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-with-icon">
                <User className="input-icon" size={20} />
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="John Doe"
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
            </div>

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

            {role === 'DOCTOR' && (
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <div className="input-with-icon">
                  <Stethoscope className="input-icon" size={20} />
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Cardiologist"
                    value={specialization} 
                    onChange={e => setSpecialization(e.target.value)} 
                  />
                </div>
              </div>
            )}
            
            <button type="submit" className="btn btn-primary btn-block mt-4" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : (
                <>
                  Create Account <UserPlus size={20} style={{ marginLeft: '0.5rem' }} />
                </>
              )}
            </button>
          </form>
          
          <p className="text-center mt-4 text-muted">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
              Sign in <ArrowRight size={16} style={{ marginLeft: '4px' }}/>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
