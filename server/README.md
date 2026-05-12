# AragonAI — Backend (NestJS)

A NestJS REST API that implements an 8-step image validation and storage pipeline.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | NestJS 11 | Structured DI, decorators, testable modules |
| ORM | Prisma 5 | Type-safe MongoDB client with schema-as-source-of-truth |
| Database | MongoDB Atlas | Flexible document model for variable image metadata |
| Image processing | Sharp | Native libvips bindings — 5–15× faster than pure-JS alternatives |
| HEIC conversion | heic-convert | Apple HEIC/HEIF → JPEG in-memory, no temp files |
| Storage | AWS S3 | Durable object storage; S3 URL returned to client |
| Face detection | AWS Rekognition | Managed ML: no model to host or maintain |

---

## Quick Start

```bash
cd server

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL, AWS_* values

# 3. Create database + indexes
npx prisma generate
npx prisma db push

# 4. Start in dev mode (hot-reload)
npm run start:dev
```

Backend starts at `http://localhost:3001`.

---

## Folder Structure

```
server/src/
├── main.ts                         Bootstrap, CORS, port binding
├── app.module.ts                   Root module — imports ImagesModule
├── app.controller.ts               Health-check GET /
├── prisma.service.ts               PrismaClient singleton (connects on module init)
│
├── common/
│   ├── constants/image.constants.ts  All thresholds in one place
│   └── types/image.types.ts          RawUpload, ProcessedImage, ImageStatus
│
├── config/
│   └── aws.config.ts               Factory functions for S3 + Rekognition clients
│
└── modules/images/
    ├── images.module.ts            Registers controller, service, sub-services
    ├── images.controller.ts        REST endpoints (upload, list, get, delete)
    ├── images.service.ts           Pipeline orchestration
    └── services/
        ├── image-processing.service.ts  Sharp: validate + hash
        └── storage.service.ts           S3 upload + Rekognition face check
```

---

## Pipeline Constants

All tunable thresholds live in `src/common/constants/image.constants.ts`:

```typescript
export const IMAGE_CONSTRAINTS = {
  MIN_DIMENSION: 200,               // pixels — minimum width and height
  BLUR_STDEV_THRESHOLD: 15,         // grayscale stdev below this → too blurry
  SIMILARITY_HAMMING_THRESHOLD: 10, // bits different → duplicate if < 10
  PERCEPTUAL_HASH_SIZE: 8,          // 8×8 grid = 64-bit hash
  MIN_FACE_AREA_RATIO: 0.05,        // face bounding box must be ≥ 5% of image
};
```

Change these values to tune sensitivity without touching business logic.

---

## Design Decisions

### Service separation

`ImageProcessingService` and `StorageService` are separate injectable services rather than methods on `ImagesService`. This means:

- You can unit-test image processing without AWS credentials (mock `StorageService`)
- You can test S3/Rekognition integration without Sharp installed
- Each service has a single responsibility: processing stays pure (no side effects), storage handles all I/O

### Reject, don't throw

When an image fails any pipeline step, `ImagesService` calls the private `reject()` helper which persists a `REJECTED` record to MongoDB. The caller always receives a structured `Image` object — it never throws a 4xx/5xx for business-rule failures. This keeps the API response shape consistent and makes the rejection history queryable.

HTTP errors (malformed request, missing file) are still thrown as NestJS `HttpException` instances.

### Graceful Rekognition degradation

```typescript
// storage.service.ts
} catch (err: any) {
  this.logger.warn(`Rekognition unavailable — face check skipped: ${err.message}`);
  return null; // image passes
}
```

If AWS Rekognition is unreachable (bad credentials, throttle, network partition), the face check is skipped and the image is accepted. This is an explicit availability-over-correctness tradeoff appropriate for a demo. A production system could use a dead-letter queue to retry face checks asynchronously.

### No DTOs / validation pipes (intentional)

The upload endpoint accepts raw `Express.Multer.File` and constructs a typed `RawUpload` object inline. Full NestJS DTO classes with `class-validator` decorators would be appropriate for a production API with many endpoints. For a focused image-upload service with one write endpoint, the overhead of DTO classes is not justified.

---

## API Endpoints

```
POST   /images/upload     Upload image (multipart/form-data, field: file)
GET    /images            All images, newest first
GET    /images/accepted   Only ACCEPTED images
GET    /images/rejected   Only REJECTED images
GET    /images/:id        Single image by UUID
DELETE /images/:id        Delete image record
```

---

## Database Schema

```prisma
model Image {
  id        String   @id @default(uuid()) @map("_id")
  filename  String
  url       String          // S3 URL for ACCEPTED, empty string for REJECTED
  status    String          // "ACCEPTED" | "REJECTED"
  mimetype  String
  size      Int             // bytes
  width     Int?            // null for format-rejected images
  height    Int?
  hash      String?         // perceptual hash, null for rejected images
  reason    String?         // rejection reason, null for accepted images
  createdAt DateTime @default(now())

  @@index([hash])           // fast duplicate lookup
  @@index([status])         // fast filter by status
  @@index([createdAt])      // fast chronological sort
}
```

---

## Running Tests

```bash
npm run test           # unit tests
npm run test:e2e       # end-to-end tests
npm run test:cov       # coverage report
```
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
