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
const DURATION = 10.0;
const OUT = process.argv[2] || "/tmp/vid/frames";

/* ── Palette ─────────────────────────────────────────────────── *
 * Restrained and warm: soft white plaster, light oak, one green,
 * one amber. The guests are a single solid ink, so every bit of
 * colour in the frame belongs to the room rather than to them.    */
const WALL = "#f7f1e6";
const WALL_D = "#ece2cf";
const PAPER = "#f4ecda";
const FLOOR = "#c49d71";
const FLOOR_D = "#aa8255";
const FLOOR_L = "#d8b58a";

const WOOD = "#c99f72";
const WOOD_D = "#a87c51";
const WOOD_L = "#e0c29b";

const GREEN = "#15803d";
const GREEN_D = "#064e2e";
const GREEN_DD = "#05361f";
const JADE = "#16a34a";
const SCREEN_F = "#2f6b49";

const GLOW = "#f7cd78";
const GLOW_D = "#e2a63f";
const LAMP = "#fff2d2";

const RED = "#b3392b";
const RED_D = "#8b291d";
const CELADON = "#dfe6d9";
const CREAM = "#faf6ef";
const WHITE = "#ffffff";

const INK = "#15181a"; // the guests
const INK_2 = "#232a2e"; // guests further back

const NIGHT_T = "#091018";
const NIGHT_B = "#1b2836";
const BUILD = "#15402a";
const BUILD_L = "#1d5538";
const BUILD_LL = "#2a6b48";
const STREET = "#0f161d";

/* ── Geometry ────────────────────────────────────────────────── */
const GLASS = { x: 430, y: 430, w: 1060, h: 450 };
const GROUND = 880;
const BOARD = { x: 630, y: 284, w: 660, h: 136 };
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
function roundel(ctx, cx, cy, r, ring) {
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, GREEN);
  g.addColorStop(1, GREEN_D);
  ctx.fillStyle = g;
  circle(ctx, cx, cy, r);
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = r * 0.062;
    circle(ctx, cx, cy, r);
    ctx.stroke();
  }
  ctx.fillStyle = WHITE;
  ctx.font = `${Math.round(r * 1.2)}px KhangCn`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("康", cx, cy + r * 0.04);
}

/* ── The guests ──────────────────────────────────────────────── *
 * Pictograms: a circle for the head, a tapered body, round-capped
 * bars for the limbs, no face. Everything that has to read — the
 * lift, the bite, the chewing, the talking — has to read as pose,
 * because there are no features to carry it.                      */
function drawFigure(ctx, o) {
  const {
    dir, // +1 faces right, -1 faces left
    lift = 0, // 0 hand at the table … 1 hand at the mouth
    gesture = 0, // 0 hand at the table … 1 raised, making a point
    nod = 0, // head offset, units
    tilt = 0, // head rotation, radians
    breath = 0,
    bun = false,
    holding = 0, // dumpling scale at the chopstick tip
    sticks = false,
    ink = INK,
  } = o;

  ctx.save();
  ctx.scale(dir, 1); // drawn facing right, mirrored as a whole

  const SHO = { x: 6, y: -330 + breath };
  const HEADC = { x: 20, y: -404 + breath + nod };
  const R = 52;

  /* chair */
  ctx.fillStyle = WOOD_D;
  rrect(ctx, -120, -152, 13, 144, 5);
  ctx.fill();
  rrect(ctx, 22, -152, 13, 144, 5);
  ctx.fill();
  rrect(ctx, -124, -330, 15, 184, 6);
  ctx.fill();
  rrect(ctx, -138, -330, 48, 15, 6);
  ctx.fill();
  rrect(ctx, -116, -74, 142, 9, 4);
  ctx.fill();
  ctx.fillStyle = WOOD;
  rrect(ctx, -128, -166, 168, 16, 5);
  ctx.fill();
  ctx.fillStyle = WOOD_L;
  ctx.fillRect(-128, -166, 168, 3);

  ctx.fillStyle = ink;

  /* leg: thigh along the seat, shin to the floor, foot */
  limb(ctx, -8, -158, 80, -152, 40, ink);
  limb(ctx, 80, -152, 72, -22, 34, ink);
  rrect(ctx, 48, -30, 64, 24, 11);
  ctx.fill();

  /* body: one clean tapered mass, shoulders dropping into the arms */
  ctx.beginPath();
  ctx.moveTo(-50, -148);
  ctx.quadraticCurveTo(-58, -248, -46, -316);
  ctx.quadraticCurveTo(-32, -348, 4, -348);
  ctx.quadraticCurveTo(40, -348, 52, -314);
  ctx.quadraticCurveTo(62, -244, 56, -148);
  ctx.closePath();
  ctx.fill();

  /* the resting arm, reaching onto the table */
  limb(ctx, SHO.x + 12, SHO.y + 30, 92, -250, 27, ink);
  limb(ctx, 92, -250, 146, -242, 24, ink);

  /* head — a plain circle, held clear of the shoulders like the
     pictogram it is modelled on */
  ctx.save();
  ctx.translate(HEADC.x, HEADC.y);
  ctx.rotate(tilt);
  ctx.fillStyle = ink;
  circle(ctx, 0, 0, R);
  ctx.fill();
  if (bun) {
    circle(ctx, -R * 0.94, -R * 0.44, R * 0.33);
    ctx.fill();
  }
  ctx.restore();

  /* the acting arm: rest → mouth (lift) or rest → raised (gesture) */
  const u = easeInOut(clamp01(lift));
  const g = clamp01(gesture);
  const REST = { ex: 78, ey: -266, hx: 142, hy: -238 };
  const MOUTH = { ex: 116, ey: -280, hx: 130, hy: HEADC.y + 44 };
  const GEST = { ex: 44, ey: -266, hx: 108, hy: -346 };
  const ex = REST.ex + u * (MOUTH.ex - REST.ex) + g * (GEST.ex - REST.ex);
  const ey = REST.ey + u * (MOUTH.ey - REST.ey) + g * (GEST.ey - REST.ey);
  const hx = REST.hx + u * (MOUTH.hx - REST.hx) + g * (GEST.hx - REST.hx);
  const hy = REST.hy + u * (MOUTH.hy - REST.hy) + g * (GEST.hy - REST.hy);
  limb(ctx, SHO.x + 4, SHO.y + 22, ex, ey, 28, ink);
  limb(ctx, ex, ey, hx, hy, 25, ink);

  /* chopsticks, angled with whatever the hand is doing */
  if (sticks) {
    /* pointing back over the hand toward the mouth, never across the
       head: at the mouth pose the tip lands exactly on the rim of the
       head circle, which is where the mouth would be. */
    const ang = lerp(-2.958, -2.638, u);
    const len = 66;
    const ox = -Math.sin(ang) * 6;
    const oy = Math.cos(ang) * 6;
    ctx.strokeStyle = "#bc8e55";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + ox * k, hy + oy * k);
      ctx.lineTo(hx + len * Math.cos(ang) + ox * k, hy + len * Math.sin(ang) + oy * k);
      ctx.stroke();
    }
    if (holding > 0.02) {
      const dx = hx + (len + 4) * Math.cos(ang);
      const dy = hy + (len + 4) * Math.sin(ang);
      const r = 16 * holding;
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.ellipse(dx, dy, r, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ddc9a6";
      ctx.lineWidth = 2;
      for (const a of [-0.55, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(dx + Math.sin(a) * r * 0.7, dy - r * 0.76);
        ctx.lineTo(dx + Math.sin(a) * r * 0.25, dy + r * 0.5);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/* ── Table setting ───────────────────────────────────────────── */
function drawTable(ctx, t) {
  const TOP = -232;

  ctx.fillStyle = WOOD;
  rrect(ctx, -200, TOP, 400, 22, 7);
  ctx.fill();
  ctx.fillStyle = WOOD_L;
  ctx.fillRect(-200, TOP, 400, 5);
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-200, TOP + 17, 400, 5);
  limb(ctx, -152, TOP + 22, -144, -6, 14, WOOD_D);
  limb(ctx, 152, TOP + 22, 144, -6, 14, WOOD_D);

  /* bamboo steamers */
  for (const i of [0, 1]) {
    const y = TOP - 30 - i * 26;
    ctx.fillStyle = i ? "#d7ab6a" : "#c99a5b";
    rrect(ctx, -34 + i * 4, y, 118 - i * 8, 30 - i * 2, 6);
    ctx.fill();
    ctx.strokeStyle = "#ab7f3e";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-28 + i * 4, y + 14);
    ctx.lineTo(80 - i * 4, y + 14);
    ctx.stroke();
  }
  ctx.fillStyle = "#e0b876";
  rrect(ctx, -32, TOP - 64, 114, 12, 5);
  ctx.fill();
  ctx.fillStyle = "#ab7f3e";
  circle(ctx, 25, TOP - 66, 6);
  ctx.fill();

  /* a plate of dumplings */
  ctx.fillStyle = CELADON;
  ctx.beginPath();
  ctx.ellipse(-18, TOP - 4, 46, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const dx of [-36, -18, 0]) {
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.ellipse(dx, TOP - 11, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ddc9a6";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(dx, TOP - 19);
    ctx.lineTo(dx, TOP - 6);
    ctx.stroke();
  }

  /* red clay teapot */
  ctx.fillStyle = RED_D;
  circle(ctx, -120, TOP - 26, 28);
  ctx.fill();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(-120, TOP - 26, 28, Math.PI * 1.15, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = RED_D;
  rrect(ctx, -129, TOP - 62, 19, 11, 4);
  ctx.fill();
  ctx.strokeStyle = RED_D;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-145, TOP - 34);
  ctx.quadraticCurveTo(-172, TOP - 30, -168, TOP - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-98, TOP - 38);
  ctx.quadraticCurveTo(-75, TOP - 32, -96, TOP - 14);
  ctx.stroke();

  /* cups */
  for (const cx of [120, -66]) {
    ctx.fillStyle = CELADON;
    rrect(ctx, cx - 15, TOP - 17, 30, 17, 5);
    ctx.fill();
  }

  /* steam */
  ctx.strokeStyle = "rgba(255,252,244,0.9)";
  ctx.lineWidth = 3.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const ph = t * 0.85 + i * 0.47;
    const rise = ph % 1;
    const x0 = 2 + i * 32;
    const y0 = TOP - 68;
    ctx.globalAlpha = (1 - rise) * 0.5 * Math.min(1, rise * 5);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let s = 0; s <= 1.001; s += 0.25) {
      ctx.lineTo(
        x0 + Math.sin(s * 3.1 + ph * 4.2) * (9 + s * 13),
        y0 - s * (86 + rise * 54),
      );
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ── The dining room ─────────────────────────────────────────── */
function lantern(ctx, x, y, r, t, i) {
  const sway = Math.sin(t * 0.52 + i * 1.7) * 0.032;
  ctx.save();
  ctx.translate(x, -1160);
  ctx.rotate(sway);
  const cy = y + 1160;

  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, cy - r);
  ctx.stroke();

  const halo = ctx.createRadialGradient(0, cy, r * 0.5, 0, cy, r * 3.2);
  halo.addColorStop(0, "rgba(247,205,120,0.34)");
  halo.addColorStop(1, "rgba(247,205,120,0)");
  ctx.fillStyle = halo;
  circle(ctx, 0, cy, r * 3.2);
  ctx.fill();

  const body = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  body.addColorStop(0, LAMP);
  body.addColorStop(0.55, GLOW);
  body.addColorStop(1, GLOW_D);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, cy, r, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(170,110,35,0.26)";
  ctx.lineWidth = 2;
  for (const f of [-0.6, -0.28, 0.28, 0.6]) {
    ctx.beginPath();
    ctx.ellipse(0, cy, Math.abs(r * f), r * 0.86, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = RED_D;
  rrect(ctx, -r * 0.3, cy - r * 0.86 - 9, r * 0.6, 11, 3);
  ctx.fill();
  rrect(ctx, -r * 0.26, cy + r * 0.86 - 3, r * 0.52, 10, 3);
  ctx.fill();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, cy + r * 0.86 + 6);
  ctx.lineTo(Math.sin(t * 1.3 + i) * 5, cy + r * 1.46);
  ctx.stroke();
  ctx.restore();
}

function latticePanel(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, PAPER);
  g.addColorStop(1, "#ead9b8");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = SCREEN_F;
  ctx.lineWidth = 8;
  const step = 124;
  for (let gx = x; gx <= x + w + step; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  for (let gy = y; gy <= y + h + step; gy += step) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }
  ctx.lineWidth = 4.5;
  for (let gx = x + step / 2; gx <= x + w; gx += step) {
    for (let gy = y + step / 2; gy <= y + h; gy += step) {
      ctx.beginPath();
      ctx.moveTo(gx, gy - 28);
      ctx.lineTo(gx + 28, gy);
      ctx.lineTo(gx, gy + 28);
      ctx.lineTo(gx - 28, gy);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 12;
  ctx.strokeRect(x, y, w, h);
}

/** A quiet neighbouring table, suggested rather than detailed. */
function sideTable(ctx, x, flip, t, i) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(flip * 0.78, 0.78);
  const TOP = -214;
  ctx.fillStyle = WOOD;
  rrect(ctx, -150, TOP, 300, 17, 6);
  ctx.fill();
  limb(ctx, -112, TOP + 17, -106, -6, 11, WOOD_D);
  limb(ctx, 112, TOP + 17, 106, -6, 11, WOOD_D);
  ctx.fillStyle = "#c99a5b";
  rrect(ctx, -40, TOP - 26, 80, 26, 5);
  ctx.fill();

  const bob = Math.sin(t * 1.1 + i) * 3;
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * 252, 0);
    ctx.scale(d, 1);
    ctx.fillStyle = WOOD_D;
    rrect(ctx, -98, -266, 12, 150, 5);
    ctx.fill();
    ctx.fillStyle = WOOD;
    rrect(ctx, -104, -140, 134, 13, 4);
    ctx.fill();
    ctx.fillStyle = INK_2;
    limb(ctx, -6, -132, 62, -128, 32, INK_2);
    limb(ctx, 62, -128, 56, -14, 27, INK_2);
    ctx.beginPath();
    ctx.moveTo(-40, -126);
    ctx.quadraticCurveTo(-46, -230, -36, -282);
    ctx.quadraticCurveTo(-22, -304, 2, -304);
    ctx.quadraticCurveTo(28, -304, 38, -280);
    ctx.quadraticCurveTo(48, -228, 44, -126);
    ctx.closePath();
    ctx.fill();
    limb(ctx, 8, -288, 78, -230, 22, INK_2);
    circle(ctx, 16, -348 + bob, 42);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawInterior(ctx, t) {
  /* wall */
  ctx.fillStyle = WALL;
  ctx.fillRect(-1600, -1240, 3200, 1240);
  const pool = ctx.createRadialGradient(0, -700, 60, 0, -620, 1150);
  pool.addColorStop(0, "rgba(255,218,150,0.34)");
  pool.addColorStop(1, "rgba(255,218,150,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(-1600, -1240, 3200, 1240);
  /* skirting, well below the table */
  ctx.fillStyle = WALL_D;
  ctx.fillRect(-1600, -92, 3200, 92);
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-1600, -100, 3200, 11);

  /* oak floor */
  const fl = ctx.createLinearGradient(0, 0, 0, 260);
  fl.addColorStop(0, FLOOR);
  fl.addColorStop(1, FLOOR_D);
  ctx.fillStyle = fl;
  ctx.fillRect(-1600, 0, 3200, 260);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 3;
  for (let y = 46; y < 260; y += 58) {
    ctx.beginPath();
    ctx.moveTo(-1600, y);
    ctx.lineTo(1600, y);
    ctx.stroke();
  }
  const refl = ctx.createLinearGradient(0, 0, 0, 230);
  refl.addColorStop(0, "rgba(255,214,150,0.28)");
  refl.addColorStop(1, "rgba(255,214,150,0)");
  ctx.fillStyle = refl;
  ctx.fillRect(-900, 0, 1800, 230);
  ctx.fillStyle = FLOOR_L;
  ctx.fillRect(-1600, 0, 3200, 5);

  /* ceiling beam */
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-1600, -1180, 3200, 52);
  ctx.fillStyle = WOOD;
  ctx.fillRect(-1600, -1180, 3200, 8);

  latticePanel(ctx, -1210, -930, 520, 700);
  latticePanel(ctx, 690, -930, 520, 700);

  /* a single hanging scroll, centred */
  ctx.fillStyle = "#f3ecdc";
  rrect(ctx, -72, -846, 144, 352, 3);
  ctx.fill();
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-82, -850);
  ctx.lineTo(82, -850);
  ctx.moveTo(-82, -490);
  ctx.lineTo(82, -490);
  ctx.stroke();
  ctx.fillStyle = "#1e1710";
  ctx.font = "126px KhangCn";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("康", 0, -706);
  ctx.fillStyle = RED;
  rrect(ctx, 16, -580, 32, 36, 4);
  ctx.fill();

  sideTable(ctx, -1180, 1, t, 0);
  sideTable(ctx, 1180, -1, t, 1);

  lantern(ctx, -760, -706, 62, t, 0);
  lantern(ctx, 760, -688, 62, t, 2);
  lantern(ctx, 0, -746, 74, t, 1);

  drawTable(ctx, t);

  /* ── choreography ───────────────────────────────────────────
     With no faces to act with, the talking has to live in the
     hands and the head: the left guest gestures and tilts while
     she speaks, the right guest lifts, bites, and nods as he
     chews. Both read at a glance, which is the whole point of
     working in pictograms. */
  const talking = (t > 0.3 && t < 1.5) || (t > 2.5 && t < 3.6);
  const talkIn = talking ? seg(t, t > 2.4 ? 2.5 : 0.3, t > 2.4 ? 2.75 : 0.55) : 0;
  const talkOut = t > 1.5 && t < 1.8 ? 1 - seg(t, 1.5, 1.8) : 1;
  const gestureL =
    (talking ? talkIn * talkOut : 0) * (0.72 + 0.28 * Math.sin(t * 5.2));
  const tiltL = talking
    ? Math.sin(t * 5.4) * 0.05 + Math.sin(t * 1.9) * 0.025
    : Math.sin(t * 1.9) * 0.025;

  const liftStart = 1.3;
  const atMouth = 1.92;
  const biteEnd = 2.2;
  const backDown = 2.84;
  let liftR = 0;
  if (t >= liftStart && t < atMouth) liftR = seg(t, liftStart, atMouth, easeInOut);
  else if (t >= atMouth && t < biteEnd) liftR = 1;
  else if (t >= biteEnd && t < backDown) liftR = 1 - seg(t, biteEnd, backDown, easeInOut);

  /* the chew: a small, insistent nod, which is how a faceless head
     tells you there is food in it */
  const chewing = t > biteEnd && t < biteEnd + 1.7;
  const nodR = chewing ? Math.sin((t - biteEnd) * 13.5) * 5.5 : Math.sin(t * 2.2) * 1.6;
  const holdingR =
    t < atMouth - 0.02
      ? t > liftStart - 0.22
        ? 1
        : 0
      : clamp01(1 - (t - (atMouth - 0.02)) / 0.16);

  const breathe = (ph) => Math.sin(t * 1.7 + ph) * 3.2;

  ctx.save();
  ctx.translate(-336, 0);
  drawFigure(ctx, {
    dir: 1,
    bun: true,
    gesture: gestureL,
    tilt: tiltL,
    nod: Math.sin(t * 2.4) * 1.6,
    breath: breathe(0),
  });
  ctx.restore();

  ctx.save();
  ctx.translate(336, 0);
  drawFigure(ctx, {
    dir: -1,
    sticks: true,
    lift: liftR,
    nod: nodR,
    tilt: Math.sin(t * 1.6 + 2) * 0.02 - liftR * 0.04,
    breath: breathe(2.1),
    holding: holdingR,
  });
  ctx.restore();
}

/* ── The shopfront ───────────────────────────────────────────── */
/** The restaurant's own sign: lit from the moment you can see it,
 *  because a shut-off sign makes a building look closed. The big
 *  statement of the mark happens later, on its own card. */
function signLockup(ctx) {
  const cy = BOARD.y + BOARD.h / 2;
  const r = 46;
  const gap = 30;

  ctx.font = "60px KhangDisplay";
  const name = "KHANG";
  const track = 13;
  let tw = -track;
  for (const c of name) tw += ctx.measureText(c).width + track;

  const total = r * 2 + gap + tw;
  const left = 960 - total / 2;

  /* lit board */
  ctx.fillStyle = CREAM;
  rrect(ctx, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 6);
  ctx.fill();
  const warm = ctx.createRadialGradient(960, cy, 20, 960, cy, 420);
  warm.addColorStop(0, "rgba(255,221,150,0.3)");
  warm.addColorStop(1, "rgba(255,221,150,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(BOARD.x - 200, BOARD.y - 120, BOARD.w + 400, BOARD.h + 240);

  roundel(ctx, left + r, cy, r, null);

  ctx.fillStyle = GREEN_D;
  ctx.font = "60px KhangDisplay";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  tracked(ctx, name, left + r * 2 + gap + tw / 2, cy + 7, track);

  ctx.fillStyle = "rgba(6,78,46,0.6)";
  ctx.font = "14px KhangSans";
  tracked(ctx, "CHINESE · DIMSUM", left + r * 2 + gap + tw / 2, cy + 36, 5.8);
}

function drawFacade(ctx, t) {
  const sky = ctx.createLinearGradient(0, -200, 0, GROUND);
  sky.addColorStop(0, NIGHT_T);
  sky.addColorStop(0.72, "#13202c");
  sky.addColorStop(1, NIGHT_B);
  ctx.fillStyle = sky;
  ctx.fillRect(-400, -400, W + 800, GROUND + 400);

  ctx.fillStyle = STREET;
  ctx.fillRect(-400, GROUND, W + 800, H - GROUND + 400);
  ctx.fillStyle = "#19242e";
  ctx.fillRect(-400, GROUND, W + 800, 10);

  ctx.fillStyle = BUILD;
  ctx.fillRect(330, 242, 1260, GROUND - 242);

  /* cornice */
  ctx.fillStyle = BUILD_L;
  rrect(ctx, 296, 228, 1328, 50, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fillRect(296, 228, 1328, 3);

  /* piers */
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(330, 278, 104, GROUND - 278);
  ctx.fillRect(1486, 278, 104, GROUND - 278);
  ctx.fillStyle = BUILD_LL;
  ctx.fillRect(330, 278, 5, GROUND - 278);
  ctx.fillRect(1585, 278, 5, GROUND - 278);
  for (const px of [382, 1538]) {
    ctx.fillStyle = "#e8cc96";
    rrect(ctx, px - 11, 470, 22, 34, 5);
    ctx.fill();
    const l = ctx.createRadialGradient(px, 500, 4, px, 500, 92);
    l.addColorStop(0, "rgba(255,218,150,0.4)");
    l.addColorStop(1, "rgba(255,218,150,0)");
    ctx.fillStyle = l;
    circle(ctx, px, 500, 92);
    ctx.fill();
  }

  signLockup(ctx);
}

/** Frame, mullions and everything that sits in front of the glass. */
function drawGlazingFrame(ctx, alpha) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const { x, y, w, h } = GLASS;

  ctx.fillStyle = BUILD_L;
  ctx.fillRect(x - 10, y - 22, w + 20, 24);

  const bays = 5;
  const bw = w / bays;
  for (let i = 0; i <= bays; i++) {
    ctx.fillStyle = BUILD_L;
    ctx.fillRect(x + i * bw - 7, y, 14, h);
    ctx.fillStyle = BUILD_LL;
    ctx.fillRect(x + i * bw - 7, y, 3, h);
  }
  const dx = x + 2 * bw;
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(dx + bw / 2 - 6, y + 30, 12, h - 30);
  ctx.fillStyle = "#e8cc96";
  rrect(ctx, dx + bw / 2 - 22, y + 196, 7, 76, 3.5);
  ctx.fill();
  rrect(ctx, dx + bw / 2 + 15, y + 196, 7, 76, 3.5);
  ctx.fill();

  ctx.fillStyle = BUILD_L;
  ctx.fillRect(x - 10, GROUND - 10, w + 20, 14);
  ctx.fillStyle = "#1d3a26";
  ctx.fillRect(330, GROUND - 10, 1260, 14);

  ctx.fillStyle = "#16261b";
  rrect(ctx, 790, GROUND + 4, 340, 20, 5);
  ctx.fill();
  const spill = ctx.createLinearGradient(0, GROUND, 0, GROUND + 160);
  spill.addColorStop(0, "rgba(255,214,150,0.3)");
  spill.addColorStop(1, "rgba(255,214,150,0)");
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.moveTo(x + 40, GROUND);
  ctx.lineTo(x + w - 40, GROUND);
  ctx.lineTo(x + w + 120, GROUND + 160);
  ctx.lineTo(x - 120, GROUND + 160);
  ctx.closePath();
  ctx.fill();

  for (const px of [472, 1448]) {
    ctx.fillStyle = "#2e4132";
    rrect(ctx, px - 34, GROUND - 92, 68, 92, 8);
    ctx.fill();
    ctx.fillStyle = GREEN_DD;
    circle(ctx, px, GROUND - 128, 44);
    ctx.fill();
    circle(ctx, px - 28, GROUND - 104, 27);
    ctx.fill();
    circle(ctx, px + 28, GROUND - 106, 25);
    ctx.fill();
    ctx.fillStyle = GREEN_D;
    circle(ctx, px - 8, GROUND - 142, 22);
    ctx.fill();
  }
  ctx.restore();
}

/* ── The end card ────────────────────────────────────────────── *
 * The picture washes to white and the mark is left on its own —
 * no building behind it, nothing competing with it. Drawn in
 * screen space, because it is no longer part of the world.        */
function drawEndCard(ctx, t) {
  const cx = W / 2;

  /* roundel */
  const aMark = seg(t, 7.5, 8.15, easeOut);
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
  const aName = seg(t, 8.2, 8.9);
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
  const aRule = seg(t, 8.85, 9.2);
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
  const aSub = seg(t, 9.05, 9.45);
  if (aSub > 0) {
    ctx.save();
    ctx.globalAlpha = aSub;
    ctx.fillStyle = "rgba(15,32,22,0.62)";
    ctx.font = "22px KhangSans";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    tracked(ctx, "CHINESE · DIMSUM", cx, 762, 11);
    ctx.restore();
  }
}

/* ── Camera ──────────────────────────────────────────────────── *
 * Scale 4.3 is a two-shot across the table; scale 1 frames the
 * whole shopfront. One continuous move, held at each end.          */
function camera(t) {
  const hold = seg(t, 0, 2.8, (u) => u);
  const pull = seg(t, 2.8, 6.4, easeInOut);
  const drift = seg(t, 6.4, 7.5, (u) => u);
  let scale;
  let cy;
  if (t >= 6.4) {
    scale = lerp(1.0, 1.045, drift);
    cy = lerp(540, 528, drift);
  } else if (pull > 0) {
    scale = expLerp(4.0, 1.0, pull);
    cy = lerp(745, 540, pull);
  } else {
    // Kept wholly inside the glazing, or the shopfront's plinth creeps
    // into the bottom of what should read as a shot from inside.
    scale = expLerp(4.3, 4.0, hold);
    cy = lerp(751, 745, hold);
  }
  return { scale, cx: 960 + Math.sin(t * 0.42) * 2.0, cy };
}

/* ── Grain ───────────────────────────────────────────────────── */
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
  ctx.fillStyle = NIGHT_T;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.cx, -cam.cy);

  drawFacade(ctx, t);

  ctx.save();
  ctx.beginPath();
  ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
  ctx.clip();
  ctx.translate(ORIGIN.x, ORIGIN.y);
  ctx.scale(K, K);
  drawInterior(ctx, t);
  ctx.restore();

  drawGlazingFrame(ctx, clamp01((3.6 - cam.scale) / 1.3));
  ctx.restore();

  /* grade */
  const vg = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.34, W / 2, H * 0.5, H * 0.98);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(6,8,6,0.34)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.globalCompositeOperation = "overlay";
  const g = GRAIN[frame % GRAIN.length];
  for (let y = 0; y < H; y += 256) {
    for (let x = 0; x < W; x += 256) ctx.drawImage(g, x, y);
  }
  ctx.restore();

  /* the wash to white, and then the mark on its own */
  const wash = seg(t, 6.9, 7.55, easeInOut);
  if (wash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${wash})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (t >= 7.45) drawEndCard(ctx, t);

  /* fade up from black */
  const fade = 1 - seg(t, 0, 0.42, (u) => u);
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
