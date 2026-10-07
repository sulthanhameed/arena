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
const DURATION = 8.0;
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
const GUESTS = {
  w: {
    skin: "#e9bb90", hair: "#2a1d16",
    top: "#8d4553", topD: "#6f3341",
    leg: "#473c38", shoe: "#231d1a",
  },
  m: {
    skin: "#dba97a", hair: "#1f1712",
    top: "#324c5e", topD: "#243a49",
    leg: "#363b43", shoe: "#1c1816",
  },
  x: {
    skin: "#d4a67d", hair: "#241c17",
    top: "#6f5a4b", topD: "#564436",
    leg: "#403c37", shoe: "#211c19",
  },
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
    toast = 0,
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
  /* cup up and out towards the other side of the table */
  const TOAST = { ex: 92, ey: -312, hx: 152, hy: -358 };
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
/** Nothing but the table and the two of them on a flat field. The
 *  restaurant used to be built around this and is gone, so the pair
 *  have to hold the whole film on their own. */
function drawScene(ctx, t) {
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

  /* Act one has no room to carry it, so everything has to come
     from the two of them: he eats, she answers, she drinks, he sets
     down his chopsticks, they raise their cups together, drink to
     it, and she laughs. */
  const liftR = arc(0.25, 0.85, 1.15, 1.8); // he eats
  const gestR = arc(1.95, 2.15, 2.55, 2.85); // he says something
  const liftL = arc(1.6, 2.1, 2.4, 2.9); // she drinks
  const gestL1 = arc(1.0, 1.22, 1.72, 2.02); // she answers him
  const gestL2 = arc(5.15, 5.45, 5.95, 6.3); // still talking as we leave
  const toastW = arc(2.95, 3.45, 4.25, 4.8); // cups up, together
  const sipBoth = arc(3.65, 3.95, 4.15, 4.5); // and a drink to it

  const wobble = 0.84 + 0.16 * Math.sin(t * 3.4);
  const gestureL = (gestL1 + gestL2) * wobble;
  const gestureR = gestR * wobble;

  /* the laugh: head back, then a shudder. On a faceless head it is
     the only way to play one. */
  /* the laugh: a small lean back and settle, not a shudder */
  const laughU =
    t > 4.28 && t < 5.1 ? Math.sin(((t - 4.28) / 0.82) * Math.PI) : 0;

  const atMouth = 0.85;
  const biteEnd = 1.15;

  /* the chew: a small, insistent nod, which is how a faceless head
     tells you there is food in it */
  const chewing = t > biteEnd && t < biteEnd + 1.5;
  const nodR =
    (chewing ? Math.sin((t - biteEnd) * 9.2) * 3.0 : Math.sin(t * 1.9) * 1.0) +
    laughU * Math.sin(t * 9.5) * 0.9;
  const holdingR =
    t < atMouth - 0.02 ? (t > 0.12 ? 1 : 0)
      : clamp01(1 - (t - (atMouth - 0.02)) / 0.16);

  const tiltL =
    Math.sin(t * 1.6) * 0.014 +
    (gestL1 + gestL2) * Math.sin(t * 3.6) * 0.026 -
    laughU * 0.075;
  const nodL =
    Math.sin(t * 1.9) * 1.0 - laughU * 3.2 + laughU * Math.sin(t * 10) * 1.0;

  const breathe = (ph) => Math.sin(t * 1.45 + ph) * 2.1;

  ctx.save();
  ctx.translate(-336, 0);
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
  ctx.translate(336, 0);
  drawFigure(ctx, {
    dir: -1,
    pal: GUESTS.m,
    /* he puts the chopsticks down to pick his cup up for the toast */
    sticks: t < 2.78,
    cup: t >= 2.78,
    lift: Math.max(liftR, sipBoth),
    toast: toastW,
    gesture: gestureR,
    nod: nodR,
    tilt: Math.sin(t * 1.4 + 2) * 0.012 - liftR * 0.025 + laughU * 0.055,
    breath: breathe(2.1),
    holding: holdingR,
  });
  ctx.restore();
}

/* ── The end card ────────────────────────────────────────────── *
 * The picture washes to white and the mark is left on its own —
 * no building behind it, nothing competing with it. Drawn in
 * screen space, because it is no longer part of the world.        */
function drawEndCard(ctx, t) {
  const cx = W / 2;

  /* roundel */
  const aMark = seg(t, 5.9, 6.5, easeOut);
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
  const aName = seg(t, 6.55, 7.2);
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
  const aRule = seg(t, 7.15, 7.45);
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
  const aSub = seg(t, 7.3, 7.68);
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
  /* One slow, almost imperceptible widening. There is no building
     to pull back to any more, so the move only has to breathe. */
  const u = seg(t, 0, 5.3, easeInOut);
  return {
    scale: expLerp(4.3, 3.9, u),
    cx: 960 + Math.sin(t * 0.4) * 1.5,
    cy: lerp(788, 783, u),
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

  const wash = seg(t, 5.3, 5.95, easeInOut);
  if (wash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${wash})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (t >= 5.85) drawEndCard(ctx, t);

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
