import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const js=readFileSync('dist/studio.js','utf8'),css=readFileSync('dist/live-studio.css','utf8');
const header='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f5ef"><title>Live Studio — seu público muda a cena</title>';
const standalone=header+'<style>'+css+'</style></head><body><div id="root"></div><script>'+js.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
writeFileSync('TESTAR.html',standalone);
if(existsSync('../LEIA-PRIMEIRO.md'))writeFileSync('../index.html',standalone);
writeFileSync('dist/index.html',header+'<link rel="stylesheet" href="/live-studio.css"></head><body><div id="root"></div><script defer src="/studio.js"></script></body></html>');
console.log('TESTAR.html criado: arquivo único, sem CDN nem instalação.');
