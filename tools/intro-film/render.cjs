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
    skin: "#e7b188", skinSh: "#c68c62", skinHi: "#f4cda8",
    hair: "#2a1c15", hairHi: "#53392a",
    top: "#8d4553", topSh: "#602d39", topHi: "#a85c6b",
    leg: "#403a41", legSh: "#2a262c",
    shoe: "#231d1b", lip: "#b06a63",
  },
  m: {
    skin: "#d9a478", skinSh: "#b47f55", skinHi: "#eec29a",
    hair: "#1e1611", hairHi: "#3d2d22",
    top: "#324c5e", topSh: "#203442", topHi: "#44637a",
    leg: "#363b43", legSh: "#23272d",
    shoe: "#1c1816", lip: "#a8705f",
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
/** A limb that tapers from one joint to the next, with the joints
 *  rounded off and the form shaded across its width. A constant
 *  stroke reads as a tube; a second darker shape laid on top of it
 *  reads as a sausage with a stripe painted down it. The shading
 *  has to be a gradient across the limb or it is worse than none. */
function taper(ctx, x1, y1, x2, y2, w1, w2, fill, shade) {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  const cx = Math.cos(a);
  const cy = Math.sin(a);
  if (shade) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const r = Math.max(w1, w2) * 0.62;
    const g = ctx.createLinearGradient(mx - cx * r, my - cy * r, mx + cx * r, my + cy * r);
    g.addColorStop(0, fill);
    g.addColorStop(0.58, fill);
    g.addColorStop(1, shade);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = fill;
  }
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
function headPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-4, -46);
  ctx.quadraticCurveTo(16, -45, 27, -30);
  ctx.quadraticCurveTo(33, -20, 32, -11);
  ctx.quadraticCurveTo(29, -7, 30, -3);
  ctx.lineTo(43, 8);
  ctx.quadraticCurveTo(44, 11.5, 38, 12);
  ctx.quadraticCurveTo(32, 12, 31, 14);
  ctx.quadraticCurveTo(35.5, 16, 33, 18);
  ctx.quadraticCurveTo(31, 20, 34, 22);
  ctx.quadraticCurveTo(30, 25, 31, 29);
  ctx.quadraticCurveTo(30, 35, 20, 37);
  ctx.quadraticCurveTo(2, 40, -16, 30);
  ctx.quadraticCurveTo(-32, 20, -37, 0);
  ctx.quadraticCurveTo(-40, -24, -24, -40);
  ctx.quadraticCurveTo(-16, -47, -4, -46);
  ctx.closePath();
}

/** Hair as a shell sitting proud of the skull, not paint on top of
 *  it. A hairline that follows the scalp exactly reads as a bald
 *  head that has been coloured in. */
function hairPath(ctx, bun) {
  ctx.beginPath();
  ctx.moveTo(31, -24);
  if (bun) {
    ctx.quadraticCurveTo(22, -46, -2, -50);
    ctx.quadraticCurveTo(-28, -48, -39, -24);
    ctx.quadraticCurveTo(-45, -4, -36, 12);
    ctx.quadraticCurveTo(-29, 16, -25, 8);
  } else {
    ctx.quadraticCurveTo(24, -48, 0, -53);
    ctx.quadraticCurveTo(-31, -51, -43, -22);
    ctx.quadraticCurveTo(-47, -2, -38, 16);
    ctx.quadraticCurveTo(-29, 20, -25, 10);
  }
  ctx.quadraticCurveTo(-33, -6, -30, -22);
  ctx.quadraticCurveTo(-22, -38, -2, -40);
  ctx.quadraticCurveTo(18, -38, 25, -22);
  ctx.closePath();
}

function drawHand(ctx, x, y, a, pal) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-3, -8, 6.5, 4.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.skinSh;
  ctx.globalAlpha *= 0.5;
  ctx.beginPath();
  ctx.ellipse(1, 4.5, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

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

  const SHO = { x: 12, y: -342 + breath };
  const HEADC = { x: 14, y: -412 + breath + nod };

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

  /* ── far leg and far arm, knocked back so the near side reads
        in front of them ──────────────────────────────────── */
  ctx.save();
  ctx.globalAlpha *= 0.72;
  taper(ctx, -16, -170, 62, -166, 46, 38, pal.legSh);
  taper(ctx, 62, -166, 56, -34, 36, 25, pal.legSh);
  ctx.fillStyle = "#1a1614";
  rrect(ctx, 32, -40, 60, 24, 10);
  ctx.fill();
  ctx.restore();

  /* ── torso ─────────────────────────────────────────────── */
  const tg = ctx.createLinearGradient(-50, 0, 52, 0);
  tg.addColorStop(0, pal.topSh);
  tg.addColorStop(0.45, pal.top);
  tg.addColorStop(1, pal.topHi);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-46, -168);
  ctx.quadraticCurveTo(-54, -248, -44, -314);
  ctx.quadraticCurveTo(-37, -340, -8, -348);
  ctx.quadraticCurveTo(14, -352, 26, -342);
  ctx.quadraticCurveTo(44, -330, 48, -294);
  ctx.quadraticCurveTo(54, -238, 50, -168);
  ctx.closePath();
  ctx.fill();
  /* the fold where the body bends at the hip */
  ctx.save();
  ctx.globalAlpha *= 0.3;
  ctx.fillStyle = pal.topSh;
  ctx.beginPath();
  ctx.moveTo(-44, -196);
  ctx.quadraticCurveTo(4, -182, 50, -196);
  ctx.lineTo(50, -168);
  ctx.lineTo(-46, -168);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* ── near leg ──────────────────────────────────────────── */
  taper(ctx, -6, -172, 80, -168, 48, 39, pal.leg, pal.legSh);
  taper(ctx, 80, -168, 72, -30, 37, 26, pal.leg, pal.legSh);
  ctx.fillStyle = pal.shoe;
  ctx.beginPath();
  ctx.moveTo(56, -40);
  ctx.quadraticCurveTo(54, -16, 62, -8);
  ctx.quadraticCurveTo(76, -2, 104, -6);
  ctx.quadraticCurveTo(116, -9, 112, -20);
  ctx.quadraticCurveTo(100, -32, 88, -40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(58, -36);
  ctx.quadraticCurveTo(80, -34, 96, -28);
  ctx.lineTo(94, -24);
  ctx.quadraticCurveTo(78, -30, 57, -31);
  ctx.closePath();
  ctx.fill();

  /* ── the resting arm, onto the table ───────────────────── */
  taper(ctx, SHO.x - 16, SHO.y + 14, 84, -254, 32, 25, pal.top, pal.topSh);
  taper(ctx, 84, -254, 128, -250, 24, 19, pal.top, pal.topSh);
  drawHand(ctx, 142, -248, 0.1, pal);

  /* ── neck ──────────────────────────────────────────────── */
  ctx.fillStyle = pal.skinSh;
  ctx.beginPath();
  ctx.moveTo(HEADC.x - 20, HEADC.y + 22);
  ctx.lineTo(HEADC.x + 12, HEADC.y + 26);
  ctx.lineTo(SHO.x + 20, SHO.y - 4);
  ctx.lineTo(SHO.x - 18, SHO.y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.moveTo(HEADC.x - 4, HEADC.y + 24);
  ctx.lineTo(HEADC.x + 12, HEADC.y + 26);
  ctx.lineTo(SHO.x + 20, SHO.y - 4);
  ctx.lineTo(SHO.x + 2, SHO.y - 4);
  ctx.closePath();
  ctx.fill();

  /* collar */
  ctx.fillStyle = pal.topSh;
  ctx.beginPath();
  ctx.moveTo(SHO.x - 24, SHO.y - 10);
  ctx.quadraticCurveTo(SHO.x + 2, SHO.y + 12, SHO.x + 28, SHO.y - 12);
  ctx.quadraticCurveTo(SHO.x + 4, SHO.y + 2, SHO.x - 24, SHO.y - 10);
  ctx.closePath();
  ctx.fill();

  /* ── head ──────────────────────────────────────────────── */
  ctx.save();
  ctx.translate(HEADC.x, HEADC.y);
  ctx.rotate(tilt);

  /* hair behind the skull */
  ctx.fillStyle = pal.hair;
  hairPath(ctx, bun);
  ctx.fill();
  if (bun) {
    circle(ctx, -46, -14, 17);
    ctx.fill();
    ctx.fillStyle = pal.hairHi;
    ctx.save();
    ctx.globalAlpha *= 0.5;
    circle(ctx, -50, -19, 9);
    ctx.fill();
    ctx.restore();
  }

  /* skin */
  ctx.fillStyle = pal.skin;
  headPath(ctx);
  ctx.fill();
  /* form: lit from the front and above, shadow down the back */
  ctx.save();
  headPath(ctx);
  ctx.clip();
  const hg = ctx.createLinearGradient(-38, -20, 40, 20);
  hg.addColorStop(0, pal.skinSh);
  hg.addColorStop(0.45, pal.skin);
  hg.addColorStop(1, pal.skinHi);
  ctx.fillStyle = hg;
  ctx.fillRect(-48, -56, 100, 100);
  /* under the cheekbone, and under the jaw */
  const cg = ctx.createRadialGradient(2, 20, 2, 2, 20, 32);
  cg.addColorStop(0, "rgba(96,58,34,0.16)");
  cg.addColorStop(1, "rgba(96,58,34,0)");
  ctx.fillStyle = cg;
  ctx.fillRect(-44, -12, 96, 56);
  ctx.restore();

  /* brow, eye, lips, nostril, ear */
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.moveTo(12, -19);
  ctx.quadraticCurveTo(22, -23, 30, -17);
  ctx.quadraticCurveTo(22, -19, 12, -15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f6efe6";
  ctx.beginPath();
  ctx.moveTo(14, -7);
  ctx.quadraticCurveTo(21, -12, 27, -6);
  ctx.quadraticCurveTo(20, -3, 14, -7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2b1d16";
  circle(ctx, 23, -7, 3.4);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.moveTo(14, -7);
  ctx.quadraticCurveTo(21, -12.5, 27.5, -6.5);
  ctx.lineTo(26, -5.6);
  ctx.quadraticCurveTo(20.5, -10.5, 14.6, -6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(60,36,24,0.55)";
  ctx.beginPath();
  ctx.ellipse(36.5, 10, 2.4, 1.5, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pal.lip;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(33, 17.5);
  ctx.quadraticCurveTo(29, 19.5, 26, 19);
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha *= 0.32;
  ctx.fillStyle = pal.skinSh;
  ctx.beginPath();
  ctx.ellipse(-22, 2, 5.4, 8.2, 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* hair in front of the skull: the fringe over the forehead */
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  if (bun) {
    ctx.moveTo(31, -24);
    ctx.quadraticCurveTo(24, -40, 2, -43);
    ctx.quadraticCurveTo(-18, -43, -28, -30);
    ctx.quadraticCurveTo(-24, -42, -2, -47);
    ctx.quadraticCurveTo(22, -46, 33, -27);
  } else {
    ctx.moveTo(33, -19);
    ctx.quadraticCurveTo(27, -33, 4, -36);
    ctx.quadraticCurveTo(-16, -37, -29, -27);
    ctx.quadraticCurveTo(-27, -46, -2, -51);
    ctx.quadraticCurveTo(25, -50, 35, -24);
  }
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalAlpha *= 0.42;
  ctx.fillStyle = pal.hairHi;
  ctx.beginPath();
  ctx.moveTo(14, -41);
  ctx.quadraticCurveTo(-6, -44, -22, -34);
  ctx.quadraticCurveTo(-6, -40, 13, -37);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();

  /* ── the acting arm ────────────────────────────────────── */
  const u = easeInOut(clamp01(lift));
  const g = clamp01(gesture);
  const REST = { ex: 82, ey: -262, hx: 138, hy: -244 };
  const MOUTH = cup
    ? { ex: 96, ey: -296, hx: HEADC.x + 66, hy: HEADC.y + 50 }
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
  taper(ctx, SHO.x - 10, SHO.y + 10, ex, ey, 34, 26, pal.topHi, pal.topSh);
  taper(ctx, ex, ey, hx, hy, 25, 20, pal.topHi, pal.topSh);
  drawHand(ctx, hx, hy, Math.atan2(hy - ey, hx - ex) + 1.4, pal);

  if (cup) {
    const ang = lerp(-1.62, -2.48, u);
    const reach = lerp(2, 14, u);
    ctx.save();
    ctx.translate(hx + reach * Math.cos(ang), hy + reach * Math.sin(ang));
    ctx.rotate(ang);
    const cg = ctx.createLinearGradient(-8, 0, 34, 0);
    cg.addColorStop(0, "#c3ccbd");
    cg.addColorStop(0.5, CELADON);
    cg.addColorStop(1, "#eef2ea");
    ctx.fillStyle = cg;
    rrect(ctx, -6, -14, 38, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#b9c3b2";
    rrect(ctx, 26, -14, 6, 28, 3);
    ctx.fill();
    ctx.restore();
  }

  if (sticks) {
    const ang = lerp(-2.95, -2.51, u);
    const reach = lerp(52, 32, u);
    const tail = 24;
    const ox = -Math.sin(ang) * 6;
    const oy = Math.cos(ang) * 6;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (const k of [-1, 1]) {
      ctx.strokeStyle = k < 0 ? "#a97c48" : "#c2935a";
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx - tail * ca + ox * k, hy - tail * sa + oy * k);
      ctx.lineTo(hx + reach * ca + ox * k, hy + reach * sa + oy * k);
      ctx.stroke();
    }
    if (holding > 0.01) {
      const tx = hx + reach * ca;
      const ty = hy + reach * sa;
      const dg = ctx.createRadialGradient(tx - 4, ty - 5, 1, tx, ty, 15 * holding);
      dg.addColorStop(0, "#fffaf0");
      dg.addColorStop(1, "#e4d7bf");
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 14 * holding, 12 * holding, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

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
