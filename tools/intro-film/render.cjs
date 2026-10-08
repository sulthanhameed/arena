/**
 * Khang entrance film — frame renderer
 * ───────────────────────────────────────────────────────────────
 * Draws every frame of the entrance animation and writes them as
 * PNGs for ffmpeg to encode.
 *
 * The scene is ONE vector world. The camera starts inside the dining
 * room, framed on two guests at a table, and retreats in a single
 * unbroken move until the whole shopfront is in view — no cuts, no
 * dissolves. Then the picture washes to white and the brand lockup
 * resolves on its own, the way an end card should.
 *
 * The guests are pictograms — solid, faceless, built from circles and
 * round-capped bars. All the acting is therefore carried by pose:
 * an arm that lifts food to the head, a head that nods while chewing,
 * a hand that gestures while its owner talks.
 *
 * Usage:
 *   npm i @napi-rs/canvas
 *   NODE_PATH=<where that lives>/node_modules node render.cjs <outDir>
 */

const fs = require("fs");
const path = require("path");
const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");

/* ── Output ──────────────────────────────────────────────────── */
const W = 1920;
const H = 1080;
const FPS = 30;
const DURATION = 12.0;
const OUT = process.argv[2] || "/tmp/vid/frames";

/* ── Palette ─────────────────────────────────────────────────── *
 * Restrained and warm: soft white plaster, light oak, one green,
 * one amber. The guests are a single solid ink, so every bit of
 * colour in the frame belongs to the room rather than to them.    */
const WALL = "#e7dbc5";
const WALL_D = "#d4c3a6";
const PAPER = "#f0e5cd";
const FLOOR = "#7d5c41";
const FLOOR_D = "#5f4530";
const FLOOR_L = "#946f50";

/* The room the pair sit in. Light enough that two coloured
   silhouettes read against it at any distance — a dark floor eats
   the feet of the wine figure the moment the camera pulls back. */
const RM_WALL_T = "#dccdb0";
const RM_WALL = "#ebe0ca";
const RM_WALL_D = "#cdbb9b";
const RM_FLOOR = "#c2a583";
const RM_FLOOR_D = "#ab8c69";
const RM_GLASS = "#fbeac7";
const RM_FRAME = "#bda888";

const WOOD = "#916845";
const WOOD_D = "#6d4d31";
const WOOD_L = "#ad8662";

const GREEN = "#15803d";
const GREEN_D = "#064e2e";
const GREEN_DD = "#05361f";
const JADE = "#16a34a";
const SCREEN_F = "#24493a";

const GLOW = "#f3bd63";
const GLOW_D = "#dc9a31";
const LAMP = "#ffecbb";

const RED = "#a8432f";
const RED_D = "#7e2d1e";
const CELADON = "#d8dfd1";
const CREAM = "#faf6ef";
const WHITE = "#ffffff";

const INK = "#15181a";
const INK_2 = "#232a2e";

/* ── The room and the shopfront ──────────────────────────────── */
const IN_WALL = "#f1e6d1";
const IN_WALL_D = "#e3d5b9";
const IN_WAINS = "#e7d9be";
const IN_RAIL = "#a9794f";
const IN_FLOOR = "#c9a87f";
const IN_FLOOR_D = "#b28c62";
const IN_FLOOR_F = "#d8bb95";
const LEAF = "#4f7f4a";
const LEAF_D = "#3b6137";
const LEAF_L = "#6a9a5c";
const POT = "#b5724e";
const POT_D = "#8e5739";

const FAC_WALL = "#ece2cf";
const FAC_WALL_D = "#d9cbb1";
const FAC_PIER = "#e2d6bd";
const FAC_FRAME = "#7d5737";
const FAC_FRAME_D = "#5c3f27";
const FASCIA = "#f8f3e6";
const PAVE = "#dbd5c8";
const PAVE_D = "#c4bdad";

/* The sign. Green is the brand, so it is the only saturated green in
   the frame and nothing else competes with it. */
const SIGN = "#15803d";
const SIGN_D = "#0a5a2c";

/* Shopfront geometry, in scene units with the pavement at y = 0. */
const FC = {
  halfW: 1700,
  plinth: -58,      // stall riser; hides the floor, so it must sit
                    // below the opening frame's bottom edge (-70)
  glassL: -1480,
  glassR: 1120,     // the glazing stops here; the door takes the rest
  glassTop: -1090,
  transom: -880,    // lattice band above, clear plate glass below
  doorL: 1120,
  doorR: 1480,
  canopy: -1180,
  fasciaTop: -1400,
  corniceTop: -1480,
};

/* The pull-back, as a 0..1 number. camera() and drawFacade() both
   need it — the glass only starts reflecting once we are outside
   it, and the sign only lights once it is in frame. */
function camU(t) {
  return seg(t, 0.2, 9.2, easeInOut);
}


/* The two of them. Skin, hair and cloth rather than one solid ink:
   a stick figure with no face cannot smile, and the brief is two
   people enjoying a meal. Each garment gets a darker tone for the
   far arm and leg so the pose survives the limbs overlapping. */
const GUESTS = {
  w: {
    skin: "#e9b98f", hair: "#3b2a20", line: "#3a2a20",
    top: "#b45f6b", topD: "#8f4a55",
    leg: "#4a4652", legD: "#3a3742", shoe: "#2b2730",
  },
  m: {
    skin: "#dca87c", hair: "#241a14", line: "#2a2018",
    top: "#3f7183", topD: "#2f5767",
    leg: "#414855", legD: "#333945", shoe: "#262b33",
  },
};

/* The other diners sit further back and must never pull focus. */
const EXTRAS = [
  { top: "#8a7f5e", topD: "#6d6449", skin: "#dfb189", hair: "#2e2219" },
  { top: "#6b6475", topD: "#544e5d", skin: "#e4bb93", hair: "#241a14" },
  { top: "#9a6a4e", topD: "#7a533d", skin: "#d8a479", hair: "#312318" },
  { top: "#5b7d78", topD: "#47625e", skin: "#e6bd95", hair: "#1f1711" },
];

/* ── Geometry ────────────────────────────────────────────────── */
const GROUND = 880;
const K = 0.41;
const ORIGIN = { x: 960, y: GROUND };

/* ── Maths ───────────────────────────────────────────────────── */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => clamp(v, 0, 1);
const lerp = (a, b, u) => a + (b - a) * u;
/** Zooms feel linear to the eye when the scale moves geometrically. */
const expLerp = (a, b, u) => a * Math.pow(b / a, u);
const smooth = (u) => u * u * (3 - 2 * u);
const easeInOut = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
const seg = (t, a, b, ease = smooth) => ease(clamp01((t - a) / (b - a)));

/* ── Fonts ───────────────────────────────────────────────────── */
const FONT_DIR = path.join(process.env.HOME || "/home/user", ".local/share/fonts");
function font(file, family) {
  const p = path.join(FONT_DIR, file);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, family);
  else console.warn("missing font:", p);
}
font("MaShanZheng_400Regular.ttf", "KhangCn");
font("PlayfairDisplay_600SemiBold.ttf", "KhangDisplay");
font("Manrope_600SemiBold.ttf", "KhangSans");

/* ── Small drawing helpers ───────────────────────────────────── */
/** A solid limb that tapers from one joint to the next with both
 *  joints rounded off. Flat fill, no shading — the whole style is
 *  one colour per figure. */
function taper(ctx, x1, y1, x2, y2, w1, w2, fill) {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  const cx = Math.cos(a);
  const cy = Math.sin(a);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x1 + cx * w1 * 0.5, y1 + cy * w1 * 0.5);
  ctx.lineTo(x2 + cx * w2 * 0.5, y2 + cy * w2 * 0.5);
  ctx.lineTo(x2 - cx * w2 * 0.5, y2 - cy * w2 * 0.5);
  ctx.lineTo(x1 - cx * w1 * 0.5, y1 - cy * w1 * 0.5);
  ctx.closePath();
  ctx.fill();
  circle(ctx, x1, y1, w1 * 0.5);
  ctx.fill();
  circle(ctx, x2, y2, w2 * 0.5);
  ctx.fill();
}

function limb(ctx, x1, y1, x2, y2, w, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function rrect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

/** Centred text with manual tracking — canvas letterSpacing is patchy. */
function tracked(ctx, text, cx, y, spacing, perCharAlpha) {
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  const chars = [...text];
  let total = 0;
  const widths = chars.map((c) => {
    const w = ctx.measureText(c).width;
    total += w + spacing;
    return w;
  });
  total -= spacing;
  let x = cx - total / 2;
  const base = ctx.globalAlpha;
  chars.forEach((c, i) => {
    if (perCharAlpha) ctx.globalAlpha = base * perCharAlpha(i, chars.length);
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
  ctx.globalAlpha = base;
  ctx.textAlign = prevAlign;
}

/* ── The mark ────────────────────────────────────────────────── *
 * One definition of the roundel, used at two sizes: small and lit
 * on the shopfront, large on the end card.                        */
function roundel(ctx, cx, cy, r, ring, invert) {
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  if (invert) {
    g.addColorStop(0, "#fffdf7");
    g.addColorStop(1, "#ece3cf");
  } else {
    g.addColorStop(0, GREEN);
    g.addColorStop(1, GREEN_D);
  }
  ctx.fillStyle = g;
  circle(ctx, cx, cy, r);
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = r * 0.062;
    circle(ctx, cx, cy, r);
    ctx.stroke();
  }
  ctx.fillStyle = invert ? GREEN_D : WHITE;
  ctx.font = `${Math.round(r * 1.2)}px KhangCn`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("康", cx, cy + r * 0.04);
}

/** Hair over the crown and the back of the skull, with a curved
 *  hairline running down the forehead and in front of the ear.
 *  Drawn as one closed path: hairline out to the nape, then the
 *  skull's own circle back over the top. */
/** The profile: forehead, brow, nose, lips, chin, jaw. The whole
 *  likeness of a face seen side-on is in this one outline, which is
 *  why it earns the detail even at this size. */
/** The two of them as stick figures. One colour, one weight, round
 *  caps and round joins throughout — a stick figure stops reading as
 *  one the moment some parts are strokes and others are filled
 *  shapes, so the only fills here are the head's bun and the eye.
 *  The pose rig underneath is the same one the drawn figures used:
 *  same shoulder, same hip, same arm solver, same beats. */
/** The two of them as solid silhouettes — filled bodies with real
 *  volume: a tapered torso, thick bent limbs, an oval head and no
 *  face at all. That is the pictogram the reference is drawn in.
 *  The far arm and leg take the darker ink so the pose survives the
 *  limbs overlapping, which is the one place pure black fails. */
/** One diner. A stick figure in the sense that matters — smooth
 *  tapered limbs, flat colour, clean edges, nothing rendered — but
 *  with a skin-toned head carrying a real profile: brow, eye, nose
 *  and a mouth that smiles. A featureless head cannot act, and the
 *  brief is two people enjoying each other's company.
 *
 *  Drawn facing +x and mirrored with scale(dir, 1).
 */
function drawFigure(ctx, o) {
  const {
    dir,
    lift = 0,
    gesture = 0,
    toast = 0,
    nod = 0,
    tilt = 0,
    breath = 0,
    bun = false,
    smile = 0,
    holding = 0,
    sticks = false,
    cup = false,
    chair = true,
    pal = GUESTS.m,
  } = o;

  ctx.save();
  ctx.scale(dir, 1);

  const R = 40;
  const SHO = { x: 10, y: -344 + breath };
  const HIP = { x: -8, y: -170 };
  const HEADC = { x: 20, y: -410 + breath + nod };

  /* contact shadow — the one piece of shading in the whole figure */
  ctx.fillStyle = "rgba(90,66,40,0.13)";
  ctx.beginPath();
  ctx.ellipse(8, -4, 132, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  if (chair) {
    ctx.fillStyle = WOOD_D;
    rrect(ctx, -120, -152, 13, 144, 5);
    ctx.fill();
    rrect(ctx, 22, -152, 13, 144, 5);
    ctx.fill();
    rrect(ctx, -124, -336, 15, 190, 6);
    ctx.fill();
    rrect(ctx, -138, -336, 48, 15, 6);
    ctx.fill();
    rrect(ctx, -116, -74, 142, 9, 4);
    ctx.fill();
    ctx.fillStyle = WOOD;
    rrect(ctx, -128, -166, 168, 16, 5);
    ctx.fill();
    ctx.fillStyle = WOOD_L;
    ctx.fillRect(-128, -166, 168, 3);
  }

  /* ── far leg and far arm, a shade back ─────────────────────── */
  taper(ctx, HIP.x, HIP.y, 66, -164, 50, 41, pal.legD);
  taper(ctx, 66, -164, 58, -22, 39, 28, pal.legD);
  ctx.fillStyle = pal.shoe;
  rrect(ctx, 48, -30, 62, 24, 11);
  ctx.fill();
  taper(ctx, SHO.x - 6, SHO.y + 14, 74, -256, 30, 24, pal.topD);
  taper(ctx, 74, -256, 132, -240, 23, 18, pal.topD);
  ctx.fillStyle = pal.skin;
  circle(ctx, 136, -238, 12);
  ctx.fill();

  /* ── torso, near leg, neck ─────────────────────────────────── */
  taper(ctx, HIP.x, HIP.y, SHO.x, SHO.y, 72, 86, pal.top);
  taper(ctx, HIP.x, HIP.y, 86, -166, 52, 43, pal.leg);
  taper(ctx, 86, -166, 78, -22, 41, 29, pal.leg);
  ctx.fillStyle = pal.shoe;
  rrect(ctx, 68, -30, 64, 25, 12);
  ctx.fill();
  taper(ctx, SHO.x, SHO.y, HEADC.x, HEADC.y + 24, 32, 26, pal.skin);

  /* collar, so the neck reads as meeting a garment */
  ctx.fillStyle = pal.topD;
  ctx.beginPath();
  ctx.moveTo(SHO.x - 26, SHO.y - 8);
  ctx.quadraticCurveTo(SHO.x + 4, SHO.y + 16, SHO.x + 30, SHO.y - 10);
  ctx.quadraticCurveTo(SHO.x + 4, SHO.y + 4, SHO.x - 26, SHO.y - 8);
  ctx.closePath();
  ctx.fill();

  /* ── head ──────────────────────────────────────────────────── */
  ctx.save();
  ctx.translate(HEADC.x, HEADC.y);
  ctx.rotate(tilt);

  ctx.fillStyle = pal.skin;
  circle(ctx, 0, 0, R);
  ctx.fill();
  /* the nose: without it a circle in profile reads as a ball */
  ctx.beginPath();
  ctx.moveTo(R - 7, -6);
  ctx.quadraticCurveTo(R + 10, 2, R - 8, 10);
  ctx.closePath();
  ctx.fill();

  /* hair as a band over the skull, not a cap over the face */
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.arc(0, 0, R + 2, Math.PI * (bun ? 1.0 : 0.96), Math.PI * 1.99);
  ctx.arc(-2, -2, R - 9, Math.PI * 1.99, Math.PI * (bun ? 1.0 : 0.96), true);
  ctx.closePath();
  ctx.fill();
  if (bun) {
    circle(ctx, -R - 6, -20, 17);
    ctx.fill();
  }

  /* brow, eye, mouth */
  ctx.strokeStyle = pal.hair;
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(9, -20);
  ctx.quadraticCurveTo(17, -25 - smile * 2, 26, -19);
  ctx.stroke();

  ctx.fillStyle = pal.line;
  ctx.beginPath();
  ctx.ellipse(18, -6, 4.6, 5.8 - smile * 2.0, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(19, 11);
  ctx.quadraticCurveTo(26, 11 + smile * 6, 33, 6 + smile * 1.5);
  ctx.stroke();
  ctx.restore();

  /* ── the acting arm ────────────────────────────────────────── */
  const u = easeInOut(clamp01(lift));
  const g = clamp01(gesture);
  const REST = { ex: 82, ey: -262, hx: 138, hy: -244 };
  const MOUTH = cup
    ? { ex: 96, ey: -296, hx: HEADC.x + 58, hy: HEADC.y + 42 }
    : { ex: 100, ey: -306, hx: HEADC.x + 58, hy: HEADC.y + 36 };
  const GEST = { ex: 52, ey: -288, hx: 104, hy: -368 };
  const TOAST = { ex: 94, ey: -320, hx: 154, hy: -372 };
  /* Blended in series, not added: rest → toast → mouth. Added, a
     raised cup that also goes to the lips overshoots off the head. */
  const wt = clamp01(toast);
  const bEx = REST.ex + wt * (TOAST.ex - REST.ex);
  const bEy = REST.ey + wt * (TOAST.ey - REST.ey);
  const bHx = REST.hx + wt * (TOAST.hx - REST.hx);
  const bHy = REST.hy + wt * (TOAST.hy - REST.hy);
  const ex = bEx + u * (MOUTH.ex - bEx) + g * (GEST.ex - REST.ex);
  const ey = bEy + u * (MOUTH.ey - bEy) + g * (GEST.ey - REST.ey);
  const hx = bHx + u * (MOUTH.hx - bHx) + g * (GEST.hx - REST.hx);
  const hy = bHy + u * (MOUTH.hy - bHy) + g * (GEST.hy - REST.hy);
  taper(ctx, SHO.x, SHO.y + 8, ex, ey, 31, 25, pal.top);
  taper(ctx, ex, ey, hx, hy, 24, 19, pal.top);
  ctx.fillStyle = pal.skin;
  circle(ctx, hx, hy, 12);
  ctx.fill();

  if (cup) {
    const ang = lerp(-1.62, -2.48, u);
    const reach = lerp(2, 12, u);
    ctx.save();
    ctx.translate(hx + reach * Math.cos(ang), hy + reach * Math.sin(ang));
    ctx.rotate(ang);
    ctx.fillStyle = CELADON;
    rrect(ctx, -5, -13, 37, 26, 5);
    ctx.fill();
    ctx.fillStyle = "#b9c3b2";
    rrect(ctx, 26, -13, 6, 26, 3);
    ctx.fill();
    ctx.restore();
  }

  if (sticks) {
    /* Solved against the head: the sticks straddle the hand so the
       tip lands on the mouth, not halfway across the cheek. */
    const ang = lerp(-2.95, -2.36, u);
    const reach = lerp(52, 40, u);
    const tail = 24;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const ox = -sa * 6;
    const oy = ca * 6;
    ctx.strokeStyle = "#8a6334";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx - tail * ca + ox * k, hy - tail * sa + oy * k);
      ctx.lineTo(hx + reach * ca + ox * k, hy + reach * sa + oy * k);
      ctx.stroke();
    }
    if (holding > 0.01) {
      ctx.fillStyle = CREAM;
      circle(ctx, hx + reach * ca, hy + reach * sa, 13 * holding);
      ctx.fill();
    }
  }

  ctx.restore();
}

function steam(ctx, x0, y0, t, strength, seedn) {
  if (strength <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,252,244,0.95)";
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const ph = t * 0.52 + i * 0.47 + seedn;
    const rise = ph % 1;
    const sx = x0 + (i - 1) * 15;
    ctx.lineWidth = 3.4;
    ctx.globalAlpha = (1 - rise) * 0.5 * Math.min(1, rise * 5) * strength;
    ctx.beginPath();
    ctx.moveTo(sx, y0);
    for (let k = 0; k <= 1.001; k += 0.25) {
      ctx.lineTo(
        sx + Math.sin(k * 3.1 + ph * 3.4) * (8 + k * 12) * strength,
        y0 - k * (70 + rise * 44) * strength,
      );
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The table and everything on it. `lidU` lifts the lid off the
 *  steamer stack, `eaten` is how many dumplings have left the
 *  plate — both are animated, so the food on the table changes
 *  over the film instead of sitting there as a still life. */
function drawTable(ctx, t, lidU = 0, eaten = 0) {
  const TOP = -232;
  const HALF = 230;

  ctx.fillStyle = WOOD;
  rrect(ctx, -HALF, TOP, HALF * 2, 22, 7);
  ctx.fill();
  ctx.fillStyle = WOOD_L;
  ctx.fillRect(-HALF, TOP, HALF * 2, 5);
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-HALF, TOP + 17, HALF * 2, 5);
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-182, TOP + 22, 364, 8);
  limb(ctx, -176, TOP + 28, -168, -6, 14, WOOD_D);
  limb(ctx, 176, TOP + 28, 168, -6, 14, WOOD_D);

  /* ── red clay teapot ───────────────────────────────────── */
  ctx.fillStyle = RED_D;
  circle(ctx, -176, TOP - 26, 28);
  ctx.fill();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(-176, TOP - 26, 28, Math.PI * 1.15, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = RED_D;
  rrect(ctx, -185, TOP - 62, 19, 11, 4);
  ctx.fill();
  ctx.strokeStyle = RED_D;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-201, TOP - 34);
  ctx.quadraticCurveTo(-228, TOP - 30, -224, TOP - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-154, TOP - 38);
  ctx.quadraticCurveTo(-131, TOP - 32, -152, TOP - 14);
  ctx.stroke();

  /* ── a bowl of noodles, lightly steaming ───────────────── */
  ctx.fillStyle = CELADON;
  ctx.beginPath();
  ctx.moveTo(-148, TOP - 36);
  ctx.quadraticCurveTo(-118, TOP + 4, -88, TOP - 36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#edd9a8";
  ctx.beginPath();
  ctx.ellipse(-118, TOP - 36, 30, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c3cebc";
  ctx.beginPath();
  ctx.ellipse(-118, TOP - 38, 30, 6, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  /* ── a single small steamer ────────────────────────────── */
  ctx.fillStyle = "#c99a5b";
  rrect(ctx, -88, TOP - 28, 68, 28, 6);
  ctx.fill();
  ctx.fillStyle = "#e0b876";
  rrect(ctx, -91, TOP - 40, 74, 13, 5);
  ctx.fill();
  ctx.fillStyle = "#ab7f3e";
  circle(ctx, -54, TOP - 42, 5);
  ctx.fill();

  /* ── the stack, whose lid comes off ────────────────────── */
  for (const i of [0, 1]) {
    const y = TOP - 30 - i * 27;
    ctx.fillStyle = i ? "#d7ab6a" : "#c99a5b";
    rrect(ctx, -17 + i * 3, y, 92 - i * 6, 31 - i * 2, 6);
    ctx.fill();
    ctx.strokeStyle = "#ab7f3e";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-11 + i * 3, y + 15);
    ctx.lineTo(69 - i * 3, y + 15);
    ctx.stroke();
  }
  /* dumplings sitting in the open top basket */
  if (lidU > 0.12) {
    ctx.save();
    ctx.globalAlpha = clamp01((lidU - 0.12) / 0.3);
    for (const dx of [8, 29, 50]) {
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.ellipse(dx, TOP - 64, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e3d2b2";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dx, TOP - 71);
      ctx.lineTo(dx, TOP - 59);
      ctx.stroke();
    }
    ctx.restore();
  }
  /* the lid itself, rising and tipping as it comes away */
  ctx.save();
  ctx.translate(31 + lidU * 10, TOP - 68 - lidU * 50);
  ctx.rotate(-lidU * 0.22);
  ctx.fillStyle = "#e0b876";
  rrect(ctx, -46, -8, 92, 15, 5);
  ctx.fill();
  ctx.fillStyle = "#ab7f3e";
  circle(ctx, 0, -11, 6);
  ctx.fill();
  ctx.restore();

  /* ── sauce dish ────────────────────────────────────────── */
  ctx.fillStyle = CELADON;
  ctx.beginPath();
  ctx.ellipse(108, TOP - 5, 19, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8c4a2c";
  ctx.beginPath();
  ctx.ellipse(108, TOP - 6, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  /* ── his plate: dumplings leave it as he eats ──────────── */
  ctx.fillStyle = CELADON;
  ctx.beginPath();
  ctx.ellipse(168, TOP - 4, 44, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  const plate = [146, 166, 186, 156, 176];
  for (let i = 0; i < plate.length; i++) {
    if (i < eaten) continue;
    const dx = plate[i];
    const dy = i > 2 ? TOP - 19 : TOP - 11;
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.ellipse(dx, dy, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ddc9a6";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(dx, dy - 8);
    ctx.lineTo(dx, dy + 5);
    ctx.stroke();
  }

  /* ── steam: the stack bursts when the lid lifts ────────── */
  steam(ctx, 31, TOP - 76, t, 0.45 + lidU * 1.15, 0);
  steam(ctx, -54, TOP - 44, t, 0.4, 1.7);
  steam(ctx, -118, TOP - 42, t, 0.5, 3.1);
  ctx.globalAlpha = 1;
}

/* ── The room ────────────────────────────────────────────────── */
/** The restaurant comes back as a space, not a building: a wall, a
 *  floor, two lit screens, two lanterns and a couple of tables far
 *  enough back to be atmosphere. It is drawn in the same flat
 *  language as the figures, and it is deliberately light — a dark
 *  floor swallows the wine figure's feet the moment the camera
 *  pulls out far enough to show them. */
/** A potted plant. Three fans of leaves off one stem cluster —
 *  enough to read as greenery at any distance without becoming a
 *  botanical study. */
function drawPlant(ctx, x, baseY, sc, seedn) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(sc, sc);
  ctx.fillStyle = "rgba(90,66,40,0.14)";
  ctx.beginPath();
  ctx.ellipse(0, -4, 78, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = POT_D;
  ctx.beginPath();
  ctx.moveTo(-54, -150);
  ctx.lineTo(54, -150);
  ctx.lineTo(40, -6);
  ctx.lineTo(-40, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = POT;
  ctx.beginPath();
  ctx.moveTo(-54, -150);
  ctx.lineTo(28, -150);
  ctx.lineTo(18, -6);
  ctx.lineTo(-40, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = POT_D;
  rrect(ctx, -60, -168, 120, 24, 6);
  ctx.fill();
  const leaves = [
    [-6, -0.2, 1.0, LEAF_D], [-30, -0.72, 0.86, LEAF],
    [26, 0.34, 0.9, LEAF], [-52, -1.08, 0.7, LEAF_D],
    [48, 0.78, 0.72, LEAF_L], [-16, -1.5, 0.95, LEAF],
    [14, -1.42, 0.8, LEAF_L],
  ];
  for (let i = 0; i < leaves.length; i++) {
    const [lx, ang, ls, col] = leaves[i];
    ctx.save();
    ctx.translate(lx, -158);
    ctx.rotate(ang + Math.sin(seedn + i) * 0.03);
    ctx.scale(ls, ls);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-34, -92, 0, -196);
    ctx.quadraticCurveTo(34, -92, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** A table of other diners, set further back. Smaller, raised off
 *  the floor line and desaturated — depth, not detail. */
function drawBgTable(ctx, x, baseY, sc, pair, t, ph) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(sc, sc);
  ctx.globalAlpha = 0.8;

  const TOP = -232;
  ctx.fillStyle = WOOD;
  rrect(ctx, -180, TOP, 360, 20, 7);
  ctx.fill();
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-156, TOP + 20, 312, 7);
  limb(ctx, -150, TOP + 26, -144, -6, 13, WOOD_D);
  limb(ctx, 150, TOP + 26, 144, -6, 13, WOOD_D);
  ctx.fillStyle = CELADON;
  ctx.beginPath();
  ctx.ellipse(-60, TOP - 6, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(62, TOP - 6, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c99a5b";
  rrect(ctx, -34, TOP - 34, 70, 28, 6);
  ctx.fill();

  for (const side of [-1, 1]) {
    const pal = pair[side < 0 ? 0 : 1];
    ctx.save();
    ctx.translate(side * 330, 0);
    drawFigure(ctx, {
      dir: -side,
      pal: { ...pal, line: "#33281e", legD: "#3c3a3f", leg: "#4a4852", shoe: "#2b2730" },
      bun: side < 0,
      smile: 0.7,
      chair: true,
      gesture: 0.34 + 0.3 * Math.sin(t * 1.1 + ph + side * 1.7),
      lift: clamp01(Math.sin(t * 0.72 + ph + side * 2.4) * 1.9 - 0.9),
      cup: side < 0,
      sticks: side > 0,
      nod: Math.sin(t * 1.25 + ph + side) * 1.6,
      tilt: Math.sin(t * 0.9 + ph + side * 2) * 0.02,
      breath: Math.sin(t * 0.95 + ph + side * 1.4) * 2,
    });
    ctx.restore();
  }
  ctx.restore();
}

/** The dining room, seen through the window. */
function drawInterior(ctx, t) {
  /* The room is a flat elevation, so depth is carried by the floor
     band: the back wall meets the floor at y = -230, the near edge
     of the floor is the window at y = 0. Anything standing at -230
     is across the room; anything at 0 is at the glass. */
  const BACK = -230;

  const wg = ctx.createLinearGradient(0, -1600, 0, -560);
  wg.addColorStop(0, IN_WALL_D);
  wg.addColorStop(1, IN_WALL);
  ctx.fillStyle = wg;
  ctx.fillRect(-1900, -1600, 3800, 1600 - 665);

  ctx.fillStyle = IN_WAINS;
  ctx.fillRect(-1900, -665, 3800, 665 + BACK);
  ctx.fillStyle = IN_RAIL;
  ctx.fillRect(-1900, -678, 3800, 15);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(-1900, -678, 3800, 4);

  const fg = ctx.createLinearGradient(0, BACK, 0, 40);
  fg.addColorStop(0, IN_FLOOR_F);
  fg.addColorStop(1, IN_FLOOR);
  ctx.fillStyle = fg;
  ctx.fillRect(-1900, BACK, 3800, 400);
  ctx.fillStyle = IN_RAIL;
  ctx.fillRect(-1900, BACK - 16, 3800, 17);

  /* scroll panels: the one piece of pattern in the room, kept to
     the band between the rail and the transom */
  for (const px of [-1080, -480, 120, 720]) {
    ctx.fillStyle = "rgba(94,66,38,0.1)";
    rrect(ctx, px - 96, -872, 190, 196, 5);
    ctx.fill();
    ctx.fillStyle = PAPER;
    rrect(ctx, px - 100, -878, 190, 196, 5);
    ctx.fill();
    ctx.fillStyle = "#9c7850";
    ctx.fillRect(px - 100, -878, 190, 12);
    ctx.fillRect(px - 100, -694, 190, 12);
    ctx.fillStyle = SCREEN_F;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(px - 40, -706);
    ctx.quadraticCurveTo(px - 18, -782, px + 26, -848);
    ctx.quadraticCurveTo(px - 4, -778, px + 4, -706);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = RED_D;
    circle(ctx, px + 50, -838, 12);
    ctx.fill();
  }

  /* lanterns — the soft light in the room. Kept off to the sides so
     the steam off the baskets keeps the middle to itself. */
  for (const lx of [-520, 520]) {
    const sway = Math.sin(t * 0.5 + lx) * 0.012;
    ctx.save();
    ctx.translate(lx, -1250);
    ctx.rotate(sway);
    ctx.strokeStyle = "#8d6a44";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 496);
    ctx.stroke();
    ctx.fillStyle = "#6d4d31";
    rrect(ctx, -18, 490, 36, 14, 3);
    ctx.fill();
    ctx.fillStyle = RED_D;
    ctx.beginPath();
    ctx.ellipse(0, 548, 52, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.ellipse(-9, 544, 39, 37, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6d4d31";
    rrect(ctx, -18, 584, 36, 12, 3);
    ctx.fill();
    ctx.strokeStyle = GLOW_D;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 596);
    ctx.lineTo(0, 638);
    ctx.stroke();
    const lg = ctx.createRadialGradient(0, 548, 20, 0, 548, 250);
    lg.addColorStop(0, "rgba(243,189,99,0.28)");
    lg.addColorStop(1, "rgba(243,189,99,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(-260, 298, 520, 500);
    ctx.restore();
  }

  /* greenery, one at the back of the room and one by the glass */
  drawPlant(ctx, -1330, BACK, 0.6, 0.4);
  drawPlant(ctx, -1245, -34, 0.9, 2.1);
  drawPlant(ctx, 1020, -26, 0.82, 3.3);

  /* the other diners, across the room */
  drawBgTable(ctx, -800, BACK, 0.46, [EXTRAS[0], EXTRAS[1]], t, 0.0);
  drawBgTable(ctx, 800, BACK, 0.46, [EXTRAS[2], EXTRAS[3]], t, 1.6);
}

function drawFacade(ctx, t) {
  const g = FC;
  const u = camU(t);

  /* pavement */
  ctx.fillStyle = PAVE;
  ctx.fillRect(-3000, 0, 6000, 520);
  ctx.fillStyle = PAVE_D;
  ctx.fillRect(-3000, 0, 6000, 11);
  ctx.fillStyle = "rgba(0,0,0,0.045)";
  for (let x = -2800; x < 2800; x += 340) ctx.fillRect(x, 14, 6, 506);

  /* The building face, with the shopfront opening punched out of
     it. evenodd, so the opening is a true hole and the room shows
     through rather than being painted over. */
  const open = { l: g.glassL - 26, r: g.doorR + 26, t: g.glassTop - 26 };
  ctx.fillStyle = FAC_WALL;
  ctx.beginPath();
  ctx.rect(-g.halfW, g.corniceTop, g.halfW * 2, -g.corniceTop);
  ctx.rect(open.l, open.t, open.r - open.l, g.plinth - open.t);
  ctx.fill("evenodd");

  /* the piers either side catch more light than the recessed face */
  ctx.fillStyle = FAC_PIER;
  ctx.fillRect(-g.halfW, g.canopy, open.l + g.halfW, -g.canopy);
  ctx.fillRect(open.r, g.canopy, g.halfW - open.r, -g.canopy);
  ctx.fillStyle = FAC_WALL_D;
  ctx.fillRect(open.l - 12, g.canopy, 12, -g.canopy);
  ctx.fillRect(open.r, g.canopy, 12, -g.canopy);

  /* ── glass ────────────────────────────────────────────────── *
   * One clear sheet, so at the top of the film nothing of the
   * shopfront is between us and the table. The grid lives in the
   * transom light above, out of the opening frame.               */
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.glassL, g.glassTop, g.doorR - g.glassL, g.plinth - g.glassTop);
  ctx.clip();
  ctx.globalAlpha = 0.09 + 0.1 * u;
  ctx.fillStyle = "#ffffff";
  for (const ox of [-1180, -40, 900]) {
    ctx.beginPath();
    ctx.moveTo(ox, g.plinth);
    ctx.lineTo(ox + 420, g.glassTop);
    ctx.lineTo(ox + 650, g.glassTop);
    ctx.lineTo(ox + 230, g.plinth);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  /* the door, at the right-hand end of the opening */
  ctx.fillStyle = FAC_FRAME;
  ctx.fillRect(g.doorL, g.glassTop, g.doorR - g.doorL, g.plinth - g.glassTop);
  ctx.fillStyle = "rgba(255,246,222,0.26)";
  ctx.fillRect(g.doorL + 30, g.glassTop + 30, g.doorR - g.doorL - 60, -g.glassTop - 330);
  ctx.fillStyle = FAC_FRAME_D;
  ctx.fillRect(g.doorL + 30, -290, g.doorR - g.doorL - 60, 110);
  ctx.fillStyle = "#c9a349";
  rrect(ctx, g.doorR - 78, -660, 13, 176, 6);
  ctx.fill();

  /* ── transom lattice ──────────────────────────────────────── */
  ctx.fillStyle = FAC_FRAME;
  ctx.fillRect(g.glassL, g.transom - 11, g.doorR - g.glassL, 22);
  const mid = (g.glassTop + g.transom) / 2;
  ctx.fillRect(g.glassL, mid - 8, g.doorR - g.glassL, 16);
  for (let x = g.glassL; x <= g.doorR + 1; x += 260) {
    ctx.fillRect(x - 8, g.glassTop, 16, g.transom - g.glassTop);
  }
  ctx.fillRect(g.doorR - 8, g.glassTop, 16, g.transom - g.glassTop);

  /* opening frame and stall riser */
  ctx.fillStyle = FAC_FRAME;
  ctx.fillRect(g.glassL - 26, g.glassTop - 26, g.doorR - g.glassL + 52, 26);
  ctx.fillRect(g.glassL - 26, g.glassTop, 26, g.plinth - g.glassTop);
  ctx.fillRect(g.doorR, g.glassTop, 26, g.plinth - g.glassTop);
  ctx.fillStyle = FAC_FRAME_D;
  ctx.fillRect(-g.halfW, g.plinth, g.halfW * 2, -g.plinth);
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.fillRect(-g.halfW, g.plinth, g.halfW * 2, 5);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(-g.halfW, -14, g.halfW * 2, 14);

  /* canopy */
  ctx.fillStyle = FAC_FRAME_D;
  rrect(ctx, -g.halfW - 30, g.canopy, (g.halfW + 30) * 2, 58, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(-g.halfW - 30, g.canopy, (g.halfW + 30) * 2, 6);

  /* fascia + cornice */
  ctx.fillStyle = FASCIA;
  ctx.fillRect(-g.halfW, g.fasciaTop, g.halfW * 2, g.canopy - g.fasciaTop);
  ctx.fillStyle = SIGN;
  ctx.fillRect(-g.halfW, g.canopy - 9, g.halfW * 2, 9);
  ctx.fillStyle = FAC_WALL_D;
  ctx.fillRect(-g.halfW - 38, g.corniceTop, (g.halfW + 38) * 2, g.fasciaTop - g.corniceTop);
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.fillRect(-g.halfW - 38, g.corniceTop, (g.halfW + 38) * 2, 7);
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.fillRect(-g.halfW, g.fasciaTop, g.halfW * 2, 6);

  /* ── the sign ─────────────────────────────────────────────── *
   * Green on cream, one lockup: the 康 roundel, the name, and the
   * line underneath. It warms up as the camera settles on it.     */
  const lit = seg(t, 9.0, 10.3, easeInOut);
  ctx.save();
  if (lit > 0) {
    const sg = ctx.createRadialGradient(0, -1280, 80, 0, -1280, 1700);
    sg.addColorStop(0, `rgba(255,238,190,${0.42 * lit})`);
    sg.addColorStop(1, "rgba(255,238,190,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(-g.halfW, g.fasciaTop, g.halfW * 2, g.canopy - g.fasciaTop);
  }

  roundel(ctx, -940, -1282, 96, true);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = SIGN_D;
  ctx.font = '700 132px KhangDisplay, serif';
  tracked(ctx, "KHANG DIMSUM", 460, -1286, 13);

  ctx.fillStyle = SIGN;
  ctx.fillRect(100, -1256, 720, 5);

  ctx.fillStyle = SIGN;
  ctx.font = '600 46px KhangBody, sans-serif';
  tracked(ctx, "CHINESE RESTAURANT", 460, -1196, 15);
  ctx.restore();

  /* a planter on the pavement, by the door */
  drawPlant(ctx, 1610, 0, 0.72, 1.2);
}

function drawScene(ctx, t) {
  drawInterior(ctx, t);

  /* a lift-hold-lower envelope, reused for every beat */
  const arc = (a, b, c, d) => {
    if (t >= a && t < b) return seg(t, a, b, easeInOut);
    if (t >= b && t < c) return 1;
    if (t >= c && t < d) return 1 - seg(t, c, d, easeInOut);
    return 0;
  };

  /* The food leads — the lid lifts and the steam goes up before
     anybody reaches for anything — and every beat is front-loaded,
     because by eight seconds the camera is out on the pavement and
     the two of them are small. */
  const lidU = arc(0.4, 1.2, 2.2, 2.9);
  const liftR = arc(1.5, 2.3, 2.8, 3.6);  // he eats
  const gestL1 = arc(2.9, 3.4, 4.2, 4.7); // she answers
  const liftL = arc(4.2, 4.9, 5.4, 6.0);  // she drinks
  const gestR = arc(4.9, 5.3, 5.9, 6.4);  // he says something
  const toastW = arc(6.2, 6.9, 7.6, 8.2); // cups up, together
  const sipBoth = arc(7.0, 7.4, 7.7, 8.1);

  const atMouth = 2.3;
  const biteEnd = 2.8;
  const eaten = t > atMouth ? 1 : 0;

  drawTable(ctx, t, lidU, eaten);

  const wobble = 0.84 + 0.16 * Math.sin(t * 2.2);
  const laughU = t > 5.4 && t < 6.3 ? Math.sin(((t - 5.4) / 0.9) * Math.PI) : 0;

  const chewing = t > biteEnd && t < biteEnd + 1.5;
  const nodR =
    (chewing ? Math.sin((t - biteEnd) * 6.4) * 3.0 : Math.sin(t * 1.3) * 1.0) +
    laughU * Math.sin(t * 6.2) * 0.9;
  const holdingR =
    t < atMouth - 0.02
      ? (t > 1.6 ? 1 : 0)
      : clamp01(1 - (t - (atMouth - 0.02)) / 0.2);

  /* They are enjoying themselves, so no mouth is ever flat: a base
     smile that lifts while they talk, laugh and raise a cup. */
  const smileL = clamp01(0.42 + gestL1 * 0.4 + laughU * 0.6 + toastW * 0.3);
  const smileR = clamp01(0.38 + gestR * 0.4 + laughU * 0.55 + toastW * 0.3);

  ctx.save();
  ctx.translate(-366, 0);
  drawFigure(ctx, {
    dir: 1,
    pal: GUESTS.w,
    bun: true,
    cup: true,
    smile: smileL,
    lift: Math.max(liftL, sipBoth),
    toast: toastW,
    gesture: gestL1 * wobble,
    tilt:
      Math.sin(t * 1.1) * 0.014 +
      gestL1 * Math.sin(t * 2.4) * 0.026 -
      laughU * 0.07,
    nod: Math.sin(t * 1.3) * 1.0 - laughU * 3.0 + laughU * Math.sin(t * 6.6) * 1.0,
    breath: Math.sin(t * 1.0) * 2.1,
  });
  ctx.restore();

  ctx.save();
  ctx.translate(366, 0);
  drawFigure(ctx, {
    dir: -1,
    pal: GUESTS.m,
    /* he sets the chopsticks down to pick his cup up for the toast */
    sticks: t < 5.95,
    cup: t >= 5.95,
    smile: smileR,
    lift: Math.max(liftR, sipBoth),
    toast: toastW,
    gesture: gestR * wobble,
    nod: nodR,
    tilt: Math.sin(t * 1.0 + 2) * 0.012 - liftR * 0.025 + laughU * 0.05,
    breath: Math.sin(t * 1.0 + 2.1) * 2.1,
    holding: holdingR,
  });
  ctx.restore();

  drawFacade(ctx, t);
}

function camera(t) {
  /* One continuous move: a two-shot of the pair eating, then back
     and back and out through the window until the whole shopfront
     stands in frame. expLerp, not lerp — stepping evenly through
     scale reads as decelerating, and this has to land as a single
     pull. It arrives at 9.2s and holds, so the sign gets three
     clear seconds to be read. */
  const u = camU(t);
  return {
    scale: expLerp(4.8, 1.42, u),
    cx: 960 + Math.sin(t * 0.22) * 1.6,
    cy: lerp(739, 591, u),
  };
}

const GRAIN = [];

function buildGrain() {
  for (let n = 0; n < 5; n++) {
    const c = createCanvas(256, 256);
    const x = c.getContext("2d");
    const img = x.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    GRAIN.push(c);
  }
}

/* ── One frame ───────────────────────────────────────────────── */
function renderFrame(ctx, t, frame) {
  const cam = camera(t);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const bd = ctx.createRadialGradient(W / 2, H * 0.44, 80, W / 2, H * 0.5, W * 0.72);
  bd.addColorStop(0, "#f7efde");
  bd.addColorStop(1, "#e8dcc6");
  ctx.fillStyle = bd;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.cx, -cam.cy);
  ctx.translate(ORIGIN.x, ORIGIN.y);
  ctx.scale(K, K);
  drawScene(ctx, t);
  ctx.restore();

  const vg = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.4, W / 2, H * 0.5, H * 1.02);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(74,56,30,0.075)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.globalCompositeOperation = "overlay";
  const g = GRAIN[frame % GRAIN.length];
  for (let y = 0; y < H; y += 256) {
    for (let x = 0; x < W; x += 256) ctx.drawImage(g, x, y);
  }
  ctx.restore();

  const fade = 1 - seg(t, 0, 0.5, (u) => u);
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ── Main ────────────────────────────────────────────────────── */
function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
  }
  buildGrain();

  const only = process.env.ONLY_FRAMES
    ? process.env.ONLY_FRAMES.split(",").map(Number)
    : null;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const total = Math.round(DURATION * FPS);
  const started = Date.now();

  for (let i = 0; i < total; i++) {
    if (only && !only.includes(i)) continue;
    renderFrame(ctx, i / FPS, i);
    fs.writeFileSync(
      path.join(OUT, `f_${String(i).padStart(4, "0")}.png`),
      canvas.toBuffer("image/png"),
    );
  }
  console.log(
    `rendered ${only ? only.length : total} frames to ${OUT} in ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
}

main();
