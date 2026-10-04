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
 * It closes on the Khang logo.
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
 * A warm Cantonese dining room at night — cream plaster, walnut,
 * red silk lanterns and celadon — against a deep green-black
 * street. Jade is the brand's own green and is kept for the logo,
 * the hairlines and one of the guests, so the film and the site
 * share a colour without the room looking painted to match.        */

/* room */
const WALL = "#f0e4ce";
const WALL_SH = "#e1d1b1";
const WALL_DEEP = "#cdb995";
const PAPER = "#f7eeda"; // screen paper
const WOOD = "#6d472f"; // walnut
const WOOD_D = "#4a2e1e";
const WOOD_L = "#8d5f3d";
const FLOOR = "#7d5035";
const FLOOR_D = "#5d3a25";

/* things on the table */
const BAMBOO = "#dcab6a";
const BAMBOO_D = "#b07f42";
const BAMBOO_L = "#eec489";
const CELADON = "#a3c3ad";
const CELADON_D = "#7d9f88";
const DUMPLING = "#f4e5c8";
const DUMPLING_D = "#ddc79f";
const TEA = "#c08a3e";

/* lanterns */
const LANT = "#c0392b";
const LANT_D = "#96271d";
const LANT_L = "#d9594a";
const BRASS = "#c9a227";
const GLOW = "#f8dca6";

/* people */
const SKIN_A = "#eabb92";
const SKIN_A_SH = "#d19e76";
const SKIN_B = "#d8a075";
const SKIN_B_SH = "#bd855c";
const HAIR_A = "#2b1d17";
const HAIR_A_L = "#443025";
const HAIR_B = "#1f1612";
const HAIR_B_L = "#372922";
const CLOTH_A = "#2f7d55"; // jade — the brand green, worn
const CLOTH_A_D = "#24613f";
const CLOTH_B = "#3b4350"; // charcoal indigo
const CLOTH_B_D = "#2c333d";
const COLLAR = "#f3ead9";
const LIP = "#a35b50";
const LIP_D = "#5e2e2b";

/* night, street, building */
const NIGHT_T = "#060a0c";
const NIGHT_B = "#101a1c";
const BUILD = "#1a2322";
const BUILD_L = "#25312f";
const BUILD_LL = "#30403d";
const STREET = "#0b1012";
const CREAM = "#f7f1e4";

/* the brand */
const JADE = "#15803d";
const JADE_D = "#064e2e";
const JADE_L = "#16a34a";

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
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
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
font("SpaceGrotesk_500Medium.ttf", "KhangMono");

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

/** #rrggbb at an arbitrary alpha — gradients need rgba stops. */
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
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

function trackedWidth(ctx, text, spacing) {
  const chars = [...text];
  return chars.reduce((a, c) => a + ctx.measureText(c).width + spacing, 0) - spacing;
}

/* ── The guests ──────────────────────────────────────────────── *
 * Seated three-quarter-profile figures, drawn in full colour so they
 * read as people rather than cut-outs: skin, hair, a visible eye and
 * brow, a profiled nose and lips, a mandarin collar over a coloured
 * jacket, and bare hands past the cuff.
 *
 * Everything is parametric so the poses can be driven frame by
 * frame — the jaw drops to speak and chew, the forearm swings a
 * dumpling up to the mouth, the torso breathes. Local origin is on
 * the floor directly beneath the figure.                            */

/** The outline of a head in profile. `jaw` (0..1) drops the chin. */
function headPath(ctx, R, dir, jaw) {
  const X = (v) => dir * v * R;
  const Y = (v) => v * R;
  const j = jaw * 0.17;
  ctx.beginPath();
  ctx.moveTo(X(-0.1), Y(-1.0));
  // forehead
  ctx.bezierCurveTo(X(0.5), Y(-1.03), X(0.85), Y(-0.72), X(0.87), Y(-0.3));
  // brow, then the dip at the bridge of the nose
  ctx.bezierCurveTo(X(0.9), Y(-0.17), X(0.8), Y(-0.12), X(0.83), Y(-0.02));
  // nose
  ctx.bezierCurveTo(X(0.94), Y(0.04), X(1.03), Y(0.13), X(1.05), Y(0.2));
  ctx.bezierCurveTo(X(1.03), Y(0.27), X(0.95), Y(0.26), X(0.86), Y(0.29));
  // upper lip, mouth, lower lip
  ctx.bezierCurveTo(X(0.92), Y(0.38 + j * 0.3), X(0.93), Y(0.52 + j * 0.7), X(0.82), Y(0.6 + j));
  // chin and jaw
  ctx.bezierCurveTo(X(0.8), Y(0.78 + j), X(0.62), Y(0.97 + j), X(0.3), Y(1.02 + j * 0.8));
  ctx.bezierCurveTo(X(-0.18), Y(1.1), X(-0.88), Y(0.76), X(-0.93), Y(0.1));
  // back of the skull
  ctx.bezierCurveTo(X(-0.97), Y(-0.58), X(-0.6), Y(-1.0), X(-0.1), Y(-1.0));
  ctx.closePath();
}

function drawHead(ctx, o) {
  const { R, dir, jaw, skin, skinSh, hair, hairL, style } = o;
  const X = (v) => dir * v * R;
  const Y = (v) => v * R;

  /* skin */
  ctx.fillStyle = skin;
  headPath(ctx, R, dir, jaw);
  ctx.fill();

  /* the shaded side of the face, along the back of the jaw */
  ctx.save();
  headPath(ctx, R, dir, jaw);
  ctx.clip();
  const sh = ctx.createLinearGradient(X(-1.0), 0, X(0.3), 0);
  sh.addColorStop(0, rgba(skinSh, 0.9));
  sh.addColorStop(1, rgba(skinSh, 0));
  ctx.fillStyle = sh;
  ctx.fillRect(-R * 1.4, -R * 1.4, R * 2.8, R * 2.9);
  ctx.restore();

  /* ear, set back where an ear belongs and only just shaded */
  ctx.fillStyle = skin;
  ellipse(ctx, X(-0.44), Y(0.14), R * 0.13, R * 0.19, dir * 0.1);
  ctx.fill();
  ctx.strokeStyle = rgba(skinSh, 0.5);
  ctx.lineWidth = R * 0.035;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(X(-0.4), Y(0.07));
  ctx.quadraticCurveTo(X(-0.51), Y(0.14), X(-0.42), Y(0.21));
  ctx.stroke();

  /* brow */
  ctx.strokeStyle = hair;
  ctx.lineWidth = R * 0.095;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(X(0.43), Y(-0.33));
  ctx.quadraticCurveTo(X(0.66), Y(-0.4), X(0.79), Y(-0.29));
  ctx.stroke();

  /* eye: lid line, iris, catchlight */
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(X(0.49), Y(-0.1));
  ctx.quadraticCurveTo(X(0.64), Y(-0.2), X(0.75), Y(-0.08));
  ctx.quadraticCurveTo(X(0.63), Y(-0.02), X(0.49), Y(-0.1));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2a1d17";
  ellipse(ctx, X(0.65), Y(-0.1), R * 0.072, R * 0.082);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  circle(ctx, X(0.69), Y(-0.13), R * 0.027);
  ctx.fill();
  /* upper lash */
  ctx.strokeStyle = hair;
  ctx.lineWidth = R * 0.055;
  ctx.beginPath();
  ctx.moveTo(X(0.45), Y(-0.11));
  ctx.quadraticCurveTo(X(0.63), Y(-0.23), X(0.78), Y(-0.09));
  ctx.stroke();

  /* nostril + the crease beside the nose */
  ctx.strokeStyle = skinSh;
  ctx.lineWidth = R * 0.05;
  ctx.beginPath();
  ctx.moveTo(X(0.97), Y(0.24));
  ctx.quadraticCurveTo(X(0.9), Y(0.27), X(0.88), Y(0.22));
  ctx.stroke();

  /* cheek */
  ctx.fillStyle = "rgba(200,110,90,0.085)";
  ellipse(ctx, X(0.46), Y(0.24), R * 0.17, R * 0.12);
  ctx.fill();

  /* mouth — a dark opening between the lips, which is what carries
     speech and chewing on a face this size */
  const open = jaw * R * 0.3;
  const my = Y(0.47) + open * 0.45;
  if (jaw > 0.04) {
    ctx.fillStyle = LIP_D;
    ctx.beginPath();
    ctx.moveTo(X(0.6), my - open * 0.3);
    ctx.quadraticCurveTo(X(0.82), my - open * 0.45, X(0.86), my);
    ctx.quadraticCurveTo(X(0.8), my + open * 0.75, X(0.6), my + open * 0.45);
    ctx.closePath();
    ctx.fill();
    /* a hint of teeth at the top of the opening */
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.moveTo(X(0.62), my - open * 0.28);
    ctx.quadraticCurveTo(X(0.82), my - open * 0.42, X(0.85), my - open * 0.02);
    ctx.quadraticCurveTo(X(0.74), my - open * 0.12, X(0.62), my - open * 0.1);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = LIP;
    ctx.lineWidth = R * 0.06;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(X(0.62), Y(0.46));
    ctx.quadraticCurveTo(X(0.78), Y(0.48), X(0.86), Y(0.43));
    ctx.stroke();
  }

  /* hair, over the crown and down the back of the head */
  ctx.fillStyle = hair;
  if (style === "bun") {
    ctx.beginPath();
    ctx.moveTo(X(0.86), Y(-0.34));
    ctx.bezierCurveTo(X(0.78), Y(-0.86), X(0.3), Y(-1.2), X(-0.12), Y(-1.12));
    ctx.bezierCurveTo(X(-0.72), Y(-1.02), X(-1.12), Y(-0.54), X(-1.0), Y(0.22));
    ctx.bezierCurveTo(X(-0.96), Y(0.5), X(-0.86), Y(0.62), X(-0.8), Y(0.52));
    ctx.bezierCurveTo(X(-0.92), Y(-0.1), X(-0.78), Y(-0.6), X(-0.34), Y(-0.74));
    ctx.bezierCurveTo(X(0.1), Y(-0.88), X(0.62), Y(-0.72), X(0.86), Y(-0.34));
    ctx.closePath();
    ctx.fill();
    /* the bun itself, with a pin through it */
    circle(ctx, X(-0.92), Y(-0.5), R * 0.33);
    ctx.fill();
    ctx.fillStyle = hairL;
    ctx.beginPath();
    ctx.arc(X(-0.92), Y(-0.5), R * 0.33, Math.PI * 1.15, Math.PI * 1.75);
    ctx.lineTo(X(-0.92), Y(-0.5));
    ctx.fill();
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = R * 0.055;
    ctx.beginPath();
    ctx.moveTo(X(-1.18), Y(-0.6));
    ctx.lineTo(X(-0.66), Y(-0.43));
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(X(0.9), Y(-0.28));
    ctx.bezierCurveTo(X(0.88), Y(-0.9), X(0.32), Y(-1.22), X(-0.16), Y(-1.12));
    ctx.bezierCurveTo(X(-0.78), Y(-1.0), X(-1.08), Y(-0.5), X(-0.98), Y(0.3));
    ctx.lineTo(X(-0.74), Y(0.34));
    ctx.bezierCurveTo(X(-0.82), Y(-0.16), X(-0.74), Y(-0.56), X(-0.38), Y(-0.66));
    ctx.bezierCurveTo(X(0.12), Y(-0.78), X(0.66), Y(-0.62), X(0.9), Y(-0.28));
    ctx.closePath();
    ctx.fill();
    /* a short sideburn in front of the ear */
    ctx.fillStyle = hair;
    rrectRot(ctx, X(-0.1), Y(-0.18), R * 0.16, R * 0.3);
  }
  /* no highlight on the hair: at this size any sheen pale enough to
     read as shine reads instead as a bald patch */
}

function rrectRot(ctx, x, y, w, h) {
  rrect(ctx, x - w / 2, y - h / 2, w, h, w / 2);
  ctx.fill();
}

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
    skin,
    skinSh,
    hairCol,
    hairLCol,
    cloth,
    clothD,
  } = o;

  const HIP = { x: 0, y: -150 };
  const SHO = { x: dir * 14 + lean, y: -340 + breath };
  const HEAD = { x: dir * 26 + lean * 1.4, y: -424 + breath };
  const R = 50;

  /* chair — walnut, behind and away from the table */
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-dir * 96, -16);
  ctx.lineTo(-dir * 104, -300);
  ctx.stroke();
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-dir * 101, -252);
  ctx.lineTo(-dir * 62, -252);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-dir * 100, -202);
  ctx.lineTo(-dir * 64, -202);
  ctx.stroke();
  limb(ctx, -dir * 96, -150, dir * 10, -150, 11, WOOD_D);

  /* legs — trousers, then a shoe */
  limb(ctx, HIP.x, HIP.y, dir * 74, -128, 31, clothD);
  limb(ctx, dir * 74, -128, dir * 64, -14, 28, clothD);
  ctx.fillStyle = "#23262b";
  rrect(ctx, dir > 0 ? dir * 48 : dir * 48 - 44, -20, dir * 44, 20, 8);
  ctx.fill();

  /* far arm, behind the body: over it, the upper arm reads as a
     strap across the chest rather than a limb */
  limb(ctx, SHO.x - dir * 6, SHO.y + 16, dir * 66, -244, 21, clothD);
  limb(ctx, dir * 66, -244, dir * 112, -236, 19, clothD);
  limb(ctx, dir * 112, -236, dir * 134, -230, 15, skinSh);

  /* torso */
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(HIP.x - dir * 52, HIP.y + 18);
  ctx.quadraticCurveTo(SHO.x - dir * 54, lerp(HIP.y, SHO.y, 0.5), SHO.x - dir * 40, SHO.y + 4);
  ctx.quadraticCurveTo(SHO.x, SHO.y - 26, SHO.x + dir * 38, SHO.y + 6);
  ctx.quadraticCurveTo(HIP.x + dir * 58, lerp(HIP.y, SHO.y, 0.45), HIP.x + dir * 50, HIP.y + 18);
  ctx.closePath();
  ctx.fill();

  /* the jacket's shaded back, and the placket down the front */
  ctx.save();
  ctx.clip();
  ctx.fillStyle = clothD;
  ctx.fillRect(SHO.x - dir * 70, SHO.y - 40, dir * 34, 260);
  ctx.restore();
  ctx.strokeStyle = clothD;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(SHO.x + dir * 24, SHO.y + 12);
  ctx.quadraticCurveTo(HIP.x + dir * 42, -250, HIP.x + dir * 40, HIP.y + 14);
  ctx.stroke();
  /* frog fastenings */
  ctx.fillStyle = COLLAR;
  for (const fy of [-300, -258, -216]) {
    circle(ctx, SHO.x + dir * 27 - (SHO.y - fy) * dir * 0.04, fy, 4.4);
    ctx.fill();
  }

  /* neck */
  limb(ctx, SHO.x, SHO.y - 2, HEAD.x, HEAD.y + R * 0.74, 27, skinSh);

  /* the head's shadow on the neck */
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#000000";
  ellipse(ctx, HEAD.x - dir * 2, HEAD.y + R * 1.0, R * 0.25, R * 0.13);
  ctx.fill();
  ctx.restore();

  /* mandarin collar, sitting over the neck */
  ctx.fillStyle = COLLAR;
  ctx.beginPath();
  ctx.moveTo(SHO.x - dir * 42, SHO.y + 2);
  ctx.quadraticCurveTo(SHO.x - dir * 12, SHO.y - 40, SHO.x + dir * 26, SHO.y - 6);
  ctx.quadraticCurveTo(SHO.x + dir * 10, SHO.y + 16, SHO.x - dir * 42, SHO.y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(SHO.x - dir * 40, SHO.y + 6);
  ctx.quadraticCurveTo(SHO.x - dir * 8, SHO.y + 22, SHO.x + dir * 24, SHO.y + 2);
  ctx.quadraticCurveTo(SHO.x, SHO.y + 26, SHO.x - dir * 40, SHO.y + 18);
  ctx.closePath();
  ctx.fill();

  /* head, drawn about its own centre so it can tilt */
  ctx.save();
  ctx.translate(HEAD.x, HEAD.y);
  ctx.rotate(headTilt * dir);
  drawHead(ctx, {
    R,
    dir,
    jaw: mouth,
    skin,
    skinSh,
    hair: hairCol,
    hairL: hairLCol,
    style: hair,
  });
  ctx.restore();

  /* near arm: swings from the table up to the mouth. Sleeve to the
     cuff, bare skin past it, so the hand reads as a hand. */
  const u = easeInOut(clamp01(lift));
  const elbow = {
    x: lerp(dir * 62, dir * 96, u),
    y: lerp(-258, -306, u) + breath * 0.5,
  };
  const hand = {
    x: lerp(dir * 132, HEAD.x + dir * 34, u),
    y: lerp(-226, HEAD.y + 24, u),
  };
  const cuff = { x: lerp(elbow.x, hand.x, 0.46), y: lerp(elbow.y, hand.y, 0.46) };
  limb(ctx, SHO.x, SHO.y + 10, elbow.x, elbow.y, 24, cloth);
  limb(ctx, elbow.x, elbow.y, cuff.x, cuff.y, 21, cloth);
  ctx.fillStyle = COLLAR;
  circle(ctx, cuff.x, cuff.y, 11);
  ctx.fill();
  limb(ctx, cuff.x, cuff.y, hand.x, hand.y, 16, skin);
  ctx.fillStyle = skin;
  circle(ctx, hand.x, hand.y, 12.5);
  ctx.fill();
  /* thumb */
  ctx.fillStyle = skinSh;
  ellipse(ctx, hand.x + dir * 7, hand.y - 6, 5.5, 3.4, dir * -0.5);
  ctx.fill();

  /* chopsticks, angled toward whatever the hand is doing */
  const ang = lerp(-0.95, -0.15, u);
  const len = 58;
  ctx.lineCap = "round";
  for (const off of [-5, 4.5]) {
    ctx.strokeStyle = off < 0 ? BAMBOO : BAMBOO_D;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(hand.x - dir * 14 * Math.cos(ang), hand.y - 14 * Math.sin(ang) + off);
    ctx.lineTo(hand.x + dir * len * Math.cos(ang), hand.y + len * Math.sin(ang) + off);
    ctx.stroke();
  }
  if (holding > 0.02) {
    const hx = hand.x + dir * (len + 5) * Math.cos(ang);
    const hy = hand.y + (len + 5) * Math.sin(ang);
    ctx.fillStyle = DUMPLING;
    ellipse(ctx, hx, hy, 13 * holding, 11.5 * holding);
    ctx.fill();
    ctx.fillStyle = DUMPLING_D;
    ctx.beginPath();
    ctx.arc(hx, hy, 13 * holding, 0.5, 2.3);
    ctx.fill();
    /* the pleat along the top */
    ctx.strokeStyle = DUMPLING_D;
    ctx.lineWidth = 1.6 * holding;
    ctx.beginPath();
    ctx.moveTo(hx - 8 * holding, hy - 6 * holding);
    ctx.quadraticCurveTo(hx, hy - 10 * holding, hx + 8 * holding, hy - 6 * holding);
    ctx.stroke();
  }
}

/* ── Table setting ───────────────────────────────────────────── */
function drawTable(ctx, t) {
  const TOP = -222;

  /* walnut top with a lit edge */
  ctx.fillStyle = WOOD;
  rrect(ctx, -196, TOP, 392, 21, 7);
  ctx.fill();
  ctx.fillStyle = WOOD_L;
  rrect(ctx, -196, TOP, 392, 6, 3);
  ctx.fill();
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-190, TOP + 16, 380, 5);
  limb(ctx, -150, TOP + 20, -142, -6, 14, WOOD_D);
  limb(ctx, 150, TOP + 20, 142, -6, 14, WOOD_D);

  /* a runner down the middle of the table */
  ctx.fillStyle = "#8d2f28";
  rrect(ctx, -96, TOP - 4, 204, 8, 3);
  ctx.fill();
  ctx.fillStyle = BRASS;
  ctx.fillRect(-96, TOP - 2, 204, 1.5);

  /* stacked bamboo steamers */
  const steam = (y, h, w, x) => {
    ctx.fillStyle = BAMBOO;
    rrect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.fillStyle = BAMBOO_D;
    ctx.fillRect(x + 2, y + h - 5, w - 4, 4);
    ctx.strokeStyle = BAMBOO_L;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 5);
    ctx.lineTo(x + w - 3, y + 5);
    ctx.stroke();
  };
  steam(TOP - 30, 30, 118, -34);
  steam(TOP - 56, 28, 110, -30);
  /* woven lid */
  ctx.fillStyle = BAMBOO_L;
  rrect(ctx, -32, TOP - 64, 114, 11, 5);
  ctx.fill();
  ctx.strokeStyle = BAMBOO_D;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(-26 + i * 17, TOP - 63);
    ctx.lineTo(-20 + i * 17, TOP - 54);
    ctx.stroke();
  }

  /* celadon teapot */
  ctx.fillStyle = CELADON;
  ellipse(ctx, -118, TOP - 26, 29, 25);
  ctx.fill();
  ctx.fillStyle = CELADON_D;
  ctx.beginPath();
  ctx.arc(-118, TOP - 26, 29, 0.35, 2.5);
  ctx.fill();
  ctx.fillStyle = CELADON;
  rrect(ctx, -128, TOP - 60, 20, 11, 4);
  ctx.fill();
  ctx.fillStyle = BRASS;
  circle(ctx, -118, TOP - 62, 4.5);
  ctx.fill();
  ctx.strokeStyle = CELADON;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-144, TOP - 34);
  ctx.quadraticCurveTo(-170, TOP - 30, -166, TOP - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-96, TOP - 38);
  ctx.quadraticCurveTo(-72, TOP - 32, -92, TOP - 14);
  ctx.stroke();

  /* cups of tea */
  for (const cx of [120, -64]) {
    ctx.fillStyle = CELADON_D;
    ellipse(ctx, cx, TOP - 1, 19, 5);
    ctx.fill();
    ctx.fillStyle = CELADON;
    rrect(ctx, cx - 15, TOP - 18, 30, 18, 5);
    ctx.fill();
    ctx.fillStyle = TEA;
    ellipse(ctx, cx, TOP - 16, 12.5, 3.6);
    ctx.fill();
  }

  /* a small plate of dumplings in front of each guest */
  for (const px of [-172, 168]) {
    ctx.fillStyle = CELADON;
    ellipse(ctx, px, TOP - 4, 30, 8);
    ctx.fill();
    ctx.fillStyle = CELADON_D;
    ctx.beginPath();
    ctx.ellipse(px, TOP - 4, 30, 8, 0, 0, Math.PI);
    ctx.fill();
    for (const [ox, oy, r] of [
      [-11, -9, 10],
      [8, -10, 10.5],
      [-1, -16, 9],
    ]) {
      ctx.fillStyle = DUMPLING;
      ellipse(ctx, px + ox, TOP - 4 + oy, r, r * 0.86);
      ctx.fill();
      ctx.fillStyle = DUMPLING_D;
      ctx.beginPath();
      ctx.arc(px + ox, TOP - 4 + oy, r, 0.5, 2.4);
      ctx.fill();
    }
  }

  /* steam, curling off the steamers */
  ctx.strokeStyle = "rgba(255,255,255,0.62)";
  ctx.lineWidth = 3.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const ph = t * 0.85 + i * 0.47;
    const rise = ph % 1;
    const x0 = 2 + i * 32;
    const y0 = TOP - 68;
    ctx.globalAlpha = (1 - rise) * 0.6 * Math.min(1, rise * 5);
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
  const sway = Math.sin(t * 0.52 + i * 1.7) * 0.035;
  ctx.save();
  ctx.translate(x, -1160);
  ctx.rotate(sway);
  const cy = y + 1160;

  /* flex */
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, cy - r * 0.92);
  ctx.stroke();

  /* the light it throws */
  const halo = ctx.createRadialGradient(0, cy, r * 0.5, 0, cy, r * 5.2);
  halo.addColorStop(0, "rgba(255,206,130,0.30)");
  halo.addColorStop(0.45, "rgba(255,196,120,0.09)");
  halo.addColorStop(1, "rgba(255,196,120,0)");
  ctx.fillStyle = halo;
  circle(ctx, 0, cy, r * 5.2);
  ctx.fill();

  /* red silk body */
  ctx.fillStyle = LANT;
  ellipse(ctx, 0, cy, r, r * 0.88);
  ctx.fill();
  /* lit from within on the lower half */
  const inner = ctx.createRadialGradient(0, cy + r * 0.2, r * 0.1, 0, cy, r);
  inner.addColorStop(0, "rgba(255,214,150,0.85)");
  inner.addColorStop(0.55, "rgba(216,90,70,0.35)");
  inner.addColorStop(1, "rgba(150,39,29,0)");
  ctx.fillStyle = inner;
  ellipse(ctx, 0, cy, r, r * 0.88);
  ctx.fill();
  /* ribs */
  ctx.strokeStyle = "rgba(150,39,29,0.45)";
  ctx.lineWidth = r * 0.045;
  for (const f of [0.34, 0.68]) {
    ctx.beginPath();
    ctx.ellipse(0, cy, r * f, r * 0.88, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,230,180,0.35)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, cy, r * 0.16, r * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();

  /* brass caps */
  ctx.fillStyle = BRASS;
  rrect(ctx, -r * 0.3, cy - r * 0.95, r * 0.6, r * 0.18, r * 0.07);
  ctx.fill();
  rrect(ctx, -r * 0.26, cy + r * 0.8, r * 0.52, r * 0.16, r * 0.06);
  ctx.fill();

  /* tassel */
  ctx.strokeStyle = LANT_D;
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(0, cy + r * 0.95);
  ctx.lineTo(0, cy + r * 1.32);
  ctx.stroke();
  ctx.fillStyle = LANT_L;
  ctx.beginPath();
  ctx.moveTo(-r * 0.13, cy + r * 1.28);
  ctx.lineTo(r * 0.13, cy + r * 1.28);
  ctx.lineTo(r * 0.07, cy + r * 1.62);
  ctx.lineTo(-r * 0.07, cy + r * 1.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function latticePanel(ctx, x, y, w, h) {
  /* backlit paper in a walnut frame */
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, PAPER);
  g.addColorStop(1, "#ecdfc4");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 8;
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
  /* corner brackets in each pane, rather than a cross — a cross in
     the middle of every square reads as a grid of plus signs */
  ctx.strokeStyle = WOOD_L;
  ctx.lineWidth = 4;
  const b = 20;
  for (let gx = x; gx <= x + w; gx += step) {
    for (let gy = y; gy <= y + h; gy += step) {
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const ox = gx + sx * step * 0.5;
        const oy = gy + sy * step * 0.5;
        if (ox < x || ox > x + w || oy < y || oy > y + h) continue;
        ctx.beginPath();
        ctx.moveTo(gx + sx * 7, oy - sy * b);
        ctx.lineTo(gx + sx * 7, oy);
        ctx.lineTo(ox - sx * b, oy);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 12;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = WOOD_L;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
}

/** A quiet neighbouring table, suggested rather than detailed. */
function sideTable(ctx, x, flip, t, i) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(flip * 0.78, 0.78);
  const TOP = -210;
  ctx.fillStyle = WOOD;
  rrect(ctx, -150, TOP, 300, 17, 6);
  ctx.fill();
  ctx.fillStyle = WOOD_L;
  rrect(ctx, -150, TOP, 300, 5, 2.5);
  ctx.fill();
  limb(ctx, -112, TOP + 16, -106, -6, 11, WOOD_D);
  limb(ctx, 112, TOP + 16, 106, -6, 11, WOOD_D);
  ctx.fillStyle = BAMBOO;
  rrect(ctx, -40, TOP - 26, 80, 26, 5);
  ctx.fill();
  ctx.fillStyle = BAMBOO_L;
  rrect(ctx, -42, TOP - 32, 84, 8, 4);
  ctx.fill();

  const bob = Math.sin(t * 1.1 + i) * 3;
  const pair = [
    { skin: SKIN_B, hair: HAIR_B, cloth: "#6a4a63", clothD: "#523a4c" },
    { skin: SKIN_A, hair: HAIR_A, cloth: "#3d6076", clothD: "#2f4a5c" },
  ];
  pair.forEach((p, n) => {
    const d = n === 0 ? -1 : 1;
    ctx.save();
    ctx.translate(d * 250, 0);
    /* chair */
    ctx.strokeStyle = WOOD_D;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-d * 86, -12);
    ctx.lineTo(-d * 92, -268);
    ctx.stroke();
    /* legs */
    limb(ctx, -d * 40, -140, d * 60, -120, 27, p.clothD);
    limb(ctx, d * 60, -120, d * 52, -8, 24, p.clothD);
    /* body */
    ctx.fillStyle = p.cloth;
    ctx.beginPath();
    ctx.moveTo(-d * 70, -126);
    ctx.quadraticCurveTo(-d * 56, -300, -d * 18, -318 + bob);
    ctx.quadraticCurveTo(d * 24, -300, d * 30, -126);
    ctx.closePath();
    ctx.fill();
    limb(ctx, -d * 8, -300, d * 84, -228, 19, p.cloth);
    ctx.fillStyle = p.skin;
    circle(ctx, d * 92, -226, 13);
    ctx.fill();
    /* head */
    ctx.fillStyle = p.skin;
    circle(ctx, -d * 24, -392 + bob, 44);
    ctx.fill();
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(-d * 24, -392 + bob, 44, Math.PI * 0.92, Math.PI * 2.16);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

function drawInterior(ctx, t) {
  /* wall */
  const wall = ctx.createLinearGradient(0, -1240, 0, 0);
  wall.addColorStop(0, WALL_SH);
  wall.addColorStop(0.45, WALL);
  wall.addColorStop(1, WALL_SH);
  ctx.fillStyle = wall;
  ctx.fillRect(-1600, -1240, 3200, 1240);

  /* warmth pooling under the central lantern */
  const pool = ctx.createRadialGradient(0, -700, 60, 0, -620, 1150);
  pool.addColorStop(0, "rgba(255,206,140,0.34)");
  pool.addColorStop(1, "rgba(255,206,140,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(-1600, -1240, 3200, 1240);

  /* panelled wainscot under a walnut cap rail. A solid dark dado
     reads as a brown band across the bottom third of the opening
     shot and swallows the chairs; keeping it cream keeps the room
     light and the furniture legible. */
  ctx.fillStyle = "#e8d9bd";
  ctx.fillRect(-1600, -140, 3200, 140);
  ctx.strokeStyle = "#dccaa9";
  ctx.lineWidth = 4;
  for (let px = -1560; px <= 1600; px += 240) {
    rrect(ctx, px, -116, 190, 88, 5);
    ctx.stroke();
  }
  ctx.fillStyle = WOOD;
  ctx.fillRect(-1600, -152, 3200, 14);
  ctx.fillStyle = WOOD_L;
  ctx.fillRect(-1600, -152, 3200, 4);
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-1600, -24, 3200, 24);

  /* floor: warm boards, with the lanterns reflected in them */
  const fl = ctx.createLinearGradient(0, 0, 0, 260);
  fl.addColorStop(0, FLOOR);
  fl.addColorStop(1, FLOOR_D);
  ctx.fillStyle = fl;
  ctx.fillRect(-1600, 0, 3200, 260);
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 3;
  for (let bx = -1600; bx <= 1600; bx += 190) {
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + 34, 260);
    ctx.stroke();
  }
  for (const [rx, rw] of [[-760, 150], [0, 180], [760, 150]]) {
    const rg = ctx.createLinearGradient(0, 0, 0, 230);
    rg.addColorStop(0, "rgba(255,200,130,0.26)");
    rg.addColorStop(1, "rgba(255,200,130,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(rx - rw * 0.4, 0);
    ctx.lineTo(rx + rw * 0.4, 0);
    ctx.lineTo(rx + rw, 230);
    ctx.lineTo(rx - rw, 230);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-1600, 0);
  ctx.lineTo(1600, 0);
  ctx.stroke();

  /* ceiling beam */
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-1600, -1180, 3200, 56);
  ctx.fillStyle = WOOD;
  ctx.fillRect(-1600, -1124, 3200, 9);

  /* lattice screens either side of the centre */
  latticePanel(ctx, -1210, -930, 520, 780);
  latticePanel(ctx, 690, -930, 520, 780);

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
  const speakL = (t > 0.3 && t < 1.5 ? 1 : 0) + (t > 2.45 && t < 3.7 ? 1 : 0);
  const jawL =
    speakL > 0
      ? clamp01(0.5 + 0.5 * Math.sin(t * 15.5) * Math.sin(t * 6.1 + 1.2)) *
        (0.55 + 0.45 * Math.sin(t * 3.3))
      : 0;

  const liftStart = 1.25;
  const atMouth = 1.85;
  const biteEnd = 2.12;
  const backDown = 2.72;
  let liftR = 0;
  if (t >= liftStart && t < atMouth) liftR = seg(t, liftStart, atMouth, easeInOut);
  else if (t >= atMouth && t < biteEnd) liftR = 1;
  else if (t >= biteEnd && t < backDown) liftR = 1 - seg(t, biteEnd, backDown, easeInOut);

  const chewing = t > biteEnd && t < biteEnd + 1.45;
  const jawR = chewing
    ? 0.34 + 0.3 * Math.sin((t - biteEnd) * 13.5)
    : t > atMouth - 0.12 && t < biteEnd
      ? 0.85
      : 0;

  const holdingR =
    t < atMouth - 0.02
      ? t > liftStart - 0.25
        ? 1
        : 0
      : clamp01(1 - (t - (atMouth - 0.02)) / 0.16);

  const nodR = Math.sin(t * 2.4) * 0.03 + (t > 0.6 && t < 1.3 ? Math.sin(t * 7.5) * 0.045 : 0);
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
    skin: SKIN_A,
    skinSh: SKIN_A_SH,
    hairCol: HAIR_A,
    hairLCol: HAIR_A_L,
    cloth: CLOTH_A,
    clothD: CLOTH_A_D,
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
    skin: SKIN_B,
    skinSh: SKIN_B_SH,
    hairCol: HAIR_B,
    hairLCol: HAIR_B_L,
    cloth: CLOTH_B,
    clothD: CLOTH_B_D,
  });
  ctx.restore();
}

/* ── The shopfront ───────────────────────────────────────────── */
function drawFacade(ctx, t) {
  /* sky */
  const sky = ctx.createLinearGradient(0, -200, 0, GROUND);
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

  /* cornice, with a brass line under it */
  ctx.fillStyle = BUILD_L;
  rrect(ctx, 296, 236, 1328, 54, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(247,241,228,0.14)";
  ctx.fillRect(296, 236, 1328, 3);
  ctx.fillStyle = "rgba(201,162,39,0.5)";
  ctx.fillRect(312, 288, 1296, 2.5);

  /* piers */
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(330, 290, 104, GROUND - 290);
  ctx.fillRect(1486, 290, 104, GROUND - 290);
  ctx.fillStyle = "rgba(247,241,228,0.06)";
  ctx.fillRect(330, 290, 4, GROUND - 290);
  ctx.fillRect(1586, 290, 4, GROUND - 290);
  /* warm bounce off the piers, from the window light */
  const bounce = ctx.createLinearGradient(434, 0, 500, 0);
  bounce.addColorStop(0, "rgba(255,200,130,0.14)");
  bounce.addColorStop(1, "rgba(255,200,130,0)");
  ctx.fillStyle = bounce;
  ctx.fillRect(390, 430, 110, 450);
  const bounce2 = ctx.createLinearGradient(1486, 0, 1420, 0);
  bounce2.addColorStop(0, "rgba(255,200,130,0.14)");
  bounce2.addColorStop(1, "rgba(255,200,130,0)");
  ctx.fillStyle = bounce2;
  ctx.fillRect(1420, 430, 110, 450);

  /* signboard, in a brass frame */
  ctx.fillStyle = "#0e1413";
  rrect(ctx, 648, 272, 624, 160, 9);
  ctx.fill();
  ctx.strokeStyle = "rgba(201,162,39,0.55)";
  ctx.lineWidth = 3;
  rrect(ctx, 648, 272, 624, 160, 9);
  ctx.stroke();
  ctx.strokeStyle = "rgba(247,241,228,0.1)";
  ctx.lineWidth = 1.5;
  rrect(ctx, 656, 280, 608, 144, 6);
  ctx.stroke();
}

/** Frame, mullions and everything that sits in front of the glass. */
function drawGlazingFrame(ctx, alpha) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const { x, y, w, h } = GLASS;

  /* transom above the glass */
  ctx.fillStyle = BUILD_LL;
  ctx.fillRect(x - 10, y - 22, w + 20, 24);

  /* mullions: five bays, the middle one is the door */
  const bays = 5;
  const bw = w / bays;
  ctx.fillStyle = BUILD_LL;
  for (let i = 0; i <= bays; i++) {
    ctx.fillRect(x + i * bw - 7, y, 14, h);
  }
  /* door stiles + brass handles */
  const dx = x + 2 * bw;
  ctx.fillStyle = BUILD_LL;
  ctx.fillRect(dx + bw / 2 - 11, y + 24, 22, h - 24);
  ctx.fillStyle = "rgba(201,162,39,0.62)";
  rrect(ctx, dx + bw / 2 - 15, y + 212, 5, 54, 2.5);
  ctx.fill();
  rrect(ctx, dx + bw / 2 + 10, y + 212, 5, 54, 2.5);
  ctx.fill();
  /* threshold */
  ctx.fillStyle = BUILD_LL;
  ctx.fillRect(x - 10, GROUND - 10, w + 20, 14);

  /* base plinth */
  ctx.fillStyle = "#222e2c";
  ctx.fillRect(330, GROUND - 10, 1260, 14);

  /* step + light spilling onto the pavement */
  ctx.fillStyle = "#19211f";
  rrect(ctx, 790, GROUND + 4, 340, 20, 5);
  ctx.fill();
  const spill = ctx.createLinearGradient(0, GROUND, 0, GROUND + 170);
  spill.addColorStop(0, "rgba(255,206,140,0.30)");
  spill.addColorStop(1, "rgba(255,206,140,0)");
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.moveTo(x + 40, GROUND);
  ctx.lineTo(x + w - 40, GROUND);
  ctx.lineTo(x + w + 120, GROUND + 170);
  ctx.lineTo(x - 120, GROUND + 170);
  ctx.closePath();
  ctx.fill();

  /* planters of green either side of the door */
  for (const px of [472, 1448]) {
    ctx.fillStyle = "#2f3a37";
    rrect(ctx, px - 32, GROUND - 92, 64, 92, 8);
    ctx.fill();
    ctx.fillStyle = "#3b4744";
    ctx.fillRect(px - 32, GROUND - 92, 64, 7);
    ctx.fillStyle = "#2c6b43";
    circle(ctx, px, GROUND - 128, 42);
    ctx.fill();
    circle(ctx, px - 27, GROUND - 105, 26);
    ctx.fill();
    circle(ctx, px + 27, GROUND - 107, 24);
    ctx.fill();
    ctx.fillStyle = "#38854f";
    circle(ctx, px - 10, GROUND - 141, 20);
    ctx.fill();
    circle(ctx, px + 17, GROUND - 126, 15);
    ctx.fill();
  }
  ctx.restore();
}

/* ── The logo ────────────────────────────────────────────────── *
 * The same mark the site wears in its navbar: a jade disc with 康
 * on it, the name in Playfair beside or beneath it, a jade hairline
 * and the descriptor in Space Grotesk.                              */
function logoBadge(ctx, cx, cy, r, alpha, ringW) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, JADE_L);
  g.addColorStop(0.55, JADE);
  g.addColorStop(1, JADE_D);
  ctx.fillStyle = g;
  circle(ctx, cx, cy, r);
  ctx.fill();
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = ringW;
  circle(ctx, cx, cy, r + ringW * 0.5);
  ctx.stroke();
  /* a soft highlight across the top of the disc */
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.42, r * 0.72, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.font = `${Math.round(r * 1.12)}px KhangCn`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("康", cx, cy + r * 0.07);
  ctx.restore();
}

/** Horizontal lockup — the one that goes on the shopfront board. */
function logoLockupH(ctx, cx, cy, s, o) {
  const { badge = 0, name = 0, rule = 0, sub = 0 } = o;
  if (badge <= 0 && name <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  const R = 40;
  const GAP = 26;
  ctx.font = "54px KhangDisplay";
  const nameW = ctx.measureText("Khang").width;
  const total = R * 2 + GAP + nameW;
  const left = -total / 2;

  logoBadge(ctx, left + R, 0, R, badge, 3);

  const tx = left + R * 2 + GAP;
  if (name > 0) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = CREAM;
    ctx.font = "54px KhangDisplay";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(255,214,150,0.45)";
    ctx.shadowBlur = 18;
    /* resolves letter by letter */
    const chars = [..."Khang"];
    let x = tx;
    chars.forEach((c, i) => {
      ctx.globalAlpha = clamp01((name - (i / chars.length) * 0.5) / 0.5);
      ctx.fillText(c, x, -2);
      x += ctx.measureText(c).width;
    });
    ctx.restore();
  }
  if (rule > 0) {
    ctx.fillStyle = JADE_L;
    ctx.globalAlpha = rule;
    ctx.fillRect(tx, 10, nameW * rule, 2);
    ctx.globalAlpha = 1;
  }
  if (sub > 0) {
    ctx.save();
    ctx.globalAlpha = sub * 0.88;
    ctx.fillStyle = CREAM;
    ctx.font = "13px KhangMono";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const label = "CHINESE · DIMSUM";
    const lw = trackedWidth(ctx, label, 4.4);
    tracked(ctx, label, tx + lw / 2, 31, 4.4);
    ctx.restore();
  }
  ctx.restore();
}

/** Vertical lockup — the end card the film finishes on. */
function logoLockupV(ctx, cx, cy, s, o) {
  const { badge = 0, name = 0, rule = 0, sub = 0 } = o;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  logoBadge(ctx, 0, -96, 92, badge, 5);

  if (name > 0) {
    ctx.save();
    ctx.fillStyle = CREAM;
    ctx.font = "104px KhangDisplay";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(255,214,150,0.35)";
    ctx.shadowBlur = 30;
    ctx.globalAlpha = name;
    ctx.fillText("Khang", 0, lerp(66, 58, name));
    ctx.restore();
  }
  if (rule > 0) {
    ctx.fillStyle = JADE_L;
    ctx.globalAlpha = rule;
    const rw = 230 * rule;
    ctx.fillRect(-rw / 2, 92, rw, 2.5);
    ctx.globalAlpha = 1;
  }
  if (sub > 0) {
    ctx.save();
    ctx.globalAlpha = sub * 0.9;
    ctx.fillStyle = CREAM;
    ctx.font = "22px KhangMono";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    tracked(ctx, "CHINESE · DIMSUM", 0, 134, 9);
    ctx.restore();
  }
  ctx.restore();
}

/** The board above the doors, lighting up. */
function drawSign(ctx, t) {
  const on = seg(t, 6.6, 7.3);
  if (on <= 0) return;

  /* the board's lamps come up first */
  const g = ctx.createRadialGradient(960, 352, 10, 960, 352, 430);
  g.addColorStop(0, `rgba(255,214,150,${0.32 * on})`);
  g.addColorStop(1, "rgba(255,214,150,0)");
  ctx.fillStyle = g;
  ctx.fillRect(530, 212, 860, 300);

  logoLockupH(ctx, 960, 352, 1.3, {
    badge: seg(t, 6.8, 7.35),
    name: seg(t, 7.1, 7.75),
    rule: seg(t, 7.6, 7.95),
    sub: seg(t, 7.75, 8.1),
  });
}

/* ── Camera ──────────────────────────────────────────────────── *
 * Scale ~4.3 is a two-shot across the table; scale 1 frames the
 * whole shopfront. One continuous move, held at each end.           */
function camera(t) {
  const hold = seg(t, 0, 2.8, (u) => u); // linear drift while they talk
  const pull = seg(t, 2.8, 6.8, easeInOut);
  const settle = seg(t, 6.8, 10.0, (u) => u);
  // The opening framing is kept wholly inside the glazing, otherwise the
  // shopfront's plinth creeps into the bottom of what should read as a
  // shot taken from inside the room.
  let scale;
  let cy;
  if (pull >= 1) {
    // the faintest push toward the sign, so the last beat is not frozen
    scale = lerp(1.0, 1.035, settle);
    cy = lerp(540, 520, settle);
  } else if (pull > 0) {
    scale = expLerp(4.25, 1.0, pull);
    cy = lerp(749, 540, pull);
  } else {
    scale = expLerp(4.55, 4.25, hold);
    cy = lerp(757, 749, hold);
  }
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
  vg.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  /* grain */
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.globalCompositeOperation = "overlay";
  const g = GRAIN[frame % GRAIN.length];
  for (let y = 0; y < H; y += 256) {
    for (let x = 0; x < W; x += 256) ctx.drawImage(g, x, y);
  }
  ctx.restore();

  /* ── end card: the shopfront recedes and the logo steps forward ── */
  const veil = seg(t, 8.2, 9.0);
  if (veil > 0) {
    ctx.fillStyle = `rgba(6,10,12,${0.972 * veil})`;
    ctx.fillRect(0, 0, W, H);
    /* a breath of warm light behind the mark */
    const warm = ctx.createRadialGradient(W / 2, H * 0.46, 40, W / 2, H * 0.46, 620);
    warm.addColorStop(0, `rgba(255,206,140,${0.13 * veil})`);
    warm.addColorStop(1, "rgba(255,206,140,0)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);
  }
  const card = seg(t, 8.4, 9.2, easeOut);
  if (card > 0) {
    logoLockupV(ctx, W / 2, H * 0.47, lerp(0.94, 1, card), {
      badge: seg(t, 8.4, 8.95, easeOut),
      name: seg(t, 8.72, 9.3),
      rule: seg(t, 9.12, 9.45),
      sub: seg(t, 9.28, 9.62),
    });
  }

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
