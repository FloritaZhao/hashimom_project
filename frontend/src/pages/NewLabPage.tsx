import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useQuery } from '@tanstack/react-query';

/**
 * NewLabPage provides a form for users to record a new lab result.
 */
const NewLabPage: React.FC = () => {
  const navigate = useNavigate();
  const [testName, setTestName] = useState('');
  const [result, setResult] = useState('');
  const [units, setUnits] = useState('');
  const [testDate, setTestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const presets = [
    { name: 'TSH', unit: 'mIU/L' },
    { name: 'FT4', unit: 'ng/dL' },
    { name: 'TPOAb', unit: 'IU/mL' },
    { name: 'TgAb', unit: 'IU/mL' },
  ];

  const applyPreset = (name: string, unit: string) => {
    setTestName(name);
    setUnits((prev) => prev || unit);
  };

  // Reference ranges (placeholder) for quick hinting by trimester
  // Values are examples; backend authoritative ranges will be attached on save/list
  const REF_HINT: Record<string, Record<'T1' | 'T2' | 'T3', { low: number; high: number; unit: string }>> = {
    TSH: {
      T1: { low: 0.1, high: 2.5, unit: 'mIU/L' },
      T2: { low: 0.2, high: 3.0, unit: 'mIU/L' },
      T3: { low: 0.3, high: 3.5, unit: 'mIU/L' },
    },
    FT4: {
      T1: { low: 0.8, high: 1.7, unit: 'ng/dL' },
      T2: { low: 0.7, high: 1.6, unit: 'ng/dL' },
      T3: { low: 0.7, high: 1.5, unit: 'ng/dL' },
    },
    TPOAb: {
      T1: { low: 0, high: 35, unit: 'IU/mL' },
      T2: { low: 0, high: 35, unit: 'IU/mL' },
      T3: { low: 0, high: 35, unit: 'IU/mL' },
    },
    TgAb: {
      T1: { low: 0, high: 40, unit: 'IU/mL' },
      T2: { low: 0, high: 40, unit: 'IU/mL' },
      T3: { low: 0, high: 40, unit: 'IU/mL' },
    },
  };

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const refHint = useMemo(() => {
    const tri = profile?.trimester;
    const key = testName.toUpperCase();
    if (!tri || tri === '-' || !['T1', 'T2', 'T3'].includes(tri)) return null;
    const m = (REF_HINT as any)[key]?.[tri as 'T1' | 'T2' | 'T3'];
    if (!m) return null;
    return m;
  }, [profile?.trimester, testName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim() || !result.trim()) {
      setError('Test name and result are required');
      return;
    }
    try {
      await api.createLab({ test_name: testName, result, units: units || undefined, test_date: testDate });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save lab');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold text-black mb-4">Record New Lab Result</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Preset analytes */}
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p.name, p.unit)}
              className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              {p.name}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="testName">Test Name</label>
          <input
            id="testName"
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="e.g. TSH"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="result">Result</label>
          <input
            id="result"
            type="text"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="e.g. 3.2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="units">Units (optional)</label>
          <input
            id="units"
            type="text"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="e.g. μIU/mL"
          />
          {refHint && (
            <p className="mt-1 text-xs text-gray-500">
              Reference ({profile?.trimester}): {refHint.low} – {refHint.high} {refHint.unit}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="testDate">Test Date</label>
          <input
            id="testDate"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors">
          Save Lab
        </button>
      </form>
      </div>
    </div>
  );
};

export default NewLabPage;