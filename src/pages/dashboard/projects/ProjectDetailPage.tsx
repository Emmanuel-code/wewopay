import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/db/supabase';
import { Project, Client } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import {
  ArrowLeft,
  Plus,
  Search,
  Download,
  ExternalLink,
  Settings,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadProjectData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projErr) throw projErr;
      setProject(projData as Project);

      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('*, payments(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (clientErr) throw clientErr;
      setClients((clientData as Client[]) || []);
    } catch (err: any) {
      toast.error('Could not load project: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const handleTestSandboxCheckout = async () => {
    if (!project) return;
    try {
      // Find existing demo client or generate one on the fly for sandbox checkout
      let demoClient = clients.find((c) => c.status === 'PENDING' || c.status === 'ACTIVE');
      if (!demoClient) {
        const dummyToken = `pay_test_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
        const portalToken = `portal_test_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
        const { data, error } = await supabase
          .from('clients')
          .insert({
            project_id: project.id,
            name: 'Sandbox Test Client',
            email: 'sandbox@test.local',
            status: 'PENDING',
            payment_link_token: dummyToken,
            portal_token: portalToken,
          })
          .select()
          .single();

        if (error) throw error;
        demoClient = data as Client;
        await loadProjectData();
      }

      window.open(`/pay/${demoClient.payment_link_token}`, '_blank');
      toast.info('Opened Sandbox Checkout in a new tab');
    } catch (e: any) {
      toast.error('Could not start sandbox preview: ' + e.message);
    }
  };

  const copyPaymentLink = (token: string) => {
    const url = `${window.location.origin}/pay/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Payment checkout link copied to clipboard!');
  };

  const copyPortalLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Client portal link copied to clipboard!');
  };

  const exportCSV = () => {
    if (clients.length === 0) {
      toast.error('No clients to export');
      return;
    }
    const headers = 'Name,Email,Phone,Status,Next Billing Date,Created At\n';
    const rows = clients
      .map(
        (c) =>
          `"${c.name}","${c.email}","${c.phone || ''}","${c.status}","${c.next_billing_date || ''}","${c.created_at}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'project'}-clients.csv`;
    a.click();
    toast.success('Clients CSV downloaded');
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = clients.filter((c) => c.status === 'ACTIVE').length;
  const overdueCount = clients.filter((c) => c.status === 'OVERDUE').length;

  if (loading || !project) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">Loading project data...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to projects"
              onClick={() => navigate('/dashboard/projects')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <Badge variant="outline" className="text-xs uppercase">
                  {project.billing_cycle}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Plan Code: <span className="font-mono">{project.paystack_plan_code || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              aria-label="Preview and test checkout link"
              className="border border-border/60"
              onClick={handleTestSandboxCheckout}
            >
              <ExternalLink className="w-4 h-4 mr-1.5 text-primary" />
              Test Sandbox Checkout
            </Button>
            <Link to={`/dashboard/projects/${project.id}/settings`}>
              <Button variant="outline" size="sm" aria-label="Open project settings">
                <Settings className="w-4 h-4 mr-1.5" />
                Project Settings
              </Button>
            </Link>
            <Link to={`/dashboard/projects/${project.id}/clients/new`}>
              <Button size="sm" aria-label="Add new client to project" className="shadow-md shadow-primary/20">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Client
              </Button>
            </Link>
          </div>
        </div>

        {/* Project Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs">Price / Interval</CardDescription>
              <CardTitle className="text-xl font-mono">
                {formatCurrency(project.amount, project.currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-xs text-muted-foreground">Cycle: {project.billing_cycle}</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs">Active Subscriptions</CardDescription>
              <CardTitle className="text-xl font-bold text-emerald-400">{activeCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-xs text-muted-foreground">Paying clients</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs">Overdue Invoices</CardDescription>
              <CardTitle className={`text-xl font-bold ${overdueCount > 0 ? 'text-rose-500' : ''}`}>
                {overdueCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-xs text-muted-foreground">Failed Paystack retries</span>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs">Total Clients</CardDescription>
              <CardTitle className="text-xl font-bold">{clients.length}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-xs text-muted-foreground">Enrolled so far</span>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table with Filter and Search */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Clients Enrolled</CardTitle>
                <CardDescription>
                  Manage subscriber statuses, send payment links, and inspect transaction receipts.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export CSV
                </Button>
                <Link to={`/dashboard/projects/${project.id}/clients/new`}>
                  <Button size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Client
                  </Button>
                </Link>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by client name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {['ALL', 'ACTIVE', 'PENDING', 'OVERDUE', 'CANCELLED'].map((st) => (
                  <Button
                    key={st}
                    variant={statusFilter === st ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-9"
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto bg-card">
              <table className="w-full text-left text-sm [&>div]:max-w-full">
                <thead className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Client</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Next Billing</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Payment Link</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Self-Serve Portal</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        No clients found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => {
                      const statusColors: Record<string, string> = {
                        ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                        PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                        OVERDUE: 'bg-rose-500/20 text-rose-500 border-rose-500/30',
                        CANCELLED: 'bg-muted text-muted-foreground',
                        PAUSED: 'bg-gray-500/20 text-gray-400',
                      };

                      return (
                        <tr key={client.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Link
                              to={`/dashboard/projects/${project.id}/clients/${client.id}`}
                              className="font-semibold text-foreground hover:text-primary transition-colors block"
                            >
                              {client.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold ${statusColors[client.status] || ''}`}
                            >
                              {client.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs whitespace-nowrap">
                            {formatDate(client.next_billing_date)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                aria-label={`Copy payment link for ${client.name}`}
                                className="h-7 text-xs"
                                onClick={() => copyPaymentLink(client.payment_link_token)}
                              >
                                <Copy className="w-3 h-3 mr-1" /> Copy Link
                              </Button>
                              <a
                                href={`/pay/${client.payment_link_token}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open checkout in new window for ${client.name}`}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Copy portal link for ${client.name}`}
                                className="h-7 text-xs"
                                onClick={() => copyPortalLink(client.portal_token)}
                              >
                                <Copy className="w-3 h-3 mr-1" /> Portal
                              </Button>
                              <a
                                href={`/portal/${client.portal_token}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open self-serve client portal in new window for ${client.name}`}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <Link to={`/dashboard/projects/${project.id}/clients/${client.id}`}>
                              <Button size="sm" variant="outline" aria-label={`View client details for ${client.name}`} className="h-7 text-xs">
                                Details
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
