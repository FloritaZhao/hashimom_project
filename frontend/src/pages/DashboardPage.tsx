import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../context/UserContext';
import EventCorrelationMap from '../components/EventCorrelationMap';
// Removed StatsCards per design change

interface ChartDataPoint {
  date: string;
  [key: string]: any; // Allow any other keys for different tests
}

const DashboardPage: React.FC = () => {
  const [labs, setLabs] = useState<any[]>([]);
  const [symptoms, setSymptoms] = useState<any[]>([]);
  // const [medications, setMedications] = useState<any[]>([]);
  const [glutenScans, setGlutenScans] = useState<any[]>([]);
  const [aiMessage, setAIMessage] = useState<string | null>(
    "You're doing great! Keep tracking your health journey. 💪"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { logout, user } = useUser() as any;
  const navigate = useNavigate();

  const { data: profile } = useQuery({ queryKey: ['profile', user?.user_id], queryFn: api.getProfile, enabled: !!user });

  useEffect(() => {
    const load = async () => {
      try {
        const [labsData, symptomsData, aiData, scans] = await Promise.all([
          api.getLabs(),
          api.getSymptoms(),
          api.getAIMessage(),
          api.getGlutenScans(),
        ]);

        setLabs(labsData);
        setSymptoms(symptomsData);
        setGlutenScans(scans);
        if (aiData?.message) {
          setAIMessage(aiData.message);
        }
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
  }, [logout, navigate, profile?.lmp_date, profile?.due_date]);

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

      {/* Event Correlation Map */}
      <EventCorrelationMap labs={labs} symptoms={symptoms} glutenScans={glutenScans} profile={profile as any} />

      {/* History entry cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/lab-history')}
          className="text-left bg-blue-50 hover:bg-blue-100 transition transform hover:scale-[1.01] active:scale-[0.99] border border-blue-100 rounded-lg p-4 shadow-sm hover:shadow flex items-start gap-3"
        >
          <div className="text-xl">🧪</div>
          <div>
            <div className="text-sm font-semibold text-black">Lab History</div>
            <div className="text-xs text-gray-700">View all laboratory results (TSH, FT4, TPOAb, FT3)</div>
          </div>
        </button>
        <button
          onClick={() => navigate('/symptom-history')}
          className="text-left bg-pink-50 hover:bg-pink-100 transition transform hover:scale-[1.01] active:scale-[0.99] border border-pink-100 rounded-lg p-4 shadow-sm hover:shadow flex items-start gap-3"
        >
          <div className="text-xl">💓</div>
          <div>
            <div className="text-sm font-semibold text-black">Symptom History</div>
            <div className="text-xs text-gray-700">View all symptom entries and severity changes</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;