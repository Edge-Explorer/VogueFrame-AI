import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface GeneratedImage {
  id: string;
  url: string;
  consistency_score: number | null;
}

interface OutfitItem {
  id: string;
  name?: string;
  outfit_image_url: string;
  status: string;
  prompt_used?: string;
  created_at?: string;
  generated_images: GeneratedImage[];
}

export default function Gallery() {
  const [outfits, setOutfits] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    api.get('/outfits/')
      .then(r => setOutfits(r.data))
      .catch(err => console.error('Failed to fetch gallery outfits:', err))
      .finally(() => setLoading(false));
  }, []);

  // Filter out pending/failed outfits to focus on completed user catalog items
  const filteredOutfits = outfits.filter(o => {
    const matchesSearch = search ? (o.name?.toLowerCase().includes(search.toLowerCase()) || o.prompt_used?.toLowerCase().includes(search.toLowerCase())) : true;
    return matchesSearch && o.status === 'completed' && o.generated_images.length > 0;
  });

  return (
    <main className="page--wide">
      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Gallery view" />
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h2>My Search & Inspiration Gallery</h2>
        <p>Browse through your uploaded source garments and successfully styled AI commercial results.</p>
      </div>

      {/* Search / Filter Bar */}
      <div className="card section" style={{ marginBottom: 24, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          className="input"
          style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.95rem' }}
          placeholder="Search gallery by garment notes, tags, or creative keywords..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            Clear
          </button>
        )}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--text-3)' }}>
          <div className="spinner" style={{ marginRight: 8 }} /> Loading your gallery...
        </div>
      ) : filteredOutfits.length === 0 ? (
        <div className="card section" style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.5 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <p style={{ fontSize: '1rem', color: 'var(--text-2)' }}>No generated results found in gallery</p>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
            {search ? 'Try adjusting your search query.' : 'Upload and style outfits in the Generate tab to build your inspiration gallery.'}
          </p>
          {!search && (
            <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: 16, display: 'inline-flex' }}>
              Style New Outfit
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {filteredOutfits.map((item, idx) => (
            <div key={item.id} className="card outfit-card fade-up">
              <div className="outfit-card__header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {item.name || `Garment #${item.id}`}
                  </span>
                  {item.created_at && (
                    <span style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginLeft: 8 }}>
                      · {new Date(item.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="image-grid">
                {/* Source Input */}
                <div className="image-tile image-tile--source" style={{ position: 'relative' }}>
                  <img src={item.outfit_image_url} alt="Searched Input Source" />
                  <div className="image-tile__label" style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem' }}>
                    Searched Source
                  </div>
                </div>

                {/* AI Results */}
                {item.generated_images.map(gi => (
                  <div key={gi.id} className="image-tile" onClick={() => setLightbox(gi.url)}>
                    <img src={gi.url} alt="AI Result" />
                    <div className="image-tile__label" style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', top: 8, bottom: 'auto' }}>
                      Result
                    </div>
                    <a
                      href={gi.url} download target="_blank" rel="noreferrer"
                      className="image-tile__download"
                      onClick={e => e.stopPropagation()}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
