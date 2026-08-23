import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Check, X } from 'lucide-react';

export default function AdminPortal() {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [message, setMessage] = useState('');
  const [doctorMsg, setDoctorMsg] = useState('');
  const [stats, setStats] = useState({ patientCount: 0, doctorCount: 0, appointmentCount: 0 });
  
  // Manual doctor form state
  const [newDoctor, setNewDoctor] = useState({ name: '', email: '', password: '', specialization: '' });
  const [manualMsg, setManualMsg] = useState('');

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  const fetchLeaves = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/admin/leaves/pending');
      setPendingLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDoctorRequests = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/admin/doctor-requests/pending');
      setPendingDoctors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLeaves();
    fetchDoctorRequests();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await axios.post(`http://localhost:5001/api/admin/leaves/${id}/approve`);
      setMessage(res.data.message);
      fetchLeaves();
    } catch (err) {
      setMessage('Failed to approve leave.');
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.post(`http://localhost:5001/api/admin/leaves/${id}/reject`);
      setMessage('Leave request rejected.');
      fetchLeaves();
    } catch (err) {
      setMessage('Failed to reject leave.');
    }
  };

  const handleApproveDoctor = async (id) => {
    try {
      const res = await axios.post(`http://localhost:5001/api/admin/doctor-requests/${id}/approve`);
      setDoctorMsg(res.data.message);
      fetchDoctorRequests();
    } catch (err) {
      setDoctorMsg('Failed to approve registration.');
    }
  };

  const handleRejectDoctor = async (id) => {
    try {
      await axios.post(`http://localhost:5001/api/admin/doctor-requests/${id}/reject`);
      setDoctorMsg('Registration rejected.');
      fetchDoctorRequests();
    } catch (err) {
      setDoctorMsg('Failed to reject registration.');
    }
  };

  const handleManualDoctorAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5001/api/admin/doctors', newDoctor);
      setManualMsg('Doctor added successfully!');
      setNewDoctor({ name: '', email: '', password: '', specialization: '' });
      fetchStats();
    } catch (err) {
      setManualMsg(err.response?.data?.error || 'Failed to add doctor');
    }
  };

  return (
    <div>
      <h2 className="mb-4">Admin Dashboard</h2>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h4 className="text-muted" style={{ margin: 0, marginBottom: '0.5rem' }}>Total Patients</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>{stats.patientCount}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h4 className="text-muted" style={{ margin: 0, marginBottom: '0.5rem' }}>Total Doctors</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>{stats.doctorCount}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h4 className="text-muted" style={{ margin: 0, marginBottom: '0.5rem' }}>Appointments</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>{stats.appointmentCount}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Calendar size={24} color="var(--primary)" /> Pending Leave Requests
          </h3>
          <p className="text-muted mb-4">Review and approve leave requests from doctors. Approving a leave will automatically cancel any overlapping appointments.</p>
          
          {message && <div style={{ padding: '1rem', background: message.includes('Failed') ? '#fef2f2' : '#d1fae5', color: message.includes('Failed') ? '#991b1b' : '#047857', marginBottom: '1rem', borderRadius: '8px' }}>{message}</div>}

          {pendingLeaves.length === 0 ? (
            <div className="text-center text-muted mt-4">No pending leave requests.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingLeaves.map(leave => (
                <div key={leave.id} style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>Dr. {leave.doctor.user.name}</h4>
                    <strong>{new Date(leave.date).toDateString()}</strong>
                  </div>
                  <p className="text-muted mb-2">Reason: {leave.reason}</p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-block" style={{ padding: '0.5rem', background: '#d1fae5', color: '#047857', border: '1px solid #34d399' }} onClick={() => handleApprove(leave.id)}>
                      <Check size={18} style={{ marginRight: '0.5rem' }} /> Approve
                    </button>
                    <button className="btn btn-block" style={{ padding: '0.5rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171' }} onClick={() => handleReject(leave.id)}>
                      <X size={18} style={{ marginRight: '0.5rem' }} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4">Pending Doctor Registrations</h3>
          <p className="text-muted mb-4">Review and approve new doctors wanting to join the clinic.</p>

          {doctorMsg && <div style={{ padding: '1rem', background: doctorMsg.includes('Failed') ? '#fef2f2' : '#d1fae5', color: doctorMsg.includes('Failed') ? '#991b1b' : '#047857', marginBottom: '1rem', borderRadius: '8px' }}>{doctorMsg}</div>}

          {pendingDoctors.length === 0 ? (
            <div className="text-center text-muted mt-4">No pending doctor registrations.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingDoctors.map(req => (
                <div key={req.id} style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{req.name}</h4>
                  </div>
                  <p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>Email: {req.email}</p>
                  <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>Spec: {req.specialization}</p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-block" style={{ padding: '0.5rem', background: '#d1fae5', color: '#047857', border: '1px solid #34d399' }} onClick={() => handleApproveDoctor(req.id)}>
                      <Check size={18} style={{ marginRight: '0.5rem' }} /> Approve
                    </button>
                    <button className="btn btn-block" style={{ padding: '0.5rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171' }} onClick={() => handleRejectDoctor(req.id)}>
                      <X size={18} style={{ marginRight: '0.5rem' }} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4">
        <h3 className="mb-4">Manual Doctor Addition</h3>
        <p className="text-muted mb-4">Directly add a new doctor profile without them needing to register.</p>
        
        {manualMsg && <div style={{ padding: '1rem', background: manualMsg.includes('Failed') ? '#fef2f2' : '#d1fae5', color: manualMsg.includes('Failed') ? '#991b1b' : '#047857', marginBottom: '1rem', borderRadius: '8px' }}>{manualMsg}</div>}

        <form onSubmit={handleManualDoctorAdd} className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" required className="form-input" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" required className="form-input" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" required className="form-input" value={newDoctor.password} onChange={e => setNewDoctor({...newDoctor, password: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Specialization</label>
            <input type="text" required className="form-input" value={newDoctor.specialization} onChange={e => setNewDoctor({...newDoctor, specialization: e.target.value})} placeholder="e.g. Cardiologist" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Doctor Profile</button>
          </div>
        </form>
      </div>

    </div>
  );
}
