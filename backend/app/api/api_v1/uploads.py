from fileinput import filename
import os

from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """Handle file uploads for land records"""
    import uuid
    import os
    from pathlib import Path
    
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR = BASE_DIR / "data" / "uploads"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = file.filename or ""
    file_ext = os.path.splitext(filename)[1]

    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {
        "message": "File uploaded successfully",
        "filename": unique_filename,
        "path": str(file_path)
    }