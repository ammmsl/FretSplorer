import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { alphaTab } from '@coderline/alphatab-vite'

// https://vite.dev/config/
// The alphaTab plugin copies the SMuFL font + worker/worklet assets and wires up
// font discovery. The soundfont is loaded explicitly by URL in the render demo.
export default defineConfig({
  plugins: [react(), alphaTab()],
})
