# EMO — Face & Emotion Detection

Webcam demo that runs face detection, 68-point landmarks, face recognition
descriptors, expression scores and age/gender estimation entirely in the browser
with [`@feedsbrain/face-api.js`](https://github.com/feedsbrain/face-api.js)
(a maintained fork of `face-api.js` on TensorFlow.js 4.x).

See [`SPEC.md`](./SPEC.md) for the full technical specification and
[`MIGRATION.md`](./MIGRATION.md) for the Node 14 / Next 11 → Node 24 / Next 16
modernization record.

## Stack

| | |
|---|---|
| Runtime | Node.js 24 (`.tool-versions` → `24.20.0`; `engines.node >= 20.9.0`) |
| Framework | Next.js 16 — App Router (`src/app`), Turbopack, SWC (no Babel) |
| UI | React 19 + Ant Design 6 (CSS-in-JS via `@ant-design/nextjs-registry`, no Less) |
| Detection | `@feedsbrain/face-api.js` 0.22.3 — bundles `@tensorflow/tfjs-core` + WebGL/CPU backends |
| Language | TypeScript 5.9 (`strict: false`, `target: ES2022`, `moduleResolution: bundler`) |
| Lint | ESLint 9 flat config (`eslint.config.mjs`) extending `eslint-config-next/core-web-vitals` |

## Getting the detection library

`@feedsbrain/face-api.js` is **not on the public npm registry**. It is published
to **GitHub Packages**, so `npm install` needs an authenticated registry:

- `.npmrc` (committed) points the `@feedsbrain` scope at
  `https://npm.pkg.github.com` and reads the token from `${GITHUB_TOKEN}`.
- Export a GitHub personal access token with the **`read:packages`** scope
  before installing:

  ```bash
  export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
  npm install
  ```

Without `GITHUB_TOKEN` set, `npm install` / `npm ci` fails to resolve that one
dependency (401 from `npm.pkg.github.com`).

## Development

```bash
export GITHUB_TOKEN=…   # once per shell, see above
npm install
npm run dev             # http://localhost:3000
npm run build           # Next 16 / Turbopack production build
npm start               # serve the build on :3000
npm run start:prod      # serve on :80 (used by the Docker image)
npm run lint            # eslint (Next 16 removed `next lint`)
```

Open the app, allow camera access, and the detection overlay + side panel
(gender, age, per-expression scores for the first face) update live.

The pre-trained weights ship in `public/static/models/` and are served from
`/static/models` — `src/lib/face.ts` loads them from there.

## Docker

```bash
docker build -t emo:latest .
docker run --rm -p 80:80 emo:latest
```

Multi-stage build on `node:24-bookworm-slim`: the build stage runs `npm ci` and
`next build`, the runtime stage copies `node_modules` + `.next` + `public` and
runs `npm run start:prod` (`next start -p 80`).

> **Note:** the committed `Dockerfile` still assumes the old git-URL dependency
> and does **not** forward a `GITHUB_TOKEN` to `npm ci`, so `docker build .` (and
> the CI workflow) currently fails on the `@feedsbrain/face-api.js` install. The
> token needs wiring in as a BuildKit secret or a throwaway build arg first — see
> `SPEC.md` §9 and `MIGRATION.md` §7.

`APP_VERSION` (build arg) is patched into `public/version.json` and rendered in
the footer.

## CI

`.github/workflows/docker-image.yml` runs `docker build` on a self-hosted
`[self-hosted, docker]` runner for pushes and PRs against `main`.
