import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import * as api from '../api';
import { useQuery } from '@tanstack/react-query';

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
  const [events, setEvents] = useState<{ date: string; type: string; description?: string }[]>([]);
  const [selectedAnalyte, setSelectedAnalyte] = useState<string>('TSH');

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });

  useEffect(() => {
    const load = async () => {
      try {
        const [labs, symptoms, meds] = await Promise.all([
          api.getLabs(),
          api.getSymptoms(),
          api.getMedications(),
        ]);
        // demo events (could be backend provided)
        const demoEvents = [
          { date: '2025-05-09', type: 'Pregnancy Confirmed', description: 'Confirmed pregnancy' },
          { date: '2025-06-01', type: 'Medication Change', description: 'Dose adjusted to 75mcg' },
        ];
        setEvents(demoEvents);
        // Aggregate data by date (YYYY-MM-DD)
        const map: Record<string, DataPoint> = {};
        // Process labs: convert results to numbers where possible
        labs
          .filter((lab: any) => lab.test_name && lab.test_name.toUpperCase() === selectedAnalyte.toUpperCase())
          .forEach((lab: any) => {
            const date = lab.test_date;
            const value = parseFloat(lab.result);
            if (!isNaN(value)) {
              if (!map[date]) map[date] = { date };
              map[date].lab = value;
              // attach ref range for this date if present
              if (lab.ref_low != null && lab.ref_high != null) {
                (map[date] as any).ref_low = lab.ref_low;
                (map[date] as any).ref_high = lab.ref_high;
              }
              if (lab.delta != null) {
                (map[date] as any).delta = lab.delta;
              }
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
  }, [selectedAnalyte]);

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

  const refBand = useMemo(() => {
    if (!profile || !['T1', 'T2', 'T3'].includes(profile.trimester)) return null;
    // Find first non-null ref_low/high from data for band
    const anyPoint = data.find((d: any) => d.ref_low != null && d.ref_high != null) as any;
    if (!anyPoint) return null;
    return { low: anyPoint.ref_low, high: anyPoint.ref_high };
  }, [data, profile]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-black">Trends</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Analyte</label>
            <select
              value={selectedAnalyte}
              onChange={(e) => setSelectedAnalyte(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option>TSH</option>
              <option>FT4</option>
              <option>TPOAb</option>
              <option>TgAb</option>
            </select>
          </div>
        </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'Lab / Symptom', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Medications', angle: -90, position: 'insideRight' }} />
          <Tooltip
            contentStyle={{ borderRadius: 8 }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const d: any = payload[0]?.payload || {};
              const ev = events.find((e) => e.date === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-sm">
                  <div className="font-medium text-black mb-1">{label}</div>
                  {payload.map((p, idx) => {
                    const name = p.name;
                    const val = p.value as any;
                    if (name === 'Lab Result' && d?.delta != null) {
                      return (
                        <div key={idx} className="text-gray-700">{name}: {val} ({d.delta}% vs prev)</div>
                      );
                    }
                    return (
                      <div key={idx} className="text-gray-700">{name}: {val}</div>
                    );
                  })}
                  {(d.symptom != null || d.medication != null) && (
                    <div className="mt-1 text-gray-600">
                      {d.symptom != null && <div>Symptoms avg: {d.symptom}</div>}
                      {d.medication != null && <div>Med changes: {d.medication}</div>}
                    </div>
                  )}
                  {ev && (
                    <div className="mt-2 text-gray-700">
                      <div className="font-medium">Event: {ev.type}</div>
                      {ev.description && <div className="text-gray-600">{ev.description}</div>}
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Legend />
          {refBand && (
            <ReferenceArea yAxisId="left" y1={refBand.low} y2={refBand.high} fill="#22c55e" fillOpacity={0.12} strokeOpacity={0} />
          )}
          {/* Event lines */}
          {events.map((ev) => (
            <ReferenceLine key={ev.date} x={ev.date} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: ev.type, position: 'top', fill: '#6b7280' }} />
          ))}
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