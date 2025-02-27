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
        
        // For mobile, create a larger hitbox while keeping the visual size the same
        const isMobile = window.innerWidth < 768;
        const hitboxSize = isMobile ? 40 : width*2;
        
        // Center the hitbox around the alien
        super(x - (hitboxSize - width*2)/2, y - (hitboxSize - height*2)/2, 
              hitboxSize, hitboxSize);
              
        this.type = type;
        this.rowIndex = rowIndex;
        this.colIndex = colIndex;
        this.alive = true;
        this.canShoot = true;
        this.visualWidth = width*2;
        this.visualHeight = height*2;
        
        // Enhanced animation properties
        this.frameCount = 4; // 4 frames of animation
        this.currentFrame = Math.floor(Math.random() * this.frameCount); // Randomize starting frame for variety
        this.animTimer = 0;
        this.animInterval = 0.2; // Seconds between frame changes
        
        // Direction-specific animation
        this.lastMoveDirection = 1; // 1 for right, -1 for left
        this.preparingToMoveDown = false; // Flag for squash animation when changing direction
    }
    
    update(dt) {
        // Update animation timing
        this.animTimer += dt;
        if (this.animTimer >= this.animInterval) {
            this.animTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        }
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        // Calculate where to draw the visual alien (centered in hitbox)
        const visualX = this.x + (this.width - this.visualWidth)/2;
        const visualY = this.y + (this.height - this.visualHeight)/2;
        
        ctx.save();
        ctx.imageSmoothingEnabled = false; // Keep the pixelated look
        
        // Apply squash and stretch based on movement state
        let scaleX = 1;
        let scaleY = 1;
        let offsetX = 0;
        let offsetY = 0;
        
        if (this.preparingToMoveDown) {
            // Squash effect when about to move down
            scaleX = 1.2;
            scaleY = 0.8;
            offsetY = this.visualHeight * 0.1;
        } else if (this.justMovedDown) {
            // Stretch effect right after moving down
            scaleX = 0.9;
            scaleY = 1.3;
            offsetY = -this.visualHeight * 0.1;
        } else {
            // Slight movement based on animation frame during normal movement
            const frameOffset = (this.currentFrame % 2) * 0.05;
            scaleX = 1 - frameOffset;
            scaleY = 1 + frameOffset;
        }
        
        // Calculate animation offset for tentacles based on direction
        const tentacleOffset = this.lastMoveDirection * 2 * (this.currentFrame % 2);
        
        // Draw alien with animation
        this.drawAnimatedAlien(
            ctx, 
            visualX + offsetX, 
            visualY + offsetY, 
            this.visualWidth * scaleX, 
            this.visualHeight * scaleY,
            tentacleOffset
        );
        
        // Debug: Draw hitbox rectangle around the alien
        if (window.DEBUG_HITBOXES) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
        
        ctx.restore();
    }
    
    drawAnimatedAlien(ctx, x, y, width, height, tentacleOffset) {
        // Get base image
        const baseImage = ASSETS.getImage(`alien${this.type}`);
        
        // Draw the base image
        ctx.drawImage(baseImage, x, y, width, height);
        
        // Add animated parts based on alien type and frame
        ctx.fillStyle = '#ffffff';
        
        if (this.type === 1) { // Squid
            // Draw animated tentacles
            const tentacleWidth = Math.max(1, Math.floor(width * 0.05));
            const tentacleHeight = Math.max(1, Math.floor(height * 0.15));
            const baseY = y + height * 0.85;
            
            // Left tentacles with animation offset
            ctx.fillRect(x + width * 0.2 - tentacleOffset, baseY, tentacleWidth, tentacleHeight);
            ctx.fillRect(x + width * 0.4 + tentacleOffset, baseY, tentacleWidth, tentacleHeight);
            
            // Right tentacles with animation offset
            ctx.fillRect(x + width * 0.6 - tentacleOffset, baseY, tentacleWidth, tentacleHeight);
            ctx.fillRect(x + width * 0.8 + tentacleOffset, baseY, tentacleWidth, tentacleHeight);
        } 
        else if (this.type === 2) { // Crab
            // Animate the crab's claws
            const clawSize = Math.max(2, Math.floor(width * 0.1));
            const clawY = y + height * 0.65;
            const leftOffset = this.currentFrame % 2 === 0 ? -1 : 1;
            const rightOffset = -leftOffset;
            
            // Left claw
            ctx.fillRect(x - clawSize * 0.5 + leftOffset, clawY, clawSize, clawSize);
            
            // Right claw
            ctx.fillRect(x + width - clawSize * 0.5 + rightOffset, clawY, clawSize, clawSize);
        }
        else if (this.type === 3) { // Octopus
            // Animate the octopus's tentacles
            const animOffset = (this.currentFrame % 2) * 2;
            const tentacleWidth = Math.max(2, Math.floor(width * 0.08));
            const tentacleHeight = Math.max(2, Math.floor(height * 0.1));
            const baseY = y + height * 0.9;
            
            // Draw alternating tentacle pattern
            for (let i = 0; i < 4; i++) {
                const offset = i % 2 === 0 ? animOffset : -animOffset;
                const xPos = x + width * (0.2 + i * 0.2) + offset;
                ctx.fillRect(xPos, baseY, tentacleWidth, tentacleHeight);
            }
        }
    }
    
    shoot() {
        // Create the bullet at the bottom center of the alien
        const bulletX = this.x + this.width / 2 - 2;
        const bulletY = this.y + this.height;
        
        // Chance of firing a fast bullet increases with level
        const level = window.game ? window.game.level : 1;
        const fastBulletChance = 0.1 * level; // 10% at level 1, 20% at level 2, etc.
        
        const bulletType = Math.random() < fastBulletChance ? 'fast' : 'normal';
        return new AlienBullet(bulletX, bulletY, bulletType);
    }
    
    setMoveDirection(direction) {
        this.lastMoveDirection = direction;
    }
    
    prepareToMoveDown() {
        this.preparingToMoveDown = true;
        
        // Reset after short delay
        setTimeout(() => {
            this.preparingToMoveDown = false;
            this.justMovedDown = true;
            
            // Reset stretch effect after movement
            setTimeout(() => {
                this.justMovedDown = false;
            }, 100);
        }, 100);
    }
}

class AlienGrid {
    constructor(gameWidth, gameHeight) {
        // Use the game's alien grid size if available
        this.rows = window.game ? window.game.ALIEN_ROWS : 5;
        this.cols = window.game ? window.game.ALIEN_COLS : 11;
        this.aliens = [];
        this.direction = 1; // 1 for right, -1 for left
        this.speed = 20; // Initial speed (pixels per second)
        this.moveTimer = 0;
        this.moveInterval = 1; // Initial move interval
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.moveCount = 0;
        this.horizontalStep = 10; // Distance to move horizontally in each step
        this.verticalStep = 20; // How far down to move when hitting an edge
        this.edgeMargin = 5; // Reduced margin to allow more movement
        this.shouldMoveDown = false; // New flag to control downward movement
        this.groundLineY = gameHeight - 60; // Position of the ground line
        
        // Special attack properties
        this.specialAttackTimer = 0;
        this.specialAttackInterval = 10; // Seconds between special attacks
        this.specialAttackChance = 0.3; // 30% chance when timer expires
        
        this.initialize(gameWidth, gameHeight);
    }
    
    initialize(gameWidth, gameHeight) {
        // Adjust grid size based on screen width
        if (gameWidth < 350) {
            this.rows = 4;
            this.cols = 6;
        } else if (gameWidth < 500) {
            this.rows = 5;
            this.cols = 8;
        } else {
            this.rows = 5;
            this.cols = 11;
        }
        
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
        // Find leftmost, rightmost, and lowest aliens for boundary checks
        let leftmostX = Infinity;
        let rightmostX = -Infinity;
        let lowestY = -Infinity;
        
        // Find alive aliens with extreme positions
        for (const alien of this.aliens) {
            if (alien.alive) {
                leftmostX = Math.min(leftmostX, alien.x);
                rightmostX = Math.max(rightmostX, alien.x + alien.width);
                lowestY = Math.max(lowestY, alien.y + alien.height);
            }
        }
        
        // Update movement timer
        this.moveTimer += dt;
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            
            // Move aliens horizontally
            let moveDown = false;
            
            // Check if aliens hit the edge of the screen
            if ((this.direction === 1 && rightmostX > this.gameWidth - this.edgeMargin) ||
                (this.direction === -1 && leftmostX < this.edgeMargin)) {
                
                // Reverse direction
                this.direction *= -1;
                
                // Set flag to move down
                moveDown = true;
                
                // Notify all aliens to prepare for downward movement (animation)
                for (const alien of this.aliens) {
                    if (alien.alive) {
                        alien.prepareToMoveDown();
                        alien.setMoveDirection(this.direction);
                    }
                }
                
                // Add screen shake and flash effects when changing direction
                if (window.game) {
                    window.game.addScreenShake(4, 0.3);
                    const distanceToBottom = window.game.groundLineY - lowestY;
                    const flashIntensity = Math.min(0.5, 0.2 + (1 - distanceToBottom / 400) * 0.3);
                    window.game.addScreenFlash(`rgba(255, 0, 0, ${flashIntensity})`, flashIntensity, 0.2);
                }
                
                // IMPORTANT: Move all aliens down
                if (moveDown) {
                    for (const alien of this.aliens) {
                        if (alien.alive) {
                            alien.y += this.verticalStep;
                        }
                    }
                    console.log("Aliens moving down by", this.verticalStep, "pixels");
                }
            } else {
                // Regular horizontal movement
                for (const alien of this.aliens) {
                    if (alien.alive) {
                        alien.x += this.horizontalStep * this.direction;
                        alien.update(dt); // Make sure alien animations update
                        alien.setMoveDirection(this.direction);
                    }
                }
            }
            
            // Play alien movement sound
            SOUND_SYSTEM.playAlienMove(this.moveCount);
            this.moveCount++;
            
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
        
        // When regular movement happens, update all aliens' move direction
        for (const alien of this.aliens) {
            if (alien.alive) {
                alien.setMoveDirection(this.direction);
                alien.update(dt); // Make sure alien animations update
            }
        }
        
        // Update special attack timer
        this.specialAttackTimer += dt;
        if (this.specialAttackTimer >= this.specialAttackInterval) {
            this.specialAttackTimer = 0;
            
            // Chance to perform special attack
            if (Math.random() < this.specialAttackChance && window.game && window.game.protagonist) {
                this.performSpecialAttack();
            }
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
        // Get the number of remaining aliens
        const aliveCount = this.aliens.filter(alien => alien.alive).length;
        const totalAliens = this.rows * this.cols;
        const percentRemaining = aliveCount / totalAliens;
        
        // Increase speed as aliens are destroyed
        this.moveInterval = Math.max(0.2, 1.0 * percentRemaining);
        
        // Also increase firing rate
        this.shootProbability = Math.min(0.05, 0.02 + (1 - percentRemaining) * 0.03);
        
        console.log(`Aliens remaining: ${aliveCount}, Speed: ${1/this.moveInterval}, Fire rate: ${this.shootProbability}`);
    }
    
    setGroundLineY(y) {
        this.groundLineY = y;
    }

    shootRandomAlien() {
        // Get all alive aliens
        const aliveAliens = this.aliens.filter(alien => alien.alive);
        
        if (aliveAliens.length === 0) return null;
        
        // As the game progresses, increase targeting accuracy
        const level = window.game ? window.game.level : 1;
        const targetingProbability = 0.3 + (level - 1) * 0.15; // 30% at level 1, 45% at level 2, etc.
        
        let shootingAlien;
        
        if (Math.random() < targetingProbability && window.game && window.game.protagonist) {
            // Target the protagonist more directly
            // Find the aliens in the columns closest to the protagonist
            const protagonistX = window.game.protagonist.x + window.game.protagonist.width / 2;
            
            // Sort aliens by horizontal distance to protagonist
            const sortedByProximity = [...aliveAliens].sort((a, b) => {
                const distA = Math.abs((a.x + a.width/2) - protagonistX);
                const distB = Math.abs((b.x + b.width/2) - protagonistX);
                return distA - distB;
            });
            
            // Take one of the closest aliens
            const closestCount = Math.max(1, Math.floor(sortedByProximity.length * 0.2)); // Take top 20%
            shootingAlien = sortedByProximity[Math.floor(Math.random() * closestCount)];
        } else {
            // Random shooting as before
            const bottomAliens = this.getBottomRowAliens();
            shootingAlien = bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
        }
        
        return shootingAlien.shoot();
    }

    // Helper method to get bottom-row aliens
    getBottomRowAliens() {
        // Create a map to track the bottom-most alien in each column
        const bottomAliens = new Map();
        
        for (const alien of this.aliens) {
            if (!alien.alive) continue;
            
            const col = alien.colIndex;
            
            if (!bottomAliens.has(col) || 
                alien.y > bottomAliens.get(col).y) {
                bottomAliens.set(col, alien);
            }
        }
        
        return Array.from(bottomAliens.values());
    }

    performSpecialAttack() {
        if (!window.game) return;
        
        // Warning flash
        window.game.addScreenFlash('rgba(255, 0, 0, 0.3)', 0.3, 0.5);
        
        // Schedule a volley of shots
        const alienCount = Math.min(3, this.aliens.filter(alien => alien.alive).length);
        
        for (let i = 0; i < alienCount; i++) {
            setTimeout(() => {
                const bullet = this.shootRandomAlien();
                if (bullet && window.game) {
                    window.game.bullets.push(bullet);
                }
            }, i * 200); // Staggered firing
        }
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

        // Add acceleration and max speed
        this.maxSpeed = 200; // Maximum pixels per second
        this.acceleration = 400; // Acceleration rate
        this.velocity = 0;
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
            
            // Add acceleration and max speed
            const maxSpeed = 200; // Maximum pixels per second
            const acceleration = 400; // Acceleration rate
            let currentSpeed = 0;
            
            if (this.direction !== 0) {
                // Accelerate in the direction of movement
                this.velocity += this.direction * acceleration * dt;
                // Clamp to max speed
                this.velocity = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity));
            } else {
                // Decelerate when no input
                if (Math.abs(this.velocity) < acceleration * dt) {
                    this.velocity = 0;
                } else if (this.velocity > 0) {
                    this.velocity -= acceleration * dt;
                } else if (this.velocity < 0) {
                    this.velocity += acceleration * dt;
                }
            }
            
            // Move based on velocity
            this.x += this.velocity * dt;
        }
        
        // Clamp position to screen boundaries
        this.x = Math.max(0, Math.min(this.gameWidth - this.width, this.x));
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
    constructor(x, y, type = 'normal') {
        const bulletSpeed = type === 'fast' ? 350 : 200;
        super(x, y, 4, 10, bulletSpeed);
        this.type = type;
    }
    
    draw(ctx) {
        if (this.type === 'fast') {
            // Draw faster bullets with a different appearance
            ctx.fillStyle = '#ff00ff'; // Purple/pink for fast bullets
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else {
            ctx.drawImage(ASSETS.getImage('alienBullet'), this.x, this.y, this.width, this.height);
        }
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
    constructor(x, y, size, type = 'normal') {
        this.x = x;
        this.y = y;
        this.size = size || 40;
        this.particles = [];
        this.active = true;
        this.duration = 0.8; // Total duration in seconds
        this.elapsedTime = 0;
        this.type = type; // normal, alien, mysteryShip, barrier
        
        // Create particles
        this.createParticles();
    }
    
    createParticles() {
        const particleCount = Math.min(40, Math.floor(this.size * 0.8));
        
        // Color schemes for different explosion types
        let colors;
        switch(this.type) {
            case 'mysteryShip':
                colors = ['#ff00ff', '#ff44ff', '#ff88ff', '#ffaaff', '#ffffff'];
                break;
            case 'barrier':
                colors = ['#00ff00', '#44ff44', '#88ff88', '#aaffaa', '#ffffff'];
                break;
            case 'alien':
                colors = ['#ff0000', '#ff4400', '#ff8800', '#ffaa00', '#ffff00', '#ffffff'];
                break;
            default: // 'normal'
                colors = ['#ffffff', '#ffff00', '#ffaa00', '#ff8800', '#ff4400', '#ff0000'];
                break;
        }
        
        for (let i = 0; i < particleCount; i++) {
            // Create particle with random properties
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * this.size * 0.3 + this.size * 0.1;
            const size = Math.random() * Math.max(2, this.size * 0.1) + Math.max(1, this.size * 0.05);
            const life = Math.random() * 0.5 + 0.3; // 0.3 to 0.8 seconds
            
            // Random color from scheme
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                alpha: 1,
                life: life,
                gravity: Math.random() * 50 + 20, // Add some gravity for falling effect
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 5,
                shape: Math.random() > 0.7 ? 'square' : 'circle', // Mix of shapes
            });
        }
        
        // Add a central flash
        this.flash = {
            size: this.size * 0.8,
            alpha: 1,
            duration: 0.15
        };
    }
    
    update(dt) {
        this.elapsedTime += dt;
        
        if (this.elapsedTime >= this.duration) {
            this.active = false;
            return;
        }
        
        // Update central flash
        if (this.flash) {
            this.flash.alpha -= dt / this.flash.duration;
            if (this.flash.alpha <= 0) {
                this.flash = null;
            }
        }
        
        // Update each particle
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Apply velocity
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // Apply gravity
            p.vy += p.gravity * dt;
            
            // Apply rotation
            p.rotation += p.rotationSpeed * dt;
            
            // Fade out based on life
            p.alpha = Math.max(0, 1 - (this.elapsedTime / p.life));
            
            // Shrink particle over time
            p.size *= 0.97;
            
            // Remove dead particles
            if (p.alpha <= 0 || p.size <= 0.5) {
                this.particles.splice(i, 1);
                i--;
            }
        }
        
        // If all particles are gone, deactivate
        if (this.particles.length === 0 && !this.flash) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        // Draw flash
        if (this.flash && this.flash.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.flash.alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.flash.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Draw particles
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            
            // Translate to particle center for rotation
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            
            // Draw particle based on shape
            if (p.shape === 'square') {
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
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