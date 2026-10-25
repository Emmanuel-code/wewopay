import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/db/supabase';
import { Payout } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPayoutHistoryPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    supabase
      .from('payouts')
      .select('*, developer:developers(name, email, bank_name, bank_account_number)')
      .order('initiated_at', { ascending: false })
      .then(({ data }) => setPayouts((data as Payout[]) || []));
  }, []);

  const exportCSV = () => {
    if (payouts.length === 0) return;
    const headers = 'Transfer Code,Developer,Bank,Amount,Currency,Status,Initiated At,Completed At\n';
    const rows = payouts
      .map(
        (p) =>
          `"${p.paystack_transfer_code}","${p.developer?.name || ''}","${p.developer?.bank_name || ''}","${p.amount}","${p.currency}","${p.status}","${p.initiated_at}","${p.completed_at || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts-history-${Date.now()}.csv`;
    a.click();
    toast.success('Payout CSV exported');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payout History & Transfers</h1>
            <p className="text-sm text-muted-foreground">
              Comprehensive log of all automated transfers sent to developers' bank accounts.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>

        <Card>
          <div className="w-full max-w-full overflow-x-auto bg-card">
            <table className="w-full text-left text-sm [&>div]:max-w-full">
              <thead className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Transfer Code</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Developer</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Bank Destination</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Initiated Date</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Settled Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                      {p.paystack_transfer_code}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold text-foreground">{p.developer?.name}</p>
                      <p className="text-muted-foreground text-[11px]">{p.developer?.email}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      {p.developer?.bank_name} ••••{p.developer?.bank_account_number?.slice(-4)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
