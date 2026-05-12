// Drag-and-drop upload zone component
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';

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
    <div className="space-y-3">
      <label className="label">{label}</label>
      <div
        {...getRootProps()}
        className={`border border-dashed border-[#2a2a2a] rounded-xl p-6 text-center cursor-pointer
                    transition-all duration-200 hover:border-neutral-500 hover:bg-[#111]
                    ${isDragActive ? 'dropzone-active' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload size={20} strokeWidth={1.5} className="mx-auto mb-2 text-neutral-600" />
        {isDragActive
          ? <p className="text-sm text-neutral-400">Drop here…</p>
          : <p className="text-sm text-neutral-500">
              Drag files here or <span className="text-neutral-300 underline underline-offset-2">browse</span>
            </p>
        }
        {hint && <p className="text-xs text-neutral-600 mt-1">{hint}</p>}
      </div>

      {/* File chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg
                                   px-3 py-1.5 text-xs text-neutral-300">
              {f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name}
              <button onClick={(e) => { e.stopPropagation(); remove(i); }}
                      className="text-neutral-600 hover:text-white ml-1 transition-colors">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
