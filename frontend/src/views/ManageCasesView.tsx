import React, { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { Search, Edit, Trash2, AlertTriangle, User, Calendar, X, Building, CheckCircle } from 'lucide-react';

interface Patient {
  id: string;
  organisationName: string;
  facilityType: string;
  medicineType: string;
  isPriority: boolean;
  sufferingFrom: string;
  treatmentName: string;
  treatmentNotes: string | null;
  existingInfo: string | null;
  firstName: string | null;
  lastName: string | null;
  idNumber: string | null;
  dob: string | null;
  gender: string | null;
  contact: string | null;
  medicalAid: string | null;
  medicalAidNumber: string | null;
  createdAt: string;
}

export default function ManageCasesView({ showToast }: { showToast?: (m: string, t: 'success' | 'error') => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/patients', 'GET');
      setPatients(data || []);
    } catch (err) {
      console.error('Failed to fetch patients', err);
      if (showToast) showToast('Failed to load patients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const confirmDelete = async () => {
    if (!deletingPatient) return;
    setSubmitting(true);
    try {
      await apiRequest(`/patients/${deletingPatient.id}`, 'DELETE');
      if (showToast) showToast('Patient deleted successfully', 'success');
      setDeletingPatient(null);
      fetchPatients();
    } catch (err) {
      console.error('Failed to delete patient', err);
      if (showToast) showToast('Failed to delete patient', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;
    setSubmitting(true);
    
    try {
      await apiRequest(`/patients/${editingPatient.id}`, 'PUT', {
        organisationName: editingPatient.organisationName,
        facilityType: editingPatient.facilityType,
        medicineType: editingPatient.medicineType,
        treatmentName: editingPatient.treatmentName,
        sufferingFrom: editingPatient.sufferingFrom,
        firstName: editingPatient.firstName,
        lastName: editingPatient.lastName,
        idNumber: editingPatient.idNumber,
        dob: editingPatient.dob,
        gender: editingPatient.gender,
        contact: editingPatient.contact,
        medicalAid: editingPatient.medicalAid,
        medicalAidNumber: editingPatient.medicalAidNumber,
        treatmentNotes: editingPatient.treatmentNotes,
        existingInfo: editingPatient.existingInfo,
        isPriority: editingPatient.isPriority
      });
      if (showToast) showToast('Patient updated successfully', 'success');
      setEditingPatient(null);
      fetchPatients();
    } catch (err) {
      console.error('Failed to update patient', err);
      if (showToast) showToast('Failed to update patient', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
    const cond = (p.sufferingFrom || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || cond.includes(search) || p.id.toLowerCase().includes(search);
  });

  return (
    <div className="panel-card animate-slide-up" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
        <div>
          <h3 className="panel-title">Manage Cases</h3>
          <p style={{ color: 'var(--muted-foreground)' }}>Edit case details or delete cases entirely.</p>
        </div>
        
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by name, condition, or Patient ID..." 
            style={{ paddingLeft: '2.75rem', height: '3rem', fontSize: '1rem' }}
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--muted-foreground)' }}>Loading patient cases...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--input-bg)', borderRadius: 'var(--radius)' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.1rem' }}>No patients found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredPatients.map(patient => (
            <div key={patient.id} className="case-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {patient.firstName} {patient.lastName}
                  {patient.isPriority && (
                    <span className="badge badge-error" style={{ fontSize: '0.7rem' }}>PRIORITY</span>
                  )}
                </h4>
                <div style={{ marginBottom: '0.5rem' }}>
                   <span className="badge badge-primary">{patient.sufferingFrom}</span>
                </div>
                <div className="case-meta">
                  <span className="meta-item"><User size={14} /> ID: {patient.id}</span>
                  <span className="meta-item"><Building size={14} /> {patient.organisationName}</span>
                  <span className="meta-item"><Calendar size={14} /> {new Date(patient.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setEditingPatient(patient)}>
                  <Edit size={16} /> Edit
                </button>
                <button className="btn" style={{ background: '#ef4444', color: 'white', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setDeletingPatient(patient)}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPatient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="panel-card" style={{ width: '400px', animation: 'scaleUp 0.2s ease-out' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} /> Confirm Deletion
            </h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--muted-foreground)' }}>
              Are you sure you want to delete <strong>{deletingPatient.firstName} {deletingPatient.lastName}</strong>? This will permanently delete the record and all attached documents.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setDeletingPatient(null)}>Cancel</button>
              <button className="btn" style={{ background: '#ef4444', color: 'white' }} onClick={confirmDelete} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Case'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPatient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>Edit Patient</h3>
              <button className="btn btn-outline" onClick={() => setEditingPatient(null)}>
                <X size={16} /> Close
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="form-label">First Name</label>
                  <input type="text" className="form-input" value={editingPatient.firstName || ''} onChange={e => setEditingPatient({...editingPatient, firstName: e.target.value})} required />
                </div>
                <div>
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" value={editingPatient.lastName || ''} onChange={e => setEditingPatient({...editingPatient, lastName: e.target.value})} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="form-label">Organisation Name</label>
                  <input type="text" className="form-input" value={editingPatient.organisationName} onChange={e => setEditingPatient({...editingPatient, organisationName: e.target.value})} required />
                </div>
                <div>
                  <label className="form-label">Facility Type</label>
                  <input type="text" className="form-input" value={editingPatient.facilityType} onChange={e => setEditingPatient({...editingPatient, facilityType: e.target.value})} required />
                </div>
                <div>
                  <label className="form-label">Medicine Type</label>
                  <input type="text" className="form-input" value={editingPatient.medicineType} onChange={e => setEditingPatient({...editingPatient, medicineType: e.target.value})} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="form-label">Condition / Suffering From</label>
                  <input type="text" className="form-input" value={editingPatient.sufferingFrom} onChange={e => setEditingPatient({...editingPatient, sufferingFrom: e.target.value})} required />
                </div>
                <div>
                  <label className="form-label">Treatment Name</label>
                  <input type="text" className="form-input" value={editingPatient.treatmentName} onChange={e => setEditingPatient({...editingPatient, treatmentName: e.target.value})} required />
                </div>
              </div>

              <div>
                <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editingPatient.isPriority} onChange={e => setEditingPatient({...editingPatient, isPriority: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontWeight: '500' }}>Flag as Priority Case</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <CheckCircle size={18} /> {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
