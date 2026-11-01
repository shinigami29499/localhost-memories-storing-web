# Android build

Install Node.js 22 or newer, JDK 21, Android SDK 36, and frontend dependencies once with `npm ci`.

From either `Frontend/` or `Frontend/android/` in PowerShell, run this whenever you want a fresh APK. Update the SDK or JDK paths if they differ on your machine:

```powershell
$env:VITE_API_URL = "https://inc-clubs-acceptable-completely.trycloudflare.com"
$env:ANDROID_HOME = "E:\JDK-SDK\Android\SDK"
$env:JAVA_HOME = "E:\IDE\Android\Android Studio\jbr"
$frontend = (Get-Location).Path
if ((Split-Path $frontend -Leaf) -ieq "android") { $frontend = Split-Path $frontend -Parent }
Push-Location $frontend
try {
    npm.cmd run android:sync
    if ($LASTEXITCODE -ne 0) { throw "Frontend build or Android sync failed" }
    Push-Location (Join-Path $frontend "android")
    try {
        .\gradlew.bat :app:assembleDebug
        if ($LASTEXITCODE -ne 0) { throw "APK build failed" }
        $apkDirectory = "E:\Project\APK"
        New-Item -ItemType Directory -Path $apkDirectory -Force -ErrorAction Stop | Out-Null
        Copy-Item -LiteralPath "app\build\outputs\apk\debug\app-debug.apk" -Destination (Join-Path $apkDirectory "app-debug.apk") -Force -ErrorAction Stop
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}
```

The build copies the debug APK to `E:\Project\APK\app-debug.apk`, replacing an existing file with that name. Gradle also retains its output at `android/app/build/outputs/apk/debug/app-debug.apk`. The APK uses a debug signing key and is intended for development, not distribution. Release builds require a private signing key and a configured release signing process.

Capacitor serves the app from `https://localhost`; add that origin to the backend's `Cors:AllowedOrigins`. The backend must support HTTPS with a certificate trusted by the device.
