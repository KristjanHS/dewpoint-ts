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

# kri-local-rag

Local RAG system using Weaviate, Ollama, and Python.

## Quick Start

```bash
git clone <your-repo-url>
cd kri-local-rag
./run-docker.sh
```

## Features

- **Vector Database** (Weaviate) - Store document embeddings
- **Local LLM** (Ollama) - Run models locally
- **Interactive Console** - Ask questions about documents
- **PDF Processing** - Ingest and embed PDFs
- **GPU Support** - Optional acceleration

## System Requirements

- Docker & Docker Compose
- 8GB+ RAM
- NVIDIA GPU (optional)
- Linux/WSL2

## Usage

### 1. Start System
```bash
./run-docker.sh
```

### 2. Ingest Documents
```bash
docker compose run --rm rag-backend python ingest_pdf.py
```

### 3. Ask Questions
```
> What is this document about?
```

## Development

### Code Changes
```bash
# Make changes to backend/ files
# Restart to pick up changes
docker compose restart rag-backend
```

### Debug Levels
```bash
docker compose run --rm rag-backend --debug-level 1
```

## Troubleshooting

### Common Issues
- **No results** - Check if documents were ingested
- **Model not found** - Wait for download or pull manually
- **GPU issues** - Check NVIDIA Container Toolkit
- **Port conflicts** - Check ports 8080, 8081, 11434

### Quick Commands
```bash
docker ps                    # Check status
docker compose logs rag-backend  # View logs
docker compose down -v && ./run-docker.sh  # Reset
```

## Documentation

- [Getting Started](docs/setup/getting-started.md)
- [Basic Usage](docs/usage/basic-usage.md)
- [Document Processing](docs/usage/document-processing.md)
- [Docker Management](docs/setup/docker-management.md)

## License

MIT License - see [LICENSE](LICENSE) file.
