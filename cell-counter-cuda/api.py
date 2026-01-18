"""FastAPI inference service for cell counting (YOLOv8 / Ultralytics).

POST /predict accepts an uploaded image and returns JSON with detections:
{
  "model": "yolov8",
  "num_detections": int,
  "detections": [
     {"bbox": [x1,y1,x2,y2], "score": float, "class_id": int, "class_name": str}
  ],
  "counts": {"live": int, "dead": int},
  "viability": float (0-100)
}

Weights are pulled from Hugging Face at build time (or downloaded at runtime if missing).
"""
from __future__ import annotations

import uvicorn
import os
import time
import datetime
from pathlib import Path
from functools import lru_cache
from typing import Any, Dict, List, Optional

import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Ultralytics YOLOv8
from ultralytics import YOLO
from huggingface_hub import hf_hub_download

HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", 8002))

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_WEIGHTS = BASE_DIR / "models" / "best.pt"
WEIGHTS_PATH = Path(os.getenv("WEIGHTS_PATH", str(DEFAULT_WEIGHTS)))

HF_REPO_ID = os.getenv("HF_REPO_ID", "twaal/yolo-v8-cell-counting")
HF_MODEL_FILE = os.getenv("HF_MODEL_FILE", "best.pt")
HF_REVISION = os.getenv("HF_REVISION")
HF_TOKEN = os.getenv("HF_TOKEN")

app = FastAPI(title="Cell Counter YOLOv8 API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:5173", "http://localhost:80/", "http://localhost:8080/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

start_time = time.time()


@lru_cache(maxsize=1)
def get_model() -> YOLO:
    weights_path = ensure_weights()
    model = YOLO(str(weights_path))
    return model


def ensure_weights() -> Path:
    if WEIGHTS_PATH.exists():
        return WEIGHTS_PATH

    WEIGHTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    path = hf_hub_download(
        repo_id=HF_REPO_ID,
        filename=HF_MODEL_FILE,
        revision=HF_REVISION,
        token=HF_TOKEN or None,
        local_dir=str(WEIGHTS_PATH.parent),
        local_dir_use_symlinks=False,
    )
    return Path(path)


@app.on_event("startup")
def warm_start_model():
    try:
        model = get_model()
        # warm-up with a dummy image
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        model.predict(source=dummy, imgsz=640, conf=0.25, iou=0.45, verbose=False)
    except Exception as e:  # pragma: no cover
        print(f"[warm_start_model] Warning: warm-up failed: {e}")


def decode_image(contents: bytes) -> np.ndarray:
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")
    return img


def prepare_detections_from_results(results, min_bbox_size: Optional[int]) -> Dict[str, Any]:
    # results is a list with one element for single image
    r = results[0]
    # Boxes: xyxy, conf, cls
    boxes = r.boxes
    if boxes is None:
        dets: List[Dict[str, Any]] = []
    else:
        xyxy = boxes.xyxy.cpu().numpy() if hasattr(boxes.xyxy, 'cpu') else boxes.xyxy.numpy()
        conf = boxes.conf.cpu().numpy() if hasattr(boxes.conf, 'cpu') else boxes.conf.numpy()
        cls = boxes.cls.cpu().numpy() if hasattr(boxes.cls, 'cpu') else boxes.cls.numpy()
        dets = []
        for (x1, y1, x2, y2), sc, c in zip(xyxy, conf, cls):
            w = float(x2 - x1)
            h = float(y2 - y1)
            area = w * h
            if min_bbox_size is not None and area < float(min_bbox_size):
                continue
            cid = int(c)
            cname = None
            try:
                # Ultralytics stores names dict on model and results
                names = r.names if hasattr(r, 'names') and r.names else (getattr(r, 'model', None).names if hasattr(r, 'model') else None)
                if names is not None:
                    # names can be list or dict
                    if isinstance(names, dict):
                        cname = names.get(cid, str(cid))
                    elif isinstance(names, list) and cid < len(names):
                        cname = names[cid]
            except Exception:
                pass
            dets.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "score": round(float(sc), 4),
                "class_id": cid,
                "class_name": str(cname) if cname is not None else str(cid),
            })

    # counts and viability
    counts: Dict[str, int] = {}
    for d in dets:
        name = d["class_name"]
        counts[name] = counts.get(name, 0) + 1
    alive = counts.get("live", 0)
    dead = counts.get("dead", 0)
    viability = (alive / (alive + dead) * 100.0) if (alive + dead) > 0 else None

    return {
        "model": "yolov8",
        "num_detections": len(dets),
        "detections": dets,
        "counts": counts,
        "viability": round(viability, 2) if viability is not None else None,
    }


@app.post("/predict")
async def predict_cells(
    file: UploadFile = File(...),
    score_threshold: float = 0.25,
    iou_threshold: float = 0.45,
    min_bbox_size: Optional[str] = Query(None, description="Minimum bbox area in pixels^2; leave blank for no size filter"),
    imgsz: int = 640,
):
    contents = await file.read()
    img = decode_image(contents)

    try:
        if min_bbox_size in (None, "", "none", "null"):
            mbs_val: Optional[int] = None
        else:
            try:
                mbs_val = int(min_bbox_size)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                raise HTTPException(status_code=422, detail="min_bbox_size must be an integer or empty")

        conf = max(0.0, min(1.0, score_threshold))
        iou = max(0.0, min(0.9999, iou_threshold))

        model = get_model()
        results = model.predict(source=img, imgsz=int(imgsz), conf=conf, iou=iou, verbose=False)
        result = prepare_detections_from_results(results, min_bbox_size=mbs_val)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}") from e

    result["server_thresholds"] = {
        "score_threshold": conf,
        "iou_threshold": iou,
        "min_bbox_size": mbs_val,
        "raw": False,
    }
    return result


@app.get('/api')
def meta():
    weights_path = ensure_weights()
    return {
        "service": "cell-counter-yolov8",
        "model": "yolov8",
        "uptime": str(datetime.timedelta(seconds=time.time() - start_time)),
        "weights": str(weights_path.name),
    }


@app.get('/')
def root():
    return {"message": "Cell Counter YOLOv8 API running", "predict_endpoint": "/predict"}


if __name__ == '__main__':
    uvicorn.run('api:app', host=HOST, port=PORT, reload=False)
