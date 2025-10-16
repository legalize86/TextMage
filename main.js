const { app, BrowserWindow, Menu, dialog, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');

app.setName('TextMage');
app.setAppUserModelId('TextMage');

let lastOpenedUrl = null;
let t9Enabled = true;
let mainWindow = null;

const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');
const boundsPath = path.join(userDataPath, 'window-bounds.json');

const defaultUA = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0';
const copilotUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const deepseekUA = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 LibreWolf/130.0';

// ===== Version Sync Function =====
function updateAboutVersion() {
  try {
    const { version } = require('./package.json');
    let aboutContent = fs.readFileSync('about.html', 'utf8');
    aboutContent = aboutContent.replace(
      /<p>Версия: <span id="version-display">[^<]*<\/span><\/p>/,
      `<p>Версия: <span id="version-display">${version}</span></p>`
    );
    fs.writeFileSync('about.html', aboutContent);
    console.log('About page updated to version:', version);
  } catch (error) {
    console.log('Note: about.html not found or couldn\'t be updated');
  }
}

// ===== IPC Handlers =====
ipcMain.handle('read-file', async (_, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error('read-file error:', e);
    return null;
  }
});

ipcMain.handle('file-exists', async (_, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
});

ipcMain.handle('toggle-t9', async () => {
  const newStatus = !t9Enabled;
  t9Enabled = newStatus;
  fs.writeFileSync(configPath, JSON.stringify({ lastUrl: lastOpenedUrl, t9Enabled }));
  
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'TextMage',
      message: `T9 ${newStatus ? 'включен' : 'выключен'}`,
      detail: newStatus ? 'Автодополнение и T9 ввод активны' : 'Режим чистого браузера'
    });
    
    createMenu(mainWindow);
    
    if (newStatus) {
      // Включение - перезагружаем для чистой инициализации
      mainWindow.reload();
    } else {
      // Выключение - агрессивная очистка
      await mainWindow.webContents.executeJavaScript(`
        try {
          // Удаляем все T9 элементы
          const elementsToRemove = [
            't9-suggestions-bar',
            't9-add-word-btn', 
            't9-dictionary-btn',
            't9-notification',
            't9-add-word-dialog',
            't9-dictionary-manager'
          ];
          
          elementsToRemove.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
          });
          
          // Отключаем T9 логику
          if (window.t9Predictor) {
            window.t9Predictor.isEnabled = false;
            window.t9Predictor.hideSuggestions();
            
            // Очищаем все интервалы и таймауты
            if (window.t9Predictor.inputDebounce) {
              clearTimeout(window.t9Predictor.inputDebounce);
            }
            
            // Удаляем глобальный объект
            window.t9Predictor = null;
          }
          
          // Удаляем все стили T9
          const allStyles = document.querySelectorAll('style');
          allStyles.forEach(style => {
            if (style.textContent && (
              style.textContent.includes('t9-') ||
              style.textContent.includes('T9Predictor') ||
              style.textContent.includes('#t9-suggestions-bar')
            )) {
              style.remove();
            }
          });
          
          console.log('🔴 T9 полностью отключен');
        } catch (error) {
          console.error('Ошибка при отключении T9:', error);
        }
      `).catch(() => {});
    }
  }
  
  return t9Enabled;
});

ipcMain.handle('get-t9-status', async () => t9Enabled);

// Обработчик для открытия окна "О магии"
ipcMain.on('open-magic-window', () => {
    const magicWindow = new BrowserWindow({
        width: 400,
        height: 720,
        title: 'О магии TextMage',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        resizable: false,
        parent: null,
        modal: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    const magicHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>О магии TextMage</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                height: 100vh;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                width: 380px;
                max-width: 90vw;
                overflow: hidden;
                border: 1px solid #e1e5e9;
            }
            .modal-header {
                background: linear-gradient(135deg, #8B5CF6, #6D28D9);
                color: white;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                flex: 1;
                text-align: center;
            }
            .modal-logo { font-size: 24px; margin-right: 10px; }
            .modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s ease;
            }
            .modal-close:hover { background: rgba(255, 255, 255, 0.2); }
            .modal-body { padding: 25px; }
            .modal-body p {
                margin-bottom: 20px;
                color: #333;
                line-height: 1.5;
                text-align: center;
            }
            .magic-features { display: flex; flex-direction: column; gap: 15px; }
            .magic-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 3px solid #8B5CF6;
            }
            .magic-icon { font-size: 18px; flex-shrink: 0; }
            .magic-item span:last-child { color: #555; line-height: 1.4; }
            .modal-footer {
                padding: 20px;
                border-top: 1px solid #f1f5f9;
                display: flex;
                justify-content: center;
            }
            .modal-btn {
                background: #8B5CF6;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            .modal-btn:hover { background: #7C3AED; transform: translateY(-1px); }
        </style>
    </head>
    <body>
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-logo">✨</div>
                <h3>О магии TextMage</h3>
                <button class="modal-close" onclick="window.close()">×</button>
            </div>
            <div class="modal-body">
                <p>TextMage - это магический помощник для быстрого набора текста в AI-ассистентах!</p>
                <div class="magic-features">
                    <div class="magic-item">
                        <span class="magic-icon">🔮</span>
                        <span>Умный запуск: открывает последнюю вкладку или Copilot по умолчанию</span>
                    </div>
                    <div class="magic-item">
                        <span class="magic-icon">✨</span>
                        <span>Используйте T9 для ускорения ввода в любом AI-ассистенте</span>
                    </div>
                    <div class="magic-item">
                        <span class="magic-icon">📚</span>
                        <span>Добавляйте свои заклинания в словарь</span>
                    </div>
                    <div class="magic-item">
                        <span class="magic-icon">🚀</span>
                        <span>Быстрый доступ к 5 AI-ассистентам: Perplexity, Copilot, Gemini, DeepSeek, ChatGPT</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn" onclick="window.close()">Понятно</button>
            </div>
        </div>
        <script>
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') window.close();
            });
        </script>
    </body>
    </html>
    `;

    magicWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(magicHTML)}`);
});

// ===== App Startup =====
app.whenReady().then(() => {
  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      lastOpenedUrl = cfg.lastUrl || null;
      t9Enabled = cfg.t9Enabled ?? true;
    }
  } catch (e) {
    console.warn('Config read error:', e);
  }
  
  // Обновляем версию в about.html перед созданием окна
  updateAboutVersion();
  
  createWindow();
});

// ===== Window Management =====
function createWindow() {
  const { version } = require('./package.json');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `TextMage`,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Восстановление позиции окна
  if (fs.existsSync(boundsPath)) {
    try {
      const bounds = JSON.parse(fs.readFileSync(boundsPath, 'utf8'));
      mainWindow.setBounds(bounds);
    } catch (e) {
      console.warn('Bounds restore error:', e);
    }
  }

  mainWindow.on('close', () => {
    try {
      fs.writeFileSync(boundsPath, JSON.stringify(mainWindow.getBounds()));
      fs.writeFileSync(configPath, JSON.stringify({ lastUrl: lastOpenedUrl, t9Enabled }));
    } catch (e) {
      console.warn('Save bounds error:', e);
    }
  });

  // User-Agent настройки
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders;
    const url = details.url;
    if (url.includes('copilot.microsoft.com') || url.includes('bing.com')) {
      headers['User-Agent'] = copilotUA;
    } else if (url.includes('deepseek.com')) {
      headers['User-Agent'] = deepseekUA;
    } else {
      headers['User-Agent'] = defaultUA;
    }
    callback({ requestHeaders: headers });
  });

  const startUrl = lastOpenedUrl || 'https://copilot.microsoft.com/';
  mainWindow.loadURL(startUrl);

  // Сохранение URL
  const saveUrl = (_, url) => {
    if (url && !url.startsWith('chrome://') && !url.startsWith('devtools://')) {
      lastOpenedUrl = url;
    }
  };
  mainWindow.webContents.on('did-navigate', saveUrl);
  mainWindow.webContents.on('did-navigate-in-page', saveUrl);

  // Контекстное меню
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { selectionText, isEditable } = params;
    const template = [];
    
    if (selectionText && selectionText.trim()) {
      template.push({ label: 'Копировать', role: 'copy', accelerator: 'Ctrl+C' });
    }
    
    if (isEditable) {
      if (template.length > 0) template.push({ type: 'separator' });
      template.push(
        { label: 'Вставить', role: 'paste', accelerator: 'Ctrl+V' },
        { label: 'Вырезать', role: 'cut', accelerator: 'Ctrl+X', enabled: !!selectionText },
        { type: 'separator' },
        { label: 'Выделить все', role: 'selectall', accelerator: 'Ctrl+A' }
      );
    }
    
    if (template.length > 0) {
      Menu.buildFromTemplate(template).popup();
    }
  });

  // Инжект T9 после загрузки (только если включен)
  mainWindow.webContents.on('did-finish-load', () => {
    const currentUrl = mainWindow.webContents.getURL();
    const shouldInject = !currentUrl.startsWith('devtools://') && 
                        !currentUrl.startsWith('chrome://') && 
                        t9Enabled;
    
    if (shouldInject) {
      setTimeout(() => injectT9(mainWindow), 800);
    }
  });

  createMenu(mainWindow);
}

// ===== T9 Injection =====
async function injectT9(win) {
  if (!t9Enabled) {
    console.log('🟡 T9 отключен, инжект пропущен');
    return;
  }
  
  try {
    console.log('🟢 Начинаем инжект T9...');
    
    // Инжект CSS
    const cssPath = path.join(__dirname, 't9.css');
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      win.webContents.insertCSS(cssContent);
    }

    // Инжект JavaScript файлов
    const scripts = ['words.js', 't9.js'];
    for (const file of scripts) {
      const scriptPath = path.join(__dirname, file);
      if (fs.existsSync(scriptPath)) {
        const code = fs.readFileSync(scriptPath, 'utf8');
        await win.webContents.executeJavaScript(code).catch(e => {
          console.warn(`Ошибка инжекта ${file}:`, e.message);
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Инициализация T9
    await win.webContents.executeJavaScript(`
      if (typeof T9Predictor !== 'undefined') {
        if (window.t9Predictor) {
          try {
            window.t9Predictor.hideSuggestions();
            if (window.t9Predictor.inputDebounce) {
              clearTimeout(window.t9Predictor.inputDebounce);
            }
          } catch (e) {}
          window.t9Predictor = null;
        }
        
        window.t9Predictor = new T9Predictor();
        window.t9Predictor.isEnabled = true;
        
        console.log('✅ T9 стабильно инициализирован');
      } else {
        console.error('❌ T9Predictor не найден после инжекта');
      }
    `);
    
    console.log('✅ T9 инжект завершен');
  } catch (e) {
    console.error('❌ Ошибка инжекта T9:', e);
  }
}

// ===== Menu System =====
function createMenu(win) {
  const { version } = require('./package.json');
  
  const template = [
    {
      label: 'Меню',
      submenu: [
        { label: '🔍 Perplexity', click: () => win.loadURL('https://www.perplexity.ai/') },
        { label: '🚀 Copilot', click: () => win.loadURL('https://copilot.microsoft.com/') },
        { label: '✨ Gemini', click: () => win.loadURL('https://gemini.google.com/app') },
        { label: '🧠 DeepSeek', click: () => win.loadURL('https://chat.deepseek.com') },
        { label: '🤖 ChatGPT', click: () => win.loadURL('https://chatgpt.com/') },
        { type: 'separator' },
        { label: 'Перезагрузить страницу', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Новое окно', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
        { type: 'separator' },
        { label: 'Выход', role: 'quit' }
      ]
    },
    {
      label: 'Правка',
      submenu: [
        { label: 'Отменить', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Повторить', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Вырезать', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Копировать', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Вставить', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Выделить все', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'Окно',
      role: 'window',
      submenu: [
        { label: 'Свернуть', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Закрыть', accelerator: 'CmdOrCtrl+W', role: 'close' },
        { type: 'separator' },
        { label: 'Полный экран', accelerator: 'F11', role: 'togglefullscreen' },
        { label: 'Инструменты разработчика', accelerator: 'F12', role: 'toggledevtools' }
      ]
    },
    {
      label: 'Инструменты',
      submenu: [
        {
          label: t9Enabled ? '✅ T9 Включен' : '❌ T9 Выключен',
          click: async () => {
            try {
              const newStatus = await ipcMain.invoke('toggle-t9');
              console.log('T9 переключен на:', newStatus);
            } catch (error) {
              console.error('Ошибка переключения T9:', error);
              t9Enabled = !t9Enabled;
              fs.writeFileSync(configPath, JSON.stringify({ lastUrl: lastOpenedUrl, t9Enabled }));
              createMenu(win);
              
              dialog.showMessageBox(win, {
                type: 'info',
                title: 'TextMage',
                message: `T9 ${t9Enabled ? 'включен' : 'выключен'}`,
                detail: t9Enabled ? 'Автодополнение и T9 ввод активны' : 'Режим чистого браузера'
              });
              
              if (t9Enabled) win.reload();
            }
          }
        },
        { type: 'separator' },
        {
          label: '📚 Управление словарем',
          click: () => {
            if (t9Enabled) {
              win.webContents.executeJavaScript(`
                if (window.t9Predictor && window.t9Predictor.showDictionaryManager) {
                  window.t9Predictor.showDictionaryManager();
                } else {
                  alert('T9 не инициализирован. Попробуйте перезагрузить страницу.');
                }
              `);
            } else {
              dialog.showMessageBox(win, {
                type: 'info',
                title: 'T9 выключен',
                message: 'Включите T9 для доступа к словарю'
              });
            }
          }
        },
        {
          label: '➕ Добавить слово',
          click: () => {
            if (t9Enabled) {
              win.webContents.executeJavaScript(`
                if (window.t9Predictor && window.t9Predictor.showAddWordDialog) {
                  window.t9Predictor.showAddWordDialog();
                }
              `);
            } else {
              dialog.showMessageBox(win, {
                type: 'info',
                title: 'T9 выключен',
                message: 'Включите T9 для добавления слов'
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: '📥 Импорт слов',
          click: () => {
            if (t9Enabled) {
              win.webContents.executeJavaScript(`
                if (window.t9Predictor && window.t9Predictor.importWordsFromFile) {
                  window.t9Predictor.importWordsFromFile();
                }
              `);
            } else {
              dialog.showMessageBox(win, {
                type: 'info',
                title: 'T9 выключен',
                message: 'Включите T9 для импорта слов'
              });
            }
          }
        },
        {
          label: '📤 Экспорт слов',
          click: () => {
            if (t9Enabled) {
              win.webContents.executeJavaScript(`
                if (window.t9Predictor && window.t9Predictor.exportDictionary) {
                  window.t9Predictor.exportDictionary();
                }
              `);
            } else {
              dialog.showMessageBox(win, {
                type: 'info',
                title: 'T9 выключен',
                message: 'Включите T9 для экспорта слов'
              });
            }
          }
        }
      ]
    },
    {
      label: 'Помощь',
      submenu: [
        {
          label: `О программе`,
          click: () => {
            const aboutPath = path.join(__dirname, 'about.html');
            if (fs.existsSync(aboutPath)) {
              const about = new BrowserWindow({
                width: 400,
                height: 650,
                title: `О программе TextMage v${version}`,
                icon: path.join(__dirname, 'assets', 'icon.png'),
                resizable: false,
                parent: null,
                modal: false,
                autoHideMenuBar: true,
                webPreferences: {
                  nodeIntegration: true,
                  contextIsolation: false,
                  webSecurity: false
                }
              });
              about.loadFile(aboutPath);
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: `О TextMage v${version}`,
                message: `TextMage ${version}`,
                detail: 'Автор: Legalize86\nAI помощник с T9 автодополнением'
              });
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ===== App Event Handlers =====
app.on('before-quit', () => {
  try {
    fs.writeFileSync(configPath, JSON.stringify({ lastUrl: lastOpenedUrl, t9Enabled }));
  } catch (e) {
    console.warn('Save config on quit error:', e);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ===== Performance Optimizations =====
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--disable-logging');

console.log('🚀 TextMage запущен');
