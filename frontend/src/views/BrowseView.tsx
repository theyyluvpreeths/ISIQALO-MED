import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { Search, Eye, AlertTriangle, ShieldCheck, User, Calendar, X, Building, Download, Paperclip } from 'lucide-react';

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

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export default function BrowseView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Single Patient View
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDocs, setPatientDocs] = useState<Document[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await apiRequest('/patients', 'GET');
        setPatients(data || []);
      } catch (err) {
        console.error('Failed to fetch patients', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleViewDetails = async (patient: Patient) => {
    setSelectedPatient(patient);
    setDetailsLoading(true);
    try {
      const data = await apiRequest(`/patients/${patient.id}`, 'GET');
      setPatientDocs(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch patient details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedPatient(null);
    setPatientDocs([]);
  };

  const filteredPatients = patients.filter(p => {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
    const cond = (p.sufferingFrom || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || cond.includes(search) || p.id.toLowerCase().includes(search);
  });

  if (selectedPatient) {
    return (
      <div className="panel-card animate-slide-up" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </h2>
              {selectedPatient.isPriority && (
                <span className="badge badge-error" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertTriangle size={14} /> PRIORITY
                </span>
              )}
            </div>
            <p style={{ color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={16} /> PACS Record • {selectedPatient.id}
            </p>
          </div>
          <button className="btn btn-outline" onClick={closeDetails}>
            <X size={16} /> Close Record
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          {/* Clinical Info */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={18} style={{ color: 'var(--primary)' }} /> Clinical Info
            </h3>
            <div style={{ background: 'var(--input-bg)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <p style={{ marginBottom: '0.75rem' }}><strong>Facility:</strong> {selectedPatient.organisationName} ({selectedPatient.facilityType})</p>
              <p style={{ marginBottom: '0.75rem' }}><strong>Category:</strong> {selectedPatient.medicineType}</p>
              <p style={{ marginBottom: '0.75rem' }}><strong>Suffering From:</strong> {selectedPatient.sufferingFrom}</p>
              <p style={{ marginBottom: '0.75rem' }}><strong>Treatment:</strong> {selectedPatient.treatmentName}</p>
              <p style={{ marginBottom: '0.75rem' }}><strong>Created:</strong> {new Date(selectedPatient.createdAt).toLocaleDateString()}</p>
              
              {(selectedPatient.treatmentNotes || selectedPatient.existingInfo) && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                  {selectedPatient.treatmentNotes && (
                    <>
                      <strong>Treatment Notes:</strong>
                      <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                        {selectedPatient.treatmentNotes}
                      </p>
                    </>
                  )}
                  {selectedPatient.existingInfo && (
                    <>
                      <strong>Clinical History:</strong>
                      <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                        {selectedPatient.existingInfo}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Demographics */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--primary)' }} /> Demographics
            </h3>
            <div style={{ background: 'var(--input-bg)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <p style={{ marginBottom: '0.75rem' }}><strong>ID/Passport:</strong> {selectedPatient.idNumber || 'N/A'}</p>
              <p style={{ marginBottom: '0.75rem' }}><strong>DOB:</strong> {selectedPatient.dob || 'N/A'}</p>
              <p style={{ marginBottom: '0.75rem' }}><strong>Gender:</strong> {selectedPatient.gender || 'N/A'}</p>
              <p style={{ marginBottom: '0.75rem' }}><strong>Contact:</strong> {selectedPatient.contact || 'N/A'}</p>
              <p style={{ marginBottom: '0.75rem' }}><strong>Medical Aid:</strong> {selectedPatient.medicalAid || 'N/A'} {selectedPatient.medicalAidNumber ? `(${selectedPatient.medicalAidNumber})` : ''}</p>
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Paperclip size={18} style={{ color: 'var(--primary)' }} /> Secure Attachments (MinIO)
          </h3>
          {detailsLoading ? (
            <p>Loading documents...</p>
          ) : patientDocs.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {patientDocs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--input-bg)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', borderRadius: 'var(--radius)' }}>
                      <Download size={20} />
                    </div>
                    <div>
                      <p style={{ fontWeight: '600' }}>{doc.fileName}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB • {doc.fileType.toUpperCase()}</p>
                    </div>
                  </div>
                  <button className="btn btn-outline" style={{ fontSize: '0.85rem' }}>Download (Mock)</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              <p style={{ color: 'var(--muted-foreground)' }}>No heavy documents attached to this patient yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card animate-slide-up" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
        <div>
          <h3 className="panel-title">Patient Roster (PACS)</h3>
          <p style={{ color: 'var(--muted-foreground)' }}>View and manage your assigned patients and their heavy clinical records.</p>
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
          <p style={{ color: 'var(--muted-foreground)' }}>Loading patient roster...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--input-bg)', borderRadius: 'var(--radius)' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.1rem' }}>No patients found matching your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredPatients.map(patient => (
            <div key={patient.id} className="case-card" onClick={() => handleViewDetails(patient)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {patient.firstName} {patient.lastName}
                    {patient.isPriority && (
                      <span className="badge badge-error" style={{ fontSize: '0.7rem' }}>PRIORITY</span>
                    )}
                  </h4>
                  <span className="badge badge-primary">{patient.sufferingFrom}</span>
                </div>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <Eye size={16} /> View PACS
                </button>
              </div>
              
              <div className="case-meta">
                <span className="meta-item"><User size={14} /> ID: {patient.id}</span>
                <span className="meta-item"><Building size={14} /> {patient.organisationName}</span>
                <span className="meta-item"><Calendar size={14} /> {new Date(patient.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
