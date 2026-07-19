# Design Base — Time Pro

> Dokumen ini mendefinisikan fondasi desain visual yang digunakan di aplikasi **Time Pro**.
> Gunakan sebagai referensi utama saat menambahkan fitur atau komponen baru agar konsistensi tetap terjaga.

---

## 1. Filosofi Desain

| Prinsip | Penjelasan |
|---------|------------|
| **Paper & Ink** | Latar menyerupai kertas (`--paper: #F6F8FB`), teks seperti tinta (`--ink: #1B3350`). Kesan cetak, bukan digital. |
| **Clarity & Restraint** | Warna minimal, hirarki visual jelas. Tidak ada dekorasi yang tidak perlu. |
| **Purpose-Driven** | Setiap elemen memiliki fungsi. Warna aksen hanya untuk informasi yang relevan. |
| **Systematic Rhythm** | Spasi, ukuran font, dan radius mengikuti sistem yang konsisten, bukan nilai acak. |

---

## 2. Color System

Semua warna didefinisikan sebagai **CSS Custom Properties** di `:root`.

### Surface & Background

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `--paper` | `#F6F8FB` | Latar halaman utama |
| `--paper-line` | `#DCE4EE` | Garis halus / divider |
| `--paper-line-strong` | `#C4D0E0` | Garis tepi yang lebih kuat |
| `--paper-grid` | `rgba(220,228,238,0.35)` | Overlay grid latar |
| `--surface` | `#FFFFFF` | Latar card, panel, board |

### Text

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `--ink` | `#1B3350` | Teks primer (very dark navy) |
| `--ink-soft` | `#5B7290` | Teks sekunder / muted |
| `--ink-faint` | `#8B9CB3` | Teks disabled / samar |

### Accent

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `--gold` | `#C99A3B` | Fokus outline, eyebrow, weekend label, today di legend |
| `--gold-soft` | `#F1E4C6` | Latar sidebar row terpilih, text selection |

### Status / Semantic

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `--status-done` | `#3F8F63` | Task selesai, toast success, checkbox |
| `--status-progress` | `#2F6BA3` | Task berjalan (in-progress) |
| `--status-planned` | `#8996A8` | Task direncanakan / misc |
| `--status-risk` | `#B5482F` | Task berisiko, toast error, overdue, tombol delete |
| `--cut-line` | `#C0392B` | Garis vertikal "HARI INI" |
| `--sky` | `#74B9FF` | Kategori operasional |

### Warna Hardcoded Lainnya

| Lokasi | Warna | Hex |
|--------|-------|-----|
| Bell notification dot | Merah | `#ef4444` |
| Backup button | Orange | `#E67E22` |
| Backup button hover | Darker orange | `#D35400` |
| Done row hover (selected) | Green tint | `rgba(34,197,94,0.18)` |
| Weekend shading | Light gray | `rgba(139,156,179,0.06)` |
| Overlay dim | Navy | `rgba(27,51,80,.35)` |
| Confirm overlay | Navy | `rgba(27,51,80,0.45)` |

---

## 3. Typography

### Font Stack

| Font | Berat | Fungsi |
|------|-------|--------|
| `'Space Grotesk', sans-serif` | 400, 500, 600, 700 | Judul, tombol, heading modal, label ruler, sidebar row name |
| `'Inter', sans-serif` | 400, 500, 600 | Body teks, form input, konten modal, sidebar empty state, tabel todo |
| `'IBM Plex Mono', monospace` | 400, 500 | Eyebrow, sidebar header/meta, legend, ruler dates, bar percentage, field labels, overdue text, tombol kecil, tabel evidence |

⚠️ Semua font di-load dari Google Fonts.

### Ukuran Font Scale

| Ukuran | Konteks | Responsive |
|--------|---------|------------|
| **30px** → 22px / 18px | Project title (`#project-title`) | Turun di 820px / 480px |
| **24px** | Modal close button | — |
| **22px** | Confirm dialog icon | — |
| **19px** | Modal heading (`h2`) | — |
| **16px** | Delete/copy button di tabel | — |
| **14px** | Confirm dialog message | — |
| **13.5px** | Button, form input, sidebar row name | — |
| **13px** | Toast, todo input | — |
| **12.5px** | Sidebar empty state, table body, link-danger | — |
| **12px** | Small button (todo/evidence), bar label, notif-empty | — |
| **11.5px** | Legend, field label (`label`), todo section label | — |
| **11px** | Sidebar header, sidebar meta, todo due date | — |
| **10.5px** | Legend mobile, bar percentage | Hanya mobile ≤480px |
| **10px** | Table header (`thead th`), todo number | — |
| **9.5px** | Ruler day numbers | — |

### Font Weight

| Weight | Penggunaan |
|--------|------------|
| **700** | Project title |
| **600** | Button, field label, sidebar row name, table header, todo label, bar label, overdue, ruler month |
| **500** | Toast text |
| **400** | Body default |

### Letter Spacing

| Value | Penggunaan |
|-------|------------|
| `.14em` | Eyebrow text |
| `.10em` | Sidebar header |
| `.08em` | Today line label |
| `.06em` | Table header, evidence header |
| `.04em` | Field label, todo section label |
| `.03em` | View toggle button |

---

## 4. Spacing System

### Container Padding

| Elemen | Value |
|--------|-------|
| App container | `clamp(12px, 3.5vw, 28px)` |
| Modal content | `24px` |
| Confirm box | `28px 24px 20px` |
| Sidebar head | `0 16px` |
| Sidebar row | `0 16px` |
| Sidebar empty | `26px 16px` |
| Sidebar add | `12px 14px` |
| Empty board | `60px 20px` |

### Element Padding

| Elemen | Value |
|--------|-------|
| Button (`.btn`) | `10px 16px` |
| View toggle | `9px 14px` |
| Bell button | `8px` |
| Form input (`input`, `select`) | `9px 10px` |
| Small input (todo/evidence) | `7px 10px` |
| Table cell (`td`) | `6px 4px` |
| Table header cell (`th`) | `4px 4px 6px` |
| Toast | `12px 20px` |
| Small button on todo add | `7px 12px` |

### Margin & Gap

| Konteks | Value |
|---------|-------|
| Header bottom | `22px` |
| Legend bottom | `18px` |
| Modal actions top | `20px` |
| Confirm message bottom | `20px` |
| Field label bottom | `6px` |
| Todo section bottom | `14px` |
| Todo section label bottom | `8px` |
| Evidence section bottom | `14px` |
| Confirm icon bottom | `14px` |
| Header gap | `24px` |
| Grid row-2 gap | `12px` |
| Header actions gap | `10px` |
| Legend gap | `18px` |
| Sidebar row gap | `2px` |
| Todo add gap | `6px` |
| Button icon gap | `8px` |
| Modal actions gap | `10px` |
| Range row gap | `10px` |
| Toast container gap | `8px` |
| Confirm actions gap | `10px` |
| Meta gap | `6px` |
| Title block gap | `6px` |

### Layout Dimensions

| Elemen | Value |
|--------|-------|
| Sidebar width | `calc(350px + 7vw)` |
| Board grid | `calc(350px + 7vw) 1fr` |
| Modal width (desktop) | `45%` |
| Modal max-width | `100vw` |
| Confirm box width | `340px` |
| Sidebar head / row height | `56px` / `52px` |
| Timeline row height | `52px` |
| Bar height | `32px` |
| Bar top offset | `10px` |
| Ruler height | `56px` |
| Day width (week view) | `40px` |
| Day width (month view) | `14px` |
| Bell dot size | `8px` |
| Checkbox size | `16px` |
| Confirm icon size | `44px` |
| Legend dot size | `9px` |
| Tag dot size | `7px` |
| Today line width | `2px` |
| Handle width | `8px` |
| Eyebrow `::before` width | `18px` |

---

## 5. Border Radius

| Value | Penggunaan |
|-------|------------|
| **0px** (`--radius`) | Board / container global |
| **12px** | Confirm dialog box |
| **8px** | Button, view-toggle, bell, toast, link-danger, confirm-yes |
| **7px** | Form input, timeline bar, todo/evidence input |
| **6px** | Board di mobile (≤480px) |
| **50%** | Bell dot, confirm icon |

---

## 6. Shadows

| Value | Penggunaan |
|-------|------------|
| `0 1px 2px rgba(27,51,80,.06), 0 6px 16px rgba(27,51,80,.07)` | Board, primary button, toast (`--shadow`) |
| `0 1px 2px rgba(27,51,80,.18)` | Timeline bar |
| `-4px 0 24px rgba(15,30,50,.25)` | Modal panel slide-in |
| `0 20px 50px rgba(15,30,50,.25)` | Confirm dialog |

---

## 7. Borders & Focus

### Border Styles

| Style | Penggunaan |
|-------|------------|
| `1px solid var(--paper-line-strong)` | Board frame, sidebar right, form input, `.btn-ghost`, small input |
| `1px solid var(--paper-line)` | Sidebar row bottom, row-bg bottom, table header bottom, table cell bottom |
| `1px solid var(--ink)` | View toggle container |
| `1px solid var(--status-risk)` | Link-danger, confirm-yes |
| `1px solid transparent` | Default button border |
| `1px solid rgba(0,0,0,.08)` | Timeline bar |
| `2px solid var(--cut-line)` | Today vertical line |
| `2px solid var(--gold)` | Focus outline |

### Focus State

```
input:focus {
  outline: 2px solid var(--gold);
  outline-offset: 1px;
}
```

---

## 8. Iconography

| Detail | Value |
|--------|-------|
| Library | **Bootstrap Icons v1.11.3** |
| CDN | `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css` |
| Usage | Hanya icon `bi bi-copy` saat ini (di panel notifikasi) |
| Pattern | `<i class="bi bi-{name}"></i>` |

> Jika membutuhkan icon baru, prioritaskan dari Bootstrap Icons terlebih dahulu sebelum menambahkan library lain.

---

## 9. Component Patterns

### 9.1 Button (`.btn`)

```css
.btn {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 13.5px;
  border-radius: 8px;
  padding: 10px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
}
.btn:active { transform: translateY(1px); }
```

| Variant | Class | Background | Text | Border | Hover |
|---------|-------|------------|------|--------|-------|
| **Primary** | `.btn-primary` | `--ink` | `--paper` | — | `#142842` |
| **Ghost** | `.btn-ghost` | `--surface` | `--ink` | `--paper-line-strong` | `border-color: --ink-soft` |
| **Danger** | `.link-danger` | `rgba(181,72,47,0.1)` | `--status-risk` | `1px solid --status-risk` | `rgba(181,72,47,0.2)` |
| **Confirm Yes** | `.confirm-yes` | `--status-risk` | `#ffffff` | `--status-risk` | `#9e3d28` |
| **Backup** | `#backup-btn` | `#E67E22` | `#ffffff` | `#E67E22` | `#D35400` |

### 9.2 Form Input

```css
input[type=text],
input[type=date],
select {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--paper-line-strong);
  border-radius: 7px;
  font-size: 13.5px;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: var(--paper);
}
input:focus {
  outline: 2px solid var(--gold);
  outline-offset: 1px;
}
```

**Input Kecil** (todo / evidence): `padding: 7px 10px; font-size: 12px;`

### 9.3 Board Layout

```css
.board {
  display: grid;
  grid-template-columns: calc(350px + 7vw) 1fr;
  border: 1px solid var(--paper-line-strong);
  border-radius: var(--radius, 0px);
  background: var(--surface);
  box-shadow: var(--shadow);
  overflow: hidden;
}
```

### 9.4 Sidebar Row

```css
.sidebar-row {
  height: 52px;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  border-bottom: 1px solid var(--paper-line);
  cursor: pointer;
}
```

| State | Background |
|-------|------------|
| Default | — |
| `:hover` | `var(--paper)` |
| `.selected` | `var(--gold-soft)` |
| `.done` | `rgba(34,197,94,0.1)` |
| `.done:hover` | `rgba(34,197,94,0.16)` |
| `.done.selected` | `rgba(34,197,94,0.18)` |

### 9.5 Timeline Bar

```css
.bar {
  position: absolute;
  top: 10px;
  height: 32px;
  border-radius: 7px;
  box-shadow: 0 1px 2px rgba(27,51,80,.18);
  cursor: grab;
  z-index: 2;
  border: 1px solid rgba(0,0,0,.08);
}
```

| Sub-element | Fungsi |
|-------------|--------|
| `.bar > .fill` | Progress fill overlay (kiri, width = progress%) |
| `.bar > .label` | Nama task, `12px`, weight 600, warna putih |
| `.bar > .pct` | Persentase, `10.5px`, IBM Plex Mono, `rgba(255,255,255,.85)` |
| `.handle.left` | Resize kiri (`width: 8px`, `cursor: ew-resize`) |
| `.handle.right` | Resize kanan (`width: 8px`, `cursor: ew-resize`) |

### 9.6 Modal Panel (Slide-in)

```css
.modal {
  background: var(--surface);
  width: 45%;
  max-width: 100vw;
  height: 100%;
  box-shadow: -4px 0 24px rgba(15,30,50,.25);
  padding: 24px;
  font-family: 'Inter', sans-serif;
  overflow-y: auto;
  transform: translateX(100%);
  transition: transform .25s ease;
}
.overlay.open .modal { transform: translateX(0); }
```

### 9.7 Confirm Dialog

```css
.confirm-box {
  background: var(--surface);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(15,30,50,.25);
  padding: 28px 24px 20px;
  text-align: center;
  width: 340px;
  max-width: 100%;
  font-family: 'Inter', sans-serif;
}
```

### 9.8 Toast Notification

```css
.toast {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px;
  font-weight: 500;
  padding: 12px 20px;
  border-radius: 8px;
  color: #fff;
  box-shadow: var(--shadow);
  animation: toast-in .25s ease;
}
.toast.success { background: var(--status-done); }
.toast.error   { background: var(--status-risk); }
```

### 9.9 Table

```css
table {
  border-collapse: collapse;
  font-size: 12.5px;
  table-layout: fixed;
  width: 100%;
}
thead th {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-faint);
  border-bottom: 1px solid var(--paper-line);
  padding: 4px 4px 6px;
}
tbody td {
  padding: 6px 4px;
  border-bottom: 1px solid var(--paper-line);
}
tbody tr:hover { background: var(--paper); }
```

> Tombol delete/copy di tabel: `opacity: 0` secara default, `opacity: 1` saat row di-hover.

---

## 10. Animation & Transitions

| Timing | Properti | Elemen |
|--------|----------|--------|
| `0.12s ease` | `transform`, `box-shadow` | Button `:active` |
| `0.25s ease` | `opacity`, `visibility`, `background` | Overlay |
| `0.25s ease` | `transform` | Modal panel slide |
| `0.15s` | `color`, `background` | Bell button hover |
| `0.15s` | `opacity` | Copy button di tabel |
| `0.25s ease` | `@keyframes toast-in` | Toast appear |
| `1.2s ease-in-out infinite` | `@keyframes bell-blink` | Bell dot |

### Keyframes

```css
@keyframes toast-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes bell-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: .2; }
}
```

---

## 11. Responsive Breakpoints

| Breakpoint | Perubahan |
|------------|-----------|
| **≤820px** | Board: `calc(250px + 7vw) 1fr`; Title: 22px; Header gap: 12px; Header-actions: `flex-wrap`; View-toggle: `flex: 1` |
| **≤480px** | Board: `1fr` (single column), radius 6px; Sidebar border-right dihapus, bottom border ditambah; Title: 18px; Legend gap: 8px, font: 10.5px; Modal: `100vw` |

---

## 12. Category System

7 kategori dengan warna dan bentuk unik (untuk legend dot dan sidebar tag dot).

| Slug | Label | CSS Class | Warna | Bentuk (clip-path) |
|------|-------|-----------|-------|---------------------|
| `desain` | Desain | `.cat-desain` | `--status-progress` `#2F6BA3` | Segitiga |
| `pengembangan` | Pengembangan | `.cat-pengembangan` | `--ink` `#1B3350` | Lingkaran |
| `pengujian` | Pengujian | `.cat-pengujian` | `--status-done` `#3F8F63` | Pentagon |
| `peluncuran` | Peluncuran | `.cat-peluncuran` | `--status-risk` `#B5482F` | Persegi |
| `lainnya` | Lainnya | `.cat-lainnya` | `--status-planned` `#8996A8` | Diamond |
| `research` | RnD | `.cat-research` | `--gold` `#C99A3B` | Hexagon |
| `operasional` | Operasional | `.cat-operasional` | `--sky` `#74B9FF` | Organik |

### CSS Shapes (clip-path)

```css
.cat-desain      { clip-path: polygon(50% 0%,0% 100%,100% 100%); }       /* Segitiga */
.cat-pengembangan { clip-path: circle(50%); }                              /* Lingkaran */
.cat-pengujian   { clip-path: polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%); } /* Pentagon */
.cat-peluncuran  { clip-path: none; }                                      /* Persegi */
.cat-lainnya     { clip-path: polygon(50% 0%,100% 50%,50% 100%,0% 50%); } /* Diamond */
.cat-research    { clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%); } /* Hexagon */
.cat-operasional { clip-path: polygon(5% 75%,5% 50%,15% 35%,30% 25%,50% 20%,65% 25%,80% 15%,90% 30%,95% 50%,95% 75%); } /* Organik */
```

---

## Aturan Pakai

1. **Jangan hardcode value** — selalu gunakan CSS custom properties yang sudah ada.
2. **Jangan tambah font baru** tanpa persetujuan — 3 font saat ini sudah cukup.
3. **Jangan ubah warna token** di `:root` — jika perlu warna baru, tambah token baru.
4. **Ikuti spacing system** — jangan pakai nilai margin/padding di luar sistem.
5. **Bangun komponen dari pola yang ada** — lihat section 9 sebelum buat komponen baru.
6. **Konsisten dengan kategori** — jika perlu kategori baru, ikuti pola slug + class + warna + shape.
