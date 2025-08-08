import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AddEntryPage allows users to choose what type of entry to add.
 * Provides options for Lab Results, Symptoms, and quick access to other features.
 */
const AddEntryPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold text-black mb-4">Add New Entry</h1>
        <p className="text-sm text-gray-600 mb-6">Choose what you'd like to record today:</p>
        
        <div className="space-y-4">
          {/* Lab Result Option */}
          <Link
            to="/labs/new"
            className="block bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🔬</span>
              </div>
              <div>
                <h3 className="font-semibold text-black">Lab Result</h3>
                <p className="text-sm text-gray-600">Record TSH, FT4, FT3, TPOAb, or any other lab values</p>
              </div>
            </div>
          </Link>

          {/* Symptom Option */}
          <Link
            to="/symptoms/new"
            className="block bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">😵</span>
              </div>
              <div>
                <h3 className="font-semibold text-black">Symptom</h3>
                <p className="text-sm text-gray-600">Log fatigue, mood, pain, or other symptoms you're experiencing</p>
              </div>
            </div>
          </Link>

          {/* Quick Actions removed per design update */}
        </div>
      </div>
    </div>
  );
};

export default AddEntryPage;