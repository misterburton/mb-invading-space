// Visual effects classes for the game

// Simple visual feedback for taps
export class TapFeedback {
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

// Score popup effect
export class ScorePopup {
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

// Circle pulse effect for highlighting
export class CirclePulseEffect {
    constructor(x, y, maxRadius) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius || 30;
        this.alpha = 0.8;
        this.active = true;
        this.life = 0.5; // seconds
        this.elapsedTime = 0;
    }
    
    update(dt) {
        this.elapsedTime += dt;
        
        // Grow radius over time
        const progress = this.elapsedTime / this.life;
        this.radius = this.maxRadius * Math.min(1, progress);
        
        // Fade out over time
        this.alpha = Math.max(0, 0.8 * (1 - progress));
        
        if (this.elapsedTime >= this.life) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
} 