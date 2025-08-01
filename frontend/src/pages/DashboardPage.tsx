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
} from 'recharts';
import * as api from '../api';
import { useUser } from '../context/UserContext';
import StatsCards from '../components/StatsCards';

interface ChartDataPoint {
  date: string;
  value?: number;
}

/**
 * DashboardPage with modern mobile-first design matching Figma specs.
 * Features encouragement messages, stats cards, and clean layout.
 */
const DashboardPage: React.FC = () => {
  const [labs, setLabs] = useState<any[]>([]);
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [aiMessage, setAIMessage] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { logout } = useUser();
  const navigate = useNavigate();

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
        setAIMessage(aiData?.message ?? null);
        
        // Process TSH data for chart
        const tshLabs = labsData
          .filter((lab: any) => lab.test_name.toLowerCase().includes('tsh'))
          .map((lab: any) => ({
            date: lab.test_date,
            value: parseFloat(lab.result)
          }))
          .filter((point: ChartDataPoint) => !isNaN(point.value as number))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setChartData(tshLabs);
      } catch (err: any) {
        // Handle authentication errors
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

  return (
    <div className="space-y-6">
      {/* Encouragement Message */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-black mb-2">Encourage Message</h3>
        <p className="text-sm text-black font-medium leading-relaxed">
          great job,<br />
          You showed up for yourself today!
        </p>
        {aiMessage && (
          <div className="mt-3">
            <p className="text-sm text-black">{aiMessage}</p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {labs.length > 0 && (
        <div>
          <StatsCards labs={labs} />
        </div>
      )}

      {/* TSH Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-black mb-4">TSH Trend</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#666"
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: any) => [value, 'TSH']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2D6EFF" 
                strokeWidth={3}
                dot={{ fill: '#2D6EFF', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#2D6EFF' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm mb-2">No TSH data yet</p>
            <p className="text-gray-500 text-xs">Add your TSH lab results to see trends here</p>
            <Link 
              to="/add-entry" 
              className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              Add Lab Result
            </Link>
          </div>
        )}
      </div>

      {/* Recent Data Sections - Simplified */}
      {labs.length === 0 && symptoms.length === 0 && medications.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No data recorded yet.</p>
          <div className="space-y-2">
            <Link 
              to="/labs/new" 
              className="block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Your First Lab Result
            </Link>
            <Link 
              to="/symptoms/new" 
              className="block bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Log Your First Symptom
            </Link>
          </div>
        </div>
      )}
      
      {/* Quick Stats Summary */}
      {(labs.length > 0 || symptoms.length > 0 || medications.length > 0) && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-2xl font-semibold text-black">{labs.length}</p>
            <p className="text-xs text-gray-500">Lab Results</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-2xl font-semibold text-black">{symptoms.length}</p>
            <p className="text-xs text-gray-500">Symptoms</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-2xl font-semibold text-black">{medications.length}</p>
            <p className="text-xs text-gray-500">Medications</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;