import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/db/supabase';
import { Payment } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, client:clients(name, email, project:projects(name, developer:developers(name, email)))')
      .order('created_at', { ascending: false });
    setPayments((data as Payment[]) || []);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const exportCSV = () => {
    if (payments.length === 0) return;
    const headers = 'Invoice,Client,Gross,Paystack Fee,Platform Fee,Developer Net,Status,Date\n';
    const rows = payments
      .map(
        (p) =>
          `"${p.invoice_number || ''}","${p.client?.name || ''}","${p.gross_amount}","${p.paystack_fee}","${p.platform_fee}","${p.developer_amount}","${p.status}","${p.created_at}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    toast.success('CSV downloaded');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Platform Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Every client checkout and Paystack fee deduction processed across the platform.
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
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Invoice #</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Client</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Gross</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Paystack Fee</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Platform Fee</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Developer Share</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                      {p.invoice_number || 'INV-PENDING'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold text-foreground">{p.client?.name || 'Customer'}</p>
                      <p className="text-muted-foreground text-[11px]">{p.client?.email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                      {formatCurrency(p.gross_amount, p.currency)}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      -{formatCurrency(p.paystack_fee, p.currency)}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 font-bold whitespace-nowrap">
                      +{formatCurrency(p.platform_fee, p.currency)}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold whitespace-nowrap">
                      {formatCurrency(p.developer_amount, p.currency)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px]">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(p.created_at)}
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
