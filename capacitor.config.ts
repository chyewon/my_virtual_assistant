import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.va.app',
  appName: 'VA',
  webDir: 'public', // Using public as placeholder since we are using server.url
  server: {
    // For production, you can comment this out to bundle files
    url: 'http://10.0.2.2:3000',
    cleartext: true
  }
};

export default config;
