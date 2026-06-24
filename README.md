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

---

## Prerequisites
- Docker & Docker Compose
- 8GB+ RAM
- NVIDIA GPU (optional)
- Linux/WSL2

---

## Automated Scripts

This project includes simple shell scripts to manage the entire Docker environment:

-   `docker-setup.sh`: Builds all images and starts all services for the first time.
-   `docker-run.sh`: Executes commands inside the running backend container (e.g., for ingestion).
-   `docker-reset.sh`: Stops and completely removes all containers, volumes, and images for this project.

---

## Installation & Startup

### First-Time Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/KristjanHS/kri-local-rag
    cd kri-local-rag
    ```

2.  Make the scripts executable:
    ```bash
    chmod +x docker-setup.sh docker-run.sh docker-reset.sh
    ```

3.  Run the automated setup script. This will build the Docker images and start all services.
    ```bash
    ./docker-setup.sh
    ```
    **Note:** The first run can be very slow (10-20 minutes or more) as it downloads several gigabytes of models. Subsequent launches are much faster.

Once the setup is complete, the Streamlit frontend will be available at **[http://localhost:8501](http://localhost:8501)**.

### Subsequent Launches

If you have stopped the containers (e.g., with `docker compose down`), you can restart them with:
```bash
docker compose -f docker/docker-compose.yml up --detach
```

---

## Usage

### Ingest Documents

To ingest documents into the Weaviate database, use the `docker-run.sh` script to execute the ingestion command inside the backend container.

For example, to ingest all PDFs from the `example_data` directory:
```bash
./docker-run.sh python backend/ingest_pdf.py example_data/
```

### Ask Questions

Once documents are ingested, you can ask questions via the Streamlit frontend at **[http://localhost:8501](http://localhost:8501)**.

---

## Environment Reset

To completely reset the project, which will stop and delete all Docker containers, volumes (including the Weaviate database and Ollama models), and custom images, run the reset script:

```bash
./docker-reset.sh
```
The script will ask for confirmation before deleting anything.

---

## Data Locations

- **Weaviate data**: `.weaviate_db` directory at the project root (visible in WSL/Linux as <project-root>/.weaviate_db)
- **Ollama models**: `.ollama_models` directory at the project root (visible in WSL/Linux as <project-root>/.ollama_models)
- **Source documents**: Local `data/` directory

---

## Documentation

This project contains additional documentation in the `docs/` directory:

- [Development Guide](docs/DEVELOPMENT.md) – Development workflow and best practices
- [Docker Management](docs/docker-management.md) – Docker container management
- [Document Processing](docs/document-processing.md) – Document ingestion and processing
- [Embedding Model Selection](docs/embedding-model-selection.md) – Guide for changing or understanding embedding models

## License

MIT License - see [LICENSE](LICENSE) file.

