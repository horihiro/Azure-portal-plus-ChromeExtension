class KeepCloudShellSession {
  constructor() {
    this.enabled = false;
    this.timeout = 0;
    this.pingTimeout = 10000; // 10 seconds
    this.pingString = ' '; // space + backspace
  }
  get status() {
    return this.enabled;
  }
  start(terminal) {
    this.terminal = terminal;
    const textInput = (string) => {
      this.timeout = setTimeout(() => {
        this.terminal.input(string);
        textInput(string);
      }, this.pingTimeout);
    };
    textInput(this.pingString);
    this.enabled = true;
    this.terminal.attachCustomKeyEventHandler(ev => {
      if (!this.enabled || ev.type !== 'keydown') return;
      this.stop();
      this.start(this.terminal);
    });
  }
  stop() {
    clearTimeout(this.timeout);
    this.terminal && this.terminal.attachCustomKeyEventHandler(undefined);
    this.enabled = false;
  }
}

class CommandExecutor {
  execute(command, silent = false) {
    return new Promise((resolve, reject) => {
      const socket = sockets.find(s => !s.url.endsWith('/control'));
      const terminal = window.term;

      const originalTerminalWrite = terminal.write.bind(terminal);
      if (socket?.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket is not open.');
        reject(new Error('WebSocket is not open.'));
        return;
      }
      const commandWithNewline = command.endsWith('\n') ? command : command + '\n';
      terminal.write = (data) => {
        const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
        if (!silent) {
          terminal.write = originalTerminalWrite;
          terminal.write(str);
          resolve();
          return;
        }
        if (!str.endsWith(shellPrompt)) return;
        terminal.write = originalTerminalWrite;
        resolve();
      };
      socket.send(commandWithNewline);
    });
  }
}

const keepCloudShellSession = new KeepCloudShellSession();
const commandExecutor = new CommandExecutor();

const sockets = [];
const originalWebSocket = window.WebSocket;
window.WebSocket = function (...args) {
  const socket = new originalWebSocket(...args);
  socket.addEventListener('open', socketOpenHandler);
  socket.addEventListener('close', socketCloseHandler);
  sockets.push(socket);
  return socket;
};
window.WebSocket.CONNECTING = 0;
window.WebSocket.OPEN = 1;
window.WebSocket.CLOSING = 2;
window.WebSocket.CLOSED = 3;

const PROMPT_LEADING_PATTERN = '\\[\\?2004h';
let shellPrompt = '';

const init = () => {
  if (!window.term || !shellPrompt || sockets.length < 2 || !sockets.every(s => s.readyState === WebSocket.OPEN)) return;
  dispatchEvent(new CustomEvent('cloudShellInitialized'));
};

const terminalReadyObserver = new MutationObserver((_, observer) => {
  if (!window.term) return;
  console.debug('Terminal is installed.');
  observer.disconnect();
  init();
});
window.addEventListener('DOMContentLoaded', () => {
  terminalReadyObserver.observe(document.body, { childList: true, subtree: true });
});

const socketCloseHandler = (e) => {
  e.target.removeEventListener('close', socketCloseHandler);
  sockets.findIndex(s => s === e.target) >= 0 && sockets.splice(sockets.findIndex(s => s === e.target), 1);
  if (sockets.length === 0) {
    shellPrompt = '';
  }
  keepCloudShellSession.stop();
};
const socketOpenHandler = (e) => {
  e.target.removeEventListener('open', socketOpenHandler);
  !e.target.url.endsWith('/control') && e.target.addEventListener('message', socketMessageHandler);
  init();
};

const socketMessageHandler = (e) => {
  if (new TextDecoder().decode(e.data).startsWith('Welcome')) return;

  e.target.removeEventListener('message', socketMessageHandler);
  const originalTerminalWrite = window.term.write.bind(window.term);
  let promptDetecting = false;
  let currentPrompt = '';
  let promptTimeout = null;
  window.term.write = (data) => {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    originalTerminalWrite(data);
    const notifyPromptUpdated = () => {
      return setTimeout(() => {
        promptTimeout = null;
        promptDetecting = false;
        if (shellPrompt === currentPrompt) return;
        shellPrompt = currentPrompt;
        window.dispatchEvent(new CustomEvent('shellPromptUpdated', { detail: { shellPrompt } }));
      }, 10);
    };
    if (str.match(new RegExp(PROMPT_LEADING_PATTERN))) {
      currentPrompt = str.replace(
        new RegExp(`[\\s\\S]*(${PROMPT_LEADING_PATTERN}[^\\n\\r]*)[\\s\\S]*$`),
        '$1'
      );
      promptDetecting = true;
      promptTimeout = notifyPromptUpdated();
      return;
    }
    if (promptDetecting) {
      currentPrompt += str.split(/\r|\n/).reverse().find(line => line.trim() !== '');
      if (promptTimeout) clearTimeout(promptTimeout);
      promptTimeout = notifyPromptUpdated();
    }
  };
};

window.addEventListener('shellPromptUpdated', async (e) => {
  console.debug('shellPromptUpdated event received:', e.detail);
  init();
});

window.addEventListener('startupFeatureStatus', async (e) => {
  console.debug('startupFeatureStatus event received:', e.detail);
  window.dispatchEvent(new CustomEvent('updateFeatureStatus', { detail: e.detail }));

  // Execute startup commands

});

window.addEventListener('updateFeatureStatus', async (e) => {
  console.debug('updateFeatureStatus event received:', e.detail);

  keepCloudShellSession.stop();
  e.detail.keepCloudShellSession?.status && keepCloudShellSession.start(window.term);
  console.debug('KeepCloudShellSession status:', keepCloudShellSession.status);
});
