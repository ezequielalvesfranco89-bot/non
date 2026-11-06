"""Windows-friendly entry point, also usable as a PyInstaller target."""
from __future__ import annotations
import logging
import os
from pathlib import Path
import sys
import threading
import time
import urllib.request
import webbrowser
import uvicorn
from battle.api import create_app


def main():
    root=Path(getattr(sys,'_MEIPASS',Path(__file__).resolve().parents[1]))
    data=Path(os.environ.get('LOCALAPPDATA',str(root / '.data'))) / 'TikTokLiveBattle'
    port=8765
    def open_browser():
        for _ in range(50):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=.5) as response:
                    if response.status==200:
                        webbrowser.open(f'http://127.0.0.1:{port}')
                        return
            except OSError:time.sleep(.2)
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(name)s: %(message)s')
    threading.Thread(target=open_browser,daemon=True).start()
    uvicorn.run(create_app(data,root/'frontend'/'dist'),host='127.0.0.1',port=port)


if __name__=='__main__':main()
