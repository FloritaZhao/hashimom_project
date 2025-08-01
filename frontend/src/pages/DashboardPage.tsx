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
  [key: string]: any; // Allow any other keys for different tests
}

const DashboardPage: React.FC = () => {
  const [labs, setLabs] = useState<any[]>([]);
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [aiMessage, setAIMessage] = useState<string | null>(
    "You're doing great! Keep tracking your health journey. 💪"
  );
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activeChart, setActiveChart] = useState<string>('TSH');
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
        if (aiData?.message) {
          setAIMessage(aiData.message);
        }

        const processedChartData = labsData
          .filter(
            (lab: any) =>
              lab.test_name && typeof lab.test_name === 'string' && !isNaN(parseFloat(lab.result))
          )
          .map((lab: any) => ({
            date: new Date(lab.test_date).toISOString().split('T')[0],
            value: parseFloat(lab.result),
            name: lab.test_name.toUpperCase(),
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Group by date
        const groupedByDate: { [date: string]: ChartDataPoint } = {};
        processedChartData.forEach((d) => {
          if (!groupedByDate[d.date]) {
            groupedByDate[d.date] = { date: d.date };
          }
          groupedByDate[d.date][d.name] = d.value;
        });

        setChartData(Object.values(groupedByDate));
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
  }, [logout, navigate]);

  const yAxisTickFormatter = (value: any) => {
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    return value;
  };

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

  const uniqueTests = [...new Set(chartData.flatMap(d => Object.keys(d).filter(k => k !== 'date')))];

  return (
    <div className="space-y-6">
      {/* Encouragement Message */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-black mb-2">Encourage Message</h3>
        {aiMessage && <p className="text-sm text-black">{aiMessage}</p>}
      </div>

      {/* Stats Cards */}
      {labs.length > 0 && (
        <div>
          <StatsCards labs={labs} />
        </div>
      )}

      {/* Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-black">TSH Trends</h3>
          {uniqueTests.length > 1 && (
            <div className="flex space-x-2">
              {uniqueTests.map(test => (
                <button
                  key={test}
                  onClick={() => setActiveChart(test)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    activeChart === test ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {test}
                </button>
              ))}
            </div>
          )}
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickFormatter={yAxisTickFormatter}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: any, name: any) => [value, name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey={activeChart}
                stroke="#2D6EFF"
                strokeWidth={2}
                dot={{ fill: '#2D6EFF', r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-center p-6">
            <p>No lab data to display trends.</p>
          </div>
        )}
      </div>

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