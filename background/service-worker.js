console.debug('Start service-worker.js');

const notificationQueue = [];
const apiVersionMap = new Map();

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
          const body = await (async (message) => {
            const { resourceId, format, accessToken } = message;
            const splitResourceId = resourceId.split('/').map((item) => item.toLowerCase());
            if (splitResourceId.length < 9
              || splitResourceId[0] !== ''
              || splitResourceId[1] !== 'subscriptions'
              || splitResourceId[3] !== 'resourcegroups'
              || splitResourceId[5] !== 'providers') {
              port.postMessage({ type: 'arm-template', errorMessage: `Invalid resourceId: ${resourceId}` });
              return;
            }
            switch (format) {
              case 'bicep':
                const requestParam = {
                  url: `https://management.azure.com${splitResourceId.slice(0, 5).join('/')}/exportTemplate?api-version=2024-03-01`,
                  method: 'POST',
                  body: JSON.stringify({
                    "resources": [
                      resourceId
                    ],
                    "options": "IncludeParameterDefaultValue",
                    "outputFormat": "Bicep"
                  })
                };
                do {
                  const response = await fetch(
                    requestParam.url,
                    {
                      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                      redirect: 'follow',
                      method: requestParam.method,
                      body: requestParam.body
                    }
                  );
                  if (response.status === 202 && response.headers.get('location')) {
                    requestParam.url = response.headers.get('location');
                    requestParam.method = 'GET';
                    requestParam.body = void 0;
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    continue;
                  } else if (response.status === 200) {
                    return (await response.json()).output;
                  }
                  throw new Error(`Invalid response: ${response.status}`);
                } while (true);
                return '';
                break;
              default:
                const provider = splitResourceId[6];
                const resourceType = splitResourceId[7];
                const apiVersion = apiVersionMap.get(`${provider}/${resourceType}`) || await (async (params) => {
                  const providerInfoResponse = await fetch(
                    `https://management.azure.com/providers/${params.provider}?api-version=2019-08-01`,
                    { headers: { 'Authorization': `Bearer ${params.accessToken}` } }
                  );
                  const providerInfo = await providerInfoResponse.json();
                  apiVersionMap.set(`${params.provider}/${params.resourceType}`, providerInfo.resourceTypes.find((type) => type.resourceType.toLowerCase() === params.resourceType.toLowerCase()).apiVersions[0]);
                  return apiVersionMap.get(`${params.provider}/${params.resourceType}`);
                })({ provider, resourceType, accessToken });
                if (!apiVersion) {
                  port.postMessage({ type: 'arm-template', errorMessage: `API version not found: ${resourceId}` });
                  return;
                }
                const response = await fetch(
                  `https://management.azure.com${resourceId}?api-version=${apiVersion}`,
                  { headers: { 'Authorization': `Bearer ${accessToken}` } }
                );
                return await response.json();
            }
          })(message);
          port.postMessage({ type: 'arm-template', result: 'succeeded', format: message.format || 'json', body });
        } catch (error) {
          port.postMessage({ type: 'arm-template', result: 'failed', body: error});
          console.error(error);
        }

        break;
      case 'notification':
        await notify2desktop(message);
        break;
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
