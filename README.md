# AragonAI — Intelligent Image Upload Pipeline

> A full-stack image ingestion system that validates, processes, and stores profile images with AI-powered quality checks.

## Demo

| # | Video | Description |
|---|---|---|
| 1 | [![Part 1](https://img.shields.io/badge/Loom-Part%201-purple?logo=loom)](https://www.loom.com/share/e66600fcaf5a431e86f611ff74c86353) | Project overview & architecture walkthrough & Demo|
| 2 | [![Part 2](https://img.shields.io/badge/Loom-Part%202-purple?logo=loom)](https://www.loom.com/share/8a8dfa1f77f64b2393f9b6b3088714ed) | Bulk upload & validation pipeline demo |

---

## Table of Contents

1. [What Was Built](#what-was-built)
2. [System Architecture](#system-architecture)
3. [The 8-Step Validation Pipeline](#the-8-step-validation-pipeline)
4. [Technology Choices & Reasoning](#technology-choices--reasoning)
5. [Key Technical Decisions & Tradeoffs](#key-technical-decisions--tradeoffs)
6. [Project Structure](#project-structure)
7. [Running Locally](#running-locally)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [Test Cases for QA](#test-cases-for-qa)

---

## What Was Built

An end-to-end **bulk** image upload pipeline for profile photos. Users drag-and-drop up to 50 images at once via a Next.js UI; the NestJS backend runs each through a multi-stage validation pipeline (format, resolution, blur, duplicate check, face detection) before persisting accepted images to AWS S3 and all metadata to MongoDB with a human-readable rejection reason.

### Core Features

| Feature | Detail |
|---|---|
| Bulk upload | Up to 50 images in a single request (`POST /images/upload-bulk`) |
| Format validation | HEIC, PNG, JPEG only; HEIC auto-converted to JPEG |
| Resolution check | Minimum 200×200 pixels |
| Blur detection | Pixel standard-deviation threshold via Sharp |
| Perceptual hashing | 8×8 average hash for similarity comparison |
| Duplicate prevention | Hamming distance < 10 → rejected as "too similar" |
| Face validation | AWS Rekognition: exactly one face required, sufficient bounding box size |
| Clean S3 storage | Face check runs **before** S3 upload — rejected images never stored |
| Persistent storage | AWS S3 for accepted images; MongoDB for all metadata |
| Per-image feedback | UI shows per-card status: Ready → Uploading → Saved to S3 / Rejected with reason |
| Status transparency | UI splits images into Accepted / Rejected grids with exact reasons |

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Browser / Client                           │
│                                                                     │
│   ┌─────────────┐    drag & drop    ┌──────────────────────────┐   │
│   │  DropZone   │ ─────────────→   │   useImageUpload hook    │   │
│   │  Component  │                  │  (client-side pre-check) │   │
│   └─────────────┘                  └────────────┬─────────────┘   │
│                                                  │ POST /images/upload
└──────────────────────────────────────────────────┼─────────────────┘
                                                   │
┌──────────────────────────────────────────────────▼─────────────────┐
│                        NestJS Backend (port 3001)                   │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │                  ImagesController                            │ │
│   │  POST /images/upload  POST /images/upload-bulk              │ │
│   │  GET /images  GET /images/accepted  GET /images/rejected    │ │
│   │  GET /images/:id  DELETE /images/:id                       │ │
│   └──────────────────────────┬───────────────────────────────────┘ │
│                              │                                      │
│   ┌──────────────────────────▼───────────────────────────────────┐ │
│   │                    ImagesService                             │ │
│   │  Orchestrates the 8-step pipeline (see below)               │ │
│   └──────┬────────────────────────────────────┬──────────────────┘ │
│          │                                    │                     │
│   ┌──────▼──────────────┐      ┌──────────────▼──────────────────┐ │
│   │ ImageProcessingService│    │       StorageService            │ │
│   │  • Format validation │    │  • S3 upload (aws-sdk)          │ │
│   │  • HEIC → JPEG       │    │  • Rekognition face detection   │ │
│   │  • Resolution check  │    └──────────────┬──────────────────┘ │
│   │  • Blur detection    │                   │                     │
│   │  • Perceptual hash   │    ┌──────────────▼──────────────────┐ │
│   └──────────────────────┘    │         PrismaService           │ │
│                               │  MongoDB Atlas — aragonai DB    │ │
│                               └─────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                          │                   │
               ┌──────────▼───────┐  ┌────────▼──────────┐
               │    AWS S3        │  │  MongoDB Atlas    │
               │  (image files)   │  │  (Image records)  │
               └──────────────────┘  └───────────────────┘
```

---

## The 8-Step Validation Pipeline

Every uploaded file passes through these sequential gates. A failure at any step creates a `REJECTED` record with a clear reason string — the image is never stored in S3.

```
File arrives via multipart/form-data
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Step 1 — Format Validation                         │
│  Allowed: image/heic  image/png  image/jpeg         │
│  ✗ Wrong format → REJECTED immediately              │
└─────────────────────────┬───────────────────────────┘
                          │ ✓
                          ▼
┌─────────────────────────────────────────────────────┐
│  Step 2 — HEIC Conversion                           │
│  heic-convert: HEIC/HEIF → JPEG buffer in-memory   │
│  All other formats pass through unchanged           │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  Step 3 — Resolution Check (via Sharp metadata)     │
│  Minimum: 200 × 200 pixels                          │
│  ✗ Too small → REJECTED                             │
└─────────────────────────┬───────────────────────────┘
                          │ ✓
                          ▼
┌─────────────────────────────────────────────────────┐
│  Step 4 — Blur Detection                            │
│  Sharp: grayscale → per-channel stdev               │
│  Threshold: stdev < 15 → image is too blurry        │
│  ✗ Blurry → REJECTED                               │
└─────────────────────────┬───────────────────────────┘
                          │ ✓
                          ▼
┌─────────────────────────────────────────────────────┐
│  Step 5 — Perceptual Hash + Similarity Check        │
│  Resize to 8×8 grayscale → average hash (64-bit)   │
│  Compare Hamming distance vs all ACCEPTED images    │
│  Threshold: distance < 10 → too similar             │
│  ✗ Duplicate → REJECTED                             │
└─────────────────────────┬───────────────────────────┘
                          │ ✓
                          ▼
┌─────────────────────────────────────────────────────┐
│  Step 6 — AWS Rekognition Face Detection            │
│  Runs on raw buffer BEFORE S3 upload                │
│  (rejected images never stored in S3)               │
│  Rules:                                             │
│    • 0 faces   → REJECTED: "No face detected"       │
│    • 2+ faces  → REJECTED: "Multiple faces (N)"     │
│    • Face area < 5% → "Face too small"              │
│  Uses eu-west-1 (Rekognition not in eu-north-1)     │
│  ✗ Rekognition error → REJECTED (hard fail)         │
└─────────────────────────┬───────────────────────────┘
                          │ ✓
                          ▼
┌─────────────────────────────────────────────────────┐
│  Step 7 — S3 Upload                                 │
│  Key pattern: images/{timestamp}-{safe-filename}    │
│  Only images that passed face check reach here      │
│  ✗ S3 error → REJECTED with storage error message  │
└─────────────────────────┬───────────────────────────┘
                          │ ✓
                          ▼
┌─────────────────────────────────────────────────────┐
│  Step 8 — Persist Accepted Record to MongoDB        │
│  Stores: filename, S3 url, status=ACCEPTED,         │
│  mimetype, size, width, height, perceptual hash     │
└─────────────────────────────────────────────────────┘
```

---

## Technology Choices & Reasoning

### Backend — NestJS

**Why NestJS over plain Express?**

NestJS enforces a module/controller/service architecture from day one, which maps cleanly to this problem's concerns (HTTP layer, business logic, storage). The built-in dependency injection container means services are easy to unit-test in isolation — you can mock `StorageService` and test the pipeline logic without touching S3. A plain Express app would have required manually wiring these concerns.

Tradeoff: NestJS adds ~15–20ms cold-start overhead and heavier boilerplate for a small API. For a production service that stays warm, this cost is negligible.

### ORM — Prisma

**Why Prisma over Mongoose?**

Three reasons:
1. **Type safety** — `@prisma/client` generates TypeScript types directly from the schema. The `Image` type used throughout the codebase is auto-generated; there's no manual interface to keep in sync.
2. **Schema-as-source-of-truth** — One `schema.prisma` file defines the shape and indexes. Running `prisma db push` creates the MongoDB indexes atomically. With Mongoose you'd define indexes in model files scattered across the codebase.
3. **Multi-database portability** — Swapping the datasource from `mongodb` to `postgresql` requires changing one line in the schema; the query API stays identical.

Tradeoff: Prisma's MongoDB support doesn't support aggregation pipelines through the query builder. If the product ever needs complex analytics (e.g., "show me all blur-rejected images from last week grouped by hour"), you'd drop down to `prisma.$runCommandRaw()`.

### Database — MongoDB Atlas

**Why MongoDB over PostgreSQL?**

The `Image` entity is a document: it has optional fields (`width`, `height`, `hash`, `reason`) that only apply in certain states. MongoDB's flexible schema means a REJECTED image that failed format validation doesn't need to store NULL columns for fields that never apply. The document model also makes adding new metadata fields (e.g., EXIF data, tags) schema-migration-free.

Tradeoff: MongoDB doesn't enforce relational integrity. If a future `User` model references an `Image`, cascading deletes must be handled in application code. PostgreSQL's foreign keys would handle that automatically.

The MongoDB Atlas free tier gives 512 MB storage, which is sufficient for metadata (the actual image bytes live in S3).

### Image Processing — Sharp

Sharp is a libvips wrapper compiled to native binaries — it's 5–15× faster than alternatives like Jimp (which is pure JavaScript). It handles JPEG, PNG, WebP, and raw pixel pipelines needed for blur detection. The `grayscale().stats()` call returns per-channel statistics in a single pass, avoiding double-decoding the image.

Tradeoff: Sharp requires native binaries. In a Docker deployment you must match the binary architecture (linux/amd64 vs arm64). The `package.json` may need `--platform` flags in a multi-arch CI pipeline.

### HEIC Support — heic-convert

Apple devices produce HEIC/HEIF files by default. heic-convert uses libheif under the hood to decode them to JPEG in memory before passing the buffer to Sharp. This keeps all downstream processing format-agnostic.

Tradeoff: heic-convert is slower than native image libraries (up to ~1–2 seconds for a large HEIC). For a profile-photo upload this is acceptable; for bulk batch processing it would need to be moved to a worker queue.

### Face Detection — AWS Rekognition

Rekognition's `DetectFaces` API returns bounding boxes and confidence scores. The key design decision was to call it **before** the S3 upload (Step 6) using `Image.Bytes` — sending the raw buffer directly to Rekognition. This means rejected images never reach S3, saving storage costs and keeping the bucket clean.

Rekognition is not available in `eu-north-1` (Stockholm) so it uses a dedicated `AWS_REKOGNITION_REGION=eu-west-1` (Ireland) — the closest supported EU region — while S3 remains in `eu-north-1` where the bucket is.

The service **hard-fails** on Rekognition errors (no silent pass-through) — ensuring multi-face images are never accidentally accepted due to a misconfiguration.

### Duplicate Detection — Perceptual Hashing

MD5/SHA hashing detects exact byte-for-byte duplicates but misses re-saved, resized, or screenshot copies of the same image. A perceptual (average) hash captures visual similarity:

```
1. Resize image to 8×8 pixels
2. Convert to grayscale
3. Compute mean pixel value
4. Each pixel → '1' if ≥ mean, else '0'
5. Result: 64-character binary string
```

Hamming distance measures how many bits differ between two hashes. A threshold of 10 (out of 64) catches near-duplicate images while leaving room for minor colour profile differences.

Tradeoff: The current implementation is O(n) — it loads every accepted image's hash and compares. This is fine at small scale (< 10,000 images) but would need an indexed approximate nearest-neighbour solution (e.g., pgvector, MongoDB Atlas Vector Search) at scale.

### Frontend — Next.js + Tailwind

Next.js provides React Server Components, the App Router, and zero-config API routes. The client-side `useImageUpload` hook does local validation before hitting the server, giving instant feedback to users without a network round-trip.

Tailwind CSS v4 with the new CSS-first configuration keeps styles co-located with components and eliminates the need for a `tailwind.config.js` file.

---

## Key Technical Decisions & Tradeoffs

| Decision | Chosen approach | Alternative | Reason |
|---|---|---|---|
| Upload mode | Bulk (`POST /images/upload-bulk`, up to 50 files) | One request per file | Single HTTP round-trip; `Promise.all` parallelises all pipeline steps |
| Where to validate | Server-side (authoritative) + client-side (UX) | Server only | Client check gives instant feedback; server check ensures correctness regardless of client |
| Blur detection | Pixel stdev of grayscale channel | Laplacian variance | Stdev is simpler and fast via Sharp's built-in stats; Laplacian is more accurate but requires convolution |
| Face detection timing | **Before** S3 upload (using `Image.Bytes`) | After S3 upload | Rejected images never stored in S3; saves cost and keeps bucket clean |
| Rekognition region | `eu-west-1` (separate env var) | Same as S3 region | Rekognition not available in `eu-north-1`; S3 and Rekognition can use different regions |
| Error handling for S3 failures | Persist as REJECTED with reason | Throw 500 | Caller always gets a structured response; no silent failures |
| Rekognition unavailability | Hard fail (return rejection reason) | Graceful pass-through | Ensures multi-face images are never accidentally accepted |
| Similarity threshold | Hamming < 10 | Hash equality | Catches visually identical images that differ at byte level |
| Database | MongoDB Atlas (hosted) | Local Docker | Zero infrastructure overhead; Atlas free tier is sufficient; no port management needed |

---

## Project Structure

```
aragonai/
├── docker-compose.yml          # Optional: local MongoDB replica set
├── client/                     # Next.js 16 frontend
│   ├── app/
│   │   ├── page.tsx            # Main upload UI
│   │   ├── components/
│   │   │   ├── DropZone.tsx    # Drag-and-drop area
│   │   │   ├── ImageGrid.tsx   # Accepted / Rejected grid
│   │   │   └── ImageCard.tsx   # Individual image tile
│   │   ├── hooks/
│   │   │   └── useImageUpload.ts  # Upload state machine
│   │   ├── lib/
│   │   │   ├── api.ts          # fetch wrappers for backend
│   │   │   └── validators.ts   # Client-side format check
│   │   └── types/
│   │       └── image.types.ts  # Shared TS types
│   └── .env.local              # NEXT_PUBLIC_API_URL
│
└── server/                     # NestJS backend
    ├── prisma/
    │   └── schema.prisma       # MongoDB schema + indexes
    ├── src/
    │   ├── main.ts             # Bootstrap + CORS
    │   ├── app.module.ts       # Root module
    │   ├── prisma.service.ts   # PrismaClient singleton
    │   ├── common/
    │   │   ├── constants/
    │   │   │   └── image.constants.ts  # All magic numbers in one place
    │   │   └── types/
    │   │       └── image.types.ts      # Shared server types
    │   ├── config/
    │   │   └── aws.config.ts   # S3 + Rekognition factory fns
    │   └── modules/images/
    │       ├── images.module.ts
    │       ├── images.controller.ts    # REST endpoints
    │       ├── images.service.ts       # Pipeline orchestration
    │       └── services/
    │           ├── image-processing.service.ts  # Sharp logic
    │           └── storage.service.ts           # S3 + Rekognition
    └── .env                    # Local secrets (git-ignored)
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (optional, for local MongoDB) — or use MongoDB Atlas

### 1 — Clone & install

```bash
git clone <repo-url>
cd aragonai

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2 — Configure environment

```bash
# Server
cd server
cp .env.example .env
# Edit .env and fill in:
#   DATABASE_URL — your MongoDB Atlas connection string
#   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME
```

The `DATABASE_URL` must include the database name in the path:
```
mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/aragonai?appName=Cluster0
```

### 3 — Create the database

```bash
cd server
npx prisma db push   # creates the 'aragonai' database, Image collection, and indexes
```

### 4 — Start the backend

```bash
cd server
npm run start:dev    # http://localhost:3001
```

### 5 — Start the frontend

```bash
cd client
npm run dev          # http://localhost:3000
```

### Alternative: Local MongoDB via Docker

```bash
# From repo root
docker compose up -d           # starts MongoDB on localhost:27017
# Set DATABASE_URL in server/.env to:
# mongodb://localhost:27017/aragonai?directConnection=true&replicaSet=rs0
cd server && npx prisma db push
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | MongoDB connection string (must include DB name) | `mongodb+srv://user:pass@cluster.net/aragonai` |
| `AWS_REGION` | AWS region for S3 | `eu-north-1` |
| `AWS_REKOGNITION_REGION` | AWS region for Rekognition (must support the service) | `eu-west-1` |
| `AWS_ACCESS_KEY_ID` | IAM access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key | `...` |
| `AWS_BUCKET_NAME` | S3 bucket for image storage | `my-images-bucket` |
| `PORT` | Backend HTTP port (default 3001) | `3001` |

### Client (`client/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:3001` |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/images/upload` | Upload a **single** image (`multipart/form-data`, field: `file`) |
| `POST` | `/images/upload-bulk` | Upload **up to 50 images** at once (`multipart/form-data`, field: `files[]`) |
| `GET` | `/images` | List all images (accepted + rejected), newest first |
| `GET` | `/images/accepted` | List only accepted images |
| `GET` | `/images/rejected` | List only rejected images |
| `GET` | `/images/:id` | Get single image by ID |
| `DELETE` | `/images/:id` | Delete an image record |

### Bulk Upload Request

```bash
curl -X POST http://localhost:3001/images/upload-bulk \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.png" \
  -F "files=@group.jpg"
```

Returns an array of image records (same shape as single upload), one per input file, in the same order.

### Upload Response (ACCEPTED)

```json
{
  "id": "uuid-v4",
  "filename": "profile.jpg",
  "url": "https://s3.amazonaws.com/bucket/images/1234567890-profile.jpg",
  "status": "ACCEPTED",
  "mimetype": "image/jpeg",
  "size": 204800,
  "width": 800,
  "height": 600,
  "hash": "1100110011001100...",
  "reason": null,
  "createdAt": "2026-05-12T10:00:00.000Z"
}
```

### Upload Response (REJECTED)

```json
{
  "id": "uuid-v4",
  "filename": "blurry.jpg",
  "url": "",
  "status": "REJECTED",
  "mimetype": "image/jpeg",
  "size": 102400,
  "width": null,
  "height": null,
  "hash": null,
  "reason": "Image too blurry (sharpness score: 8.3).",
  "createdAt": "2026-05-12T10:00:00.000Z"
}
```

---

## Test Cases for QA

Use these in your Loom walkthrough to demonstrate each pipeline gate:

### Format Validation (Step 1)
| Test | Expected |
|---|---|
| Upload a `.jpg` / `.png` file | ACCEPTED (passes format check) |
| Upload a `.heic` file (iPhone photo) | Converted to JPEG, then continues pipeline |
| Upload a `.gif` or `.webp` file | REJECTED — "Invalid format. Only image/heic, image/png, image/jpeg allowed." |
| Upload a `.txt` file renamed to `.jpg` | REJECTED — mimetype mismatch caught by multer/browser |

### Resolution Check (Step 3)
| Test | Expected |
|---|---|
| Upload 200×200 or larger image | Passes resolution check |
| Upload a thumbnail / icon (e.g., 50×50) | REJECTED — "Image too small (50×50). Min 200×200 required." |

### Blur Detection (Step 4)
| Test | Expected |
|---|---|
| Upload a sharp, in-focus photo | Passes blur check |
| Upload a heavily blurred/out-of-focus image | REJECTED — "Image too blurry (sharpness score: X.X)." |

### Duplicate Detection (Step 5)
| Test | Expected |
|---|---|
| Upload same image twice | Second upload → REJECTED — "Image is too similar to an existing one." |
| Upload a slightly resized/re-saved copy of an accepted image | REJECTED — perceptual hash catches it |
| Upload visually different images | Both ACCEPTED |

### Face Detection (Step 6)
| Test | Expected |
|---|---|
| Upload a clear single-face portrait | ACCEPTED |
| Upload a landscape/object photo (no person) | REJECTED — "No face detected in the image." |
| Upload a group photo (2+ people) | REJECTED — "Multiple faces detected (N). Only single-face images are allowed." |
| Upload a photo where face is very small / distant | REJECTED — "Detected face is too small. Move closer to the camera." |

### Bulk Upload
| Test | Expected |
|---|---|
| Drop 10 images at once (mix of valid + invalid) | All appear instantly; invalid rejected client-side; valid show "Ready" badge |
| Click Upload with 5 valid images | Single POST to `/images/upload-bulk`; animated progress bar; all 5 cards update simultaneously |
| Upload same image twice in same batch | First accepted; second rejected as duplicate |
| Upload 0 valid images (all client-rejected) | Upload button disabled |

### Happy Path End-to-End
| Test | Expected |
|---|---|
| Clear JPEG portrait, ≥200×200, single face, not a duplicate | ACCEPTED — appears in Accepted grid with S3 URL |
| HEIC from iPhone with single face | Converted → ACCEPTED |

### UI Behaviour
| Test | Expected |
|---|---|
| Drop multiple files at once | All appear in grid immediately with client-side status |
| Mix of valid + invalid files | Valid ones show ACCEPTED, invalid show REJECTED |
| Upload button disabled when no valid files pending | Button is greyed out |
| Re-upload after clearing (same session) | Works without page refresh |
