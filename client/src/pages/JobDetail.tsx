import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

interface GeneratedImage { id: string; url: string; consistency_score: number | null; }
interface OutfitItem {
  id: string; status: string; outfit_image_url: string;
  error_message?: string;
  generated_images: GeneratedImage[];
}
interface Job {
  id: string; status: string; total_outfits: number;
  completed_outfits: number; failed_outfits: number;
  created_at: string; outfits: OutfitItem[];
}

const POLL_MS = 4000;

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#fbbf24', processing: '#60a5fa', completed: '#34d399', failed: '#f87171'
  };
  const isSpinning = status === 'processing';
  return isSpinning
    ? <div className="spinner" style={{ borderTopColor: '#60a5fa' }} />
    : <svg width="8" height="8" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="4" fill={colors[status] || '#555'} />
      </svg>;
}

export default function JobDetail() {
  const { id }              = useParams<{ id: string }>();
  const [job, setJob]       = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const fetchJob = useCallback(() => {
    if (!id) return;
    api.get(`/jobs/${id}`).then(r => setJob(r.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchJob();
    const t = setInterval(() => {
      if (job?.status === 'completed' || job?.status === 'failed') return;
      fetchJob();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [fetchJob, job?.status]);

  const regenerate = async (outfitId: string) => {
    await api.post(`/outfits/${outfitId}/regenerate`);
    fetchJob();
  };

  if (loading) return (
    <main className="page--wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 13 }}>
        <div className="spinner" /> Loading…
      </div>
    </main>
  );

  if (!job) return (
    <main className="page--wide">
      <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Job not found.</p>
    </main>
  );

  const isActive = job.status === 'pending' || job.status === 'processing';
  const progress = job.total_outfits > 0 ? (job.completed_outfits / job.total_outfits) * 100 : 0;

  return (
    <main className="page--wide">
      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Generated fashion" />
        </div>
      )}

      <Link to="/jobs" className="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All jobs
      </Link>

      {/* Header */}
      <div className="job-detail-header">
        <div>
          <div className="job-status-line">
            <StatusDot status={job.status} />
            <h2 className={`status--${job.status}`}>{job.status}</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {job.total_outfits} outfit{job.total_outfits !== 1 ? 's' : ''} ·{' '}
            {new Date(job.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        {isActive && (
          <div className="refresh-indicator">
            <div className="spinner" />
            Refreshing automatically
          </div>
        )}
      </div>

      {/* Progress */}
      {isActive && (
        <div className="progress-wrap">
          <div className="progress-meta">
            <span>{job.completed_outfits} of {job.total_outfits} complete</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Outfit cards */}
      {job.outfits?.map((item, idx) => (
        <div key={item.id} className="card outfit-card fade-up">
          <div className="outfit-card__header">
            <div className="outfit-card__title">
              <StatusDot status={item.status} />
              <span>Outfit {idx + 1}</span>
              <span className="outfit-card__status">· {item.status}</span>
            </div>
            <button
              id={`regenerate-${item.id}`}
              onClick={() => regenerate(item.id)}
              className="btn btn-ghost btn-sm"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Regenerate
            </button>
          </div>

          {item.status === 'failed' && item.error_message && (
            <div style={{ padding: '0 20px 20px', color: 'var(--color-primary)', fontSize: '0.875rem' }}>
              <strong>Error:</strong> {item.error_message}
            </div>
          )}

          <div className="image-grid">
            {/* Source */}
            {item.outfit_image_url && (
              <div className="image-tile image-tile--source">
                <img src={item.outfit_image_url} alt="Source outfit" />
                <div className="image-tile__label">Source</div>
              </div>
            )}

            {/* Generated */}
            {item.generated_images?.map(gi => (
              <div key={gi.id} className="image-tile" onClick={() => setLightbox(gi.url)}>
                <img src={gi.url} alt="Generated" />
                <a
                  href={gi.url} download target="_blank" rel="noreferrer"
                  className="image-tile__download"
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              </div>
            ))}

            {/* Placeholders */}
            {item.status === 'processing' && (!item.generated_images || item.generated_images.length === 0) &&
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="image-tile--placeholder">
                  <div className="spinner" />
                </div>
              ))
            }
          </div>
        </div>
      ))}
    </main>
  );
}
