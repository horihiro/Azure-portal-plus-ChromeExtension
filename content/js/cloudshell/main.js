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
  execute(command, options = { background: true, history: true }) {
    return new Promise((resolve, reject) => {
      const socket = sockets.find(s => !s.url.endsWith('/control'));
      const terminal = window.term;
      const { background, history } = options;

      const originalTerminalWrite = terminal.write.bind(terminal);
      if (socket?.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket is not open.');
        reject(new Error('WebSocket is not open.'));
        return;
      }
      const commandWithNewline = `${history ? '' : ' '}${command.trim() + '\n'}`;
      terminal.write = (data) => {
        const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
        if (!background) {
          terminal.write = originalTerminalWrite;
          terminal.write(str);
          resolve();
          return;
        }
        if (!str.endsWith(globalSettings.shellPrompt)) return;
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
const startupCommands = [
  // Default startup commands
  { command: 'export TWEAKIT_INJECTED=1', background: true, history: false },
];

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
const globalSettings = {
  shellPrompt: '',
  endpoint: {
    host: '',
    path: '',
  },
};

const init = () => {
  if (!window.term || !globalSettings.shellPrompt || sockets.length < 2 || !sockets.every(s => s.readyState === WebSocket.OPEN)) return;
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
  const socket = e.target;
  socket.removeEventListener('close', socketCloseHandler);
  sockets.findIndex(s => s === socket) >= 0 && sockets.splice(sockets.findIndex(s => s === socket), 1);
  if (sockets.length === 0) {
    globalSettings.shellPrompt = '';
  }
  keepCloudShellSession.stop();
};
const socketOpenHandler = (e) => {
  const socket = e.target;
  socket.removeEventListener('open', socketOpenHandler);
  if (!socket.url.endsWith('/control')) {
    socket.addEventListener('message', socketMessageHandler);
    const [_, host, path] = socket.url.match(/wss:\/\/([^\/]+)\/\$hc\/([^\/]+)\/.*/);
    globalSettings.endpoint = { host, path };
  }
  init();
};

const socketMessageHandler = (e) => {
  const socket = e.target;
  if (new TextDecoder().decode(e.data).startsWith('Welcome')) return;

  socket.removeEventListener('message', socketMessageHandler);
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
        if (globalSettings.shellPrompt === currentPrompt) return;
        globalSettings.shellPrompt = currentPrompt;
        window.dispatchEvent(new CustomEvent('shellPromptUpdated', { detail: { shellPrompt: globalSettings.shellPrompt } }));
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

  //// Other samples
  startupCommands.push({ command: 'alias ll="ls -la"', background: true, history: false });
  startupCommands.push({ command: `function tree() { cd $1 && pwd;find . | sort | sed '1d;s/^\\.//;s/\\/\\([^/]*\\)$/|--\\1/;s/\\/[^/|]*/|  /g' && cd - > /dev/null; }`, background: true, history: false });

  // Execute all startup commands
  await startupCommands.reduce(async (p, options) => {
    await p;
    return commandExecutor.execute(
      options.command,
      {
        background: options.background,
        history: options.history
      }
    );
  }, Promise.resolve());
});

window.addEventListener('updateFeatureStatus', async (e) => {
  console.debug('updateFeatureStatus event received:', e.detail);

  keepCloudShellSession.stop();
  e.detail.keepCloudShellSession?.status && keepCloudShellSession.start(window.term);
  console.debug('KeepCloudShellSession status:', keepCloudShellSession.status);
});

// sockets[0].send(`curl -s "https://${globalSettings.endpoint.host}/${globalSettings.endpoint.path}/tunnel" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $(az account get-access-token --query "accessToken" --output tsv)" -d "{\\"token\\": \\"$(az account get-access-token --query "accessToken" --output tsv --scope 46da2f7e-b5ef-422a-88d4-2a7f9de6a0b2/all)\\", \\"folderPath\\": \\"\\", \\"tunnelName\\": \\"shell\\", \\"extensions\\": []}" > /dev/null && kill $(ps aux | grep "[v]scode tunnel" | awk '{print $2}')\n`)
// `function tree() { cd $1 && pwd;find . | sort | sed '1d;s/^\\.//;s/\\/\\([^/]*\\)$/|--\\1/;s/\\/[^/|]*/|  /g' && cd - > /dev/null; }`

// TOKEN=$(az account get-access-token --query "accessToken" --output tsv)
// TUNNEL_TOKEN=$(az account get-access-token --query "accessToken" --output tsv --scope 46da2f7e-b5ef-422a-88d4-2a7f9de6a0b2/all)
// curl "https://${ACC_CLUSTER}.servicebus.windows.net/cc-JDWT-8F8ACC7E/tunnel" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${TOKEN}" -d "{\"token\": \"${TUNNEL_TOKEN}\", \"folderPath\": \"\", \"tunnelName\": \"shell\", \"extensions\": []}"
// kill $(ps aux | grep "[v]scode tunnel" | awk '{print $2}')