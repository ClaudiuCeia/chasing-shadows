# chasing_shadow

To install dependencies:

```bash
bun install
```

To run:

```bash
bun dev
```

Profiler helpers are available in the browser console:

```ts
window.__tickProfiler.start()
window.__tickProfiler.stop()
window.__tickProfiler.report()
window.__tickProfiler.clear()
window.__tickProfiler.scanOffscreenColliders()
```

Asset credits:
- `assets/cardboard-box` by Dani Maccari (`https://dani-maccari.itch.io/`), used under the attribution terms in `assets/cardboard-box/README.txt`.

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
