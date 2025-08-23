import React, { useState, useMemo, useEffect } from 'react';
import ImageUpload from '../components/ImageUpload';
import DetectionsOverlay, { DetectionBox } from '../components/DetectionsOverlay';

interface PredictionResponse {
  model: string;
  num_detections: number;
  detections: DetectionBox[];
  counts: Record<string, number>;
  viability: number | null;
}

const CellCounting: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // Overlay controls
  // Load persisted settings if available
  const storedSettings = typeof window !== 'undefined' ? (() => {
    try { return JSON.parse(localStorage.getItem('cellCountingSettings')||'null'); } catch { return null; }
  })() : null;
  const [showBoxes, setShowBoxes] = useState<boolean>(storedSettings?.showBoxes ?? true);
  const [showLabels, setShowLabels] = useState<boolean>(storedSettings?.showLabels ?? true);
  const [minScore, setMinScore] = useState<number>(storedSettings?.minScore ?? 0.2);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [strokeWidth, setStrokeWidth] = useState<number>(storedSettings?.strokeWidth ?? 3);
  const [scale, setScale] = useState(1);
  // Manual annotation state
  const [annotationMode, setAnnotationMode] = useState(false);
  const [manualDetections, setManualDetections] = useState<DetectionBox[]>([]);
  const [newBoxClass, setNewBoxClass] = useState('Alive');
  // Advanced filtering
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minArea, setMinArea] = useState<number>(storedSettings?.minArea ?? 0); // pixels
  const [iouThreshold, setIouThreshold] = useState<number>(storedSettings?.iouThreshold ?? 0.5); // for client-side NMS

  // Persist settings on change
  useEffect(() => {
    const toStore = { showBoxes, showLabels, minScore, strokeWidth, minArea, iouThreshold };
    try { localStorage.setItem('cellCountingSettings', JSON.stringify(toStore)); } catch {/* ignore */}
  }, [showBoxes, showLabels, minScore, strokeWidth, minArea, iouThreshold]);

  const handleAnalyze = async (imageFile: File) => {
    setIsAnalyzing(true);
    setError(null);
  // Clear any manual annotations from previous image
  setManualDetections([]);
  setAnnotationMode(false);
  setNewBoxClass('Alive');
  // store only URL (file object not needed after upload now)
    setImageUrl(URL.createObjectURL(imageFile));
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      const response = await fetch('http://localhost:8001/predict', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to analyze image');
      const json: PredictionResponse = await response.json();
  setResult(json);
  // Initialize selected classes (all on first load)
  const cls = new Set(json.detections.map(d => d.class_name));
  setSelectedClasses(cls);
      setHasResult(true);
    } catch (e: any) {
      setError(e.message || 'Failed to analyze');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setIsAnalyzing(false);
    setHasResult(false);
    setError(null);
    setResult(null);
    setImageUrl(null);
  setManualDetections([]);
  setAnnotationMode(false);
  setNewBoxClass('Alive');
  };

  const toggleClass = (name: string) => {
    setSelectedClasses((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const allDetections: DetectionBox[] = result ? [...result.detections, ...manualDetections] : [];

  // IoU helper (class-wise NMS)
  const iou = (a: DetectionBox, b: DetectionBox): number => {
    const [ax1, ay1, ax2, ay2] = a.bbox; const [bx1, by1, bx2, by2] = b.bbox;
    const ix1 = Math.max(ax1, bx1); const iy1 = Math.max(ay1, by1);
    const ix2 = Math.min(ax2, bx2); const iy2 = Math.min(ay2, by2);
    const iw = Math.max(0, ix2 - ix1); const ih = Math.max(0, iy2 - iy1);
    const inter = iw * ih;
    const aArea = (ax2-ax1)*(ay2-ay1); const bArea = (bx2-bx1)*(by2-by1);
    const denom = aArea + bArea - inter;
    return denom <= 0 ? 0 : inter / denom;
  };

  const processedDetections: DetectionBox[] = useMemo(() => {
    if (!result) return [];
    const modelOnly = result.detections.filter((d: DetectionBox) => {
      const [x1,y1,x2,y2] = d.bbox; const area = (x2-x1)*(y2-y1);
      return area >= minArea && d.score >= minScore; // area & score filter here
    });
    let kept: DetectionBox[] = [];
    if (iouThreshold > 0 && iouThreshold < 0.99) {
      // sort by score desc
      const sorted = [...modelOnly].sort((a: DetectionBox,b: DetectionBox)=>b.score - a.score);
      sorted.forEach((cand: DetectionBox) => {
        const overlaps = kept.some(k => k.class_name === cand.class_name && iou(k, cand) > iouThreshold);
        if (!overlaps) kept.push(cand);
      });
    } else {
      kept = modelOnly;
    }
    // Manual detections: apply score filter but not area or NMS (assumption: user intends them) 
    const manual = manualDetections.filter((d: DetectionBox) => d.score >= minScore);
    return [...kept, ...manual];
  }, [result, minArea, minScore, iouThreshold, manualDetections]);

  const handleNewManualBox = (bbox: [number, number, number, number]) => {
    // Manual boxes have no model score; assign 0.99 so they appear with default threshold
    const newDet: DetectionBox = {
      bbox,
      score: 0.999,
      class_id: newBoxClass === 'Alive' ? 0 : 1,
      class_name: newBoxClass,
      id: 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      isManual: true
    };
    setManualDetections((prev: DetectionBox[]) => [...prev, newDet]);
  };

  const removeManual = (id: string) => {
    setManualDetections((prev: DetectionBox[]) => prev.filter((d: DetectionBox) => d.id !== id));
  };

  return (
  <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Cell Counting</h1>
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">Upload a Trypan blue stained animal cell microscopy image to obtain automated Alive / Dead cell detection and viability estimation. This model was trained on a curated Trypan blue dataset. You can interactively filter detections and adjust score thresholds below.</p>
      <ImageUpload
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        onReset={handleReset}
        hasResult={hasResult}
        guidelines={<ul className="space-y-2 list-disc list-inside">
          <li>Use brightfield images with Trypan blue staining (common hemocytometer style).</li>
          <li>Avoid heavy compression artifacts; PNG or high‑quality JPEG preferred.</li>
          <li>Recommended max resolution &lt; 3000px on the longest side for faster processing.</li>
          <li>Ensure even illumination; mild focus variation is acceptable.</li>
        </ul>}
      />

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

  {hasResult && result && imageUrl && (
        <div className="mt-10">
          <h2 className="font-semibold mb-3">Visualization</h2>
          <div className="mb-4 space-y-3 bg-white border rounded p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <button type="button" onClick={()=>setShowAdvanced((s: boolean)=>!s)} className="text-sm px-3 py-1 border rounded hover:bg-gray-50">
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
                <span>BBox thickness {strokeWidth}px</span>
                <input type="range" min={1} max={8} step={1} value={strokeWidth} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setStrokeWidth(parseInt(e.target.value))} />
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <span>Zoom {(scale*100).toFixed(0)}%</span>
                <input type="range" min={0.25} max={4} step={0.05} value={scale} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setScale(parseFloat(e.target.value))} />
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={annotationMode} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setAnnotationMode(e.target.checked)} />
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
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Array.from(new Set(processedDetections.map((d: DetectionBox)=>d.class_name))).map((name: string) => {
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
                  </label>
                  <label className="flex items-center space-x-2">
                    <span>Min Area</span>
                    <input type="number" min={0} value={minArea} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setMinArea(parseInt(e.target.value)||0)} className="w-28 border rounded px-2 py-1" />
                    <span className="text-xs text-gray-500">px²</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <span>IOU ≤ {iouThreshold.toFixed(2)}</span>
                    <input type="range" min={0.001} max={0.9} step={0.01} value={iouThreshold} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setIouThreshold(parseFloat(e.target.value))} />
                  </label>
                </div>
                <p className="text-xs text-gray-500 leading-snug">Min Area & IOU filters apply only to model detections (manual annotations are always kept). IOU performs class-wise Non‑Maximum Suppression.</p>
              </div>
            )}
          </div>
          <div className="w-full">
            <DetectionsOverlay
              imageUrl={imageUrl}
              detections={processedDetections.filter((d: DetectionBox)=>selectedClasses.has(d.class_name))}
              showBoxes={showBoxes}
              showLabels={showLabels}
              minScore={minScore}
              strokeWidth={strokeWidth}
              scale={scale}
              onScaleChange={setScale}
              selectedClasses={selectedClasses}
              annotationMode={annotationMode}
              onNewBox={handleNewManualBox}
            />
          </div>
          <div className="mt-4 bg-white border rounded p-4 text-sm max-w-md">
            <h3 className="font-medium mb-2">Counts</h3>
            {(() => {
              const filtered = processedDetections.filter((d: DetectionBox)=>d.score>=minScore && selectedClasses.has(d.class_name));
              const counts: Record<string, number> = {};
              filtered.forEach((d: DetectionBox) => { counts[d.class_name] = (counts[d.class_name]||0)+1; });
              const alive = counts['Alive']||0; const dead = counts['Dead']||0;
              const viability = (alive+dead)>0 ? (alive/(alive+dead)*100) : null;
              return <>
                <ul className="space-y-1">
                  {Object.entries(counts).map(([k,v]) => (
                    <li key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold">{v}</span></li>
                  ))}
                </ul>
                {viability!==null && <p className="mt-3 text-teal-700 font-medium">Viability: {viability.toFixed(1)}%</p>}
                {manualDetections.length>0 && <p className="mt-2 text-xs text-gray-500">{manualDetections.length} manual annotation{manualDetections.length>1?'s':''} added (not suppressed by IOU/area).</p>}
              </>;
            })()}
          </div>
          {manualDetections.length>0 && (
            <div className="mt-4 bg-white border rounded p-4 text-xs max-w-md">
              <h4 className="font-medium mb-2">Manual Annotations</h4>
              <ul className="space-y-1 max-h-40 overflow-auto">
                {manualDetections.map((d: DetectionBox) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{d.class_name} [{d.bbox.map((n: number)=>n.toFixed(0)).join(',')}]</span>
                    <button onClick={()=>d.id && removeManual(d.id)} className="text-red-600 hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-gray-500">Manual boxes are shown dashed.</p>
            </div>
          )}
          <div className="mt-12">
            <h2 className="font-semibold mb-3">Detections ({result.num_detections})</h2>
            <div className="bg-white border rounded p-4 max-h-[28rem] overflow-auto text-xs">
              <table className="w-full">
                <thead className="text-gray-600">
                  <tr>
                    <th className="text-left pr-2">Class</th>
                    <th className="text-left pr-2">Score</th>
                    <th className="text-left">BBox [x1,y1,x2,y2]</th>
                    <th className="text-left pr-2">Source</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {processedDetections
                    .filter((d: DetectionBox)=>d.score>=minScore && selectedClasses.has(d.class_name))
                    .map((d: DetectionBox,i: number) => (
                      <tr key={d.id || i} className="border-t">
                        <td className="pr-2 py-1">{d.class_name}</td>
                        <td className="pr-2 py-1">{(d.score*100).toFixed(1)}%</td>
                        <td className="py-1 font-mono">[{d.bbox.join(',')}]</td>
                        <td className="pr-2 py-1">{d.isManual? 'Manual':'Model'}</td>
                        <td className="py-1">{d.isManual && d.id && <button onClick={()=>removeManual(d.id!)} className="text-red-600 hover:underline">x</button>}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellCounting;
