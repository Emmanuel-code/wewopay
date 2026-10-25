
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enums (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('developer', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'developer_plan') THEN
    CREATE TYPE public.developer_plan AS ENUM ('FREE', 'PRO', 'BUSINESS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
    CREATE TYPE public.billing_cycle AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_status') THEN
    CREATE TYPE public.client_status AS ENUM ('PENDING', 'ACTIVE', 'OVERDUE', 'PAUSED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE public.payout_status AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_type') THEN
    CREATE TYPE public.reminder_type AS ENUM ('UPCOMING_RENEWAL', 'PAYMENT_FAILED', 'MANUAL');
  END IF;
END $$;

-- Profiles (synced from auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  name text,
  role public.user_role NOT NULL DEFAULT 'developer',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Developers
CREATE TABLE IF NOT EXISTS public.developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  business_name text,
  logo_url text,
  plan public.developer_plan NOT NULL DEFAULT 'FREE',
  commission_rate numeric(5,2) NOT NULL DEFAULT 3.0,
  bank_account_number text,
  bank_name text,
  bank_code text,
  bank_account_name text,
  bank_verified boolean NOT NULL DEFAULT false,
  paystack_recipient_code text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  pending_balance numeric(12,2) NOT NULL DEFAULT 0,
  total_earned numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES public.developers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  currency text NOT NULL DEFAULT 'GHS',
  billing_cycle public.billing_cycle NOT NULL,
  amount numeric(12,2) NOT NULL,
  trial_days int NOT NULL DEFAULT 0,
  client_can_cancel boolean NOT NULL DEFAULT true,
  cancel_lock_months int NOT NULL DEFAULT 0,
  cancel_policy text,
  brand_color text,
  paystack_plan_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  notes text,
  status public.client_status NOT NULL DEFAULT 'PENDING',
  paystack_customer_code text,
  paystack_auth_code text,
  subscription_code text,
  next_billing_date timestamptz,
  retry_count int NOT NULL DEFAULT 0,
  payment_link_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  portal_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  accepted_terms_at timestamptz,
  subscription_start_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES public.developers(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  paystack_transfer_code text,
  paystack_transfer_id text,
  status public.payout_status NOT NULL DEFAULT 'PENDING',
  initiated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failure_reason text
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  paystack_ref text UNIQUE NOT NULL,
  gross_amount numeric(12,2) NOT NULL,
  paystack_fee numeric(12,2) NOT NULL,
  platform_fee numeric(12,2) NOT NULL,
  developer_amount numeric(12,2) NOT NULL,
  currency text NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  paid_at timestamptz,
  invoice_number text UNIQUE,
  invoice_pdf_url text,
  payout_id uuid REFERENCES public.payouts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  type public.reminder_type NOT NULL
);

-- Admin settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed admin settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('FREE_COMMISSION_RATE', '3.0'),
  ('PRO_COMMISSION_RATE', '1.5'),
  ('BUSINESS_COMMISSION_RATE', '0.8'),
  ('PRO_PLAN_PRICE', '99'),
  ('BUSINESS_PLAN_PRICE', '299'),
  ('PLATFORM_NAME', 'medo.dev'),
  ('SUPPORT_EMAIL', 'support@medo.dev')
ON CONFLICT (key) DO NOTHING;

-- Auto-sync profiles on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'developer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create developer record when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'developer' THEN
    INSERT INTO public.developers (profile_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.name, ''), COALESCE(NEW.email, ''))
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- Security helper
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.get_developer_id(uid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM developers WHERE profile_id = uid;
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- Developers policies
DROP POLICY IF EXISTS "Admin full access developers" ON public.developers;
CREATE POLICY "Admin full access developers" ON public.developers FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Developers view own" ON public.developers;
CREATE POLICY "Developers view own" ON public.developers FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "Developers update own" ON public.developers;
CREATE POLICY "Developers update own" ON public.developers FOR UPDATE TO authenticated USING (profile_id = auth.uid());

-- Projects policies
DROP POLICY IF EXISTS "Admin full access projects" ON public.projects;
CREATE POLICY "Admin full access projects" ON public.projects FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Developers CRUD own projects" ON public.projects;
CREATE POLICY "Developers CRUD own projects" ON public.projects FOR ALL TO authenticated USING (developer_id = get_developer_id(auth.uid()));
DROP POLICY IF EXISTS "Public read active projects by token" ON public.projects;
CREATE POLICY "Public read active projects by token" ON public.projects FOR SELECT TO anon USING (is_active = true);

-- Clients policies
DROP POLICY IF EXISTS "Admin full access clients" ON public.clients;
CREATE POLICY "Admin full access clients" ON public.clients FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Developers CRUD own clients" ON public.clients;
CREATE POLICY "Developers CRUD own clients" ON public.clients FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE developer_id = get_developer_id(auth.uid())));
DROP POLICY IF EXISTS "Public read client by token" ON public.clients;
CREATE POLICY "Public read client by token" ON public.clients FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Public update client by token" ON public.clients;
CREATE POLICY "Public update client by token" ON public.clients FOR UPDATE TO anon USING (true);

-- Payments policies
DROP POLICY IF EXISTS "Admin full access payments" ON public.payments;
CREATE POLICY "Admin full access payments" ON public.payments FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Developers view own payments" ON public.payments;
CREATE POLICY "Developers view own payments" ON public.payments FOR SELECT TO authenticated
  USING (client_id IN (SELECT c.id FROM public.clients c JOIN public.projects p ON c.project_id = p.id WHERE p.developer_id = get_developer_id(auth.uid())));
DROP POLICY IF EXISTS "Anon insert payments" ON public.payments;
CREATE POLICY "Anon insert payments" ON public.payments FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon view payments" ON public.payments;
CREATE POLICY "Anon view payments" ON public.payments FOR SELECT TO anon USING (true);

-- Payouts policies
DROP POLICY IF EXISTS "Admin full access payouts" ON public.payouts;
CREATE POLICY "Admin full access payouts" ON public.payouts FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Developers view own payouts" ON public.payouts;
CREATE POLICY "Developers view own payouts" ON public.payouts FOR SELECT TO authenticated USING (developer_id = get_developer_id(auth.uid()));

-- Reminders policies
DROP POLICY IF EXISTS "Admin full access reminders" ON public.reminders;
CREATE POLICY "Admin full access reminders" ON public.reminders FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Developers view own reminders" ON public.reminders;
CREATE POLICY "Developers view own reminders" ON public.reminders FOR SELECT TO authenticated
  USING (client_id IN (SELECT c.id FROM public.clients c JOIN public.projects p ON c.project_id = p.id WHERE p.developer_id = get_developer_id(auth.uid())));
DROP POLICY IF EXISTS "Anon insert reminders" ON public.reminders;
CREATE POLICY "Anon insert reminders" ON public.reminders FOR INSERT TO anon WITH CHECK (true);

-- Admin settings policies
DROP POLICY IF EXISTS "Admin full access settings" ON public.admin_settings;
CREATE POLICY "Admin full access settings" ON public.admin_settings FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "All authenticated read settings" ON public.admin_settings;
CREATE POLICY "All authenticated read settings" ON public.admin_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anon read settings" ON public.admin_settings;
CREATE POLICY "Anon read settings" ON public.admin_settings FOR SELECT TO anon USING (true);

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Authenticated upload logos" ON storage.objects;
CREATE POLICY "Authenticated upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
DROP POLICY IF EXISTS "Public view logos" ON storage.objects;
CREATE POLICY "Public view logos" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'logos');
DROP POLICY IF EXISTS "Authenticated manage own logos" ON storage.objects;
CREATE POLICY "Authenticated manage own logos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Authenticated view invoices" ON storage.objects;
CREATE POLICY "Authenticated view invoices" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'invoices');
DROP POLICY IF EXISTS "Service role manage invoices" ON storage.objects;
CREATE POLICY "Service role manage invoices" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'invoices');
