# Base Design System — Time Pro

Dokumen ini mendefinisikan design system yang digunakan pada aplikasi **Time Pro**. Gunakan sebagai acuan utama untuk menjaga konsistensi UI pada MVP-MVP berikutnya.

---

## 1. Font Family

| Usage | Font | Fallback |
|-------|------|----------|
| **Headings / Titles / Buttons** | `Space Grotesk` (400, 500, 600, 700) | `sans-serif` |
| **Body text / Form inputs** | `Inter` (400, 500, 600) | `sans-serif` |
| **Monospace / Meta / Dates / Stats** | `IBM Plex Mono` (400, 500) | `monospace` |

CDN Link (Google Fonts):

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## 2. Icon Library

**Bootstrap Icons v1.11.3**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
```

Usage: `<i class="bi bi-copy"></i>`

---

## 3. Color Palette

### CSS Custom Properties (`:root`)

```css
:root {
  --paper: #F6F8FB;
  --paper-line: #DCE4EE;
  --paper-line-strong: #C4D0E0;
  --paper-grid: rgba(220, 228, 238, 0.35);
  --ink: #1B3350;
  --ink-soft: #5B7290;
  --ink-faint: #8B9CB3;
  --surface: #FFFFFF;
  --gold: #C99A3B;
  --gold-soft: #F1E4C6;
  --status-done: #3F8F63;
  --status-progress: #2F6BA3;
  --status-planned: #8996A8;
  --status-risk: #B5482F;
  --cut-line: #C0392B;
  --sky: #74B9FF;
  --shadow: 0 1px 2px rgba(27,51,80,.06), 0 6px 16px rgba(27,51,80,.07);
  --radius: 0px;
}
```

### Color Usage

| Variable | Hex | Usage |
|----------|-----|-------|
| `--paper` | `#F6F8FB` | Page background, subtle hover |
| `--paper-line` | `#DCE4EE` | Subtle borders, row separators |
| `--paper-line-strong` | `#C4D0E0` | Strong borders, board outline |
| `--paper-grid` | `rgba(220,228,238,0.35)` | Background grid pattern |
| `--ink` | `#1B3350` | Primary text, button bg |
| `--ink-soft` | `#5B7290` | Secondary text |
| `--ink-faint` | `#8B9CB3` | Disabled/faint text |
| `--surface` | `#FFFFFF` | Cards, sidebar, modals |
| `--gold` | `#C99A3B` | Accent color, category |
| `--gold-soft` | `#F1E4C6` | Selected state, selection |
| `--status-done` | `#3F8F63` | Completed tasks (green) |
| `--status-progress` | `#2F6BA3` | In progress (blue) |
| `--status-planned` | `#8996A8` | Planned/unstarted (gray) |
| `--status-risk` | `#C0392B` | Risk/overdue/delete (red) |
| `--cut-line` | `#C0392B` | Today indicator line |
| `--sky` | `#74B9FF` | Operational category |

---

## 4. Category Colors & Shapes

Seven categories with distinct colors and clip-path shapes:

| Slug | Label | Variable | Hex | Shape |
|------|-------|----------|-----|-------|
| `desain` | Desain | `--status-progress` | `#2F6BA3` | Triangle |
| `pengembangan` | Pengembangan | `--ink` | `#1B3350` | Circle |
| `pengujian` | Pengujian | `--status-done` | `#3F8F63` | Pentagon/Star |
| `peluncuran` | Peluncuran | `--status-risk` | `#B5482F` | Square |
| `research` | RnD | `--gold` | `#C99A3B` | Hexagon |
| `operasional` | Operasional | `--sky` | `#74B9FF` | Irregular/Cloud |
| `lainnya` | Lainnya | `--status-planned` | `#8996A8` | Diamond |

### Today Marker (separate)

```css
.cat-today { background: #C0392B; clip-path: polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%); }
```

---

## 5. Typography Scale

| Size | Usage |
|------|-------|
| 9px | Today line label |
| 9.5px | Ruler day numbers |
| 10px | Table header text |
| 10.5px | Bar percentage |
| 11px | Eyebrow, meta info, date in todos |
| 11.5px | Legend, field labels, todo section label |
| 12px | Bar task label, evidence button |
| 12.5px | Sidebar empty, table body, ruler month, range value |
| 13px | Body text, form inputs, evidence inputs, todo input |
| 13.5px | Buttons, sidebar row name, form inputs |
| 14px | Confirm dialog message |
| 19px | Modal heading (`h2`) |
| 30px | Main project title |

### Letter Spacing

- `0.03em` — view toggle buttons
- `0.04em` — field labels
- `0.06em` — table header
- `0.08em` — today line "HARI INI"
- `0.1em` — sidebar head
- `0.14em` — eyebrow

---

## 6. Spacing System

### Padding

- `4px` — table cells
- `6px` — table body cells
- `7px` — compact inputs (todo, evidence)
- `8px` — bell icon
- `9px` — form inputs
- `10px` — inputs, buttons
- `12px` — toast, sidebar-add
- `14px` — sidebar-add button
- `16px` — sidebar row, sidebar-head padding
- `20px` — toast, app padding (min)
- `24px` — modal padding, app-header gap
- `28px` — app padding (max)
- `28px` — confirm box

### Gap

- `2px` — sidebar row inner
- `4px` — legend gap
- `6px` — sidebar row top, todo-add
- `7px` — legend item
- `8px` — evidence-add, header-actions, modal-actions-right
- `10px` — header-actions, range-row, confirm-actions, modal-actions
- `12px` — row-2 grid
- `14px` — gap (misc)
- `18px` — legend
- `20px` — app-header
- `24px` — app-header

### Fixed Heights

- Sidebar row: `52px`
- Bar: `32px` (top: `10px` inside row)
- Ruler: `56px`
- Sidebar head: `56px`

---

## 7. Border Radius

| Value | Usage |
|-------|-------|
| `0px` | Board container (default `--radius`) |
| `6px` | Board on mobile (<480px) |
| `7px` | Form inputs, bars, todo/evidence inputs |
| `8px` | Buttons, view toggle, bell, toast, link-danger |
| `12px` | Confirm dialog box |

---

## 8. Shadows

```css
--shadow: 0 1px 2px rgba(27,51,80,.06), 0 6px 16px rgba(27,51,80,.07);
/* Used on: board, buttons (.btn-primary), toast, confirm-box */

/* Modal shadow */
box-shadow: -4px 0 24px rgba(15,30,50,.25);

/* Confirm box shadow */
box-shadow: 0 20px 50px rgba(15,30,50,.25);

/* Bar shadow */
box-shadow: 0 1px 2px rgba(27,51,80,.18);
```

---

## 9. Animations & Transitions

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `bell-blink` | 1.2s | ease-in-out infinite | Bell dot blink |
| `toast-in` | 0.25s | ease | Toast appear (fade + translateY) |
| Overlay fade | 0.25s | ease | Modal/notif overlay bg |
| Modal slide | 0.25s | ease | Side panel slide-in |
| Button active | 0.12s | ease | Button press effect |
| Button hover | 0.15s | ease | Bell/table hover reveal |

```css
/* prefers-reduced-motion */
@media (prefers-reduced-motion: reduce){
  .btn{ transition:none; }
}
```

---

## 10. Responsive Breakpoints

### 820px (Tablet)
```css
.board{ grid-template-columns: calc(250px + 7vw) 1fr; }
#project-title{ font-size: 22px; }
.header-actions{ width: 100%; }
.view-toggle{ flex: 1; }
.view-toggle button{ flex: 1; text-align: center; }
```

### 480px (Mobile)
```css
.board{ grid-template-columns: 1fr; border-radius: 6px; }
.sidebar{ border-right: none; border-bottom: 1px solid var(--paper-line-strong); }
#project-title{ font-size: 18px; }
.legend{ gap: 8px; font-size: 10.5px; }
.title-block{ min-width: 0; }
.modal{ width: 100vw; }
```

---

## 11. Layout Structure

### App Shell
```
.app
  .app-header
    .title-block
      .eyebrow
      #project-title
      .project-sub
    .header-actions
  .legend
  .board
    .sidebar
      .sidebar-head
      .sidebar-list
        .sidebar-row (52px each)
      .sidebar-add
    .timeline-wrap
      .timeline-inner
        .ruler (56px)
        .rows
          .row-bg (52px)
          .bar (32px)
  .toast-container
```

### Board Grid
```css
.board{ display:grid; grid-template-columns: calc(350px + 7vw) 1fr; }
```

### Side Panel (Modal/Overlay)
```css
.overlay{ position:fixed; inset:0; z-index:50; display:flex; justify-content:flex-end; }
.modal{ width:45%; max-width:100vw; height:100%; padding:24px; }
```

### Confirm Dialog
```css
.confirm-box{ width:340px; max-width:100%; padding:28px 24px 20px; border-radius:12px; }
```

---

## 12. Component Patterns

### Buttons
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-ghost">Ghost</button>
<button class="link-danger">Danger Link</button>
```
- Font: `Space Grotesk` 600, 13.5px
- Border-radius: 8px
- Padding: 10px 16px
- Active: `translateY(1px)` 0.12s ease

### Form Inputs
- Font: `Inter`, 13.5px
- Border: 1px solid `--paper-line-strong`
- Border-radius: 7px
- Padding: 9px 10px
- Background: `--paper`
- Focus: `outline: 2px solid var(--gold); outline-offset: 1px`

### Tables (Todo & Evidence)
- `border-collapse: collapse`
- Font-size: 12.5px
- `table-layout: fixed`
- Header: 10px, uppercase, `--ink-faint`
- Row: padding 6px 4px, bottom border `--paper-line`
- Hover: `background: var(--paper)`
- Action buttons hidden by default, shown `opacity:1` on row hover

### Overlay Side Panel
- Fixed fullscreen, z-index 50
- Background fades to `rgba(27,51,80,.35)`
- Modal slides in from right: `transform: translateX(100%) → translateX(0)` (0.25s ease)
- Evidence panel slides **from left**: `.overlay-left` + `.evidence-modal`

### Toast Notification
- Fixed bottom-right, z-index 999
- Font: `Space Grotesk` 500, 13px
- Padding: 12px 20px, border-radius 8px
- Auto-hide after 3 seconds
- Types: `.toast.success` (green), `.toast.error` (red)

### Background Pattern
```css
body{
  background:
    linear-gradient(var(--paper-grid) 1px, transparent 1px) 0 0/100% 28px,
    linear-gradient(90deg, var(--paper-grid) 1px, transparent 1px) 0 0/28px 100%,
    var(--paper);
}
```
Grid size: 28px × 28px

---

## 13. CDN Dependencies

| Library | Version | URL |
|---------|---------|-----|
| Google Fonts | — | `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap` |
| Bootstrap Icons | 1.11.3 | `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css` |

---

## 14. JavaScript Conventions

### Module Pattern
```js
(function(){ "use strict"; /* ... */ })();
```

### DOM References
```js
const els = {
  elementId: document.getElementById('element-id'),
  // ...
};
```

### API Helper
```js
const api = {
  async get(path) { /* fetch GET */ },
  async post(path, body) { /* fetch POST */ },
  async put(path, body) { /* fetch PUT */ },
  async del(path) { /* fetch DELETE */ },
};
```

### Utility Functions
| Function | Description |
|----------|-------------|
| `today()` | Returns Date at 00:00:00 |
| `addDays(date, n)` | Add/subtract days |
| `fmt(d)` | Date → `YYYY-MM-DD` string |
| `parseDate(str)` | `YYYY-MM-DD` string → Date |
| `dayDiff(a, b)` | Day difference (`Math.round((b-a)/86400000)`) |
| `countWeekdays(start, end)` | Count Mon–Fri between dates |
| `escapeHtml(s)` | Sanitize HTML entities |
| `shortenUrl(url, maxLen=45)` | Truncate URL for display |
| `fmtDateTime(isoStr)` | ISO string → `DD Mon YYYY, HH:mm` |
| `showToast(msg, type)` | Show toast notification (3s) |
| `showConfirm(msg, label, cancel, cls)` | Promise-based confirm dialog |

### Constants
```js
const CATS = {
  desain:        { label:"Desain",        cls:"cat-desain" },
  pengembangan:  { label:"Pengembangan",  cls:"cat-pengembangan" },
  pengujian:     { label:"Pengujian",     cls:"cat-pengujian" },
  peluncuran:    { label:"Peluncuran",    cls:"cat-peluncuran" },
  lainnya:       { label:"Lainnya",       cls:"cat-lainnya" },
  research:      { label:"RnD (Research & Development)", cls:"cat-research" },
  operasional:   { label:"Operasional",   cls:"cat-operasional" },
};

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const DOW_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
```

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Esc` | Close confirm dialog |
| `Esc` | Close modal (if confirm not open) |
| `Esc` | Close notification panel |
| `Esc` | Close evidence panel |
| `Enter` | Submit todo/evidence add |

---

## 15. Backend Stack

| Library | Version | Usage |
|---------|---------|-------|
| Express | ^4.21.0 | HTTP server & routing |
| cors | ^2.8.5 | CORS middleware |
| mysql2 | ^3.11.0 | MySQL database driver |

### Storage Modes
- **JSON Storage**: Default, data in `backend/data/tasks.json`
- **MySQL Storage**: Set `STORAGE=mysql` env, 5 tables with migrations

---

## 16. File Structure

```
time-pro/
├── frontend/
│   └── index.html          ← Single-page app (HTML + CSS + JS inline)
├── backend/
│   ├── server.js           ← Express server & API routes
│   ├── package.json
│   ├── data/
│   │   └── tasks.json      ← JSON data file
│   └── src/
│       ├── config.js       ← Configuration
│       ├── storage/
│       │   ├── JsonStorage.js
│       │   └── MysqlStorage.js
│       ├── schema/
│       │   ├── migrate.js
│       │   └── migrations/
│       │       ├── V1__initial_schema.sql
│       │       ├── V2__seed_categories.sql
│       │       └── V3__create_evidences.sql
│       └── seed-from-json.js
└── know-me/
    ├── ARCHITECTURE.md
    ├── BASE_DESIGN.md       ← This file
    ├── PLAN.md
    └── SKILL.md
```
