# EMO — Migration Record (Node 14 / Next 11 → Node 24 / Next 16)

What was actually changed on **2026-09-08** to modernize the app, in the order it
was done. Reproduce top-to-bottom on a fresh branch; commit per section so
regressions bisect cleanly.

Target versions were "latest as of the migration date": Next **16.3.4**, React
**19.2**, antd **6.6.3**, Node **24.20.0**, TypeScript **5.9.3**, ESLint **9**.

> **Update (2026-09-09):** the `face-api.js` fork is no longer consumed as a
> `github:` git URL. It is now the GitHub Packages scoped package
> `@feedsbrain/face-api.js@^0.22.3`. §1 below is kept as the record of the
> git-URL attempt; **§1c is the approach that shipped**. See also `SPEC.md` §3.

## 0. Prep

- `git checkout -b chore/modernize`
- `.tool-versions` → `nodejs 24.20.0` (dropped the `python 3.9.5` line — only the
  old native `canvas`/`tfjs-node` toolchain needed it; the browser build doesn't).
- Delete `node_modules` and `package-lock.json` — the old tree is unresolvable.

## 1. `face-api.js` → the `feedsbrain` fork (git-installable) — SUPERSEDED by §1c

> Kept for the record. What shipped is the GitHub Packages package in §1c; the
> git-URL dependency and the committed `build/` output described here were
> dropped.

The fork is **not published to npm** and does **not commit its build output**, so
`npm i github:feedsbrain/face-api.js` would install a package whose
`main`/`module` point at a missing `build/`. Two-part fix:

### 1a. Fork side — one commit, `7cc8a41` "chore: make package git-installable"

In a clone of `feedsbrain/face-api.js` (branched off `master` @ `b14726b`):

- `.gitignore`: remove the `build` line.
- `package.json`: add
  ```json
  "types": "./build/commonjs/index.d.ts",
  "exports": {
    ".": {
      "types": "./build/commonjs/index.d.ts",
      "import": "./build/es6/index.js",
      "require": "./build/commonjs/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["build", "dist", "README.md", "LICENSE"]
  ```
- `npm ci && npm run build` (Node 24) — produces `build/commonjs` + `build/es6`
  (`tsc` + `tsc-es6`); commit `build/` (~4.8 MB) next to the already-committed
  `dist/` UMD bundle.
- **No `prepare` script** — with `build/` committed, npm uses the checkout
  as-is; a `prepare` would force every consumer to reinstall the fork's
  devDeps (`canvas`, `@tensorflow/tfjs-node` native addons) on `npm i`.

This commit is delivered as a bundle + patch in `./.fork-update/`
(`PUSH-INSTRUCTIONS.md`). **It must land on the fork's `master`** or `npm ci`
here fails on this one dependency. Prefer the bundle: it fast-forwards `master`
and keeps SHA `7cc8a41`, which the emo `package-lock.json` pins.

### 1b. App side

- `package.json` dependency: `"face-api.js": "github:feedsbrain/face-api.js#master"`.
  `package-lock.json` resolves it to
  `git+https://github.com/feedsbrain/face-api.js.git#7cc8a41…` with **no**
  `hasInstallScript` (confirms the committed `build/` is used directly).
- `@tensorflow/tfjs` is **not** added — the fork depends on
  `@tensorflow/tfjs-core` + `-backend-cpu` + `-backend-webgl` itself and its ES
  build imports the backends so they self-register.
- **`src/lib/face.ts` is unchanged.** The fork preserves the 0.22.2 surface:
  `loadSsdMobilenetv1Model` / `loadTinyFaceDetectorModel` / `loadFaceLandmarkModel`
  / … and `new faceapi.SsdMobilenetv1Options()` all still work, no
  `tf.setBackend()` call needed.
- `public/static/models/*` unchanged — same weight format.

### 1c. What shipped — GitHub Packages scoped package

The git-URL route (§1a/§1b) meant committing the fork's ~4.8 MB `build/` output
and pinning a fork SHA in `package-lock.json`. Instead the fork was **published
to GitHub Packages** as `@feedsbrain/face-api.js` and consumed as a normal
semver dependency:

- `package.json`: `"@feedsbrain/face-api.js": "^0.22.3"` (the `face-api.js` key
  and the `github:` URL are gone).
- `.npmrc` (committed):
  ```
  @feedsbrain:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
  ```
  `npm install` / `npm ci` now needs `GITHUB_TOKEN` in the environment with the
  `read:packages` scope. Nothing else in the install is authenticated.
- `package-lock.json` resolves it to
  `https://npm.pkg.github.com/download/@feedsbrain/face-api.js/0.22.3/…` — a
  tarball, no `hasInstallScript`, no git checkout.
- **Import path changed:** every `from 'face-api.js'` → `from '@feedsbrain/face-api.js'`
  (only `src/lib/face.ts` imports it).
- `src/lib/face.ts` logic is otherwise unchanged — the fork keeps the 0.22.x
  free-function API (`loadSsdMobilenetv1Model` / `loadFaceLandmarkModel` / … and
  `new SsdMobilenetv1Options()`), still self-registers a TF.js backend, still no
  `@tensorflow/tfjs` direct dep.
- The `./.fork-update/` bundle / `PUSH-INSTRUCTIONS.md` and the "fork commit must
  be pushed to master" risk are obsolete.

## 2. React 17 → 19

- `react@19` / `react-dom@19`; `-D @types/react@19 @types/react-dom@19 @types/node@24`.
- `GlobalFooter.tsx`: drop `React.FC<{}>` and the `React` import → plain arrow
  component.
- `WebcamDetect.tsx`: typed refs
  `useRef<HTMLVideoElement>(null)` / `useRef<HTMLCanvasElement>(null)`, null-guard
  before `.srcObject` / `.getTracks()`.
- React 19's `eslint-plugin-react-hooks@7` (pulled in by `eslint-config-next@16`)
  promotes `react-hooks/immutability` and `react-hooks/set-state-in-effect` to
  **errors**. In `WebcamDetect.tsx`:
  - `startVideoCapture` / `stopVideoCapture` → `useCallback`, declared **before**
    the effects that reference them.
  - the self-recursive `setTimeout(startVideoCapture, …)` retry → a hoisted inner
    `async function attempt() { … setTimeout(attempt, 500) … }`.
  - `currentModel` was `useState` with a setter only ever called inside an effect
    (a `set-state-in-effect` error) → plain `const currentModel = model ?? 'mobilenet'`.
- **No `@ant-design/v5-patch-for-react-19`** — antd 6 supports React 19 natively.

## 3. Next.js 11 → 16 + App Router

- `next@16`; `-D eslint-config-next@16 eslint@9`.
- **Delete `.babelrc.js`** and drop `babel-plugin-import` — re-enables SWC (and
  Turbopack, now the default bundler; a stray babel config would silently pull
  Babel back in).
- `next.config.js` → **`next.config.mjs`**, Less wrapper removed:
  ```js
  /** @type {import('next').NextConfig} */
  const nextConfig = { reactStrictMode: true }
  export default nextConfig
  ```
  Drop `next-plugin-antd-less`.
  (`output: 'standalone'` was tried for a smaller Docker image and reverted —
  Next 16 warns `"next start" does not work with "output: standalone"`, which
  breaks the `start` / `start:prod` scripts.)
- **Pages Router → App Router.** Delete `src/pages/`. Add:
  - `src/app/layout.tsx` — root layout (`<html lang="en">`/`<body>`), wraps
    children in `<AntdRegistry>` then `<ThemeProvider>`; `export const metadata`;
    `import '../styles/globals.css'`.
  - `src/app/providers.tsx` — `'use client'`; `ConfigProvider` with the theme
    token (context → must be a client component).
  - `src/app/page.tsx` — server component, returns `<CameraDetection />`.
  - `src/app/api/hello/route.ts` — `export const GET = () => NextResponse.json({ name: 'John Doe' })`
    (replaces `pages/api/hello.js`).
  - `src/components/CameraDetection.tsx` — `'use client'`;
    `const WebcamDetect = dynamic(() => import('./WebcamDetect'), { ssr: false })`
    inside `<DetectionLayout>`. `ssr: false` keeps face-api.js / TF.js (which
    touch `window`/`document` at import) off the server. A Server Component
    can't pass `ssr: false`, hence this client wrapper.
- `src/components/WebcamDetect.tsx` gets `'use client'`.
- **`router.events` is gone in the App Router.** `useRouter().events.on('routeChangeStart', stopVideoCapture)`
  → the mount `useEffect`'s cleanup calls `stopVideoCapture()` directly (plus an
  `active` flag so a late `loadModels().then()` doesn't start the camera after
  unmount).
- `src/layouts/DetectionLayout.tsx` — `React.FC<Props>` → `({ children }: Props)`,
  removed stale `eslint-disable` comments.

## 4. antd 4 → 6

- `antd@6 @ant-design/cssinjs @ant-design/nextjs-registry`.
- **`@ant-design/icons` removed entirely** — it was a dependency but nothing
  imports it.
- SSR style extraction: `<AntdRegistry>` from `@ant-design/nextjs-registry` in
  `src/app/layout.tsx` (the App Router equivalent of the old `_document.tsx`
  `StyleProvider` dance).
- Theme: `src/styles/variables.less` (`@primary-color: #14424d`) → deleted;
  `src/app/providers.tsx`:
  ```tsx
  'use client'
  import { ConfigProvider, type ThemeConfig } from 'antd'
  const theme: ThemeConfig = { token: { colorPrimary: '#14424d' } }
  export default function ThemeProvider({ children }) {
    return <ConfigProvider theme={theme}>{children}</ConfigProvider>
  }
  ```
- Component API deltas actually hit:
  - `<Card bordered={false}>` → `<Card variant="borderless">`
  - `<Space direction="vertical">` → `<Space orientation="vertical">`
  - `<Row>` / `<Col>` / `<Layout>` — unchanged.
- No `import 'antd/dist/*.css'` anywhere (there wasn't) — antd 6 injects its own.

## 5. TypeScript config

`tsconfig.json`:
- `"target": "ES2022"`, `"lib": ["dom","dom.iterable","esnext"]`.
- `"moduleResolution": "bundler"`, `"module": "esnext"`.
- `"incremental": true`; `"plugins": [{ "name": "next" }]`; `"paths": { "@/*": ["./src/*"] }`.
- `"strict": false` kept (typed refs are enough; tightening is a follow-up).
- `include` adds `.next/types/**/*.ts`.
- `-D typescript@5.9` (not `7.x` — `typescript-eslint`/`eslint-config-next` don't
  support the native TS 7 compiler yet).
- `next build` rewrites `next-env.d.ts` and flips `jsx` `preserve` → `react-jsx` —
  expected, leave it.

## 6. ESLint (flat config, `next lint` removed)

- Next 16 **removed `next lint`**; `next build` no longer lints.
- Delete `.eslintrc.json`. Add `eslint.config.mjs`:
  ```js
  import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
  export default [
    ...nextCoreWebVitals,           // v16 ships flat config; bundles next + next/typescript
    { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ]
  ```
  Do **not** wrap it in `FlatCompat` — `eslint-config-next/core-web-vitals` is
  already a flat-config array in v16, and `compat.extends()` on it throws
  `Converting circular structure to JSON`.
- `package.json` script: `"lint": "eslint"`.

## 7. Dockerfile

- Base `node:14.17.3-buster*` → `node:24-bookworm-slim` (build + runtime stages).
- Build stage: `apt-get install -y --no-install-recommends git`, then `npm ci`.
- Runtime stage: copy `node_modules`, `.next`, `public`, `package*.json`,
  `next.config.mjs` from the build stage; `CMD ["npm", "run", "start:prod"]`
  (still `next start -p 80`). No standalone (see §3).
- Keep the `sed` line patching `public/version.json`.

> **Stale — not updated for §1c.** The `git` install was for the git-URL
> dependency and is now dead weight, and `npm ci` in the build stage has no
> `GITHUB_TOKEN`, so it 401s on `@feedsbrain/face-api.js`. `docker build .`
> currently fails. Fix: drop the `git` apt install and mount the token as a
> BuildKit secret —
> `RUN --mount=type=secret,id=github_token GITHUB_TOKEN=$(cat /run/secrets/github_token) npm ci`
> — or pass it as a throwaway `--build-arg`. Tracked in `SPEC.md` §9.

## 8. CI

- `.github/workflows/docker-image.yml`: `actions/checkout@v3` → `@v4`. It only
  runs `docker build` on a self-hosted runner, so the Node bump rides along in
  the image.

> Also needs the §1c token wired through (`--secret`/`--build-arg` from an
> `secrets.GITHUB_TOKEN` / PAT) once the Dockerfile is fixed, or the build fails
> on the scoped package.

## 9. Verification — results

| Check | Result |
| --- | --- |
| `npm install` (with `GITHUB_TOKEN`) | clean, 0 vulnerabilities; `@feedsbrain/face-api.js@0.22.3` from GitHub Packages |
| `grep -R "babel-plugin-import\|antd-less\|variables.less\|\.babelrc" src` | no hits |
| `npm run build` | ✅ Next 16 / Turbopack; TypeScript check passes; routes `○ /`, `○ /_not-found`, `ƒ /api/hello` |
| `npm run lint` | ✅ 0 problems |
| `npm run dev` | ✅ `GET /` → 200 |
| `next start` | ✅ `GET /` → 200 (antd CSS-in-JS inlined, footer renders), `GET /api/hello` → 200 `{"name":"John Doe"}` |
| live webcam | not exercised (no camera) |
| `docker build` | ❌ blocked — Dockerfile not updated for §1c (no token to `npm ci`); see §7 |

## 10. Known risk areas

- **~~The fork commit must be pushed~~** — obsolete. Replaced by §1c: the fork is
  on GitHub Packages as `@feedsbrain/face-api.js@^0.22.3`; installs need
  `GITHUB_TOKEN` (`read:packages`). `./.fork-update/` is no longer relevant.
- **Docker / CI build is broken** until the Dockerfile forwards `GITHUB_TOKEN`
  to `npm ci` — see §7.
- **antd 6 major** — only the props above were touched; a wider audit wasn't done
  since the app's antd usage is small (`Row`/`Col`/`Space`/`Card`/`Layout`).
- **`react-hooks@7` errors** — the `WebcamDetect` refactor (§2) is behaviour-
  preserving but non-trivial; re-check the camera start/stop lifecycle in a real
  browser.
- **Toolchain held back**: TS `5.9` and ESLint `9` rather than the `7.x` / `10`
  that are also on npm now, for plugin compatibility. Revisit when
  `typescript-eslint` supports TS 7.
- **`target: es5` dropped** — fine for the evergreen browsers `getUserMedia`
  needs anyway.
