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



<<<<<<< HEAD

=======
>>>>>>> fa1bb5b0465252f8db71f4913c8cf6c49b779aff
