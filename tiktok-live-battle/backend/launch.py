"""Simple local launcher: diagnoses startup and opens the correct browser address."""
from __future__ import annotations
import json,logging,os,socket,sys,threading,time,urllib.request,webbrowser
from pathlib import Path
import uvicorn
from battle.api import create_app

def health(port):
    try:
        opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(f'http://127.0.0.1:{port}/api/health',timeout=.5) as r:return json.load(r)
    except Exception:return {}

def main():
    root=Path(getattr(sys,'_MEIPASS',Path(__file__).resolve().parents[1]))
    if not (root/'frontend'/'dist'/'index.html').is_file():raise RuntimeError('Interface ausente. Extraia o ZIP inteiro antes de iniciar.')
    data=Path(os.environ['LOCALAPPDATA'])/'TikTokLiveBattle2' if os.environ.get('LOCALAPPDATA') else root/'.data-v2'
    data.mkdir(parents=True,exist_ok=True)
    logging.basicConfig(level=logging.INFO,handlers=[logging.FileHandler(data/'inicializacao.log',encoding='utf-8'),logging.StreamHandler()],format='%(asctime)s %(levelname)s: %(message)s')
    for port in range(8766,8776):
        current=health(port)
        if current.get('app')=='tiktok-live-battle' and current.get('version')=='2.1.0':
            print('O programa ja esta aberto. Abrindo o painel existente.');webbrowser.open(f'http://127.0.0.1:{port}');return
        if current.get('app')=='tiktok-live-battle':raise RuntimeError('Feche a janela da versão anterior antes de iniciar esta atualização.')
        with socket.socket() as probe:
            try:probe.bind(('127.0.0.1',port))
            except OSError:continue
        break
    else:raise RuntimeError('Portas 8766 a 8775 ocupadas. Feche instancias anteriores.')
    url=f'http://127.0.0.1:{port}'
    print('\nTikTok Live Battle 2.1 — MODO DE TESTE\nEndereco: '+url+'\nMantenha esta janela aberta enquanto estiver jogando.\nCtrl+C encerra o programa.\n')
    def open_when_ready():
        for _ in range(100):
            if health(port).get('app')=='tiktok-live-battle':webbrowser.open(url);return
            time.sleep(.2)
        print('O navegador nao abriu automaticamente. Copie este endereco: '+url)
    threading.Thread(target=open_when_ready,daemon=True).start()
    uvicorn.run(create_app(data,root/'frontend'/'dist'),host='127.0.0.1',port=port,log_config=None)

if __name__=='__main__':
    try:main()
    except KeyboardInterrupt:pass
    except Exception:
        logging.exception('Falha ao iniciar o programa')
        print('Nao foi possivel iniciar. Consulte inicializacao.log em LOCALAPPDATA/TikTokLiveBattle2.')
        if os.name=='nt':input('Pressione Enter para fechar e copie a mensagem acima para pedir ajuda.')
        raise SystemExit(1)
