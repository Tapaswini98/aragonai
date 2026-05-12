import type { UploadEntry } from '../types/image.types';

interface Props {
  entry: UploadEntry;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageCard({ entry }: Props) {
  const status = entry.serverResult?.status ?? entry.clientStatus;
  const reason = entry.serverResult?.reason ?? entry.clientReason;
  const accepted = status === 'ACCEPTED';
  const isUploading = entry.uploadState === 'uploading';
  const isError = entry.uploadState === 'error';

  return (
    <div className={`rounded-xl overflow-hidden border transition-all duration-200
      ${accepted
        ? 'border-emerald-200 bg-white shadow-sm shadow-emerald-50'
        : isError
          ? 'border-orange-200 bg-orange-50/60'
          : 'border-red-200 bg-red-50/60'
      }`}
    >
      {/* Image */}
      <div className="relative">
        <img
          src={entry.preview}
          alt={entry.file.name}
          className={`w-full h-40 object-cover transition-opacity duration-200 ${!accepted || isUploading ? 'opacity-40' : ''}`}
        />
        {/* Upload spinner overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
            <div className="w-8 h-8 border-4 border-white border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          {accepted && entry.serverResult && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m4.5 12.75 6 6 9-13.5" /></svg>
              Saved to S3
            </span>
          )}
          {accepted && !entry.serverResult && !isUploading && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-500 text-white px-2 py-0.5 rounded-full shadow">
              Ready
            </span>
          )}
          {isUploading && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-400 text-white px-2 py-0.5 rounded-full shadow">
              Uploading…
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-500 text-white px-2 py-0.5 rounded-full shadow">
              Network error
            </span>
          )}
          {!accepted && !isError && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full shadow">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18 18 6M6 6l12 12" /></svg>
              Rejected
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-xs font-medium text-slate-700 truncate" title={entry.file.name}>
          {entry.file.name}
        </p>
        <p className="text-xs text-slate-400">{formatBytes(entry.file.size)}</p>
        {!accepted && reason && !isError && (
          <div className="flex items-start gap-1.5 mt-1">
            <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs text-red-600 leading-tight">{reason}</p>
          </div>
        )}
        {accepted && entry.serverResult && (
          <p className="text-xs text-emerald-600 font-medium">✓ Face validated · Stored in S3</p>
        )}
      </div>
    </div>
  );
}
