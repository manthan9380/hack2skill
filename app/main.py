from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import numpy as np
import cv2
from pathlib import Path

from .model import TrafficAIModel

app = FastAPI(title="Traffic AI Analyzer")

model = TrafficAIModel()

# API routes must be registered BEFORE mounting static files.
# Mounting StaticFiles at "/" catches everything if registered first,
# which would prevent /api/analyze from ever being reached.
@app.post("/api/analyze")
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()
    print(f"Received file: {file.filename}, size={len(contents)} bytes")

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return JSONResponse(status_code=400, content={"error": "Could not decode image"})

    try:
        result = model.analyze(img)
        return result
    except Exception as exc:
        print("Error analyzing image:", exc)
        return JSONResponse(status_code=500, content={
            "error": "Analysis failed",
            "details": str(exc)
        })


# Mount static files correctly for unified structure.
# 'index.html' is in 'app/', while CSS/JS are in 'app/static/'.
BASE_DIR = Path(__file__).resolve().parent
static_dir = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
async def read_index():
    from fastapi.responses import FileResponse
    return FileResponse(BASE_DIR / "index.html")
