document.addEventListener('DOMContentLoaded', () => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
  const storageKey = 'optionsActiveTab';

  const tabIdToPanelId = (tabId) => tabId.replace(/^tab-/, 'panel-');

  async function setActiveTab(tabId) {
    tabs.forEach(t => t.setAttribute('aria-selected', t.id === tabId ? 'true' : 'false'));
    panels.forEach(p => {
      if (p.id === tabIdToPanelId(tabId)) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
    const tab = document.getElementById(tabId);
    try { chrome.storage.local.set({ [storageKey]: tabId }); } catch (e) { /* ignore when not available */ }
    tab.focus();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => setActiveTab(tab.id));
    tab.addEventListener('keydown', (e) => {
      const idx = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') { tabs[(idx + 1) % tabs.length].focus(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { tabs[(idx - 1 + tabs.length) % tabs.length].focus(); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { setActiveTab(tab.id); e.preventDefault(); }
    });
  });

  // restore last active tab
  if (window.chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(storageKey, (items) => {
      const tabId = items && items[storageKey] ? items[storageKey] : 'tab-basic';
      setActiveTab(tabId);
    });
  } else {
    setActiveTab('tab-basic');
  }

  // Example: simple option save/restore
  // Options inputs mapping
  const inputs = {
    replaceFavicon: document.getElementById('visual_favicon'),
    blinkFavicon: document.getElementById('visual_blink'),
    resourceGroupDecorator: document.getElementById('visual_rg_decoration'),

    desktopNotification: document.getElementById('notify_desktop'),
    activateTab: document.getElementById('notify_activate_tab'),

    advancedCopy: document.getElementById('resource_copy'),
    filterRestorer: document.getElementById('resource_save_filter'),

    keepCloudShellSession: document.getElementById('cloudshell_extend_session'),
    cloudshell_enable_startup: document.getElementById('cloudshell_enable_startup'),
    cloudshell_startup_script: document.getElementById('cloudshell_startup_script')
  };

  const keys = Object.keys(inputs);
  try {
    chrome.storage.local.get(keys, (items) => {
      keys.forEach(k => {
        const el = inputs[k];
        if (!el) return;
        if (el.tagName === 'INPUT' && el.type === 'checkbox') {
          el.checked = !!items[k]?.status || false;
        } else if (el.tagName === 'TEXTAREA') {
          el.value = items[k] || '';
        }
      });
    });

    // add listeners
    keys.forEach(k => {
      const el = inputs[k];
      if (!el) return;
      if (el.tagName === 'INPUT' && el.type === 'checkbox') {
        el.addEventListener('change', () => {
          chrome.storage.local.get([k], (items) => {
            // some options may depend on others; handle them here if needed
            const obj = {}
            obj[k] = items[k] || {status: false};
            obj[k].status = el.checked;
            chrome.storage.local.set(obj);
          });
        });
      } else if (el.tagName === 'TEXTAREA') {
        // save on blur
        el.addEventListener('blur', () => {
          const obj = {};
          obj[k] = el.value;
          chrome.storage.local.set(obj);
        });
      }
    });
  } catch (e) {
    // storage might be unavailable in some contexts; fail silently
  }
});
