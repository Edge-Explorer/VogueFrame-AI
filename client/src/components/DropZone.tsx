import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  label: string;
  hint?: string;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  files: File[];
  onFiles: (f: File[]) => void;
}

export default function DropZone({ label, hint, accept, multiple = false, files, onFiles }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    onFiles(multiple ? [...files, ...accepted] : accepted.slice(0, 1));
  }, [files, multiple, onFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept, multiple, maxFiles: multiple ? 20 : 1,
  });

  const remove = (idx: number) => onFiles(files.filter((_, i) => i !== idx));

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'dropzone--active' : ''}`}>
        <input {...getInputProps()} />
        <div className="dropzone__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        {isDragActive
          ? <p className="dropzone__text">Drop here…</p>
          : <p className="dropzone__text">Drag & drop or <span>browse</span></p>
        }
        {hint && <p className="dropzone__hint">{hint}</p>}
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => {
            const isZip = f.name.toLowerCase().endsWith('.zip');
            const isImage = f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp)$/i);
            let previewUrl = '';
            if (isImage) {
              try { previewUrl = URL.createObjectURL(f); } catch (e) {}
            }

            return (
              <div key={i} className="file-item fade-up">
                <div className="file-item__left">
                  {isImage && previewUrl ? (
                    <img src={previewUrl} className="file-item__preview" alt="" />
                  ) : (
                    <div className="file-item__icon">
                      {isZip ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M10 4v4" />
                          <path d="M14 4v4" />
                          <path d="M12 8v4" />
                          <circle cx="12" cy="14" r="1" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                          <polyline points="13 2 13 9 20 9" />
                        </svg>
                      )}
                    </div>
                  )}

                  <div className="file-item__info">
                    <p className="file-item__name" title={f.name}>{f.name}</p>
                    <div className="file-item__meta">
                      <span>{formatSize(f.size)}</span>
                      <span className="file-item__badge">{isZip ? 'Archive' : 'Image'}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="file-item__remove"
                  onClick={(e) => { e.stopPropagation(); remove(i); }}
                  title="Remove file"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
