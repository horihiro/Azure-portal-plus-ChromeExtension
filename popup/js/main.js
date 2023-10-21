document.addEventListener('DOMContentLoaded', async (e) => {
  const { replaceFavicon, blinkFavicon, desktopNotification } = (await chrome.storage.local.get(['replaceFavicon', 'blinkFavicon', 'desktopNotification']));

  const enableReplaceFaviconCheckbox = document.querySelector('#enableReplaceFaviconCheckbox');
  const enableBlinkFaviconCheckbox = document.querySelector('#enableBlinkFaviconCheckbox');
  const enableDesktopNotificationCheckbox = document.querySelector('#enableDesktopNotificationCheckbox');

  enableReplaceFaviconCheckbox.checked = replaceFavicon;
  enableBlinkFaviconCheckbox.checked = blinkFavicon;
  enableDesktopNotificationCheckbox.checked = desktopNotification;
  enableReplaceFaviconCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({
      'replaceFavicon': e.target.checked
    });
  });
  enableBlinkFaviconCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({
      'blinkFavicon': e.target.checked
    });
  });
  enableDesktopNotificationCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({
      'desktopNotification': e.target.checked
    });
  });
});
