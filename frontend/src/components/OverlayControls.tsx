import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface OverlayControlsProps {
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
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
  onClearManualAnnotations?: () => void;
  className?: string;
  density?: 'regular' | 'compact';
}

const OverlayControls: React.FC<OverlayControlsProps> = ({
  showAdvanced,
  setShowAdvanced,
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
  showAnnotationControls = true,
  onClearManualAnnotations,
  className,
  density = 'regular'
}: OverlayControlsProps) => {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const IOU_MIN = 0.01;
  const IOU_MAX = 0.99;
  const iouInverse = iouThreshold > 0 ? 1 / iouThreshold : 1 / IOU_MAX;
  const clampIouInverse = (v: number) => {
    const clamped = clamp(v, 1 / IOU_MAX, 1 / IOU_MIN);
    return clamped;
  };
  const setFromIouInverse = (v: number) => {
    const inv = clampIouInverse(v);
    const nextIou = clamp(1 / inv, IOU_MIN, IOU_MAX);
    setIouThreshold(parseFloat(nextIou.toFixed(3)));
  };
  const isCompact = density === 'compact';
  const textClass = isCompact ? 'text-xs' : 'text-sm';
  const buttonPadding = isCompact ? 'px-2.5 py-1' : 'px-3 py-1';
  const sectionIconClass = isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const [showLabelTools, setShowLabelTools] = React.useState(true);

  return (
    <div className={`${isCompact ? 'space-y-2' : 'space-y-3'} bg-white border rounded ${isCompact ? 'p-3' : 'p-4'} ${isCompact ? '' : 'mb-4'} ${className ?? ''}`}>
      <div className={`flex flex-wrap ${isCompact ? 'gap-3' : 'gap-4'} items-center`}>
        <label className={`flex items-center space-x-2 ${textClass}`}>
          <span>Zoom {(scale*100).toFixed(0)}%</span>
          <input type="range" min={0.25} max={4} step={0.05} value={scale} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setScale(parseFloat(e.target.value))} />
          <input type="number" min={25} max={400} value={Math.round(scale*100)} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setScale(clamp((parseInt(e.target.value)||25)/100,0.25,4))} className="w-18 border rounded px-1 py-0.5 text-xs" />
          <div className="flex flex-col">
            <button type="button" onClick={()=>setScale(clamp(parseFloat((scale+0.05).toFixed(2)),0.25,4))} className="text-xs border rounded-t px-1">+</button>
            <button type="button" onClick={()=>setScale(clamp(parseFloat((scale-0.05).toFixed(2)),0.25,4))} className="text-xs border rounded-b px-1">-</button>
          </div>
        </label>
        {extraLeftButtons}
        <div className="ml-auto flex gap-2">{extraRightButtons}</div>
      </div>
      <div className={`${isCompact ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t`}>
        <div className={`flex flex-wrap items-center gap-2 ${textClass}`}>
          <button
            type="button"
            onClick={() => setShowLabelTools((v: boolean) => !v)}
            className="inline-flex items-center gap-2"
            aria-expanded={showLabelTools}
          >
            {showLabelTools ? <ChevronDown className={sectionIconClass} /> : <ChevronRight className={sectionIconClass} />}
            <span>Labels</span>
          </button>
        </div>
      </div>
      {showLabelTools && (
        <div className={`${isCompact ? 'mt-2' : 'mt-3'} space-y-2`}>
          <div className={`flex flex-wrap ${isCompact ? 'gap-3' : 'gap-4'} items-center`}>
            <label className={`flex items-center space-x-2 ${textClass}`}>
              <span>Bounding Box {strokeWidth}px</span>
              <input type="range" min={1} max={10} step={1} value={strokeWidth} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setStrokeWidth(parseInt(e.target.value))} />
              <input type="number" min={1} max={10} value={strokeWidth} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setStrokeWidth(clamp(parseInt(e.target.value)||1,1,10))} className="w-14 border rounded px-1 py-0.5 text-xs" />
              <div className="flex flex-col">
                <button type="button" onClick={()=>setStrokeWidth(clamp(strokeWidth+1,1,10))} className="text-xs border rounded-t px-1">+</button>
                <button type="button" onClick={()=>setStrokeWidth(clamp(strokeWidth-1,1,10))} className="text-xs border rounded-b px-1">-</button>
              </div>
            </label>
          </div>
          <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-gray-500`}>Use the live/dead buttons to hide that class’s bounding boxes.</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className={`flex items-center space-x-2 ${textClass}`}>
              <input type="checkbox" checked={showLabels} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setShowLabels(e.target.checked)} />
              <span>Show Labels</span>
            </label>
            {Array.from(new Set(availableClasses)).map(name => {
              const active = selectedClasses.has(name);
              return <button key={name} onClick={()=>toggleClass(name)} className={`px-3 py-1 rounded border transition ${active? 'bg-teal-600 text-white border-teal-600':'bg-white text-gray-700 border-gray-300 hover:border-teal-500'}`}>{name}</button>;
            })}
          </div>
        </div>
      )}
      {showAnnotationControls && setAnnotationMode && setNewBoxClass && (
        <div className={`${isCompact ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t`}> 
          <div className={`flex flex-wrap items-start gap-3 ${textClass}`}>
            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => setAnnotationMode(!annotationMode)}
                className="inline-flex items-center gap-2"
                aria-expanded={!!annotationMode}
              >
                {annotationMode ? <ChevronDown className={sectionIconClass} /> : <ChevronRight className={sectionIconClass} />}
                <span>Annotate</span>
              </button>
              {annotationMode && (
                <label className="flex flex-col items-start gap-1">
                  <span className="text-xs text-gray-500">Class</span>
                  <select value={newBoxClass} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setNewBoxClass(e.target.value)} className={`border rounded px-2 py-1 ${textClass}`}>
                    <option value="live">live</option>
                    <option value="dead">dead</option>
                  </select>
                </label>
              )}
            </div>
            {annotationMode && onClearManualAnnotations && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Remove all manual annotations?')) {
                    onClearManualAnnotations();
                  }
                }}
                className={`${textClass} ${buttonPadding} border rounded text-red-600 border-red-300 hover:bg-red-50`}
                title="Remove all manually added boxes"
              >
                Clear Manual Annotations
              </button>
            )}
          </div>
        </div>
      )}
      <div className={`${isCompact ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t`}>
        <div className={`flex flex-wrap items-center gap-2 ${textClass}`}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-2"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? <ChevronDown className={sectionIconClass} /> : <ChevronRight className={sectionIconClass} />}
            <span>Advanced</span>
          </button>
        </div>
      </div>
      {showAdvanced && (
        <div className={`mt-4 pt-4 ${isCompact ? 'space-y-3 text-xs' : 'space-y-4 text-sm'}`}>
          <div className={`flex flex-wrap ${isCompact ? 'gap-4' : 'gap-6'} items-center`}>
            <label className={`flex items-center space-x-2 ${isCompact ? 'text-xs' : ''}`}>
              <span className="whitespace-nowrap">Score ≥ {(minScore*100).toFixed(0)}%</span>
              <input type="range" min={0} max={1} step={0.01} value={minScore} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setMinScore(parseFloat(e.target.value))} />
              <input type="number" min={0} max={100} value={Math.round(minScore*100)} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setMinScore(clamp((parseInt(e.target.value)||0)/100,0,1))} className="w-16 border rounded px-1 py-0.5 text-xs" />
              <div className="flex flex-col">
                <button type="button" onClick={()=>setMinScore(clamp(parseFloat((minScore+0.01).toFixed(2)),0,1))} className="text-[10px] border rounded-t px-1">+</button>
                <button type="button" onClick={()=>setMinScore(clamp(parseFloat((minScore-0.01).toFixed(2)),0,1))} className="text-[10px] border rounded-b px-1">-</button>
              </div>
            </label>
            <label className={`flex items-center space-x-2 ${isCompact ? 'text-xs' : ''}`}>
              <span>Min Area</span>
              <input type="number" min={0} value={minArea} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setMinArea(parseInt(e.target.value)||0)} className={`w-28 border rounded px-2 py-1 ${isCompact ? 'text-xs' : ''}`} />
              <span className="text-xs text-gray-500">px²</span>
            </label>
            <label className={`flex items-center space-x-2 ${isCompact ? 'text-xs' : ''}`}>
              <span>1/IOU ≤ {iouInverse.toFixed(2)}</span>
              <input
                type="range"
                min={(1 / IOU_MAX).toFixed(2)}
                max={(1 / IOU_MIN).toFixed(2)}
                step={0.1}
                value={iouInverse}
                onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setFromIouInverse(parseFloat(e.target.value))}
              />
              <input
                type="number"
                min={(1 / IOU_MAX).toFixed(2)}
                max={(1 / IOU_MIN).toFixed(2)}
                step={0.1}
                value={iouInverse.toFixed(2)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setFromIouInverse(parseFloat(e.target.value)||1/IOU_MAX)}
                className="w-20 border rounded px-1 py-0.5 text-xs"
              />
              <div className="flex flex-col">
                <button type="button" onClick={()=>setFromIouInverse(parseFloat((iouInverse+0.1).toFixed(2)))} className="text-[10px] border rounded-t px-1">+</button>
                <button type="button" onClick={()=>setFromIouInverse(parseFloat((iouInverse-0.1).toFixed(2)))} className="text-[10px] border rounded-b px-1">-</button>
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
