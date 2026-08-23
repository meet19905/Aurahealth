import { Link } from 'react-router-dom';
import { ShieldCheck, UserPlus, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div style={{ marginTop: '3rem' }}>
      <div className="text-center" style={{ marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '4.5rem', marginBottom: '1.5rem', fontWeight: '800', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
          Next-Gen <span style={{ background: 'linear-gradient(90deg, #4f46e5, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AuraHealth</span>
        </h1>
        <p className="text-muted" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          Experience the future of medical appointments. AI-powered summaries, smart scheduling, and seamless doctor-patient communication.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Sign In Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '16px', marginBottom: '1rem' }}>
              <ShieldCheck size={32} />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Welcome Back</h2>
            <p className="text-muted">Sign in to view your upcoming appointments, access your medical summaries, and manage your health journey.</p>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <Link to="/login" className="btn btn-primary btn-block" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem' }}>
              <span>Sign In to Account</span>
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* Register Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '16px', marginBottom: '1rem' }}>
              <UserPlus size={32} />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>New Here?</h2>
            <p className="text-muted">Create a free account to instantly book appointments with top doctors and receive AI-curated health insights.</p>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <Link to="/register" className="btn btn-primary btn-block" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem' }}>
              <span>Create an Account</span>
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

      </div>

      <div style={{ marginTop: '5rem', marginBottom: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1.5rem' }}>Why Choose AuraHealth?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Talented Doctors</h3>
            <p className="text-muted">Our clinic is staffed by highly qualified, board-certified specialists dedicated to providing the highest standard of personalized care. From cardiologists to general practitioners, you are in expert hands.</p>
          </div>
          <div className="card" style={{ padding: '2rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>AI-Powered Insights</h3>
            <p className="text-muted">We leverage advanced Artificial Intelligence to summarize your symptoms before the visit, and generate easy-to-understand post-visit summaries, ensuring clear communication and better health outcomes.</p>
          </div>
          <div className="card" style={{ padding: '2rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Seamless Management</h3>
            <p className="text-muted">Book slots without conflicts, get automated Google Calendar invites, and receive timely medication reminders via email. We handle the logistics so you can focus on your health.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
