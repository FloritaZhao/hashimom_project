import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';

const LabHistoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['labs-all'], queryFn: api.getLabs });
  const handleDelete = async (id: number) => {
    try {
      await api.deleteLab(id);
      queryClient.invalidateQueries({ queryKey: ['labs-all'] });
    } catch (e) {
      // no-op for now
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold text-black mb-1 flex items-center gap-2">
          <span role="img" aria-label="lab">🧪</span>
          Lab History
        </h1>
        <p className="text-sm text-gray-600">View all laboratory results (TSH, FT4, TPOAb, FT3).</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-0 overflow-x-auto">
        {isLoading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : error ? (
          <div className="p-4 text-red-500">Failed to load.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Analyte</th>
                <th className="text-left p-2">Result</th>
                <th className="text-left p-2">Unit</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((r: any) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="p-2">{String(r.test_date)}</td>
                  <td className="p-2">{String(r.test_name)}</td>
                  <td className="p-2">{String(r.result)}</td>
                  <td className="p-2">{r.units || '-'}</td>
                  <td className="p-2">{r.status || '-'}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-red-600 text-xs hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LabHistoryPage;


