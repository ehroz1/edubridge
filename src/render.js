/*
 * Движок отрисовки макетов edubridge на Canvas.
 *
 * Здесь только примитивы: цвета и шрифты брендбука, перенос текста, плашки
 * рубрик, логотип, дуга, иконки Phosphor, флаги и фото. Сами шаблоны — что и
 * где стоит на каждом слайде — описаны в templates.js.
 *
 * Все размеры задаются в пикселях итогового макета (1080×1350, 1080×1920,
 * 1280×720…). Масштаб превью и экспорта ставится снаружи через
 * ctx.setTransform, поэтому шаблоны о нём ничего не знают.
 */

/* Палитра брендбука, раздел 03 «Цвет». Других цветов в макетах быть не должно. */
const C = {
  blue: '#0A34F5',        // Bridge Blue
  ink: '#121418',         // Ink
  white: '#FFFFFF',
  paper: '#F5F5F1',       // Paper · фон
  mist: '#DCDFE6',        // Mist · линии
  mistDark: '#C9CDD6',    // разделитель ко-брендинга, вторичный текст на тёмном
  slate: '#5B616E',       // Slate · вторичный текст
  graphite: '#3B404A',    // Graphite · карточки
  skyTint: '#E6EBFF',     // Sky Tint · подложки
  sky: '#9DB0FF',         // Sky · истории
  bridgeLight: '#5C7CFF', // Bridge Light · на тёмном
  coral: '#FF5A36',       // Coral · дедлайны
  coralText: '#D63B1A',   // Coral Text · текст
  lime: '#C8F169',        // Lime · гранты
};

/*
 * Шрифты. Имена семейств уникальные (EB…), чтобы не путаться с копией Onest,
 * установленной в системе. У Unbounded нет казахских букв (Ә Ғ Қ Ң Ө Ұ Ү Һ) —
 * браузер сам возьмёт их из Onest того же веса, он указан вторым в списке.
 */
const FONT_ONEST = 'EBOnest';
const FONT_UNB = 'EBUnbounded';

/* Вертикальные метрики (hhea, доли кегля) — по ним строка встаёт в свою
   строчную коробку так же, как в CSS: половина интерлиньяжа сверху и снизу. */
const METRICS = {
  onest: { ascent: 0.97, descent: 0.305 },
  unb: { ascent: 0.995, descent: 0.245 },
};

const HAS_LETTER_SPACING = typeof CanvasRenderingContext2D !== 'undefined' &&
  'letterSpacing' in CanvasRenderingContext2D.prototype;

function fontString(family, weight, size) {
  const list = family === 'unb'
    ? `${FONT_UNB}, ${FONT_ONEST}, sans-serif`
    : `${FONT_ONEST}, sans-serif`;
  return `${weight} ${size}px ${list}`;
}

/* Ставит шрифт и трекинг (в долях кегля, как em в CSS). Возвращает трекинг в px. */
function setFont(ctx, st, size) {
  ctx.font = fontString(st.family, st.weight, size);
  const px = (st.track || 0) * size;
  if (HAS_LETTER_SPACING) ctx.letterSpacing = px.toFixed(2) + 'px';
  return px;
}

function measureWidth(ctx, text, spacingPx) {
  const w = ctx.measureText(text).width;
  // без поддержки letterSpacing трекинг добавляем сами — так же и рисуем посимвольно
  return HAS_LETTER_SPACING ? w : w + spacingPx * [...text].length;
}

/* ------------------------------------------------------------- перенос */

/*
 * Короткие служебные слова не остаются в конце строки — склеиваются со
 * следующим словом (правило брендбука: «висячие предлоги переносим
 * неразрывным пробелом»). Тире, наоборот, не начинает строку — оно
 * приклеивается к предыдущему слову.
 */
const GLUE_WORDS = new Set([
  'в', 'во', 'на', 'к', 'ко', 'с', 'со', 'у', 'о', 'об', 'обо', 'от', 'ото',
  'до', 'из', 'изо', 'за', 'по', 'под', 'над', 'при', 'про', 'для', 'без',
  'не', 'ни', 'и', 'а', 'но', 'да', 'же', 'ли', 'бы', 'то', 'как', 'что',
  'или', 'их', 'его', 'её', 'ее', 'мы', 'вы', 'ты', 'он', 'она', 'они', 'я',
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'of', 'by', 'is', 'or', 'and',
]);
const DASHES = new Set(['—', '–', '-']);

function isGlueWord(word) {
  const clean = word.replace(/[«»"'“”„(]/g, '').toLowerCase();
  if (!clean || /\d/.test(clean)) return false;
  return clean.length <= 2 || GLUE_WORDS.has(clean);
}

/* Число не отрывается от следующего слова: «14 дней», «1 из 4», «15 января». */
function gluesToNext(word) {
  return isGlueWord(word) || /^\d[\d.,]*$/.test(word);
}

/* Слова строки → неразрывные группы с учётом висячих предлогов, чисел и тире. */
function glueGroups(words) {
  const groups = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = groups[groups.length - 1];
    if (prev && (DASHES.has(w) || prev.glueNext)) {
      prev.text += ' ' + w;
      prev.words.push(w);
      prev.glueNext = !DASHES.has(w) && gluesToNext(w);
      continue;
    }
    groups.push({ text: w, words: [w], glueNext: gluesToNext(w) });
  }
  return groups;
}

/*
 * Раскладывает текст по строкам шириной maxWidth. Переводы строк из поля
 * ввода сохраняются, пустая строка — это отступ высотой в строку.
 * Возвращает объект с высотой (как у блока в CSS: строк × кегль × интерлиньяж)
 * и методом draw.
 */
function layoutText(ctx, text, st, maxWidth) {
  const size = st.size;
  const spacing = setFont(ctx, st, size);
  const lineH = size * st.lh;
  const lines = [];
  const src = String(text ?? '');
  const paragraphs = st.upper ? src.toUpperCase().split('\n') : src.split('\n');

  for (const para of paragraphs) {
    const words = para.split(/[ \t]+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    const groups = glueGroups(words);
    let line = '';
    for (const g of groups) {
      // склейка шире всей строки — лучше разорвать её, чем вылезти за край
      const pieces = g.words.length > 1 && measureWidth(ctx, g.text, spacing) > maxWidth * 1.001 ? g.words : [g.text];
      for (const piece of pieces) {
        const candidate = line ? line + ' ' + piece : piece;
        if (line && measureWidth(ctx, candidate, spacing) > maxWidth * 1.001) {
          lines.push(line);
          line = piece;
        } else {
          line = candidate;
        }
      }
    }
    lines.push(line);
  }
  // хвостовые пустые строки не занимают места
  while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
  if (lines.length === 1 && !lines[0]) lines.length = 0;

  const widths = lines.map(l => measureWidth(ctx, l, spacing));
  const maxW = widths.length ? Math.max(...widths) : 0;
  // слово длиннее ширины блока — само по себе переполнение, даже если строк немного
  const tooWide = maxW > maxWidth * 1.02;

  return {
    lines, widths, size, lineH, st, maxW, tooWide,
    h: lines.length * lineH,
    draw(ctx2, x, y, opts = {}) { drawLaidText(ctx2, this, x, y, opts); },
  };
}

/* Рисует разложенный текст. opts: width (для выключки), align, color, accent: {word, color}. */
function drawLaidText(ctx, lt, x, y, opts = {}) {
  const { st, size, lineH } = lt;
  const m = METRICS[st.family];
  const spacing = setFont(ctx, st, size);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const color = opts.color || st.color || C.ink;
  const align = opts.align || st.align || 'left';
  const width = opts.width ?? lt.maxW;
  const accent = opts.accent && opts.accent.word ? opts.accent : null;

  lt.lines.forEach((line, i) => {
    if (!line) return;
    const top = y + i * lineH;
    const baseline = top + (lineH - size * (m.ascent + m.descent)) / 2 + size * m.ascent;
    let lx = x;
    if (align === 'center') lx = x + (width - lt.widths[i]) / 2;
    else if (align === 'right') lx = x + width - lt.widths[i];
    const segments = accent ? splitAccent(line, accent.word) : [{ text: line, accent: false }];
    for (const seg of segments) {
      ctx.fillStyle = seg.accent ? accent.color : color;
      drawSpaced(ctx, seg.text, lx, baseline, spacing);
      lx += measureWidth(ctx, seg.text, spacing);
    }
  });
}

function drawSpaced(ctx, text, x, y, spacing) {
  if (HAS_LETTER_SPACING || !spacing) { ctx.fillText(text, x, y); return; }
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

/* Делит строку на куски: выделенное слово (без учёта регистра) и остальное. */
function splitAccent(line, word) {
  const out = [];
  const needle = word.trim().toLowerCase();
  if (!needle) return [{ text: line, accent: false }];
  const hay = line.toLowerCase();
  let pos = 0;
  while (pos < line.length) {
    const found = hay.indexOf(needle, pos);
    if (found < 0) { out.push({ text: line.slice(pos), accent: false }); break; }
    if (found > pos) out.push({ text: line.slice(pos, found), accent: false });
    out.push({ text: line.slice(found, found + needle.length), accent: true });
    pos = found + needle.length;
  }
  return out;
}

/* Одна строка без переноса — для подписей, дат, ников. Возвращает ширину. */
function textWidth(ctx, text, st) {
  const spacing = setFont(ctx, st, st.size);
  return measureWidth(ctx, String(text ?? ''), spacing);
}

function drawLine(ctx, text, x, y, st, opts = {}) {
  const lt = layoutText(ctx, String(text ?? '').replace(/\n/g, ' '), st, 1e6);
  lt.draw(ctx, x, y, opts);
  return lt;
}

/* ------------------------------------------------------------- фигуры */

/* Прямоугольник со скруглением; r — число или [tl, tr, br, bl]. */
function rrPath(ctx, x, y, w, h, r = 0) {
  let [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  const max = Math.min(w, h) / 2;
  tl = Math.min(tl, max); tr = Math.min(tr, max); br = Math.min(br, max); bl = Math.min(bl, max);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function fillRR(ctx, x, y, w, h, r, color) {
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

/* Обводка внутрь фигуры — как inset box-shadow в макетах брендбука. */
function strokeInsetRR(ctx, x, y, w, h, r, color, width) {
  const half = width / 2;
  const rr = Array.isArray(r) ? r.map(v => Math.max(0, v - half)) : Math.max(0, r - half);
  rrPath(ctx, x + half, y + half, w - width, h - width, rr);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function fillCircle(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/* Вертикальный градиент: stops — [[доля, цвет], …]. */
function fillVGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function fillHGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/*
 * Штриховка-заглушка на месте фото — как repeating-linear-gradient(135deg, …)
 * в макетах брендбука: полоса c1 шириной stripe через каждые period пикселей.
 * Рисуется внутри текущей маски (клипа).
 */
function hatch(ctx, x, y, w, h, c1, c2, stripe = 4, period = 36) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = c2;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = c1;
  ctx.lineWidth = stripe;
  ctx.lineCap = 'butt';
  const diag = (w + h) / Math.SQRT2;
  ctx.beginPath();
  for (let t = stripe / 2; t < diag + period; t += period) {
    const s = t * Math.SQRT2;   // линия x + y = s
    ctx.moveTo(x + s + h, y - h);
    ctx.lineTo(x - h, y + s + h);
  }
  ctx.stroke();
  ctx.restore();
}

/* Шахматка — показывает в превью прозрачный фон (титры поверх видео). */
function checker(ctx, x, y, w, h, cell = 40) {
  ctx.save();
  ctx.fillStyle = '#EEF0F4';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#DCDFE6';
  for (let yy = 0; yy < h; yy += cell) {
    for (let xx = ((yy / cell) % 2) * cell; xx < w; xx += cell * 2) ctx.fillRect(x + xx, y + yy, cell, cell);
  }
  ctx.restore();
}

/* ------------------------------------------------------- логотип и дуга */

const PATH_CACHE = new Map();
function path2d(d) {
  let p = PATH_CACHE.get(d);
  if (!p) { p = new Path2D(d); PATH_CACHE.set(d, p); }
  return p;
}

/* Версии логотипа из раздела «Версии логотипа». Других сочетаний цветов нет. */
const LOGO_VARIANTS = {
  main: { word: C.ink, arc: C.blue },         // основная: Ink + Bridge Blue
  onBlue: { word: C.white, arc: C.white },    // инверсная на синем
  onDark: { word: C.white, arc: C.bridgeLight }, // на тёмном: дуга Bridge Light
  monoWhite: { word: C.white, arc: C.white },
  monoInk: { word: C.ink, arc: C.ink },
};

function logoWidth(h) {
  const [, , vw, vh] = BRAND_PATHS.logo.vb;
  return h * vw / vh;
}

/* Логотип высотой h (по рамке viewBox, как <img style="height:44px"> в макете). Возвращает ширину. */
function drawLogo(ctx, x, y, h, variant = 'main') {
  const L = BRAND_PATHS.logo;
  const [vx, vy, , vh] = L.vb;
  const colors = LOGO_VARIANTS[variant] || LOGO_VARIANTS.main;
  const s = h / vh;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-vx, -vy);
  ctx.fillStyle = colors.word;
  ctx.fill(path2d(L.word), L.wordRule === 'evenodd' ? 'evenodd' : 'nonzero');
  ctx.fillStyle = colors.arc;
  ctx.fill(path2d(L.arc));
  ctx.restore();
  return logoWidth(h);
}

function arcHeight(w) {
  const [, , vw, vh] = BRAND_PATHS.arc.vb;
  return w * vh / vw;
}

/* Знак-дуга шириной w (по рамке viewBox, как <img style="width:300px">). Возвращает высоту. */
function drawArc(ctx, x, y, w, color = C.blue) {
  const A = BRAND_PATHS.arc;
  const [vx, vy, vw] = A.vb;
  const s = w / vw;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-vx, -vy);
  ctx.fillStyle = color;
  ctx.fill(path2d(A.d));
  ctx.restore();
  return arcHeight(w);
}

/*
 * Паттерн «Пролёты» (раздел 05): сетка из 4 колонок дуг, шаг по вертикали —
 * около половины пролёта (как на образце в брендбуке, чуть свободнее, чтобы
 * ряды не сливались), одна дуга акцентная. Рисуется внутри рамки x, y, w, h;
 * нижний неполный ряд обрезается. accent — [ряд, колонка] акцентной дуги.
 */
function drawSpans(ctx, x, y, w, h, color, accentColor, accent = [2, 1]) {
  const cols = 4;
  const gap = Math.round(w * 0.035);
  const aw = (w - gap * (cols - 1)) / cols;
  const step = aw * 0.6;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let r = 0; y + r * step < y + h; r++) {
    for (let c = 0; c < cols; c++) {
      const on = accentColor && r === accent[0] && c === accent[1];
      drawArc(ctx, x + c * (aw + gap), y + r * step, aw, on ? accentColor : color);
    }
  }
  ctx.restore();
}

/* Иконка Phosphor Fill размером size×size. */
function drawGlyph(ctx, name, x, y, size, color) {
  const paths = GLYPHS[name];
  if (!paths) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 256, size / 256);
  ctx.fillStyle = color;
  for (const d of paths) ctx.fill(path2d(d));
  ctx.restore();
}

/* ---------------------------------------------------------------- флаги */

const FLAG_IMAGES = {};

/* Декодирует все флаги заранее — рисовать их нужно синхронно. */
function loadFlags() {
  const jobs = Object.entries(FLAGS).map(([code, url]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { FLAG_IMAGES[code] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = url;
  }));
  return Promise.all(jobs);
}

/* Круглый флаг диаметром size. ring — обводка (белая 4 px — флаг на фото). */
function drawFlag(ctx, code, x, y, size, opts = {}) {
  if (!code) return;
  if (opts.ring) fillCircle(ctx, x + size / 2, y + size / 2, size / 2 + opts.ring, opts.ringColor || C.white);
  const img = FLAG_IMAGES[code];
  if (img) ctx.drawImage(img, x, y, size, size);
  else fillCircle(ctx, x + size / 2, y + size / 2, size / 2, C.mist);
}

/* Ряд флагов с небольшим нахлёстом; каждый следующий — поверх предыдущего. Возвращает ширину. */
function drawFlagsRow(ctx, codes, x, y, size, opts = {}) {
  const list = codes.filter(Boolean);
  list.forEach((code, i) => drawFlag(ctx, code, x + i * size * 0.72, y, size, i || opts.ring ? { ring: opts.ring || Math.max(2, size * 0.05), ringColor: opts.ringColor } : {}));
  return flagsRowWidth(list.length, size);
}

/* ------------------------------------------------------------ фото/видео */

function mediaSize(el) {
  if (!el) return [0, 0];
  if (el instanceof HTMLVideoElement) return [el.videoWidth || 0, el.videoHeight || 0];
  return [el.naturalWidth || el.width || 0, el.naturalHeight || el.height || 0];
}

/*
 * Геометрия фото внутри рамки w×h: cover (заполнить) или contain (вписать),
 * с масштабом zoom и сдвигом pan (−1…1 — доля запаса картинки за краем рамки).
 */
function mediaGeometry(m, w, h, fit = 'cover') {
  const [iw, ih] = mediaSize(m && m.el);
  if (!iw || !ih) return null;
  const zoom = m.zoom || 1;
  const base = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const dw = iw * base * zoom;
  const dh = ih * base * zoom;
  const ox = (w - dw) * (1 - (m.panX || 0)) / 2;
  const oy = (h - dh) * (1 - (m.panY || 0)) / 2;
  return { dw, dh, ox, oy };
}

/* Путь рамки фото: rect (со скруглением), arch (арка: полукруг сверху) или circle. */
function shapePath(ctx, x, y, w, h, shape, radius = 0) {
  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.closePath();
  } else if (shape === 'arch') {
    rrPath(ctx, x, y, w, h, [w / 2, w / 2, 0, 0]);
  } else {
    rrPath(ctx, x, y, w, h, radius);
  }
}

/*
 * Фото или кадр видео в рамке. Пустая рамка — штриховка-заглушка, как в
 * брендбуке. opts: shape, radius, fit, placeholder: [c1, c2, stripe, period],
 * bg — подложка под вписанную (contain) картинку.
 */
function drawMedia(ctx, m, x, y, w, h, opts = {}) {
  const shape = opts.shape || 'rect';
  ctx.save();
  shapePath(ctx, x, y, w, h, shape, opts.radius || 0);
  ctx.clip();
  const g = m && m.el ? mediaGeometry(m, w, h, opts.fit) : null;
  if (g) {
    if (opts.bg) fillRect(ctx, x, y, w, h, opts.bg);
    try { ctx.drawImage(m.el, x + g.ox, y + g.oy, g.dw, g.dh); } catch { /* кадр видео ещё не готов */ }
  } else {
    const [c1, c2, stripe, period] = opts.placeholder || [C.mistDark, C.mist, 4, 36];
    hatch(ctx, x, y, w, h, c1, c2, stripe, period);
  }
  ctx.restore();
}

/* Штриховки-заглушки из макетов: светлая (фото на белом) и тёмная (портрет на весь кадр). */
const HATCH_LIGHT = [C.mistDark, C.mist, 4, 36];
const HATCH_DARK = ['#8A909C', '#A7ACB6', 4, 36];
const HATCH_INK = ['#2A2E36', C.graphite, 4, 36];

/* ------------------------------------------------------------ ко-брендинг */

/*
 * Логотип партнёра, перекрашенный в один цвет по его прозрачности (монохром
 * по брендбуку: «оба логотипа в основной версии или оба в монохроме»).
 * Кешируется офскрин-холстом: SVG растрируется один раз с запасом (1400 px).
 */
const TINT_CACHE = new Map();
function tintedLogo(logo, color) {
  const key = logo.id + '|' + color;
  let c = TINT_CACHE.get(key);
  if (c) return c;
  const [iw, ih] = mediaSize(logo.img);
  if (!iw || !ih) return null;
  const k = Math.min(4, 1400 / Math.max(iw, ih));
  c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(iw * k));
  c.height = Math.max(1, Math.round(ih * k));
  const g = c.getContext('2d');
  g.drawImage(logo.img, 0, 0, c.width, c.height);
  if (color) {
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
  }
  TINT_CACHE.set(key, c);
  return c;
}

/* Цвет партнёрских логотипов и разделителя под версию нашего логотипа. */
function lockupColors(variant) {
  const dark = variant === 'onBlue' || variant === 'onDark' || variant === 'monoWhite';
  return {
    logo: dark ? C.white : C.ink,
    divider: variant === 'onBlue' ? C.sky : dark ? 'rgba(255,255,255,0.4)' : C.mistDark,
  };
}

/*
 * Раскладка «edubridge | партнёр | партнёр» — раздел «Ко-брендинг»:
 * разделитель высотой ~1,5× вордмарка, отступ до логотипов 2X, знак партнёра
 * не выше 1,6× вордмарка, выравнивание по центру строки вордмарка.
 * h — высота нашего логотипа (рамка viewBox). partners: [{ logo, mono }].
 */
function lockupLayout(h, partners, variant) {
  const gap = h * 0.8;
  const divW = Math.max(2, Math.round(h * 0.06));
  const maxH = h * 1.1, maxW = h * 4.6;
  const items = [];
  let w = logoWidth(h);
  const colors = lockupColors(variant);
  for (const p of partners) {
    const src = p.mono ? tintedLogo(p.logo, colors.logo) : tintedLogo(p.logo, null);
    if (!src) continue;
    const k = Math.min(maxW / src.width, maxH / src.height);
    const pw = src.width * k, ph = src.height * k;
    w += gap + divW + gap;
    items.push({ src, x: w, w: pw, h: ph });
    w += pw;
  }
  return { w, items, gap, divW, colors };
}

/* Рисует логотип с партнёрами. align: 'left' — x слева, 'right' — x справа. Возвращает ширину. */
function drawLockup(ctx, x, y, h, variant, partners, align = 'left') {
  const L = lockupLayout(h, partners || [], variant);
  const x0 = align === 'right' ? x - L.w : x;
  drawLogo(ctx, x0, y, h, variant);
  const cy = y + h * 0.6;   // середина строчных вордмарка, не рамки viewBox
  const divH = h * 1.4;
  for (const it of L.items) {
    fillRect(ctx, x0 + it.x - L.gap - L.divW, cy - divH / 2, L.divW, divH, L.colors.divider);
    ctx.drawImage(it.src, x0 + it.x, cy - it.h / 2, it.w, it.h);
  }
  return L.w;
}

/* Цвет в rgba с прозрачностью — для тонировки фото цветом фона. */
function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/* --------------------------------------------------------------- плашки */

/*
 * Плашка рубрики (pill): Onest SemiBold, скругление 999. o: size, weight,
 * padX, padY, bg, color, border (обводка внутрь), borderWidth, dot (цвет
 * точки «в эфире»), dotSize, gap, flag (код страны — флаг слева).
 */
function pillFlags(o) {
  const list = (o.flags || []).filter(Boolean);
  if (o.flag && !list.includes(o.flag)) list.unshift(o.flag);
  return list.slice(0, 3);
}

/* Ширина ряда флагов, которые чуть заходят друг на друга (как аватары в группе). */
function flagsRowWidth(n, size) {
  return n ? size + (n - 1) * size * 0.72 : 0;
}

function pillMetrics(ctx, text, o) {
  const st = { family: 'onest', weight: o.weight || 600, size: o.size || 30, lh: 1, track: o.track || 0 };
  const tw = textWidth(ctx, text, st);
  const gap = o.gap ?? 16;
  const flags = pillFlags(o);
  const fs = o.flagSize || st.size * 1.45;
  let lead = 0;
  if (o.dot) lead += (o.dotSize || 18) + gap;
  if (flags.length) lead += flagsRowWidth(flags.length, fs) + (o.flagGap ?? 12);
  const padL = flags.length ? (o.padFlag ?? Math.round(st.size / 3)) : (o.padX ?? 32);
  const w = padL + lead + tw + (o.padX ?? 32);
  const h = st.size + (o.padY ?? 18) * 2;
  return { w, h, st, tw, padL, gap };
}

function drawPill(ctx, x, y, text, o = {}) {
  const pm = pillMetrics(ctx, text, o);
  const { w, h, st, padL, gap } = pm;
  if (o.bg) fillRR(ctx, x, y, w, h, h / 2, o.bg);
  if (o.border) strokeInsetRR(ctx, x, y, w, h, h / 2, o.border, o.borderWidth || 3);
  let cx = x + padL;
  const flags = pillFlags(o);
  if (flags.length) {
    const fs = o.flagSize || st.size * 1.45;
    drawFlagsRow(ctx, flags, cx, y + (h - fs) / 2, fs, { ring: o.bg ? 3 : 0, ringColor: o.bg });
    cx += flagsRowWidth(flags.length, fs) + (o.flagGap ?? 12);
  }
  if (o.dot) {
    const ds = o.dotSize || 18;
    fillCircle(ctx, cx + ds / 2, y + h / 2, ds / 2, o.dot);
    cx += ds + gap;
  }
  const lt = layoutText(ctx, text, st, 1e6);
  lt.draw(ctx, cx, y + (o.padY ?? 18), { color: o.color || C.ink });
  return { w, h };
}

/*
 * Цвета плашек рубрик — раздел «Цветовое кодирование рубрик». surface —
 * на каком фоне стоит плашка: на синем и на Ink некоторые рубрики
 * инвертируются, как в шаблонах брендбука (профиль вуза, вебинар, цифры).
 */
const RUBRICS = {
  news: { label: 'Новости' },
  deadline: { label: 'Дедлайн' },
  uni: { label: 'Университеты' },
  grants: { label: 'Гранты' },
  countries: { label: 'Страны' },
  webinar: { label: 'Вебинар' },
  stories: { label: 'Истории' },
  guide: { label: 'Гайд' },
  numbers: { label: 'Цифры' },
  partner: { label: 'Партнёрский материал' },
  interview: { label: 'Интервью' },
  quiz: { label: 'Квиз' },
  resources: { label: 'Подборка' },
};

function rubricPillStyle(rubric, surface = 'light') {
  const onBlue = surface === 'blue';
  const onInk = surface === 'ink';
  switch (rubric) {
    case 'news': return onInk ? { bg: C.white, color: C.ink } : { bg: C.ink, color: C.white };
    case 'deadline': return onInk || onBlue ? { bg: C.coral, color: C.ink } : { bg: C.coral, color: C.ink };
    case 'uni': return onBlue ? { bg: C.white, color: C.blue } : { bg: C.blue, color: C.white };
    case 'grants': return { bg: C.lime, color: C.ink };
    case 'countries': return { bg: C.sky, color: C.ink };
    case 'webinar':
      if (onInk) return { border: C.bridgeLight, color: C.white, dot: C.coral };
      if (onBlue) return { bg: C.white, color: C.blue, dot: C.coral };
      return { bg: C.white, color: C.blue, border: C.blue, dot: C.coral };
    case 'stories':
    case 'interview': return { bg: C.skyTint, color: C.blue };
    case 'guide': return { bg: C.mist, color: C.ink };
    case 'numbers': return onBlue || onInk ? { bg: C.paper, color: C.ink } : { bg: C.paper, color: C.ink, border: C.ink };
    case 'partner': return onBlue || onInk ? { bg: C.white, color: C.slate } : { border: C.slate, color: C.slate };
    case 'quiz': return { bg: C.lime, color: C.ink };
    case 'resources': return onBlue ? { bg: C.white, color: C.blue } : onInk ? { bg: C.paper, color: C.ink } : { bg: C.mist, color: C.ink };
    default: return { bg: C.mist, color: C.ink };
  }
}

function drawRubric(ctx, x, y, rubric, surface, o = {}) {
  const style = rubricPillStyle(rubric, surface);
  const text = o.text || (RUBRICS[rubric] ? RUBRICS[rubric].label : '');
  return drawPill(ctx, x, y, text, Object.assign({}, style, o));
}

function rubricWidth(ctx, rubric, surface, o = {}) {
  const style = rubricPillStyle(rubric, surface);
  const text = o.text || (RUBRICS[rubric] ? RUBRICS[rubric].label : '');
  return pillMetrics(ctx, text, Object.assign({}, style, o));
}

/* ---------------------------------------------------------- прогресс-бар */

/* Прогресс карусели: n сегментов, первые filled — синие. segW = null → сегменты делят ширину поровну. */
function drawProgress(ctx, x, y, w, n, filled, o = {}) {
  const h = o.h || 8;
  const gap = o.gap ?? 10;
  const segW = o.segW || (w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    fillRR(ctx, x + i * (segW + gap), y, segW, h, h / 2, i < filled ? (o.on || C.blue) : (o.off || C.mist));
  }
  return n * segW + (n - 1) * gap;
}
