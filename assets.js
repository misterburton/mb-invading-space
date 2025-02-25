class AssetManager {
    constructor() {
        this.images = {};
        this.sounds = {};
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

    loadSound(name, src) {
        this.totalAssets++;
        
        // Create a silent sound object as fallback
        const silentSound = {
            play: () => {},
            cloneNode: () => { return { play: () => {} }; }
        };
        
        try {
            const sound = new Audio();
            
            // Set error handler first to catch immediate errors
            sound.onerror = () => {
                console.log(`Using silent fallback for sound: ${name}`);
                this.loadedAssets++;
                this.sounds[name] = silentSound;
            };
            
            sound.oncanplaythrough = () => {
                this.loadedAssets++;
                this.sounds[name] = sound;
            };
            
            // Set source after attaching handlers
            sound.src = src || this.generateSoundData(name);
        } catch (e) {
            console.log(`Error loading sound ${name}: ${e.message}`);
            this.loadedAssets++;
            this.sounds[name] = silentSound;
        }
    }

    generatePlaceholder(name) {
        // Create a canvas to generate a placeholder image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (name.includes('alien1')) {
            // Bottom row aliens (squid shape)
            canvas.width = 16;
            canvas.height = 8;
            ctx.fillStyle = '#ffffff';
            
            // Create the pixel pattern exactly matching the original
            const squidPixels = [
                [0,0,0,0,1,1,0,0,0,0],
                [0,0,0,1,1,1,1,0,0,0],
                [0,0,1,1,1,1,1,1,0,0],
                [0,1,1,0,1,1,0,1,1,0],
                [1,1,1,1,1,1,1,1,1,1],
                [0,0,1,0,1,1,0,1,0,0],
                [0,1,0,0,0,0,0,0,1,0],
                [0,0,1,0,0,0,0,1,0,0]
            ];
            
            // Draw the pixel pattern
            for (let y = 0; y < squidPixels.length; y++) {
                for (let x = 0; x < squidPixels[y].length; x++) {
                    if (squidPixels[y][x] === 1) {
                        ctx.fillRect(x+3, y, 1, 1);
                    }
                }
            }
        }
        else if (name.includes('alien2')) {
            // Middle row aliens (crab shape)
            canvas.width = 16;
            canvas.height = 8;
            ctx.fillStyle = '#ffffff';
            
            // Create the pixel pattern exactly matching the original
            const crabPixels = [
                [0,0,1,0,0,0,0,1,0,0],
                [1,0,0,1,0,0,1,0,0,1],
                [1,0,1,1,1,1,1,1,0,1],
                [1,1,1,0,1,1,0,1,1,1],
                [1,1,1,1,1,1,1,1,1,1],
                [0,1,1,1,1,1,1,1,1,0],
                [0,0,1,0,0,0,0,1,0,0],
                [0,1,0,0,0,0,0,0,1,0]
            ];
            
            // Draw the pixel pattern
            for (let y = 0; y < crabPixels.length; y++) {
                for (let x = 0; x < crabPixels[y].length; x++) {
                    if (crabPixels[y][x] === 1) {
                        ctx.fillRect(x+3, y, 1, 1);
                    }
                }
            }
        }
        else if (name.includes('alien3')) {
            // Top row aliens (octopus shape)
            canvas.width = 16;
            canvas.height = 8;
            ctx.fillStyle = '#ffffff';
            
            // Create the pixel pattern exactly matching the original
            const octopusPixels = [
                [0,0,0,1,1,1,1,0,0,0],
                [0,1,1,1,1,1,1,1,1,0],
                [1,1,1,1,1,1,1,1,1,1],
                [1,1,1,0,0,0,0,1,1,1],
                [1,1,1,1,1,1,1,1,1,1],
                [0,0,0,1,1,1,1,0,0,0],
                [0,0,1,1,0,0,1,1,0,0],
                [1,1,0,0,0,0,0,0,1,1]
            ];
            
            // Draw the pixel pattern
            for (let y = 0; y < octopusPixels.length; y++) {
                for (let x = 0; x < octopusPixels[y].length; x++) {
                    if (octopusPixels[y][x] === 1) {
                        ctx.fillRect(x+3, y, 1, 1);
                    }
                }
            }
        }
        else if (name.includes('protagonist')) {
            // Protagonist cannon
            canvas.width = 16;
            canvas.height = 8;
            ctx.fillStyle = '#00ff00';
            
            // Create the pixel pattern exactly matching the original
            const cannonPixels = [
                [0,0,0,0,0,1,0,0,0,0,0],
                [0,0,0,0,1,1,1,0,0,0,0],
                [0,0,0,0,1,1,1,0,0,0,0],
                [0,1,1,1,1,1,1,1,1,1,0],
                [1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1]
            ];
            
            // Draw the pixel pattern
            for (let y = 0; y < cannonPixels.length; y++) {
                for (let x = 0; x < cannonPixels[y].length; x++) {
                    if (cannonPixels[y][x] === 1) {
                        ctx.fillRect(x+2, y, 1, 1);
                    }
                }
            }
            
            if (name.includes('Damaged')) {
                // Add damage indication if needed
                // ...
            }
        }
        else if (name.includes('mysteryShip')) {
            // Mystery ship (UFO)
            canvas.width = 16;
            canvas.height = 7;
            ctx.fillStyle = '#ff0000';
            
            // Create the pixel pattern for the UFO
            const ufoPixels = [
                [0,0,0,0,1,1,1,1,0,0,0,0],
                [0,0,1,1,1,1,1,1,1,1,0,0],
                [0,1,1,1,1,1,1,1,1,1,1,0],
                [1,1,0,1,0,1,1,0,1,0,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1],
                [0,0,1,0,1,0,0,1,0,1,0,0],
                [0,0,0,1,0,0,0,0,1,0,0,0]
            ];
            
            // Draw the pixel pattern
            for (let y = 0; y < ufoPixels.length; y++) {
                for (let x = 0; x < ufoPixels[y].length; x++) {
                    if (ufoPixels[y][x] === 1) {
                        ctx.fillRect(x+2, y, 1, 1);
                    }
                }
            }
        }
        else if (name.includes('Bullet')) {
            if (name.includes('alien')) {
                // Alien bullet - zigzag shape
                canvas.width = 3;
                canvas.height = 9;
                ctx.fillStyle = '#ffffff';
                
                // Create a zigzag bullet pattern
                ctx.fillRect(1, 0, 1, 1);
                ctx.fillRect(0, 1, 1, 1);
                ctx.fillRect(1, 2, 1, 1);
                ctx.fillRect(2, 3, 1, 1);
                ctx.fillRect(1, 4, 1, 1);
                ctx.fillRect(0, 5, 1, 1);
                ctx.fillRect(1, 6, 1, 1);
                ctx.fillRect(2, 7, 1, 1);
                ctx.fillRect(1, 8, 1, 1);
            } else {
                // Protagonist bullet
                canvas.width = 1;
                canvas.height = 4;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 1, 4);
            }
        }
        else if (name.includes('explosion')) {
            // Explosion effect
            canvas.width = 13;
            canvas.height = 7;
            ctx.fillStyle = '#ffffff';
            
            // Create the classic explosion pattern
            const explosionPixels = [
                [0,1,0,0,1,0,0,0,1,0,0,1,0],
                [0,0,1,0,0,1,0,1,0,0,1,0,0],
                [0,0,0,1,0,0,0,0,0,1,0,0,0],
                [1,1,0,0,0,1,1,1,0,0,0,1,1],
                [0,0,0,1,0,0,0,0,0,1,0,0,0],
                [0,0,1,0,0,1,0,1,0,0,1,0,0],
                [0,1,0,0,1,0,0,0,1,0,0,1,0]
            ];
            
            // Draw the pixel pattern
            for (let y = 0; y < explosionPixels.length; y++) {
                for (let x = 0; x < explosionPixels[y].length; x++) {
                    if (explosionPixels[y][x] === 1) {
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
        else if (name.includes('barrier')) {
            // Barrier/shield segment
            canvas.width = 3;
            canvas.height = 3;
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(0, 0, 3, 3);
        }
        else {
            // Default fallback for any other assets
            canvas.width = 8;
            canvas.height = 8;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 8, 8);
        }
        
        return canvas.toDataURL();
    }

    generateSoundData(name) {
        // Since we can't generate actual sounds easily in the browser,
        // return a very short data URI that won't cause errors
        return 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAA=';
    }

    playSound(name) {
        if (this.sounds[name]) {
            // Clone the sound to allow multiple instances to play simultaneously
            const soundInstance = this.sounds[name].cloneNode();
            soundInstance.volume = 0.3; // Lower volume
            soundInstance.play();
        }
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
ASSETS.loadImage('mysteryShip');

// Load sounds
ASSETS.loadSound('shoot');
ASSETS.loadSound('explosion');
ASSETS.loadSound('hit');
ASSETS.loadSound('alienMove1');
ASSETS.loadSound('alienMove2');
ASSETS.loadSound('alienMove3');
ASSETS.loadSound('alienMove4');
ASSETS.loadSound('mysteryShip'); 