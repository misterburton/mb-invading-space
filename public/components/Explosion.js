// Explosion effects for the game

export class Explosion {
    constructor(x, y, size = 20, type = 'normal') {
        this.x = x;
        this.y = y;
        this.size = size;
        this.type = type; // 'normal', 'alien', or 'mysteryShip'
        this.particles = [];
        this.active = true;
        this.life = 0.5; // seconds
        this.elapsedTime = 0;
        
        // Create particles
        this.createParticles();
    }
    
    createParticles() {
        const particleCount = Math.floor(this.size / 2);
        
        // Different colors based on explosion type
        let colors;
        switch (this.type) {
            case 'alien':
                colors = ['#00FF00', '#FFFFFF', '#88FF88'];
                break;
            case 'mysteryShip':
                colors = ['#FF0000', '#FF00FF', '#FFFF00', '#00FFFF'];
                break;
            default:
                colors = ['#FFFFFF', '#FFFF00', '#FF8800'];
                break;
        }
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (1 + Math.random()) * this.size / 10;
            const size = Math.random() * this.size / 5 + 1;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                alpha: 1
            });
        }
    }
    
    update(dt) {
        this.elapsedTime += dt;
        
        // Update particles
        for (const particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Fade out over time
            particle.alpha = Math.max(0, 1 - this.elapsedTime / this.life);
        }
        
        // Deactivate when lifetime is over
        if (this.elapsedTime >= this.life) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        // Draw particles
        for (const particle of this.particles) {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.alpha;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
}

// Specialized explosion for alien tap highlight
export class AlienTapHighlight {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = true;
        this.life = 0.3; // seconds
        this.elapsedTime = 0;
    }
    
    update(dt) {
        this.elapsedTime += dt;
        
        // Deactivate when lifetime is over
        if (this.elapsedTime >= this.life) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        // Calculate alpha based on remaining life
        const alpha = Math.max(0, 1 - this.elapsedTime / this.life);
        
        // Draw highlight rectangle
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
} 