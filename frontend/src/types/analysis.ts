export interface AnalysisStatistics {
  totalCellArea: number; // in μm² (summed area of detected cells when available)
  cellCoveragePercentage: number; // percentage of total image covered by detected cells
  numberOfDetections: number; // count of detected cell objects
  meanCellArea: number; // in μm²
  largestCellArea: number; // in μm²
  smallestCellArea: number; // in μm²
  imageResolution: string; // e.g., "2048x1536"
  analysisDate: string; // ISO string
}

export interface AnalysisResult {
  originalImage: string; // URL or base64
  segmentationMask: string; // URL or base64 (could be density / mask overlay)
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