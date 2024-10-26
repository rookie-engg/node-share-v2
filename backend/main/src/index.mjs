import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import startServerOnPort, { getActiveSocket, app as expressApp } from '../../file-server/index.mjs';
import settings from 'electron-settings';
import path from 'node:path';
import portfinder from 'portfinder';
import { networkInterfaces } from 'node:os';
import getMatchingWifiInterfaces from './getWifiInterface.mjs';
import IPChangeDectector from './IPChangeDetector.mjs';
import fs from 'node:fs';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (import('electron-squirrel-startup')) {
//   app.quit();
// }

/**
 * 
 * @returns {Object<string, string[]>}
 */
function getIfaces() {
  return Object.entries(networkInterfaces())
    .map(([ifname, value]) => {
      const temp = {};
      temp[ifname] = value
        .filter(({ family, internal }) => family === 'IPv4' && !internal)
        .map(ifac => ifac.address);
      return temp;
    }).reduce((acc, curr) => ({ ...acc, ...curr }));
}

const destname = 'node-share-download';
// settings.setSync('uploaddir', undefined);
(() => {
  if (settings.getSync('uploaddir')) return;
  let specialPath = '';

  try {
    specialPath = path.join(app.getPath('downloads'), destname);
    settings.setSync('uploaddir', specialPath);
    if (!fs.mkdirSync(specialPath, { recursive: true })) {
      throw new Error(`cannot create destination folder:\n ${specialPath}`);
    }
    return;
  } catch {
    console.log('cannot get downloads path');
  }

  try {
    specialPath = path.join(app.getPath('documents'), destname);
    settings.setSync('uploaddir', specialPath);
    if (!fs.mkdirSync(specialPath, { recursive: true })) {
      throw new Error(`cannot create destination folder:\n ${specialPath}`);
    }
    return;
  } catch {
    console.log('cannot get documents path');
  }

  try {
    specialPath = path.join(app.getPath('desktop'), destname);
    settings.setSync('uploaddir', specialPath);
    if (!fs.mkdirSync(specialPath, { recursive: true })) {
      throw new Error(`cannot create destination folder:\n ${specialPath}`);
    }
    return;
  } catch {
    console.log('cannot get desktop path');
  }

  specialPath = path.join(app.getPath('home'), destname);
  settings.setSync('uploaddir', specialPath);
  fs.mkdirSync(specialPath, { recursive: true });

})();


ipcMain.handle('get-dest-folder', (_ev) => settings.get('uploaddir'));
ipcMain.on('open-dest-folder', (_ev) => {
  shell.openPath(settings.getSync('uploaddir'));
})


const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 415,
    height: 700,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(import.meta.dirname, 'preload.mjs'),
    },
  });
  expressApp.locals.mainWindow = mainWindow;

  const port = await portfinder.getPortPromise({ port: 8080 });

  ipcMain.handle('open-file-dialog', (_ev) => {
    return dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections']
    });
  });

  ipcMain.handle('open-folder-dialog', (_ev) => {
    return dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'multiSelections']
    })
  });

  ipcMain.on('send-files', (_ev, filePaths, isDir) => {
    const socket = getActiveSocket();
    if (!socket) {
      console.log('No active client connected');
      return;
    }
    socket.emit('downloadFiles', Array.from(filePaths).map(file => ({
      name: path.basename(file),
      path: file,
      isDir
    })));
  });

  ipcMain.handle('change-dest-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'select destination folder',
      properties: ['openDirectory']
    })
    if (!canceled) {
      settings.setSync('uploaddir', filePaths[0]);
      return true
    }
    return false
  });


  await startServerOnPort(port);
  console.log('Server is on following address');
  const ifaces = getIfaces();
  const wifiIfaces = getMatchingWifiInterfaces().map(i => ifaces[i]);

  ipcMain.handle('get-interfaces', () => ({ ifaces, wifiIfaces, port }));
  mainWindow.webContents.addListener('did-finish-load', () => {
    mainWindow.webContents.send('interfaces', { ifaces, wifiIfaces, port });
  })

  const ipChangeDetector = new IPChangeDectector();
  ipChangeDetector.addListener('ipChanged', () => {
    const ifaces = getIfaces();
    const wifiIfaces = getMatchingWifiInterfaces().map(i => ifaces[i]);
    console.log(wifiIfaces);

    mainWindow.webContents.send('interfaces', { ifaces, wifiIfaces, port });
  });

  Object.entries(ifaces).forEach(([ifname, value]) => {
    if (!value.length) return;
    console.log(ifname);
    value.forEach(addr => console.log(`   http://${addr}:${port}\n`));
  });

  ipcMain.handle('get-address', (_ev) => {
    return [ifaces, wifiIfaces]
  });

  Menu.setApplicationMenu(null);
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(import.meta.dirname, 'ui', 'index.html'));
  // await mainWindow.loadURL('http://localhost:3001');
  // Open the DevTools
  // mainWindow.webContents.openDevTools();
  return mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  const mainWindow = await createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
