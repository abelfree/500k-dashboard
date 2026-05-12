# 500K Dashboard

A React + Vite dashboard built for deployment on Netlify and data sync via Supabase.

## Features
- Equity growth and daily P&L charts using `recharts`
- Trade history table
- CSV import and Supabase sync
- Tailwind styling
- Netlify-friendly build configuration

## Setup
1. Copy `.env.example` to `.env`
2. Create a Supabase project and add a `trades` table with columns:
   - `id` bigint (primary key)
   - `symbol` text
   - `type` text
   - `volume` numeric
   - `profit` numeric
   - `time` text
   - `created_at` timestamptz (default `now()`)
3. Update `.env` with your Supabase URL and anon key.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run locally:
   ```bash
   npm run dev
   ```

## Deploy to Netlify
- Connect this repo to Netlify or drag the project folder into Netlify Deploy.
- Set environment variables in Netlify: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Build command: `npm run build`
- Publish directory: `dist`
