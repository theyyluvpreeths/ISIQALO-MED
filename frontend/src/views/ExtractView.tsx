import { useEffect, useState } from 'react';
import { apiRequest, getToken } from '../utils/api';
import { Search, Database, CheckSquare, Square, AlertTriangle } from 'lucide-react';

interface Patient {
  id: string;
  facilityId: string;
  isPriority: boolean;
  sufferingFrom: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

interface ExtractViewProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ExtractView({ showToast }: ExtractViewProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Advanced Search
  const [advHospital, setAdvHospital] = useState('');
  const [advCategory, setAdvCategory] = useState('');
  const [advMedicalAid, setAdvMedicalAid] = useState('');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [extractFormat, setExtractFormat] = useState<'JSON' | 'CSV' | 'PDF' | 'ZIP'>('JSON');
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchPatients();
  }, [advHospital, advCategory, advMedicalAid]);

  async function fetchPatients() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (advHospital) params.append('organisationName', advHospital);
      if (advCategory) params.append('medicineType', advCategory);
      if (advMedicalAid) params.append('medicalAid', advMedicalAid);

      const data = await apiRequest(`/patients?${params.toString()}`, 'GET');
      setPatients(data || []);
    } catch (err: any) {
      showToast('Failed to retrieve patient roster.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSelectToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPatients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPatients.map(p => p.id));
    }
  };

  const handleRunExtraction = async () => {
    if (selectedIds.length === 0) return;
    
    setExtracting(true);
    setProgress(15);
    
    // Simulate compilation steps for visual premium feedback
    const steps = [35, 60, 85, 100];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 300));
      setProgress(steps[i]);
    }

    try {
      // Create a blob request for extraction
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          patientIds: selectedIds,
          format: extractFormat
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract data');
      }

      // Download logic
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `isiqalo_pacs_extract_${Date.now()}.${extractFormat.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast(`Successfully extracted ${selectedIds.length} patient records in ${extractFormat} format.`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message || 'Data extraction failed.', 'error');
    } finally {
      setExtracting(false);
      setProgress(0);
    }
  };

  const filteredPatients = patients.filter(p => {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
    const cond = (p.sufferingFrom || '').toLowerCase();
    const searchLow = search.toLowerCase();
    return fullName.includes(searchLow) || cond.includes(searchLow) || p.id.toLowerCase().includes(searchLow);
  });

  return (
    <div className="panel-card animate-slide-up" style={{ minHeight: '450px', paddingBottom: selectedIds.length > 0 ? '5rem' : '1.5rem' }}>
      <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <h3 className="panel-title">Data Extraction (PACS)</h3>
          <p style={{ color: 'var(--muted-foreground)' }}>Bulk export patient records and clinical history</p>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search patients by ID, name, or condition..." 
            style={{ paddingLeft: '2.75rem', height: '3rem', fontSize: '1rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Hospital Name" 
            value={advHospital}
            onChange={e => setAdvHospital(e.target.value)}
          />
          <select className="form-input" value={advCategory} onChange={e => setAdvCategory(e.target.value)}>
            <option value="">All Categories</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Dentistry">Dentistry</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Emergency Medicine">Emergency Medicine</option>
            <option value="Endocrinology">Endocrinology</option>
            <option value="Gastroenterology">Gastroenterology</option>
            <option value="General Practice / Family Medicine">General Practice / Family Medicine</option>
            <option value="General Surgery">General Surgery</option>
            <option value="Internal Medicine">Internal Medicine</option>
            <option value="Nephrology">Nephrology</option>
            <option value="Neurology">Neurology</option>
            <option value="Obstetrics and Gynecology (OB/GYN)">Obstetrics and Gynecology (OB/GYN)</option>
            <option value="Oncology">Oncology</option>
            <option value="Ophthalmology">Ophthalmology</option>
            <option value="Orthopedic Surgery">Orthopedic Surgery</option>
            <option value="Otolaryngology (ENT)">Otolaryngology (ENT)</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Psychiatry">Psychiatry</option>
            <option value="Pulmonology">Pulmonology</option>
            <option value="Radiology">Radiology</option>
            <option value="Urology">Urology</option>
          </select>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Medical Aid" 
            value={advMedicalAid}
            onChange={e => setAdvMedicalAid(e.target.value)}
          />
        </div>
      </div>

      {/* Main List Table */}
      <div className="data-table-container">
        {loading ? (
          <p style={{ color: 'var(--muted-foreground)', padding: '2rem', textAlign: 'center' }}>Syncing secure directory...</p>
        ) : filteredPatients.length === 0 ? (
          <p style={{ color: 'var(--muted-foreground)', padding: '2rem', textAlign: 'center' }}>No patients found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', cursor: 'pointer' }} onClick={handleSelectAll}>
                  {selectedIds.length === filteredPatients.length && filteredPatients.length > 0 ? (
                    <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                  ) : (
                    <Square size={18} />
                  )}
                </th>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Condition</th>
                <th>Priority</th>
                <th>Date Logged</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <tr key={p.id} style={{ background: isSelected ? 'var(--secondary)' : 'none' }}>
                    <td style={{ cursor: 'pointer' }} onClick={() => handleSelectToggle(p.id)}>
                      {isSelected ? (
                        <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                      ) : (
                        <Square size={18} />
                      )}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{p.id}</td>
                    <td style={{ fontWeight: '500' }}>{p.firstName} {p.lastName}</td>
                    <td>{p.sufferingFrom}</td>
                    <td>
                      {p.isPriority ? (
                        <span className="badge badge-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={12}/> PRIORITY</span>
                      ) : '-'}
                    </td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* FIXED BOTTOM ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="extract-bar animate-slide-up">
          <div className="extract-info">
            <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{selectedIds.length}</span> patient(s) selected
            {extracting && (
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginLeft: '1rem' }}>
                Fetching & compiling ({progress}%)
              </span>
            )}
          </div>

          <div className="extract-actions">
            {extracting ? (
              // Progress Bar
              <div style={{ width: '250px', background: 'var(--border)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.3s ease' }}></div>
              </div>
            ) : (
              <>
                <select 
                  className="form-input" 
                  style={{ width: 'auto', minWidth: '120px', padding: '0.5rem' }}
                  value={extractFormat}
                  onChange={(e) => setExtractFormat(e.target.value as any)}
                >
                  <option value="JSON">JSON Data</option>
                  <option value="CSV">CSV Spreadsheet</option>
                  <option value="PDF">PDF Report</option>
                  <option value="ZIP">ZIP Archive (Mock)</option>
                </select>

                <button className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }} onClick={handleRunExtraction}>
                  <Database size={16} /> Run Extraction
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
