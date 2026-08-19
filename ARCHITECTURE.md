# Architecture & Reference Guide: Anastasia Sych Web Funnel

## 1. Project Status & Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database & Backend:** Supabase (PostgreSQL) with Row Level Security (RLS) enabled
- **Payment Processing:** WayForPay Gateway (HMAC-MD5 signatures, webhook verification, 0 email transmission)
- **Styling & UI:** Tailwind CSS, Framer Motion, Lucide Icons
- **Fonts:** Yeseva One (Accent headings), Carlito (Body & UI)
- **Colors:** `#0284c7` (Primary Sky/Blue), `#0369a1` (Dark Sky), Slate / Zinc minimalism

---

## 2. Environment Variables (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (`https://mfyrftpdhprjyouyjecd.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS for secure server-side API writes)
- `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` - Facebook Pixel ID for web event tracking
- `TELEGRAM_LEADS_BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` - Telegram bot API token for leads & payment alerts
- `TELEGRAM_CHAT_ID` - Target Telegram Group/Channel ID
- `TELEGRAM_THREAD_ID` - Thread ID for sales leads topic
- `TELEGRAM_REPORT_THREAD_ID` - Thread ID for daily/weekly reports topic
- `CRON_SECRET` - Authentication token for automated report cron jobs
- `SENDPULSE_CLIENT_ID` - SendPulse API client ID
- `SENDPULSE_CLIENT_SECRET` - SendPulse API client secret
- `WAYFORPAY_MERCHANT_ACCOUNT` - WayForPay Merchant Account (`freelance_user_68f25563083b8`)
- `WAYFORPAY_SECRET_KEY` - WayForPay HMAC Secret Key (`ba0f0779bda0299f07c5b7df630c95786ac06398`)
- `WAYFORPAY_MERCHANT_PASSWORD` - WayForPay Merchant Password (`54ab149f47dc235036c91fba16807bc0`)
- `WAYFORPAY_MERCHANT_DOMAIN_NAME` - Merchant domain name (`anastasia-sych.vercel.app`)
- `NEXT_PUBLIC_TG_BOT_URL` - Telegram bot redirect link (`https://t.me/anastasiiasychbot?start=6a6cd40e6f9471d0600b322f`)

---

## 3. Routes & Page Map
- **`/` (Root Page):** Clean, high-end 404 page ("Ви не туди потрапили") with zero external links.
- **`/mini-course/flat-belly` (13-Block Mini-Course Landing Page - August 2026):**
  - High-converting landing page strictly based on 13-block technical specification and reference design (`sashahavryleiko-10kg.lovable.app`) for Anastasia Sych's mini-course «Зроби плаский живіт та струнку талію всього за 20 хвилин на день» (279 UAH instead of 3999 UAH, -93% discount).
  - Features 13 structured blocks: Start 27.08 Hero with dual price comparisons, 6 pain point frames with frustration visuals, messenger chat bubbles around Anastasia's full-height portrait, 6 YouTube-style video lessons curriculum, 20-minute daily system, nutrition & fat percentage breakdown, multi-disciplinary synergy formula, Anastasia's 8-year expert profile, target audience checklist, transformation cases carousel with zoom lightbox, inside features summary, 4 FAQ items, and final high-conversion CTA block.
  - Integrates persistent sticky bottom buy bar across the entire page, lead capture modal with auto-save to `localStorage`, phone formatting (`+380`), Telegram validation, Facebook Pixel tracking, and automatic WayForPay checkout.
- **`/mini-course/waist` (Mini-Course Landing Page - August 2026):**
  - High-converting landing page matching the consultation design reference for Anastasia Sych's mini-course «Позбудься випираючого живота та створи чітку талію з перших тренувань» (279 UAH instead of 2999 UAH, -91% discount).
  - 12 structured blocks strictly following specifications: Hero (Start 27.08), Price & 3 benefits, 6 Pain Points, Core Insight, 5 Lessons curriculum, Dedicated Bonus lesson on habits, Key outcomes, Target profile checklist, Anastasia Sych author profile, Transformation cases carousel with zoom lightbox, Final offer, and 5 FAQ items.
  - Integrates contact lead modal with auto-save to `localStorage`, phone formatting (`+380`), Telegram validation, and automatic WayForPay checkout.
- **`/mini-course` (Mini-Course Landing Page - 279 UAH / Start 27.08):**
  - High-converting landing page for Anastasia Sych's 6-lesson mini-course «Плаский живіт та струнка талія» (279 UAH instead of 2999 UAH, -91% discount, Start 27.08).
  - Features 12 structured blocks, circular cycle infographics, YouTube-style lesson cards, Anastasia's sports attire imagery, transformation case carousel, FAQ, and free bonus lesson "Як спалити ЖИР".
  - Integrates contact lead modal with auto-save, phone formatting (`+380`), Telegram validation, and automatic WayForPay payment generation.
- **`/diagnostic` (Diagnostic Landing Page):**
  - Interactive landing page for Anastasia Sych's 60-minute personal diagnostics (480 UAH instead of 1190 UAH).
  - Dynamic offer support via query parameter `?o=1` (Default), `?o=2`, `?o=3`.
  - Integrates contact lead modal with phone formatting (`+380`), UTM parameter preservation, and automatic WayForPay payment form submission.
- **`/thank-you` (Thank You & Bot Redirect Page):**
  - Displays payment confirmation & 3-second countdown.
  - Auto-redirects to `https://t.me/anastasiiasychbot?start=6a6cd40e6f9471d0600b322f`.
  - Includes a fallback interactive button to manual open the Telegram bot.
- **`/api/leads` (Ingestion & Order Creation API):**
  - Saves lead into `anastasia_sych_leads` with `order_id`.
  - Generates signed WayForPay payment payload (`merchantSignature`).
  - Sends real-time HTML lead alert to Telegram sales channel.
  - Syncs contact to SendPulse CRM & Central Analytics Gateway.
- **`/api/wayforpay/callback` (WayForPay Webhook API):**
  - Validates HMAC-MD5 signature from WayForPay.
  - Updates lead status in `anastasia_sych_leads` to `"Оплачено"`.
  - Dispatches Telegram payment alert (`🎉 ОПЛАТА ОТРЕМАНО!`).
  - Returns `accept` signature response to WayForPay.
- **`/api/wayforpay/status` (Order Status API):**
  - Server-side status lookup by `orderReference`.
- **`/api/cron/report` (Telegram Report Cron):**
  - Runs daily at 09:00 Kyiv time via Vercel Cron (`vercel.json`).
  - Pre-run trigger: calls `syncWayForPayTransactions` for the last 3 days to guarantee database accuracy before generating reports.
- **`/api/cron/sync-payments` (Payment Status Sync Cron):**
  - GET/POST endpoint to run `syncWayForPayTransactions`.
  - Supports query parameters `?days=N` or `?start=YYYY-MM-DD&end=YYYY-MM-DD` and checks `CRON_SECRET` authorization.
- **`scripts/run_sync.js` (Historical Sync Script):**
  - Standalone script executing a historical run of `syncWayForPayTransactions` from the project launch date (2026-07-01) to today, chunked in 28-day intervals.


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
