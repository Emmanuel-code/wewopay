-- Migration 00004: Comprehensive AppSec Hardening & Financial Integrity
-- Addresses:
-- 1. Permissive client RLS data exfiltration
-- 2. Financial ledger manipulation on record_successful_payment
-- 3. Idempotency and replay prevention via UNIQUE constraints
-- 4. Secure token lookup procedures for anonymous portal and payment links

-- =========================================================================
-- 1. HARDEN PAYMENTS TABLE: Enforce Unique Paystack Reference (Anti-Replay)
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_paystack_ref'
  ) THEN
    -- In case of existing duplicates in dev, keep earliest and clean duplicates
    DELETE FROM public.payments a USING public.payments b
    WHERE a.id > b.id AND a.paystack_ref = b.paystack_ref;

    ALTER TABLE public.payments ADD CONSTRAINT uq_payments_paystack_ref UNIQUE (paystack_ref);
  END IF;
END $$;

-- Ensure updated_at exists on all core entities
ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- =========================================================================
-- 2. HARDEN CLIENTS RLS: Drop Permissive Static Policies
-- =========================================================================
DROP POLICY IF EXISTS "Public read client by token" ON public.clients;
DROP POLICY IF EXISTS "Public update client by token" ON public.clients;
DROP POLICY IF EXISTS "Anon view payments" ON public.payments;

-- Anonymous users cannot run unrestricted SELECT queries across clients
-- Instead, provide secure parameterized functions for public links

-- =========================================================================
-- 3. SECURE TOKEN LOOKUP FUNCTIONS (Zero Data Exposure Across Tenants)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_payment_checkout_details(p_payment_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_project RECORD;
  v_dev RECORD;
BEGIN
  IF p_payment_token IS NULL OR trim(p_payment_token) = '' THEN
    RETURN jsonb_build_object('error', 'Token is required');
  END IF;

  -- 1. Find client strictly matching the provided payment token
  SELECT * INTO v_client
  FROM public.clients
  WHERE payment_link_token = p_payment_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'INVALID_LINK');
  END IF;

  -- 2. Find associated project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_client.project_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROJECT_NOT_FOUND');
  END IF;

  -- 3. Find developer safe public branding only
  SELECT id, name, business_name, logo_url, commission_rate
  INTO v_dev
  FROM public.developers
  WHERE id = v_project.developer_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'client', jsonb_build_object(
      'id', v_client.id,
      'name', v_client.name,
      'email', v_client.email,
      'status', v_client.status,
      'currency', v_project.currency,
      'project_id', v_client.project_id
    ),
    'project', row_to_json(v_project),
    'developer', jsonb_build_object(
      'id', v_dev.id,
      'name', v_dev.name,
      'business_name', v_dev.business_name,
      'logo_url', v_dev.logo_url,
      'commission_rate', COALESCE(v_dev.commission_rate, 3.0)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_checkout_details(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_portal_details(p_portal_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_project RECORD;
  v_payments JSONB;
BEGIN
  IF p_portal_token IS NULL OR trim(p_portal_token) = '' THEN
    RETURN jsonb_build_object('error', 'Token is required');
  END IF;

  SELECT * INTO v_client
  FROM public.clients
  WHERE portal_token = p_portal_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'INVALID_TOKEN');
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_client.project_id
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(row_to_json(p) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO v_payments
  FROM public.payments p
  WHERE p.client_id = v_client.id;

  RETURN jsonb_build_object(
    'client', row_to_json(v_client),
    'project', row_to_json(v_project),
    'payments', v_payments
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_details(TEXT) TO anon, authenticated;

-- =========================================================================
-- 4. HARDEN FINANCIAL LEDGER: Restrict record_successful_payment & Add Idempotency
-- =========================================================================
CREATE OR REPLACE FUNCTION public.record_successful_payment(
  p_client_id UUID,
  p_paystack_ref TEXT,
  p_gross_amount NUMERIC,
  p_paystack_fee NUMERIC,
  p_platform_fee NUMERIC,
  p_developer_amount NUMERIC,
  p_currency TEXT,
  p_invoice_number TEXT,
  p_paystack_customer_code TEXT DEFAULT NULL,
  p_subscription_code TEXT DEFAULT NULL,
  p_next_billing_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_project RECORD;
  v_developer RECORD;
  v_payment_id UUID;
  v_existing RECORD;
BEGIN
  -- Strict Input Validation
  IF p_client_id IS NULL OR p_paystack_ref IS NULL OR trim(p_paystack_ref) = '' THEN
    RAISE EXCEPTION 'Invalid parameters: client_id and paystack_ref are required';
  END IF;

  IF p_gross_amount <= 0 OR p_developer_amount < 0 THEN
    RAISE EXCEPTION 'Invalid financial amounts provided';
  END IF;

  -- 1. Anti-Replay / Idempotency Check:
  -- If this payment was already registered, return successfully without double-crediting
  SELECT * INTO v_existing FROM public.payments WHERE paystack_ref = p_paystack_ref;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'payment_id', v_existing.id,
      'invoice_number', v_existing.invoice_number
    );
  END IF;

  -- 2. Verify client exists
  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- 3. Verify project exists
  SELECT * INTO v_project FROM public.projects WHERE id = v_client.project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- 4. Atomically insert payment record
  INSERT INTO public.payments (
    client_id,
    paystack_ref,
    gross_amount,
    paystack_fee,
    platform_fee,
    developer_amount,
    currency,
    status,
    paid_at,
    invoice_number
  ) VALUES (
    p_client_id,
    p_paystack_ref,
    p_gross_amount,
    p_paystack_fee,
    p_platform_fee,
    p_developer_amount,
    p_currency,
    'SUCCESS',
    NOW(),
    p_invoice_number
  ) RETURNING id INTO v_payment_id;

  -- 5. Atomically update client status
  UPDATE public.clients
  SET
    status = 'ACTIVE',
    accepted_terms_at = COALESCE(accepted_terms_at, NOW()),
    subscription_start_date = COALESCE(subscription_start_date, NOW()),
    next_billing_date = p_next_billing_date,
    paystack_customer_code = COALESCE(p_paystack_customer_code, paystack_customer_code),
    subscription_code = COALESCE(p_subscription_code, subscription_code),
    retry_count = 0,
    updated_at = NOW()
  WHERE id = p_client_id;

  -- 6. Atomically credit developer pending balance
  UPDATE public.developers
  SET
    pending_balance = COALESCE(pending_balance, 0) + p_developer_amount,
    total_earned = COALESCE(total_earned, 0) + p_developer_amount,
    updated_at = NOW()
  WHERE id = v_project.developer_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'payment_id', v_payment_id,
    'invoice_number', p_invoice_number
  );
END;
$$;

-- REVOKE broad permissions so unauthenticated clients cannot manipulate funds
REVOKE ALL ON FUNCTION public.record_successful_payment(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;

-- Permitted exclusively for backend services (Edge Functions running under service_role)
GRANT EXECUTE ON FUNCTION public.record_successful_payment(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
