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
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Mouse events for desktop
        canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        
        // Keyboard controls for testing
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = e.target.getBoundingClientRect();
        
        // Calculate the scale factor between canvas coordinates and CSS coordinates
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        
        // Convert touch position to canvas coordinates
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;
        
        console.log("Touch at:", x, y); // Debugging
        
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
    
    handleMouseDown(e) {
        const rect = e.target.getBoundingClientRect();
        
        // Calculate the scale factor between canvas coordinates and CSS coordinates
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        
        // Convert mouse position to canvas coordinates
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        console.log("Mouse click at:", x, y);
        
        // Check if the player clicked on an alien
        this.game.checkAlienTap(x, y);
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