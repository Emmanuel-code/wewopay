import { supabase } from '@/db/supabase';
import { Project, Client, Payment, Developer } from '@/types/types';

export const projectService = {
  async getByDeveloperId(developerId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('developer_id', developerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Project[]) || [];
  },

  async getById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();
    if (error) throw error;
    return data as Project | null;
  },

  async create(project: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  },

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  },
};

export const clientService = {
  async getByProjectIds(projectIds: string[]): Promise<Client[]> {
    if (!projectIds.length) return [];
    const { data, error } = await supabase
      .from('clients')
      .select('*, project:projects(id, name, billing_cycle, amount, currency)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Client[]) || [];
  },

  async getByPaymentToken(token: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('payment_link_token', token)
      .maybeSingle();
    if (error) throw error;
    return data as Client | null;
  },

  async getByPortalToken(token: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('portal_token', token)
      .maybeSingle();
    if (error) throw error;
    return data as Client | null;
  },
};

export const paymentService = {
  async getByClientIds(clientIds: string[], limit: number = 20): Promise<Payment[]> {
    if (!clientIds.length) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*, client:clients(name, email)')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Payment[]) || [];
  },

  async get30DayRevenue(clientIds: string[]): Promise<number> {
    if (!clientIds.length) return 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('payments')
      .select('developer_amount')
      .in('client_id', clientIds)
      .eq('status', 'SUCCESS')
      .gte('paid_at', thirtyDaysAgo);
    if (error) throw error;
    return (data || []).reduce((acc, p) => acc + Number(p.developer_amount || 0), 0);
  },
};

export const developerService = {
  async getByProfileId(profileId: string): Promise<Developer | null> {
    const { data, error } = await supabase
      .from('developers')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return data as Developer | null;
  },

  async update(id: string, updates: Partial<Developer>): Promise<Developer> {
    const { data, error } = await supabase
      .from('developers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Developer;
  },
};
