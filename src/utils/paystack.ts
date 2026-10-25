export interface BankOption {
  id: number;
  name: string;
  code: string;
  currency: string;
}

// Major Ghanaian Banks supported by Paystack
export const GHANA_BANKS: BankOption[] = [
  { id: 1, name: 'Ecobank Ghana', code: 'ECOGHAC', currency: 'GHS' },
  { id: 2, name: 'Standard Chartered Bank Ghana', code: 'SCBLGHAC', currency: 'GHS' },
  { id: 3, name: 'Stanbic Bank Ghana', code: 'SBICGHAC', currency: 'GHS' },
  { id: 4, name: 'GCB Bank Limited', code: 'GCBLGHAC', currency: 'GHS' },
  { id: 5, name: 'Absa Bank Ghana', code: 'BARCGHAC', currency: 'GHS' },
  { id: 6, name: 'Fidelity Bank Ghana', code: 'FBLGHAC', currency: 'GHS' },
  { id: 7, name: 'Zenith Bank Ghana', code: 'ZEBLGHAC', currency: 'GHS' },
  { id: 8, name: 'CalBank PLC', code: 'CALBGHAC', currency: 'GHS' },
  { id: 9, name: 'Access Bank Ghana', code: 'ABNGHAC', currency: 'GHS' },
  { id: 10, name: 'First National Bank Ghana', code: 'FIRNGHAC', currency: 'GHS' },
  { id: 11, name: 'MTN Mobile Money (MoMo)', code: 'MTN', currency: 'GHS' },
  { id: 12, name: 'Vodafone Cash', code: 'VOD', currency: 'GHS' },
  { id: 13, name: 'AirtelTigo Money', code: 'ATL', currency: 'GHS' },
];

export const NIGERIA_BANKS: BankOption[] = [
  { id: 101, name: 'Access Bank', code: '044', currency: 'NGN' },
  { id: 102, name: 'Guaranty Trust Bank (GTBank)', code: '058', currency: 'NGN' },
  { id: 103, name: 'Zenith Bank', code: '057', currency: 'NGN' },
  { id: 104, name: 'United Bank for Africa (UBA)', code: '033', currency: 'NGN' },
  { id: 105, name: 'First Bank of Nigeria', code: '011', currency: 'NGN' },
];

/**
 * Paystack fee calculation rules based on specification:
 * - GHS: 1.5%
 * - NGN: 1.5% + NGN 100 (capped at 2000)
 * - USD: 2.9% + USD 0.30
 * - KES: 1.5%
 */
export function calculatePaystackFee(amount: number, currency: string = 'GHS'): number {
  const curr = currency.toUpperCase();
  const amountInCents = Math.round(Number(amount || 0) * 100);

  if (curr === 'GHS') {
    return Math.round(amountInCents * 0.015) / 100;
  }
  if (curr === 'NGN') {
    let feeInCents = Math.round(amountInCents * 0.015);
    if (amount >= 2500) {
      feeInCents += 10000; // 100 NGN in Kobo
    }
    return Math.min(feeInCents, 200000) / 100; // capped at 2000 NGN
  }
  if (curr === 'USD') {
    return Math.round(amountInCents * 0.029 + 30) / 100;
  }
  return Math.round(amountInCents * 0.015) / 100;
}

/**
 * Calculates platform fee and developer net payout with cent-exact rounding
 */
export function calculatePaymentSplits(grossAmount: number, commissionRate: number, currency: string = 'GHS') {
  const grossInCents = Math.round(Number(grossAmount || 0) * 100);
  const paystackFee = calculatePaystackFee(grossAmount, currency);
  const paystackFeeInCents = Math.round(paystackFee * 100);

  const platformFeeInCents = Math.round((grossInCents * Number(commissionRate || 3.0)) / 100);
  const netReceivedInCents = Math.max(0, grossInCents - paystackFeeInCents);
  const developerAmountInCents = Math.max(0, netReceivedInCents - platformFeeInCents);

  return {
    grossAmount: grossInCents / 100,
    paystackFee,
    netReceived: netReceivedInCents / 100,
    platformFee: platformFeeInCents / 100,
    developerAmount: developerAmountInCents / 100,
  };
}

/**
 * Currency formatter with symbol and 2 decimal places
 */
export function formatCurrency(amount: number, currency: string = 'GHS'): string {
  const curr = currency.toUpperCase();
  const symbols: Record<string, string> = {
    GHS: 'GH₵ ',
    USD: '$ ',
    NGN: '₦ ',
    KES: 'KSh ',
  };
  const sym = symbols[curr] || `${curr} `;
  return `${sym}${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format dates as "12 Jun 2024"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
