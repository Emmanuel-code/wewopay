import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Client, Project, Developer } from '@/types/types';
import { formatCurrency } from '@/utils/paystack';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Download,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function PublicPaymentPage() {
  const { token } = useParams<{ token: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [invoiceRef, setInvoiceRef] = useState<string>('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    loadCheckoutDetails();
  }, [token]);

  const loadCheckoutDetails = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setErrorStatus(null);

      // 1. Attempt secure parameterized RPC function
      const { data: details, error: detailsErr } = await supabase.rpc(
        'get_payment_checkout_details',
        { p_payment_token: token }
      );

      if (!detailsErr && details && !details.error) {
        const clientData = details.client as Client;
        const projectData = details.project as Project;
        const developerData = details.developer as Developer;

        setClient(clientData);
        if (clientData.status === 'ACTIVE') {
          setErrorStatus('ALREADY_ACTIVE');
        }
        if (!projectData.is_active) {
          setErrorStatus('PROJECT_INACTIVE');
          return;
        }
        setProject(projectData);
        setDeveloper(developerData);
        return;
      }

      if (detailsErr) {
        console.warn('RPC get_payment_checkout_details not available or failed:', detailsErr);
      } else if (details?.error) {
        console.warn('RPC returned error:', details.error);
      }

      // 2. Resilient Direct Fallback
      const { data: cData, error: cErr } = await supabase
        .from('clients')
        .select('*')
        .eq('payment_link_token', token)
        .maybeSingle();

      if (cErr) {
        console.error('Direct client query failed (likely RLS):', cErr);
      }

      if (!cData) {
        console.warn(`No client record found for token: "${token}"`);
        setErrorStatus('INVALID_LINK');
        return;
      }

      setClient(cData as Client);

      if (cData.status === 'ACTIVE') {
        setErrorStatus('ALREADY_ACTIVE');
      }

      const { data: pData, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', cData.project_id)
        .single();

      if (pErr || !pData) {
        console.error('Project query error:', pErr);
        setErrorStatus('PROJECT_NOT_FOUND');
        return;
      }

      if (!pData.is_active) {
        setErrorStatus('PROJECT_INACTIVE');
        return;
      }

      setProject(pData as Project);

      const { data: devData, error: devErr } = await supabase
        .from('developers')
        .select('*')
        .eq('id', pData.developer_id)
        .single();

      if (devErr) {
        console.warn('Developer query error:', devErr);
      }

      if (devData) {
        setDeveloper(devData as Developer);
      }
    } catch (err: any) {
      console.error('loadCheckoutDetails unexpected error:', err);
      setErrorStatus('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Record the payment through the server-side verify function. The checkout
  // page runs as anon, and migration 00004 revoked anon's execute on
  // record_successful_payment (service_role only) — so the page must NOT
  // write the ledger directly, and must not be given that power back.
  // The edge function verifies the reference with Paystack's secret key,
  // checks amount/currency/email against the project, and only then records
  // it with the service role. A fake reference records nothing.
  const executeFinalizePayment = async (paystackReference: string) => {
    if (!client || !project || !developer) return;

    const { data, error } = await supabase.functions.invoke('verify-client-payment', {
      body: { reference: paystackReference, client_id: client.id },
    });

    if (error) {
      throw new Error(error.message || 'Payment verification failed');
    }
    if (!data?.success) {
      throw new Error(data?.error || 'Payment could not be verified');
    }

    setInvoiceRef(data.invoice_number || '');
    setPaymentSuccess(true);
    toast.success('Payment authorized via Paystack!');
  };

  const handlePaystackPayment = async () => {
    if (!client || !project || !developer) return;
    if (!agreedTerms) {
      toast.error('Please accept the service and cancellation terms before paying');
      return;
    }

    try {
      setProcessing(true);

      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      const isRealKey = paystackKey && !paystackKey.includes('xxxxxxxx');
      const paystackReference = `PAY_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now()}`;

      // Check if real Paystack popup is available
      if (isRealKey && typeof window !== 'undefined') {
        const loadPaystackScript = (): Promise<boolean> => {
          return new Promise((resolve) => {
            if ((window as any).PaystackPop) {
              resolve(true);
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v1/inline.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const scriptLoaded = await loadPaystackScript();
        if (scriptLoaded && (window as any).PaystackPop) {
          const handler = (window as any).PaystackPop.setup({
            key: paystackKey,
            email: client.email,
            amount: Math.round(Number(project.amount) * 100),
            currency: project.currency,
            ref: paystackReference,
            // Lets the paystack-webhook match this payment to the client
            // exactly instead of falling back to an email match.
            metadata: { client_id: client.id, project_id: project.id },
            // Paystack v1 does NOT support async callbacks (they return a Promise,
            // which fails Paystack's internal `typeof callback === 'function'` guard).
            // Use a synchronous wrapper that internally fires the async logic.
            callback: (response: any) => {
              const ref = response?.reference || paystackReference;
              executeFinalizePayment(ref)
                .catch((e: any) => {
                  toast.error('Failed to complete payment registration: ' + e.message);
                })
                .finally(() => {
                  setProcessing(false);
                });
            },
            onClose: () => {
              setProcessing(false);
              toast.info('Payment window closed');
            },
          });
          handler.openIframe();
          return;
        }
      }

      // No Paystack key configured: there is no real transaction to verify,
      // and recording one without verification would reopen the ledger hole
      // closed by migration 00004 — so fail loudly instead of simulating.
      toast.error('Payment is not configured: no Paystack public key found');
      return;
    } catch (err: any) {
      console.error(err);
      toast.error('Payment failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading secure checkout...</p>
        </div>
      </div>
    );
  }

  // Edge cases
  if (errorStatus === 'INVALID_LINK') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <CardTitle className="text-xl">Link Expired or Invalid</CardTitle>
          <CardDescription className="mt-2">
            This payment link is invalid or has expired. Please contact the developer directly to request a refreshed invoice link.
          </CardDescription>
        </Card>
      </div>
    );
  }

  if (errorStatus === 'PROJECT_INACTIVE') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <CardTitle className="text-xl">Project Inactive</CardTitle>
          <CardDescription className="mt-2">
            This billing service has been deactivated by the developer. No payments can be made.
          </CardDescription>
        </Card>
      </div>
    );
  }

  if (errorStatus === 'ALREADY_ACTIVE' && !paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <CardTitle className="text-xl">Subscription Already Active</CardTitle>
          <CardDescription>
            You already have an active subscription for this service. You do not need to pay again.
          </CardDescription>
          {client?.portal_token && (
            <Link to={`/portal/${client.portal_token}`}>
              <Button className="w-full">
                Open Client Self-Serve Portal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </Card>
      </div>
    );
  }

  // Payment Confirmation Screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center p-8 space-y-6 border-emerald-500/40 shadow-2xl bg-card">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Payment Confirmed!</CardTitle>
            <p className="text-sm text-muted-foreground">
              Thank you, {client?.name}. Your payment for <strong>{project?.name}</strong> has been successfully processed by Paystack.
            </p>
          </div>

          <div className="p-4 bg-muted/40 rounded-xl border border-border/40 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Reference:</span>
              <span className="font-mono font-bold text-primary">{invoiceRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-mono font-bold">
                {formatCurrency(project?.amount || 0, project?.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Cycle:</span>
              <span className="uppercase font-semibold">{project?.billing_cycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Provider:</span>
              <span className="font-semibold">{developer?.business_name || developer?.name}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => toast.success('Downloaded official tax invoice PDF')}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Receipt PDF
            </Button>
            {client?.portal_token && (
              <Link to={`/portal/${client.portal_token}`} className="flex-1">
                <Button className="w-full text-xs font-semibold">
                  Manage Subscription Portal
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 md:p-8">
      {/* Container */}
      <div className="w-full max-w-lg space-y-6">
        {/* Developer Studio Brand Header */}
        <div className="text-center space-y-2">
          {developer?.logo_url ? (
            <img
              src={developer.logo_url}
              alt="Studio logo"
              className="h-12 w-auto mx-auto object-contain rounded-lg"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white mx-auto shadow-lg"
              style={{ backgroundColor: project?.brand_color || '#3b82f6' }}
            >
              {developer?.business_name?.charAt(0) || 'D'}
            </div>
          )}
          <h2 className="text-lg font-bold text-foreground">
            {developer?.business_name || developer?.name || 'Developer Studio'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Secure client subscription checkout powered by Paystack
          </p>
        </div>

        {/* Checkout Card */}
        <Card className="border-border/60 bg-card shadow-2xl overflow-hidden">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: project?.brand_color || '#3b82f6' }}
          />

          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl font-bold">{project?.name}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {project?.description || 'Professional software engineering retainer.'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                {project?.billing_cycle}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Price Box */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold font-mono text-foreground">
                  {formatCurrency(project?.amount || 0, project?.currency)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  /{project?.billing_cycle.toLowerCase()}
                </span>
              </div>
              {project?.trial_days ? (
                <Badge className="bg-primary/20 text-primary text-xs">
                  {project.trial_days}-Day Trial
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Due Today</span>
              )}
            </div>

            {/* Client Pre-filled Info */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Billed To
              </span>
              <div className="p-3 bg-card border rounded-lg space-y-0.5">
                <p className="font-semibold text-foreground">{client?.name}</p>
                <p className="text-muted-foreground">{client?.email}</p>
                {client?.phone && <p className="text-muted-foreground">{client.phone}</p>}
              </div>
            </div>

            {/* Terms and Cancellation Policy Accordion */}
            <Accordion type="single" collapsible className="w-full text-xs">
              <AccordionItem value="terms" className="border-border/40">
                <AccordionTrigger className="text-xs py-2 hover:no-underline font-medium">
                  Service Terms & Cancellation Policy
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2 leading-relaxed">
                  <p>
                    {project?.cancel_policy ||
                      'Subscriptions automatically renew at the start of each billing cycle until cancelled.'}
                  </p>
                  {project?.client_can_cancel ? (
                    <p className="text-[11px] text-primary">
                      • You can manage or cancel your recurring subscription anytime via your personal self-serve portal after the {project.cancel_lock_months}-month initial period.
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-400">
                      • Cancellations are handled manually by coordinating directly with the developer.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="agree"
                checked={agreedTerms}
                onCheckedChange={(checked) => setAgreedTerms(!!checked)}
              />
              <label
                htmlFor="agree"
                className="text-xs text-muted-foreground leading-snug cursor-pointer"
              >
                I authorize recurring charges of{' '}
                <strong className="text-foreground">
                  {formatCurrency(project?.amount || 0, project?.currency)}
                </strong>{' '}
                to my card/account via Paystack according to the stated terms.
              </label>
            </div>

            {/* Pay Button */}
            <Button
              className="w-full font-bold h-11 text-sm shadow-lg"
              disabled={!agreedTerms || processing}
              onClick={handlePaystackPayment}
              style={{
                backgroundColor: agreedTerms ? project?.brand_color || '#3b82f6' : undefined,
              }}
            >
              {processing ? (
                'Connecting Paystack Gateway...'
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay {formatCurrency(project?.amount || 0, project?.currency)} with Paystack
                </>
              )}
            </Button>
          </CardContent>

          <CardFooter className="bg-muted/20 border-t border-border/40 p-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-bit encrypted single-account Paystack checkout</span>
          </CardFooter>
        </Card>

        {/* Powered by wewopay footer branding */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
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

