/* 화면 마무리(디더링·알갱이·비네트) — world.js 와 같은 셰이더. opening.js 가 씀 */
import * as THREE from "../vendor/three.module.min.js";
export function makePost() {
  const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const post = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uStatic: { value: 0 }, uDark: { value: 0 }, uFear: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uStatic, uDark, uFear; varying vec2 vUv;
      float bayer(vec2 p){ ivec2 q = ivec2(mod(p, 4.)); int i = q.x + q.y * 4;
        float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return m[i] / 16. - .5; }
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.) * 43758.5453); }
      void main(){
        vec2 uv = vUv; vec2 d = uv - .5;
        uv += d * dot(d, d) * uFear * .08 * sin(uTime * 3.);
        vec3 c = texture2D(tDiffuse, uv).rgb;
        c = pow(max(c, 0.), vec3(1. / 2.2));
        c = mix(c, vec3(dot(c, vec3(.3, .59, .11))), uFear * .5);
        vec2 px = floor(uv * uRes);
        float lv = 14.;
        c = floor(c * lv + bayer(px) * .55 + .5) / lv;
        c *= 1. - dot(d, d) * (1.4 + uFear);
        c += (rnd(px) - .5) * .035;
        if (uStatic > 0.) { c = mix(c, vec3(rnd(px)), uStatic * .6); c += step(.96, fract(vUv.y * 9. + uTime * 2.3)) * uStatic * .35; }
        c *= 1. - uDark;
        gl_FragColor = vec4(c, 1.);
      }`,
    depthTest: false, depthWrite: false
  });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  return { rt, post, scene, cam };
}
