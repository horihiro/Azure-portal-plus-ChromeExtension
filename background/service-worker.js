console.debug('Start service-worker.js');

const notificationQueue = [];
const apiVersionMap = new Map();
const contextMenuProps = [
  {
    id: 'open-in-preview-portal',
    title: 'Open in preview portal'
  }
];

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
          if (!m) {
            port.postMessage({ type: 'arm-template', errorMessage: `Invalid resourceId: ${message.resourceId}` });
            return;
          }
          const provider = m[1];
          const resourceType = m[2];
          const apiVersion = apiVersionMap.get(`${provider}/${resourceType}`) || await (async (params) => {
            const providerInfoResponse = await fetch(
              `https://management.azure.com${params.provider}?api-version=2019-08-01`,
              { headers: { 'Authorization': `Bearer ${params.accessToken}` } }
            );
            const providerInfo = await providerInfoResponse.json();
            apiVersionMap.set(`${params.provider}/${params.resourceType}`, providerInfo.resourceTypes.find((type) => type.resourceType.toLowerCase() === params.resourceType.toLowerCase()).apiVersions[0]);
            return apiVersionMap.get(`${params.provider}/${params.resourceType}`);
          })({ provider, resourceType, accessToken: message.accessToken });
          if (!apiVersion) {
            port.postMessage({ type: 'arm-template', errorMessage: `API version not found: ${resourceId}` });
            return;
          }
          const response = await fetch(
            `https://management.azure.com${message.resourceId}?api-version=${apiVersion}`,
            { headers: { 'Authorization': `Bearer ${message.accessToken}` } }
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

chrome.runtime.onInstalled.addListener(async () => {
  console.debug('onInstalled');
  chrome.contextMenus.create(contextMenuProps);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.debug('onClicked', info, tab);
  if (info.menuItemId === contextMenuProps[0].id && info.frameUrl) {
    console.debug(`clicked in ${info.frameUrl}`);
    await chrome.tabs.create({
      url: info.frameUrl.replace('portal.azure.com', 'preview.portal.azure.com'),
      active: true
    });
  }
});