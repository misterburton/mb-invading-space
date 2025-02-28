import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BadTVShader } from '../BadTVShader.js';        // Updated path
import { StaticShader } from '../StaticShader.js';      // Updated path
import { RGBShiftShader } from '../RGBShiftShader.js';  // Updated path

export function setupPostProcessing(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);
    
    // 1. Base render
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 2. Add TV effects first
    const badTVPass = new ShaderPass(BadTVShader);
    badTVPass.uniforms.distortion.value = 0.1;
    badTVPass.uniforms.distortion2.value = 0.6;
    badTVPass.uniforms.speed.value = 0.1;
    badTVPass.uniforms.rollSpeed.value = 0.01;
    composer.addPass(badTVPass);

    // 3. Add RGB shift
    const rgbShiftPass = new ShaderPass(RGBShiftShader);
    rgbShiftPass.uniforms.amount.value = 0.006;
    rgbShiftPass.uniforms.angle.value = Math.PI * 0.9;
    composer.addPass(rgbShiftPass);

    // 4. Add static
    const staticPass = new ShaderPass(StaticShader);
    staticPass.uniforms.amount.value = 0.1;
    staticPass.uniforms.size.value = 1.0;
    composer.addPass(staticPass);

    // Store original meshes
    const textMeshes = scene.children.filter(child => child.type === 'Mesh' && child.material.transparent);
    textMeshes.forEach(mesh => {
        mesh.renderOrder = 999;
    });

    return { composer, badTVPass, rgbShiftPass, staticPass };
}

export function randomizeEffects(badTVPass, staticPass, rgbShiftPass, gui = null) {
    try {
        // Apply effects to passes
        if (badTVPass?.uniforms) {
            badTVPass.uniforms.distortion.value = Math.random() * .5;
            badTVPass.uniforms.distortion2.value = Math.random() * .5;
            badTVPass.uniforms.speed.value = Math.random() * 0;
            badTVPass.uniforms.rollSpeed.value = Math.random() * 0;
        }
        
        if (staticPass?.uniforms) {
            staticPass.uniforms.amount.value = Math.random();
            staticPass.uniforms.size.value = Math.random() * .5;
        }
        
        if (rgbShiftPass?.uniforms) {
            rgbShiftPass.uniforms.amount.value = Math.random() * 0.006;
            rgbShiftPass.uniforms.angle.value = Math.random() * Math.PI * 1;
        }
    } catch (error) {
        console.error('Error in randomizeEffects:', error);
    }
}

// Store initial shader values
const initialValues = {
    distortion: 0.1,
    distortion2: 0.3,
    speed: 0.1,
    rollSpeed: 0,
    staticAmount: 0.1,
    staticSize: 1.0,
    rgbAmount: 0.003,
    rgbAngle: Math.PI * 0.9
};

export function startRandomGlitches(badTVPass, staticPass, rgbShiftPass, gui) {
    gsap.delayedCall(.5, function badTVRandomize() {
        randomizeEffects(badTVPass, staticPass, rgbShiftPass, gui);
        
        gsap.delayedCall(Math.random() * 1 + .5, function backToInitValues() {
            // Reset shader values correctly
            badTVPass.uniforms.distortion.value = initialValues.distortion;
            badTVPass.uniforms.distortion2.value = initialValues.distortion2;
            badTVPass.uniforms.speed.value = initialValues.speed;
            badTVPass.uniforms.rollSpeed.value = initialValues.rollSpeed;
            staticPass.uniforms.amount.value = initialValues.staticAmount;
            staticPass.uniforms.size.value = initialValues.staticSize;
            rgbShiftPass.uniforms.amount.value = initialValues.rgbAmount;
            rgbShiftPass.uniforms.angle.value = initialValues.rgbAngle;

            gsap.delayedCall(Math.random() * 7, badTVRandomize);
        });
    });
}