# Android build

Install Node.js 22 or newer, JDK 21, Android SDK 36, and the frontend dependencies with `npm ci`.

Set `VITE_API_URL` to the HTTPS backend URL reachable by the Android device before building. `localhost` refers to the device itself. Add `https://localhost` to the backend's `Cors:AllowedOrigins`; Capacitor serves the app from that origin. The backend must support HTTPS with a certificate trusted by the device.

From `Frontend/` in PowerShell:

```powershell
$env:VITE_API_URL = "https://your-api.example.com"
npm run android:sync
cd android
.\gradlew.bat assembleDebug
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`. It uses a debug signing key and is intended for development, not distribution. Release builds require a private signing key and a configured release signing process. Run `npm run android:sync` after frontend changes before rebuilding the APK.
