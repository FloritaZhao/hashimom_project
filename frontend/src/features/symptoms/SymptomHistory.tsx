import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../../api';
import { Link } from 'react-router-dom';

const badgeClass = (sev: number) => {
  if (sev >= 4) return 'bg-red-100 text-red-700 border-red-200';
  if (sev >= 2) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const SymptomHistory: React.FC = () => {
  const [filter, setFilter] = useState<string>('');
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['symptoms', { filter }],
    queryFn: async () => api.getSymptomsFiltered({ symptom_name: filter || undefined }),
  });

  const names = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((s: any) => set.add(s.symptom));
    return Array.from(set).sort();
  }, [data]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this symptom entry?')) return;
    await api.deleteSymptom(id);
    await queryClient.invalidateQueries({ queryKey: ['symptoms'] });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-64 text-gray-500">Loading...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center min-h-64 text-red-500">Failed to load symptoms</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600 mb-3">No symptom records yet.</p>
        <Link to="/symptoms/new" className="px-3 py-2 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Add symptom</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Filter</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
          <option value="">All</option>
          {names.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg divide-y">
        {data.map((s: any) => (
          <div key={s.id} className="p-3 flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">{new Date(s.logged_at).toISOString().split('T')[0]}</div>
              <div className="text-black font-medium">{s.symptom}</div>
              {s.note && <div className="text-sm text-gray-600 mt-1">{s.note}</div>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded border ${badgeClass(Number(s.severity))}`}>sev {s.severity}</span>
              {s.related_lab_event && (
                <span title={`Lab: ${s.related_lab_event.summary} on ${s.related_lab_event.date}`} className="text-gray-500">🧪</span>
              )}
              {s.related_gluten_event && (
                <span title="Food event on this day" className="text-gray-500">🍞</span>
              )}
              <button
                onClick={() => handleDelete(s.id)}
                className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded px-2 py-1"
                title="Delete"
              >
                delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SymptomHistory;


