'use client';
import { useImageUpload } from './hooks/useImageUpload';
import { DropZone } from './components/DropZone';
import { ImageGrid } from './components/ImageGrid';

export default function UploadPage() {
  const { accepted, rejected, phase, feedback, canSubmit, addFiles, submit } = useImageUpload();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Image Upload</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Accepted formats: HEIC · PNG · JPEG — min 200×200 — single face per image
          </p>
        </div>

        <DropZone onFiles={addFiles} />

        <div className="flex items-center gap-4">
          <button
            onClick={submit}
            disabled={!canSubmit || phase === 'uploading'}
            className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {phase === 'uploading' ? 'Uploading…' : 'Upload to Server'}
          </button>
          {feedback && (
            <p className={`text-sm font-medium ${phase === 'done' && !feedback.includes('failed') ? 'text-green-600' : 'text-red-500'}`}>
              {feedback}
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <ImageGrid
            title="✓ Accepted"
            count={accepted.length}
            entries={accepted}
            emptyText="No accepted images yet"
            titleClass="text-green-600"
          />
          <ImageGrid
            title="✗ Rejected"
            count={rejected.length}
            entries={rejected}
            emptyText="No rejected images"
            titleClass="text-red-500"
          />
        </div>

      </div>
    </main>
  );
}
