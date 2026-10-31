-- Fix execute_developer_payout RPC:
-- 1. Remove the admin-only guard: the edge function already verifies ownership
--    before calling this RPC with the service role key, so auth.uid() is NULL
--    inside the RPC context, causing it to always raise "Unauthorized".
-- 2. Remove SET updated_at = NOW() -- the developers table has no updated_at column.

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
  -- Fetch developer
  SELECT * INTO v_dev FROM public.developers WHERE id = p_developer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Developer not found: %', p_developer_id;
  END IF;

  v_payout_amount := COALESCE(v_dev.pending_balance, 0);
  IF v_payout_amount <= 0 THEN
    RAISE EXCEPTION 'Developer has no pending balance to disburse';
  END IF;

  -- Create payout record (status=SUCCESS since Paystack transfer already initiated)
  INSERT INTO public.payouts (
    developer_id,
    amount,
    currency,
    paystack_transfer_code,
    paystack_transfer_id,
    status,
    initiated_at,
    completed_at
  ) VALUES (
    p_developer_id,
    v_payout_amount,
    'GHS',
    p_transfer_code,
    p_transfer_id,
    'SUCCESS',
    NOW(),
    NOW()
  ) RETURNING id INTO v_payout_id;

  -- Atomically zero out pending balance
  UPDATE public.developers
  SET pending_balance = 0
  WHERE id = p_developer_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount', v_payout_amount
  );
END;
$$;

-- Ensure service role (used by edge functions) can execute this
GRANT EXECUTE ON FUNCTION public.execute_developer_payout TO authenticated, service_role;
