/*
 * Каталог шаблонов edubridge.
 *
 * KINDS — типы слайдов. У каждого: формат, поля формы (с примерами текста из
 * брендбука), роли для подстройки кегля и функция draw, которая рисует слайд
 * по макету брендбука. Все цифры (отступы, кегли, интерлиньяж, трекинг)
 * перенесены из макетов раздела 08 «Instagram» и 09 «Другие каналы» — не
 * дублируй их в app.js.
 *
 * Общее для всех типов (подключается в app.js через env):
 *   env.pill()   — плашка рубрики, в неё сами встают выбранные флаги;
 *   env.logo()   — логотип edubridge, а при коллаборации — с логотипами партнёров;
 *   env.collab() — то же, но только если партнёры есть (для слайдов без логотипа);
 *   env.drawFlags() — флаги там, где плашки нет;
 *   env.band() / env.bgPhoto() — фото «по желанию»: полосой или фоном с тонировкой.
 *
 * TEMPLATES — то, что видно на экране выбора: набор стартовых слайдов,
 * какие типы слайдов можно добавить, описание и правила из Tone of Voice.
 */

const FORMATS = {
  post: { w: 1080, h: 1350, label: '1080×1350', name: 'Пост' },
  story: { w: 1080, h: 1920, label: '1080×1920', name: 'Stories' },
  wide: { w: 1280, h: 720, label: '1280×720', name: '16:9' },
  hd: { w: 1920, h: 1080, label: '1920×1080', name: 'Full HD' },
};

const COUNTRIES = [
  ['kz', 'Казахстан'], ['us', 'США'], ['gb', 'Великобритания'], ['ca', 'Канада'],
  ['de', 'Германия'], ['nl', 'Нидерланды'], ['be', 'Бельгия'], ['fr', 'Франция'],
  ['it', 'Италия'], ['es', 'Испания'], ['pt', 'Португалия'], ['ie', 'Ирландия'],
  ['ch', 'Швейцария'], ['at', 'Австрия'], ['se', 'Швеция'], ['fi', 'Финляндия'],
  ['no', 'Норвегия'], ['dk', 'Дания'], ['pl', 'Польша'], ['cz', 'Чехия'],
  ['hu', 'Венгрия'], ['ee', 'Эстония'], ['lv', 'Латвия'], ['lt', 'Литва'],
  ['sk', 'Словакия'], ['gr', 'Греция'], ['tr', 'Турция'], ['cy', 'Кипр'],
  ['mt', 'Мальта'], ['cn', 'Китай'], ['hk', 'Гонконг'], ['jp', 'Япония'],
  ['kr', 'Южная Корея'], ['sg', 'Сингапур'], ['my', 'Малайзия'], ['au', 'Австралия'],
  ['nz', 'Новая Зеландия'], ['ae', 'ОАЭ'], ['qa', 'Катар'], ['in', 'Индия'],
  ['il', 'Израиль'], ['uz', 'Узбекистан'], ['kg', 'Кыргызстан'], ['tj', 'Таджикистан'],
  ['tm', 'Туркменистан'], ['az', 'Азербайджан'], ['ge', 'Грузия'], ['am', 'Армения'],
  ['mn', 'Монголия'], ['ru', 'Россия'], ['by', 'Беларусь'], ['eu', 'Евросоюз'],
];

/* Иконки хайлайтов и категорий — Phosphor Fill, раздел «Иконки». */
const GLYPH_CHOICES = [
  ['book-open', 'Гайды'], ['graduation-cap', 'Вузы'], ['chat-circle-text', 'Истории'],
  ['hand-coins', 'Гранты'], ['video-camera', 'Вебинары'], ['globe-hemisphere-east', 'Страны'],
  ['alarm', 'Дедлайны'], ['stamp', 'Виза'], ['translate', 'Язык'], ['files', 'Документы'],
  ['medal', 'Стипендии'], ['exam', 'Экзамены'], ['airplane-tilt', 'Переезд'], ['wallet', 'Стоимость'],
  ['newspaper', 'Новости'], ['question', 'Вопросы'], ['lightbulb', 'Советы'], ['users-three', 'Сообщество'],
  ['briefcase', 'Карьера'], ['chart-bar', 'Цифры'], ['calendar-blank', 'События'], ['map-pin', 'Города'],
  ['buildings', 'Кампус'], ['trophy', 'Олимпиады'], ['star', 'Избранное'], ['heart', 'Жизнь'],
  ['megaphone', 'Анонсы'], ['coins', 'Финансы'], ['clock', 'Сроки'], ['link', 'Ссылки'],
  ['note-pencil', 'Заметки'], ['notebook', 'Конспекты'], ['target', 'Фокус'], ['brain', 'Память'],
  ['timer', 'Время'], ['device-mobile', 'Приложения'], ['books', 'Книги'], ['headphones', 'Подкасты'],
  ['code-simple', 'Код'], ['pen-nib', 'Эссе'], ['sparkle', 'Идеи'], ['rocket-launch', 'Старт'],
];

const RUBRIC_CHOICES = [
  ['news', 'Новости'], ['deadline', 'Дедлайн'], ['uni', 'Университеты'], ['grants', 'Гранты'],
  ['countries', 'Страны'], ['webinar', 'Вебинар'], ['stories', 'Истории'], ['guide', 'Гайд'],
  ['numbers', 'Цифры'], ['resources', 'Подборка'], ['partner', 'Партнёрский материал'],
];

const HANDLE = '@edubridge.media';

/* Стиль текста: семейство ('onest' | 'unb'), вес, кегль, интерлиньяж, трекинг (em). */
function S(family, weight, size, lh = 1, track = 0) {
  return { family, weight, size, lh, track };
}

/* Необязательное фото — для карточек, где фото в брендбуке не предусмотрено. */
function optPhoto(hint) {
  return {
    key: 'photo', type: 'media', label: 'Фото — по желанию', video: true, optional: true,
    hint: hint || 'Встанет в свободное место под текстом, со скруглением 32',
  };
}

/*
 * Строка «логотип слева — подпись справа» в нижней строке поста (высота 44).
 * С логотипами партнёров подписи может не хватить места: тогда она
 * уменьшается до 24 px, а если и так не влезает — встаёт строкой выше.
 */
function footerRow(ctx, env, y, variant, text, color) {
  const lw = env.logo(80, y, 44, variant, 'left', 760);
  if (!text) return;
  const room = 920 - lw - 40;
  const st = fitSize(ctx, text, S('onest', 500, 30, 1), room, 24);
  const tw = textWidth(ctx, text, st);
  if (tw <= room) {
    drawLine(ctx, text, 1000 - tw, y + (44 - st.size) / 2, st, { color });
    return;
  }
  const small = S('onest', 500, 24, 1);
  const sw = textWidth(ctx, text, small);
  if (sw > 920) env.warn('Подпись внизу слишком длинная — сократи её');
  drawLine(ctx, text, 1000 - Math.min(sw, 920), y - 36, small, { color });
}

/* Счётчик «4/9» справа — только если слайдов больше одного. */
function counterText(env) {
  return env.total > 1 ? `${env.index + 1}/${env.total}` : '';
}

/* Кегль, при котором строка без переносов влезает в ширину (для крупных цифр). */
function fitSize(ctx, text, st, maxWidth, minSize) {
  let size = st.size;
  while (size > minSize && textWidth(ctx, text, Object.assign({}, st, { size })) > maxWidth) size -= 2;
  return Object.assign({}, st, { size });
}

/*
 * Абзацы текста с маркерами-дугами: строка, начинающаяся с «- » или «• »,
 * становится пунктом списка (дуга вместо буллета шириной 1,2× кегля — раздел
 * «Паттерны, рамки, разделители, маркеры»). Возвращает высоту и draw.
 */
function layoutBody(ctx, text, st, width) {
  const blocks = [];
  const markerW = Math.round(st.size * 1.2);
  const indent = markerW + Math.round(st.size * 0.5);
  for (const raw of String(text ?? '').split('\n')) {
    const bullet = raw.match(/^\s*[-•–—]\s+(.*)$/);
    if (bullet) {
      blocks.push({ bullet: true, lt: layoutText(ctx, bullet[1], st, width - indent) });
    } else {
      blocks.push({ bullet: false, lt: layoutText(ctx, raw, st, width), empty: !raw.trim() });
    }
  }
  while (blocks.length && blocks[blocks.length - 1].empty) blocks.pop();
  const itemGap = Math.round(st.size * 0.45);
  let h = 0;
  blocks.forEach((b, i) => {
    if (i > 0 && b.bullet && blocks[i - 1].bullet) h += itemGap;
    h += b.empty ? st.size * st.lh : b.lt.h;
  });
  const tooWide = blocks.some(b => b.lt.tooWide);
  return {
    h, tooWide, lines: blocks.reduce((n, b) => n + Math.max(1, b.lt.lines.length), 0),
    draw(ctx2, x, y, color, markerColor) {
      let cy = y;
      blocks.forEach((b, i) => {
        if (i > 0 && b.bullet && blocks[i - 1].bullet) cy += itemGap;
        if (b.empty) { cy += st.size * st.lh; return; }
        if (b.bullet) {
          const lineH = st.size * st.lh;
          const ah = arcHeight(markerW);
          // дуга стоит на средней линии первой строки
          drawArc(ctx2, x, cy + lineH / 2 - ah * 0.62, markerW, markerColor);
          b.lt.draw(ctx2, x + indent, cy, { color });
        } else {
          b.lt.draw(ctx2, x, cy, { color });
        }
        cy += b.lt.h;
      });
    },
  };
}

/*
 * Фото по желанию полосой: занимает место от top до bottom, если фото
 * загружено. Мало места — предупреждение. Возвращает, есть ли фото.
 */
function photoBand(env, top, bottom, x = 80, w = 920) {
  if (!env.media('photo')) return false;
  const h = bottom - top;
  if (h < 180) {
    env.warn('Для фото не хватает места — сократи текст или убери фото');
    return true;
  }
  env.band('photo', x, top, w, h, { radius: 32 });
  return true;
}

/* Фоны, разрешённые для универсальных слайдов (текст, факты, подборка). */
const SURFACES = {
  paper: { bg: C.paper, text: C.ink, sub: C.slate, title: C.ink, marker: C.blue, line: C.ink, thin: C.mist, card: C.white, logo: 'main', surface: 'light', hatch: HATCH_LIGHT },
  white: { bg: C.white, text: C.ink, sub: C.slate, title: C.ink, marker: C.blue, line: C.ink, thin: C.mist, card: C.paper, logo: 'main', surface: 'light', hatch: HATCH_LIGHT },
  skyTint: { bg: C.skyTint, text: C.ink, sub: C.slate, title: C.blue, marker: C.blue, line: C.ink, thin: C.sky, card: C.white, logo: 'main', surface: 'light', hatch: HATCH_LIGHT },
  blue: { bg: C.blue, text: C.white, sub: C.skyTint, title: C.white, marker: C.white, line: C.white, thin: 'rgba(255,255,255,0.35)', card: C.white, logo: 'onBlue', surface: 'blue', hatch: HATCH_DARK },
  ink: { bg: C.ink, text: C.white, sub: C.mistDark, title: C.white, marker: C.lime, line: C.white, thin: C.graphite, card: C.graphite, logo: 'onDark', surface: 'ink', hatch: HATCH_INK },
};
const SURFACE_CHOICES = [['paper', 'Paper'], ['white', 'Белый'], ['skyTint', 'Sky Tint'], ['blue', 'Bridge Blue'], ['ink', 'Ink']];
const LIGHT_SURFACE_CHOICES = SURFACE_CHOICES.slice(0, 3);

/* Верхняя строка универсального слайда: плашка рубрики (с флагами) слева, счётчик справа. Возвращает её высоту. */
function topRow(ctx, env, d, sf) {
  let h = 0;
  if (d.showPill !== false && env.rubric) {
    h = env.pill(80, 80, env.rubric, sf.surface, { text: d.pill || undefined }).h;
  } else if (env.flags.length) {
    env.drawFlags(80, 80, 66);
    h = 66;
  }
  const counter = counterText(env);
  if (counter) {
    const st = S('onest', 500, 30, 1);
    const tw = textWidth(ctx, counter, st);
    const rowH = Math.max(h, 30);
    drawLine(ctx, counter, 1000 - tw, 80 + (rowH - 30) / 2, st, { color: sf.sub });
    h = rowH;
  }
  return h;
}

/* Нижняя строка универсального слайда: логотип (с партнёрами) и прогресс карусели. */
function bottomRow(ctx, env, sf) {
  const y = env.H - 80 - 44;
  const lw = env.logo(80, y, 44, sf.logo, 'left', 760);
  if (env.total > 1) {
    const n = env.total, gap = 10;
    const room = 920 - lw - 40;
    const segW = Math.min(40, (room - gap * (n - 1)) / n);
    if (segW >= 12) {
      const w = n * segW + (n - 1) * gap;
      drawProgress(ctx, 1000 - w, y + 18, w, n, env.index + 1,
        { segW, gap, h: 8, on: sf.surface === 'light' ? C.blue : C.white, off: sf.surface === 'light' ? C.mist : 'rgba(255,255,255,0.3)' });
    }
  }
  return y;
}

/*
 * Логотипы партнёров в широких форматах: справа в строке плашки, а если там
 * тесно — строкой под плашкой. Возвращает, сколько места заняли под плашкой.
 */
function wideCollab(env, pillW, pillH, colW, variant) {
  if (!env.hasCollab) return 0;
  const lw = env.logoWidth(44, variant);
  if (pillW + 40 + lw <= colW) {
    env.logo(64 + colW, 64 + (pillH - 44) / 2, 44, variant, 'right');
    return 0;
  }
  env.logo(64, 64 + pillH + 28, 44, variant, 'left', colW);
  return 28 + 44;
}

/* Логотипы партнёров внизу безопасной зоны Stories (только при коллаборации). Возвращает высоту резерва. */
function storyCollab(env, variant, align = 'left') {
  if (!env.hasCollab) return 0;
  const y = env.H - 340 - 44;
  if (align === 'center') {
    const w = env.logoWidth(44, variant);
    env.logo((env.W - Math.min(w, 920)) / 2, y, 44, variant, 'left', 920);
  } else {
    env.logo(80, y, 44, variant, 'left', 920);
  }
  return 44 + 56;
}

/* ================================================================ KINDS */

const KINDS = {};

/* ---------------------------------------------- Пост · Новость · обложка */
KINDS.newsCover = {
  name: 'Обложка новости',
  format: 'post',
  tune: { title: 'Заголовок' },
  fields: [
    { key: 'pill', type: 'text', label: 'Плашка рубрики', sample: 'Новости' },
    { key: 'date', type: 'text', label: 'Дата', sample: '27.09.2026' },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: 'Факт в первой строке, до 3 строк, без точки в конце', sample: 'KU Leuven открыл приём на 2027/28' },
    { key: 'photo', type: 'media', label: 'Фото', video: true, hint: 'Кампус или город, с разрешением на публикацию' },
    { key: 'source', type: 'text', label: 'Источник', sample: 'Источник: kuleuven.be' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.white);
    let y = 80;
    const pill = env.pill(80, y, 'news', 'light', { text: d.pill });
    if (d.date) {
      const st = S('onest', 500, 30, 1);
      drawLine(ctx, d.date, 1000 - textWidth(ctx, d.date, st), y + (pill.h - 30) / 2, st, { color: C.slate });
    }
    y += pill.h + 48;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 76, 1.1, -0.03)), 920);
    env.lines(title, 3, 'Заголовок');
    title.draw(ctx, 80, y, { color: C.ink });
    y += title.h + 48;
    const footY = H - 80 - 44;
    const photoH = footY - 48 - y;
    env.minSpace(photoH, 200, 'Для фото почти не осталось места — сократи заголовок');
    env.photo('photo', 80, y, 920, Math.max(0, photoH), { radius: 32, placeholder: HATCH_LIGHT });
    footerRow(ctx, env, footY, 'main', d.source, C.slate);
  },
};

/* ---------------------------------------- Пост · История студента · обложка */
KINDS.storyCover = {
  name: 'Обложка истории',
  format: 'post',
  tune: { title: 'Цитата-заголовок' },
  fields: [
    { key: 'photo', type: 'media', label: 'Портрет героя', video: true, hint: 'Портрет 4:5: глаза на верхней трети, низ кадра — под текст' },
    { key: 'pill', type: 'text', label: 'Плашка рубрики', sample: 'Истории' },
    { key: 'hero', type: 'text', label: 'Герой и маршрут', hint: 'Имя, возраст · город → вуз', sample: 'Алия, 18 · Алматы → MIT' },
    { key: 'title', type: 'textarea', label: 'Цитата-заголовок', hint: 'До 2 строк', sample: '«Отказы научили меня писать эссе»' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    env.photo('photo', 0, 0, W, H, { placeholder: HATCH_DARK });
    fillVGradient(ctx, 0, H - 760, W, 760, [[0, 'rgba(18,20,24,0)'], [1, 'rgba(18,20,24,0.88)']]);
    env.pill(80, 80, 'stories', 'photo', { text: d.pill });
    const counter = counterText(env);
    if (counter) {
      const st = S('onest', 500, 30, 1);
      drawLine(ctx, counter, 1000 - textWidth(ctx, counter, st), 80, st, { color: C.white });
    }
    const logoY = H - 80 - 44;
    env.logo(80, logoY, 44, 'monoWhite', 'left', 920);
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 72, 1.1, -0.03)), 920);
    env.lines(title, 2, 'Цитата-заголовок');
    const titleY = logoY - 32 - title.h;
    title.draw(ctx, 80, titleY, { color: C.white });
    if (d.hero) drawLine(ctx, d.hero, 80, titleY - 32 - 36, S('onest', 600, 36, 1), { color: C.lime });
  },
};

/* ------------------------------------ Пост · История студента · внутренний */
KINDS.storyInner = {
  name: 'Вопрос и ответ',
  format: 'post',
  tune: { title: 'Вопрос', body: 'Ответ' },
  fields: [
    { key: 'avatar', type: 'media', label: 'Аватар героя', hint: 'Круг 96 px' },
    { key: 'hero', type: 'text', label: 'Герой · вуз', sample: 'Алия · MIT' },
    { key: 'question', type: 'textarea', label: 'Вопрос', sample: 'Как ты готовилась к SAT во второй раз?' },
    { key: 'answer', type: 'textarea', label: 'Ответ героя', hint: 'Одна мысль на слайд', sample: 'Я перестала решать всё подряд. Выписала 40 типов задач, где ошибалась, и каждый день разбирала по пять. За три месяца балл вырос на 170.' },
    optPhoto(),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.paper);
    env.photo('avatar', 80, 80, 96, 96, { shape: 'circle', placeholder: [C.mistDark, C.mist, 3, 18] });
    let hx = 80 + 96 + 24;
    if (d.hero) hx += drawLine(ctx, d.hero, hx, 80 + 32, S('onest', 600, 32, 1), { color: C.ink }).maxW + 20;
    env.drawFlags(hx, 80 + 26, 44);
    const counter = counterText(env);
    if (counter) {
      const st = S('onest', 500, 30, 1);
      drawLine(ctx, counter, 1000 - textWidth(ctx, counter, st), 80 + 33, st, { color: C.slate });
    }
    let y = 80 + 96 + 40;
    const q = layoutText(ctx, d.question, env.t('title', S('onest', 700, 60, 1.12, -0.02)), 920);
    env.lines(q, 4, 'Вопрос');
    q.draw(ctx, 80, y, { color: C.blue });
    y += q.h + 40;
    const a = layoutText(ctx, d.answer, env.t('body', S('onest', 400, 38, 1.42)), 920);
    env.lines(a, 99, 'Ответ');
    a.draw(ctx, 80, y, { color: C.ink });
    y += a.h;
    const footY = bottomRow(ctx, env, SURFACES.paper);
    if (!photoBand(env, y + 40, footY - 40)) env.fits(y, footY - 40, 'Ответ не помещается — сократи текст или уменьши кегль');
  },
};

/* ------------------------------------------------------ Пост · Цитата героя */
KINDS.quote = {
  name: 'Цитата героя',
  format: 'post',
  tune: { title: 'Цитата' },
  fields: [
    { key: 'quote', type: 'textarea', label: 'Цитата', hint: 'До 5 строк, без кавычек — кавычка уже в макете', sample: 'Я поступила не потому, что была лучшей, а потому что была честной в эссе' },
    { key: 'avatar', type: 'media', label: 'Аватар героя' },
    { key: 'name', type: 'text', label: 'Имя и возраст', sample: 'Мадина, 19' },
    { key: 'meta', type: 'text', label: 'Вуз · город', sample: 'UCL · Шымкент' },
    optPhoto('Встанет между цитатой и подписью'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.sky);
    drawLine(ctx, '«', 80, 80, S('unb', 600, 200, 0.6), { color: C.blue });
    const qw = textWidth(ctx, '«', S('unb', 600, 200, 0.6));
    const qfw = env.drawFlags(80 + qw + 24, 80 + 16, 88);
    env.collab(1000, 80 + 38, 44, 'main', 'right', 920 - qw - 24 - (qfw ? qfw + 40 : 16));
    const rowY = H - 80 - 120;
    env.photo('avatar', 80, rowY, 120, 120, { shape: 'circle', placeholder: ['#8A909C', '#A7ACB6', 3, 18] });
    const tx = 80 + 120 + 28;
    drawLine(ctx, d.name, tx, rowY + 22, S('onest', 700, 36, 1), { color: C.ink });
    drawLine(ctx, d.meta, tx, rowY + 22 + 36 + 10, S('onest', 500, 30, 1), { color: C.ink });
    const q = layoutText(ctx, d.quote, env.t('title', S('unb', 600, 70, 1.15, -0.03)), 920);
    env.lines(q, 5, 'Цитата');
    const top = 80 + 120;
    if (env.media('photo')) {
      q.draw(ctx, 80, top, { color: C.ink });
      photoBand(env, top + q.h + 40, rowY - 40);
      return;
    }
    const free = rowY - top - q.h;
    env.minSpace(free, 40, 'Цитата не помещается — сократи её');
    q.draw(ctx, 80, top + Math.max(0, free) / 2, { color: C.ink });
  },
};

/* ------------------------------------------------ Пост · Профиль вуза */
KINDS.uniCover = {
  name: 'Профиль университета',
  format: 'post',
  tune: { title: 'Название', value: 'Факты' },
  fields: [
    { key: 'pill', type: 'text', label: 'Плашка рубрики', sample: 'Университеты' },
    { key: 'flag', type: 'flag', label: 'Страна вуза', sample: 'ca' },
    { key: 'name', type: 'textarea', label: 'Название вуза', hint: 'Официально, латиницей', sample: 'McGill University' },
    { key: 'city', type: 'text', label: 'Город, страна', sample: 'Монреаль, Канада' },
    {
      key: 'facts', type: 'list', label: 'Четыре факта', min: 4, max: 4,
      hint: 'Рейтинг, язык, стоимость, дедлайн — последний подсвечен Coral',
      item: [
        { key: 'label', type: 'text', label: 'Подпись' },
        { key: 'value', type: 'text', label: 'Значение' },
      ],
      sample: [
        { label: 'Рейтинг QS', value: '#XX' },
        { label: 'IELTS', value: '6.5+' },
        { label: 'Обучение в год', value: 'XX k CAD' },
        { label: 'Дедлайн', value: '15.01' },
      ],
    },
    { key: 'source', type: 'text', label: 'Источник', sample: 'Данные: mcgill.ca, 09.2026' },
    optPhoto('Кампус фоном под синей тонировкой'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    env.bgPhoto('photo', C.blue, 0.78);
    const pm = env.pillSize('uni', 'blue', { text: d.pill });
    const rowH = 88;
    env.pill(80, 80 + (rowH - pm.h) / 2, 'uni', 'blue', { text: d.pill });
    drawFlag(ctx, d.flag, 1000 - 88, 80, 88);
    let y = 80 + rowH + 40;
    const name = layoutText(ctx, d.name, env.t('title', S('unb', 600, 88, 1.05, -0.03)), 920);
    env.lines(name, 2, 'Название');
    name.draw(ctx, 80, y, { color: C.white });
    y += name.h + 20;
    drawLine(ctx, d.city, 80, y, S('onest', 500, 36, 1), { color: C.skyTint });
    y += 36 + 40;
    const footY = H - 80 - 44;
    const gridH = footY - 40 - y;
    env.minSpace(gridH, 360, 'Карточкам фактов мало места — сократи название');
    const cw = (920 - 20) / 2;
    const ch = Math.max(120, (gridH - 20) / 2);
    (d.facts || []).slice(0, 4).forEach((f, i) => {
      const cx = 80 + (i % 2) * (cw + 20);
      const cy = y + Math.floor(i / 2) * (ch + 20);
      const hot = i === 3;
      fillRR(ctx, cx, cy, cw, ch, 28, hot ? C.coral : C.white);
      drawLine(ctx, f.label, cx + 32, cy + 32, S('onest', 500, 28, 1), { color: hot ? C.ink : C.slate });
      const vst = fitSize(ctx, f.value || '', env.t('value', S('unb', 600, 56, 1)), cw - 64, 30);
      drawLine(ctx, f.value, cx + 32, cy + ch - 32 - vst.size, vst, { color: C.ink });
    });
    footerRow(ctx, env, footY, 'onBlue', d.source, C.white);
  },
};

/* ----------------------------------------- Универсальный · факты-таблица */
KINDS.factsSlide = {
  name: 'Факты списком',
  format: 'post',
  tune: { title: 'Заголовок', value: 'Значения' },
  fields: [
    { key: 'bg', type: 'select', label: 'Фон', options: SURFACE_CHOICES, sample: 'paper' },
    { key: 'showPill', type: 'toggle', label: 'Плашка рубрики', sample: true },
    { key: 'pill', type: 'text', label: 'Текст плашки', hint: 'Пусто — название рубрики шаблона' },
    { key: 'title', type: 'textarea', label: 'Заголовок', sample: 'Требования к поступлению' },
    {
      key: 'rows', type: 'list', label: 'Строки', min: 1, max: 6,
      item: [
        { key: 'label', type: 'text', label: 'Подпись' },
        { key: 'value', type: 'textarea', label: 'Значение' },
      ],
      sample: [
        { label: 'Язык', value: 'IELTS 6.5, не ниже 6.0 по секциям' },
        { label: 'Документы', value: 'Транскрипт, 2 рекомендации, эссе' },
        { label: 'Стоимость подачи', value: '125 CAD' },
        { label: 'Дедлайн', value: '15 января 2027' },
      ],
    },
    optPhoto(),
  ],
  draw(ctx, d, env) {
    const sf = SURFACES[d.bg] || SURFACES.paper;
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, sf.bg);
    const th = topRow(ctx, env, d, sf);
    let y = 80 + (th ? th + 48 : 0);
    if (d.title) {
      const title = layoutText(ctx, d.title, env.t('title', S('onest', 800, 72, 1.1, -0.02)), 920);
      env.lines(title, 3, 'Заголовок');
      title.draw(ctx, 80, y, { color: sf.title });
      y += title.h + 40;
    }
    const vst = env.t('value', S('onest', 700, 44, 1.2));
    (d.rows || []).forEach((r, i) => {
      const bw = i === 0 ? 3 : 2;
      fillRect(ctx, 80, y, 920, bw, i === 0 ? sf.line : sf.thin);
      y += bw + 24;
      drawLine(ctx, r.label, 80, y, S('onest', 500, 28, 1), { color: sf.sub });
      y += 28 + 10;
      const v = layoutText(ctx, r.value, vst, 920);
      v.draw(ctx, 80, y, { color: sf.text });
      if (v.tooWide) env.warn('Слово в строке «' + (r.label || i + 1) + '» не помещается по ширине');
      y += v.h + 24;
    });
    const footY = bottomRow(ctx, env, sf);
    if (!photoBand(env, y + 16, footY - 40)) env.fits(y, footY - 32, 'Строки не помещаются — убери строку или сократи текст');
  },
};

/* ----------------------------------------------- Универсальный · текст */
KINDS.textSlide = {
  name: 'Текст',
  format: 'post',
  tune: { title: 'Заголовок', body: 'Текст' },
  fields: [
    { key: 'bg', type: 'select', label: 'Фон', options: SURFACE_CHOICES, sample: 'paper' },
    { key: 'showPill', type: 'toggle', label: 'Плашка рубрики', sample: true },
    { key: 'pill', type: 'text', label: 'Текст плашки', hint: 'Пусто — название рубрики шаблона' },
    { key: 'title', type: 'textarea', label: 'Заголовок', sample: 'Кого это касается' },
    { key: 'body', type: 'textarea', label: 'Текст', hint: 'Строка с «- » в начале — пункт списка с дугой-маркером', sample: 'Выпускников бакалавриата 2026–2027 годов из любых стран.\n\n- Диплом бакалавра по профилю программы\n- IELTS от 6.5 или TOEFL iBT от 90\n- Мотивационное письмо и CV' },
    optPhoto(),
  ],
  draw(ctx, d, env) {
    const sf = SURFACES[d.bg] || SURFACES.paper;
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, sf.bg);
    const th = topRow(ctx, env, d, sf);
    let y = 80 + (th ? th + 48 : 0);
    if (d.title) {
      const title = layoutText(ctx, d.title, env.t('title', S('onest', 800, 72, 1.1, -0.02)), 920);
      env.lines(title, 3, 'Заголовок');
      title.draw(ctx, 80, y, { color: sf.title });
      y += title.h + 40;
    }
    const body = layoutBody(ctx, d.body, env.t('body', S('onest', 400, 38, 1.42)), 920);
    if (body.tooWide) env.warn('Слово в тексте не помещается по ширине');
    body.draw(ctx, 80, y, sf.text, sf.marker);
    y += body.h;
    const footY = bottomRow(ctx, env, sf);
    if (!photoBand(env, y + 40, footY - 40)) env.fits(y, footY - 40, 'Текст не помещается — сократи его или уменьши кегль');
  },
};

/* ---------------------------------------------------- Пост · Вебинар */

/* Поля одного спикера: у первого ключи без номера — так старые черновики не теряют данные. */
function speakerFields(n, samples) {
  const sfx = n === 1 ? '' : String(n);
  const showIf = d => Number(d.count || 1) >= n;
  return [
    { key: 'photo' + sfx, type: 'media', label: `Спикер ${n} · фото`, hint: 'Поясной портрет — встанет в арку', showIf },
    { key: 'speaker' + sfx, type: 'text', label: `Спикер ${n} · имя`, sample: samples[0], showIf },
    { key: 'role' + sfx, type: 'textarea', label: `Спикер ${n} · должность, вуз`, sample: samples[1], showIf },
  ];
}
const SPEAKER_COUNT = { key: 'count', type: 'select', label: 'Сколько спикеров', options: [['1', 'Один'], ['2', 'Два'], ['3', 'Три']], sample: '1', rebuild: true };

KINDS.webinar = {
  name: 'Анонс вебинара',
  format: 'post',
  tune: { title: 'Тема', body: 'Темы эфира', name: 'Спикеры' },
  fields: [
    { key: 'pill', type: 'text', label: 'Плашка', sample: 'Вебинар' },
    SPEAKER_COUNT,
    ...speakerFields(1, ['Имя Фамилия', 'Recruitment Manager CIS, McGill University']),
    ...speakerFields(2, ['Имя Фамилия', 'Admissions Officer, University of Edinburgh']),
    ...speakerFields(3, ['Имя Фамилия', 'Выпускник Болашак, KU Leuven']),
    { key: 'topic', type: 'textarea', label: 'Тема', hint: 'До 2 строк', sample: 'Стипендии McGill для иностранных студентов' },
    {
      key: 'topics', type: 'list', label: 'О чём эфир — по желанию', min: 0, max: 3,
      hint: 'До 3 тезисов: «Спикер → 3 темы → дата → регистрация»',
      item: [{ key: 'text', type: 'text', label: 'Тезис' }],
      sample: [],
    },
    { key: 'date', type: 'text', label: 'Дата', sample: '24 октября' },
    { key: 'time', type: 'text', label: 'Время', hint: 'Всегда по Астане', sample: '19:00 по Астане' },
    { key: 'cta', type: 'text', label: 'Кнопка', sample: 'Ссылка в шапке' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.ink);
    const pill = env.pill(80, 80, 'webinar', 'ink', { text: d.pill || undefined });
    env.logo(1000, 80 + (pill.h - 44) / 2, 44, 'onDark', 'right', 920 - pill.w - 40);
    const top = 80 + pill.h + 40;
    const rowH = 80 + 12 + 36;
    const rowY = H - 80 - rowH;
    drawLine(ctx, d.date, 80, rowY, S('unb', 600, 80, 1), { color: C.lime });
    drawLine(ctx, d.time, 80, rowY + 80 + 12, S('onest', 500, 36, 1), { color: C.white });
    if (d.cta) {
      const cm = pillMetrics(ctx, d.cta, { size: 30, weight: 700, padX: 36, padY: 24 });
      drawPill(ctx, 1000 - cm.w, rowY + rowH - cm.h, d.cta, { size: 30, weight: 700, padX: 36, padY: 24, bg: C.white, color: C.ink });
    }
    let y = rowY - 40;
    const topics = (d.topics || []).map(t => (t.text || '').trim()).filter(Boolean);
    if (topics.length) {
      const body = layoutBody(ctx, topics.map(t => '- ' + t).join('\n'), env.t('body', S('onest', 500, 34, 1.3)), 920);
      y -= body.h;
      body.draw(ctx, 80, y, C.white, C.lime);
      y -= 28;
    }
    const topic = layoutText(ctx, d.topic, env.t('title', S('onest', 700, 52, 1.15)), 920);
    env.lines(topic, 2, 'Тема');
    y -= topic.h;
    topic.draw(ctx, 80, y, { color: C.white });
    const areaBottom = y - 40;
    const areaH = areaBottom - top;
    const n = clampCount(d.count);
    if (n === 1) {
      env.minSpace(areaH, 300, 'Фото спикера почти не видно — сократи тему или тезисы');
      env.photo('photo', 80, top, 400, Math.max(0, areaH), { shape: 'arch', placeholder: HATCH_INK });
      const colX = 80 + 400 + 40, colW = 1000 - colX;
      const role = layoutText(ctx, d.role, S('onest', 400, 32, 1.3), colW);
      const name = layoutText(ctx, d.speaker, env.t('name', S('onest', 700, 48, 1.1)), colW);
      const colBottom = top + Math.max(0, areaH);
      role.draw(ctx, colX, colBottom - role.h, { color: C.mistDark });
      name.draw(ctx, colX, colBottom - role.h - 20 - name.h, { color: C.white });
      return;
    }
    const gap = 32;
    const w = (920 - gap * (n - 1)) / n;
    const nst = env.t('name', S('onest', 700, n === 2 ? 40 : 34, 1.1));
    const rst = S('onest', 400, n === 2 ? 28 : 24, 1.3);
    const people = [1, 2, 3].slice(0, n).map(i => {
      const sfx = i === 1 ? '' : String(i);
      return { key: 'photo' + sfx, name: layoutText(ctx, d['speaker' + sfx], nst, w), role: layoutText(ctx, d['role' + sfx], rst, w) };
    });
    const textH = Math.max(...people.map(p => p.name.h + (p.role.h ? 10 + p.role.h : 0)));
    const archH = Math.min(areaH - 24 - textH, w * 1.6);
    env.minSpace(archH, w * 0.7, 'Фото спикеров почти не видно — сократи тему или тезисы');
    const archTop = areaBottom - textH - 24 - Math.max(0, archH);
    people.forEach((p, i) => {
      const x = 80 + i * (w + gap);
      env.photo(p.key, x, archTop, w, Math.max(0, archH), { shape: 'arch', placeholder: HATCH_INK });
      const ty = archTop + Math.max(0, archH) + 24;
      p.name.draw(ctx, x, ty, { color: C.white });
      p.role.draw(ctx, x, ty + p.name.h + 10, { color: C.mistDark });
    });
  },
};

function clampCount(v) {
  return Math.max(1, Math.min(3, Number(v) || 1));
}

/* ------------------------------------------- Пост · Дедлайны и гранты */
KINDS.deadlines = {
  name: 'Дедлайны и гранты',
  format: 'post',
  tune: { title: 'Заголовок', body: 'Строки' },
  fields: [
    { key: 'pills', type: 'select', label: 'Плашки', options: [['both', 'Дедлайн + Гранты'], ['deadline', 'Только «Дедлайн»'], ['grants', 'Только «Гранты»']], sample: 'both' },
    { key: 'title', type: 'textarea', label: 'Заголовок', sample: 'Сроки ноября' },
    {
      key: 'rows', type: 'list', label: 'Сроки', min: 1, max: 6, hint: 'До 6 строк. Дата — ДД.ММ',
      item: [
        { key: 'date', type: 'text', label: 'Дата' },
        { key: 'program', type: 'text', label: 'Программа' },
      ],
      sample: [
        { date: '04.11', program: 'Chevening' },
        { date: '15.11', program: 'Early Decision, США' },
        { date: '30.11', program: 'Erasmus Mundus' },
        { date: '01.12', program: 'Болашак' },
      ],
    },
    { key: 'hot', type: 'toggle', label: 'Выделить первую дату как ближайшую', sample: true },
    { key: 'source', type: 'text', label: 'Подпись внизу', sample: 'Источник: сайты программ, 09.2026' },
    optPhoto(),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.paper);
    let x = 80, pillH = 0;
    if (d.pills !== 'grants') { const p = env.pill(x, 80, 'deadline', 'light'); x += p.w + 16; pillH = p.h; }
    if (d.pills !== 'deadline') { const p = env.pill(x, 80, 'grants', 'light', { noFlags: d.pills === 'both' }); pillH = p.h; }
    let y = 80 + pillH + 36;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 84, 1.05, -0.03)), 920);
    env.lines(title, 2, 'Заголовок');
    title.draw(ctx, 80, y, { color: C.ink });
    y += title.h + 36;
    const pst = env.t('body', S('onest', 600, 38, 1.2));
    const dst = S('unb', 600, Math.round(44 * pst.size / 38), 1);
    (d.rows || []).forEach((r, i) => {
      const bw = i === 0 ? 3 : 2;
      fillRect(ctx, 80, y, 920, bw, i === 0 ? C.ink : C.mist);
      y += bw + 28;
      const prog = layoutText(ctx, r.program, pst, 920 - 170 - 32);
      const rowH = Math.max(dst.size, prog.h);
      drawLine(ctx, r.date, 80, y + (rowH - dst.size) / 2, dst, { color: i === 0 && d.hot ? C.coralText : C.ink });
      prog.draw(ctx, 80 + 170 + 32, y + (rowH - prog.h) / 2, { color: C.ink });
      y += rowH + 28;
    });
    const footY = H - 80 - 44;
    if (!photoBand(env, y + 8, footY - 36)) env.fits(y, footY - 36, 'Строки не помещаются — оставь до 6 сроков или сократи названия');
    footerRow(ctx, env, footY, 'main', d.source, C.slate);
  },
};

/* ---------------------------------------------- Пост · Гайд · обложка */
KINDS.guideCover = {
  name: 'Обложка гайда',
  format: 'post',
  tune: { title: 'Заголовок' },
  fields: [
    { key: 'pill', type: 'text', label: 'Плашка рубрики', sample: 'Гайд' },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: 'До 4 строк', sample: 'Personal statement за 7 шагов' },
    { key: 'swipe', type: 'text', label: 'Подпись справа внизу', sample: 'Листай →' },
    optPhoto('Встанет под заголовком'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.paper);
    const pill = env.pill(80, 80, 'guide', 'light', { text: d.pill });
    const footY = H - 80 - 44;
    const lw = env.logo(80, footY, 44, 'main', 'left', 760);
    if (d.swipe) {
      const st = S('onest', 600, 32, 1);
      const tw = textWidth(ctx, d.swipe, st);
      if (lw + 40 + tw > 920) env.warn('Подпись внизу наезжает на логотипы — сократи её');
      drawLine(ctx, d.swipe, 1000 - tw, footY + 6, st, { color: C.ink });
    }
    const hasPhoto = Boolean(env.media('photo'));
    const arcW = hasPhoto ? 200 : 300;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, hasPhoto ? 88 : 104, 1.05, -0.03)), 920);
    env.lines(title, 4, 'Заголовок');
    const blockH = arcHeight(arcW) + 40 + title.h;
    const top = 80 + pill.h;
    const free = footY - top - blockH;
    env.minSpace(free, 40, 'Заголовок не помещается — сократи его');
    let y = hasPhoto ? top + 48 : top + Math.max(0, free) / 2;
    drawArc(ctx, 80, y, arcW, C.blue);
    y += arcHeight(arcW) + 40;
    title.draw(ctx, 80, y, { color: C.ink });
    if (hasPhoto) photoBand(env, y + title.h + 48, footY - 48);
  },
};

/* ------------------------------------------------- Пост · Гайд · шаг */
KINDS.guideStep = {
  name: 'Шаг гайда',
  format: 'post',
  tune: { title: 'Действие', body: 'Пояснение' },
  fields: [
    { key: 'num', type: 'text', label: 'Номер шага', hint: 'Пусто — по порядку среди шагов' },
    { key: 'title', type: 'textarea', label: 'Действие', hint: 'Начинается с глагола', sample: 'Выпиши три момента, когда ты выбирал сам' },
    { key: 'body', type: 'textarea', label: 'Пояснение', sample: 'Не достижения, а решения. Комиссии важно, как ты думаешь, а не сколько у тебя грамот.' },
    optPhoto(),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.white);
    fillRR(ctx, 80, 80, 240, 240, [120, 120, 0, 0], C.blue);
    const num = String(d.num || env.ordinal + 1);
    const nst = fitSize(ctx, num, S('unb', 600, 110, 1), 200, 60);
    const nw = textWidth(ctx, num, nst);
    drawLine(ctx, num, 80 + (240 - nw) / 2, 80 + 240 - 28 - nst.size, nst, { color: C.white });
    env.drawFlags(80 + 240 + 32, 80 + 240 - 72, 72);
    env.collab(1000, 80, 44, 'main', 'right', 920 - 240 - 40);
    let y = 80 + 240 + 48;
    const title = layoutText(ctx, d.title, env.t('title', S('onest', 700, 72, 1.1, -0.02)), 920);
    env.lines(title, 3, 'Действие');
    title.draw(ctx, 80, y, { color: C.ink });
    y += title.h + 48;
    const body = layoutBody(ctx, d.body, env.t('body', S('onest', 400, 40, 1.42)), 920);
    body.draw(ctx, 80, y, C.graphite, C.blue);
    y += body.h;
    const barY = H - 80 - 10;
    if (env.total > 1) drawProgress(ctx, 80, barY, 920, env.total, env.index + 1, { h: 10, gap: 10 });
    if (!photoBand(env, y + 40, barY - 48)) env.fits(y, barY - 48, 'Пояснение не помещается — сократи текст');
  },
};

/* ---------------------------------------------- Пост · Гайд · ошибки */
KINDS.guideMistakes = {
  name: 'Частые ошибки',
  format: 'post',
  tune: { title: 'Заголовок', body: 'Пункты' },
  fields: [
    { key: 'title', type: 'textarea', label: 'Заголовок', sample: 'Частые ошибки' },
    {
      key: 'items', type: 'list', label: 'Ошибки', min: 1, max: 5, hint: 'До 5 пунктов',
      item: [{ key: 'text', type: 'text', label: 'Ошибка' }],
      sample: [
        { text: 'Пересказ резюме' },
        { text: 'Цитата великого человека в начале' },
        { text: 'Одно эссе для всех вузов' },
        { text: 'Больше 650 слов' },
      ],
    },
    optPhoto(),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.ink);
    const fw = env.drawFlags(1000, 80, 72, 'right');
    let y = 80;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 88, 1.05, -0.03)), fw ? 920 - fw - 24 : 920);
    env.lines(title, 2, 'Заголовок');
    title.draw(ctx, 80, y, { color: C.coral });
    y += title.h + 48;
    const st = env.t('body', S('onest', 500, 44, 1.3));
    const markW = textWidth(ctx, '× ', st);
    (d.items || []).forEach((it, i) => {
      if (i) y += 36;
      drawLine(ctx, '×', 80, y, st, { color: C.white });
      const lt = layoutText(ctx, it.text, st, 920 - markW);
      lt.draw(ctx, 80 + markW, y, { color: C.white });
      y += Math.max(lt.h, st.size * st.lh);
    });
    const bottom = env.collab(80, H - 80 - 44, 44, 'onDark', 'left', 920) ? H - 80 - 44 - 40 : H - 80;
    if (!photoBand(env, y + 48, bottom)) env.fits(y, bottom, 'Пункты не помещаются — оставь до 5 коротких');
  },
};

/* --------------------------------------------- Пост · Гайд · чек-лист */
KINDS.guideChecklist = {
  name: 'Чек-лист',
  format: 'post',
  tune: { title: 'Заголовок', body: 'Пункты' },
  fields: [
    { key: 'title', type: 'textarea', label: 'Заголовок', sample: 'Чек-лист' },
    {
      key: 'items', type: 'list', label: 'Пункты', min: 1, max: 6, hint: '4–6 пунктов',
      item: [
        { key: 'text', type: 'text', label: 'Пункт' },
        { key: 'done', type: 'toggle', label: 'Отмечен' },
      ],
      sample: [
        { text: 'Есть личная история', done: true },
        { text: 'Понятно, почему этот вуз', done: true },
        { text: 'Прочитал кто-то ещё', done: false },
        { text: 'Уложился в лимит', done: false },
      ],
    },
    optPhoto(),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.skyTint);
    const fw = env.drawFlags(1000, 80, 72, 'right');
    let y = 80;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 88, 1.05, -0.03)), fw ? 920 - fw - 24 : 920);
    env.lines(title, 2, 'Заголовок');
    title.draw(ctx, 80, y, { color: C.blue });
    y += title.h + 44;
    const st = env.t('body', S('onest', 500, 44, 1.3));
    (d.items || []).forEach((it, i) => {
      if (i) y += 36;
      const lt = layoutText(ctx, it.text, st, 920 - 64 - 28);
      const rowH = Math.max(64, lt.h);
      const by = y + (rowH - 64) / 2;
      if (it.done) {
        fillRR(ctx, 80, by, 64, 64, 16, C.blue);
        drawGlyph(ctx, 'check', 80 + 12, by + 12, 40, C.white);
      } else {
        strokeInsetRR(ctx, 80, by, 64, 64, 16, C.ink, 5);
      }
      lt.draw(ctx, 80 + 64 + 28, y + (rowH - lt.h) / 2, { color: C.ink });
      y += rowH;
    });
    const bottom = env.collab(80, H - 80 - 44, 44, 'main', 'left', 920) ? H - 80 - 44 - 40 : H - 80;
    if (!photoBand(env, y + 48, bottom)) env.fits(y, bottom, 'Пункты не помещаются — оставь до 6 коротких');
  },
};

/* ------------------------------------------------ Пост · Гайд · финал */
KINDS.guideFinal = {
  name: 'Финал: сохрани',
  format: 'post',
  tune: { title: 'Призыв' },
  fields: [
    { key: 'title', type: 'textarea', label: 'Призыв', sample: 'Сохрани, чтобы вернуться к гайду' },
    { key: 'handle', type: 'text', label: 'Ник', sample: HANDLE },
    optPhoto('Фоном под синей тонировкой'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    env.bgPhoto('photo', C.blue, 0.72);
    drawArc(ctx, 80, 80, 360, C.white);
    env.drawFlags(80 + 360 + 40, 80 + arcHeight(360) - 72, 72);
    env.collab(1000, 80, 44, 'onBlue', 'right', 920 - 360 - 40);
    const rowY = H - 80 - 96;
    drawLine(ctx, d.handle, 80, rowY + 28, S('onest', 600, 40, 1), { color: C.white });
    drawGlyph(ctx, 'bookmark-simple', 1000 - 96, rowY, 96, C.white);
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 96, 1.08, -0.03)), 920);
    env.lines(title, 4, 'Призыв');
    const top = 80 + arcHeight(360);
    const free = rowY - top - title.h;
    env.minSpace(free, 40, 'Призыв не помещается — сократи его');
    title.draw(ctx, 80, top + Math.max(0, free) / 2, { color: C.white });
  },
};

/* ------------------------------------------------- Пост · Цифры и факты */
KINDS.number = {
  name: 'Цифра',
  format: 'post',
  tune: { number: 'Число', title: 'Пояснение' },
  fields: [
    { key: 'pill', type: 'text', label: 'Плашка рубрики', sample: 'Цифры' },
    { key: 'number', type: 'text', label: 'Число', hint: 'Коротко: «1 из 4», «42%», «100%»', sample: '1 из 4' },
    { key: 'text', type: 'textarea', label: 'Пояснение', hint: 'До 2 строк', sample: 'студентов Erasmus+ впервые живут за границей' },
    { key: 'source', type: 'text', label: 'Источник', hint: 'Обязателен под каждой цифрой', sample: 'Источник: Erasmus+ Annual Report' },
    optPhoto('Фоном под синей тонировкой'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    env.bgPhoto('photo', C.blue, 0.74);
    const pill = env.pill(80, 80, 'numbers', 'blue', { text: d.pill });
    const footY = H - 80 - 44;
    footerRow(ctx, env, footY, 'onBlue', d.source, C.white);
    const nBase = env.t('number', S('unb', 600, 260, 0.9, -0.05));
    const nst = fitSize(ctx, d.number || '', nBase, 920, Math.round(nBase.size * 0.77));
    const num = layoutText(ctx, d.number, nst, 920);
    if (num.lines.length > 1) env.warn('Число не помещается в одну строку — сократи его');
    const txt = layoutText(ctx, d.text, env.t('title', S('onest', 600, 52, 1.2)), 920);
    env.lines(txt, 2, 'Пояснение');
    const blockH = num.h + 36 + txt.h;
    const top = 80 + pill.h;
    const free = footY - top - blockH;
    env.minSpace(free, 40, 'Текст не помещается');
    let y = top + Math.max(0, free) / 2;
    num.draw(ctx, 80, y, { color: C.white });
    y += num.h + 36;
    txt.draw(ctx, 80, y, { color: C.white });
  },
};

/* --------------------------------------------------- Пост · Сравнение */
KINDS.compare = {
  name: 'Сравнение',
  format: 'post',
  noFlags: true,   // флаги тут — сама суть макета, отдельное поле не нужно
  tune: { title: 'Заголовок', value: 'Значения' },
  fields: [
    { key: 'title', type: 'textarea', label: 'Заголовок', sample: 'Германия или Нидерланды' },
    { key: 'flagA', type: 'flag', label: 'Страна слева', sample: 'de' },
    { key: 'flagB', type: 'flag', label: 'Страна справа', sample: 'nl' },
    {
      key: 'rows', type: 'list', label: 'Строки сравнения', min: 1, max: 5, hint: 'Одинаковые строки: стоимость, язык, работа, виза',
      item: [
        { key: 'label', type: 'text', label: 'Что сравниваем' },
        { key: 'a', type: 'text', label: 'Слева' },
        { key: 'b', type: 'text', label: 'Справа' },
      ],
      sample: [
        { label: 'Обучение', a: '≈ 0 € + взнос', b: '≈ XX 000 €' },
        { label: 'Язык', a: 'DE / EN', b: 'EN' },
        { label: 'Работа', a: '20 ч в неделю', b: '16 ч в неделю' },
      ],
    },
    optPhoto(),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.white);
    let y = 80;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 72, 1.08, -0.03)), 920);
    env.lines(title, 2, 'Заголовок');
    title.draw(ctx, 80, y, { color: C.ink });
    y += title.h + 40;
    const colW = (920 - 40) / 2;
    const xs = [80, 80 + colW + 40];
    drawFlag(ctx, d.flagA, xs[0], y, 120);
    drawFlag(ctx, d.flagB, xs[1], y, 120);
    y += 120 + 32;
    const vst = env.t('value', S('onest', 700, 44, 1.1));
    (d.rows || []).forEach((r, i) => {
      const bw = i === 0 ? 3 : 2;
      const cells = [r.a, r.b].map(v => layoutText(ctx, v, vst, colW));
      const cellH = 28 + 10 + Math.max(vst.size * vst.lh, ...cells.map(c => c.h));
      xs.forEach((x, k) => {
        fillRect(ctx, x, y, colW, bw, i === 0 ? C.ink : C.mist);
        drawLine(ctx, r.label, x, y + bw + 24, S('onest', 500, 28, 1), { color: C.slate });
        cells[k].draw(ctx, x, y + bw + 24 + 28 + 10, { color: C.ink });
      });
      y += bw + 24 + cellH + 24;
    });
    const logoY = H - 80 - 44;
    env.logo(80, logoY, 44, 'main', 'left', 920);
    if (!photoBand(env, y + 16, logoY - 40)) env.fits(y, logoY - 40, 'Строки не помещаются — оставь до 4–5 коротких');
  },
};

/* ----------------------------------------------- Пост · Партнёрский */
KINDS.partnerCover = {
  name: 'Партнёрский пост',
  format: 'post',
  tune: { title: 'Заголовок' },
  fields: [
    { key: 'pill', type: 'text', label: 'Пометка', hint: 'Обязательна на каждом оплаченном посте', sample: 'Партнёрский материал' },
    { key: 'partnerLogo', type: 'media', label: 'Логотип партнёра', hint: 'Или выбери партнёра в блоке «Коллаборация» выше — логотип встанет сам', fit: 'contain' },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: 'Без превосходных степеней, до 4 строк', sample: 'Магистратура в Эдинбурге для студентов из Центральной Азии' },
    { key: 'photo', type: 'media', label: 'Фото', video: true, hint: 'Фото от вуза-партнёра' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.white);
    const pill = env.pill(80, 80, 'partner', 'light', { text: d.pill });
    let y = 80 + pill.h + 40;
    if (env.hasCollab && !env.media('partnerLogo')) {
      // партнёры из «Коллаборации»: знак партнёра — та же раскладка ко-брендинга
      env.logo(80, y + 14, 52, 'main', 'left', 920);
    } else {
      const lw = drawLogo(ctx, 80, y + 14, 52, 'main');
      const dx = 80 + lw + 40;
      fillRect(ctx, dx, y, 3, 80, C.mistDark);
      env.photo('partnerLogo', dx + 3 + 40, y, 240, 80, { fit: 'contain', placeholder: [C.mist, C.white, 3, 16] });
    }
    y += 80 + 40;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 68, 1.1, -0.03)), 920);
    env.lines(title, 4, 'Заголовок');
    title.draw(ctx, 80, y, { color: C.ink });
    y += title.h + 40;
    const photoH = H - 80 - y;
    env.minSpace(photoH, 200, 'Для фото почти не осталось места — сократи заголовок');
    env.photo('photo', 80, y, 920, Math.max(0, photoH), { radius: 32, placeholder: HATCH_LIGHT });
  },
};

/* ------------------------------------------ Пост · Подборка · обложка */

/* Категории подборки для обложки — собираются со слайдов «Категория» после неё. */
function resourceCategories(env) {
  const seen = new Set();
  const out = [];
  for (const s of env.slides.slice(env.index + 1)) {
    if (s.kind !== 'resGroup') continue;
    const title = String(s.data.title || '').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    out.push({ title, icon: s.data.icon || 'star' });
  }
  return out;
}

KINDS.resCover = {
  name: 'Обложка подборки',
  format: 'post',
  tune: { number: 'Число', title: 'Заголовок' },
  fields: [
    { key: 'pill', type: 'text', label: 'Плашка рубрики', sample: 'Подборка' },
    { key: 'number', type: 'text', label: 'Число', hint: 'Сколько ресурсов в подборке. Пусто — без числа', sample: '8' },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: 'Продолжение числа: «приложений, которые…»', sample: 'приложений, которые помогут учиться продуктивнее' },
    { key: 'showCats', type: 'toggle', label: 'Показать категории со слайдов подборки', sample: true },
    { key: 'swipe', type: 'text', label: 'Подпись справа внизу', sample: 'Листай →' },
    optPhoto('Фоном под синей тонировкой'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    env.bgPhoto('photo', C.blue, 0.76);
    const pill = env.pill(80, 80, 'resources', 'blue', { text: d.pill });
    const footY = H - 80 - 44;
    const lw = env.logo(80, footY, 44, 'onBlue', 'left', 760);
    if (d.swipe) {
      const st = S('onest', 600, 32, 1);
      const tw = textWidth(ctx, d.swipe, st);
      if (lw + 40 + tw > 920) env.warn('Подпись внизу наезжает на логотипы — сократи её');
      drawLine(ctx, d.swipe, 1000 - tw, footY + 6, st, { color: C.white });
    }
    let y = 80 + pill.h + 64;
    if (d.number) {
      const nst = fitSize(ctx, d.number, env.t('number', S('unb', 600, 300, 0.9, -0.05)), 920, 140);
      const num = layoutText(ctx, d.number, nst, 920);
      num.draw(ctx, 80, y, { color: C.lime });
      y += num.h + 24;
    }
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 72, 1.08, -0.03)), 920);
    env.lines(title, 4, 'Заголовок');
    title.draw(ctx, 80, y, { color: C.white });
    y += title.h;
    const cats = d.showCats === false ? [] : resourceCategories(env).slice(0, 6);
    if (cats.length) {
      // категории — в две колонки, до двух строк на название
      const st = S('onest', 600, 28, 1.15);
      const laid = cats.map(c => layoutText(ctx, c.title, st, 470 - 64 - 24));
      laid.forEach(lt => { if (lt.lines.length > 2) { lt.lines = lt.lines.slice(0, 2); lt.h = 2 * st.size * st.lh; } });
      const rowHs = [];
      for (let r = 0; r * 2 < cats.length; r++) {
        rowHs.push(Math.max(48, ...laid.slice(r * 2, r * 2 + 2).map(lt => lt.h)) + 20);
      }
      const catsH = rowHs.reduce((a, b) => a + b, 0) - 20;
      const cy = footY - 56 - catsH;
      env.fits(y + 40, cy, 'Заголовок и категории не помещаются вместе — сократи заголовок или выключи категории');
      let ry = cy;
      rowHs.forEach((rh, r) => {
        for (let k = 0; k < 2; k++) {
          const i = r * 2 + k;
          if (i >= cats.length) break;
          const cx = 80 + k * 470;
          const lh = rh - 20;
          fillCircle(ctx, cx + 24, ry + lh / 2, 24, 'rgba(255,255,255,0.16)');
          drawGlyph(ctx, cats[i].icon, cx + 10, ry + lh / 2 - 14, 28, C.lime);
          laid[i].draw(ctx, cx + 64, ry + (lh - laid[i].h) / 2, { color: C.white });
        }
        ry += rh;
      });
    } else {
      env.fits(y, footY - 40, 'Заголовок не помещается — сократи его');
    }
  },
};

/* ---------------------------------------- Пост · Подборка · категория */
KINDS.resGroup = {
  name: 'Категория подборки',
  format: 'post',
  tune: { title: 'Категория', name: 'Названия', body: 'Описания' },
  fields: [
    { key: 'bg', type: 'select', label: 'Фон', options: LIGHT_SURFACE_CHOICES, sample: 'paper' },
    { key: 'icon', type: 'icon', label: 'Иконка категории', options: GLYPH_CHOICES, sample: 'note-pencil' },
    { key: 'title', type: 'textarea', label: 'Категория', sample: 'Для ведения заметок' },
    {
      key: 'items', type: 'list', label: 'Ресурсы', min: 1, max: 3, hint: '2–3 на слайд. Логотип или иконка приложения — по желанию',
      item: [
        { key: 'name', type: 'text', label: 'Название' },
        { key: 'text', type: 'textarea', label: 'Описание' },
        { key: 'logo', type: 'media', label: 'Логотип', fit: 'contain' },
      ],
      sample: [
        { name: 'Obsidian', text: 'Приложение для заметок, которое позволяет связывать записи между собой. Удобно, если вы работаете с большим количеством материалов и хотите выстроить собственную базу знаний.' },
        { name: 'Joplin', text: 'Заметки с поддержкой Markdown, вложений и синхронизации между устройствами. Подойдёт для тех, кто хочет хранить учебные материалы структурированно.' },
      ],
    },
  ],
  draw(ctx, d, env) {
    const sf = SURFACES[d.bg] || SURFACES.paper;
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, sf.bg);
    // иконка рубрики — в круге Sky Tint диаметром 1,8× иконки (раздел «Иконки»)
    const circle = 104;
    fillCircle(ctx, 80 + circle / 2, 80 + circle / 2, circle / 2, d.bg === 'skyTint' ? C.white : C.skyTint);
    drawGlyph(ctx, d.icon || 'star', 80 + 23, 80 + 23, 58, C.blue);
    const counter = counterText(env);
    let cw = 0;
    const cst = S('onest', 500, 30, 1);
    if (counter) {
      cw = textWidth(ctx, counter, cst);
      drawLine(ctx, counter, 1000 - cw, 80 + (circle - 30) / 2, cst, { color: sf.sub });
    }
    const fw = env.drawFlags(1000 - (cw ? cw + 24 : 0), 80 + (circle - 56) / 2, 56, 'right');
    const tx = 80 + circle + 28;
    const tw = 1000 - tx - (cw ? cw + 24 : 0) - (fw ? fw + 24 : 0);
    const title = layoutText(ctx, d.title, env.t('title', S('onest', 800, 56, 1.08, -0.02)), tw);
    env.lines(title, 2, 'Категория');
    title.draw(ctx, tx, 80 + Math.max(0, (circle - title.h) / 2), { color: sf.title });
    let y = 80 + Math.max(circle, title.h) + 48;
    const nst = env.t('name', S('onest', 700, 44, 1.15));
    const bst = env.t('body', S('onest', 400, 34, 1.4));
    (d.items || []).forEach((it, i) => {
      const key = `items.${i}.logo`;
      const hasLogo = Boolean(env.media(key));
      const pad = 36;
      const logoS = hasLogo ? 96 : 0;
      const innerX = 80 + pad + (logoS ? logoS + 28 : 0);
      const innerW = 920 - pad * 2 - (logoS ? logoS + 28 : 0);
      const name = layoutText(ctx, it.name, nst, innerW);
      const text = layoutText(ctx, it.text, bst, innerW);
      const h = pad * 2 + Math.max(logoS, name.h + (text.h ? 12 + text.h : 0));
      fillRR(ctx, 80, y, 920, h, 28, sf.card);
      if (hasLogo) env.photo(key, 80 + pad, y + pad, logoS, logoS, { fit: 'contain', radius: 24, bg: C.white });
      name.draw(ctx, innerX, y + pad, { color: C.blue });
      text.draw(ctx, innerX, y + pad + name.h + 12, { color: sf.text });
      if (name.tooWide || text.tooWide) env.warn('Слово в описании «' + (it.name || i + 1) + '» не помещается по ширине');
      y += h + 24;
    });
    const footY = bottomRow(ctx, env, sf);
    env.fits(y - 24, footY - 40, 'Ресурсы не помещаются — оставь 2 на слайд или сократи описания');
  },
};

/* ================================================================ STORIES */
/* Всё важное — между 250 px сверху и 340 px снизу: там интерфейс Instagram. */

KINDS.storyAnnounce = {
  name: 'Анонс поста',
  format: 'story',
  tune: { title: 'Заголовок карточки' },
  fields: [
    { key: 'head', type: 'text', label: 'Заголовок', sample: 'Новый пост' },
    { key: 'image', type: 'media', label: 'Картинка поста', hint: 'Обложка поста из ленты' },
    { key: 'title', type: 'textarea', label: 'Название поста', sample: 'Personal statement за 7 шагов' },
    { key: 'cta', type: 'text', label: 'Подпись внизу', sample: 'Смотри в ленте ↓' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    const fw = env.drawFlags(1000, 250, 88, 'right');
    const head = layoutText(ctx, d.head, S('unb', 600, 96, 1.05, -0.03), fw ? 920 - fw - 24 : 920);
    head.draw(ctx, 80, 250, { color: C.white });
    const reserve = storyCollab(env, 'onBlue');
    const ctaY = H - 340 - reserve - 48;
    drawLine(ctx, d.cta, 80, ctaY, S('onest', 600, 48, 1), { color: C.white });
    const title = layoutText(ctx, d.title, env.t('title', S('onest', 700, 56, 1.15)), 840);
    env.lines(title, 3, 'Название поста');
    const cardH = 40 + 420 + 28 + title.h + 40;
    const top = 250 + Math.max(head.h, fw ? 88 : 0);
    const free = ctaY - top - cardH;
    env.minSpace(free, 40, 'Карточка не помещается — сократи текст');
    const cy = top + Math.max(0, free) / 2;
    fillRR(ctx, 80, cy, 920, cardH, 40, C.white);
    env.photo('image', 120, cy + 40, 840, 420, { radius: 24, placeholder: HATCH_LIGHT });
    title.draw(ctx, 120, cy + 40 + 420 + 28, { color: C.ink });
  },
};

KINDS.storyPoll = {
  name: 'Опрос',
  format: 'story',
  tune: { title: 'Вопрос' },
  fields: [
    { key: 'question', type: 'textarea', label: 'Вопрос', sample: 'Куда хочешь поступать?' },
    {
      key: 'options', type: 'list', label: 'Варианты', min: 2, max: 4, hint: 'Стикер-опрос Instagram ставится поверх в зоне пилюль',
      item: [{ key: 'text', type: 'text', label: 'Вариант' }],
      sample: [{ text: 'Европа' }, { text: 'США и Канада' }],
    },
    optPhoto('Встанет над вопросом'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.white);
    const reserve = storyCollab(env, 'main');
    const q = layoutText(ctx, d.question, env.t('title', S('unb', 600, 88, 1.1, -0.03)), 920);
    env.lines(q, 4, 'Вопрос');
    const opts = d.options || [];
    const optH = 52 + 88;
    const listH = opts.length ? opts.length * optH + (opts.length - 1) * 28 : 0;
    const flagsH = env.flags.length ? 88 + 40 : 0;
    const avail = H - 250 - 340 - reserve;
    const rest = flagsH + q.h + (opts.length ? 64 : 0) + listH;
    const ph = env.media('photo') ? Math.max(280, Math.min(520, avail - rest - 56 - 40)) : 0;
    const photoH = ph ? ph + 56 : 0;
    const total = photoH + rest;
    env.minSpace(avail - total, 0, 'Опрос не помещается в безопасную зону Stories');
    let y = 250 + Math.max(0, avail - total) / 2;
    if (photoH) { env.band('photo', 80, y, 920, ph, { radius: 40 }); y += photoH; }
    if (flagsH) { env.drawFlags(80, y, 88); y += flagsH; }
    q.draw(ctx, 80, y, { color: C.ink });
    y += q.h + 64;
    opts.forEach((o, i) => {
      const blue = i % 2 === 0;
      fillRR(ctx, 80, y, 920, optH, optH / 2, blue ? C.blue : C.skyTint);
      const st = S('onest', 700, 52, 1);
      const tw = textWidth(ctx, o.text, st);
      drawLine(ctx, o.text, 80 + (920 - tw) / 2, y + 44, st, { color: blue ? C.white : C.blue });
      y += optH + 28;
    });
  },
};

KINDS.storyQuiz = {
  name: 'Квиз',
  format: 'story',
  tune: { title: 'Вопрос', body: 'Ответы' },
  fields: [
    { key: 'pill', type: 'text', label: 'Плашка', sample: 'Квиз' },
    { key: 'question', type: 'textarea', label: 'Вопрос', sample: 'Какой балл IELTS нужен в UCL?' },
    {
      key: 'answers', type: 'list', label: 'Ответы', min: 2, max: 4, hint: 'Буквы A, B, C ставятся сами',
      item: [{ key: 'text', type: 'text', label: 'Ответ' }],
      sample: [{ text: '6.0' }, { text: '6.5–7.5' }, { text: '8.5' }],
    },
    optPhoto('Встанет над плашкой'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.paper);
    const reserve = storyCollab(env, 'main');
    const pillO = { size: 44, padX: 40, padY: 24, text: d.pill };
    const pm = env.pillSize('quiz', 'light', pillO);
    const q = layoutText(ctx, d.question, env.t('title', S('unb', 600, 80, 1.12, -0.03)), 920);
    env.lines(q, 4, 'Вопрос');
    const ast = env.t('body', S('onest', 600, 48, 1.15));
    const answers = (d.answers || []).map((a, i) => layoutText(ctx, 'ABCD'[i] + ' · ' + (a.text || ''), ast, 920 - 80));
    const ansH = answers.reduce((s, a) => s + Math.max(a.h, ast.size) + 80, 0) + Math.max(0, answers.length - 1) * 24;
    const avail = H - 250 - 340 - reserve;
    const rest = pm.h + 56 + q.h + 56 + ansH;
    const ph = env.media('photo') ? Math.max(260, Math.min(480, avail - rest - 56 - 40)) : 0;
    const photoH = ph ? ph + 56 : 0;
    const total = photoH + rest;
    env.minSpace(avail - total, 0, 'Квиз не помещается в безопасную зону Stories');
    let y = 250 + Math.max(0, avail - total) / 2;
    if (photoH) { env.band('photo', 80, y, 920, ph, { radius: 40 }); y += photoH; }
    env.pill(80, y, 'quiz', 'light', pillO);
    y += pm.h + 56;
    q.draw(ctx, 80, y, { color: C.ink });
    y += q.h + 56;
    answers.forEach(a => {
      const h = Math.max(a.h, ast.size) + 80;
      fillRR(ctx, 80, y, 920, h, 28, C.white);
      a.draw(ctx, 120, y + 40, { color: C.ink });
      y += h + 24;
    });
  },
};

KINDS.storyCountdown = {
  name: 'Обратный отсчёт',
  format: 'story',
  tune: { number: 'Число' },
  fields: [
    { key: 'label', type: 'textarea', label: 'До чего', sample: 'До вебинара с McGill' },
    { key: 'number', type: 'text', label: 'Число', sample: '2' },
    { key: 'unit', type: 'text', label: 'Единица', hint: 'день / дня / дней / часа', sample: 'дня' },
    { key: 'cta', type: 'text', label: 'Кнопка', hint: 'Сюда ставится стикер-напоминание', sample: 'Напомнить' },
    optPhoto('Фоном под тёмной тонировкой'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.ink);
    env.bgPhoto('photo', C.ink, 0.74);
    const reserve = storyCollab(env, 'onDark', 'center');
    const label = layoutText(ctx, d.label, S('onest', 600, 56, 1.2), 920);
    const nBase = env.t('number', S('unb', 600, 420, 0.9, -0.05));
    const nst = fitSize(ctx, d.number || '', nBase, 920, 160);
    const num = layoutText(ctx, d.number, nst, 920);
    const unitSt = S('unb', 600, 72, 1);
    const btnO = { size: 44, weight: 700, padX: 56, padY: 36, bg: C.white, color: C.ink };
    const bm = d.cta ? pillMetrics(ctx, d.cta, btnO) : { w: 0, h: 0 };
    const flagsH = env.flags.length ? 88 : 0;
    const parts = [flagsH, label.h, num.h, d.unit ? 72 : 0, bm.h].filter(Boolean);
    const total = parts.reduce((a, b) => a + b, 0) + (parts.length - 1) * 48;
    const avail = H - 250 - 340 - reserve;
    env.minSpace(avail - total, 0, 'Не помещается в безопасную зону Stories');
    let y = 250 + Math.max(0, avail - total) / 2;
    if (flagsH) {
      const fw = flagsRowWidth(env.flags.length, 88);
      env.drawFlags((W - fw) / 2, y, 88);
      y += 88 + 48;
    }
    if (label.h) { label.draw(ctx, 80, y, { color: C.white, align: 'center', width: 920 }); y += label.h + 48; }
    num.draw(ctx, 80, y, { color: C.lime, align: 'center', width: 920 });
    y += num.h + 48;
    if (d.unit) {
      drawLine(ctx, d.unit, 80 + (920 - textWidth(ctx, d.unit, unitSt)) / 2, y, unitSt, { color: C.white });
      y += 72 + 48;
    }
    if (d.cta) drawPill(ctx, (W - bm.w) / 2, y, d.cta, btnO);
  },
};

KINDS.storyArticle = {
  name: 'Репост статьи',
  format: 'story',
  tune: { title: 'Заголовок статьи' },
  fields: [
    { key: 'head', type: 'text', label: 'Надпись сверху', sample: 'Новое на сайте' },
    { key: 'image', type: 'media', label: 'Картинка статьи' },
    { key: 'title', type: 'textarea', label: 'Заголовок статьи', sample: 'Сколько стоит год в Лёвене: считаем бюджет' },
    { key: 'cta', type: 'text', label: 'Кнопка', hint: 'Сюда ставится стикер-ссылка', sample: 'Читать статью' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.skyTint);
    const reserve = storyCollab(env, 'main');
    const headSt = S('onest', 600, 48, 1);
    const title = layoutText(ctx, d.title, env.t('title', S('onest', 700, 60, 1.15)), 920 - 96);
    env.lines(title, 3, 'Заголовок статьи');
    const btnO = { size: 44, weight: 700, padX: 56, padY: 36, bg: C.blue, color: C.white };
    const bm = d.cta ? pillMetrics(ctx, d.cta, btnO) : { w: 0, h: 0 };
    const cardH = 560 + 48 + title.h + 48;
    const headH = d.head || env.flags.length ? 56 + 48 : 0;
    const total = headH + cardH + (d.cta ? 48 + bm.h : 0);
    const avail = H - 250 - 340 - reserve;
    env.minSpace(avail - total, 0, 'Не помещается в безопасную зону Stories');
    let y = 250 + Math.max(0, avail - total) / 2;
    if (headH) {
      const fw = env.drawFlags(80, y, 56);
      if (d.head) drawLine(ctx, d.head, 80 + (fw ? fw + 20 : 0), y + 4, headSt, { color: C.blue });
      y += headH;
    }
    ctx.save();
    rrPath(ctx, 80, y, 920, cardH, 40);
    ctx.clip();
    fillRect(ctx, 80, y, 920, cardH, C.white);
    env.photo('image', 80, y, 920, 560, { placeholder: HATCH_LIGHT });
    ctx.restore();
    title.draw(ctx, 80 + 48, y + 560 + 48, { color: C.ink });
    y += cardH + 48;
    if (d.cta) drawPill(ctx, (W - bm.w) / 2, y, d.cta, btnO);
  },
};

/* ================================================================== REELS */

KINDS.reelsCover = {
  name: 'Обложка Reels',
  format: 'story',
  tune: { title: 'Заголовок' },
  fields: [
    { key: 'photo', type: 'media', label: 'Кадр из ролика', video: true },
    { key: 'rubric', type: 'select', label: 'Рубрика', options: RUBRIC_CHOICES, sample: 'stories' },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: 'Держится в центральных 1080×1440 — зоне обложки в сетке', sample: 'Один день в NYU Shanghai' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    env.photo('photo', 0, 0, W, H, { placeholder: HATCH_DARK });
    fillRect(ctx, 0, 0, W, H, 'rgba(10,52,245,0.55)');
    const pillO = { size: 40, padX: 36, padY: 22 };
    const rubric = d.rubric || 'stories';
    const pm = env.pillSize(rubric, 'blue', pillO);
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 120, 1.05, -0.03)), 920);
    env.lines(title, 5, 'Заголовок');
    const reserve = env.hasCollab ? 44 + 56 : 0;
    if (reserve) env.logo(80, 240 + 1440 - 44 - 40, 44, 'onBlue', 'left', 920);
    const total = pm.h + 48 + title.h;
    env.minSpace(1440 - reserve - total, 0, 'Заголовок выходит за зону обложки 1080×1440');
    let y = 240 + Math.max(0, 1440 - reserve - total) / 2;
    env.pill(80, y, rubric, 'blue', pillO);
    y += pm.h + 48;
    title.draw(ctx, 80, y, { color: C.white });
  },
};

KINDS.reelsCaption = {
  name: 'Титры и субтитры',
  format: 'story',
  tune: { title: 'Субтитр' },
  fields: [
    { key: 'video', type: 'media', label: 'Видео или кадр', video: true, hint: 'Без фона — экспорт PNG с прозрачностью, чтобы наложить в монтаже' },
    { key: 'name', type: 'text', label: 'Плашка героя', sample: 'Алия · MIT' },
    { key: 'text', type: 'textarea', label: 'Субтитр', hint: 'До 2 строк по 32 знака', sample: 'Я подала заявку в двенадцать вузов' },
    { key: 'accent', type: 'text', label: 'Ключевое слово', hint: 'Подсветится Lime', sample: 'двенадцать' },
  ],
  transparentWhenEmpty: 'video',
  draw(ctx, d, env) {
    const { W, H } = env;
    if (env.media('video')) env.photo('video', 0, 0, W, H, { placeholder: HATCH_LIGHT });
    else if (!env.exporting) { checker(ctx, 0, 0, W, H); env.slot('video', 0, 0, W, H); }
    else env.slot('video', 0, 0, W, H);
    if (d.name || env.flags.length) {
      const o = { size: 44, weight: 700, padX: 32, padY: 20, color: C.ink, flags: env.flags, flagSize: 60, padFlag: 14 };
      const pm = pillMetrics(ctx, d.name || '', o);
      fillRR(ctx, 80, 250, pm.w, pm.h, 20, C.white);
      drawPill(ctx, 80, 250, d.name || '', Object.assign({}, o, { bg: null }));
    }
    if (d.text) {
      const st = env.t('title', S('onest', 700, 60, 1.25));
      const lt = layoutText(ctx, d.text, st, 920 - 72);
      env.lines(lt, 2, 'Субтитр');
      const pw = lt.maxW + 72, ph = lt.h + 48;
      const px = 80 + (920 - pw) / 2, py = 1450 - ph;
      fillRR(ctx, px, py, pw, ph, 20, 'rgba(18,20,24,0.85)');
      lt.draw(ctx, px + 36, py + 24, { color: C.white, align: 'center', width: lt.maxW, accent: { word: d.accent, color: C.lime } });
    }
  },
};

KINDS.reelsOutro = {
  name: 'Аутро',
  format: 'story',
  fields: [
    { key: 'text', type: 'text', label: 'Подпись', sample: 'Подписывайся: ' + HANDLE },
    optPhoto('Фоном под синей тонировкой'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    env.bgPhoto('photo', C.blue, 0.78);
    // логотип во всю ширину 720 px; с партнёрами раскладка уменьшается, чтобы влезть в 920
    let lh = 720 * 211 / 940;
    const lw0 = env.logoWidth(lh, 'onBlue');
    if (lw0 > 920) lh = lh * 920 / lw0;
    const lw = env.logoWidth(lh, 'onBlue');
    const st = S('onest', 600, 48, 1);
    const flagsH = env.flags.length ? 88 + 64 : 0;
    const total = lh + (d.text ? 64 + 48 : 0) + flagsH;
    let y = (H - total) / 2;
    env.logo((W - lw) / 2, y, lh, 'onBlue');
    y += lh + 64;
    if (d.text) { drawLine(ctx, d.text, (W - textWidth(ctx, d.text, st)) / 2, y, st, { color: C.white }); y += 48 + 64; }
    if (flagsH) env.drawFlags((W - flagsRowWidth(env.flags.length, 88)) / 2, y, 88);
  },
};

KINDS.highlight = {
  name: 'Обложка хайлайта',
  format: 'story',
  fields: [
    { key: 'icon', type: 'icon', label: 'Иконка', hint: 'Если выбраны флаги — вместо иконки встанет флаг', options: GLYPH_CHOICES, sample: 'book-open' },
    { key: 'label', type: 'text', label: 'Название хайлайта', hint: 'Не рисуется — только для имени файла', sample: 'Гайды' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    if (env.flags.length) {
      const n = env.flags.length;
      const size = n === 1 ? 460 : n === 2 ? 340 : 280;
      const fw = flagsRowWidth(n, size);
      env.drawFlags((W - fw) / 2, (H - size) / 2, size, 'left', { ring: 10, ringColor: C.blue });
      return;
    }
    drawGlyph(ctx, d.icon || 'book-open', (W - 400) / 2, (H - 400) / 2, 400, C.white);
  },
};

/* =============================================================== TELEGRAM */

/* Фон обложки — по рубрике. На Lime и Coral текст всегда Ink. Новости — светлые (Paper). */
const TG_THEMES = {
  news: { bg: C.paper, text: C.ink, pill: { bg: C.ink, color: C.white } },
  deadline: { bg: C.coral, text: C.ink, pill: { bg: C.ink, color: C.white } },
  uni: { bg: C.blue, text: C.white, pill: { bg: C.white, color: C.blue } },
  grants: { bg: C.lime, text: C.ink, pill: { bg: C.ink, color: C.white } },
  countries: { bg: C.sky, text: C.ink, pill: { bg: C.white, color: C.ink } },
  webinar: { bg: C.ink, text: C.white, pill: { border: C.bridgeLight, color: C.white, dot: C.coral } },
  stories: { bg: C.skyTint, text: C.ink, pill: { bg: C.blue, color: C.white } },
  guide: { bg: C.paper, text: C.ink, pill: { bg: C.mist, color: C.ink } },
  numbers: { bg: C.blue, text: C.white, pill: { bg: C.paper, color: C.ink } },
  resources: { bg: C.skyTint, text: C.ink, pill: { bg: C.mist, color: C.ink } },
  partner: { bg: C.white, text: C.ink, pill: { border: C.slate, color: C.slate } },
};
const TG_BG = {
  paper: C.paper, white: C.white, skyTint: C.skyTint, sky: C.sky,
  lime: C.lime, coral: C.coral, blue: C.blue, ink: C.ink,
};
const TG_BG_CHOICES = [
  ['auto', 'По рубрике'], ['paper', 'Paper'], ['white', 'Белый'], ['skyTint', 'Sky Tint'], ['sky', 'Sky'],
  ['lime', 'Lime'], ['coral', 'Coral'], ['blue', 'Bridge Blue'], ['ink', 'Ink'],
];

function tgTheme(rubric, bg) {
  const base = TG_THEMES[rubric] || TG_THEMES.news;
  if (!bg || bg === 'auto' || !TG_BG[bg]) return base;
  const dark = bg === 'blue' || bg === 'ink';
  let pill = rubricPillStyle(rubric, bg === 'blue' ? 'blue' : bg === 'ink' ? 'ink' : 'light');
  // плашка того же цвета, что фон, пропадёт — тогда Ink на светлом и белая на тёмном
  if (['sky', 'lime', 'coral'].includes(bg) || pill.bg === TG_BG[bg]) {
    pill = dark ? { bg: C.white, color: C.ink } : { bg: C.ink, color: C.white };
  }
  return { bg: TG_BG[bg], text: dark ? C.white : C.ink, pill, dark };
}

KINDS.tgCover = {
  name: 'Обложка поста',
  format: 'wide',
  tune: { title: 'Заголовок' },
  fields: [
    { key: 'rubric', type: 'select', label: 'Рубрика', options: RUBRIC_CHOICES, sample: 'deadline' },
    { key: 'bg', type: 'select', label: 'Фон', hint: '«По рубрике» — цвет из брендбука; можно выбрать другой из палитры', options: TG_BG_CHOICES, sample: 'auto' },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: 'До 2 строк. Логотип не ставим — он уже в аватаре', sample: 'Chevening: 14 дней' },
    optPhoto('Встанет в арку справа'),
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    const rubric = d.rubric || 'news';
    const th = tgTheme(rubric, d.bg);
    const dark = th.dark ?? (th.text === C.white);
    fillRect(ctx, 0, 0, W, H, th.bg);
    const hasPhoto = Boolean(env.media('photo'));
    if (hasPhoto) env.band('photo', W - 64 - 400, 64, 400, H - 64, { shape: 'arch' });
    const colW = hasPhoto ? W - 128 - 400 - 48 : 1152;
    const flags = env.flags.length ? env.flags : (d.flag ? [d.flag] : []);
    const pill = drawPill(ctx, 64, 64, RUBRICS[rubric].label, Object.assign({ size: 36, padX: 36, padY: 20, borderWidth: 4, dotSize: 20, flags, flagSize: 56, padFlag: 12 }, th.pill));
    wideCollab(env, pill.w, pill.h, colW, dark ? (th.bg === C.blue ? 'onBlue' : 'onDark') : 'main');
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 104, 1.05, -0.03)), colW);
    env.lines(title, 2, 'Заголовок');
    title.draw(ctx, 64, H - 64 - title.h, { color: th.text });
  },
};

/* ================================================================ YOUTUBE */

KINDS.ytWebinar = {
  name: 'Превью вебинара',
  format: 'wide',
  tune: { title: 'Заголовок' },
  fields: [
    { key: 'pill', type: 'text', label: 'Плашка', sample: 'Вебинар' },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: '3–5 слов', sample: 'Как поступить в McGill' },
    { key: 'sub', type: 'text', label: 'Подзаголовок', sample: 'с приёмной комиссией' },
    SPEAKER_COUNT,
    { key: 'photo', type: 'media', label: 'Спикер 1 · фото', hint: 'Встанет в арку справа' },
    { key: 'photo2', type: 'media', label: 'Спикер 2 · фото', showIf: d => Number(d.count || 1) >= 2 },
    { key: 'photo3', type: 'media', label: 'Спикер 3 · фото', showIf: d => Number(d.count || 1) >= 3 },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    const n = clampCount(d.count);
    const aw = n === 1 ? 420 : n === 2 ? 270 : 196;
    const ah = n === 1 ? H - 80 : n === 2 ? H - 120 : H - 190;
    const gap = n === 3 ? 14 : 16;
    const rightW = n * aw + (n - 1) * gap;
    const rx = n === 1 ? W - aw : W - 48 - rightW;
    ['photo', 'photo2', 'photo3'].slice(0, n).forEach((key, i) => {
      env.photo(key, rx + i * (aw + gap), H - ah, aw, ah, { shape: 'arch', placeholder: ['#8A909C', '#A7ACB6', 4, 32] });
    });
    const colW = rx - 64 - 48;
    const pill = env.pill(64, 64, 'webinar', 'blue', { text: d.pill || undefined, size: 32, weight: 700, padX: 28, padY: 16, dotSize: 16, gap: 14 });
    const below = wideCollab(env, pill.w, pill.h, colW, 'onBlue');
    const subY = H - 64 - 36;
    if (d.sub) drawLine(ctx, d.sub, 64, subY, S('onest', 600, 36, 1), { color: C.lime });
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, n === 1 ? 96 : n === 2 ? 88 : 80, 1.02, -0.03)), colW);
    env.lines(title, 3, 'Заголовок');
    const top = 64 + pill.h + below;
    const free = subY - top - title.h;
    env.minSpace(free, 24, 'Заголовок не помещается — 3–5 слов');
    title.draw(ctx, 64, top + Math.max(0, free) / 2, { color: C.white });
  },
};

KINDS.ytInterview = {
  name: 'Превью интервью',
  format: 'wide',
  tune: { title: 'Маршрут' },
  fields: [
    { key: 'photo', type: 'media', label: 'Фото героя', hint: 'Герой справа, слева место под текст' },
    { key: 'pill', type: 'text', label: 'Плашка', sample: 'Интервью' },
    { key: 'route', type: 'textarea', label: 'Маршрут', hint: 'Крупно, 2 строки', sample: 'Алматы\n→ MIT' },
    { key: 'hero', type: 'text', label: 'Герой', sample: 'Алия, 18 лет' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    env.photo('photo', 0, 0, W, H, { placeholder: ['#8A909C', '#A7ACB6', 4, 32] });
    fillHGradient(ctx, 0, 0, W, H, [[0, 'rgba(18,20,24,0.9)'], [1, 'rgba(18,20,24,0)']]);
    const pill = env.pill(64, 64, 'interview', 'photo', { text: d.pill, size: 32, weight: 700, padX: 28, padY: 16 });
    wideCollab(env, pill.w, pill.h, W - 128, 'monoWhite');
    const heroY = H - 64 - 40;
    if (d.hero) drawLine(ctx, d.hero, 64, heroY, S('onest', 600, 40, 1), { color: C.lime });
    const route = layoutText(ctx, d.route, env.t('title', S('unb', 600, 140, 0.95, -0.04)), 820);
    env.lines(route, 2, 'Маршрут');
    const top = 64 + pill.h;
    const free = heroY - top - route.h;
    env.minSpace(free, 16, 'Маршрут не помещается — сократи его');
    route.draw(ctx, 64, top + Math.max(0, free) / 2, { color: C.white });
  },
};

KINDS.ytLowerThird = {
  name: 'Плашка спикера',
  format: 'hd',
  fields: [
    { key: 'video', type: 'media', label: 'Кадр для примерки', video: true, hint: 'Без фона — экспорт PNG с прозрачностью для монтажа' },
    { key: 'name', type: 'text', label: 'Имя', sample: 'Имя Фамилия' },
    { key: 'role', type: 'text', label: 'Должность, вуз', sample: 'Admissions Officer, UCL' },
  ],
  transparentWhenEmpty: 'video',
  draw(ctx, d, env) {
    const { W, H } = env;
    if (env.media('video')) env.photo('video', 0, 0, W, H, { placeholder: HATCH_LIGHT });
    else if (!env.exporting) { checker(ctx, 0, 0, W, H, 60); env.slot('video', 0, 0, W, H); }
    else env.slot('video', 0, 0, W, H);
    const nst = S('onest', 700, 44, 1);
    const rst = S('onest', 400, 32, 1);
    const fw = env.flags.length ? flagsRowWidth(env.flags.length, 64) + 24 : 0;
    const tw = Math.max(textWidth(ctx, d.name, nst), textWidth(ctx, d.role, rst));
    const w = 20 + 34 + fw + tw + 34;
    const x = 96, y = 860, h = 120;
    ctx.save();
    rrPath(ctx, x, y, w, h, 20);
    ctx.clip();
    fillRect(ctx, x, y, w, h, C.white);
    fillRect(ctx, x, y, 20, h, C.blue);
    ctx.restore();
    if (fw) env.drawFlags(x + 20 + 34, y + (h - 64) / 2, 64);
    drawLine(ctx, d.name, x + 20 + 34 + fw, y + 18, nst, { color: C.ink });
    drawLine(ctx, d.role, x + 20 + 34 + fw, y + 18 + 44 + 8, rst, { color: C.slate });
  },
};

/* Флаги по желанию — во всех типах слайдов (кроме «Сравнения», где флаги и так главное). */
const FLAGS_FIELD = { key: 'flags', type: 'flags', label: 'Флаги — по желанию', max: 3, hint: 'До 3 стран: встанут в плашку рубрики или в свободный угол' };
for (const def of Object.values(KINDS)) {
  if (!def.noFlags) def.fields.push(FLAGS_FIELD);
}

/* ======================================================= подборка: разбор */

/* Иконка категории по ключевым словам названия. */
const CATEGORY_ICONS = [
  [/замет|конспект|запис/, 'note-pencil'],
  [/концентр|внимани|фокус|отвлек|продуктив/, 'target'],
  [/запомин|памят|повтор|карточк/, 'brain'],
  [/врем|тайм|трек|расписан/, 'timer'],
  [/язык|англ|перевод/, 'translate'],
  [/экзам|тест|ielts|toefl|sat/, 'exam'],
  [/финанс|бюджет|деньг|стоимост/, 'wallet'],
  [/стипенд|грант/, 'hand-coins'],
  [/вуз|универс|поступ/, 'graduation-cap'],
  [/книг|чтени|библиот|граммат|словар|лексик/, 'books'],
  [/подкаст|аудио|аудир|слуша/, 'headphones'],
  [/видео|курс|лекци/, 'video-camera'],
  [/приложени|сервис/, 'device-mobile'],
  [/код|програм/, 'code-simple'],
  [/эссе|письм|текст/, 'pen-nib'],
  [/карьер|работ|стаж/, 'briefcase'],
];
function iconForCategory(title) {
  const t = title.toLowerCase();
  const hit = CATEGORY_ICONS.find(([re]) => re.test(t));
  return hit ? hit[1] : 'star';
}

/* Эмодзи и маркеры в начале и конце строки — брендбук не смешивает эмодзи с иконками. */
function stripDecor(line) {
  return line
    .replace(/^[\s\p{Extended_Pictographic}\p{So}️‍•·*–—-]+/u, '')
    .replace(/[\s\p{Extended_Pictographic}️‍]+$/u, '')
    .trim();
}

/*
 * Разбирает текст поста-подборки: первая строка — заголовок (с числом в
 * начале), дальше категории и пункты «Название — описание». Пункты без
 * категории попадают в общую. Возвращает стартовые слайды для шаблона.
 */
function parseResourcePost(text) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const head = stripDecor(lines[0]);
  const m = head.match(/^(\d+)\s+(.+)$/);
  const cover = { number: m ? m[1] : '', title: m ? m[2] : head };
  const groups = [];
  let current = null;
  for (const raw of lines.slice(1)) {
    const clean = stripDecor(raw);
    if (!clean) continue;
    const item = clean.match(/^(.{1,60}?)\s+[—–-]\s+(.+)$/);
    const marked = /^\s*(💬|[-•—–*])/u.test(raw);
    if (item || marked) {
      if (!current) { current = { title: 'Что попробовать', items: [] }; groups.push(current); }
      current.items.push(item ? { name: item[1], text: item[2].replace(/^./, c => c.toUpperCase()) } : { name: clean, text: '' });
    } else {
      current = { title: clean, items: [] };
      groups.push(current);
    }
  }
  const slides = [{ kind: 'resCover', data: cover }];
  for (const g of groups) {
    if (!g.items.length) continue;
    // по 2 пункта на слайд, а если их нечётно больше — последний слайд с тремя
    for (let i = 0; i < g.items.length;) {
      const left = g.items.length - i;
      const take = left === 3 ? 3 : Math.min(2, left);
      slides.push({ kind: 'resGroup', data: { title: g.title, icon: iconForCategory(g.title), items: g.items.slice(i, i + take) } });
      i += take;
    }
  }
  slides.push({ kind: 'guideFinal', data: { title: 'Сохрани, чтобы вернуться к подборке' } });
  return slides.slice(0, 10);
}

const RESOURCES_SAMPLE = `8 приложений, которые помогут учиться продуктивнее 💎

📰 Для ведения заметок
💬 Obsidian — приложение для заметок, которое позволяет связывать записи между собой. Удобно, если вы работаете с большим количеством материалов и хотите выстроить собственную базу знаний.
💬 Joplin — заметки с поддержкой Markdown, вложений и синхронизации между устройствами. Подойдёт для тех, кто хочет хранить учебные материалы структурированно.

👤 Для концентрации внимания
💬 Cold Turkey — блокирует отвлекающие сайты и приложения на заданное время. Можно создавать собственные списки блокировки и устанавливать расписание.
💬 Session — таймер для фокусированной работы с возможностью разбивать учёбу на отдельные сессии и отслеживать время.

📼 Для запоминания информации
💬 RemNote — объединяет заметки и интервальные повторения. Можно превращать конспекты в карточки и повторять материал по системе spaced repetition.
💬 Mochi — приложение для создания карточек и заметок с интервальными повторениями. Подходит для изучения языков, терминов и подготовки к экзаменам.

☀️ Для отслеживания времени
💬 Toggl Track — позволяет отслеживать, сколько времени вы тратите на разные учебные задачи. Можно отдельно учитывать чтение, подготовку к экзаменам, языки и другие занятия.
💬 ActivityWatch — бесплатный инструмент с открытым исходным кодом, который автоматически отслеживает активность на компьютере и показывает статистику использования времени.`;

/* ============================================================ TEMPLATES */

/*
 * slides — стартовый набор: тип и (необязательно) свои примеры текста поверх
 * примеров из KINDS. allowed — какие типы слайдов можно добавить кнопкой
 * «+ слайд». rule/structure/volume — из «Правил для форматов» (Tone of Voice).
 * importer — если есть, в редакторе появляется «Вставить текст поста».
 */
const TEMPLATES = [
  {
    id: 'news', group: 'post', rubric: 'news', name: 'Новость',
    desc: 'Белый фон, плашка и дата, заголовок до 3 строк, фото, источник.',
    rule: 'Факт в первой строке, источник и дата обязательны',
    structure: 'Что случилось → кого касается → что делать',
    volume: '1–5 слайдов, до 600 знаков',
    slides: [
      { kind: 'newsCover' },
      { kind: 'textSlide' },
      { kind: 'textSlide', data: { title: 'Что делать', body: '- Проверь требования программы на сайте вуза\n- Подготовь документы до 15 января\n- Подай заявку через портал KU Leuven', bg: 'white' } },
    ],
    allowed: ['newsCover', 'textSlide', 'factsSlide'], max: 5,
  },
  {
    id: 'story', group: 'post', rubric: 'stories', name: 'История студента',
    desc: 'Портрет героя на обложке, дальше вопросы и ответы, цитата.',
    rule: 'Путь с трудностями, голос героя, цифры с его согласия',
    structure: 'Кто → откуда → куда → как → совет',
    volume: '8–10 слайдов, до 1500 знаков',
    slides: [
      { kind: 'storyCover' },
      { kind: 'storyInner', data: { question: 'С чего всё началось?', answer: 'В 10 классе я поняла, что хочу заниматься робототехникой, а сильные программы есть только в нескольких вузах США. Начала с IELTS и олимпиад.' } },
      { kind: 'storyInner' },
      { kind: 'storyInner', data: { question: 'Что изменила в эссе после отказов?', answer: 'Перестала перечислять достижения. Написала про один проект, который провалился, и что я из этого поняла.' } },
      { kind: 'quote', data: { quote: 'Два отказа научили меня писать эссе', name: 'Алия, 18', meta: 'MIT · Алматы' } },
      { kind: 'storyInner', data: { question: 'Твой совет тем, кто поступает сейчас?', answer: 'Начинай за год и подавайся в 8–12 вузов. Отказ — это итог конкурса, а не оценка тебя.' } },
    ],
    allowed: ['storyCover', 'storyInner', 'quote', 'textSlide'], max: 10,
  },
  {
    id: 'uni', group: 'post', rubric: 'uni', name: 'Профиль университета',
    desc: 'Bridge Blue, флаг, название и город, четыре факта в карточках.',
    rule: 'Каждая цифра с источником и датой',
    structure: 'Обложка → программы → требования → стипендии → жизнь',
    volume: '1–5 слайдов',
    slides: [
      { kind: 'uniCover' },
      { kind: 'factsSlide' },
      { kind: 'textSlide', data: { title: 'Стипендии', body: '- Entrance Scholarships — от 3 000 до 12 000 CAD, автоматически при поступлении\n- Major Entrance Scholarships — до 40 000 CAD за 4 года, нужна отдельная заявка\n\nИсточник: mcgill.ca, 09.2026' } },
    ],
    allowed: ['uniCover', 'factsSlide', 'textSlide'], max: 5,
  },
  {
    id: 'webinar', group: 'post', rubric: 'webinar', name: 'Анонс вебинара',
    desc: 'Ink, спикер в арке, тема, дата Lime и время по Астане, кнопка.',
    rule: 'Кто, из какого вуза, когда по Астане, как попасть',
    structure: 'Спикер → 3 темы → дата → регистрация',
    volume: 'За 7 дней, за 1 день, за 1 час',
    slides: [{ kind: 'webinar' }],
    allowed: ['webinar', 'textSlide'], max: 3,
  },
  {
    id: 'webinarMulti', group: 'post', rubric: 'webinar', name: 'Вебинар · 2–3 спикера',
    desc: 'Ink, спикеры в арках рядом, тема и три тезиса эфира, дата Lime.',
    rule: 'Кто, из какого вуза, когда по Астане, как попасть',
    structure: 'Спикеры → 3 темы → дата → регистрация',
    volume: 'За 7 дней, за 1 день, за 1 час',
    slides: [{
      kind: 'webinar',
      data: {
        count: '3',
        speaker: 'Имя Фамилия', role: 'Admissions Officer, University of Edinburgh',
        speaker2: 'Имя Фамилия', role2: 'Recruitment Manager CIS, McGill University',
        speaker3: 'Имя Фамилия', role3: 'Студентка KU Leuven, выпускница Болашак',
        topic: 'Магистратура в Европе и Канаде: как поступить',
        topics: [{ text: 'Требования и дедлайны на 2027 год' }, { text: 'Стипендии для студентов из Казахстана' }, { text: 'Ответы на вопросы в прямом эфире' }],
        date: '12 ноября', time: '19:00 по Астане',
      },
    }],
    allowed: ['webinar', 'textSlide'], max: 3,
  },
  {
    id: 'deadlines', group: 'post', rubric: 'deadline', name: 'Дедлайны и гранты',
    desc: 'Paper, плашки Coral и Lime, таблица сроков, ближайшая дата подсвечена.',
    rule: 'Спокойно и точно, без паники и восклицаний',
    structure: 'Программа → дата → осталось дней → что нужно',
    volume: '1–3 слайда',
    slides: [{ kind: 'deadlines' }],
    allowed: ['deadlines', 'textSlide'], max: 3,
  },
  {
    id: 'guide', group: 'post', rubric: 'guide', name: 'Гайд-карусель',
    desc: 'Обложка, шаги в арках, ошибки, чек-лист и финал «сохрани».',
    rule: 'Каждый шаг начинается с глагола, в конце чек-лист',
    structure: 'Обложка → шаги → ошибки → чек-лист → CTA',
    volume: '7–10 слайдов',
    slides: [
      { kind: 'guideCover' },
      { kind: 'guideStep' },
      { kind: 'guideStep', data: { title: 'Выбери одну историю и разверни её', body: 'Лучше одна ситуация с деталями, чем пять по строчке. Что произошло, что ты решил и что изменилось.' } },
      { kind: 'guideStep', data: { title: 'Свяжи историю с программой', body: 'Объясни, почему именно этот вуз и этот курс — со ссылкой на конкретные модули или лаборатории.' } },
      { kind: 'guideMistakes' },
      { kind: 'guideChecklist' },
      { kind: 'guideFinal' },
    ],
    allowed: ['guideCover', 'guideStep', 'guideMistakes', 'guideChecklist', 'guideFinal', 'textSlide'], max: 10,
  },
  {
    id: 'resources', group: 'post', rubric: 'resources', name: 'Подборка ресурсов',
    desc: 'Обложка с числом, категории с иконками, у каждого ресурса — название и описание.',
    rule: 'Каждый пункт: что это и кому пригодится, без рекламы и превосходных степеней',
    structure: 'Число и тема → категории по 2–3 ресурса → «сохрани»',
    volume: '5–10 слайдов',
    slides: parseResourcePost(RESOURCES_SAMPLE),
    importer: parseResourcePost,
    importHint: 'Вставь текст поста целиком: первая строка — заголовок с числом, дальше категории и пункты «Название — описание». Эмодзи уберутся сами, по 2 ресурса на слайд.',
    allowed: ['resCover', 'resGroup', 'textSlide', 'guideFinal'], max: 10,
  },
  {
    id: 'number', group: 'post', rubric: 'numbers', name: 'Цифры и факты',
    desc: 'Синий фон, крупное число Unbounded, пояснение до 2 строк, источник.',
    rule: 'Главная цифра — Unbounded, пояснение — одна строка Onest, источник обязателен',
    structure: 'Число → пояснение → источник',
    volume: '1–5 слайдов',
    slides: [{ kind: 'number' }],
    allowed: ['number', 'textSlide', 'factsSlide'], max: 5,
  },
  {
    id: 'compare', group: 'post', rubric: 'countries', name: 'Сравнение стран',
    desc: 'Белый фон, две колонки, флаги 120, одинаковые строки.',
    rule: 'Одинаковые строки в обеих колонках, валюта и год у каждой суммы',
    structure: 'Стоимость → язык → работа → виза',
    volume: '1–5 слайдов',
    slides: [{ kind: 'compare' }],
    allowed: ['compare', 'textSlide'], max: 5,
  },
  {
    id: 'quote', group: 'post', rubric: 'stories', name: 'Цитата героя',
    desc: 'Sky, синяя кавычка, цитата Unbounded до 5 строк, аватар и подпись.',
    rule: 'Голос героя, цитата с его согласия',
    structure: 'Цитата → кто сказал',
    volume: '1 слайд',
    slides: [{ kind: 'quote' }],
    allowed: ['quote'], max: 3,
  },
  {
    id: 'partner', group: 'post', rubric: 'partner', name: 'Партнёрский пост',
    desc: 'Пометка Slate, ко-брендинг, заголовок и фото вуза.',
    rule: 'Пометка в первой строке и на макете, без превосходных степеней',
    structure: 'Пометка → вуз → программа → условия → ссылка',
    volume: 'По брифу, до 8 слайдов',
    slides: [
      { kind: 'partnerCover' },
      { kind: 'factsSlide', data: { title: 'Условия', bg: 'white', rows: [{ label: 'Программы', value: 'MSc в 60+ направлениях' }, { label: 'Язык', value: 'IELTS 6.5–7.0' }, { label: 'Стоимость', value: 'от XX 000 £ в год' }, { label: 'Дедлайн', value: 'Зависит от программы' }] } },
    ],
    allowed: ['partnerCover', 'factsSlide', 'textSlide'], max: 8,
  },

  {
    id: 'storyAnnounce', group: 'stories', rubric: 'news', name: 'Анонс поста',
    desc: 'Синий, карточка нового поста, стрелка в ленту.',
    rule: 'Все элементы между 250 px сверху и 340 px снизу',
    structure: 'Заголовок → карточка поста → «Смотри в ленте»',
    volume: 'Серия до 10 Stories',
    slides: [{ kind: 'storyAnnounce' }],
    allowed: ['storyAnnounce', 'storyPoll', 'storyQuiz', 'storyCountdown', 'storyArticle'], max: 10,
  },
  {
    id: 'storyPoll', group: 'stories', rubric: 'news', name: 'Опрос',
    desc: 'Белый, вопрос Unbounded и два варианта-пилюли.',
    rule: 'Стикер-опрос ставится поверх, в зоне пилюль',
    structure: 'Вопрос → варианты',
    volume: 'Серия до 10 Stories',
    slides: [{ kind: 'storyPoll' }],
    allowed: ['storyAnnounce', 'storyPoll', 'storyQuiz', 'storyCountdown', 'storyArticle'], max: 10,
  },
  {
    id: 'storyQuiz', group: 'stories', rubric: 'news', name: 'Квиз',
    desc: 'Paper, плашка Lime, вопрос и три ответа.',
    rule: 'Правильный ответ отмечается стикером Instagram',
    structure: 'Плашка → вопрос → ответы',
    volume: 'Серия до 10 Stories',
    slides: [{ kind: 'storyQuiz' }],
    allowed: ['storyAnnounce', 'storyPoll', 'storyQuiz', 'storyCountdown', 'storyArticle'], max: 10,
  },
  {
    id: 'storyCountdown', group: 'stories', rubric: 'webinar', name: 'Обратный отсчёт',
    desc: 'Ink, цифра Lime 420, кнопка под стикер-напоминание.',
    rule: 'Спокойно и точно, без «успей» и восклицаний',
    structure: 'До чего → сколько осталось → напомнить',
    volume: 'Серия до 10 Stories',
    slides: [{ kind: 'storyCountdown' }],
    allowed: ['storyAnnounce', 'storyPoll', 'storyQuiz', 'storyCountdown', 'storyArticle'], max: 10,
  },
  {
    id: 'storyArticle', group: 'stories', rubric: 'news', name: 'Репост статьи',
    desc: 'Sky Tint, карточка статьи, кнопка под стикер-ссылку.',
    rule: 'Стикер-ссылка ставится поверх кнопки',
    structure: 'Надпись → карточка → кнопка',
    volume: 'Серия до 10 Stories',
    slides: [{ kind: 'storyArticle' }],
    allowed: ['storyAnnounce', 'storyPoll', 'storyQuiz', 'storyCountdown', 'storyArticle'], max: 10,
  },

  {
    id: 'reelsCover', group: 'reels', rubric: 'stories', name: 'Обложка Reels',
    desc: 'Кадр под синим 55%, плашка и заголовок в центральной зоне 1080×1440.',
    rule: 'Хук в первые 2 секунды, длина 20–45 с',
    structure: 'Плашка рубрики → заголовок',
    volume: '1 обложка',
    slides: [{ kind: 'reelsCover' }],
    allowed: ['reelsCover', 'reelsCaption', 'reelsOutro'], max: 5,
  },
  {
    id: 'reelsCaption', group: 'reels', rubric: 'stories', name: 'Титры и субтитры',
    desc: 'Плашка героя и субтитр на плашке Ink 85%, ключевое слово Lime.',
    rule: 'До 2 строк по 32 знака, нижний край плашки на 1450 px',
    structure: 'Имя героя → субтитр',
    volume: 'Кадр или PNG с прозрачностью',
    slides: [{ kind: 'reelsCaption' }],
    allowed: ['reelsCover', 'reelsCaption', 'reelsOutro'], max: 10,
  },
  {
    id: 'reelsOutro', group: 'reels', rubric: 'stories', name: 'Аутро Reels',
    desc: 'Синий фон, логотип и ник — 2 секунды в конце ролика.',
    rule: 'Логотип и ник 2 с в конце',
    structure: 'Логотип → подписка',
    volume: '1 кадр',
    slides: [{ kind: 'reelsOutro' }],
    allowed: ['reelsCover', 'reelsCaption', 'reelsOutro'], max: 3,
  },
  {
    id: 'highlight', group: 'reels', rubric: 'guide', name: 'Обложки хайлайтов',
    desc: 'Bridge Blue на весь кадр, белая иконка Phosphor Fill 400 px или флаг.',
    rule: 'Одна иконка на обложку, одинаковый стиль для всех',
    structure: 'Гайды · Вузы · Истории · Гранты · Вебинары · Страны',
    volume: 'Набор обложек',
    slides: [
      { kind: 'highlight' },
      { kind: 'highlight', data: { icon: 'graduation-cap', label: 'Вузы' } },
      { kind: 'highlight', data: { icon: 'chat-circle-text', label: 'Истории' } },
      { kind: 'highlight', data: { icon: 'hand-coins', label: 'Гранты' } },
      { kind: 'highlight', data: { icon: 'video-camera', label: 'Вебинары' } },
      { kind: 'highlight', data: { icon: 'globe-hemisphere-east', label: 'Страны' } },
    ],
    allowed: ['highlight'], max: 20,
  },

  {
    id: 'tgCover', group: 'telegram', rubric: 'deadline', name: 'Обложка поста Telegram',
    desc: 'Фон по цвету рубрики или свой из палитры, плашка слева сверху, заголовок Unbounded.',
    rule: 'Первая строка поста жирная, до 1024 знаков с обложкой',
    structure: 'Плашка → заголовок',
    volume: '1 обложка на пост',
    slides: [{ kind: 'tgCover' }],
    allowed: ['tgCover'], max: 10,
  },

  {
    id: 'ytWebinar', group: 'youtube', rubric: 'webinar', name: 'Превью вебинара',
    desc: 'Синий фон, 3–5 слов Unbounded 96, спикер в арке справа — до трёх спикеров.',
    rule: 'Название видео: «Тема | Вуз | edubridge», до 60 знаков',
    structure: 'Плашка → тема → подзаголовок',
    volume: '1 превью',
    slides: [{ kind: 'ytWebinar' }],
    allowed: ['ytWebinar', 'ytInterview'], max: 5,
  },
  {
    id: 'ytInterview', group: 'youtube', rubric: 'interview', name: 'Превью интервью',
    desc: 'Фото героя, градиент Ink слева, маршрут крупно.',
    rule: 'Название видео: «Тема | Вуз | edubridge», до 60 знаков',
    structure: 'Плашка → маршрут → герой',
    volume: '1 превью',
    slides: [{ kind: 'ytInterview' }],
    allowed: ['ytWebinar', 'ytInterview'], max: 5,
  },
  {
    id: 'ytLowerThird', group: 'youtube', rubric: 'webinar', name: 'Плашка спикера',
    desc: 'Титр 1920×1080: белая карточка с синей полосой, имя и должность.',
    rule: 'x 96, y 860, высота 120, появление 0,4 с слева',
    structure: 'Имя → должность',
    volume: 'PNG с прозрачностью',
    slides: [{ kind: 'ytLowerThird' }],
    allowed: ['ytLowerThird'], max: 10,
  },
];

const GROUPS = [
  ['post', 'Посты', 'Instagram · 1080×1350'],
  ['stories', 'Stories', 'Instagram · 1080×1920'],
  ['reels', 'Reels и хайлайты', 'Instagram · 1080×1920'],
  ['telegram', 'Telegram', '1280×720'],
  ['youtube', 'YouTube', '1280×720 и 1920×1080'],
];

/* Данные слайда по умолчанию: примеры из полей типа + свои примеры шаблона. */
function sampleData(kind, overrides = {}) {
  const def = KINDS[kind];
  const data = {};
  for (const f of def.fields) {
    if (f.type === 'media') continue;
    if (f.type === 'list' || f.type === 'flags') data[f.key] = JSON.parse(JSON.stringify(f.sample || []));
    else if (f.type === 'toggle') data[f.key] = f.sample ?? false;
    else data[f.key] = f.sample ?? '';
  }
  return Object.assign(data, JSON.parse(JSON.stringify(overrides)));
}

/* Ключи, которые остаются в «Пустом шаблоне»: это часть вёрстки, а не содержание. */
const KEEP_IN_EMPTY = ['pill', 'handle', 'swipe', 'cta', 'head', 'unit'];

/* Пустые данные — для «Пустого шаблона»: тексты пустые, настройки (фон, флаги, иконки) как в примере. */
function emptyData(kind, overrides = {}) {
  const def = KINDS[kind];
  const data = sampleData(kind, overrides);
  for (const f of def.fields) {
    if (f.type === 'text' || f.type === 'textarea') {
      if (!KEEP_IN_EMPTY.includes(f.key)) data[f.key] = '';
    } else if (f.type === 'list') {
      data[f.key] = data[f.key].map(() => {
        const copy = {};
        for (const sub of f.item) if (sub.type !== 'media') copy[sub.key] = sub.type === 'toggle' ? false : '';
        return copy;
      });
    }
  }
  return data;
}

function templateById(id) {
  return TEMPLATES.find(t => t.id === id) || null;
}
