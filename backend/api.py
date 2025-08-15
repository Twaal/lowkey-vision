import uvicorn
import time
import datetime
import os
import numpy as np
# import imageio
import cv2

from fastapi import FastAPI, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware
from inference_unet import predict
from functools import lru_cache


HOST = "0.0.0.0"
PORT = 8000


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
start_time = time.time()

# Cache predictions for 5 seconds to prevent duplicate processing
@lru_cache(maxsize=10)
def cached_predict(image_bytes: bytes, timestamp: int) -> np.ndarray:
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return predict(img)


@app.post("/predict")
async def predict_tumor(file: UploadFile = File(...)):
    # Read image
    contents = await file.read()
    
    # Cache based on image contents and 5-second time window
    timestamp = int(time.time()) // 5
    mask = cached_predict(contents, timestamp)
    
    # Convert mask to bytes
    success, encoded_img = cv2.imencode('.png', mask)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode image")
    
    return Response(content=encoded_img.tobytes(), media_type="image/png")


@app.get('/api')
def hello():
    return {
        "service": "tumor-segmentation",
        "uptime": '{}'.format(datetime.timedelta(seconds=time.time() - start_time))
    }


@app.get('/')
def index():
    return "Your endpoint is running!"


if __name__ == '__main__':
    uvicorn.run(
        'api:app',
        host=HOST,
        port=PORT,
        reload=False
    )
