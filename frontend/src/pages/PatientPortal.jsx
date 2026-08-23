import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Plus, User, FileText, CheckCircle, Clock } from 'lucide-react';

export default function PatientPortal() {
  const [doctors, setDoctors] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [step, setStep] = useState(0); // 0: Dashboard, 1: Search, 2: Hold, 3: Confirm

  const user = JSON.parse(localStorage.getItem('user'));

  const fetchData = async () => {
    try {
      const [docsRes, apptsRes] = await Promise.all([
        axios.get('http://localhost:5001/api/doctors'),
        axios.get(`http://localhost:5001/api/appointments/patient/user/${user.id}`)
      ]);
      setDoctors(docsRes.data);
      setMyAppointments(apptsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleHoldSlot = async () => {
    try {
      const res = await axios.post('http://localhost:5001/api/appointments/hold', {
        doctorId: selectedDoctor.id,
        patientId: user.id,
        date,
        startTime: time,
        endTime: 'TBD' // simplified
      });
      setAppointment(res.data);
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to hold slot');
    }
  };

  const handleConfirm = async () => {
    try {
      await axios.post(`http://localhost:5001/api/appointments/${appointment.id}/confirm`, {
        symptoms
      });
      setStep(3);
      fetchData(); // refresh history
    } catch (err) {
      alert(err.response?.data?.error || 'Confirmation failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)', margin: 0 }}>Patient Dashboard</h2>
        {step !== 0 && (
          <button className="btn btn-outline" onClick={() => { setStep(0); setSelectedDoctor(null); setDate(''); setTime(''); setSymptoms(''); }}>
            Back to Dashboard
          </button>
        )}
      </div>
      
      {step === 0 && (
        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: '1fr 2fr' }}>
          
          {/* Left Column: Actions */}
          <div className="flex flex-col gap-4">
            <div className="card text-center" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <Plus size={48} />
              </div>
              <h3 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Book New Visit</h3>
              <p className="text-muted mb-4">Schedule a new appointment with one of our specialists.</p>
              <button className="btn btn-primary btn-block" onClick={() => setStep(1)}>Book Appointment</button>
            </div>
          </div>
          
          {/* Right Column: Appointment History */}
          <div>
            <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={24} color="var(--primary)" /> 
              My Appointments
            </h3>
            
            {myAppointments.length === 0 ? (
              <div className="card text-center text-muted">You have no appointment history.</div>
            ) : (
              myAppointments.map(appt => {
                const postVisitSummary = appt.aiPostVisitSummary ? JSON.parse(appt.aiPostVisitSummary) : null;
                
                return (
                  <div key={appt.id} className="card mt-4" style={{ padding: '2rem' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem' }}>
                        <User size={20} /> Dr. {appt.doctor.user.name}
                      </h4>
                      <span className={`badge ${appt.status === 'COMPLETED' ? 'badge-completed' : (appt.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-pending')}`}>
                        {appt.status}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <Clock size={16} />
                      {new Date(appt.date).toDateString()} at {appt.startTime}
                    </div>

                    {appt.status === 'COMPLETED' && postVisitSummary && (
                      <div className="ai-summary-box ai-summary-success" style={{ marginTop: '1.5rem' }}>
                        <h4><FileText size={18}/> AI Post-visit Summary</h4>
                        <p style={{ fontSize: '1rem', marginTop: '0.5rem' }}><strong>Summary:</strong> {postVisitSummary.patientFriendlySummary}</p>
                        
                        {postVisitSummary.followUpSteps && postVisitSummary.followUpSteps.length > 0 && (
                          <>
                            <p className="mt-2"><strong>Instructions:</strong></p>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                              {postVisitSummary.followUpSteps.map((step, i) => <li key={i}>{step}</li>)}
                            </ul>
                          </>
                        )}

                        {postVisitSummary.medicationSchedule && postVisitSummary.medicationSchedule.length > 0 && (
                          <>
                            <p className="mt-2"><strong>Medication Schedule:</strong></p>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.25rem', fontSize: '0.95rem', color: 'var(--primary)' }}>
                              {postVisitSummary.medicationSchedule.map((med, i) => <li key={i}><strong>{med}</strong></li>)}
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
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {!selectedDoctor ? (
            <div className="card">
              <h3 style={{ fontSize: '2rem', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>Choose Your Specialist</h3>
              <p className="text-muted" style={{ marginBottom: '2rem' }}>Select a doctor to view their available time slots and book your appointment.</p>
              
              <div className="grid grid-cols-2 gap-4">
                {doctors.map(doc => (
                  <div key={doc.id} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', transition: 'all 0.3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {doc.user.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Dr. {doc.user.name}</div>
                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', marginTop: '0.25rem', display: 'inline-block' }}>
                          {doc.specialization}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto' }}>
                      <button 
                        className="btn btn-outline btn-block" 
                        onClick={() => setSelectedDoctor(doc)}
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.75rem', margin: 0 }}>Choose Date & Time</h3>
                <button className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }} onClick={() => setSelectedDoctor(null)}>Go Back</button>
              </div>
              
              <div style={{ fontSize: '1.25rem', marginBottom: '2rem', padding: '1rem', background: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}>
                Booking appointment with <strong>Dr. {selectedDoctor.user.name}</strong>
              </div>
              
              <div className="form-group mt-4">
                <label className="form-label">Select Date</label>
                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Select Time</label>
                <input type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} />
              </div>
              
              <button className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} onClick={handleHoldSlot} disabled={!date || !time}>
                Next Step
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Pre-visit Information</h3>
          
          <div style={{ padding: '1.5rem', background: '#FEF3C7', color: '#B45309', borderRadius: '12px', marginBottom: '2rem', fontSize: '1.1rem', fontWeight: '500' }}>
            We saved this time slot for you! You have 5 minutes to complete this form.
          </div>
          
          <div className="form-group">
            <label className="form-label">Please describe how you are feeling (symptoms):</label>
            <textarea className="form-textarea" rows="5" value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Example: I have a headache and a fever..."></textarea>
          </div>
          
          <button className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} onClick={handleConfirm} disabled={!symptoms}>
            Confirm My Appointment
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="card text-center" style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
          <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>
            <CheckCircle size={64} style={{ margin: '0 auto' }} />
          </div>
          <h3 style={{ color: 'var(--success)', fontSize: '2.5rem', marginBottom: '1.5rem' }}>Booking Confirmed!</h3>
          <p className="mt-4 text-muted" style={{ fontSize: '1.25rem', marginBottom: '3rem' }}>
            Your appointment has been successfully booked. You will receive an email and a calendar invite shortly.
          </p>
          <button className="btn btn-outline btn-block" onClick={() => { setStep(0); setSelectedDoctor(null); setDate(''); setTime(''); setSymptoms(''); }}>
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
