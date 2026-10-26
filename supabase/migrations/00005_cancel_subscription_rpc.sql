-- Cancel a client subscription from the public portal, verified by token.
--
-- Background: the portal runs as anon, and migration 00004 dropped anon's
-- direct UPDATE on clients (it was wide open: USING (true)). The portal's
-- cancel button kept writing directly and never checked the error, so
-- clients saw "subscription cancelled" while the subscription stayed ACTIVE.
--
-- This follows the same pattern as get_portal_details: a SECURITY DEFINER
-- function that checks the portal token before writing, granted to anon.
-- The token check is what makes the anon grant safe — a caller can only
-- cancel the one client whose portal link they hold.
CREATE OR REPLACE FUNCTION public.cancel_subscription_by_token(
  p_portal_token TEXT,
  p_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
BEGIN
  IF p_portal_token IS NULL OR trim(p_portal_token) = '' OR p_client_id IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters: portal token and client id are required';
  END IF;

  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  IF v_client.portal_token IS DISTINCT FROM p_portal_token THEN
    RAISE EXCEPTION 'Invalid portal token';
  END IF;

  UPDATE public.clients
  SET status = 'CANCELLED', updated_at = NOW()
  WHERE id = p_client_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_subscription_by_token(TEXT, UUID) TO anon, authenticated;
