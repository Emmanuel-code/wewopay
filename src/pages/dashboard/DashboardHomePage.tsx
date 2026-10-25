import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import OnboardingWizard from '@/components/dashboard/OnboardingWizard';
import { useDeveloper } from '@/hooks/useDeveloper';
import { supabase } from '@/db/supabase';
import { Project, Client, Payment } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import {
  Repeat,
  DollarSign,
  AlertOctagon,
  CalendarCheck,
  Plus,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardHomePage() {
  const { developer, loading: devLoading, updateDeveloper, refreshDeveloper } = useDeveloper();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [revenue30d, setRevenue30d] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (developer?.id) {
      loadDashboardData(developer.id);
      if (!developer.onboarding_completed || !developer.bank_verified) {
        setShowWizard(true);
      }
    }
  }, [developer?.id]);

  // Only show loading skeletons if loading drags on — fast loads should
  // never flash placeholder blocks.
  useEffect(() => {
    if (!devLoading && !dataLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), 400);
    return () => clearTimeout(timer);
  }, [devLoading, dataLoading]);

  const loadDashboardData = async (devId: string) => {
    try {
      setDataLoading(true);

      // 1. Fetch projects
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('developer_id', devId);

      const projList = (projData as Project[]) || [];
      setProjects(projList);

      const projectIds = projList.map((p) => p.id);

      if (projectIds.length > 0) {
        // 2. Fetch clients
        const { data: clientData } = await supabase
          .from('clients')
          .select('*, project:projects(name, currency, amount)')
          .in('project_id', projectIds);

        const clientList = (clientData as Client[]) || [];
        setClients(clientList);

        const clientIds = clientList.map((c) => c.id);

        if (clientIds.length > 0) {
          // 3. Fetch recent payments
          const { data: paymentData } = await supabase
            .from('payments')
            .select('*, client:clients(name, email)')
            .in('client_id', clientIds)
            .order('created_at', { ascending: false })
            .limit(15);

          setRecentPayments((paymentData as Payment[]) || []);

          // 4. Fetch 30-day completed payments for accurate Net Rev (30d)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: monthPayments } = await supabase
            .from('payments')
            .select('developer_amount')
            .in('client_id', clientIds)
            .eq('status', 'SUCCESS')
            .gte('paid_at', thirtyDaysAgo);

          if (monthPayments) {
            const sum30d = monthPayments.reduce((acc, p) => acc + Number(p.developer_amount || 0), 0);
            setRevenue30d(sum30d);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Compute Metrics
  const activeSubscriptions = clients.filter((c) => c.status === 'ACTIVE').length;
  const overdueClients = clients.filter((c) => c.status === 'OVERDUE');

  // MRR estimation normalized by billing cycle
  const mrr = clients.reduce((acc, client) => {
    if (client.status !== 'ACTIVE' || !client.project) return acc;
    const amount = Number(client.project.amount || 0);
    const cycle = client.project.billing_cycle;
    switch (cycle) {
      case 'MONTHLY':
        return acc + amount;
      case 'QUARTERLY':
        return acc + amount / 3;
      case 'ANNUALLY':
        return acc + amount / 12;
      case 'ONE_TIME':
      default:
        return acc;
    }
  }, 0);

  // Renewals in next 7 days
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const renewalsIn7Days = clients.filter((c) => {
    if (!c.next_billing_date) return false;
    const bDate = new Date(c.next_billing_date);
    return bDate >= now && bDate <= next7Days;
  }).length;

  if (devLoading || dataLoading) {
    if (!showSkeleton) {
      return (
        <DashboardLayout>
          <div />
        </DashboardLayout>
      );
    }
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 bg-muted" />
            <Skeleton className="h-28 bg-muted" />
            <Skeleton className="h-28 bg-muted" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {developer?.name || 'Developer'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here is what is happening across your client billing streams today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard/projects/new">
              <Button className="font-semibold shadow-md shadow-primary/20">
                <Plus className="w-4 h-4 mr-1.5" />
                New Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Onboarding Wizard (if not finished) */}
        {showWizard && developer && (
          <OnboardingWizard
            developer={developer}
            onComplete={async (updates) => {
              await updateDeveloper(updates);
              setShowWizard(false);
              refreshDeveloper();
            }}
            onDismiss={() => setShowWizard(false)}
          />
        )}

        {/* Critical Action Alerts */}
        {!developer?.bank_verified && !showWizard && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-500">
                  Bank Account Not Verified
                </p>
                <p className="text-xs text-muted-foreground">
                  Connect and verify your local Ghanaian bank account to receive automated subscription payouts.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowWizard(true)}
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 shrink-0"
            >
              Verify Now
            </Button>
          </div>
        )}

        {overdueClients.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-500">
                  {overdueClients.length} Overdue Client{overdueClients.length > 1 ? 's' : ''} Need Attention
                </p>
                <p className="text-xs text-muted-foreground">
                  Paystack automatic charges failed for {overdueClients.map((c) => c.name).join(', ')}. Automated retry is scheduled.
                </p>
              </div>
            </div>
            <Link to="/dashboard/projects">
              <Button size="sm" variant="destructive" className="shrink-0">
                View Clients
              </Button>
            </Link>
          </div>
        )}

        {/* 6 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Active Subs</span>
                <Repeat className="w-3.5 h-3.5 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">{activeSubscriptions}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Recurring clients</span>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Estimated MRR</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {formatCurrency(mrr, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-emerald-400 font-medium">Monthly run-rate</span>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Net Rev. (30d)</span>
                <DollarSign className="w-3.5 h-3.5 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {formatCurrency(revenue30d, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">After commissions</span>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Pending Balance</span>
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(developer?.pending_balance || 0, 'GHS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Ready for payout</span>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Overdue Clients</span>
                <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              </CardDescription>
              <CardTitle className={`text-2xl font-bold ${overdueClients.length > 0 ? 'text-rose-500' : ''}`}>
                {overdueClients.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Auto-retry active</span>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Renewals (7d)</span>
                <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">{renewalsIn7Days}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <span className="text-[11px] text-muted-foreground">Reminders queued</span>
            </CardContent>
          </Card>
        </div>

        {/* Quick Launchpad & Projects Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Active Billing Projects</h2>
              <Link to="/dashboard/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all projects <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <Card className="p-8 text-center bg-card/60 border-dashed">
                <p className="text-sm text-muted-foreground mb-4">
                  You haven't created any billing projects yet. Projects define your monthly rates and cancellation rules.
                </p>
                <Link to="/dashboard/projects/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Create First Project
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj) => {
                  const projClients = clients.filter((c) => c.project_id === proj.id);
                  return (
                    <Card key={proj.id} className="hover:border-primary/50 transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-semibold">{proj.name}</CardTitle>
                            <CardDescription className="text-xs line-clamp-1 mt-0.5">
                              {proj.description || 'No description provided'}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-xs uppercase">
                            {proj.billing_cycle}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xl font-bold font-mono">
                              {formatCurrency(proj.amount, proj.currency)}
                            </span>
                            <span className="text-xs text-muted-foreground">/{proj.billing_cycle.toLowerCase()}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {projClients.length} clients enrolled
                          </span>
                        </div>
                      </CardContent>
                      <div className="p-3 bg-muted/30 border-t border-border/40 flex items-center justify-between">
                        <Link to={`/dashboard/projects/${proj.id}/clients/new`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Client
                          </Button>
                        </Link>
                        <Link to={`/dashboard/projects/${proj.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Paystack single account status */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Payout Destination</h2>
            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Linked Bank Account</span>
                  {developer?.bank_verified ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px]">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      Pending
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Bank Name</span>
                  <span className="font-medium">{developer?.bank_name || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Account Name</span>
                  <span className="font-medium">{developer?.bank_account_name || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Account Number</span>
                  <span className="font-mono">
                    {developer?.bank_account_number
                      ? `•••• ${developer.bank_account_number.slice(-4)}`
                      : '—'}
                  </span>
                </div>
                <div className="pt-2 border-t border-border/40 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-bold text-foreground">{developer?.commission_rate}%</span>
                </div>
              </CardContent>
              <div className="p-3 bg-muted/30 border-t border-border/40">
                <Link to="/dashboard/settings">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Update Bank Account
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Recent Client Payments</h2>
            <Link to="/dashboard/earnings" className="text-xs text-primary hover:underline">
              View all payouts
            </Link>
          </div>

          <Card>
            <div className="w-full max-w-full overflow-x-auto bg-card">
              <table className="w-full text-left text-sm [&>div]:max-w-full">
                <thead className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Invoice #</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Client</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Gross Amount</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Paystack Fee</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Platform Fee</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Your Net</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                        No transactions recorded yet. Send your first client link to get paid!
                      </td>
                    </tr>
                  ) : (
                    recentPayments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap text-primary">
                          {pmt.invoice_number || 'INV-PENDING'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-medium text-foreground">{pmt.client?.name || 'Client'}</p>
                          <p className="text-xs text-muted-foreground">{pmt.client?.email}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium whitespace-nowrap">
                          {formatCurrency(pmt.gross_amount, pmt.currency)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          -{formatCurrency(pmt.paystack_fee, pmt.currency)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          -{formatCurrency(pmt.platform_fee, pmt.currency)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {formatCurrency(pmt.developer_amount, pmt.currency)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant={pmt.status === 'SUCCESS' ? 'default' : 'secondary'}
                            className={`text-[10px] ${
                              pmt.status === 'SUCCESS'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {pmt.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(pmt.paid_at || pmt.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
