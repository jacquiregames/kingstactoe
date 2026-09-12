import os
import sys
import logging
import threading
import uvicorn
import webview
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from api import router

# --- Logging Setup ---
DEBUG = os.getenv("DEBUG", "0") == "1"
log_level = logging.DEBUG if DEBUG else logging.INFO
logging.basicConfig(level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Include API Routes first
app.include_router(router)

# 2. Helper to find the React 'dist' folder whether running locally or packaged inside the .exe
def get_resource_path(relative_path):
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        # If running locally, assume dist is one folder up from backend/
        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    return os.path.join(base_path, relative_path)

dist_path = get_resource_path("dist")

# 3. Catch-all route to serve the built React files
@app.get("/{file_path:path}")
async def serve_static(file_path: str):
    # Default to index.html if no file is specified
    if file_path == "":
        file_path = "index.html"
        
    full_path = os.path.join(dist_path, file_path)
    
    # If the file exists, serve it. Otherwise, fallback to index.html (for React routing)
    if os.path.isfile(full_path):
        return FileResponse(full_path)
    return FileResponse(os.path.join(dist_path, "index.html"))

# 4. Function to start the FastAPI server in a background thread
def start_server(port):
    # Notice we pass the 'app' instance directly, not "main:app"
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info", ws_ping_interval=20, ws_ping_timeout=20)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    
    # Start the backend server in a separate thread
    t = threading.Thread(target=start_server, args=(port,))
    t.daemon = True
    t.start()
    
    # Open the native Windows GUI using Edge Chromium
    webview.create_window(
        title='Kings Tac Toe', 
        url=f'http://127.0.0.1:{port}', 
        width=1920, 
        height=1080,
        min_size=(1280, 800)
    )
    webview.start()