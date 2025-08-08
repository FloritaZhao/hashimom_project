import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../api';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceArea } from 'recharts';
import { Link } from 'react-router-dom';

const SymptomTrend: React.FC = () => {
  const [filter, setFilter] = useState<string>('');
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const { data, isLoading, error } = useQuery({
    queryKey: ['symptoms-trend', { filter }],
    queryFn: async () => api.getSymptomsFiltered({ symptom_name: filter || undefined }),
  });

  const points = useMemo(() => {
    const arr = (data || []).map((s: any) => ({
      date: new Date(s.logged_at).toISOString().split('T')[0],
      severity: Number(s.severity),
      note: s.note,
      related_lab_event: s.related_lab_event,
      related_gluten_event: s.related_gluten_event,
    }));
    return arr.sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const names = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((s: any) => set.add(s.symptom));
    return Array.from(set).sort();
  }, [data]);

  const refBand = useMemo(() => {
    if (!profile || !['T1', 'T2', 'T3'].includes(profile.trimester)) return null;
    // For severity scale 1-5, band can be full or a neutral region (keep full for visibility)
    return { low: 1, high: 5 };
  }, [profile]);

  if (isLoading) return <div className="flex items-center justify-center min-h-64 text-gray-500">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-64 text-red-500">Failed to load trend</div>;

  if (!points || points.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600 mb-3">暂无症状记录</p>
        <Link to="/symptoms/new" className="px-3 py-2 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">点击这里添加</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Symptom</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
          <option value="">All</option>
          {names.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={points} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[1, 5]} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(value: any, name: any, props: any) => {
              const d: any = props?.payload;
              let extra = '';
              if (d?.related_lab_event) extra += ` | Lab: ${d.related_lab_event.summary}`;
              if (d?.related_gluten_event) extra += ' | Food event';
              return [`${value}${extra}`, 'Severity'];
            }} />
            {refBand && (
              <ReferenceArea y1={refBand.low} y2={refBand.high} fill="#22c55e" fillOpacity={0.12} strokeOpacity={0} />
            )}
            <Line type="monotone" dataKey="severity" name="Severity" stroke="#22c55e" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SymptomTrend;


