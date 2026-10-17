import {ICON_KEY, ICONS, iconOf, iconPaths} from './icon-catalog.js';

// This module owns only the toolbar icon preference. Serializing reads and
// writes also prevents worker startup and concurrent settings tabs racing.
export function installIconPreferences(api) {
  let tail = Promise.resolve();
  const enqueue = task => {
    const result = tail.then(task);
    tail = result.catch(() => {});
    return result;
  };
  const read = async () => iconOf((await api.storage.local.get(ICON_KEY))[ICON_KEY]);
  const restore = () => enqueue(async () => {
    const icon = await read();
    await api.action.setIcon({path:iconPaths(icon.id)});
    return icon.id;
  });
  const select = id => enqueue(async () => {
    if (!ICONS.some(icon => icon.id === id)) throw Error('Unknown icon');
    const previous = await read();
    await api.action.setIcon({path:iconPaths(id)});
    try { await api.storage.local.set({[ICON_KEY]:id}); }
    catch (error) {
      await api.action.setIcon({path:iconPaths(previous.id)});
      throw error;
    }
    return id;
  });
  const quietlyRestore = () => { restore().catch(() => console.warn('AskMarker: 아이콘을 복원하지 못했습니다.')); };
  api.runtime.onInstalled.addListener(quietlyRestore);
  api.runtime.onStartup.addListener(quietlyRestore);
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.hasOwn(changes, ICON_KEY)) quietlyRestore();
  });
  api.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== api.runtime.id) return;
    if (message?.type === 'askmarker:open-icon-options') {
      api.runtime.openOptionsPage().then(() => respond({ok:true}), () => respond({ok:false}));
      return true;
    }
    if (!['askmarker:icon:get','askmarker:icon:set'].includes(message?.type)) return;
    // Only our settings document may read/change this preference via messages.
    if (sender.url?.split(/[?#]/)[0] !== api.runtime.getURL('extension/options.html')) return;
    const task = message.type === 'askmarker:icon:set' ? select(message.id) : restore();
    task.then(id => respond({ok:true,id}), () => respond({ok:false}));
    return true;
  });
  quietlyRestore();
}
