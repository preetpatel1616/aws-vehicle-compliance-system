# Vehicle Compliance System

Upload a photo of a vehicle, and the system reads its licence plate, looks the vehicle up in a compliance database (insurance and registration), and emails the owner the result.

## How it works

1. **Upload**: the image is stored in AWS S3 (`/api/images`).
2. **Read the plate**: AWS Rekognition detects text in the image (`/api/ocr`). Rekognition returns every piece of text it sees, so a filter (`src/app/api/ocr/config.ts`) drops noise words and keeps only strings that match plate formats.
3. **Check compliance**: the plate is looked up in PostgreSQL through Prisma (vehicle, owner, insurance and registration status) (`/api/compliance-check`).
4. **Notify**: the owner gets an email with the result, sent over SMTP with Nodemailer (`src/app/utils/email.ts`).

## Stack

- Next.js 15 (App Router API routes), TypeScript
- PostgreSQL with Prisma (schema and migrations in `prisma/`)
- AWS S3 (image storage) and AWS Rekognition (text detection)
- Nodemailer over SMTP (email)
- JWT auth: `/api/login` issues a token; `src/middleware.ts` rejects any other API call without a valid one
- Docker; GitHub Actions pipeline that builds the image, pushes it to Amazon ECR and deploys to AWS Elastic Beanstalk

## Run locally

```bash
cp .env.example .env   # fill in DATABASE_URL, AWS, SMTP and JWT values
npm install
npx prisma migrate deploy && npm run seed
npm run dev            # http://localhost:3000
```

Or with Docker:

```bash
docker build -t vehicle-compliance .
docker run -p 3000:3000 --env-file .env vehicle-compliance
```

## Project structure

```
src/app/api/
  images/            upload to S3
  ocr/               Rekognition text detection + plate filter
  compliance-check/  look up plate, email the result
  compliances/       read and update compliance records
  vehicles/          vehicle records
  login/             issue JWT
src/app/utils/       auth (JWT) and email helpers
prisma/              schema, migrations, seed data
.github/workflows/   build, push to ECR, deploy to Elastic Beanstalk
```

## Limitations

- Plate reading depends on a hand-written filter, so accuracy drops on plate formats it does not know.
- No automated tests yet; the pipeline builds and deploys only.

## Next steps

- Detect the plate region before reading text, to cut noise.
- Add tests for the plate filter and the compliance check.
