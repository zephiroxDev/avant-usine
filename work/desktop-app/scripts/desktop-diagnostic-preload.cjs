const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('AU_WINDOWS_DIAGNOSTIC',{search:()=>ipcRenderer.invoke('au-product-diagnostic')});
