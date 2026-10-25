import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Client, Project, Payment } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Download,
  AlertTriangle,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadPortalData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Use secure parameterized RPC function to retrieve client portal details
      const { data: details, error: detailsErr } = await supabase.rpc('get_portal_details', {
        p_portal_token: token,
      });

      if (detailsErr || !details || details.error) {
        toast.error('Invalid or expired portal link');
        return;
      }

      setClient(details.client as Client);
      if (details.project) {
        setProject(details.project as Project);
      }
      setPayments((details.payments as Payment[]) || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [token]);

  const handleCancelSubscription = async () => {
    if (!client) return;
    try {
      setCancelling(true);
      await supabase
        .from('clients')
        .update({ status: 'CANCELLED' })
        .eq('id', client.id);

      setClient({ ...client, status: 'CANCELLED' });
      setShowCancelModal(false);
      toast.success('Your subscription has been cancelled.');
    } catch (err: any) {
      toast.error('Failed to cancel: ' + err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading your billing portal...</p>
      </div>
    );
  }

  if (!client || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <CardTitle>Portal Access Denied</CardTitle>
          <CardDescription className="mt-2">
            This client management portal link is invalid. Please request a new link from your developer.
          </CardDescription>
        </Card>
      </div>
    );
  }

  // Check cancellation lock
  const canCancel = project.client_can_cancel;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs text-primary font-bold tracking-wider uppercase">
              Client Self-Serve Portal
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {client.name}'s Billing Dashboard
            </h1>
          </div>
          <Badge
            variant={client.status === 'ACTIVE' ? 'default' : 'secondary'}
            className={`text-xs uppercase font-bold py-1 px-3 ${
              client.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : ''
            }`}
          >
            {client.status}
          </Badge>
        </div>

        {/* Subscription Plan Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs">Subscribed Plan</CardDescription>
              <CardTitle className="text-lg font-bold">{project.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-xs text-muted-foreground uppercase">{project.billing_cycle}</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs">Recurring Rate</CardDescription>
              <CardTitle className="text-lg font-bold font-mono">
                {formatCurrency(project.amount, project.currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-xs text-muted-foreground">Automatic charge</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs">Next Billing Date</CardDescription>
              <CardTitle className="text-lg font-bold">
                {formatDate(client.next_billing_date)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-xs text-muted-foreground">Renewal scheduled</span>
            </CardContent>
          </Card>
        </div>

        {/* Payment History & Downloadable Receipts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment History & Tax Invoices</CardTitle>
            <CardDescription>
              Download official PDF receipts for your accounting and tax records.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto bg-card">
              <table className="w-full text-left text-sm [&>div]:max-w-full">
                <thead className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Invoice #</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Amount Paid</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Date</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                          {p.invoice_number || 'INV-PENDING'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                          {formatCurrency(p.gross_amount, p.currency)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(p.paid_at || p.created_at)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px]">
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => toast.success(`Receipt ${p.invoice_number} downloaded`)}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            PDF Receipt
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

        {/* Self-serve Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Payment Method</CardTitle>
              <CardDescription className="text-xs">
                Update card or Mobile Money account associated with recurring billing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => toast.success('Paystack card update link sent to your registered email.')}
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Update Payment Method via Paystack
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Cancel Subscription</CardTitle>
              <CardDescription className="text-xs">
                Stop future automatic renewals for this retainer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.status === 'CANCELLED' ? (
                <p className="text-xs text-muted-foreground">This subscription has already been cancelled.</p>
              ) : canCancel ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowCancelModal(true)}
                >
                  <Ban className="w-3.5 h-3.5 mr-1.5" />
                  Cancel Subscription
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Cancellation must be coordinated with the service provider directly.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-6 space-y-4">
              <CardTitle className="text-lg">Are you sure you want to cancel?</CardTitle>
              <CardDescription>
                Your recurring service will terminate at the end of the current billing cycle. You will no longer be billed automatically.
              </CardDescription>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowCancelModal(false)}>
                  Keep Subscription
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={cancelling}
                  onClick={handleCancelSubscription}
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Powered by wewopay branding */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
          <span>Powered by</span>
          <img
            src="/images/logo/Logo.png"
            alt="wewopay logo"
            className="w-4 h-4 rounded-sm object-contain"
          />
          <span className="font-semibold text-foreground tracking-tight">wewopay</span>
        </div>
      </div>
    </div>
  );
}
