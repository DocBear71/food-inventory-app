import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kitchen.docbearscomfort.www',
  appName: "Doc Bear's Comfort Kitchen",
  webDir: 'out',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        Camera: {
            permissions: ['camera']
        }
    }
};

export default config;
