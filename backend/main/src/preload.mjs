// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('Api', {
    async openFileDialog() {
        return await ipcRenderer.invoke('open-file-dialog');
    },
    async openFolderDialog() {
        return await ipcRenderer.invoke('open-folder-dialog');
    },
    invokeFilesDownload(filePaths, isDir) {
        ipcRenderer.send('send-files', filePaths, isDir);
    },
    invokeGetAddress() {
        ipcRenderer.invoke('get-address', (addr) => {
            console.log(addr);
        });
    },
    getIfaces() {
        return ipcRenderer.invoke('get-interfaces');
    },
    getDestFolder() {
        return ipcRenderer.invoke('get-dest-folder');
    },
    openDestFolder() {
        ipcRenderer.send('open-dest-folder');
    },
    changeDestFolder() {
        return ipcRenderer.invoke('change-dest-folder');
    }
});

ipcRenderer.on('interfaces', (ev, ifaces) => {
    window.dispatchEvent(new CustomEvent('interfaces', {
        detail: { ifaces }
    }));
});

ipcRenderer.on('uploadProgress', (ev, percentage) => {
    const uploadProgressEvent = new CustomEvent('uploadProgress', {
        detail: { percentage }
    });
    window.dispatchEvent(uploadProgressEvent);
})