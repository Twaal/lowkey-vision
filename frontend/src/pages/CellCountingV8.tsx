import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import DetectionsOverlay, { DetectionBox } from '../components/DetectionsOverlay';
import OverlayControls from '../components/OverlayControls';
import { Download, FolderOpen, Play, ChevronLeft, ChevronRight, Camera, Trash2, X } from 'lucide-react';
import { ACCEPTED_IMAGE_ACCEPT_ATTR, isAcceptedImageFile } from '../utils/fileTypes';
import { createImagePreviewUrl, shouldRevokeObjectUrl } from '../utils/imagePreview';

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
  const [batchProgress, setBatchProgress] = useState(0);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const currentBatchItem = batchItems[batchIndex];
  const SETTINGS_VERSION = 5;
  const rawStored = typeof window !== 'undefined' ? (() => {
    try { return JSON.parse(localStorage.getItem('cellCountingSettingsV8')||'null'); } catch { return null; }
  })() : null;
  const storedSettings = rawStored && rawStored.version === SETTINGS_VERSION ? rawStored : null;
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
  const [iouThreshold, setIouThreshold] = useState<number>(storedSettings?.iouThreshold ?? 0.9);
  const [showTools, setShowTools] = useState(false);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);
  const [showRemoveCurrentModal, setShowRemoveCurrentModal] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [showRemoveSelectedModal, setShowRemoveSelectedModal] = useState(false);
  const [showClearBatchModal, setShowClearBatchModal] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    const toStore = { version: SETTINGS_VERSION, showLabels, minScore, strokeWidth, minArea, iouThreshold };
    try { localStorage.setItem('cellCountingSettingsV8', JSON.stringify(toStore)); } catch {}
  }, [showLabels, minScore, strokeWidth, minArea, iouThreshold]);

  const toggleClass = (name: string) => {
    setSelectedClasses((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleBatchFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const accepted: File[] = [];
    const rejected: File[] = [];
    files.forEach((f: File) => {
      if (isAcceptedImageFile(f)) {
        accepted.push(f);
      } else {
        rejected.push(f);
      }
    });
    let newItems: BatchItem[] = [];
    const previewed: { file: File; url: string }[] = [];
    const previewFailed: File[] = [];
    if (accepted.length) {
      const previews = await Promise.allSettled(
        accepted.map(async (f: File) => ({ file: f, url: await createImagePreviewUrl(f) }))
      );
      previews.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          previewed.push(res.value);
        } else {
          previewFailed.push(accepted[idx]);
        }
      });
      newItems = previewed.map(({ file, url }) => ({
        id: crypto.randomUUID(),
        file,
        url,
        status: 'pending',
        manualDetections: []
      }));
    }
    if (previewFailed.length) {
      rejected.push(...previewFailed);
    }
    if (rejected.length) {
      const details = rejected
        .map((f: File) => `${f.name}${f.type ? ` (${f.type})` : ''}`)
        .join(', ');
      setBatchError(`Some files were not added (unsupported type or failed to render preview): ${details}.`);
    } else {
      setBatchError(null);
    }
    setBatchItems((prev: BatchItem[]) => {
      const next = [...prev, ...newItems];
      return next;
    });
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    void handleBatchFiles(files);
    e.target.value = '';
  };

  const runBatch = useCallback(async () => {
    if (batchRunning || !batchItems.length) return;
    setBatchError(null);
    setBatchRunning(true);
    let processed = 0;
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
      setBatchProgress(processed);
    }
    setBatchRunning(false);
  }, [batchItems, batchRunning]);

  const removeBatchItem = (id: string) => {
    setBatchItems((items: BatchItem[]) => {
      const itemToRemove = items.find((i: BatchItem) => i.id === id);
      if (itemToRemove && shouldRevokeObjectUrl(itemToRemove.url)) {
        URL.revokeObjectURL(itemToRemove.url);
      }
      const next = items.filter((i: BatchItem) => i.id !== id);
      setBatchProgress((p: number) => Math.min(p, next.length));
      setBatchIndex((i: number) => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
    setSelectedBatchIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const removeBatchItems = (ids: Set<string>) => {
    if (!ids.size) return;
    setBatchItems((items: BatchItem[]) => {
      items.forEach((i: BatchItem) => {
        if (ids.has(i.id) && shouldRevokeObjectUrl(i.url)) {
          URL.revokeObjectURL(i.url);
        }
      });
      const next = items.filter((i: BatchItem) => !ids.has(i.id));
      setBatchProgress((p: number) => Math.min(p, next.length));
      setBatchIndex((i: number) => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
    setSelectedBatchIds(new Set());
  };

  const requestRemoveCurrent = () => {
    if (!currentBatchItem) return;
    setPendingRemoveId(currentBatchItem.id);
    setShowRemoveCurrentModal(true);
  };

  const confirmRemoveCurrent = () => {
    if (pendingRemoveId) removeBatchItem(pendingRemoveId);
    setPendingRemoveId(null);
    setShowRemoveCurrentModal(false);
  };

  const cancelRemoveCurrent = () => {
    setPendingRemoveId(null);
    setShowRemoveCurrentModal(false);
  };

  const requestRemoveSelected = () => {
    if (!selectedBatchIds.size) return;
    setShowRemoveSelectedModal(true);
  };

  const confirmRemoveSelected = () => {
    removeBatchItems(selectedBatchIds);
    setShowRemoveSelectedModal(false);
  };

  const cancelRemoveSelected = () => {
    setShowRemoveSelectedModal(false);
  };

  const toggleBatchSelection = (id: string) => {
    setSelectedBatchIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearBatch = () => {
    setBatchItems((items: BatchItem[]) => {
      items.forEach((i: BatchItem) => {
        if (shouldRevokeObjectUrl(i.url)) {
          URL.revokeObjectURL(i.url);
        }
      });
      return [];
    });
    setBatchIndex(0);
    setBatchProgress(0);
    setBatchRunning(false);
    setSelectedBatchIds(new Set());
    setBatchError(null);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const requestClearBatch = () => {
    if (!batchItems.length) return;
    setShowClearBatchModal(true);
  };

  const confirmClearBatch = () => {
    clearBatch();
    setShowClearBatchModal(false);
  };

  const cancelClearBatch = () => {
    setShowClearBatchModal(false);
  };

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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_cell_counts_v8.csv';
    a.click();
    // Delay revocation to ensure browser has time to process the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    if (iouThreshold > 0 && iouThreshold <= 0.99) {
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
      {showRemoveCurrentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900">Remove image?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will remove the current image from the batch. This can’t be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelRemoveCurrent}
                className="px-3 py-1.5 text-xs border rounded bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveCurrent}
                className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      {showRemoveSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900">Remove selected images?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will remove {selectedBatchIds.size} selected image{selectedBatchIds.size === 1 ? '' : 's'} from the batch. This can’t be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelRemoveSelected}
                className="px-3 py-1.5 text-xs border rounded bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveSelected}
                className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      {showClearBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900">Clear batch?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will remove all images from the batch. This can’t be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelClearBatch}
                className="px-3 py-1.5 text-xs border rounded bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearBatch}
                className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
              >
                Clear batch
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 sticky top-12 z-40 flex flex-wrap items-center gap-3 bg-white border rounded px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={batchRunning}
            className="inline-flex items-center gap-2 px-3 py-1.5 border rounded text-xs bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            Upload
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              void handleBatchFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
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
        <button onClick={requestClearBatch} disabled={!batchItems.length || batchRunning} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded bg-white hover:bg-gray-50 disabled:opacity-50"><Trash2 className="w-4 h-4"/>Clear Batch</button>
        <button
          type="button"
          onClick={() => setShowTools((v: boolean) => !v)}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded bg-white hover:bg-gray-50"
        >
          {showTools ? 'Hide Tools' : 'Show Tools'}
        </button>
        {batchItems.length>0 && (
          <div className="text-[11px] text-gray-600">Progress: {batchProgress}/{batchItems.length}</div>
        )}
      </div>
      {batchError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{batchError}</span>
          <button
            type="button"
            onClick={() => setBatchError(null)}
            className="rounded p-1 text-red-600 hover:bg-red-100"
            aria-label="Dismiss filetype error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="space-y-4">
          {currentBatchItem ? (
            currentBatchItem.result ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white border rounded px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={requestRemoveCurrent}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border rounded text-red-600 hover:bg-red-50"
                      title="Remove current image from batch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                    <div className="text-sm font-medium truncate">{currentBatchItem.file.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{batchIndex+1} / {batchItems.length}</span>
                    <button onClick={()=>setBatchIndex((i: number)=>Math.max(0,i-1))} disabled={batchIndex===0} className="p-2 border rounded disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
                    <button onClick={()=>setBatchIndex((i: number)=>Math.min(batchItems.length-1,i+1))} disabled={batchIndex===batchItems.length-1} className="p-2 border rounded disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
                  </div>
                </div>
                <div className="bg-white border rounded p-2">
                  <DetectionsOverlay
                    imageUrl={currentBatchItem.url}
                    detections={currentBatchProcessed.filter((d: DetectionBox)=>selectedClasses.has(d.class_name))}
                    showBoxes={true}
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
                <div className="animate-pulse mb-2 font-medium">Start batch of {batchItems.length} images</div>
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
              <div className="px-3 py-2 border-b flex items-center justify-between text-xs font-semibold text-gray-700">
                <span>Batch Queue</span>
                <button
                  type="button"
                  onClick={requestRemoveSelected}
                  disabled={!selectedBatchIds.size}
                  className="inline-flex items-center gap-1 px-2 py-1 border rounded text-[11px] text-red-600 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  Remove selected
                </button>
              </div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-2 py-1">#</th>
                      <th className="text-left px-2 py-1">File</th>
                      <th className="text-left px-2 py-1">Status</th>
                      <th className="text-left px-2 py-1">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchItems.map((it: BatchItem,i: number) => (
                      <tr key={it.id} className="border-t hover:bg-teal-50">
                        <td className="px-2 py-1 cursor-pointer" onClick={()=>setBatchIndex(i)}>{i+1}</td>
                        <td className="px-2 py-1 truncate max-w-[220px] cursor-pointer" onClick={()=>setBatchIndex(i)}>{it.file.name}</td>
                        <td className="px-2 py-1 cursor-pointer" onClick={()=>setBatchIndex(i)}>{it.status === 'error' ? 'early access' : it.status}</td>
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.has(it.id)}
                            onChange={() => toggleBatchSelection(it.id)}
                            className="h-3.5 w-3.5 accent-teal-600"
                            aria-label={`Select ${it.file.name}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          {showTools && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Image Tools</h2>
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
                onClearManualAnnotations={() => {
                  if (!currentBatchItem) return;
                  setBatchItems((items: BatchItem[]) => items.map((it: BatchItem) => it.id === currentBatchItem.id ? { ...it, manualDetections: [] } : it));
                }}
              />

              {currentBatchItem && currentBatchItem.result ? (
                <>
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
                  Run the batch to see annotations.
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
            {currentBatchItem && currentBatchItem.result ? (
              <div className="bg-white border rounded p-3 text-xs">
                <h3 className="font-medium mb-2">Image totals</h3>
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
            ) : (
              <div className="bg-white border rounded p-3 text-xs text-gray-500">
                Run the batch to see image totals.
              </div>
            )}

            <div className="bg-white border rounded p-3 text-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Batch totals</h3>
                <button
                  onClick={downloadCsv}
                  disabled={!batchItems.length}
                  className="inline-flex items-center gap-1 px-2.5 py-1 border rounded text-[11px] bg-white hover:bg-teal-50 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
              {batchItems.length>0 ? (
                <>
                  <ul className="space-y-1">
                    <li className="flex justify-between"><span>Batch live</span><span className="font-semibold">{batchAggregated.alive}</span></li>
                    <li className="flex justify-between"><span>Batch dead</span><span className="font-semibold">{batchAggregated.dead}</span></li>
                    <li className="flex justify-between"><span>Total</span><span className="font-semibold">{batchAggregated.total}</span></li>
                  </ul>
                  {batchAggregated.viability!==null && <p className="mt-3 text-teal-700 font-medium">Viability: {batchAggregated.viability.toFixed(1)}%</p>}
                  <p className="mt-2 text-[11px] text-gray-500">(Filtered results: score ≥ {(minScore*100).toFixed(0)}%, area ≥ {minArea}px², IOU overlap &gt; {(1 / iouThreshold).toFixed(2)} suppressed)</p>
                </>
              ) : (
                <p className="text-gray-500">Add images to see batch totals.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CellCountingV8;
