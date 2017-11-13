var request = require('request')
var chalk = require('chalk')
var moment = require('moment')
let scene;
let camera;
let renderer;
let controls;
let zebra;
let landscape;
let mixer;
let prevTime;

const horse = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/51676/horse.json';
class ShieldMaterial extends THREE.ShaderMaterial {

  constructor(params) {
    // Make uniforms unique per instance
    const shader = Object.assign({}, ShieldMaterial.shader, {
      uniforms: Object.assign({}, ShieldMaterial.shader.uniforms, {
        color: { value: params.color },
        offset: { value: params.offset }
      })
    });

    // console.log(scene);

    super(shader);

    this.loop = timestamp => {
      window.requestAnimationFrame(this.loop);
      this.uniforms.time.value = timestamp;
    };

    window.requestAnimationFrame(this.loop);
  }

}

ShieldMaterial.shader = {
  morphTargets: true,
  vertexShader: `
#define GLSLIFY 1
varying vec2 vUv;
varying vec3 vPosition;

#include <morphtarget_pars_vertex>

void main()
{

    #include <begin_vertex>
	#include <morphtarget_vertex>

    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
    vPosition = position;
}
`,
  fragmentShader: `

#ifdef GL_ES
    precision mediump float;
#define GLSLIFY 1
#endif

uniform float time;
uniform float offset;
uniform vec3 color;

varying vec3 vPosition;
varying vec2 vUv;

//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
{
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g_0 = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g_0;
    vec3 i1 = min( g_0.xyz, l.zxy );
    vec3 i2 = max( g_0.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
    dot(p2,x2), dot(p3,x3) ) );
}

float perlin3( vec3 coord ) {

    // float n = 0.0;
    float n = 10.0 * abs( snoise( coord ));
    return n;

}

void main( void ) {
    vec2 uv = (vPosition.zx / vec2(100.0, 100.0));
    float change = 10.0;
    float changeCoord = 14.0;

    if(color.r > 0.1) {
        change = time * 0.001;
        changeCoord = time * 0.0001;
    }

    uv.x = uv.x + change;
    vec3 coord = vec3( uv.xy, changeCoord );


    float n = perlin3( coord.xyz );

    vec3 colors = vec3(
            (255.0 * sin(n * 6.0))
    );

    float head = smoothstep(115.0,0.0,vPosition.z) * smoothstep(-100.0,800.0,vPosition.z);
    vec4 zebrahead = vec4(color, 1.0);

    if(colors.r < 0.1) colors = color;

    gl_FragColor = mix(zebrahead, vec4( colors.r, colors.g, colors.b, 1.0 ), head);

}
`,
  uniforms: {
    time: { value: performance.now() }
  }
};
class LandscapeMaterial extends THREE.ShaderMaterial {

  constructor(params) {
    // Make uniforms unique per instance
    const shader = Object.assign({}, LandscapeMaterial.shader, {
      uniforms: Object.assign({}, LandscapeMaterial.shader.uniforms, {
        color: { value: params.color }
      })
    });

    // console.log(scene);

    super(shader);

    this.loop = timestamp => {
      window.requestAnimationFrame(this.loop);
      this.uniforms.time.value = timestamp;
    };

    window.requestAnimationFrame(this.loop);
  }

}

LandscapeMaterial.shader = {
  blending: THREE.AdditiveBlending,
  transparent: true,
  // wireframe: true,
  vertexShader: `
#define GLSLIFY 1
uniform float time;
varying vec3 vPosition;

//
// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-10-11
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/ashima/webgl-noise
//
vec3 mod289(vec3 x)
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 mod289(vec4 x)
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x)
{
    return mod289(((x*34.0)+1.0)*x);
}
vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}
vec3 fade(vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
}
float cnoise(vec3 P)
{
    vec3 Pi0 = floor(P);
    // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0);
    // Integer part + 1
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0);
    // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}

mat4 rotateMatrixX(float radian) {
    return mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, cos(radian), -sin(radian), 0.0,
        0.0, sin(radian), cos(radian), 0.0,
        0.0, 0.0, 0.0, 1.0
    );
}

mat4 rotateMatrixY(float radian) {
    return mat4(
        cos(radian), 0.0, sin(radian), 0.0,
        0.0, 1.0, 0.0, 0.0,
        -sin(radian), 0.0, cos(radian), 0.0,
        0.0, 0.0, 0.0, 1.0
    );
}

mat4 rotateMatrixZ(float radian) {
    return mat4(
        cos(radian), -sin(radian), 0.0, 0.0,
        sin(radian), cos(radian), 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    );
}

void main(void) {

    float sin1 = sin(radians(position.y / 128.0 * 90.0));

    //speed
    vec3 noisePosition = position + vec3(-time * 0.05, 0.0, 0.0);
    float noise1 = cnoise(noisePosition * 0.02);
    float noise2 = cnoise(noisePosition * 0.08);
    float noise3 = cnoise(noisePosition * 0.4);
    vec3 lastPosition = position + vec3(0.0, 0.0,
                                                noise1 * sin1 * 8.0
                                                + noise2 * sin1 * 8.0
                                                + noise2 * sin1 * 8.0
                                                + noise3 * sin1 * 2.0
                                                + noise3 * sin1 * 1.0
                                                + pow(sin1, 2.0) * 40.0);
    vPosition = lastPosition;

    vec4 mvPosition = modelViewMatrix * vec4( lastPosition, 1.0 );
    // gl_PointSize = floor(20.0 * ( 100.0 / -mvPosition.z ));
    // gl_PointSize = 2.0 * (1.0+ 300.0 / length( mvPosition.xyz ) );
    gl_Position = projectionMatrix * mvPosition;
}
`,
  fragmentShader: `
uniform sampler2D texture;

precision highp float;
#define GLSLIFY 1
varying vec3 vPosition;

void main ()
{

    float dist =  sqrt(dot (vPosition, vPosition));

    mediump vec4 final_color;
    final_color.rgb = vec3(237.0 / 255.0, 201.0 / 255.0, 175.0 / 255.0);
    // final_color.rgb = vec3(194.0 / 255.0, 178.0 / 255.0, 128.0 / 255.0);
    final_color.a = (((80.0 - dist) / 70.0) * 1.0);
    // gl_FragColor = final_color.a * (vec4(final_color.rgb, 1.0));

    float grass = smoothstep(10.0,40.0,dist);
    vec4 grassfield = vec4(96.0/ 255.0, 128.0/ 255.0, 56.0/ 255.0, 1.0);

    gl_FragColor = mix(grassfield, final_color.a * (vec4(final_color.rgb, 1.0)), grass);

    // if ( gl_FragColor.a > 0.9 ) gl_FragColor.rgb = vec3(96.0/ 255.0, 128.0/ 255.0, 56.0/ 255.0);
}
`,
  uniforms: {
    time: { value: performance.now() }
  }
};
function init() {
  initScene();
  loadModel().then(() => {
    requestAnimationFrame(loop);
  });
  window.addEventListener('resize', onResize);
}

function initScene() {
  prevTime = Date.now();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(0, 400, 1200);
  var vector = new THREE.Vector3(0, 100, 0);
  // vector.applyQuaternion( camera.quaternion );
  camera.target = vector;
  // camera.updateMatrix();
  scene.add(camera);

  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    // antialias: true,
    pixelRatio: window.devicePixelRatio,
    antialias: window.devicePixelRatio === 1,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  document.body.appendChild(renderer.domElement);
}

function loadModel() {
  return new Promise((res, rej) => {
    new THREE.JSONLoader().load(horse, geometry => {

      const material = new ShieldMaterial({
        color: new THREE.Color(0x000000),
        offset: 10,
        morphTargets: true
      });
      zebra = new THREE.Mesh(geometry, material);
      zebra.rotation.y = -Math.PI / 2;
      scene.add(zebra);

      let landscapeGeometry = new THREE.PlaneGeometry(128, 128, 128, 128);
      const landscapeMaterial = new LandscapeMaterial({
        color: new THREE.Color(0xffffff)
      });
      landscape = new THREE.Mesh(landscapeGeometry, landscapeMaterial);
      landscape.rotation.x = -Math.PI / 2;
      landscape.scale.set(15.0, 15.0, 15.0);
      scene.add(landscape);

      mixer = new THREE.AnimationMixer(zebra);
      var clip = THREE.AnimationClip.CreateFromMorphTargetSequence('gallop', geometry.morphTargets, 30);
      mixer.clipAction(clip).play();

      res();
    });
  });
}

function loop(timestamp) {
  requestAnimationFrame(loop);

  if (mixer) {
    let time = Date.now();
    mixer.update((time - prevTime) * 0.0005);
    prevTime = time;
  }

  controls.update();

  camera.lookAt(camera.target);
  renderer.render(scene, camera);
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('click', function () {
  zebra.material.uniforms.color.value = new THREE.Color(Math.random() * 0xffffff);
  // console.log(landscape.material.wireframe);
  if(landscape.material.wireframe == false) {
   landscape.material.wireframe = true;
  } else {
   landscape.material.wireframe = false;
  }
});

//init();
