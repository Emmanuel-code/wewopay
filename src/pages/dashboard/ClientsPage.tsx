import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useDeveloper } from '@/hooks/useDeveloper';
import { supabase } from '@/db/supabase';
import { Client } from '@/types/types';
import { formatDate } from '@/utils/paystack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  OVERDUE: 'bg-rose-500/20 text-rose-400',
  PENDING: 'bg-amber-500/20 text-amber-400',
  PAUSED: 'bg-slate-500/20 text-slate-400',
  CANCELLED: 'bg-slate-500/20 text-slate-400',
};

export default function ClientsPage() {
  const { developer, loading: devLoading } = useDeveloper();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileFailed, setProfileFailed] = useState(false);

  useEffect(() => {
    if (developer?.id) loadClients(developer.id);
    else if (!devLoading) {
      // Profile finished loading but no developer row — don't spin forever.
      setProfileFailed(true);
      setLoading(false);
    }
  }, [developer?.id, devLoading]);

  const loadClients = async (devId: string) => {
    try {
      setLoading(true);
      const { data: projData } = await supabase
        .from('projects')
        .select('id')
        .eq('developer_id', devId);
      const projectIds = (projData || []).map((p: { id: string }) => p.id);
      if (projectIds.length === 0) {
        setClients([]);
        return;
      }
      const { data: clientData } = await supabase
        .from('clients')
        .select('*, project:projects(name, currency, amount)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      setClients((clientData as Client[]) || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground">
              Everyone paying you across all your projects, in one place.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/projects">Go to Projects</Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> All Clients
            </CardTitle>
            <CardDescription>
              {loading ? 'Loading…' : `${clients.length} client${clients.length === 1 ? '' : 's'} total`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading clients…</p>
            ) : profileFailed ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Could not load your profile — please refresh the page.</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No clients yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add clients from a project page — they will show up here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Client</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Project</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Next Billing</th>
                      <th className="py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-4 font-medium">{c.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{c.email}</td>
                        <td className="py-3 pr-4">{c.project?.name || '—'}</td>
                        <td className="py-3 pr-4">
                          <Badge className={statusStyles[c.status] || statusStyles.PENDING}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {c.next_billing_date ? formatDate(c.next_billing_date) : '—'}
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/dashboard/projects/${c.project_id}/clients/${c.id}`}>
                              View
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
