# VogueFrame AI

An AI-powered outfit image generation tool built for fashion e-commerce and campaign production. The system accepts outfit images and reference inputs for model, pose, background, and lighting, then generates commercially usable fashion imagery while preserving the uploaded garment with complete fidelity.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Outfit Consistency Approach](#outfit-consistency-approach)
- [Image Generation Model](#image-generation-model)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Assumptions](#assumptions)

---

## Project Overview

VogueFrame AI solves a core problem in fashion production: generating high-quality editorial images where the garment stays exactly as designed, while the model, pose, background, and lighting change based on brand reference inputs.

The system supports:

- Single and batch outfit uploads
- ZIP archive extraction for bulk processing
- Per-outfit reference image categorization (model, pose, background, lighting, vibe)
- Structured prompt generation that separates garment preservation from creative direction
- Asynchronous generation pipeline with live status tracking
- Output gallery with individual and bulk download
- Regeneration of failed or unsatisfactory outputs
- Manual consistency scoring per generated image

---

## Architecture

```
client/                     React + Vite + Tailwind CSS frontend
server/
  app/
    api/v1/endpoints/       Route handlers (auth, jobs, outfits)
    core/                   Config, security (JWT), dependencies
    db/                     SQLAlchemy session and engine
    models/                 ORM models (User, GenerationJob, OutfitItem, etc.)
    schemas/                Pydantic request/response schemas
    services/
      cloudinary_service.py Upload management for all image types
      prompt_engine.py      Structured prompt construction layer
      imagen_service.py     Vertex AI Imagen 2 integration
      generation_service.py Full pipeline orchestration per outfit
    main.py                 FastAPI application entry point
```

The generation pipeline for each outfit item:

1. Outfit image downloaded from Cloudinary storage
2. Reference images categorized and described
3. Prompt engine builds a four-block structured prompt
4. Vertex AI Imagen 2 generates the requested number of images
5. Outputs uploaded to Cloudinary and persisted to Neon DB
6. Job status counters updated in real time

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12), uv package manager |
| Authentication | JWT (python-jose), bcrypt (passlib) |
| Database | Neon DB (serverless PostgreSQL), SQLAlchemy ORM |
| Image Storage | Cloudinary |
| AI Generation | Google Cloud Vertex AI — Imagen 2 (`imagegeneration@006`) |
| Deployment | Vercel (frontend + serverless backend) |

---

## Outfit Consistency Approach

The critical constraint of this project is that the generated output must preserve the uploaded outfit without any design drift. This is handled at the prompt layer.

The prompt engine constructs four distinct blocks for every generation request:

**Block 1 — Outfit Preservation (non-negotiable):**
An explicit instruction to preserve every visible detail of the garment: design, color scheme, fabric texture, pattern, print, embroidery, stitching, pleats, seams, lining, collar, neckline, sleeves, cuffs, hemline, buttons, and zippers. Any alteration is explicitly forbidden.

**Block 2 — Creative Direction (reference-driven):**
Instructions derived from uploaded reference images covering model type, pose, background, lighting, camera angle, and overall brand aesthetic. This block applies only to non-garment elements.

**Block 3 — Negative Instructions:**
Explicit prohibitions: do not change outfit color, do not change pattern, do not remove or add design elements, do not alter proportions, do not change fabric type, do not add logos or embellishments.

**Block 4 — Output Specification:**
Format requirements: high-resolution, photorealistic, portrait 3:4 aspect ratio, commercial e-commerce quality.

This separation ensures the model understands which elements are fixed and which can vary.

---

## Image Generation Model

This project uses **Imagen 2** (`imagegeneration@006`) through **Google Cloud Vertex AI**, as required by the assignment specification.

Setup requirements:

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Activate the available trial credits on an eligible new account
3. Enable the **Vertex AI API** in the project
4. Create a service account with the **Vertex AI User** role
5. Download the service account JSON key and place it at the root as `google-credentials.json`
6. Set `GCP_PROJECT_ID` and `GCP_LOCATION` in `.env`

No other image generation model is used for final outputs.

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) — Python package manager
- A Neon DB database (free tier at [neon.tech](https://neon.tech))
- A Cloudinary account (free tier at [cloudinary.com](https://cloudinary.com))
- Google Cloud project with Vertex AI enabled

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/Edge-Explorer/VogueFrame-AI.git
cd VogueFrame-AI

# Copy environment variables
cp .env.example .env
# Fill in all values in .env

# Enter the server directory
cd server

# Create virtual environment and install dependencies
uv sync

# Start the development server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd client

# Copy frontend environment variables
cp .env.example .env.local
# Set VITE_API_BASE_URL to your backend URL

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Google Cloud Credentials

Place your downloaded service account JSON key at the project root and name it `google-credentials.json`. This file is listed in `.gitignore` and must never be committed.

---

## API Reference

Base path: `/api/v1`

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/login` | Obtain access and refresh tokens |
| POST | `/auth/refresh` | Refresh an expired access token |
| GET | `/auth/me` | Get current authenticated user |

### Generation Jobs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/jobs/` | Create a job from uploaded outfit images |
| POST | `/jobs/upload-zip` | Create a job from a ZIP archive |
| GET | `/jobs/{job_id}` | Get full job status and results |
| GET | `/jobs/` | List all jobs for the current user |

### Outfit Items

| Method | Endpoint | Description |
|---|---|---|
| GET | `/outfits/{outfit_id}` | Get details for a single outfit item |
| POST | `/outfits/{outfit_id}/regenerate` | Regenerate outputs for an outfit |
| PATCH | `/outfits/{outfit_id}/score` | Set a consistency score on a generated image |

All endpoints except `/auth/register` and `/auth/login` require a `Bearer` token in the `Authorization` header.

---

## Deployment

### Backend on Vercel

Create a `vercel.json` at the server root:

```json
{
  "builds": [{ "src": "app/main.py", "use": "@vercel/python" }],
  "routes": [{ "src": "/(.*)", "dest": "app/main.py" }]
}
```

Set all `.env` values as Vercel environment variables. Upload the Google credentials JSON content as a secret environment variable and adjust the credentials path accordingly.

### Frontend on Vercel

Set `VITE_API_BASE_URL` to the deployed backend URL in Vercel environment settings. Run `npm run build` and deploy the `dist/` directory.

---

## Known Limitations

- Imagen 2 does not natively support image-conditioned generation in the same way as inpainting models. Outfit consistency relies on prompt engineering. Complex patterns and textures with high variation may exhibit some drift.
- Batch processing runs sequentially per outfit item. For large batches, processing time scales linearly. A task queue (e.g., Celery with Redis) would improve throughput in production.
- The current reference image handling describes categories textually in the prompt. Passing reference images directly to the model as visual conditioning is the recommended next step.
- ZIP upload extracts images alphabetically. Custom ordering requires a manifest file inside the ZIP.
- Google Cloud trial credits are subject to eligibility requirements and may not be available on all accounts.

---

## Assumptions

- The assignment's reference to "Nano Banana 2" corresponds to **Google Imagen 2** (`imagegeneration@006`) on Vertex AI.
- Users are expected to provide their own Google Cloud project with billing or trial credits enabled.
- Reference images are optional. If none are provided, the system generates with a default editorial fashion prompt.
- Outfit consistency is managed entirely through structured prompting. No additional image segmentation or masking pipeline is applied at this stage.
- The application is designed as a prototype demonstrating the complete workflow, not a production system with SLA guarantees.
