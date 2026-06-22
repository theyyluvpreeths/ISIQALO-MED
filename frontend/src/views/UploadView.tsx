import React, { useState, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { Upload, Check, Clipboard, RefreshCw, ArrowLeft, Paperclip, X } from 'lucide-react';

interface UploadViewProps {
  onNavigate: (tab: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function UploadView({ onNavigate, showToast }: UploadViewProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Cardiology');
  const [institution, setInstitution] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [consentObtained, setConsentObtained] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ caseId: string; title: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const allowedExtensions = /\.(pdf|txt|png|jpeg|jpg|webp)$/i;
    if (!allowedExtensions.test(selectedFile.name)) {
      showToast('Only medical records (.pdf, .txt) and images (.png, .jpg, .webp) are allowed.', 'error');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      showToast('Maximum file size is 10MB.', 'error');
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !institution || !summary || !tags) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    if (!consentObtained) {
      showToast('Patient consent must be verified to legally register this medical record.', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('institution', institution);
      formData.append('summary', summary);
      formData.append('tags', tags);
      formData.append('consentObtained', consentObtained ? 'true' : 'false');
      
      if (file) {
        formData.append('file', file);
      }

      const res = await apiRequest('/cases', 'POST', formData, true);
      setSuccessData({
        caseId: res.caseId,
        title: res.title
      });
      showToast('Clinical case logged and encrypted at rest.', 'success');
      resetForm();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload case record.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Cardiology');
    setInstitution('');
    setSummary('');
    setTags('');
    setConsentObtained(false);
    setFile(null);
  };

  const copyToClipboard = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.caseId);
      showToast('Case ID copied to clipboard!', 'success');
    }
  };

  if (successData) {
    return (
      <div className="panel-card animate-scale-up" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Check size={32} />
        </div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Clinical Case Logged</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.95rem', marginBottom: '2rem' }}>
          The medical case abstract and metadata files have been encrypted using AES-256-GCM.
        </p>

        <div style={{ background: 'var(--input-bg)', borderRadius: 'var(--radius)', padding: '1.25rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: '700', letterSpacing: '0.05em' }}>Generated Case ID</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)', marginTop: '0.2rem' }}>{successData.caseId}</p>
          </div>
          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={copyToClipboard}>
            <Clipboard size={16} /> Copy
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-outline" onClick={() => setSuccessData(null)}>
            <RefreshCw size={16} /> Log Another Case
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card animate-slide-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="panel-header">
        <h3 className="panel-title">Secure Medical Case Registry</h3>
        <button className="sidebar-item" style={{ color: 'var(--primary)', padding: '0.25rem 0.5rem' }} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <form onSubmit={handleUploadSubmit}>
        <div className="form-group">
          <label className="form-label">Case Study Title *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Clinical Study on Acute Myocardial Infarction in Young Adults"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Clinical Category *</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Oncology">Oncology</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="General Medicine">General Medicine</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Primary Institution *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Charlotte Maxeke Academic Hospital"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Secure Case Summary / Abstract *</label>
          <textarea
            className="form-input"
            rows={5}
            placeholder="Outline patient presentation, clinical indicators, diagnostic tests, treatment plans, and recovery. This text block will be fully encrypted at rest."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            style={{ resize: 'vertical' }}
          ></textarea>
        </div>

        <div className="form-group">
          <label className="form-label">Case Tags * (comma separated)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. heart attack, infarction, ecg, stent"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            required
          />
        </div>

        {/* Drag Drop Upload Zone */}
        <div className="form-group">
          <label className="form-label">Attach Anonymized Medical File / Charts (Optional)</label>
          {file ? (
            <div className="selected-file-pill animate-scale-up">
              <div className="file-pill-info">
                <Paperclip size={16} />
                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <button type="button" onClick={() => setFile(null)} style={{ color: 'var(--destructive)' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              className={`upload-zone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="upload-icon" size={32} style={{ margin: '0 auto 0.5rem' }} />
              <p className="upload-text">Drag and drop file here, or click to browse</p>
              <p className="upload-hint">Only anonymized PDFs, TXT files, and clinical chart images (Max 10MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".pdf,.txt,.png,.jpeg,.jpg,.webp"
              />
            </div>
          )}
        </div>

        <div className="form-group" style={{ margin: '2rem 0 1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              style={{ marginTop: '0.2rem', width: '16px', height: '16px', cursor: 'pointer' }}
              checked={consentObtained}
              onChange={(e) => setConsentObtained(e.target.checked)}
            />
            <span style={{ color: 'var(--foreground)', fontWeight: '500' }}>
              I certify that patient consent was legally acquired and that all clinical details and attachments uploaded are fully anonymized.
            </span>
          </label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Encrypting & Logging Record...' : 'Secure Case Log'}
        </button>
      </form>
    </div>
  );
}
