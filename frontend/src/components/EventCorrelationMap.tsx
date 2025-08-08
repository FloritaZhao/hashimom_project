import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, CartesianGrid, ReferenceDot, Customized } from 'recharts';
import { Cluster } from '../types/correlation';
import { toYmd, lastNDays } from '../lib/date';

interface Props {
  labs: any[];
  symptoms: any[];
  glutenScans: any[];
  profile?: { trimester: 'T1' | 'T2' | 'T3' | '-' } | null;
}

interface Row {
  date: string;
  lab?: number;
  labUnit?: string;
  labStatus?: string;
  severityPoints?: { name: string; severity: number; note?: string }[];
  dietEvents?: { type: string; confidence: number; keywords?: string }[];
  labDeltaPct?: number | null;
}

const ANALYTES = ['TSH', 'FT4', 'TPOAb', 'FT3'];
const ANALYTE_COLORS: Record<string, string> = {
  TSH: '#2563eb',
  FT4: '#22c55e',
  TPOAb: '#f59e0b',
  FT3: '#ef4444',
};

const COLORS = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#2563eb',
  grayText: '#666',
  grid: '#f0f0f0',
  neutralArea: '#9ca3af',
};

const windowHours = 48;
const labDeltaThreshold = 10;
const symptomDeltaThreshold = 1;
const glutenConfidenceThreshold = 0.6;

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdToMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map((n) => Number(n));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
}

function msToMmDd(ms: number): string {
  const dt = new Date(ms);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function parseToStartOfDay(value: any): Date | null {
  if (!value) return null;
  const s = String(value);
  let d = new Date(s);
  if (isNaN(d.getTime())) d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function numericConfidence(conf: any): number {
  if (typeof conf === 'number') return conf;
  const s = String(conf || '').toLowerCase();
  if (s.includes('high')) return 0.9;
  if (s.includes('medium')) return 0.6;
  if (s.includes('low')) return 0.3;
  const n = Number(conf);
  return isFinite(n) && n >= 0 && n <= 1 ? n : 0.5;
}

function parseGlutenAssessment(assessment?: string): { isLikely: boolean; level: 'high' | 'medium' | 'low' | null } {
  const text = String(assessment || '').toLowerCase();
  if (!text) return { isLikely: false, level: null };
  const isLikely = /gluten\s*:\s*(likely|present|detected)/.test(text) || text.includes('likely present') || text.includes('gluten likely');
  const level = text.includes('high') ? 'high' : text.includes('medium') ? 'medium' : text.includes('low') ? 'low' : null;
  return { isLikely, level };
}

function summarizeCluster(c: Cluster): string {
  const parts: string[] = [];
  const date = new Date(c.time_window.start).toLocaleDateString();
  if (c.members.gluten.length > 0) parts.push(`gluten on ${date}`);
  const sev = c.members.symptoms[0]?.severity;
  if (sev != null) parts.push(`${c.members.symptoms[0]?.name} ↑ (sev ${sev})`);
  const lp = c.members.labs[0];
  if (lp?.deltaPct != null) parts.push(`${lp.analyte} ${lp.deltaPct > 0 ? '↑' : '↓'} ${Math.abs(lp.deltaPct)}%`);
  const body = parts.join('; ');
  return `Possible link: ${body}. Consider tracking rest & diet. (For reference only, not medical advice. Please follow your physician's guidance.)`;
}

// ---- Normalization helpers ----
type LabRow = { date: string; analyte: string; value: number; unit: string; status?: string; deltaPct?: number | null; normalized?: number | null };
type SymptomRow = { date: string; name: string; severity: number; note?: string };
type GlutenRow = { date: string; confidence: number; type: 'suspect' | 'safe'; keywords?: string[] };

function normalizeLabs(raw: any[], analyte: string, days: string[]): LabRow[] {
  const target = String(analyte).toUpperCase();
  // group by day -> keep last
  const byDay: Record<string, { idx: number; v: number; unit: string; status?: string }> = {};
  raw
    .filter((l) => String(l.test_name || '').toUpperCase() === target)
    .forEach((l, i) => {
      const day = toYmd(l.test_date);
      if (!byDay[day] || i >= byDay[day].idx) {
        const v = Number(l.result);
        if (!isFinite(v)) return;
        byDay[day] = { idx: i, v, unit: l.units || '', status: l.status };
      }
    });
  // sort by days order and compute delta
  const filteredDays = days.filter((d) => byDay[d]);
  let prev: number | null = null;
  const out: LabRow[] = filteredDays.map((d) => {
    const cur = byDay[d];
    const delta = prev != null && prev !== 0 ? Math.round(((cur.v - prev) / prev) * 1000) / 10 : null;
    prev = cur.v;
    return { date: d, analyte: target, value: cur.v, unit: cur.unit, status: cur.status, deltaPct: delta, normalized: null };
  });
  // compute normalized 0..1 using ref_low/high if present in raw; else window min/max
  let low: number | null = null;
  let high: number | null = null;
  for (const r of raw.filter((l) => String(l.test_name || '').toUpperCase() === target)) {
    if (r.ref_low != null && r.ref_high != null) {
      low = typeof r.ref_low === 'number' ? r.ref_low : Number(r.ref_low);
      high = typeof r.ref_high === 'number' ? r.ref_high : Number(r.ref_high);
      if (isFinite(low as number) && isFinite(high as number) && (high as number) > (low as number)) break;
      low = null; high = null;
    }
  }
  if (low == null || high == null) {
    const vals = out.map((r) => r.value);
    if (vals.length > 1) {
      low = Math.min(...vals);
      high = Math.max(...vals);
      if (high === low) high = low + 1;
    }
  }
  if (low != null && high != null && high > low) {
    for (const r of out) {
      const n = (r.value - low) / (high - low);
      r.normalized = Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
    }
  }
  return out;
}

function normalizeSymptoms(raw: any[], days: string[]): SymptomRow[] {
  type Agg = { sev: number; note?: string; ts: number };
  const byDayName: Record<string, Record<string, Agg>> = {};
  raw.forEach((s) => {
    const day = toYmd(s.logged_at);
    const name = String(s.symptom || '').trim();
    if (!name) return;
    const sev = Number(s.severity);
    if (!isFinite(sev)) return;
    const ts = new Date(String(s.logged_at).replace(' ', 'T')).getTime() || 0;
    if (!byDayName[day]) byDayName[day] = {};
    const prev = byDayName[day][name];
    if (!prev || sev > prev.sev || ts > prev.ts) {
      byDayName[day][name] = { sev, note: s.note || undefined, ts };
    }
  });
  const rows: SymptomRow[] = [];
  for (const d of days) {
    const map = byDayName[d];
    if (!map) continue;
    for (const [name, v] of Object.entries(map)) rows.push({ date: d, name, severity: v.sev, note: v.note });
  }
  return rows;
}

// Keep every symptom entry (no per-day collapsing) within the 28d frame
function listSymptomsRaw(raw: any[], days: string[]): SymptomRow[] {
  const set = new Set(days);
  const out: SymptomRow[] = [];
  for (const s of raw || []) {
    const day = toYmd((s as any).logged_at);
    if (!set.has(day)) continue;
    const name = String((s as any).symptom || '').trim();
    if (!name) continue;
    const sev = Number((s as any).severity);
    if (!isFinite(sev)) continue;
    out.push({ date: day, name, severity: sev, note: (s as any).note || undefined });
  }
  return out;
}

function normalizeGluten(raw: any[], days: string[]): GlutenRow[] {
  const arr: GlutenRow[] = [];
  raw.forEach((g) => {
    const day = toYmd(g.consumed_at || g.created_at);
    if (!days.includes(day)) return;
    // Prefer structured gluten_assessment text if available
    const { isLikely, level } = parseGlutenAssessment(g.gluten_assessment);
    const confFromAssessment = level === 'high' ? 0.9 : level === 'medium' ? 0.6 : level === 'low' ? 0.3 : null;
    // Fallback to result_tag mapping (GET /gluten_scans only returns result_tag)
    const tag = String(g.result_tag || '').toLowerCase();
    const tagLikely = tag.includes('gluten_likely') || (tag.includes('gluten') && tag.includes('likely'));
    const confFromTag = tagLikely ? 0.9 : tag.includes('gluten_unlikely') ? 0.3 : null;
    const conf = (confFromAssessment ?? confFromTag ?? numericConfidence(g.confidence));
    const suspect = isLikely || tagLikely || tag.includes('gluten');
    if (suspect && conf >= 0.6) {
      arr.push({ date: day, confidence: conf, type: 'suspect', keywords: (g.gluten_assessment || '').split(/[,.]/).filter(Boolean) });
    }
  });
  // keep last per day
  const lastByDay: Record<string, GlutenRow> = {};
  arr.forEach((r) => {
    lastByDay[r.date] = r;
  });
  return days.filter((d) => lastByDay[d]).map((d) => lastByDay[d]);
}

const EventCorrelationMap: React.FC<Props> = ({ labs, symptoms, glutenScans }) => {
  const [analyte, setAnalyte] = useState<string>('TSH');
  const [selectedAnalytes, setSelectedAnalytes] = useState<string[]>(['TSH']);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [activeCluster, setActiveCluster] = useState<Cluster | null>(null);
  const [hoverCluster, setHoverCluster] = useState<Cluster | null>(null);
  const [showSymptoms, setShowSymptoms] = useState<boolean>(true);
  const [showGluten, setShowGluten] = useState<boolean>(true);
  const [showClustersToggle, setShowClustersToggle] = useState<boolean>(true);

  // Build last 28 days window (ascending, including today)
  const days = useMemo(() => lastNDays(28), []);
  const daysMs = useMemo(() => days.map((d) => ymdToMs(d)), [days]);
  const frame = useMemo(() => days.map((d) => ({ date: d, x: ymdToMs(d) })), [days]);
  const tsToDate = useMemo(() => new Map(days.map((d) => [ymdToMs(d), d] as const)), [days]);

  if (import.meta.env.MODE !== 'production') {
    // Debug samples after YMD coercion
    // eslint-disable-next-line no-console
    console.debug('frame', frame.slice(0, 3), frame.slice(-3));
    // eslint-disable-next-line no-console
    console.debug('labs', (labs || []).slice(0, 3).map((l: any) => ({ ...l, test_date: toYmd(l.test_date) })));
    // eslint-disable-next-line no-console
    console.debug('symptoms', (symptoms || []).slice(0, 3).map((s: any) => ({ ...s, logged_at: toYmd(s.logged_at) })));
    // eslint-disable-next-line no-console
    console.debug('gluten', (glutenScans || []).slice(0, 3).map((g: any) => ({ ...g, created_at: toYmd(g.created_at) })));
  }

  // Available symptom names
  const allSymptomNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of symptoms || []) {
      const name = String((s as any).symptom || '').trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort();
  }, [symptoms]);

  // Normalize events into daily rows
  const data = useMemo(() => {
    const rows: Record<string, Row> = {};
    days.forEach((d) => (rows[d] = { date: d }));
    // normalized sources
    const labsN = normalizeLabs(labs || [], analyte, days);
    const symN = normalizeSymptoms(symptoms || [], days);
    const gluN = normalizeGluten(glutenScans || [], days);
    labsN.forEach((l) => {
      rows[l.date].lab = l.value;
      rows[l.date].labUnit = l.unit;
      rows[l.date].labStatus = l.status;
      rows[l.date].labDeltaPct = l.deltaPct ?? null;
    });
    const symByDay: Record<string, SymptomRow[]> = {};
    symN.forEach((s) => {
      (symByDay[s.date] ||= []).push(s);
    });
    Object.keys(symByDay).forEach((d) => {
      rows[d].severityPoints = symByDay[d].map((s) => ({ name: s.name, severity: s.severity, note: s.note }));
    });
    gluN.forEach((g) => {
      (rows[g.date].dietEvents ||= []).push({ type: 'gluten', confidence: g.confidence, keywords: (g.keywords || []).join(', ') });
    });
    return days.map((d) => rows[d]);
  }, [days, labs, symptoms, glutenScans, analyte]);

  // Datasets for layers (must use date from frame)
  const labsForChart = useMemo(() => (normalizeLabs(labs || [], analyte, days).map((r) => ({ ...r, x: ymdToMs(r.date) }))), [labs, analyte, days]);
  const labsOverlay = useMemo(() => {
    const set = new Set(selectedAnalytes.length ? selectedAnalytes : [analyte]);
    const out: Record<string, LabRow[]> = {};
    for (const a of set) out[a] = normalizeLabs(labs || [], a, days).map((r) => ({ ...r, x: ymdToMs(r.date) }));
    return out;
  }, [labs, selectedAnalytes, analyte, days]);
  const symptomsForChart = useMemo(() => {
    const set = new Set(selectedSymptoms.length ? selectedSymptoms : allSymptomNames);
    return listSymptomsRaw(symptoms || [], days).filter((s) => set.has(s.name)).map((s) => ({ ...s, x: ymdToMs(s.date) }));
  }, [symptoms, days, selectedSymptoms, allSymptomNames]);
  const glutenForChart = useMemo(() => normalizeGluten(glutenScans || [], days).map((g) => ({ ...g, x: ymdToMs(g.date) })), [glutenScans, days]);

  if (import.meta.env.MODE !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('labsForChart sample', labsForChart.slice(0, 3));
    // eslint-disable-next-line no-console
    console.debug('symptomsForChart sample', symptomsForChart.slice(0, 3));
    // eslint-disable-next-line no-console
    console.debug('glutenForChart sample', glutenForChart.slice(0, 3));
  }

  // Build scatter data for selected symptoms (or all if none selected)
  const selectedSet = useMemo(() => new Set(selectedSymptoms.length ? selectedSymptoms : allSymptomNames), [selectedSymptoms, allSymptomNames]);
  const symptomScatter = useMemo(() => {
    const pts: any[] = [];
    for (const row of data) {
      const arr = row.severityPoints || [];
      for (const p of arr) {
        if (!selectedSet.has(p.name)) continue;
        pts.push({ x: row.date, y: p.severity, name: p.name, note: p.note, radius: p.severity * 2 + 2, color: p.severity >= 4 ? COLORS.red : p.severity === 3 ? COLORS.amber : COLORS.green });
      }
    }
    return pts;
  }, [data, selectedSet]);

  // Nice Y axis for lab
  const { yMax, yTicks, yTickFormatter } = useMemo(() => {
    const vals = data.map((d) => d.lab).filter((v): v is number => typeof v === 'number' && isFinite(v));
    const maxRaw = vals.length ? Math.max(...vals) : 1;
    const chooseStep = (m: number) => {
      if (m <= 3) return 0.5;
      if (m <= 6) return 1;
      if (m <= 12) return 2;
      if (m <= 30) return 5;
      return 10;
    };
    const step = chooseStep(maxRaw);
    const niceMax = Math.max(step, Math.ceil(maxRaw / step) * step);
    const ticks: number[] = [];
    for (let t = 0; t <= niceMax + 1e-6; t += step) ticks.push(Number(t.toFixed(6)));
    const fmt = (v: any) => (typeof v === 'number' ? (step < 1 ? v.toFixed(1) : Math.round(v).toString()) : v);
    return { yMax: niceMax, yTicks: ticks, yTickFormatter: fmt as (v: any) => any };
  }, [data]);

  // Unit label for current analyte (from latest available entry)
  const labUnitLabel = useMemo(() => {
    // If comparing multiple analytes, mark as normalized
    if ((selectedAnalytes.length || 1) > 1) return 'normalized';
    const last = [...labsForChart].reverse().find((l) => !!l.unit);
    return last?.unit || '';
  }, [labsForChart, selectedAnalytes.length]);

  // Clustering heuristic v1 (anchor by symptom entries)
  const clusters = useMemo<Cluster[]>(() => {
    const results: Cluster[] = [];
    const idxMap = new Map(days.map((d, i) => [d, i] as const));

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const symptomsHere = (row.severityPoints || []).filter((p) => selectedSet.has(p.name));
      if (symptomsHere.length === 0) continue;
      const centerIdx = idxMap.get(row.date) ?? i;
      const leftIdx = Math.max(0, centerIdx - 1);
      const rightIdx = Math.min(days.length - 1, centerIdx + 1);

      // Collect members inside the window
      const memSymptoms: any[] = [];
      const memLabs: any[] = [];
      const memGluten: any[] = [];
      for (let j = leftIdx; j <= rightIdx; j++) {
        const r = data[j];
        // symptoms
        for (const p of r.severityPoints || []) {
          if (!selectedSet.has(p.name)) continue;
          const prevDay = days[j - 1];
          const prevRow = prevDay ? data[j - 1] : undefined;
          const prevPoint = prevRow?.severityPoints?.find((s) => s.name === p.name);
          const delta = prevPoint ? p.severity - prevPoint.severity : 0;
          if (Math.abs(delta) >= symptomDeltaThreshold) memSymptoms.push({ name: p.name, date: r.date, severity: p.severity, deltaSeverity: delta, note: p.note });
        }
        // lab events
        if (typeof r.lab === 'number') {
          const abnormal = (r.labStatus || '').toUpperCase() !== 'NORMAL';
          const bigDelta = Math.abs(r.labDeltaPct || 0) >= labDeltaThreshold;
          if (abnormal || bigDelta) memLabs.push({ analyte, date: r.date, value: r.lab, deltaPct: r.labDeltaPct ?? null, status: r.labStatus });
        }
        // gluten
        for (const e of r.dietEvents || []) {
          if (e.type === 'gluten' && e.confidence >= glutenConfidenceThreshold) memGluten.push({ date: r.date, confidence: e.confidence, keywords: e.keywords });
        }
      }

      const kindsHit = (memSymptoms.length > 0 ? 1 : 0) + (memLabs.length > 0 ? 1 : 0) + (memGluten.length > 0 ? 1 : 0);
      if (kindsHit >= 2) {
        const labUp = memLabs.some((l) => (l.deltaPct || 0) > 0);
        const symUp = memSymptoms.some((s) => (s.deltaSeverity || 0) > 0);
        const score = kindsHit + (labUp && symUp ? 0.5 : 0);
        const cluster: Cluster = {
          id: `${row.date}-${results.length + 1}`,
          time_window: { start: days[leftIdx], end: days[rightIdx] },
          members: { symptoms: memSymptoms, labs: memLabs, gluten: memGluten },
          score,
          ai: null,
        };
        results.push(cluster);
      }
    }
    // Merge overlapping windows
    const byStartIdx = [...results].sort((a, b) => (idxMap.get(a.time_window.start)! - idxMap.get(b.time_window.start)!));
    const merged: Cluster[] = [];
    for (const c of byStartIdx) {
      const startIdx = idxMap.get(c.time_window.start)!;
      const endIdx = idxMap.get(c.time_window.end)!;
      const last = merged[merged.length - 1];
      if (last) {
        const lastStart = idxMap.get(last.time_window.start)!;
        const lastEnd = idxMap.get(last.time_window.end)!;
        if (startIdx <= lastEnd) {
          // overlap → merge
          const newEnd = Math.max(lastEnd, endIdx);
          last.time_window.end = days[newEnd];
          last.members = {
            symptoms: [...last.members.symptoms, ...c.members.symptoms],
            labs: [...last.members.labs, ...c.members.labs],
            gluten: [...last.members.gluten, ...c.members.gluten],
          } as any;
          last.score = Math.max(last.score, c.score);
          continue;
        }
      }
      merged.push({ ...c });
    }
    return merged;
  }, [data, selectedSet, analyte, days]);

  if (import.meta.env.MODE !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('clusters', clusters.map((c) => ({ start: c.time_window.start, end: c.time_window.end, score: c.score })));
  }

  // Empty state
  const empty = data.every((r) => !r.lab && !(r.severityPoints && r.severityPoints.length) && !(r.dietEvents && r.dietEvents.length));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-black">Event Correlation Map</h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {ANALYTES.map((a) => (
              <button
                key={a}
                onClick={() => { setAnalyte(a); setSelectedAnalytes([a]); }}
                className={`px-2 py-0.5 text-xs rounded-full ${a === analyte ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                {a}
              </button>
            ))}
          </div>
          {allSymptomNames.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <span className="text-[11px] text-gray-600">Symptoms:</span>
              {allSymptomNames.slice(0, 6).map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setSelectedSymptoms((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
                  }
                  className={`px-2 py-0.5 text-[11px] rounded-full ${selectedSet.has(n) ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {empty ? (
        <div className="text-sm text-gray-600">No data in the last 28 days.</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px] relative">
            {hoverCluster && (
              <div className="absolute top-2 right-2 z-10 bg-white/95 border border-gray-200 rounded px-2 py-1 text-[11px] text-gray-700 shadow">
                C{clusters.findIndex((c) => c.id === hoverCluster.id) + 1} · score {hoverCluster.score.toFixed(1)} · {hoverCluster.time_window.start} → {hoverCluster.time_window.end}
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={frame} margin={{ top: 10, right: 7, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis
                  dataKey="x"
                  type="number"
                  scale="time"
                  domain={[daysMs[0], daysMs[daysMs.length - 1]] as any}
                  ticks={daysMs as any}
                  tick={{ fontSize: 12 }}
                  stroke={COLORS.grayText}
                  tickFormatter={(v: any) => msToMmDd(Number(v))}
                  interval="preserveStartEnd"
                  minTickGap={8}
                />
                <YAxis yAxisId="lab" width={40} domain={[0, yMax] as any} ticks={yTicks as any} tick={{ fontSize: 12 }} stroke={COLORS.grayText} tickFormatter={yTickFormatter as any} label={{ value: `${analyte}${labUnitLabel ? ` (${labUnitLabel})` : ''}`, angle: -90, position: 'insideLeft', fill: '#374151', fontSize: 10 }} />
                <YAxis yAxisId="sev" orientation="right" width={36} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} allowDecimals={false} tick={{ fontSize: 12 }} stroke={COLORS.grayText} />

                {/* Cluster highlights */}
                {showClustersToggle && clusters.map((c, idx) => (
                  <ReferenceArea
                    key={c.id}
                    x1={ymdToMs(c.time_window.start)}
                    x2={ymdToMs(c.time_window.end)}
                    yAxisId="sev"
                    y1={1}
                    y2={5}
                    fill={COLORS.neutralArea}
                    fillOpacity={activeCluster?.id === c.id ? 0.15 : 0.12}
                    stroke={activeCluster?.id === c.id ? '#6b7280' : undefined}
                    strokeOpacity={activeCluster?.id === c.id ? 1 : 0}
                    onClick={() => setActiveCluster(c)}
                    onMouseEnter={() => setHoverCluster(c)}
                    onMouseLeave={() => setHoverCluster((h) => (h?.id === c.id ? null : h))}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
                {showClustersToggle && clusters.map((c) => (
                  <ReferenceDot
                    key={`${c.id}-badge`}
                    x={ymdToMs(c.time_window.start)}
                    yAxisId="sev"
                    y={4.85}
                    r={16}
                    isFront
                    fill="#111827"
                    stroke="#111827"
                    strokeWidth={1}
                    onClick={() => setActiveCluster(c)}
                    onMouseEnter={() => setHoverCluster(c)}
                    onMouseLeave={() => setHoverCluster((h) => (h?.id === c.id ? null : h))}
                    label={{ value: 'more', position: 'inside', fill: '#ffffff', fontSize: 9 }}
                  />
                ))}

                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px' }}
                  content={({ active, label }) => {
                    if (!active || !label) return null;
                    const day = tsToDate.get(Number(label)) || toYmd(label as any);
                    const main = labsForChart.find((l) => l.date === day);
                    const labLines = (selectedAnalytes.length ? selectedAnalytes : [analyte]).map((a) => ({ a, row: labsOverlay[a].find((r) => r.date === day) })).filter((x) => !!x.row) as any[];
                    const syms = showSymptoms ? symptomsForChart.filter((s) => s.date === day).slice(0, 6) : [];
                    const glus = showGluten ? glutenForChart.filter((g) => g.date === day) : [];
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs">
                        <div className="font-medium text-black mb-1">{day}</div>
                        {labLines.length > 0 ? (
                          <div className="text-gray-800 mb-1 space-y-0.5">
                            {labLines.map(({ a, row }) => (
                              <div key={`tt-${a}`}>
                                <span className="font-medium" style={{ color: ANALYTE_COLORS[a] || COLORS.blue }}>{a}:</span> {row.value}{row.unit ? ` ${row.unit}` : ''}{row.deltaPct != null ? ` (${row.deltaPct}% vs prev)` : ''} {row.status ? `[${String(row.status).toUpperCase()}]` : ''}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {syms.length > 0 && (
                          <div className="text-gray-700 mb-1">Symptoms: {syms.map((s) => `${s.name} ${s.severity}`).join(', ')}</div>
                        )}
                        {glus.length > 0 && (
                          <div className="text-red-600">Gluten suspect · {glus.map((g) => `${Math.round(g.confidence * 100)}%`).join(', ')}</div>
                        )}
                      </div>
                    );
                  }}
                  labelFormatter={(l) => String(l)}
                />
                {/* Lab lines: single or multiple (normalized 0..1 when multiple) */}
                {(selectedAnalytes.length ? selectedAnalytes : [analyte]).map((a) => (
                  <Line
                    key={`lab-${a}`}
                    yAxisId="lab"
                    type="monotone"
                    data={(selectedAnalytes.length > 1 ? labsOverlay[a] : (a === analyte ? labsForChart : labsOverlay[a]))}
                    dataKey={(selectedAnalytes.length > 1 ? 'normalized' : 'value')}
                    name={a}
                    stroke={ANALYTE_COLORS[a] || COLORS.blue}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}

                {/* Symptoms as ReferenceDots anchored to frame categories */}
                {showSymptoms && symptomsForChart.map((pt, idx) => (
                  <ReferenceDot key={`${pt.date}-${pt.name}-${idx}`} x={ymdToMs(pt.date)} yAxisId="sev" isFront y={pt.severity} r={Math.max(3, pt.severity * 2)} fill={pt.severity >= 4 ? COLORS.red : pt.severity === 3 ? COLORS.amber : COLORS.green} fillOpacity={0.6} stroke="#fff" strokeWidth={1} />
                ))}

                {/* Gluten warning icons anchored to bottom of symptoms axis */}
                {showGluten && glutenForChart.map((pt, idx) => (
                  <ReferenceDot key={`g-${pt.date}-${idx}`} x={ymdToMs(pt.date)} yAxisId="sev" y={1} r={0} label={{ value: '⚠️', position: 'insideBottom', fill: '#ef4444' }} isFront />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Legend Panel */}
      <div className="mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-700 flex flex-wrap items-center justify-center gap-2">
        <span className="text-gray-600">Legend:</span>
        {/* Analyte lines */}
        <div className="flex items-center gap-1">
          {ANALYTES.map((a) => (
            <button
              key={`lg-${a}`}
              onClick={() => setSelectedAnalytes((prev) => {
                const has = prev.includes(a);
                const next = has ? prev.filter((x) => x !== a) : [...prev, a];
                return next.length === 0 ? [analyte] : Array.from(new Set(next));
              })}
              className={`px-2 py-0.5 rounded-full border ${ (selectedAnalytes.includes(a) || (!selectedAnalytes.length && a === analyte)) ? 'bg-white' : 'bg-gray-100' }`}
              style={{ borderColor: ANALYTE_COLORS[a], color: ANALYTE_COLORS[a] }}
              title={`Toggle ${a}`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: ANALYTE_COLORS[a] }} />{a}
            </button>
          ))}
        </div>
        {/* Symptoms toggle */}
        <button
          onClick={() => setShowSymptoms((v) => !v)}
          className={`px-2 py-0.5 rounded-full ${showSymptoms ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'}`}
        >
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS.green }} />Symptoms (severity)
        </button>
        {/* Gluten toggle */}
        <button
          onClick={() => setShowGluten((v) => !v)}
          className={`px-2 py-0.5 rounded-full ${showGluten ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'}`}
        >
          ⚠️ Gluten suspect
        </button>
        {/* Cluster toggle */}
        <button
          onClick={() => setShowClustersToggle((v) => !v)}
          className={`px-2 py-0.5 rounded-full ${showClustersToggle ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'}`}
        >
          <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: COLORS.neutralArea, opacity: 0.3 }} /> Cluster window
        </button>
      </div>

      {activeCluster && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setActiveCluster(null)}>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[360px] bg-white shadow-lg p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-black">Cluster Details</h4>
              <button className="text-gray-500 text-sm" onClick={() => setActiveCluster(null)}>Close</button>
            </div>
            <div className="text-xs text-gray-600 mb-2">Window: {activeCluster.time_window.start} → {activeCluster.time_window.end}</div>
            <div className="space-y-2 text-sm">
              <div>
                <div className="font-medium text-black mb-1">Symptoms</div>
                {activeCluster.members.symptoms.length === 0 ? <div className="text-gray-500 text-xs">None</div> : activeCluster.members.symptoms.map((s, i) => (
                  <div key={i} className="text-gray-700 text-xs">{s.date} · {s.name} · sev {s.severity}{s.deltaSeverity != null ? ` (${s.deltaSeverity >= 0 ? '+' : ''}${s.deltaSeverity})` : ''}</div>
                ))}
              </div>
              <div>
                <div className="font-medium text-black mb-1">Labs</div>
                {activeCluster.members.labs.length === 0 ? <div className="text-gray-500 text-xs">None</div> : activeCluster.members.labs.map((l, i) => (
                  <div key={i} className="text-gray-700 text-xs">{l.date} · {l.analyte}: {l.value}{l.deltaPct != null ? ` (${l.deltaPct}% vs prev)` : ''} [{l.status}]</div>
                ))}
              </div>
              <div>
                <div className="font-medium text-black mb-1">Gluten</div>
                {activeCluster.members.gluten.length === 0 ? <div className="text-gray-500 text-xs">None</div> : activeCluster.members.gluten.map((g, i) => (
                  <div key={i} className="text-gray-700 text-xs">{g.date} · conf {Math.round(g.confidence * 100)}% {g.keywords ? `· ${g.keywords}` : ''}</div>
                ))}
              </div>
              <div className="text-xs text-gray-700 mt-2">
                {summarizeCluster(activeCluster)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCorrelationMap;


