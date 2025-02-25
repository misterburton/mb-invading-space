class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.running = false;
        this.gameOver = false;
        this.playerWon = false;
        
        // Resize canvas to fit the screen
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Initialize game state
        this.alienGrid = new AlienGrid(this.canvas.width, this.canvas.height);
        this.protagonist = new Protagonist(this.canvas.width, this.canvas.height);
        this.bullets = [];
        this.explosions = [];
        
        // Initialize controls
        this.controls = new Controls(this);
        
        // Initialize UI
        this.initializeUI();
    }
    
    resizeCanvas() {
        // Set canvas dimensions to window size
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Keep aspect ratio similar to classic Space Invaders
        const aspectRatio = 3/4; // width/height
        
        let gameWidth = width;
        let gameHeight = height;
        
        if (width / height > aspectRatio) {
            gameWidth = height * aspectRatio;
        } else {
            gameHeight = width / aspectRatio;
        }
        
        this.canvas.width = gameWidth;
        this.canvas.height = gameHeight;
    }
    
    initializeUI() {
        this.healthBar = document.getElementById('protagonist-health');
        this.gameMessage = document.getElementById('game-message');
        
        // Create health points
        for (let i = 0; i < 5; i++) {
            const healthPoint = document.createElement('div');
            healthPoint.className = 'health-point';
            this.healthBar.appendChild(healthPoint);
        }
    }
    
    start() {
        if (!this.running) {
            this.running = true;
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    gameLoop(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time in seconds
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Update and draw game
        this.update(deltaTime);
        this.draw();
        
        // Continue the loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(dt) {
        if (this.gameOver) return;
        
        // Update protagonist
        this.protagonist.update(dt);
        
        // Update alien grid
        this.alienGrid.update(dt);
        
        // Update bullets
        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].update(dt);
            
            // Check collisions
            if (this.bullets[i] instanceof AlienBullet) {
                // Check if alien bullet hits protagonist
                if (this.bullets[i].intersects(this.protagonist)) {
                    // Protagonist takes damage
                    const destroyed = this.protagonist.takeDamage();
                    
                    // Create explosion
                    this.explosions.push(new Explosion(
                        this.bullets[i].x + this.bullets[i].width / 2,
                        this.bullets[i].y + this.bullets[i].height / 2
                    ));
                    
                    // Remove the bullet
                    this.bullets.splice(i, 1);
                    i--;
                    
                    // Update UI
                    this.updateHealthBar();
                    
                    // Check if protagonist is destroyed
                    if (destroyed) {
                        this.endGame(true);
                    }
                    
                    continue;
                }
            } else if (this.bullets[i] instanceof ProtagonistBullet) {
                // Check if protagonist bullet hits any alien
                let hit = false;
                
                for (const alien of this.alienGrid.aliens) {
                    if (!alien.alive) continue;
                    
                    if (this.bullets[i].intersects(alien)) {
                        // Destroy the alien
                        alien.alive = false;
                        
                        // Create explosion
                        this.explosions.push(new Explosion(
                            alien.x + alien.width / 2,
                            alien.y + alien.height / 2
                        ));
                        
                        // Remove the bullet
                        this.bullets.splice(i, 1);
                        i--;
                        hit = true;
                        
                        // Adjust speeds based on remaining aliens
                        this.alienGrid.adjustSpeed();
                        this.protagonist.adjustSpeed(this.alienGrid.getAliveAliens().length);
                        
                        // Check if all aliens are destroyed
                        if (this.alienGrid.getAliveAliens().length === 0) {
                            this.endGame(false); // Player loses
                        }
                        
                        break;
                    }
                }
                
                if (hit) continue;
            }
            
            // Remove bullets that go off-screen
            if (this.bullets[i].y < -10 || this.bullets[i].y > this.canvas.height + 10) {
                this.bullets.splice(i, 1);
                i--;
            }
        }
        
        // Update explosions
        for (let i = 0; i < this.explosions.length; i++) {
            this.explosions[i].update(dt);
            
            if (!this.explosions[i].active) {
                this.explosions.splice(i, 1);
                i--;
            }
        }
    }
    
    draw() {
        // Clear the canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the alien grid
        this.alienGrid.draw(this.ctx);
        
        // Draw the protagonist
        this.protagonist.draw(this.ctx);
        
        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }
        
        // Draw explosions
        for (const explosion of this.explosions) {
            explosion.draw(this.ctx);
        }
        
        // Draw game over message if needed
        if (this.gameOver) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px "Press Start 2P", monospace';
            this.ctx.textAlign = 'center';
            
            const message = this.playerWon ? 'ALIENS WIN!' : 'EARTH DEFENDED!';
            this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
            
            this.ctx.font = '16px "Press Start 2P", monospace';
            this.ctx.fillText('Tap to play again', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }
    
    checkAlienTap(x, y) {
        if (this.gameOver) {
            // Restart the game
            this.restart();
            return;
        }
        
        // Check if the tap is on an alien
        for (const alien of this.alienGrid.aliens) {
            if (!alien.alive) continue;
            
            if (x >= alien.x && x <= alien.x + alien.width &&
                y >= alien.y && y <= alien.y + alien.height) {
                
                // Make the alien shoot
                const bullet = alien.shoot();
                if (bullet) {
                    this.bullets.push(bullet);
                }
                
                return;
            }
        }
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
    
    updateHealthBar() {
        const healthPoints = document.querySelectorAll('.health-point');
        
        for (let i = 0; i < healthPoints.length; i++) {
            if (i < this.protagonist.health) {
                healthPoints[i].style.backgroundColor = 'green';
            } else {
                healthPoints[i].style.backgroundColor = 'red';
            }
        }
    }
    
    endGame(playerWon) {
        this.gameOver = true;
        this.playerWon = playerWon;
        
        // Show game over message
        this.gameMessage.textContent = playerWon ? 'ALIENS WIN!' : 'EARTH DEFENDED!';
        this.gameMessage.style.display = 'block';
    }
    
    restart() {
        // Reset game state
        this.alienGrid = new AlienGrid(this.canvas.width, this.canvas.height);
        this.protagonist = new Protagonist(this.canvas.width, this.canvas.height);
        this.bullets = [];
        this.explosions = [];
        
        // Reset UI
        this.updateHealthBar();
        this.gameMessage.style.display = 'none';
        
        // Reset game flags
        this.gameOver = false;
        this.playerWon = false;
    }
}

// Wait for all assets to load before starting the game
function checkAssetsAndStart() {
    if (ASSETS.isAllLoaded()) {
        const game = new Game();
        game.start();
    } else {
        setTimeout(checkAssetsAndStart, 100);
    }
}

// Start checking if assets are loaded
window.addEventListener('load', checkAssetsAndStart); 