import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Developer } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

export function useDeveloper() {
  const { user } = useAuth();
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeveloper = async () => {
    if (!user) {
      setDeveloper(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('developers')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (fetchErr) {
        throw fetchErr;
      }

      if (data) {
        setDeveloper(data as Developer);
      } else {
        // Fallback: create developer row if not triggered
        const { data: newDev, error: insertErr } = await supabase
          .from('developers')
          .insert({
            profile_id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Developer',
            email: user.email || '',
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        setDeveloper(newDev as Developer);
      }
    } catch (err: any) {
      console.error('Error fetching developer:', err);
      setError(err.message || 'Failed to load developer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeveloper();
  }, [user?.id]);

  const updateDeveloper = async (updates: Partial<Developer>) => {
    if (!developer?.id) return { error: new Error('No developer found') };
    const { data, error } = await supabase
      .from('developers')
      .update(updates)
      .eq('id', developer.id)
      .select()
      .single();

    if (!error && data) {
      setDeveloper(data as Developer);
    }
    return { data, error };
  };

  return {
    developer,
    loading,
    error,
    refreshDeveloper: fetchDeveloper,
    updateDeveloper,
  };
}
