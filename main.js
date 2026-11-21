const { app, BrowserWindow, Menu, dialog, shell, screen } = require('electron');
const path = require('path');
if (!app.requestSingleInstanceLock()) app.quit();   // one copy at a time (they share the same data)
function createWindow() {
  const win = new BrowserWindow({ width: 1200, height: 800, minWidth: 360, backgroundColor: '#1a0b3b', title: 'MAFFIN BINGO',
    icon: path.join(__dirname, 'app/icons/icon-256.png'), webPreferences: { contextIsolation: true } });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app/index.html'));
  // external links (Telegram, mail, phone) open outside the app; the "TV / second screen" window opens inside
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:|tel:)/.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow', overrideBrowserWindowOptions: { width: 1280, height: 720, autoHideMenuBar: true, backgroundColor: '#1a0b3b', title: 'MAFFIN BINGO - TV' } };
  });
  win.webContents.on('did-create-window', child => {          // put the TV window on the 2nd monitor / TV if one is connected
    const primary = screen.getPrimaryDisplay(), ext = screen.getAllDisplays().find(d => d.id !== primary.id);
    if (ext) { child.setBounds(ext.bounds); child.setFullScreen(true); }
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
  // Backups / CSV files: normal "Save as" window
  win.webContents.session.on('will-download', (e, item) => {
    const p = dialog.showSaveDialogSync(win, { defaultPath: item.getFilename() });
    if (p) item.setSavePath(p); else item.cancel();
  });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
