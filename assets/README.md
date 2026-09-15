# Page assets

This page is a static HTML/CSS/JavaScript project with no build step or external runtime dependencies.

- `styles.css`: layout, local fonts, responsive styles, and reduced-motion support.
- `app.js`: scene and edit selectors, viewport-based video loading, playback controls, and accessible media dialogs.
- `manrope-*.ttf`: locally hosted Manrope fonts; see `Manrope-LICENSE.txt`.
- `hero-*.mp4`: four synchronized crops of `media/seasons_colosseum_orbit_right.mp4`. Each crop retains its 544-pixel width and removes the top 32-pixel baked-in label strip; no frames are reordered, retimed, or interpolated. The full original grid remains available in Seasonal consistency.
- `*.jpg`: first-frame video posters, generated from the corresponding original clips. Original research media remain in `media/`.

The complete paper title and benchmark values are in `index.html`. The `research-data` JSON block holds the original edit prompts and the available seasonal results.
