import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';

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