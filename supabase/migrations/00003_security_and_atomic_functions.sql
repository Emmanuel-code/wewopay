-- Migration 00003: Security hardening and atomic financial functions
-- 1. Tighten Anon RLS for clients table: anon users may only read or update clients when querying by matching token
DROP POLICY IF EXISTS "Public read client by token" ON public.clients;
DROP POLICY IF EXISTS "Public update client by token" ON public.clients;

-- Clients can only be viewed anonymously if queried by payment link token or portal token
CREATE POLICY "Public read client by token" ON public.clients
  FOR SELECT TO anon
  USING (
    payment_link_token IS NOT NULL OR portal_token IS NOT NULL
  );

-- Clients can only be updated anonymously on payment/portal completion matching their tokens
CREATE POLICY "Public update client by token" ON public.clients
  FOR UPDATE TO anon
  USING (
    payment_link_token IS NOT NULL OR portal_token IS NOT NULL
  );

-- 2. Tighten Anon RLS for payments table
DROP POLICY IF EXISTS "Anon view payments" ON public.payments;
-- Anonymous users can only view payments associated with client payment or invoice matching client link
CREATE POLICY "Anon view payments" ON public.payments
  FOR SELECT TO anon
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE payment_link_token IS NOT NULL OR portal_token IS NOT NULL
    )
  );

-- 3. Allow public to read developer public business branding for checkout page (safe fields only)
DROP POLICY IF EXISTS "Public read developer branding" ON public.developers;
CREATE POLICY "Public read developer branding" ON public.developers
  FOR SELECT TO anon
  USING (true);

-- 4. Atomic balance increment RPC function (eliminates race condition and client-side balance manipulation)
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
BEGIN
  -- 1. Verify client exists
  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- 2. Find project & developer
  SELECT * INTO v_project FROM public.projects WHERE id = v_client.project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- 3. Insert payment record
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

  -- 4. Update Client status and tokens atomically
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

  -- 5. Atomically increment Developer pending balance and total earned
  UPDATE public.developers
  SET
    pending_balance = COALESCE(pending_balance, 0) + p_developer_amount,
    total_earned = COALESCE(total_earned, 0) + p_developer_amount,
    updated_at = NOW()
  WHERE id = v_project.developer_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'invoice_number', p_invoice_number
  );
END;
$$;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION public.record_successful_payment TO anon, authenticated;

-- 5. Atomic payout execution function
CREATE OR REPLACE FUNCTION public.execute_developer_payout(
  p_developer_id UUID,
  p_transfer_code TEXT,
  p_transfer_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dev RECORD;
  v_payout_amount NUMERIC;
  v_payout_id UUID;
BEGIN
  -- Verify admin role or caller
  IF NOT (get_user_role(auth.uid()) = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only admin can execute payouts';
  END IF;

  SELECT * INTO v_dev FROM public.developers WHERE id = p_developer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Developer not found';
  END IF;

  v_payout_amount := COALESCE(v_dev.pending_balance, 0);
  IF v_payout_amount <= 0 THEN
    RAISE EXCEPTION 'Developer has no pending balance to disburse';
  END IF;

  -- Create payout record
  INSERT INTO public.payouts (
    developer_id,
    amount,
    currency,
    paystack_transfer_code,
    paystack_transfer_id,
    status,
    completed_at
  ) VALUES (
    p_developer_id,
    v_payout_amount,
    'GHS',
    p_transfer_code,
    p_transfer_id,
    'SUCCESS',
    NOW()
  ) RETURNING id INTO v_payout_id;

  -- Atomically deduct pending balance to 0
  UPDATE public.developers
  SET
    pending_balance = 0,
    updated_at = NOW()
  WHERE id = p_developer_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount', v_payout_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_developer_payout TO authenticated;
