import { type FC } from 'react';
import { type AnalysisResult } from '../types/analysis';

interface ResultsVisualizationProps {
  result: AnalysisResult | null;
  isLoading: boolean;
}

const ResultsVisualization: FC<ResultsVisualizationProps> = ({
  result,
  isLoading,
}: ResultsVisualizationProps) => {
  if (isLoading) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing image...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-500">Upload an image to see results</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="relative h-64">  {/* Match ImageUpload preview height */}
          <div className="relative w-full h-full">
            <img
              src={result.originalImage}
              alt="Original microscope image"
              className="w-full h-full object-contain"
            />
            <img
              src={result.segmentationMask}
              alt="Cell mask overlay"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: 0.5 }}
            />
          </div>
        </div>
      </div>
      
      {/* Basic Stats */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Image Resolution:</span>
            <span className="font-medium">{result.statistics.imageResolution}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsVisualization;