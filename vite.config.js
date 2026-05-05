import { defineConfig } from 'vite';

export default defineConfig({
  // Served at https://bms-uxui.github.io/bms-timesheet/ in production.
  base: process.env.NODE_ENV === 'production' ? '/bms-timesheet/' : '/',
  test: { environment: 'node' },
});
