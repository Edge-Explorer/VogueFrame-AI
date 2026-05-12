// Job detail page — live-polling status + output gallery
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../lib/api';

interface GeneratedImage { id: string; cloudinary_url: string; consistency_score: number | null; }
interface OutfitItem {
  id: string; status: string; outfit_image_url: string;
  generated_images: GeneratedImage[];
}
interface Job {
  id: string; status: string; total_outfits: number;
  completed_outfits: number; failed_outfits: number;
  created_at: string; outfit_items: OutfitItem[];
}

const POLL_MS = 4000;

const statusColor: Record<string, string> = {
  pending:    'text-yellow-400',
  processing: 'text-blue-400',
  completed:  'text-emerald-400',
  failed:     'text-red-400',
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'completed') return <CheckCircle size={14} className="text-emerald-400" />;
  if (status === 'failed')    return <XCircle size={14} className="text-red-400" />;
  if (status === 'processing') return <Loader2 size={14} className="text-blue-400 animate-spin" />;
  return <Clock size={14} className="text-yellow-400" />;
};

export default function JobDetail() {
  const { id }                = useParams<{ id: string }>();
  const [job, setJob]         = useState<Job | null>(null);
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
    <main className="max-w-5xl mx-auto px-6 py-12 pt-24">
      <div className="flex items-center gap-2 text-neutral-500 text-sm">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    </main>
  );

  if (!job) return (
    <main className="max-w-5xl mx-auto px-6 py-12 pt-24">
      <p className="text-neutral-500 text-sm">Job not found.</p>
    </main>
  );

  const isActive = job.status === 'pending' || job.status === 'processing';
  const progress = job.total_outfits > 0 ? (job.completed_outfits / job.total_outfits) * 100 : 0;

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 pt-24">
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
             onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Generated" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}

      {/* Back nav */}
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-white
                                   text-sm transition-colors mb-8">
        <ArrowLeft size={14} /> All jobs
      </Link>

      {/* Job header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon status={job.status} />
            <h2 className={`text-xl font-semibold capitalize ${statusColor[job.status]}`}>{job.status}</h2>
          </div>
          <p className="text-sm text-neutral-500">
            {job.total_outfits} outfit{job.total_outfits !== 1 ? 's' : ''} · {' '}
            {new Date(job.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Loader2 size={12} className="animate-spin" /> Refreshing automatically…
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-neutral-500 mb-2">
            <span>{job.completed_outfits} of {job.total_outfits} complete</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700"
                 style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Outfit grid */}
      <div className="space-y-6">
        {job.outfit_items.map((item, idx) => (
          <div key={item.id} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StatusIcon status={item.status} />
                <span className="text-sm font-medium text-white">Outfit {idx + 1}</span>
                <span className={`text-xs ${statusColor[item.status]}`}>· {item.status}</span>
              </div>
              <button
                id={`regenerate-${item.id}`}
                onClick={() => regenerate(item.id)}
                className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <RefreshCw size={11} /> Regenerate
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* Source outfit thumbnail */}
              {item.outfit_image_url && (
                <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-[#0f0f0f] border border-[#2a2a2a]">
                  <img src={item.outfit_image_url} alt="Source outfit"
                       className="w-full h-full object-cover opacity-60" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-neutral-400 px-2 py-1">
                    Source
                  </div>
                </div>
              )}

              {/* Generated outputs */}
              {item.generated_images.map(gi => (
                <div key={gi.id}
                     className="relative rounded-lg overflow-hidden aspect-[3/4] bg-[#0f0f0f] border border-[#2a2a2a]
                                cursor-pointer hover:border-neutral-500 transition-colors fade-in group"
                     onClick={() => setLightbox(gi.cloudinary_url)}>
                  <img src={gi.cloudinary_url} alt="Generated fashion"
                       className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={gi.cloudinary_url} download target="_blank" rel="noreferrer"
                       onClick={e => e.stopPropagation()}
                       className="bg-black/70 p-1.5 rounded-lg text-white block">
                      <Download size={12} />
                    </a>
                  </div>
                </div>
              ))}

              {/* Empty slots while processing */}
              {item.status === 'processing' && item.generated_images.length === 0 && (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-lg aspect-[3/4] bg-[#111] border border-[#1a1a1a]
                                          flex items-center justify-center">
                    <Loader2 size={16} className="text-neutral-700 animate-spin" />
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
