// The two times of the house, in one material.
//
// Every surface knows how it looked in 1987 (Tab) and how it looks now (Ab).
// Inside the radius of a warm light it draws as Tab; outside, as Ab. The
// boundary isn't a clean circle: it wobbles with noise and the flame's
// flicker, and has a thin ember rim, so the past seems to burn back into
// the present at the edge of the light.
//
// Modes:
//   "both" — one surface, two looks (walls, floors, the table)
//   "tab"  — exists only in the light (the kitchen floor over the tank,
//            the 1987 courtyard through the jaali, the food)
//   "ab"   — exists only in the dark (rubble, roots, rust, the clocks)

import * as THREE from "three";

export const MAX_ERA_LIGHTS = 6;

// Shared by every era material: the game writes the lights here each frame.
export const ERA = {
  lights: { value: Array.from({ length: MAX_ERA_LIGHTS }, () => new THREE.Vector4(0, -100, 0, 0)) },
  force: { value: 0 }, // 1 = everything is Tab (the prologue)
  time: { value: 0 },
  soft: { value: 0.3 },
};

const MODES = { both: 0, tab: 1, ab: 2 };

const COMMON = /* glsl */ `
uniform vec4 uEraLights[${MAX_ERA_LIGHTS}];
uniform float uEraForce;
uniform float uEraTime;
uniform float uEraSoft;
varying vec3 vEraPos;
varying vec2 vEraUv;

float eraHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float eraNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(eraHash(i + vec3(0, 0, 0)), eraHash(i + vec3(1, 0, 0)), f.x),
                 mix(eraHash(i + vec3(0, 1, 0)), eraHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(eraHash(i + vec3(0, 0, 1)), eraHash(i + vec3(1, 0, 1)), f.x),
                 mix(eraHash(i + vec3(0, 1, 1)), eraHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// 1 inside the light (1987), 0 outside (now).
float eraMask(vec3 p) {
  float n = eraNoise(p * 3.1 + vec3(0.0, uEraTime * 0.35, 0.0)) * 0.65
          + eraNoise(p * 9.0 - vec3(uEraTime * 0.5)) * 0.35;
  float m = 0.0;
  for (int i = 0; i < ${MAX_ERA_LIGHTS}; i++) {
    vec4 l = uEraLights[i];
    if (l.w <= 0.0) continue;
    float d = distance(p, l.xyz) + (n - 0.5) * 0.45;
    m = max(m, smoothstep(l.w, l.w - uEraSoft, d));
  }
  return max(m, uEraForce);
}
`;

// params: everything a MeshStandardMaterial takes (these are the Tab look),
// plus `ab: { color, map }` for the Ab look and `mode`.
export function eraMaterial({ mode = "both", ab = {}, ...params } = {}) {
  const material = new THREE.MeshStandardMaterial(params);
  // Something that only exists now takes its look from the plain params.
  const abColor = new THREE.Color(ab.color ?? params.color ?? 0xffffff);
  const abMap = ab.map ?? (mode === "ab" ? params.map ?? null : null);
  const abRough = ab.roughness ?? material.roughness;
  material.defines = { ERA_MODE: MODES[mode] };
  if (abMap) material.defines.ERA_ABMAP = "";
  material.userData.era = { mode, abColor, abMap };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEraLights = ERA.lights;
    shader.uniforms.uEraForce = ERA.force;
    shader.uniforms.uEraTime = ERA.time;
    shader.uniforms.uEraSoft = ERA.soft;
    shader.uniforms.uAbColor = { value: abColor };
    shader.uniforms.uAbMap = { value: abMap };
    shader.uniforms.uAbRough = { value: abRough };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vEraPos;\nvarying vec2 vEraUv;`)
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec4 eraWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          eraWorld = instanceMatrix * eraWorld;
        #endif
        vEraPos = (modelMatrix * eraWorld).xyz;
        vEraUv = uv;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${COMMON}\nuniform vec3 uAbColor;\nuniform sampler2D uAbMap;\nuniform float uAbRough;\nfloat eraM;`)
      .replace(
        "#include <map_fragment>",
        `eraM = eraMask(vEraPos);
        #if ERA_MODE == 1
          if (eraM < 0.5) discard;
        #elif ERA_MODE == 2
          if (eraM > 0.5) discard;
        #endif
        vec4 eraTab = diffuseColor;
        #ifdef USE_MAP
          eraTab *= texture2D(map, vMapUv);
        #endif
        vec4 eraAb = vec4(uAbColor, diffuseColor.a);
        #ifdef ERA_ABMAP
          eraAb *= texture2D(uAbMap, vEraUv);
        #endif
        diffuseColor = mix(eraAb, eraTab, eraM);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(uAbRough, roughnessFactor, eraM);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float eraRim = 4.0 * eraM * (1.0 - eraM);
        eraRim = pow(eraRim, 6.0) * (1.0 - uEraForce);
        totalEmissiveRadiance += eraRim * vec3(1.0, 0.3, 0.05) * 1.0;`,
      );
  };
  return material;
}

// Write the frame's lights into the shared uniform. lights: [{x,y,z,radius}]
export function setEraLights(lights, time, force = 0) {
  const slots = ERA.lights.value;
  for (let i = 0; i < MAX_ERA_LIGHTS; i += 1) {
    const l = lights[i];
    if (l && l.radius > 0) slots[i].set(l.x, l.y, l.z, l.radius);
    else slots[i].set(0, -100, 0, 0);
  }
  ERA.time.value = time;
  ERA.force.value = force;
}
