// Harbor Run — terrain: analytic heightfield, coast, and runway pads.
// Deterministic: the same (x, z) always gives the same height, so every
// screenshot and every replay of the game see the same island.

import { WORLD } from './config.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gentle rolling hills, plus a ridge that rises toward the north cliffs.
function hillHeight(x, z) {
  const a = 16 * Math.sin(x * 0.0038 + 1.7) * Math.cos(z * 0.0029 + 0.4);
  const b = 11 * Math.sin(x * 0.0105 + 0.2) * Math.sin(z * 0.0068 + 2.1);
  const c = 7 * Math.sin(x * 0.021 + 3.1) * Math.cos(z * 0.013 + 0.9);
  const ridge = Math.max(0, (-z - 350) * 0.045); // northern cliffs
  const south = Math.max(0, (z - 420) * 0.02); // southern rise
  return 26 + a + b + c + ridge + south;
}

// The sea eats the south-west bay and the far south shore.
function seaDepth(x, z) {
  const bay = Math.max(0, 1 - Math.hypot((x - 2600) / 1500, (z + 900) / 700));
  const southShore = Math.max(0, (z - 520) / 260);
  return Math.max(bay * 26, southShore * 30);
}

function runwayBlend(x, z) {
  // Returns 0..1: how strongly this point belongs to a runway pad.
  let best = 0;
  for (const leg of WORLD.legs) {
    const r = leg.runway;
    const dx = x - r.x;
    const dz = z - r.z;
    const along = Math.abs(dx) / (r.length / 2 + 90);
    const across = Math.abs(dz) / (r.width / 2 + 70);
    const d = Math.max(along, across);
    best = Math.max(best, d < 1 ? 1 - d * d : 0);
  }
  return best;
}

export function terrainHeight(x, z) {
  const hills = hillHeight(x, z);
  const sea = seaDepth(x, z);
  let h = hills - sea;
  const pad = runwayBlend(x, z);
  if (pad > 0) h = h * (1 - pad) + WORLD.runwayHeight * pad;
  return h;
}

export function isWater(x, z) {
  return terrainHeight(x, z) < 1.5;
}

export function runwayAt(x, z) {
  for (const leg of WORLD.legs) {
    const r = leg.runway;
    if (
      Math.abs(x - r.x) <= r.length / 2 &&
      Math.abs(z - r.z) <= r.width / 2
    ) {
      return r;
    }
  }
  return null;
}

// Deterministic decoration: clouds, harbour town rooftops, lighthouse, buoys.
export const CLOUDS = (() => {
  const rnd = mulberry32(20261126);
  const list = [];
  for (let i = 0; i < 46; i++) {
    list.push({
      x: 400 + rnd() * 19600,
      z: -1400 + rnd() * 2400,
      alt: 420 + rnd() * 260,
      size: 60 + rnd() * 150,
    });
  }
  return list;
})();

export const TOWN = (() => {
  // Rooftops clustered near the first runway, on the flat by the bay.
  const rnd = mulberry32(777);
  const list = [];
  for (let i = 0; i < 26; i++) {
    const x = 4600 + rnd() * 900;
    const z = 180 + rnd() * 320;
    list.push({ x, z, w: 18 + rnd() * 26, d: 14 + rnd() * 20, h: 8 + rnd() * 14 });
  }
  return list;
})();

export const LIGHTHOUSE = { x: 2900, z: -620, height: 46 };

export const BUOYS = (() => {
  const rnd = mulberry32(4242);
  const list = [];
  for (let i = 0; i < 14; i++) {
    list.push({ x: 1200 + rnd() * 17000, z: -560 - rnd() * 320 });
  }
  return list;
})();
