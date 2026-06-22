import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { Search, Database, CheckSquare, Square } from 'lucide-react';

interface Case {
  id: string;
  title: string;
  category: string;
  institution: string;
  createdAt: string;
}

interface ExtractViewProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ExtractView({ showToast }: ExtractViewProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [extractFormat, setExtractFormat] = useState<'JSON' | 'CSV' | 'PDF' | 'ZIP'>('JSON');
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchCases();
  }, [search, category]);

  async function fetchCases() {
    try {
      const data = await apiRequest(`/cases?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`);
      setCases(data);
    } catch (err: any) {
      showToast('Failed to retrieve cases.', 'error');
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
    if (selectedIds.length === cases.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cases.map(c => c.id));
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
      await apiRequest('/extract', 'POST', {
        caseIds: selectedIds,
        format: extractFormat
      });
      showToast(`Successfully extracted ${selectedIds.length} case records in ${extractFormat} format.`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message || 'Data extraction failed.', 'error');
    } finally {
      setExtracting(false);
      setProgress(0);
    }
  };

  return (
    <div className="panel-card animate-slide-up" style={{ minHeight: '450px', paddingBottom: selectedIds.length > 0 ? '5rem' : '1.5rem' }}>
      <div className="panel-header">
        <h3 className="panel-title">Data Extraction Console</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Bulk export case files for statistical processing</span>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search records by ID, title, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All Categories</option>
          <option value="Cardiology">Cardiology</option>
          <option value="Neurology">Neurology</option>
          <option value="Oncology">Oncology</option>
          <option value="Pediatrics">Pediatrics</option>
          <option value="General Medicine">General Medicine</option>
        </select>
      </div>

      {/* Main Case List Table */}
      <div className="data-table-container">
        {loading ? (
          <p style={{ color: 'var(--muted-foreground)', padding: '2rem', textAlign: 'center' }}>Syncing secure directory...</p>
        ) : cases.length === 0 ? (
          <p style={{ color: 'var(--muted-foreground)', padding: '2rem', textAlign: 'center' }}>No matches found in clinical registry.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', cursor: 'pointer' }} onClick={handleSelectAll}>
                  {selectedIds.length === cases.length && cases.length > 0 ? (
                    <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                  ) : (
                    <Square size={18} />
                  )}
                </th>
                <th>Case ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Institution</th>
                <th>Date Logged</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                return (
                  <tr key={c.id} style={{ background: isSelected ? 'var(--secondary)' : 'none' }}>
                    <td style={{ cursor: 'pointer' }} onClick={() => handleSelectToggle(c.id)}>
                      {isSelected ? (
                        <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                      ) : (
                        <Square size={18} />
                      )}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{c.id}</td>
                    <td style={{ fontWeight: '500' }}>{c.title}</td>
                    <td>
                      <span className="status-badge status-info">{c.category}</span>
                    </td>
                    <td>{c.institution}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
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
            <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{selectedIds.length}</span> record(s) selected
            {extracting && (
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginLeft: '1rem' }}>
                Decrypting & compiling ({progress}%)
              </span>
            )}
          </div>

          <div className="extract-actions">
            {extracting ? (
              // Progress Bar
              <div style={{ width: '220px', height: '8px', background: 'var(--muted)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s' }}></div>
              </div>
            ) : (
              // Format Toggles & Trigger Button
              <>
                <div className="format-selectors">
                  {(['JSON', 'CSV', 'PDF', 'ZIP'] as const).map(fmt => (
                    <button
                      key={fmt}
                      className={`format-btn ${extractFormat === fmt ? 'active' : ''}`}
                      onClick={() => setExtractFormat(fmt)}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleRunExtraction}>
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
