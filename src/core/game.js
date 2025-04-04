import * as THREE from 'three';
import { ShaderManager } from '../shaders/ShaderManager.js';
import { TapFeedback, ScorePopup } from '../components/VisualEffects.js';
import { Explosion, AlienTapHighlight } from '../components/Explosion.js';
import { CirclePulseEffect } from '../components/VisualEffects.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

window.DEBUG_HITBOXES = false; // Set to true via console to see hitboxes

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.lastTime = 0;
        this.running = false;
        this.gameOver = false;
        this.playerWon = false;
        this.score = 0;
        this.hiScore = localStorage.getItem('hiScore') || 0;
        
        // Set CSS variables for safe area insets
        this.updateSafeAreaInsets();
        
        // Store bound event handlers for later removal
        this.boundResizeCanvas = this.resizeCanvas.bind(this);
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundTouchHandler = this.handleTouch.bind(this);
        
        // Resize canvas to fit the screen
        this.resizeCanvas();
        window.addEventListener('resize', this.boundResizeCanvas);
        
        // Initialize game state
        this.alienGrid = new AlienGrid(this.canvas.width, this.canvas.height);
        this.protagonist = new Protagonist(this.canvas.width, this.canvas.height);
        this.barriers = this.createBarriers();
        this.bullets = [];
        this.explosions = [];
        
        // Initialize controls
        this.controls = new Controls(this);
        
        // Initialize UI
        this.initializeUI();
        
        // Setup sound toggle listener
        this.setupSoundToggleListener();
        
        // Make game globally accessible for AI targeting
        window.game = this;
        
        // In the Game constructor, add:
        this.mysteryShip = null;
        this.mysteryShipTimer = 0;
        this.mysteryShipInterval = 15; // Seconds between mystery ships
        
        // Initialize game scale factors
        this.initializeGameScale();
        
        // Initialize visual effects
        this.initializeVisualEffects();
        
        this.level = 1;
        this.levelTransitioning = false;
        this.levelTransitionTimer = 0;
        this.levelTransitionDuration = 3; // seconds
        
        this.scorePopups = [];
        
        // Player mechanics
        this.lives = 3; // Player starts with 3 lives
        this.player2Score = 0; // Separate score for player controlling aliens
        this.player2Active = true; // Player is always controlling aliens for tapping
        this.currentPlayer = 2; // 2 = alien player by default
        
        this.shaderManager = new ShaderManager(this.canvas);
        
        // Initialize performance monitor
        this.performanceMonitor = new PerformanceMonitor(this.shaderManager);
        
        // Add these properties to the Game constructor
        this.gameOverTime = Date.now();
        this.gameOverDelay = 3; // 3 second delay before allowing restart
        
        // Add a property to store timeout IDs
        this.activeTimeouts = [];
    }
    
    // Add method to update safe area insets
    updateSafeAreaInsets() {
        // Get safe area insets from environment variables
        const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0px';
        const safeAreaRight = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0px';
        const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0px';
        const safeAreaLeft = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0px';
        
        // Set CSS variables
        document.documentElement.style.setProperty('--safe-area-inset-top', safeAreaTop);
        document.documentElement.style.setProperty('--safe-area-inset-right', safeAreaRight);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', safeAreaBottom);
        document.documentElement.style.setProperty('--safe-area-inset-left', safeAreaLeft);
        
        console.log(`Safe area insets: top=${safeAreaTop}, right=${safeAreaRight}, bottom=${safeAreaBottom}, left=${safeAreaLeft}`);
    }
    
    // Handle click events (extracted from setupSoundToggleListener)
    handleClick(event) {
        this.checkSoundToggleInteraction(event.clientX, event.clientY);
    }
    
    // Handle touch events (extracted from setupSoundToggleListener)
    handleTouch(event) {
        event.preventDefault(); // Prevent default behavior
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            this.checkSoundToggleInteraction(touch.clientX, touch.clientY);
        }
    }
    
    // Clean up all event listeners and resources
    cleanup() {
        console.log("Cleaning up game resources and event listeners");
        
        // Remove window event listeners
        window.removeEventListener('resize', this.boundResizeCanvas);
        
        // Remove canvas event listeners
        this.canvas.removeEventListener('click', this.boundClickHandler);
        this.canvas.removeEventListener('touchend', this.boundTouchHandler);
        
        // Clean up shader manager if it exists
        if (this.shaderManager) {
            try {
                // Call dispose if available
                if (typeof this.shaderManager.dispose === 'function') {
                    this.shaderManager.dispose();
                }
            } catch (error) {
                console.error("Error cleaning up shader manager:", error);
            }
            // Set to null to ensure garbage collection
            this.shaderManager = null;
        }
        
        // Clean up sound system
        if (window.SOUND_SYSTEM && typeof window.SOUND_SYSTEM.dispose === 'function') {
            // Don't fully dispose, just stop all sounds
            window.SOUND_SYSTEM.stopAllSounds();
        }
        
        // Clear any running timeouts
        this.activeTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.activeTimeouts = [];
        
        // Clear references to large objects
        this.explosions = [];
        this.bullets = [];
        this.scorePopups = [];
    }
    
    resizeCanvas() {
        // Get device dimensions
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        // Update safe area insets
        this.updateSafeAreaInsets();
        
        // Clear any existing transformations
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Disable image smoothing after resetting the context
        this.ctx.imageSmoothingEnabled = false;
        
        // Set container size
        const container = document.getElementById('game-container');
        container.style.width = '100%';
        container.style.height = '100%';
        
        // Set canvas display size to fill viewport
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`; // Removed the margin subtraction
        
        // Set canvas internal size to match display size
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight; // Removed the margin subtraction
        
        // console.log(`Canvas sized to: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    initializeUI() {
        this.gameMessage = document.getElementById('game-message');
    }
    
    start() {
        if (!this.running) {
            this.running = true;
            this.initializeVisualEffects(); // Initialize visual effects
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    gameLoop(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time in seconds
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Update performance monitor if it exists
        if (this.performanceMonitor) {
            this.performanceMonitor.update(deltaTime);
        }
        
        // Update and draw game
        this.update(deltaTime);
        this.draw();
        
        // Update shaders last
        if (this.shaderManager) {
            this.shaderManager.update();
        }
        
        // Continue the loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(dt) {
        if (this.gameOver) {
            // Only update visual effects and explosions when game is over
            this.updateVisualEffects(dt);
            
            // Update explosions but with reduced speed for a dramatic effect
            for (let i = 0; i < this.explosions.length; i++) {
                this.explosions[i].update(dt * 0.5);
                
                if (!this.explosions[i].active) {
                    this.explosions.splice(i, 1);
                    i--;
                }
            }
            
            // Update score popups
            for (let i = 0; i < this.scorePopups.length; i++) {
                this.scorePopups[i].update(dt);
                
                if (!this.scorePopups[i].active) {
                    this.scorePopups.splice(i, 1);
                    i--;
                }
            }
            
            return;
        }
        
        // Update visual effects
        this.updateVisualEffects(dt);
        
        // Update protagonist
        this.protagonist.update(dt);
        
        // Update alien grid
        this.alienGrid.update(dt);
        
        // Check if aliens have reached the ground line
        if (this.alienGrid.checkGroundCollision(this.groundLineY)) {
            this.gameOver = true;
            this.playerWon = false;
            this.gameOverTime = Date.now();
            console.log("Game over time set in update:", this.gameOverTime);
            return;
        }
        
        // Check if protagonist collides with any alien
        if (this.protagonist.checkAlienCollision(this.alienGrid.aliens)) {
            // Collision is already handled in the checkAlienCollision method
            // through the call to this.protagonistHit()
        }
        
        // Check if all aliens have been destroyed
        this.checkForVictory();
        
        // UPDATE ALL BULLETS & COLLISIONS
        this.updateBullets(dt);
        
        // MAKE SURE this method is called every update
        this.checkBarrierBulletCollisions();
        
        // Update explosions
        this.updateExplosions(dt);
        
        // Mystery ship
        this.updateMysteryShip(dt);
        
        // Update score popups
        for (let i = 0; i < this.scorePopups.length; i++) {
            this.scorePopups[i].update(dt);
            
            if (!this.scorePopups[i].active) {
                this.scorePopups.splice(i, 1);
                i--;
            }
        }
    }
    
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Begin screen shake effect
        this.applyScreenShakeAndFlash(this.ctx);
        
        // Draw score
        this.drawScore();
        
        // Draw barriers
        for (const barrier of this.barriers) {
            barrier.draw(this.ctx);
        }
        
        // Draw alien grid
        this.alienGrid.draw(this.ctx);
        
        // Draw the green ground line
        this.drawGround();
        
        // Position protagonist on ground line after drawing it
        if (this.groundLineY && this.protagonist) {
            this.protagonist.updatePositionFromGround(this.groundLineY);
        }
        
        // Draw protagonist
        this.protagonist.draw(this.ctx);
        
        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }
        
        // Draw explosions
        for (const explosion of this.explosions) {
            explosion.draw(this.ctx);
        }
        
        // Draw lives at the bottom left
        this.drawLives();
        
        // Draw sound toggle
        this.drawSoundToggle();
        
        // Draw mystery ship if active
        if (this.mysteryShip && this.mysteryShip.active) {
            this.mysteryShip.draw(this.ctx);
        }
        
        // Draw game over message if needed
        if (this.gameOver) {
            this.drawGameOver();
        }
        
        // Draw score popups
        for (const popup of this.scorePopups) {
            popup.draw(this.ctx);
        }
        
        // Draw FPS performance metrics if enabled
        // this.performanceMonitor.drawPerformanceMetrics(this.ctx, this.canvas.width, this.canvas.height);
        
        // End screen shake effect
        this.endScreenShakeAndFlash(this.ctx);
    }
    
    drawScore() {
        this.ctx.fillStyle = '#FFFFFF';
        
        // More granular responsive design based on screen width
        const screenWidth = this.canvas.width;
        let fontSize, useAbbreviatedLabels, horizontalSpacing;
        
        // Define breakpoints for different screen sizes
        if (screenWidth < 320) {
            // Extra small screens (very narrow mobile)
            fontSize = 8;
            useAbbreviatedLabels = true;
            horizontalSpacing = 0.05; // 5% margin
        } else if (screenWidth < 400) {
            // Small screens (mobile)
            fontSize = 10;
            useAbbreviatedLabels = true;
            horizontalSpacing = 0.06; // 6% margin
        } else if (screenWidth < 600) {
            // Medium screens
            fontSize = 12;
            useAbbreviatedLabels = false;
            horizontalSpacing = 0.07; // 7% margin
        } else {
            // Large screens
            fontSize = 14;
            useAbbreviatedLabels = false;
            horizontalSpacing = 0.08; // 8% margin
        }
        
        // Set font with calculated size
        this.ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        
        // Calculate margins based on screen width, accounting for safe area insets
        const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0');
        const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0');
        const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0');
        
        const margin = Math.max(10, Math.floor(screenWidth * horizontalSpacing));
        
        // Calculate positions with safe area insets
        const leftPos = margin + safeAreaLeft;
        const centerPos = screenWidth / 2;
        const rightPos = screenWidth - margin - safeAreaRight;
        
        // Top position with safe area inset
        const topPos = 20 + safeAreaTop;
        
        // Use abbreviated labels on narrow screens if needed
        const score1Label = useAbbreviatedLabels ? "S<1>" : "SCORE<1>";
        const hiScoreLabel = useAbbreviatedLabels ? "HI" : "HI-SCORE";
        const score2Label = useAbbreviatedLabels ? "S<2>" : "SCORE<2>";
        
        // Draw text with proper alignment
        this.ctx.textAlign = 'left';
        this.ctx.fillText(score1Label, leftPos, topPos);
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText(hiScoreLabel, centerPos, topPos);
        
        this.ctx.textAlign = 'right';
        this.ctx.fillText(score2Label, rightPos, topPos);
        
        // Score values with better vertical spacing
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.score.toString().padStart(4, '0'), leftPos, topPos + 20);
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.hiScore.toString().padStart(4, '0'), centerPos, topPos + 20);
        
        // Update player 2 score if active
        if (this.player2Active) {
            this.ctx.textAlign = 'right';
            this.ctx.fillText(this.player2Score.toString().padStart(4, '0'), rightPos, topPos + 20);
        } else {
            this.ctx.textAlign = 'right';
            this.ctx.fillText("0000", rightPos, topPos + 20);
        }
        
        // Draw current level
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.font = `${Math.min(14, Math.max(10, Math.floor(10 * this.scaleX)))}px 'Press Start 2P', monospace`;
        this.ctx.fillText(`LEVEL ${this.level}`, this.canvas.width / 2, this.canvas.height - 10);
    }
    
    drawLives() {
        // Calculate remaining lives (excluding the active cannon)
        let remainingLives;
        if (this.lives > 0) { remainingLives = this.lives - 1 }
        else { remainingLives = 0 }
        const spacing = 25;
        const heightSize = 16;  // Height of the cannon icon
        const widthSize = 32;   // Width of the cannon icon - wider to match actual cannon
        
        // Account for safe area insets
        const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0');
        const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0');
        
        const startX = 10 + safeAreaLeft;
        const y = this.canvas.height - 30 - safeAreaBottom;
        
        // Draw the text showing number of REMAINING lives
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '16px "Press Start 2P", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${remainingLives}`, startX, y);
        
        // Draw protagonist icons with correct aspect ratio
        // Only draw remaining lives icons since the active cannon is already on screen
        for (let i = 0; i < remainingLives; i++) {
            const x = startX + 40 + i * spacing;
            this.ctx.drawImage(ASSETS.getImage('protagonist'), 
                              x, y - heightSize, 
                              widthSize, heightSize);
        }
    }
    
    // Helper method to get sound toggle position and size
    getSoundTogglePosition() {
        const padding = 15;
        const size = 24; // Slightly larger for better visibility
        
        // Account for safe area insets
        const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0');
        const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0');
        
        const x = this.canvas.width - size - padding - safeAreaRight;
        const y = this.canvas.height - 36 - safeAreaBottom; // Position aligned with the '2' in bottom left
        
        return { x, y, size, padding };
    }
    
    drawSoundToggle() {
        // Get position from the helper method
        const { x, y, size } = this.getSoundTogglePosition();
        
        // Draw the speaker icon (black and white pixelated style)
        this.ctx.fillStyle = '#FFFFFF';
        
        // Speaker base (left rectangle)
        this.ctx.fillRect(
            x + size * 0.2, 
            y + size * 0.35 - size/2, 
            size * 0.2, 
            size * 0.3
        );
        
        // Speaker cone (triangle)
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.4, y + size * 0.35 - size/2);
        this.ctx.lineTo(x + size * 0.4, y + size * 0.65 - size/2);
        this.ctx.lineTo(x + size * 0.7, y + size * 0.8 - size/2);
        this.ctx.lineTo(x + size * 0.7, y + size * 0.2 - size/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Sound waves (only when not muted)
        if (!SOUND_SYSTEM.muted) {
            // First sound wave (closest to speaker)
            this.ctx.beginPath();
            this.ctx.moveTo(x + size * 0.75, y + size * 0.4 - size/2);
            this.ctx.lineTo(x + size * 0.85, y + size * 0.3 - size/2);
            this.ctx.lineTo(x + size * 0.85, y + size * 0.7 - size/2);
            this.ctx.lineTo(x + size * 0.75, y + size * 0.6 - size/2);
            this.ctx.fill();
            
            // Second sound wave (further from speaker)
            this.ctx.beginPath();
            this.ctx.moveTo(x + size * 0.9, y + size * 0.3 - size/2);
            this.ctx.lineTo(x + size * 1.0, y + size * 0.2 - size/2);
            this.ctx.lineTo(x + size * 1.0, y + size * 0.8 - size/2);
            this.ctx.lineTo(x + size * 0.9, y + size * 0.7 - size/2);
            this.ctx.fill();
        }
    }
    
    setupSoundToggleListener() {
        // Add click listener for sound toggle (for desktop)
        this.canvas.addEventListener('click', this.boundClickHandler);
        
        // Add touch listener for sound toggle (for mobile)
        this.canvas.addEventListener('touchend', this.boundTouchHandler);
    }
    
    // Helper method to check if interaction is within sound toggle area
    checkSoundToggleInteraction(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Calculate the scale factor between canvas coordinates and CSS coordinates
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // Convert position to canvas coordinates
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        
        // Get sound toggle position from the helper method
        const { x: toggleX, y: toggleY, size } = this.getSoundTogglePosition();
        
        // Check if interaction is within the sound toggle area
        if (x >= toggleX && x <= toggleX + size && 
            y >= toggleY - size/2 && y <= toggleY + size/2) {
            console.log("Sound toggle tapped/clicked");
            SOUND_SYSTEM.toggleMute();
        }
    }
    
    checkAlienTap(x, y) {
        if (this.gameOver) {
            const timeSinceGameOver = (Date.now() - this.gameOverTime) / 1000;
            console.log("Time since game over:", timeSinceGameOver, "seconds");
            console.log("Delay required:", this.gameOverDelay, "seconds");
            
            // Only allow restart after delay has passed
            if (timeSinceGameOver >= this.gameOverDelay) {
                console.log("Delay passed, restarting game");
                this.restart();
                return true;
            }
            console.log("Delay not passed, ignoring tap");
            return true; // Still consume the tap event even if we don't restart
        }
        
        // Find tapped alien
        let tappedAlien = null;
        
        for (const alien of this.alienGrid.aliens) {
            if (!alien.alive) continue;
            
            if (x >= alien.x && x <= alien.x + alien.width &&
                y >= alien.y && y <= alien.y + alien.height) {
                tappedAlien = alien;
                break;
            }
        }
        
        if (tappedAlien) {
            // Create a more visible tap highlight
            this.createTapHighlight(tappedAlien);
            
            // Create bullet from the alien
            const bullet = tappedAlien.shoot();
            this.bullets.push(bullet);
            
            // Play sound
            SOUND_SYSTEM.playSound('shoot');
            
            // Add small screen shake for feedback
            this.addScreenShake(2, 0.1);
            
            // console.log("Alien fired!");
            return true;
        }
        
        return false;
    }
    
    createTapHighlight(alien) {
        // Remove the rectangular highlight and only use the circular pulse
        const pulseEffect = new CirclePulseEffect(
            alien.x + alien.width/2, 
            alien.y + alien.height/2,
            Math.max(alien.width, alien.height)
        );
        this.explosions.push(pulseEffect);
        
        // No need to add the AlienTapHighlight as we want more subtle feedback
    }
    
    shootRandomAlien() {
        // Get all alive aliens
        const aliveAliens = this.alienGrid.getAliveAliens();
        
        if (aliveAliens.length === 0) return;
        
        // Select a random alien
        const randomIndex = Math.floor(Math.random() * aliveAliens.length);
        const alien = aliveAliens[randomIndex];
        
        // Make it shoot
        const bullet = alien.shoot();
        if (bullet) {
            this.bullets.push(bullet);
        }
    }
    
    updateLives() {
        // We'll just redraw since we're handling lives differently now
    }
    
    endGame(playerWon) {
        this.gameOver = true;
        this.playerWon = playerWon;
        
        // Update high score
        if (this.score > this.hiScore) {
            this.hiScore = this.score;
            localStorage.setItem('hiScore', this.hiScore);
        }
        
        // Store game over time for restart delay
        this.gameOverTime = Date.now();
        console.log("Game over time set to:", this.gameOverTime);
    }
    
    restart() {
        // First, clean up existing resources and event listeners
        this.cleanup();
        
        // Check who won the last game
        if (this.playerWon) {
            // Earth won (all aliens destroyed), reset to level 1
            this.level = 1;
        } else {
            // Aliens won (all cannons destroyed), increment level
            this.level++;
        }
        
        // Reset game state
        this.gameOver = false;
        this.playerWon = false;
        this.score = 0;
        this.player2Score = 0;
        this.lives = 3; // Reset lives
        
        // Clear game objects
        this.bullets = [];
        this.explosions = [];
        this.scorePopups = [];
        this.mysteryShip = null;
        
        // Reset grid and protagonist
        this.alienGrid = new AlienGrid(this.canvas.width, this.canvas.height);
        this.protagonist = new Protagonist(this.canvas.width, this.canvas.height);
        
        // Create fresh barriers with NO degradation on restart
        this.barriers = this.createBarriers();
        
        // Increase alien difficulty based on level
        this.increaseDifficultyWithoutBarrierDegradation();
        
        // Reset timers
        this.mysteryShipTimer = 0;
        
        // Reset visual effects
        this.currentShake = { x: 0, y: 0 };
        this.screenShake = { magnitude: 0, duration: 0, timeLeft: 0 };
        this.screenFlash = { color: null, opacity: 0, duration: 0, timeLeft: 0 };
        
        // Reinitialize shader manager with safety
        try {
            this.shaderManager = new ShaderManager(this.canvas);
            // Reinitialize performance monitor after shader manager
            this.performanceMonitor = new PerformanceMonitor(this.shaderManager);
        } catch (error) {
            console.error("Error initializing shader manager:", error);
            // Continue without shaders if there's an error
        }
        
        // Re-setup event listeners
        this.setupSoundToggleListener();
        
        // Reset active timeouts array
        this.activeTimeouts = [];
        
        // Restart the game loop
        this.running = false; // Reset running state
        this.start(); // Restart the game loop
    }
    
    createBarriers() {
        const barriers = [];
        
        // Adjust barrier width based on screen width
        const scaleFactor = this.canvas.width / 440; // Reference width
        const barrierWidth = Math.min(60, Math.floor(60 * scaleFactor));
        const barrierHeight = 40;
        
        // Get the ground line position if already calculated
        const groundLineY = this.groundLineY || (this.canvas.height - 60);
        
        // Position barriers above the ground line
        const barrierY = groundLineY - 120;
        
        // Calculate spacing to ensure barriers fit within viewport
        const totalBarriers = 4;
        const availableWidth = this.canvas.width - 40; // 20px margin on each side
        const maxTotalWidth = availableWidth * 0.9; // Use 90% of available width
        
        // Calculate spacing based on available width
        const totalBarriersWidth = barrierWidth * totalBarriers;
        const spacing = Math.floor((maxTotalWidth - totalBarriersWidth) / (totalBarriers - 1));
        
        // Calculate starting X to center the barriers
        const startX = (this.canvas.width - (totalBarriersWidth + spacing * (totalBarriers - 1))) / 2;
        
        for (let i = 0; i < totalBarriers; i++) {
            const x = startX + i * (barrierWidth + spacing);
            barriers.push(new Barrier(x, barrierY, barrierWidth, barrierHeight));
        }
        
        return barriers;
    }
    
    updateScoreForHit() {
        // Different aliens worth different points
        this.score += 50;
    }
    
    updateMysteryShip(dt) {
        // Update existing mystery ship if active
        if (this.mysteryShip && this.mysteryShip.active) {
            this.mysteryShip.update(dt);
            
            // If it's no longer active after update, stop the sound
            if (!this.mysteryShip.active) {
                SOUND_SYSTEM.stopSound('mysteryShip');
            }
        } else {
            // Try to spawn a new mystery ship
            this.mysteryShipTimer += dt;
            
            if (this.mysteryShipTimer >= this.mysteryShipInterval) {
                this.mysteryShipTimer = 0;
                
                // Random chance to actually spawn the ship
                if (Math.random() < 0.7) {
                    this.mysteryShip = new MysteryShip(this.canvas.width);
                    
                    // Start the mystery ship sound
                    SOUND_SYSTEM.playSound('mysteryShip');
                }
            }
        }
    }
    
    drawGround() {
        // Draw the green horizontal line at the bottom
        const groundY = this.canvas.height - 60; // Position for the ground line
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(this.canvas.width, groundY);
        this.ctx.stroke();
        
        // Make this line accessible to the rest of the game
        this.groundLineY = groundY;
    }
    
    drawGameOver() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Add a full-screen overlay with color based on game outcome
        const overlayColor = this.playerWon ? 'rgba(0, 100, 0, 0.7)' : 'rgba(100, 0, 0, 0.7)';
        this.ctx.fillStyle = overlayColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Account for safe area insets for vertical positioning
        const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0');
        const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0');
        
        // Adjust centerY if needed to account for notch/home indicator
        const adjustedCenterY = centerY + (safeAreaTop - safeAreaBottom) / 2;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `${Math.max(24, Math.floor(24 * this.scaleX))}px 'Press Start 2P', monospace`;
        this.ctx.textAlign = 'center';
        
        if (this.playerWon) {
            // Victory message when player defeats aliens (as the cannon)
            this.ctx.fillText('EARTH SAVED!', centerX, adjustedCenterY - 40);
            
            // Display final score
            this.ctx.font = `${Math.max(16, Math.floor(16 * this.scaleX))}px 'Press Start 2P', monospace`;
            this.ctx.fillText(`EARTH SCORE: ${this.score}`, centerX, adjustedCenterY + 10);
            
            // New high score message if applicable
            if (this.score > this.hiScore) {
                this.ctx.fillStyle = '#FFFF00'; // Yellow for high score
                this.ctx.fillText('NEW HIGH SCORE!', centerX, adjustedCenterY + 50);
                
                // Save the high score
                this.hiScore = this.score;
                localStorage.setItem('hiScore', this.hiScore);
            }
        } else {
            // Game over message when aliens win (player is controlling the aliens)
            this.ctx.fillText('EARTH INVADED!', centerX, adjustedCenterY - 40);
            
            // Always show the ALIEN SCORE when earth is invaded
            this.ctx.font = `${Math.max(16, Math.floor(16 * this.scaleX))}px 'Press Start 2P', monospace`;
            this.ctx.fillText(`ALIEN SCORE: ${this.player2Score}`, centerX, adjustedCenterY + 10);
            
            // Also show Earth's score
            this.ctx.font = `${Math.max(12, Math.floor(12 * this.scaleX))}px 'Press Start 2P', monospace`;
            this.ctx.fillText(`EARTH SCORE: ${this.score}`, centerX, adjustedCenterY + 40);
            
            // Check if alien score is a new high score
            if (this.player2Score > this.hiScore) {
                this.ctx.fillStyle = '#FFFF00'; // Yellow for high score
                this.ctx.fillText('NEW HIGH SCORE!', centerX, adjustedCenterY + 70);
                
                // Save the high score
                this.hiScore = this.player2Score;
                localStorage.setItem('hiScore', this.hiScore);
            }
        }
        
        // Always show the tap to play again message
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.font = `${Math.max(14, Math.floor(14 * this.scaleX))}px 'Press Start 2P', monospace`;

        // Only show "TAP TO PLAY AGAIN" after the delay has passed
        const timeSinceGameOver = (Date.now() - this.gameOverTime) / 1000;
        if (timeSinceGameOver >= this.gameOverDelay) {
            this.ctx.fillText('TAP TO PLAY AGAIN', centerX, adjustedCenterY + 100);
        } else {
            // Show countdown instead
            const remainingTime = Math.ceil(this.gameOverDelay - timeSinceGameOver);
            this.ctx.fillText(`WAIT ${remainingTime}...`, centerX, adjustedCenterY + 100);
        }
    }
    
    updateBullets(dt) {
        // Update all bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt);
            
            // Remove off-screen bullets
            if (bullet.y < 0 || bullet.y > this.canvas.height) {
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Check for barrier collisions
            let hitBarrier = false;
            for (const barrier of this.barriers) {
                if (barrier.checkBulletCollision(bullet)) {
                    this.bullets.splice(i, 1);
                    hitBarrier = true;
                    break;
                }
            }
            if (hitBarrier) continue;
            
            // Check for protagonist bullet collisions with aliens
            if (bullet instanceof ProtagonistBullet) {
                let hit = false;
                for (const alien of this.alienGrid.aliens) {
                    if (alien.alive && alien.checkBulletCollision(bullet)) {
                        // Score is handled inside the checkBulletCollision method
                        this.score += this.getAlienPoints(alien);
                        hit = true;
                        break;
                    }
                }
                
                // Check if bullet hit the mystery ship
                if (!hit && this.mysteryShip && this.mysteryShip.active && 
                    bullet.intersects(this.mysteryShip)) {
                    
                    // Award points for hitting mystery ship
                    this.score += this.mysteryShip.points;
                    
                    // Create enhanced explosion
                    this.createExplosion(
                        this.mysteryShip.x + this.mysteryShip.width / 2,
                        this.mysteryShip.y + this.mysteryShip.height / 2,
                        this.mysteryShip.width * 1.5,
                        'mysteryShip',
                        true // Play explosion sound
                    );
                    
                    // Remove the bullet
                    this.bullets.splice(i, 1);
                    
                    // Deactivate mystery ship
                    this.mysteryShip.active = false;
                }
                
                if (hit) {
                    this.bullets.splice(i, 1);
                    continue;
                }
            } 
            // Check for alien bullet collisions with protagonist
            else if (bullet instanceof AlienBullet) {
                if (this.protagonist.checkBulletCollision(bullet)) {
                    // Remove the bullet
                    this.bullets.splice(i, 1);
                    
                    // Award points to player 2 if active
                    if (this.player2Active) {
                        this.player2Score += 50;
                        
                        // Add score popup
                        this.scorePopups.push(new ScorePopup(
                            this.protagonist.x + this.protagonist.width/2,
                            this.protagonist.y,
                            50,
                            '#FF00FF' // Purple for player 2 scoring
                        ));
                    }
                    
                    // Handle protagonist hit
                    this.protagonistHit();
                    continue;
                }
            }
        }
    }
    
    // Handle alien bullet collisions
    checkAlienBulletCollisions(bulletIndex) {
        // Check if alien bullet hits protagonist
        if (this.bullets[bulletIndex].intersects(this.protagonist)) {
            // Create explosion
            this.createExplosion(
                this.bullets[bulletIndex].x,
                this.bullets[bulletIndex].y
            );
            
            // Remove the bullet
            this.bullets.splice(bulletIndex, 1);
            
            // Protagonist takes damage
            const destroyed = this.protagonist.takeDamage();
            
            // Update UI
            this.updateLives();
            
            // Check if protagonist is destroyed
            if (destroyed) {
                this.endGame(true);
            }
            
            // Play hit sound
            SOUND_SYSTEM.playSound('hit');
        }
    }
    
    // Update explosions
    updateExplosions(dt) {
        for (let i = 0; i < this.explosions.length; i++) {
            this.explosions[i].update(dt);
            
            if (!this.explosions[i].active) {
                this.explosions.splice(i, 1);
                i--;
            }
        }
    }
    
    checkBarrierBulletCollisions() {
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];
            
            for (const barrier of this.barriers) {
                let hit = false;
                
                for (let j = 0; j < barrier.segments.length; j++) {
                    const segment = barrier.segments[j];
                    
                    if (bullet.intersects(segment)) {
                        // If it's an alien bullet, apply special damage
                        if (bullet instanceof AlienBullet) {
                            bullet.damageBarrier(barrier, segment);
                        } else {
                            // Regular bullet just damages the hit segment
                            segment.health -= 1;
                            
                            if (segment.health <= 0) {
                                barrier.segments.splice(j, 1);
                            }
                            
                            // Small spark effect for regular bullets
                            this.createExplosion(
                                segment.x + segment.width / 2,
                                segment.y + segment.height / 2,
                                10
                            );
                            
                            SOUND_SYSTEM.playSound('hit');
                        }
                        
                        // Remove the bullet
                        this.bullets.splice(i, 1);
                        i--;
                        hit = true;
                        break;
                    }
                }
                
                if (hit) break;
            }
        }
    }
    
    initializeGameScale() {
        // Calculate scaling factors based on canvas size
        this.scaleX = this.canvas.width / 540; // Scale relative to original 540px width
        this.scaleY = this.canvas.height / 720; // Scale relative to original 720px height
        
        // console.log(`Game scaling: ${this.scaleX}x, ${this.scaleY}y`);
        
        // Adjust game constants based on screen size
        this.ALIEN_ROWS = 5;
        this.ALIEN_COLS = 11;
        
        // Smaller grid on narrow screens
        if (this.canvas.width < 500) {
            this.ALIEN_COLS = 8; // Reduce from 11 to 8 columns
        }
        
        // Even smaller grid on very narrow screens
        if (this.canvas.width < 350) {
            this.ALIEN_COLS = 6; // Further reduce to 6 columns
            this.ALIEN_ROWS = 4; // Reduce from 5 to 4 rows
        }
        
        // Scale alien size proportionally to screen width
        this.ALIEN_WIDTH = Math.floor(30 * this.scaleX);
        this.ALIEN_HEIGHT = Math.floor(30 * this.scaleY);
        this.ALIEN_SPACING_X = Math.floor(15 * this.scaleX);
        this.ALIEN_SPACING_Y = Math.floor(15 * this.scaleY);
        
        // Scale protagonist
        this.PROTAGONIST_WIDTH = Math.floor(40 * this.scaleX);
        this.PROTAGONIST_HEIGHT = Math.floor(25 * this.scaleY);
        this.PROTAGONIST_Y = this.canvas.height - this.PROTAGONIST_HEIGHT - Math.floor(20 * this.scaleY);
        
        // Scale barriers
        this.BARRIER_COUNT = 4;
        this.BARRIER_WIDTH = Math.floor(70 * this.scaleX);
        this.BARRIER_HEIGHT = Math.floor(50 * this.scaleY);
        this.BARRIER_Y = this.PROTAGONIST_Y - this.BARRIER_HEIGHT - Math.floor(20 * this.scaleY);
        
        // UI adjustments
        this.SCORE_FONT_SIZE = Math.min(18, Math.max(12, Math.floor(14 * this.scaleY)));
        
        // console.log("Game elements scaled to fit viewport");
    }
    
    initializeVisualEffects() {
        // Screen shake properties
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeElapsedTime = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        
        // Screen flash properties
        this.flashColor = null;
        this.flashAlpha = 0;
        this.flashDuration = 0;
        this.flashElapsedTime = 0;
    }
    
    addScreenShake(intensity, duration) {
        // Use the larger intensity
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
        this.shakeElapsedTime = 0;
    }
    
    addScreenFlash(color, alpha, duration) {
        this.flashColor = color;
        this.flashAlpha = alpha;
        this.flashDuration = duration;
        this.flashElapsedTime = 0;
    }
    
    updateVisualEffects(dt) {
        // Update screen shake
        if (this.shakeDuration > 0) {
            this.shakeElapsedTime += dt;
            
            if (this.shakeElapsedTime < this.shakeDuration) {
                // Calculate decreasing intensity over time
                const currentIntensity = this.shakeIntensity * (1 - this.shakeElapsedTime / this.shakeDuration);
                
                // Random offset that changes every frame
                this.shakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
                this.shakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
            } else {
                // Reset shake
                this.shakeDuration = 0;
                this.shakeIntensity = 0;
                this.shakeOffsetX = 0;
                this.shakeOffsetY = 0;
            }
        }
        
        // Update screen flash
        if (this.flashDuration > 0) {
            this.flashElapsedTime += dt;
            
            if (this.flashElapsedTime >= this.flashDuration) {
                // Reset flash
                this.flashDuration = 0;
                this.flashAlpha = 0;
            }
        }
    }
    
    applyScreenShakeAndFlash(ctx) {
        // Apply screen shake
        if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
            ctx.save();
            ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
        }
        
        // Apply screen flash as overlay after drawing all game elements
        if (this.flashDuration > 0 && this.flashColor) {
            const currentAlpha = this.flashAlpha * (1 - this.flashElapsedTime / this.flashDuration);
            
            if (currentAlpha > 0) {
                ctx.save();
                ctx.fillStyle = this.flashColor;
                ctx.globalAlpha = currentAlpha;
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.restore();
            }
        }
    }
    
    endScreenShakeAndFlash(ctx) {
        // Restore context if shaking
        if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
            ctx.restore();
        }
    }
    
    // Complete the protagonistShoot method
    protagonistShoot() {
        // Create bullet directly
        const bullet = new ProtagonistBullet(
            this.protagonist.x + this.protagonist.width / 2,
            this.protagonist.y
        );
        
        // Add to bullets array
        this.bullets.push(bullet);
        
        // Play sound
        SOUND_SYSTEM.playSound('shoot');
        
        // Add small screen shake
        this.addScreenShake(2, 0.1);
        
        // Add small white flash
        this.addScreenFlash('rgba(255, 255, 255, 0.2)', 0.2, 0.1);
        
        // console.log("Protagonist fired bullet");
    }
    
    checkForVictory() {
        // Count how many aliens are still alive
        const aliensAlive = this.alienGrid.aliens.filter(alien => alien.alive).length;
        
        // Log the count for debugging
        // console.log(`Aliens still alive: ${aliensAlive}`);
        
        // If no aliens remain and game isn't over yet, player wins
        if (aliensAlive === 0 && !this.gameOver) {
            console.log("Victory condition triggered! All aliens defeated.");
            
            // Player has won
            this.gameOver = true;
            this.playerWon = true;
            this.gameOverTime = Date.now();
            console.log("Game over time set in checkForVictory:", this.gameOverTime);
            
            // Create victory effects
            this.addScreenFlash('rgba(255, 255, 255, 0.3)', 0.7, 0.3);
            
            // Play victory sound
            SOUND_SYSTEM.playSound('victory');
            
            // Create victory celebration effects
            this.createVictoryCelebration();
            
            // Save high score if applicable
            if (this.score > this.hiScore) {
                this.hiScore = this.score;
                localStorage.setItem('hiScore', this.hiScore);
            }
        }
    }
    
    createVictoryCelebration() {
        // Create multiple explosions around the edges of the screen for celebration
        // This avoids placing explosions in the center where they would interfere with text
        for (let i = 0; i < 15; i++) {
            const timeoutId = setTimeout(() => {
                // Position explosions around the edges of the play area
                let x, y;
                
                // Determine position based on iteration
                if (i % 4 === 0) {
                    // Left edge
                    x = this.canvas.width * 0.1;
                    y = this.canvas.height * (0.2 + 0.6 * Math.random());
                } else if (i % 4 === 1) {
                    // Right edge
                    x = this.canvas.width * 0.9;
                    y = this.canvas.height * (0.2 + 0.6 * Math.random());
                } else if (i % 4 === 2) {
                    // Top edge
                    x = this.canvas.width * (0.2 + 0.6 * Math.random());
                    y = this.canvas.height * 0.15;
                } else {
                    // Bottom edge (above ground line)
                    x = this.canvas.width * (0.2 + 0.6 * Math.random());
                    y = this.groundLineY - 30;
                }
                
                // Create colorful explosion
                this.createExplosion(
                    x, y, 
                    30 + Math.random() * 30,
                    ['mysteryShip', 'alien', 'normal'][Math.floor(Math.random() * 3)],
                    true // Play explosion sound
                );
                
                // Add screen shake
                this.addScreenShake(3, 0.2);
                
                // Add screen flash with random color
                const flashColors = [
                    'rgba(255, 255, 0, 0.2)',  // Yellow
                    'rgba(0, 255, 0, 0.2)',    // Green
                    'rgba(0, 255, 255, 0.2)',  // Cyan
                    'rgba(255, 0, 255, 0.2)'   // Magenta
                ];
                this.addScreenFlash(
                    flashColors[Math.floor(Math.random() * flashColors.length)],
                    0.3, 0.2
                );
                
                // Remove this timeout ID from the active list once executed
                const index = this.activeTimeouts.indexOf(timeoutId);
                if (index !== -1) {
                    this.activeTimeouts.splice(index, 1);
                }
            }, i * 200); // Stagger the explosions
            
            // Store the timeout ID for potential cleanup
            this.activeTimeouts.push(timeoutId);
        }
    }
    
    startNextLevel() {
        this.level++;
        this.levelTransitioning = true;
        this.levelTransitionTimer = 0;
        
        // Clear all bullets
        this.bullets = [];
        
        // Show level message
        this.showLevelMessage();
        
        // Only apply barrier degradation during natural level progression
        this.increaseDifficulty();
    }
    
    showLevelMessage() {
        // Add a centered level message
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `${Math.min(20, Math.max(20, Math.floor(20 * this.scaleX)))}px 'Press Start 2P', monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LEVEL ${this.level}`, centerX, centerY);
        
        // Add a screen flash for level transition
        this.addScreenFlash('rgba(0, 255, 0, 0.3)', 0.3, 0.5);
    }
    
    increaseDifficultyWithoutBarrierDegradation() {
        // Reinitialize alien grid with increased difficulty
        this.alienGrid = new AlienGrid(this.canvas.width, this.canvas.height);
        
        // Increase alien speed based on level
        this.alienGrid.speed = 20 + (this.level - 1) * 5;
        
        // Increase firing rate
        this.alienGrid.shootProbability = Math.min(0.02 + (this.level - 1) * 0.005, 0.05);
    }
    
    // Original method - only called during natural level progression, not restart
    increaseDifficulty() {
        // Reinitialize alien grid with increased difficulty
        this.alienGrid = new AlienGrid(this.canvas.width, this.canvas.height);
        
        // Increase alien speed based on level
        this.alienGrid.speed = 20 + (this.level - 1) * 5;
        
        // Increase firing rate
        this.alienGrid.shootProbability = Math.min(0.02 + (this.level - 1) * 0.005, 0.05);
        
        // Reset barriers with less health in higher levels
        this.barriers = this.createBarriers();
        if (this.level > 2) {
            // Damage barriers a bit for higher levels
            for (const barrier of this.barriers) {
                // Safety check to make sure degradeForLevel exists
                if (barrier && typeof barrier.degradeForLevel === 'function') {
                    barrier.degradeForLevel(this.level);
                } else {
                    console.warn('degradeForLevel method not found on barrier - skipping barrier degradation');
                }
            }
        }
    }
    
    // Update protagonist hit method
    protagonistHit() {
        if (this.gameOver) return;
        
        // Play explosion sound
        SOUND_SYSTEM.playSound('explosion');
        
        // Create explosion at protagonist position
        this.createExplosion(
            this.protagonist.x + this.protagonist.width/2,
            this.protagonist.y + this.protagonist.height/2,
            40,
            'normal',
            false // Sound is already played above
        );
        
        // Add major screen shake
        this.addScreenShake(10, 0.5);
        
        // Add red flash
        this.addScreenFlash('rgba(255, 0, 0, 0.5)', 0.5, 0.5);
        
        // Award substantial points to aliens when they hit the cannon
        this.player2Score += 150; // Increased from 50 to 150
        
        // Add score popup for alien points
        this.scorePopups.push(new ScorePopup(
            this.protagonist.x + this.protagonist.width/2,
            this.protagonist.y,
            150, // Show the points gained
            '#FF00FF' // Purple for alien scoring
        ));
        
        // Reduce lives
        this.lives--;
        
        if (this.lives <= 0) {
            // Game over when all lives are depleted
            this.gameOver = true;
            this.playerWon = false;
            this.gameOverTime = Date.now();
            console.log("Game over time set in protagonistHit:", this.gameOverTime);
            
            // Add bonus for defeating all lives
            this.player2Score += 500; // Big bonus for defeating all cannon lives
            
            // Add a big score popup
            this.scorePopups.push(new ScorePopup(
                this.canvas.width / 2,
                this.canvas.height / 2 - 30,
                500,
                '#FF00FF' // Purple for alien scoring
            ));
        } else {
            // Reset protagonist position without ending the game
            setTimeout(() => {
                this.protagonist = new Protagonist(this.canvas.width, this.canvas.height);
            }, 1000);
        }
    }
    
    getAlienPoints(alien) {
        // Award points based on alien type
        let points = 10; // Default for bottom rows
        if (alien.type === 2) points = 20; // Middle rows
        if (alien.type === 3) points = 30; // Top row
        
        // Add a score popup
        this.scorePopups.push(new ScorePopup(
            alien.x + alien.width / 2,
            alien.y,
            points,
            points >= 30 ? '#FF00FF' : (points >= 20 ? '#FFFF00' : '#FFFFFF')
        ));
        
        return points;
    }
    
    // Add this helper method to check mystery ship collisions
    checkBulletMysteryShipCollision(bullet) {
        if (!this.mysteryShip || !this.mysteryShip.active) return false;
        
        if (bullet.x < this.mysteryShip.x + this.mysteryShip.width &&
            bullet.x + bullet.width > this.mysteryShip.x &&
            bullet.y < this.mysteryShip.y + this.mysteryShip.height &&
            bullet.y + bullet.height > this.mysteryShip.y) {
            
            // Award points for hitting mystery ship
            this.score += this.mysteryShip.points;
            
            // Create enhanced explosion
            this.createExplosion(
                this.mysteryShip.x + this.mysteryShip.width / 2,
                this.mysteryShip.y + this.mysteryShip.height / 2,
                this.mysteryShip.width * 1.5,
                'mysteryShip',
                true // Play explosion sound
            );
            
            // Deactivate mystery ship
            this.mysteryShip.active = false;
            
            // Add more intense screen shake
            this.addScreenShake(8, 0.4);
            
            return true;
        }
        
        return false;
    }
    
    // Helper method to create explosions with consistent parameters
    createExplosion(x, y, size = 20, type = 'normal', playSound = false) {
        // Add the explosion to the explosions array
        this.explosions.push(new Explosion(x, y, size, type));
        
        // Optionally play explosion sound
        if (playSound) {
            SOUND_SYSTEM.playSound('explosion');
        }
        
        return this.explosions[this.explosions.length - 1]; // Return the created explosion
    }
}

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, waiting for assets...");
    
    // Force start after 2 seconds regardless of asset loading state
    setTimeout(() => {
        console.log("Starting game after timeout");
        if (!window.gameStarted) {
            window.gameStarted = true;
            const game = new Game();
            game.start();
        }
    }, 2000);
    
    // Also try normal asset loading
    checkAssetsAndStart();
});

function checkAssetsAndStart() {
    // Start immediately if we're on iOS
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.gameStarted) {
        console.log("iOS detected, starting game immediately");
        window.gameStarted = true;
        const game = new Game();
        game.start();
        return;
    }
    
    // Normal asset check path
    if (ASSETS.isAllLoaded() && !window.gameStarted) {
        console.log("All assets loaded successfully");
        window.gameStarted = true;
        const game = new Game();
        game.start();
    } else if (!window.gameStarted) {
        setTimeout(checkAssetsAndStart, 100);
    }
}