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
