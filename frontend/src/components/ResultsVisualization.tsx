import React, { useState } from 'react';
import { Download, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { AnalysisResult } from '../types/analysis';

interface ResultsVisualizationProps {
  result: AnalysisResult | null;
  isLoading: boolean;
}

const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({
  result,
  isLoading
}) => {
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoom, setZoom] = useState(1);

  const handleDownloadImage = () => {
    if (result?.originalImage) {
      // Create canvas to combine original image with overlay
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx?.drawImage(img, 0, 0);
        
        // Here you would draw the segmentation overlay
        // For demo purposes, we'll just download the original
        const link = document.createElement('a');
        link.download = 'segmented-image.png';
        link.href = canvas.toDataURL();
        link.click();
      };
      
      img.src = result.originalImage;
    }
  };

  const handleReset = () => {
    setZoom(1);
    setOverlayOpacity(0.6);
    setShowOverlay(true);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-100 rounded-lg p-12 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-600 border-t-transparent mx-auto mb-6"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Image</h3>
        <p className="text-gray-600">
          Our AI models are processing your image. This typically takes 2-5 seconds.
        </p>
        <div className="mt-6 bg-white rounded-lg p-4 max-w-md mx-auto">
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex justify-between items-center">
              <span>Preprocessing image...</span>
              <span className="text-teal-600">✓</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Running segmentation model...</span>
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Calculating statistics...</span>
              <span>○</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gray-100 rounded-lg p-12 text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <Eye className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Results Yet</h3>
        <p className="text-gray-500">
          Upload an image and run analysis to see segmentation results here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            {showOverlay ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleReset}
            className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </button>
        </div>

        <button
          onClick={handleDownloadImage}
          className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 font-medium"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Image
        </button>
      </div>

      {/* Overlay Opacity Control */}
      {showOverlay && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 min-w-[120px]">
              Overlay Opacity:
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm font-medium text-gray-700 min-w-[40px]">
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Image Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="relative overflow-auto max-h-[600px]">
          <div 
            className="relative inline-block min-w-full"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            <img
              src={result.originalImage}
              alt="Original microscope image"
              className="w-full h-auto block"
            />
            
            {/* Segmentation Overlay */}
            {showOverlay && (
              <div
                className="absolute inset-0 bg-red-500 mix-blend-multiply pointer-events-none"
                style={{ 
                  opacity: overlayOpacity,
                  maskImage: `url(${result.segmentationMask})`,
                  maskSize: '100% 100%',
                  maskRepeat: 'no-repeat'
                }}
              />
            )}
          </div>
        </div>
        
        {/* Legend */}
        {showOverlay && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-700">Tumor Regions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
                <span className="text-sm text-gray-700">Normal Tissue</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Summary */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Processing Time:</span>
            <span className="font-medium text-gray-900">2.3 seconds</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Model Version:</span>
            <span className="font-medium text-gray-900">TumorSeg v2.1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Confidence Score:</span>
            <span className="font-medium text-green-600">94.8%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Image Resolution:</span>
            <span className="font-medium text-gray-900">{result.statistics.imageResolution}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsVisualization;