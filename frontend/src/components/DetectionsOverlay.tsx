import React, { useEffect, useRef, useState } from 'react';

export interface DetectionBox {
  bbox: [number, number, number, number];
  score: number;
  class_id: number;
  class_name: string;
  id?: string;
  isManual?: boolean;
}

interface OverlayProps {
  imageUrl: string;
  detections: DetectionBox[];
  showBoxes: boolean;
  showLabels: boolean;
  minScore: number;
  strokeWidth?: number;
  scale?: number;
  onScaleChange?: (s: number) => void;
  classColors?: Record<string, string>;
  selectedClasses?: Set<string>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  annotationMode?: boolean;
  onNewBox?: (bbox: [number, number, number, number]) => void;
  autoFit?: boolean; // auto scale image to fit container on first load
  /** When false, heavy work (image load & detection rendering) is skipped. Useful in batch lists */
  isActive?: boolean;
}

const defaultPalette = ['#10b981', '#ef4444', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6'];

const DetectionsOverlay: React.FC<OverlayProps> = ({
  imageUrl,
  detections,
  showBoxes,
  showLabels,
  minScore,
  strokeWidth = 2,
  scale = 1,
  onScaleChange,
  classColors,
  selectedClasses,
  onCanvasReady,
  annotationMode = false,
  onNewBox,
  autoFit = true,
  isActive = true
}: OverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draftRect, setDraftRect] = useState<[number, number, number, number] | null>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number }>({ dragging: false, startX: 0, startY: 0 });
  const hasAutoFit = useRef(false);
  // If parent doesn't control scale, maintain an internal one so autoFit & wheel zoom still work
  const isControlled = (onScaleChange !== undefined && scale !== undefined);
  const [internalScale, setInternalScale] = useState<number>(scale ?? 1);
  const effectiveScale = isControlled ? (scale as number) : internalScale;
  // Offscreen canvases (kept small / reused)
  const baseLayerRef = useRef<HTMLCanvasElement | null>(null); // image only
  const detLayerRef = useRef<HTMLCanvasElement | null>(null); // detections (boxes + labels)
  const detLayerDirty = useRef(true);
  const [imageDims, setImageDims] = useState<{w:number;h:number}|null>(null);
  const lastReadySigRef = useRef<string>('');

  // Reset autofit flag when image changes
  useEffect(() => { hasAutoFit.current = false; }, [imageUrl]);

  // Load image only when imageUrl or isActive changes
  useEffect(() => {
    if (!isActive) return; // skip heavy work when inactive
    const img = new Image();
    imgRef.current = img;
    img.onload = () => {
      imageDims && imageDims.w === img.width && imageDims.h === img.height ? null : setImageDims({w: img.width, h: img.height});
      // Prepare offscreen base layer
      if (!baseLayerRef.current) baseLayerRef.current = document.createElement('canvas');
      const base = baseLayerRef.current;
      base.width = img.width; base.height = img.height;
      const bctx = base.getContext('2d');
      if (bctx) { bctx.clearRect(0,0,base.width,base.height); bctx.drawImage(img,0,0); }
      detLayerDirty.current = true; // need to redraw detections after new image
      maybeAutoFit(img.width, img.height);
      compositeFrame();
    };
    img.src = imageUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, isActive]);

  const maybeAutoFit = (w:number, h:number) => {
  if (!autoFit || hasAutoFit.current) return;
    const container = containerRef.current;
    if (!container) return;
    const availW = container.clientWidth || window.innerWidth;
    // Prefer container height, but fall back to viewport with some margin; don't hard-cap at 900
    const availH = container.clientHeight || Math.max(200, window.innerHeight - 200);
    const scaleW = availW / w;
    const scaleH = availH / h;
    // Allow upscaling small images as well; clamp to a sane range
    const unclamped = Math.min(scaleW, scaleH);
    const fitScale = Math.max(0.2, Math.min(unclamped, 5));
    const curr = effectiveScale || 1;
    if (Math.abs(fitScale - curr) > 0.01) {
      hasAutoFit.current = true;
      if (isControlled && onScaleChange) {
        onScaleChange(parseFloat(fitScale.toFixed(3)));
      } else {
        setInternalScale(parseFloat(fitScale.toFixed(3)));
      }
    } else {
      hasAutoFit.current = true;
    }
  };

  // Redraw detection layer when detection-related props change
  useEffect(() => {
    if (!isActive) return;
    detLayerDirty.current = true;
    compositeFrame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detections, showBoxes, showLabels, minScore, classColors, selectedClasses, strokeWidth]);

  const renderDetLayerIfNeeded = () => {
    if (!detLayerDirty.current) return;
    if (!baseLayerRef.current) return;
    if (!detLayerRef.current) detLayerRef.current = document.createElement('canvas');
    const det = detLayerRef.current;
    det.width = baseLayerRef.current.width;
    det.height = baseLayerRef.current.height;
    const dctx = det.getContext('2d');
    if (!dctx) return;
    dctx.clearRect(0,0,det.width,det.height);
    detections.forEach((d: DetectionBox) => {
      if (d.score < minScore) return;
      if (selectedClasses && !selectedClasses.has(d.class_name)) return;
      const [x1,y1,x2,y2] = d.bbox;
      const color = classColors?.[d.class_name] || defaultPalette[d.class_id % defaultPalette.length];
      if (showBoxes) {
        dctx.save();
        if (d.isManual) dctx.setLineDash([4,3]);
        dctx.strokeStyle = color;
        dctx.lineWidth = strokeWidth;
        dctx.strokeRect(x1,y1,x2-x1,y2-y1);
        dctx.restore();
      }
      if (showLabels) {
        const label = `${d.class_name} ${(d.score * 100).toFixed(1)}%`;
        dctx.font = '14px sans-serif';
        dctx.textBaseline = 'top';
        const labelY = showBoxes ? y1 - 18 : y1 + 2;
        const textWidth = dctx.measureText(label).width;
        dctx.fillStyle = color;
        dctx.fillRect(x1, labelY, textWidth + 8, 18);
        dctx.fillStyle = '#fff';
        dctx.fillText(label, x1 + 4, labelY + 2);
        if (!showBoxes) {
          dctx.fillStyle = color;
          dctx.beginPath();
          dctx.arc(x1,y1,3,0,Math.PI*2);
          dctx.fill();
        }
      }
    });
    detLayerDirty.current = false;
  };

  const compositeFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Resize visible canvas to image dimensions once known
    if (baseLayerRef.current && (canvas.width !== baseLayerRef.current.width || canvas.height !== baseLayerRef.current.height)) {
      canvas.width = baseLayerRef.current.width;
      canvas.height = baseLayerRef.current.height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderDetLayerIfNeeded();
    ctx.clearRect(0,0,canvas.width, canvas.height);
    if (baseLayerRef.current) ctx.drawImage(baseLayerRef.current,0,0);
    if (detLayerRef.current) ctx.drawImage(detLayerRef.current,0,0);
    if (draftRect) {
      const [dx1,dy1,dx2,dy2] = draftRect;
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([6,4]);
      ctx.strokeRect(dx1,dy1,dx2-dx1,dy2-dy1);
      ctx.restore();
    }
    // Fire onCanvasReady only when underlying static content changed (avoid spamming during drag)
    if (onCanvasReady && !draftRect) {
      const sig = `${imageUrl}|${detections.length}|${showBoxes}|${showLabels}|${minScore}`;
      if (sig !== lastReadySigRef.current) {
        lastReadySigRef.current = sig;
        onCanvasReady(canvasRef.current);
      }
    }
  };

  // Re-composite when draftRect changes (fast path while dragging)
  useEffect(() => { if (isActive) compositeFrame(); /* eslint-disable-next-line */ }, [draftRect]);

  // Wheel zoom (ctrl/meta + wheel)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const next = Math.min(5, Math.max(0.2, (effectiveScale || 1) + delta));
      if (isControlled && onScaleChange) onScaleChange(next); else setInternalScale(next);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [effectiveScale, isControlled, onScaleChange]);

  // Annotation drawing
  useEffect(() => {
    if (!annotationMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleDown = (e: MouseEvent) => {
      if (!annotationMode) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (effectiveScale || 1);
      const y = (e.clientY - rect.top) / (effectiveScale || 1);
      dragState.current = { dragging: true, startX: x, startY: y };
      setDraftRect([x, y, x, y]);
    };
    const handleMove = (e: MouseEvent) => {
      if (!dragState.current.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (effectiveScale || 1);
      const y = (e.clientY - rect.top) / (effectiveScale || 1);
      const { startX, startY } = dragState.current;
      setDraftRect([
        Math.min(startX, x),
        Math.min(startY, y),
        Math.max(startX, x),
        Math.max(startY, y),
      ]);
    };
    const handleUp = () => {
      if (!dragState.current.dragging) return;
      dragState.current.dragging = false;
      if (draftRect) {
        const [x1, y1, x2, y2] = draftRect;
        if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
          onNewBox && onNewBox([x1, y1, x2, y2]);
        }
      }
      setDraftRect(null);
    };
    canvas.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [annotationMode, effectiveScale, draftRect, onNewBox, isActive]);

  return (
    <div ref={containerRef} className="w-full overflow-auto border rounded bg-neutral-50 relative max-h-[900px]" style={{ cursor: annotationMode ? 'crosshair' : 'grab' }}>
  <div style={{ transform: `scale(${effectiveScale})`, transformOrigin: 'top left', display: 'inline-block' }}>
        <canvas ref={canvasRef} className="object-contain" />
      </div>
      {annotationMode && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow">
          Annotation Mode
        </div>
      )}
    </div>
  );
};

// Custom props equality to skip re-renders when parent changes unrelated state
function areEqual(prev: Readonly<OverlayProps>, next: Readonly<OverlayProps>): boolean {
  // If inactive state toggled we should allow re-render when becoming active
  if (prev.isActive !== next.isActive) return false;
  if (prev.imageUrl !== next.imageUrl) return false;
  if (prev.showBoxes !== next.showBoxes) return false;
  if (prev.showLabels !== next.showLabels) return false;
  if (prev.minScore !== next.minScore) return false;
  if (prev.scale !== next.scale) return false; // scale transforms container only, but safer to redraw
  if (prev.annotationMode !== next.annotationMode) return false;
  if (prev.strokeWidth !== next.strokeWidth) return false;
  // IMPORTANT: when the annotation callback changes (e.g., selected class updated),
  // we must re-render to rebind event handlers so new annotations use the latest class.
  if (prev.onNewBox !== next.onNewBox) return false;
  // Compare selected class sets (sizes + membership)
  const prevSel = prev.selectedClasses; const nextSel = next.selectedClasses;
  if (prevSel || nextSel) {
    if (!prevSel || !nextSel) return false;
    if (prevSel.size !== nextSel.size) return false;
    for (const c of prevSel) if (!nextSel.has(c)) return false;
  }
  // Shallow compare detections array by length & ids (id fallback to bbox join)
  const pd = prev.detections; const nd = next.detections;
  if (pd.length !== nd.length) return false;
  for (let i=0;i<pd.length;i++) {
    const a = pd[i]; const b = nd[i];
    const aid = a.id || a.bbox.join(',');
    const bid = b.id || b.bbox.join(',');
    if (aid !== bid || a.score !== b.score || a.class_id !== b.class_id) return false;
  }
  // Ignore function identity changes (parent should use useCallback ideally)
  return true;
}

export default React.memo(DetectionsOverlay, areEqual);
