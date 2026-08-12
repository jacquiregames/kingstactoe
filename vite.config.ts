// src/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' 
import { nodePolyfills } from "vite-plugin-node-polyfills";
 

export default defineConfig(() => { 
  const HOST = process.env.HOST;
  const VITE_PORT = process.env.VITE_PORT;

  return {
    plugins: [
      react(),
      nodePolyfills({
        protocolImports: true,
      }),
    ],
    server: {
      host: HOST || "0.0.0.0",  
      port: parseInt(VITE_PORT || "5173", 10),
    }, 
  };
}); 
