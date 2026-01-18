export interface AnalysisStatistics {
  totalCellArea: number;
  cellCoveragePercentage: number;
  numberOfDetections: number;
  meanCellArea: number;
  largestCellArea: number;
  smallestCellArea: number;
  imageResolution: string;
  analysisDate: string;
}

export interface AnalysisResult {
  originalImage: string;
  segmentationMask: string;
  statistics: AnalysisStatistics;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  acceptedFileTypes: string[];
  maxFileSize: number;
  endpoint: string;
}