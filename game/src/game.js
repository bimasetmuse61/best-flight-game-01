// Harbor Run — game state: legs, scoring, the main loop, screenshot poses.
// One sortie is three legs: ring course, then a landing, three times over.

import { WORLD, SCORING } from './config.js';
import { newPlane, stepPlane, ringHit, legClockBonus } from './physics.js';
import { newInput, attachInput, readControls } from './input.js';
import {
  newAudio,
  ensureAudio,
  updateAudio,
  playRing,
  playCrash,
  playLand,
} from './audio.js';
import { renderWorld } from './render.js';
import { drawCockpit, drawHUD, drawTitle, drawEnd } from './hud.js';
import { terrainHeight, isWater } from './terrain.js';

export function createGame(canvas) {
  const game = {
    canvas,
    ctx: canvas.getContext('2d'),
    width: canvas.width,
    height: canvas.height,
    state: 'title',
    paused: false,
    legIndex: 0,
    legs: WORLD.legs,
    leg: WORLD.legs[0],
    rings: [],
    nextRing: 0,
    plane: newPlane(),
    score: 0,
    legScore: 0,
    clock: SCORING.legClock,
    announce: '',
    announceT: 0,
    blink: false,
    blinkT: 0,
    time: 0,
    end: null,
    cam: null,
    input: newInput(),
    audio: newAudio(),
    shot: null,
  };
  setupLeg(game, 0);
  attachInput(game.input, canvas, (name) => handleAction(game, name));
  return game;
}

function setupLeg(game, index) {
  game.legIndex = index;
  game.leg = WORLD.legs[index];
  game.rings = game.leg.rings.map((r) => ({ ...r, done: false }));
  game.nextRing = 0;
  game.legScore = 0;
  game.clock = SCORING.legClock;
  game.end = null;
  const first = game.leg.rings[0];
  const plane = newPlane();
  plane.x = first.x - 700;
  plane.z = first.z;
  plane.alt = 190;
  plane.speed = 42;
  plane.throttle = 0.65;
  game.plane = plane;
}

function handleAction(game, name) {
  if (name === 'start') {
    ensureAudio(game.audio);
    if (game.state === 'title') {
      game.state = 'flying';
    } else if (game.state === 'landed') {
      nextLeg(game);
    } else if (game.state === 'complete') {
      setupLeg(game, 0);
      game.score = 0;
      game.state = 'flying';
    }
  } else if (name === 'restart') {
    if (game.state !== 'title') {
      setupLeg(game, game.legIndex);
      game.state = 'flying';
    }
  } else if (name === 'pause') {
    if (game.state === 'flying') game.paused = !game.paused;
  }
}

function nextLeg(game) {
  if (game.legIndex + 1 < WORLD.legs.length) {
    setupLeg(game, game.legIndex + 1);
    game.state = 'flying';
    game.announce = game.leg.name;
    game.announceT = 3;
  } else {
    game.state = 'complete';
    game.end = {
      kind: 'complete',
      detail: 'Three legs, three landings. The coast is yours.',
      legScore: 0,
      rings: game.rings.filter((r) => r.done).length,
    };
  }
}

function finishLanding(game, soft) {
  const bonus = soft ? SCORING.landingSoft : SCORING.landingOk;
  const timeBonus = legClockBonus(game.clock);
  const fuelBonus = Math.round(game.plane.fuel * SCORING.fuelBonusPerPercent);
  game.legScore = bonus + timeBonus + fuelBonus;
  game.score += game.legScore;
  playLand(game.audio);
  const rings = game.rings.filter((r) => r.done).length;
  game.end = {
    kind: 'landed',
    detail: soft
      ? `Greased it on — landing +${bonus}, time +${timeBonus}, fuel +${fuelBonus}.`
      : `Down, but hard — landing +${bonus}, time +${timeBonus}, fuel +${fuelBonus}.`,
    legScore: game.legScore,
    rings,
  };
  if (game.legIndex + 1 < WORLD.legs.length) {
    game.state = 'landed';
  } else {
    game.state = 'complete';
    game.end.kind = 'complete';
    game.end.detail = `Final leg down — landing +${bonus}, time +${timeBonus}, fuel +${fuelBonus}.`;
  }
}

function finishCrash(game, kind, detail) {
  playCrash(game.audio);
  game.state = 'crashed';
  game.end = {
    kind,
    detail,
    legScore: 0,
    rings: game.rings.filter((r) => r.done).length,
  };
}

function update(game, dt) {
  game.time += dt;
  game.blinkT += dt;
  if (game.blinkT > 0.5) {
    game.blinkT = 0;
    game.blink = !game.blink;
  }
  if (game.announceT > 0) game.announceT -= dt;
  if (game.state !== 'flying' || game.paused) return;
  game.clock -= dt;
  if (game.clock <= 0) {
    finishCrash(game, 'crashed', 'The leg clock ran out over the coast.');
    return;
  }
  const controls = readControls(game.input, dt);
  const event = stepPlane(game.plane, controls, dt, game.leg);
  updateAudio(game.audio, game.plane);
  // Rings: any ring the nose passes through counts.
  for (let i = 0; i < game.rings.length; i++) {
    const ring = game.rings[i];
    if (!ring.done && ringHit(game.plane, ring)) {
      ring.done = true;
      game.score += SCORING.ring;
      game.legScore += SCORING.ring;
      game.plane.fuel = Math.min(100, game.plane.fuel + 6);
      playRing(game.audio);
      game.announce = `RING ${i + 1}  +${SCORING.ring}`;
      game.announceT = 1.6;
    }
  }
  while (game.nextRing < game.rings.length && game.rings[game.nextRing].done) game.nextRing++;
  if (event === 'landed') {
    finishLanding(game, true);
  } else if (event === 'hard-landing') {
    finishLanding(game, false);
  } else if (event === 'crashed') {
    const water = isWater(game.plane.x, game.plane.z);
    const ground = terrainHeight(game.plane.x, game.plane.z);
    const detail = water
      ? 'Ditched in the bay — the floats were not fitted today.'
      : game.plane.alt <= ground + 1 && Math.abs(game.plane.vspeed) > 12
        ? 'Came down too hard on the hillside.'
        : 'Clipped the terrain — the coast is unforgiving.';
    finishCrash(game, 'crashed', detail);
  } else if (event === 'out-of-fuel') {
    finishCrash(game, 'fuel', 'Fuel ran dry — she glided down over the coast.');
  }
}

export function render(game) {
  const { ctx, width, height } = game;
  ctx.clearRect(0, 0, width, height);
  renderWorld(ctx, game);
  if (game.state === 'title') {
    drawCockpit(ctx, game);
    drawTitle(ctx, game);
    return;
  }
  drawCockpit(ctx, game);
  drawHUD(ctx, game);
  if (game.state === 'landed' || game.state === 'crashed' || game.state === 'complete') {
    drawEnd(ctx, game);
  }
  if (game.paused && game.state === 'flying') {
    ctx.fillStyle = 'rgba(6,16,28,0.7)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED — press P to fly on', width / 2, height / 2);
  }
}

export function startLoop(game) {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(game, dt);
    render(game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Fixed poses for the maker's screenshots: the game is set to a chosen
// moment and rendered once, with no loop and no audio.
export function applyShot(game, shot) {
  game.shot = shot;
  const plane = game.plane;
  if (shot === 'start') {
    game.state = 'title';
    const r = WORLD.legs[0].runway;
    plane.x = r.x - 260;
    plane.z = r.z;
    plane.alt = 14;
    plane.heading = 0;
    plane.pitch = 0;
    plane.bank = 0;
    plane.speed = 0;
    plane.throttle = 0.25;
    plane.onGround = true;
  } else if (shot === 'play') {
    game.state = 'flying';
    game.rings[0].done = true;
    game.rings[1].done = true;
    game.rings[2].done = true;
    game.nextRing = 3;
    game.score = 300;
    plane.x = 2850;
    plane.z = 20;
    plane.alt = 225;
    plane.heading = 0.06;
    plane.pitch = 0.02;
    plane.bank = 0.12;
    plane.speed = 56;
    plane.throttle = 0.72;
    plane.fuel = 81;
    game.clock = 178;
    game.announce = 'RING 3  +100';
    game.announceT = 99;
  } else if (shot === 'rings') {
    game.state = 'flying';
    for (let i = 0; i < 4; i++) game.rings[i].done = true;
    game.nextRing = 4;
    game.score = 400;
    plane.x = 3560;
    plane.z = -110;
    plane.alt = 182;
    plane.heading = -0.05;
    plane.pitch = -0.03;
    plane.bank = -0.18;
    plane.speed = 61;
    plane.throttle = 0.8;
    plane.fuel = 74;
    game.clock = 162;
  } else if (shot === 'runway') {
    game.state = 'flying';
    for (const r of game.rings) r.done = true;
    game.nextRing = game.rings.length;
    game.score = 600;
    plane.x = 4520;
    plane.z = 8;
    plane.alt = 62;
    plane.heading = 0.01;
    plane.pitch = -0.07;
    plane.bank = 0.02;
    plane.speed = 44;
    plane.throttle = 0.42;
    plane.fuel = 58;
    plane.vspeed = -3.1;
    game.clock = 96;
    game.announce = 'FINAL — RUNWAY 09 AHEAD';
    game.announceT = 99;
  } else if (shot === 'landed') {
    game.state = 'landed';
    for (const r of game.rings) r.done = true;
    game.nextRing = game.rings.length;
    game.score = 1050;
    game.legScore = 450;
    const r = WORLD.legs[0].runway;
    plane.x = r.x + 40;
    plane.z = r.z;
    plane.alt = 14;
    plane.heading = 0;
    plane.pitch = 0;
    plane.bank = 0;
    plane.speed = 18;
    plane.throttle = 0.15;
    plane.fuel = 52;
    plane.onGround = true;
    game.end = {
      kind: 'landed',
      detail: 'Greased it on — landing +300, time +96, fuel +104.',
      legScore: 450,
      rings: 6,
    };
  }
  render(game);
  window.__shotReady = true;
}
