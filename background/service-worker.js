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
  const { id, windowId } = options.tab;
  chrome.notifications.onClicked.addListener(async (/* notificationId */) => {
    await chrome.tabs.update(id, { active: true, highlighted: true })
    await chrome.windows.update(windowId, { focused: true });
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
  if (!['desktop-notification', 'tab-activation', 'get-arm-template'].includes(port.name)) return;

  port.onMessage.addListener(async (message, sender, sendResponse) => {
    switch (message.type) {
      case 'ping':
        port.postMessage({ type: 'pong' });
        break;
      case 'tab-activation':
        await chrome.tabs.update(message.tab.id, { active: true, highlighted: true });
        await chrome.windows.update(message.tab.windowId, { focused: true });
        break;
      case 'get-arm-template':
        try {
          const m = message.resourceId.match(/(\/providers\/[^\/]+)\/([^\/]+)/);
          if (!m) return;
          const provider = m[1];
          const providerInfoResponse = await fetch(
            `https://management.azure.com${provider}?api-version=2019-08-01`,
            { headers: { 'Authorization': `Bearer ${await getSecret()}` } }
          );
          const providerInfo = await providerInfoResponse.json();
          const apiVersion = providerInfo.resourceTypes.find((type) => type.resourceType.toLowerCase() === m[2].toLowerCase() ).apiVersions[0];
          const response = await fetch(
            `https://management.azure.com${message.resourceId}?api-version=${apiVersion}`,
            { headers: { 'Authorization': `Bearer ${await getSecret()}` } }
          );
          const body = await response.json();
          port.postMessage({ type: 'arm-template', body });
        } catch (error) {
          console.error(error);
        }

        break;
      case 'notification':
        await notify2desktop(message);
    }
  });
  port.onDisconnect.addListener((port) => {
    console.debug(JSON.stringify(port));
  });
  port.postMessage({ 'type': 'connected', tab: port.sender.tab });
});

chrome.storage.onChanged.addListener(async (_, area) => {
  if (area !== 'local') return;
  const { /* replaceFavicon, blinkFavicon, advancedCopy, */desktopNotification } = (await chrome.storage.local.get([/*'replaceFavicon', 'blinkFavicon', 'advancedCopy', */'desktopNotification']));

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

  // if (advancedCopy) {
  // } else {
  // }
});

const getSecret = async () => {
  return (await chrome.storage.local.get(['secret'])).secret;
}