'use client';
import * as React from 'react';

interface Props {
  onFiles: (files: FileList | null) => void;
  disabled?: boolean;
}

export function DropZone({ onFiles, disabled }: Props) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 select-none
        ${disabled ? 'opacity-50 cursor-not-allowed border-slate-200' :
          dragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'
        }`}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => !disabled && e.key === 'Enter' && inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) onFiles(e.dataTransfer.files); }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
    >
      <div className="flex flex-col items-center gap-3">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <svg className={`w-7 h-7 ${dragging ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="text-slate-700 font-medium">
            Drop images here or{' '}
            <span className="text-blue-500 underline underline-offset-2">browse files</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">HEIC · PNG · JPEG &nbsp;·&nbsp; Up to 50 images at once</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {[
            { icon: '✓', label: 'Format check' },
            { icon: '✓', label: 'Min 200×200px' },
            { icon: '✓', label: 'Single face only' },
            { icon: '✓', label: 'Blur detection' },
          ].map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              <span className="text-green-500 font-bold">{c.icon}</span> {c.label}
            </span>
          ))}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".heic,image/heic,image/png,image/jpeg"
        multiple
        hidden
        disabled={disabled}
        onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
