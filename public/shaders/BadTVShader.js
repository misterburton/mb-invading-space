export const BadTVShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "time": { value: 0.0 },
        "distortion": { value: 3.0 },
        "distortion2": { value: 5.0 },
        "speed": { value: 0.2 },
        "rollSpeed": { value: 0.1 },
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
        uniform float time;
        uniform float distortion;
        uniform float distortion2;
        uniform float speed;
        uniform float rollSpeed;
        varying vec2 vUv;
        
        // Start Ashima 2D Simplex Noise
        vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec2 mod289(vec2 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec3 permute(vec3 x) {
            return mod289(((x*34.0)+1.0)*x);
        }
        
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187,
                            0.366025403784439,
                            -0.577350269189626,
                            0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                dot(x12.zw,x12.zw)), 0.0);
            m = m*m;
            m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
            vec3 g;
            g.x = a0.x * x0.x + h.x * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }
        
        void main() {
            vec2 p = vUv;
            float ty = time * speed;
            float yt = p.y - ty;
            
            // Simple distortion
            float offset = snoise(vec2(yt*3.0,0.0))*0.2;
            offset = offset*distortion * offset*distortion * offset;
            
            // Fine grain distortion
            offset += snoise(vec2(yt*50.0,0.0))*distortion2*0.001;
            
            // Combine distortion on X with roll on Y
            gl_FragColor = texture2D(tDiffuse, vec2(fract(p.x + offset),fract(p.y-time*rollSpeed)));
        }
    `
};
