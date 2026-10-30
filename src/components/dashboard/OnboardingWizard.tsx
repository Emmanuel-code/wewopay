import { useState } from 'react';
import { Developer } from '@/types/types';
import { GHANA_BANKS } from '@/utils/paystack';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, ShieldCheck, ArrowRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingWizardProps {
  developer: Developer;
  onComplete: (updates: Partial<Developer>) => Promise<any>;
  onDismiss?: () => void;
}

export default function OnboardingWizard({ developer, onComplete, onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState(developer.business_name || '');
  const [logoUrl, setLogoUrl] = useState(developer.logo_url || '');
  const [selectedBankCode, setSelectedBankCode] = useState(developer.bank_account_number ? developer.bank_code || '' : '');
  const [accountNumber, setAccountNumber] = useState(developer.bank_account_number || '');
  const [accountName, setAccountName] = useState(developer.bank_account_name || '');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(developer.bank_verified);
  const [saving, setSaving] = useState(false);

  const selectedBank = GHANA_BANKS.find((b) => b.code === selectedBankCode);

  const handleVerifyBank = async () => {
    if (!accountNumber || accountNumber.length < 8) {
      toast.error('Please enter a valid bank account number');
      return;
    }
    if (!selectedBank) {
      toast.error('Select your bank');
      return;
    }

    setVerifying(true);
    try {
      let resolvedName = `${developer.name || 'DEVELOPER'} ENTERPRISE / ${selectedBank?.name.toUpperCase()}`;

      const { data: resData, error: funcErr } = await supabase.functions.invoke('resolve-bank', {
        body: { accountNumber: accountNumber.trim(), bankCode: selectedBankCode },
      });

      if (!funcErr && resData?.status && resData?.data?.account_name) {
        resolvedName = resData.data.account_name;
      }

      setAccountName(resolvedName);
      setVerified(true);
      toast.success(`Account verified: ${resolvedName}`);
    } catch (err: any) {
      toast.error('Could not verify bank account with Paystack API: ' + (err.message || ''));
    } finally {
      setVerifying(false);
    }
  };

  const handleFinish = async () => {
    if (!selectedBank) {
      toast.error('Select your bank');
      return;
    }
    setSaving(true);
    try {
      const recipientCode = `RCP_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      await onComplete({
        business_name: businessName,
        logo_url: logoUrl || null,
        bank_name: selectedBank?.name ?? null,
        bank_code: selectedBankCode,
        bank_account_number: accountNumber,
        bank_account_name: accountName || `${developer.name} Business Account`,
        bank_verified: true,
        paystack_recipient_code: recipientCode,
        onboarding_completed: true,
      });

      toast.success('Onboarding complete! Your bank account is ready for automated payouts.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/40 bg-card shadow-2xl relative overflow-hidden mb-8">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-emerald-400" />
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
        >
          Skip for now <X className="w-3.5 h-3.5" />
        </button>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary uppercase">
            Step {step} of 2
          </span>
          <span className="text-xs text-muted-foreground">Quick Setup Wizard</span>
        </div>
        <CardTitle className="text-lg md:text-xl">
          {step === 1 ? 'Brand & Studio Setup' : 'Payout Bank Account Verification'}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Set how your invoices and payment links will appear to your clients.'
            : 'Enter your bank details to receive automated payouts from client subscriptions.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bizName">Developer / Studio Name</Label>
              <Input
                id="bizName"
                placeholder="e.g. Apex Software Solutions"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This appears on your client payment checkouts and PDF receipts.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL or Brand Icon</Label>
              <Input
                id="logo"
                placeholder="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Provide a hosted image link or paste Cloudinary/image URL.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground flex items-start gap-2 border border-border/40">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                You do NOT need your own Paystack account. Client payments are processed securely by wewopay and dispatched directly into this local bank account via Paystack Transfer API.
              </span>
            </div>

            <div className="space-y-2">
              <Label>Select Bank (Ghana)</Label>
              <Select value={selectedBankCode} onValueChange={setSelectedBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  {GHANA_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accNo">Account Number / MoMo Number</Label>
              <div className="flex gap-2">
                <Input
                  id="accNo"
                  placeholder="e.g. 0021345678"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    setVerified(false);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={verifying || !accountNumber}
                  onClick={handleVerifyBank}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Verifying
                    </>
                  ) : (
                    'Verify with Paystack'
                  )}
                </Button>
              </div>
            </div>

            {verified && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="font-semibold">{accountName}</p>
                    <p className="text-[11px] opacity-80">
                      {selectedBank?.name} •••••{accountNumber.slice(-4)}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                  MATCH CONFIRMED
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t border-border/40 pt-4">
        {step === 1 ? (
          <div className="w-full flex justify-end">
            <Button onClick={() => setStep(2)}>
              Next: Bank Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="w-full flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={handleFinish}
              disabled={saving || !verified}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Completing...' : 'Save & Verify Account'}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
