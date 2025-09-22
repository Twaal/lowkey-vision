import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ImageUpload from '../components/ImageUpload';
import DetectionsOverlay, { DetectionBox } from '../components/DetectionsOverlay';
import OverlayControls from '../components/OverlayControls';
import { Download, FolderOpen, Play, Pause, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface PredictionResponse {
  model: string;
  num_detections: number;
  detections: DetectionBox[];
  counts: Record<string, number>;
  viability: number | null;
}

interface BatchItem {
  id: string;
  file: File;
  url: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  result?: PredictionResponse;
  manualDetections: DetectionBox[];
  overlayDataUrl?: string;
}

const CellCounting: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // Default to batch view now (single mode can be deprecated later)
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('batch');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchProgress, setBatchProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const currentBatchItem = batchItems[batchIndex];
  // Overlay controls
  // Settings persistence with versioning so new defaults take effect when bumped
  const SETTINGS_VERSION = 2; // bump to force new defaults
  const rawStored = typeof window !== 'undefined' ? (() => {
    try { return JSON.parse(localStorage.getItem('cellCountingSettings')||'null'); } catch { return null; }
  })() : null;
  const storedSettings = rawStored && rawStored.version === SETTINGS_VERSION ? rawStored : null;
  const [showBoxes, setShowBoxes] = useState<boolean>(storedSettings?.showBoxes ?? true);
  const [showLabels, setShowLabels] = useState<boolean>(storedSettings?.showLabels ?? true);
  // UPDATED defaults: score 50%, min area 10 px^2, IOU 0.01
  const [minScore, setMinScore] = useState<number>(storedSettings?.minScore ?? 0.5);
  // Default: show all known classes (Alive, Dead) instead of none
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set(['Alive','Dead']));
  const [strokeWidth, setStrokeWidth] = useState<number>(storedSettings?.strokeWidth ?? 3);
  const [scale, setScale] = useState(1);
  // Manual annotation state
  const [annotationMode, setAnnotationMode] = useState(false);
  const [manualDetections, setManualDetections] = useState<DetectionBox[]>([]);
  const [newBoxClass, setNewBoxClass] = useState('Alive');
  // Advanced filtering
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minArea, setMinArea] = useState<number>(storedSettings?.minArea ?? 10); // pixels (UPDATED default)
  const [iouThreshold, setIouThreshold] = useState<number>(storedSettings?.iouThreshold ?? 0.01); // UPDATED default for client-side NMS

  // Persist settings on change
  useEffect(() => {
  const toStore = { version: SETTINGS_VERSION, showBoxes, showLabels, minScore, strokeWidth, minArea, iouThreshold };
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

  // const allDetections: DetectionBox[] = result ? [...result.detections, ...manualDetections] : []; // currently unused

  // ===== Batch helpers =====
  const acceptableTypes = new Set(['image/jpeg','image/png','image/tiff']);
  const prevTotal = (prev: BatchItem[], added: number) => prev.length + added;
  const handleBatchFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f: File) => acceptableTypes.has(f.type));
    const newItems: BatchItem[] = files.map((f: File) => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f), status: 'pending', manualDetections: [] }));
    setBatchItems((prev: BatchItem[]) => [...prev, ...newItems]);
    setBatchProgress((p: { processed: number; total: number }) => ({ processed: p.processed, total: prevTotal(batchItems, newItems.length) }));
  };

  const runBatch = useCallback(async () => {
    if (batchRunning || !batchItems.length) return;
    setBatchRunning(true);
    let processed = 0;
    const total = batchItems.length;
    let firstShown = false; // auto-select the first successfully completed image only once
    for (let i = 0; i < batchItems.length; i++) {
  setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === batchItems[i].id ? { ...it, status: 'processing' } : it));
      try {
        const formData = new FormData();
        formData.append('file', batchItems[i].file);
        const resp = await fetch('http://localhost:8001/predict', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json: PredictionResponse = await resp.json();
        setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === batchItems[i].id ? { ...it, status: 'done', result: json } : it));
        // Show the first finished image immediately and keep it visible while others process
        if (!firstShown) {
          firstShown = true;
          setBatchIndex(i);
        }
      } catch (e: any) {
        setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === batchItems[i].id ? { ...it, status: 'error', error: e.message || 'Failed' } : it));
      }
      processed++;
      setBatchProgress({ processed, total });
    }
    setBatchRunning(false);
  }, [batchItems, batchRunning]);

  const removeBatchItem = (id: string) => {
  setBatchItems((items: BatchItem[]) => items.filter((i: BatchItem) => i.id !== id));
  setBatchProgress((p: { processed: number; total: number }) => ({ processed: Math.min(p.processed, Math.max(0, batchItems.length - 1)), total: Math.max(0, batchItems.length - 1) }));
  setBatchIndex((i: number) => Math.min(i, Math.max(0, batchItems.length - 2)));
  };

  const clearBatch = () => { setBatchItems([]); setBatchIndex(0); setBatchProgress({ processed: 0, total: 0 }); setBatchRunning(false); };

  const captureOverlay = (dataUrl?: string) => {
    if (!dataUrl || !currentBatchItem) return;
  setBatchItems((items: BatchItem[]) => items.map((i: BatchItem) => i.id === currentBatchItem.id ? { ...i, overlayDataUrl: dataUrl } : i));
  };

  const computeCounts = (detections: DetectionBox[]) => {
    const counts: Record<string, number> = {};
    detections.forEach(d => { counts[d.class_name] = (counts[d.class_name]||0)+1; });
    const alive = counts['Alive']||0; const dead = counts['Dead']||0; const viability = (alive+dead)>0 ? alive/(alive+dead)*100 : null;
    return { counts, alive, dead, viability };
  };

  const downloadCsv = () => {
    if (viewMode === 'single' && result && imageUrl) {
      const filtered = processedDetections.filter(d => selectedClasses.has(d.class_name) && d.score >= minScore);
      const { counts, alive, dead, viability } = computeCounts(filtered);
      const lines = [
        'filename,alive,dead,total,viability_percent,' + Object.keys(counts).join('|'),
        `image,${alive},${dead},${alive+dead},${viability?.toFixed(2) || ''},${Object.values(counts).join('|')}`
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cell_counts.csv'; a.click();
      return;
    }
    // Batch metadata & reproducibility details
  const models = Array.from(new Set(batchItems.filter((b: BatchItem)=>b.result).map((b: BatchItem)=>b.result!.model)));
  const imagesProcessed = batchItems.filter((b: BatchItem)=>b.result).length;
  const manualTotal = batchItems.reduce((acc: number, b: BatchItem)=> acc + b.manualDetections.length, 0);
    const meta: [string,string|number|null][] = [
      ['export_generated_at', new Date().toISOString()],
      ['models', models.join('|')],
      ['images_processed', imagesProcessed],
      ['filter_min_score', minScore],
      ['filter_min_area_px2', minArea],
      ['filter_iou_threshold', iouThreshold],
      ['batch_alive', batchAggregated.alive],
      ['batch_dead', batchAggregated.dead],
      ['batch_total', batchAggregated.total],
      ['batch_viability_percent', batchAggregated.viability!==null? batchAggregated.viability.toFixed(2):''],
      ['manual_annotations_total', manualTotal]
    ];
    const lines: string[] = ['metadata_key,metadata_value'];
    meta.forEach(([k,v]) => lines.push(`${k},${v}`));
    lines.push('');
    const header = ['filename','alive','dead','total','viability_percent','manual_annotations'];
    lines.push(header.join(','));
    batchItems.forEach((it: BatchItem) => {
      if (!it.result) return;
      const processed = processDetections(it.result.detections, it.manualDetections);
      const { alive, dead, viability } = computeCounts(processed);
      lines.push([it.file.name, alive, dead, alive+dead, viability?.toFixed(2) || '', it.manualDetections.length].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'batch_cell_counts.csv'; a.click();
  };

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

  const processDetections = useCallback((raw: DetectionBox[] = [], manual: DetectionBox[] = []): DetectionBox[] => {
    const modelOnly = raw.filter((d: DetectionBox) => {
      const [x1,y1,x2,y2] = d.bbox; const area = (x2-x1)*(y2-y1);
      return area >= minArea && d.score >= minScore; // area & score
    });
    let kept: DetectionBox[] = [];
    if (iouThreshold > 0 && iouThreshold < 0.99) {
      const sorted = [...modelOnly].sort((a,b)=>b.score - a.score);
      sorted.forEach(cand => {
        const overlaps = kept.some(k => k.class_name === cand.class_name && iou(k, cand) > iouThreshold);
        if (!overlaps) kept.push(cand);
      });
    } else {
      kept = modelOnly;
    }
    const manualFiltered = manual.filter(d => d.score >= minScore);
    return [...kept, ...manualFiltered];
  }, [minArea, minScore, iouThreshold]);

  const processedDetections: DetectionBox[] = useMemo(() => processDetections(result?.detections, manualDetections), [result, manualDetections, processDetections]);

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

  // Handlers for batch manual annotation
  const handleNewManualBoxBatch = (bbox: [number, number, number, number]) => {
    if (!currentBatchItem) return;
    const newDet: DetectionBox = {
      bbox,
      score: 0.999,
      class_id: newBoxClass === 'Alive' ? 0 : 1,
      class_name: newBoxClass,
      id: 'manual-batch-' + currentBatchItem.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      isManual: true
    };
  setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === currentBatchItem.id ? { ...it, manualDetections: [...it.manualDetections, newDet] } : it));
  };

  const removeBatchManual = (id: string) => {
    if (!currentBatchItem) return;
  setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === currentBatchItem.id ? { ...it, manualDetections: it.manualDetections.filter((d: DetectionBox) => d.id !== id) } : it));
  };

  const currentBatchProcessed = currentBatchItem && currentBatchItem.result ? processDetections(currentBatchItem.result.detections, currentBatchItem.manualDetections) : [];
  // Aggregated (filtered + NMS + manual) stats across entire batch
  const batchAggregated = useMemo(() => {
    let alive = 0, dead = 0;
    batchItems.forEach((it: BatchItem) => {
      if (!it.result) return;
      const processed = processDetections(it.result.detections, it.manualDetections);
      processed.forEach((d: DetectionBox) => { if (d.class_name === 'Alive') alive++; else if (d.class_name === 'Dead') dead++; });
    });
    const total = alive + dead;
    const viability = total > 0 ? alive/total*100 : null;
    return { alive, dead, total, viability };
  }, [batchItems, processDetections]);

  return (
  <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">Cell Counting <span className="text-sm font-normal text-gray-500 border rounded px-2 py-0.5 flex items-center gap-1"><Layers className="w-4 h-4"/> {viewMode === 'single' ? 'Single Image' : 'Batch'}</span></h1>
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">Upload brightfield Trypan blue stained cell images for automated Alive / Dead detection and viability estimation. Use Single Image for interactive analysis or Batch to process an entire experiment folder.</p>
      <div className="flex gap-2 mb-8">
        <button onClick={()=>setViewMode('single')} className={`px-4 py-2 rounded text-sm font-medium border ${viewMode==='single'?'bg-teal-600 text-white border-teal-600':'bg-white text-gray-700 hover:border-teal-400'}`}>Single Image</button>
        <button onClick={()=>setViewMode('batch')} className={`px-4 py-2 rounded text-sm font-medium border ${viewMode==='batch'?'bg-teal-600 text-white border-teal-600':'bg-white text-gray-700 hover:border-teal-400'}`}>Batch</button>
      </div>

  {viewMode === 'single' && (
        <>
          <ImageUpload
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            onReset={handleReset}
            hasResult={hasResult}
            guidelines={<ul className="space-y-2 list-disc list-inside">
              <li>Use brightfield images with Trypan blue staining (hemocytometer style).</li>
              <li>PNG or high‑quality JPEG recommended (&lt; 3000px longest side).</li>
              <li>Adjust score / area / IOU thresholds to refine detections.</li>
            </ul>}
          />
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
          )}
          {hasResult && result && imageUrl && (
        <div className="mt-10">
          <h2 className="font-semibold mb-3">Visualization</h2>
          <OverlayControls
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            showBoxes={showBoxes} setShowBoxes={setShowBoxes}
            showLabels={showLabels} setShowLabels={setShowLabels}
            strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
            scale={scale} setScale={setScale}
            annotationMode={annotationMode} setAnnotationMode={setAnnotationMode}
            newBoxClass={newBoxClass} setNewBoxClass={setNewBoxClass}
            minScore={minScore} setMinScore={setMinScore}
            minArea={minArea} setMinArea={setMinArea}
            iouThreshold={iouThreshold} setIouThreshold={setIouThreshold}
            availableClasses={processedDetections.map(d=>d.class_name)}
            selectedClasses={selectedClasses}
            toggleClass={toggleClass}
          />
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
          <div className="mt-8 flex gap-3">
            <button onClick={downloadCsv} className="inline-flex items-center gap-2 px-4 py-2 border rounded text-sm bg-white hover:bg-teal-50"><Download className="w-4 h-4"/>Download CSV</button>
          </div>
        </div>
      )}
        </>
      )}
  {viewMode === 'batch' && (
        <div className="space-y-8">
          <div className="bg-white border rounded p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><FolderOpen className="w-5 h-5"/>Batch Images</h2>
            <div className="flex flex-wrap gap-4 items-center text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Files</label>
                <input type="file" multiple accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>)=>handleBatchFiles(e.target.files)} className="text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Folder</label>
                {/* @ts-ignore */}
                <input type="file" multiple webkitdirectory="true" directory="true" onChange={(e)=>handleBatchFiles(e.target.files)} className="text-xs" />
              </div>
              <button onClick={runBatch} disabled={!batchItems.length || batchRunning} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded disabled:bg-gray-400"><Play className="w-4 h-4"/>{batchRunning?'Running...':'Start Batch'}</button>
              <button onClick={clearBatch} disabled={!batchItems.length || batchRunning} className="inline-flex items-center gap-2 px-4 py-2 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"><Pause className="w-4 h-4"/>Clear</button>
              {batchItems.length>0 && (
                <div className="text-xs text-gray-600">Progress: {batchProgress.processed}/{batchItems.length}</div>
              )}
            </div>
            {batchItems.length>0 && (
              <div className="mt-6 max-h-60 overflow-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-2 py-1">#</th>
                      <th className="text-left px-2 py-1">File</th>
                      <th className="text-left px-2 py-1">Status</th>
                      {/* Per-image raw counts removed; aggregated stats shown below */}
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchItems.map((it: BatchItem,i: number) => {
                      return (
                        <tr key={it.id} className="border-t hover:bg-teal-50 cursor-pointer" onClick={()=>setBatchIndex(i)}>
                          <td className="px-2 py-1">{i+1}</td>
                          <td className="px-2 py-1 truncate max-w-[200px]">{it.file.name}</td>
                          <td className="px-2 py-1">{it.status}</td>
                          <td className="px-2 py-1"><button onClick={(e: React.MouseEvent<HTMLButtonElement>)=>{e.stopPropagation(); removeBatchItem(it.id);}} className="text-red-600">×</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="p-3 bg-gray-50 flex flex-wrap gap-6 text-[11px] border-t">
                  <div><span className="font-semibold">Batch Alive:</span> {batchAggregated.alive}</div>
                  <div><span className="font-semibold">Batch Dead:</span> {batchAggregated.dead}</div>
                  <div><span className="font-semibold">Total:</span> {batchAggregated.total}</div>
                  <div><span className="font-semibold">Viability:</span> {batchAggregated.viability!==null? batchAggregated.viability.toFixed(1)+'%':'—'}</div>
                  <div className="text-gray-500">(Filtered results: score ≥ {(minScore*100).toFixed(0)}%, area ≥ {minArea}px², IOU ≤ {iouThreshold.toFixed(2)})</div>
                </div>
              </div>
            )}
          </div>
          {currentBatchItem && (
            currentBatchItem.result ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Image {batchIndex+1} / {batchItems.length} — {currentBatchItem.file.name}</h2>
                <div className="flex gap-2">
                  <button onClick={()=>setBatchIndex((i: number)=>Math.max(0,i-1))} disabled={batchIndex===0} className="p-2 border rounded disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
                  <button onClick={()=>setBatchIndex((i: number)=>Math.min(batchItems.length-1,i+1))} disabled={batchIndex===batchItems.length-1} className="p-2 border rounded disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
                </div>
              </div>
              <OverlayControls
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                showBoxes={showBoxes} setShowBoxes={setShowBoxes}
                showLabels={showLabels} setShowLabels={setShowLabels}
                strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                scale={scale} setScale={setScale}
                annotationMode={annotationMode} setAnnotationMode={setAnnotationMode}
                newBoxClass={newBoxClass} setNewBoxClass={setNewBoxClass}
                minScore={minScore} setMinScore={setMinScore}
                minArea={minArea} setMinArea={setMinArea}
                iouThreshold={iouThreshold} setIouThreshold={setIouThreshold}
                availableClasses={currentBatchProcessed.map((d: DetectionBox)=>d.class_name)}
                selectedClasses={selectedClasses}
                toggleClass={toggleClass}
                extraRightButtons={<button onClick={downloadCsv} className="inline-flex items-center gap-1 px-3 py-1 border rounded text-xs bg-white hover:bg-teal-50"><Download className="w-4 h-4"/>CSV</button>}
              />
              <DetectionsOverlay
                imageUrl={currentBatchItem.url}
                detections={currentBatchProcessed.filter((d: DetectionBox)=>selectedClasses.has(d.class_name))}
                showBoxes={showBoxes}
                showLabels={showLabels}
                minScore={minScore}
                strokeWidth={strokeWidth}
                scale={scale}
                onScaleChange={setScale}
                selectedClasses={selectedClasses}
                onCanvasReady={(c: HTMLCanvasElement | null)=>captureOverlay(c?.toDataURL())}
                annotationMode={annotationMode}
                onNewBox={handleNewManualBoxBatch}
              />
              <div className="bg-white border rounded p-4 text-sm max-w-md">
                <h3 className="font-medium mb-2">Counts</h3>
                {(() => {
                  const filtered = currentBatchProcessed.filter((d: DetectionBox)=>d.score>=minScore && selectedClasses.has(d.class_name));
                  const { counts, viability } = computeCounts(filtered);
                  return <>
                    <ul className="space-y-1">
                      {Object.entries(counts).map(([k,v]) => (
                        <li key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold">{v}</span></li>
                      ))}
                    </ul>
                    {viability!==null && <p className="mt-3 text-teal-700 font-medium">Viability: {viability.toFixed(1)}%</p>}
                    {currentBatchItem.manualDetections.length>0 && <p className="mt-2 text-xs text-gray-500">{currentBatchItem.manualDetections.length} manual annotation{currentBatchItem.manualDetections.length>1?'s':''} added.</p>}
                  </>;
                })()}
              </div>
              {currentBatchItem.manualDetections.length>0 && (
                <div className="bg-white border rounded p-4 text-xs max-w-md">
                  <h4 className="font-medium mb-2">Manual Annotations</h4>
                  <ul className="space-y-1 max-h-40 overflow-auto">
                    {currentBatchItem.manualDetections.map((d: DetectionBox) => (
                      <li key={d.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{d.class_name} [{d.bbox.map((n: number)=>n.toFixed(0)).join(',')}]</span>
                        <button onClick={()=>d.id && removeBatchManual(d.id!)} className="text-red-600 hover:underline">Remove</button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] text-gray-500">Manual boxes shown dashed.</p>
                </div>
              )}
            </div>
            ) : (
              <div className="p-8 bg-white border rounded text-sm text-gray-600">
                <div className="animate-pulse mb-2 font-medium">Processing image {batchIndex+1} of {batchItems.length}…</div>
                <div>This view will update automatically once the first image finishes. The rest will continue processing in the background.</div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default CellCounting;
