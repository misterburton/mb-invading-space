class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    update(dt) {
        // Base update method
    }

    draw(ctx) {
        // Base draw method
    }

    intersects(other) {
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }
}

class Alien extends Entity {
    constructor(x, y, type, rowIndex, colIndex) {
        // Use the actual size of our pixel aliens (scaled up)
        const width = 16;
        const height = 8;
        
        super(x, y, width*2, height*2);
        this.type = type;
        this.rowIndex = rowIndex;
        this.colIndex = colIndex;
        this.alive = true;
        this.canShoot = true;
        this.frame = 0; // Current animation frame
    }
    
    update(dt) {
        // Movement will be handled by the AlienGrid
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        // Get the right image based on type and current frame
        let imageName = `alien${this.type}`;
        
        // Scale up and draw the alien at the correct position
        ctx.save();
        ctx.imageSmoothingEnabled = false; // Keep the pixelated look
        ctx.drawImage(
            ASSETS.getImage(imageName), 
            this.x, this.y, 
            this.width, this.height
        );
        
        // Debug: Draw hitbox rectangle around the alien
        if (window.DEBUG_HITBOXES) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
        
        ctx.restore();
    }
    
    shoot() {
        if (!this.canShoot || !this.alive) return null;
        
        this.canShoot = false;
        
        // Reset shooting ability after a delay (1.5 seconds)
        setTimeout(() => {
            this.canShoot = true;
        }, 1500);
        
        // Create a bullet from the bottom center of the alien
        return new AlienBullet(this.x + this.width / 2, this.y + this.height);
    }
}

class AlienGrid {
    constructor(gameWidth, gameHeight) {
        this.rows = 5;
        this.cols = 11;
        this.aliens = [];
        this.direction = 1; // 1 for right, -1 for left
        this.speed = 20; // Initial speed (pixels per second)
        this.moveTimer = 0;
        this.moveInterval = 1; // Initial move interval
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.moveCount = 0;
        this.horizontalStep = 25; // Distance to move horizontally in each step
        this.verticalStep = 35; // How far down to move when hitting an edge
        this.edgeMargin = 5; // Reduced margin to allow more movement
        this.shouldMoveDown = false; // New flag to control downward movement
        this.groundLineY = gameHeight - 60; // Position of the ground line
        
        this.initialize(gameWidth, gameHeight);
    }
    
    initialize(gameWidth, gameHeight) {
        const alienWidth = 24;
        const alienHeight = 16;
        const horizontalPadding = 15;
        const verticalPadding = 16;
        
        // Move aliens down further from the score area
        const startY = 80; // Start below the score display
        
        // Calculate starting X to center the grid
        const gridWidth = (alienWidth + horizontalPadding) * this.cols - horizontalPadding;
        const startX = (gameWidth - gridWidth) / 2;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                let type = 1;
                if (row === 0) type = 3;
                else if (row === 1 || row === 2) type = 2;
                
                const x = startX + col * (alienWidth + horizontalPadding);
                const y = startY + row * (alienHeight + verticalPadding);
                
                this.aliens.push(new Alien(x, y, type, row, col));
            }
        }
    }
    
    update(dt) {
        this.moveTimer += dt;
        
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            
            // Play alien movement sound
            SOUND_SYSTEM.playAlienMove(this.moveCount);
            this.moveCount++;
            
            // Move aliens first
            for (const alien of this.aliens) {
                if (!alien.alive) continue;
                
                if (this.shouldMoveDown) {
                    // When moving down, ONLY move down
                    alien.y += this.verticalStep;
                } else {
                    // When not moving horizontally
                    alien.x += this.horizontalStep * this.direction;
                }
            }
            
            // AFTER moving, check if we need to change direction for next time
            let leftmostX = this.gameWidth;
            let rightmostX = 0;
            let lowestY = 0;
            
            for (const alien of this.aliens) {
                if (!alien.alive) continue;
                leftmostX = Math.min(leftmostX, alien.x);
                rightmostX = Math.max(rightmostX, alien.x + alien.width);
                lowestY = Math.max(lowestY, alien.y + alien.height);
            }
            
            // If we moved down this frame, reset the flag
            if (this.shouldMoveDown) {
                this.shouldMoveDown = false;
            } 
            // Otherwise check if we need to change direction and move down next time
            else if ((this.direction === 1 && rightmostX > this.gameWidth - this.edgeMargin) ||
                     (this.direction === -1 && leftmostX < this.edgeMargin)) {
                this.direction *= -1;
                this.shouldMoveDown = true;
            }
            
            // Check if aliens have reached the ground line
            if (lowestY > this.groundLineY) {
                if (window.game) {
                    // Call endGame with playerWon=false (aliens win)
                    window.game.endGame(false);
                }
            }
            
            // Check for collisions with barriers
            this.checkBarrierCollisions();
        }
    }
    
    checkBarrierCollisions() {
        // Check if any alien is touching a barrier
        if (!window.game || !window.game.barriers) return;
        
        for (const alien of this.aliens) {
            if (!alien.alive) continue;
            
            for (const barrier of window.game.barriers) {
                // Check if alien overlaps with barrier
                for (let i = 0; i < barrier.segments.length; i++) {
                    const segment = barrier.segments[i];
                    
                    if (alien.intersects(segment)) {
                        console.log("Alien collided with barrier"); // Debug log
                        
                        // Create LARGER explosion at the collision point
                        window.game.explosions.push(new Explosion(
                            alien.x + alien.width / 2,
                            alien.y + alien.height / 2,
                            40 // Much larger explosion for alien collision
                        ));
                        
                        // Play explosion sound
                        SOUND_SYSTEM.playSound('explosion');
                        
                        // Create MASSIVE explosive damage to surrounding segments
                        const explosionRadius = 30; // Much larger explosion radius
                        
                        // Remove ALL segments within explosion radius
                        for (let j = 0; j < barrier.segments.length; j++) {
                            const otherSegment = barrier.segments[j];
                            
                            // Calculate distance between segments
                            const dx = alien.x + alien.width/2 - (otherSegment.x + otherSegment.width/2);
                            const dy = alien.y + alien.height/2 - (otherSegment.y + otherSegment.height/2);
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance <= explosionRadius) {
                                // Extreme damage - completely destroy segments near center
                                const damageAmount = distance < 10 ? 10 : Math.ceil(6 * (1 - distance / explosionRadius));
                                otherSegment.health -= damageAmount;
                                
                                // Remove segment if destroyed
                                if (otherSegment.health <= 0) {
                                    barrier.segments.splice(j, 1);
                                    j--; // Adjust index after removal
                                }
                            }
                        }
                        
                        // Destroy the alien
                        alien.alive = false;
                        
                        // Adjust speed after alien is destroyed
                        this.adjustSpeed();
                        
                        break; // Move to next alien after this collision
                    }
                }
            }
        }
    }
    
    draw(ctx) {
        for (const alien of this.aliens) {
            alien.draw(ctx);
        }
    }
    
    getAliveAliens() {
        return this.aliens.filter(alien => alien.alive);
    }

    adjustSpeed() {
        const aliveCount = this.getAliveAliens().length;
        const totalCount = this.rows * this.cols;
        
        // More aggressive speed increase
        const percentRemaining = aliveCount / totalCount;
        
        // Adjust move interval to make aliens faster as they're destroyed
        // From 1 second down to 0.15 seconds between moves
        this.moveInterval = Math.max(0.15, 1 - (1 - percentRemaining) * 0.85);
        
        // Also increase step size slightly for last few aliens
        this.horizontalStep = 10 + (1 - percentRemaining) * 5;
    }
    
    setGroundLineY(y) {
        this.groundLineY = y;
    }
}

class Protagonist extends Entity {
    constructor(gameWidth, gameHeight) {
        const width = 30;
        const height = 16;
        
        // We'll set the y position in the update method
        // since we don't know the ground line position yet
        const x = gameWidth / 2 - width / 2;
        const y = gameHeight - 80; // Approximate for now
        
        super(x, y, width, height);
        
        this.gameWidth = gameWidth;
        this.lives = 3;
        this.speed = 150; // pixels per second
        this.direction = Math.random() > 0.5 ? 1 : -1; // Random initial direction

        // Timers
        this.shootTimer = 0;
        this.shootInterval = 1.5; // seconds between shots
        this.movementChangeTimer = 0;
        this.movementChangeInterval = 2;

        // Evasion
        this.evasionMode = false;
        this.evasionDirection = 0;
        this.evasionTimer = 0;

        // Movement target for random repositioning
        this.targetX = null;
    }
    
    updatePositionFromGround(groundLineY) {
        if (groundLineY) {
            // Position protagonist to sit on top of the ground line
            this.y = groundLineY - this.height - 2;
        }
    }
    
    update(dt) {
        // Update position from ground line if available
        if (window.game && window.game.groundLineY) {
            this.updatePositionFromGround(window.game.groundLineY);
        }
        
        this.updateMovement(dt);
        this.updateShooting(dt);
    }
    
    updateMovement(dt) {
        this.movementChangeTimer += dt;
        
        // Check for incoming bullets and possibly evade
        if (!this.evasionMode) {
            this.checkForIncomingBullets();
        } else {
            this.evasionTimer += dt;
            if (this.evasionTimer > 0.5) {
                this.evasionMode = false;
                this.evasionTimer = 0;
            }
            // Move in evasion direction
            this.x += this.evasionDirection * this.speed * dt;
        }
        
        // If not in evasion mode, move in current direction or toward target
        if (!this.evasionMode) {
            if (this.targetX !== null) {
                // Move toward target
                const dx = this.targetX - (this.x + this.width / 2);
                if (Math.abs(dx) < 5) {
                    // Target reached
                    this.targetX = null;
                    this.direction = Math.random() > 0.5 ? 1 : -1;
                } else {
                    this.direction = dx > 0 ? 1 : -1;
                }
            }
            
            // Randomly change direction or target position
            if (this.movementChangeTimer >= this.movementChangeInterval) {
                this.movementChangeTimer = 0;
                // 10% chance to pick a new target
                if (Math.random() < 0.1) {
                    this.targetX = Math.random() * (this.gameWidth - this.width);
                } else {
                    // Otherwise just reverse direction
                    this.direction = Math.random() > 0.5 ? 1 : -1;
                }
            }
            
            // Move in current direction
            this.x += this.direction * this.speed * dt;
        }
        
        // Screen boundary checks
        if (this.x < 0) {
            this.x = 0;
            this.direction = 1;
            this.targetX = null;
        } else if (this.x + this.width > this.gameWidth) {
            this.x = this.gameWidth - this.width;
            this.direction = -1;
            this.targetX = null;
        }
    }
    
    checkForIncomingBullets() {
        // Access the global bullet array from the game
        const bullets = window.game ? window.game.bullets : [];
        
        for (const bullet of bullets) {
            if (bullet instanceof AlienBullet) {
                // Is bullet heading toward protagonist?
                if (bullet.y > this.y - 80 && bullet.y < this.y) {
                    // Check horizontal alignment
                    if (bullet.x > this.x - 20 && bullet.x < this.x + this.width + 20) {
                        // Initiate evasion
                        this.evasionMode = true;
                        this.evasionTimer = 0;
                        
                        // Decide evasion direction
                        if (bullet.x < this.x + this.width / 2) {
                            this.evasionDirection = 1;  // move right
                        } else {
                            this.evasionDirection = -1; // move left
                        }
                        break;
                    }
                }
            }
        }
    }
    
    updateShooting(dt) {
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
            this.shoot();
        }
    }
    
    shoot() {
        this.shootTimer = 0;
        ASSETS.playSound('shoot');
        // IMPORTANT: push bullet into the global game bullets array
        window.game.bullets.push(
            new ProtagonistBullet(this.x + this.width / 2, this.y)
        );
    }
    
    draw(ctx) {
        // Draw protagonist sprite
        ctx.drawImage(ASSETS.getImage('protagonist'), this.x, this.y, this.width, this.height);
    }
    
    takeDamage() {
        this.lives--;
        return this.lives <= 0;
    }
    
    adjustSpeed(alienCount) {
        // Increase protagonist speed as more aliens are destroyed
        const baseSpeed = 150;
        const maxSpeedIncrease = 150;
        
        // Start with 55 total aliens (5 x 11)
        const totalAliens = 5 * 11;
        const percentDestroyed = (totalAliens - alienCount) / totalAliens;
        
        this.speed = baseSpeed + percentDestroyed * maxSpeedIncrease;
        
        // Shoot faster as aliens are destroyed
        this.shootInterval = Math.max(0.5, 1.5 - percentDestroyed);
        
        // Occasionally randomize direction
        if (Math.random() < 0.3) {
            this.direction = Math.random() > 0.5 ? 1 : -1;
        }
    }

    checkAlienCollision(aliens) {
        if (!aliens) return false;
        
        for (const alien of aliens) {
            if (!alien.alive) continue;
            
            if (this.intersects(alien)) {
                // Player loses when hit by an alien
                if (window.game) {
                    window.game.endGame(false); // Aliens win
                }
                return true;
            }
        }
        return false;
    }
}

class Bullet extends Entity {
    constructor(x, y, width, height, speed) {
        super(x - width / 2, y, width, height);
        this.speed = speed;
    }
    
    update(dt) {
        this.y += this.speed * dt;
    }
}

class AlienBullet extends Bullet {
    constructor(x, y) {
        super(x, y, 4, 10, 300); // Positive speed means downward
    }
    
    draw(ctx) {
        ctx.drawImage(ASSETS.getImage('alienBullet'), this.x, this.y, this.width, this.height);
    }
    
    // Enhanced damage method that destroys multiple barrier segments
    damageBarrier(barrier, hitSegment) {
        console.log("Alien bullet damaging barrier"); // Debug log
        
        // Create a larger explosion at the impact point
        if (window.game && window.game.explosions) {
            window.game.explosions.push(new Explosion(
                hitSegment.x + hitSegment.width / 2,
                hitSegment.y + hitSegment.height / 2,
                20 // Larger explosion for bullet impact
            ));
        }
        
        // Apply damage to segments within the radius - MUCH more aggressive now
        const damageRadius = 15; // Increased radius
        
        for (let i = 0; i < barrier.segments.length; i++) {
            const segment = barrier.segments[i];
            
            // Calculate distance to impact point
            const dx = hitSegment.x + hitSegment.width/2 - (segment.x + segment.width/2);
            const dy = hitSegment.y + hitSegment.height/2 - (segment.y + segment.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= damageRadius) {
                // Much more damage - completely destroy segments at center
                const damageAmount = distance < 5 ? 10 : Math.ceil(5 * (1 - distance / damageRadius));
                segment.health -= damageAmount;
                
                // Remove segment if destroyed
                if (segment.health <= 0) {
                    barrier.segments.splice(i, 1);
                    i--; // Adjust index after removal
                }
            }
        }
        
        // Play hit sound
        if (window.SOUND_SYSTEM) {
            SOUND_SYSTEM.playSound('hit');
        }
    }
}

class ProtagonistBullet extends Bullet {
    constructor(x, y) {
        super(x, y, 4, 10, -300); // Negative speed means upward
    }
    
    draw(ctx) {
        ctx.drawImage(ASSETS.getImage('protagonistBullet'), this.x, this.y, this.width, this.height);
    }
}

class Explosion {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size || 40;
        this.frame = 0;
        this.maxFrames = 8;
        this.frameTime = 0;
        this.frameInterval = 0.1; // seconds per frame
        this.active = true;
        this.isPixelated = true; // Use pixelated style
    }
    
    update(dt) {
        this.frameTime += dt;
        
        if (this.frameTime >= this.frameInterval) {
            this.frameTime = 0;
            this.frame++;
            
            if (this.frame >= this.maxFrames) {
                this.active = false;
            }
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        if (this.isPixelated) {
            // Pixelated explosion animation
            const size = this.size * (1 - this.frame / this.maxFrames * 0.5);
            const halfSize = size / 2;
            
            ctx.fillStyle = `rgb(255, ${255 - this.frame * 30}, 0)`;
            
            // Draw a pixelated explosion
            const pixelSize = Math.max(2, Math.floor(size / 8));
            
            for (let y = -halfSize; y < halfSize; y += pixelSize) {
                for (let x = -halfSize; x < halfSize; x += pixelSize) {
                    // Create some randomness in the pattern
                    if (Math.random() > 0.3 && x*x + y*y < halfSize * halfSize) {
                        ctx.fillRect(
                            this.x + x, 
                            this.y + y, 
                            pixelSize, 
                            pixelSize
                        );
                    }
                }
            }
        } else {
            // Simple radial explosion animation (fallback)
            const radius = this.size / 2 * (1 - this.frame / this.maxFrames);
            
            ctx.fillStyle = `rgb(255, ${255 - this.frame * 30}, 0)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Barrier extends Entity {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.segments = [];
        this.segmentSize = 3; // Use smaller segments for a more pixelated look
        this.initializeSegments();
    }
    
    initializeSegments() {
        const segmentRows = Math.floor(this.height / this.segmentSize);
        const segmentCols = Math.floor(this.width / this.segmentSize);
        
        // Create the classic barrier shape
        for (let row = 0; row < segmentRows; row++) {
            for (let col = 0; col < segmentCols; col++) {
                // Create the inverted U shape of the barrier
                if (row >= segmentRows - 6 && col >= segmentCols/2 - 3 && col <= segmentCols/2 + 2) {
                    continue; // Skip the middle bottom area to create the "door"
                }
                
                this.segments.push({
                    x: this.x + col * this.segmentSize,
                    y: this.y + row * this.segmentSize,
                    width: this.segmentSize,
                    height: this.segmentSize,
                    health: 3 // Each segment can take 3 hits
                });
            }
        }
    }
    
    checkBulletCollision(bullet) {
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            
            if (bullet.x < segment.x + segment.width &&
                bullet.x + bullet.width > segment.x &&
                bullet.y < segment.y + segment.height &&
                bullet.y + bullet.height > segment.y) {
                
                // Segment is hit, reduce health
                segment.health--;
                
                // Remove segment if destroyed
                if (segment.health <= 0) {
                    this.segments.splice(i, 1);
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#00ff00'; // Classic Space Invaders green
        
        for (const segment of this.segments) {
            let alpha = 1;
            
            // Fade segments based on health
            if (segment.health < 3) {
                alpha = segment.health / 3;
            }
            
            ctx.globalAlpha = alpha;
            ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
        }
        
        ctx.globalAlpha = 1;
    }
}

// Add a new MysteryShip class
class MysteryShip extends Entity {
    constructor(gameWidth) {
        const width = 32; // Adjust to match image dimensions (scaled)
        const height = 14; // Adjust to match image dimensions (scaled)
        const y = 70; // Just above the top row of aliens
        
        // Start outside the screen, moving right to left
        const x = gameWidth;
        
        super(x, y, width, height);
        
        this.speed = -100; // Negative for right to left movement
        this.active = true;
        this.points = 100; // Points for hitting the mystery ship
    }
    
    update(dt) {
        this.x += this.speed * dt;
        
        // Deactivate when it goes off-screen
        if (this.x < -this.width) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        // Use the mystery ship image from assets
        ctx.save();
        ctx.imageSmoothingEnabled = false; // Keep the pixelated look
        ctx.drawImage(
            ASSETS.getImage('mysteryShip'),
            this.x, this.y,
            this.width, this.height
        );
        
        // Debug: Draw hitbox
        if (window.DEBUG_HITBOXES) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
        
        ctx.restore();
    }
} 