import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useDeveloper } from '@/hooks/useDeveloper';
import { supabase } from '@/db/supabase';
import { Payout } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  Download,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { executeCashOut } from '@/utils/payoutService';

export default function EarningsPage() {
  const { developer, refreshDeveloper } = useDeveloper();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = async (devId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('developer_id', devId)
        .order('initiated_at', { ascending: false });

      if (error) throw error;
      setPayouts((data as Payout[]) || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (developer?.id) {
      fetchPayouts(developer.id);
    }
  }, [developer?.id]);

  const totalPaidOut = payouts.reduce((acc, p) => {
    if (p.status === 'SUCCESS') return acc + Number(p.amount || 0);
    return acc;
  }, 0);

  const exportPayouts = () => {
    if (payouts.length === 0) {
      toast.error('No payouts to export');
      return;
    }
    const headers = 'Transfer Code,Amount,Currency,Status,Initiated At,Completed At\n';
    const rows = payouts
      .map(
        (p) =>
          `"${p.paystack_transfer_code || ''}","${p.amount}","${p.currency}","${p.status}","${p.initiated_at}","${p.completed_at || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-history-${Date.now()}.csv`;
    a.click();
    toast.success('Payout records CSV downloaded');
  };

  // Payout example figures, computed from the viewer's own tier so the
  // explainer never shows another tier's commission rate.
  const tierRate = developer?.commission_rate ?? 3.0;
  const exampleInvoice = 500;
  const examplePaystackFee = exampleInvoice * 0.015;
  const examplePlatformFee = (exampleInvoice * tierRate) / 100;
  const exampleNet = exampleInvoice - examplePaystackFee - examplePlatformFee;

  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!developer) return;

    try {
      setWithdrawing(true);
      const result = await executeCashOut(developer);

      if (result.status === 'PENDING') {
        toast.info(result.message);
      } else {
        toast.success(result.message);
      }

      await refreshDeveloper();
      await fetchPayouts(developer.id);
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      toast.error('Cash out failed: ' + (err.message || 'Please check your bank details.'));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Earnings & Bank Payouts</h1>
            <p className="text-sm text-muted-foreground">
              Direct disbursements to your verified local bank account via Paystack Transfer API.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              size="sm"
              disabled={withdrawing || Number(developer?.pending_balance || 0) <= 0}
              onClick={handleWithdraw}
            >
              <ArrowDownRight className="w-4 h-4 mr-1.5" />
              {withdrawing ? 'Processing Cash Out...' : `Cash Out (${formatCurrency(developer?.pending_balance || 0, 'GHS')})`}
            </Button>
            <Button variant="outline" size="sm" onClick={exportPayouts}>
              <Download className="w-4 h-4 mr-1.5" />
              Download History
            </Button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-emerald-500/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Available to Cash Out</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(developer?.pending_balance || 0, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Tap Cash Out to transfer to bank</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Total Earned</span>
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {formatCurrency(developer?.total_earned || 0, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Lifetime platform net</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Total Paid Out</span>
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {formatCurrency(totalPaidOut, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Received into bank account</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Commission Rate</span>
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {developer?.commission_rate || 3.0}%
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-primary font-medium">{developer?.plan || 'FREE'} Tier</span>
            </CardContent>
          </Card>
        </div>

        {/* How payouts work info banner */}
        <div className="p-4 rounded-xl bg-card border border-border/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Building className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">
                How Paystack Single-Account Payouts Work:
              </p>
              <p className="text-muted-foreground">
                When a client pays your GHS 500 invoice, Paystack charges 1.5% (~GHS {examplePaystackFee.toFixed(2)}). The platform deducts your {developer?.plan || 'FREE'} tier commission ({tierRate}% = GHS {examplePlatformFee.toFixed(2)}). The remaining GHS {exampleNet.toFixed(2)} is credited immediately to your Pending Balance and batched directly into your bank: <strong>{developer?.bank_account_number ? `${developer.bank_name} (••••${developer.bank_account_number.slice(-4)})` : 'Not set'}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Payout History Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Bank Payout Transfers</CardTitle>
            <CardDescription>
              Automated Paystack transfer transactions initiated to your bank account.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto bg-card">
              <table className="w-full text-left text-sm [&>div]:max-w-full">
                <thead className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Transfer Code</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Amount</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Bank Destination</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Initiated Date</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Completed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        No payouts completed yet. Payouts are executed by platform admin when your balance is above threshold.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                          {p.paystack_transfer_code || 'TRF-PENDING'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                          {formatCurrency(p.amount, p.currency)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                          {developer?.bank_name} ••••{developer?.bank_account_number?.slice(-4)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant={p.status === 'SUCCESS' ? 'default' : 'outline'}
                            className={`text-[10px] ${
                              p.status === 'SUCCESS'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : p.status === 'FAILED'
                                ? 'bg-rose-500/20 text-rose-500'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(p.initiated_at)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(p.completed_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
