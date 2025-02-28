import * as THREE from 'three';

export const LiquidShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "mousePos": { value: new THREE.Vector2(0.5, 0.5) },
        "prevMousePos": { value: new THREE.Vector2(0.5, 0.5) },
        "time": { value: 0 },
        "strength": { value: 0 }
    },

    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 mousePos;
        uniform vec2 prevMousePos;
        uniform float time;
        uniform float strength;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            
            // Calculate direction of movement
            vec2 movement = mousePos - prevMousePos;
            float moveLength = length(movement);
            
            // Calculate distance from current UV to mouse position
            vec2 fromMouse = uv - mousePos;
            float distFromMouse = length(fromMouse);
            
            // Create smoother falloff for more liquid-like behavior
            float influence = smoothstep(12.2, 0.0, distFromMouse) * strength;
            
            // Simplified displacement calculation
            vec2 displacement = normalize(fromMouse) * influence * moveLength * 2.5;
            
            // Increase base RGB separation
            float aberrationStrength = influence * 1.15; // Increased from 0.05
            
            // Add slight permanent offset for more CRT feel
            vec2 baseOffset = normalize(fromMouse) * 0.005;
            
            // Apply stronger chromatic aberration with base offset
            vec2 uvR = uv - displacement * (1.0 + aberrationStrength) - baseOffset;
            vec2 uvG = uv - displacement;
            vec2 uvB = uv - displacement * (1.0 - aberrationStrength) + baseOffset;
            
            vec4 colorR = texture2D(tDiffuse, uvR);
            vec4 colorG = texture2D(tDiffuse, uvG);
            vec4 colorB = texture2D(tDiffuse, uvB);
            
            gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
        }
    `
};
