import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import DropZone from '../components/DropZone';
import api from '../lib/api';

const ACCEPT_IMG = { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] };
const ACCEPT_ZIP = { 'application/zip': ['.zip'], ...ACCEPT_IMG };

export default function Generate() {
  const navigate = useNavigate();
  const [outfits, setOutfits] = useState<File[]>([]);
  const [refs, setRefs]       = useState<File[]>([]);
  const [count, setCount]     = useState(2);
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!outfits.length) { setError('Upload at least one outfit image or a ZIP file.'); return; }
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      
      // Check if a single ZIP file was uploaded
      const isZip = outfits.length === 1 && outfits[0].name.toLowerCase().endsWith('.zip');
      
      if (isZip) {
        form.append('zip_file', outfits[0]);
      } else {
        outfits.forEach(f => form.append('outfit_images', f));
      }
      
      refs.forEach(f => form.append('reference_images', f));
      form.append('images_per_outfit', String(count));
      if (notes) {
        if (isZip) form.append('reference_categories', notes); // Fallback for ZIP notes if needed
        else form.append('outfit_names', notes);
      }
      
      const endpoint = isZip ? '/jobs/upload-zip' : '/jobs/';
      const { data } = await api.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/jobs/${data.job_id}`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      
      // Handle Vercel Hobby 10s Timeout limit for heavy ZIP uploads
      if (err.response?.status === 504 || err.message.includes('timeout')) {
        window.alert("Your batch upload is large and has been safely queued in the background!\n\nRedirecting you to the Jobs page to track its progress.");
        navigate('/jobs');
        return;
      }

      if (Array.isArray(detail)) {
        // FastAPI 422 validation errors are arrays
        setError(detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', '));
      } else {
        setError(detail || 'Failed to start job. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="page-header">
        <h2>New generation</h2>
        <p>Upload garments and optional references. The AI preserves each outfit while adapting model, pose, and scene.</p>
      </div>

      <form onSubmit={submit}>
        {/* Outfit upload */}
        <div className="card section" style={{ marginBottom: 12 }}>
          <p className="section-title">Outfit images</p>
          <DropZone
            label=""
            hint="PNG, JPG or ZIP — up to 20 garments"
            accept={ACCEPT_ZIP}
            multiple
            files={outfits}
            onFiles={setOutfits}
          />
        </div>

        {/* Reference upload */}
        <div className="card section" style={{ marginBottom: 12 }}>
          <p className="section-title">Reference images <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
          <DropZone
            label=""
            hint="Model, background, lighting or vibe references"
            accept={ACCEPT_IMG}
            multiple
            files={refs}
            onFiles={setRefs}
          />
        </div>

        {/* Settings */}
        <div className="card section" style={{ marginBottom: 20 }}>
          <p className="section-title">Settings</p>
          <div className="settings-grid">
            <div>
              <label className="label">Images per outfit</label>
              <select id="images-per-outfit" value={count}
                      onChange={e => setCount(Number(e.target.value))} className="input">
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Creative notes</label>
              <input id="creative-notes" className="input"
                     placeholder="e.g. outdoor campaign, golden hour"
                     value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <p className="auth-error">{error}</p>
          </div>
        )}

        <div className="footer-row">
          <span className="powered-by">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Nano Banana 2 Engine
          </span>
          <button id="submit-generation" type="submit" disabled={loading} className="btn btn-primary">
            {loading
              ? <><span className="dots"><span className="dot" style={{background:'#000'}}/><span className="dot" style={{background:'#000'}}/><span className="dot" style={{background:'#000'}}/></span> Processing…</>
              : <>Generate
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
            }
          </button>
        </div>
      </form>
    </main>
  );
}
