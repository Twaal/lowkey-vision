# Cell Counter YOLOv4 FastAPI microservice
# Using Python 3.11 for consistency with backend service; TensorFlow 2.3.1 supports up to Python 3.8/3.9,
# so we will instead pin to Python 3.8-slim to match TF 2.3.1 compatibility.
FROM python:3.8-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python

WORKDIR /app

# System deps (opencv, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better layer cache)
COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy model files (weights, configs, code)
COPY yololib/ ./yololib/
COPY utils/ ./utils/
COPY model_data/ ./model_data/
COPY checkpoints/ ./checkpoints/
COPY api.py ./

EXPOSE 8001

# Health check (simple root endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys;\n\n\nimport json;\n\n\n\n\n\n\n\nurl='http://127.0.0.1:8001/';\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n;\n\n\n\n\n\n\n\n\n\n\n\n\n\ntry: \n  urllib.request.urlopen(url, timeout=2)\nexcept Exception as e: \n  sys.exit(1)" || exit 1

# Start server
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]
