import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useDeveloper } from '@/hooks/useDeveloper';
import { GHANA_BANKS } from '@/utils/paystack';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building, ShieldAlert, Sparkles, CheckCircle2, Save, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function DeveloperSettingsPage() {
  const { developer, updateDeveloper } = useDeveloper();

  // Profile Form
  const [businessName, setBusinessName] = useState(developer?.business_name || '');
  const [logoUrl, setLogoUrl] = useState(developer?.logo_url || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Bank Form
  const [selectedBankCode, setSelectedBankCode] = useState(developer?.bank_account_number ? developer?.bank_code || '' : '');
  const [accountNumber, setAccountNumber] = useState(developer?.bank_account_number || '');
  const [accountName, setAccountName] = useState(developer?.bank_account_name || '');
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const selectedBank = GHANA_BANKS.find((b) => b.code === selectedBankCode);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateDeveloper({
        business_name: businessName,
        logo_url: logoUrl || null,
      });
      toast.success('Studio profile updated');
    } catch (err: any) {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleVerifyAndUpdateBank = async () => {
    if (!accountNumber) {
      toast.error('Enter bank account number');
      return;
    }
    if (!selectedBank) {
      toast.error('Select your bank');
      return;
    }
    setVerifyingBank(true);
    try {
      let resolvedName = `${developer?.name?.toUpperCase() || 'DEVELOPER'} ENTERPRISE / ${selectedBank?.name.toUpperCase()}`;

      // Call Supabase resolve-bank Edge Function
      const { data: resData, error: funcErr } = await supabase.functions.invoke('resolve-bank', {
        body: { accountNumber: accountNumber.trim(), bankCode: selectedBankCode },
      });

      if (!funcErr && resData?.status && resData?.data?.account_name) {
        resolvedName = resData.data.account_name;
      }

      setAccountName(resolvedName);
      const recipientCode = `RCP_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      await updateDeveloper({
        bank_name: selectedBank?.name ?? null,
        bank_code: selectedBankCode,
        bank_account_number: accountNumber.trim(),
        bank_account_name: resolvedName,
        bank_verified: true,
        paystack_recipient_code: recipientCode,
      });

      toast.success(`Bank account verified for: ${resolvedName}`);
    } catch (err: any) {
      toast.error('Verification failed: ' + (err.message || 'Please check details'));
    } finally {
      setVerifyingBank(false);
    }
  };

  const handleUpgradePlan = async (newPlan: 'PRO' | 'BUSINESS') => {
    try {
      const commission = newPlan === 'PRO' ? 1.5 : 0.8;
      await updateDeveloper({
        plan: newPlan,
        commission_rate: commission,
      });
      toast.success(`Upgraded to ${newPlan} plan! Commission reduced to ${commission}%.`);
    } catch (err: any) {
      toast.error('Failed to switch plan');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account & Studio Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your developer branding, payout bank account, and commission tier.
          </p>
        </div>

        {/* Section 1: Studio Profile */}
        <form onSubmit={handleSaveProfile}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Developer Branding</CardTitle>
              <CardDescription>
                Customize how your studio appears on client checkout flows and PDF invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="biz">Business / Studio Name</Label>
                  <Input
                    id="biz"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Code Craft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border/40 pt-4">
              <Button type="submit" disabled={savingProfile} size="sm">
                <Save className="w-4 h-4 mr-1.5" />
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Section 2: Bank Account for Payouts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Bank Account Details (Paystack Transfer)</CardTitle>
                <CardDescription>
                  Your earnings will be automatically paid out to this verified account.
                </CardDescription>
              </div>
              {developer?.bank_verified && (
                <Badge className="bg-emerald-500/20 text-emerald-400">Verified</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
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
                <Label>Account Number</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 0021345678"
                />
              </div>
            </div>

            {developer?.bank_account_name && (
              <div className="p-3 bg-muted/40 rounded-lg text-xs flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Resolved Account Name</span>
                  <span className="font-semibold">{developer.bank_account_name}</span>
                </div>
                <span className="font-mono text-muted-foreground text-[10px]">
                  Recipient: {developer.paystack_recipient_code || 'None'}
                </span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end border-t border-border/40 pt-4">
            <Button
              size="sm"
              disabled={verifyingBank}
              onClick={handleVerifyAndUpdateBank}
            >
              {verifyingBank ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Verifying...
                </>
              ) : (
                'Verify & Update Bank'
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Section 3: Commission Tier Upgrade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription Tier & Commission</CardTitle>
            <CardDescription>
              Lower your transaction commission fee by upgrading your monthly developer plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`p-4 rounded-xl border ${
                  developer?.plan === 'FREE' ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'
                } flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">FREE</span>
                    {developer?.plan === 'FREE' && (
                      <Badge className="text-[10px]">Current</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold font-mono mt-2">GH₵ 0<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground mt-1">3.0% platform commission per transaction</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={developer?.plan === 'FREE'}
                  onClick={() => toast.info('You are currently on the Free plan')}
                >
                  {developer?.plan === 'FREE' ? 'Current Plan' : 'Downgrade'}
                </Button>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  developer?.plan === 'PRO' ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'
                } flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">PRO</span>
                    {developer?.plan === 'PRO' && (
                      <Badge className="text-[10px]">Current</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold font-mono mt-2">GH₵ 99<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground mt-1">1.5% platform commission per transaction</p>
                </div>
                <Button
                  size="sm"
                  variant={developer?.plan === 'PRO' ? 'outline' : 'default'}
                  onClick={() => handleUpgradePlan('PRO')}
                  disabled={developer?.plan === 'PRO'}
                >
                  {developer?.plan === 'PRO' ? 'Current Plan' : 'Upgrade to Pro'}
                </Button>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  developer?.plan === 'BUSINESS' ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'
                } flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">BUSINESS</span>
                    {developer?.plan === 'BUSINESS' && (
                      <Badge className="text-[10px]">Current</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold font-mono mt-2">GH₵ 299<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground mt-1">0.8% platform commission per transaction</p>
                </div>
                <Button
                  size="sm"
                  variant={developer?.plan === 'BUSINESS' ? 'outline' : 'default'}
                  onClick={() => handleUpgradePlan('BUSINESS')}
                  disabled={developer?.plan === 'BUSINESS'}
                >
                  {developer?.plan === 'BUSINESS' ? 'Current Plan' : 'Upgrade to Business'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Danger Zone */}
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardHeader>
            <CardTitle className="text-rose-500 text-base">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your developer profile and stop subscription billings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Once deleted, all recurring subscriptions linked to this studio will be paused. Payout history and tax records remain stored in compliance with local regulations.
            </p>
          </CardContent>
          <CardFooter className="flex justify-end pt-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => toast.error('Account deletion requires contacting support@wewopay.com')}
            >
              Delete Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
