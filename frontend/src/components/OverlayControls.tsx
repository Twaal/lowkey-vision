import React from 'react';

interface OverlayControlsProps {
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  showBoxes: boolean; setShowBoxes: (v: boolean) => void;
  showLabels: boolean; setShowLabels: (v: boolean) => void;
  strokeWidth: number; setStrokeWidth: (v: number) => void;
  scale: number; setScale: (v: number) => void;
  annotationMode?: boolean; setAnnotationMode?: (v: boolean) => void;
  newBoxClass?: string; setNewBoxClass?: (v: string) => void;
  minScore: number; setMinScore: (v: number) => void;
  minArea: number; setMinArea: (v: number) => void;
  iouThreshold: number; setIouThreshold: (v: number) => void;
  availableClasses: string[];
  selectedClasses: Set<string>;
  toggleClass: (name: string) => void;
  extraLeftButtons?: React.ReactNode;
  extraRightButtons?: React.ReactNode;
  showAnnotationControls?: boolean;
}

const OverlayControls: React.FC<OverlayControlsProps> = ({
  showAdvanced,
  setShowAdvanced,
  showBoxes, setShowBoxes,
  showLabels, setShowLabels,
  strokeWidth, setStrokeWidth,
  scale, setScale,
  annotationMode, setAnnotationMode,
  newBoxClass, setNewBoxClass,
  minScore, setMinScore,
  minArea, setMinArea,
  iouThreshold, setIouThreshold,
  availableClasses,
  selectedClasses,
  toggleClass,
  extraLeftButtons,
  extraRightButtons,
  showAnnotationControls = true
}: OverlayControlsProps) => {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  return (
    <div className="mb-4 space-y-3 bg-white border rounded p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm px-3 py-1 border rounded hover:bg-gray-50">
          {showAdvanced ? 'Hide Advanced' : 'Advanced'}
        </button>
        <label className="flex items-center space-x-2 text-sm">
          <input type="checkbox" checked={showBoxes} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setShowBoxes(e.target.checked)} />
          <span>Show Boxes</span>
        </label>
        <label className="flex items-center space-x-2 text-sm">
          <input type="checkbox" checked={showLabels} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setShowLabels(e.target.checked)} />
          <span>Show Labels</span>
        </label>
        <label className="flex items-center space-x-2 text-sm">
          <span>BBox {strokeWidth}px</span>
          <input type="range" min={1} max={8} step={1} value={strokeWidth} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setStrokeWidth(parseInt(e.target.value))} />
          <input type="number" min={1} max={8} value={strokeWidth} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setStrokeWidth(clamp(parseInt(e.target.value)||1,1,8))} className="w-14 border rounded px-1 py-0.5 text-xs" />
          <div className="flex flex-col">
            <button type="button" onClick={()=>setStrokeWidth(clamp(strokeWidth+1,1,8))} className="text-xs border rounded-t px-1">+</button>
            <button type="button" onClick={()=>setStrokeWidth(clamp(strokeWidth-1,1,8))} className="text-xs border rounded-b px-1">-</button>
          </div>
        </label>
        <label className="flex items-center space-x-2 text-sm">
          <span>Zoom {(scale*100).toFixed(0)}%</span>
          <input type="range" min={0.25} max={4} step={0.05} value={scale} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setScale(parseFloat(e.target.value))} />
          <input type="number" min={25} max={400} value={Math.round(scale*100)} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setScale(clamp((parseInt(e.target.value)||25)/100,0.25,4))} className="w-18 border rounded px-1 py-0.5 text-xs" />
          <div className="flex flex-col">
            <button type="button" onClick={()=>setScale(clamp(parseFloat((scale+0.05).toFixed(2)),0.25,4))} className="text-xs border rounded-t px-1">+</button>
            <button type="button" onClick={()=>setScale(clamp(parseFloat((scale-0.05).toFixed(2)),0.25,4))} className="text-xs border rounded-b px-1">-</button>
          </div>
        </label>
        {showAnnotationControls && setAnnotationMode && setNewBoxClass && (
          <>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={!!annotationMode} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setAnnotationMode(e.target.checked)} />
              <span>Annotate</span>
            </label>
            {annotationMode && (
              <label className="flex items-center space-x-2 text-sm">
                <span>Class</span>
                <select value={newBoxClass} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setNewBoxClass(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  <option value="Alive">Alive</option>
                  <option value="Dead">Dead</option>
                </select>
              </label>
            )}
          </>
        )}
        {extraLeftButtons}
        <div className="ml-auto flex gap-2">{extraRightButtons}</div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {Array.from(new Set(availableClasses)).map(name => {
          const active = selectedClasses.has(name);
          return <button key={name} onClick={()=>toggleClass(name)} className={`px-3 py-1 rounded border transition ${active? 'bg-teal-600 text-white border-teal-600':'bg-white text-gray-700 border-gray-300 hover:border-teal-500'}`}>{name}</button>;
        })}
      </div>
      {showAdvanced && (
        <div className="mt-4 border-t pt-4 space-y-4 text-sm">
          <div className="flex flex-wrap gap-6 items-center">
            <label className="flex items-center space-x-2">
              <span className="whitespace-nowrap">Score ≥ {(minScore*100).toFixed(0)}%</span>
              <input type="range" min={0} max={1} step={0.01} value={minScore} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setMinScore(parseFloat(e.target.value))} />
              <input type="number" min={0} max={100} value={Math.round(minScore*100)} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setMinScore(clamp((parseInt(e.target.value)||0)/100,0,1))} className="w-16 border rounded px-1 py-0.5 text-xs" />
              <div className="flex flex-col">
                <button type="button" onClick={()=>setMinScore(clamp(parseFloat((minScore+0.01).toFixed(2)),0,1))} className="text-[10px] border rounded-t px-1">+</button>
                <button type="button" onClick={()=>setMinScore(clamp(parseFloat((minScore-0.01).toFixed(2)),0,1))} className="text-[10px] border rounded-b px-1">-</button>
              </div>
            </label>
            <label className="flex items-center space-x-2">
              <span>Min Area</span>
              <input type="number" min={0} value={minArea} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setMinArea(parseInt(e.target.value)||0)} className="w-28 border rounded px-2 py-1" />
              <span className="text-xs text-gray-500">px²</span>
            </label>
            <label className="flex items-center space-x-2">
              <span>IOU ≤ {iouThreshold.toFixed(2)}</span>
              <input type="range" min={0.001} max={0.9} step={0.01} value={iouThreshold} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setIouThreshold(parseFloat(e.target.value))} />
              <input type="number" min={0} max={0.9} step={0.01} value={iouThreshold.toFixed(2)} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setIouThreshold(clamp(parseFloat(e.target.value)||0,0,0.9))} className="w-20 border rounded px-1 py-0.5 text-xs" />
              <div className="flex flex-col">
                <button type="button" onClick={()=>setIouThreshold(clamp(parseFloat((iouThreshold+0.01).toFixed(2)),0,0.9))} className="text-[10px] border rounded-t px-1">+</button>
                <button type="button" onClick={()=>setIouThreshold(clamp(parseFloat((iouThreshold-0.01).toFixed(2)),0,0.9))} className="text-[10px] border rounded-b px-1">-</button>
              </div>
            </label>
          </div>
          <p className="text-xs text-gray-500 leading-snug">Min Area & IOU filters apply only to model detections (manual annotations always kept). IOU performs class-wise Non‑Maximum Suppression.</p>
        </div>
      )}
    </div>
  );
};

export default OverlayControls;
