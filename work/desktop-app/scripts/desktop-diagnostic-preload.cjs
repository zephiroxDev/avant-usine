const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('AU_WINDOWS_DIAGNOSTIC',{search:()=>ipcRenderer.invoke('au-product-diagnostic')});
contextBridge.exposeInMainWorld('AU_APP_ICON',{get:()=>ipcRenderer.invoke('au-product-icon','get'),set:icon=>ipcRenderer.invoke('au-product-icon',icon)});
contextBridge.exposeInMainWorld('AU_APP_NOTIFICATION',{show:message=>ipcRenderer.invoke('au-product-notification',message)});
