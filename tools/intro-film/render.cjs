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

const BANQ = "#6d8f78";
const BANQ_D = "#567862";

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
 * Real people, built on the reference's proportions: the same
 * square front-on stance and broad sloping shoulders, but drawn
 * with skin, hair and cloth — and a face that can open its mouth,
 * which is what finally lets speech be read as speech instead of
 * inferred from a waving hand.
 *
 * Form is carried by gradient rather than outline. There is not a
 * single black contour on these figures; every edge is a tonal
 * step, which is what keeps them from sliding back into clip-art.
 */
const PEOPLE = {
  w: {
    skin: "#edc49d", skinS: "#d9a378", skinD: "#b9815a", skinH: "#f8dec3",
    hair: "#241a15", hairH: "#433024",
    cloth: "#bd8268", clothS: "#a66950", clothD: "#88503b",
    lip: "#b5705f", brow: "#2b1f18",
  },
  m: {
    skin: "#e2b389", skinS: "#c78f69", skinD: "#a3704c", skinH: "#f1d1b0",
    hair: "#1c1512", hairH: "#382923",
    cloth: "#245940", clothS: "#1b4631", clothD: "#113021",
    lip: "#a9705c", brow: "#20170f",
  },
};

const HW = 45;
const HH = 50;

/** The skull, as one closed path — jaw, cheek, temple, crown. */
function headPath(ctx, j) {
  /* j widens the jaw: the one dial that separates a square male jaw
     from a tapered female one without redrawing the skull */
  ctx.beginPath();
  ctx.moveTo(0, HH);
  ctx.bezierCurveTo(-20 * j, HH - 1, -34 * j, HH - 16, -39 * j, HH - 34);
  ctx.bezierCurveTo(-44, 2, -45, -22, -33, -38);
  ctx.bezierCurveTo(-22, -52, 22, -52, 33, -38);
  ctx.bezierCurveTo(45, -22, 44, 2, 39 * j, HH - 34);
  ctx.bezierCurveTo(34 * j, HH - 16, 20 * j, HH - 1, 0, HH);
  ctx.closePath();
}

function drawHead(ctx, p, who, talk, far, blink) {
  const j = who === "w" ? 0.88 : 1.05;
  /* hair behind the head: the bun, and the mass at the back */
  ctx.fillStyle = p.hair;
  if (who === "w") {
    circle(ctx, -41, -16, 21);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -8, 46, 48, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -10, 44, 45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ears */
  ctx.fillStyle = p.skinS;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(d * 41, 4, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* face */
  const fg = ctx.createLinearGradient(-HW, -HH, HW * 0.7, HH);
  fg.addColorStop(0, p.skinH);
  fg.addColorStop(0.45, p.skin);
  fg.addColorStop(1, p.skinS);
  ctx.fillStyle = fg;
  headPath(ctx, j);
  ctx.fill();

  /* the shadow side — clipped to the skull so it can't spill */
  ctx.save();
  headPath(ctx, j);
  ctx.clip();
  const sg = ctx.createLinearGradient(6, 0, HW + 6, 0);
  sg.addColorStop(0, "rgba(0,0,0,0)");
  sg.addColorStop(1, "rgba(120,70,36,0.3)");
  ctx.fillStyle = sg;
  ctx.fillRect(-HW, -HH, HW * 2, HH * 2);
  /* under the cheekbones */
  const cg = ctx.createRadialGradient(0, 42, 4, 0, 40, 32);
  cg.addColorStop(0, "rgba(150,92,52,0.22)");
  cg.addColorStop(1, "rgba(150,92,52,0)");
  ctx.fillStyle = cg;
  ctx.fillRect(-HW, 0, HW * 2, HH);
  ctx.restore();

  if (!far) {
    /* brows */
    ctx.strokeStyle = p.brow;
    ctx.lineWidth = who === "w" ? 3.6 : 4.6;
    ctx.lineCap = "round";
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(d * 8, -19);
      ctx.quadraticCurveTo(d * 17, -23.5, d * 27, -18);
      ctx.stroke();
    }

    /* eyes */
    const open = 1 - clamp01(blink || 0);
    for (const d of [-1, 1]) {
      if (open > 0.12) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(d * 18, -5, 10.5, 5.8 * open, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "#f6efe6";
        ctx.fillRect(d * 18 - 12, -14, 24, 20);
        ctx.fillStyle = "#2a1d14";
        circle(ctx, d * 18.5, -4.6, 4.7);
        ctx.fill();
        ctx.fillStyle = "#fff";
        circle(ctx, d * 20, -6.4, 1.6);
        ctx.fill();
        ctx.restore();
      }
      /* upper lid line — what makes an eye read as an eye */
      ctx.strokeStyle = p.hair;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(d * 7.5, -7.5 + (1 - open) * 4.6);
      ctx.quadraticCurveTo(d * 18, -12.5 + (1 - open) * 7.4, d * 27.5, -6 + (1 - open) * 3.4);
      ctx.stroke();
    }

    /* nose: a shadow down one side and a soft tip */
    ctx.strokeStyle = "rgba(150,95,55,0.26)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-4, 1);
    ctx.quadraticCurveTo(-6.5, 8, -3.5, 12);
    ctx.stroke();
    ctx.fillStyle = "rgba(150,95,55,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 13, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    /* mouth — opens with `talk`, which is the point of a face */
    const mo = clamp01(talk) * 9;
    ctx.fillStyle = "#5c2f2c";
    ctx.beginPath();
    ctx.moveTo(-12, 28);
    ctx.quadraticCurveTo(0, 25.5, 12, 28);
    ctx.quadraticCurveTo(0, 29 + mo, -12, 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.lip;
    ctx.beginPath();
    ctx.moveTo(-12, 28);
    ctx.quadraticCurveTo(-6, 24.5, 0, 26);
    ctx.quadraticCurveTo(6, 24.5, 12, 28);
    ctx.quadraticCurveTo(6, 26.5, 0, 27);
    ctx.quadraticCurveTo(-6, 26.5, -12, 28);
    ctx.closePath();
    ctx.fill();
    if (mo > 4.4) {
      ctx.fillStyle = "rgba(243,231,220,0.85)";
      ctx.beginPath();
      ctx.ellipse(0, 28.6, 8.2, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* hair in front: the crown, the hairline, the side panels */
  ctx.fillStyle = p.hair;
  if (who === "w") {
    ctx.beginPath();
    ctx.moveTo(-42, 2);
    ctx.bezierCurveTo(-47, -24, -37, -50, 0, -52);
    ctx.bezierCurveTo(37, -50, 47, -24, 42, 2);
    ctx.bezierCurveTo(40, -14, 32, -27, 19, -30);
    ctx.bezierCurveTo(7, -33, -8, -32, -20, -26);
    ctx.bezierCurveTo(-31, -21, -38, -12, -42, 2);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-43, -10);
    ctx.bezierCurveTo(-47, -30, -35, -52, 0, -53);
    ctx.bezierCurveTo(35, -52, 47, -30, 43, -10);
    ctx.bezierCurveTo(40, -25, 35, -31, 25, -32);
    ctx.bezierCurveTo(10, -35, -10, -35, -25, -32);
    ctx.bezierCurveTo(-35, -31, -40, -25, -43, -10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = p.hairH;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(-17, -39, 17, 6.5, -0.33, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFigure(ctx, o) {
  const {
    side = 1,
    who = "m",
    nod = 0,
    lean = 0,
    breath = 0,
    talk = 0,
    blink = 0,
    far = false,
  } = o;
  const p = PEOPLE[who];
  const NECK_Y = -348;
  const HEAD_Y = -424 + breath + nod;

  ctx.save();
  ctx.scale(side, 1);

  /* shadow cast back onto the banquette */
  ctx.save();
  ctx.globalAlpha = 0.17;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(10, -190, 120, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* neck, tucked into the collar */
  ctx.fillStyle = p.skinS;
  rrect(ctx, -21, -392, 42, 58, 11);
  ctx.fill();
  ctx.fillStyle = "rgba(120,70,36,0.33)";
  rrect(ctx, -21, -392, 42, 20, 10);
  ctx.fill();

  /* torso: trapezius sloping out to a broad shoulder cap, exactly
     the line the reference pictogram is built on */
  const tg = ctx.createLinearGradient(-100, 0, 92, 0);
  tg.addColorStop(0, p.clothD);
  tg.addColorStop(0.34, p.cloth);
  tg.addColorStop(1, p.clothS);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-30, NECK_Y - 4);
  ctx.quadraticCurveTo(-64, NECK_Y + 6, -92, -326);
  ctx.quadraticCurveTo(-99, -318, -101, -290);
  ctx.lineTo(-94, -232);
  ctx.lineTo(-80, -132);
  ctx.lineTo(80, -132);
  ctx.lineTo(94, -232);
  ctx.lineTo(101, -290);
  ctx.quadraticCurveTo(99, -318, 92, -326);
  ctx.quadraticCurveTo(64, NECK_Y + 6, 30, NECK_Y - 4);
  ctx.closePath();
  ctx.fill();

  /* collar */
  ctx.fillStyle = p.clothD;
  if (who === "w") {
    ctx.beginPath();
    ctx.moveTo(-32, NECK_Y - 6);
    ctx.quadraticCurveTo(0, -316, 32, NECK_Y - 6);
    ctx.quadraticCurveTo(0, NECK_Y - 2, -32, NECK_Y - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    rrect(ctx, -3, -338, 6, 180, 3);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, NECK_Y + 4, 34, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2.2;
    for (const rx of [-62, -38, -14, 14, 38, 62]) {
      ctx.beginPath();
      ctx.moveTo(rx, -322);
      ctx.lineTo(rx + 4, -140);
      ctx.stroke();
    }
  }

  /* chest shading, so the torso turns rather than sits flat */
  const cs = ctx.createLinearGradient(0, -332, 0, -236);
  cs.addColorStop(0, "rgba(0,0,0,0.11)");
  cs.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cs;
  ctx.beginPath();
  ctx.moveTo(-92, -326);
  ctx.lineTo(92, -326);
  ctx.lineTo(96, -200);
  ctx.lineTo(-96, -200);
  ctx.closePath();
  ctx.fill();

  /* head */
  ctx.save();
  ctx.translate(0, NECK_Y);
  ctx.rotate(-lean);
  ctx.translate(0, -NECK_Y);
  ctx.translate(0, HEAD_Y);
  drawHead(ctx, p, who, talk, far, blink);
  ctx.restore();

  ctx.restore();
}

/** The arms, drawn in a second pass after the table so the hands
 *  land on the surface instead of behind it. */
function drawArms(ctx, o) {
  const {
    side = 1, who = "m", lift = 0, gesture = 0, holding = 0,
    sticks = false,
  } = o;
  const p = PEOPLE[who];

  ctx.save();
  ctx.scale(side, 1);

  const sleeve = (sx, sy, ex, ey, hx2, hy2) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const run = (w, dx, dy, col, al) => {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(sx + dx, sy + dy);
      ctx.lineTo(ex + dx, ey + dy);
      ctx.lineTo(hx2 + dx, hy2 + dy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    run(39, 0, 0, p.clothS, 1);
    run(27, -4, -4, p.cloth, 0.55);
    run(13, 11, 7, p.clothD, 0.3);
  };

  const hand = (hx2, hy2, ang) => {
    ctx.save();
    ctx.translate(hx2, hy2);
    ctx.rotate(ang);
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.ellipse(1, 0, 19, 11, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, -8.5, 8, 4.4, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.skinS;
    ctx.lineWidth = 1.4;
    for (const k of [-4, 1, 6]) {
      ctx.beginPath();
      ctx.moveTo(8 + k * 0.6, k * 0.9 - 3);
      ctx.lineTo(18 + k * 0.4, k * 0.8 + 1);
      ctx.stroke();
    }
    ctx.fillStyle = p.skinS;
    ctx.beginPath();
    ctx.ellipse(-5, 6, 8, 4.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  /* outer arm, resting on the table */
  sleeve(86, -308, 98, -246, 66, -198);
  hand(62, -196, -0.3);

  /* acting arm: one rest pose blended toward a mouth pose and a
     gesture pose */
  const u = easeInOut(clamp01(lift));
  const g = clamp01(gesture);
  const REST = { ex: -98, ey: -246, hx: -62, hy: -196 };
  const MOUTH = { ex: -104, ey: -276, hx: -48, hy: -358 };
  const GEST = { ex: -108, ey: -262, hx: -94, hy: -368 };
  const ex = REST.ex + u * (MOUTH.ex - REST.ex) + g * (GEST.ex - REST.ex);
  const ey = REST.ey + u * (MOUTH.ey - REST.ey) + g * (GEST.ey - REST.ey);
  const hx = REST.hx + u * (MOUTH.hx - REST.hx) + g * (GEST.hx - REST.hx);
  const hy = REST.hy + u * (MOUTH.hy - REST.hy) + g * (GEST.hy - REST.hy);
  sleeve(-86, -308, ex, ey, hx, hy);
  hand(hx, hy, lerp(0.3, 0.95, u) - g * 1.3);

  if (sticks) {
    /* solved so the tip lands just short of the lips, never in the face */
    const ang = lerp(-0.4, -0.733, u);
    const len = 54;
    const ox = -Math.sin(ang) * 5.5;
    const oy = Math.cos(ang) * 5.5;
    ctx.strokeStyle = "#c0924f";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + ox * k, hy + oy * k);
      ctx.lineTo(hx + len * Math.cos(ang) + ox * k, hy + len * Math.sin(ang) + oy * k);
      ctx.stroke();
    }
    if (holding > 0.02) {
      const dx = hx + (len + 2) * Math.cos(ang);
      const dy = hy + (len + 2) * Math.sin(ang);
      const r = 12 * holding;
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.ellipse(dx, dy, r, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ddc9a6";
      ctx.lineWidth = 2;
      for (const aa of [-0.55, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(dx + Math.sin(aa) * r * 0.7, dy - r * 0.76);
        ctx.lineTo(dx + Math.sin(aa) * r * 0.25, dy + r * 0.5);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/* ── The table, seen front-on ────────────────────────────────── */
function drawTable(ctx, t) {
  const FAR = -212;
  const NEAR = -178;

  /* shadow the table casts back onto the banquette */
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#000";
  ctx.fillRect(-540, FAR - 14, 1080, 16);
  ctx.restore();

  /* surface: a shallow trapezoid, read from slightly above */
  const sg = ctx.createLinearGradient(0, FAR, 0, NEAR);
  sg.addColorStop(0, WOOD_L);
  sg.addColorStop(1, WOOD);
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(-498, FAR);
  ctx.lineTo(498, FAR);
  ctx.lineTo(538, NEAR);
  ctx.lineTo(-538, NEAR);
  ctx.closePath();
  ctx.fill();

  /* front edge and apron */
  ctx.fillStyle = WOOD;
  rrect(ctx, -538, NEAR, 1180, 16, 3);
  ctx.fill();
  ctx.fillStyle = WOOD_D;
  rrect(ctx, -516, NEAR + 16, 1032, 26, 3);
  ctx.fill();
  rrect(ctx, -452, NEAR + 42, 20, 136, 5);
  ctx.fill();
  rrect(ctx, 432, NEAR + 42, 20, 136, 5);
  ctx.fill();
}

function drawSetting(ctx, t) {
  const S = -196; // where things stand on the surface

  /* stacked steamers, centred between the guests */
  for (const i of [0, 1, 2]) {
    const y = S - 26 - i * 24;
    ctx.fillStyle = i === 2 ? "#e0b876" : i ? "#d7ab6a" : "#c99a5b";
    rrect(ctx, -66 + i * 3, y, 132 - i * 6, 26, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(171,127,62,0.55)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-58 + i * 3, y + 12);
    ctx.lineTo(58 - i * 3, y + 12);
    ctx.stroke();
  }
  ctx.fillStyle = "#ab7f3e";
  circle(ctx, 0, S - 76, 6);
  ctx.fill();

  /* plates either side */
  for (const px of [-348, 348]) {
    ctx.fillStyle = "#cfd8c8";
    ctx.beginPath();
    ctx.ellipse(px, S - 4, 56, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CELADON;
    ctx.beginPath();
    ctx.ellipse(px, S - 7, 56, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const dx of [-24, 0, 24]) {
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.ellipse(px + dx, S - 14, 13, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* red clay teapot, off to one side */
  const tx = -448;
  ctx.fillStyle = RED_D;
  circle(ctx, tx, S - 28, 30);
  ctx.fill();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(tx, S - 28, 30, Math.PI * 1.12, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = RED_D;
  rrect(ctx, tx - 10, S - 66, 20, 12, 4);
  ctx.fill();
  ctx.strokeStyle = RED_D;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tx - 28, S - 38);
  ctx.quadraticCurveTo(tx - 58, S - 34, tx - 54, S - 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx + 28, S - 38);
  ctx.quadraticCurveTo(tx + 52, S - 32, tx + 30, S - 12);
  ctx.stroke();

  /* cups */
  for (const cx of [-268, 268, 420]) {
    ctx.fillStyle = CELADON;
    rrect(ctx, cx - 16, S - 20, 32, 20, 6);
    ctx.fill();
    ctx.fillStyle = "#cfd8c8";
    ctx.fillRect(cx - 16, S - 20, 32, 3);
  }

  /* steam off the steamers */
  ctx.strokeStyle = "rgba(255,252,244,0.9)";
  ctx.lineWidth = 3.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const ph = t * 0.85 + i * 0.47;
    const rise = ph % 1;
    const x0 = -30 + i * 30;
    const y0 = S - 84;
    ctx.globalAlpha = (1 - rise) * 0.48 * Math.min(1, rise * 5);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let sp = 0; sp <= 1.001; sp += 0.25) {
      ctx.lineTo(
        x0 + Math.sin(sp * 3.1 + ph * 4.2) * (9 + sp * 13),
        y0 - sp * (86 + rise * 54),
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
function sideTable(ctx, x, t, i) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(0.62, 0.62);

  /* bench */
  ctx.fillStyle = BANQ_D;
  rrect(ctx, -330, -288, 660, 158, 10);
  ctx.fill();
  ctx.fillStyle = WOOD_D;
  rrect(ctx, -338, -306, 676, 22, 9);
  ctx.fill();

  const bob = Math.sin(t * 1.1 + i) * 3;
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * 150, 0);
    drawFigure(ctx, {
      side: d, who: d < 0 ? "w" : "m", far: true,
      nod: bob, breath: Math.sin(t * 1.6 + i + d) * 3,
    });
    ctx.restore();
  }

  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.moveTo(-300, -212);
  ctx.lineTo(300, -212);
  ctx.lineTo(326, -178);
  ctx.lineTo(-326, -178);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = WOOD_D;
  rrect(ctx, -312, -178, 624, 42, 3);
  ctx.fill();

  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * 150, 0);
    drawArms(ctx, {
      side: d, who: d < 0 ? "w" : "m",
      gesture: i === 1 && d > 0 ? 0.5 + 0.5 * Math.sin(t * 4) : 0,
      lift: i === 0 && d > 0 ? 0.5 + 0.5 * Math.sin(t * 2.3) : 0,
    });
    ctx.restore();
  }

  ctx.fillStyle = "#c99a5b";
  rrect(ctx, -46, -238, 92, 28, 6);
  ctx.fill();
  ctx.restore();
}

function drawInterior(ctx, t) {
  /* wall */
  ctx.fillStyle = WALL;
  ctx.fillRect(-1600, -1240, 3200, 1240);
  const pool = ctx.createRadialGradient(0, -620, 60, 0, -560, 1180);
  pool.addColorStop(0, "rgba(255,221,158,0.32)");
  pool.addColorStop(1, "rgba(255,221,158,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(-1600, -1240, 3200, 1240);
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
  refl.addColorStop(0, "rgba(255,214,150,0.26)");
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

  latticePanel(ctx, -1330, -940, 480, 620);
  latticePanel(ctx, 850, -940, 480, 620);

  /* hanging scroll, centred between the two heads and clear above
     them — it must sit out of the opening frame or it crops */
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

  lantern(ctx, -470, -716, 60, t, 0);
  lantern(ctx, 470, -706, 60, t, 2);
  lantern(ctx, -1010, -690, 52, t, 1);
  lantern(ctx, 1010, -698, 52, t, 3);

  sideTable(ctx, -1030, t, 0);
  sideTable(ctx, 1030, t, 1);

  /* the banquette the pair are sitting on: deep green, picking up
     the facade, and dark enough that the ink figures still read */
  ctx.fillStyle = BANQ_D;
  rrect(ctx, -676, -288, 1352, 166, 12);
  ctx.fill();
  const bq = ctx.createLinearGradient(0, -288, 0, -150);
  bq.addColorStop(0, BANQ);
  bq.addColorStop(1, BANQ_D);
  ctx.fillStyle = bq;
  rrect(ctx, -664, -280, 1328, 148, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 3;
  for (const bx of [-332, 0, 332]) {
    ctx.beginPath();
    ctx.moveTo(bx, -274);
    ctx.lineTo(bx, -140);
    ctx.stroke();
  }
  ctx.fillStyle = WOOD_D;
  rrect(ctx, -686, -306, 1372, 22, 10);
  ctx.fill();
  ctx.fillStyle = WOOD;
  ctx.fillRect(-680, -306, 1360, 5);

  /* ── choreography ───────────────────────────────────────────
     No faces, so every beat is pose: she leans in and her hand
     moves with the sentence; he lifts, bites, and nods while he
     chews. Both read at a glance, which is the point of working
     in pictograms. */
  const talking = (t > 0.3 && t < 1.5) || (t > 2.5 && t < 3.7);
  const talkIn = talking ? seg(t, t > 2.4 ? 2.5 : 0.3, t > 2.4 ? 2.78 : 0.58) : 0;
  const talkOut = t > 1.5 && t < 1.82 ? 1 - seg(t, 1.5, 1.82) : 1;
  const amp = talking ? talkIn * talkOut : 0;
  const gestureL = amp * (0.55 + 0.3 * Math.sin(t * 5.2));
  const leanL = 0.05 + amp * 0.035 + Math.sin(t * 2.1) * 0.012;
  /* syllables: two overlaid rates so the jaw never ticks like a metronome */
  const talkL = amp * clamp01(0.5 + 0.34 * Math.sin(t * 15.5) + 0.3 * Math.sin(t * 9.1 + 1.2));

  const liftStart = 1.3;
  const atMouth = 1.94;
  const biteEnd = 2.22;
  const backDown = 2.9;
  let liftR = 0;
  if (t >= liftStart && t < atMouth) liftR = seg(t, liftStart, atMouth, easeInOut);
  else if (t >= atMouth && t < biteEnd) liftR = 1;
  else if (t >= biteEnd && t < backDown) liftR = 1 - seg(t, biteEnd, backDown, easeInOut);

  /* chewing: a small insistent bob — on a faceless head it is the
     only honest way to say there is food in it */
  const chewing = t > biteEnd && t < biteEnd + 1.8;
  const nodR = chewing ? Math.sin((t - biteEnd) * 13.5) * 4 : Math.sin(t * 2.2) * 1.4;
  const chewR = chewing ? clamp01(0.34 + 0.34 * Math.sin((t - biteEnd) * 13.5)) : 0;
  const holdingR =
    t < atMouth - 0.02 ? (t > liftStart - 0.22 ? 1 : 0)
      : clamp01(1 - (t - (atMouth - 0.02)) / 0.16);

  ctx.save();
  ctx.translate(-230, 0);
  drawFigure(ctx, {
    side: -1,
    who: "w",
    blink: clamp01(1 - Math.abs(((t + 1.1) % 3.4) - 0.1) / 0.09),
    lean: leanL,
    talk: talkL,
    nod: Math.sin(t * 2.4) * 1.4,
    breath: Math.sin(t * 1.7) * 3.0,
  });
  ctx.restore();

  ctx.save();
  ctx.translate(230, 0);
  drawFigure(ctx, {
    side: 1,
    who: "m",
    blink: clamp01(1 - Math.abs(((t + 2.7) % 3.4) - 0.1) / 0.09),
    nod: nodR,
    talk: chewR,
    lean: 0.035 + Math.sin(t * 1.6 + 2) * 0.014 - liftR * 0.025,
    breath: Math.sin(t * 1.7 + 2.1) * 3.0,
  });
  ctx.restore();

  drawTable(ctx, t);

  ctx.save();
  ctx.translate(-230, 0);
  drawArms(ctx, { side: -1, who: "w", gesture: gestureL });
  ctx.restore();
  ctx.save();
  ctx.translate(230, 0);
  drawArms(ctx, { side: 1, who: "m", sticks: true, lift: liftR, holding: holdingR });
  ctx.restore();

  drawSetting(ctx, t);
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
  rrect(ctx, dx + bw / 2 - 24, y + 212, 7, 62, 3.5);
  ctx.fill();
  rrect(ctx, dx + bw / 2 + 17, y + 212, 7, 62, 3.5);
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
    scale = expLerp(4.9, 1.0, pull);
    cy = lerp(744, 540, pull);
  } else {
    // Kept wholly inside the glazing, or the shopfront's plinth creeps
    // into the bottom of what should read as a shot from inside.
    scale = expLerp(5.2, 4.9, hold);
    cy = lerp(748, 744, hold);
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

  drawGlazingFrame(ctx, clamp01((3.9 - cam.scale) / 1.4));
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
