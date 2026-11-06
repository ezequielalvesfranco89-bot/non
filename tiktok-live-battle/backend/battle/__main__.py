from __future__ import annotations
import argparse
import logging
from pathlib import Path
import uvicorn
from .api import create_app


def main():
    parser = argparse.ArgumentParser(description='TikTok Live Battle — servidor local')
    parser.add_argument('--host', default='127.0.0.1', choices=['127.0.0.1', 'localhost', '::1'], help='Acesso local somente')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--data-dir', type=Path, default=None)
    parser.add_argument('--config', type=Path, default=None, help='Importar JSON de configurações explicitamente na inicialização')
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
    uvicorn.run(create_app(args.data_dir, config_path=args.config), host=args.host, port=args.port, log_level='info')


if __name__ == '__main__':
    main()
