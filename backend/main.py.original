# main.py
import os
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- Logging Setup ---
DEBUG = os.getenv("DEBUG", "0") == "1"
log_level = logging.DEBUG if DEBUG else logging.INFO
logging.basicConfig(level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')

# Local imports must happen after root logging is configured
from api import router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bring in all the routes from api.py
app.include_router(router)

if __name__ == "__main__":
    host_ip = "0.0.0.0" 
    port = int(os.getenv("PORT", 3000))
    logging.info(f"Starting server on http://localhost:{port} and http://{host_ip}:{port}")
    uvicorn.run("main:app", host=host_ip, port=port, log_level="info", ws_ping_interval=20, ws_ping_timeout=20)
