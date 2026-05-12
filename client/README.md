# AragonAI — Frontend (Next.js)

A Next.js 16 App Router UI for the image upload pipeline. Users drag-and-drop images, get instant client-side feedback, then batch-upload valid files to the NestJS backend.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | React Server Components, zero-config TS, API routes |
| UI | React 19 | Concurrent rendering, built-in `use` hook |
| Styling | Tailwind CSS v4 | CSS-first config, no `tailwind.config.js` needed |
| State | Custom `useImageUpload` hook | Keeps upload state machine co-located with behaviour |

---

## Quick Start

```bash
cd client
npm install
npm run dev     # http://localhost:3000
```

Make sure the backend is running on `http://localhost:3001` (or set `NEXT_PUBLIC_API_URL` in `.env.local`).

---

## Folder Structure

```
client/app/
├── page.tsx                  Main upload page
├── globals.css               Tailwind base styles
├── layout.tsx                Root layout (font, metadata)
│
├── components/
│   ├── DropZone.tsx          Drag-and-drop + file picker
│   ├── ImageGrid.tsx         Accepted / Rejected column with count
│   └── ImageCard.tsx         Individual image tile with status badge
│
├── hooks/
│   └── useImageUpload.ts     Upload state machine (idle → uploading → done)
│
├── lib/
│   ├── api.ts                fetch wrappers: uploadImage, fetchImages
│   └── validators.ts         Client-side format/extension check
│
└── types/
    └── image.types.ts        UploadEntry, ServerImage, UploadPhase
```

---

## Component Architecture

### `useImageUpload` hook

The central state machine. Responsibilities:

1. **`addFiles(FileList)`** — client-side validation via `validateImageFile()`. Invalid files are immediately marked `REJECTED` with a reason, without a network call.
2. **`submit()`** — uploads all client-ACCEPTED files in parallel (`Promise.allSettled`), updating each entry's `serverResult` as responses arrive.
3. Derived state — `accepted` and `rejected` arrays are computed from entries: server result takes precedence over client result once available.

### Two-stage validation

```
User drops file
       │
       ▼
Client validator (instant, no network)
  • Extension / MIME type check
  • Shows REJECTED immediately for wrong formats
       │ ✓
       ▼
Server pipeline (after submit click)
  • Resolution, blur, face detection, duplicate check
  • Updates card with server ACCEPTED / REJECTED + reason
```

This approach gives users instant feedback on obviously wrong files (a .gif, a .txt), while deferring expensive checks (Rekognition, blur) to the server.

### Why `Promise.allSettled` not `Promise.all`

```typescript
await Promise.allSettled(pending.map(async (entry) => { ... }));
```

`Promise.all` would abort all uploads the moment any one fails. `Promise.allSettled` lets every upload run to completion — so uploading 5 images where 1 has a network error still uploads the other 4.

---

## Environment Variables

```env
# client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

The `NEXT_PUBLIC_` prefix makes this variable available in the browser bundle. Without it, Next.js strips it from client-side code.

---

## Key UX Decisions

| Decision | Reasoning |
|---|---|
| Client-side pre-check before submit | Instant feedback; avoids pointless network round-trips for obvious errors |
| Show both Accepted and Rejected in parallel columns | Users can see exactly which images passed and why others failed |
| Upload button disabled when nothing pending | Prevents duplicate submissions |
| `Promise.allSettled` for batch upload | Partial failure doesn't block other uploads |
| Preview via `URL.createObjectURL` | Zero network cost; revoked by the browser when the page unloads |

---

## Building for Production

```bash
npm run build
npm start
```

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
