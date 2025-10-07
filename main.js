const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// Хранилище для последней открытой вкладки
let lastOpenedUrl = null;
let t9Enabled = true; // Глобальный флаг состояния T9

// Обработчики IPC для работы с файлами
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`);
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'TextMage',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Обновляем иконку при фокусе
  win.on('focus', () => {
    win.setIcon(path.join(__dirname, 'assets', 'icon.png'));
  });

  // Устанавливаем иконку при создании
  win.setIcon(path.join(__dirname, 'assets', 'icon.png'));

  // Загружаем последнюю открытую вкладку или Copilot по умолчанию
  const startUrl = lastOpenedUrl || 'https://copilot.microsoft.com/';
  win.loadURL(startUrl);
  
  // Предотвращаем изменение заголовка
  win.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  // Сохраняем URL при навигации
  win.webContents.on('did-navigate', (event, url) => {
    lastOpenedUrl = url;
  });

  win.webContents.on('did-navigate-in-page', (event, url) => {
    lastOpenedUrl = url;
  });

  // Нативное контекстное меню Electron
  win.webContents.on('context-menu', (event, params) => {
    const { selectionText, isEditable } = params;
    
    const template = [];
    
    if (selectionText && selectionText.trim() !== '') {
      template.push({
        label: 'Копировать',
        role: 'copy',
        accelerator: 'Ctrl+C'
      });
    }
    
    if (isEditable) {
      if (template.length > 0) template.push({ type: 'separator' });
      
      template.push(
        {
          label: 'Вставить',
          role: 'paste',
          accelerator: 'Ctrl+V'
        },
        {
          label: 'Вырезать',
          role: 'cut',
          accelerator: 'Ctrl+X',
          enabled: !!selectionText
        },
        { type: 'separator' },
        {
          label: 'Выделить все',
          role: 'selectall',
          accelerator: 'Ctrl+A'
        }
      );
    }
    
    if (template.length > 0) {
      const contextMenu = Menu.buildFromTemplate(template);
      contextMenu.popup();
    }
  });

  // Инжектируем T9 после загрузки страницы
  win.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      injectT9Autocomplete(win);
    }, 3000);
  });

  createMenu(win);
}

function injectT9Autocomplete(win) {
    try {
        console.log('Injecting T9 autocomplete...');

        // 1. Инжектим CSS напрямую
        const userscriptCSS = `
            /* T9 Autocomplete Styles */
            @keyframes t9SlideDown {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            #t9-suggestions-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: white;
                border-bottom: 2px solid #007cba;
                z-index: 10000;
                display: none;
                font-family: Arial, sans-serif;
                font-size: 14px;
                padding: 8px 10px;
                max-height: 60px;
                overflow-x: auto;
                overflow-y: hidden;
                white-space: nowrap;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                animation: t9SlideDown 0.3s ease;
            }

            #t9-suggestions-bar button {
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 16px;
                background: white;
                cursor: pointer;
                font-size: 13px;
                white-space: nowrap;
                flex-shrink: 0;
                transition: all 0.2s ease;
                margin: 0 4px;
            }

            #t9-suggestions-bar button:hover {
                background: #e3f2fd;
                border-color: #007cba;
                transform: translateY(-1px);
            }

            #t9-add-word-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #007cba;
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: none;
            }

            #t9-dictionary-btn {
                position: fixed;
                bottom: 80px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #28a745;
                color: white;
                border: none;
                font-size: 20px;
                cursor: pointer;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: none;
            }
        `;
        
        win.webContents.insertCSS(userscriptCSS);
        console.log('T9 styles injected');

        // 2. Инжектим скрипты
        const scriptPaths = [
            path.join(__dirname, 'words.js'),
            path.join(__dirname, 't9.js')
        ];

        // Функция для инжекта одного скрипта
        const injectScript = (scriptPath) => {
            return new Promise((resolve, reject) => {
                if (fs.existsSync(scriptPath)) {
                    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
                    
                    win.webContents.executeJavaScript(scriptContent)
                        .then(() => {
                            console.log(`Successfully injected: ${path.basename(scriptPath)}`);
                            resolve();
                        })
                        .catch(err => {
                            console.warn(`Warning injecting ${path.basename(scriptPath)}:`, err.message);
                            resolve();
                        });
                } else {
                    reject(new Error(`File not found: ${scriptPath}`));
                }
            });
        };

        // Инжектируем последовательно с задержкой
        setTimeout(() => {
            injectScript(scriptPaths[0])
                .then(() => new Promise(resolve => setTimeout(resolve, 500)))
                .then(() => injectScript(scriptPaths[1]))
                .then(() => new Promise(resolve => setTimeout(resolve, 500)))
                .then(() => {
                    console.log('All T9 scripts injection attempted');
                    // Пробуем инициализировать T9
                    return win.webContents.executeJavaScript(`
                        setTimeout(() => {
                            if (typeof T9Predictor !== 'undefined') {
                                window.t9Predictor = new T9Predictor();
                                console.log('T9 Autocomplete initialized successfully!');
                            } else {
                                console.log('T9Predictor not found, but injection completed');
                            }
                        }, 1000);
                    `);
                })
                .then(() => console.log('T9 initialization attempted'))
                .catch(err => console.error('Error in T9 injection process:', err));

        }, 1000);

    } catch (error) {
        console.error('Error in T9 autocomplete:', error);
    }
}

// Меню приложения
function createMenu(win) {
  const template = [
    {
      label: 'Меню',
      submenu: [
        { 
          label: '🔍 Perplexity', 
          accelerator: 'CmdOrCtrl+P', 
          click: () => {
            const currentWindow = BrowserWindow.getFocusedWindow();
            if (currentWindow) {
              currentWindow.loadURL('https://www.perplexity.ai/');
            }
          }
        },
        { 
          label: '🚀 Copilot', 
          accelerator: 'CmdOrCtrl+C', 
          click: () => {
            const currentWindow = BrowserWindow.getFocusedWindow();
            if (currentWindow) {
              currentWindow.loadURL('https://copilot.microsoft.com/');
            }
          }
        },
        { 
          label: '✨ Gemini', 
          accelerator: 'CmdOrCtrl+M', 
          click: () => {
            const currentWindow = BrowserWindow.getFocusedWindow();
            if (currentWindow) {
              currentWindow.loadURL('https://gemini.google.com/app');
            }
          }
        },
        { 
          label: '🧠 DeepSeek', 
          accelerator: 'CmdOrCtrl+D', 
          click: () => {
            const currentWindow = BrowserWindow.getFocusedWindow();
            if (currentWindow) {
              currentWindow.loadURL('https://chat.deepseek.com');
            }
          }
        },
        { 
          label: '🤖 ChatGPT', 
          accelerator: 'CmdOrCtrl+G', 
          click: () => {
            const currentWindow = BrowserWindow.getFocusedWindow();
            if (currentWindow) {
              currentWindow.loadURL('https://chatgpt.com/');
            }
          }
        },
        { type: 'separator' },
        { 
          label: 'Новое окно', 
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createWindow();
          }
        },
        { type: 'separator' },
        { label: 'Выход', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
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
        { label: 'Перезагрузить', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Полный экран', accelerator: 'F11', role: 'togglefullscreen' },
        { label: 'Инструменты разработчика', accelerator: 'F12', role: 'toggledevtools' }
      ]
    },
    {
      label: 'Инструменты',
      submenu: [
        {
          label: 'Включить T9',
          type: 'checkbox',
          checked: t9Enabled,
          click: (menuItem) => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              // Переключаем глобальный флаг
              t9Enabled = !t9Enabled;
              menuItem.checked = t9Enabled;
              menuItem.label = t9Enabled ? 'Выключить T9' : 'Включить T9';
              
              // Передаем состояние в страницу
              focusedWindow.webContents.executeJavaScript(`
                if (window.t9Predictor) {
                  window.t9Predictor.isEnabled = ${t9Enabled};
                  console.log('T9 set to:', window.t9Predictor.isEnabled ? 'enabled' : 'disabled');
                  
                  // Обновляем видимость кнопок
                  const addBtn = document.getElementById('t9-add-word-btn');
                  const dictBtn = document.getElementById('t9-dictionary-btn');
                  
                  if (${t9Enabled}) {
                    if (addBtn) addBtn.style.display = 'block';
                    if (dictBtn) dictBtn.style.display = 'block';
                  } else {
                    if (addBtn) addBtn.style.display = 'none';
                    if (dictBtn) dictBtn.style.display = 'none';
                    // Скрываем подсказки если выключаем
                    window.t9Predictor.hideSuggestions();
                  }
                  
                  // Показываем уведомление
                  const notification = document.createElement('div');
                  notification.id = 't9-notification';
                  notification.textContent = 'T9 ' + (${t9Enabled} ? 'включен' : 'выключен');
                  notification.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: ${t9Enabled ? '#4CAF50' : '#ff4444'};
                    color: white;
                    padding: 12px 20px;
                    border-radius: 6px;
                    z-index: 10003;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    animation: t9SlideIn 0.3s ease;
                  \`;
                  document.body.appendChild(notification);
                  
                  setTimeout(() => {
                    if (notification.parentNode) notification.remove();
                  }, 2000);
                }
              `);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Управление словарем',
          accelerator: 'Ctrl+Shift+T',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                if (window.t9Predictor) {
                  window.t9Predictor.showDictionaryManager();
                } else {
                  alert('T9 не инициализирован. Перезагрузите страницу.');
                }
              `);
            }
          }
        },
        {
          label: 'Добавить слово',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                if (window.t9Predictor) {
                  window.t9Predictor.showAddWordDialog();
                }
              `);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Импорт слов',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                if (window.t9Predictor) {
                  window.t9Predictor.importWords();
                }
              `);
            }
          }
        },
        {
          label: 'Экспорт слов',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.executeJavaScript(`
                if (window.t9Predictor) {
                  window.t9Predictor.exportWords();
                }
              `);
            }
          }
        }
      ]
    },
    {
      label: 'Помощь',
      submenu: [
        {
          label: 'О программе TextMage',
          click: () => {
            const aboutHtmlPath = path.join(__dirname, 'about.html');
            if (!fs.existsSync(aboutHtmlPath)) {
              dialog.showMessageBox({
                type: 'info',
                title: 'О программе TextMage',
                message: 'TextMage',
                detail: 'Версия: 1.0.0\nАвтор: Legalize86\nМагия: T9 автодополнение\n\nВозможности волшебства:\n• Умное автодополнение\n• T9 ввод цифрами\n• Книга заклинаний (словарь)\n• Поддержка Perplexity, Copilot, Gemini, DeepSeek & ChatGPT',
                buttons: ['OK']
              });
              return;
            }

            const aboutWindow = new BrowserWindow({
              width: 400,
              height: 650,
              resizable: false,
              parent: BrowserWindow.getFocusedWindow(),
              modal: false,
              icon: path.join(__dirname, 'assets', 'icon.png'),
              title: 'О программе TextMage',
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
              },
              autoHideMenuBar: true,
              minimizable: true,
              closable: true,
              maximizable: false
            });

            aboutWindow.setMenu(null);
            aboutWindow.loadFile('about.html');

            aboutWindow.on('blur', () => {
              aboutWindow.close();
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Сохраняем URL при закрытии приложения
app.on('before-quit', () => {
  // Сохраняем последнюю вкладку в localStorage для следующего запуска
  if (lastOpenedUrl) {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'config.json');
    
    try {
      const config = { 
        lastUrl: lastOpenedUrl,
        t9Enabled: t9Enabled 
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }
});

// Загружаем сохраненный URL при запуске
app.whenReady().then(() => {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'config.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.lastUrl) {
        lastOpenedUrl = config.lastUrl;
      }
      if (config.t9Enabled !== undefined) {
        t9Enabled = config.t9Enabled;
      }
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  
  createWindow();
});

// Обработка закрытия приложения
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Подавление GLib ошибок
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--disable-logging');
