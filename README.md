# Vortex Portfolio Template

A single-page photography / portfolio site built around a swirling cylindrical vortex of images rendered on WebGL. Clicking the central image — or any image in the background — zooms it up into a fullscreen detail overlay with a per-image caption. Includes a second route (`/info`) with a bio + contact layout.

## Features

- WebGL cylindrical image vortex (Three.js + custom instanced shaders, atlas-packed textures)
- Smooth scroll driven by Lenis; wheel drives the vortex rotation / z-flow
- Clickable images with a zoomed-in detail overlay (fade + scale-in, ESC / click-outside to close)
- Second route `/info` with a two-column bio + sticky contact layout
- Fully config-driven: all text and images live in `src/config.ts`

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v3 (utilities only, not heavily used in this template)
- Three.js for WebGL, GSAP interpolation, Lenis smooth scroll
- `react-router` v7 for client routing
- shadcn/ui component kit is present in `src/components/ui/` (unused by default)

## Quick Start

1. Clone this repository
2. Install dependencies: `npm install`
3. Edit `src/config.ts` with your content
4. Add images to `public/images/`
5. Run dev server: `npm run dev`
6. Build for production: `npm run build`

## Configuration

All content is configured in `src/config.ts`.

### `siteConfig`

```typescript
export const siteConfig: SiteConfig = {
  language: "",     // BCP-47 language code, e.g. "en", "zh-CN". Leave empty to inherit.
  brandName: "",    // Logo in top-left on both pages. ~14 chars max to stay on one line.
  copyright: "",    // Centered at bottom of home, end of info page. e.g. "© 2026 Studio Name"
};
```

### `navigationConfig`

```typescript
export const navigationConfig: NavigationConfig = {
  infoLinkLabel: "", // Top-right link on home that routes to /info. e.g. "Info", "About"
};
```

### `infoPageConfig`

The `/info` sub-page.

```typescript
export const infoPageConfig: InfoPageConfig = {
  backLinkLabel: "",     // Top-right link that routes home. e.g. "Back", "Home"
  eyebrow: "",           // Small uppercase lead-in above the title
  title: "",             // Large serif heading
  paragraphs: [],        // Bio paragraphs in order. Recommended 2-4.
  contactLabel: "",      // Uppercase eyebrow above the contact list, e.g. "Contact"
  contactEntries: [],    // Array of { label, value, href? }
};
```

Each `contactEntries` entry:

```typescript
{
  label: "Email",                     // left column, muted
  value: "hello@example.com",         // right column; "\n" renders as <br>
  href: "mailto:hello@example.com",   // optional; makes value clickable
}
```

### `overlayConfig`

Labels used inside the clicked-image detail overlay.

```typescript
export const overlayConfig: OverlayConfig = {
  frameDetailLabel: "",  // Appended after the image's category in the eyebrow
  fileLabel: "",         // Left label in the meta strip for the file name
  seriesLabel: "",       // Left label in the meta strip for the series name
  closeLabel: "",        // Text on the close button below the description
};
```

### `galleryConfig`

All images shown in the vortex AND in the detail overlay.

```typescript
export const galleryConfig: GalleryConfig = {
  images: [
    {
      src: "/images/portrait_01.jpg",
      category: "Portrait",
      title: "Strangers — No. 01",
      description: "...",
    },
  ],
};
```

## Required Images

Put images in `public/images/`. The vortex fills a cylindrical field with 600 instances pulling randomly from your image list, so roughly 20-60 images produces a full-looking vortex. Fewer images means more repetition in the background but the page still works with as few as 1.

Recommended specs:
- 4:5 portrait orientation works best for the cylinder cells (256×320 atlas cell)
- JPG, ~1600px on the long edge (high-res is used in the detail overlay zoom)
- Avoid pure white backgrounds — the page background is white

## Design

**Colors:**
- Background: `#ffffff`
- Text: `#000000`
- Overlay: `rgba(10,10,10,0.94)` with backdrop-blur

**Fonts:**
- Display / headings: `'Times New Roman', serif`
- Body / UI: `system-ui, -apple-system, sans-serif`
- Meta strip file name: monospace

**Animations / effects:**
- Instanced GLSL vortex — z-flow modulus looping, per-lane speed variation, scroll-velocity driven rotation
- Center plane shows the currently-scrolled image, texture updates every frame
- Overlay animates opacity + scale-in (0.35s ease)
- Lenis smooth scroll chains into the vortex's wheel handler

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Project Structure

```
7-vortex-gallery-frontend/
├── README.md
├── package.json
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── public/
│   └── images/              # user-supplied photographs
└── src/
    ├── config.ts            # ⭐ all content goes here
    ├── main.tsx
    ├── App.tsx              # routes: / and /info
    ├── index.css
    ├── pages/
    │   ├── Home.tsx         # vortex + overlay
    │   └── Info.tsx         # bio + contact
    ├── components/
    │   ├── ImageDetailOverlay.tsx
    │   └── ui/              # shadcn components (unused by default)
    ├── lib/
    │   ├── VortexGallery.ts # WebGL vortex (logic, no content)
    │   └── utils.ts
    └── hooks/
```

## Notes

- Don't modify component files unless fixing a bug — all content lives in `src/config.ts`
- If `galleryConfig.images` is empty, `Home` renders `null`; same for `Info` when its fields are all empty
- The vortex's WebGL shader math is fragile; avoid tweaking `src/lib/VortexGallery.ts` unless you know what you're changing
