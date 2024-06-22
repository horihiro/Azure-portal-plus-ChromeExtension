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
}

class AdvancedCopy extends Watcher {
  constructor() {
    super();
    this.messageQueue = [];
    this.resourceMap = new Map();
    this.re = /(\/subscriptions\/[0-9a-f]{8}(?:-[0-9a-f]{4}){4}[0-9a-f]{8}\/resourceGroups\/([^/]+)\/providers\/[^/]+\/[^/]+\/([^/]+))/i

    this.observer = new MutationObserver(this.addCopyMenu.bind(this));

  }
  getAccessToken() {
    const CLIENT_ID = 'c44b4083-3bb0-49c1-b47d-974e53cbdf3c';
    const SCOPES = ['https://management.core.windows.net//user_impersonation', 'https://management.core.windows.net//.default'];
    return JSON.parse(
      sessionStorage.getItem(
        `${(JSON.parse(
          sessionStorage.getItem(`msal.token.keys.${CLIENT_ID}`) || '{}'
        ).accessToken || []).find(entry => SCOPES.some((scope) => entry.includes(scope))) || ''
        }`
      ) || '{}'
    ).secret;
  };
  addCopyMenu() {
    const overviewMenuItem = document.querySelector('section:last-of-type div[role="listitem"]:first-child li[role="listitem"]:first-of-type');
    if (!overviewMenuItem) return;
    if (!this.re.test(overviewMenuItem.querySelector('a').href)) return;
    const origDropdownMenu = overviewMenuItem.closest('section')?.querySelector('*:not(.fxs-blade-actiondropmenu)+.fxs-blade-actiondropmenu[id]');
    if (!origDropdownMenu) return;

    this.send2serviceWorker({resourceId: overviewMenuItem.querySelector('a').href.match(this.re)[1], accessToken: this.getAccessToken()});
    const parent = origDropdownMenu.parentNode;
    if (parent.querySelectorAll('div+.fxs-blade-actiondropmenu').length != 0) return;
    const copyDropdownMenu = document.createElement('div');
    copyDropdownMenu.classList.add('fxs-blade-actiondropmenu');
    copyDropdownMenu.classList.add('app-dropdown-menu');
    copyDropdownMenu.innerHTML = origDropdownMenu.innerHTML.replace(/id="[^"]+"/g, '');

    const rootButton = copyDropdownMenu.querySelector('button');
    const copyIcon = rootButton.querySelector('svg>use');
    if (!copyIcon) return;
    parent.insertBefore(copyDropdownMenu, origDropdownMenu);
    copyIcon.href.baseVal = origDropdownMenu.querySelector('button.fxs-blade-copyname svg>use').href.baseVal;
    rootButton.setAttribute('aria-label', 'More copy actions');
    rootButton.setAttribute('title', 'More copy actions');
    rootButton.addEventListener('click', (event) => {
      event.preventDefault();
      const menu = event.currentTarget.parentNode.querySelector('.fxs-dropmenu-hidden, .fxs-dropmenu-is-open');
      if (menu.classList.contains('fxs-dropmenu-is-open')) {
        menu.classList.remove('fxs-dropmenu-is-open');
        menu.classList.add('fxs-dropmenu-hidden');
      } else {
        menu.classList.remove('fxs-dropmenu-hidden');
        menu.classList.add('fxs-dropmenu-is-open');
      }
    });

    const fxsDropmenuContent = copyDropdownMenu.querySelector('div.fxs-dropmenu-content');
    fxsDropmenuContent.removeChild(copyDropdownMenu.querySelector('div.fxs-blade-dropmenucontent'));
    const fxsBladeDropmenucontent = document.createElement('div');
    fxsBladeDropmenucontent.classList.add('fxs-blade-dropmenucontent');
    fxsBladeDropmenucontent.setAttribute('role', 'presentation');
    fxsBladeDropmenucontent.style.width = '350px';
    [{
      title: 'Resource name',
      handler: (event) => {
        const resource = location.hash.match(this.re);
        resource && navigator.clipboard.writeText(resource[3]);

        const menu = event.target.closest('.fxs-dropmenu-is-open');
        if (menu) {
          menu.classList.remove('fxs-dropmenu-is-open');
          menu.classList.add('fxs-dropmenu-hidden');
        }
      }
    }, {
      title: 'Resource Id',
      handler: (event) => {
        const resource = location.hash.match(this.re);
        resource && navigator.clipboard.writeText(resource[1]);

        const menu = event.target.closest('.fxs-dropmenu-is-open');
        if (menu) {
          menu.classList.remove('fxs-dropmenu-is-open');
          menu.classList.add('fxs-dropmenu-hidden');
        }
      }
    }, {
      title: 'Resource name and group as Azure CLI option',
      handler: (event) => {
        const resource = location.hash.match(this.re);
        resource && navigator.clipboard.writeText(`--name ${resource[3]} --resource-group ${resource[2]}`);

        const menu = event.target.closest('.fxs-dropmenu-is-open');
        if (menu) {
          menu.classList.remove('fxs-dropmenu-is-open');
          menu.classList.add('fxs-dropmenu-hidden');
        }
      }
    }, {
      title: 'Resource name and group as Azure PowerShell option',
      handler: (event) => {
        const resource = location.hash.match(this.re);
        resource && navigator.clipboard.writeText(`-Name ${resource[3]} -ResourceGroupName ${resource[2]}`);

        const menu = event.target.closest('.fxs-dropmenu-is-open');
        if (menu) {
          menu.classList.remove('fxs-dropmenu-is-open');
          menu.classList.add('fxs-dropmenu-hidden');
        }
      }
    }, {
      title: 'ARM template (JSON)',
      handler: async (event) => {
        const resource = location.hash.match(this.re);
        resource && navigator.clipboard.writeText(JSON.stringify(this.resourceMap.get(resource[1].toLowerCase()), null, 2));

        const menu = event.target.closest('.fxs-dropmenu-is-open');
        if (menu) {
          menu.classList.remove('fxs-dropmenu-is-open');
          menu.classList.add('fxs-dropmenu-hidden');
        }
      }
    }].forEach((entry) => {
      const button = document.createElement('button');
      button.setAttribute('role', 'menuitem');
      button.setAttribute('type', 'button');
      button.classList.add('fxs-blade-dropmenubutton');
      button.classList.add('fxs-portal-hover');
      const span = document.createElement('span');
      span.classList.add('fxs-blade-dropmenubuttontxt');
      span.classList.add('msportalfx-text-ellipsis');
      span.innerText = entry.title;
      span.style.paddingLeft = '10px';
      button.appendChild(span);
      button.addEventListener('click', entry.handler.bind(this));

      fxsBladeDropmenucontent.appendChild(button);
    });

    fxsDropmenuContent.appendChild(fxsBladeDropmenucontent);
    origDropdownMenu.querySelector('button.fxs-blade-copyname').style.display = 'none';
  }
  startWatching(options) {
    this.options = options;
    this.addCopyMenu();
    this.observer.observe(document, { childList: true, subtree: true });
  }

  stopWatching() {
    super.stopWatching();
    document.querySelectorAll('.app-dropdown-menu').forEach((menu) => {
      menu.parentNode.removeChild(menu);
    });
    document.querySelectorAll('section button.fxs-blade-copyname').forEach(b => {
      b.style.display = '';
    });

  }

  async send2serviceWorker(message) {
    const msg = this.messageQueue.shift() || Object.assign({type: 'get-arm-template'}, message);
    try {
      await this.port.postMessage(msg);
    } catch {
      this.messageQueue.push(msg);
      this.port = chrome.runtime.connect({ name: 'get-arm-template' });
      this.port.onMessage.addListener(this.onMessage.bind(this));
    }
  }

  async onMessage(message/* , sender, sendResponse */) {
    switch (message.type) {
      case 'connected':
        this.tab = message.tab;
        if (this.messageQueue.length > 0) await this.send2serviceWorker();
        break;
      case 'arm-template':
        this.resourceMap.set(message.body.id.toLowerCase(), message.body);
        break;
      case 'pong':
        console.debug(message.type);
        break;
    }
  }
}

class FaviconUpdater extends Watcher {
  constructor() {
    super();

    this.exceptionTables = [{
      hash: '#view/HubsExtension/BrowseResource/resourceType/Microsoft.Web%2Fsites',
      type: 72
    }, {
      hash: '#browse/Microsoft.Web%2Fsites',
      type: 72
    }];
    this.faviconOrig = document.querySelectorAll('link[rel="icon"][type="image/x-icon"]')[0];

    if (!this.faviconOrig) {
      this.faviconOrig = document.createElement('link');
      this.faviconOrig.setAttribute('rel', 'icon');
      this.faviconOrig.setAttribute('type', 'image/x-icon');
      this.faviconOrig.setAttribute('href', '/Content/favicon.ico');
    }
    this.faviconAzureResource = document.createElement('link');
    this.head = document.head;
    this.faviconAzureResource.setAttribute('rel', 'icon');
    this.faviconAzureResource.setAttribute('type', 'image/svg+xml');
    [...this.head.querySelectorAll('link[rel*="shortcut"][rel*="icon"]')].forEach((icon/* , i, array */) => {
      this.head.removeChild(icon);
    });

    this.observer = new MutationObserver(async (mutations) => {
      if (mutations.filter((mutation) => (mutation.type === 'attributes')
        ? mutation.target.nodeName.toLowerCase() === 'div' && mutation.attributeName === 'class' && mutation.target.classList.contains('fxs-sidebar')
        : [...mutation.addedNodes].filter((addedNode) => {
            return addedNode.nodeName.toLowerCase() !== 'link' || addedNode.getAttribute('rel') !== 'icon';
          }).length > 0
      ).length === 0) return; 
      this.updateFavicon();
    })
  }
  updateFavicon() {
    const mainIconContainers = [
      ...document.querySelectorAll('section:last-of-type div[role="group"]:first-child li[role="listitem"]:first-of-type'),
      ...document.querySelectorAll('section:last-of-type div[role="listitem"]:first-child li[role="listitem"]:first-of-type'),
      ...(
        document.querySelectorAll('.fxs-sidebar-menu-activated .fxs-sidebar-menu-container').length > 0 && 
        getComputedStyle(document.querySelectorAll('div.fxs-sidebar-menu-container')[0]).display !== 'none'
        ? document.querySelectorAll('div.fxs-sidebar-menu-container div[role="listitem"]:first-child li[role="listitem"]:first-of-type')
        : []
      ),
    ];
    const listIconSvgs = [...document.querySelectorAll('section:last-of-type .ext-hubs-artbrowse-grid div.fxc-gc-row-content>div:nth-child(2) svg')];
    const listResTypes = [...document.querySelectorAll('section:last-of-type .ext-hubs-artbrowse-grid div.fxc-gc-row-content>div:nth-child(2) a')].map((a) => {
      return a.href.replace(/^.*\/providers\//, '').split('/').filter((_, i/* , array */) => i == 0 || i % 2 == 1).join('/');
    });
    const isRG = /resourceGroups\/[^/]+\/[^/]*$/.test(location.hash);
    const oneTypeInList = listResTypes.length > 0 ? listResTypes.every((type/* , i, array */) => listResTypes[0] === type) : true;
    const oneSvgInList = listIconSvgs.length > 0 ? listIconSvgs.every((svg/* , i, array */) => listIconSvgs[0].outerHTML === svg.outerHTML) : true
    const oneIcon = !isRG && oneTypeInList && oneSvgInList;
    const noResIconSvgs = isRG ? [] : document.querySelectorAll('section:last-of-type div.ext-hubs-artbrowse-empty div.msportalfx-svg-disabled svg');
    if (mainIconContainers.length === 0 && (noResIconSvgs.length === 0)) {
      if (listIconSvgs.length === 0 || isRG || !oneTypeInList) {
        this.updateFaviconCore();
        return;
      }
      if (!oneSvgInList) {
        const type = this.exceptionTables.filter((ex/* , i, array */) => ex.hash === location.hash)[0].type;

        this.faviconAzureResource.href = `data:image/svg+xml,${encodeURIComponent(this.getSvgDataByType(type))}`;
        this.updateFaviconCore(this.faviconAzureResource);
        return;
      }
    }
    const mainIcon = mainIconContainers.length > 0 ? mainIconContainers[0].querySelectorAll('svg,img')[0] : null;
    if ((!mainIcon && (!listIconSvgs[0] || !oneIcon) && !noResIconSvgs[0])) {
      !mainIcon && this.updateFaviconCore();
      return;
    }
    const lastFavicon = noResIconSvgs[0] || (oneIcon ? (listIconSvgs[0] || mainIcon) : (mainIcon || listIconSvgs[0]));

    this.faviconAzureResource.href = lastFavicon.src || `data:image/svg+xml,${encodeURIComponent(this.getSvgData(lastFavicon))}`;
    this.updateFaviconCore(this.faviconAzureResource);
  }

  startWatching(options) {
    this.options = options;
    this.updateFavicon();
    this.observer.observe(document, { childList: true, subtree: true, attributes: true});
  }

  stopWatching() {
    super.stopWatching();
    this.updateFaviconCore(this.faviconOrig);
  }

  updateFaviconCore(faviconLink) {
    const _faviconLink = faviconLink || this.faviconOrig;
    const links = this.head.querySelectorAll('link[rel="icon"]');
    if (links[0] === _faviconLink) return;
    [...links].forEach((link/* , i, array */) => {
      this.head.removeChild(link);
    });
    this.head.appendChild(_faviconLink);
  }

  classNames2style(classNames) {
    const styleObj = classNames.reduce((prev, curr/* , i, array */) => {
      if (curr.trim() === "") return prev;
      [...document.styleSheets].forEach((styleSheet/* , i, array */) => {
        [...styleSheet.cssRules].forEach((rule/* , i, array */) => {
          if (rule.selectorText !== `.${curr}`) return;
          prev[rule.style[0]] = rule.style[rule.style[0]];
        });
      });
      return prev;
    }, {});
    return `style="${Object.keys(styleObj).reduce((prev, curr/* , i, array */) => {
      return `${prev}${curr}: ${styleObj[curr]}; `
    }, '').trim()}"`;
  }

  getSvgData(svg) {
    const use = svg.querySelector('use');
    if (!use) return svg.outerHTML;
    const symbolElm = document.querySelector(use.getAttribute('href'));
    const symbolContent = symbolElm.firstChild.outerHTML;
    const styledSymbolContent = [...symbolContent.matchAll(/ class="([^"]+)"/g)].reduce((prev, curr/* , i, array */) => {
      const styleText = this.classNames2style(curr[1].split(/ /));
      return prev.replaceAll(` class="${curr[1]}"`, ` ${styleText}`);
    }, symbolContent);
    return `<svg xmlns="http://www.w3.org/2000/svg" height="100%" width="100%" viewBox="${symbolElm.getAttribute('viewBox')}" aria-hidden="true" role="presentation" focusable="false">${[...styledSymbolContent.matchAll(/url\(#([^\)]*)\)/g)].reduce((prev, curr/* , i, array */) => {
      return `${document.getElementById(curr[1]).outerHTML}${prev}`;
    }, styledSymbolContent)}</svg>`;
  }
  getSvgDataByType(type) {
    const symbolElm = document.querySelector(`[data-type="${type}"]`);
    if (!symbolElm) return null;
    const symbolContent = symbolElm.firstChild.outerHTML;
    const styledSymbolContent = [...symbolContent.matchAll(/ class="([^"]+)"/g)].reduce((prev, curr/* , i, array */) => {
      const styleText = this.classNames2style(curr[1].split(/ /));
      return prev.replaceAll(` class="${curr[1]}"`, ` ${styleText}`);
    }, symbolContent);
    return `<svg xmlns="http://www.w3.org/2000/svg" height="100%" width="100%" viewBox="${symbolElm.getAttribute('viewBox')}" aria-hidden="true" role="presentation" focusable="false">${[...styledSymbolContent.matchAll(/url\(#([^\)]*)\)/g)].reduce((prev, curr/* , i, array */) => {
      return `${document.getElementById(curr[1]).outerHTML}${prev}`;
    }, styledSymbolContent)}</svg>`;
  }
}

class FaviconBlinker extends Watcher {
  constructor() {
    super();
    this.TARGET_CLASS = 'fxs-display-none'

    const notificationsPaneSelector = '.fxs-notificationspane-progressbar';
    this.faviconOrig = document.querySelectorAll('link[rel="icon"][type="image/x-icon"]')[0];

    if (!this.faviconOrig) {
      this.faviconOrig = document.createElement('link');
      this.faviconOrig.setAttribute('rel', 'icon');
      this.faviconOrig.setAttribute('type', 'image/x-icon');
      this.faviconOrig.setAttribute('href', '/Content/favicon.ico');
    }
    this.faviconBlank = document.createElement('link');
    this.head = document.head;
    this.faviconBlank.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAhElEQVR4Xu3VAREAMAwCseLfdIV85qAcGbv4W/z+E4AGxBNAIF4AnyACCMQTQCBeACuAAALxBBCIF8AKIIBAPAEE4gWwAgggEE8AgXgBrAACCMQTQCBeACuAAALxBBCIF8AKIIBAPAEE4gWwAgggEE8AgXgBrAACCMQTQCBeACuAQJ3AA2jYAEGs/2CBAAAAAElFTkSuQmCC';
    this.faviconBlank.setAttribute('rel', 'icon');
    this.faviconBlank.setAttribute('type', 'image/png');
    [...this.head.querySelectorAll('link[rel*="shortcut"][rel*="icon"]')].forEach((icon/* , i, array */) => {
      this.head.removeChild(icon);
    });

    this.onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "Are you sure you want to leave?";
      return event.returnValue;
    };

    const observer = new MutationObserver((/* mutations */) => {
      this.notificationsPane = document.querySelector(notificationsPaneSelector);
      if (!this.notificationsPane) return;

      observer.disconnect();

      let currentClasses = this.notificationsPane.className;
      this.observer = new MutationObserver((mutatons) => {
        mutatons.forEach((mutation/* , i, array */) => {
          if (mutation.attributeName !== 'class') return;
          if (currentClasses.indexOf(this.TARGET_CLASS) >= 0 && this.notificationsPane.className.indexOf(this.TARGET_CLASS) < 0) {
            this.faviconOrig = document.querySelectorAll('link[rel="icon"]')[0];
            this.startBlinking();
          } else if (currentClasses.indexOf(this.TARGET_CLASS) < 0 && this.notificationsPane.className.indexOf(this.TARGET_CLASS) >= 0) {
            this.stopBlinking();
          }
          currentClasses = this.notificationsPane.className;
        });
      });
    });
    observer.observe(document, { childList: true, subtree: true, characterData: true });
  }
  blinkFavicon(params) {
    this.timeout = setTimeout(() => {
      const current = document.querySelectorAll('link[rel="icon"]')[0];
      this.head.removeChild(current);
      if (current === this.faviconBlank) this.head.appendChild(this.faviconOrig);
      else {
        this.faviconOrig = current;
        this.head.appendChild(this.faviconBlank);
      }
      this.blinkFavicon(params);
    }, params.interval);
  }
  startBlinking() {
    this.blinkFavicon({
      interval: 500
    });
    (window.parent === window) && window.addEventListener('beforeunload', this.onBeforeUnload);
  }
  stopBlinking() {
    clearTimeout(this.timeout);
    this.timeout = null;
    this.head.removeChild(document.querySelectorAll('link[rel="icon"]')[0]);
    this.head.appendChild(this.faviconOrig);
    (window.parent === window) && window.removeEventListener('beforeunload', this.onBeforeUnload);
  }
  startWatching(options) {
    this.options = options;
    const observeStart = () => {
      setTimeout(() => {
        if (this.notificationsPane) this.observer.observe(this.notificationsPane, { attributes: true });
        else observeStart();
      }, 100)
    };
    observeStart();
  }

  stopWatching() {
    super.stopWatching();
    this.timeout && this.stopBlinking();
  }
}

class ToastWatcher extends Watcher {
  constructor() {
    super();
    this.TARGET_CLASS_TOAST = '.fxs-toast';
    this.messageQueue = [];

    this.observer = new MutationObserver(this.mainObserverCallback.bind(this));
  }

  mainObserverCallback(mutations) {
    mutations.forEach((mutation/* , i, array */) => {
      Array.prototype.forEach.call(mutation.addedNodes, (addedNode/* , i, array */) => {
        if (!addedNode.innerHTML || !/<use [^>]+><\/use>/.test(addedNode.innerHTML) || addedNode.parentNode.className !== 'fxs-toast-icon') return;
        this.send2serviceWorker();
      });
    });
  }
  send2serviceWorker() {
    throw new Error('You have to implement the method send2serviceWorker!');
  }


  startWatching(options) {
    this.options = options;
    const toastContainer = document.querySelector(this.TARGET_CLASS_TOAST);
    if (toastContainer) {
      this.observer.observe(document.querySelector(this.TARGET_CLASS_TOAST), { childList: true, subtree: true });
      return
    }
    const toastContainerObserver = new MutationObserver((/* mutations */) => {
      const toastContainer = document.querySelector(this.TARGET_CLASS_TOAST);
      if (!toastContainer) return;
      toastContainerObserver.disconnect();
      this.observer.observe(document.querySelector(this.TARGET_CLASS_TOAST), { childList: true, subtree: true });
    });
    toastContainerObserver.observe(document, { childList: true, subtree: true });
  }

  async onMessage(message/* , sender, sendResponse */) {
    switch (message.type) {
      case 'connected':
        this.tab = message.tab;
        if (this.messageQueue.length > 0) await this.send2serviceWorker();
        break;
      case 'pong':
        console.debug(message.type);
        break;
    }
  }
}

class TabActivator extends ToastWatcher {
  constructor() {
    super();
  }

  async send2serviceWorker() {
    const msg = this.messageQueue.shift() || {
      type: 'tab-activation',
      tab: this.tab
    };
    try {
      await this.port.postMessage(msg);
    } catch {
      this.messageQueue.push(msg);
      this.port = chrome.runtime.connect({ name: 'tab-activation' });
      this.port.onMessage.addListener(this.onMessage.bind(this));
    }
  }

}

class DesktopNotifier extends ToastWatcher {
  constructor() {
    super();
    this.faviconOrig = document.querySelectorAll('link[rel="icon"][type="image/x-icon"]')[0];
  }

  async send2serviceWorker() {
    const title = document.querySelectorAll('.fxs-toast-title')[0].innerText;
    const message = document.querySelectorAll('.fxs-toast-description')[0].innerText;
    const msg = this.messageQueue.shift() || {
      type: 'notification',
      notificationOptions: {
        iconUrl: this.faviconOrig.href,
        contextMessage: 'contextMessage',
        isClickable: true,
        message,
        priority: 0,
        requireInteraction: true,
        silent: false,
        title,
        type: 'basic'
      },
      tab: this.tab
    };
    try {
      await this.port.postMessage(msg);
    } catch {
      this.messageQueue.push(msg);
      this.port = chrome.runtime.connect({ name: 'desktop-notification' });
      this.port.onMessage.addListener(this.onMessage.bind(this));
    }
  }
}

(async () => {
  try {
    const _watchers = {};
    _watchers['replaceFavicon'] = new FaviconUpdater();
    _watchers['blinkFavicon'] = new FaviconBlinker();
    _watchers['desktopNotification'] = new DesktopNotifier();
    _watchers['activateTab'] = new TabActivator();
    _watchers['advancedCopy'] = new AdvancedCopy();

    const init = async (changes) => {
      const watcherStatus = await (async (changes, watchers) => {
        if (!changes) return await chrome.storage.local.get(Object.keys(watchers));
        return Object.fromEntries(Object.entries(changes).map(c => [c[0], c[1].newValue]))
      })(changes, _watchers);

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