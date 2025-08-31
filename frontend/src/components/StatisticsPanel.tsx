import React from 'react';
import { Download, BarChart3, Target, Layers, Ruler } from 'lucide-react';
import { AnalysisStatistics } from '../types/analysis';

interface StatisticsPanelProps {
  statistics: AnalysisStatistics | null;
  isLoading: boolean;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  statistics,
  isLoading
}) => {
  const handleDownloadCSV = () => {
    if (!statistics) return;

    const csvContent = [
      ['Metric', 'Value', 'Unit'],
      ['Total Cell Area', statistics.totalCellArea.toString(), 'μm²'],
      ['Cell Coverage %', statistics.cellCoveragePercentage.toString(), '%'],
      ['Detections', statistics.numberOfDetections.toString(), 'count'],
      ['Mean Cell Area', statistics.meanCellArea.toString(), 'μm²'],
      ['Largest Cell Area', statistics.largestCellArea.toString(), 'μm²'],
      ['Smallest Cell Area', statistics.smallestCellArea.toString(), 'μm²'],
      ['Image Resolution', statistics.imageResolution, 'pixels'],
      ['Analysis Date', new Date(statistics.analysisDate).toLocaleString(), '']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
  link.download = `cell_analysis_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-gray-200">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Statistics Available</h3>
        <p className="text-gray-500 text-sm">
          Run an image analysis to see detailed statistics here.
        </p>
      </div>
    );
  }

  const statisticsData = [
    {
      icon: Target,
      label: 'Total Cell Area',
      value: `${statistics.totalCellArea.toLocaleString()} μm²`,
      color: 'text-teal-700'
    },
    {
      icon: BarChart3,
      label: 'Cell Coverage',
      value: `${statistics.cellCoveragePercentage}%`,
      color: 'text-orange-600'
    },
    {
      icon: Layers,
      label: 'Detections',
      value: statistics.numberOfDetections.toString(),
      color: 'text-blue-600'
    },
    {
      icon: Ruler,
      label: 'Mean Cell Area',
      value: `${statistics.meanCellArea.toLocaleString()} μm²`,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Statistics */}
      <div className="space-y-4">
        {statisticsData.map((stat, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className={`p-2 rounded-lg bg-white ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {stat.label}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Statistics */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Largest Cell:</span>
            <span className="font-medium text-gray-900">
              {statistics.largestCellArea.toLocaleString()} μm²
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Smallest Cell:</span>
            <span className="font-medium text-gray-900">
              {statistics.smallestCellArea.toLocaleString()} μm²
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Size Variation:</span>
            <span className="font-medium text-gray-900">
              {(statistics.largestCellArea / statistics.smallestCellArea).toFixed(1)}x
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Resolution:</span>
            <span className="font-medium text-gray-900">
              {statistics.imageResolution}
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Info */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Analyzed:</span>
            <span className="font-medium text-gray-900">
              {new Date(statistics.analysisDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Time:</span>
            <span className="font-medium text-gray-900">
              {new Date(statistics.analysisDate).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="border-t border-gray-200 pt-6">
        <button
          onClick={handleDownloadCSV}
          className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV Report
        </button>
      </div>

      {/* Visual Summary */}
      <div className="bg-teal-50 rounded-lg p-4">
        <h4 className="font-medium text-teal-900 mb-3">Quick Summary</h4>
        <div className="text-sm text-teal-800 space-y-2">
          <p>
            • <span className="font-medium">{statistics.numberOfDetections} cells</span> detected
          </p>
          <p>
            • <span className="font-medium">{statistics.cellCoveragePercentage}% area coverage</span> by detected cells
          </p>
          <p>
            • Mean cell area <span className="font-medium">{statistics.meanCellArea.toLocaleString()} μm²</span>
          </p>
          {statistics.numberOfDetections > 1 && (
            <p>
              • Size range {statistics.smallestCellArea.toLocaleString()} – {statistics.largestCellArea.toLocaleString()} μm²
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;