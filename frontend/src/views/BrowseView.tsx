import { useEffect, useState, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { Search, Eye, Download, ThumbsUp, Calendar, MapPin, X, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

interface Case {
  id: string;
  title: string;
  category: string;
  institution: string;
  summary: string;
  tags: string;
  consentObtained: boolean;
  fileName: string | null;
  fileSize: number | null;
  uploadedByUserId: string;
  viewsCount: number;
  downloadsCount: number;
  likesCount: number;
  createdAt: string;
}

interface BrowseViewProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function BrowseView({ showToast }: BrowseViewProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('recent');
  
  // Selected Case for Modal Detail View
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeCaseDetails, setActiveCaseDetails] = useState<Case | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCases();
  }, [search, category, sortBy]);

  async function fetchCases() {
    try {
      const data = await apiRequest(`/cases?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&sort=${sortBy}`);
      setCases(data);
    } catch (err: any) {
      showToast('Failed to load clinical cases.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCase = async (id: string) => {
    setSelectedCaseId(id);
    setModalLoading(true);
    try {
      const details = await apiRequest(`/cases/${id}`);
      setActiveCaseDetails(details);
      // Increment views count in local list
      setCases(prev => prev.map(c => c.id === id ? { ...c, viewsCount: c.viewsCount + 1 } : c));
    } catch (err: any) {
      showToast('Failed to retrieve secure case details.', 'error');
      setSelectedCaseId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleLikeCase = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent modal opening
    try {
      await apiRequest(`/cases/${id}/like`, 'POST');
      showToast('Case liked successfully!', 'success');
      setCases(prev => prev.map(c => c.id === id ? { ...c, likesCount: c.likesCount + 1 } : c));
      if (activeCaseDetails && activeCaseDetails.id === id) {
        setActiveCaseDetails(prev => prev ? { ...prev, likesCount: prev.likesCount + 1 } : null);
      }
    } catch (err: any) {
      showToast('Failed to like case.', 'error');
    }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Featured cases carousel */}
      {cases.length > 0 && !search && category === 'All' && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="panel-title">Featured Publications</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }} onClick={() => scrollCarousel('left')}>
                <ArrowLeft size={16} />
              </button>
              <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }} onClick={() => scrollCarousel('right')}>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="carousel-container">
            <div className="carousel-track" ref={carouselRef}>
              {cases.slice(0, 5).map(c => (
                <div key={`featured-${c.id}`} className="carousel-card" onClick={() => handleOpenCase(c.id)}>
                  <span className="status-badge status-info" style={{ marginBottom: '0.75rem' }}>{c.category}</span>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', height: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {c.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>{c.institution}</p>
                  <div className="case-stats" style={{ margin: 0, justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>ID: {c.id}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className="case-stat-item"><Eye size={12} /> {c.viewsCount}</span>
                      <span className="case-stat-item"><ThumbsUp size={12} /> {c.likesCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Directory Title */}
      <div className="panel-header" style={{ marginBottom: '1.5rem', border: 'none', padding: 0 }}>
        <h3 className="panel-title">Clinical Registry Directory</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Browse case archives across specialities</span>
      </div>

      {/* Search and Filters */}
      <div className="filters-bar" style={{ marginBottom: '2rem' }}>
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search medical cases..."
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

        <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">Sort by: Recent</option>
          <option value="views">Sort by: Views</option>
          <option value="likes">Sort by: Likes</option>
          <option value="downloads">Sort by: Extractions</option>
        </select>
      </div>

      {/* Main Grid List */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>Refreshing clinical registries...</p>
      ) : cases.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>No matching studies found.</p>
      ) : (
        <div className="case-card-grid">
          {cases.map((c) => (
            <div key={c.id} className="case-grid-card" onClick={() => handleOpenCase(c.id)}>
              <div>
                <span className="status-badge status-info" style={{ marginBottom: '0.75rem' }}>{c.category}</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: '1.3' }}>{c.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.75rem' }}>{c.institution}</p>
                
                {/* Render Tag Badges */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {c.tags.split(',').map((tag, idx) => (
                    <span key={idx} style={{ background: 'var(--input-bg)', color: 'var(--muted-foreground)', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>ID: {c.id}</span>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span className="case-stat-item"><Eye size={14} /> {c.viewsCount}</span>
                  <span className="case-stat-item" style={{ cursor: 'pointer' }} onClick={(e) => handleLikeCase(e, c.id)}>
                    <ThumbsUp size={14} /> {c.likesCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CASE DETAILS OVERLAY MODAL */}
      {selectedCaseId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 28, 46, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedCaseId(null)}>
          <div className="panel-card animate-scale-up" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--muted-foreground)' }} onClick={() => setSelectedCaseId(null)}>
              <X size={20} />
            </button>

            {modalLoading || !activeCaseDetails ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>Decrypting case files...</p>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="status-badge status-info">{activeCaseDetails.category}</span>
                  <span className="status-badge status-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    <ShieldCheck size={12} /> Encrypted
                  </span>
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', lineHeight: '1.3' }}>{activeCaseDetails.title}</h2>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14} /> {activeCaseDetails.institution}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} /> {new Date(activeCaseDetails.createdAt).toLocaleDateString()}
                  </span>
                  <span>ID: {activeCaseDetails.id}</span>
                </div>

                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Decrypted Case Abstract</h4>
                <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--foreground)' }}>
                  {activeCaseDetails.summary}
                </div>

                {activeCaseDetails.fileName && (
                  <div style={{ background: 'var(--secondary)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    <span>Attached Document:</span>
                    <strong style={{ color: 'var(--primary)' }}>{activeCaseDetails.fileName}</strong>
                    <span style={{ color: 'var(--muted-foreground)' }}>({(activeCaseDetails.fileSize! / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                    <span className="case-stat-item"><Eye size={16} /> {activeCaseDetails.viewsCount} views</span>
                    <span className="case-stat-item"><Download size={16} /> {activeCaseDetails.downloadsCount} extractions</span>
                  </div>

                  <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={(e) => handleLikeCase(e, activeCaseDetails.id)}>
                    <ThumbsUp size={16} /> Like Study ({activeCaseDetails.likesCount})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
