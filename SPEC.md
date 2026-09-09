# EMO — Technical Specification

Current-state specification of the EMO app, for future reference. Descriptive of
what is in the tree today (post `#12 chore: modernize stack`). For the history of
how the stack got here, see [`MIGRATION.md`](./MIGRATION.md).

Last reviewed: 2026-09-09.

---

## 1. What it is

A single-page browser demo: it opens the webcam, runs the full `face-api.js`
analysis pipeline on each animation tick, draws the results on a canvas overlay,
and shows a text panel for the first detected face. No backend inference, no data
leaves the browser, no persistence.

There is one stub API route (`GET /api/hello`) left over from `create-next-app`;
it is not used by the UI.

---

## 2. Stack (as built)

| Area | Version / detail |
| --- | --- |
| Node | `24.20.0` (`.tool-versions`); `package.json` `engines.node >= 20.9.0` |
| Framework | Next.js **16.3.4**, App Router (`src/app`), Turbopack (default), SWC — no custom Babel |
| React | **19.2.x** + `react-dom@19`; no `@ant-design/v5-patch-for-react-19` (antd 6 needs none) |
| UI kit | Ant Design **6.6.3**, CSS-in-JS. `@ant-design/cssinjs` + `@ant-design/nextjs-registry` for SSR style extraction. No Less, no `babel-plugin-import`, no `@ant-design/icons` |
| Detection | `@feedsbrain/face-api.js` **0.22.3** (GitHub Packages). Same 0.22.x public API as `justadudewhohacks/face-api.js`; bundles `@tensorflow/tfjs-core` + `@tensorflow/tfjs-backend-webgl` + `-backend-cpu`, which self-register a backend |
| TypeScript | **5.9.3** — `target: ES2022`, `module: esnext`, `moduleResolution: bundler`, `jsx: react-jsx`, `strict: false`, `paths` `@/* → ./src/*`, `plugins: [{ name: "next" }]` |
| Lint | ESLint **9** flat config — `eslint.config.mjs` spreads `eslint-config-next/core-web-vitals` (which bundles `next` + `next/typescript`); `lint` script is `eslint` (Next 16 removed `next lint`) |
| Formatting | Prettier — `singleQuote`, no semicolons, `trailingComma: none`, `endOfLine: lf` |
| Container | `node:24-bookworm-slim`, 2-stage; runtime runs `npm run start:prod` (`next start -p 80`). No `output: 'standalone'` (Next 16 warns it is incompatible with `next start`) |
| CI | `.github/workflows/docker-image.yml` — `docker build` only, on a self-hosted runner |

---

## 3. Dependency delivery: `@feedsbrain/face-api.js`

The upstream `face-api.js@0.22.2` is unmaintained (TF.js 1.x). EMO uses the
`feedsbrain` fork, which tracks TensorFlow.js 4.x and TypeScript 5.

- **Distribution:** published to **GitHub Packages** as the scoped package
  `@feedsbrain/face-api.js`, version `^0.22.3`. It is *not* on the public npm
  registry, and it is no longer consumed as a `github:` git URL (an earlier
  iteration did — see `MIGRATION.md` §1; that approach was dropped because it
  required committing the fork's `build/` output and pinning a fork SHA).
- **Registry auth:** `.npmrc` (committed) —

  ```
  @feedsbrain:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
  ```

  `npm install` / `npm ci` therefore needs `GITHUB_TOKEN` in the environment,
  holding a token with the `read:packages` scope. Missing token ⇒ 401 on that
  package only.
- **Import path:** `import * as faceapi from '@feedsbrain/face-api.js'`
  (`src/lib/face.ts`).
- **No `@tensorflow/tfjs`** is a direct dependency — the fork pulls
  `tfjs-core` + the two backends and its ESM build imports them so they
  register without an explicit `tf.setBackend()`.
- **Model weights** in `public/static/models/` are the stock `face-api.js`
  weight/manifest format and are unchanged; the fork loads them as-is.

---

## 4. Source layout

```
src/
  app/
    layout.tsx          root layout: <html>/<body>, <AntdRegistry> → <ThemeProvider>, metadata
    providers.tsx       'use client' — ConfigProvider theme token (colorPrimary #14424d)
    page.tsx            server component → <CameraDetection />
    api/hello/route.ts  Route Handler: GET → { name: 'John Doe' } (unused by UI)
  components/
    CameraDetection.tsx 'use client' wrapper — dynamic(() => import('./WebcamDetect'), { ssr: false })
                        inside <DetectionLayout>
    WebcamDetect.tsx    'use client' — webcam capture, detection loop wiring, results panel
    GlobalFooter.tsx    footer, renders public/version.json appVersion
  layouts/
    DetectionLayout.tsx antd Layout/Row/Col shell
  lib/
    face.ts             model loading + per-tick detection pipeline (unchanged 0.22.x free-function API)
    types.ts            asyncForEach helper
  styles/
    globals.css         minimal reset (imported from layout.tsx)
public/
  static/models/*       face-api.js weights + manifests (ssd_mobilenetv1, tiny_face_detector,
                        face_landmark_68[_tiny], face_recognition, face_expression,
                        age_gender, mtcnn) — mtcnn present but not loaded by the app
  version.json          { "appVersion": "development" } — patched at Docker build
  favicon.ico, vercel.svg
```

`.module.css` files sit next to `DetectionLayout`, `WebcamDetect`, `GlobalFooter`.

Removed in the modernization: `src/pages/*`, `.babelrc.js`, `.eslintrc.json`,
`next.config.js`, `src/styles/variables.less`.

---

## 5. Runtime behaviour

### 5.1 Model loading — `loadModels(model)` in `src/lib/face.ts`

Loads from `/static/models`, in parallel:

1. Detector — `loadSsdMobilenetv1Model` (default) **or** `loadTinyFaceDetectorModel`
   when `model === 'tinyface'`.
2. `loadFaceLandmarkModel` (68-point).
3. `loadFaceRecognitionModel`.
4. `loadFaceExpressionModel`.
5. `loadAgeGenderModel`.

Sets the module-level `isModelLoaded` flag when all resolve.

### 5.2 Camera — `WebcamDetect.tsx`

- On mount: `loadModels(currentModel)` then, if still mounted, `startVideoCapture()`.
- `startVideoCapture` requests `getUserMedia({ audio: false, video: { width: 1280, height: 720 } })`,
  pipes the stream to the `<video>`, plays on `loadedmetadata`. If the refs are not
  ready it retries every 500 ms.
- `currentModel = model ?? 'mobilenet'` (prop-driven; no state).
- On unmount: an `active` flag guards the late `loadModels().then()`, and cleanup
  calls `stopVideoCapture()` which stops every track and nulls `srcObject`
  (App Router has no `router.events` route-change hook).

### 5.3 Detection loop — `onStartVideoHandle(video, canvas, callback, testMode)`

Kicked off by the `<video onLoadedMetadata>` handler. Each tick:

1. If paused/ended or models not loaded → `setTimeout` reschedule.
2. Copy the current video frame to an offscreen canvas sized to the video's
   `getBoundingClientRect()`.
3. `faceapi.detectAllFaces(frame, new SsdMobilenetv1Options())`
   `.withFaceLandmarks().withFaceDescriptors().withFaceExpressions().withAgeAndGender()`.
4. `matchDimensions` + `resizeResults` to the overlay canvas.
5. Draw: landmarks (only if `drawLandmarks` — module-level, default `true`),
   detections, expressions (min score 0.05), and a `DrawBox` per face.
6. `callback(results)` → panel state.
7. `setTimeout` reschedule (no `requestAnimationFrame`; runs as fast as the
   event loop allows).

> Note: step 3 always constructs `SsdMobilenetv1Options` even when the
> `tinyface` detector was loaded — the `tinyface` branch is reachable via the
> `model` prop but nothing in the UI sets it.

### 5.4 Results panel

For `results[0]` only: gender + `genderProbability`, age (rounded), and every
expression key with its score to 5 dp. Cards are hidden until their value is
populated. Multi-face output is drawn on the canvas but not tabulated.

---

## 6. Configuration & theming

- **Theme:** antd `ConfigProvider` token `colorPrimary: '#14424d'` in
  `src/app/providers.tsx` (a client component — `ConfigProvider` uses context).
  Replaces the deleted `variables.less` `@primary-color`.
- **`next.config.mjs`:** `{ reactStrictMode: true }` only.
- **Metadata:** title/description in `src/app/layout.tsx` `export const metadata`.
- **Version string:** `public/version.json` `appVersion` — `"development"` in the
  repo, `sed`-patched to `APP_VERSION` during `docker build`, shown in the footer.

---

## 7. Functional requirements

1. Request `getUserMedia({ video: 1280×720, audio: false })` on load; stream to `<video>`.
2. Load the five model groups from `/static/models` (SSD MobileNet v1 detector by default).
3. Per tick, run detect → landmarks → descriptors → expressions → age/gender on the current frame.
4. Draw detections, optional landmarks, expressions and per-face boxes on the overlay canvas, aligned to the displayed video size.
5. Panel shows gender + probability, age, and per-expression scores for the first face.
6. Release all camera tracks on unmount.
7. Never run face-api.js / TF.js on the server — the webcam view is `dynamic(..., { ssr: false })`.

---

## 8. Non-goals

- Rewriting `src/lib/face.ts` to the `nets.*` loader API or explicit `tf.setBackend()`.
- Replacing antd, adding tests, or changing the detection models.
- Multi-face side panel (canvas draws all faces; panel is face[0] only).
- Wiring a real UI control for the `tinyface` detector or the `distanceThreshold` prop.
- `strict` TypeScript.
- Using or extending `GET /api/hello`.

---

## 9. Known gaps / follow-ups

- **Dockerfile is stale w.r.t. the dependency change.** It installs `git` "because
  face-api.js is installed from a git URL" and does not forward `GITHUB_TOKEN` to
  `npm ci`. As committed, `docker build .` fails on the
  `@feedsbrain/face-api.js` install. Fix: drop the `git` install, pass the token
  as a BuildKit secret (`RUN --mount=type=secret,id=github_token …`) or a
  throwaway build arg, and update the CI workflow to provide it.
- **CI does not build successfully** for the same reason — the workflow runs a
  bare `docker build .` with no secret.
- **antd 6 is a major.** Only the props this app hits were migrated
  (`Card` `bordered={false}` → `variant="borderless"`, `Space` `direction` →
  `orientation`). A wider audit was not done; the surface is small
  (`Row`/`Col`/`Space`/`Card`/`Layout`).
- **`react-hooks@7` refactor** in `WebcamDetect.tsx` (useCallback ordering,
  hoisted retry, dropped `currentModel` state) is behaviour-preserving but was
  only verified against lint, not a real camera lifecycle test.
- **`WebcamDetect` still typed as `React.FC`** — GlobalFooter and DetectionLayout
  were de-`React.FC`'d; WebcamDetect was not.
- **Toolchain pinned one major below latest** — TypeScript 5.9 (not 7.x) and
  ESLint 9 (not 10) for `typescript-eslint` / `eslint-config-next` compatibility.
  Runtime deps (Next, React, antd) are on the latest majors.
- **No automated tests.** No live-webcam or headless coverage of the detection
  pipeline.
- **`mtcnn` model weights** ship in `public/static/models/` but no code loads them.

---

## 10. Acceptance status

| Check | Status |
| --- | --- |
| `npm install` with `GITHUB_TOKEN` set | ✅ clean, resolves `@feedsbrain/face-api.js@0.22.3` from GitHub Packages |
| No `babel-plugin-import` / `antd-less` / `.babelrc` / `.less` in the tree | ✅ |
| `npm run build` (Next 16 / Turbopack) | ✅ TypeScript check passes; routes `○ /`, `○ /_not-found`, `ƒ /api/hello` |
| `npm run lint` (flat ESLint 9) | ✅ 0 problems |
| `next start` → `/` 200 with antd CSS-in-JS inlined; `/api/hello` 200 JSON | ✅ |
| Live webcam (boxes + expressions + age/gender updating) | ⬜ needs a browser with a camera; not exercised |
| `docker build .` | ⬜ blocked — see §9 |
