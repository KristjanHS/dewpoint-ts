# Dew Point Advisor (Next.js on Vercel)

This folder now includes a Vercel-ready Next.js port alongside the original Python app.

## Setup
1) Install deps (Node 18+):
```bash
npm install
```
2) Env:
```bash
cp .env.local.example .env.local
# add your key
OPENWEATHER_API_KEY=...
```
3) Run locally:
```bash
npm run dev
```

## Deploy on Vercel
- Push this repo to GitHub/GitLab.
- Import in Vercel (root of this repo). It will auto-detect Next.js.
- Set env var `OPENWEATHER_API_KEY`.

## Project layout (Next.js)
- `src/app/page.tsx` – client UI (geolocation or city input, dew point calc, heatmap).
- `src/app/api/weather/route.ts` – serverless route proxying OpenWeather current + forecast.
- `src/lib/dewpoint.ts` – dew point math and recommendation helper.
- `src/app/globals.css` – styling.

Legacy Streamlit code is still under `app/`.

---

# Phase 2 — Local RAG Experimentation

This phase focuses on building and experimenting with a local Retrieval-Augmented Generation (RAG) pipeline. The goal is to use the `nomic-embed-text` model for creating text embeddings and FAISS for efficient similarity search.

## Directory Layout

```text
/
├── data/                     # Sample data for the RAG pipeline
├── notebooks/                # Jupyter notebooks for experimentation
├── python_code/              # Python scripts for the RAG pipeline
└── tests/                    # Tests for the RAG pipeline
```

## Key Components

- **Embedding Model**: `nomic-embed-text` for creating high-quality text embeddings.
- **Vector Store**: FAISS for efficient storage and retrieval of text embeddings.
- **RAG Pipeline**: A Python script that demonstrates how to load data, create embeddings, and perform similarity search.
