import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { Upload, Check, Clipboard, RefreshCw, ArrowLeft, Paperclip, X, UserPlus, Building, AlertTriangle } from 'lucide-react';

interface UploadViewProps {
  onNavigate: (tab: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function UploadView({ onNavigate, showToast }: UploadViewProps) {
  // Clinical & Facility Info
  const [organisationName, setOrganisationName] = useState('');
  const [facilityType, setFacilityType] = useState('hospital');
  const [medicineType, setMedicineType] = useState('');
  const [treatmentName, setTreatmentName] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');

  // Patient Core details
  const [isPriority, setIsPriority] = useState(false);
  const [sufferingFrom, setSufferingFrom] = useState('');
  const [existingInfo, setExistingInfo] = useState('');

  // Patient demographics
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [patientIdNumber, setPatientIdNumber] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientContact, setPatientContact] = useState('');
  const [patientMedicalAid, setPatientMedicalAid] = useState('');
  const [patientMedicalAidNumber, setPatientMedicalAidNumber] = useState('');

  // File upload (Support for multiple heavy files)
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ patientId: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No longer fetching facilities dynamically, they are entered directly
  useEffect(() => {}, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const validateAndAddFiles = (selectedFiles: File[]) => {
    const allowedExtensions = /\.(stl|dcm|xray|pdf|txt|png|jpeg|jpg|webp)$/i;
    const validFiles: File[] = [];
    
    for (const f of selectedFiles) {
      if (!allowedExtensions.test(f.name)) {
        showToast(`Unsupported format: ${f.name}. Allowed: STL, DCM, XRAY, PDF, TXT, images.`, 'error');
      } else {
        validFiles.push(f);
      }
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles].slice(0, 10)); // Limit to max 10 files
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organisationName || !facilityType || !medicineType || !sufferingFrom || !treatmentName) {
      showToast('Organisation, Facility Type, Medicine Category, Condition, and Treatment Name are required.', 'error');
      return;
    }
    if (!patientFirstName || !patientLastName) {
      showToast('Patient first name and last name are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Patient
      const patientPayload = {
        organisationName,
        facilityType,
        medicineType,
        treatmentName,
        treatmentNotes,
        isPriority,
        sufferingFrom,
        existingInfo,
        firstName: patientFirstName,
        lastName: patientLastName,
        idNumber: patientIdNumber,
        dob: patientDob,
        gender: patientGender,
        contact: patientContact,
        medicalAid: patientMedicalAid,
        medicalAidNumber: patientMedicalAidNumber
      };

      const patientRes = await apiRequest('/patients', 'POST', patientPayload);
      const newPatientId = patientRes.patientId;

      // 2. Upload Document if exists
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        await apiRequest(`/patients/${newPatientId}/documents`, 'POST', formData, true);
      }

      setSuccessData({ patientId: newPatientId });
      showToast('Patient registered and files securely uploaded to PACS container.', 'success');
      resetForm();
    } catch (err: any) {
      showToast(err.message || 'Failed to register patient or upload records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOrganisationName('');
    setFacilityType('hospital');
    setMedicineType('');
    setTreatmentName('');
    setTreatmentNotes('');
    setIsPriority(false);
    setSufferingFrom('');
    setExistingInfo('');
    setPatientFirstName('');
    setPatientLastName('');
    setPatientIdNumber('');
    setPatientDob('');
    setPatientGender('');
    setPatientContact('');
    setPatientMedicalAid('');
    setPatientMedicalAidNumber('');
    setFiles([]);
  };

  const copyToClipboard = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.patientId);
      showToast('Patient ID copied to clipboard!', 'success');
    }
  };

  if (successData) {
    return (
      <div className="panel-card animate-scale-up" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Check size={32} />
        </div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Patient Registered to PACS</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.95rem', marginBottom: '2rem' }}>
          The patient and documents have been successfully persisted.
        </p>

        <div style={{ background: 'var(--input-bg)', borderRadius: 'var(--radius)', padding: '1.25rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: '700', letterSpacing: '0.05em' }}>Patient ID</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)', marginTop: '0.2rem' }}>{successData.patientId}</p>
          </div>
          <button type="button" className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={copyToClipboard}>
            <Clipboard size={16} /> Copy
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button type="button" className="btn btn-outline" onClick={() => setSuccessData(null)}>
            <RefreshCw size={16} /> Register Another
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card animate-slide-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="panel-header">
        <h3 className="panel-title">Register Patient & Upload Documents</h3>
        <button className="sidebar-item" style={{ color: 'var(--primary)', padding: '0.25rem 0.5rem' }} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <form onSubmit={handleUploadSubmit}>
        {/* PATIENT INFO */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>
            <UserPlus size={18} style={{ color: 'var(--primary)' }} /> Core Demographics
          </h4>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input type="text" className="form-input" value={patientFirstName} onChange={(e) => setPatientFirstName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input type="text" className="form-input" value={patientLastName} onChange={(e) => setPatientLastName(e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ID Number / Passport</label>
              <input type="text" className="form-input" value={patientIdNumber} onChange={(e) => setPatientIdNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-input" value={patientDob} onChange={(e) => setPatientDob(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input" value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contact Details</label>
              <input type="text" className="form-input" value={patientContact} onChange={(e) => setPatientContact(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Medical Aid Provider</label>
              <input type="text" className="form-input" placeholder="e.g. Discovery Health" value={patientMedicalAid} onChange={(e) => setPatientMedicalAid(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Medical Aid Number</label>
              <input type="text" className="form-input" value={patientMedicalAidNumber} onChange={(e) => setPatientMedicalAidNumber(e.target.value)} />
            </div>
          </div>
        </div>

        {/* CLINICAL INFO */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>
            <Building size={18} style={{ color: 'var(--primary)' }} /> Clinical & Facility Info
          </h4>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name of Organisation *</label>
              <input type="text" className="form-input" placeholder="e.g. City General Hospital" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Type of Facility *</label>
              <select className="form-input" value={facilityType} onChange={(e) => setFacilityType(e.target.value)} required>
                <option value="hospital">Hospital</option>
                <option value="private practice">Private Practice</option>
                <option value="clinic">Clinic</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Medicine Category *</label>
              <select className="form-input" value={medicineType} onChange={(e) => setMedicineType(e.target.value)} required>
                <option value="">Select Specialty</option>
                <option value="General Practice / Family Medicine">General Practice / Family Medicine</option>
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Obstetrics and Gynecology (OB/GYN)">Obstetrics and Gynecology (OB/GYN)</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Psychiatry">Psychiatry</option>
                <option value="Orthopedic Surgery">Orthopedic Surgery</option>
                <option value="Neurology">Neurology</option>
                <option value="Ophthalmology">Ophthalmology</option>
                <option value="General Surgery">General Surgery</option>
                <option value="Gastroenterology">Gastroenterology</option>
                <option value="Urology">Urology</option>
                <option value="Oncology">Oncology</option>
                <option value="Pulmonology">Pulmonology</option>
                <option value="Endocrinology">Endocrinology</option>
                <option value="Nephrology">Nephrology</option>
                <option value="Otolaryngology (ENT)">Otolaryngology (ENT)</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
                <option value="Radiology">Radiology</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Suffering From (Condition) *</label>
              <input type="text" className="form-input" placeholder="e.g. Maxillofacial trauma" value={sufferingFrom} onChange={(e) => setSufferingFrom(e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Treatment Name *</label>
              <input type="text" className="form-input" placeholder="e.g. Chemotherapy Cycle 1" value={treatmentName} onChange={(e) => setTreatmentName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
              <label className="checkbox-container" style={{ marginTop: '2rem' }}>
                <input type="checkbox" checked={isPriority} onChange={(e) => setIsPriority(e.target.checked)} />
                <span className="checkmark"></span>
                <span style={{ fontWeight: 'bold', color: 'var(--destructive)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> Mark as Priority Patient
                </span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Treatment Notes</label>
            <textarea className="form-input" rows={2} placeholder="Notes specific to the treatment..." value={treatmentNotes} onChange={(e) => setTreatmentNotes(e.target.value)}></textarea>
          </div>

          <div className="form-group">
            <label className="form-label">Existing Patient Information / History</label>
            <textarea className="form-input" rows={2} placeholder="Previous history, generic notes..." value={existingInfo} onChange={(e) => setExistingInfo(e.target.value)}></textarea>
          </div>
        </div>

        {/* ATTACHMENTS */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>
            <Upload size={18} style={{ color: 'var(--primary)' }} /> Upload PACS Document
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem' }}>
            Upload heavy files (STL, DICOM, X-Ray) up to 1GB. These are routed directly to the MinIO container.
          </p>

          <div 
            className={`upload-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`, 
              borderRadius: 'var(--radius)', 
              padding: '3rem 2rem', 
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }}
              accept=".pdf,.txt,.png,.jpeg,.jpg,.webp,.stl,.dcm,.xray"
              multiple
            />
            
            {files.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
                <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{files.length} File(s) Selected</p>
                <div style={{ display: 'grid', gap: '0.5rem', width: '100%', maxWidth: '400px' }}>
                  {files.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--background)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                        <Paperclip size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>{f.name}</span>
                      </div>
                      <button 
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ marginTop: '0.5rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  + Add More Files
                </button>
              </div>
            ) : (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <Upload size={28} />
                </div>
                <p style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Click or drag files here to upload</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                  Supported formats: STL, DCM, XRAY, PDF, Images<br/>
                  Maximum size: 1GB per file (Max 10 files)
                </p>
              </>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }} disabled={loading}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <RefreshCw className="animate-spin" size={18} /> Processing...
            </span>
          ) : (
            'Register Patient & Secure Documents'
          )}
        </button>
      </form>
    </div>
  );
}
