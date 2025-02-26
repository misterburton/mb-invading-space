window.DEBUG_HITBOXES = false; // Set to true via console to see hitboxes

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.running = false;
        this.gameOver = false;
        this.playerWon = false;
        this.score = 0;
        this.hiScore = localStorage.getItem('hiScore') || 0;
        
        // Resize canvas to fit the screen
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
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
        
        // Make game globally accessible for AI targeting
        window.game = this;
        
        // In the Game constructor, add:
        this.mysteryShip = null;
        this.mysteryShipTimer = 0;
        this.mysteryShipInterval = 15; // Seconds between mystery ships
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
        this.gameMessage = document.getElementById('game-message');
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
        
        // Check if protagonist collides with any alien
        this.protagonist.checkAlienCollision(this.alienGrid.aliens);
        
        // UPDATE ALL BULLETS & COLLISIONS
        this.updateBullets(dt);
        
        // MAKE SURE this method is called every update
        this.checkBarrierBulletCollisions();
        
        // Update explosions
        this.updateExplosions(dt);
        
        // Mystery ship
        this.updateMysteryShip(dt);
    }
    
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
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
        
        // Draw mystery ship if active
        if (this.mysteryShip && this.mysteryShip.active) {
            this.mysteryShip.draw(this.ctx);
        }
        
        // Draw game over message if needed
        if (this.gameOver) {
            this.drawGameOver();
        }
    }
    
    drawScore() {
        // Draw the score display similar to the original
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px "Press Start 2P", monospace';
        
        // SCORE text
        this.ctx.textAlign = 'left';
        this.ctx.fillText("SCORE<1>", 10, 20);
        
        // HI-SCORE text
        this.ctx.textAlign = 'center';
        this.ctx.fillText("HI-SCORE", this.canvas.width / 2, 20);
        
        // SCORE<2> text (for 2 player games in original)
        this.ctx.textAlign = 'right';
        this.ctx.fillText("SCORE<2>", this.canvas.width - 10, 20);
        
        // Format scores with leading zeros
        const scoreText = this.score.toString().padStart(4, '0');
        const hiScoreText = this.hiScore.toString().padStart(4, '0');
        
        // Draw actual scores
        this.ctx.textAlign = 'left';
        this.ctx.fillText(scoreText, 50, 40);
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText(hiScoreText, this.canvas.width / 2, 40);
        
        // Second player score (always 0000 in our game)
        this.ctx.textAlign = 'right';
        this.ctx.fillText("0000", this.canvas.width - 50, 40);
    }
    
    drawLives() {
        // Draw the remaining lives at the bottom left, above the ground line
        const livesX = 10;
        const livesY = this.groundLineY + 10; // Position below the ground line
        const liveSpacing = 40;
        
        // Draw lives count
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px "Press Start 2P", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.protagonist.lives}`, livesX, livesY + 12);
        
        // Draw remaining life icons (little cannons)
        for (let i = 0; i < this.protagonist.lives - 1; i++) {
            const x = livesX + 30 + (i * liveSpacing);
            this.ctx.drawImage(ASSETS.getImage('protagonist'), x, livesY, 30, 16);
        }
        
        // Draw CREDIT 00 at the bottom right
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px "Press Start 2P", monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`CREDIT 00`, this.canvas.width - 10, livesY + 12);
    }
    
    checkAlienTap(x, y) {
        if (this.gameOver) {
            // Restart the game
            this.restart();
            return;
        }
        
        console.log("Checking tap at:", x, y);
        
        // Check if the tap is on an alien
        for (const alien of this.alienGrid.aliens) {
            if (!alien.alive) continue;
            
            if (x >= alien.x && x <= alien.x + alien.width &&
                y >= alien.y && y <= alien.y + alien.height) {
                
                console.log("Alien tapped!");
                
                // Make the alien shoot without any restrictions
                const bullet = alien.shoot();
                if (bullet) {
                    this.bullets.push(bullet);
                    SOUND_SYSTEM.playSound('shoot');
                    
                    // Visual feedback for tap - add highlight
                    // this.explosions.push(new AlienTapHighlight(alien));
                }
                
                return;
            }
        }
        
        console.log("No alien hit by tap");
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
    }
    
    restart() {
        // Reset game state
        this.alienGrid = new AlienGrid(this.canvas.width, this.canvas.height);
        this.protagonist = new Protagonist(this.canvas.width, this.canvas.height);
        this.barriers = this.createBarriers();
        this.bullets = [];
        this.explosions = [];
        
        // Reset UI
        this.gameMessage.style.display = 'none';
        
        // Reset game flags
        this.gameOver = false;
        this.playerWon = false;
    }
    
    createBarriers() {
        const barriers = [];
        const barrierWidth = 60;
        const barrierHeight = 40;
        
        // Get the ground line position if already calculated
        const groundLineY = this.groundLineY || (this.canvas.height - 60);
        
        // Position barriers above the ground line
        const barrierY = groundLineY - 120;
        
        // Create 4 barriers evenly spaced
        const totalWidth = barrierWidth * 4 + 60 * 3; // 4 barriers with 60px spacing
        const startX = (this.canvas.width - totalWidth) / 2;
        
        for (let i = 0; i < 4; i++) {
            const x = startX + i * (barrierWidth + 60);
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
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Press Start 2P", monospace';
        this.ctx.textAlign = 'center';
        
        // Proper victory/defeat messages
        const message = this.playerWon ? 'EARTH DEFENDED!' : 'EARTH INVADED!';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px "Press Start 2P", monospace';
        this.ctx.fillText('Tap to play again', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
    
    updateBullets(dt) {
        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].update(dt);
            
            // Remove off-screen bullets
            if (this.bullets[i].y < 0 || this.bullets[i].y > this.canvas.height) {
                this.bullets.splice(i, 1);
                i--;
                continue;
            }
            
            // Check collisions with barriers
            let hitBarrier = false;
            for (const barrier of this.barriers) {
                if (barrier.checkBulletCollision(this.bullets[i])) {
                    this.bullets.splice(i, 1);
                    i--;
                    hitBarrier = true;
                    break;
                }
            }
            
            if (hitBarrier) continue;
            
            // Now rely on bullet type to check collisions
            if (this.bullets[i] instanceof AlienBullet) {
                this.checkAlienBulletCollisions(i);
            } else if (this.bullets[i] instanceof ProtagonistBullet) {
                this.checkProtagonistBulletCollisions(i);
            }
        }
    }
    
    // Handle alien bullet collisions
    checkAlienBulletCollisions(bulletIndex) {
        // Check if alien bullet hits protagonist
        if (this.bullets[bulletIndex].intersects(this.protagonist)) {
            // Create explosion
            this.explosions.push(new Explosion(
                this.bullets[bulletIndex].x,
                this.bullets[bulletIndex].y
            ));
            
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
    
    // Handle protagonist bullet collisions
    checkProtagonistBulletCollisions(bulletIndex) {
        let hit = false;
        
        // Check if bullet hits any alien
        for (const alien of this.alienGrid.aliens) {
            if (!alien.alive) continue;
            
            if (this.bullets[bulletIndex].intersects(alien)) {
                console.log("Hit alien at", alien.x, alien.y);
                
                // Destroy the alien
                alien.alive = false;
                
                // Update score based on alien type
                let points = 10; // Default for bottom rows
                if (alien.type === 2) points = 20; // Middle rows
                if (alien.type === 3) points = 30; // Top row
                
                this.score += points;
                
                // Create explosion at alien position
                this.explosions.push(new Explosion(
                    alien.x + alien.width / 2,
                    alien.y + alien.height / 2,
                    alien.width // Size based on alien width
                ));
                
                // Remove the bullet
                this.bullets.splice(bulletIndex, 1);
                
                // Play explosion sound
                SOUND_SYSTEM.playSound('explosion');
                
                // Make sure we call adjustSpeed to update movement speed
                this.alienGrid.adjustSpeed();
                this.protagonist.adjustSpeed(this.alienGrid.getAliveAliens().length);
                
                console.log("Aliens remaining:", this.alienGrid.getAliveAliens().length);
                console.log("New move interval:", this.alienGrid.moveInterval);
                
                // Check if all aliens are destroyed
                if (this.alienGrid.getAliveAliens().length === 0) {
                    this.endGame(false); // Player wins
                }
                
                hit = true;
                break;
            }
        }
        
        // Check if bullet hits mystery ship
        if (!hit && this.mysteryShip && this.mysteryShip.active && 
            this.bullets[bulletIndex].intersects(this.mysteryShip)) {
            
            // Award points for hitting mystery ship
            this.score += this.mysteryShip.points;
            
            // Create explosion
            this.explosions.push(new Explosion(
                this.mysteryShip.x + this.mysteryShip.width / 2,
                this.mysteryShip.y + this.mysteryShip.height / 2,
                this.mysteryShip.width
            ));
            
            // Remove the bullet
            this.bullets.splice(bulletIndex, 1);
            
            // Deactivate mystery ship
            this.mysteryShip.active = false;
            
            // Stop the mystery ship sound
            SOUND_SYSTEM.stopSound('mysteryShip');
            
            // Play explosion sound
            SOUND_SYSTEM.playSound('explosion');
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
                            this.explosions.push(new Explosion(
                                segment.x + segment.width / 2,
                                segment.y + segment.height / 2,
                                10
                            ));
                            
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

// Add a simple visual feedback class for taps
class TapFeedback {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.maxRadius = 20;
        this.alpha = 1;
        this.active = true;
    }
    
    update(dt) {
        this.radius += 30 * dt;
        this.alpha -= 2 * dt;
        
        if (this.alpha <= 0 || this.radius >= this.maxRadius) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Add this at the end of game.js, near the TapFeedback class
class AlienTapHighlight {
    constructor(alien) {
        this.alien = alien;
        this.duration = 0.2; // seconds
        this.timeLeft = this.duration;
        this.active = true;
    }
    
    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active || !this.alien.alive) return;
        
        // Draw a highlight around the alien
        const intensity = this.timeLeft / this.duration; // 1.0 to 0.0
        ctx.save();
        ctx.strokeStyle = `rgba(0, 255, 0, ${intensity})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.alien.x - 2, 
            this.alien.y - 2, 
            this.alien.width + 4, 
            this.alien.height + 4
        );
        ctx.restore();
    }
} 