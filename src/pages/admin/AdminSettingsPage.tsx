import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/db/supabase';
import { AdminSetting } from '@/types/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    FREE_COMMISSION_RATE: '3.0',
    PRO_COMMISSION_RATE: '1.5',
    BUSINESS_COMMISSION_RATE: '0.8',
    PRO_PLAN_PRICE: '99',
    BUSINESS_PLAN_PRICE: '299',
    PLATFORM_NAME: 'wewopay',
    SUPPORT_EMAIL: 'support@wewopay.com',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('admin_settings').select('*');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: AdminSetting) => {
        map[s.key] = s.value;
      });
      setSettings((prev) => ({ ...prev, ...map }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      for (const [key, val] of Object.entries(settings)) {
        await supabase
          .from('admin_settings')
          .upsert({ key, value: String(val) }, { onConflict: 'key' });
      }
      toast.success('Global platform commission settings updated!');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Configure global default commissions, monthly plan subscription rates, and Paystack integration constants.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Commission Tiers (%)</CardTitle>
              <CardDescription>
                Percentage automatically deducted by the owner on each client payment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Free Plan Commission (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.FREE_COMMISSION_RATE}
                    onChange={(e) =>
                      setSettings({ ...settings, FREE_COMMISSION_RATE: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pro Plan Commission (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.PRO_COMMISSION_RATE}
                    onChange={(e) =>
                      setSettings({ ...settings, PRO_COMMISSION_RATE: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Plan Commission (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.BUSINESS_COMMISSION_RATE}
                    onChange={(e) =>
                      setSettings({ ...settings, BUSINESS_COMMISSION_RATE: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Developer Plan Pricing (Monthly GHS)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pro Plan Monthly Price (GHS)</Label>
                  <Input
                    type="number"
                    value={settings.PRO_PLAN_PRICE}
                    onChange={(e) =>
                      setSettings({ ...settings, PRO_PLAN_PRICE: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Plan Monthly Price (GHS)</Label>
                  <Input
                    type="number"
                    value={settings.BUSINESS_PLAN_PRICE}
                    onChange={(e) =>
                      setSettings({ ...settings, BUSINESS_PLAN_PRICE: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border/40 pt-4">
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AdminLayout>
  );
}
