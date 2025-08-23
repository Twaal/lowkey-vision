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
  onNewBox
}: OverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draftRect, setDraftRect] = useState<[number, number, number, number] | null>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number }>({ dragging: false, startX: 0, startY: 0 });

  // Render image + detections + draft rectangle
  useEffect(() => {
    const img = new Image();
    imgRef.current = img;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
  detections.forEach((d: DetectionBox) => {
        if (d.score < minScore) return;
        if (selectedClasses && !selectedClasses.has(d.class_name)) return;
        const [x1, y1, x2, y2] = d.bbox;
        const color = classColors?.[d.class_name] || defaultPalette[d.class_id % defaultPalette.length];
        if (showBoxes) {
          ctx.save();
            if (d.isManual) ctx.setLineDash([4,3]);
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          ctx.restore();
        }
        if (showLabels) {
          const label = `${d.class_name} ${(d.score * 100).toFixed(1)}%`;
          ctx.font = '14px sans-serif';
          ctx.textBaseline = 'top';
          const labelY = showBoxes ? y1 - 18 : y1 + 2;
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = color;
          ctx.fillRect(x1, labelY, textWidth + 8, 18);
          ctx.fillStyle = '#fff';
          ctx.fillText(label, x1 + 4, labelY + 2);
          if (!showBoxes) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x1, y1, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      if (draftRect) {
        const [dx1, dy1, dx2, dy2] = draftRect;
        const ctx2 = canvas.getContext('2d');
        if (ctx2) {
          ctx2.save();
          ctx2.strokeStyle = '#2563eb';
          ctx2.lineWidth = strokeWidth;
          ctx2.setLineDash([6, 4]);
          ctx2.strokeRect(dx1, dy1, dx2 - dx1, dy2 - dy1);
          ctx2.restore();
        }
      }
      onCanvasReady && onCanvasReady(canvasRef.current);
    };
    img.src = imageUrl;
  }, [imageUrl, detections, showBoxes, showLabels, minScore, classColors, selectedClasses, onCanvasReady, strokeWidth, draftRect]);

  // Wheel zoom (ctrl/meta + wheel)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const next = Math.min(5, Math.max(0.2, (scale || 1) + delta));
      onScaleChange && onScaleChange(next);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [scale, onScaleChange]);

  // Annotation drawing
  useEffect(() => {
    if (!annotationMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleDown = (e: MouseEvent) => {
      if (!annotationMode) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (scale || 1);
      const y = (e.clientY - rect.top) / (scale || 1);
      dragState.current = { dragging: true, startX: x, startY: y };
      setDraftRect([x, y, x, y]);
    };
    const handleMove = (e: MouseEvent) => {
      if (!dragState.current.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (scale || 1);
      const y = (e.clientY - rect.top) / (scale || 1);
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
  }, [annotationMode, scale, draftRect, onNewBox]);

  return (
    <div ref={containerRef} className="w-full overflow-auto border rounded bg-neutral-50 relative max-h-[900px]" style={{ cursor: annotationMode ? 'crosshair' : 'grab' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', display: 'inline-block' }}>
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

export default DetectionsOverlay;
