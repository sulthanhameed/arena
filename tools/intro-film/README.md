# The Khang entrance film

`render.cjs` draws every frame of the intro video that plays over the
homepage — ten seconds, 1920 × 1080, 30 fps, 300 frames.

It opens close on two guests at a table. One of them is talking; the
other lifts a dumpling with her chopsticks, eats it, and goes on
chewing. From three seconds the camera retreats in one unbroken move,
back through the window, past the lanterns and screens of the dining
room, until the whole shopfront is in frame — and the board above the
doors lights up with the brand lockup: the green roundel carrying 康,
then KHANG, a jade hairline and CHINESE · DIMSUM, the same mark the
site wears in its header.

Everything is drawn: the performance, the camera move and the sign are
all baked into the video, so the site only has to play it.

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
- **A head is one path, not two.** The jaw is rigged by rotating its
  control points about a hinge below the ear *before* the outline is
  built, so the face stays a single silhouette: no seam along the
  mouth line and no tonal step where a separately-filled jaw would
  give the rig away. The open mouth is then cut back in as a wedge
  between the two lip lines, which is what makes talking and chewing
  unmistakable at any size.
- Faces are drawn facing right and mirrored with `scale(dir, 1)`, so
  the eye, brow, ear, nose and hair all flip as one piece.
- Arms are round-capped strokes interpolated between a rest pose and a
  mouth pose; the chopsticks rotate with them, and the mouth pose is
  solved so the chopstick *tip* lands on the lips rather than spearing
  through the cheek. The far arm is drawn *behind* the torso — over
  it, the upper arm reads as a strap across the chest.
- `tracked()` draws letter-spaced text a character at a time, because
  canvas `letterSpacing` is unreliable across implementations, and the
  per-character alpha is what lets KHANG resolve one letter at a time.
- The closing push is deliberately tiny — scale 1.0 to 1.12. Anything
  more and the complete entrance, which the sign belongs to, starts
  falling out of frame.
- Watch the glyph coverage: 囍 is not in Ma Shan Zheng and rendered as
  nothing at all. The wall scroll uses 康, which is.
