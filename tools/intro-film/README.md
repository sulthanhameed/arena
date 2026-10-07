# The Khang entrance film

`render.cjs` draws every frame of the intro video that plays over the
homepage — ten seconds, 1920 × 1080, 30 fps, 300 frames.

It opens close on two guests at a table. One is talking, hand moving
with the sentence; the other lifts a dumpling with his chopsticks,
eats it, and goes on chewing. From 2.8 s the camera retreats in one
unbroken move, back through the window, past the lanterns and screens
of the dining room, until the whole shopfront stands in frame. Then
the picture washes to white and the brand lockup resolves on its own
card: the green roundel carrying 康, then KHANG, a jade hairline and
CHINESE · DIMSUM, the same mark the site wears in its header.

The guests are **solid silhouettes in profile**, facing each other
across the table on two chairs, legs and feet in frame. They are
filled bodies with real volume — a torso that tapers from shoulder
to hip, thick bent limbs with rounded joints, an oval head and no
face at all — which is the pictogram the reference is drawn in.
Not thin line figures: that was the previous cut and it is not what
the reference shows.

Flat colour only, one per figure: a muted wine and a deep teal.
The far arm and leg take a darker tone of the same ink. The
reference is pure black and lets overlapping limbs merge into one
mass; at video scale that loses the pose completely, and a second
tone costs nothing because the result is still a silhouette.

Every beat is pose, because there is no face to carry one. Prop
tips are solved against the head rather than eyeballed — the
chopsticks straddle the hand so the tip lands on the mouth instead
of halfway across the skull, and the cup rim meets the same point.

**The food animates.** The lid lifts clear of the steamer stack in
the first three seconds, tipping as it rises, and the steam under
it jumps to nearly three times its resting strength while dumplings
fade in inside the open basket. His plate starts with five
dumplings and is down to four the moment he takes one. The table
also carries a clay teapot, a noodle bowl, a second small steamer
and a sauce dish — all of it steaming on fixed phases, because
random per-call values crawl between frames.

**The room is back, as a space rather than a building:** a wall, a
floor, a dado rail, two lit screens and two lanterns. It is drawn
in the same flat language as the figures and kept deliberately
light — a dark floor swallows the wine figure's feet the moment the
camera pulls out far enough to show them. The rail is painted
before the screens so it passes behind them instead of across them.
Background tables were tried and cut: at the alpha that kept them
in the background they read as pale glitches rather than
atmosphere.

**The camera is one long pull-back.** It opens tight on the pair
and the table — no floor, no lanterns, nothing but the two of them,
which is where the lid beat plays so the food is large when it
moves — and widens over 8.9s to the whole room, landing as the
white wash begins. expLerp, not lerp: a zoom that steps evenly
through scale reads as decelerating, and this has to land as one
continuous move.

The film is twelve seconds in a dining room. The lid comes off the
steamer, he eats, she answers, she drinks, he sets down his
chopsticks, they raise their cups together and drink to it, and she
laughs. Then the picture washes to white and the mark resolves on
its own, with the room gone — the logo has never shared a frame
with the restaurant and still does not.

The shopfront was built, refined twice, cut entirely, and is not
what came back. What came back is the interior only, rebuilt flat:
no facade, no glazing, no signage, no blade sign, no lattice. The
old version is in the history if it is ever wanted.

The performance is deliberately small. Amplitudes sit at roughly
a third of where they started: the chew is a nod rather than a
chatter, the laugh is a lean back and settle rather than a
shudder, and the camera does one slow widening instead of a
reveal. At this scale, motion that feels right while you are
authoring it reads as fidget on playback.

Everything is drawn: the performance, the camera move and both the
shopfront sign and the end card are baked into the video, so the site
only has to play it.

## Running it

The script is deliberately **not** wired into `package.json`. It is a
build-time tool for an asset that is committed to the repo, and it
needs two things the app itself never does — a canvas implementation
and an encoder. Install them wherever is convenient:

```sh
mkdir -p /tmp/vid && cd /tmp/vid
npm i @napi-rs/canvas                 # the rasteriser
npm i @ffmpeg-installer/ffmpeg        # the encoder

# the sign is typeset into the film, so the fonts have to be installed
# for fontconfig to find: Ma Shan Zheng, Playfair Display, Manrope
# (see @expo-google-fonts/*) copied into ~/.local/share/fonts
```

Then render and encode:

```sh
cd /tmp/vid
NODE_PATH=/tmp/vid/node_modules node tools/intro-film/render.cjs /tmp/vid/frames

FF=/tmp/enc/node_modules/@ffmpeg-installer/linux-x64/ffmpeg; chmod +x $FF
$FF -y -framerate 30 -i frames/f_%04d.png -vf "scale=1600:900:flags=lanczos" \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -profile:v high \
    -movflags +faststart public/intro/khang-entrance.mp4
$FF -y -framerate 30 -i frames/f_%04d.png -vf "scale=1600:900:flags=lanczos" \
    -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -speed 2 \
    public/intro/khang-entrance.webm
$FF -y -i frames/f_0000.png -vf "scale=1600:900:flags=lanczos" -q:v 6 \
    public/intro/poster.jpg
```

`ONLY_FRAMES=0,45,90` renders just those frames, which is how you
check a change without waiting three and a half minutes for the whole
film.

It is `.cjs` rather than `.mjs` on purpose: ESM ignores `NODE_PATH`,
and the point of this layout is that the one dependency can live
outside the app's own `node_modules`.

## How it is put together

Everything shares **one world space**, in which `scale: 1.0` frames the
whole facade. The interior is drawn in its own units and placed inside
the glazing (`GLASS`), clipped to it — so the same drawing serves both
the opening close-up and the little lit room seen through the window at
the end, and the retreat between them is a single continuous zoom.

- `camera(t)` holds at ~4.3 while the guests eat, then interpolates
  **geometrically** out to 1.0. Geometric rather than linear: a linear
  ramp between two scales races at the start and crawls at the end.
- The opening framing is kept wholly inside the glazing, otherwise the
  shopfront's plinth creeps into the bottom of what should read as a
  shot from inside the room. The glazing bars themselves fade up as the
  camera backs out through them.
- Figures are drawn facing right and mirrored with `scale(dir, 1)`,
  so body, limbs and hair-bun flip as one piece. The left guest keeps
  a bun: it is the only asymmetry on the head, and without it a head
  tilt on a plain circle is invisible.
- **Hair needs a curved hairline, not a clipped rectangle.** Masking
  the hair to two straight rects — one for the crown, one for the
  back of the skull — leaves the face as a square panel punched out
  of a circle, which reads as a rendering bug rather than a haircut.
  `profileHair()` draws it as one closed path instead: the hairline
  curve out to the nape, then the skull's own arc back over the top.
- **A flat slab with a white rectangle on it is not a shopfront.**
  What sells one is hierarchy — stone pier, fascia, transom line,
  base — and one metal running through all of it. The earlier
  version had a single green mass, a white sign panel floating on
  it like a sticker, and five equal bays with the door hidden in
  the middle of one, which gave the eye nothing to hold and buried
  the entrance.
- **A building with no neighbours floats in a void**, and that is
  most of why the old one read as clip art. Two dim blocks either
  side and a kerb line are enough to put it on a street.
- **A hard-edged triangle reads as a shadow, not as light.** The
  picture lights' beams had to become soft radial pools before they
  stopped looking like dark wedges painted on the fascia.
- **A pull handle needs a door leaf to belong to.** Drawn into a
  bare opening it reads as a brass stick floating in the glass;
  it needs stiles, a top rail and a kick panel around it.
- **Flat tone is the thing that reads as fake.** Plaster, limewash
  and paving all needed blotching and jointing before they stopped
  looking like swatches. The blotches have to be *fixed* constants,
  not random per call — random ones crawl between frames.
- **Glazing needs reflections or it reads as a hole.** But the sky
  tint down the top of the glass went in at 0.16 alpha and turned
  the transom lights into opaque grey panels, killing the warm
  interior behind them; 0.07 with a faster falloff is the whole
  difference between glass and cardboard.
- **Gold signwriting belongs in the transom band.** Across the
  lower glass it lands on top of the background diners.
- **Blend held-object poses in series, not in parallel.** The arm
  solver adds its targets together, so a raised cup that also goes
  to the lips overshot clean off the top of the head. Rest → toast
  → mouth has to be a chain.
- **A cup is not held like chopsticks.** It needed its own mouth pose
  — lower and further back — plus its own angle ramp, from upright on
  the table to tipped at the lips. Driven off the chopstick pose she
  drank through her forehead.
- `arc(a,b,c,d)` is one lift-hold-lower envelope shared by both
  guests, offset in time. Two hand-rolled timelines drift apart the
  moment either is retimed.
- The camera's bottom edge is pinned to the floor line rather than
  centred, because the floor is also the bottom of the glazing: go
  one pixel below it and the shopfront's plinth appears inside what
  is supposed to be a shot from inside the room.
- **The arms are a second pass.** `drawFigure` lays down the body and
  head, the table goes over them, then `drawArms` runs again on top —
  otherwise the hands are drawn behind the table and the whole
  silhouette, wedge gap included, disappears under a plank of oak.
- The table sits at navel height for the same reason. Any higher and
  it eats the armpit, which is where the gap that defines the figure
  begins.
- The acting arm blends **two** target poses off one rest pose — a
  mouth pose and a gesture pose — so the same two-segment limb either
  feeds its owner or talks for them. The other arm stays on the table,
  which stops the torso ending in mid-air.
- Watch what lines up *through* the glass. The brass door handles on
  the facade sat directly under the wall scroll inside, and read as
  two rods hanging off it; the scroll had to move up the wall. Two
  elements at different depths can be individually correct and still
  compose into one wrong object.
- The chopstick angle is solved so that at the mouth pose the *tip*
  lands exactly on the rim of the head circle and the hand sits in
  front of and below it. Run the sticks the other way and they are
  drawn straight across the face. They are also a darker wood than the
  dumpling, or the two merge into one pale bar against the ink.
- Chewing is a ±5 px head bob at ~13 rad/s. On a faceless head that is
  the only honest way to say there is food in it.
- `roundel()` is the single definition of the mark, called at r = 46
  on the shopfront board and r = 92 on the end card. One definition,
  two sizes — the alternative is two drawings that drift apart.
- `tracked()` draws letter-spaced text a character at a time, because
  canvas `letterSpacing` is unreliable across implementations, and the
  per-character alpha is what lets KHANG resolve one letter at a time.
- The shopfront sign is lit from the moment it is visible. A sign that
  switches on at the end of the move makes the restaurant look shut
  for the first six seconds.
- The closing drift is deliberately tiny — scale 1.0 to 1.045. Anything
  more and the complete entrance starts falling out of frame.
- The end card is drawn **after** the world transform is restored, in
  screen space, so it is unaffected by the camera and stays inside the
  central 40 % of the frame — which is what survives `object-fit:
  cover` on a portrait phone.
- Watch the glyph coverage: 囍 is not in Ma Shan Zheng and rendered as
  nothing at all. The wall scroll uses 康, which is.
