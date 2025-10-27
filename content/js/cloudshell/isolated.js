window.addEventListener('cloudShellInitialized', async () => {
  console.debug('cloudShellInitialized event received');
  const { keepCloudShellSession } = await chrome.storage.local.get('keepCloudShellSession');
  window.dispatchEvent(new CustomEvent('startupFeatureStatus', { detail: { keepCloudShellSession } }));
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  if (!changes.keepCloudShellSession) return;
  const newValue = changes.keepCloudShellSession.newValue;
  window.dispatchEvent(new CustomEvent('updateFeatureStatus', { detail: { keepCloudShellSession: newValue } }));
});
