import React, { useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import ResultsVisualization from '../components/ResultsVisualization';
import StatisticsPanel from '../components/StatisticsPanel';
import { AnalysisResult } from '../types/analysis';

const TumorSegmentation = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageAnalyze = async (imageFile: File) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock analysis result
      const mockResult: AnalysisResult = {
        originalImage: URL.createObjectURL(imageFile),
        segmentationMask: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // Placeholder
        statistics: {
          totalTumorArea: 1250.5,
          tumorAreaPercentage: 12.4,
          numberOfRegions: 3,
          meanRegionSize: 416.8,
          largestRegionSize: 680.2,
          smallestRegionSize: 153.1,
          imageResolution: '2048x1536',
          analysisDate: new Date().toISOString()
        }
      };

      setAnalysisResult(mockResult);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Tumor Segmentation Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Upload your microscope images to detect and analyze tumor regions using our advanced AI models.
            Get detailed segmentation overlays and comprehensive statistics in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Image Upload & Analysis
              </h2>
              <ImageUpload
                onAnalyze={handleImageAnalyze}
                isAnalyzing={isAnalyzing}
                onReset={handleReset}
                hasResult={!!analysisResult}
              />
            </div>

            {/* Results Visualization */}
            {(analysisResult || isAnalyzing) && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Analysis Results
                </h2>
                <ResultsVisualization
                  result={analysisResult}
                  isLoading={isAnalyzing}
                />
              </div>
            )}
          </div>

          {/* Statistics Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Statistics
              </h2>
              <StatisticsPanel
                statistics={analysisResult?.statistics}
                isLoading={isAnalyzing}
              />
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            About Tumor Segmentation Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
            <div>
              <h4 className="font-medium mb-2">Supported File Types</h4>
              <p className="text-sm leading-relaxed">
                JPEG, PNG, and TIFF images up to 20MB. Optimal results with high-resolution
                microscope images (minimum 1024x1024 pixels).
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Analysis Features</h4>
              <p className="text-sm leading-relaxed">
                Automated tumor detection, precise segmentation masks, morphological analysis,
                and comprehensive statistical reporting.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Privacy</h4>
              <p className="text-sm leading-relaxed">
                All uploaded images are processed securely and automatically deleted after
                analysis completion. No data is stored permanently.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Export Options</h4>
              <p className="text-sm leading-relaxed">
                Download segmented images with overlays and comprehensive statistics in CSV
                format for further analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TumorSegmentation;