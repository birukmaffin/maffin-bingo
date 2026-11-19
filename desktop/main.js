const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path'), fs = require('fs');
function createWindow() {
  const win = new BrowserWindow({ width: 1200, height: 800, minWidth: 360, backgroundColor: '#1a0b3b', title: 'MAFFIN BINGO',
    icon: path.join(__dirname, 'app/icons/icon-256.png'), webPreferences: { contextIsolation: true } });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app/index.html'));
  // Save backups / CSV files via a normal "Save as" dialog.
  win.webContents.session.on('will-download', (e, item) => {
    const p = dialog.showSaveDialogSync(win, { defaultPath: item.getFilename() });
    if (p) item.setSavePath(p); else item.cancel();
  });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
