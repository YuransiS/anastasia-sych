-- =========================================================
-- DATABASE MIGRATION & RLS POLICIES FOR ANASTASIA SYCH LEADS
-- =========================================================

-- 1. Create main leads table if not existing
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.anastasia_sych_leads ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to prevent conflicts on re-running
DROP POLICY IF EXISTS "Allow public anon insertion" ON public.anastasia_sych_leads;
DROP POLICY IF EXISTS "Allow service_role full access" ON public.anastasia_sych_leads;

-- 4. Create RLS Policies
-- Policy A: Allow public anonymous insertion (for web landing page forms)
CREATE POLICY "Allow public anon insertion" 
ON public.anastasia_sych_leads 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Policy B: Allow service role full access (for backend API & CRM cron jobs)
CREATE POLICY "Allow service_role full access" 
ON public.anastasia_sych_leads 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 5. Attach PostgreSQL Trigger for Central Unified CRM Replication
DROP TRIGGER IF EXISTS trg_sync_anastasia_sych_lead ON public.anastasia_sych_leads;

CREATE TRIGGER trg_sync_anastasia_sych_lead
AFTER INSERT OR UPDATE ON public.anastasia_sych_leads
FOR EACH ROW EXECUTE FUNCTION fn_sync_lead_to_unified();
