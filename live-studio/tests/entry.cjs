const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const base='http://127.0.0.1:8786';
const server=spawn(process.execPath,[path.join(root,'scripts/preview.mjs')],{cwd:root,env:{...process.env,PORT:'8786'},stdio:'pipe'});
let ready=false;
server.stdout.on('data',chunk=>{if(chunk.toString().includes('Live Studio'))ready=true});
(async()=>{
 let browser;
 try{
  for(let i=0;i<100&&!ready;i++)await new Promise(r=>setTimeout(r,30));
  assert.ok(ready,'A entrada principal não iniciou.');
  browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:process.env.CI?['--no-sandbox']:[]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(7000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.getByRole('heading',{name:'Dê vida às suas interações.'}).waitFor();
  assert.match(await page.title(),/Live Studio/);
  assert.equal(await page.getByText('MAXON OIL',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Enviar presente de teste',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('aria-label')?.includes('1 objetos'));
  await page.getByRole('button',{name:'Seguidor',exact:false}).click();
  await page.getByRole('button',{name:'Simular novo seguidor',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('aria-label')?.includes('395 pixels'));
  await page.getByRole('button',{name:/Biblioteca de ações/}).click();
  assert.equal(await page.locator('.action-card').count(),60);
  for(const route of ['/index.html','/TESTAR.html','/tutorial.html'])assert.equal((await page.request.get(base+route)).status(),200);
  assert.equal((await page.request.get(base+'/api/state')).status(),404);
  assert.equal((await page.request.get(base+'/package.json')).status(),404);
  assert.deepEqual(errors,[]);
  console.log('PASS: entrada principal abre Live Studio; Rosa cria flor, seguidor amplia plataforma, biblioteca oferece 60 ações e tutorial abre.');
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(error=>{console.error(error);process.exitCode=1;server.kill('SIGTERM')});
