import type { UploadEntry } from '../types/image.types';

interface Props {
  entry: UploadEntry;
}

export function ImageCard({ entry }: Props) {
  const status = entry.serverResult?.status ?? entry.clientStatus;
  const reason = entry.serverResult?.reason ?? entry.clientReason;
  const accepted = status === 'ACCEPTED';

  return (
    <div className={`rounded-lg overflow-hidden shadow-sm border ${accepted ? 'border-green-200 bg-white' : 'border-red-200 bg-red-50'}`}>
      <img
        src={entry.preview}
        alt={entry.file.name}
        className={`w-full h-36 object-cover ${accepted ? '' : 'opacity-50'}`}
      />
      <div className="p-2 space-y-1">
        <p className="text-xs text-zinc-600 truncate" title={entry.file.name}>{entry.file.name}</p>
        {accepted && entry.serverResult && (
          <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Saved to S3
          </span>
        )}
        {!accepted && reason && (
          <p className="text-xs text-red-600">{reason}</p>
        )}
      </div>
    </div>
  );
}
