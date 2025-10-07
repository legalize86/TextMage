class T9Predictor {
    constructor() {
        this.t9Map = {
            '2': 'абвг', '3': 'дежз', '4': 'ийкл', '5': 'мноп', 
            '6': 'рсту', '7': 'фхцч', '8': 'шщъы', '9': 'ьэюя',
            '1': '.,!?', '0': ' '
        };
        this.words = new Set();
        this.wordFreq = {};
        this.currentInput = null;
        this.currentSuggestions = [];
        this.selectedIndex = -1;
        this.isEnabled = true;
        
        this.loadDictionary();
        this.createSuggestionBar();
        this.createControlButtons();
        this.setupEventListeners();
        
        console.log('T9 Autocomplete loaded!');
    }

    // Метод для включения/выключения T9
    toggleT9() {
        this.isEnabled = !this.isEnabled;
        this.updateButtonsVisibility();
        if (!this.isEnabled) {
            this.hideSuggestions();
        }
        console.log(`T9 ${this.isEnabled ? 'включен' : 'выключен'}`);
        return this.isEnabled;
    }

    updateButtonsVisibility() {
        const addBtn = document.getElementById('t9-add-word-btn');
        const dictBtn = document.getElementById('t9-dictionary-btn');
        
        if (this.isEnabled) {
            if (addBtn) addBtn.style.display = 'block';
            if (dictBtn) dictBtn.style.display = 'block';
        } else {
            if (addBtn) addBtn.style.display = 'none';
            if (dictBtn) dictBtn.style.display = 'none';
        }
    }

    loadDictionary() {
        // Загрузка из внешнего словаря
        if (window.T9_DICTIONARY) {
            const allWords = [
                ...window.T9_DICTIONARY.russian,
                ...window.T9_DICTIONARY.english
            ];
            allWords.forEach(word => this.words.add(word.toLowerCase()));
            console.log(`Загружено ${allWords.length} слов из внешнего словаря`);
        } else {
            // Резервный базовый словарь
            const baseWords = [
                'привет', 'мир', 'как', 'дела', 'что', 'это', 'так', 'вот', 'еще', 'уже',
                'можно', 'нужно', 'хочу', 'могу', 'знаю', 'понимаю', 'думаю', 'считаю',
                'хорошо', 'плохо', 'нормально', 'отлично', 'прекрасно', 'замечательно',
                'кто', 'что', 'где', 'когда', 'почему', 'зачем', 'какой', 'какая', 'какое',
                'я', 'ты', 'он', 'она', 'оно', 'мы', 'вы', 'они', 'меня', 'тебя', 'его',
                'в', 'на', 'с', 'по', 'из', 'у', 'о', 'об', 'от', 'до', 'за', 'через',
                'и', 'а', 'но', 'или', 'да', 'ли', 'же', 'бы', 'вот', 'вон', 'тут', 'там',
                'быть', 'стать', 'сделать', 'сказать', 'говорить', 'рассказать', 'показать',
                'дать', 'взять', 'получить', 'найти', 'искать', 'работать', 'жить', 'любить',
                'человек', 'время', 'дело', 'жизнь', 'день', 'рука', 'работа', 'слово',
                'место', 'лицо', 'друг', 'глаз', 'вопрос', 'дом', 'сторона', 'страна'
            ];
            baseWords.forEach(word => this.words.add(word.toLowerCase()));
            console.log('Используется базовый словарь');
        }
        
        // Загрузка из localStorage
        try {
            const saved = localStorage.getItem('t9_learned');
            if (saved) {
                this.wordFreq = JSON.parse(saved);
                Object.keys(this.wordFreq).forEach(word => this.words.add(word));
                console.log(`Загружено ${Object.keys(this.wordFreq).length} изученных слов`);
            }
        } catch (e) {
            console.log('Сохраненные слова не найдены');
        }
    }

    saveLearnedData() {
        try {
            localStorage.setItem('t9_learned', JSON.stringify(this.wordFreq));
        } catch (e) {
            console.log('Ошибка сохранения данных');
        }
    }

    learnWord(word) {
        const cleanWord = word.toLowerCase().trim();
        if (cleanWord.length < 2) return;
        
        this.wordFreq[cleanWord] = (this.wordFreq[cleanWord] || 0) + 1;
        this.words.add(cleanWord);
        this.saveLearnedData();
        console.log(`Изучено: "${cleanWord}" (${this.wordFreq[cleanWord]} раз)`);
    }

    // Ручное добавление слова
    addWordManually(word) {
        const cleanWord = word.toLowerCase().trim();
        if (cleanWord.length < 2) {
            this.showNotification('Слово должно содержать минимум 2 символа', 'error');
            return false;
        }
        
        if (cleanWord.length > 50) {
            this.showNotification('Слово слишком длинное', 'error');
            return false;
        }
        
        this.learnWord(cleanWord);
        this.showNotification(`Слово "${cleanWord}" добавлено в словарь!`);
        return true;
    }

    // Массовый импорт слов
    importWords(wordList) {
        if (!Array.isArray(wordList)) {
            this.showNotification('Ошибка: должен быть массив слов', 'error');
            return;
        }
        
        let addedCount = 0;
        let skippedCount = 0;
        
        wordList.forEach(word => {
            if (typeof word === 'string' && word.length >= 2 && word.length <= 50) {
                const cleanWord = word.toLowerCase().trim();
                if (!this.words.has(cleanWord)) {
                    this.learnWord(cleanWord);
                    addedCount++;
                } else {
                    skippedCount++;
                }
            } else {
                skippedCount++;
            }
        });
        
        this.saveLearnedData();
        
        let message = `Импортировано ${addedCount} новых слов`;
        if (skippedCount > 0) {
            message += `, пропущено ${skippedCount} слов`;
        }
        
        this.showNotification(message);
    }

    digitsToWords(digits) {
        if (!digits.match(/^[2-9]+$/)) return [];

        const results = [];
        
        const generate = (index, current) => {
            if (index === digits.length) {
                if (this.words.has(current)) {
                    results.push(current);
                }
                return;
            }

            const digit = digits[index];
            const letters = this.t9Map[digit];
            for (let letter of letters) {
                generate(index + 1, current + letter);
            }
        };

        generate(0, '');
        
        // Сортируем по частоте использования
        return results.sort((a, b) => {
            const freqA = this.wordFreq[a] || 0;
            const freqB = this.wordFreq[b] || 0;
            return freqB - freqA;
        });
    }

    autocompleteWord(partial) {
        if (!partial || partial.length < 1) return [];
        
        const partialLower = partial.toLowerCase();
        const matches = [];
        
        for (let word of this.words) {
            if (word.startsWith(partialLower)) {
                matches.push(word);
            }
        }
        
        return matches.sort((a, b) => {
            const freqA = this.wordFreq[a] || 0;
            const freqB = this.wordFreq[b] || 0;
            return freqB - freqA;
        }).slice(0, 8);
    }

    createSuggestionBar() {
        const oldBar = document.getElementById('t9-suggestions-bar');
        if (oldBar) oldBar.remove();
        
        this.suggestionBar = document.createElement('div');
        this.suggestionBar.id = 't9-suggestions-bar';
        this.suggestionBar.style.cssText = `
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
        `;
        
        // Контейнер для кнопок предложений
        this.suggestionsContainer = document.createElement('div');
        this.suggestionsContainer.style.cssText = `
            display: flex;
            gap: 8px;
            align-items: center;
        `;
        
        this.suggestionBar.appendChild(this.suggestionsContainer);
        document.body.appendChild(this.suggestionBar);
    }

    showSuggestions(input, suggestions) {
        if (!this.isEnabled) return;
        
        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.currentSuggestions = suggestions;
        this.selectedIndex = -1;

        // Очищаем контейнер
        this.suggestionsContainer.innerHTML = '';
        
        // Добавляем заголовок с подсказкой про Tab
        const title = document.createElement('div');
        title.innerHTML = 'T9: <span style="color: #666; font-size: 11px;">(Tab для выбора)</span>';
        title.style.cssText = `
            color: #333;
            font-weight: bold;
            margin-right: 8px;
            flex-shrink: 0;
            font-size: 13px;
        `;
        this.suggestionsContainer.appendChild(title);

        // Сохраняем контекст this для использования в обработчиках
        const self = this;

        // Добавляем кнопки предложений
        suggestions.forEach((word, index) => {
            const button = document.createElement('button');
            const freq = this.wordFreq[word] || 0;
            button.textContent = `${word}${freq > 0 ? ` (${freq})` : ''}`;
            button.style.cssText = `
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 16px;
                background: white;
                cursor: pointer;
                font-size: 13px;
                white-space: nowrap;
                flex-shrink: 0;
                transition: all 0.2s ease;
            `;
            
            button.onmouseover = () => {
                if (self.selectedIndex !== index) {
                    button.style.background = '#e3f2fd';
                    button.style.borderColor = '#007cba';
                }
            };
            
            button.onmouseout = () => {
                if (self.selectedIndex !== index) {
                    button.style.background = 'white';
                    button.style.borderColor = '#ddd';
                }
            };
            
            // ИСПРАВЛЕННЫЙ обработчик клика
            button.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                console.log('Button clicked, selecting word:', word);
                self.selectSuggestion(input, word);
            };
            
            this.suggestionsContainer.appendChild(button);
        });

        // Добавляем кнопку закрытия
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.title = 'Закрыть подсказки';
        closeBtn.style.cssText = `
            padding: 6px 10px;
            border: 1px solid #ddd;
            border-radius: 16px;
            background: #f8f9fa;
            cursor: pointer;
            font-size: 12px;
            margin-left: 8px;
            flex-shrink: 0;
        `;
        closeBtn.onclick = () => this.hideSuggestions();
        this.suggestionsContainer.appendChild(closeBtn);

        this.suggestionBar.style.display = 'block';
        this.currentInput = input;
        
        // Автоматически выбираем первое предложение
        this.selectedIndex = 0;
        this.highlightSuggestion(0);
    }

    highlightSuggestion(index) {
        const buttons = this.suggestionsContainer.querySelectorAll('button');
        // Исключаем кнопку закрытия из навигации
        const suggestionButtons = Array.from(buttons).slice(0, -1);
        
        suggestionButtons.forEach((button, i) => {
            if (i === index) {
                button.style.background = '#007cba';
                button.style.color = 'white';
                button.style.borderColor = '#007cba';
                button.style.transform = 'scale(1.05)';
            } else {
                button.style.background = 'white';
                button.style.color = 'black';
                button.style.borderColor = '#ddd';
                button.style.transform = 'scale(1)';
            }
        });
        
        this.selectedIndex = index;
        
        // Прокручиваем к выбранному элементу
        if (suggestionButtons[index]) {
            suggestionButtons[index].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    hideSuggestions() {
        if (this.suggestionBar) {
            this.suggestionBar.style.display = 'none';
            this.currentSuggestions = [];
            this.selectedIndex = -1;
        }
    }

    selectSuggestion(input, word) {
        if (!this.isEnabled) return;
        
        console.log('selectSuggestion called:', { 
            word,
            currentValue: input.value || input.textContent || input.innerText,
            inputType: input.tagName,
            isContentEditable: input.isContentEditable 
        });

        // Получаем текущее значение разными способами
        let currentValue = '';
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            currentValue = input.value || '';
        } else if (input.isContentEditable) {
            // Для contenteditable пробуем разные свойства
            currentValue = input.textContent || input.innerText || '';
            // Убираем HTML теги если они есть
            currentValue = currentValue.replace(/<[^>]*>/g, '');
        }
        
        // Разбиваем текст на слова
        const words = currentValue.trim().split(/\s+/);
        
        if (words.length > 0) {
            // Получаем текущий текст до последнего слова
            const lastWord = words[words.length - 1];
            const lastWordIndex = currentValue.lastIndexOf(lastWord);
            const textBeforeLastWord = currentValue.substring(0, lastWordIndex);
            
            // Создаем новое значение: текст до последнего слова + выбранное слово + пробел
            const newValue = textBeforeLastWord + word + ' ';
            
            console.log('Replacing text:', {
                lastWord,
                textBeforeLastWord,
                newValue
            });
            
            // Устанавливаем новое значение
            if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                input.value = newValue;
            } else if (input.isContentEditable) {
                // Для contenteditable элементов используем innerText
                input.innerText = newValue;
                // Также пробуем textContent для совместимости
                input.textContent = newValue;
            }
            
            // Устанавливаем курсор в конец
            this.setCursorToEnd(input);
        } else {
            // Если нет слов, просто вставляем слово
            if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                input.value = word + ' ';
            } else if (input.isContentEditable) {
                input.innerText = word + ' ';
                input.textContent = word + ' ';
            }
            this.setCursorToEnd(input);
        }
        
        this.learnWord(word);
        this.hideSuggestions();
        input.focus();
        
        // Триггерим события изменения
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);
        
        console.log('Word successfully selected:', word);
    }

    // Метод для установки курсора в конец
    setCursorToEnd(element) {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.focus();
            element.setSelectionRange(element.value.length, element.value.length);
        } else if (element.isContentEditable) {
            element.focus();
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(element);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    setupEventListeners() {
        // Глобальные обработчики событий
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('input', (e) => this.handleInput(e));
        document.addEventListener('click', (e) => this.handleClick(e));
        
        console.log('T9 event listeners setup');
    }

    handleKeyDown(event) {
        if (!this.isEnabled) return;
        
        // Обработка навигации по предложениям
        if (this.suggestionBar && this.suggestionBar.style.display !== 'none') {
            const suggestions = this.currentSuggestions;
            
            switch(event.key) {
                case 'Tab':
                    if (this.selectedIndex >= 0 && suggestions[this.selectedIndex]) {
                        event.preventDefault();
                        this.selectSuggestion(this.currentInput, suggestions[this.selectedIndex]);
                    }
                    break;
                    
                case 'ArrowRight':
                    event.preventDefault();
                    if (this.selectedIndex < suggestions.length - 1) {
                        this.highlightSuggestion(this.selectedIndex + 1);
                    }
                    break;
                    
                case 'ArrowLeft':
                    event.preventDefault();
                    if (this.selectedIndex > 0) {
                        this.highlightSuggestion(this.selectedIndex - 1);
                    }
                    break;
                    
                case 'Escape':
                    this.hideSuggestions();
                    break;
            }
        }
        
        // Обработка T9 ввода цифр
        if ((event.target.tagName === 'TEXTAREA' || 
             event.target.tagName === 'INPUT' || 
             event.target.isContentEditable) &&
            event.key >= '0' && event.key <= '9' && !event.ctrlKey && !event.metaKey) {
            
            this.processT9Input(event.target, event.key);
        }
    }

    handleInput(event) {
        if (!this.isEnabled) return;
        
        const target = event.target;
        
        // Игнорируем события от самой T9 системы
        if (target.id === 't9-suggestions-bar' || 
            target.closest('#t9-suggestions-bar') ||
            target.id === 't9-add-word-btn' ||
            target.id === 't9-dictionary-btn') {
            return;
        }
        
        // Обрабатываем только текстовые поля
        if (this.isInputElement(target)) {
            this.processTextInput(target);
        }
    }

    handleClick(event) {
        // Скрываем подсказки при клике вне T9 интерфейса
        if (this.suggestionBar && 
            this.suggestionBar.style.display !== 'none' &&
            !event.target.closest('#t9-suggestions-bar')) {
            this.hideSuggestions();
        }
    }

    processT9Input(input, digit) {
        if (!this.isEnabled) return;
        
        // Получаем текущее значение
        let currentValue = '';
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            currentValue = input.value || '';
        } else if (input.isContentEditable) {
            currentValue = input.textContent || input.innerText || '';
        }
        
        // Разбиваем на слова и берем последнее
        const words = currentValue.trim().split(/\s+/);
        const lastWord = words[words.length - 1] || '';
        
        // Если последнее слово состоит из цифр, добавляем новую цифру
        if (lastWord.match(/^[2-9]+$/)) {
            const newDigits = lastWord + digit;
            const suggestions = this.digitsToWords(newDigits);
            
            if (suggestions.length > 0) {
                this.showSuggestions(input, suggestions);
            }
        } else if (digit.match(/[2-9]/)) {
            // Начинаем новое T9 слово
            const suggestions = this.digitsToWords(digit);
            if (suggestions.length > 0) {
                this.showSuggestions(input, suggestions);
            }
        }
    }

    processTextInput(input) {
        if (!this.isEnabled) return;
        
        // Получаем текущее значение
        let currentValue = '';
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            currentValue = input.value || '';
        } else if (input.isContentEditable) {
            currentValue = input.textContent || input.innerText || '';
        }
        
        // Разбиваем на слова и берем последнее
        const words = currentValue.trim().split(/\s+/);
        const lastWord = words[words.length - 1] || '';
        
        // Если слово достаточно длинное, показываем автодополнение
        if (lastWord.length >= 2 && lastWord.match(/^[а-яa-z]+$/i)) {
            const suggestions = this.autocompleteWord(lastWord);
            if (suggestions.length > 0) {
                this.showSuggestions(input, suggestions);
                return;
            }
        }
        
        // Скрываем подсказки если не подходят условия
        this.hideSuggestions();
    }

    createControlButtons() {
        this.createAddWordButton();
        this.createDictionaryButton();
        this.setupButtonVisibility();
        this.updateButtonsVisibility(); // Устанавливаем начальную видимость
    }

    createDictionaryButton() {
        // Удаляем старую кнопку если есть
        const oldBtn = document.getElementById('t9-dictionary-btn');
        if (oldBtn) oldBtn.remove();
        
        this.dictBtn = document.createElement('button');
        this.dictBtn.id = 't9-dictionary-btn';
        this.dictBtn.innerHTML = '📚';
        this.dictBtn.title = 'Управление T9 словарем';
        this.dictBtn.style.cssText = `
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
            transition: all 0.2s ease;
        `;
        
        this.dictBtn.onmouseover = () => {
            this.dictBtn.style.transform = 'scale(1.1)';
            this.dictBtn.style.background = '#218838';
        };
        
        this.dictBtn.onmouseout = () => {
            this.dictBtn.style.transform = 'scale(1)';
            this.dictBtn.style.background = '#28a745';
        };
        
        this.dictBtn.onclick = () => {
            this.showDictionaryManager();
        };
        
        document.body.appendChild(this.dictBtn);
    }

    createAddWordButton() {
        // Удаляем старую кнопку если есть
        const oldBtn = document.getElementById('t9-add-word-btn');
        if (oldBtn) oldBtn.remove();
        
        this.addWordBtn = document.createElement('button');
        this.addWordBtn.id = 't9-add-word-btn';
        this.addWordBtn.innerHTML = '+';
        this.addWordBtn.title = 'Добавить слово в T9 словарь';
        this.addWordBtn.style.cssText = `
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
            transition: all 0.2s ease;
        `;
        
        this.addWordBtn.onmouseover = () => {
            this.addWordBtn.style.transform = 'scale(1.1)';
            this.addWordBtn.style.background = '#005a8c';
        };
        
        this.addWordBtn.onmouseout = () => {
            this.addWordBtn.style.transform = 'scale(1)';
            this.addWordBtn.style.background = '#007cba';
        };
        
        this.addWordBtn.onclick = () => {
            this.showAddWordDialog();
        };
        
        document.body.appendChild(this.addWordBtn);
    }

    setupButtonVisibility() {
        // Отслеживаем фокус на полях ввода
        document.addEventListener('focusin', (e) => {
            if (this.isInputElement(e.target) && this.isEnabled) {
                this.addWordBtn.style.display = 'block';
                this.dictBtn.style.display = 'block';
            }
        });
        
        document.addEventListener('focusout', (e) => {
            // Не скрываем сразу, чтобы можно было кликнуть на кнопку
            setTimeout(() => {
                const active = document.activeElement;
                if (active !== this.addWordBtn && 
                    active !== this.dictBtn &&
                    (!active || !active.closest || !active.closest('#t9-add-word-dialog')) &&
                    (!active || !active.closest || !active.closest('#t9-dictionary-manager'))) {
                    this.addWordBtn.style.display = 'none';
                    this.dictBtn.style.display = 'none';
                }
            }, 100);
        });
    }

    isInputElement(el) {
        if (!el) return false;
        const tag = el.tagName.toLowerCase();
        const type = el.type ? el.type.toLowerCase() : '';
        if (tag === 'textarea') return true;
        if (tag === 'input' && (type === 'text' || type === 'search' || type === 'email' || type === 'url' || type === 'password' || type === '')) return true;
        if (el.isContentEditable) return true;
        return false;
    }

    showAddWordDialog() {
        // Удаляем старый диалог если есть
        const oldDialog = document.getElementById('t9-add-word-dialog');
        if (oldDialog) oldDialog.remove();
        
        const dialog = document.createElement('div');
        dialog.id = 't9-add-word-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10002;
            font-family: Arial, sans-serif;
            min-width: 300px;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">Добавить слово в T9</h3>
            <input type="text" id="t9-new-word" placeholder="Введите слово..." 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; font-size: 14px;">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="t9-cancel-add" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Отмена</button>
                <button id="t9-confirm-add" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 6px; cursor: pointer;">Добавить</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Обработчики для диалога
        document.getElementById('t9-cancel-add').onclick = () => {
            dialog.remove();
        };
        
        document.getElementById('t9-confirm-add').onclick = () => {
            const wordInput = document.getElementById('t9-new-word');
            const word = wordInput.value.trim();
            
            if (word) {
                if (this.addWordManually(word)) {
                    dialog.remove();
                }
            } else {
                this.showNotification('Введите слово', 'error');
            }
        };
        
        // Закрытие по клику вне диалога
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        };
        
        // Фокус на поле ввода
        document.getElementById('t9-new-word').focus();
    }

    // ЭКСПОРТ слов в файл
    exportWords() {
        try {
            const wordsData = JSON.stringify(this.wordFreq, null, 2);
            const blob = new Blob([wordsData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `t9-dictionary-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Словарь экспортирован в файл');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Ошибка экспорта', 'error');
        }
    }

    // ИМПОРТ слов из файла
    importWords() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        
                        if (typeof importedData !== 'object') {
                            throw new Error('Invalid format');
                        }
                        
                        let importedCount = 0;
                        Object.entries(importedData).forEach(([word, freq]) => {
                            if (typeof word === 'string' && word.length >= 2 && word.length <= 50) {
                                const cleanWord = word.toLowerCase().trim();
                                const currentFreq = this.wordFreq[cleanWord] || 0;
                                this.wordFreq[cleanWord] = currentFreq + (Number(freq) || 1);
                                this.words.add(cleanWord);
                                importedCount++;
                            }
                        });
                        
                        this.saveLearnedData();
                        this.showNotification(`Импортировано ${importedCount} слов`);
                        
                        // Обновляем менеджер если он открыт
                        const manager = document.getElementById('t9-dictionary-manager');
                        if (manager) {
                            manager.remove();
                            this.showDictionaryManager();
                        }
                        
                    } catch (parseError) {
                        console.error('Import parse error:', parseError);
                        this.showNotification('Ошибка: неверный формат файла', 'error');
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Ошибка импорта', 'error');
        }
    }

    showDictionaryManager() {
        // Удаляем старый менеджер если есть
        const oldManager = document.getElementById('t9-dictionary-manager');
        if (oldManager) oldManager.remove();
        
        const manager = document.createElement('div');
        manager.id = 't9-dictionary-manager';
        manager.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10002;
            font-family: Arial, sans-serif;
            max-width: 500px;
            max-height: 400px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;
        
        // Получаем самые частые слова
        const frequentWords = Object.entries(this.wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50);
        
        manager.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">Управление словарем T9</h3>
            <div style="flex: 1; overflow-y: auto; margin-bottom: 15px; border: 1px solid #eee; border-radius: 6px; padding: 10px;">
                <h4 style="margin: 0 0 10px 0;">Часто используемые слова (${frequentWords.length})</h4>
                ${frequentWords.length > 0 ? 
                    frequentWords.map(([word, freq]) => 
                        `<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f0f0f0;">
                            <span>${word}</span>
                            <span style="color: #666;">${freq} раз</span>
                         </div>`
                    ).join('') :
                    '<p style="color: #666; text-align: center;">Нет изученных слов</p>'
                }
            </div>
            <div style="display: flex; gap: 10px; justify-content: space-between;">
                <button id="t9-import-words" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Импорт</button>
                <button id="t9-export-words" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Экспорт</button>
                <button id="t9-clear-words" style="padding: 8px 16px; background: #ff4444; color: white; border: none; border-radius: 6px; cursor: pointer;">Очистить</button>
                <button id="t9-close-manager" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 6px; cursor: pointer;">Закрыть</button>
            </div>
        `;
        
        document.body.appendChild(manager);
        
        // Обработчики для менеджера
        document.getElementById('t9-close-manager').onclick = () => {
            manager.remove();
        };
        
        document.getElementById('t9-export-words').onclick = () => {
            this.exportWords();
        };
        
        document.getElementById('t9-import-words').onclick = () => {
            this.importWords();
        };
        
        document.getElementById('t9-clear-words').onclick = () => {
            if (confirm('Очистить весь словарь? Это действие нельзя отменить.')) {
                this.wordFreq = {};
                this.words.clear();
                this.loadDictionary(); // Перезагружаем базовый словарь
                this.saveLearnedData();
                manager.remove();
                this.showNotification('Словарь очищен');
            }
        };
        
        // Закрытие по клику вне менеджера
        manager.onclick = (e) => {
            if (e.target === manager) {
                manager.remove();
            }
        };
    }

    showNotification(message, type = 'success') {
        // Удаляем старые уведомления
        const oldNotif = document.getElementById('t9-notification');
        if (oldNotif) oldNotif.remove();
        
        const notif = document.createElement('div');
        notif.id = 't9-notification';
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4444' : '#4CAF50'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10003;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: t9SlideIn 0.3s ease;
        `;
        
        document.body.appendChild(notif);
        
        // Автоматическое скрытие
        setTimeout(() => {
            if (notif.parentNode) {
                notif.style.animation = 't9SlideOut 0.3s ease';
                setTimeout(() => {
                    if (notif.parentNode) {
                        notif.remove();
                    }
                }, 300);
            }
        }, 3000);
    }
}

// Автоматическая инициализация при загрузке
if (typeof window !== 'undefined') {
    window.T9Predictor = T9Predictor;
    
    // Инициализация когда DOM готов
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.t9Predictor = new T9Predictor();
        });
    } else {
        window.t9Predictor = new T9Predictor();
    }
}
