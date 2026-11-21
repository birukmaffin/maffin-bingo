# MAFFIN BINGO v1.1 — Build & installation

The app is plain HTML/CSS/JavaScript that runs fully offline. Installers are built **in the cloud by GitHub Actions** (free) — no Android Studio or Visual Studio needed.

## 1. Upload the project to GitHub (private repository recommended)
1. Unzip `maffin-bingo-v1.1.zip`. Drag everything **except hidden items** into your repository (GitHub skips folders that start with a dot).
2. Open the repository folder `.github/workflows`, click **Add file → Upload files**, and upload `build-android.yml` and `build-windows.yml`.
3. Delete the old `build-apk-1.yml` (and `build-apk.yml` if present) from `.github/workflows`.
4. Make the repository **Private**: Settings → General → Danger zone → *Change visibility* (you sell this app, so keep the code private).
5. **Never upload `MAFFIN-license-generator.html`** — it can create licenses.

## 2. Get the installers
Repository → **Actions** → pick *Build Android APK* or *Build Windows app* → open the latest green run → **Artifacts**:
* `MAFFIN-BINGO-android` → `app-debug.apk` (install on phones; allow *Install unknown apps*)
* `MAFFIN-BINGO-windows` → `MAFFIN BINGO Setup 1.1.0.exe` (installer) and `...portable.exe` (no install)

## 3. Activate each copy (see `LICENSING.md`)
Every device shows a **Device ID**; you send back a code made with the License Generator.

## Notes
* **Printing** works on Windows and in Chrome. It does **not** work inside the Android APK (Android's app view has no print dialog) — print cards from the Windows app or the Chrome-installed version.
* **Backups** on Android open the share sheet (Drive, WhatsApp, Files…). Test backup + restore on the phone before real use.
* **TV:** Android → *TV mode* + Smart View / Cast screen mirroring or an HDMI adapter. Windows → *Second screen* opens a display window that goes full screen on a connected TV/monitor.
* **Voice:** the Android app uses the phone's own text-to-speech engine. Amharic speech needs an Amharic voice on the phone; otherwise the app says so and speaks English while still showing Amharic text.
* **Debug APK** is fine for direct installs. Google Play needs a signed release build.
* Browser/PWA option (optional): host the folder (Netlify Drop etc.) and use Chrome → *Install app*.
