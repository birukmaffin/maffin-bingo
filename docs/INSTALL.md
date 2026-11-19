# MAFFIN BINGO — Installation

MAFFIN BINGO is an **offline-first web app** (plain HTML/CSS/JavaScript, no framework, no internet needed after the first load). The same files run on Android and Windows. All data is stored on the device, in the browser/app storage.

> **Honest status:** the app itself has been functionally tested (see TESTING below). The packaged `.apk` and `.exe` installers could **not** be built in the environment where this was written (no internet / no Android SDK / no Windows). Section C and D give the exact steps to produce them. Sections A and B work today with no build step.

## A. Android (recommended: install as an app from Chrome)

1. Put the project folder on any static web host **once** (free options: GitHub Pages, Netlify, Cloudflare Pages) — or on a PC in your shop with `python -m http.server 8080` and open `http://<PC-IP>:8080` from the phone on the same Wi-Fi. HTTPS or `localhost` is required for installation.
2. Open the address in **Chrome** on the phone → menu ⋮ → **Install app** (or *Add to Home screen*).
3. Open MAFFIN BINGO once while online; it caches itself. From then on it works in airplane mode.
4. First launch: create your operator PIN and **write down the recovery code**.
5. Voice: Settings → Voice → *Test*. For Amharic speech, install an Amharic voice in Android **Settings → System → Languages → Text-to-speech output**. If none exists the app falls back to English speech and still shows Amharic text.

## B. Windows

**Option 1 — no installation (simplest):** unzip the folder somewhere permanent (e.g. `C:\MaffinBingo`) and double-click `start-windows.bat`. It opens the app in its own Edge/Chrome window. Do not move the folder afterwards (browser storage can be tied to the file location) and **make backups** (Settings → Back up now).

**Option 2 — install as an app:** host the folder as in A.1, open it in Edge/Chrome → Install app.

## C. Build a Windows installer (.exe) — Electron

On a PC with internet and Node.js 18+:
```
cd desktop
npm install
npm run build        # produces dist\MAFFIN BINGO Setup.exe and a portable .exe
```
(`npm start` runs it in a window for testing.) Data is stored in the Windows user profile, independent of folder location. Backups open a normal "Save as" dialog.

## D. Build an Android APK — Capacitor

On a PC with Node.js 18+, Android Studio and JDK 17:
```
mkdir mb-android && cd mb-android
npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android
copy the app files (index.html, css, js, icons, manifest.webmanifest) into ./www
copy android/capacitor.config.json here
npx cap add android && npx cap sync
npx cap open android      # Build > Build APK(s)
```
**Needed before shipping the APK:** inside a WebView, the browser-style file download used by *Back up now* / *Export CSV* may not save a file. Add `@capacitor/filesystem` + `@capacitor/share` and call them from the `download()` function in `js/app.js` (it is the only place files are saved). Test backup + restore on a real phone before relying on it.

## Updating the app
Replace the files and reload. Stored data is kept (it is separate from the app files). Always back up first.
