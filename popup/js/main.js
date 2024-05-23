document.addEventListener('DOMContentLoaded', async (e) => {
  const { replaceFavicon, blinkFavicon, desktopNotification, activateTab, advancedCopy } = (await chrome.storage.local.get(['replaceFavicon', 'blinkFavicon', 'desktopNotification', 'activateTab', 'advancedCopy']));

  const enableReplaceFaviconCheckbox = document.querySelector('#enableReplaceFaviconCheckbox');
  const enableBlinkFaviconCheckbox = document.querySelector('#enableBlinkFaviconCheckbox');
  const enableDesktopNotificationCheckbox = document.querySelector('#enableDesktopNotificationCheckbox');
  const enableActivateTabCheckbox = document.querySelector('#enableActivateTabCheckbox');
  const enableAdvancedCopyCheckbox = document.querySelector('#enableAdvancedCopyCheckbox');

  enableReplaceFaviconCheckbox.checked = replaceFavicon && replaceFavicon.status;
  enableBlinkFaviconCheckbox.checked = blinkFavicon && blinkFavicon.status;
  enableDesktopNotificationCheckbox.checked = desktopNotification && desktopNotification.status;
  enableActivateTabCheckbox.checked = activateTab && activateTab.status;
  enableAdvancedCopyCheckbox.checked = advancedCopy && advancedCopy.status;

  enableReplaceFaviconCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({
      'replaceFavicon': {
        status: e.target.checked
      }
    });
  });
  enableBlinkFaviconCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({
      'blinkFavicon': {
        status: e.target.checked
      }
    });
  });
  enableDesktopNotificationCheckbox.addEventListener('change', async (e) => {
    if (!(await chrome.permissions.request({permissions:['tabs', 'notifications']}))) {
      e.target.checked = false;
      return;
    }
    await chrome.storage.local.set({
      'desktopNotification': {
        status: e.target.checked
      }
    });
  });
  enableActivateTabCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({
      'activateTab': {
        status: e.target.checked
      }
    });
  });
  enableAdvancedCopyCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({
      'advancedCopy': {
        status: e.target.checked
      }
    });
  });
});
