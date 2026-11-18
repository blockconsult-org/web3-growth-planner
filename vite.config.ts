import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({ plugins: [react(), tailwind()], resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)), 'next/link': fileURLToPath(new URL('./src/link.tsx', import.meta.url)), 'next/navigation': fileURLToPath(new URL('./src/navigation.ts', import.meta.url)), 'next/error': fileURLToPath(new URL('./src/error.tsx', import.meta.url)) } }, build: { target: 'es2022' } });
