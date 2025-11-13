# Cell Counter YOLOv8 microservice

FastAPI service wrapping Ultralytics YOLOv8 for cell counting. Mirrors the YOLOv4 service responses so the frontend can switch between demos.

## How to use

1. Add your trained YOLOv8 weights file as `models/best.pt` (or set `WEIGHTS_PATH` env var).
2. Build and run with docker-compose (service name `cell-counter-v8`).
3. POST an image to `/predict` to get detections and counts.

## Endpoints

- `GET /` – health/info
- `GET /api` – metadata
- `POST /predict` – accepts form-data file under key `file` and optional query:
  - `score_threshold` (float, default 0.25)
  - `iou_threshold` (float, default 0.45)
  - `min_bbox_size` (int area in px^2 or blank)
  - `imgsz` (int, default 640)

## Compose service

- Service: `cell-counter-v8`
- Port: `8002`

