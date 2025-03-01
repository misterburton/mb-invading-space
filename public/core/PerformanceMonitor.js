// Performance monitoring and adaptive quality system

export class PerformanceMonitor {
    constructor(shaderManager) {
        // Performance monitoring
        this.frameTimeHistory = [];
        this.frameTimeHistoryMax = 60; // Store the last 60 frame times (about 1 second at 60fps)
        this.currentFPS = 60; // Default assumption
        this.fpsUpdateInterval = 0.5; // Update FPS calculation every 0.5 seconds
        this.fpsUpdateTimer = 0;
        this.performanceLevel = 'high'; // 'high', 'medium', or 'low'
        
        // Reference to shader manager for quality adjustments
        this.shaderManager = shaderManager;
    }
    
    // Add frame time to history
    addFrameTime(deltaTime) {
        this.frameTimeHistory.push(deltaTime);
        if (this.frameTimeHistory.length > this.frameTimeHistoryMax) {
            this.frameTimeHistory.shift(); // Remove oldest entry
        }
    }
    
    // Update performance metrics and apply settings
    update(deltaTime) {
        // Add current frame time to history
        this.addFrameTime(deltaTime);
        
        // Update FPS calculation periodically
        this.fpsUpdateTimer += deltaTime;
        if (this.fpsUpdateTimer >= this.fpsUpdateInterval) {
            this.updatePerformanceMetrics();
            this.applyPerformanceSettings();
            this.fpsUpdateTimer = 0;
        }
    }
    
    // Calculate current FPS and determine performance level
    updatePerformanceMetrics() {
        if (this.frameTimeHistory.length < 10) return; // Need enough samples
        
        // Calculate average frame time (excluding outliers)
        const sortedTimes = [...this.frameTimeHistory].sort((a, b) => a - b);
        const trimCount = Math.floor(sortedTimes.length * 0.1); // Trim 10% from each end
        const trimmedTimes = sortedTimes.slice(trimCount, sortedTimes.length - trimCount);
        
        const avgFrameTime = trimmedTimes.reduce((sum, time) => sum + time, 0) / trimmedTimes.length;
        this.currentFPS = Math.round(1 / avgFrameTime);
        
        // Determine performance level
        if (this.currentFPS >= 45) {
            this.performanceLevel = 'high';
        } else if (this.currentFPS >= 30) {
            this.performanceLevel = 'medium';
        } else {
            this.performanceLevel = 'low';
        }
        
        // Log performance metrics (can be removed in production)
        console.log(`Current FPS: ${this.currentFPS}, Performance Level: ${this.performanceLevel}`);
    }
    
    // Apply performance-based settings
    applyPerformanceSettings() {
        if (!this.shaderManager) return;
        
        switch (this.performanceLevel) {
            case 'high':
                // Full effects
                this.shaderManager.setEnabled(true);
                this.shaderManager.setQualityLevel('high');
                break;
                
            case 'medium':
                // Reduced effects
                this.shaderManager.setEnabled(true);
                this.shaderManager.setQualityLevel('medium');
                break;
                
            case 'low':
                // Disable effects
                this.shaderManager.setEnabled(false);
                break;
        }
    }
    
    // Draw FPS and performance level in the corner
    drawPerformanceMetrics(ctx, canvasWidth, canvasHeight) {
        // Only show in debug mode or during development
        const showPerformanceMetrics = true; // Set to false in production
        
        if (!showPerformanceMetrics) return;
        
        ctx.save();
        
        // Position in bottom right corner
        const x = canvasWidth - 10;
        const y = canvasHeight - 50; // Above sound toggle
        
        // Set text properties
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = this.performanceLevel === 'high' ? '#00FF00' : 
                         this.performanceLevel === 'medium' ? '#FFFF00' : '#FF0000';
        
        // Draw FPS and performance level
        ctx.fillText(`FPS: ${this.currentFPS}`, x, y);
        ctx.fillText(`Quality: ${this.performanceLevel}`, x, y + 12);
        
        // Draw shader status
        if (this.shaderManager) {
            const shaderStatus = this.shaderManager.enabled ? 'ON' : 'OFF';
            ctx.fillText(`Shaders: ${shaderStatus}`, x, y + 24);
        }
        
        ctx.restore();
    }
} 