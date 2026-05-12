import type { UploadEntry } from '../types/image.types';
import { ImageCard } from './ImageCard';

interface Props {
  title: string;
  count: number;
  entries: UploadEntry[];
  emptyText: string;
  titleClass: string;
  dotClass: string;
}

export function ImageGrid({ title, count, entries, emptyText, titleClass, dotClass }: Props) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        <h2 className={`text-base font-semibold ${titleClass}`}>
          {title}
        </h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          count > 0 ? `${dotClass} text-white` : 'bg-slate-200 text-slate-500'
        }`}>
          {count}
        </span>
      </div>
      {entries.length === 0
        ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-400 text-sm">{emptyText}</p>
          </div>
        )
        : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entries.map((e, i) => <ImageCard key={i} entry={e} />)}
          </div>
        )}
    </div>
  );
}
