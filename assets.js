class AssetManager {
    constructor() {
        this.images = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    loadImage(name, src) {
        this.totalAssets++;
        
        if (!src) {
            // Generate a placeholder image if source is not provided
            src = this.generatePlaceholder(name);
        }
        
        const img = new Image();
        img.src = src;
        img.onload = () => {
            this.loadedAssets++;
            this.images[name] = img;
        };
    }

    generatePlaceholder(name) {
        // Create a canvas to generate a placeholder image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Default size
        canvas.width = 30;
        canvas.height = 30;
        
        // Different colors for different types
        let color = '#ffffff';
        
        if (name.includes('alien1')) color = '#80ff00';
        else if (name.includes('alien2')) color = '#ff00ff';
        else if (name.includes('alien3')) color = '#00ffff';
        else if (name.includes('protagonist')) {
            color = '#00ff00';
            canvas.width = 50;
        }
        else if (name.includes('Bullet')) {
            color = name.includes('alien') ? '#ff0000' : '#00ff00';
            canvas.width = 4;
            canvas.height = 10;
        }
        else if (name.includes('explosion')) {
            color = '#ff0000';
            canvas.width = 40;
            canvas.height = 40;
        }
        
        // Fill with color
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL();
    }

    isAllLoaded() {
        return this.loadedAssets === this.totalAssets;
    }

    getImage(name) {
        return this.images[name];
    }
}

const ASSETS = new AssetManager();

// Load images
ASSETS.loadImage('alien1');
ASSETS.loadImage('alien2');
ASSETS.loadImage('alien3');
ASSETS.loadImage('protagonist');
ASSETS.loadImage('protagonistDamaged1');
ASSETS.loadImage('protagonistDamaged2');
ASSETS.loadImage('protagonistDamaged3');
ASSETS.loadImage('protagonistDamaged4');
ASSETS.loadImage('alienBullet');
ASSETS.loadImage('protagonistBullet');
ASSETS.loadImage('explosion'); 