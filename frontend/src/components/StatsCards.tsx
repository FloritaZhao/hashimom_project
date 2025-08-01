import React from 'react';

interface StatsCardsProps {
  labs: any[];
}

/**
 * Stats cards component displaying recent lab values in card format.
 * Matches Figma design with lab values and percentage changes.
 */
const StatsCards: React.FC<StatsCardsProps> = ({ labs }) => {
  // Get the most recent values for each test type
  const getLatestValue = (testName: string) => {
    const testLabs = labs.filter(lab => 
      lab.test_name.toLowerCase().includes(testName.toLowerCase())
    ).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
    
    return testLabs.length > 0 ? testLabs[0] : null;
  };

  const calculatePercentageChange = (testName: string) => {
    const testLabs = labs.filter(lab => 
      lab.test_name.toLowerCase().includes(testName.toLowerCase())
    ).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
    
    if (testLabs.length < 2) return null;
    
    const latest = parseFloat(testLabs[0].result);
    const previous = parseFloat(testLabs[1].result);
    
    if (isNaN(latest) || isNaN(previous) || previous === 0) return null;
    
    const change = ((latest - previous) / previous) * 100;
    return Math.round(change);
  };

  const testTypes = [
    { name: 'TSH', key: 'tsh' },
    { name: 'FT4', key: 'ft4' },
    { name: 'TPOAb', key: 'tpo' },
    { name: 'FT3', key: 'ft3' }
  ];

  const StatCard: React.FC<{ testName: string; testKey: string }> = ({ testName, testKey }) => {
    const latestLab = getLatestValue(testKey);
    const percentageChange = calculatePercentageChange(testKey);
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-[82px] flex-1">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-black">{testName}</h3>
          <p className="text-2xl font-semibold text-black leading-tight">
            {latestLab ? latestLab.result : '--'}
          </p>
          {percentageChange !== null && (
            <p className="text-xs font-medium text-gray-500">
              {percentageChange > 0 ? '+' : ''}{percentageChange}%
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* First row: TSH and FT4 */}
      <div className="flex gap-3">
        <StatCard testName="TSH" testKey="tsh" />
        <StatCard testName="FT4" testKey="ft4" />
      </div>
      
      {/* Second row: TPOAb and FT3 */}
      <div className="flex gap-3">
        <StatCard testName="TPOAb" testKey="tpo" />
        <StatCard testName="FT3" testKey="ft3" />
      </div>
    </div>
  );
};

export default StatsCards;