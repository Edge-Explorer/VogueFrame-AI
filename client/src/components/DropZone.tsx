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

  return (
    <div>
      <label className="label">{label}</label>
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
        <div className="file-chips">
          {files.map((f, i) => (
            <div key={i} className="file-chip">
              {f.name.length > 24 ? f.name.slice(0, 22) + '…' : f.name}
              <button onClick={(e) => { e.stopPropagation(); remove(i); }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
