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

          {/* Quick Actions */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/gluten-snap"
                className="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors text-center"
              >
                <div className="text-lg mb-1">📸</div>
                <div className="text-sm font-medium text-black">Gluten Snap</div>
              </Link>
              <Link
                to="/trends"
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors text-center"
              >
                <div className="text-lg mb-1">📊</div>
                <div className="text-sm font-medium text-black">Detailed Trends</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEntryPage;