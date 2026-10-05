const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('updates',{choose:choice=>ipcRenderer.invoke('au-update-choice',choice),state:callback=>ipcRenderer.on('au-update-state',(_event,state)=>callback(state))});
