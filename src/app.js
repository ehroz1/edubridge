/*
 * Интерфейс конструктора: экран выбора шаблона, редактор слайдов, фото и
 * видео, отмена действий, черновики, экспорт. Отрисовка макетов — в
 * render.js и templates.js, здесь только связка с DOM.
 */

const STORE_DRAFTS = 'edubridge.drafts.v1';
const STORE_THEME = 'edubridge.theme.v1';
const STORE_EXPORT = 'edubridge.export.v1';
const STORE_INSTALL_DISMISSED = 'edubridge.installDismissed.v1';
const DRAFTS_LIMIT = 40;
const ZOOM_MIN = 1, ZOOM_MAX = 4;
const UNDO_LIMIT = 100;
const UNDO_COALESCE_MS = 900;   // серия быстрых правок одного поля — один шаг отмены
const UPSCALE_WARN = 1.35;      // фото растянуто сильнее — будет мыльным

const state = {
  fontsReady: false,
  filter: 'all',
  draft: null,          // { id, templateId, name, mode, slides: [{ id, kind, data, tune }], updatedAt }
  media: {},            // id слайда → { ключ поля → { el, zoom, panX, panY, name, isVideo } } — только в памяти
  current: 0,
  guides: false,
  exportFormat: 'png',
  exportScale: 1,
  focusMedia: null,     // { slideId, key } — рамка фото, выбранная кликом на сцене
  stage: null,          // { cssW, scale, slots, warnings } — последняя отрисовка сцены
  preview: null,        // { tpl, slides, index } — открытое окно шаблона
  pendingFile: null,    // { slideId, key } — куда положить файл из диалога выбора
};

const el = {};

/* ================================================================ утилиты */

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function storeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function storeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

let statusTimer = null;
function say(text) {
  el.status.textContent = text;
  el.status.classList.add('show');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => el.status.classList.remove('show'), 3800);
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ә: 'a', ғ: 'g', қ: 'q', ң: 'n', ө: 'o', ұ: 'u',
  ү: 'u', һ: 'h', і: 'i',
};
function slug(text) {
  return String(text || '').toLowerCase().split('').map(ch => TRANSLIT[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'slide';
}

function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'только что';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} ${plural(m, 'минуту', 'минуты', 'минут')} назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function isTyping(target) {
  return target && (target.tagName === 'INPUT' && target.type !== 'range' && target.type !== 'checkbox' ||
    target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
}

/* =================================================================== иконки */

function iconSvg(name) {
  return (typeof ICONS !== 'undefined' && ICONS[name]) || '';
}
function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(node => {
    if (node.dataset.painted === node.dataset.icon) return;
    const svg = iconSvg(node.dataset.icon);
    if (!svg) return;
    // у кнопок с текстом иконка — первый элемент, у кнопок-иконок — всё содержимое
    if (node.classList.contains('icon-btn') || !node.childElementCount && !node.textContent.trim()) node.innerHTML = svg;
    else node.insertAdjacentHTML('afterbegin', svg);
    node.dataset.painted = node.dataset.icon;
  });
}
function glyphSvg(name) {
  const paths = GLYPHS[name] || [];
  return `<svg viewBox="0 0 256 256" aria-hidden="true">${paths.map(d => `<path d="${d}"/>`).join('')}</svg>`;
}
function logoSvg() {
  const L = BRAND_PATHS.logo;
  return `<svg viewBox="${L.vb.join(' ')}" role="img" aria-label="edubridge">` +
    `<path fill="currentColor" fill-rule="${L.wordRule}" d="${L.word}"/>` +
    `<path class="arc" d="${L.arc}"/></svg>`;
}
function btn(icon, title, cls = 'icon-btn sm') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.innerHTML = iconSvg(icon);
  return b;
}

/* ===================================================================== тема */

function systemPrefersDark() {
  return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function isDarkActive() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : systemPrefersDark();
}
function syncThemeButtons() {
  const dark = isDarkActive();
  for (const b of [el.btnTheme, el.btnThemePicker]) {
    b.title = dark ? 'Светлая тема' : 'Тёмная тема';
    b.innerHTML = iconSvg(dark ? 'sun' : 'moon');
  }
}
function toggleTheme() {
  const next = isDarkActive() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(STORE_THEME, next); } catch { /* не запомнится — не страшно */ }
  syncThemeButtons();
}

/* ======================================================= установка на телефон */
/*
 * Как в card-maker: на Android ловим beforeinstallprompt и показываем свою
 * кнопку «Установить», на iOS — подсказку про «Поделиться → На экран
 * «Домой»» (программной установки там нет). Один раз закрыли — больше не
 * показываем; уже установлено — тоже.
 */
let deferredInstallPrompt = null;
function isStandaloneDisplay() {
  return Boolean((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone);
}
function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function showInstallBanner(mode) {
  el.installBannerText.textContent = mode === 'ios'
    ? 'Установи на телефон: «Поделиться» внизу браузера → «На экран «Домой»».'
    : 'Установи конструктор на телефон — иконка на рабочем столе, работает офлайн.';
  el.installBannerAction.hidden = mode === 'ios';
  el.installBanner.hidden = false;
}
function wireInstallBanner() {
  let dismissed = false;
  try { dismissed = localStorage.getItem(STORE_INSTALL_DISMISSED) === '1'; } catch { /* не критично */ }
  if (dismissed || isStandaloneDisplay()) return;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner('android');
  });
  if (isIosDevice()) showInstallBanner('ios');
  el.installBannerAction.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    el.installBanner.hidden = true;
  });
  el.installBannerClose.addEventListener('click', () => {
    el.installBanner.hidden = true;
    try { localStorage.setItem(STORE_INSTALL_DISMISSED, '1'); } catch { /* не критично */ }
  });
  window.addEventListener('appinstalled', () => { el.installBanner.hidden = true; });
}

/* ================================================================ отрисовка */

function templateOf(draft) { return templateById(draft.templateId); }
function formatOf(slide) { return FORMATS[KINDS[slide.kind].format]; }
function currentSlide() { return state.draft ? state.draft.slides[state.current] : null; }
function mediaOf(slideId, key) {
  const m = state.media[slideId] && state.media[slideId][key];
  return m && m.el ? m : null;
}

function lineWord(n) { return `${n} ${plural(n, 'строка', 'строки', 'строк')}`; }

/*
 * Рисует один слайд. Среда env — всё, что шаблону нужно знать о своём
 * окружении: размер, позицию в карусели, фото, подстройку кегля, и куда
 * складывать предупреждения («не помещается», «больше 3 строк») и рамки
 * фото (для перетаскивания и кликов на сцене).
 */
function renderSlide(ctx, slide, index, slides, tpl, opts = {}) {
  const def = KINDS[slide.kind];
  const fmt = FORMATS[def.format];
  const media = opts.media ?? (state.media[slide.id] || {});
  const warnings = [];
  const slots = [];
  const warn = msg => { if (!warnings.includes(msg)) warnings.push(msg); };
  const fieldLabel = key => (def.fields.find(f => f.key === key) || {}).label || 'Фото';
  const env = {
    W: fmt.w, H: fmt.h, index, total: slides.length,
    ordinal: slides.slice(0, index).filter(s => s.kind === slide.kind).length,
    rubric: tpl ? tpl.rubric : null,
    exporting: Boolean(opts.exporting),
    warnings, slots,
    media: key => (media[key] && media[key].el ? media[key] : null),
    t(role, st) {
      const tn = slide.tune && slide.tune[role];
      if (!tn) return st;
      return Object.assign({}, st, { size: st.size * (tn.size || 100) / 100, lh: st.lh * (tn.lh || 100) / 100 });
    },
    warn,
    lines(lt, max, label) {
      if (lt.lines.length > max) warn(`${label}: ${lineWord(lt.lines.length)}, по брендбуку до ${max}`);
      if (lt.tooWide) warn(`${label}: слово не помещается по ширине`);
    },
    minSpace(value, min, msg) { if (value < min) warn(msg); },
    fits(bottom, limit, msg) { if (bottom > limit + 0.5) warn(msg); },
    slot(key, x, y, w, h, o = {}) { slots.push({ key, x, y, w, h, opts: o }); },
    photo(key, x, y, w, h, o = {}) {
      slots.push({ key, x, y, w, h, opts: o });
      const m = media[key] && media[key].el ? media[key] : null;
      drawMedia(ctx, m, x, y, w, h, o);
      if (m && o.fit !== 'contain') {
        const g = mediaGeometry(m, w, h, o.fit);
        const [iw] = mediaSize(m.el);
        if (g && iw && g.dw / iw > UPSCALE_WARN) warn(`${fieldLabel(key)}: мало пикселей, будет мыльно — нужен файл покрупнее`);
      }
    },
  };
  ctx.save();
  try {
    def.draw(ctx, slide.data, env);
  } catch (err) {
    console.error('ошибка отрисовки слайда', slide.kind, err);
    warn('Ошибка отрисовки: ' + err.message);
  }
  ctx.restore();
  return { warnings, slots, W: fmt.w, H: fmt.h };
}

/* Рисует слайд в canvas шириной cssW (CSS-пиксели) с учётом плотности экрана. */
function paintCanvas(canvas, slide, index, slides, tpl, cssW, opts = {}) {
  const fmt = formatOf(slide);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = (cssW * dpr) / fmt.w;
  const pw = Math.max(1, Math.round(fmt.w * scale));
  const ph = Math.max(1, Math.round(fmt.h * scale));
  if (canvas.width !== pw) canvas.width = pw;
  if (canvas.height !== ph) canvas.height = ph;
  canvas.style.width = cssW + 'px';
  canvas.style.height = (cssW * fmt.h / fmt.w) + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, pw, ph);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const res = renderSlide(ctx, slide, index, slides, tpl, opts);
  res.ctx = ctx;
  res.scale = scale;
  return res;
}

/* Ширина превью, чтобы слайд вписался в коробку boxW×boxH. */
function fitWidth(slide, boxW, boxH) {
  const fmt = formatOf(slide);
  return Math.max(10, Math.floor(Math.min(boxW, boxH * fmt.w / fmt.h)));
}

/* Проверка без показа — для «Уместить» и красных точек у слайдов. */
let scratchCanvas = null;
function checkSlide(slide, index, slides, tpl) {
  if (!scratchCanvas) scratchCanvas = document.createElement('canvas');
  scratchCanvas.width = 108; scratchCanvas.height = 192;
  const ctx = scratchCanvas.getContext('2d');
  const fmt = formatOf(slide);
  ctx.setTransform(108 / fmt.w, 0, 0, 108 / fmt.w, 0, 0);
  return renderSlide(ctx, slide, index, slides, tpl).warnings;
}

/* Сетка и безопасные зоны — раздел «Модульная сетка для соцсетей». Только в превью. */
function drawGuides(ctx, slide) {
  const def = KINDS[slide.kind];
  const { w: W, h: H } = FORMATS[def.format];
  ctx.save();
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 12]);
  if (def.format === 'post') {
    const colW = (920 - 5 * 24) / 6;
    ctx.fillStyle = 'rgba(10,52,245,0.07)';
    for (let i = 0; i < 6; i++) ctx.fillRect(80 + i * (colW + 24), 80, colW, H - 160);
    ctx.fillStyle = 'rgba(18,20,24,0.10)';
    ctx.fillRect(80, 80, 920, 64);
    ctx.fillRect(80, H - 80 - 64, 920, 64);
    ctx.strokeStyle = 'rgba(10,52,245,0.55)';
    ctx.strokeRect(80, 80, 920, H - 160);
    ctx.strokeStyle = '#FF5A36';
    ctx.beginPath();
    ctx.moveTo(34, 0); ctx.lineTo(34, H);
    ctx.moveTo(W - 34, 0); ctx.lineTo(W - 34, H);
    ctx.stroke();
  } else if (def.format === 'story') {
    ctx.fillStyle = 'rgba(255,90,54,0.22)';
    ctx.fillRect(0, 0, W, 250);
    ctx.fillRect(0, H - 340, W, 340);
    ctx.strokeStyle = 'rgba(10,52,245,0.7)';
    ctx.strokeRect(0, 240, W, 1440);
    ctx.strokeStyle = 'rgba(18,20,24,0.35)';
    ctx.strokeRect(80, 250, 920, H - 590);
  } else if (def.format === 'wide') {
    ctx.strokeStyle = 'rgba(10,52,245,0.6)';
    ctx.strokeRect(64, 64, W - 128, H - 128);
  } else {
    ctx.strokeStyle = 'rgba(10,52,245,0.6)';
    ctx.strokeRect(96, 54, W - 192, H - 108);
  }
  ctx.restore();
}

/* ============================================================ выбор шаблона */

function buildSlidesFrom(tpl, mode) {
  return tpl.slides.map(s => ({
    id: uid(),
    kind: s.kind,
    data: mode === 'empty' ? emptyData(s.kind, s.data) : sampleData(s.kind, s.data),
    tune: {},
  }));
}

/* Примеры слайдов для превью шаблонов — считаются один раз. */
const previewSlidesCache = new Map();
function previewSlides(tpl) {
  if (!previewSlidesCache.has(tpl.id)) previewSlidesCache.set(tpl.id, buildSlidesFrom(tpl, 'sample'));
  return previewSlidesCache.get(tpl.id);
}

function groupCount(group) {
  return TEMPLATES.filter(t => group === 'all' || t.group === group).length;
}

function buildFilters() {
  el.filters.innerHTML = '';
  const items = [['all', 'Все']].concat(GROUPS.map(g => [g[0], g[1]]));
  for (const [id, name] of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn' + (state.filter === id ? ' on' : '');
    b.innerHTML = `${name}<span class="count">${groupCount(id)}</span>`;
    b.addEventListener('click', () => {
      state.filter = id;
      buildFilters();
      buildGallery();
    });
    el.filters.appendChild(b);
  }
}

function slideCountText(n) { return `${n} ${plural(n, 'слайд', 'слайда', 'слайдов')}`; }

function buildGallery() {
  el.gallery.innerHTML = '';
  const tiles = [];
  for (const [gid, gname, gsub] of GROUPS) {
    if (state.filter !== 'all' && state.filter !== gid) continue;
    const list = TEMPLATES.filter(t => t.group === gid);
    if (!list.length) continue;
    const section = document.createElement('section');
    section.className = 'group';
    section.innerHTML = `<div class="group-head"><h2>${gname}</h2><span class="muted">${gsub}</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const tpl of list) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tpl-tile';
      tile.dataset.tpl = tpl.id;
      const n = tpl.slides.length;
      const fmt = FORMATS[KINDS[tpl.slides[0].kind].format];
      tile.innerHTML =
        `<div class="well"><div class="stack">${n > 1 ? '<i class="behind b2"></i><i class="behind b1"></i>' : ''}<canvas></canvas></div>` +
        (n > 1 ? `<span class="badge">${slideCountText(n)}</span>` : '') + '</div>' +
        `<span class="t-name"></span><span class="t-desc"></span>` +
        `<span class="t-meta"><span class="chip">${fmt.label}</span><span class="chip">${tpl.volume}</span></span>`;
      tile.querySelector('.t-name').textContent = tpl.name;
      tile.querySelector('.t-desc').textContent = tpl.desc;
      tile.addEventListener('click', () => openTemplate(tpl.id));
      grid.appendChild(tile);
      tiles.push(tile);
    }
    section.appendChild(grid);
    el.gallery.appendChild(section);
  }
  requestAnimationFrame(() => paintTiles(tiles));
}

function paintTiles(tiles = [...el.gallery.querySelectorAll('.tpl-tile')]) {
  if (!state.fontsReady) return;
  for (const tile of tiles) {
    const tpl = templateById(tile.dataset.tpl);
    const well = tile.querySelector('.well');
    const slides = previewSlides(tpl);
    const pad = slides.length > 1 ? 40 : 28;
    const w = fitWidth(slides[0], well.clientWidth - pad, well.clientHeight - pad);
    paintCanvas(tile.querySelector('canvas'), slides[0], 0, slides, tpl, w, { media: {} });
    tile.querySelectorAll('.behind').forEach(b => { b.style.width = w + 'px'; });
  }
}

/* ---------------------------------------------------- окно шаблона */

function openTemplate(id) {
  const tpl = templateById(id);
  if (!tpl) return;
  state.preview = { tpl, slides: previewSlides(tpl), index: 0 };
  const fmt = FORMATS[KINDS[tpl.slides[0].kind].format];
  const groupName = (GROUPS.find(g => g[0] === tpl.group) || [])[1] || '';
  el.tplChips.innerHTML = '';
  for (const [text, cls] of [[groupName, 'dark'], [fmt.label, ''], [slideCountText(tpl.slides.length), 'blue']]) {
    const c = document.createElement('span');
    c.className = 'chip ' + cls;
    c.textContent = text;
    el.tplChips.appendChild(c);
  }
  el.tplTitle.textContent = tpl.name;
  el.tplDesc.textContent = tpl.desc;
  el.tplRules.innerHTML = '';
  for (const [k, v] of [['Главное правило', tpl.rule], ['Структура', tpl.structure], ['Объём', tpl.volume]]) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    el.tplRules.append(dt, dd);
  }
  el.tplSlides.innerHTML = '';
  const kinds = [...new Set(tpl.slides.map(s => s.kind).concat(tpl.allowed))];
  for (const k of kinds) {
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = KINDS[k].name;
    el.tplSlides.appendChild(c);
  }
  el.tplStrip.innerHTML = '';
  state.preview.slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = `Слайд ${i + 1}: ${KINDS[s.kind].name}`;
    b.appendChild(document.createElement('canvas'));
    b.addEventListener('click', () => { state.preview.index = i; paintTemplatePreview(); });
    el.tplStrip.appendChild(b);
  });
  el.tplStrip.hidden = state.preview.slides.length < 2;
  el.tplModal.hidden = false;
  paintTemplatePreview(true);
  el.tplUse.focus();
}

function paintTemplatePreview(withStrip = false) {
  const p = state.preview;
  if (!p || !state.fontsReady) return;
  const slide = p.slides[p.index];
  const box = el.tplCanvas.parentElement;
  const cs = getComputedStyle(box);
  const bw = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const bh = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  paintCanvas(el.tplCanvas, slide, p.index, p.slides, p.tpl, fitWidth(slide, bw, bh), { media: {} });
  [...el.tplStrip.children].forEach((b, i) => {
    b.classList.toggle('on', i === p.index);
    if (withStrip) {
      const s = p.slides[i];
      paintCanvas(b.querySelector('canvas'), s, i, p.slides, p.tpl, fitWidth(s, 120, 84), { media: {} });
    }
  });
  const active = el.tplStrip.children[p.index];
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function closeTemplate() {
  el.tplModal.hidden = true;
  state.preview = null;
}

/* ---------------------------------------------------- черновики */

function loadDrafts() {
  const list = storeGet(STORE_DRAFTS, []);
  if (!Array.isArray(list)) return [];
  return list.filter(d => d && templateById(d.templateId) && Array.isArray(d.slides) &&
    d.slides.length && d.slides.every(s => s && KINDS[s.kind]));
}

/* Дополняет данные слайда полями, которых не было при сохранении (шаблон мог обновиться). */
function normalizeDraft(d) {
  return {
    id: d.id || uid(),
    templateId: d.templateId,
    name: d.name || templateById(d.templateId).name,
    mode: d.mode || 'sample',
    updatedAt: d.updatedAt || Date.now(),
    slides: d.slides.map(s => ({
      id: s.id || uid(),
      kind: s.kind,
      data: Object.assign(emptyData(s.kind), s.data || {}),
      tune: s.tune || {},
    })),
  };
}

function saveDraftNow() {
  clearTimeout(saveTimer);
  if (!state.draft) return;
  state.draft.updatedAt = Date.now();
  const list = loadDrafts().filter(d => d.id !== state.draft.id);
  list.unshift(clone(state.draft));
  if (!storeSet(STORE_DRAFTS, list.slice(0, DRAFTS_LIMIT))) {
    // место в localStorage кончилось — выкидываем старые черновики
    storeSet(STORE_DRAFTS, list.slice(0, 10));
  }
}
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraftNow, 500);
}

function deleteDraft(id) {
  storeSet(STORE_DRAFTS, loadDrafts().filter(d => d.id !== id));
  buildDrafts();
}

function buildDrafts() {
  const drafts = loadDrafts();
  el.draftsSection.hidden = !drafts.length;
  el.draftsRow.innerHTML = '';
  for (const raw of drafts) {
    const d = normalizeDraft(raw);
    const tpl = templateById(d.templateId);
    const card = document.createElement('div');
    card.className = 'draft';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.innerHTML = '<div class="thumb"><canvas></canvas></div><span class="name"></span><span class="meta"></span>';
    card.querySelector('.name').textContent = d.name;
    const parts = [slideCountText(d.slides.length), timeAgo(d.updatedAt)];
    if (d.name.trim() !== tpl.name) parts.unshift(tpl.name);
    card.querySelector('.meta').textContent = parts.join(' · ');
    const del = btn('trash', 'Удалить черновик', 'icon-btn sm del');
    del.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Удалить черновик «${d.name}»?`)) deleteDraft(d.id);
    });
    card.appendChild(del);
    const open = () => openEditor(d, { restored: true });
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    el.draftsRow.appendChild(card);
    if (state.fontsReady) {
      paintCanvas(card.querySelector('canvas'), d.slides[0], 0, d.slides, tpl, fitWidth(d.slides[0], 176, 150), { media: {} });
    }
  }
}

/* ================================================================= редактор */

function startDraft(tpl, mode) {
  const draft = {
    id: uid(), templateId: tpl.id, name: tpl.name, mode,
    updatedAt: Date.now(), slides: buildSlidesFrom(tpl, mode),
  };
  closeTemplate();
  openEditor(draft, { fresh: true });
  saveDraftNow();
}

function openEditor(draft, opts = {}) {
  stopAllPreviews();
  state.draft = draft;
  state.media = {};
  state.current = 0;
  state.focusMedia = null;
  undoStack.length = 0;
  redoStack.length = 0;
  syncUndoButtons();
  el.picker.hidden = true;
  el.editor.hidden = false;
  el.exportPop.hidden = true;
  el.addMenu.hidden = true;
  if (!history.state || history.state.screen !== 'editor') history.pushState({ screen: 'editor' }, '', '#edit');
  el.docName.value = draft.name;
  const fmt = FORMATS[KINDS[draft.slides[0].kind].format];
  el.docFormat.textContent = `${templateOf(draft).name} · ${fmt.label}`;
  buildSlidesList();
  buildForm();
  requestAnimationFrame(() => { renderStage(); paintThumbs(); });
  window.scrollTo(0, 0);
  if (opts.restored) say('Черновик открыт. Фото и видео не сохраняются между сессиями — добавь их заново');
}

function closeEditor(fromHistory = false) {
  if (!state.draft) return;
  stopAllPreviews();
  saveDraftNow();
  state.draft = null;
  state.media = {};
  el.editor.hidden = true;
  el.picker.hidden = false;
  buildDrafts();
  requestAnimationFrame(() => paintTiles());
  if (!fromHistory && history.state && history.state.screen === 'editor') history.back();
}

function selectSlide(i) {
  if (!state.draft) return;
  const n = state.draft.slides.length;
  i = clamp(i, 0, n - 1);
  if (i !== state.current) stopAllPreviews();
  state.current = i;
  state.focusMedia = null;
  syncSlidesSelection();
  buildForm();
  renderStage();
}

/* Любая правка содержимого: перерисовать сцену сразу, миниатюры — чуть погодя, сохранить. */
let stageRaf = null;
function changed() {
  if (!stageRaf) stageRaf = requestAnimationFrame(() => { stageRaf = null; renderStage(); });
  scheduleThumbs();
  scheduleSave();
}

/* ---------------------------------------------------- список слайдов */

function buildSlidesList() {
  const d = state.draft;
  const tpl = templateOf(d);
  el.slidesList.innerHTML = '';
  d.slides.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'slide-item';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.draggable = true;
    item.dataset.index = i;
    item.innerHTML = '<div class="thumb"><canvas></canvas></div><div class="cap"><span class="num"></span><span class="kname"></span></div><div class="tools"></div>';
    item.querySelector('.num').textContent = i + 1;
    item.querySelector('.kname').textContent = KINDS[s.kind].name;
    const tools = item.querySelector('.tools');
    const bUp = btn('arrow-up', 'Переместить раньше');
    const bDown = btn('arrow-down', 'Переместить позже');
    const bDup = btn('copy', 'Дублировать слайд');
    const bDel = btn('trash', 'Удалить слайд');
    bUp.disabled = i === 0;
    bDown.disabled = i === d.slides.length - 1;
    bDup.disabled = d.slides.length >= tpl.max;
    bDel.disabled = d.slides.length <= 1;
    bUp.addEventListener('click', e => { e.stopPropagation(); moveSlide(i, i - 1); });
    bDown.addEventListener('click', e => { e.stopPropagation(); moveSlide(i, i + 1); });
    bDup.addEventListener('click', e => { e.stopPropagation(); duplicateSlide(i); });
    bDel.addEventListener('click', e => { e.stopPropagation(); deleteSlide(i); });
    tools.append(bUp, bDown, bDup, bDel);
    item.addEventListener('click', () => selectSlide(i));
    item.addEventListener('keydown', e => {
      if (e.target !== item) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSlide(i); }
    });
    item.addEventListener('dragstart', e => {
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/x-slide', String(i));
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => {
      if (![...e.dataTransfer.types].includes('text/x-slide')) return;
      e.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      item.classList.remove('drag-over');
      const from = Number(e.dataTransfer.getData('text/x-slide'));
      if (Number.isNaN(from) || e.dataTransfer.files.length) return;
      e.preventDefault();
      moveSlide(from, i);
    });
    el.slidesList.appendChild(item);
  });
  el.btnAddSlide.disabled = d.slides.length >= tpl.max;
  el.btnAddSlide.title = d.slides.length >= tpl.max ? `В этом шаблоне до ${slideCountText(tpl.max)}` : 'Добавить слайд';
  syncSlidesSelection();
  scheduleThumbs();
}

function syncSlidesSelection() {
  [...el.slidesList.children].forEach((item, i) => item.classList.toggle('on', i === state.current));
  const active = el.slidesList.children[state.current];
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const n = state.draft.slides.length;
  el.slideCounter.textContent = `${state.current + 1} / ${n}`;
  el.btnPrev.disabled = state.current === 0;
  el.btnNext.disabled = state.current === n - 1;
}

let thumbsTimer = null;
function scheduleThumbs() {
  clearTimeout(thumbsTimer);
  thumbsTimer = setTimeout(paintThumbs, 140);
}
function paintThumbs() {
  if (!state.fontsReady || !state.draft) return;
  const d = state.draft;
  const tpl = templateOf(d);
  [...el.slidesList.children].forEach((item, i) => {
    const s = d.slides[i];
    if (!s) return;
    const thumb = item.querySelector('.thumb');
    const w = Math.max(40, thumb.clientWidth);
    const res = paintCanvas(item.querySelector('canvas'), s, i, d.slides, tpl, w);
    const cap = item.querySelector('.cap');
    let dot = cap.querySelector('.warn-dot');
    if (res.warnings.length && !dot) {
      dot = document.createElement('i');
      dot.className = 'warn-dot';
      cap.appendChild(dot);
    } else if (!res.warnings.length && dot) dot.remove();
    if (dot) dot.title = res.warnings.join('\n');
  });
}

function insertSlide(kind) {
  const d = state.draft;
  const tpl = templateOf(d);
  if (d.slides.length >= tpl.max) { say(`В этом шаблоне до ${slideCountText(tpl.max)}`); return; }
  pushUndo();
  const slide = { id: uid(), kind, data: d.mode === 'empty' ? emptyData(kind) : sampleData(kind), tune: {} };
  d.slides.splice(state.current + 1, 0, slide);
  state.current += 1;
  el.addMenu.hidden = true;
  buildSlidesList();
  buildForm();
  changed();
}

function duplicateSlide(i) {
  const d = state.draft;
  const tpl = templateOf(d);
  if (d.slides.length >= tpl.max) { say(`В этом шаблоне до ${slideCountText(tpl.max)}`); return; }
  pushUndo();
  const src = d.slides[i];
  const copy = { id: uid(), kind: src.kind, data: clone(src.data), tune: clone(src.tune || {}) };
  d.slides.splice(i + 1, 0, copy);
  const media = state.media[src.id];
  if (media) {
    state.media[copy.id] = {};
    for (const [k, m] of Object.entries(media)) {
      // у <video> одна общая позиция воспроизведения — копии нужен свой элемент на тот же файл
      state.media[copy.id][k] = Object.assign({}, m, { el: m.isVideo ? cloneVideo(m.el) : m.el });
    }
  }
  state.current = i + 1;
  buildSlidesList();
  buildForm();
  changed();
}

function deleteSlide(i) {
  const d = state.draft;
  if (d.slides.length <= 1) return;
  pushUndo();
  const [removed] = d.slides.splice(i, 1);
  stopVideosOf(removed.id);
  if (state.current >= d.slides.length) state.current = d.slides.length - 1;
  else if (i < state.current) state.current -= 1;
  buildSlidesList();
  buildForm();
  changed();
  say('Слайд удалён — ⌘Z вернёт');
}

function moveSlide(from, to) {
  const d = state.draft;
  if (to < 0 || to >= d.slides.length || from === to) return;
  pushUndo();
  const [s] = d.slides.splice(from, 1);
  d.slides.splice(to, 0, s);
  state.current = to;
  buildSlidesList();
  buildForm();
  changed();
}

function buildAddMenu() {
  const tpl = templateOf(state.draft);
  el.addMenu.innerHTML = '';
  for (const kind of tpl.allowed) {
    const b = document.createElement('button');
    b.type = 'button';
    const c = document.createElement('canvas');
    const label = document.createElement('span');
    label.innerHTML = `${KINDS[kind].name}<span class="muted">${FORMATS[KINDS[kind].format].label}</span>`;
    b.append(c, label);
    b.addEventListener('click', () => insertSlide(kind));
    el.addMenu.appendChild(b);
    const s = { id: 'menu', kind, data: sampleData(kind), tune: {} };
    paintCanvas(c, s, 0, [s], tpl, 44, { media: {} });
  }
}

/* ---------------------------------------------------------------- сцена */

function renderStage(opts = {}) {
  const slide = currentSlide();
  if (!slide || !state.fontsReady || el.editor.hidden) return;
  const d = state.draft;
  const box = el.stage;
  const cs = getComputedStyle(box);
  const bw = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const bh = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const cssW = fitWidth(slide, bw, bh);
  const res = paintCanvas(el.stageCanvas, slide, state.current, d.slides, templateOf(d), cssW);
  if (state.guides) drawGuides(res.ctx, slide);
  state.stage = { cssW, k: cssW / res.W, slots: res.slots, warnings: res.warnings, W: res.W, H: res.H };
  if (opts.canvasOnly) return;
  updateOverlay();
  updateWarnings(res.warnings);
}

/* Кнопки поверх сцены: «добавить фото» на пустых рамках, управление выбранным фото и видео. */
function updateOverlay() {
  const slide = currentSlide();
  const st = state.stage;
  el.stageOverlay.innerHTML = '';
  if (!slide || !st) return;
  const def = KINDS[slide.kind];
  const seen = new Set();
  for (const s of st.slots) {
    if (seen.has(s.key)) continue;
    seen.add(s.key);
    const field = def.fields.find(f => f.key === s.key);
    if (!field) continue;
    const m = mediaOf(slide.id, s.key);
    const cx = (s.x + s.w / 2) * st.k;
    const cy = (s.y + s.h / 2) * st.k;
    if (!m) {
      const compact = s.w * st.k < 150 || s.h * st.k < 60;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot-hint' + (compact ? ' compact' : '');
      b.innerHTML = iconSvg('image') + (compact ? '' : `<span>${field.video ? 'Фото или видео' : field.fit === 'contain' ? 'Логотип' : 'Фото'}</span>`);
      b.title = `${field.label}: перетащи файл сюда или нажми, чтобы выбрать`;
      b.style.left = cx + 'px';
      b.style.top = cy + 'px';
      b.addEventListener('click', () => pickFile(slide.id, s.key));
      el.stageOverlay.appendChild(b);
      continue;
    }
    const focused = state.focusMedia && state.focusMedia.slideId === slide.id && state.focusMedia.key === s.key;
    if (!focused && !m.isVideo) continue;
    const tools = document.createElement('div');
    tools.className = 'media-tools';
    const bottom = Math.min((s.y + s.h) * st.k, st.H * st.k) - 52;
    tools.style.left = cx + 'px';
    tools.style.top = Math.max(8, bottom) + 'px';
    const add = (icon, text, title, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = title;
      b.innerHTML = iconSvg(icon) + (text ? `<span>${text}</span>` : '');
      b.addEventListener('click', e => { e.stopPropagation(); fn(); });
      tools.appendChild(b);
      return b;
    };
    if (m.isVideo) {
      add(m.el.paused ? 'play' : 'pause', '', m.el.paused ? 'Проиграть фрагмент' : 'Пауза', () => togglePlay(slide.id, s.key));
      add('scissors', '', 'Обрезать видео', () => trimMedia(slide.id, s.key));
    }
    add('image', 'Заменить', 'Заменить файл', () => pickFile(slide.id, s.key));
    add('x', '', 'Убрать', () => removeMedia(slide.id, s.key));
    el.stageOverlay.appendChild(tools);
  }
}

function updateWarnings(warnings) {
  el.warnings.innerHTML = '';
  if (!warnings.length) {
    const ok = document.createElement('span');
    ok.className = 'ok';
    ok.textContent = 'Всё помещается';
    el.warnings.appendChild(ok);
    return;
  }
  for (const w of warnings) {
    const chip = document.createElement('span');
    chip.className = 'warn';
    chip.innerHTML = iconSvg('warning');
    chip.appendChild(document.createTextNode(w));
    el.warnings.appendChild(chip);
  }
  const slide = currentSlide();
  if (slide && KINDS[slide.kind].tune && warnings.some(isTextWarning)) {
    const fit = document.createElement('button');
    fit.type = 'button';
    fit.className = 'btn btn-outline btn-sm';
    fit.innerHTML = iconSvg('magic-wand') + '<span>Уместить</span>';
    fit.title = 'Уменьшить кегль, пока текст не поместится';
    fit.addEventListener('click', autoFit);
    el.warnings.appendChild(fit);
  }
}

/* Предупреждения про текст (а не про фото) — их лечит «Уместить». */
function isTextWarning(w) { return !/мыльно|Ошибка/.test(w); }

/* Уменьшает кегль всех ролей слайда шагами по 3%, пока предупреждения о тексте не исчезнут (не ниже 70%). */
function autoFit() {
  const slide = currentSlide();
  const def = KINDS[slide.kind];
  if (!def.tune) return;
  const d = state.draft;
  const tpl = templateOf(d);
  const textIssue = ws => ws.filter(isTextWarning);
  pushUndo();
  const roles = Object.keys(def.tune);
  slide.tune = slide.tune || {};
  let size = Math.min(...roles.map(r => (slide.tune[r] && slide.tune[r].size) || 100));
  let ok = !textIssue(checkSlide(slide, state.current, d.slides, tpl)).length;
  while (!ok && size > 70) {
    size = Math.max(70, size - 3);
    for (const r of roles) slide.tune[r] = Object.assign({ lh: 100 }, slide.tune[r], { size });
    ok = !textIssue(checkSlide(slide, state.current, d.slides, tpl)).length;
  }
  buildTune();
  changed();
  say(ok ? `Уместилось: кегль ${size}%` : 'Даже при 70% не помещается — сократи текст');
}

/* -------------------------------------- перетаскивание и масштаб фото на сцене */

function canvasPoint(e) {
  const r = el.stageCanvas.getBoundingClientRect();
  const k = state.stage ? state.stage.k : 1;
  return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
}

/* Рамка под точкой: самая маленькая из подходящих (аватар поверх фона). */
function slotAt(p) {
  if (!state.stage) return null;
  let best = null;
  for (const s of state.stage.slots) {
    if (p.x < s.x || p.y < s.y || p.x > s.x + s.w || p.y > s.y + s.h) continue;
    if (!best || s.w * s.h < best.w * best.h) best = s;
  }
  return best;
}

const pointers = new Map();
let drag = null;   // { slot, m, start: {x, y}, moved, pinch }

function panBy(slot, m, dx, dy) {
  const g = mediaGeometry(m, slot.w, slot.h, slot.opts.fit);
  if (!g) return;
  if (g.dw - slot.w > 0.5) m.panX = clamp((m.panX || 0) + 2 * dx / (g.dw - slot.w), -1, 1);
  if (g.dh - slot.h > 0.5) m.panY = clamp((m.panY || 0) + 2 * dy / (g.dh - slot.h), -1, 1);
}

function setZoom(m, zoom) {
  m.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  const slide = currentSlide();
  const input = el.form.querySelector(`[data-zoom-for="${slide.id}:${state.focusMedia && state.focusMedia.key}"]`);
  if (input) { input.value = Math.round(m.zoom * 100); input.nextElementSibling.value = Math.round(m.zoom * 100) + '%'; }
}

function focusMediaSlot(key) {
  const slide = currentSlide();
  state.focusMedia = { slideId: slide.id, key };
  el.form.querySelectorAll('.field[data-media-key]').forEach(f => f.classList.toggle('focus-media', f.dataset.mediaKey === key));
}

function wireStage() {
  const cv = el.stageCanvas;
  cv.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const slide = currentSlide();
    if (pointers.size === 2 && drag && drag.m) {
      const [a, b] = [...pointers.values()];
      drag.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: drag.m.zoom || 1 };
      return;
    }
    const p = canvasPoint(e);
    const slot = slotAt(p);
    if (!slot) { drag = null; return; }
    const m = mediaOf(slide.id, slot.key);
    drag = { slot, m, last: p, start: p, moved: false, undo: false };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = canvasPoint(e);
    if (!drag) {
      const s = slotAt(p);
      cv.style.cursor = !s ? 'default' : (mediaOf(currentSlide().id, s.key) ? 'grab' : 'pointer');
      return;
    }
    if (!drag.m) return;
    if (drag.pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!drag.undo) { pushUndo('zoom'); drag.undo = true; }
      setZoom(drag.m, drag.pinch.zoom * dist / drag.pinch.dist);
      drag.moved = true;
      changed();
      return;
    }
    const dx = p.x - drag.last.x, dy = p.y - drag.last.y;
    if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 4 / state.stage.k) return;
    if (!drag.undo) { pushUndo('pan'); drag.undo = true; }
    drag.moved = true;
    cv.style.cursor = 'grabbing';
    panBy(drag.slot, drag.m, dx, dy);
    drag.last = p;
    changed();
  });
  const end = e => {
    pointers.delete(e.pointerId);
    if (!drag) return;
    if (pointers.size > 0) { drag.pinch = null; return; }
    const { slot, m, moved } = drag;
    drag = null;
    cv.style.cursor = m ? 'grab' : 'pointer';
    if (moved) return;
    if (!m) pickFile(currentSlide().id, slot.key);
    else { focusMediaSlot(slot.key); updateOverlay(); }
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);

  cv.addEventListener('wheel', e => {
    const slot = slotAt(canvasPoint(e));
    const m = slot && mediaOf(currentSlide().id, slot.key);
    if (!m) return;
    e.preventDefault();
    pushUndo('zoom');
    if (!state.focusMedia || state.focusMedia.key !== slot.key) focusMediaSlot(slot.key);
    setZoom(m, (m.zoom || 1) * Math.exp(-e.deltaY * 0.0015));
    changed();
  }, { passive: false });

  // перетаскивание файла на сцену — в рамку под курсором или в первую рамку слайда
  const inner = el.stageInner;
  el.stage.addEventListener('dragover', e => {
    if (![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    inner.classList.add('drop');
  });
  el.stage.addEventListener('dragleave', e => { if (!el.stage.contains(e.relatedTarget)) inner.classList.remove('drop'); });
  el.stage.addEventListener('drop', e => {
    inner.classList.remove('drop');
    const file = [...e.dataTransfer.files].find(isMediaFile);
    if (!file) return;
    e.preventDefault();
    const slot = slotAt(canvasPoint(e));
    const key = slot ? slot.key : firstMediaKey(currentSlide());
    if (key) setMedia(currentSlide().id, key, file);
    else say('На этом слайде нет места для фото');
  });

  if (window.ResizeObserver) new ResizeObserver(() => renderStage()).observe(el.stage);
  else window.addEventListener('resize', () => renderStage());
}

function firstMediaKey(slide, onlyEmpty = false) {
  const fields = KINDS[slide.kind].fields.filter(f => f.type === 'media');
  const pick = fields.find(f => !mediaOf(slide.id, f.key)) || (onlyEmpty ? null : fields[0]);
  return pick ? pick.key : null;
}

/* ================================================================ форма */

function buildForm() {
  const slide = currentSlide();
  if (!slide) return;
  const def = KINDS[slide.kind];
  const n = state.draft.slides.length;
  el.formEyebrow.textContent = `Слайд ${state.current + 1} из ${n} · ${FORMATS[def.format].label}`;
  el.formTitle.textContent = def.name;
  el.form.innerHTML = '';
  for (const f of def.fields) el.form.appendChild(fieldNode(slide, f));
  buildTune();
}

function fieldWrap(f, labelFor) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const label = document.createElement(labelFor ? 'label' : 'span');
  label.className = labelFor ? '' : 'flabel';
  if (labelFor) label.htmlFor = labelFor;
  label.textContent = f.label;
  wrap.appendChild(label);
  return wrap;
}
function addHint(wrap, text) {
  if (!text) return;
  const h = document.createElement('span');
  h.className = 'hint';
  h.textContent = text;
  wrap.appendChild(h);
}

function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(320, ta.scrollHeight + 2) + 'px';
}

function textInput(slide, value, multiline, onValue, tag) {
  const input = document.createElement(multiline ? 'textarea' : 'input');
  if (!multiline) input.type = 'text';
  input.value = value ?? '';
  input.spellcheck = true;
  if (multiline) {
    input.rows = 2;
    requestAnimationFrame(() => autoGrow(input));
  }
  input.addEventListener('input', () => {
    pushUndo(tag);
    onValue(input.value);
    if (multiline) autoGrow(input);
    changed();
  });
  return input;
}

function fieldNode(slide, f) {
  const d = slide.data;
  const id = `f-${slide.id}-${f.key}`;
  const tag = `field:${slide.id}:${f.key}`;
  let wrap;
  switch (f.type) {
    case 'text':
    case 'textarea': {
      wrap = fieldWrap(f, id);
      const input = textInput(slide, d[f.key], f.type === 'textarea', v => { d[f.key] = v; }, tag);
      input.id = id;
      if (f.sample && state.draft.mode === 'empty') input.placeholder = String(f.sample).split('\n')[0];
      wrap.appendChild(input);
      addHint(wrap, f.hint);
      break;
    }
    case 'select': {
      wrap = fieldWrap(f, f.key === 'bg' ? null : id);
      if (f.key === 'bg') {
        const row = document.createElement('div');
        row.className = 'swatches';
        for (const [value, name] of f.options) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'swatch' + (d[f.key] === value ? ' on' : '');
          b.innerHTML = `<i style="background:${SURFACES[value].bg}"></i>${name}`;
          b.addEventListener('click', () => {
            pushUndo();
            d[f.key] = value;
            row.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b));
            changed();
          });
          row.appendChild(b);
        }
        wrap.appendChild(row);
      } else {
        const sel = document.createElement('select');
        sel.id = id;
        for (const [value, name] of f.options) sel.add(new Option(name, value, false, d[f.key] === value));
        sel.addEventListener('change', () => { pushUndo(); d[f.key] = sel.value; changed(); });
        wrap.appendChild(sel);
      }
      addHint(wrap, f.hint);
      break;
    }
    case 'toggle': {
      wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      label.className = 'toggle';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = d[f.key] !== false && Boolean(d[f.key]);
      cb.addEventListener('change', () => { pushUndo(); d[f.key] = cb.checked; changed(); });
      label.append(cb, document.createTextNode(f.label));
      wrap.appendChild(label);
      addHint(wrap, f.hint);
      break;
    }
    case 'flag': {
      wrap = fieldWrap(f, id);
      const row = document.createElement('div');
      row.className = 'flag-row';
      const img = document.createElement('img');
      img.alt = '';
      const sel = document.createElement('select');
      sel.id = id;
      if (f.optional) sel.add(new Option('— без флага —', ''));
      for (const [code, name] of COUNTRIES) sel.add(new Option(name, code, false, d[f.key] === code));
      if (f.optional && !d[f.key]) sel.value = '';
      const sync = () => { img.src = sel.value ? FLAGS[sel.value] : ''; img.style.visibility = sel.value ? 'visible' : 'hidden'; };
      sel.addEventListener('change', () => { pushUndo(); d[f.key] = sel.value; sync(); changed(); });
      sync();
      row.append(img, sel);
      wrap.appendChild(row);
      addHint(wrap, f.hint);
      break;
    }
    case 'icon': {
      wrap = fieldWrap(f);
      const grid = document.createElement('div');
      grid.className = 'icon-grid';
      for (const [name, title] of f.options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.title = title;
        b.setAttribute('aria-label', title);
        b.className = d[f.key] === name ? 'on' : '';
        b.innerHTML = glyphSvg(name);
        b.addEventListener('click', () => {
          pushUndo();
          d[f.key] = name;
          grid.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
          changed();
        });
        grid.appendChild(b);
      }
      wrap.appendChild(grid);
      break;
    }
    case 'media':
      wrap = mediaField(slide, f);
      break;
    case 'list':
      wrap = listField(slide, f);
      break;
    default:
      wrap = document.createElement('div');
  }
  return wrap;
}

function mediaField(slide, f) {
  const wrap = fieldWrap(f);
  wrap.dataset.mediaKey = f.key;
  if (state.focusMedia && state.focusMedia.slideId === slide.id && state.focusMedia.key === f.key) wrap.classList.add('focus-media');
  const m = mediaOf(slide.id, f.key);
  const box = document.createElement('div');
  box.className = 'media-box';
  const thumb = document.createElement('div');
  thumb.className = 'mthumb';
  if (m) {
    if (m.isVideo) {
      const c = document.createElement('canvas');
      const [vw, vh] = mediaSize(m.el);
      c.width = 144; c.height = 144;
      try {
        const s = Math.max(144 / vw, 144 / vh);
        c.getContext('2d').drawImage(m.el, (144 - vw * s) / 2, (144 - vh * s) / 2, vw * s, vh * s);
      } catch { /* кадр не готов — останется штриховка */ }
      thumb.appendChild(c);
    } else {
      const img = document.createElement('img');
      img.src = m.el.src;
      img.alt = '';
      if (f.fit === 'contain') img.style.objectFit = 'contain';
      thumb.appendChild(img);
    }
  }
  const body = document.createElement('div');
  body.className = 'mbody';
  const name = document.createElement('span');
  name.className = 'mname';
  name.textContent = m ? m.name : (f.hint || (f.video ? 'Фото или видео' : 'Фото'));
  if (!m) name.style.whiteSpace = 'normal';
  const actions = document.createElement('div');
  actions.className = 'mactions';
  const up = document.createElement('button');
  up.type = 'button';
  up.className = 'btn btn-primary btn-sm';
  up.innerHTML = iconSvg('upload-simple') + `<span>${m ? 'Заменить' : 'Загрузить'}</span>`;
  up.addEventListener('click', () => pickFile(slide.id, f.key));
  actions.appendChild(up);
  if (m) {
    if (m.isVideo) {
      const tr = document.createElement('button');
      tr.type = 'button';
      tr.className = 'btn btn-ghost btn-sm';
      tr.innerHTML = iconSvg('scissors') + '<span>Обрезать</span>';
      tr.addEventListener('click', () => trimMedia(slide.id, f.key));
      actions.appendChild(tr);
    }
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'btn btn-ghost btn-sm';
    rm.innerHTML = iconSvg('x') + '<span>Убрать</span>';
    rm.addEventListener('click', () => removeMedia(slide.id, f.key));
    actions.appendChild(rm);
  }
  body.append(name, actions);
  box.append(thumb, body);
  wrap.appendChild(box);

  if (m) {
    const row = document.createElement('div');
    row.className = 'range-row';
    row.innerHTML = '<span>Масштаб</span>';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = ZOOM_MIN * 100; range.max = ZOOM_MAX * 100; range.step = 1;
    range.value = Math.round((m.zoom || 1) * 100);
    range.dataset.zoomFor = `${slide.id}:${f.key}`;
    const out = document.createElement('output');
    out.value = range.value + '%';
    range.addEventListener('input', () => {
      pushUndo('zoom-range');
      m.zoom = Number(range.value) / 100;
      out.value = range.value + '%';
      changed();
    });
    row.append(range, out);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn btn-ghost btn-sm';
    reset.textContent = 'Сбросить кадр';
    reset.addEventListener('click', () => {
      pushUndo();
      m.zoom = 1; m.panX = 0; m.panY = 0;
      range.value = 100; out.value = '100%';
      changed();
    });
    wrap.append(row, reset);
    reset.style.alignSelf = 'flex-start';
    addHint(wrap, 'На превью: перетаскивай кадр, колесо мыши или щипок — масштаб');
  }

  box.addEventListener('dragover', e => {
    if (![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    box.classList.add('drop');
  });
  box.addEventListener('dragleave', () => box.classList.remove('drop'));
  box.addEventListener('drop', e => {
    box.classList.remove('drop');
    const file = [...e.dataTransfer.files].find(isMediaFile);
    if (!file) return;
    e.preventDefault();
    setMedia(slide.id, f.key, file);
  });
  return wrap;
}

function listField(slide, f) {
  const wrap = fieldWrap(f);
  addHint(wrap, f.hint);
  const list = document.createElement('div');
  list.className = 'list';
  const rows = slide.data[f.key] || (slide.data[f.key] = []);
  const texts = f.item.filter(s => s.type === 'text');
  const inline = texts.length > 1 && texts.length <= 3 && !f.item.some(s => s.type === 'textarea');
  const rebuild = () => {
    const fresh = listField(slide, f);
    wrap.replaceWith(fresh);
    changed();
  };
  rows.forEach((row, i) => {
    const r = document.createElement('div');
    r.className = 'list-row' + (f.item.length === 1 ? ' single' : '');
    const cells = document.createElement('div');
    cells.className = 'cells' + (inline ? ' inline' : '');
    if (inline) cells.style.setProperty('--cols', texts.length);
    for (const sub of f.item) {
      if (sub.type === 'toggle') {
        const label = document.createElement('label');
        label.className = 'toggle';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = Boolean(row[sub.key]);
        cb.addEventListener('change', () => { pushUndo(); row[sub.key] = cb.checked; changed(); });
        label.append(cb, document.createTextNode(sub.label));
        cells.appendChild(label);
        continue;
      }
      const input = textInput(slide, row[sub.key], sub.type === 'textarea', v => { row[sub.key] = v; }, `list:${slide.id}:${f.key}:${i}:${sub.key}`);
      input.placeholder = sub.label;
      input.setAttribute('aria-label', `${sub.label} ${i + 1}`);
      cells.appendChild(input);
    }
    const tools = document.createElement('div');
    tools.className = 'row-tools';
    const bUp = btn('caret-up', 'Выше');
    const bDown = btn('caret-down', 'Ниже');
    const bDel = btn('x', 'Удалить строку');
    bUp.disabled = i === 0;
    bDown.disabled = i === rows.length - 1;
    bDel.disabled = rows.length <= (f.min || 0);
    bUp.addEventListener('click', () => { pushUndo(); rows.splice(i - 1, 0, rows.splice(i, 1)[0]); rebuild(); });
    bDown.addEventListener('click', () => { pushUndo(); rows.splice(i + 1, 0, rows.splice(i, 1)[0]); rebuild(); });
    bDel.addEventListener('click', () => { pushUndo(); rows.splice(i, 1); rebuild(); });
    if ((f.max || 99) > 1 && (f.min || 0) !== f.max) tools.append(bUp, bDown, bDel);
    else tools.append(bUp, bDown);
    r.append(cells, tools);
    list.appendChild(r);
  });
  wrap.appendChild(list);
  if (f.min !== f.max) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn btn-ghost btn-sm list-add';
    add.innerHTML = iconSvg('plus') + '<span>Добавить</span>';
    add.disabled = rows.length >= (f.max || 99);
    if (add.disabled) add.title = `Не больше ${f.max}`;
    add.addEventListener('click', () => {
      pushUndo();
      const item = {};
      for (const sub of f.item) item[sub.key] = sub.type === 'toggle' ? false : '';
      rows.push(item);
      rebuild();
      requestAnimationFrame(() => {
        const inputs = el.form.querySelectorAll(`[aria-label^="${f.item.find(s => s.type !== 'toggle').label} ${rows.length}"]`);
        if (inputs[0]) inputs[0].focus();
      });
    });
    wrap.appendChild(add);
  }
  return wrap;
}

/* ------------------------------------------------------ подстройка кегля */

function buildTune() {
  const slide = currentSlide();
  const def = KINDS[slide.kind];
  el.tune.innerHTML = '';
  const roles = def.tune ? Object.entries(def.tune) : [];
  el.tune.hidden = !roles.length;
  if (!roles.length) return;
  slide.tune = slide.tune || {};
  const head = document.createElement('div');
  head.className = 'tune-head';
  head.innerHTML = '<h3>Подстройка текста</h3>';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn btn-ghost btn-sm';
  reset.textContent = 'Как в брендбуке';
  reset.addEventListener('click', () => { pushUndo(); slide.tune = {}; buildTune(); changed(); });
  head.appendChild(reset);
  el.tune.appendChild(head);
  addHint(el.tune, 'Шрифты, цвета и сетка закреплены брендбуком. Если текст не влезает — уменьши кегль или интерлиньяж, либо нажми «Уместить».');
  el.tune.lastChild.classList.add('hint');
  for (const [role, name] of roles) {
    const box = document.createElement('div');
    box.className = 'tune-role';
    box.innerHTML = `<span class="rname">${name}</span>`;
    const tn = slide.tune[role] || { size: 100, lh: 100 };
    for (const [prop, label, min, max] of [['size', 'Кегль', 60, 130], ['lh', 'Интерлиньяж', 80, 130]]) {
      const row = document.createElement('div');
      row.className = 'range-row';
      row.innerHTML = `<span>${label}</span>`;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = min; range.max = max; range.step = 1;
      range.value = tn[prop] || 100;
      const out = document.createElement('output');
      out.value = range.value + '%';
      range.addEventListener('input', () => {
        pushUndo(`tune:${slide.id}:${role}:${prop}`);
        slide.tune[role] = Object.assign({ size: 100, lh: 100 }, slide.tune[role], { [prop]: Number(range.value) });
        out.value = range.value + '%';
        changed();
      });
      row.append(range, out);
      box.appendChild(row);
    }
    el.tune.appendChild(box);
  }
}

/* ============================================================ фото и видео */

function isVideoFile(file) { return Boolean(file.type) && file.type.startsWith('video/'); }
function isMediaFile(file) { return Boolean(file.type) && (file.type.startsWith('image/') || isVideoFile(file)); }

/* Фото читается через FileReader в data: URL — так canvas не «заражается» чужим источником и экспорт работает. */
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('не удалось прочитать изображение'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

/* Предпросмотр видео крутится по кругу внутри выбранного фрагмента. */
function wirePreviewLoop(video) {
  video.addEventListener('timeupdate', () => {
    if (!video._previewPlaying) return;
    const end = video.trimEnd ?? video.duration;
    if (isFinite(end) && video.currentTime >= end - 0.02) video.currentTime = video.trimStart || 0;
  });
}

/*
 * Видео — через object URL (не грузится в память строкой base64). Обрезка
 * хранится прямо на элементе: video.trimStart / trimEnd. Звук не глушим —
 * он слышен в предпросмотре и попадает в экспорт.
 */
function fileToVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.playsInline = true;
    video.preload = 'auto';
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (fn === reject) URL.revokeObjectURL(video.src);
      fn(arg);
    };
    video.onloadedmetadata = () => {
      video.trimStart = 0;
      video.trimEnd = isFinite(video.duration) ? video.duration : 60;
      video.durationUnknown = !isFinite(video.duration);
    };
    video.onloadeddata = () => finish(resolve, video);
    video.oncanplay = () => finish(resolve, video);
    video.onerror = () => finish(reject, new Error('неподдерживаемый формат или кодек'));
    // HEVC из iPhone в браузерах без его поддержки не присылает ни одного события
    const timer = setTimeout(() => finish(reject, new Error('видео не загружается — возможно, браузер не знает его формат')), 20000);
    wirePreviewLoop(video);
    video.src = URL.createObjectURL(file);
  });
}

function cloneVideo(src) {
  const v = document.createElement('video');
  v.playsInline = true;
  v.preload = 'auto';
  v.src = src.src;
  v.trimStart = src.trimStart;
  v.trimEnd = src.trimEnd;
  v.durationUnknown = src.durationUnknown;
  wirePreviewLoop(v);
  v.addEventListener('loadeddata', () => changed(), { once: true });
  return v;
}

function pickFile(slideId, key) {
  const slide = state.draft.slides.find(s => s.id === slideId);
  const field = KINDS[slide.kind].fields.find(f => f.key === key);
  state.pendingFile = { slideId, key };
  el.fileInput.accept = field && field.video ? 'image/*,video/*' : 'image/*';
  el.fileInput.value = '';
  el.fileInput.click();
}

async function setMedia(slideId, key, file) {
  const slide = state.draft && state.draft.slides.find(s => s.id === slideId);
  if (!slide) return;
  const field = KINDS[slide.kind].fields.find(f => f.key === key);
  const isVideo = isVideoFile(file);
  if (isVideo && !(field && field.video)) { say('Сюда можно только фото'); return; }
  try {
    const media = isVideo ? await fileToVideo(file) : await fileToImage(file);
    pushUndo();
    const old = state.media[slideId] && state.media[slideId][key];
    if (old && old.isVideo) { old.el._previewPlaying = false; old.el.pause(); }
    (state.media[slideId] || (state.media[slideId] = {}))[key] = {
      el: media, zoom: 1, panX: 0, panY: 0, name: file.name || 'Из буфера обмена', isVideo,
    };
    const idx = state.draft.slides.indexOf(slide);
    if (idx !== state.current) selectSlide(idx);
    state.focusMedia = { slideId, key };
    buildForm();
    changed();
    renderStage();
    const [w, h] = mediaSize(media);
    let msg = isVideo ? 'Видео добавлено' : 'Фото добавлено';
    if (!isVideo && Math.min(w, h) < 1080 && field.fit !== 'contain') msg += ` — ${w}×${h}, по брендбуку нужно от 1080 px по короткой стороне`;
    say(msg);
    if (isVideo) {
      await askVideoTrim(media, {
        label: field.label,
        hint: 'Выбери начало и конец фрагмента — остальное обрежется при экспорте. Поменять можно в любой момент кнопкой с ножницами.',
      });
    }
  } catch (err) {
    say('Не получилось открыть файл: ' + err.message);
  }
}

function removeMedia(slideId, key) {
  const m = state.media[slideId] && state.media[slideId][key];
  if (!m) return;
  pushUndo();
  if (m.isVideo) { m.el._previewPlaying = false; m.el.pause(); }
  delete state.media[slideId][key];
  if (state.focusMedia && state.focusMedia.key === key) state.focusMedia = null;
  buildForm();
  changed();
  renderStage();
  say('Убрано — ⌘Z вернёт');
}

async function pasteMedia(e) {
  if (el.editor.hidden || !state.draft) return;
  if (isTyping(e.target)) return;
  const file = [...(e.clipboardData ? e.clipboardData.files : [])].find(isMediaFile);
  if (!file) return;
  e.preventDefault();
  const slide = currentSlide();
  const key = (state.focusMedia && state.focusMedia.slideId === slide.id && state.focusMedia.key) ||
    firstMediaKey(slide, true) || firstMediaKey(slide);
  if (!key) { say('На этом слайде нет места для фото'); return; }
  setMedia(slide.id, key, file);
}

/* ------------------------------------------------------- предпросмотр видео */

let playRaf = null;
let playLast = 0;
function anyPlaying() {
  for (const byKey of Object.values(state.media)) {
    for (const m of Object.values(byKey)) if (m.isVideo && m.el._previewPlaying && !m.el.paused) return true;
  }
  return false;
}
function ensurePlayLoop() {
  if (playRaf) return;
  const tick = ts => {
    if (!anyPlaying()) { playRaf = null; renderStage(); paintThumbs(); return; }
    if (ts - playLast >= 33) { playLast = ts; renderStage({ canvasOnly: true }); }
    playRaf = requestAnimationFrame(tick);
  };
  playRaf = requestAnimationFrame(tick);
}
function togglePlay(slideId, key) {
  const m = mediaOf(slideId, key);
  if (!m || !m.isVideo) return;
  const v = m.el;
  if (v.paused) {
    const start = v.trimStart || 0;
    const end = v.trimEnd ?? v.duration;
    if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
    v._previewPlaying = true;
    v.play().then(() => { updateOverlay(); ensurePlayLoop(); }).catch(() => say('Не получилось запустить видео'));
  } else {
    v._previewPlaying = false;
    v.pause();
    updateOverlay();
  }
}
function stopVideosOf(slideId) {
  for (const m of Object.values(state.media[slideId] || {})) {
    if (m.isVideo) { m.el._previewPlaying = false; m.el.pause(); }
  }
}
function stopAllPreviews() {
  for (const id of Object.keys(state.media)) stopVideosOf(id);
}

function formatSeconds(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

async function trimMedia(slideId, key) {
  const m = mediaOf(slideId, key);
  if (!m || !m.isVideo) return;
  stopVideosOf(slideId);
  const slide = state.draft.slides.find(s => s.id === slideId);
  const field = KINDS[slide.kind].fields.find(f => f.key === key);
  const before = { s: m.el.trimStart, e: m.el.trimEnd };
  const ok = await askVideoTrim(m.el, { label: field.label });
  if (ok && (before.s !== m.el.trimStart || before.e !== m.el.trimEnd)) say('Фрагмент видео обновлён');
  changed();
  renderStage();
}

/*
 * Окно обрезки видео (перенесено из card-maker). Ползунки и поля сразу
 * пишут в video.trimStart/trimEnd, поэтому «Просмотр» в окне проигрывает
 * ровно то, что уйдёт в экспорт. «Отмена» возвращает исходные значения.
 */
function askVideoTrim(video, opts = {}) {
  return new Promise(resolve => {
    const modal = el.videoTrimModal;
    const body = el.videoTrimBody;
    el.videoTrimHint.textContent = opts.hint || 'Выбери начало и конец фрагмента — остальное обрежется при экспорте.';
    body.innerHTML = '';
    const duration = video.durationUnknown ? 60 : (video.duration || 0);
    const originalStart = video.trimStart || 0;
    const originalEnd = video.trimEnd ?? duration;

    const row = document.createElement('div');
    row.className = 'video-trim-row';
    const label = document.createElement('p');
    label.className = 'muted small';
    label.textContent = (opts.label || 'Видео') +
      (video.durationUnknown ? ' — длительность не определилась, показана минута' : ' — ' + formatSeconds(duration));
    const videoWrap = document.createElement('div');
    videoWrap.className = 'vt-video-wrap';
    video.controls = false;
    videoWrap.appendChild(video);
    const scrubber = document.createElement('div');
    scrubber.className = 'vt-scrubber';
    const fill = document.createElement('div');
    fill.className = 'vt-fill';
    const hs = document.createElement('button');
    hs.type = 'button'; hs.className = 'vt-handle'; hs.setAttribute('aria-label', 'Начало фрагмента');
    const he = document.createElement('button');
    he.type = 'button'; he.className = 'vt-handle'; he.setAttribute('aria-label', 'Конец фрагмента');
    scrubber.append(fill, hs, he);
    const fields = document.createElement('div');
    fields.className = 'vt-fields';
    const makeField = (title, value) => {
      const wrap = document.createElement('label');
      wrap.textContent = title;
      const input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.max = String(duration); input.step = '0.1';
      input.value = String(Math.round(value * 10) / 10);
      wrap.appendChild(input);
      fields.appendChild(wrap);
      return input;
    };
    const startInput = makeField('Начало, сек', originalStart);
    const endInput = makeField('Конец, сек', originalEnd);
    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'btn btn-outline btn-sm';
    previewBtn.innerHTML = iconSvg('play') + '<span>Просмотр</span>';
    fields.appendChild(previewBtn);
    row.append(label, videoWrap, scrubber, fields);
    body.appendChild(row);

    const pct = t => duration > 0 ? clamp((t / duration) * 100, 0, 100) : 0;
    const layout = () => {
      fill.style.left = pct(video.trimStart) + '%';
      fill.style.right = (100 - pct(video.trimEnd)) + '%';
      hs.style.left = pct(video.trimStart) + '%';
      he.style.left = pct(video.trimEnd) + '%';
    };
    const setStart = t => {
      video.trimStart = Math.round(clamp(t, 0, video.trimEnd - 0.1) * 10) / 10;
      startInput.value = String(video.trimStart);
      layout();
    };
    const setEnd = t => {
      video.trimEnd = Math.round(clamp(t, video.trimStart + 0.1, duration) * 10) / 10;
      endInput.value = String(video.trimEnd);
      layout();
    };
    layout();
    const wireDrag = (handle, isStart) => {
      handle.addEventListener('pointerdown', e => {
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        const onMove = ev => {
          const rect = scrubber.getBoundingClientRect();
          const t = clamp((ev.clientX - rect.left) / rect.width, 0, 1) * duration;
          if (isStart) setStart(t); else setEnd(t);
          video.currentTime = isStart ? video.trimStart : video.trimEnd;
        };
        const onUp = () => {
          handle.removeEventListener('pointermove', onMove);
          handle.removeEventListener('pointerup', onUp);
        };
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
      });
    };
    wireDrag(hs, true);
    wireDrag(he, false);
    startInput.addEventListener('input', () => { setStart(Number(startInput.value) || 0); video.currentTime = video.trimStart; });
    endInput.addEventListener('input', () => { setEnd(Number(endInput.value) || duration); video.currentTime = video.trimEnd; });
    previewBtn.addEventListener('click', () => {
      if (video.paused) {
        video._previewPlaying = true;
        video.currentTime = video.trimStart;
        video.play().then(() => { previewBtn.innerHTML = iconSvg('pause') + '<span>Стоп</span>'; })
          .catch(() => say('Не получилось запустить просмотр'));
      } else {
        video._previewPlaying = false;
        video.pause();
        previewBtn.innerHTML = iconSvg('play') + '<span>Просмотр</span>';
      }
    });

    const finish = ok => {
      modal.hidden = true;
      el.videoTrimCancel.removeEventListener('click', onCancel);
      el.videoTrimConfirm.removeEventListener('click', onConfirm);
      modal.removeEventListener('click', onBackdrop);
      video._previewPlaying = false;
      video.pause();
      video.remove();   // обратно «за кадр» — он и так рисуется в canvas
      if (!ok) { video.trimStart = originalStart; video.trimEnd = originalEnd; }
      renderStage();
      resolve(ok);
    };
    const onCancel = () => finish(false);
    const onConfirm = () => finish(true);
    const onBackdrop = e => { if (e.target === modal) finish(false); };
    el.videoTrimCancel.addEventListener('click', onCancel);
    el.videoTrimConfirm.addEventListener('click', onConfirm);
    modal.addEventListener('click', onBackdrop);
    modal.hidden = false;
  });
}

/* ================================================================= отмена */

const undoStack = [];
const redoStack = [];
let lastUndoTag = null;
let lastUndoAt = 0;

function snapshot() {
  const media = {};
  for (const [sid, byKey] of Object.entries(state.media)) {
    media[sid] = {};
    for (const [k, m] of Object.entries(byKey)) media[sid][k] = Object.assign({}, m);
  }
  return { slides: clone(state.draft.slides), media, current: state.current, name: state.draft.name };
}

/* tag — для склейки серии одинаковых правок (набор текста, ползунок) в один шаг. */
function pushUndo(tag = null) {
  if (!state.draft) return;
  const now = Date.now();
  if (tag && tag === lastUndoTag && now - lastUndoAt < UNDO_COALESCE_MS) { lastUndoAt = now; return; }
  lastUndoTag = tag;
  lastUndoAt = now;
  undoStack.push(snapshot());
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}

function restore(snap) {
  stopAllPreviews();
  state.draft.slides = snap.slides;
  state.media = snap.media;
  state.current = clamp(snap.current, 0, snap.slides.length - 1);
  state.draft.name = snap.name;
  el.docName.value = snap.name;
  state.focusMedia = null;
  lastUndoTag = null;
  buildSlidesList();
  buildForm();
  changed();
  syncUndoButtons();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
}
function syncUndoButtons() {
  el.btnUndo.disabled = !undoStack.length;
  el.btnRedo.disabled = !redoStack.length;
}

/* ================================================================= экспорт */

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function downloadBlob(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

/* ZIP без сжатия (store) — перенесено из card-maker: PNG/JPG и так сжаты. */
function crc32(bytes) {
  if (!crc32.table) {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    crc32.table = table;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = crc32.table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const time = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() >> 1) & 0x1f);
  const date = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0xf) << 5) | (now.getDate() & 0x1f);
  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);   // имена в UTF-8
    local.setUint16(8, 0, true);
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true);
    ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, nameBytes.length, true);
    ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = parts.concat(central, [new Uint8Array(end.buffer)]);
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let pos = 0;
  for (const chunk of all) { out.set(chunk, pos); pos += chunk.length; }
  return out;
}

function seekTo(video, t) {
  return new Promise(resolve => {
    if (Math.abs(video.currentTime - t) < 0.01) { resolve(); return; }
    const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = t;
  });
}

/* Кандидаты MediaRecorder: сначала настоящий MP4, иначе WebM (см. CLAUDE.md). */
const VIDEO_EXPORT_CANDIDATES = [
  { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
  { mime: 'video/mp4;codecs=h264', ext: 'mp4' },
  { mime: 'video/mp4', ext: 'mp4' },
  { mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
];
const VIDEO_EXPORT_CANDIDATES_WITH_AUDIO = [
  { mime: 'video/mp4', ext: 'mp4' },
  { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
];

function slideVideo(slide) {
  const byKey = state.media[slide.id] || {};
  const m = Object.values(byKey).find(x => x.isVideo && x.el);
  return m ? m.el : null;
}

/*
 * Записывает слайд с видео: renderSlide() рисуется на каждом кадре, пока
 * ролик играет от trimStart до trimEnd, canvas.captureStream() + MediaRecorder.
 * Звук берём с самого <video> (captureStream) ДО того, как приглушить его, и
 * на время записи подключаем элемент к DOM — иначе Safari теряет звук
 * (подробности — в CLAUDE.md card-maker, перенесено как есть).
 */
async function exportVideoSlide(slide, index, onProgress) {
  if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) {
    throw new Error('браузер не умеет записывать видео с canvas');
  }
  const video = slideVideo(slide);
  video._previewPlaying = false;
  const d = state.draft;
  const tpl = templateOf(d);
  const fmt = formatOf(slide);
  const scale = state.exportScale;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(fmt.w * scale);
  canvas.height = Math.round(fmt.h * scale);
  const ctx = canvas.getContext('2d');
  const duration = video.durationUnknown ? 60 : (video.duration || 0);
  const start = clamp(video.trimStart || 0, 0, duration);
  const end = Math.max(start + 0.1, Math.min(video.trimEnd ?? duration, duration));
  const attachedHere = !video.isConnected;
  if (attachedHere) {
    Object.assign(video.style, { position: 'fixed', left: '-9999px', width: '2px', height: '2px' });
    document.body.appendChild(video);
  }
  try {
    let audioTracks = [];
    const capture = video.captureStream || video.mozCaptureStream;
    if (capture) {
      try { audioTracks = capture.call(video).getAudioTracks(); } catch { /* пишем без звука */ }
    }
    const hasAudio = audioTracks.length > 0;
    const wasMuted = video.muted;
    video.muted = true;
    await seekTo(video, start);
    const canvasStream = canvas.captureStream(30);
    const stream = hasAudio ? new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]) : canvasStream;
    const picked = (hasAudio ? VIDEO_EXPORT_CANDIDATES_WITH_AUDIO : VIDEO_EXPORT_CANDIDATES)
      .find(c => MediaRecorder.isTypeSupported(c.mime));
    if (!picked) throw new Error('браузер не поддерживает запись видео');
    const recorder = new MediaRecorder(stream, { mimeType: picked.mime, videoBitsPerSecond: 10_000_000 });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const blob = await new Promise((resolve, reject) => {
      let raf = null;
      const hardStopAt = performance.now() + 5 * 60 * 1000;
      const stop = () => {
        cancelAnimationFrame(raf);
        video.removeEventListener('timeupdate', onTick);
        video.pause();
        if (recorder.state !== 'inactive') recorder.stop();
      };
      const onTick = () => {
        if (onProgress) onProgress(clamp((video.currentTime - start) / (end - start), 0, 1));
        if (video.currentTime >= end) stop();
      };
      const draw = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        try { renderSlide(ctx, slide, index, d.slides, tpl, { exporting: true }); } catch { /* следующий кадр */ }
        if (video.currentTime >= end || video.ended || performance.now() > hardStopAt) { stop(); return; }
        raf = requestAnimationFrame(draw);
      };
      recorder.onstop = () => {
        video.muted = wasMuted;
        if (onProgress) onProgress(1);
        resolve(new Blob(chunks, { type: picked.mime.split(';')[0] }));
      };
      recorder.onerror = e => { video.muted = wasMuted; reject(e.error || new Error('ошибка записи видео')); };
      video.addEventListener('timeupdate', onTick);
      // первый кадр — на холст до старта записи, воспроизведение — только когда
      // запись реально пошла: иначе кодировщик теряет начало ролика
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      try { renderSlide(ctx, slide, index, d.slides, tpl, { exporting: true }); } catch { /* нарисуем в цикле */ }
      recorder.onstart = () => {
        setTimeout(() => video.play().then(() => { raf = requestAnimationFrame(draw); }).catch(reject), 120);
      };
      recorder.start(1000);
    });
    return { blob, ext: picked.ext };
  } finally {
    if (attachedHere) video.remove();
  }
}

function exportName(slide, i) {
  const def = KINDS[slide.kind];
  const label = slide.kind === 'highlight' && slide.data.label ? slide.data.label : def.name;
  return `${String(i + 1).padStart(2, '0')}-${slug(label)}`;
}

/* Слайды без фона (титры) — всегда PNG с прозрачностью, если под ними нет видео или фото. */
function isTransparent(slide) {
  const key = KINDS[slide.kind].transparentWhenEmpty;
  return Boolean(key) && !mediaOf(slide.id, key);
}

async function renderStill(slide, i) {
  const d = state.draft;
  const fmt = formatOf(slide);
  const scale = state.exportScale;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(fmt.w * scale);
  canvas.height = Math.round(fmt.h * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const transparent = isTransparent(slide);
  const png = transparent || state.exportFormat === 'png';
  if (!png) fillRect(ctx, 0, 0, fmt.w, fmt.h, '#FFFFFF');
  renderSlide(ctx, slide, i, d.slides, templateOf(d), { exporting: true });
  const blob = await canvasToBlob(canvas, png ? 'image/png' : 'image/jpeg', 0.95);
  return { blob, ext: png ? 'png' : 'jpg' };
}

let exporting = false;
async function exportSlides(mode) {
  if (exporting || !state.draft) return;
  exporting = true;
  stopAllPreviews();
  const d = state.draft;
  const indices = mode === 'one' ? [state.current] : d.slides.map((_, i) => i);
  const slots = new Array(indices.length).fill(null);
  const progress = new Array(indices.length).fill(0);
  let failed = 0;
  el.exportProgress.hidden = false;
  const update = () => { el.exportProgressBar.style.width = Math.round(progress.reduce((a, b) => a + b, 0) / indices.length * 100) + '%'; };
  update();
  const videoJobs = [];
  const jobs = indices.map((i, pos) => {
    const slide = d.slides[i];
    if (slideVideo(slide)) { videoJobs.push({ slide, i, pos }); return null; }
    return (async () => {
      try {
        const r = await renderStill(slide, i);
        slots[pos] = { name: exportName(slide, i), ext: r.ext, blob: r.blob };
      } catch (err) { console.error(err); failed++; }
      progress[pos] = 1;
      update();
    })();
  }).filter(Boolean);
  if (videoJobs.length) say(videoJobs.length === 1 ? 'Записываю видео…' : `Записываю видео: ${videoJobs.length} шт.…`);
  // видео пишутся в реальном времени и по одному: одновременная запись с одного ролика невозможна,
  // а с разных — нагружает слабые устройства
  const videoRun = (async () => {
    for (const { slide, i, pos } of videoJobs) {
      try {
        const r = await exportVideoSlide(slide, i, p => { progress[pos] = p; update(); });
        slots[pos] = { name: exportName(slide, i), ext: r.ext, blob: r.blob };
      } catch (err) { console.error(err); failed++; say('Видео: ' + err.message); }
      progress[pos] = 1;
      update();
    }
  })();
  await Promise.all([...jobs, videoRun]);
  el.exportProgress.hidden = true;
  exporting = false;
  const files = slots.filter(Boolean);
  if (!files.length) { say('Не удалось подготовить файлы'); return; }
  const base = `edubridge-${slug(d.name)}`;
  if (mode === 'zip' && files.length > 1) {
    const entries = await Promise.all(files.map(async f => ({ name: `${f.name}.${f.ext}`, data: new Uint8Array(await f.blob.arrayBuffer()) })));
    downloadBlob(new Blob([buildZip(entries)], { type: 'application/zip' }), base + '.zip');
  } else {
    for (const f of files) {
      // в отдельных файлах — только номер: название материала уже в имени
      downloadBlob(f.blob, `${base}-${f.name.slice(0, 2)}.${f.ext}`);
      await new Promise(r => setTimeout(r, 350));
    }
  }
  el.exportPop.hidden = true;
  say(failed ? `Скачано: ${files.length}, не получилось: ${failed}` : `Скачано: ${files.length} ${plural(files.length, 'файл', 'файла', 'файлов')}`);
}

function syncExportControls() {
  el.segFormat.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.value === state.exportFormat));
  el.segScale.querySelectorAll('button').forEach(b => b.classList.toggle('on', Number(b.dataset.value) === state.exportScale));
  if (!state.draft) return;
  const fmt = formatOf(currentSlide());
  const notes = [`${fmt.w * state.exportScale}×${fmt.h * state.exportScale} px`];
  if (state.draft.slides.some(s => slideVideo(s))) notes.push('слайды с видео — в MP4 или WEBM');
  if (state.draft.slides.some(isTransparent)) notes.push('титры без фона — PNG с прозрачностью');
  el.exportNote.textContent = notes.join(' · ');
  el.btnExportZip.hidden = state.draft.slides.length < 2;
  el.btnExportAll.hidden = state.draft.slides.length < 2;
  el.btnExportOne.textContent = state.draft.slides.length < 2 ? 'Скачать' : 'Только текущий слайд';
  el.btnExportOne.className = 'btn btn-block ' + (state.draft.slides.length < 2 ? 'btn-primary' : 'btn-ghost');
}

/* ================================================================== справка */

const HELP = `
<p>Конструктор собирает посты, Stories, обложки Reels, Telegram и YouTube строго по брендбуку edubridge. Цвета, шрифты и сетка уже на месте — остаётся текст и фото.</p>
<h3>1. Выбери шаблон</h3>
<ul>
<li>На первом экране — все шаблоны с живым превью. Фильтры сверху — по каналам.</li>
<li>Нажми на шаблон: увидишь все его слайды, главное правило, структуру и объём из Tone of Voice.</li>
<li><b>Начать с примером</b> — слайды с текстами-образцами из брендбука, их удобно просто переписать. <b>Пустой шаблон</b> — то же без текстов.</li>
</ul>
<h3>2. Заполни слайды</h3>
<ul>
<li>Слева — слайды: добавляй кнопкой <b>+ Слайд</b>, дублируй, переставляй (стрелками или перетаскиванием), удаляй.</li>
<li>Справа — поля текущего слайда. Изменения сразу видны на превью.</li>
<li>В тексте строка, которая начинается с «- », становится пунктом списка с дугой-маркером.</li>
<li>Счётчики «4/9», прогресс карусели и номера шагов гайда ставятся сами.</li>
</ul>
<h3>3. Фото и видео</h3>
<ul>
<li>Перетащи файл прямо на рамку на превью, нажми на пустую рамку или на кнопку «Загрузить». <kbd>⌘V</kbd> вставляет картинку из буфера.</li>
<li>Кадр двигается перетаскиванием, масштаб — колесом мыши, щипком или ползунком.</li>
<li>Видео можно поставить на обложки, Reels и титры: после загрузки откроется обрезка. Экспорт — MP4 (или WEBM, если браузер не умеет MP4), со звуком.</li>
<li>Фото и видео не сохраняются между сессиями — только тексты.</li>
</ul>
<h3>4. Если текст не влезает</h3>
<ul>
<li>Под превью появится предупреждение: «больше 3 строк», «не помещается», «мало пикселей».</li>
<li>В блоке <b>Подстройка текста</b> можно уменьшить кегль и интерлиньяж, кнопка <b>Уместить</b> сделает это сама.</li>
<li>Кнопка с сеткой в верхней панели показывает поля, колонки и безопасные зоны: обрезку 3:4 в профиле, зоны интерфейса Stories, зону обложки Reels.</li>
</ul>
<h3>5. Экспорт</h3>
<ul>
<li><b>Экспорт</b> справа сверху: PNG или JPG, 1× или 2×, все слайды одним ZIP, по одному или только текущий. <kbd>⌘S</kbd> — все слайды.</li>
<li>Титры для Reels и плашка спикера без фона выгружаются в PNG с прозрачностью — для монтажа.</li>
</ul>
<h3>Черновики и офлайн</h3>
<ul>
<li>Всё сохраняется в браузере автоматически, черновики — на первом экране в «Продолжить работу».</li>
<li>Конструктор можно установить на телефон или компьютер и работать без интернета.</li>
<li>В Unbounded нет казахских букв Ә Ғ Қ Ң Ө Ұ Ү Һ — в заголовках они автоматически набираются Onest.</li>
</ul>
<h3>Горячие клавиши</h3>
<ul>
<li><kbd>⌘Z</kbd> — отменить, <kbd>⌘⇧Z</kbd> — повторить, <kbd>⌘S</kbd> — экспорт, <kbd>PageUp</kbd>/<kbd>PageDown</kbd> — соседний слайд, <kbd>Esc</kbd> — закрыть окно.</li>
</ul>`;

function openHelp() {
  el.helpBody.innerHTML = HELP;
  el.helpModal.hidden = false;
  el.helpClose.focus();
}

/* ================================================================== события */

function collectElements() {
  for (const node of document.querySelectorAll('[id]')) el[node.id] = node;
}

function closeTopModal() {
  if (!el.videoTrimModal.hidden) { el.videoTrimCancel.click(); return true; }
  if (!el.helpModal.hidden) { el.helpModal.hidden = true; return true; }
  if (!el.tplModal.hidden) { closeTemplate(); return true; }
  if (!el.exportPop.hidden) { el.exportPop.hidden = true; return true; }
  if (!el.addMenu.hidden) { el.addMenu.hidden = true; return true; }
  return false;
}

function wireEvents() {
  // выбор шаблона
  el.tplClose.addEventListener('click', closeTemplate);
  el.tplModal.addEventListener('click', e => { if (e.target === el.tplModal) closeTemplate(); });
  el.tplUse.addEventListener('click', () => startDraft(state.preview.tpl, 'sample'));
  el.tplEmpty.addEventListener('click', () => startDraft(state.preview.tpl, 'empty'));
  el.btnHelpPicker.addEventListener('click', openHelp);
  el.btnThemePicker.addEventListener('click', toggleTheme);
  el.helpClose.addEventListener('click', () => { el.helpModal.hidden = true; });
  el.helpModal.addEventListener('click', e => { if (e.target === el.helpModal) el.helpModal.hidden = true; });

  // редактор
  el.btnBack.addEventListener('click', () => closeEditor());
  el.btnUndo.addEventListener('click', undo);
  el.btnRedo.addEventListener('click', redo);
  el.btnTheme.addEventListener('click', toggleTheme);
  el.btnHelp.addEventListener('click', openHelp);
  el.btnGuides.addEventListener('click', () => {
    state.guides = !state.guides;
    el.btnGuides.classList.toggle('active', state.guides);
    renderStage();
  });
  el.btnPrev.addEventListener('click', () => selectSlide(state.current - 1));
  el.btnNext.addEventListener('click', () => selectSlide(state.current + 1));
  el.docName.addEventListener('input', () => {
    pushUndo('name');
    state.draft.name = el.docName.value;
    scheduleSave();
  });
  el.docName.addEventListener('blur', () => {
    if (!el.docName.value.trim()) { el.docName.value = templateOf(state.draft).name; state.draft.name = el.docName.value; scheduleSave(); }
  });
  el.btnAddSlide.addEventListener('click', e => {
    e.stopPropagation();
    if (el.addMenu.hidden) buildAddMenu();
    el.addMenu.hidden = !el.addMenu.hidden;
  });
  el.btnExport.addEventListener('click', e => {
    e.stopPropagation();
    syncExportControls();
    el.exportPop.hidden = !el.exportPop.hidden;
  });
  el.exportPop.addEventListener('click', e => e.stopPropagation());
  el.addMenu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => { el.exportPop.hidden = true; el.addMenu.hidden = true; });
  el.segFormat.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.exportFormat = b.dataset.value;
    storeSet(STORE_EXPORT, { format: state.exportFormat, scale: state.exportScale });
    syncExportControls();
  });
  el.segScale.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.exportScale = Number(b.dataset.value);
    storeSet(STORE_EXPORT, { format: state.exportFormat, scale: state.exportScale });
    syncExportControls();
  });
  el.btnExportZip.addEventListener('click', () => exportSlides('zip'));
  el.btnExportAll.addEventListener('click', () => exportSlides('all'));
  el.btnExportOne.addEventListener('click', () => exportSlides('one'));

  el.fileInput.addEventListener('change', () => {
    const file = el.fileInput.files[0];
    const target = state.pendingFile;
    state.pendingFile = null;
    if (file && target) setMedia(target.slideId, target.key, file);
  });
  document.addEventListener('paste', pasteMedia);

  document.addEventListener('keydown', e => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') { if (closeTopModal()) e.preventDefault(); return; }
    if (!el.tplModal.hidden) {
      const p = state.preview;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        p.index = clamp(p.index + (e.key === 'ArrowRight' ? 1 : -1), 0, p.slides.length - 1);
        paintTemplatePreview();
      } else if (e.key === 'Enter' && !e.target.closest('button')) {
        e.preventDefault();
        startDraft(p.tpl, 'sample');
      }
      return;
    }
    if (el.editor.hidden || !el.videoTrimModal.hidden) return;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); exportSlides(state.draft.slides.length > 1 ? 'zip' : 'one'); return; }
    if (isTyping(e.target)) return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (e.key === 'PageDown') { e.preventDefault(); selectSlide(state.current + 1); }
    if (e.key === 'PageUp') { e.preventDefault(); selectSlide(state.current - 1); }
  });

  window.addEventListener('popstate', () => {
    if (!el.editor.hidden) closeEditor(true);
  });
  window.addEventListener('beforeunload', e => {
    if (state.draft) saveDraftNow();
    const hasMedia = Object.values(state.media).some(byKey => Object.keys(byKey).length);
    if (hasMedia) { e.preventDefault(); e.returnValue = ''; }
  });
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!el.picker.hidden) paintTiles();
      if (state.preview) paintTemplatePreview(true);
      if (state.draft) paintThumbs();
    }, 150);
  });
  wireStage();
}

async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const specs = [400, 500, 600, 700, 800].map(w => `${w} 40px EBOnest`)
    .concat([500, 600, 700].map(w => `${w} 40px EBUnbounded`));
  try { await Promise.all(specs.map(s => document.fonts.load(s, 'AaЯяӘә₸0'))); } catch { /* нарисуем тем, что есть */ }
}

async function start() {
  collectElements();
  el.brandLogo.innerHTML = logoSvg();
  paintIcons();
  syncThemeButtons();
  const saved = storeGet(STORE_EXPORT, null);
  if (saved) {
    if (saved.format === 'png' || saved.format === 'jpeg') state.exportFormat = saved.format;
    if (saved.scale === 1 || saved.scale === 2) state.exportScale = saved.scale;
  }
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', syncThemeButtons);
  }
  wireEvents();
  wireInstallBanner();
  buildFilters();
  buildGallery();
  buildDrafts();
  history.replaceState({ screen: 'picker' }, '', location.pathname + location.search);
  await Promise.all([loadFonts(), loadFlags()]);
  state.fontsReady = true;
  paintTiles();
  buildDrafts();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('service-worker.js').catch(() => { /* офлайн не заработает — не критично */ });
  }
}

start();
