import * as THREE from './three.module.js';

const fragmentShader = `
    #ifdef GL_ES
    precision mediump float;
    #endif
    
    varying vec2 faceCoords;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    
    #define PI 3.141592653
    #define TWO_PI 6.283185
    
    float box(float x1, float y1, float x2, float y2, in vec2 st) {
        vec2 xy = step(vec2(x1, y1), st) - step(vec2(x2, y2), st);
        return xy.x * xy.y;
    }
    
    float circle(in vec2 xy, float r, vec2 st) {
        return 1. - smoothstep(r-0.005, r+0.005, distance(xy, st));
    }
    
    float xor(float a, float b) {
        return a != b ? 1. : 0.;
    }
    
    vec3 background = vec3(0.);
    
    
    float polygon(float N, float R, in vec2 uv) {
        vec2 fromCentre = uv - vec2(0.5);
        float angle = atan(fromCentre.y, fromCentre.x);
        float dist = length(fromCentre);
        float A = mod(angle, TWO_PI/N);
        float maxDist = (R * sin(PI/2. - PI/N)) / sin(PI/2. + PI/N - A);
        float pattern = 1. - smoothstep(maxDist * 0.99, maxDist * 1.01, dist);
        return pattern;
    }
    
    float polygonOutline(float N, float R, float width, in vec2 st) {
        return polygon(N, R, st) - polygon(N, R-width, st);
    }
    
    mat2 rotate2d(float a) {
        return mat2(cos(a), -sin(a),
                    sin(a),  cos(a));
    }
    
    mat2 rotate2dClockwise(float a) {
        return rotate2d(-a);
    }
    
    vec2 rotateAbout(float a, in vec2 about, in vec2 st) {
        st -= about;
        st = rotate2dClockwise(a) * st;
        st += about;
        return st;
    }
    
    mat2 scale(in vec2 scaleFactor) {
        return mat2(1./scaleFactor.x, 0., 0., 1./scaleFactor.y);
    }
    
    vec2 scaleAbout(in vec2 st, in vec2 scaleFactor, in vec2 about) {
        st -= about;
        st = scale(scaleFactor) * st;
        st += about;
        return st;
    }
    
    vec2 translate(in vec2 uv, in vec2 tr) {
        return vec2(uv.x - tr.x, uv.y - tr.y);
    }
    
    float vline(in vec2 start, in vec2 end, float width, in vec2 st) {
        float y1 = min(start.y, end.y);
        float y2 = max(start.y, end.y);
        return box(start.x-width/2., y1, end.x+width/2., y2, st);
    }
    
    float hline(in vec2 start, in vec2 end, float width, in vec2 st) {
        float x1 = min(start.x, end.x);
        float x2 = max(start.x, end.x);
        return box(x1, start.y-width/2., x2, end.y+width/2., st);
    }
    
    vec3 rgb(float r, float g, float b) {
        return vec3(r / 256., g / 256., b / 256.);
    }
    
    float not(float a) {
        return 1. - a;
    }
    
    vec2 not(vec2 a) {
        return 1. - a;
    }
    
    vec3 plot(float y, vec3 bg, vec3 fg, vec2 st) {
        float alpha = smoothstep(y-.01, y, st.y) - smoothstep(y, y+.01, st.y);
        return mix(bg, fg, alpha);
    }
    
    float rand (vec2 st) {
        return fract(sin(dot(st.xy,
                             vec2(12.9898,78.233)))*
            43758.5453123);
    }
    
    float rand(float seed) {
        return rand(vec2(seed));
    }
    
    void main() {
        vec2 st = faceCoords;
        vec2 uv = smoothstep(0., 1., floor(st * 10.));
        vec3 color = rgb(99., 65., 44.);
        vec3 light = rgb(181., 130., 90.);
        vec3 darkmed = rgb(119., 84., 58.);
        vec3 med = rgb(147., 106., 73.);
        vec3 dark = rgb(87., 60., 40.);
        vec3 grey = rgb(132., 132., 132.);
        color = mix(color, light, smoothstep(0.8-0.2, 0.8+0.2, rand(uv.xy)));
        color = mix(color, dark, smoothstep(.8-0.2, .8+0.2, rand(uv.xy + .3)));
        color = mix(color, med, smoothstep(.6-0.2, .6+0.2, rand(uv.xy - .3)));
        color = mix(color, darkmed, smoothstep(.7-0.2, .7+0.2, rand(uv.xy - .6)));
        color = mix(color, grey, smoothstep(.95-0.2, .95+0.2, rand(uv.xy + .6)));
        gl_FragColor = vec4(color, 1.);
    }
`



const vertexShader = `
    varying vec2 faceCoords;

    void main() {
        faceCoords = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`



function setupCanvas() {
    const canvas = document.querySelector("#main-canvas");
    const {width, height} = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const gl = canvas.getContext('webgl');
    return { width: canvas.width, height: canvas.height, gl, canvas };
}


const { width, height, gl, canvas } = setupCanvas();
if (gl === null) alert("Browser doesn't support WebGL.");


gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
const aspect = width / height;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);

const uniforms = {
    u_resolution: {value: [width, height]},
    u_mouse: { value: [0, 0] },
    u_time: 0
}
// const quad = new THREE.Mesh(
//     new THREE.PlaneGeometry(width, height),
//     new THREE.ShaderMaterial({ fragmentShader, uniforms })
// );
// scene.add(quad);
const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
// const material = new THREE.MeshBasicMaterial();
const geometry = new THREE.BoxGeometry(50, 50, 50);
const box = new THREE.Mesh(
    geometry,
    [material, material, material, material, material, material],
);
scene.add(box);


camera.position.z = 100;
camera.position.y = 70;
camera.position.x = 45;

camera.lookAt(new THREE.Vector3(0, 0, 0));


function lerp(value, inLow, inHigh, outLow, outHigh) {
    return (value - inLow) / (inHigh - inLow) * (outHigh - outLow) + outLow;
}

canvas.addEventListener('pointermove', function pointerMove(event) {
    uniforms.u_mouse.value[0] = event.offsetX;
    uniforms.u_mouse.value[1] = -event.offsetY;
    camera.position.x = lerp(event.offsetX, 0, width, -60, 60);
    camera.position.y = lerp(event.offsetY, 0, height, 60, -60);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
});


function render() {
    uniforms.u_time = performance.now();
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

render();