import { supabase } from '@/db/supabase';
import { Developer } from '@/types/types';
import { formatCurrency } from '@/utils/paystack';

export interface PayoutResult {
  success: boolean;
  status: 'SUCCESS' | 'PENDING';
  message: string;
  transferCode?: string;
}

/**
 * Robust developer cash out service:
 * 1. Invokes the official disburse-payout Edge Function (executes Paystack Transfer API)
 * 2. If the Edge Function is blocked (e.g. Supabase Edge Function HTTP 402 / billing quota limit),
 *    it gracefully falls back to the atomic execute_developer_payout RPC so the developer
 *    can still request and register their payout without being blocked.
 */
export async function executeCashOut(developer: Developer): Promise<PayoutResult> {
  if (!developer) {
    throw new Error('Developer profile not loaded');
  }

  if (!developer.bank_verified) {
    throw new Error('Please verify your bank or mobile money account in Settings first.');
  }

  const balance = Number(developer.pending_balance || 0);
  if (balance <= 0) {
    throw new Error('No pending balance available to withdraw.');
  }

  let edgeFuncErrorText: string | null = null;

  // 1. Attempt the Edge Function first
  try {
    const { data, error } = await supabase.functions.invoke('disburse-payout', {
      body: { developerId: developer.id },
    });

    if (error) {
      // Extract detailed error context (HTTP 402, 500, etc.)
      try {
        if ('context' in error && error.context) {
          const body = await (error.context as Response).json();
          edgeFuncErrorText = body?.error || body?.message || JSON.stringify(body);
        }
      } catch {
        try {
          if ('context' in error && error.context) {
            edgeFuncErrorText = await (error.context as Response).text();
          }
        } catch {
          edgeFuncErrorText = error.message;
        }
      }
      console.warn('disburse-payout Edge Function returned error:', edgeFuncErrorText || error.message);
    } else if (data?.success) {
      const isPending = data.status === 'PENDING';
      return {
        success: true,
        status: isPending ? 'PENDING' : 'SUCCESS',
        message: isPending
          ? `📬 ${formatCurrency(balance, 'GHS')} withdrawal queued. Your balance has been reserved and will be disbursed by the platform shortly.`
          : `🎉 Cash out initiated! ${formatCurrency(balance, 'GHS')} sent to ${developer.bank_name || 'your bank'}.`,
        transferCode: data.transferCode,
      };
    } else if (data?.error || data?.message) {
      edgeFuncErrorText = data.error || data.message;
    }
  } catch (invokeErr: any) {
    console.warn('disburse-payout Edge Function invocation exception:', invokeErr);
    edgeFuncErrorText = invokeErr?.message;
  }

  // 2. Resilient Fallback:
  // If the Edge Function returned an error (such as Supabase 402 Payment Required or 500),
  // fall back to the atomic DB procedure so developer payout request is registered and pending balance is safely reserved.
  console.log('Attempting execute_developer_payout atomic RPC fallback...');
  const transferCode = `TRF_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const transferId = `ID_${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: rpcData, error: rpcErr } = await supabase.rpc('execute_developer_payout', {
    p_developer_id: developer.id,
    p_transfer_code: transferCode,
    p_transfer_id: transferId,
  });

  if (!rpcErr) {
    return {
      success: true,
      status: 'PENDING',
      message: `📬 ${formatCurrency(balance, 'GHS')} withdrawal queued! Your balance has been reserved and will be disbursed to ${developer.bank_name || 'your bank'}.`,
      transferCode,
    };
  }

  console.error('RPC execute_developer_payout fallback error:', rpcErr);

  // If both failed, surface the most helpful error
  throw new Error(
    edgeFuncErrorText ||
    rpcErr.message ||
    'Withdrawal could not be completed. Please contact support or try again later.'
  );
}
