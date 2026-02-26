import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('commentoo', {
  version: '0.0.0',
});
