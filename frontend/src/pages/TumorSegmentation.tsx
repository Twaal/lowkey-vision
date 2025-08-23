import React, { useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import ResultsVisualization from '../components/ResultsVisualization';

const TumorSegmentation: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<File | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);

  const handleAnalyze = async (imageFile: File) => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentImage(imageFile);
    
    try {
      // Get image dimensions
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      await new Promise((resolve) => {
        img.onload = () => {
          setImageDimensions({
            width: img.width,
            height: img.height
          });
          resolve(null);
        };
      });

      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const blob = await response.blob();
      console.log('Received blob:', {
        type: blob.type,
        size: blob.size
      });

      // Debug: Check mask dimensions
      const maskImg = new Image();
      maskImg.src = URL.createObjectURL(blob);
      await new Promise((resolve) => {
        maskImg.onload = () => {
          console.log('Received mask dimensions:', {
            width: maskImg.width,
            height: maskImg.height
          });
          resolve(null);
        };
      });

      const maskUrl = URL.createObjectURL(blob);
      setHasResult(true);
      setMaskUrl(maskUrl);
    } catch (err) {
      console.error('Error during analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setIsAnalyzing(false);
    setHasResult(false);
    setMaskUrl(null);
    setError(null);
    setCurrentImage(null);
    setImageDimensions(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">PET Scan Tumor Segmentation</h1>
      <ImageUpload
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        onReset={handleReset}
        hasResult={hasResult}
        onMaskUpdate={setMaskUrl}
      />
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {maskUrl && hasResult && currentImage && imageDimensions && (
        <div className="mt-8">
          <h4 className="font-medium text-lg mb-4">Analysis Result</h4>
          <div className="bg-white p-4 rounded-lg shadow">
            <ResultsVisualization
              result={{
                originalImage: URL.createObjectURL(currentImage),
                segmentationMask: maskUrl,
                statistics: {
                  imageResolution: `${imageDimensions.width}x${imageDimensions.height}`,
                  totalTumorArea: 0,
                  tumorAreaPercentage: 0,
                  numberOfRegions: 0,
                  meanRegionSize: 0,
                  largestRegionSize: 0,
                  smallestRegionSize: 0,
                  analysisDate: new Date().toISOString()
                }
              }}
              isLoading={false}
              className="w-full object-contain max-h-96"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TumorSegmentation;