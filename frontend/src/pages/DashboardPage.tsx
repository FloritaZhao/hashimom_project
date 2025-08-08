import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import * as api from '../api';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../context/UserContext';
// Removed StatsCards per design change

interface ChartDataPoint {
  date: string;
  [key: string]: any; // Allow any other keys for different tests
}

const DashboardPage: React.FC = () => {
  const [labs, setLabs] = useState<any[]>([]);
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [aiMessage, setAIMessage] = useState<string | null>(
    "You're doing great! Keep tracking your health journey. 💪"
  );
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activeChart, setActiveChart] = useState<string>('TSH');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { logout } = useUser();
  const navigate = useNavigate();

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });

  useEffect(() => {
    const load = async () => {
      try {
        const [labsData, symptomsData, medsData, aiData] = await Promise.all([
          api.getLabs(),
          api.getSymptoms(),
          api.getMedications(),
          api.getAIMessage(),
        ]);

        setLabs(labsData);
        setSymptoms(symptomsData);
        setMedications(medsData);
        if (aiData?.message) {
          setAIMessage(aiData.message);
        }

        const processedChartData = labsData
          .filter(
            (lab: any) =>
              lab.test_name && typeof lab.test_name === 'string' && !isNaN(parseFloat(lab.result))
          )
          .map((lab: any) => ({
            date: new Date(lab.test_date).toISOString().split('T')[0],
            value: parseFloat(lab.result),
            name: lab.test_name.toUpperCase(),
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Group by date
        const groupedByDate: { [date: string]: ChartDataPoint } = {};
        processedChartData.forEach((d) => {
          if (!groupedByDate[d.date]) {
            groupedByDate[d.date] = { date: d.date };
          }
          groupedByDate[d.date][d.name] = d.value;
        });

        setChartData(Object.values(groupedByDate));
      } catch (err: any) {
        if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
          await logout();
          navigate('/login');
          return;
        }
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [logout, navigate]);

  const yAxisTickFormatter = (value: any) => {
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    return value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500">Loading...</p>
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

  const discovered = new Set(chartData.flatMap(d => Object.keys(d).filter(k => k !== 'date')));
  const desiredOrder = ['TSH', 'FT4', 'TPOAb', 'FT3'];
  const uniqueTests = desiredOrder.filter(t => true).concat(
    Array.from(discovered).filter(t => !desiredOrder.includes(t))
  );
  // Helpers to avoid timezone drift by using local YYYY-MM-DD keys everywhere
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const parseLoggedAt = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const s = String(value);
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    d = new Date(s.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const [, yy, mm, dd, hh, mi, ss] = m;
      return new Date(Number(yy), Number(mm) - 1, Number(dd), Number(hh || '0'), Number(mi || '0'), Number(ss || '0'));
    }
    return null;
  };
  // Prepare last 7 local dates (6 days ago to endDate, inclusive) as YYYY-MM-DD strings.
  // endDate prefers latest symptom day if it is after local today, to avoid backend timezone drift pushing data to 'tomorrow'.
  const localToday = startOfDay(new Date());
  let latestSymptomDay: Date | null = null;
  for (const s of symptoms as any[]) {
    const parsed = parseLoggedAt((s as any).logged_at);
    if (!parsed) continue;
    const day = startOfDay(parsed);
    if (!latestSymptomDay || day.getTime() > latestSymptomDay.getTime()) {
      latestSymptomDay = day;
    }
  }
  const windowEnd = latestSymptomDay && latestSymptomDay.getTime() > localToday.getTime() ? latestSymptomDay : localToday;
  const last7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(windowEnd);
    d.setDate(windowEnd.getDate() - (6 - i)); // i=0 -> -6 days, i=6 -> end day
    return toLocalYMD(d);
  });
  const windowStart = startOfDay(new Date(windowEnd));
  windowStart.setDate(windowStart.getDate() - 6);
  const last7Set = new Set(last7Dates);
  // Only keep records whose local date key is within the 7-day window
  const symptoms7d = symptoms.filter((s: any) => {
    const parsed = parseLoggedAt(s.logged_at);
    if (!parsed) return false;
    const d = startOfDay(parsed);
    const key = toLocalYMD(d);
    return last7Set.has(key);
  });
  const severityColor = (sev: number) => {
    if (sev >= 4) return '#ef4444'; // red-500
    if (sev === 3) return '#f59e0b'; // amber-500
    return '#22c55e'; // green-500
  };
  const abbreviate = (name: string) => {
    const clean = (name || '').replace(/[^a-zA-Z]/g, '');
    const upper = clean.toLowerCase();
    const len = upper.length;
    // 3-5 chars: prefer 4 for long words, else 3
    if (len >= 8) return upper.slice(0, 4);
    if (len >= 6) return upper.slice(0, 4);
    return upper.slice(0, 3);
  };
  // Build scatter points on numeric X axis (0..6) with slight jitter for stacked points
  const basePoints = symptoms7d
    .map((s: any) => {
      const parsed = parseLoggedAt(s.logged_at);
      if (!parsed) return null;
      const d = startOfDay(parsed);
      const dateKey = toLocalYMD(d);
      const sev = Number(s.severity);
      const dayMs = 24 * 60 * 60 * 1000;
      const idx = Math.floor((d.getTime() - windowStart.getTime()) / dayMs);
      if (idx < 0 || idx > 6) return null; // outside 7-day window
      return {
        x: idx,
        date: dateKey,
        severity: sev,
        name: s.symptom,
        note: s.note,
        abbrev: abbreviate(s.symptom),
        color: severityColor(sev),
      } as any;
    })
    .filter(Boolean) as any[];

  const grouped: Record<string, any[]> = {};
  basePoints.forEach((p) => {
    const k = `d${p.x}-s${p.severity}`;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(p);
  });
  const scatterData = Object.values(grouped).flatMap((arr) => {
    // center-aligned jitter offsets
    const n = arr.length;
    if (n === 1) return arr;
    const spread = 0.6; // total width spread across the bucket
    return arr.map((p, i) => {
      const offset = (i - (n - 1) / 2) * (spread / Math.max(1, n - 1));
      const x = Math.max(0, Math.min(6, p.x + offset));
      return { ...p, x };
    });
  });

  return (
    <div className="space-y-6">
      {/* Gestation Info Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          This week: <span className="font-semibold text-black">{profile?.gestational_age_weeks ?? '—'} weeks ({profile?.trimester ?? '-'})</span>
        </div>
        {!profile || (!profile.lmp_date && !profile.due_date) ? (
          <Link to="/profile" className="text-blue-600 text-sm">Add pregnancy info</Link>
        ) : null}
      </div>
      {/* Encouragement Message */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-black mb-2">Encourage Message</h3>
        {aiMessage && <p className="text-sm text-black">{aiMessage}</p>}
      </div>

      {/* Stats cards removed */}

      {/* Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-black">Your Trends</h3>
          {uniqueTests.length > 1 && (
            <div className="flex space-x-2">
              {uniqueTests.map(test => (
                <button
                  key={test}
                  onClick={() => setActiveChart(test)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    activeChart === test ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {test}
                </button>
              ))}
            </div>
          )}
        </div>

        {chartData.length > 0 ? (
          (() => {
            const hasDataForActive = chartData.some((d: any) => d[activeChart] != null);
            if (!hasDataForActive) {
              return (
                <div className="h-48 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-center p-6 text-gray-600">
                  No data for {activeChart}.
                </div>
              );
            }
            return (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                  />
                  <YAxis
                    width={36}
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                    tickFormatter={yAxisTickFormatter}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: any, name: any) => [value, name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={activeChart}
                    stroke="#2D6EFF"
                    strokeWidth={2}
                    dot={{ fill: '#2D6EFF', r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            );
          })()
        ) : (
          <div className="h-48 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-center p-6">
            <p>No lab data to display trends.</p>
          </div>
        )}
      </div>

      {/* Recent Symptoms Overview as a single 7d scatter chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-black">Recent Symptoms (7d)</h3>
          <Link to="/symptoms/history" className="text-blue-600 text-xs">View all</Link>
        </div>
        {scatterData.length === 0 ? (
          <div>
            <p className="text-sm text-gray-600">No recent symptoms</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="x"
                type="number"
                domain={[0, 6]}
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickCount={7}
                tickFormatter={(v) => {
                  const i = Math.round(Number(v));
                  const d = last7Dates[i];
                  if (!d) return '';
                  const [y, m, day] = d.split('-');
                  return `${m}/${day}`;
                }}
              />
              <YAxis
                dataKey="severity"
                type="number"
                domain={[1, 5]}
                allowDecimals={false}
                width={36}
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px' }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d: any = payload[0]?.payload;
                  if (!d) return null;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-sm">
                      <div className="font-medium text-black mb-1">{d.date}</div>
                      <div className="text-gray-800">{d.name}: {d.severity}</div>
                      {d.note && <div className="text-gray-600 mt-1">{d.note}</div>}
                    </div>
                  );
                }}
              />
              <Scatter
                data={scatterData}
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  const label = payload.abbrev;
                  const bg = payload.color;
                  return (
                    <g transform={`translate(${cx - 12}, ${cy - 8})`}>
                      <rect rx="8" ry="8" width="24" height="16" fill={bg} opacity="0.9" />
                      <text x={12} y={11} textAnchor="middle" fontSize="10" fill="#ffffff">{label}</text>
                    </g>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
          <span>1–2: <span className="inline-block w-2 h-2 rounded-full align-middle" style={{ backgroundColor: '#22c55e' }}></span></span>
          <span>3: <span className="inline-block w-2 h-2 rounded-full align-middle" style={{ backgroundColor: '#f59e0b' }}></span></span>
          <span>4–5: <span className="inline-block w-2 h-2 rounded-full align-middle" style={{ backgroundColor: '#ef4444' }}></span></span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;