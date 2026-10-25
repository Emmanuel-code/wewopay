import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useDeveloper } from '@/hooks/useDeveloper';
import { supabase } from '@/db/supabase';
import { BillingCycle } from '@/types/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { developer } = useDeveloper();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [amount, setAmount] = useState('500');
  const [trialDays, setTrialDays] = useState('0');
  const [clientCanCancel, setClientCanCancel] = useState(true);
  const [cancelLockMonths, setCancelLockMonths] = useState('3');
  const [cancelPolicy, setCancelPolicy] = useState('Cancel with 14-day notice after the initial 3 months lock-in period.');
  const [brandColor, setBrandColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!developer?.id) {
      toast.error('Developer profile not loaded');
      return;
    }

    if (!name || !amount) {
      toast.error('Please fill in project name and price');
      return;
    }

    try {
      setSaving(true);

      // Auto-generate Paystack Plan Code for recurring cycles
      const paystackPlanCode = billingCycle !== 'ONE_TIME'
        ? `PLN_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        : null;

      const { data, error } = await supabase
        .from('projects')
        .insert({
          developer_id: developer.id,
          name: name.trim(),
          description: description.trim() || null,
          currency,
          billing_cycle: billingCycle,
          amount: parseFloat(amount),
          trial_days: parseInt(trialDays, 10) || 0,
          client_can_cancel: clientCanCancel,
          cancel_lock_months: clientCanCancel ? (parseInt(cancelLockMonths, 10) || 0) : 0,
          cancel_policy: cancelPolicy.trim() || null,
          brand_color: brandColor,
          paystack_plan_code: paystackPlanCode,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Project created and Paystack recurring plan registered!');
      navigate(`/dashboard/projects/${data.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/projects')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Billing Project</h1>
            <p className="text-sm text-muted-foreground">
              Configure pricing, billing frequency, and self-serve cancellation terms for your clients.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/60 bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
              <CardDescription>
                Basic information that your client sees when opening payment links and invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Project / Service Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Full-Stack Web App Maintenance & SLA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Scope & Description</Label>
                <Textarea
                  id="desc"
                  placeholder="e.g. 24/7 uptime monitoring, monthly security patch updates, bug fixes, and 4 hours of ad-hoc feature adjustments."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GHS">GHS (Ghanaian Cedi)</SelectItem>
                      <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Billing Frequency</Label>
                  <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly (3 Mos)</SelectItem>
                      <SelectItem value="ANNUALLY">Annually (12 Mos)</SelectItem>
                      <SelectItem value="ONE_TIME">One-time Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({currency})</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="trial">Trial Period (Days)</Label>
                  <Input
                    id="trial"
                    type="number"
                    min="0"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    0 means immediate billing upon checkout.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Accent Brand Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-14 p-1 h-10 cursor-pointer"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Cancellation Policies */}
              <div className="pt-4 border-t border-border/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Allow Client Self-Service Cancellation</Label>
                    <p className="text-xs text-muted-foreground">
                      Clients can cancel recurring billing inside their self-serve portal (/portal/[token]).
                    </p>
                  </div>
                  <Switch checked={clientCanCancel} onCheckedChange={setClientCanCancel} />
                </div>

                {clientCanCancel && (
                  <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/40">
                    <div className="space-y-2">
                      <Label htmlFor="lockMonths">Lock-in Period (Months)</Label>
                      <Input
                        id="lockMonths"
                        type="number"
                        min="0"
                        value={cancelLockMonths}
                        onChange={(e) => setCancelLockMonths(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        During this lock period, the cancellation button will be disabled in client portal.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policy">Cancellation Policy Text</Label>
                      <Textarea
                        id="policy"
                        value={cancelPolicy}
                        onChange={(e) => setCancelPolicy(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/40 pt-4">
              <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/projects')}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="font-semibold">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Creating Project...' : 'Save & Publish Project'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
