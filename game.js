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
        
        // Initialize game scale factors
        this.initializeGameScale();
        
        // Initialize visual effects
        this.initializeVisualEffects();
        
        this.level = 1;
        this.levelTransitioning = false;
        this.levelTransitionTimer = 0;
        this.levelTransitionDuration = 3; // seconds
        
        this.scorePopups = [];
    }
    
    resizeCanvas() {
        // Get device dimensions
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        // Clear any existing transformations
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Disable image smoothing after resetting the context
        this.ctx.imageSmoothingEnabled = false;
        
        // For React Native compatibility, leave a small margin at top/bottom
        const verticalMargin = 20; // 10px top and 10px bottom
        
        // Set container size
        const container = document.getElementById('game-container');
        container.style.width = '100%';
        container.style.height = '100%';
        
        // Set canvas display size to fill viewport (minus margins)
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight - verticalMargin}px`;
        
        // Set canvas internal size to match display size
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight - verticalMargin;
        
        console.log(`Canvas sized to: ${this.canvas.width}x${this.canvas.height}`);
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
        
        // Update and draw game
        this.update(deltaTime);
        this.draw();
        
        // Continue the loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(dt) {
        if (this.gameOver) return;
        
        // Update visual effects
        this.updateVisualEffects(dt);
        
        // Update protagonist
        this.protagonist.update(dt);
        
        // Update alien grid
        this.alienGrid.update(dt);
        
        // Check if all aliens are destroyed (victory condition)
        this.checkForVictory();
        
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
        
        // End screen shake effect
        this.endScreenShakeAndFlash(this.ctx);
    }
    
    drawScore() {
        this.ctx.fillStyle = '#FFFFFF';
        
        // Adjust font size based on screen width for narrow devices
        const isNarrowScreen = this.canvas.width < 400;
        console.log("Screen width:", this.canvas.width, "isNarrow:", isNarrowScreen);
        this.ctx.font = `${isNarrowScreen ? 10 : this.SCORE_FONT_SIZE}px 'Press Start 2P', monospace`;
        
        // Use percentage-based margins for better scaling
        const margin = Math.max(15, Math.floor(this.canvas.width * 0.08));
        
        // Improved spacing calculation
        const leftPos = margin;
        const centerPos = this.canvas.width / 2;
        const rightPos = this.canvas.width - margin;
        
        // Use abbreviated labels on narrow screens
        const score1Label = isNarrowScreen ? "S<1>" : "SCORE<1>";
        const hiScoreLabel = isNarrowScreen ? "HI" : "HI-SCORE";
        const score2Label = isNarrowScreen ? "S<2>" : "SCORE<2>";
        
        // Draw text with proper alignment
        this.ctx.textAlign = 'left';
        this.ctx.fillText(score1Label, leftPos, 20);
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText(hiScoreLabel, centerPos, 20);
        
        this.ctx.textAlign = 'right';
        this.ctx.fillText(score2Label, rightPos, 20);
        
        // Score values with better vertical spacing
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.score.toString().padStart(4, '0'), leftPos, 40);
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.hiScore.toString().padStart(4, '0'), centerPos, 40);
        
        this.ctx.textAlign = 'right';
        this.ctx.fillText("0000", rightPos, 40);
        
        // Draw current level
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.font = `${Math.max(10, Math.floor(10 * this.scaleX))}px 'Press Start 2P', monospace`;
        this.ctx.fillText(`LEVEL ${this.level}`, this.canvas.width / 2, this.canvas.height - 10);
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
            
            console.log("Alien fired!");
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
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `${Math.max(24, Math.floor(24 * this.scaleX))}px 'Press Start 2P', monospace`;
        this.ctx.textAlign = 'center';
        
        if (this.playerWon) {
            // Victory message
            this.ctx.fillText('EARTH SAVED!', centerX, centerY - 40);
            
            // Display final score
            this.ctx.font = `${Math.max(16, Math.floor(16 * this.scaleX))}px 'Press Start 2P', monospace`;
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, centerX, centerY + 10);
            
            // New high score message if applicable
            if (this.score >= this.hiScore) {
                this.ctx.fillStyle = '#FFFF00'; // Yellow for high score
                this.ctx.fillText('NEW HIGH SCORE!', centerX, centerY + 50);
            }
        } else {
            // Game over message
            this.ctx.fillText('GAME OVER', centerX, centerY);
        }
        
        // Common restart prompt
        this.ctx.font = `${Math.max(12, Math.floor(12 * this.scaleX))}px 'Press Start 2P', monospace`;
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.fillText('TAP TO PLAY AGAIN', centerX, centerY + 100);
    }
    
    updateBullets(dt) {
        // Add debug info for mobile
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && !this._mobileDebugDone) {
            console.log("MOBILE DEBUG: Running on iOS device");
            console.log("Window size:", window.innerWidth, "x", window.innerHeight);
            console.log("Canvas size:", this.canvas.width, "x", this.canvas.height);
            console.log("Canvas style:", this.canvas.style.width, this.canvas.style.height);
            console.log("Device pixel ratio:", window.devicePixelRatio);
            this._mobileDebugDone = true;
        }
        
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
                
                // Create enhanced explosion
                this.explosions.push(new Explosion(
                    alien.x + alien.width / 2,
                    alien.y + alien.height / 2,
                    alien.width,
                    'alien' // Specify explosion type
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
                
                // Add a score popup with color based on points
                let popupColor;
                if (points >= 30) popupColor = '#FF00FF'; // High value
                else if (points >= 20) popupColor = '#FFFF00'; // Medium value
                else popupColor = '#FFFFFF'; // Basic value
                
                this.scorePopups.push(new ScorePopup(
                    alien.x + alien.width / 2,
                    alien.y,
                    points,
                    popupColor
                ));
                
                hit = true;
                break;
            }
        }
        
        // Check if bullet hits mystery ship
        if (!hit && this.mysteryShip && this.mysteryShip.active && 
            this.bullets[bulletIndex].intersects(this.mysteryShip)) {
            
            // Award points for hitting mystery ship
            this.score += this.mysteryShip.points;
            
            // Create enhanced explosion
            this.explosions.push(new Explosion(
                this.mysteryShip.x + this.mysteryShip.width / 2,
                this.mysteryShip.y + this.mysteryShip.height / 2,
                this.mysteryShip.width * 1.5,
                'mysteryShip' // Specify explosion type
            ));
            
            // Remove the bullet
            this.bullets.splice(bulletIndex, 1);
            
            // Deactivate mystery ship
            this.mysteryShip.active = false;
            
            // Stop the mystery ship sound
            SOUND_SYSTEM.stopSound('mysteryShip');
            
            // Play explosion sound
            SOUND_SYSTEM.playSound('explosion');
            
            // Add more intense screen shake
            this.addScreenShake(8, 0.4); // Larger shake
            
            // Add more intense flash
            this.addScreenFlash('rgba(255, 100, 255, 0.4)', 0.4, 0.2);
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
    
    initializeGameScale() {
        // Calculate scaling factors based on canvas size
        this.scaleX = this.canvas.width / 540; // Scale relative to original 540px width
        this.scaleY = this.canvas.height / 720; // Scale relative to original 720px height
        
        console.log(`Game scaling: ${this.scaleX}x, ${this.scaleY}y`);
        
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
        this.SCORE_FONT_SIZE = Math.max(12, Math.floor(14 * this.scaleY));
        
        console.log("Game elements scaled to fit viewport");
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
        
        console.log("Protagonist fired bullet");
    }
    
    checkForVictory() {
        // Check if any aliens are still alive
        const aliensRemaining = this.alienGrid.aliens.some(alien => alien.alive);
        
        if (!aliensRemaining && !this.gameOver) {
            if (this.level < 3) { // Max 3 levels for now
                this.startNextLevel();
            } else {
                // Final victory after completing all levels
                this.playerWon = true;
                this.gameOver = true;
                this.createVictoryCelebration();
                
                // Save high score if current score is higher
                if (this.score > this.hiScore) {
                    this.hiScore = this.score;
                    localStorage.setItem('hiScore', this.hiScore);
                }
            }
        }
    }
    
    createVictoryCelebration() {
        // Create multiple explosions across the screen for celebration
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                // Random position in the play area
                const x = Math.random() * this.canvas.width;
                const y = 100 + Math.random() * (this.canvas.height - 200);
                
                // Create colorful explosion
                this.explosions.push(new Explosion(
                    x, y, 
                    30 + Math.random() * 30,
                    ['mysteryShip', 'alien', 'normal'][Math.floor(Math.random() * 3)]
                ));
                
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
            }, i * 200); // Stagger the explosions
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
        
        // Increase difficulty for the next level
        this.increaseDifficulty();
    }
    
    showLevelMessage() {
        // Add a centered level message
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `${Math.max(20, Math.floor(20 * this.scaleX))}px 'Press Start 2P', monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LEVEL ${this.level}`, centerX, centerY);
        
        // Add a screen flash for level transition
        this.addScreenFlash('rgba(0, 255, 0, 0.3)', 0.3, 0.5);
    }
    
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
                barrier.degradeForLevel(this.level);
            }
        }
    }
}

// Add this to the end of game.js
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

// Add a new class for score popups
class ScorePopup {
    constructor(x, y, score, color = '#FFFFFF') {
        this.x = x;
        this.y = y;
        this.score = score;
        this.color = color;
        this.alpha = 1;
        this.life = 1; // seconds
        this.elapsedTime = 0;
        this.active = true;
        this.velocity = -60; // pixels per second, upward movement
    }
    
    update(dt) {
        this.elapsedTime += dt;
        this.y += this.velocity * dt;
        
        // Fade out over time
        this.alpha = Math.max(0, 1 - this.elapsedTime / this.life);
        
        if (this.elapsedTime >= this.life) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+${this.score}`, this.x, this.y);
        ctx.restore();
    }
} 