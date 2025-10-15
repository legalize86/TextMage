const { contextBridge, ipcRenderer } = require('electron');

// Безопасное экспонирование API
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC методы для работы с файлами
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  
  // Методы для управления T9
  toggleT9: () => ipcRenderer.invoke('toggle-t9'),
  getT9Status: () => ipcRenderer.invoke('get-t9-status'),
  
  // Методы для работы со словарем
  addWordToDictionary: (word) => ipcRenderer.invoke('add-word-to-dictionary', word),
  getDictionary: () => ipcRenderer.invoke('get-dictionary'),
  exportDictionary: () => ipcRenderer.invoke('export-dictionary'),
  importDictionary: () => ipcRenderer.invoke('import-dictionary'),
  
  // Методы для управления окном
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
  
  // События от main процесса
  onT9StatusChange: (callback) => ipcRenderer.on('t9-status-changed', callback),
  onDictionaryUpdate: (callback) => ipcRenderer.on('dictionary-updated', callback),
  onUrlChanged: (callback) => ipcRenderer.on('url-changed', callback),
  
  // Утилиты
  showNotification: (message, type) => ipcRenderer.invoke('show-notification', message, type),
  openDialog: (options) => ipcRenderer.invoke('open-dialog', options),
  
  // Проверка доступности T9 в текущем контексте
  isT9Available: () => {
    return typeof T9Predictor !== 'undefined' && window.t9Predictor instanceof T9Predictor;
  },
  
  // Инициализация T9 если доступен
  initializeT9: async (enabled) => {
    try {
      if (typeof T9Predictor !== 'undefined') {
        if (!window.t9Predictor) {
          window.t9Predictor = new T9Predictor();
        }
        window.t9Predictor.isEnabled = enabled;
        return true;
      }
      return false;
    } catch (error) {
      console.error('T9 initialization error:', error);
      return false;
    }
  },
  
  // Вызов методов T9 если доступен
  callT9Method: (methodName, ...args) => {
    if (window.t9Predictor && typeof window.t9Predictor[methodName] === 'function') {
      return window.t9Predictor[methodName](...args);
    }
    throw new Error(`T9 method ${methodName} not available`);
  },
  
  // Безопасный вызов методов T9 (без исключений)
  safeCallT9Method: (methodName, ...args) => {
    try {
      if (window.t9Predictor && typeof window.t9Predictor[methodName] === 'function') {
        return window.t9Predictor[methodName](...args);
      }
      return null;
    } catch (error) {
      console.warn(`T9 method ${methodName} call failed:`, error);
      return null;
    }
  }
});

// Глобальные хелперы для отладки (только в development)
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('textMageHelpers', {
    // Проверка состояния T9
    checkT9Status: () => {
      const status = {
        t9PredictorDefined: typeof T9Predictor !== 'undefined',
        t9InstanceExists: !!window.t9Predictor,
        t9Enabled: window.t9Predictor ? window.t9Predictor.isEnabled : false,
        t9Methods: window.t9Predictor ? Object.getOwnPropertyNames(Object.getPrototypeOf(window.t9Predictor)) : []
      };
      console.log('T9 Status:', status);
      return status;
    },
    
    // Перезагрузка T9
    reloadT9: () => {
      if (typeof T9Predictor !== 'undefined') {
        try {
          if (window.t9Predictor) {
            window.t9Predictor.hideSuggestions();
          }
          window.t9Predictor = new T9Predictor();
          console.log('T9 reloaded successfully');
          return true;
        } catch (error) {
          console.error('T9 reload failed:', error);
          return false;
        }
      }
      return false;
    },
    
    // Тестирование T9
    testT9: (digits) => {
      if (window.t9Predictor && typeof window.t9Predictor.digitsToWords === 'function') {
        const results = window.t9Predictor.digitsToWords(digits);
        console.log(`T9 Test for "${digits}":`, results);
        return results;
      }
      console.warn('T9 not available for testing');
      return [];
    }
  });
}

// Автоматическая инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log('TextMage preload script loaded');
  
  // Опционально: автоматически инициализировать T9 если доступен
  setTimeout(() => {
    if (typeof T9Predictor !== 'undefined' && !window.t9Predictor) {
      console.log('Auto-initializing T9...');
      try {
        window.t9Predictor = new T9Predictor();
      } catch (error) {
        console.error('Auto-initialization failed:', error);
      }
    }
  }, 1000);
});

// Глобальный обработчик ошибок для лучшей отладки
window.addEventListener('error', (event) => {
  console.error('Global error in TextMage:', event.error);
});

console.log('TextMage preload script executed');
