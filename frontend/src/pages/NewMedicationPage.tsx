import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';

const NewMedicationPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('Levothyroxine');
  const [dose, setDose] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().slice(0, 16)); // yyyy-MM-ddTHH:mm
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dosePresets = ['25 mcg', '50 mcg', '75 mcg', '100 mcg'];
  const freqPresets = [
    { label: 'Morning', value: 'morning' },
    { label: 'Evening', value: 'evening' },
    { label: 'Every other day', value: 'qod' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Medication name is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.createMedication({
        medication_name: name.trim(),
        dose: dose.trim() || undefined,
        time_of_day: timeOfDay || undefined,
        taken_at: takenAt ? new Date(takenAt).toISOString() : undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save medication');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold text-black mb-4">Record Medication</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="name">Medication</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g. Levothyroxine"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-1" htmlFor="dose">Dose</label>
              <div className="flex flex-wrap gap-2">
                {dosePresets.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDose(d)}
                    className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <input
              id="dose"
              type="text"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g. 75 mcg"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-1" htmlFor="time">Time of day</label>
              <div className="flex flex-wrap gap-2">
                {freqPresets.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setTimeOfDay(f.value)}
                    className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              id="time"
              type="text"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g. morning"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="takenAt">Taken at</label>
            <input
              id="takenAt"
              type="datetime-local"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Medication'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewMedicationPage;


