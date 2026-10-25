import { describe, it, expect } from 'vitest';
import { calculatePaystackFee, calculatePaymentSplits, formatCurrency } from './paystack';

describe('Paystack fee calculation', () => {
  it('calculates Ghana (GHS) fee at 1.5%', () => {
    // 500 GHS * 1.5% = 7.50 GHS
    const fee = calculatePaystackFee(500, 'GHS');
    expect(fee).toBe(7.5);
  });

  it('calculates USD fee with 2.9% + 0.30 fixed fee', () => {
    // 100 USD * 2.9% + 0.30 = 3.20 USD
    const fee = calculatePaystackFee(100, 'USD');
    expect(fee).toBe(3.2);
  });

  it('calculates payment splits accurately', () => {
    // 500 GHS with 3.0% commission:
    // Paystack fee (1.5%) = 7.50
    // Platform fee (3.0%) = 15.00
    // Net to dev = 500 - 7.50 - 15.00 = 477.50
    const splits = calculatePaymentSplits(500, 3.0, 'GHS');
    expect(splits.grossAmount).toBe(500);
    expect(splits.paystackFee).toBe(7.5);
    expect(splits.platformFee).toBe(15);
    expect(splits.developerAmount).toBe(477.5);
  });

  it('formats currency with symbol and 2 decimal points', () => {
    expect(formatCurrency(500, 'GHS')).toBe('GH₵ 500.00');
    expect(formatCurrency(120.5, 'USD')).toBe('$ 120.50');
  });
});
