console.debug('Start service-worker.js');

const notificationQueue = [];

const notificationCore = async (options) => {
  console.debug(JSON.stringify(options, null, 2));
  const notificationId = await chrome.notifications.create(options.notificationOptions);
  const timeout = setTimeout(() => {
    chrome.notifications.clear(notificationId);
    chrome.notifications.onClosed.dispatch();
  }, 10000)
  chrome.notifications.onClosed.addListener(async (/* notificationId, byUser */) => {
    notificationQueue.shift();
    if (notificationQueue.length == 0) return;
    await notificationCore(notificationQueue[0]);
  });
  chrome.notifications.onClicked.addListener(async (/* notificationId */) => {
    await chrome.tabs.update(options.tab.id, {active: true, highlighted:true})
    await chrome.windows.update(options.tab.windowId, {focused: true});
    clearTimeout(timeout);
    notificationQueue.shift();
    if (notificationQueue.length == 0) return;
    await notificationCore(notificationQueue[0]);
  });
}

const notify2desktop = async (options) => {
  if (notificationQueue.length == 0) {
    await notificationCore(options);
  }
  notificationQueue.push(options);
}



chrome.runtime.onConnect.addListener((port) => {
  console.debug(`onConnect: port ${JSON.stringify(port)}`);
  if (!['desktop-notification', 'tab-activation'].includes(port.name)) return;

  port.onMessage.addListener(async (message/* , sender, sendResponse */) => {
    switch (message.type)  {
      case 'ping':
        port.postMessage({type: 'pong'});
        break;
      case 'tab-activation':
        await chrome.tabs.update(message.tab.id, {active: true, highlighted:true});
        await chrome.windows.update(message.tab.windowId, {focused: true});
        break;
      case 'notification':
        await notify2desktop(message);
    }
  });
  port.onDisconnect.addListener((port) => {
    console.debug(JSON.stringify(port));
  });
  port.postMessage({'type': 'connected', tab:port.sender.tab});
});

chrome.storage.onChanged.addListener(async (_, area) => {
  if (area !== 'local') return;
  const { /* replaceFavicon, blinkFavicon,  */desktopNotification } = (await chrome.storage.local.get(['replaceFavicon', 'blinkFavicon', 'desktopNotification']));

  if (desktopNotification) {
    if (await chrome.notifications.getPermissionLevel() !== 'granted') {
      await chrome.storage.local.set({
        'desktopNotification': false
      });
    }
  } else {

  }

  // if (blinkFavicon) {
  // } else {
  // }

  // if (replaceFavicon) {
  // } else {
  // }
});
