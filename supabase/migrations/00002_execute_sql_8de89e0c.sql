DO $$
DECLARE
  v_dev_id uuid;
  v_proj1_id uuid;
  v_proj2_id uuid;
  v_client1_id uuid;
  v_client2_id uuid;
  v_client3_id uuid;
BEGIN
  SELECT id INTO v_dev_id FROM public.developers WHERE email = 'dev@medo.dev' LIMIT 1;
  
  IF v_dev_id IS NOT NULL THEN
    -- Project 1: Monthly SaaS Retainer
    INSERT INTO public.projects (
      id, developer_id, name, description, currency, billing_cycle, amount, trial_days, client_can_cancel, cancel_lock_months, cancel_policy, brand_color, paystack_plan_code, is_active
    ) VALUES (
      '11111111-1111-1111-1111-111111111111', v_dev_id, 'CloudOps Care & Maintenance', 'Monthly infrastructure maintenance, backups, and security patching retainer.', 'GHS', 'MONTHLY', 500.00, 7, true, 3, 'Clients can cancel after the initial 3 months lock-in period with 14 days notice.', '#3b82f6', 'PLN_demo_cloudops_01', true
    ) ON CONFLICT (id) DO NOTHING;

    -- Project 2: API Integration Retainer
    INSERT INTO public.projects (
      id, developer_id, name, description, currency, billing_cycle, amount, trial_days, client_can_cancel, cancel_lock_months, cancel_policy, brand_color, paystack_plan_code, is_active
    ) VALUES (
      '22222222-2222-2222-2222-222222222222', v_dev_id, 'E-Commerce Platform Support', 'Quarterly store performance optimization and feature deployment.', 'GHS', 'QUARTERLY', 1200.00, 0, false, 0, 'No mid-term cancellations. Service is prepaid for the quarter.', '#10b981', 'PLN_demo_ecom_02', true
    ) ON CONFLICT (id) DO NOTHING;

    -- Client 1 (Active)
    INSERT INTO public.clients (
      id, project_id, name, email, phone, notes, status, paystack_customer_code, paystack_auth_code, subscription_code, next_billing_date, retry_count, payment_link_token, portal_token, accepted_terms_at, subscription_start_date
    ) VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Kofi Boateng', 'kofi.boateng@accralogistics.com', '+233244123456', 'Priority customer in logistics sector', 'ACTIVE', 'CUS_kofi12345', 'AUTH_w8s9d7f6', 'SUB_kofi_sub_99', NOW() + INTERVAL '12 days', 0, 'demo_token_kofi_pay_123', 'demo_portal_kofi_456', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Client 2 (Overdue)
    INSERT INTO public.clients (
      id, project_id, name, email, phone, notes, status, paystack_customer_code, paystack_auth_code, subscription_code, next_billing_date, retry_count, payment_link_token, portal_token, accepted_terms_at, subscription_start_date
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Ama Darko', 'ama.darko@goldcoasttech.io', '+233501234888', 'Invoice payment failed twice due to insufficient funds', 'OVERDUE', 'CUS_ama88776', 'AUTH_99f8d7s6', 'SUB_ama_sub_77', NOW() - INTERVAL '2 days', 2, 'demo_token_ama_pay_789', 'demo_portal_ama_012', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Client 3 (Pending)
    INSERT INTO public.clients (
      id, project_id, name, email, phone, notes, status, retry_count, payment_link_token, portal_token
    ) VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Yaw Osei', 'yaw.osei@oseifarms.gh', '+233277990011', 'New client onboarded yesterday. Payment link sent via email.', 'PENDING', 0, 'demo_token_yaw_pay_555', 'demo_portal_yaw_666'
    ) ON CONFLICT (id) DO NOTHING;

    -- Payments for Client 1
    INSERT INTO public.payments (
      client_id, paystack_ref, gross_amount, paystack_fee, platform_fee, developer_amount, currency, status, paid_at, invoice_number
    ) VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PAY_REF_ACCRA_001', 500.00, 7.50, 7.50, 485.00, 'GHS', 'SUCCESS', NOW() - INTERVAL '18 days', 'INV-2026-0001'
    ) ON CONFLICT (paystack_ref) DO NOTHING;

    -- Payments for Client 2
    INSERT INTO public.payments (
      client_id, paystack_ref, gross_amount, paystack_fee, platform_fee, developer_amount, currency, status, paid_at, invoice_number
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'PAY_REF_GOLD_001', 500.00, 7.50, 7.50, 485.00, 'GHS', 'SUCCESS', NOW() - INTERVAL '32 days', 'INV-2026-0002'
    ) ON CONFLICT (paystack_ref) DO NOTHING;

    -- Payout record
    INSERT INTO public.payouts (
      developer_id, amount, currency, paystack_transfer_code, paystack_transfer_id, status, initiated_at, completed_at
    ) VALUES (
      v_dev_id, 970.00, 'GHS', 'TRF_ghs_987654321', 'TRF_ID_100293', 'SUCCESS', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '35 minutes'
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;