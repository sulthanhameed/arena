# The Khang entrance film

`render.cjs` draws every frame of the intro video that plays over the
homepage — ten seconds, 1920 × 1080, 30 fps, 300 frames.

It opens close on two guests at a table in a lamplit Cantonese dining
room. One of them is talking; the other lifts a dumpling with his
chopsticks, eats it, and goes on chewing. From 2.8 seconds the camera
retreats in one unbroken move, back through the window, past the red
lanterns and lattice screens, until the whole shopfront is in frame —
the board above the doors lights with the Khang logo, the street falls
away, and the film finishes on the mark alone.

Everything is drawn: the performance, the camera move, the sign and
the end card are all baked into the video, so the site only has to
play it.

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
check a change without waiting three minutes for the whole film.

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
- **The heads are real profiles, not circles.** `headPath` is a single
  bezier outline — forehead, brow, the dip at the bridge, nose, lips,
  chin, jaw, skull — and its chin control points take a `jaw`
  parameter, so the whole lower face opens rather than only a mouth
  shape moving. Over that go a brow, a lidded eye with a catchlight,
  an ear, a soft gradient down the shaded side, and the dark opening
  of the mouth with a hint of teeth: enough that the guests read as
  two particular people at the opening framing, and still resolve as
  people when they are an inch tall behind the glass.
- **Colour does the work the silhouettes used to.** Cream plaster and
  a panelled wainscot, walnut furniture, red silk lanterns with brass
  caps, celadon tea things, bamboo steamers. A solid dark dado was
  tried first and read as a brown band across the bottom third of the
  opening shot, swallowing the chairs — hence the cream panelling.
- The guests wear the two halves of the brand: jade green and
  charcoal, over a cream mandarin collar.
- Arms are round-capped strokes interpolated between a rest pose and a
  mouth pose; the chopsticks rotate with them. The far arm is drawn
  *behind* the torso — over it, the upper arm reads as a strap across
  the chest.
- `tracked()` draws letter-spaced text a character at a time, because
  canvas `letterSpacing` is unreliable across implementations, and the
  per-character alpha is what lets the name resolve one letter at a
  time.
- **The logo is the site's own.** `logoBadge` is the navbar mark — a
  jade disc, cream ring, 康 in Ma Shan Zheng — and `logoLockupH` /
  `logoLockupV` arrange it with the Playfair wordmark and the Space
  Grotesk descriptor. The horizontal lockup goes on the shopfront
  board; the vertical one is the end card. Same mark in both places,
  so the film hands over to a page already wearing it.
