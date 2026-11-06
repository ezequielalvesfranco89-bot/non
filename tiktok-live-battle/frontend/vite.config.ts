import {defineConfig} from 'vite';
export default defineConfig({server:{proxy:{'/api':'http://127.0.0.1:8766','/ws':{target:'ws://127.0.0.1:8766',ws:true}}},build:{chunkSizeWarningLimit:900}});
