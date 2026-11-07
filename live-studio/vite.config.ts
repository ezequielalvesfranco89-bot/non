import {defineConfig} from 'vite';
export default defineConfig({define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{lib:{entry:'src/main.tsx',name:'LiveStudio',formats:['iife'],fileName:()=> 'studio.js'},cssCodeSplit:false},server:{proxy:{'/api':'http://127.0.0.1:8780','/ws':{target:'ws://127.0.0.1:8780',ws:true}}}});
