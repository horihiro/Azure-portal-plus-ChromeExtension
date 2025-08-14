class Watcher {

  constructor() {
  }

  startWatching() {
    throw new Error('You have to implement the method startWatching!');
  }
  stopWatching() {
    if (!this.observer) return;
    this.observer.disconnect();
  }
  async getAccessToken() {
    const { accessToken } = await chrome.storage.local.get('accessToken');
    return accessToken;
  }
}


class ResourceCounter extends Watcher {
  constructor() {
    super();
    this.observer = new MutationObserver(this.rgListWatcher.bind(this));
    this.status = 'idle';
  }

  async rgListWatcher() {
    if (this.status !== 'idle') return;
    this.status = 'watching';
    this.timeout && clearTimeout(this.timeout);

    const rgRows = [...document.querySelectorAll('.ms-List-cell')].filter((rgRow) => {
      const [_, subscriptionId, resourceGroup] = rgRow.querySelector('a')?.href?.toLowerCase()?.match(/([\da-f]{8}(?:-[\da-f]{4}){4}[\da-f]{8})\/resourcegroups\/([^\\]+)$/) || [];
      return subscriptionId && resourceGroup;
    });
    console.debug(`Found ${rgRows.length} resource groups.`);
    if (rgRows.length === 0)  {
      this.status = 'idle';
      return;
    }

    this.timeout = setTimeout(() => {
      this.rgListWatcher();
    }, 60000);
    const response = await fetch(
      `https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          {
            options: { "$top": 1000, "$skip": 0, "$skipToken": "", "resultFormat": "objectArray" },
            query: 'resources | summarize count() by subscriptionId, resourceGroup'
          }
        )
      });

    if (response.status !== 200) {
      this.status = 'idle';
      return;
    }

    try {
      const json = await response.json();
      rgRows.forEach((rgRow) => {
        const [_, subscriptionId, resourceGroup] = rgRow.querySelector('a')?.href?.toLowerCase()?.match(/([\da-f]{8}(?:-[\da-f]{4}){4}[\da-f]{8})\/resourcegroups\/([^\\]+)$/) || [];
        if (subscriptionId && resourceGroup) {
          const count = json.data.find((item) => item.subscriptionId === subscriptionId && item.resourceGroup === resourceGroup)?.count_ || 0;
          rgRow.classList.value = `appls-resource-count-${String(count).padStart(3, '0')} ${rgRow.classList.value.replace(/app-resource-count-\d{3}/g, '').trim()}`;
          rgRow.title = count == 0 ? 'no resource' : (count == 1 ? '1 resource' : `${count} resources`);
        }
      });
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
    this.status = 'idle';
  }
  startWatching(options) {
    this.options = options || { [this.propName]: {} };
    this.observer.observe(document, { childList: true, subtree: true });
  }
  stopWatching() {
    super.stopWatching();
  }
}

(async () => {
  try {
    const _watchers = {};
    _watchers['resourceCounter'] = new ResourceCounter();

    const init = async (changes) => {
      const watcherStatus = await (async (changes, watchers) => {
        if (!changes) return await chrome.storage.local.get(Object.keys(watchers));
        return Object.fromEntries(Object.entries(changes).map(c => [c[0], c[1].newValue]))
      })(changes, _watchers);

      watcherStatus['resourceCounter'] = { status: true };
      Object.keys(watcherStatus).forEach(w => {
        if (!watcherStatus[w] || !_watchers[w]) return;
        if (watcherStatus[w].status) _watchers[w].startWatching(watcherStatus[w].options);
        else _watchers[w].stopWatching();
      });
    }

    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== 'local') return;
      init(changes);
    });
    init();
  } catch (e) {
    console.error(e)
  }
})();