import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useUser } from '../context/UserContext';

/**
 * NewSymptomPage allows users to record a new symptom.
 */
const NewSymptomPage: React.FC = () => {
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState<number>(1);
  const [note, setNote] = useState('');
  const commonSymptoms = [
    'fatigue',
    'palpitations',
    'cold intolerance',
    'insomnia',
    'low mood',
    'constipation',
    'weight change',
    'hair loss',
  ];
  type SelectedSymptom = { name: string; severity: number; note: string };
  const [selected, setSelected] = useState<Record<string, SelectedSymptom>>({});

  const toggleSymptom = (name: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[name]) {
        delete next[name];
      } else {
        next[name] = { name, severity: 3, note: '' };
      }
      return next;
    });
  };

  const updateSelectedSeverity = (name: string, value: number) => {
    setSelected((prev) => ({ ...prev, [name]: { ...prev[name], severity: value } }));
  };
  const updateSelectedNote = (name: string, value: string) => {
    setSelected((prev) => ({ ...prev, [name]: { ...prev[name], note: value } }));
  };
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { logout } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entries: SelectedSymptom[] = Object.values(selected);
    const hasGridSelection = entries.length > 0;
    const hasSingleInput = symptom.trim().length > 0;
    if (!hasGridSelection && !hasSingleInput) {
      setError('Please pick at least one symptom or enter one manually');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (hasGridSelection) {
        // Submit each selected symptom
        for (const it of entries) {
          // eslint-disable-next-line no-await-in-loop
          await api.createSymptom({
            symptom: it.name,
            severity: it.severity,
            note: it.note || undefined,
          });
        }
      }
      if (hasSingleInput) {
        await api.createSymptom({
          symptom: symptom.trim(),
          severity,
          note: note.trim() || undefined,
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      // Handle authentication errors
      if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
        await logout();
        navigate('/login');
        return;
      }
      setError(err.message || 'Failed to save symptom');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold text-black mb-4">Record New Symptom</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Common symptoms grid */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {commonSymptoms.map((s) => {
              const active = Boolean(selected[s]);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSymptom(s)}
                  className={`px-2 py-1 text-sm rounded border ${
                    active ? 'bg-gray-200 border-gray-300 text-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {/* Per selected symptom controls */}
          <div className="mt-3 space-y-3">
            {Object.values(selected).map((item) => (
              <div key={item.name} className="border border-gray-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleSymptom(item.name)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    remove
                  </button>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1">Severity (1-5)</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={item.severity}
                    onChange={(e) => updateSelectedSeverity(item.name, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={item.note}
                    onChange={(e) => updateSelectedNote(item.name, e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {Object.keys(selected).length === 0 && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="symptom">Symptom</label>
              <input
                id="symptom"
                type="text"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="e.g. fatigue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="severity">Severity</label>
              <input
                id="severity"
                type="range"
                min={1}
                max={5}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">1 (mild) to 5 (severe)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="note">Note (optional)</label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={3}
              />
            </div>
          </>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Symptom'}
        </button>
      </form>
      </div>
    </div>
  );
};

export default NewSymptomPage;