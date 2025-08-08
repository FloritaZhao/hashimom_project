import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as api from '../../api';
import { queryClient } from '../../lib/queryClient';

const ProfilePage: React.FC = () => {
  const { data, isLoading, error } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const [lmp, setLmp] = useState<string | ''>('');
  const [edd, setEdd] = useState<string | ''>('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (data) {
      setLmp(data.lmp_date || '');
      setEdd(data.due_date || '');
      setNotes(data.high_risk_notes || '');
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (body: api.ProfileIn) => api.putProfile(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      lmp_date: lmp || null,
      due_date: edd || null,
      high_risk_notes: notes || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold text-black mb-4">Pregnancy Profile</h1>
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-sm">Failed to load profile</p>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              <span>Gestational age this week: </span>
              <span className="font-semibold text-black">
                {data?.gestational_age_weeks ?? '—'} weeks ({data?.trimester ?? '-'})
              </span>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">LMP (Last menstrual period)</label>
                <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">EDD (Due date)</label>
                <input type="date" value={edd} onChange={(e) => setEdd(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">High‑risk notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" rows={3} />
              </div>
              <button disabled={mutation.isPending} className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-60">
                {mutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;


