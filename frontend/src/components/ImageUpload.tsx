import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';

interface ImageUploadProps {
  onAnalyze: (file: File) => Promise<void>;
  isAnalyzing: boolean;
  onReset: () => void;
  hasResult: boolean;
  guidelines?: React.ReactNode; // Optional custom guidelines content
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onAnalyze,
  isAnalyzing,
  onReset,
  hasResult,
  guidelines
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff'];

    if (file.size > maxSize) {
      return 'File size must be less than 20MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and TIFF files are supported';
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    onAnalyze(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    onReset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!selectedFile && (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-200 cursor-pointer ${
            dragActive
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.tiff"
            onChange={handleInputChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-teal-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your image here, or click to browse
              </p>
              <p className="text-gray-500">
                Supports JPEG, PNG, and TIFF files up to 20MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && previewUrl && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <ImageIcon className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
              disabled={isAnalyzing}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-64 object-contain bg-white rounded-lg border"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Analyzing image...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {selectedFile && (
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Run Analysis
              </>
            )}
          </button>
        )}
        
        {hasResult && (
          <button
            onClick={handleReset}
            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Analyze New Image
          </button>
        )}
      </div>

      {/* Upload Guidelines */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-3">Upload Guidelines</h3>
        {guidelines ? (
          <div className="text-sm text-gray-700 space-y-2">{guidelines}</div>
        ) : (
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Ensure images are in focus with clear contrast between cells and background (e.g., hemocytometer grid)</span>
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Images are automatically deleted after analysis for your privacy</span>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;