/**
 * Khang entrance film — frame renderer
 * ───────────────────────────────────────────────────────────────
 * Draws every frame of the entrance animation and writes them as
 * PNGs for ffmpeg to encode.
 *
 * The whole film is ONE vector world. The camera starts deep inside
 * the dining room, framed on two guests at a table, and retreats in a
 * single unbroken move until the entire shopfront is in view — no
 * cuts, no dissolves. The interior is drawn clipped to the glazing,
 * so the building closes around it naturally as the camera pulls out.
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
const DURATION = 9.0;
const OUT = process.argv[2] || "/tmp/vid/frames";

/* ── Palette ─────────────────────────────────────────────────── */
const IVORY = "#f2e8d5"; // interior light
const IVORY_D = "#e4d7bd"; // interior shade
const IVORY_DD = "#d3c3a4";
const INK = "#15191d"; // figures, furniture
const INK_SOFT = "#454f58"; // things further back
const NIGHT_T = "#080b0e"; // sky, top
const NIGHT_B = "#141b21"; // sky, horizon
const BUILD = "#1b222a"; // facade body
const BUILD_L = "#242d36"; // piers, cornice
const STREET = "#0d1216";
const CREAM = "#f6efe1";
const JADE = "#2f9e63";
const GLOW = "#f8dca6";

/* ── Geometry ────────────────────────────────────────────────── */
// Shopfront glazing: the window the interior is seen through.
const GLASS = { x: 430, y: 430, w: 1060, h: 450 };
const GROUND = 880;
// Interior units → world units, and where the interior floor sits.
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
/** Normalised progress across a window, eased. */
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

/* ── The guests ──────────────────────────────────────────────── *
 * Seated profile figures. Everything is parametric so the poses can
 * be driven frame by frame: the jaw opens to speak and chew, the
 * forearm swings a dumpling up to the mouth, the torso breathes.
 * Local origin is on the floor directly beneath the figure.         */
function drawFigure(ctx, o) {
  const {
    dir, // +1 faces right, -1 faces left
    mouth = 0, // 0 shut … 1 wide
    lift = 0, // 0 hand on table … 1 hand at mouth
    headTilt = 0, // radians
    lean = 0, // forward lean, units
    breath = 0,
    hair = "bun",
    holding = 0, // dumpling scale at the chopstick tip
    ink = INK,
  } = o;

  const HIP = { x: 0, y: -150 };
  const SHO = { x: dir * 14 + lean, y: -340 + breath };
  const HEAD = { x: dir * 26 + lean * 1.4, y: -424 + breath };
  const R = 50;

  /* chair — behind, away from the table */
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-dir * 96, -16);
  ctx.lineTo(-dir * 104, -300);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-dir * 100, -250);
  ctx.lineTo(-dir * 62, -250);
  ctx.stroke();
  limb(ctx, -dir * 96, -150, dir * 10, -150, 10, INK_SOFT);

  /* legs, mostly hidden by the table */
  limb(ctx, HIP.x, HIP.y, dir * 74, -128, 30, ink);
  limb(ctx, dir * 74, -128, dir * 62, -8, 27, ink);

  /* far arm: resting on the table edge, barely moving */
  limb(ctx, SHO.x - dir * 6, SHO.y + 16, dir * 66, -244, 20, INK_SOFT);
  limb(ctx, dir * 66, -244, dir * 126, -232, 18, INK_SOFT);

  /* torso */
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(HIP.x - dir * 52, HIP.y + 18);
  ctx.quadraticCurveTo(SHO.x - dir * 54, lerp(HIP.y, SHO.y, 0.5), SHO.x - dir * 40, SHO.y + 4);
  ctx.quadraticCurveTo(SHO.x, SHO.y - 26, SHO.x + dir * 38, SHO.y + 6);
  ctx.quadraticCurveTo(HIP.x + dir * 58, lerp(HIP.y, SHO.y, 0.45), HIP.x + dir * 50, HIP.y + 18);
  ctx.closePath();
  ctx.fill();

  /* neck */
  limb(ctx, SHO.x, SHO.y - 2, HEAD.x, HEAD.y + R * 0.72, 26, ink);

  /* head, drawn about its own centre so it can tilt */
  ctx.save();
  ctx.translate(HEAD.x, HEAD.y);
  ctx.rotate(headTilt * dir);

  ctx.fillStyle = ink;
  circle(ctx, 0, 0, R);
  ctx.fill();

  /* nose */
  ctx.beginPath();
  ctx.moveTo(dir * (R - 6), -4);
  ctx.quadraticCurveTo(dir * (R + 13), 6, dir * (R - 8), 13);
  ctx.closePath();
  ctx.fill();

  /* hair */
  if (hair === "bun") {
    circle(ctx, -dir * (R - 6), -R * 0.46, 23);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-dir * 6, -R * 0.42, R * 0.98, R * 0.74, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(-dir * 4, -R * 0.34, R * 1.0, R * 0.86, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-dir * R, -R * 0.2);
    ctx.quadraticCurveTo(-dir * (R + 10), R * 0.2, -dir * (R - 12), R * 0.3);
    ctx.lineTo(-dir * (R - 2), -R * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  /* the mouth is a notch of background cut into the silhouette, so it
     reads clearly at a glance and animates to speech */
  if (mouth > 0.02) {
    const open = 4 + mouth * 15;
    ctx.fillStyle = IVORY;
    ctx.beginPath();
    ctx.ellipse(dir * (R - 15), 19, 10.5, open / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  /* near arm: swings from the table up to the mouth */
  const u = easeInOut(clamp01(lift));
  const elbow = {
    x: lerp(dir * 62, dir * 96, u),
    y: lerp(-258, -306, u) + breath * 0.5,
  };
  const hand = {
    x: lerp(dir * 132, HEAD.x + dir * 30, u),
    y: lerp(-226, HEAD.y + 20, u),
  };
  limb(ctx, SHO.x, SHO.y + 10, elbow.x, elbow.y, 23, ink);
  limb(ctx, elbow.x, elbow.y, hand.x, hand.y, 20, ink);

  /* chopsticks, angled toward whatever the hand is doing */
  const ang = lerp(-0.95, -0.15, u);
  const len = 56;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  for (const off of [-4.5, 4.5]) {
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y + off);
    ctx.lineTo(hand.x + dir * len * Math.cos(ang), hand.y + len * Math.sin(ang) + off);
    ctx.stroke();
  }
  if (holding > 0.02) {
    ctx.fillStyle = ink;
    circle(
      ctx,
      hand.x + dir * (len + 6) * Math.cos(ang),
      hand.y + (len + 6) * Math.sin(ang),
      12 * holding,
    );
    ctx.fill();
  }
}

/* ── Table setting ───────────────────────────────────────────── */
function drawTable(ctx, t) {
  const TOP = -222;
  ctx.fillStyle = INK;
  rrect(ctx, -196, TOP, 392, 20, 7);
  ctx.fill();
  limb(ctx, -150, TOP + 20, -142, -6, 13, INK);
  limb(ctx, 150, TOP + 20, 142, -6, 13, INK);

  /* stacked steamers */
  ctx.fillStyle = INK;
  rrect(ctx, -34, TOP - 30, 118, 30, 6);
  ctx.fill();
  rrect(ctx, -30, TOP - 56, 110, 28, 6);
  ctx.fill();
  ctx.strokeStyle = IVORY;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-26, TOP - 42);
  ctx.lineTo(76, TOP - 42);
  ctx.stroke();

  /* teapot */
  ctx.fillStyle = INK;
  circle(ctx, -118, TOP - 26, 27);
  ctx.fill();
  rrect(ctx, -126, TOP - 62, 18, 10, 4);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-142, TOP - 34);
  ctx.quadraticCurveTo(-168, TOP - 30, -164, TOP - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-96, TOP - 38);
  ctx.quadraticCurveTo(-74, TOP - 32, -94, TOP - 14);
  ctx.stroke();

  /* cups */
  for (const cx of [118, -62]) {
    ctx.fillStyle = INK;
    rrect(ctx, cx - 15, TOP - 16, 30, 16, 5);
    ctx.fill();
  }

  /* steam, curling off the steamers */
  ctx.strokeStyle = "rgba(21,25,29,0.30)";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const ph = t * 0.85 + i * 0.47;
    const rise = (ph % 1);
    const x0 = 2 + i * 32;
    const y0 = TOP - 62;
    const a = (1 - rise) * 0.55 * Math.min(1, rise * 5);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let s = 0; s <= 1.001; s += 0.25) {
      ctx.lineTo(
        x0 + Math.sin((s * 3.1 + ph * 4.2)) * (9 + s * 13),
        y0 - s * (86 + rise * 54),
      );
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ── The dining room ─────────────────────────────────────────── */
function lantern(ctx, x, y, r, t, i) {
  const sway = Math.sin(t * 0.52 + i * 1.7) * 0.035;
  ctx.save();
  ctx.translate(x, -1100);
  ctx.rotate(sway);
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, y + 1100 - r);
  ctx.stroke();
  const cy = y + 1100;
  ctx.fillStyle = GLOW;
  ctx.beginPath();
  ctx.ellipse(0, cy, r, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(21,25,29,0.30)";
  ctx.lineWidth = 2.2;
  for (const f of [-0.55, 0, 0.55]) {
    ctx.beginPath();
    ctx.ellipse(0, cy, r * Math.cos(Math.asin(Math.min(0.99, Math.abs(f)))) * 0.99, r * 0.86, 0, 0, Math.PI * 2);
    ctx.stroke();
    break;
  }
  ctx.beginPath();
  ctx.moveTo(-r, cy);
  ctx.lineTo(r, cy);
  ctx.stroke();
  ctx.fillStyle = INK_SOFT;
  rrect(ctx, -9, cy - r * 0.86 - 7, 18, 8, 3);
  ctx.fill();
  ctx.restore();
}

function latticePanel(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = IVORY_D;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = IVORY_DD;
  ctx.lineWidth = 7;
  const step = 112;
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
  ctx.lineWidth = 4;
  for (let gx = x + step / 2; gx <= x + w; gx += step) {
    for (let gy = y + step / 2; gy <= y + h; gy += step) {
      ctx.beginPath();
      ctx.moveTo(gx - 22, gy);
      ctx.lineTo(gx + 22, gy);
      ctx.moveTo(gx, gy - 22);
      ctx.lineTo(gx, gy + 22);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 9;
  ctx.strokeRect(x, y, w, h);
}

/** A quiet neighbouring table, suggested rather than detailed. */
function sideTable(ctx, x, flip, t, i) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(flip * 0.78, 0.78);
  const TOP = -210;
  ctx.fillStyle = INK_SOFT;
  rrect(ctx, -150, TOP, 300, 16, 6);
  ctx.fill();
  limb(ctx, -112, TOP + 16, -106, -6, 10, INK_SOFT);
  limb(ctx, 112, TOP + 16, 106, -6, 10, INK_SOFT);
  rrect(ctx, -40, TOP - 26, 80, 26, 5);
  ctx.fill();

  const bob = Math.sin(t * 1.1 + i) * 3;
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * 250, 0);
    ctx.fillStyle = INK_SOFT;
    circle(ctx, -d * 24, -392 + bob, 44);
    ctx.fill();
    /* chair + legs, so they sit on the floor rather than hover */
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-d * 86, -12);
    ctx.lineTo(-d * 92, -268);
    ctx.stroke();
    limb(ctx, -d * 40, -140, d * 60, -120, 26, INK_SOFT);
    limb(ctx, d * 60, -120, d * 52, -8, 23, INK_SOFT);
    ctx.beginPath();
    ctx.moveTo(-d * 70, -126);
    ctx.quadraticCurveTo(-d * 56, -300, -d * 18, -318 + bob);
    ctx.quadraticCurveTo(d * 24, -300, d * 30, -126);
    ctx.closePath();
    ctx.fill();
    limb(ctx, -d * 8, -300, d * 84, -228, 18, INK_SOFT);
    ctx.restore();
  }
  ctx.restore();
}

function drawInterior(ctx, t) {
  /* wall + floor */
  ctx.fillStyle = IVORY;
  ctx.fillRect(-1600, -1240, 3200, 1240);
  /* warmth pooling under the central lantern */
  const pool = ctx.createRadialGradient(0, -700, 60, 0, -620, 1150);
  pool.addColorStop(0, "rgba(248,220,166,0.42)");
  pool.addColorStop(1, "rgba(248,220,166,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(-1600, -1240, 3200, 1240);
  ctx.fillStyle = IVORY_D;
  ctx.fillRect(-1600, 0, 3200, 260);
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-1600, 0);
  ctx.lineTo(1600, 0);
  ctx.stroke();

  /* ceiling beam */
  ctx.fillStyle = IVORY_D;
  ctx.fillRect(-1600, -1160, 3200, 46);

  /* lattice screens either side of the centre */
  latticePanel(ctx, -1210, -930, 520, 780);
  latticePanel(ctx, 690, -930, 520, 780);

  /* a plain centre wall keeps the opening shot calm */
  ctx.strokeStyle = IVORY_DD;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-660, -210);
  ctx.lineTo(660, -210);
  ctx.stroke();

  sideTable(ctx, -1180, 1, t, 0);
  sideTable(ctx, 1180, -1, t, 1);

  lantern(ctx, -760, -706, 62, t, 0);
  lantern(ctx, 760, -688, 62, t, 2);
  lantern(ctx, 0, -742, 74, t, 1);

  /* ── the hero table ── */
  drawTable(ctx, t);

  /* ── choreography ───────────────────────────────────────────
     Left guest talks, right guest listens, lifts a dumpling,
     eats it, chews; then the left guest picks the thread back up. */
  const speakL =
    (t > 0.35 && t < 1.65 ? 1 : 0) * 1 + (t > 2.55 && t < 3.6 ? 1 : 0) * 1;
  const jawL =
    speakL > 0
      ? clamp01(0.5 + 0.5 * Math.sin(t * 15.5) * Math.sin(t * 6.1 + 1.2)) *
        (0.55 + 0.45 * Math.sin(t * 3.3))
      : 0;

  const liftStart = 1.45;
  const atMouth = 2.1;
  const biteEnd = 2.38;
  const backDown = 3.0;
  let liftR = 0;
  if (t >= liftStart && t < atMouth) liftR = seg(t, liftStart, atMouth, easeInOut);
  else if (t >= atMouth && t < biteEnd) liftR = 1;
  else if (t >= biteEnd && t < backDown) liftR = 1 - seg(t, biteEnd, backDown, easeInOut);

  const chewing = t > biteEnd && t < biteEnd + 1.5;
  const jawR = chewing
    ? 0.34 + 0.3 * Math.sin((t - biteEnd) * 13.5)
    : t > atMouth - 0.12 && t < biteEnd
      ? 0.85
      : 0;

  const holdingR = t < atMouth - 0.02 ? (t > liftStart - 0.25 ? 1 : 0) : clamp01(1 - (t - (atMouth - 0.02)) / 0.16);

  const nodR = Math.sin(t * 2.4) * 0.03 + (t > 0.7 && t < 1.5 ? Math.sin(t * 7.5) * 0.045 : 0);
  const breathe = (ph) => Math.sin(t * 1.7 + ph) * 3.2;

  ctx.save();
  ctx.translate(-330, 0);
  drawFigure(ctx, {
    dir: 1,
    hair: "bun",
    mouth: jawL,
    lift: 0,
    headTilt: Math.sin(t * 1.9) * 0.035 + (speakL ? Math.sin(t * 5.2) * 0.03 : 0),
    lean: 5 + Math.sin(t * 1.3) * 2,
    breath: breathe(0),
  });
  ctx.restore();

  ctx.save();
  ctx.translate(330, 0);
  drawFigure(ctx, {
    dir: -1,
    hair: "short",
    mouth: jawR,
    lift: liftR,
    headTilt: nodR - liftR * 0.05,
    lean: 4 + Math.sin(t * 1.5 + 2) * 2,
    breath: breathe(2.1),
    holding: holdingR,
  });
  ctx.restore();
}

/* ── The shopfront ───────────────────────────────────────────── */
function drawFacade(ctx, t) {
  /* sky */
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, NIGHT_T);
  sky.addColorStop(1, NIGHT_B);
  ctx.fillStyle = sky;
  ctx.fillRect(-400, -400, W + 800, GROUND + 400);

  /* street */
  ctx.fillStyle = STREET;
  ctx.fillRect(-400, GROUND, W + 800, H - GROUND + 400);

  /* building body */
  ctx.fillStyle = BUILD;
  ctx.fillRect(330, 250, 1260, GROUND - 250);

  /* cornice */
  ctx.fillStyle = BUILD_L;
  rrect(ctx, 296, 236, 1328, 54, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(246,239,225,0.16)";
  ctx.fillRect(296, 236, 1328, 3);

  /* piers */
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(330, 290, 104, GROUND - 290);
  ctx.fillRect(1486, 290, 104, GROUND - 290);
  ctx.fillStyle = "rgba(246,239,225,0.07)";
  ctx.fillRect(330, 290, 4, GROUND - 290);
  ctx.fillRect(1586, 290, 4, GROUND - 290);

  /* signboard */
  ctx.fillStyle = "#10161b";
  rrect(ctx, 648, 276, 624, 154, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(246,239,225,0.22)";
  ctx.lineWidth = 2.5;
  rrect(ctx, 648, 276, 624, 154, 8);
  ctx.stroke();
}

/** Frame, mullions and everything that sits in front of the glass. */
function drawGlazingFrame(ctx, alpha) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const { x, y, w, h } = GLASS;

  /* transom above the glass */
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(x - 10, y - 22, w + 20, 24);

  /* mullions: five bays, the middle one is the door */
  const bays = 5;
  const bw = w / bays;
  ctx.fillStyle = BUILD_L;
  for (let i = 0; i <= bays; i++) {
    ctx.fillRect(x + i * bw - 7, y, 14, h);
  }
  /* door stiles + handles */
  const dx = x + 2 * bw;
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(dx + bw / 2 - 6, y + 30, 12, h - 30);
  ctx.fillStyle = "rgba(246,239,225,0.45)";
  rrect(ctx, dx + bw / 2 - 22, y + 196, 7, 74, 3.5);
  ctx.fill();
  rrect(ctx, dx + bw / 2 + 15, y + 196, 7, 74, 3.5);
  ctx.fill();
  /* threshold */
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(x - 10, GROUND - 10, w + 20, 14);

  /* base plinth */
  ctx.fillStyle = "#222b33";
  ctx.fillRect(330, GROUND - 10, 1260, 14);

  /* step + light spilling onto the pavement */
  ctx.fillStyle = "#171e24";
  rrect(ctx, 790, GROUND + 4, 340, 20, 5);
  ctx.fill();
  const spill = ctx.createLinearGradient(0, GROUND, 0, GROUND + 150);
  spill.addColorStop(0, "rgba(248,220,166,0.26)");
  spill.addColorStop(1, "rgba(248,220,166,0)");
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.moveTo(x + 40, GROUND);
  ctx.lineTo(x + w - 40, GROUND);
  ctx.lineTo(x + w + 110, GROUND + 150);
  ctx.lineTo(x - 110, GROUND + 150);
  ctx.closePath();
  ctx.fill();

  /* planters */
  for (const px of [472, 1448]) {
    ctx.fillStyle = "#2b343d";
    rrect(ctx, px - 32, GROUND - 92, 64, 92, 8);
    ctx.fill();
    ctx.fillStyle = "#223029";
    circle(ctx, px, GROUND - 126, 42);
    ctx.fill();
    circle(ctx, px - 26, GROUND - 104, 26);
    ctx.fill();
    circle(ctx, px + 26, GROUND - 106, 24);
    ctx.fill();
  }
  ctx.restore();
}

/* ── The name on the board ───────────────────────────────────── */
function drawSign(ctx, t) {
  const on = seg(t, 7.25, 8.0);
  if (on <= 0) return;

  /* the board's lamps come up first */
  const g = ctx.createRadialGradient(960, 352, 10, 960, 352, 420);
  g.addColorStop(0, `rgba(248,220,166,${0.3 * on})`);
  g.addColorStop(1, "rgba(248,220,166,0)");
  ctx.fillStyle = g;
  ctx.fillRect(540, 222, 840, 280);

  /* 康 */
  const aMark = seg(t, 7.42, 7.92);
  if (aMark > 0) {
    ctx.save();
    ctx.globalAlpha = aMark;
    ctx.fillStyle = CREAM;
    ctx.font = "64px KhangCn";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(248,220,166,0.5)";
    ctx.shadowBlur = 24;
    ctx.fillText("康", 960, lerp(352, 346, aMark));
    ctx.restore();
  }

  /* KHANG, letter by letter */
  const aName = seg(t, 7.72, 8.34);
  if (aName > 0) {
    ctx.save();
    ctx.fillStyle = CREAM;
    ctx.font = "31px KhangDisplay";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 1;
    ctx.shadowColor = "rgba(248,220,166,0.4)";
    ctx.shadowBlur = 16;
    tracked(ctx, "KHANG", 960, 394, 13, (i, n) =>
      clamp01((aName - (i / n) * 0.55) / 0.45),
    );
    ctx.restore();
  }

  /* jade hairline */
  const aRule = seg(t, 8.12, 8.46);
  if (aRule > 0) {
    ctx.fillStyle = JADE;
    ctx.globalAlpha = aRule;
    const rw = 168 * aRule;
    ctx.fillRect(960 - rw / 2, 406, rw, 1.7);
    ctx.globalAlpha = 1;
  }

  /* descriptor */
  const aSub = seg(t, 8.28, 8.66);
  if (aSub > 0) {
    ctx.save();
    ctx.globalAlpha = aSub * 0.85;
    ctx.fillStyle = CREAM;
    ctx.font = "12px KhangSans";
    ctx.textAlign = "left";
    tracked(ctx, "CHINESE · DIMSUM", 960, 423, 5.2);
    ctx.restore();
  }
}

/* ── Camera ──────────────────────────────────────────────────── *
 * Scale 5 is a two-shot across the table; scale 1 frames the whole
 * shopfront. One continuous move, held at each end.                 */
function camera(t) {
  const hold = seg(t, 0, 3.0, (u) => u); // linear drift while they talk
  const pull = seg(t, 3.0, 7.25, easeInOut);
  // The opening framing is kept wholly inside the glazing, otherwise the
  // shopfront's plinth creeps into the bottom of what should read as a
  // shot taken from inside the room.
  const scale = pull > 0 ? expLerp(4.0, 1.0, pull) : expLerp(4.3, 4.0, hold);
  const cy = pull > 0 ? lerp(745, 540, pull) : lerp(751, 745, hold);
  const cx = 960 + Math.sin(t * 0.42) * 2.0;
  return { scale, cx, cy };
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

  /* interior, seen through the glazing */
  ctx.save();
  ctx.beginPath();
  ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
  ctx.clip();
  ctx.translate(ORIGIN.x, ORIGIN.y);
  ctx.scale(K, K);
  drawInterior(ctx, t);
  ctx.restore();

  // Fades up as the camera backs out through the window.
  drawGlazingFrame(ctx, clamp01((3.6 - cam.scale) / 1.3));
  drawSign(ctx, t);

  ctx.restore();

  /* vignette */
  const vg = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, H * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  /* grain */
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.globalCompositeOperation = "overlay";
  const g = GRAIN[frame % GRAIN.length];
  for (let y = 0; y < H; y += 256) {
    for (let x = 0; x < W; x += 256) ctx.drawImage(g, x, y);
  }
  ctx.restore();

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
