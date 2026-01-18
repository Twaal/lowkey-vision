# Cell Counter YOLOv8 FastAPI microservice (CUDA)
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-venv \
    python3-pip \
    python3-distutils \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Use python3.10 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1

# Install Python deps
COPY requirements.txt ./
RUN python -m pip install --upgrade pip && \
    python -m pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY api.py ./

# Hugging Face model settings (override at build time if needed)
ARG HF_REPO_ID=twaal/yolo-v8-cell-counting
ARG HF_MODEL_FILE=best.pt
ARG HF_REVISION=main
ARG HF_TOKEN

ENV HF_REPO_ID=${HF_REPO_ID}
ENV HF_MODEL_FILE=${HF_MODEL_FILE}
ENV HF_REVISION=${HF_REVISION}
ENV HF_TOKEN=${HF_TOKEN}

# Download weights into /app/models at build time
RUN python - <<'PY'
from huggingface_hub import hf_hub_download
import os
from pathlib import Path

repo_id = os.environ.get("HF_REPO_ID")
filename = os.environ.get("HF_MODEL_FILE", "best.pt")
revision = os.environ.get("HF_REVISION", None)
token = os.environ.get("HF_TOKEN") or None

models_dir = Path("/app/models")
models_dir.mkdir(parents=True, exist_ok=True)

path = hf_hub_download(
    repo_id=repo_id,
    filename=filename,
    revision=revision,
    token=token,
    local_dir=str(models_dir),
    local_dir_use_symlinks=False,
)
print("Downloaded weights to:", path)
PY

EXPOSE 8003

# Simple healthcheck on root
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0) if urllib.request.urlopen('http://127.0.0.1:8003/', timeout=2).status==200 else sys.exit(1)" || exit 1

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8003"]
