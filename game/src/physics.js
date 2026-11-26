// Harbor Run — flight model: throttle, pitch, bank, lift, stall, fuel.
// The plane is a point with a heading; the renderer gives it wings.

import { PLANE, SCORING } from './config.js';
import { terrainHeight, runwayAt } from './terrain.js';

export function newPlane() {
  return {
    x: 0,
    z: 0,
    alt: PLANE.startAlt,
    heading: 0, // east
    pitch: 0,
    bank: 0,
    speed: PLANE.startSpeed,
    throttle: 0.62,
    fuel: PLANE.startFuel,
    vspeed: 0,
    onGround: false,
    stalled: false,
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// input: { pitch: -1..1 (up positive), bank: -1..1 (right positive),
//          throttle: -1..1, brake: bool }
// Returns an event string when something notable happens, else null.
export function stepPlane(plane, input, dt, leg) {
  const p = PLANE;
  // Throttle follows the lever; the brake kills speed on the ground.
  plane.throttle = clamp(plane.throttle + input.throttle * dt * 0.55, 0, 1);
  const targetSpeed = p.minSpeed + plane.throttle * (p.maxSpeed - p.minSpeed);
  const accel = (targetSpeed - plane.speed) * (plane.onGround ? 0.9 : 0.55);
  plane.speed = clamp(plane.speed + accel * dt, 0, p.maxSpeed + 6);
  if (input.brake && plane.onGround) plane.speed = Math.max(0, plane.speed - 26 * dt);

  // Pitch and bank ease toward the pilot's command.
  const pitchTarget = clamp(input.pitch * p.maxPitch, -p.maxPitch, p.maxPitch);
  plane.pitch += (pitchTarget - plane.pitch) * Math.min(1, dt * 3.2);
  const bankTarget = clamp(input.bank * p.maxBank, -p.maxBank, p.maxBank);
  plane.bank += (bankTarget - plane.bank) * Math.min(1, dt * 3.0);

  // Turning: bank rolls the nose around. Steep bank costs a little lift.
  plane.heading -= plane.bank * plane.speed * p.turnFactor * dt;
  const bankSink = Math.abs(plane.bank) * 2.2;

  // Lift: climbing costs speed, sinking gains it; below flying speed the
  // wing quits and the plane drops.
  const flying = plane.speed > 30;
  plane.stalled = !flying && !plane.onGround;
  let climb = plane.speed * Math.sin(plane.pitch) * p.climbFactor;
  if (plane.stalled) climb -= p.stallSink;
  climb -= bankSink;
  plane.vspeed = climb;
  plane.alt += climb * dt;

  // Move along the heading.
  const groundSpeed = plane.speed * Math.cos(plane.pitch);
  plane.x += Math.cos(plane.heading) * groundSpeed * dt;
  plane.z += -Math.sin(plane.heading) * groundSpeed * dt;

  // Fuel: throttle burns it; coasting sips it.
  plane.fuel = Math.max(0, plane.fuel - (0.02 + plane.throttle * p.fuelBurn) * dt);

  // Ground contact.
  const ground = terrainHeight(plane.x, plane.z);
  const runway = runwayAt(plane.x, plane.z);
  if (plane.alt <= ground + 0.4) {
    plane.alt = ground;
    plane.onGround = true;
    const soft = Math.abs(plane.vspeed) < 3.2;
    const level = Math.abs(plane.bank) < 0.28 && Math.abs(plane.pitch) < 0.22;
    const slow = plane.speed < 58;
    if (runway && soft && level && slow) return 'landed';
    if (runway && !soft && level && slow) return 'hard-landing';
    return 'crashed';
  }
  plane.onGround = false;
  if (plane.fuel <= 0 && plane.speed < 24) return 'out-of-fuel';
  return null;
}

export function ringHit(plane, ring) {
  const dx = plane.x - ring.x;
  const dy = plane.alt - ring.alt;
  const dz = plane.z - ring.z;
  return dx * dx + dy * dy + dz * dz < 19 * 19;
}

export function legClockBonus(secondsLeft) {
  return Math.round((secondsLeft / SCORING.legClock) * SCORING.legTimeBonus);
}
