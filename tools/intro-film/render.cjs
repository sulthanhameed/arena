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

/* The guests, in colour. Still pictograms — flat fills, no outline,
 * no features — but skin, hair and cloth instead of one solid ink.
 * Her clay against his green is the only strong colour contrast in
 * the room, which is what keeps the pair reading as the subject once
 * the camera has pulled back to the whole shopfront. */
/* Stick figures carry one colour each. They have to read apart at a
   glance across the table and sit on cream without shouting, so the
   pair is a muted wine and a deep teal rather than two primaries. */
/* One flat colour each, plus a darker tone of the same ink for the
   far arm and leg. The reference is pure black and lets the limbs
   merge; at video scale that loses the pose, and a second tone
   costs nothing because it is still a silhouette. */
const GUESTS = {
  w: { ink: "#9d4458", inkD: "#7a3344", bun: true },
  m: { ink: "#2d5f6b", inkD: "#214954", bun: false },
};

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
    holding = 0,
    sticks = false,
    cup = false,
    pal = GUESTS.m,
  } = o;

  ctx.save();
  ctx.scale(dir, 1);

  const SHO = { x: 10, y: -344 + breath };
  const HIP = { x: -8, y: -170 };
  const HEADC = { x: 20, y: -404 + breath + nod };

  /* ── chair ─────────────────────────────────────────────── */
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

  /* ── far leg and far arm, the darker ink ───────────────── */
  taper(ctx, HIP.x, HIP.y, 68, -164, 52, 42, pal.inkD);
  taper(ctx, 68, -164, 60, -20, 40, 29, pal.inkD);
  taper(ctx, 60, -20, 104, -13, 27, 21, pal.inkD);
  taper(ctx, SHO.x - 6, SHO.y + 14, 74, -256, 31, 25, pal.inkD);
  taper(ctx, 74, -256, 132, -240, 24, 19, pal.inkD);
  ctx.fillStyle = pal.inkD;
  circle(ctx, 134, -239, 12);
  ctx.fill();

  /* ── torso, near leg, neck ─────────────────────────────── */
  taper(ctx, HIP.x, HIP.y, SHO.x, SHO.y, 76, 90, pal.ink);
  taper(ctx, HIP.x, HIP.y, 86, -166, 54, 44, pal.ink);
  taper(ctx, 86, -166, 78, -20, 42, 30, pal.ink);
  taper(ctx, 78, -20, 124, -12, 28, 22, pal.ink);
  taper(ctx, SHO.x, SHO.y, HEADC.x, HEADC.y + 20, 34, 28, pal.ink);

  /* ── head ──────────────────────────────────────────────── */
  ctx.save();
  ctx.translate(HEADC.x, HEADC.y);
  ctx.rotate(tilt);
  ctx.fillStyle = pal.ink;
  if (bun) {
    circle(ctx, -27, -23, 15);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 29, 33, -0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* ── the acting arm ────────────────────────────────────── */
  const u = easeInOut(clamp01(lift));
  const g = clamp01(gesture);
  const REST = { ex: 82, ey: -262, hx: 138, hy: -244 };
  const MOUTH = cup
    ? { ex: 96, ey: -296, hx: HEADC.x + 58, hy: HEADC.y + 42 }
    : { ex: 100, ey: -306, hx: HEADC.x + 58, hy: HEADC.y + 36 };
  const GEST = { ex: 52, ey: -288, hx: 104, hy: -368 };
  const TOAST = { ex: 94, ey: -320, hx: 154, hy: -372 };
  /* Blended in series, not added: rest → toast → mouth. Added, a
     raised cup that also goes to the lips overshoots clean off the
     top of the head. */
  const wt = clamp01(toast);
  const bEx = REST.ex + wt * (TOAST.ex - REST.ex);
  const bEy = REST.ey + wt * (TOAST.ey - REST.ey);
  const bHx = REST.hx + wt * (TOAST.hx - REST.hx);
  const bHy = REST.hy + wt * (TOAST.hy - REST.hy);
  const ex = bEx + u * (MOUTH.ex - bEx) + g * (GEST.ex - REST.ex);
  const ey = bEy + u * (MOUTH.ey - bEy) + g * (GEST.ey - REST.ey);
  const hx = bHx + u * (MOUTH.hx - bHx) + g * (GEST.hx - REST.hx);
  const hy = bHy + u * (MOUTH.hy - bHy) + g * (GEST.hy - REST.hy);
  taper(ctx, SHO.x, SHO.y + 8, ex, ey, 33, 26, pal.ink);
  taper(ctx, ex, ey, hx, hy, 25, 20, pal.ink);
  ctx.fillStyle = pal.ink;
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
    /* Solved against the head, not eyeballed: the sticks straddle
       the hand so the tip lands on the mouth rather than halfway
       across the skull. */
    const ang = lerp(-2.95, -2.49, u);
    const reach = lerp(52, 43, u);
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

/** One ribbon of steam. Fixed phase per source so it never crawls
 *  between frames, strength drives both opacity and height. */
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
function drawRoom(ctx, t) {
  const wg = ctx.createLinearGradient(0, -1000, 0, 0);
  wg.addColorStop(0, RM_WALL_T);
  wg.addColorStop(0.58, RM_WALL);
  wg.addColorStop(1, "#e0d3b9");
  ctx.fillStyle = wg;
  ctx.fillRect(-1700, -1200, 3400, 1200);

  /* dado rail, well above the heads so it never cuts through one */
  ctx.fillStyle = RM_WALL_D;
  ctx.fillRect(-1700, -492, 3400, 7);

  /* lit screens, the only light source in the room */
  for (const wx of [-700, 700]) {
    ctx.fillStyle = RM_FRAME;
    rrect(ctx, wx - 126, -712, 252, 410, 9);
    ctx.fill();
    const pg = ctx.createLinearGradient(0, -700, 0, -314);
    pg.addColorStop(0, "#fdf0d6");
    pg.addColorStop(1, RM_GLASS);
    ctx.fillStyle = pg;
    rrect(ctx, wx - 113, -699, 226, 384, 6);
    ctx.fill();
    ctx.fillStyle = RM_FRAME;
    ctx.fillRect(wx - 4, -699, 8, 384);
    ctx.fillRect(wx - 113, -519, 226, 8);
    ctx.save();
    const sg = ctx.createRadialGradient(wx, -507, 20, wx, -507, 300);
    sg.addColorStop(0, "rgba(255,226,166,0.3)");
    sg.addColorStop(1, "rgba(255,226,166,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(wx - 320, -820, 640, 640);
    ctx.restore();
  }

  /* two lanterns, off to the sides: the centre has to stay clear
     for the steam coming off the table */
  for (const lx of [-468, 468]) {
    ctx.strokeStyle = "#8d6a44";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lx, -1200);
    ctx.lineTo(lx, -742);
    ctx.stroke();
    ctx.fillStyle = "#6d4d31";
    rrect(ctx, lx - 16, -748, 32, 12, 3);
    ctx.fill();
    ctx.fillStyle = RED_D;
    ctx.beginPath();
    ctx.ellipse(lx, -700, 44, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.ellipse(lx - 7, -704, 33, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6d4d31";
    rrect(ctx, lx - 16, -668, 32, 10, 3);
    ctx.fill();
    ctx.strokeStyle = GLOW_D;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lx, -658);
    ctx.lineTo(lx, -622);
    ctx.stroke();
    const lg = ctx.createRadialGradient(lx, -700, 20, lx, -700, 190);
    lg.addColorStop(0, "rgba(243,189,99,0.26)");
    lg.addColorStop(1, "rgba(243,189,99,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(lx - 200, -900, 400, 400);
  }

  /* floor */
  ctx.fillStyle = RM_FLOOR;
  ctx.fillRect(-1700, 0, 3400, 700);
  ctx.fillStyle = RM_WALL_D;
  ctx.fillRect(-1700, -20, 3400, 20);
  ctx.fillStyle = "#b39070";
  ctx.fillRect(-1700, 0, 3400, 5);
  const fg = ctx.createLinearGradient(0, 0, 0, 420);
  fg.addColorStop(0, "rgba(255,240,210,0.22)");
  fg.addColorStop(1, "rgba(255,240,210,0)");
  ctx.fillStyle = fg;
  ctx.fillRect(-1700, 0, 3400, 420);
  ctx.fillStyle = RM_FLOOR_D;
  ctx.fillRect(-1700, 330, 3400, 400);
}

/* ── The dining room ─────────────────────────────────────────── */
/** Room, table, then the two of them. Twelve seconds now, so every
 *  beat has roughly half again as long to play as it used to. */
function drawScene(ctx, t) {
  drawRoom(ctx, t);

  /* a lift-hold-lower envelope, reused for both guests */
  const arc = (a, b, c, d) => {
    if (t >= a && t < b) return seg(t, a, b, easeInOut);
    if (t >= b && t < c) return 1;
    if (t >= c && t < d) return 1 - seg(t, c, d, easeInOut);
    return 0;
  };

  /* The food leads: the lid comes off the stack and the steam
     bursts before anybody reaches for anything. */
  const lidU = arc(0.5, 1.4, 2.5, 3.2);

  const liftR = arc(1.8, 2.7, 3.2, 4.1); // he eats
  const gestL1 = arc(3.4, 3.9, 4.7, 5.2); // she answers
  const liftL = arc(4.6, 5.3, 5.9, 6.6); // she drinks
  const gestR = arc(5.4, 5.8, 6.4, 6.9); // he says something
  const toastW = arc(6.7, 7.4, 8.3, 8.9); // cups up, together
  const sipBoth = arc(7.6, 8.0, 8.3, 8.7); // and a drink to it
  const gestL2 = arc(8.4, 8.7, 8.9, 9.1); // still talking as we leave

  const atMouth = 2.7;
  const biteEnd = 3.2;
  const eaten = t > atMouth ? 1 : 0;

  drawTable(ctx, t, lidU, eaten);

  const wobble = 0.84 + 0.16 * Math.sin(t * 2.2);
  const gestureL = (gestL1 + gestL2) * wobble;
  const gestureR = gestR * wobble;

  const laughU =
    t > 7.9 && t < 8.8 ? Math.sin(((t - 7.9) / 0.9) * Math.PI) : 0;

  const chewing = t > biteEnd && t < biteEnd + 1.6;
  const nodR =
    (chewing ? Math.sin((t - biteEnd) * 6.4) * 3.0 : Math.sin(t * 1.3) * 1.0) +
    laughU * Math.sin(t * 6.2) * 0.9;
  const holdingR =
    t < atMouth - 0.02 ? (t > 1.9 ? 1 : 0)
      : clamp01(1 - (t - (atMouth - 0.02)) / 0.2);

  const tiltL =
    Math.sin(t * 1.1) * 0.014 +
    (gestL1 + gestL2) * Math.sin(t * 2.4) * 0.026 -
    laughU * 0.075;
  const nodL =
    Math.sin(t * 1.3) * 1.0 - laughU * 3.2 + laughU * Math.sin(t * 6.6) * 1.0;

  const breathe = (ph) => Math.sin(t * 1.0 + ph) * 2.1;

  ctx.save();
  ctx.translate(-366, 0);
  drawFigure(ctx, {
    dir: 1,
    pal: GUESTS.w,
    bun: true,
    cup: true,
    lift: Math.max(liftL, sipBoth),
    toast: toastW,
    gesture: gestureL,
    tilt: tiltL,
    nod: nodL,
    breath: breathe(0),
  });
  ctx.restore();

  ctx.save();
  ctx.translate(366, 0);
  drawFigure(ctx, {
    dir: -1,
    pal: GUESTS.m,
    /* he puts the chopsticks down to pick his cup up for the toast */
    sticks: t < 6.45,
    cup: t >= 6.45,
    lift: Math.max(liftR, sipBoth),
    toast: toastW,
    gesture: gestureR,
    nod: nodR,
    tilt: Math.sin(t * 1.0 + 2) * 0.012 - liftR * 0.025 + laughU * 0.055,
    breath: breathe(2.1),
    holding: holdingR,
  });
  ctx.restore();
}

function drawEndCard(ctx, t) {
  const cx = W / 2;

  /* roundel */
  const aMark = seg(t, 9.55, 10.25, easeOut);
  if (aMark > 0) {
    ctx.save();
    ctx.globalAlpha = aMark;
    ctx.translate(cx, 452);
    const s = lerp(0.88, 1, aMark);
    ctx.scale(s, s);
    ctx.shadowColor = "rgba(6,78,46,0.18)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 12;
    roundel(ctx, 0, 0, 92, null);
    ctx.restore();
  }

  /* KHANG */
  const aName = seg(t, 10.3, 11.0);
  if (aName > 0) {
    ctx.save();
    ctx.fillStyle = GREEN_D;
    ctx.font = "112px KhangDisplay";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    tracked(ctx, "KHANG", cx, 672, 24, (i, n) =>
      clamp01((aName - (i / n) * 0.55) / 0.45),
    );
    ctx.restore();
  }

  /* jade hairline */
  const aRule = seg(t, 10.95, 11.25);
  if (aRule > 0) {
    ctx.save();
    ctx.globalAlpha = aRule;
    const rw = 300 * aRule;
    const rg = ctx.createLinearGradient(cx - rw / 2, 0, cx + rw / 2, 0);
    rg.addColorStop(0, "rgba(22,163,74,0)");
    rg.addColorStop(0.5, JADE);
    rg.addColorStop(1, "rgba(22,163,74,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(cx - rw / 2, 712, rw, 2);
    ctx.restore();
  }

  /* descriptor */
  const aSub = seg(t, 11.1, 11.5);
  if (aSub > 0) {
    ctx.save();
    ctx.globalAlpha = aSub;
    ctx.fillStyle = "rgba(6,78,46,0.82)";
    ctx.font = "23px KhangSans";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    tracked(ctx, "DIMSUM CHINESE RESTAURANT", cx, 764, 9);
    ctx.restore();
  }
}

/* ── Camera ──────────────────────────────────────────────────── *
 * Scale 4.3 is a two-shot across the table; scale 1 frames the
 * whole shopfront. One continuous move, held at each end.          */
function camera(t) {
  /* Open tight on the pair and the table — no floor, no lanterns,
     nothing but the two of them — and pull all the way back to the
     room over 8.9s. expLerp, not lerp: a zoom that steps evenly
     through scale reads as decelerating, and this has to land as
     one continuous move. */
  const u = seg(t, 0, 8.9, easeInOut);
  return {
    scale: expLerp(5.0, 2.72, u),
    cx: 960 + Math.sin(t * 0.26) * 1.5,
    cy: lerp(762, 757, u),
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

  const wash = seg(t, 8.9, 9.6, easeInOut);
  if (wash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${wash})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (t >= 9.5) drawEndCard(ctx, t);

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
