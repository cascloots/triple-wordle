class TripleWordle {
    constructor() {
        this.targetWords = {
            wallet: 'WALLET',
            search: 'SEARCH',
            fold: 'FOLD'
        };
        
        this.wordLengths = {
            wallet: 6,
            search: 6,
            fold: 4
        };
        
        this.currentAttempt = 0;
        this.maxAttempts = 6;
        this.solvedWords = new Set();
        this.gameOver = false;
        
        this.guesses = {
            wallet: [],
            search: [],
            fold: []
        };
        
        this.keyboardState = new Map();
        
        this.initializeGrids();
        this.bindEvents();
        this.updateDisplay();
    }
    
    initializeGrids() {
        const grids = ['wallet-grid', 'search-grid', 'fold-grid'];
        const wordKeys = ['wallet', 'search', 'fold'];
        
        grids.forEach((gridId, index) => {
            const grid = document.getElementById(gridId);
            const wordKey = wordKeys[index];
            const cols = this.wordLengths[wordKey];
            
            // Create 6 rows for each grid
            for (let row = 0; row < this.maxAttempts; row++) {
                for (let col = 0; col < cols; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-cell';
                    cell.dataset.row = row;
                    cell.dataset.col = col;
                    cell.dataset.word = wordKey;
                    grid.appendChild(cell);
                }
            }
        });
    }
    
    bindEvents() {
        const guessInput = document.getElementById('guess-input');
        const submitButton = document.getElementById('submit-guess');
        const clearButton = document.getElementById('clear-input');
        const playAgainButton = document.getElementById('play-again');
        
        // Input events
        guessInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
        });
        
        guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitGuess();
            }
        });
        
        submitButton.addEventListener('click', () => this.submitGuess());
        clearButton.addEventListener('click', () => this.clearInput());
        playAgainButton.addEventListener('click', () => this.resetGame());
        
        // Virtual keyboard events
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', (e) => {
                const keyValue = e.target.dataset.key;
                this.handleKeyPress(keyValue);
            });
        });
        
        // Physical keyboard events
        document.addEventListener('keydown', (e) => {
            const key = e.key.toUpperCase();
            if (key === 'ENTER') {
                this.submitGuess();
            } else if (key === 'BACKSPACE') {
                this.handleKeyPress('BACKSPACE');
            } else if (/^[A-Z]$/.test(key)) {
                this.handleKeyPress(key);
            }
        });
    }
    
    handleKeyPress(key) {
        const guessInput = document.getElementById('guess-input');
        
        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACKSPACE') {
            guessInput.value = guessInput.value.slice(0, -1);
        } else if (/^[A-Z]$/.test(key) && guessInput.value.length < 6) {
            guessInput.value += key;
        }
    }
    
    submitGuess() {
        if (this.gameOver) return;
        
        const guessInput = document.getElementById('guess-input');
        const guess = guessInput.value.trim().toUpperCase();
        
        if (guess.length === 0) {
            this.showError('Please enter a guess!');
            return;
        }
        
        if (!/^[A-Z]+$/.test(guess)) {
            this.showError('Please use only letters!');
            return;
        }
        
        this.processGuess(guess);
        this.clearInput();
    }
    
    processGuess(guess) {
        // Process guess for each word
        const results = {};
        
        Object.keys(this.targetWords).forEach(wordKey => {
            const targetWord = this.targetWords[wordKey];
            const wordLength = this.wordLengths[wordKey];
            const wordGuess = guess.slice(0, wordLength);
            
            results[wordKey] = this.evaluateGuess(wordGuess, targetWord);
            this.guesses[wordKey].push({
                guess: wordGuess,
                result: results[wordKey]
            });
            
            this.updateGrid(wordKey, this.currentAttempt, wordGuess, results[wordKey]);
            
            // Check if word is solved
            if (results[wordKey].every(r => r === 'correct')) {
                this.solvedWords.add(wordKey);
                this.updateWordStatus(wordKey, '✅');
            }
        });
        
        // Update keyboard state
        this.updateKeyboardState(guess, results);
        
        this.currentAttempt++;
        this.updateDisplay();
        
        // Check game end conditions
        this.checkGameEnd();
    }
    
    evaluateGuess(guess, target) {
        const result = new Array(guess.length).fill('absent');
        const targetLetters = target.split('');
        const guessLetters = guess.split('');
        
        // First pass: mark correct positions
        for (let i = 0; i < guess.length; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                result[i] = 'correct';
                targetLetters[i] = null; // Mark as used
                guessLetters[i] = null; // Mark as used
            }
        }
        
        // Second pass: mark present letters
        for (let i = 0; i < guess.length; i++) {
            if (guessLetters[i] && targetLetters.includes(guessLetters[i])) {
                result[i] = 'present';
                const targetIndex = targetLetters.indexOf(guessLetters[i]);
                targetLetters[targetIndex] = null; // Mark as used
            }
        }
        
        return result;
    }
    
    updateGrid(wordKey, row, guess, result) {
        const grid = document.getElementById(`${wordKey}-grid`);
        
        for (let col = 0; col < guess.length; col++) {
            const cell = grid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.textContent = guess[col] || '';
                cell.className = `grid-cell ${result[col] || 'absent'}`;
            }
        }
    }
    
    updateKeyboardState(guess, results) {
        const allResults = Object.values(results).flat();
        const letters = guess.split('');
        
        letters.forEach((letter, index) => {
            const letterResults = [];
            
            // Collect all results for this letter across all words
            Object.keys(results).forEach(wordKey => {
                const wordLength = this.wordLengths[wordKey];
                if (index < wordLength) {
                    letterResults.push(results[wordKey][index]);
                }
            });
            
            // Determine the best state for this letter
            let bestState = 'absent';
            if (letterResults.includes('correct')) {
                bestState = 'correct';
            } else if (letterResults.includes('present')) {
                bestState = 'present';
            }
            
            // Update keyboard state (only improve, never downgrade)
            const currentState = this.keyboardState.get(letter);
            if (!currentState || this.getStateRank(bestState) > this.getStateRank(currentState)) {
                this.keyboardState.set(letter, bestState);
            }
        });
        
        this.updateKeyboardDisplay();
    }
    
    getStateRank(state) {
        const ranks = { 'absent': 1, 'present': 2, 'correct': 3 };
        return ranks[state] || 0;
    }
    
    updateKeyboardDisplay() {
        document.querySelectorAll('.key').forEach(key => {
            const letter = key.dataset.key;
            if (letter && letter.length === 1) {
                const state = this.keyboardState.get(letter);
                if (state) {
                    key.className = `key ${state}`;
                }
            }
        });
    }
    
    updateWordStatus(wordKey, status) {
        document.getElementById(`${wordKey}-status`).textContent = status;
    }
    
    updateDisplay() {
        document.getElementById('attempts').textContent = this.currentAttempt;
        document.getElementById('words-solved').textContent = this.solvedWords.size;
    }
    
    checkGameEnd() {
        if (this.solvedWords.size === 3) {
            // All words solved!
            this.gameOver = true;
            this.showModal('Congratulations! 🎉', 
                `You solved all three words in ${this.currentAttempt} attempt${this.currentAttempt === 1 ? '' : 's'}!\n\n` +
                `WALLET ✅\nSEARCH ✅\nFOLD ✅`);
        } else if (this.currentAttempt >= this.maxAttempts) {
            // Game over
            this.gameOver = true;
            const solvedList = Array.from(this.solvedWords).map(w => w.toUpperCase()).join(', ');
            const unsolvedWords = Object.keys(this.targetWords)
                .filter(key => !this.solvedWords.has(key))
                .map(key => this.targetWords[key]);
            
            this.showModal('Game Over! 😞', 
                `You solved ${this.solvedWords.size}/3 words.\n\n` +
                `Solved: ${solvedList || 'None'}\n` +
                `The words were: ${Object.values(this.targetWords).join(', ')}`);
        }
    }
    
    showModal(title, message) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('game-over-modal').style.display = 'block';
    }
    
    hideModal() {
        document.getElementById('game-over-modal').style.display = 'none';
    }
    
    showError(message) {
        // Simple error display - could be enhanced with a toast notification
        const guessInput = document.getElementById('guess-input');
        const originalPlaceholder = guessInput.placeholder;
        guessInput.placeholder = message;
        guessInput.style.borderColor = '#ef4444';
        
        setTimeout(() => {
            guessInput.placeholder = originalPlaceholder;
            guessInput.style.borderColor = '#d1d5db';
        }, 2000);
    }
    
    clearInput() {
        document.getElementById('guess-input').value = '';
    }
    
    resetGame() {
        this.currentAttempt = 0;
        this.solvedWords.clear();
        this.gameOver = false;
        this.guesses = { wallet: [], search: [], fold: [] };
        this.keyboardState.clear();
        
        // Clear all grids
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.textContent = '';
            cell.className = 'grid-cell';
        });
        
        // Reset word statuses
        Object.keys(this.targetWords).forEach(wordKey => {
            this.updateWordStatus(wordKey, '🔍');
        });
        
        // Reset keyboard
        document.querySelectorAll('.key').forEach(key => {
            if (key.dataset.key && key.dataset.key.length === 1) {
                key.className = 'key';
            }
        });
        
        this.updateDisplay();
        this.hideModal();
        this.clearInput();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TripleWordle();
});

// Add some fun animations and effects
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effects to game boards
    document.querySelectorAll('.game-board').forEach(board => {
        board.addEventListener('mouseenter', () => {
            board.style.transform = 'translateY(-5px)';
        });
        
        board.addEventListener('mouseleave', () => {
            board.style.transform = 'translateY(0)';
        });
    });
    
    // Add click feedback to input
    document.getElementById('guess-input').addEventListener('focus', (e) => {
        e.target.style.transform = 'scale(1.02)';
    });
    
    document.getElementById('guess-input').addEventListener('blur', (e) => {
        e.target.style.transform = 'scale(1)';
    });
}); 