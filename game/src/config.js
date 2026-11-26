// Harbor Run — tuning constants and the three-leg course.
// All distances in metres, speeds in m/s, angles in radians.
// Headings: 0 = east (+x), positive turns toward north (-z in world space).

export const VIEW = {
  width: 1280,
  height: 800,
  fov: 1.15, // vertical field of view, radians
  near: 2,
  far: 1400,
  groundRows: [18, 28, 42, 62, 90, 128, 178, 245, 330, 440, 580, 760, 980, 1240],
  groundCols: 14,
};

export const PLANE = {
  minSpeed: 22, // below this the wing stops flying
  cruiseSpeed: 46,
  maxSpeed: 82,
  accel: 9, // m/s^2 toward the throttle target
  drag: 0.35,
  pitchRate: 0.55, // rad/s of pitch input
  maxPitch: 0.5,
  bankRate: 1.1, // rad/s of bank input
  maxBank: 1.0,
  turnFactor: 0.011, // heading change per (bank * speed)
  climbFactor: 0.92,
  stallSink: 14, // extra m/s sink when stalled
  fuelBurn: 0.055, // % fuel per second at full throttle
  fuelPerRing: 6, // % fuel refunded per ring
  startFuel: 100,
  startSpeed: 40,
  startAlt: 150,
};

export const WORLD = {
  seaLevel: 0,
  runwayHeight: 14,
  // The course runs east along z ~= 0. Runways sit at the end of each leg.
  legs: [
    {
      name: 'Leg 1 — Ring Run',
      brief: 'Thread all 6 harbour rings, then put her down on Runway 09.',
      rings: [
        { x: 900, z: -40, alt: 170 },
        { x: 1600, z: 120, alt: 210 },
        { x: 2300, z: -90, alt: 150 },
        { x: 3000, z: 60, alt: 240 },
        { x: 3700, z: -140, alt: 180 },
        { x: 4400, z: 40, alt: 200 },
      ],
      runway: { x: 5200, z: 0, heading: 0, length: 620, width: 46 },
    },
    {
      name: 'Leg 2 — Cliff Pass',
      brief: 'Eight rings over the cliffs, then land on the north strip.',
      rings: [
        { x: 6100, z: 160, alt: 220 },
        { x: 6800, z: -120, alt: 180 },
        { x: 7500, z: 90, alt: 260 },
        { x: 8200, z: -180, alt: 200 },
        { x: 8900, z: 140, alt: 150 },
        { x: 9600, z: -60, alt: 230 },
        { x: 10300, z: 110, alt: 190 },
        { x: 11000, z: -30, alt: 210 },
      ],
      runway: { x: 11800, z: 0, heading: 0, length: 620, width: 46 },
    },
    {
      name: 'Leg 3 — Storm Gate',
      brief: 'Ten rings, low and fast, then the final landing at dusk strip.',
      rings: [
        { x: 12700, z: -100, alt: 160 },
        { x: 13400, z: 130, alt: 220 },
        { x: 14100, z: -160, alt: 180 },
        { x: 14800, z: 70, alt: 250 },
        { x: 15500, z: -110, alt: 170 },
        { x: 16200, z: 150, alt: 210 },
        { x: 16900, z: -70, alt: 190 },
        { x: 17600, z: 100, alt: 240 },
        { x: 18300, z: -140, alt: 180 },
        { x: 19000, z: 20, alt: 200 },
      ],
      runway: { x: 19800, z: 0, heading: 0, length: 700, width: 50 },
    },
  ],
};

export const SCORING = {
  ring: 100,
  landingSoft: 300, // touchdown with |vertical speed| under 3 m/s
  landingOk: 150,
  legTimeBonus: 400, // scaled by time left on the leg clock
  fuelBonusPerPercent: 2,
  legClock: 240, // seconds per leg
};

export const COLORS = {
  skyTop: '#2f6fb4',
  skyHorizon: '#bcd9e8',
  sun: '#fff3c4',
  grassLow: '#5d8a3c',
  grassHigh: '#7fae4e',
  fieldA: '#8fae4e',
  fieldB: '#6d9a45',
  sand: '#d9c48a',
  water: '#2e6f9e',
  waterDeep: '#245a86',
  rock: '#8a7f72',
  runway: '#3c3f45',
  runwayEdge: '#e8e8e8',
  ring: '#ffb020',
  ringNext: '#ffcf5c',
  hud: '#e8f4ff',
  hudDim: '#9fc4e0',
  warn: '#ff5a4e',
};
