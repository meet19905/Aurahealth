import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Clock, FileText, CheckCircle, AlertCircle, Calendar, Send } from 'lucide-react';

export default function DoctorPortal() {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'leaves'
  const [appointments, setAppointments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveMessage, setLeaveMessage] = useState('');

  const fetchData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;
      const [apptRes, leavesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/appointments/doctor/user/${user.id}`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/doctors/user/${user.id}/leaves`)
      ]);
      setAppointments(apptRes.data);
      setLeaves(leavesRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!selectedAppt) {
      setMessage('Please select an appointment first.');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/appointments/${selectedAppt.id}/post-visit`, {
        notes,
        prescription
      });
      setMessage('Successfully generated summary and sent to patient!');
      setNotes('');
      setPrescription('');
      setSelectedAppt(null);
      fetchData(); // Refresh the list
    } catch (err) {
      setMessage('Failed to submit post-visit notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    setLeaveMessage('');
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/doctors/user/${user.id}/leave-request`, {
        date: leaveDate,
        reason: leaveReason
      });
      setLeaveMessage('Leave request submitted successfully.');
      setLeaveDate('');
      setLeaveReason('');
      fetchData(); // refresh leaves
    } catch (err) {
      setLeaveMessage(err.response?.data?.error || 'Failed to submit leave request.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 800, fontSize: '2.5rem', color: 'var(--primary)', margin: 0 }}>Doctor Dashboard</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`btn ${activeTab === 'appointments' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('appointments')}
          >
            <Clock size={18} style={{ marginRight: '0.5rem' }} /> Appointments
          </button>
          <button 
            className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('leaves')}
          >
            <Calendar size={18} style={{ marginRight: '0.5rem' }} /> Leave Requests
          </button>
        </div>
      </div>
      
      {activeTab === 'appointments' ? (
        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Left Column: Appointments */}
          <div>
          <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={24} color="var(--primary)" /> 
            Today's Appointments
          </h3>
          
          {appointments.length === 0 ? (
            <div className="card text-center text-muted">No appointments found.</div>
          ) : (
            appointments.map(appt => {
              const preVisitSummary = appt.aiPreVisitSummary ? JSON.parse(appt.aiPreVisitSummary) : null;
              const postVisitSummary = appt.aiPostVisitSummary ? JSON.parse(appt.aiPostVisitSummary) : null;
              
              return (
                <div 
                  key={appt.id} 
                  className="card mt-4" 
                  style={{ 
                    cursor: 'pointer', 
                    border: selectedAppt?.id === appt.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    transform: selectedAppt?.id === appt.id ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => {
                    setSelectedAppt(appt);
                    setNotes(appt.doctorNotes || '');
                    setPrescription(appt.prescription || '');
                    setMessage('');
                  }}
                >
                  <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <User size={20} /> {appt.patient.name}
                    </h4>
                    <span className={`badge ${appt.status === 'COMPLETED' ? 'badge-completed' : 'badge-confirmed'}`}>
                      {appt.status} • {appt.startTime}
                    </span>
                  </div>
                  
                  {preVisitSummary && (
                    <div className="ai-summary-box">
                      <h4>AI Pre-visit Summary</h4>
                      <p><strong>Urgency:</strong> <span style={{ color: preVisitSummary.urgencyLevel === 'High' ? 'var(--danger)' : 'var(--warning)' }}>{preVisitSummary.urgencyLevel}</span></p>
                      <p><strong>Complaint:</strong> {preVisitSummary.chiefComplaint}</p>
                      <p className="mt-2"><strong>Suggested Questions:</strong></p>
                      <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        {preVisitSummary.suggestedQuestions?.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </div>
                  )}

                  {postVisitSummary && (
                    <div className="ai-summary-box ai-summary-success">
                      <h4>AI Post-visit Summary</h4>
                      <p><strong>Summary:</strong> {postVisitSummary.patientFriendlySummary}</p>
                      
                      {postVisitSummary.followUpSteps && postVisitSummary.followUpSteps.length > 0 && (
                        <>
                          <p className="mt-2"><strong>Instructions:</strong></p>
                          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
                            {postVisitSummary.followUpSteps.map((step, i) => <li key={i}>{step}</li>)}
                          </ul>
                        </>
                      )}

                      {postVisitSummary.medicationSchedule && postVisitSummary.medicationSchedule.length > 0 && (
                        <>
                          <p className="mt-2"><strong>Medication Schedule:</strong></p>
                          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
                            {postVisitSummary.medicationSchedule.map((med, i) => <li key={i}>{med}</li>)}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Right Column: Post Visit Notes */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '100px' }}>
            <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={24} color="var(--primary)" />
              Post-visit Notes
            </h3>
            
            {!selectedAppt ? (
              <div className="text-center text-muted" style={{ padding: '3rem 0' }}>
                <AlertCircle size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                <p>Select an appointment from the left to write notes.</p>
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <strong>Selected Patient:</strong> {selectedAppt.patient.name} ({selectedAppt.status})
                </div>

                {message && (
                  <div className="alert-error" style={{ backgroundColor: message.includes('Success') ? '#d1fae5' : '#fef2f2', borderLeftColor: message.includes('Success') ? 'var(--success)' : 'var(--danger)', color: message.includes('Success') ? 'var(--success)' : 'var(--danger)' }}>
                    {message}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Clinical Notes</label>
                  <textarea 
                    className="form-textarea" 
                    rows="4" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                    disabled={selectedAppt.status === 'COMPLETED'}
                    placeholder="Enter detailed clinical notes from the visit..."
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Prescription</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Quick Select:</span>
                  </label>
                  
                  {/* Quick Select Medicine Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {['Paracetamol 500mg', 'Amoxicillin 250mg', 'Ibuprofen 400mg', 'Cetirizine 10mg', 'Omeprazole 20mg'].map(med => (
                      <button 
                        key={med}
                        type="button"
                        onClick={() => setPrescription(prev => prev ? `${prev}\\n${med}` : med)}
                        disabled={selectedAppt.status === 'COMPLETED'}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.85rem',
                          borderRadius: '999px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          cursor: selectedAppt.status === 'COMPLETED' ? 'not-allowed' : 'pointer',
                          color: 'var(--text-muted)',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { if (selectedAppt.status !== 'COMPLETED') e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        + {med}
                      </button>
                    ))}
                  </div>

                  <textarea 
                    className="form-textarea" 
                    rows="3" 
                    value={prescription} 
                    onChange={e => setPrescription(e.target.value)}
                    disabled={selectedAppt.status === 'COMPLETED'}
                    placeholder="Enter medications, dosage, and frequency..."
                  ></textarea>
                </div>
                
                {selectedAppt.status !== 'COMPLETED' ? (
                  <button 
                    className="btn btn-primary btn-block" 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !notes}
                  >
                    {isSubmitting ? 'Generating AI Summary...' : 'Submit & Generate Summary'}
                  </button>
                ) : (
                  <button className="btn btn-block" disabled style={{ background: '#e2e8f0', color: '#64748b' }}>
                    <CheckCircle size={20} style={{ marginRight: '0.5rem' }} /> Already Completed
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: '1fr 2fr' }}>
          {/* Request Form */}
          <div className="card">
            <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={24} color="var(--primary)" />
              Request Leave
            </h3>
            <p className="text-muted mb-4">Submit a leave request for Admin approval. Approved leaves will automatically cancel affected appointments.</p>
            
            {leaveMessage && (
              <div className="alert-error" style={{ backgroundColor: leaveMessage.includes('success') ? '#d1fae5' : '#fef2f2', borderLeftColor: leaveMessage.includes('success') ? 'var(--success)' : 'var(--danger)', color: leaveMessage.includes('success') ? 'var(--success)' : 'var(--danger)' }}>
                {leaveMessage}
              </div>
            )}

            <form onSubmit={handleRequestLeave}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" required value={leaveDate} onChange={e => setLeaveDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" rows="3" required value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="E.g., Medical conference, personal..."></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={!leaveDate}>Submit Request</button>
            </form>
          </div>

          {/* Leave History */}
          <div>
            <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={24} color="var(--primary)" />
              My Leave Requests
            </h3>
            
            {leaves.length === 0 ? (
              <div className="card text-center text-muted">No leave requests found.</div>
            ) : (
              leaves.map(leave => (
                <div key={leave.id} className="card mt-4" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.25rem' }}>{new Date(leave.date).toDateString()}</h4>
                    <p className="text-muted mt-1" style={{ margin: 0 }}>Reason: {leave.reason}</p>
                  </div>
                  <span className={`badge ${leave.status === 'APPROVED' ? 'badge-completed' : (leave.status === 'REJECTED' ? 'badge-cancelled' : 'badge-pending')}`}>
                    {leave.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
