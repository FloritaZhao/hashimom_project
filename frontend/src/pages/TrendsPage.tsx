import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as api from '../api';

interface DataPoint {
  date: string;
  lab?: number;
  symptom?: number;
  medication?: number;
}

/**
 * TrendsPage visualizes lab results, symptom severity and medication count over time.
 */
const TrendsPage: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const [labs, symptoms, meds] = await Promise.all([
          api.getLabs(),
          api.getSymptoms(),
          api.getMedications(),
        ]);
        // Aggregate data by date (YYYY-MM-DD)
        const map: Record<string, DataPoint> = {};
        // Process labs: convert results to numbers where possible
        labs.forEach((lab: any) => {
          const date = lab.test_date;
          const value = parseFloat(lab.result);
          if (!isNaN(value)) {
            if (!map[date]) map[date] = { date };
            map[date].lab = value;
          }
        });
        // Process symptoms: average severity per date
        const symptomMap: Record<string, { total: number; count: number }> = {};
        symptoms.forEach((symp: any) => {
          const date = symp.logged_at.split('T')[0];
          const sev = Number(symp.severity);
          if (!symptomMap[date]) symptomMap[date] = { total: 0, count: 0 };
          symptomMap[date].total += sev;
          symptomMap[date].count += 1;
        });
        Object.keys(symptomMap).forEach((date) => {
          const avg = symptomMap[date].total / symptomMap[date].count;
          if (!map[date]) map[date] = { date };
          map[date].symptom = Math.round(avg * 10) / 10;
        });
        // Process medications: count per date
        meds.forEach((med: any) => {
          const date = med.taken_at.split('T')[0];
          if (!map[date]) map[date] = { date };
          map[date].medication = (map[date].medication || 0) + 1;
        });
        // Convert map to array sorted by date
        const points = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
        setData(points);
      } catch (err: any) {
        setError(err.message || 'Failed to load trend data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500">Loading trends...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500">No data available to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold text-black mb-4">Trends</h1>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'Lab / Symptom', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Medications', angle: -90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="lab" name="Lab Result" stroke="#4f46e5" />
          <Line yAxisId="left" type="monotone" dataKey="symptom" name="Avg Symptom" stroke="#22c55e" />
          <Line yAxisId="right" type="monotone" dataKey="medication" name="Medication Count" stroke="#f59e0b" />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendsPage;