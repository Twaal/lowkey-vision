import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import DetectionsOverlay, { DetectionBox } from '../components/DetectionsOverlay';
import OverlayControls from '../components/OverlayControls';
import { Download, FolderOpen, Play, Pause, ChevronLeft, ChevronRight, Camera, Trash2 } from 'lucide-react';

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

const CellCountingV8: React.FC = () => {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchProgress, setBatchProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const currentBatchItem = batchItems[batchIndex];
  const SETTINGS_VERSION = 4;
  const rawStored = typeof window !== 'undefined' ? (() => {
    try { return JSON.parse(localStorage.getItem('cellCountingSettingsV8')||'null'); } catch { return null; }
  })() : null;
  const storedSettings = rawStored && rawStored.version === SETTINGS_VERSION ? rawStored : null;
  const [showBoxes, setShowBoxes] = useState<boolean>(storedSettings?.showBoxes ?? true);
  const [showLabels, setShowLabels] = useState<boolean>(storedSettings?.showLabels ?? false);
  const [minScore, setMinScore] = useState<number>(storedSettings?.minScore ?? 0.1);
  const CLASS_TOGGLES = ['live', 'dead'] as const;
  const CLASS_COLORS: Record<(typeof CLASS_TOGGLES)[number], string> = {
    live: '#10b981',
    dead: '#ef4444'
  };
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set(CLASS_TOGGLES));
  const [strokeWidth, setStrokeWidth] = useState<number>(storedSettings?.strokeWidth ?? 3);
  const [scale, setScale] = useState(1);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [newBoxClass, setNewBoxClass] = useState('live');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minArea, setMinArea] = useState<number>(storedSettings?.minArea ?? 10);
  const [iouThreshold, setIouThreshold] = useState<number>(storedSettings?.iouThreshold ?? 0.01);
  const [showTools, setShowTools] = useState(true);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);

  useEffect(() => {
    const toStore = { version: SETTINGS_VERSION, showBoxes, showLabels, minScore, strokeWidth, minArea, iouThreshold };
    try { localStorage.setItem('cellCountingSettingsV8', JSON.stringify(toStore)); } catch {}
  }, [showBoxes, showLabels, minScore, strokeWidth, minArea, iouThreshold]);

  const toggleClass = (name: string) => {
    setSelectedClasses((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const acceptableTypes = new Set(['image/jpeg','image/png','image/tiff']);
  const prevTotal = (prev: BatchItem[], added: number) => prev.length + added;
  const handleBatchFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f: File) => acceptableTypes.has(f.type));
    const newItems: BatchItem[] = files.map((f: File) => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f), status: 'pending', manualDetections: [] }));
    setBatchItems((prev: BatchItem[]) => [...prev, ...newItems]);
    setBatchProgress((p: { processed: number; total: number }) => ({ processed: p.processed, total: prevTotal(batchItems, newItems.length) }));
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleBatchFiles(files);
    e.target.value = '';
  };

  const runBatch = useCallback(async () => {
    if (batchRunning || !batchItems.length) return;
    setBatchRunning(true);
    let processed = 0;
    const total = batchItems.length;
    let firstShown = false;
    for (let i = 0; i < batchItems.length; i++) {
      setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === batchItems[i].id ? { ...it, status: 'processing' } : it));
      try {
        const formData = new FormData();
        formData.append('file', batchItems[i].file);
        const resp = await fetch('http://localhost:8002/predict', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json: PredictionResponse = await resp.json();
        setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === batchItems[i].id ? { ...it, status: 'done', result: json } : it));
        if (!firstShown) {
          firstShown = true;
          setBatchIndex(i);
        }
      } catch (e: any) {
        setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === batchItems[i].id ? { ...it, status: 'error', error: e.message || 'Failed' } : it));
        setShowEarlyAccessModal(true);
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
    const alive = counts['live']||0; const dead = counts['dead']||0; const viability = (alive+dead)>0 ? alive/(alive+dead)*100 : null;
    return { counts, alive, dead, viability };
  };

  const downloadCsv = () => {
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
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'batch_cell_counts_v8.csv'; a.click();
  };

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
      return area >= minArea && d.score >= minScore;
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

  const handleNewManualBoxBatch = (bbox: [number, number, number, number]) => {
    if (!currentBatchItem) return;
    const newDet: DetectionBox = {
      bbox,
      score: 0.999,
      class_id: newBoxClass === 'live' ? 0 : 1,
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
  const availableClasses = CLASS_TOGGLES;
  const batchAggregated = useMemo(() => {
    let alive = 0, dead = 0;
    batchItems.forEach((it: BatchItem) => {
      if (!it.result) return;
      const processed = processDetections(it.result.detections, it.manualDetections);
      processed.forEach((d: DetectionBox) => { if (d.class_name === 'live') alive++; else if (d.class_name === 'dead') dead++; });
    });
    const total = alive + dead;
    const viability = total > 0 ? alive/total*100 : null;
    return { alive, dead, total, viability };
  }, [batchItems, processDetections]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {showEarlyAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900">Early access required</h3>
            <p className="mt-2 text-sm text-gray-600">
              Cell counting is currently only available to early access users. Apply now and we'll follow up with next steps.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEarlyAccessModal(false)}
                className="px-3 py-1.5 text-xs border rounded bg-white hover:bg-gray-50"
              >
                Not now
              </button>
              <a
                href="/contact"
                className="px-3 py-1.5 text-xs rounded bg-teal-600 text-white hover:bg-teal-700"
              >
                Apply for early access
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 sticky top-12 z-40 flex flex-wrap items-center gap-3 bg-white border rounded px-3 py-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-gray-600" />
          <label className="text-xs font-medium text-gray-600">Upload</label>
          <input type="file" multiple accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>)=>handleBatchFiles(e.target.files)} className="text-xs" />
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          // @ts-ignore
          capture="environment"
          onChange={handleCameraCapture}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={batchRunning}
          className="inline-flex items-center gap-2 px-3 py-1.5 border rounded text-xs bg-white hover:bg-gray-50 disabled:opacity-50"
          title="Open camera to take a photo and add to batch"
        >
          <Camera className="w-4 h-4"/> Take Photo
        </button>
        <button onClick={runBatch} disabled={!batchItems.length || batchRunning} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-teal-600 text-white rounded disabled:bg-gray-400"><Play className="w-4 h-4"/>{batchRunning?'Running...':'Start Batch'}</button>
        <button onClick={clearBatch} disabled={!batchItems.length || batchRunning} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded bg-white hover:bg-gray-50 disabled:opacity-50"><Trash2 className="w-4 h-4"/>Clear Batch</button>
        <button
          type="button"
          onClick={() => setShowTools((v: boolean) => !v)}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded bg-white hover:bg-gray-50"
        >
          {showTools ? 'Hide Tools' : 'Show Tools'}
        </button>
        {batchItems.length>0 && (
          <div className="text-[11px] text-gray-600">Progress: {batchProgress.processed}/{batchItems.length}</div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${showTools ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''} gap-4`}>
        <div className="space-y-4">
          {currentBatchItem ? (
            currentBatchItem.result ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white border rounded px-3 py-2">
                  <div className="text-sm font-medium truncate">Image {batchIndex+1} / {batchItems.length}: {currentBatchItem.file.name}</div>
                  <div className="flex gap-2">
                    <button onClick={()=>setBatchIndex((i: number)=>Math.max(0,i-1))} disabled={batchIndex===0} className="p-2 border rounded disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
                    <button onClick={()=>setBatchIndex((i: number)=>Math.min(batchItems.length-1,i+1))} disabled={batchIndex===batchItems.length-1} className="p-2 border rounded disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
                  </div>
                </div>
                <div className="bg-white border rounded p-2">
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
                    classColors={CLASS_COLORS}
                    onCanvasReady={(c: HTMLCanvasElement | null)=>captureOverlay(c?.toDataURL())}
                    annotationMode={annotationMode}
                    onNewBox={handleNewManualBoxBatch}
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 bg-white border rounded text-sm text-gray-600">
                <div className="animate-pulse mb-2 font-medium">Processing image {batchIndex+1} of {batchItems.length}…</div>
                <div>This view will update automatically once the first image finishes. The rest will continue processing in the background.</div>
              </div>
            )
          ) : (
            <div className="p-8 bg-white border rounded text-sm text-gray-600">
              <div>Add images to begin a batch. You can upload files or capture a photo.</div>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500">
                <Camera className="w-4 h-4 text-teal-600" />
                <span>Tip: capture a microscope view with your phone camera.</span>
              </div>
            </div>
          )}

          {batchItems.length>0 && (
            <div className="border rounded bg-white">
              <div className="px-3 py-2 border-b text-xs font-semibold text-gray-700">Batch Queue</div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-2 py-1">#</th>
                      <th className="text-left px-2 py-1">File</th>
                      <th className="text-left px-2 py-1">Status</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchItems.map((it: BatchItem,i: number) => (
                      <tr key={it.id} className="border-t hover:bg-teal-50 cursor-pointer" onClick={()=>setBatchIndex(i)}>
                        <td className="px-2 py-1">{i+1}</td>
                        <td className="px-2 py-1 truncate max-w-[240px]">{it.file.name}</td>
                        <td className="px-2 py-1">{it.status === 'error' ? 'early access' : it.status}</td>
                        <td className="px-2 py-1"><button onClick={(e: React.MouseEvent<HTMLButtonElement>)=>{e.stopPropagation(); removeBatchItem(it.id);}} className="text-red-600">×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gray-50 flex flex-wrap gap-6 text-[11px] border-t">
                <div><span className="font-semibold">Batch live:</span> {batchAggregated.alive}</div>
                <div><span className="font-semibold">Batch dead:</span> {batchAggregated.dead}</div>
                <div><span className="font-semibold">Total:</span> {batchAggregated.total}</div>
                <div><span className="font-semibold">Viability:</span> {batchAggregated.viability!==null? batchAggregated.viability.toFixed(1)+'%':', '}</div>
                <div className="text-gray-500">(Filtered results: score ≥ {(minScore*100).toFixed(0)}%, area ≥ {minArea}px², IOU ≤ {iouThreshold.toFixed(2)})</div>
              </div>
            </div>
          )}
        </div>

        {showTools && (
          <aside className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Image Tools</h2>
              <button type="button" onClick={() => setShowTools(false)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">Hide</button>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-600">
              <span className="font-medium">Class colors</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CLASS_COLORS.live }} />
                live
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CLASS_COLORS.dead }} />
                dead
              </span>
            </div>
            <OverlayControls
              density="compact"
              className="mb-0"
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
              availableClasses={availableClasses}
              selectedClasses={selectedClasses}
              toggleClass={toggleClass}
              extraRightButtons={<button onClick={downloadCsv} className="inline-flex items-center gap-1 px-2.5 py-1 border rounded text-[11px] bg-white hover:bg-teal-50"><Download className="w-4 h-4"/>CSV</button>}
              onClearManualAnnotations={() => {
                if (!currentBatchItem) return;
                setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === currentBatchItem.id ? { ...it, manualDetections: [] } : it));
              }}
            />

            {currentBatchItem && currentBatchItem.result ? (
              <>
                <div className="bg-white border rounded p-3 text-xs">
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
                      {currentBatchItem.manualDetections.length>0 && <p className="mt-2 text-[11px] text-gray-500">{currentBatchItem.manualDetections.length} manual annotation{currentBatchItem.manualDetections.length>1?'s':''} added.</p>}
                    </>;
                  })()}
                </div>
                {currentBatchItem.manualDetections.length>0 && (
                  <div className="bg-white border rounded p-3 text-[11px]">
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
              </>
            ) : (
              <div className="bg-white border rounded p-3 text-xs text-gray-500">
                Run the batch to see counts and annotations.
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default CellCountingV8;
