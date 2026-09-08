# EMO

Face and Emotion Detection demo based on Next.js and TensorFlow.js (via
[`face-api.js`](https://github.com/feedsbrain/face-api.js)).

## Stack

| | |
|---|---|
| Runtime | Node.js 24 (see `.tool-versions`; Node ≥ 20.9 required) |
| Framework | Next.js 16 — App Router (`src/app`), Turbopack |
| UI | React 19 + Ant Design 6 (CSS-in-JS, no Less build) |
| Detection | `face-api.js` (feedsbrain fork: TensorFlow.js 4.x, TypeScript 5.9) |

`face-api.js` is pulled straight from the fork's git repo:

```json
"face-api.js": "github:feedsbrain/face-api.js#master"
```

The fork commits its compiled `build/` output, so no build step runs on install.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint
```

The pre-trained weights live in `public/static/models` and are served from
`/static/models`.

## Docker

```bash
docker build -t emo:latest .
docker run --rm -p 80:80 emo:latest
```

The image is a multi-stage build on `node:24-bookworm-slim`; the runtime stage
copies `node_modules` + `.next` from the build stage and runs `next start -p 80`.
