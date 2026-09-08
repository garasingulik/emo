# EMO — Modernization Spec (as built)

Face and Emotion Detection demo (webcam → face detection, landmarks, expressions,
age/gender) built on Next.js + face-api.js (TensorFlow.js).

This document records the modernization completed on **2026-09-08**. It is
descriptive, not a plan — see `MIGRATION.md` for the step-by-step of how it was
done.

## 1. Goals

- Move to the current Node.js release and the latest Next.js.
- Replace the unmaintained `face-api.js@0.22.2` with the modernized fork
  `feedsbrain/face-api.js` (TensorFlow.js 4.x).
- Upgrade the UI stack (React, antd) and remove now-obsolete build plugins.
- Migrate to the **App Router** (`src/app`).
- No behavioural change: same detection pipeline, same on-screen output.

## 2. Baseline (before)

| Area        | Version / detail                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Node        | 14.17.3 (`.tool-versions`)                                                                                |
| Next.js     | 11.1.2 (Pages Router, `src/pages`)                                                                        |
| React       | 17.0.2                                                                                                    |
| face-api.js | 0.22.2 (`justadudewhohacks`)                                                                              |
| antd        | 4.16.13 + `@ant-design/icons@4` (imported but unused)                                                     |
| Build glue  | `.babelrc.js` (forces Babel), `babel-plugin-import`, `next-plugin-antd-less`, `src/styles/variables.less` |
| TypeScript  | 4.4.2, `target: es5`                                                                                      |
| ESLint      | 7.32.0 + `eslint-config-next@11`, `.eslintrc.json`                                                        |
| Container   | `node:14.17.3-buster`, 2-stage, `next start -p 80`                                                        |
| CI          | `.github/workflows/docker-image.yml`                                                                      |

## 3. Target state (delivered)

| Area        | Delivered                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Node        | **24.20.0** (`.tool-versions`); `engines.node >= 20.9.0`. Dockerfile `node:24-bookworm-slim`; CI unchanged (builds the image).      |
| Next.js     | **16.3.4** — App Router (`src/app`), Turbopack (default), SWC (no custom Babel).                                                     |
| React       | **19.2.x** + `react-dom@19`, `@types/react@19`, `@types/react-dom@19`. No `@ant-design/v5-patch-for-react-19` (antd 6 needs none).   |
| face-api.js | `github:feedsbrain/face-api.js#master`, pinned in the lockfile to commit `7cc8a41`. Same 0.22.2 public API; bundles TF.js 4.x.       |
| antd        | **6.6.3**, CSS-in-JS. No Less, no `babel-plugin-import`, no `@ant-design/icons` (was unused).                                        |
| antd SSR    | `@ant-design/nextjs-registry` `AntdRegistry` in `src/app/layout.tsx`; `@ant-design/cssinjs` as an explicit dep.                     |
| Theme       | primary `#14424d` in `ConfigProvider theme={{ token: { colorPrimary } }}` — `src/app/providers.tsx` (`'use client'`).               |
| TypeScript  | **5.9.3**, `target: ES2022`, `moduleResolution: "bundler"`, `paths` `@/* → src/*`, `plugins: [{ name: "next" }]`. `strict: false`.   |
| ESLint      | **9.x** flat config (`eslint.config.mjs`) extending `eslint-config-next/core-web-vitals` (v16 ships flat config). `next lint` removed → `lint` script is `eslint`. |
| Container   | `node:24-bookworm-slim`, 2-stage, keeps `npm run start:prod` (`next start -p 80`). `git` installed in the build stage for the git dep. `output: 'standalone'` was tried and reverted (it warns under `next start`). |

### Source layout (after)

- `src/app/layout.tsx` — root layout: `<html>`/`<body>`, `AntdRegistry`, metadata.
- `src/app/providers.tsx` — `'use client'`; `ConfigProvider` theme token.
- `src/app/page.tsx` — server component, renders `<CameraDetection />`.
- `src/app/api/hello/route.ts` — Route Handler (`GET` → `{ name: 'John Doe' }`).
- `src/components/CameraDetection.tsx` — `'use client'`; `dynamic(() => import('./WebcamDetect'), { ssr: false })` inside `DetectionLayout`.
- `src/components/WebcamDetect.tsx` — `'use client'`; webcam capture + results UI.
- `src/lib/face.ts` — **unchanged**: model loading + detection loop (`onStartVideoHandle`), still the `loadSsdMobilenetv1Model` / `loadFaceLandmarkModel` / … free-function API and `SsdMobilenetv1Options`.
- `src/lib/types.ts` — **unchanged** (`asyncForEach`).
- `src/layouts/DetectionLayout.tsx`, `src/components/GlobalFooter.tsx` — de-`React.FC`'d, typed props.
- `public/static/models/*` — face-api.js model weights + manifests, **unchanged** (the fork loads the same format).
- `public/version.json` — `{ "appVersion": "development" }`, still patched at Docker build.

Removed: `.babelrc.js`, `.eslintrc.json`, `next.config.js` (→ `next.config.mjs`),
`src/styles/variables.less`, `src/pages/*`.

## 4. Functional requirements (unchanged)

1. On load: request `getUserMedia({ video: 1280x720, audio: false })`, stream to `<video>`.
2. Load models from `/static/models`: SSD MobileNet v1 detector (default), 68-point
   landmarks, recognition, expression, age/gender.
3. Detection loop per tick: `detectAllFaces(...).withFaceLandmarks()
   .withFaceDescriptors().withFaceExpressions().withAgeAndGender()`.
4. Draw detections, landmarks (toggleable via `drawLandmarks`), expressions, and boxes on the overlay canvas.
5. Panel shows gender + probability, age, and per-expression scores for face[0].
6. Stop all camera tracks when the view unmounts (App Router has no route-change
   events; the old `router.events` teardown became an effect-cleanup call).

## 5. Non-goals (unchanged from the original pass)

- Rewriting `src/lib/face.ts` to the `nets.*` loader API or an explicit
  `tf.setBackend()` — the fork keeps the 0.22.2 surface and self-registers a
  backend, so the existing code runs as-is.
- Replacing antd, adding tests, or changing the detection models.
- Multi-face UI (still only face[0] in the side panel).
- `strict` TypeScript.

## 6. Acceptance criteria — status

- [x] `npm install` clean; no `babel-plugin-import` / `next-plugin-antd-less` / `.babelrc.js` / `.less` left.
- [x] `npm run dev` and `npm run build` succeed on the SWC/Turbopack pipeline (no "babel config found" notice).
- [x] `npm run lint` passes (flat ESLint 9).
- [x] `next start`: `/` → 200 with antd CSS-in-JS styles inlined; `/api/hello` → 200 JSON.
- [ ] Live webcam behaviour (boxes + expressions + age/gender updating) — needs a
      browser with a camera; not exercisable headless.
- [ ] `docker build .` — not run in this pass; Dockerfile updated to Node 24 +
      standalone-free 2-stage.

## 7. Known risk areas / follow-ups

- **Fork must be pushed**: `package-lock.json` pins `feedsbrain/face-api.js`
  commit `7cc8a41` ("chore: make package git-installable"). Until that commit is
  on the fork's `master`, `npm ci` cannot resolve the dependency. See
  `./.fork-update/PUSH-INSTRUCTIONS.md`.
- **antd 6 is a major** — watched for removed/renamed props; the ones this app
  uses changed: `Card bordered={false}` → `variant="borderless"`,
  `Space direction=` → `orientation=`.
- **TF.js backend** — the fork's ES build imports `@tensorflow/tfjs-backend-webgl`
  + `-cpu`, so they self-register; no explicit `setBackend` needed. The webcam
  view is `ssr: false` so none of it evaluates on the server.
- **Toolchain pinned one step below bleeding edge** — TypeScript `5.9` (not `7.x`)
  and ESLint `9` (not `10`) for `typescript-eslint` / `eslint-config-next`
  compatibility. Runtime deps (Next, React, antd) are on the latest majors.
- **`next-env.d.ts` / `tsconfig.json`** are rewritten by `next build`
  (`jsx: preserve` → `react-jsx`, added `.next/**/types` includes) — expected.
