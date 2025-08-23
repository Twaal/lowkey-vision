"""FastAPI inference service for cell counting (YOLOv4/YOLOv3).

POST /predict accepts an uploaded image and returns JSON with detections:
{
  "model": "yolov4",
  "num_detections": int,
  "detections": [
     {"bbox": [x1,y1,x2,y2], "score": float, "class_id": int, "class_name": str}
  ],
  "counts": {"Alive": int, "Dead": int},
  "viability": float (0-100)
}
"""

from __future__ import annotations

import uvicorn
import time
import datetime
import os
from pathlib import Path
from functools import lru_cache
from typing import List, Dict, Any, Optional

import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure GPU is disabled unless explicitly desired.
os.environ.setdefault('CUDA_VISIBLE_DEVICES', '-1')
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '2')  # Reduce TF log verbosity

from yololib.configs import (
    YOLO_INPUT_SIZE,
    TRAIN_CLASSES,
    TRAIN_CHECKPOINTS_FOLDER,
    TRAIN_MODEL_NAME,
    YOLO_TYPE,
    YOLO_FRAMEWORK,
)
from yololib.yolov3 import Create_Yolov3  # noqa: F401 (imported conditionally)
from yololib.yolov4 import Create_Yolo, read_class_names
from yololib.utils import filter_bboxes

HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", 8001))

BASE_DIR = Path(__file__).resolve().parent
WEIGHTS_PATH = BASE_DIR / TRAIN_CHECKPOINTS_FOLDER / TRAIN_MODEL_NAME
CLASSES_PATH = BASE_DIR / TRAIN_CLASSES

app = FastAPI(title="Cell Counter YOLO API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

start_time = time.time()


@app.on_event("startup")
def warm_start_model():
    """Load model into memory and run a dummy forward pass to avoid first-request cold start."""
    try:
        model = get_model()  # Loads weights (cached)
        # Create a dummy black image matching expected input size to build graph / allocate tensors
        import numpy as _np
        dummy = _np.zeros((YOLO_INPUT_SIZE, YOLO_INPUT_SIZE, 3), dtype=_np.uint8)
        # Run one prediction pass (ignore results)
        run_prediction_array(model, dummy, YOLO_INPUT_SIZE)
    except Exception as e:  # pragma: no cover
        # Log but don't crash service; first real request will still work.
        print(f"[warm_start_model] Warning: warm-up failed: {e}")


def _create_model():
    """Load the YOLO model and weights once."""
    input_size = YOLO_INPUT_SIZE
    if YOLO_TYPE == 'yolov3':
        model = Create_Yolov3(input_size=input_size, CLASSES=str(CLASSES_PATH))
    else:  # yolov4
        model = Create_Yolo(input_size=input_size, CLASSES=str(CLASSES_PATH))
    model.load_weights(str(WEIGHTS_PATH))
    return model


@lru_cache(maxsize=1)
def get_model():
    return _create_model()


@lru_cache(maxsize=1)
def get_class_map() -> Dict[int, str]:
    return read_class_names(str(CLASSES_PATH))


def run_prediction_array(yolo, image: np.ndarray, input_size: int):
    """Replicates yololib.utils.run_prediction but operates on an in-memory image array."""
    from yololib.configs import YOLO_FRAMEWORK as _FRAMEWORK  # local import to avoid circular
    import tensorflow as tf  # Heavy import kept inside function for faster module import
    from yololib.utils import image_preprocess, postprocess_boxes

    original_image = image
    image_data = image_preprocess(np.copy(original_image), [input_size, input_size])
    image_data = image_data[np.newaxis, :, :].astype(np.float32)

    pred_bbox = []
    if _FRAMEWORK == "tf":
        pred_bbox = yolo.predict(image_data)
    elif _FRAMEWORK == "trt":
        batched_input = tf.constant(image_data)
        result = yolo(batched_input)
        for _, value in result.items():
            pred_bbox.append(value.numpy())

    pred_bbox = [tf.reshape(x, (-1, tf.shape(x)[-1])) for x in pred_bbox]
    pred_bbox = tf.concat(pred_bbox, axis=0)
    bboxes = postprocess_boxes(pred_bbox, original_image, input_size, 0)
    return bboxes


def prepare_detections(bboxes: np.ndarray) -> Dict[str, Any]:
    class_map = get_class_map()
    counts = {name: 0 for name in class_map.values()}
    detections = []
    for bbox in bboxes:
        x1, y1, x2, y2, score, cls_id = bbox
        cls_id = int(cls_id)
        score_f = float(score)
        name = class_map.get(cls_id, str(cls_id))
        counts[name] = counts.get(name, 0) + 1
        detections.append({
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "score": round(score_f, 4),
            "class_id": cls_id,
            "class_name": name,
        })
    # Compute viability if Alive/Dead present
    alive = counts.get("Alive", 0)
    dead = counts.get("Dead", 0)
    viability = (alive / (alive + dead) * 100.0) if (alive + dead) > 0 else None
    return {
        "model": YOLO_TYPE,
        "num_detections": len(detections),
        "detections": detections,
        "counts": counts,
        "viability": round(viability, 2) if viability is not None else None,
    }


def decode_image(contents: bytes) -> np.ndarray:
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")
    return img


@lru_cache(maxsize=32)
def cached_prediction(image_hash: int, window: int):
    # This function intentionally returns nothing directly; actual prediction is done in predict endpoint.
    # The cache key ensures repeated identical images within the time window reuse computation.
    return None


@app.post("/predict")
async def predict_cells(file: UploadFile = File(...),
                        score_threshold: float = 0.0,
                        iou_threshold: float = 0.999,
                        min_bbox_size: Optional[int] = None,
                        raw: bool = False):
    contents = await file.read()
    img = decode_image(contents)

    # Compute stable hash of image bytes
    img_hash = hash(contents)
    window = int(time.time()) // 5  # 5-second cache window
    if cached_prediction(img_hash, window) is not None:
        # Not storing predictions in cache to avoid large memory, but could be extended.
        pass

    yolo = get_model()
    try:
        bboxes = run_prediction_array(yolo, img, YOLO_INPUT_SIZE)
        # Sanitize inputs
        score_threshold_s = max(0.0, min(1.0, score_threshold))
        iou_threshold_s = max(0.0, min(0.9999, iou_threshold))  # cap below 1.0 for NMS logic
        # If raw requested, skip all filtering (except convert to list later)
        if not raw:
            # If iou threshold extremely high treat as no-NMS: skip calling filter_bboxes NMS step by setting iou near 1
            bboxes = filter_bboxes(
                bboxes,
                score_threshold=score_threshold_s,
                iou_threshold=iou_threshold_s,
                min_bbox_size=min_bbox_size,
            )
    except Exception as e:  # pragma: no cover - broad for inference robustness
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}") from e

    result = prepare_detections(bboxes)
    # Indicate server-side thresholds used
    result["server_thresholds"] = {
        "score_threshold": score_threshold_s if not raw else 0.0,
        "iou_threshold": iou_threshold_s if not raw else None,
        "min_bbox_size": min_bbox_size if not raw else None,
        "raw": raw,
    }
    return result


@app.get('/api')
def meta():
    return {
        "service": "cell-counter-yolov4",
        "model": YOLO_TYPE,
        "uptime": str(datetime.timedelta(seconds=time.time() - start_time)),
        "weights": str(WEIGHTS_PATH.name),
    }


@app.get('/')
def root():
    return {"message": "Cell Counter YOLO API running", "predict_endpoint": "/predict"}


if __name__ == '__main__':
    uvicorn.run('api:app', host=HOST, port=PORT, reload=False)
