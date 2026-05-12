'use client';
import * as React from 'react';
import { validateImageFile } from '../lib/validators';
import { uploadImage } from '../lib/api';
import type { UploadEntry, UploadPhase } from '../types/image.types';

export function useImageUpload() {
  const [entries, setEntries] = React.useState<UploadEntry[]>([]);
  const [phase, setPhase] = React.useState<UploadPhase>('idle');
  const [feedback, setFeedback] = React.useState<string>('');

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: UploadEntry[] = Array.from(files).map((file) => {
      const { valid, reason } = validateImageFile(file);
      return {
        file,
        preview: URL.createObjectURL(file),
        clientStatus: valid ? 'ACCEPTED' : 'REJECTED',
        clientReason: reason,
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

    setPhase('uploading');
    setFeedback('');
    let ok = 0;
    let fail = 0;

    await Promise.allSettled(
      pending.map(async (entry) => {
        try {
          const result = await uploadImage(entry.file);
          ok++;
          setEntries((prev) =>
            prev.map((e) => (e.file === entry.file ? { ...e, serverResult: result } : e)),
          );
        } catch (err: any) {
          fail++;
          setEntries((prev) =>
            prev.map((e) =>
              e.file === entry.file
                ? { ...e, serverResult: { ...e, status: 'REJECTED', reason: err.message } as any }
                : e,
            ),
          );
        }
      }),
    );

    setPhase('done');
    setFeedback(fail ? `${ok} uploaded, ${fail} failed.` : `${ok} image(s) uploaded successfully!`);
  }

  const accepted = entries.filter((e) => (e.serverResult?.status ?? e.clientStatus) === 'ACCEPTED');
  const rejected = entries.filter((e) => (e.serverResult?.status ?? e.clientStatus) === 'REJECTED');
  const canSubmit = entries.some((e) => e.clientStatus === 'ACCEPTED' && !e.serverResult);

  return { entries, accepted, rejected, phase, feedback, canSubmit, addFiles, submit };
}
