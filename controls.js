class Controls {
    constructor(game) {
        this.game = game;
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const canvas = document.getElementById('game-canvas');
        
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Add keyboard controls for testing on desktop
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = e.target.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.touchStartX = x;
        this.touchStartY = y;
        
        // Check if the player tapped on an alien
        this.game.checkAlienTap(x, y);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
    }
    
    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') {
            this.game.protagonist.direction = -1;
        } else if (e.key === 'ArrowRight') {
            this.game.protagonist.direction = 1;
        } else if (e.key === ' ') {
            // Spacebar - just for testing
            this.game.shootRandomAlien();
        }
    }
    
    handleKeyUp(e) {
        if (e.key === 'ArrowLeft' && this.game.protagonist.direction === -1) {
            this.game.protagonist.direction = 0;
        } else if (e.key === 'ArrowRight' && this.game.protagonist.direction === 1) {
            this.game.protagonist.direction = 0;
        }
    }
} 