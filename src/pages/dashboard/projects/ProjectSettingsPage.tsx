import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/db/supabase';
import { Project } from '@/types/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [cancelPolicy, setCancelPolicy] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProject(data as Project);
          setName(data.name);
          setDescription(data.description || '');
          setIsActive(data.is_active);
          setCancelPolicy(data.cancel_policy || '');
        }
      });
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          is_active: isActive,
          cancel_policy: cancelPolicy.trim() || null,
        })
        .eq('id', projectId);
      if (error) throw error;
      toast.success('Project settings updated');
      navigate(`/dashboard/projects/${projectId}`);
    } catch (err: any) {
      toast.error('Update failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    if (confirm('Are you sure you want to delete this project?')) {
      await supabase.from('projects').delete().eq('id', projectId);
      toast.success('Project deleted');
      navigate('/dashboard/projects');
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
            <h1 className="text-2xl font-bold tracking-tight">Project Settings</h1>
            <p className="text-sm text-muted-foreground">Update metadata or deactivate billing service.</p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edit Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Cancellation Policy Text</Label>
                <Textarea value={cancelPolicy} onChange={(e) => setCancelPolicy(e.target.value)} rows={2} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>Project Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive projects will reject client checkouts.</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/40 pt-4">
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
