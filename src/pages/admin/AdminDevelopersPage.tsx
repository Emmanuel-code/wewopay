import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/db/supabase';
import { Developer } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [search, setSearch] = useState('');
  const [editingDev, setEditingDev] = useState<Developer | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('0');

  const fetchDevelopers = async () => {
    const { data } = await supabase.from('developers').select('*').order('created_at', { ascending: false });
    setDevelopers((data as Developer[]) || []);
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const handleUpdatePlan = async (devId: string, plan: 'FREE' | 'PRO' | 'BUSINESS') => {
    const rate = plan === 'FREE' ? 3.0 : plan === 'PRO' ? 1.5 : 0.8;
    await supabase.from('developers').update({ plan, commission_rate: rate }).eq('id', devId);
    toast.success(`Updated plan to ${plan}`);
    await fetchDevelopers();
  };

  const handleAdjustBalance = async () => {
    if (!editingDev) return;
    const addAmt = parseFloat(adjustAmount);
    if (isNaN(addAmt)) return;

    const newBal = Number(editingDev.pending_balance || 0) + addAmt;
    await supabase.from('developers').update({ pending_balance: newBal }).eq('id', editingDev.id);
    toast.success(`Adjusted balance by ${addAmt}`);
    setEditingDev(null);
    setAdjustAmount('0');
    await fetchDevelopers();
  };

  const filtered = developers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Developers Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage plans, commission rates, and manual balance adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search developer by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
        </div>

        <Card>
          <div className="w-full max-w-full overflow-x-auto bg-card">
            <table className="w-full text-left text-sm [&>div]:max-w-full">
              <thead className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Developer</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Plan & Rate</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Pending Balance</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Lifetime Earned</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Bank Verification</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {filtered.map((dev) => (
                  <tr key={dev.id}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold text-foreground">{dev.name}</p>
                      <p className="text-muted-foreground text-[11px]">{dev.email}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant="outline" className="mr-2 uppercase text-[10px]">
                        {dev.plan}
                      </Badge>
                      <span className="font-semibold">{dev.commission_rate}%</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {formatCurrency(dev.pending_balance, 'GHS')}
                    </td>
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      {formatCurrency(dev.total_earned, 'GHS')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {dev.bank_verified ? (
                        <span className="text-emerald-400 font-medium">Verified ({dev.bank_name})</span>
                      ) : (
                        <span className="text-amber-400">Unverified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setEditingDev(dev)}
                        >
                          Adjust Balance
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => handleUpdatePlan(dev.id, dev.plan === 'PRO' ? 'BUSINESS' : 'PRO')}
                        >
                          Switch Plan
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal for balance adjustment */}
        {editingDev && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-6 space-y-4">
              <CardTitle className="text-lg">Adjust Balance for {editingDev.name}</CardTitle>
              <CardDescription>
                Current Pending Balance: {formatCurrency(editingDev.pending_balance, 'GHS')}
              </CardDescription>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Adjustment Amount (+ or -)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingDev(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdjustBalance}>
                  Save Adjustment
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
