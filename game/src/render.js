// Harbor Run — renderer part 1: sky, ground grid, runway, rings, scenery.
// Everything is drawn on one 2D canvas from the projected world.

import { COLORS, VIEW } from './config.js';
import { makeCamera, project, screenDirection } from './project.js';
import {
  terrainHeight,
  isWater,
  CLOUDS,
  TOWN,
  LIGHTHOUSE,
  BUOYS,
} from './terrain.js';

function hexRgb(color) {
  if (color.startsWith('rgb')) {
    return color.slice(4, -1).split(',').map((v) => Number(v.trim()));
  }
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const ca = hexRgb(a);
  const cb = hexRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function fogColor(base, dist) {
  const t = Math.max(0, Math.min(1, dist / VIEW.far));
  return mix(base, COLORS.skyHorizon, t * 0.75);
}

function groundColor(x, z, h) {
  if (h < 1.5) return h < -4 ? COLORS.waterDeep : COLORS.water;
  if (h < 3.5) return COLORS.sand;
  if (h > 58) return COLORS.rock;
  const checker = (Math.floor(x / 130) + Math.floor(z / 130)) % 2 === 0;
  const base = checker ? COLORS.fieldA : COLORS.fieldB;
  return mix(base, COLORS.grassHigh, Math.min(1, (h - 20) / 45));
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawSky(ctx, cam, plane, width, height) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.55, COLORS.skyHorizon);
  grad.addColorStop(1, '#cfe3ee');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  // Sun, fixed to the west so the light stays put as you turn.
  const sunAz = 2.7;
  let rel = sunAz - plane.heading;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  if (Math.abs(rel) < 1.3) {
    const sx = width / 2 + Math.sin(rel) * width * 0.55;
    const sy = height * 0.16 + Math.tan(plane.pitch) * cam.focal * 0.6;
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90);
    glow.addColorStop(0, 'rgba(255,243,196,0.95)');
    glow.addColorStop(0.25, 'rgba(255,240,180,0.55)');
    glow.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 95, sy - 95, 190, 190);
    ctx.fillStyle = COLORS.sun;
    ctx.beginPath();
    ctx.arc(sx, sy, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  // Far ground base: a fog-coloured wash below the horizon line so the
  // grid never leaves a gap of sky under the world.
  const horizonY = height / 2 + Math.tan(plane.pitch) * cam.focal;
  ctx.save();
  ctx.translate(width / 2, horizonY);
  ctx.rotate(-plane.bank);
  ctx.fillStyle = mix(COLORS.grassLow, COLORS.skyHorizon, 0.55);
  ctx.fillRect(-width, 0, width * 2, height);
  ctx.restore();
}

function drawGround(ctx, cam, plane) {
  const width = cam.width;
  const fwdX = Math.cos(plane.heading);
  const fwdZ = -Math.sin(plane.heading);
  const rightX = Math.sin(plane.heading);
  const rightZ = Math.cos(plane.heading);
  const rows = VIEW.groundRows;
  const cols = VIEW.groundCols;
  // Precompute grid points: rows are distances ahead, columns lateral.
  const grid = [];
  for (let r = 0; r < rows.length; r++) {
    const d = rows[r];
    const spread = d * 0.9 + 30;
    const row = [];
    for (let c = 0; c <= cols; c++) {
      const lat = -spread + (2 * spread * c) / cols;
      const x = cam.cx + fwdX * d + rightX * lat;
      const z = cam.cz + fwdZ * d + rightZ * lat;
      const y = terrainHeight(x, z);
      row.push({ p: project(cam, x, y, z), x, z, y, d });
    }
    grid.push(row);
  }
  // Draw far to near so near cells overlap far ones.
  for (let r = grid.length - 2; r >= 0; r--) {
    const near = grid[r];
    const far = grid[r + 1];
    for (let c = 0; c < cols; c++) {
      const a = near[c];
      const b = near[c + 1];
      const cc = far[c + 1];
      const dd = far[c];
      if (!a.p || !b.p || !cc.p || !dd.p) continue;
      const h = (a.y + b.y + cc.y + dd.y) / 4;
      ctx.fillStyle = fogColor(groundColor((a.x + cc.x) / 2, (a.z + cc.z) / 2, h), a.d);
      poly(ctx, [a.p, b.p, cc.p, dd.p]);
    }
  }
}

function drawRunway(ctx, cam, leg) {
  const r = leg.runway;
  const halfL = r.length / 2;
  const halfW = r.width / 2;
  const step = 40;
  for (let d = -halfL; d < halfL; d += step) {
    const x0 = r.x + d;
    const x1 = r.x + Math.min(d + step, halfL);
    const p1 = project(cam, x0, WORLD_RUNWAY_Y, r.z - halfW);
    const p2 = project(cam, x1, WORLD_RUNWAY_Y, r.z - halfW);
    const p3 = project(cam, x1, WORLD_RUNWAY_Y, r.z + halfW);
    const p4 = project(cam, x0, WORLD_RUNWAY_Y, r.z + halfW);
    if (!p1 || !p2 || !p3 || !p4) continue;
    const dist = p1.z;
    ctx.fillStyle = fogColor(COLORS.runway, dist);
    poly(ctx, [p1, p2, p3, p4]);
    // Centreline dash on every other segment.
    if (Math.round(d / step) % 2 === 0) {
      const q1 = project(cam, x0 + 4, WORLD_RUNWAY_Y + 0.2, r.z - 1.2);
      const q2 = project(cam, x1 - 4, WORLD_RUNWAY_Y + 0.2, r.z - 1.2);
      const q3 = project(cam, x1 - 4, WORLD_RUNWAY_Y + 0.2, r.z + 1.2);
      const q4 = project(cam, x0 + 4, WORLD_RUNWAY_Y + 0.2, r.z + 1.2);
      if (q1 && q2 && q3 && q4) {
        ctx.fillStyle = fogColor('#f4f4f4', dist);
        poly(ctx, [q1, q2, q3, q4]);
      }
    }
    // Edge lights.
    const e1 = project(cam, x0, WORLD_RUNWAY_Y + 0.4, r.z - halfW - 1);
    const e2 = project(cam, x0, WORLD_RUNWAY_Y + 0.4, r.z + halfW + 1);
    for (const e of [e1, e2]) {
      if (!e) continue;
      const s = Math.max(1.5, 260 / e.z);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(e.x, e.y, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// The runway pads sit at a fixed height; keep the constant beside the code
// that uses it so the number is never magic in two places.
const WORLD_RUNWAY_Y = 14;

function drawScenery(ctx, cam) {
  // Lighthouse on the bay point.
  const lb = project(cam, LIGHTHOUSE.x, terrainHeight(LIGHTHOUSE.x, LIGHTHOUSE.z), LIGHTHOUSE.z);
  const lt = project(cam, LIGHTHOUSE.x, terrainHeight(LIGHTHOUSE.x, LIGHTHOUSE.z) + LIGHTHOUSE.height, LIGHTHOUSE.z);
  if (lb && lt) {
    const w = Math.max(2, 320 / lb.z);
    ctx.fillStyle = fogColor('#e8e2d4', lb.z);
    ctx.beginPath();
    ctx.moveTo(lb.x - w, lb.y);
    ctx.lineTo(lt.x - w * 0.45, lt.y);
    ctx.lineTo(lt.x + w * 0.45, lt.y);
    ctx.lineTo(lb.x + w, lb.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5a4e';
    ctx.fillRect(lt.x - w * 0.7, lt.y - 6, w * 1.4, 6);
  }
  // Town rooftops near the first strip.
  for (const house of TOWN) {
    const gy = terrainHeight(house.x, house.z);
    const base = project(cam, house.x, gy, house.z);
    if (!base || base.z > 1100) continue;
    const s = base.scale;
    const w = house.w * s;
    const h = house.h * s;
    if (w < 1.5) continue;
    ctx.fillStyle = fogColor('#c96a4a', base.z);
    ctx.fillRect(base.x - w / 2, base.y - h, w, h * 0.7);
    ctx.fillStyle = fogColor('#e8e2d4', base.z);
    ctx.fillRect(base.x - w / 2, base.y - h * 0.3, w, h * 0.3);
  }
  // Buoys bobbing in the bay.
  for (const b of BUOYS) {
    const p = project(cam, b.x, 0.8, b.z);
    if (!p || p.z > 1000) continue;
    const s = Math.max(1.5, 200 / p.z);
    ctx.fillStyle = '#ff7a2a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Clouds drift far above the sea.
  for (const cloud of CLOUDS) {
    const p = project(cam, cloud.x, cloud.alt, cloud.z);
    if (!p || p.z > VIEW.far) continue;
    const rx = cloud.size * p.scale;
    const ry = rx * 0.42;
    if (rx < 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x - rx * 0.45, p.y + ry * 0.25, rx * 0.6, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x + rx * 0.5, p.y + ry * 0.3, rx * 0.55, ry * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRings(ctx, cam, rings, nextIndex) {
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    if (ring.done) continue;
    const c = project(cam, ring.x, ring.alt, ring.z);
    if (!c) continue;
    const r = 19 * c.scale;
    if (r < 1.5 || c.z > VIEW.far) continue;
    const isNext = i === nextIndex;
    ctx.lineWidth = Math.max(2.5, r * 0.14);
    ctx.strokeStyle = isNext ? COLORS.ringNext : 'rgba(255,176,32,0.55)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.strokeStyle = isNext ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    if (isNext) {
      ctx.fillStyle = 'rgba(255,207,92,0.9)';
      ctx.font = `bold ${Math.max(11, Math.min(20, r * 0.28))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${i + 1}`, c.x, c.y - r - 10);
    }
  }
}

export function renderWorld(ctx, game) {
  const { plane, width, height } = game;
  const cam = makeCamera(plane, width, height);
  game.cam = cam;
  drawSky(ctx, cam, plane, width, height);
  drawGround(ctx, cam, plane);
  for (const leg of game.legs) drawRunway(ctx, cam, leg);
  drawScenery(ctx, cam);
  drawRings(ctx, cam, game.rings, game.nextRing);
}
