
let initInterval = setInterval(() => {
  dispatchEvent(new CustomEvent('appInitialized'));
  console.debug('appInitialized event dispatched');
}, 10000);

let timeout = 0;
let enabled = false;
const pingTimeout = 600000; // 10 minutes
const pingString = ' '; // space + backspace

window.addEventListener('appKeepCloudShellSession', (e) => {
  console.debug('appKeepCloudShellSession event received:', e.detail);
  if (initInterval != 0) {
    clearInterval(initInterval);
    initInterval = 0;
  }
  enabled = e.detail.keepCloudShellSession?.status;
  if (!enabled) {
      clearTimeout(timeout);
      timeout = 0;
      return;
  }
  const autoInput = (string) => {
    timeout = setTimeout(() => {
      window.term.input(string);
      autoInput(string);
    }, pingTimeout);
  };

  const init = () => {
    if (!window.term) {
      setTimeout(init, 1000);
      return;
    }
    window.term.attachCustomKeyEventHandler(ev => {
      if (!enabled || ev.type !== 'keydown') return;
      clearTimeout(timeout);
      autoInput(pingString);
    });
    autoInput(pingString);
  }
  init();
});

