from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import uuid
import os
from pathlib import Path

app = FastAPI(
    title="ZameenAI",
    description="National Intelligent Land Acquisition and Land Records Management System",
    version="1.0.0",
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Handle file uploads for land records"""
    # Ensure upload directory exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    filename = file.filename or ""
    file_ext = os.path.splitext(filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save the file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {
        "message": "File uploaded successfully",
        "filename": unique_filename,
        "path": str(file_path)
    }

@app.get("/")
async def root():
    return JSONResponse({"message": "ZameenAI API - Land Acquisition & Digitization Platform"})