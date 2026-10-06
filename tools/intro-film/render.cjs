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

const INK = "#15181a";
const INK_2 = "#232a2e";

/* The guests, in colour. Still pictograms — flat fills, no outline,
 * no features — but skin, hair and cloth instead of one solid ink.
 * Her clay against his green is the only strong colour contrast in
 * the room, which is what keeps the pair reading as the subject once
 * the camera has pulled back to the whole shopfront. */
const GUESTS = {
  w: {
    skin: "#e9bb90", hair: "#2a1d16",
    top: "#c0785e", topD: "#a35e46",
    leg: "#4e443f", shoe: "#231d1a",
  },
  m: {
    skin: "#dba97a", hair: "#1f1712",
    top: "#2d6350", topD: "#1d4a3a",
    leg: "#3a4049", shoe: "#1c1816",
  },
  x: {
    skin: "#d4a67d", hair: "#241c17",
    top: "#95735b", topD: "#775844",
    leg: "#454340", shoe: "#211c19",
  },
};

const NIGHT_T = "#091620";
const NIGHT_B = "#1f3246";
const STREET = "#141d26";

/* The shopfront. Green joinery fitted into a warm stone building,
 * with brass as the accent metal. A flat green slab with a white
 * rectangle stuck on it was never going to read as a designed
 * restaurant — what sells a shopfront is hierarchy (stone pier,
 * fascia, transom line, base) and one metal running through all
 * of it. */
const STONE = "#3a362e";
const STONE_L = "#4b453a";
const STONE_D = "#282521";
const JOIN = "#16402b";
const JOIN_L = "#1e5538";
const JOIN_D = "#0e2c1d";
const BRASS = "#c6a02f";
const BRASS_L = "#e8ca63";
const BRASS_D = "#8d6f1d";

/* ── Geometry ────────────────────────────────────────────────── */
const GLASS = { x: 430, y: 430, w: 1060, h: 450 };
const GROUND = 880;
const BOARD = { x: 630, y: 284, w: 660, h: 136 };
const PIER_L = { x: 286, w: 132 };
const PIER_R = { x: 1502, w: 132 };
const SHOP = { x: 418, w: 1084 }; // the opening between the piers
const FASCIA = { y: 250, h: 152 };
const TRANSOM = 540; // the single horizontal line across the glazing
const DOOR = { x: 872, w: 176 };
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
function profileHair(ctx, R) {
  ctx.beginPath();
  ctx.moveTo(R * 0.62, -R * 0.78);
  ctx.quadraticCurveTo(R * 0.24, -R * 0.58, R * 0.04, -R * 0.18);
  ctx.quadraticCurveTo(-R * 0.12, R * 0.2, -R * 0.707, R * 0.707);
  ctx.arc(0, 0, R + 0.5, 2.356, 5.384, false);
  ctx.closePath();
  ctx.fill();
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
    cup = false,
    pal = GUESTS.m,
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

  /* leg: thigh along the seat, shin to the floor, foot */
  limb(ctx, -8, -158, 80, -152, 40, pal.leg);
  limb(ctx, 80, -152, 72, -22, 34, pal.leg);
  ctx.fillStyle = pal.shoe;
  rrect(ctx, 48, -30, 64, 24, 11);
  ctx.fill();

  /* body: one clean tapered mass, shoulders dropping into the arms */
  const bg = ctx.createLinearGradient(0, -348, 0, -148);
  bg.addColorStop(0, pal.top);
  bg.addColorStop(1, pal.topD);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-50, -148);
  ctx.quadraticCurveTo(-58, -248, -46, -316);
  ctx.quadraticCurveTo(-32, -348, 4, -348);
  ctx.quadraticCurveTo(40, -348, 52, -314);
  ctx.quadraticCurveTo(62, -244, 56, -148);
  ctx.closePath();
  ctx.fill();

  /* the resting arm, reaching onto the table — sleeve, then a hand */
  limb(ctx, SHO.x + 12, SHO.y + 30, 92, -250, 27, pal.top);
  limb(ctx, 92, -250, 136, -243, 24, pal.top);
  ctx.fillStyle = pal.skin;
  circle(ctx, 144, -242, 12.5);
  ctx.fill();

  /* head — a plain circle, held clear of the shoulders like the
     pictogram it is modelled on */
  ctx.save();
  ctx.translate(HEADC.x, HEADC.y);
  ctx.rotate(tilt);
  ctx.fillStyle = pal.skin;
  circle(ctx, 0, 0, R);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  if (bun) {
    circle(ctx, -R * 0.94, -R * 0.44, R * 0.33);
    ctx.fill();
  }
  profileHair(ctx, R);
  ctx.restore();

  /* the acting arm: rest → mouth (lift) or rest → raised (gesture) */
  const u = easeInOut(clamp01(lift));
  const g = clamp01(gesture);
  const REST = { ex: 78, ey: -266, hx: 142, hy: -238 };
  const MOUTH = cup
    ? { ex: 108, ey: -272, hx: 116, hy: HEADC.y + 60 }
    : { ex: 116, ey: -280, hx: 130, hy: HEADC.y + 44 };
  const GEST = { ex: 44, ey: -266, hx: 108, hy: -346 };
  const ex = REST.ex + u * (MOUTH.ex - REST.ex) + g * (GEST.ex - REST.ex);
  const ey = REST.ey + u * (MOUTH.ey - REST.ey) + g * (GEST.ey - REST.ey);
  const hx = REST.hx + u * (MOUTH.hx - REST.hx) + g * (GEST.hx - REST.hx);
  const hy = REST.hy + u * (MOUTH.hy - REST.hy) + g * (GEST.hy - REST.hy);
  limb(ctx, SHO.x + 4, SHO.y + 22, ex, ey, 28, pal.top);
  limb(ctx, ex, ey, hx, hy, 25, pal.top);
  ctx.fillStyle = pal.skin;
  circle(ctx, hx, hy, 12.5);
  ctx.fill();

  /* a teacup, tipped to the lips as the hand comes up. Same solved
     angle as the chopsticks: it points back over the hand toward the
     mouth, so it can never be drawn across the face. */
  if (cup) {
    /* upright on the table, tipping to the lips as the arm comes up */
    const ang = lerp(-1.6, -2.5, u);
    const reach = lerp(0, 18, u);
    ctx.save();
    ctx.translate(hx + reach * Math.cos(ang), hy + reach * Math.sin(ang));
    ctx.rotate(ang);
    ctx.fillStyle = CELADON;
    rrect(ctx, -6, -15, 40, 30, 6);
    ctx.fill();
    ctx.fillStyle = "#cfd8c8";
    rrect(ctx, 28, -15, 6, 30, 3);
    ctx.fill();
    ctx.restore();
  }

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
    const xp = GUESTS.x;
    limb(ctx, -6, -132, 62, -128, 32, xp.leg);
    limb(ctx, 62, -128, 56, -14, 27, xp.leg);
    ctx.fillStyle = xp.top;
    ctx.beginPath();
    ctx.moveTo(-40, -126);
    ctx.quadraticCurveTo(-46, -230, -36, -282);
    ctx.quadraticCurveTo(-22, -304, 2, -304);
    ctx.quadraticCurveTo(28, -304, 38, -280);
    ctx.quadraticCurveTo(48, -228, 44, -126);
    ctx.closePath();
    ctx.fill();
    limb(ctx, 8, -288, 78, -230, 22, xp.top);
    ctx.fillStyle = xp.skin;
    circle(ctx, 16, -348 + bob, 42);
    ctx.fill();
    ctx.fillStyle = xp.hair;
    ctx.save();
    ctx.translate(16, -348 + bob);
    profileHair(ctx, 42);
    ctx.restore();
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
  rrect(ctx, -66, -962, 132, 242, 3);
  ctx.fill();
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-77, -966);
  ctx.lineTo(77, -966);
  ctx.moveTo(-77, -720);
  ctx.lineTo(77, -720);
  ctx.stroke();
  ctx.fillStyle = "#1e1710";
  ctx.font = "104px KhangCn";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("康", 0, -862);
  ctx.fillStyle = RED;
  rrect(ctx, 15, -776, 27, 31, 4);
  ctx.fill();

  sideTable(ctx, -1180, 1, t, 0);
  sideTable(ctx, 1180, -1, t, 1);

  lantern(ctx, -616, -712, 60, t, 0);
  lantern(ctx, 616, -700, 60, t, 2);
  lantern(ctx, -1066, -690, 52, t, 1);
  lantern(ctx, 1066, -696, 52, t, 3);

  drawTable(ctx, t);

  /* ── choreography ───────────────────────────────────────────
     With no faces to act with, the talking has to live in the
     hands and the head: the left guest gestures and tilts while
     she speaks, the right guest lifts, bites, and nods as he
     chews. Both read at a glance, which is the whole point of
     working in pictograms. */
  /* a lift-hold-lower envelope, reused for both guests */
  const arc = (a, b, c, d) => {
    if (t >= a && t < b) return seg(t, a, b, easeInOut);
    if (t >= b && t < c) return 1;
    if (t >= c && t < d) return 1 - seg(t, c, d, easeInOut);
    return 0;
  };

  /* he eats first, she drinks over the top of it — so that around
     1.9 s both hands are up, which is the reference's composition */
  const liftR = arc(0.45, 1.12, 1.44, 2.1);
  const liftL = arc(1.46, 2.08, 2.46, 3.08);

  const talking = (t > 2.9 && t < 3.9) || (t > 4.6 && t < 5.4);
  const talkIn = talking ? seg(t, t > 4.5 ? 4.6 : 2.9, t > 4.5 ? 4.86 : 3.16) : 0;
  const talkOut = t > 3.6 && t < 3.9 ? 1 - seg(t, 3.6, 3.9) : 1;
  const gestureL =
    (talking ? talkIn * talkOut : 0) * (0.72 + 0.28 * Math.sin(t * 5.2));
  const tiltL = talking
    ? Math.sin(t * 5.4) * 0.05 + Math.sin(t * 1.9) * 0.025
    : Math.sin(t * 1.9) * 0.025;

  const atMouth = 1.12;
  const biteEnd = 1.44;

  /* the chew: a small, insistent nod, which is how a faceless head
     tells you there is food in it */
  const chewing = t > biteEnd && t < biteEnd + 2.2;
  const nodR = chewing ? Math.sin((t - biteEnd) * 13.5) * 5.5 : Math.sin(t * 2.2) * 1.6;
  const holdingR =
    t < atMouth - 0.02 ? (t > 0.24 ? 1 : 0)
      : clamp01(1 - (t - (atMouth - 0.02)) / 0.16);

  const breathe = (ph) => Math.sin(t * 1.7 + ph) * 3.2;

  ctx.save();
  ctx.translate(-336, 0);
  drawFigure(ctx, {
    dir: 1,
    pal: GUESTS.w,
    bun: true,
    cup: true,
    lift: liftL,
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
    pal: GUESTS.m,
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
/** A picture light over the fascia. Three of them in a row is the
 *  single clearest signal that a shopfront was designed rather than
 *  assembled: the sign stops being a flat panel and becomes a lit
 *  surface with falloff. */
function signLamp(ctx, x, yb) {
  ctx.fillStyle = BRASS_D;
  rrect(ctx, x - 3.5, yb - 40, 7, 22, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 15, yb - 20);
  ctx.lineTo(x + 15, yb - 20);
  ctx.lineTo(x + 23, yb);
  ctx.lineTo(x - 23, yb);
  ctx.closePath();
  ctx.fillStyle = BRASS;
  ctx.fill();
  ctx.fillStyle = BRASS_L;
  ctx.fillRect(x - 15, yb - 21, 30, 3);
  ctx.fillStyle = "rgba(255,232,180,0.95)";
  rrect(ctx, x - 19, yb - 3, 38, 5, 2.5);
  ctx.fill();

  const pool = ctx.createRadialGradient(x, yb + 34, 6, x, yb + 34, 196);
  pool.addColorStop(0, "rgba(255,232,180,0.20)");
  pool.addColorStop(0.55, "rgba(255,232,180,0.07)");
  pool.addColorStop(1, "rgba(255,232,180,0)");
  ctx.fillStyle = pool;
  circle(ctx, x, yb + 34, 196);
  ctx.fill();
}

/** The name on the fascia. Cream and brass on deep green rather
 *  than a white panel pasted over it: signwriting, not a sticker. */
function signLockup(ctx) {
  const cy = FASCIA.y + 74;

  ctx.font = "62px KhangDisplay";
  const name = "KHANG";
  const track = 15;
  let tw = -track;
  for (const c of name) tw += ctx.measureText(c).width + track;

  const r = 45;
  const gap = 34;
  const total = r * 2 + gap + tw;
  const left = 960 - total / 2;

  roundel(ctx, left + r, cy - 4, r, BRASS, true);

  ctx.fillStyle = "#fdf8ec";
  ctx.font = "62px KhangDisplay";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  tracked(ctx, name, left + r * 2 + gap + tw / 2, cy + 6, track);

  const rl = left + r * 2 + gap;
  ctx.fillStyle = BRASS;
  ctx.fillRect(rl, cy + 26, tw, 2);

  ctx.fillStyle = BRASS_L;
  ctx.font = "15px KhangSans";
  tracked(ctx, "CHINESE · DIM SUM", rl + tw / 2, cy + 52, 7);
}

/** A projecting blade sign on the near pier — what tells you this
 *  is a restaurant from down the street rather than head-on. */
function bladeSign(ctx) {
  const bx = 180, by = 296, bw = 88, bh = 214;
  ctx.fillStyle = BRASS_D;
  ctx.fillRect(bx + bw, by + 18, PIER_L.x - bx - bw, 7);
  ctx.fillRect(bx + bw, by + 108, PIER_L.x - bx - bw, 5);
  ctx.beginPath();
  ctx.moveTo(PIER_L.x, by + 25);
  ctx.lineTo(PIER_L.x, by + 108);
  ctx.lineTo(bx + bw, by + 108);
  ctx.closePath();
  ctx.fill();

  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  g.addColorStop(0, JOIN_D);
  g.addColorStop(0.45, JOIN_L);
  g.addColorStop(1, JOIN);
  ctx.fillStyle = g;
  rrect(ctx, bx, by, bw, bh, 5);
  ctx.fill();
  ctx.strokeStyle = BRASS_D;
  ctx.lineWidth = 2.5;
  rrect(ctx, bx + 8, by + 8, bw - 16, bh - 16, 3);
  ctx.stroke();

  ctx.fillStyle = "#f6edd8";
  ctx.font = "54px KhangCn";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("康", bx + bw / 2, by + 62);
  ctx.font = "26px KhangDisplay";
  for (let i = 0; i < 5; i++) {
    ctx.fillText("KHANG"[i], bx + bw / 2, by + 118 + i * 30);
  }

  const glow = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 10, bx + bw / 2, by + bh / 2, 190);
  glow.addColorStop(0, "rgba(255,221,150,0.16)");
  glow.addColorStop(1, "rgba(255,221,150,0)");
  ctx.fillStyle = glow;
  circle(ctx, bx + bw / 2, by + bh / 2, 190);
  ctx.fill();
}

function drawFacade(ctx, t) {
  const sky = ctx.createLinearGradient(0, -300, 0, GROUND);
  sky.addColorStop(0, NIGHT_T);
  sky.addColorStop(0.62, "#16263a");
  sky.addColorStop(1, NIGHT_B);
  ctx.fillStyle = sky;
  ctx.fillRect(-400, -400, W + 800, GROUND + 400);

  /* the street it stands on. Without neighbours the building floated
     in a void, which is most of why it read as clip art. */
  ctx.fillStyle = "#121e2a";
  ctx.fillRect(-400, 306, 692, GROUND - 306);
  ctx.fillRect(1634, 272, 700, GROUND - 272);
  ctx.fillStyle = "#0d1824";
  ctx.fillRect(-400, 306, 692, 14);
  ctx.fillRect(1634, 272, 700, 14);
  for (const [wx, wy, lit] of [[84, 398, 1], [168, 398, 0], [84, 536, 0],
                               [1716, 366, 0], [1800, 366, 1], [1800, 504, 0]]) {
    if (lit) {
      const wg = ctx.createRadialGradient(wx + 22, wy + 32, 4, wx + 22, wy + 32, 96);
      wg.addColorStop(0, "rgba(255,198,118,0.22)");
      wg.addColorStop(1, "rgba(255,198,118,0)");
      ctx.fillStyle = wg;
      circle(ctx, wx + 22, wy + 32, 96);
      ctx.fill();
    }
    ctx.fillStyle = lit ? "rgba(255,206,142,0.5)" : "rgba(120,150,180,0.07)";
    rrect(ctx, wx, wy, 44, 64, 3);
    ctx.fill();
  }

  ctx.fillStyle = STREET;
  ctx.fillRect(-400, GROUND, W + 800, H - GROUND + 400);
  ctx.fillStyle = "#1b2630";
  ctx.fillRect(-400, GROUND, W + 800, 8);
  ctx.fillStyle = "#0e161d";
  ctx.fillRect(-400, GROUND + 132, W + 800, 9);

  /* the building the shop is fitted into */
  const stone = ctx.createLinearGradient(0, 196, 0, GROUND);
  stone.addColorStop(0, STONE_L);
  stone.addColorStop(0.55, STONE);
  stone.addColorStop(1, STONE_D);
  ctx.fillStyle = stone;
  ctx.fillRect(286, 196, 1348, GROUND - 196);

  /* fascia */
  const fg = ctx.createLinearGradient(0, FASCIA.y, 0, FASCIA.y + FASCIA.h);
  fg.addColorStop(0, JOIN_L);
  fg.addColorStop(1, JOIN);
  ctx.fillStyle = fg;
  ctx.fillRect(SHOP.x, FASCIA.y, SHOP.w, FASCIA.h);
  ctx.fillStyle = BRASS_D;
  ctx.fillRect(SHOP.x, FASCIA.y, SHOP.w, 3);
  ctx.fillRect(SHOP.x, FASCIA.y + FASCIA.h - 4, SHOP.w, 4);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(SHOP.x, FASCIA.y + FASCIA.h, SHOP.w, 10);

  signLockup(ctx);
  for (const lx of [636, 960, 1284]) signLamp(ctx, lx, FASCIA.y + 16);

  /* cornice: a projecting band with a shadow under it, which is what
     stops the top of the building reading as a cut-off rectangle */
  ctx.fillStyle = STONE;
  rrect(ctx, 258, 186, 1404, 46, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fillRect(258, 186, 1404, 4);
  ctx.fillStyle = BRASS_D;
  ctx.fillRect(258, 226, 1404, 3);
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(286, 232, 1348, 16);

  /* piers */
  for (const p of [PIER_L, PIER_R]) {
    const pg = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    pg.addColorStop(0, STONE_D);
    pg.addColorStop(0.38, STONE_L);
    pg.addColorStop(1, STONE_D);
    ctx.fillStyle = pg;
    ctx.fillRect(p.x, 232, p.w, GROUND - 232);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    for (let y = 318; y < GROUND - 80; y += 104) ctx.fillRect(p.x, y, p.w, 2);
    ctx.fillStyle = BRASS_D;
    ctx.fillRect(p.x, GROUND - 82, p.w, 4);
    ctx.fillStyle = STONE_D;
    ctx.fillRect(p.x, GROUND - 78, p.w, 78);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(p.x, GROUND - 78, p.w, 2);
  }

  bladeSign(ctx);

  /* two clipped bays on the pavement, clear of the glass so they
     frame the shop instead of sitting on top of the diners */
  for (const px of [224, 1696]) {
    ctx.fillStyle = "#2b2823";
    rrect(ctx, px - 40, GROUND - 76, 80, 76, 5);
    ctx.fill();
    ctx.fillStyle = BRASS_D;
    ctx.fillRect(px - 40, GROUND - 70, 80, 4);
    ctx.fillRect(px - 40, GROUND - 24, 80, 4);
    ctx.fillStyle = "#3b3126";
    ctx.fillRect(px - 5, GROUND - 162, 10, 92);
    ctx.fillStyle = GREEN_DD;
    circle(ctx, px, GROUND - 198, 50);
    ctx.fill();
    ctx.fillStyle = "#17402c";
    circle(ctx, px - 17, GROUND - 214, 31);
    ctx.fill();
    circle(ctx, px + 19, GROUND - 206, 27);
    ctx.fill();
  }
}

/** Frame, mullions and everything that sits in front of the glass.
 *  Three bays — window, entrance, window — tied together by one
 *  transom line running the full width. The old five equal bays
 *  with a door hidden in the middle of one gave the eye nothing to
 *  hold on to and buried the entrance. */
function drawGlazingFrame(ctx, alpha) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const { x, y, w, h } = GLASS;

  /* head beam */
  ctx.fillStyle = JOIN_L;
  ctx.fillRect(x - 14, y - 20, w + 28, 22);
  ctx.fillStyle = BRASS_D;
  ctx.fillRect(x - 14, y, w + 28, 2);

  const mullions = [x, DOOR.x, DOOR.x + DOOR.w, x + w];
  const post = (mx, pw) => {
    ctx.fillStyle = JOIN_L;
    ctx.fillRect(mx - pw / 2, y, pw, h);
    ctx.fillStyle = JOIN_D;
    ctx.fillRect(mx + pw / 2 - 3, y, 3, h);
  };
  for (const mx of mullions) post(mx, mx === x || mx === x + w ? 18 : 13);

  /* the transom line */
  ctx.fillStyle = JOIN_L;
  ctx.fillRect(x, TRANSOM - 7, w, 14);
  ctx.fillStyle = JOIN_D;
  ctx.fillRect(x, TRANSOM + 4, w, 3);
  ctx.fillStyle = BRASS_D;
  ctx.fillRect(x, TRANSOM - 8, w, 1.5);

  /* the entrance: one leaf, so nothing cuts down the middle of the
     scroll hanging on the back wall */
  const dl = DOOR.x + 7;
  const dr = DOOR.x + DOOR.w - 7;
  ctx.fillStyle = JOIN_L;
  ctx.fillRect(dl, TRANSOM + 7, 21, GROUND - TRANSOM - 7);
  ctx.fillRect(dr - 21, TRANSOM + 7, 21, GROUND - TRANSOM - 7);
  ctx.fillRect(dl, TRANSOM + 7, dr - dl, 18);
  ctx.fillStyle = JOIN_D;
  ctx.fillRect(dl + 18, TRANSOM + 7, 3, GROUND - TRANSOM - 7);
  ctx.fillStyle = JOIN;
  ctx.fillRect(dl, GROUND - 76, dr - dl, 76);
  ctx.fillStyle = BRASS_D;
  ctx.fillRect(dl, GROUND - 80, dr - dl, 4);
  ctx.fillRect(dr - 24, TRANSOM + 76, 14, 6);
  ctx.fillRect(dr - 24, TRANSOM + 190, 14, 6);
  ctx.fillStyle = BRASS;
  rrect(ctx, dr - 31, TRANSOM + 64, 9, 138, 4.5);
  ctx.fill();
  ctx.fillStyle = BRASS_L;
  ctx.fillRect(dr - 31, TRANSOM + 64, 3, 138);

  /* base rail */
  ctx.fillStyle = JOIN_L;
  ctx.fillRect(x - 14, GROUND - 12, w + 28, 14);
  ctx.fillStyle = BRASS_D;
  ctx.fillRect(x - 14, GROUND - 13, w + 28, 2);

  /* light on the pavement: a soft pool with a reflection under the
     door, instead of the flat trapezoid of coloured gel it was */
  const pool = ctx.createRadialGradient(960, GROUND + 10, 30, 960, GROUND + 10, 620);
  pool.addColorStop(0, "rgba(255,216,152,0.30)");
  pool.addColorStop(0.5, "rgba(255,216,152,0.10)");
  pool.addColorStop(1, "rgba(255,216,152,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(x - 420, GROUND, w + 840, 180);
  const streak = ctx.createLinearGradient(0, GROUND, 0, GROUND + 124);
  streak.addColorStop(0, "rgba(255,226,170,0.26)");
  streak.addColorStop(1, "rgba(255,226,170,0)");
  ctx.fillStyle = streak;
  ctx.beginPath();
  ctx.moveTo(DOOR.x + 4, GROUND);
  ctx.lineTo(DOOR.x + DOOR.w - 4, GROUND);
  ctx.lineTo(DOOR.x + DOOR.w + 44, GROUND + 124);
  ctx.lineTo(DOOR.x - 44, GROUND + 124);
  ctx.closePath();
  ctx.fill();

  /* step and mat */
  ctx.fillStyle = "#2c2a25";
  rrect(ctx, DOOR.x - 28, GROUND + 2, DOOR.w + 56, 22, 4);
  ctx.fill();
  ctx.fillStyle = "#1d1b18";
  rrect(ctx, DOOR.x - 10, GROUND + 26, DOOR.w + 20, 16, 3);
  ctx.fill();

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
    scale = expLerp(4.35, 1.0, pull);
    cy = lerp(756, 540, pull);
  } else {
    // Kept wholly inside the glazing, or the shopfront's plinth creeps
    // into the bottom of what should read as a shot from inside.
    scale = expLerp(4.55, 4.35, hold);
    cy = lerp(761, 756, hold);
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
