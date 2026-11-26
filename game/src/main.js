// Harbor Run — boot: size the canvas, build the game, run the loop.
// With ?shot=<name> the game renders one fixed pose for screenshots
// instead of starting the live loop.

import { createGame, startLoop, applyShot } from './game.js';

const canvas = document.getElementById('game');

function resize(game) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  game.width = canvas.width;
  game.height = canvas.height;
}

const game = createGame(canvas);
resize(game);
window.addEventListener('resize', () => resize(game));
window.__game = game;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(game, shot);
} else {
  startLoop(game);
}
