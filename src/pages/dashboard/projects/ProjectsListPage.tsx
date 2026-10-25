import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useDeveloper } from '@/hooks/useDeveloper';
import { supabase } from '@/db/supabase';
import { Project, Client } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/paystack';
import { Plus, Search, Filter, FolderGit2, Users, ArrowUpRight, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ProjectsListPage() {
  const { developer } = useDeveloper();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProjects = async (devId: string) => {
    try {
      setLoading(true);
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('developer_id', devId)
        .order('created_at', { ascending: false });

      const pList = (projData as Project[]) || [];
      setProjects(pList);

      if (pList.length > 0) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, project_id, status')
          .in('project_id', pList.map((p) => p.id));
        setClients((clientData as Client[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (developer?.id) {
      fetchProjects(developer.id);
    }
  }, [developer?.id]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing Projects</h1>
            <p className="text-sm text-muted-foreground">
              Define subscription retainers and one-time deliverables for your clients.
            </p>
          </div>
          <Link to="/dashboard/projects/new">
            <Button className="shadow-md shadow-primary/20">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Project
            </Button>
          </Link>
        </div>

        {/* Search & Filter toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="p-12 text-center bg-card border-dashed">
            <FolderGit2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No billing projects found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 mt-1">
              {search
                ? 'No projects match your search query.'
                : 'Create your first project to configure recurring intervals, currency, and Paystack subscription plans.'}
            </p>
            <Link to="/dashboard/projects/new">
              <Button>
                <Plus className="w-4 h-4 mr-1.5" />
                New Billing Project
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const projectClients = clients.filter((c) => c.project_id === project.id);
              const activeCount = projectClients.filter((c) => c.status === 'ACTIVE').length;

              return (
                <Card
                  key={project.id}
                  className="flex flex-col border-border/60 hover:border-primary/50 transition-all bg-card"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-2">
                        <CardTitle className="text-lg font-bold truncate">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-2 mt-1">
                          {project.description || 'No description provided.'}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase font-bold shrink-0 tracking-wider"
                      >
                        {project.billing_cycle}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1">
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-2xl font-bold font-mono text-foreground">
                          {formatCurrency(project.amount, project.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {project.billing_cycle === 'ONE_TIME' ? ' total' : `/${project.billing_cycle.toLowerCase().replace('ly', '')}`}
                        </span>
                      </div>
                      {project.paystack_plan_code && (
                        <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          Paystack Plan
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Active Clients</span>
                        <span className="font-semibold text-emerald-400">{activeCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Total Enrolled</span>
                        <span className="font-semibold text-foreground">{projectClients.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Trial Days</span>
                        <span className="font-semibold text-foreground">{project.trial_days} days</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Cancel Lock</span>
                        <span className="font-semibold text-foreground">
                          {project.client_can_cancel ? `${project.cancel_lock_months} mos` : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-between mt-auto">
                    <Link to={`/dashboard/projects/${project.id}/clients/new`}>
                      <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Client
                      </Button>
                    </Link>
                    <Link to={`/dashboard/projects/${project.id}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold">
                        View Clients & Analytics
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
