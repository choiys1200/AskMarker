// Clear the retired icon preference when upgrading from 0.7.2/0.7.3.
// The only icon from now on is the MarkChat PNG declared in the manifest.
function restoreMarkChat() {
  chrome.action.setIcon({path: chrome.runtime.getManifest().action.default_icon})
    .catch(() => console.warn('AskMarker: 기본 아이콘을 적용하지 못했습니다.'));
  chrome.storage.local.remove('qb:appearance:icon:v1')
    .catch(() => console.warn('AskMarker: 이전 아이콘 설정을 정리하지 못했습니다.'));
}
chrome.runtime.onInstalled.addListener(restoreMarkChat);
// Unpacked overwrite updates may start the new worker without onInstalled.
restoreMarkChat();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content.js']});
    await chrome.action.setBadgeText({tabId: tab.id, text: ''});
  } catch {
    await chrome.action.setBadgeText({tabId: tab.id, text: '!'});
    await chrome.action.setBadgeBackgroundColor({tabId: tab.id, color: '#b45309'});
    await chrome.action.setTitle({tabId: tab.id, title: '이 페이지에서는 사용할 수 없습니다. 일반 웹페이지에서 열어 주세요.'});
  }
});
