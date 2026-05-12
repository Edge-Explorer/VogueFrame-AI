// Jobs list page — shows all jobs for the authenticated user
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface Job {
  id: string;
  status: string;
  total_outfits: number;
  completed_outfits: number;
  created_at: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    pending:    { icon: <Clock size={11} />, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    processing: { icon: <Loader2 size={11} className="animate-spin" />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    completed:  { icon: <CheckCircle size={11} />, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    failed:     { icon: <XCircle size={11} />, color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  };
  const { icon, color } = map[status] || map.pending;
  return (
    <span className={`status-badge border ${color}`}>
      {icon} {status}
    </span>
  );
};

export default function Jobs() {
  const [jobs, setJobs]     = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/jobs/').then(r => setJobs(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <main className="max-w-3xl mx-auto px-6 py-12 pt-24">
      <div className="flex items-center gap-2 text-neutral-500 text-sm">
        <Loader2 size={14} className="animate-spin" /> Loading jobs…
      </div>
    </main>
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 pt-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">Generation jobs</h2>
          <p className="text-sm text-neutral-500 mt-1">{jobs.length} job{jobs.length !== 1 ? 's' : ''} found</p>
        </div>
        <Link to="/" id="new-job-btn" className="btn-primary">New job</Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-neutral-500 text-sm">No jobs yet.</p>
          <Link to="/" className="text-white text-sm underline underline-offset-2 mt-3 inline-block">
            Create your first generation
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`}
                  className="card flex items-center justify-between px-5 py-4 hover:border-[#333] transition-colors">
              <div className="flex items-center gap-4">
                <StatusBadge status={job.status} />
                <div>
                  <p className="text-sm text-white font-medium">
                    {job.total_outfits} outfit{job.total_outfits !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {new Date(job.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500">
                  {job.completed_outfits}/{job.total_outfits} done
                </span>
                <ChevronRight size={14} className="text-neutral-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
