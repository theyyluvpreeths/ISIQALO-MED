# Isiqalo Med

**A secure medical case registry and data-extraction platform.**

Isiqalo Med lets healthcare practitioners upload clinical cases together with their imaging and documents (STL, DICOM, X-ray, PDF, images), keep patient identity data encrypted at rest, collaborate on cases, and export records as JSON, CSV, PDF or ZIP, with every sensitive action written to an audit trail. Patients get their own login and can link to and view their own records.

---

## Table of contents

1. [Purpose](#purpose)
2. [What the program does](#what-the-program-does)
3. [How it works](#how-it-works)
4. [Shaping the future](#shaping-the-future)
5. [Languages and technologies](#languages-and-technologies)
6. [Techniques used](#techniques-used)
7. [Project structure](#project-structure)
8. [How to run it](#how-to-run-it)
9. [Configuration](#configuration)
10. [API overview](#api-overview)
11. [Known limitations and next steps](#known-limitations-and-next-steps)

---

## Purpose

Clinical cases, especially those with imaging and 3D scan files, tend to end up scattered across email, USB drives and chat apps. That makes them hard to find, hard to share safely, and hard to account for when something goes wrong.

Isiqalo Med exists to give practitioners **one secure place** to:

- **Register** a case (condition, treatment, notes, patient details) with its supporting files.
- **Protect** patient information with encryption and strict role-based access.
- **Collaborate** with colleagues through case comments and private messaging.
- **Extract** records into portable formats for reporting, referral or archiving.
- **Prove accountability** through an audit log of who did what, when, and from where.
- **Involve the patient** by letting them link to and view their own records.

The platform is built with South African healthcare in mind. Practitioner registration validates an HPCSA number (format `MP1234567`) and a 7-digit practice number, and records carry medical-aid details.

---

## What the program does

### For practitioners
- **Register and log in** with an HPCSA-validated profile and choose a subscription plan (Starter, Professional, Enterprise).
- **Upload a case**: organisation, facility type (hospital, private practice, clinic), one of 21 medicine categories, condition, treatment name and notes, a priority flag, patient identity and medical-aid details, and up to 10 attached files per upload.
- **Browse and manage cases** you are assigned to, filter by organisation, medicine type or medical aid, edit, or delete (which also removes the stored files).
- **View and download documents** through short-lived signed links.
- **Comment on cases** and **send private messages** to other users.
- **Extract data** for selected patients as JSON, CSV, PDF (including embedded images) or a ZIP containing a clinical PDF report plus the raw files per patient.
- **Review the audit log** and manage profile and subscription settings.
- A dashboard summarises recent records and extraction activity.

### For patients
- **Register** with name, date of birth and medical number.
- **Link** to existing records by entering their ID number; the server matches it against the encrypted ID numbers on file.
- **Browse** only the records they are linked to, and view the documents and case comments.

### Roles
| Role | Access |
|------|--------|
| `practitioner` | Only patients they are assigned to |
| `patient` | Only records linked to their account (via ID number) |
| `viewer` | Read-only access to all records |
| `admin` / `superadmin` | All records, plus the admin message view |

The self-service signup screens create `practitioner` and `patient` accounts. The `viewer`, `admin` and `superadmin` roles are enforced by the access-control code, but there is no signup path for them in the UI.

---

## How it works

### Architecture

```
┌────────────────────┐    /api (JSON, multipart)    ┌───────────────────────────┐
│  React SPA (Vite)  │ ───────────────────────────► │  Express API (TypeScript) │
│  Bearer-token auth │ ◄─────────────────────────── │  helmet · CORS · limiters │
└────────────────────┘                              └─────┬───────────────┬─────┘
                                                          │               │
                                              ┌───────────▼──────┐  ┌─────▼───────────────────┐
                                              │ SQLite (WAL)     │  │ Azure Blob Storage      │
                                              │ metadata + AES-  │  │ (Azurite emulator       │
                                              │ GCM encrypted PII│  │ locally) – case files   │
                                              └──────────────────┘  └─────────────────────────┘
```

In production the Express process also serves the built React app, so everything runs as a single container on port 5000.

### Request lifecycle
1. **Login/registration** (`/api/auth/*`) is rate-limited to 5 failed attempts per 15 minutes per IP. Passwords are hashed with bcrypt and a JWT (1 hour) is returned. The login path compares against a dummy hash for unknown emails so response time does not reveal which accounts exist.
2. **Every other call** carries `Authorization: Bearer <token>`. `authenticateJWT` verifies it, and `authorizePatientAccess` then checks the caller's role and their assignment or link to the specific patient.
3. **Writing a case**: sensitive fields (first and last name, ID number, contact, medical-aid number, treatment notes, existing history) are encrypted with AES-256-GCM before being stored. Uploaded files are first written to a temp folder, pushed to Azure Blob Storage, and then removed locally. The blob key is itself stored encrypted in the database.
4. **Reading a document**: the API issues a signed token valid for 10 minutes, and `GET /api/files/:token` streams the file from blob storage. The token acts as the credential, so it is redacted from request logs. Documents are served with a locked-down Content-Security-Policy so uploaded content can never run script.
5. **Extraction**: the server decrypts the requested records, re-checks that the caller is assigned to each patient, writes a `DATA_EXTRACTION` audit entry, records the extraction in history, and streams the generated file back.
6. **Auditing**: logins, registrations, extractions, deletions and subscription changes are recorded in the `audit_logs` table and in Winston log files (`security-audit.log`, `error.log`, `combined.log`).

### Data model (SQLite)
`auth_users`, `pacs_patients`, `pacs_patient_doctors` (assignments), `auth_patient_links`, `pacs_patient_documents`, `pacs_case_comments`, `pacs_extractions`, `private_messages`, `audit_logs`, and `auth_otps`. The schema is applied idempotently on every startup, with foreign keys on, WAL journaling and a busy timeout for concurrent writes.

### Frontend
A single-page React app with views for authentication, dashboard, case upload, data extraction, case browsing, case management, messages and settings. Navigation adapts to the user's role, so patients see only Browse Cases and Messages. A small `apiRequest` helper attaches the token and applies timeouts (30 seconds for normal calls, 30 minutes for large uploads).

---

## Shaping the future

Isiqalo Med is an early-stage system, but it points at a few things worth building toward:

- **Patient-centred records.** Patients can see and link to their own data rather than depending on whichever clinic holds it. That is a step toward patient-owned health information.
- **Privacy by design.** Encryption at rest, least-privilege access, signed expiring links and full audit trails show how clinical data can be shared without being exposed by default.
- **Access to specialist imaging.** Support for STL, DICOM and X-ray files, with cloud blob storage behind it, can make case collaboration possible between facilities that cannot afford heavy PACS infrastructure.
- **Portable data.** One-click export to open formats keeps practitioners from being locked in, and supports referrals, reporting and research preparation.
- **A foundation for growth.** The container setup, cloud storage abstraction and tiered subscription model give a clear path from a single practice to multi-facility deployment.

These are goals the architecture supports, not claims about current clinical deployment. The software has not been described in the repository as clinically validated or certified.

---

## Languages and technologies

| Area | Technology |
|------|-----------|
| **Languages** | TypeScript (backend and frontend; effectively all application code), HTML and CSS, SQL (schema and queries), Dockerfile and YAML (deployment) |
| **Backend** | Node.js 22, Express 4, TypeScript 5, `ts-node` and `nodemon` for development |
| **Frontend** | React 19, Vite 8, TypeScript, `lucide-react` icons, ESLint |
| **Database** | SQLite via `sqlite3` |
| **File storage** | Azure Blob Storage (`@azure/storage-blob`), with the Azurite emulator locally |
| **Security** | `helmet`, `cors`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`, Node `crypto` (AES-256-GCM), `zod` |
| **Uploads and export** | `multer`, `pdfkit`, `archiver` |
| **Logging** | `winston` |
| **Deployment** | Docker (multi-stage build) and Docker Compose |

---

## Techniques used

**Security**
- AES-256-GCM authenticated encryption of PII and file paths, with a random IV per value stored as `iv:tag:ciphertext`.
- bcrypt password hashing and short-lived JWT sessions (1 hour).
- Timing-equalised login to prevent account enumeration.
- Role-based access control plus per-record authorisation middleware.
- Signed, 10-minute file URLs, with log redaction of the token.
- Three-tier rate limiting (general 1000 per 15 minutes, auth 5, extraction 20).
- Hardened HTTP headers: CSP, HSTS, `nosniff`, frame denial and a restrictive Permissions-Policy.
- CSV formula-injection neutralisation on export.
- File type allow-listing on upload (`.stl .dcm .xray .pdf .txt .png .jpg .jpeg .webp`) and a 1 GB per-file limit.
- Production start-up refuses to run without `JWT_SECRET` and `ENCRYPTION_KEY`.

**Software design**
- Layered structure: routes → controllers → repositories → database/services.
- Promise-wrapped SQLite helpers and a serialised transaction queue (`BEGIN IMMEDIATE`) so concurrent requests cannot interleave in one transaction.
- Schema-as-code that is idempotent on every boot.
- Streaming of large files (blob → response, and blob → ZIP) rather than buffering whole files in memory.
- Multi-stage Docker builds, plus a hot-reload dev compose override that uses file polling for Windows hosts.

---

## Project structure

```
ISIQALO-MED/
├── backend/
│   └── src/
│       ├── app.ts                    # Express setup, security headers, static serving
│       ├── routes/api.routes.ts      # All API routes + multer upload config
│       ├── controllers/              # auth, patient, extraction, chat, settings
│       ├── middleware/               # JWT auth, patient access, rate limits, validation
│       ├── repositories/             # Database access layer
│       ├── services/                 # encryption.ts, storage.ts (Azure Blob + signed tokens)
│       └── config/                   # database, schema, logger, secrets
├── frontend/
│   └── src/
│       ├── App.tsx                   # Shell, role-aware navigation
│       ├── views/                    # Screens (Auth, Upload, Extract, Browse, ...)
│       └── utils/api.ts              # Fetch wrapper with token and timeouts
├── Dockerfile                        # Production image (frontend + backend, port 5000)
├── docker-compose.yml                # App + Azurite blob emulator
├── docker-compose.dev.yml            # Hot-reload development override
└── .env.example                      # Required secrets template
```

---

## How to run it

You need a `.env` file with two secrets either way. Copy the template:

```bash
cp .env.example .env
```

Generate each secret value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put one result in `JWT_SECRET` and a different one in `ENCRYPTION_KEY`.

> **Important:** never change `ENCRYPTION_KEY` once real data exists. Previously encrypted records become unreadable.

### Option 1: Docker (recommended)

Requires [Docker](https://www.docker.com/) with Compose.

```bash
docker compose up --build
```

Open **http://localhost:5000**. This starts the app and a local Azurite blob-storage emulator. Data persists in Docker volumes.

### Option 2: Docker with hot reload (development)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

- Frontend: **http://localhost:5173**
- API: **http://localhost:5000**

No `node_modules` are needed on the host.

### Option 3: Run directly with Node

Requires Node.js 22 and a running Azurite instance (or a real Azure Storage account) for file uploads.

```bash
# 1. Start the blob emulator (needed for document uploads)
docker compose up azurite -d

# 2. Backend
cd backend
npm install
npm run dev            # http://localhost:5000

# 3. Frontend (second terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api to :5000)
```

The root `package.json` also offers `npm run install:all` and `npm run dev` shortcuts, **but those scripts call `cmd /c` and therefore only work on Windows**. On macOS or Linux, use the manual steps above.

For a production-style build without Docker: `npm run build` in `frontend/`, then `npm run build && npm start` in `backend/`, with `FRONTEND_DIST_PATH` pointing at `frontend/dist` (by default the backend looks in `../frontend/dist`).

### First use
1. Open the app and choose **Practitioner signup** (HPCSA format `MP1234567`, 7-digit practice number, pick a plan) or **Patient signup**.
2. Log in, then use **Upload Case** to create your first record.
3. As a patient, use **Browse Cases** and enter the ID number on a record to link it to your account.

---

## Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | Yes (production) | Signs login sessions and document links |
| `ENCRYPTION_KEY` | Yes (production) | Encrypts patient data at rest |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default `http://localhost:5173,http://127.0.0.1:5173`; the compose file sets `http://localhost:5000`) |
| `AZURE_STORAGE_CONNECTION_STRING` | No | Real Azure account in production; defaults to the local emulator |
| `AZURE_STORAGE_CONTAINER` | No | Blob container name (default `isiqalo-pacs-files`) |
| `DB_DATABASE_PATH` | No | SQLite file location (default `backend/data/isiqalo.sqlite`) |
| `FRONTEND_DIST_PATH` | No | Where the built frontend is served from |
| `PORT` | No | Server port (default 5000) |

Outside production, the server falls back to insecure development keys and logs a warning. **Never rely on that fallback with real patient data.**

---

## API overview

All routes are under `/api` and, except login, registration and signed file links, require a Bearer token.

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/auth/login` | Log in |
| POST | `/auth/register/patient` | Register a patient |
| POST | `/auth/register/practitioner` | Register a practitioner |
| GET | `/auth/me` | Current user |
| GET / POST | `/patients` | List or create cases |
| POST | `/patients/link` | Patient links records by ID number |
| GET / PUT / DELETE | `/patients/:id` | Read, update or delete a case |
| POST | `/patients/:id/documents` | Upload up to 10 files |
| GET | `/patients/:id/documents/:docId/url` | Get a 10-minute signed link |
| GET / POST | `/patients/:id/comments` | Case comments |
| GET | `/files/:token` | Stream a document (signed token) |
| GET | `/chats/users`, `/chats/:userId` | Chat users and messages |
| POST | `/chats/:userId` | Send a message |
| POST | `/extract` | Export cases as JSON, CSV, PDF or ZIP |
| GET | `/extract/history` | Past extractions |
| PUT | `/settings/profile` | Update profile |
| GET | `/settings/audit-logs` | View audit log |
| PUT | `/settings/subscription` | Change plan |

---

## Known limitations and next steps

Being upfront about the current state, based on a review of the code:

- **Medical-grade compliance is not established.** Before real patient data is used, the project needs a proper review against POPIA (and HIPAA or GDPR if relevant), plus penetration testing.
- **Not every field is encrypted.** Date of birth, gender, medical-aid name, organisation, condition and treatment name are stored in plain text. Names, ID number, contact details, medical-aid number, notes and history are encrypted.
- **Patient linking scans all records.** Matching an ID number decrypts every patient row, which will not scale to large datasets.
- **Plan changes are self-service.** Changing a subscription plan has no payment or approval step, and plan tiers are not yet used to gate features.
- **Chat visibility.** Any authenticated user can list all users for chat.
- **Unused pieces.** An OTP table and a demo-auth middleware exist in the code but are not wired into any route.
- **Windows-only root scripts.** The root `package.json` shortcuts use `cmd /c`.
- **No automated tests** are included in the repository.
- The existing `frontend/README.md` is the stock Vite template text; this file is the project overview.

Natural next steps: multi-factor authentication or email verification using the existing OTP table, encryption of the remaining PII fields, indexed blind-hash lookups for ID numbers, feature gating by plan, an automated test suite, and an in-browser viewer for DICOM and STL files.
