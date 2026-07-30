# Architecture & Reference Guide: Anastasia Sych Web Funnel

## 1. Project Status & Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database & Backend:** Supabase (PostgreSQL) with Row Level Security (RLS) enabled
- **Styling & UI:** Tailwind CSS, Framer Motion, Lucide Icons
- **Fonts:** Yeseva One (Accent headings), Carlito (Body & UI)
- **Colors:** `#ffdc82` (Yellow accent), `#c33624` (Red / Terracotta accent), Slate / Zinc dark-mode minimalism

---

## 2. Environment Variables (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (`https://mfyrftpdhprjyouyjecd.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS for secure server-side API writes)
- `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` - Facebook Pixel ID for web event tracking
- `TELEGRAM_LEADS_BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` - Telegram bot API token for leads & reports
- `TELEGRAM_CHAT_ID` - Target Telegram Group/Channel ID
- `TELEGRAM_THREAD_ID` - Thread ID for sales leads topic
- `TELEGRAM_REPORT_THREAD_ID` - Thread ID for daily/weekly reports topic
- `CRON_SECRET` - Authentication token for automated report cron jobs
- `SENDPULSE_CLIENT_ID` - SendPulse API client ID
- `SENDPULSE_CLIENT_SECRET` - SendPulse API client secret

---

## 3. Routes & Page Map
- **`/` (Root Page):** Clean, high-end 404 page ("Ви не туди потрапили") with zero external links.
- **`/diagnostic` (Diagnostic Landing Page):**
  - Interactive 11-block landing page for Anastasia Sych's 60-minute personal diagnostics (480 UAH instead of 1190 UAH).
  - Dynamic offer support via query parameter `?o=1` (Default), `?o=2`, `?o=3`.
  - Integrates contact lead modal with phone formatting (`+380`), UTM parameter preservation, and Facebook Pixel telemetry.
- **`/api/leads` (Ingestion API):**
  - Saves lead into `anastasia_sych_leads` with RLS protection.
  - Triggers Postgres function `fn_sync_lead_to_unified()` to replicate lead into `unified_customers` and `unified_orders`.
  - Sends real-time HTML lead alert to Telegram sales channel.
  - Pushes contact to SendPulse CRM API.
  - Synchronizes session metrics to Central Analytics Gateway (`bnw-prod.vercel.app`).
- **`/api/cron/report` (Telegram Report Cron):**
  - Runs daily at 09:00 Kyiv time via Vercel Cron (`vercel.json`).
  - Summarizes total leads, conversion rates per offer (`o=1`, `o=2`, `o=3`), and top UTM sources.
  - Sends structured HTML statistics to Telegram report thread.

---

## 4. Database Schema & RLS Security (`anastasia_sych_leads`)

```sql
-- Table definition
CREATE TABLE IF NOT EXISTS public.anastasia_sych_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    telegram TEXT,
    email TEXT,
    instagram TEXT,
    offer_variant TEXT DEFAULT '1',
    status TEXT DEFAULT 'Зареєстровано',
    amount NUMERIC DEFAULT 480,
    is_free BOOLEAN DEFAULT FALSE,
    order_id TEXT,
    sheet_id TEXT DEFAULT '0',
    target_sheet TEXT DEFAULT 'Anastasia Sych',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    page_path TEXT DEFAULT '/diagnostic',
    page_url TEXT,
    visitor_uuid UUID,
    raw_payload JSONB
);

-- Enable RLS
ALTER TABLE public.anastasia_sych_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (web form submissions)
CREATE POLICY "Allow public anon insertion" 
ON public.anastasia_sych_leads 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service_role full access" 
ON public.anastasia_sych_leads 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Trigger for unified CRM sync
CREATE TRIGGER trg_sync_anastasia_sych_lead
AFTER INSERT OR UPDATE ON public.anastasia_sych_leads
FOR EACH ROW EXECUTE FUNCTION fn_sync_lead_to_unified();
```
