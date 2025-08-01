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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { logout } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom.trim()) {
      setError('Symptom description is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.createSymptom({
        symptom: symptom.trim(),
        severity,
        note: note.trim() || undefined,
      });
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
            type="number"
            min={0}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500">0 (mild) to 10 (severe)</p>
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