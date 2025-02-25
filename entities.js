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
        super(x, y, 30, 30);
        this.type = type;
        this.rowIndex = rowIndex;
        this.colIndex = colIndex;
        this.alive = true;
        this.canShoot = true;
    }

    update(dt) {
        // Movement will be handled by the AlienGrid
    }

    draw(ctx) {
        if (!this.alive) return;
        
        let imageName = 'alien1';
        if (this.type === 2) imageName = 'alien2';
        if (this.type === 3) imageName = 'alien3';
        
        ctx.drawImage(ASSETS.getImage(imageName), this.x, this.y, this.width, this.height);
    }

    shoot() {
        if (!this.canShoot || !this.alive) return null;
        
        this.canShoot = false;
        setTimeout(() => {
            this.canShoot = true;
        }, 1000); // Cooldown period
        
        return new AlienBullet(this.x + this.width / 2, this.y + this.height);
    }
}

class AlienGrid {
    constructor(gameWidth, gameHeight) {
        this.rows = 5;
        this.cols = 11;
        this.aliens = [];
        this.direction = 1; // 1 for right, -1 for left
        this.speed = 20; // pixels per second
        this.moveTimer = 0;
        this.moveInterval = 1; // seconds between movements
        this.gameWidth = gameWidth;
        
        this.initialize(gameWidth, gameHeight);
    }
    
    initialize(gameWidth, gameHeight) {
        const alienWidth = 30;
        const alienHeight = 30;
        const padding = 10;
        const startX = (gameWidth - ((alienWidth + padding) * this.cols - padding)) / 2;
        const startY = 50;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                let type = 1;
                if (row === 0) type = 3;
                else if (row === 1 || row === 2) type = 2;
                
                const x = startX + col * (alienWidth + padding);
                const y = startY + row * (alienHeight + padding);
                
                this.aliens.push(new Alien(x, y, type, row, col));
            }
        }
    }
    
    update(dt) {
        this.moveTimer += dt;
        
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            
            // Check if any alien hit the edge
            let hitEdge = false;
            
            for (const alien of this.aliens) {
                if (!alien.alive) continue;
                
                if ((this.direction === 1 && alien.x + alien.width + this.speed > this.gameWidth) ||
                    (this.direction === -1 && alien.x - this.speed < 0)) {
                    hitEdge = true;
                    break;
                }
            }
            
            if (hitEdge) {
                this.direction *= -1;
            }
            
            // Move all aliens
            for (const alien of this.aliens) {
                if (!alien.alive) continue;
                alien.x += this.speed * this.direction;
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
        // Increase speed as aliens are destroyed
        const aliveCount = this.getAliveAliens().length;
        const totalCount = this.rows * this.cols;
        
        // Adjust speed based on percentage of aliens remaining
        const percentRemaining = aliveCount / totalCount;
        this.speed = 20 + (1 - percentRemaining) * 40; // Ranges from 20 to 60
        this.moveInterval = Math.max(0.3, 1 - (1 - percentRemaining) * 0.7); // Ranges from 1 to 0.3
    }
}

class Protagonist extends Entity {
    constructor(gameWidth, gameHeight) {
        super(gameWidth / 2 - 25, gameHeight - 50, 50, 30);
        this.gameWidth = gameWidth;
        this.speed = 150; // pixels per second
        this.direction = 0; // -1 for left, 0 for stationary, 1 for right
        this.health = 5;
        this.shootTimer = 0;
        this.shootInterval = 1; // seconds between shots
        this.bullets = [];
    }
    
    update(dt) {
        // Move the protagonist
        this.x += this.speed * this.direction * dt;
        
        // Keep within game bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.gameWidth) this.x = this.gameWidth - this.width;
        
        // Update shooting timer
        this.shootTimer += dt;
        
        // Auto-shoot when ready
        if (this.shootTimer >= this.shootInterval) {
            this.shoot();
        }
        
        // Update bullets
        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].update(dt);
            
            // Remove bullets that go off-screen
            if (this.bullets[i].y < -10) {
                this.bullets.splice(i, 1);
                i--;
            }
        }
    }
    
    draw(ctx) {
        // Draw protagonist with appropriate damage level
        let imageName = 'protagonist';
        if (this.health === 4) imageName = 'protagonistDamaged1';
        else if (this.health === 3) imageName = 'protagonistDamaged2';
        else if (this.health === 2) imageName = 'protagonistDamaged3';
        else if (this.health === 1) imageName = 'protagonistDamaged4';
        
        ctx.drawImage(ASSETS.getImage(imageName), this.x, this.y, this.width, this.height);
        
        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
    }
    
    shoot() {
        this.shootTimer = 0;
        this.bullets.push(new ProtagonistBullet(this.x + this.width / 2, this.y));
    }
    
    takeDamage() {
        this.health--;
        return this.health <= 0;
    }
    
    adjustSpeed(alienCount) {
        // Increase protagonist speed as more aliens are destroyed
        const baseSpeed = 150;
        const maxSpeedIncrease = 150; // Maximum additional speed
        
        // Assuming we start with 55 aliens (5 rows * 11 columns)
        const totalAliens = 5 * 11;
        const percentDestroyed = (totalAliens - alienCount) / totalAliens;
        
        this.speed = baseSpeed + percentDestroyed * maxSpeedIncrease;
        this.direction = Math.random() > 0.5 ? 1 : -1; // Randomize direction
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
        
        // Simple explosion animation
        const radius = this.size / 2 * (1 - this.frame / this.maxFrames);
        
        ctx.fillStyle = `rgb(255, ${255 - this.frame * 30}, 0)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
} 