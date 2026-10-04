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

The guests are **pictograms** — a circle for the head held clear of
the shoulders, a tapered body, round-capped limbs, no face at all.
That is a deliberate constraint, not a shortcut: with no features to
act with, every beat has to be carried by pose, which is why the
talker gestures and the eater nods while he chews.

The end card is **white and empty of the restaurant**. A mark fighting
a lit shopfront for attention loses; given its own ground it reads in
a single glance, and because the site behind the overlay is also
white, the film hands over without a visible seam.

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
- Figures are drawn facing right and mirrored as a whole with
  `scale(dir, 1)`, so body, limbs and hair-bun flip as one piece. The
  left guest keeps a bun: it is the only asymmetry on the head, and
  without it a head tilt on a plain circle is invisible.
- The acting arm blends **two** target poses off one rest pose — a
  mouth pose and a gesture pose — so the same two-segment limb either
  feeds its owner or talks for them. The other arm stays on the table,
  which stops the torso ending in mid-air.
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
