// Harbor Run — cockpit overlay and HUD: the instruments the pilot reads.
// Airspeed and altitude tapes, compass strip, throttle and fuel, score,
// warnings, and the title / end screens. All drawn on the same canvas.

import { COLORS, SCORING } from './config.js';
import { screenDirection } from './project.js';
import { terrainHeight } from './terrain.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function compassDeg(heading) {
  let deg = 90 - (heading * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  return deg;
}

function drawTape(ctx, x, y, w, h, value, step, unit, format) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,32,0.72)';
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,244,255,0.35)';
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const mid = y + h / 2;
  const pxPerUnit = (h * 0.72) / (step * 6);
  const first = Math.floor((value - step * 3) / step) * step;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  for (let v = first; v <= value + step * 3; v += step) {
    const yy = mid - (v - value) * pxPerUnit;
    const major = v % (step * 5) === 0;
    ctx.strokeStyle = major ? 'rgba(232,244,255,0.8)' : 'rgba(232,244,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(x + w - (major ? 16 : 9), yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = COLORS.hud;
      ctx.fillText(String(format(v)), x + 6, yy + 4);
    }
  }
  ctx.restore();
  // Current value box.
  ctx.fillStyle = '#0d2b45';
  roundRect(ctx, x - 6, mid - 15, w + 12, 30, 5);
  ctx.fill();
  ctx.strokeStyle = COLORS.hud;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${format(Math.round(value))} ${unit}`, x + w / 2, mid + 6);
}

function drawCompass(ctx, width, heading) {
  const deg = compassDeg(heading);
  const y = 26;
  const cx = width / 2;
  ctx.fillStyle = 'rgba(8,20,32,0.72)';
  roundRect(ctx, cx - 190, y - 16, 380, 34, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 190, y - 16, 380, 34);
  ctx.clip();
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (let d = Math.floor((deg - 60) / 10) * 10; d <= deg + 60; d += 10) {
    const dd = ((d % 360) + 360) % 360;
    const dx = cx + (dd - deg) * 3.1;
    const major = dd % 30 === 0;
    ctx.strokeStyle = major ? COLORS.hud : 'rgba(232,244,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(dx, y + 12);
    ctx.lineTo(dx, y + (major ? 2 : 7));
    ctx.stroke();
    if (major) {
      const label = dd === 0 ? 'N' : dd === 90 ? 'E' : dd === 180 ? 'S' : dd === 270 ? 'W' : String(dd).padStart(3, '0');
      ctx.fillStyle = COLORS.hud;
      ctx.fillText(label, dx, y - 2);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.moveTo(cx, y + 16);
  ctx.lineTo(cx - 6, y + 6);
  ctx.lineTo(cx + 6, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(String(Math.round(deg)).padStart(3, '0') + '°', cx, y + 30);
}

function drawGauge(ctx, x, y, r, label, frac, color) {
  ctx.fillStyle = 'rgba(8,20,32,0.8)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,244,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r - 5, a0, a0 + (a1 - a0) * Math.max(0, Math.min(1, frac)));
  ctx.stroke();
  const na = a0 + (a1 - a0) * Math.max(0, Math.min(1, frac));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(na) * (r - 8), y + Math.sin(na) * (r - 8));
  ctx.stroke();
  ctx.fillStyle = COLORS.hud;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - r - 8);
}

export function drawCockpit(ctx, game) {
  const { width, height, plane } = game;
  const cx = width / 2;
  const baseY = height;
  // Glareshield: the dark dash the pilot sees over the nose.
  ctx.fillStyle = '#1b222b';
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  ctx.lineTo(0, baseY - 86);
  ctx.quadraticCurveTo(width * 0.28, baseY - 132, cx, baseY - 118);
  ctx.quadraticCurveTo(width * 0.72, baseY - 132, width, baseY - 86);
  ctx.lineTo(width, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,244,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Nose cone peeking over the dash.
  ctx.fillStyle = '#c94f3d';
  ctx.beginPath();
  ctx.moveTo(cx - 26, baseY - 112);
  ctx.quadraticCurveTo(cx, baseY - 168, cx + 26, baseY - 112);
  ctx.quadraticCurveTo(cx, baseY - 96, cx - 26, baseY - 112);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 138, 7, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Propeller blur, faster and fainter as the throttle opens.
  const alpha = 0.05 + plane.throttle * 0.1;
  ctx.fillStyle = `rgba(220,230,240,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 150, 10 + plane.throttle * 26, 74, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lit gauges on the dash: RPM and fuel, needles glowing.
  drawGauge(ctx, cx - 150, baseY - 52, 30, 'RPM', plane.throttle, '#7fd4ff');
  drawGauge(ctx, cx + 150, baseY - 52, 30, 'FUEL', plane.fuel / 100, plane.fuel < 25 ? COLORS.warn : '#7dff9a');
  // Wing tips at the lower corners.
  ctx.fillStyle = '#c94f3d';
  ctx.beginPath();
  ctx.moveTo(0, baseY - 30);
  ctx.lineTo(150, baseY - 74);
  ctx.lineTo(170, baseY - 58);
  ctx.lineTo(0, baseY - 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(width, baseY - 30);
  ctx.lineTo(width - 150, baseY - 74);
  ctx.lineTo(width - 170, baseY - 58);
  ctx.lineTo(width, baseY - 8);
  ctx.closePath();
  ctx.fill();
}

export function drawHUD(ctx, game) {
  const { width, height, plane } = game;
  const knots = plane.speed * 1.944;
  const feet = plane.alt * 3.281;
  drawTape(ctx, 18, 90, 86, 250, knots, 10, 'KT', (v) => v);
  drawTape(ctx, width - 104, 90, 86, 250, feet, 100, 'FT', (v) => v);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(8,20,32,0.72)';
  roundRect(ctx, 14, 66, 92, 20, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.hud;
  ctx.fillText('AIRSPEED', 20, 80);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(8,20,32,0.72)';
  roundRect(ctx, width - 106, 66, 92, 20, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.hud;
  ctx.fillText('ALTITUDE', width - 20, 80);
  drawCompass(ctx, width, plane.heading);
  // Vertical speed under the altitude tape.
  const vsFpm = Math.round(plane.vspeed * 196.85);
  ctx.fillStyle = plane.vspeed < -8 ? COLORS.warn : COLORS.hud;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`V/S ${vsFpm >= 0 ? '+' : ''}${vsFpm} FT/MIN`, width - 18, 362);
  // Centre crosshair and flight-path marker.
  const cx = width / 2;
  const cy = height / 2;
  ctx.strokeStyle = 'rgba(232,244,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.moveTo(cx, cy - 16);
  ctx.lineTo(cx, cy + 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.stroke();
  // Bottom bar: throttle, fuel, mission, score, clock.
  const barY = height - 34;
  ctx.fillStyle = 'rgba(8,20,32,0.72)';
  roundRect(ctx, 14, barY - 8, width - 28, 30, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THR', 26, barY + 11);
  ctx.fillStyle = '#22303e';
  ctx.fillRect(70, barY - 2, 130, 10);
  ctx.fillStyle = '#7fd4ff';
  ctx.fillRect(70, barY - 2, 130 * plane.throttle, 10);
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText('FUEL', 216, barY + 11);
  ctx.fillStyle = '#22303e';
  ctx.fillRect(262, barY - 2, 130, 10);
  ctx.fillStyle = plane.fuel < 25 ? COLORS.warn : '#7dff9a';
  ctx.fillRect(262, barY - 2, 130 * Math.max(0, plane.fuel / 100), 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  const ringsDone = game.rings.filter((r) => r.done).length;
  ctx.fillText(
    `${game.leg.name}   •   Rings ${ringsDone}/${game.rings.length}   •   Score ${game.score}   •   ${Math.max(0, Math.ceil(game.clock))}s`,
    width / 2 + 130,
    barY + 11,
  );
  // Warnings.
  const ground = terrainHeight(plane.x, plane.z);
  const agl = plane.alt - ground;
  ctx.textAlign = 'center';
  if (plane.stalled && game.state === 'flying') {
    ctx.fillStyle = game.blink ? COLORS.warn : '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('STALL — NOSE DOWN, POWER UP', cx, height * 0.3);
  } else if (agl < 30 && plane.vspeed < -4 && game.state === 'flying') {
    ctx.fillStyle = game.blink ? COLORS.warn : '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('PULL UP', cx, height * 0.3);
  }
  if (plane.fuel < 25 && plane.fuel > 0 && game.state === 'flying') {
    ctx.fillStyle = game.blink ? COLORS.warn : COLORS.hud;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('LOW FUEL', cx, height - 52);
  }
  // Beacon to the next ring when it is off screen.
  if (game.state === 'flying' && game.nextRing < game.rings.length) {
    const ring = game.rings[game.nextRing];
    const p = screenDirection(game.cam, ring.x, ring.alt, ring.z);
    const onScreen = p.z > 0 && p.x > 60 && p.x < width - 60 && p.y > 60 && p.y < height - 140;
    if (!onScreen) {
      const ax = Math.max(50, Math.min(width - 50, p.x));
      const ay = Math.max(60, Math.min(height - 150, p.y));
      const ang = Math.atan2(p.y - height / 2, p.x - width / 2);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = COLORS.ringNext;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const dist = Math.round(Math.hypot(ring.x - plane.x, ring.z - plane.z));
      ctx.fillStyle = COLORS.ringNext;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${dist}m`, ax, ay + 26);
    }
  }
  // Transient announcement.
  if (game.announce && game.announceT > 0) {
    ctx.fillStyle = 'rgba(8,20,32,0.7)';
    const tw = ctx.measureText(game.announce).width + 36;
    roundRect(ctx, cx - tw / 2, height * 0.2 - 22, tw, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(game.announce, cx, height * 0.2 + 3);
  }
}

function panel(ctx, width, height, title, lines, foot) {
  const w = 620;
  const h = 120 + lines.length * 30 + (foot ? 46 : 10);
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  ctx.fillStyle = 'rgba(6,16,28,0.88)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,244,255,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffb020';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, y + 52);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, width / 2, y + 92 + i * 30));
  if (foot) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(foot, width / 2, y + h - 24);
  }
}

export function drawTitle(ctx, game) {
  const { width, height } = game;
  panel(
    ctx,
    width,
    height,
    'HARBOR RUN',
    [
      'A bush-plane run down the coast: thread the rings, mind the fuel,',
      'and put her down gently on the strip at the end of each leg.',
      '',
      'Arrows / WASD — pitch & bank      Shift / Ctrl — throttle',
      'Mouse — steer      Wheel — throttle trim      Space — brake',
      'P — pause      R — restart leg',
    ],
    'Press ENTER to fly',
  );
}

export function drawEnd(ctx, game) {
  const { width, height } = game;
  const g = game.end;
  const title = g.kind === 'landed' ? 'TOUCHDOWN!' : g.kind === 'complete' ? 'ALL LEGS FLOWN!' : g.kind === 'fuel' ? 'OUT OF FUEL' : 'CRASHED';
  const lines = [
    g.detail,
    `Leg score ${g.legScore}   •   Total score ${game.score}`,
    `Rings this leg: ${g.rings}/${game.rings.length}   •   Fuel left ${Math.max(0, Math.round(game.plane.fuel))}%`,
    '',
    g.kind === 'landed' || g.kind === 'complete'
      ? 'The harbourmaster buys the next round.'
      : 'The harbourmaster sends the salvage boat.',
  ];
  panel(ctx, width, height, title, lines, 'Press R to fly again — Enter for the next leg');
}
