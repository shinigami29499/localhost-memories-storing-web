import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shinigacim.app',
  appName: 'ShinigaCim',
  webDir: 'apps/mobile/dist',
  plugins: {
    SystemBars: {
      initialViewportFitValueHint: 'cover'
    }
  }
};

export default config;
