import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface Job {
  id: string; status: string;
  total_outfits: number; completed_outfits: number; created_at: string;
}

const Badge = ({ status }: { status: string }) => (
  <span className={`badge badge--${status}`}>
    <svg width="7" height="7" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
    {status}
  </span>
);

export default function Jobs() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/jobs/').then(r => setJobs(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 13 }}>
        <div className="spinner" /> Loading…
      </div>
    </main>
  );

  return (
    <main className="page">
      <div className="jobs-header">
        <div>
          <h2 className="text-xl">Generation jobs</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/" id="new-job-btn" className="btn btn-primary">New job</Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card empty-state">
          <p>No jobs yet.</p>
          <Link to="/">Create your first generation</Link>
        </div>
      ) : (
        <div>
          {jobs.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="job-row">
              <div className="job-row__left">
                <Badge status={job.status} />
                <div className="job-row__meta">
                  <p>{job.total_outfits} outfit{job.total_outfits !== 1 ? 's' : ''}</p>
                  <span>
                    {new Date(job.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <div className="job-row__right">
                <span>{job.completed_outfits}/{job.total_outfits} done</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
