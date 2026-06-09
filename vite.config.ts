import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { alphaTab } from '@coderline/alphatab-vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
// The alphaTab plugin copies the SMuFL font + worker/worklet assets and wires up
// font discovery. The soundfont is loaded explicitly by URL in the render demo.
export default defineConfig({
  plugins: [react(), alphaTab()],
  test: {
    // The Playwright MCP browser drops Chromium temp profiles (.cdptmp*) in the repo
    // root; their bundled extension *.spec.js files must never be collected as our tests.
    exclude: [...configDefaults.exclude, '**/.cdptmp*/**', '**/.playwright-mcp/**'],
  },
})
