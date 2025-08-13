export interface AnalysisStatistics {
  totalTumorArea: number; // in μm²
  tumorAreaPercentage: number; // percentage of total image
  numberOfRegions: number;
  meanRegionSize: number; // in μm²
  largestRegionSize: number; // in μm²
  smallestRegionSize: number; // in μm²
  imageResolution: string; // e.g., "2048x1536"
  analysisDate: string; // ISO string
}

export interface AnalysisResult {
  originalImage: string; // URL or base64
  segmentationMask: string; // URL or base64 of the mask
  statistics: AnalysisStatistics;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  acceptedFileTypes: string[];
  maxFileSize: number; // in bytes
  endpoint: string;
}