import uvicorn
import time
import datetime
import os
import numpy as np
# import imageio
import cv2

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from inference_unet import predict_mask


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


@app.post("/predict")
async def predict_tumor(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"error": "Invalid image"}
    
    try:
        mask = predict_mask(img)
        _, img_encoded = cv2.imencode('.png', mask)
        return Response(content=img_encoded.tobytes(), media_type="image/png")
    except Exception as e:
        print(f"Inference error: {str(e)}")
        return {"error": "Inference failed"}


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
