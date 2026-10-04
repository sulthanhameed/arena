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
 * It finishes on the brand lockup lit on the signboard.
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
 * Warm lamplit room against a cool night street, with the brand's
 * greens carried through the screens, the planting and the sign.   */

/* interior surfaces */
const WALL = "#f4e6c9"; // warm plaster, lit
const WALL_D = "#e7d3ab"; // plaster in shade
const WALL_DD = "#d6bc8c";
const PAPER = "#f6e7c4"; // lantern / screen paper
const FLOOR = "#6d4527"; // timber floor
const FLOOR_D = "#54331b";
const FLOOR_L = "#8a5a33";

/* timber */
const WOOD = "#8a5531";
const WOOD_D = "#5d3719";
const WOOD_L = "#aa7040";

/* brand greens */
const GREEN = "#15803d";
const GREEN_D = "#064e2e";
const GREEN_DD = "#06361f";
const JADE = "#16a34a";
const JADE_L = "#4cbb7a";

/* lamplight */
const GLOW = "#ffd98a";
const GLOW_D = "#efa93c";
const LAMP = "#fff3d4";

/* accents */
const RED = "#b4392b"; // lacquer red
const RED_D = "#8c2a1e";
const GOLD = "#e3b668";
const CREAM = "#faf4e8";
const CELADON = "#dfe7d8";

/* people */
const SKIN = "#eab489";
const SKIN_D = "#d4946b";
const SKIN_DD = "#b4714a";
const MOUTH = "#73302c";
const TONGUE = "#bf5f58";
const HAIR = "#2a1c14";
const HAIR_L = "#4b3123";
const NAVY = "#2e4257";
const NAVY_D = "#22323f";

/* night exterior */
const NIGHT_T = "#060a11";
const NIGHT_B = "#1a2533";
const BUILD = "#15301f"; // deep green shopfront
const BUILD_L = "#1d4229";
const BUILD_LL = "#2a5637";
const STREET = "#101720";
const INK = "#1d2429";

/* ── Geometry ────────────────────────────────────────────────── */
// Shopfront glazing: the window the interior is seen through.
const GLASS = { x: 430, y: 430, w: 1060, h: 450 };
const GROUND = 880;
// The signboard above the doors, and the lockup that lights on it.
const BOARD = { x: 580, y: 282, w: 760, h: 142 };
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
 * Seated profile characters, drawn facing right and mirrored by
 * `dir`, so the whole head — features and all — flips as one.
 *
 * The head is rigged rather than redrawn: the skull and the jaw are
 * separate pieces hinged near the ear, with the dark of the mouth
 * behind them. Dropping the jaw a quarter of a radian is what reads,
 * unmistakably, as talking and as chewing.                          */
function drawHead(ctx, o) {
  const { R, mouth, blink, hair, skin, skinD, hairColour } = o;

  /* The head is ONE silhouette. The jaw is not a second shape laid
     over the first — its control points are simply rotated about the
     hinge before the outline is built, so there is no seam and no
     tonal step to give the rig away. The open mouth is then cut back
     into the face as a wedge between the two lip lines. */
  const a = mouth * 0.3;
  const HX = -0.55 * R;
  const HY = 0.2 * R;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  /** a point on the moving jaw */
  const P = (x, y) => {
    const dx = x * R - HX;
    const dy = y * R - HY;
    return [HX + dx * ca - dy * sa, HY + dx * sa + dy * ca];
  };
  /** a point on the fixed skull */
  const S = (x, y) => [x * R, y * R];

  /* hair behind the head */
  if (hair === "bun") {
    ctx.fillStyle = hairColour;
    circle(ctx, -1.0 * R, -0.34 * R, 0.31 * R);
    ctx.fill();
    ctx.fillStyle = HAIR_L;
    circle(ctx, -1.07 * R, -0.42 * R, 0.12 * R);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.05 * R;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-1.34 * R, -0.24 * R);
    ctx.lineTo(-0.7 * R, -0.48 * R);
    ctx.stroke();
  }

  /* ── the whole head, in one path ── */
  ctx.beginPath();
  ctx.moveTo(HX, HY);
  ctx.quadraticCurveTo(...S(-1.02, -0.16), ...S(-0.9, -0.5)); // back of skull
  ctx.quadraticCurveTo(...S(-0.66, -1.0), ...S(0.06, -1.04)); // crown
  ctx.quadraticCurveTo(...S(0.74, -0.99), ...S(0.86, -0.52)); // brow ridge
  ctx.quadraticCurveTo(...S(0.79, -0.38), ...S(0.83, -0.26)); // temple
  ctx.quadraticCurveTo(...S(0.95, -0.15), ...S(1.02, -0.04)); // nose bridge
  ctx.quadraticCurveTo(...S(1.1, 0.12), ...S(0.84, 0.14)); // nose tip
  ctx.quadraticCurveTo(...S(0.75, 0.17), ...S(0.79, 0.23)); // philtrum
  ctx.quadraticCurveTo(...S(0.84, 0.3), ...S(0.72, 0.34)); // upper lip
  ctx.lineTo(...P(0.72, 0.34)); // the mouth opens here
  ctx.quadraticCurveTo(...P(0.82, 0.42), ...P(0.76, 0.5)); // lower lip
  ctx.quadraticCurveTo(...P(0.71, 0.56), ...P(0.73, 0.63)); // chin
  ctx.quadraticCurveTo(...P(0.58, 0.79), ...P(0.28, 0.81));
  ctx.quadraticCurveTo(...P(-0.16, 0.8), ...P(-0.48, 0.49)); // jawline
  ctx.quadraticCurveTo(...P(-0.59, 0.35), HX, HY);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();

  /* shading down the far side — applied to the head as a whole */
  ctx.save();
  ctx.clip();
  const sh = ctx.createLinearGradient(-R, 0, 0.45 * R, 0);
  sh.addColorStop(0, skinD);
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(-1.3 * R, -1.3 * R, 2.6 * R, 2.6 * R);
  /* and a little warmth on the cheek */
  const bl = ctx.createRadialGradient(0.44 * R, 0.08 * R, 1, 0.44 * R, 0.08 * R, 0.36 * R);
  bl.addColorStop(0, "rgba(201,106,76,0.24)");
  bl.addColorStop(1, "rgba(201,106,76,0)");
  ctx.fillStyle = bl;
  ctx.fillRect(-1.3 * R, -1.3 * R, 2.6 * R, 2.6 * R);
  ctx.restore();

  /* ── the mouth, cut between the two lip lines ── */
  const corner = [0.32, 0.296]; // on the hinge→lip line
  const lipTop = [0.72, 0.34];
  if (mouth > 0.015) {
    ctx.beginPath();
    ctx.moveTo(...S(...corner));
    ctx.lineTo(...S(...lipTop));
    ctx.lineTo(...P(...lipTop));
    ctx.lineTo(...P(...corner));
    ctx.closePath();
    ctx.fillStyle = MOUTH;
    ctx.fill();
    if (mouth > 0.34) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = TONGUE;
      const [tx, ty] = P(0.44, 0.3);
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.26 * R, 0.1 * R, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  /* lips */
  ctx.strokeStyle = SKIN_DD;
  ctx.lineWidth = 0.04 * R;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(...S(...corner));
  ctx.lineTo(...S(...lipTop));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(...P(...corner));
  ctx.lineTo(...P(...lipTop));
  ctx.quadraticCurveTo(...P(0.82, 0.42), ...P(0.75, 0.49));
  ctx.stroke();

  /* ear */
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(-0.24 * R, 0.0 * R, 0.13 * R, 0.18 * R, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SKIN_DD;
  ctx.lineWidth = 0.033 * R;
  ctx.beginPath();
  ctx.arc(-0.24 * R, 0.0 * R, 0.065 * R, -1.2, 1.8);
  ctx.stroke();

  /* eye */
  if (blink > 0.5) {
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 0.05 * R;
    ctx.beginPath();
    ctx.moveTo(0.42 * R, -0.12 * R);
    ctx.quadraticCurveTo(0.57 * R, -0.06 * R, 0.69 * R, -0.12 * R);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#fdfaf3";
    ctx.beginPath();
    ctx.moveTo(0.42 * R, -0.11 * R);
    ctx.quadraticCurveTo(0.56 * R, -0.23 * R, 0.69 * R, -0.11 * R);
    ctx.quadraticCurveTo(0.56 * R, -0.03 * R, 0.42 * R, -0.11 * R);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = HAIR;
    circle(ctx, 0.605 * R, -0.115 * R, 0.075 * R);
    ctx.fill();
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 0.042 * R;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0.41 * R, -0.12 * R);
    ctx.quadraticCurveTo(0.56 * R, -0.24 * R, 0.7 * R, -0.1 * R);
    ctx.stroke();
  }

  /* brow */
  ctx.strokeStyle = hairColour;
  ctx.lineWidth = 0.075 * R;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0.38 * R, -0.32 * R);
  ctx.quadraticCurveTo(0.57 * R, -0.39 * R, 0.75 * R, -0.3 * R);
  ctx.stroke();

  /* ── hair over the skull: a real hairline, not a cap edge ── */
  ctx.fillStyle = hairColour;
  ctx.beginPath();
  if (hair === "bun") {
    ctx.moveTo(0.8 * R, -0.46 * R);
    ctx.quadraticCurveTo(0.58 * R, -0.76 * R, 0.1 * R, -0.82 * R);
    ctx.quadraticCurveTo(-0.44 * R, -0.82 * R, -0.72 * R, -0.44 * R);
    ctx.quadraticCurveTo(-0.88 * R, -0.18 * R, -0.8 * R, 0.04 * R);
    ctx.lineTo(-0.98 * R, 0.08 * R);
    ctx.quadraticCurveTo(-1.14 * R, -0.2 * R, -0.98 * R, -0.58 * R);
    ctx.quadraticCurveTo(-0.72 * R, -1.12 * R, 0.06 * R, -1.14 * R);
    ctx.quadraticCurveTo(0.8 * R, -1.08 * R, 0.92 * R, -0.5 * R);
  } else {
    ctx.moveTo(0.86 * R, -0.44 * R);
    ctx.quadraticCurveTo(0.66 * R, -0.62 * R, 0.3 * R, -0.68 * R);
    ctx.quadraticCurveTo(-0.24 * R, -0.73 * R, -0.56 * R, -0.5 * R);
    ctx.quadraticCurveTo(-0.8 * R, -0.3 * R, -0.78 * R, 0.0 * R);
    ctx.lineTo(-0.98 * R, 0.06 * R);
    ctx.quadraticCurveTo(-1.14 * R, -0.22 * R, -0.98 * R, -0.58 * R);
    ctx.quadraticCurveTo(-0.72 * R, -1.12 * R, 0.06 * R, -1.14 * R);
    ctx.quadraticCurveTo(0.82 * R, -1.08 * R, 0.94 * R, -0.5 * R);
  }
  ctx.closePath();
  ctx.fill();

  /* a lit edge along the top of the hair */
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.055 * R;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-0.56 * R, -0.94 * R);
  ctx.quadraticCurveTo(0.12 * R, -1.18 * R, 0.68 * R, -0.86 * R);
  ctx.stroke();
}

function drawFigure(ctx, o) {
  const {
    dir, // +1 faces right, -1 faces left
    mouth = 0, // 0 shut … 1 wide
    lift = 0, // 0 hand on table … 1 hand at mouth
    headTilt = 0, // radians
    lean = 0, // forward lean, units
    breath = 0,
    blink = 0,
    hair = "bun",
    holding = 0, // dumpling scale at the chopstick tip
    cloth = RED,
    clothD = RED_D,
    trim = GOLD,
    skin = SKIN,
    skinD = SKIN_D,
  } = o;

  ctx.save();
  ctx.scale(dir, 1); // everything below is drawn facing right

  const HIP = { x: 0, y: -150 };
  const SHO = { x: 14 + lean, y: -358 + breath };
  const HEAD = { x: 26 + lean * 1.4, y: -428 + breath };
  const R = 56;

  /* chair: a plain hardwood side chair, seen from the side */
  ctx.fillStyle = WOOD_D;
  rrect(ctx, -112, -150, 12, 142, 4);
  ctx.fill();
  rrect(ctx, 16, -150, 12, 142, 4);
  ctx.fill();
  rrect(ctx, -108, -70, 132, 8, 3);
  ctx.fill();
  rrect(ctx, -116, -322, 14, 176, 5);
  ctx.fill();
  rrect(ctx, -130, -322, 44, 14, 5);
  ctx.fill();
  ctx.fillStyle = WOOD;
  rrect(ctx, -120, -162, 152, 15, 4);
  ctx.fill();
  ctx.fillStyle = WOOD_L;
  ctx.fillRect(-120, -162, 152, 3);

  /* legs */
  limb(ctx, HIP.x, HIP.y, 74, -128, 31, clothD);
  limb(ctx, 74, -128, 62, -8, 28, clothD);
  /* shoe */
  ctx.fillStyle = INK;
  rrect(ctx, 46, -18, 52, 18, 7);
  ctx.fill();

  /* far arm, behind the torso: over it, the upper arm would read as
     a strap across the chest rather than a limb */
  limb(ctx, SHO.x - 6, SHO.y + 16, 66, -244, 21, clothD);
  limb(ctx, 66, -244, 120, -234, 19, clothD);
  ctx.fillStyle = skinD;
  circle(ctx, 130, -232, 11);
  ctx.fill();

  /* torso */
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(HIP.x - 52, HIP.y + 18);
  ctx.quadraticCurveTo(SHO.x - 60, lerp(HIP.y, SHO.y, 0.5), SHO.x - 52, SHO.y + 6);
  ctx.quadraticCurveTo(SHO.x - 4, SHO.y - 30, SHO.x + 48, SHO.y + 8);
  ctx.quadraticCurveTo(HIP.x + 58, lerp(HIP.y, SHO.y, 0.45), HIP.x + 50, HIP.y + 18);
  ctx.closePath();
  ctx.fill();
  /* shading down the back */
  ctx.save();
  ctx.clip();
  const tsh = ctx.createLinearGradient(-60, 0, 20, 0);
  tsh.addColorStop(0, clothD);
  tsh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tsh;
  ctx.fillRect(-80, -400, 160, 300);
  ctx.restore();

  /* the diagonal placket of a mandarin jacket */
  ctx.strokeStyle = trim;
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(SHO.x + 22, SHO.y + 16);
  ctx.quadraticCurveTo(SHO.x + 36, SHO.y + 70, SHO.x + 30, SHO.y + 120);
  ctx.stroke();

  /* neck */
  limb(ctx, SHO.x, SHO.y + 4, HEAD.x - 6, HEAD.y + R * 0.52, 36, skin);
  limb(ctx, SHO.x - 11, SHO.y + 4, HEAD.x - 17, HEAD.y + R * 0.52, 15, skinD);
  /* the jaw's shadow, which is what keeps the neck from floating */
  ctx.save();
  ctx.globalAlpha = 0.5;
  limb(ctx, HEAD.x - 20, HEAD.y + R * 0.56, HEAD.x + 16, HEAD.y + R * 0.6, 15, skinD);
  ctx.restore();

  /* mandarin collar */
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(SHO.x - 18, SHO.y + 16);
  ctx.quadraticCurveTo(SHO.x - 2, SHO.y + 1, SHO.x + 21, SHO.y + 12);
  ctx.quadraticCurveTo(SHO.x + 11, SHO.y + 26, SHO.x - 2, SHO.y + 27);
  ctx.closePath();
  ctx.fill();

  /* head, about its own centre so it can tilt */
  ctx.save();
  ctx.translate(HEAD.x, HEAD.y);
  ctx.rotate(headTilt);
  drawHead(ctx, { R, mouth, blink, hair, skin, skinD, hairColour: HAIR });
  ctx.restore();

  /* near arm: swings from the table up to the mouth */
  const u = easeInOut(clamp01(lift));
  const elbow = { x: lerp(62, 72, u), y: lerp(-258, -300, u) + breath * 0.5 };
  const hand = { x: lerp(132, HEAD.x - 21, u), y: lerp(-226, HEAD.y + 36, u) };
  limb(ctx, SHO.x, SHO.y + 10, elbow.x, elbow.y, 24, cloth);
  limb(ctx, elbow.x, elbow.y, hand.x - 10, hand.y + 4, 21, cloth);
  /* cuff + hand */
  ctx.strokeStyle = trim;
  ctx.lineWidth = 21;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(hand.x - 26, hand.y + 10);
  ctx.lineTo(hand.x - 18, hand.y + 7);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(hand.x - 4, hand.y + 2, 14, 11, -0.3, 0, Math.PI * 2);
  ctx.fill();

  /* chopsticks, angled toward whatever the hand is doing */
  const ang = lerp(-0.95, -0.35, u);
  const len = 60;
  ctx.strokeStyle = WOOD_L;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (const off of [-5, 5]) {
    ctx.beginPath();
    ctx.moveTo(hand.x - 8, hand.y + off);
    ctx.lineTo(hand.x + len * Math.cos(ang), hand.y + len * Math.sin(ang) + off);
    ctx.stroke();
  }
  if (holding > 0.02) {
    const dx = hand.x + (len + 5) * Math.cos(ang);
    const dy = hand.y + (len + 5) * Math.sin(ang);
    const r = 13 * holding;
    ctx.fillStyle = "#f6e6c8";
    ctx.beginPath();
    ctx.ellipse(dx, dy, r, r * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#dcc49b";
    ctx.lineWidth = 1.8;
    for (const a of [-0.6, 0, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(dx + Math.sin(a) * r * 0.75, dy - r * 0.8);
      ctx.lineTo(dx + Math.sin(a) * r * 0.3, dy + r * 0.5);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ── Table setting ───────────────────────────────────────────── */
function drawTable(ctx, t) {
  const TOP = -222;

  /* table */
  ctx.fillStyle = WOOD;
  rrect(ctx, -196, TOP, 392, 22, 7);
  ctx.fill();
  ctx.fillStyle = WOOD_L;
  ctx.fillRect(-196, TOP, 392, 5);
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-196, TOP + 17, 392, 5);
  limb(ctx, -150, TOP + 22, -142, -6, 14, WOOD_D);
  limb(ctx, 150, TOP + 22, 142, -6, 14, WOOD_D);

  /* bamboo steamers, stacked */
  for (const [i, y] of [[0, TOP - 30], [1, TOP - 56]]) {
    ctx.fillStyle = i ? "#d2a763" : "#c59a56";
    rrect(ctx, -34 + i * 4, y, 118 - i * 8, 30 - i * 2, 6);
    ctx.fill();
    ctx.strokeStyle = "#a87f3e";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-28 + i * 4, y + 14);
    ctx.lineTo(80 - i * 4, y + 14);
    ctx.stroke();
  }
  /* the lid, with its little knot */
  ctx.fillStyle = "#dcb470";
  rrect(ctx, -32, TOP - 64, 114, 12, 5);
  ctx.fill();
  ctx.fillStyle = "#a87f3e";
  circle(ctx, 25, TOP - 66, 6);
  ctx.fill();

  /* a plate of dumplings in front */
  ctx.fillStyle = CELADON;
  ctx.beginPath();
  ctx.ellipse(-16, TOP - 4, 46, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dr] of [[-34, 11], [-16, 12], [2, 11]]) {
    ctx.fillStyle = "#f6e6c8";
    ctx.beginPath();
    ctx.ellipse(dx, TOP - 11, dr, dr * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#dcc49b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(dx, TOP - 20);
    ctx.lineTo(dx, TOP - 6);
    ctx.stroke();
  }

  /* red clay teapot */
  ctx.fillStyle = RED_D;
  circle(ctx, -118, TOP - 26, 28);
  ctx.fill();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(-118, TOP - 26, 28, Math.PI * 1.15, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = RED_D;
  rrect(ctx, -127, TOP - 62, 19, 11, 4);
  ctx.fill();
  ctx.fillStyle = GOLD;
  circle(ctx, -117.5, TOP - 64, 4.5);
  ctx.fill();
  ctx.strokeStyle = RED_D;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-143, TOP - 34);
  ctx.quadraticCurveTo(-170, TOP - 30, -166, TOP - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-96, TOP - 38);
  ctx.quadraticCurveTo(-73, TOP - 32, -94, TOP - 14);
  ctx.stroke();

  /* celadon cups + a dish of chilli oil */
  for (const cx of [118, -64]) {
    ctx.fillStyle = CELADON;
    rrect(ctx, cx - 15, TOP - 17, 30, 17, 5);
    ctx.fill();
    ctx.fillStyle = "#c3d0bd";
    ctx.fillRect(cx - 15, TOP - 4, 30, 4);
  }
  ctx.fillStyle = CELADON;
  ctx.beginPath();
  ctx.ellipse(68, TOP - 4, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.ellipse(68, TOP - 5, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  /* steam, curling off the steamers */
  ctx.strokeStyle = "rgba(255,246,228,0.85)";
  ctx.lineWidth = 3.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const ph = t * 0.85 + i * 0.47;
    const rise = ph % 1;
    const x0 = 2 + i * 32;
    const y0 = TOP - 66;
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
  ctx.lineTo(0, cy - r);
  ctx.stroke();

  /* halo */
  const halo = ctx.createRadialGradient(0, cy, r * 0.5, 0, cy, r * 3.4);
  halo.addColorStop(0, "rgba(255,210,130,0.40)");
  halo.addColorStop(1, "rgba(255,210,130,0)");
  ctx.fillStyle = halo;
  circle(ctx, 0, cy, r * 3.4);
  ctx.fill();

  /* silk body */
  const body = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  body.addColorStop(0, LAMP);
  body.addColorStop(0.5, GLOW);
  body.addColorStop(1, GLOW_D);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, cy, r, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();

  /* ribs */
  ctx.strokeStyle = "rgba(180,110,30,0.35)";
  ctx.lineWidth = 2;
  for (const f of [-0.62, -0.3, 0.3, 0.62]) {
    ctx.beginPath();
    ctx.ellipse(0, cy, Math.abs(r * f), r * 0.86, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* caps + tassel */
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
  ctx.lineTo(Math.sin(t * 1.3 + i) * 5, cy + r * 1.5);
  ctx.stroke();
  ctx.restore();
}

function latticePanel(ctx, x, y, w, h) {
  /* warm paper behind a jade lattice */
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, PAPER);
  g.addColorStop(1, "#e8d3a6");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = GREEN_D;
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
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 4.5;
  for (let gx = x + step / 2; gx <= x + w; gx += step) {
    for (let gy = y + step / 2; gy <= y + h; gy += step) {
      ctx.beginPath();
      ctx.moveTo(gx, gy - 26);
      ctx.lineTo(gx + 26, gy);
      ctx.lineTo(gx, gy + 26);
      ctx.lineTo(gx - 26, gy);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  /* frame */
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 12;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = WOOD_L;
  ctx.lineWidth = 2.5;
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
  limb(ctx, -112, TOP + 17, -106, -6, 11, WOOD_D);
  limb(ctx, 112, TOP + 17, 106, -6, 11, WOOD_D);
  ctx.fillStyle = "#c59a56";
  rrect(ctx, -40, TOP - 26, 80, 26, 5);
  ctx.fill();

  const bob = Math.sin(t * 1.1 + i) * 3;
  const kit = [
    { cloth: "#3f5a6b", clothD: "#2d4150" },
    { cloth: "#7a4a63", clothD: "#5c3449" },
  ];
  for (const [n, d] of [[0, -1], [1, 1]]) {
    const c = kit[(n + i) % 2];
    ctx.save();
    ctx.translate(d * 250, 0);
    ctx.scale(d, 1);
    /* chair */
    ctx.strokeStyle = WOOD_D;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-86, -12);
    ctx.lineTo(-92, -268);
    ctx.stroke();
    /* legs */
    limb(ctx, -40, -140, 60, -120, 26, c.clothD);
    limb(ctx, 60, -120, 52, -8, 23, c.clothD);
    /* torso */
    ctx.fillStyle = c.cloth;
    ctx.beginPath();
    ctx.moveTo(-70, -126);
    ctx.quadraticCurveTo(-56, -300, -18, -318 + bob);
    ctx.quadraticCurveTo(24, -300, 30, -126);
    ctx.closePath();
    ctx.fill();
    /* arm to the table */
    limb(ctx, -8, -300, 84, -228, 18, c.cloth);
    /* head */
    ctx.fillStyle = SKIN;
    circle(ctx, 24, -392 + bob, 44);
    ctx.fill();
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.ellipse(16, -404 + bob, 45, 40, 0, Math.PI * 0.95, Math.PI * 2.1);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawInterior(ctx, t) {
  /* wall */
  ctx.fillStyle = WALL;
  ctx.fillRect(-1600, -1240, 3200, 1240);
  /* warmth pooling under the central lantern */
  const pool = ctx.createRadialGradient(0, -700, 60, 0, -620, 1150);
  pool.addColorStop(0, "rgba(255,214,140,0.45)");
  pool.addColorStop(1, "rgba(255,214,140,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(-1600, -1240, 3200, 1240);
  /* a skirting, well below the table so it cannot be mistaken for it */
  ctx.fillStyle = WALL_D;
  ctx.fillRect(-1600, -96, 3200, 96);
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-1600, -104, 3200, 12);

  /* timber floor */
  const fl = ctx.createLinearGradient(0, 0, 0, 260);
  fl.addColorStop(0, FLOOR);
  fl.addColorStop(1, FLOOR_D);
  ctx.fillStyle = fl;
  ctx.fillRect(-1600, 0, 3200, 260);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 3;
  for (let y = 46; y < 260; y += 58) {
    ctx.beginPath();
    ctx.moveTo(-1600, y);
    ctx.lineTo(1600, y);
    ctx.stroke();
  }
  /* lamplight reflected in the boards */
  const refl = ctx.createLinearGradient(0, 0, 0, 230);
  refl.addColorStop(0, "rgba(255,206,128,0.30)");
  refl.addColorStop(1, "rgba(255,206,128,0)");
  ctx.fillStyle = refl;
  ctx.fillRect(-900, 0, 1800, 230);
  ctx.fillStyle = FLOOR_L;
  ctx.fillRect(-1600, 0, 3200, 5);

  /* ceiling beam */
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(-1600, -1180, 3200, 54);
  ctx.fillStyle = WOOD;
  ctx.fillRect(-1600, -1180, 3200, 8);

  /* lattice screens either side of the centre */
  latticePanel(ctx, -1210, -930, 520, 720);
  latticePanel(ctx, 690, -930, 520, 720);

  /* a scroll of calligraphy on the centre wall */
  ctx.fillStyle = "#f3e7cd";
  rrect(ctx, -74, -846, 148, 366, 3);
  ctx.fill();
  ctx.strokeStyle = WOOD_D;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-84, -850);
  ctx.lineTo(84, -850);
  ctx.moveTo(-84, -476);
  ctx.lineTo(84, -476);
  ctx.stroke();
  ctx.fillStyle = "#231a12";
  ctx.font = "132px KhangCn";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("康", 0, -700);
  ctx.fillStyle = RED;
  rrect(ctx, 18, -572, 34, 38, 4);
  ctx.fill();

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
  const speakL = (t > 0.3 && t < 1.55 ? 1 : 0) + (t > 2.45 && t < 3.5 ? 1 : 0);
  const jawL =
    speakL > 0
      ? clamp01(0.5 + 0.5 * Math.sin(t * 15.5) * Math.sin(t * 6.1 + 1.2)) *
        (0.55 + 0.45 * Math.sin(t * 3.3))
      : 0;

  const liftStart = 1.35;
  const atMouth = 1.95;
  const biteEnd = 2.24;
  const backDown = 2.86;
  let liftR = 0;
  if (t >= liftStart && t < atMouth) liftR = seg(t, liftStart, atMouth, easeInOut);
  else if (t >= atMouth && t < biteEnd) liftR = 1;
  else if (t >= biteEnd && t < backDown) liftR = 1 - seg(t, biteEnd, backDown, easeInOut);

  const chewing = t > biteEnd && t < biteEnd + 1.5;
  const jawR = chewing
    ? 0.34 + 0.3 * Math.sin((t - biteEnd) * 13.5)
    : t > atMouth - 0.12 && t < biteEnd
      ? 0.9
      : 0;

  const holdingR =
    t < atMouth - 0.02
      ? t > liftStart - 0.25
        ? 1
        : 0
      : clamp01(1 - (t - (atMouth - 0.02)) / 0.16);

  /* a blink every few seconds keeps them alive */
  const blink = (ph) => {
    const c = (t + ph) % 3.4;
    return c < 0.11 ? 1 : 0;
  };

  const nodR = Math.sin(t * 2.4) * 0.03 + (t > 0.7 && t < 1.5 ? Math.sin(t * 7.5) * 0.045 : 0);
  const breathe = (ph) => Math.sin(t * 1.7 + ph) * 3.2;

  ctx.save();
  ctx.translate(-330, 0);
  drawFigure(ctx, {
    dir: 1,
    hair: "bun",
    mouth: jawL,
    lift: 0,
    blink: blink(0.6),
    headTilt: Math.sin(t * 1.9) * 0.035 + (speakL ? Math.sin(t * 5.2) * 0.03 : 0),
    lean: 5 + Math.sin(t * 1.3) * 2,
    breath: breathe(0),
    cloth: RED,
    clothD: RED_D,
    trim: GOLD,
  });
  ctx.restore();

  ctx.save();
  ctx.translate(330, 0);
  drawFigure(ctx, {
    dir: -1,
    hair: "short",
    mouth: jawR,
    lift: liftR,
    blink: blink(2.1),
    headTilt: nodR - liftR * 0.05,
    lean: 4 + Math.sin(t * 1.5 + 2) * 2,
    breath: breathe(2.1),
    holding: holdingR,
    cloth: NAVY,
    clothD: NAVY_D,
    trim: "#cfd8c7",
  });
  ctx.restore();
}

/* ── The shopfront ───────────────────────────────────────────── */
function drawFacade(ctx, t) {
  /* sky, with the city's glow low on the horizon */
  const sky = ctx.createLinearGradient(0, -200, 0, GROUND);
  sky.addColorStop(0, NIGHT_T);
  sky.addColorStop(0.72, "#121b26");
  sky.addColorStop(1, NIGHT_B);
  ctx.fillStyle = sky;
  ctx.fillRect(-400, -400, W + 800, GROUND + 400);

  /* street */
  ctx.fillStyle = STREET;
  ctx.fillRect(-400, GROUND, W + 800, H - GROUND + 400);
  ctx.fillStyle = "#19222c";
  ctx.fillRect(-400, GROUND, W + 800, 10);

  /* building body */
  ctx.fillStyle = BUILD;
  ctx.fillRect(330, 242, 1260, GROUND - 242);
  /* a brick-ish texture, barely there */
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 2;
  for (let y = 300; y < 430; y += 26) {
    ctx.beginPath();
    ctx.moveTo(334, y);
    ctx.lineTo(1586, y);
    ctx.stroke();
  }

  /* cornice */
  ctx.fillStyle = BUILD_L;
  rrect(ctx, 296, 228, 1328, 50, 8);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(296, 272, 1328, 3);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(296, 228, 1328, 3);

  /* piers */
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(330, 278, 104, GROUND - 278);
  ctx.fillRect(1486, 278, 104, GROUND - 278);
  ctx.fillStyle = BUILD_LL;
  ctx.fillRect(330, 278, 5, GROUND - 278);
  ctx.fillRect(1585, 278, 5, GROUND - 278);
  /* brass pier lamps */
  for (const px of [382, 1538]) {
    ctx.fillStyle = GOLD;
    rrect(ctx, px - 11, 470, 22, 34, 5);
    ctx.fill();
    const l = ctx.createRadialGradient(px, 500, 4, px, 500, 90);
    l.addColorStop(0, "rgba(255,214,140,0.42)");
    l.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = l;
    circle(ctx, px, 500, 90);
    ctx.fill();
  }

  /* signboard */
  const bg = ctx.createLinearGradient(BOARD.x, BOARD.y, BOARD.x, BOARD.y + BOARD.h);
  bg.addColorStop(0, "#0c2416");
  bg.addColorStop(1, "#071a0f");
  ctx.fillStyle = bg;
  rrect(ctx, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(227,182,104,0.45)";
  ctx.lineWidth = 2.5;
  rrect(ctx, BOARD.x + 5, BOARD.y + 5, BOARD.w - 10, BOARD.h - 10, 6);
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
  for (let i = 0; i <= bays; i++) {
    ctx.fillStyle = BUILD_L;
    ctx.fillRect(x + i * bw - 7, y, 14, h);
    ctx.fillStyle = BUILD_LL;
    ctx.fillRect(x + i * bw - 7, y, 3, h);
  }
  /* door stiles + brass handles */
  const dx = x + 2 * bw;
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(dx + bw / 2 - 6, y + 30, 12, h - 30);
  ctx.fillStyle = GOLD;
  rrect(ctx, dx + bw / 2 - 22, y + 196, 7, 76, 3.5);
  ctx.fill();
  rrect(ctx, dx + bw / 2 + 15, y + 196, 7, 76, 3.5);
  ctx.fill();
  /* threshold + plinth */
  ctx.fillStyle = BUILD_L;
  ctx.fillRect(x - 10, GROUND - 10, w + 20, 14);
  ctx.fillStyle = "#1d3a26";
  ctx.fillRect(330, GROUND - 10, 1260, 14);

  /* step + light spilling onto the pavement */
  ctx.fillStyle = "#16261b";
  rrect(ctx, 790, GROUND + 4, 340, 20, 5);
  ctx.fill();
  const spill = ctx.createLinearGradient(0, GROUND, 0, GROUND + 160);
  spill.addColorStop(0, "rgba(255,206,128,0.34)");
  spill.addColorStop(1, "rgba(255,206,128,0)");
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.moveTo(x + 40, GROUND);
  ctx.lineTo(x + w - 40, GROUND);
  ctx.lineTo(x + w + 120, GROUND + 160);
  ctx.lineTo(x - 120, GROUND + 160);
  ctx.closePath();
  ctx.fill();

  /* planters with real planting in them */
  for (const px of [472, 1448]) {
    ctx.fillStyle = "#2e4132";
    rrect(ctx, px - 34, GROUND - 92, 68, 92, 8);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.35 * alpha;
    ctx.fillRect(px - 34, GROUND - 78, 68, 2.5);
    ctx.globalAlpha = alpha;
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
    circle(ctx, px + 22, GROUND - 124, 17);
    ctx.fill();
  }
  ctx.restore();
}

/* ── The logo, lighting up on the signboard ──────────────────── *
 * The same lockup the site wears in its header: a green roundel
 * carrying 康, the name beside it, a jade hairline and the
 * descriptor underneath.                                            */
function drawSign(ctx, t) {
  const on = seg(t, 7.0, 7.7);
  if (on <= 0) return;

  const cy = BOARD.y + BOARD.h / 2; // 353
  /* the board's lamps come up first */
  const g = ctx.createRadialGradient(960, cy, 10, 960, cy, 460);
  g.addColorStop(0, `rgba(255,214,140,${0.34 * on})`);
  g.addColorStop(1, "rgba(255,214,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(BOARD.x - 180, BOARD.y - 90, BOARD.w + 360, BOARD.h + 180);

  /* lockup metrics */
  const R = 54;
  const GAP = 42;
  const TEXT_W = 327;
  const total = R * 2 + GAP + TEXT_W;
  const left = 960 - total / 2;
  const roundelX = left + R;
  const textL = left + R * 2 + GAP;

  /* ── the roundel ── */
  const aMark = seg(t, 7.15, 7.85, easeOut);
  if (aMark > 0) {
    ctx.save();
    ctx.globalAlpha = aMark;
    ctx.translate(roundelX, cy);
    ctx.scale(lerp(0.84, 1, aMark), lerp(0.84, 1, aMark));

    const grad = ctx.createLinearGradient(-R, -R, R, R);
    grad.addColorStop(0, GREEN);
    grad.addColorStop(1, GREEN_D);
    ctx.shadowColor = "rgba(22,163,74,0.55)";
    ctx.shadowBlur = 26;
    ctx.fillStyle = grad;
    circle(ctx, 0, 0, R);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 3.4;
    circle(ctx, 0, 0, R);
    ctx.stroke();

    /* 康 */
    const aCn = seg(t, 7.5, 8.1);
    if (aCn > 0) {
      ctx.globalAlpha = aMark * aCn;
      ctx.fillStyle = CREAM;
      ctx.font = `${Math.round(R * 1.18)}px KhangCn`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("康", 0, 2);
    }
    ctx.restore();
  }

  /* ── KHANG, letter by letter ── */
  const aName = seg(t, 7.8, 8.5);
  if (aName > 0) {
    ctx.save();
    ctx.fillStyle = CREAM;
    ctx.font = "72px KhangDisplay";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(255,214,140,0.45)";
    ctx.shadowBlur = 18;
    tracked(ctx, "KHANG", textL + TEXT_W / 2, 358, 17, (i, n) =>
      clamp01((aName - (i / n) * 0.55) / 0.45),
    );
    ctx.restore();
  }

  /* ── jade hairline ── */
  const aRule = seg(t, 8.4, 8.8);
  if (aRule > 0) {
    ctx.save();
    ctx.globalAlpha = aRule;
    const rw = TEXT_W * aRule;
    const rg = ctx.createLinearGradient(textL, 0, textL + TEXT_W, 0);
    rg.addColorStop(0, "rgba(22,163,74,0)");
    rg.addColorStop(0.5, JADE_L);
    rg.addColorStop(1, "rgba(22,163,74,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(textL + (TEXT_W - rw) / 2, 374, rw, 2);
    ctx.restore();
  }

  /* ── descriptor ── */
  const aSub = seg(t, 8.6, 9.05);
  if (aSub > 0) {
    ctx.save();
    ctx.globalAlpha = aSub * 0.9;
    ctx.fillStyle = CREAM;
    ctx.font = "15px KhangSans";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    tracked(ctx, "CHINESE · DIMSUM", textL + TEXT_W / 2, 400, 6.4);
    ctx.restore();
  }
}

/* ── Camera ──────────────────────────────────────────────────── *
 * Scale 4.3 is a two-shot across the table; scale 1 frames the whole
 * shopfront. One continuous move, then a last gentle settle onto the
 * sign once the name is lit.                                        */
function camera(t) {
  const hold = seg(t, 0, 2.8, (u) => u); // linear drift while they talk
  const pull = seg(t, 2.8, 6.6, easeInOut);
  const settle = seg(t, 8.4, 10.0, easeInOut);
  let scale;
  let cy;
  if (t >= 6.6) {
    // Only a hair closer: the complete entrance has to stay in frame.
    scale = lerp(1.0, 1.12, settle);
    cy = lerp(540, 508, settle);
  } else if (pull > 0) {
    // The opening framing is kept wholly inside the glazing, otherwise
    // the shopfront's plinth creeps into the bottom of what should
    // read as a shot taken from inside the room.
    scale = expLerp(4.0, 1.0, pull);
    cy = lerp(745, 540, pull);
  } else {
    scale = expLerp(4.3, 4.0, hold);
    cy = lerp(751, 745, hold);
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
  const vg = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.32, W / 2, H * 0.5, H * 0.98);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(6,4,2,0.4)");
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
