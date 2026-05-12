import type { UploadEntry } from '../types/image.types';
import { ImageCard } from './ImageCard';

interface Props {
  title: string;
  count: number;
  entries: UploadEntry[];
  emptyText: string;
  titleClass: string;
}

export function ImageGrid({ title, count, entries, emptyText, titleClass }: Props) {
  return (
    <div className="flex-1 min-w-0">
      <h2 className={`text-xl font-semibold mb-3 ${titleClass}`}>
        {title} <span className="text-base font-normal">({count})</span>
      </h2>
      {entries.length === 0
        ? <p className="text-zinc-400 text-sm">{emptyText}</p>
        : (
          <div className="grid grid-cols-2 gap-3">
            {entries.map((e, i) => <ImageCard key={i} entry={e} />)}
          </div>
        )}
    </div>
  );
}
