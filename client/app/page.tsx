'use client';
import { useImageUpload } from './hooks/useImageUpload';
import { DropZone } from './components/DropZone';
import { ImageGrid } from './components/ImageGrid';

const PIPELINE_STEPS = [
  { label: 'Format', desc: 'HEIC · PNG · JPEG' },
  { label: 'Resolution', desc: 'Min 200×200 px' },
  { label: 'Blur', desc: 'Sharpness check' },
  { label: 'Duplicate', desc: 'Perceptual hash' },
  { label: 'Face AI', desc: 'Single face only' },
  { label: 'S3 Storage', desc: 'Cloud upload' },
];

export default function UploadPage() {
  const { accepted, rejected, phase, feedback, canSubmit, progress, addFiles, submit, clear } = useImageUpload();

  const totalQueued = accepted.length + rejected.length;
  const pendingUpload = accepted.filter(e => !e.serverResult).length;
  const uploadPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const isUploading = phase === 'uploading';
  const isDone = phase === 'done';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-none">AragonAI</h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">Image Upload Platform</p>
            </div>
          </div>
          {totalQueued > 0 && (
            <button
              onClick={clear}
              disabled={isUploading}
              className="text-sm text-slate-400 hover:text-slate-600 disabled:opacity-40 transition"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Page title */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">Bulk Image Upload</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            Upload up to 50 images at once. Each image is automatically validated through a 6-step pipeline before being stored.
          </p>
        </div>

        {/* Validation pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Validation Pipeline</p>
          <div className="flex items-center gap-1 flex-wrap">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-1">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 leading-none">{step.label}</p>
                    <p className="text-xs text-slate-400 leading-none mt-0.5">{step.desc}</p>
                  </div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <DropZone onFiles={addFiles} disabled={isUploading} />

        {/* Stats + upload button */}
        {totalQueued > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{totalQueued}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total queued</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{accepted.length}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Passed validation</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{rejected.length}</p>
                <p className="text-xs text-red-500 mt-0.5">Rejected</p>
              </div>
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Uploading {progress.total} image{progress.total !== 1 ? 's' : ''} to S3…</span>
                  <span className="font-medium">Processing…</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full bg-blue-500 animate-[indeterminate_1.4s_ease-in-out_infinite]"
                    style={{ width: '40%', animation: 'indeterminate 1.4s ease-in-out infinite' }} />
                </div>
              </div>
            )}

            {/* Done summary */}
            {isDone && feedback && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium
                ${feedback.includes('failed') || feedback.includes('rejected')
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {feedback.includes('failed') || feedback.includes('rejected')
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4.5 12.75 6 6 9-13.5" />
                  }
                </svg>
                {feedback}
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading {progress.total} image{progress.total !== 1 ? 's' : ''}…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  {pendingUpload > 0 ? `Upload ${pendingUpload} image${pendingUpload !== 1 ? 's' : ''} to S3` : 'All images processed'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Image grids */}
        {totalQueued > 0 && (
          <div className="flex flex-col lg:flex-row gap-6">
            <ImageGrid
              title="Accepted"
              count={accepted.length}
              entries={accepted}
              emptyText="No images passed validation yet"
              titleClass="text-emerald-700"
              dotClass="bg-emerald-500"
            />
            <ImageGrid
              title="Rejected"
              count={rejected.length}
              entries={rejected}
              emptyText="No images rejected"
              titleClass="text-red-600"
              dotClass="bg-red-500"
            />
          </div>
        )}

      </main>
    </div>
  );
}
