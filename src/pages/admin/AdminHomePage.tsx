import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/db/supabase';
import { Developer, Payment } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function AdminHomePage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);

      const [devRes, payRes] = await Promise.all([
        supabase.from('developers').select('*'),
        supabase.from('payments').select('*, client:clients(name, email)'),
      ]);

      setDevelopers((devRes.data as Developer[]) || []);
      setPayments((payRes.data as Payment[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const totalPlatformGross = payments.reduce((acc, p) => acc + Number(p.gross_amount || 0), 0);
  const totalPlatformCommission = payments.reduce((acc, p) => acc + Number(p.platform_fee || 0), 0);
  const totalPaystackFees = payments.reduce((acc, p) => acc + Number(p.paystack_fee || 0), 0);
  const totalDeveloperNet = payments.reduce((acc, p) => acc + Number(p.developer_amount || 0), 0);
  const totalPendingPayouts = developers.reduce((acc, d) => acc + Number(d.pending_balance || 0), 0);

  const baseGross = totalPlatformGross || 1;
  const devSharePct = totalPlatformGross > 0 ? ((totalDeveloperNet / baseGross) * 100).toFixed(1) : '95.5';
  const commissionPct = totalPlatformGross > 0 ? ((totalPlatformCommission / baseGross) * 100).toFixed(1) : '3.0';
  const paystackFeePct = totalPlatformGross > 0 ? ((totalPaystackFees / baseGross) * 100).toFixed(1) : '1.5';

  const freeDevs = developers.filter((d) => d.plan === 'FREE').length;
  const proDevs = developers.filter((d) => d.plan === 'PRO').length;
  const bizDevs = developers.filter((d) => d.plan === 'BUSINESS').length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Owner Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Monitor aggregate developer revenues, commissions, and Paystack Transfer disbursements.
            </p>
          </div>
          <Link to="/admin/payouts">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              Review Payout Queue
            </Button>
          </Link>
        </div>

        {/* 4 Admin Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Platform Net Revenue</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-amber-400">
                {formatCurrency(totalPlatformCommission, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Collected commissions</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Gross Processed</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {formatCurrency(totalPlatformGross, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">{payments.length} total client payments</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Total Pending Payouts</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(totalPendingPayouts, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Owed to developers</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Registered Developers</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {developers.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">
                {freeDevs} Free • {proDevs} Pro • {bizDevs} Biz
              </span>
            </CardContent>
          </Card>
        </div>

        {/* 30-Day Revenue Trend Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Revenue Breakdown</CardTitle>
            <CardDescription>
              Paystack fee deductions and developer payouts distributed through single account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-semibold">
                <span>Gross Inflow: {formatCurrency(totalPlatformGross, 'GHS')}</span>
                <span className="text-amber-400">Owner Net: {formatCurrency(totalPlatformCommission, 'GHS')}</span>
              </div>
              <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${devSharePct}%` }}
                  title={`Developer share (${devSharePct}%)`}
                />
                <div
                  className="bg-amber-400 h-full"
                  style={{ width: `${commissionPct}%` }}
                  title={`Platform commission (${commissionPct}%)`}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${paystackFeePct}%` }}
                  title={`Paystack fee (${paystackFeePct}%)`}
                />
              </div>
              <div className="flex items-center gap-6 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Developer Payout Share ({devSharePct}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span>wewopay Commission ({commissionPct}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span>Paystack Processing Fee ({paystackFeePct}%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions Across Platform */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Global Transactions</h2>
            <Link to="/admin/payments" className="text-xs text-primary hover:underline">
              View all payments
            </Link>
          </div>

          <Card>
            <div className="w-full max-w-full overflow-x-auto bg-card">
              <table className="w-full text-left text-sm [&>div]:max-w-full">
                <thead className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Paystack Ref</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Client</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Gross</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Platform Fee</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Developer Net</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {payments.slice(0, 10).map((pmt) => (
                    <tr key={pmt.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                        {pmt.paystack_ref}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium">
                        {pmt.client?.name || 'Customer'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        {formatCurrency(pmt.gross_amount, pmt.currency)}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-400 font-semibold whitespace-nowrap">
                        +{formatCurrency(pmt.platform_fee, pmt.currency)}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                        {formatCurrency(pmt.developer_amount, pmt.currency)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {pmt.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(pmt.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
