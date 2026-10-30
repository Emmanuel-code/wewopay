import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/db/supabase';
import { Client, Project, Payment } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Mail,
  Send,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Download,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { generateInvoicePdf } from '@/utils/invoiceGenerator';

export default function ClientDetailPage() {
  const { projectId, clientId } = useParams<{ projectId: string; clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const loadData = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const { data: cData, error: cErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (cErr) throw cErr;

      setClient(cData as Client);
      setNotes(cData.notes || '');

      if (cData.project_id) {
        const { data: pData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', cData.project_id)
          .single();
        setProject(pData as Project);
      }

      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      setPayments((payData as Payment[]) || []);
    } catch (err: any) {
      toast.error('Failed to load client details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!client) return;
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', client.id);

      if (error) throw error;
      setClient({ ...client, status: newStatus as any });
      toast.success(`Client status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async () => {
    if (!client) return;
    try {
      setSavingNotes(true);
      const { error } = await supabase
        .from('clients')
        .update({ notes })
        .eq('id', client.id);
      if (error) throw error;
      toast.success('Internal notes saved');
    } catch (err: any) {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleResendPaymentLink = async () => {
    if (!client) return;
    // Log reminder to DB
    await supabase.from('reminders').insert({
      client_id: client.id,
      type: 'MANUAL',
    });
    toast.success(`Payment link & invoice email dispatched to ${client.email}`);
  };

  const copyUrl = (type: 'pay' | 'portal') => {
    if (!client) return;
    const path = type === 'pay' ? `/pay/${client.payment_link_token}` : `/portal/${client.portal_token}`;
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    toast.success(`Copied ${type === 'pay' ? 'payment' : 'portal'} link to clipboard!`);
  };

  if (loading || !client) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">Loading client data...</div>
      </DashboardLayout>
    );
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    OVERDUE: 'bg-rose-500/20 text-rose-500 border-rose-500/30',
    CANCELLED: 'bg-muted text-muted-foreground',
    PAUSED: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/dashboard/projects/${projectId || client.project_id}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                <Badge
                  variant="outline"
                  className={`text-xs uppercase font-bold ${statusColors[client.status]}`}
                >
                  {client.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Project: {project?.name || 'Project'} • Enrolled on {formatDate(client.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" aria-label="Resend payment link email to client" onClick={handleResendPaymentLink}>
              <Mail className="w-3.5 h-3.5 mr-1" />
              Resend Payment Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Copy payment link to clipboard"
              onClick={() => copyUrl('pay')}
              className="text-primary border-primary/40 hover:bg-primary/10"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy Pay Link
            </Button>
            <Button variant="outline" size="sm" aria-label="Open client self-service portal link" onClick={() => copyUrl('portal')}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Client Portal
            </Button>
          </div>
        </div>

        {/* Client Status Action Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscription & Paystack Status</CardTitle>
                <CardDescription>
                  Live details stored on Paystack customer vault.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg">
                  <span className="text-muted-foreground block text-[11px]">Paystack Customer</span>
                  <span className="font-mono font-semibold text-foreground">
                    {client.paystack_customer_code || 'Pending Checkout'}
                  </span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg">
                  <span className="text-muted-foreground block text-[11px]">Subscription Code</span>
                  <span className="font-mono font-semibold text-foreground">
                    {client.subscription_code || 'None'}
                  </span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg">
                  <span className="text-muted-foreground block text-[11px]">Failed Retries</span>
                  <span className={`font-mono font-bold ${client.retry_count > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                    {client.retry_count} / 3 Attempts
                  </span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg">
                  <span className="text-muted-foreground block text-[11px]">Next Billing Date</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(client.next_billing_date)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment History & Receipts</CardTitle>
                <CardDescription>
                  Invoices issued and verified for this client.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full max-w-full overflow-x-auto bg-card">
                  <table className="w-full text-left text-sm [&>div]:max-w-full">
                    <thead className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-4 font-medium whitespace-nowrap">Invoice #</th>
                        <th className="py-2.5 px-4 font-medium whitespace-nowrap">Gross Amount</th>
                        <th className="py-2.5 px-4 font-medium whitespace-nowrap">Your Net</th>
                        <th className="py-2.5 px-4 font-medium whitespace-nowrap">Status</th>
                        <th className="py-2.5 px-4 font-medium whitespace-nowrap">Date</th>
                        <th className="py-2.5 px-4 font-medium whitespace-nowrap text-right">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            No payments processed yet for this client.
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                              {p.invoice_number || 'INV-PENDING'}
                            </td>
                            <td className="py-3 px-4 font-mono whitespace-nowrap">
                              {formatCurrency(p.gross_amount, p.currency)}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {formatCurrency(p.developer_amount, p.currency)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px]">
                                {p.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                              {formatDate(p.paid_at || p.created_at)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Download PDF invoice ${p.invoice_number || ''}`}
                                className="h-7 text-xs"
                                onClick={() => {
                                  generateInvoicePdf({
                                    invoiceNumber: p.invoice_number || `INV-${new Date(p.created_at).getFullYear()}-${p.id.slice(0, 4)}`,
                                    date: formatDate(p.paid_at || p.created_at),
                                    businessName: project?.name ? `${project.name} Studio` : 'Developer Studio',
                                    developerName: 'Developer',
                                    developerEmail: '',
                                    clientName: client?.name || 'Client',
                                    clientEmail: client?.email || '',
                                    projectName: project?.name || 'Project Retainer',
                                    projectDescription: project?.description,
                                    billingCycle: project?.billing_cycle || 'MONTHLY',
                                    amount: Number(p.gross_amount || 0),
                                    currency: p.currency || project?.currency || 'GHS',
                                    status: p.status === 'SUCCESS' ? 'PAID' : 'PENDING',
                                    paystackReference: p.paystack_ref,
                                  });
                                }}
                              >
                                <Download className="w-3 h-3 mr-1" /> PDF
                              </Button>
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

          {/* Sidebar Controls */}
          <div className="space-y-6">
            {/* Quick Status Modifiers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Subscription Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleStatusChange('ACTIVE')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                  Mark as Active
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleStatusChange('PAUSED')}
                >
                  <PauseCircle className="w-3.5 h-3.5 mr-2 text-amber-400" />
                  Pause Subscription
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleStatusChange('OVERDUE')}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-2 text-rose-500" />
                  Flag as Overdue
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs text-muted-foreground"
                  onClick={() => handleStatusChange('CANCELLED')}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Cancel Subscription
                </Button>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Developer Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Record private agreements or communication..."
                  className="text-xs"
                />
                <Button
                  size="sm"
                  className="w-full text-xs font-semibold"
                  disabled={savingNotes}
                  onClick={handleSaveNotes}
                >
                  {savingNotes ? 'Saving...' : 'Update Notes'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
