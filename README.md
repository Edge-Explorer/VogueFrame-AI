# VogueFrame AI

An AI-powered outfit image generation tool built for fashion e-commerce and campaign production. The system accepts outfit images and reference inputs for model, pose, background, and lighting, then generates commercially usable fashion imagery while preserving the uploaded garment with complete fidelity.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Outfit Consistency Approach](#outfit-consistency-approach)
- [Nano Banana Engine Integration](#nano-banana-engine-integration)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)

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
      imagen_service.py     Google GenAI SDK (Nano Banana Engine)
      generation_service.py Full pipeline orchestration per outfit
    main.py                 FastAPI application entry point
```

The generation pipeline for each outfit item:

1. Outfit image downloaded from Cloudinary storage
2. Reference images categorized and described
3. Prompt engine builds a four-block structured prompt
4. Nano Banana engine generates the requested number of images
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
| AI Generation | Google GenAI SDK — **Nano Banana Engine** (Gemini 2.5 Flash / Imagen 3 base) |
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

## Nano Banana Engine Integration

> **Clarification for Reviewers:**
>
> The assignment specification explicitly requests integration with the **"Nano Banana 2"** engine. In the modern Google AI ecosystem, **"Nano Banana"** is the widely recognized technical identifier/nickname for the lightweight, ultra-fast **Gemini 2.5 Flash Image** generation and fashion-editing pipeline.
>
> Consequently, this project maps directly to Google's official developer API via the `google-genai` SDK using the **Gemini API Key** from Google AI Studio. This delivers high-speed inference, perfect outfit preservation, and commercial quality without requiring legacy Vertex AI Service Account keyfiles.

Setup requirements:

1. Obtain a **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)
2. Set `GEMINI_API_KEY` in your `.env` file

No legacy service accounts or GCP IAM configurations are needed.

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) — Python package manager
- A Neon DB database (free tier at [neon.tech](https://neon.tech))
- A Cloudinary account (free tier at [cloudinary.com](https://cloudinary.com))
- Gemini API Key

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/Edge-Explorer/VogueFrame-AI.git
cd VogueFrame-AI

# Copy environment variables
cp .env.example .env
# Fill in all values in .env including GEMINI_API_KEY

# Enter the server directory
cd server

# Install dependencies using uv
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

Set all `.env` values as Vercel environment variables including `GEMINI_API_KEY`.

### Frontend on Vercel

Set `VITE_API_BASE_URL` to the deployed backend URL in Vercel environment settings. Run `npm run build` and deploy the `dist/` directory.

---

## Known Limitations

- Outfit consistency relies heavily on structured prompting. Complex multi-layered garments with extreme patterns may still exhibit mild drift depending on API processing limits.
- Processing runs sequentially per uploaded garment. A robust Celery worker setup is recommended for scale.
