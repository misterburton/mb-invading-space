class SoundSystem {
    constructor() {
        // Create audio context
        this.audioCtx = null;
        this.initialized = false;
        this.masterGain = null;
        this.muted = true; // Changed from true to false - sounds enabled by default
        
        // Track active sounds
        this.activeSounds = {};
        
        // Sound effects parameters
        this.sounds = {
            shoot: { frequency: 400, type: 'square', duration: 0.15, decay: 0.2 },
            explosion: { frequency: 80, type: 'sawtooth', duration: 0.4, decay: 0.1 },
            alienMove1: { frequency: 480, type: 'square', duration: 0.1, decay: 0.1 },
            alienMove2: { frequency: 440, type: 'square', duration: 0.1, decay: 0.1 },
            alienMove3: { frequency: 400, type: 'square', duration: 0.1, decay: 0.1 },
            alienMove4: { frequency: 360, type: 'square', duration: 0.1, decay: 0.1 },
            mysteryShip: { frequency: 300, type: 'square', duration: 0.1, decay: 0.01, repeat: true },
            hit: { frequency: 100, type: 'sawtooth', duration: 0.3, decay: 0.2 },
        };
        
        // Add event listeners for user interaction
        this.addUserInteractionListeners();
    }
    
    addUserInteractionListeners() {
        // List of events that count as user interaction
        const interactionEvents = ['click', 'touchstart', 'keydown'];
        
        const initOnInteraction = () => {
            this.init();
            // Remove all event listeners after first interaction
            interactionEvents.forEach(event => {
                document.removeEventListener(event, initOnInteraction);
            });
        };
        
        // Add listeners for all interaction events
        interactionEvents.forEach(event => {
            document.addEventListener(event, initOnInteraction, { once: false });
        });
    }
    
    init() {
        // Initialize on first user interaction to comply with browsers' autoplay policy
        if (this.initialized) return;
        
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.3; // Set volume to 30%
            this.masterGain.connect(this.audioCtx.destination);
            this.initialized = true;
            
            console.log('Audio system initialized');
        } catch (e) {
            console.error('Web Audio API not supported:', e);
        }
    }
    
    playSound(name) {
        if (this.muted) return; // Skip playing sounds if muted
        
        if (!this.initialized) {
            this.init();
            if (!this.initialized) return; // Still not initialized
        }
        
        const soundParams = this.sounds[name];
        if (!soundParams) return;
        
        // For certain sounds, stop previous instances
        if (name === 'mysteryShip' || name === 'explosion' || name === 'hit') {
            this.stopSound(name);
        }
        
        // Create oscillator
        const oscillator = this.audioCtx.createOscillator();
        oscillator.type = soundParams.type;
        oscillator.frequency.value = soundParams.frequency;
        
        // Create gain node for envelope
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 1;
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Start sound
        const now = this.audioCtx.currentTime;
        oscillator.start(now);
        
        // Apply volume envelope
        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + soundParams.duration);
        
        // Create sound object
        const soundObj = {
            oscillator,
            gainNode,
            stop: () => {
                try {
                    gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(
                        0.01, 
                        this.audioCtx.currentTime + 0.1
                    );
                    setTimeout(() => {
                        try {
                            oscillator.stop();
                        } catch (e) {
                            // Ignore errors if oscillator already stopped
                        }
                    }, 100);
                } catch (e) {
                    console.error("Error stopping sound:", e);
                }
            }
        };
        
        // Special handling for mystery ship sound (repeating)
        if (soundParams.repeat && name === 'mysteryShip') {
            // Keep playing until the sound is stopped explicitly
            let isPlaying = true;
            const repeatInterval = 0.2; // seconds between repeats
            
            const scheduleNext = () => {
                if (!isPlaying) return;
                
                try {
                    oscillator.frequency.setValueAtTime(
                        soundParams.frequency * (Math.random() * 0.1 + 0.95),
                        this.audioCtx.currentTime
                    );
                    
                    gainNode.gain.setValueAtTime(1, this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(
                        0.3, 
                        this.audioCtx.currentTime + soundParams.duration * 0.8
                    );
                    
                    setTimeout(scheduleNext, repeatInterval * 1000);
                } catch (e) {
                    // If an error occurs, stop scheduling
                    isPlaying = false;
                }
            };
            
            // Schedule first repeat
            setTimeout(scheduleNext, repeatInterval * 1000);
            
            // Add stop method that also stops the repeating
            soundObj.stop = () => {
                isPlaying = false;
                try {
                    gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(
                        0.01, 
                        this.audioCtx.currentTime + 0.1
                    );
                    setTimeout(() => {
                        try {
                            oscillator.stop();
                        } catch (e) {
                            // Ignore errors if oscillator already stopped
                        }
                    }, 100);
                } catch (e) {
                    console.error("Error stopping mystery ship sound:", e);
                }
            };
            
            // Save the active sound
            this.activeSounds[name] = soundObj;
            return soundObj;
        } else {
            // Stop sound after duration
            oscillator.stop(now + soundParams.duration);
            
            // For brief sounds, no need to track them
            return soundObj;
        }
    }
    
    stopSound(name) {
        if (this.activeSounds[name]) {
            try {
                this.activeSounds[name].stop();
            } catch (e) {
                console.error(`Error stopping sound ${name}:`, e);
            }
            delete this.activeSounds[name];
        }
    }
    
    // Set the muted state of the sound system
    setMuted(muted) {
        this.muted = muted;
        
        // If we're muting, stop all currently playing sounds
        if (muted) {
            this.stopAllSounds();
        }
        
        // If we have an audio context, adjust the master gain
        if (this.initialized && this.masterGain) {
            // Smoothly transition volume
            const now = this.audioCtx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
            this.masterGain.gain.linearRampToValueAtTime(
                muted ? 0 : 0.3, // 0 if muted, otherwise 30%
                now + 0.2 // Transition over 0.2 seconds
            );
        }
        
        console.log(`Sound ${muted ? 'muted' : 'unmuted'}`);
    }
    
    // Toggle between muted and unmuted states
    toggleMute() {
        this.setMuted(!this.muted);
    }
    
    // Space Invaders-specific sound effects
    playAlienMove(step) {
        const soundName = `alienMove${(step % 4) + 1}`;
        this.playSound(soundName);
    }
    
    // Stop all active sounds
    stopAllSounds() {
        for (const name in this.activeSounds) {
            this.stopSound(name);
        }
    }
    
    // Add a proper dispose method to clean up audio resources
    dispose() {
        console.log("Disposing SoundSystem resources");
        
        // Stop all active sounds
        this.stopAllSounds();
        
        // Close audio context if it exists and is not already closed
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            try {
                // In some browsers, close() might not be available
                if (typeof this.audioCtx.close === 'function') {
                    this.audioCtx.close();
                    console.log("Audio context closed");
                }
            } catch (e) {
                console.error("Error closing audio context:", e);
            }
        }
        
        // Clear references
        this.activeSounds = {};
        this.masterGain = null;
        
        // Mark as uninitialized so it can be reinitialized if needed
        this.initialized = false;
    }
}

// Create global sound system instance
const SOUND_SYSTEM = new SoundSystem();

// Remove this listener since we now handle it in the class
// document.addEventListener('click', () => {
//     SOUND_SYSTEM.init();
// }, { once: true }); 