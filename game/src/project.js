// Harbor Run — camera projection: world metres to screen pixels.
// The camera sits behind and above the aircraft, looking along its heading,
// banked with the wing. Forward is +Z in camera space.

import { VIEW } from './config.js';

export function makeCamera(plane, width, height) {
  const focal = (height / 2) / Math.tan(VIEW.fov / 2);
  const heading = plane.heading;
  const pitch = plane.pitch;
  const bank = plane.bank;
  // Camera trails the nose by 16 m and rides 4.5 m above it.
  const fx = Math.cos(heading);
  const fz = -Math.sin(heading);
  const cx = plane.x - fx * 16;
  const cz = plane.z - fz * 16;
  const cy = plane.alt + 4.5;
  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosB = Math.cos(bank);
  const sinB = Math.sin(bank);
  return { cx, cy, cz, cosH, sinH, cosP, sinP, cosB, sinB, focal, width, height };
}

// Project a world point. Returns null when behind the near plane.
export function project(cam, x, y, z) {
  const dx = x - cam.cx;
  const dy = y - cam.cy;
  const dz = z - cam.cz;
  // Yaw: forward (cos h, -sin h) becomes +Z, right (sin h, cos h) becomes +X.
  const xr = dx * cam.sinH + dz * cam.cosH;
  const zr = dx * cam.cosH - dz * cam.sinH;
  // Pitch: nose-up raises the horizon.
  const yp = dy * cam.cosP - zr * cam.sinP;
  const zp = dy * cam.sinP + zr * cam.cosP;
  // Roll around the view axis.
  const xq = xr * cam.cosB - yp * cam.sinB;
  const yq = xr * cam.sinB + yp * cam.cosB;
  const zq = zp;
  if (zq < VIEW.near) return null;
  const s = cam.focal / zq;
  return {
    x: cam.width / 2 + xq * s,
    y: cam.height / 2 - yq * s,
    z: zq,
    scale: s,
  };
}

// Where does a world direction point on screen (for the off-screen beacon)?
export function screenDirection(cam, x, y, z) {
  const p = project(cam, x, y, z);
  if (p) return p;
  // Behind us: mirror the direction so the arrow still points the right way.
  const dx = x - cam.cx;
  const dz = z - cam.cz;
  const xr = dx * cam.sinH + dz * cam.cosH;
  const zr = dx * cam.cosH - dz * cam.sinH;
  const ang = Math.atan2(xr, Math.max(1, zr));
  return {
    x: cam.width / 2 + Math.sin(ang) * cam.width * 0.42,
    y: cam.height * 0.3,
    z: -1,
    scale: 0,
  };
}
