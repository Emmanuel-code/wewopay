import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, UserPlus, Send, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NewClientPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    if (!name || !email) {
      toast.error('Client name and email are required');
      return;
    }

    try {
      setSaving(true);
      const paymentToken = `pay_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      const portalToken = `portal_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

      const { data, error } = await supabase
        .from('clients')
        .insert({
          project_id: projectId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          status: 'PENDING',
          payment_link_token: paymentToken,
          portal_token: portalToken,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Client ${name} added! Payment link generated and email queued.`);
      navigate(`/dashboard/projects/${projectId}/clients/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/projects/${projectId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add New Client</h1>
            <p className="text-sm text-muted-foreground">
              We will generate a unique checkout link and self-serve management portal for this client.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/60 bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Client Contact & Billing Info</CardTitle>
              <CardDescription>
                The client will be sent an invitation email containing their direct Paystack checkout link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Full Name / Company Contact</Label>
                <Input
                  id="clientName"
                  placeholder="e.g. Ama Darko"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email Address</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="e.g. ama.darko@goldcoasttech.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  All automated payment receipts and renewal reminders will be dispatched to this address.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Phone Number / WhatsApp (Optional)</Label>
                <Input
                  id="clientPhone"
                  placeholder="e.g. +233 50 123 4888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Developer Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Agreed to start on the 1st of next month with 7-day trial period."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/40 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>Automated Resend Email Notification:</span>
                </div>
                <p>
                  Upon creation, an invitation email with secure Paystack token link will be dispatched automatically via the Resend API.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(`/dashboard/projects/${projectId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="font-semibold">
                <UserPlus className="w-4 h-4 mr-2" />
                {saving ? 'Creating Client...' : 'Generate Link & Add Client'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
