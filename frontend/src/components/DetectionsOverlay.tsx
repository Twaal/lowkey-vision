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
  autoFit?: boolean;
  isActive?: boolean;
}

const defaultPalette = ['#10b981', '#ef4444', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6'];
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_WHEEL_SENSITIVITY = 0.003;

const PAN_DRAG_SENSITIVITY = 0.9;

const strokeRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.stroke();
};

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
  const panState = useRef<{ panning: boolean; startX: number; startY: number; startScrollLeft: number; startScrollTop: number }>(
    { panning: false, startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0 }
  );
  const [isPanning, setIsPanning] = useState(false);
  const hasAutoFit = useRef(false);
  const isControlled = (onScaleChange !== undefined && scale !== undefined);
  const [internalScale, setInternalScale] = useState<number>(scale ?? 1);
  const effectiveScale = isControlled ? (scale as number) : internalScale;
  const baseLayerRef = useRef<HTMLCanvasElement | null>(null);
  const detLayerRef = useRef<HTMLCanvasElement | null>(null);
  const detLayerDirty = useRef(true);
  const [imageDims, setImageDims] = useState<{w:number;h:number}|null>(null);
  const lastReadySigRef = useRef<string>('');


  useEffect(() => { hasAutoFit.current = false; }, [imageUrl]);

  useEffect(() => {
    if (!isActive) return;
    const img = new Image();
    imgRef.current = img;
    img.onload = () => {
      imageDims && imageDims.w === img.width && imageDims.h === img.height ? null : setImageDims({w: img.width, h: img.height});
      if (!baseLayerRef.current) baseLayerRef.current = document.createElement('canvas');
      const base = baseLayerRef.current;
      base.width = img.width; base.height = img.height;
      const bctx = base.getContext('2d');
      if (bctx) { bctx.clearRect(0,0,base.width,base.height); bctx.drawImage(img,0,0); }
      detLayerDirty.current = true;
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
    const availH = container.clientHeight || Math.max(200, window.innerHeight - 200);
    const scaleW = availW / w;
    const scaleH = availH / h;
    const unclamped = Math.min(scaleW, scaleH);
    const fitScale = Math.max(ZOOM_MIN, Math.min(unclamped, ZOOM_MAX));
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
        const r = Math.max(2, strokeWidth * 2);
        strokeRoundedRect(dctx, x1, y1, x2 - x1, y2 - y1, r);
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
      const r = Math.max(2, strokeWidth * 2);
      strokeRoundedRect(ctx, dx1, dy1, dx2 - dx1, dy2 - dy1, r);
      ctx.restore();
    }
    if (onCanvasReady && !draftRect) {
      const sig = `${imageUrl}|${detections.length}|${showBoxes}|${showLabels}|${minScore}`;
      if (sig !== lastReadySigRef.current) {
        lastReadySigRef.current = sig;
        onCanvasReady(canvasRef.current);
      }
    }
  };

  useEffect(() => { if (isActive) compositeFrame(); /* eslint-disable-next-line */ }, [draftRect]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const clampScale = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    const applyScale = (value: number) => {
      if (isControlled && onScaleChange) onScaleChange(value);
      else setInternalScale(value);
    };
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const current = effectiveScale || 1;
      const modeScale = e.deltaMode === 1 ? 14 : e.deltaMode === 2 ? 60 : 1;
      const zoomFactor = Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY * modeScale);
      const next = clampScale(parseFloat((current * zoomFactor).toFixed(4)));
      applyScale(next);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [effectiveScale, isControlled, onScaleChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleDown = (e: MouseEvent) => {
      if (annotationMode) return;
      if (e.button !== 0) return;
      panState.current.panning = true;
      panState.current.startX = e.clientX;
      panState.current.startY = e.clientY;
      panState.current.startScrollLeft = el.scrollLeft;
      panState.current.startScrollTop = el.scrollTop;
      setIsPanning(true);
      e.preventDefault();
    };
    const handleMove = (e: MouseEvent) => {
      if (!panState.current.panning) return;
      const dx = e.clientX - panState.current.startX;
      const dy = e.clientY - panState.current.startY;
      el.scrollLeft = panState.current.startScrollLeft - dx * PAN_DRAG_SENSITIVITY;
      el.scrollTop = panState.current.startScrollTop - dy * PAN_DRAG_SENSITIVITY;
      e.preventDefault();
    };
    const handleUp = () => {
      if (!panState.current.panning) return;
      panState.current.panning = false;
      setIsPanning(false);
    };
    el.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      el.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [annotationMode]);

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
    <div
      ref={containerRef}
      className="w-full overflow-auto border rounded bg-neutral-50 relative max-h-[calc(100vh-220px)] h-[calc(100vh-220px)] min-h-[320px]"
      style={{ cursor: annotationMode ? 'crosshair' : (isPanning ? 'grabbing' : 'grab'), touchAction: annotationMode ? 'none' : 'pan-x pan-y' }}
    >
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

function areEqual(prev: Readonly<OverlayProps>, next: Readonly<OverlayProps>): boolean {
  if (prev.isActive !== next.isActive) return false;
  if (prev.imageUrl !== next.imageUrl) return false;
  if (prev.showBoxes !== next.showBoxes) return false;
  if (prev.showLabels !== next.showLabels) return false;
  if (prev.minScore !== next.minScore) return false;
  if (prev.scale !== next.scale) return false;
  if (prev.annotationMode !== next.annotationMode) return false;
  if (prev.strokeWidth !== next.strokeWidth) return false;
  if (prev.onNewBox !== next.onNewBox) return false;
  const prevSel = prev.selectedClasses; const nextSel = next.selectedClasses;
  if (prevSel || nextSel) {
    if (!prevSel || !nextSel) return false;
    if (prevSel.size !== nextSel.size) return false;
    for (const c of prevSel) if (!nextSel.has(c)) return false;
  }
  const pd = prev.detections; const nd = next.detections;
  if (pd.length !== nd.length) return false;
  for (let i=0;i<pd.length;i++) {
    const a = pd[i]; const b = nd[i];
    const aid = a.id || a.bbox.join(',');
    const bid = b.id || b.bbox.join(',');
    if (aid !== bid || a.score !== b.score || a.class_id !== b.class_id) return false;
  }
  return true;
}

export default React.memo(DetectionsOverlay, areEqual);
