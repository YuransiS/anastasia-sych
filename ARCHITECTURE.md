# Architecture & Reference Guide: Anastasia Sych Web Funnel

## 1. Project Status & Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database & Backend:** Supabase (PostgreSQL) with Row Level Security (RLS) enabled
- **CRM Integration:** B&W CRM v2.0 Canonical Data Enrichment Protocol (`unified_customers`, `unified_orders`)
- **Payment Processing:** WayForPay Gateway (HMAC-MD5 signatures, webhook verification, 0 email transmission)
- **Styling & UI:** Tailwind CSS, Framer Motion, Lucide Icons
- **Fonts:** Yeseva One (Accent headings), Carlito (Body & UI)
- **Colors:** `#0284c7` (Primary Sky/Blue), `#0369a1` (Dark Sky), Slate / Zinc minimalism

---

## 2. Environment Variables (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (`https://mfyrftpdhprjyouyjecd.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS for secure server-side API writes)
- `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` - Facebook Pixel ID for web event tracking (`1015433897324199`)
- `TELEGRAM_LEADS_BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` - Telegram bot API token for leads & payment alerts
- `TELEGRAM_CHAT_ID` - Target Telegram Group/Channel ID (`-1003943120978`)
- `TELEGRAM_THREAD_ID` - Thread ID for sales leads topic (`904`)
- `TELEGRAM_REPORT_THREAD_ID` - Thread ID for daily/weekly reports topic (`908`)
- `CRON_SECRET` - Authentication token for automated report cron jobs
- `SENDPULSE_CLIENT_ID` - SendPulse API client ID
- `SENDPULSE_CLIENT_SECRET` - SendPulse API client secret
- `WAYFORPAY_MERCHANT_ACCOUNT` - WayForPay Merchant Account (`freelance_user_68f25563083b8`)
- `WAYFORPAY_SECRET_KEY` - WayForPay HMAC Secret Key (`ba0f0779bda0299f07c5b7df630c95786ac06398`)
- `WAYFORPAY_MERCHANT_PASSWORD` - WayForPay Merchant Password (`54ab149f47dc235036c91fba16807bc0`)
- `WAYFORPAY_MERCHANT_DOMAIN_NAME` - Merchant domain name (`anastasia-sych.vercel.app`)
- `NEXT_PUBLIC_TG_BOT_URL` - Telegram bot redirect link (`https://t.me/anastasiiasychbot?start=6a6cd40e6f9471d0600b322f`)

---

## 3. B&W CRM v2.0 Canonical Enrichment Protocol

### Project Identifiers
- **Project UUID:** `39ace0eb-084a-455e-b058-c6f20cda7f74`
- **Project Slug:** `anastasia_sych`
- **Project Name:** `Анастасія Сич`

### Mandatory Fields & Currency Rules
- `currency`: Explicitly passed in uppercase: `"UAH"`, `"USD"`, or `"EUR"`.
- `amount`: Floating point number (`1500.00`, `279.00`, `480.00`, `0.00` for free).
- `product_type`: Explicitly classified:
  - `"tripwire"`: Mini-courses (`/mini-course/*`, 279 UAH)
  - `"consultation"`: Diagnostics (`/diagnostic`, `/consultation`, 480 UAH)
  - `"course"`: Main course offers
  - `"subscription"`: Club memberships
  - `"lead"`: Free registrations

### Canonical Status Flow
- **New / Pending:** `"pending"` (or `"new"`) upon lead capture before checkout.
- **Successful Payment:** `"closed_won"` upon WayForPay approval.
- **Declined / Failed:** `"declined"` upon payment failure or expiration.
- **Traffic Interactivity:** `"Клик"` / `"КликФормы"`.

### Marketing Attribution
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `campaign_id`, `adset_id`, `ad_id` (Facebook Ads match)
- `fbclid`, `gclid`
- `fbp`, `fbc` (Cookie attribution)
- `visitor_uuid` (LocalStorage persistent UUID)
- `page_path`, `page_url`

### Contact Normalization
- `phone`: Strip all non-digits, format as `+380XXXXXXXXX` (or international `+<digits>`).
- `email`: `toLowerCase().trim()`.
- `telegram`: Clean username without `@` (or numeric ID).

---

## 4. Routes & Page Map
- **`/` (Root Page):** Clean, high-end 404 page ("Ви не туди потрапили") with zero external links.
- **`/mini-course/flat-belly` (13-Block Mini-Course Landing Page):**
  - Mini-course «Зроби плаский живіт та струнку талію всього за 20 хвилин на день» (279 UAH).
  - Uses `getMarketingAttribution()` to send full UTM & pixel cookies.
- **`/mini-course/waist` (Mini-Course Landing Page):**
  - Mini-course «Позбудься випираючого живота та створи чітку талію з перших тренувань» (279 UAH).
  - Uses `getMarketingAttribution()` to send full UTM & pixel cookies.
- **`/mini-course` (Mini-Course Landing Page):**
  - Mini-course «Плаский живіт та струнка талія» (7.60 EUR / was 67 EUR).
  - Streamlined layout (removed problem & steps blocks, evergreen without hardcoded dates).
  - Uses `getMarketingAttribution()` to send full UTM & pixel cookies.
- **`/diagnostic` & `/consultation` (Diagnostic Landing Pages):**
  - Personal diagnostics (480 UAH) with dynamic offer support (`?o=1`, `?o=2`, `?o=3`).
  - Uses `getMarketingAttribution()` to send full UTM & pixel cookies.
- **`/thank-you` (Thank You & Bot Redirect Page):**
  - Displays payment confirmation & 3-second countdown to Telegram bot.
- **`/payment-failed` (Payment Failed Page):**
  - Displays friendly retry interface with reason description.
- **`/api/leads` (Ingestion & Order Creation API):**
  - Upserts customer in `unified_customers` and creates order in `unified_orders` (`status: "pending"`).
  - Dual-writes to `anastasia_sych_leads` with `order_id`.
  - Dispatches signed WayForPay payload and Telegram notification.
- **`/api/wayforpay/callback` (WayForPay Webhook API):**
  - Validates HMAC-MD5 signature.
  - Updates `unified_orders` status to `"closed_won"` or `"declined"`.
  - Updates `anastasia_sych_leads` status to `"Оплачено"` / `"Не оплачено"`.
  - Edits sales alert in Telegram thread `904`.
- **`/api/cron/report` (Telegram Report Cron):**
  - Automated daily report at 09:00 Kyiv time.
- **`/api/cron/sync-payments` & `scripts/run_sync.js` (Transaction Sync):**
  - Synchronizes transactions from WayForPay directly into `unified_orders`, `unified_customers`, and `anastasia_sych_leads`.

---

## 5. Database Architecture & Trigger Replication

```sql
-- Trigger for automatic replication from anastasia_sych_leads into unified_customers & unified_orders
CREATE TRIGGER trg_sync_anastasia_sych_lead
AFTER INSERT OR UPDATE ON public.anastasia_sych_leads
FOR EACH ROW EXECUTE FUNCTION fn_sync_lead_to_unified();
```
