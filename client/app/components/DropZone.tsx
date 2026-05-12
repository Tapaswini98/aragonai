'use client';
import * as React from 'react';

interface Props {
  onFiles: (files: FileList | null) => void;
}

export function DropZone({ onFiles }: Props) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition select-none
        ${dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-zinc-300 dark:border-zinc-600 hover:border-blue-400'}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
    >
      <p className="text-zinc-500 text-lg">
        Drop images here or{' '}
        <span className="text-blue-500 underline">browse</span>
      </p>
      <p className="text-xs text-zinc-400 mt-1">HEIC · PNG · JPEG</p>
      <input
        ref={inputRef}
        type="file"
        accept=".heic,image/heic,image/png,image/jpeg"
        multiple
        hidden
        onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
