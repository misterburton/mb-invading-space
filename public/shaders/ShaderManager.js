import * as THREE from 'three';
import { setupPostProcessing, startRandomGlitches } from './setup/ShaderSetup.js';

export class ShaderManager {
    constructor(targetCanvas) {
        // Create overlay canvas for shaders
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.pointerEvents = 'none'; // Let clicks pass through
        this.targetCanvas = targetCanvas;
        targetCanvas.parentElement.appendChild(this.overlayCanvas);

        // Setup Three.js renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.overlayCanvas,
            alpha: true 
        });

        // Create simple scene with a plane
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Create texture from game canvas
        this.gameTexture = new THREE.CanvasTexture(targetCanvas);
        
        // Create a plane that fills the view
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicMaterial({ 
            map: this.gameTexture,
            transparent: true 
        });
        this.plane = new THREE.Mesh(geometry, material);
        this.scene.add(this.plane);

        // Match overlay canvas size to target canvas
        this.resize(targetCanvas.width, targetCanvas.height);
        
        // Setup post-processing
        const { composer, badTVPass, rgbShiftPass, staticPass } = 
            setupPostProcessing(this.renderer, this.scene, this.camera);
        
        this.composer = composer;
        this.badTVPass = badTVPass;
        this.rgbShiftPass = rgbShiftPass;
        this.staticPass = staticPass;
        
        // Quality settings
        this.qualityLevel = 'high';
        this.qualitySettings = {
            high: {
                badTV: { distortion: 2.5, distortion2: 1.0, speed: 0.3, rollSpeed: 0.1 },
                rgbShift: { amount: 0.005, angle: 0.0 },
                static: { amount: 0.05, size: 4.0 }
            },
            medium: {
                badTV: { distortion: 1.5, distortion2: 0.6, speed: 0.2, rollSpeed: 0.05 },
                rgbShift: { amount: 0.003, angle: 0.0 },
                static: { amount: 0.03, size: 3.0 }
            }
        };
        
        // Start with effects enabled
        this.setEnabled(true);
        this.setQualityLevel('high');
        
        // Optional: Start random glitches
        startRandomGlitches(badTVPass, staticPass, rgbShiftPass);
    }

    // Add a proper dispose method to clean up resources
    dispose() {
        console.log("Disposing ShaderManager resources");
        
        // Remove the overlay canvas from DOM
        if (this.overlayCanvas && this.overlayCanvas.parentElement) {
            this.overlayCanvas.parentElement.removeChild(this.overlayCanvas);
        }
        
        // Dispose of Three.js resources
        if (this.plane && this.plane.geometry) {
            this.plane.geometry.dispose();
        }
        
        if (this.plane && this.plane.material) {
            this.plane.material.dispose();
            if (this.plane.material.map) {
                this.plane.material.map.dispose();
            }
        }
        
        // Clear scene
        if (this.scene) {
            while (this.scene.children.length > 0) {
                const object = this.scene.children[0];
                this.scene.remove(object);
            }
        }
        
        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            this.renderer.context = null;
            this.renderer.domElement = null;
        }
        
        // Dispose of composer and passes
        if (this.composer) {
            this.composer = null;
        }
        
        // Clear references
        this.badTVPass = null;
        this.rgbShiftPass = null;
        this.staticPass = null;
        this.scene = null;
        this.camera = null;
        this.gameTexture = null;
        this.plane = null;
        this.overlayCanvas = null;
        this.targetCanvas = null;
    }

    resize(width, height) {
        this.overlayCanvas.width = width;
        this.overlayCanvas.height = height;
        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }

    update() {
        if (!this.enabled) return;
        
        // Update texture from game canvas
        this.gameTexture.needsUpdate = true;
        
        // Render effects
        this.composer.render();
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.overlayCanvas.style.display = enabled ? 'block' : 'none';
    }
    
    setQualityLevel(level) {
        if (level === this.qualityLevel || !this.qualitySettings[level]) return;
        
        this.qualityLevel = level;
        const settings = this.qualitySettings[level];
        
        // Apply settings to shader passes
        if (this.badTVPass && settings.badTV) {
            Object.assign(this.badTVPass.uniforms, {
                distortion: { value: settings.badTV.distortion },
                distortion2: { value: settings.badTV.distortion2 },
                speed: { value: settings.badTV.speed },
                rollSpeed: { value: settings.badTV.rollSpeed }
            });
        }
        
        if (this.rgbShiftPass && settings.rgbShift) {
            Object.assign(this.rgbShiftPass.uniforms, {
                amount: { value: settings.rgbShift.amount },
                angle: { value: settings.rgbShift.angle }
            });
        }
        
        if (this.staticPass && settings.static) {
            Object.assign(this.staticPass.uniforms, {
                amount: { value: settings.static.amount },
                size: { value: settings.static.size }
            });
        }
        
        console.log(`Shader quality set to: ${level}`);
    }
} 