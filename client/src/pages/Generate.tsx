// Main generation page — upload outfits + references, fire job
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import DropZone from '../components/DropZone';
import api from '../lib/api';

const ACCEPT_IMG = { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] };
const ACCEPT_ZIP = { 'application/zip': ['.zip'], ...ACCEPT_IMG };

export default function Generate() {
  const navigate = useNavigate();
  const [outfits, setOutfits]   = useState<File[]>([]);
  const [refs, setRefs]         = useState<File[]>([]);
  const [count, setCount]       = useState(2);
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!outfits.length) { setError('Upload at least one outfit image.'); return; }
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      outfits.forEach(f => form.append('outfit_files', f));
      refs.forEach(f => form.append('reference_files', f));
      form.append('images_per_outfit', String(count));
      if (notes) form.append('notes', notes);

      const { data } = await api.post('/jobs/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/jobs/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 pt-24">
      {/* Page heading */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-white tracking-tight">New generation</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Upload outfits and optional references. The AI preserves the garment while adapting model, pose, and setting.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        {/* Outfit upload */}
        <div className="card p-6">
          <DropZone
            label="Outfit images"
            hint="PNG, JPG or ZIP — up to 20 items"
            accept={ACCEPT_ZIP}
            multiple
            files={outfits}
            onFiles={setOutfits}
          />
        </div>

        {/* Reference upload */}
        <div className="card p-6">
          <DropZone
            label="Reference images (optional)"
            hint="Model, background, lighting or vibe references"
            accept={ACCEPT_IMG}
            multiple
            files={refs}
            onFiles={setRefs}
          />
        </div>

        {/* Settings row */}
        <div className="card p-6 grid grid-cols-2 gap-6">
          <div>
            <label className="label">Images per outfit</label>
            <select
              id="images-per-outfit"
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="input"
            >
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Creative notes (optional)</label>
            <input
              id="creative-notes"
              className="input"
              placeholder="e.g. outdoor campaign, golden hour"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-neutral-600 flex items-center gap-1.5">
            <Zap size={11} />
            Powered by Nano Banana Engine (Imagen 4)
          </p>
          <button id="submit-generation" type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <>
                <span className="flex gap-1">
                  <span className="pulse-dot w-1 h-1 bg-black rounded-full block" />
                  <span className="pulse-dot w-1 h-1 bg-black rounded-full block" />
                  <span className="pulse-dot w-1 h-1 bg-black rounded-full block" />
                </span>
                Processing…
              </>
            ) : (
              <>Generate <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
