'use client';
import * as React from 'react';
import { validateImageFile } from '../lib/validators';
import { uploadBulkImages } from '../lib/api';
import type { UploadEntry, UploadPhase } from '../types/image.types';

export interface UploadProgress {
  total: number;
  done: number;
  accepted: number;
  rejected: number;
}

export function useImageUpload() {
  const [entries, setEntries] = React.useState<UploadEntry[]>([]);
  const [phase, setPhase] = React.useState<UploadPhase>('idle');
  const [feedback, setFeedback] = React.useState<string>('');
  const [progress, setProgress] = React.useState<UploadProgress>({ total: 0, done: 0, accepted: 0, rejected: 0 });

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: UploadEntry[] = Array.from(files).map((file) => {
      const { valid, reason } = validateImageFile(file);
      return {
        file,
        preview: URL.createObjectURL(file),
        clientStatus: valid ? 'ACCEPTED' : 'REJECTED',
        clientReason: reason,
        uploadState: 'pending',
      };
    });
    setEntries((prev) => [...prev, ...next]);
  }

  async function submit() {
    const pending = entries.filter((e) => e.clientStatus === 'ACCEPTED' && !e.serverResult);
    if (!pending.length) {
      setFeedback('No new valid images to upload.');
      return;
    }

    // Stable set of File references — survives React re-renders that spread entry objects
    const pendingFiles = new Set(pending.map((e) => e.file));

    setPhase('uploading');
    setFeedback('');
    setProgress({ total: pending.length, done: 0, accepted: 0, rejected: 0 });

    // Mark all pending as uploading (use File ref for matching)
    setEntries((prev) =>
      prev.map((e) =>
        pendingFiles.has(e.file) ? { ...e, uploadState: 'uploading' as const } : e,
      ),
    );

    try {
      const results = await uploadBulkImages(pending.map((e) => e.file));

      // Build file → result map so matching survives spread objects
      const resultByFile = new Map<File, typeof results[0]>();
      pending.forEach((e, i) => resultByFile.set(e.file, results[i]));

      let accepted = 0;
      let rejected = 0;

      setEntries((prev) =>
        prev.map((e) => {
          const result = resultByFile.get(e.file);
          if (!result) return e;
          if (result.status === 'ACCEPTED') accepted++;
          else rejected++;
          return { ...e, serverResult: result, uploadState: 'done' as const };
        }),
      );

      setProgress({ total: pending.length, done: pending.length, accepted, rejected });
      setFeedback(
        rejected > 0
          ? `${accepted} uploaded · ${rejected} rejected by server`
          : `${accepted} image(s) uploaded successfully!`,
      );
    } catch (err: any) {
      // Use File ref for matching in catch too
      setEntries((prev) =>
        prev.map((e) =>
          pendingFiles.has(e.file) ? { ...e, uploadState: 'error' as const } : e,
        ),
      );
      setFeedback(`Upload failed: ${err.message}`);
    }

    setPhase('done');
  }

  function clear() {
    entries.forEach((e) => URL.revokeObjectURL(e.preview));
    setEntries([]);
    setPhase('idle');
    setFeedback('');
    setProgress({ total: 0, done: 0, accepted: 0, rejected: 0 });
  }

  const accepted = entries.filter((e) => (e.serverResult?.status ?? e.clientStatus) === 'ACCEPTED');
  const rejected = entries.filter((e) => (e.serverResult?.status ?? e.clientStatus) === 'REJECTED');
  const canSubmit = phase !== 'uploading' && entries.some((e) => e.clientStatus === 'ACCEPTED' && !e.serverResult);

  return { entries, accepted, rejected, phase, feedback, canSubmit, progress, addFiles, submit, clear };
}
