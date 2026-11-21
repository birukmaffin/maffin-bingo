# Selling MAFFIN BINGO — activation (anti-sharing)

**How it works.** Each device creates a random **Device ID** the first time the app starts. The app is locked until it receives an **activation code** that you sign with your private key for *that* Device ID. Another phone/PC has another Device ID, so a shared copy of the APK/EXE stays locked. The code is checked offline (digital signature), so no internet or server is needed. The license is stored separately from backups — restoring a backup on another device does **not** transfer it.

## For each customer
1. Give them the APK / Windows installer.
2. They open the app → it shows the **Device ID** (e.g. `ABCD-EFGH-JK`) and a Copy button → they send it to you (Telegram/phone).
3. On your computer open **MAFFIN-license-generator.html** in Chrome. Enter the Device ID, the customer/business name (shown in the app and printed on their cards), choose *Lifetime*, *1 year*, … → **Create activation code**.
4. Send the code (copy/paste) → they paste it in the app → **Activate**.
The generator keeps a list of the licenses you issued (saved in that browser on your computer).

## Good to know
* **Reinstall / cleared data / new phone** = new Device ID → issue a new code (your decision whether to charge).
* **Expiring licenses:** choose 1 month / 1 year to sell subscriptions; after the date the app locks and asks for a new code.
* **Keep `MAFFIN-license-generator.html` private** and back it up (USB + Telegram *Saved Messages*). Anyone who has it can create licenses. If you lose it you cannot issue codes for the current apps.
* **Honest limits:** this stops normal sharing. A determined programmer could modify an app file; no offline protection is absolute. Keeping the GitHub repository private and giving customers only the built APK/EXE keeps the code out of reach.
* Your own phone/PC also needs a code (use the same generator).
