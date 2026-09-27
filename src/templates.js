/*
 * Каталог шаблонов edubridge.
 *
 * KINDS — типы слайдов. У каждого: формат, поля формы (с примерами текста из
 * брендбука), роли для подстройки кегля и функция draw, которая рисует слайд
 * по макету брендбука. Все цифры (отступы, кегли, интерлиньяж, трекинг)
 * перенесены из макетов раздела 08 «Instagram» и 09 «Другие каналы» — не
 * дублируй их в app.js.
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

/* Иконки хайлайтов и рубрик — Phosphor Fill, раздел «Иконки». */
const GLYPH_CHOICES = [
  ['book-open', 'Гайды'], ['graduation-cap', 'Вузы'], ['chat-circle-text', 'Истории'],
  ['hand-coins', 'Гранты'], ['video-camera', 'Вебинары'], ['globe-hemisphere-east', 'Страны'],
  ['alarm', 'Дедлайны'], ['stamp', 'Виза'], ['translate', 'Язык'], ['files', 'Документы'],
  ['medal', 'Стипендии'], ['exam', 'Экзамены'], ['airplane-tilt', 'Переезд'], ['wallet', 'Стоимость'],
  ['newspaper', 'Новости'], ['question', 'Вопросы'], ['lightbulb', 'Советы'], ['users-three', 'Сообщество'],
  ['briefcase', 'Карьера'], ['chart-bar', 'Цифры'], ['calendar-blank', 'События'], ['map-pin', 'Города'],
  ['buildings', 'Кампус'], ['trophy', 'Олимпиады'], ['star', 'Избранное'], ['heart', 'Жизнь'],
  ['megaphone', 'Анонсы'], ['coins', 'Финансы'], ['clock', 'Сроки'], ['link', 'Ссылки'],
];

const RUBRIC_CHOICES = [
  ['news', 'Новости'], ['deadline', 'Дедлайн'], ['uni', 'Университеты'], ['grants', 'Гранты'],
  ['countries', 'Страны'], ['webinar', 'Вебинар'], ['stories', 'Истории'], ['guide', 'Гайд'],
  ['numbers', 'Цифры'], ['partner', 'Партнёрский материал'],
];

const HANDLE = '@edubridge.media';

/* Стиль текста: семейство ('onest' | 'unb'), вес, кегль, интерлиньяж, трекинг (em). */
function S(family, weight, size, lh = 1, track = 0) {
  return { family, weight, size, lh, track };
}

/* Строка «логотип слева — подпись справа» в нижней строке поста (высота 44). */
function footerRow(ctx, y, logoVariant, text, color, x = 80, w = 920) {
  drawLogo(ctx, x, y, 44, logoVariant);
  if (text) {
    const st = S('onest', 500, 30, 1);
    const tw = textWidth(ctx, text, st);
    drawLine(ctx, text, x + w - tw, y + 7, st, { color });
  }
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
          const aw = markerW;
          const ah = arcHeight(aw);
          // дуга стоит на средней линии первой строки
          drawArc(ctx2, x, cy + lineH / 2 - ah * 0.62, aw, markerColor);
          b.lt.draw(ctx2, x + indent, cy, { color });
        } else {
          b.lt.draw(ctx2, x, cy, { color });
        }
        cy += b.lt.h;
      });
    },
  };
}

/* Фоны, разрешённые для универсальных слайдов (текст, факты). */
const SURFACES = {
  paper: { bg: C.paper, text: C.ink, sub: C.slate, title: C.ink, marker: C.blue, line: C.ink, thin: C.mist, logo: 'main', surface: 'light', hatch: HATCH_LIGHT },
  white: { bg: C.white, text: C.ink, sub: C.slate, title: C.ink, marker: C.blue, line: C.ink, thin: C.mist, logo: 'main', surface: 'light', hatch: HATCH_LIGHT },
  skyTint: { bg: C.skyTint, text: C.ink, sub: C.slate, title: C.blue, marker: C.blue, line: C.ink, thin: C.sky, logo: 'main', surface: 'light', hatch: HATCH_LIGHT },
  blue: { bg: C.blue, text: C.white, sub: C.skyTint, title: C.white, marker: C.white, line: C.white, thin: 'rgba(255,255,255,0.35)', logo: 'onBlue', surface: 'blue', hatch: HATCH_DARK },
  ink: { bg: C.ink, text: C.white, sub: C.mistDark, title: C.white, marker: C.lime, line: C.white, thin: C.graphite, logo: 'onDark', surface: 'ink', hatch: HATCH_INK },
};
const SURFACE_CHOICES = [['paper', 'Paper'], ['white', 'Белый'], ['skyTint', 'Sky Tint'], ['blue', 'Bridge Blue'], ['ink', 'Ink']];

/* Верхняя строка универсального слайда: плашка рубрики слева, счётчик справа. Возвращает её высоту. */
function topRow(ctx, env, d, sf) {
  let h = 0;
  if (d.showPill !== false && env.rubric) {
    h = drawRubric(ctx, 80, 80, env.rubric, sf.surface, { text: d.pill || undefined }).h;
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

/* Нижняя строка универсального слайда: логотип и прогресс карусели. */
function bottomRow(ctx, env, sf) {
  const y = env.H - 80 - 44;
  drawLogo(ctx, 80, y, 44, sf.logo);
  if (env.total > 1) {
    const n = env.total;
    const segW = 40, gap = 10;
    const w = n * segW + (n - 1) * gap;
    drawProgress(ctx, 1000 - w, y + 18, w, n, env.index + 1,
      { segW, gap, h: 8, on: sf.surface === 'light' ? C.blue : C.white, off: sf.surface === 'light' ? C.mist : 'rgba(255,255,255,0.3)' });
  }
  return y;
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
    const pill = drawRubric(ctx, 80, y, 'news', 'light', { text: d.pill });
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
    footerRow(ctx, footY, 'main', d.source, C.slate);
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
    drawRubric(ctx, 80, 80, 'stories', 'photo', { text: d.pill });
    const counter = counterText(env);
    if (counter) {
      const st = S('onest', 500, 30, 1);
      drawLine(ctx, counter, 1000 - textWidth(ctx, counter, st), 80, st, { color: C.white });
    }
    const logoY = H - 80 - 44;
    drawLogo(ctx, 80, logoY, 44, 'monoWhite');
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.paper);
    env.photo('avatar', 80, 80, 96, 96, { shape: 'circle', placeholder: [C.mistDark, C.mist, 3, 18] });
    if (d.hero) drawLine(ctx, d.hero, 80 + 96 + 24, 80 + 32, S('onest', 600, 32, 1), { color: C.ink });
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
    env.fits(y, footY - 40, 'Ответ не помещается — сократи текст или уменьши кегль');
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.sky);
    drawLine(ctx, '«', 80, 80, S('unb', 600, 200, 0.6), { color: C.blue });
    const rowY = H - 80 - 120;
    env.photo('avatar', 80, rowY, 120, 120, { shape: 'circle', placeholder: ['#8A909C', '#A7ACB6', 3, 18] });
    const tx = 80 + 120 + 28;
    drawLine(ctx, d.name, tx, rowY + 22, S('onest', 700, 36, 1), { color: C.ink });
    drawLine(ctx, d.meta, tx, rowY + 22 + 36 + 10, S('onest', 500, 30, 1), { color: C.ink });
    const q = layoutText(ctx, d.quote, env.t('title', S('unb', 600, 70, 1.15, -0.03)), 920);
    env.lines(q, 5, 'Цитата');
    const top = 80 + 120;
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
    { key: 'flag', type: 'flag', label: 'Страна', sample: 'ca' },
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    const pm = rubricWidth(ctx, 'uni', 'blue', { text: d.pill });
    const rowH = 88;
    drawRubric(ctx, 80, 80 + (rowH - pm.h) / 2, 'uni', 'blue', { text: d.pill });
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
    const facts = (d.facts || []).slice(0, 4);
    facts.forEach((f, i) => {
      const cx = 80 + (i % 2) * (cw + 20);
      const cy = y + Math.floor(i / 2) * (ch + 20);
      const hot = i === 3;
      fillRR(ctx, cx, cy, cw, ch, 28, hot ? C.coral : C.white);
      drawLine(ctx, f.label, cx + 32, cy + 32, S('onest', 500, 28, 1), { color: hot ? C.ink : C.slate });
      const vst = fitSize(ctx, f.value || '', env.t('value', S('unb', 600, 56, 1)), cw - 64, 30);
      drawLine(ctx, f.value, cx + 32, cy + ch - 32 - vst.size, vst, { color: C.ink });
    });
    footerRow(ctx, footY, 'onBlue', d.source, C.white);
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
    env.fits(y, footY - 32, 'Строки не помещаются — убери строку или сократи текст');
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
    env.fits(y, footY - 40, 'Текст не помещается — сократи его или уменьши кегль');
  },
};

/* ---------------------------------------------------- Пост · Вебинар */
KINDS.webinar = {
  name: 'Анонс вебинара',
  format: 'post',
  tune: { title: 'Тема' },
  fields: [
    { key: 'photo', type: 'media', label: 'Фото спикера', hint: 'Поясной портрет — встанет в арку' },
    { key: 'speaker', type: 'text', label: 'Имя спикера', sample: 'Имя Фамилия' },
    { key: 'role', type: 'textarea', label: 'Должность, вуз', sample: 'Recruitment Manager CIS, McGill University' },
    { key: 'topic', type: 'textarea', label: 'Тема', hint: 'До 2 строк', sample: 'Стипендии McGill для иностранных студентов' },
    { key: 'date', type: 'text', label: 'Дата', sample: '24 октября' },
    { key: 'time', type: 'text', label: 'Время', hint: 'Всегда по Астане', sample: '19:00 по Астане' },
    { key: 'cta', type: 'text', label: 'Кнопка', sample: 'Ссылка в шапке' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.ink);
    const pill = drawRubric(ctx, 80, 80, 'webinar', 'ink');
    drawLogo(ctx, 1000 - logoWidth(44), 80 + (pill.h - 44) / 2, 44, 'onDark');
    const top = 80 + pill.h + 40;
    const rowH = 80 + 12 + 36;
    const rowY = H - 80 - rowH;
    drawLine(ctx, d.date, 80, rowY, S('unb', 600, 80, 1), { color: C.lime });
    drawLine(ctx, d.time, 80, rowY + 80 + 12, S('onest', 500, 36, 1), { color: C.white });
    if (d.cta) {
      const cm = pillMetrics(ctx, d.cta, { size: 30, weight: 700, padX: 36, padY: 24 });
      drawPill(ctx, 1000 - cm.w, rowY + rowH - cm.h, d.cta, { size: 30, weight: 700, padX: 36, padY: 24, bg: C.white, color: C.ink });
    }
    const topic = layoutText(ctx, d.topic, env.t('title', S('onest', 700, 52, 1.15)), 920);
    env.lines(topic, 2, 'Тема');
    const topicY = rowY - 40 - topic.h;
    topic.draw(ctx, 80, topicY, { color: C.white });
    const archH = topicY - 40 - top;
    env.minSpace(archH, 300, 'Фото спикера почти не видно — сократи тему');
    env.photo('photo', 80, top, 400, Math.max(0, archH), { shape: 'arch', placeholder: HATCH_INK });
    const colX = 80 + 400 + 40, colW = 1000 - colX;
    const role = layoutText(ctx, d.role, S('onest', 400, 32, 1.3), colW);
    const name = layoutText(ctx, d.speaker, S('onest', 700, 48, 1.1), colW);
    const colBottom = top + Math.max(0, archH);
    role.draw(ctx, colX, colBottom - role.h, { color: C.mistDark });
    name.draw(ctx, colX, colBottom - role.h - 20 - name.h, { color: C.white });
  },
};

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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.paper);
    let x = 80, pillH = 0;
    if (d.pills !== 'grants') { const p = drawRubric(ctx, x, 80, 'deadline', 'light'); x += p.w + 16; pillH = p.h; }
    if (d.pills !== 'deadline') { const p = drawRubric(ctx, x, 80, 'grants', 'light'); pillH = p.h; }
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
    env.fits(y, footY - 36, 'Строки не помещаются — оставь до 6 сроков или сократи названия');
    footerRow(ctx, footY, 'main', d.source, C.slate);
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.paper);
    const pill = drawRubric(ctx, 80, 80, 'guide', 'light', { text: d.pill });
    const footY = H - 80 - 44;
    drawLogo(ctx, 80, footY, 44, 'main');
    if (d.swipe) {
      const st = S('onest', 600, 32, 1);
      drawLine(ctx, d.swipe, 1000 - textWidth(ctx, d.swipe, st), footY + 6, st, { color: C.ink });
    }
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 104, 1.05, -0.03)), 920);
    env.lines(title, 4, 'Заголовок');
    const blockH = arcHeight(300) + 40 + title.h;
    const top = 80 + pill.h;
    const free = footY - top - blockH;
    env.minSpace(free, 40, 'Заголовок не помещается — сократи его');
    let y = top + Math.max(0, free) / 2;
    drawArc(ctx, 80, y, 300, C.blue);
    y += arcHeight(300) + 40;
    title.draw(ctx, 80, y, { color: C.ink });
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.white);
    fillRR(ctx, 80, 80, 240, 240, [120, 120, 0, 0], C.blue);
    const num = String(d.num || env.ordinal + 1);
    const nst = fitSize(ctx, num, S('unb', 600, 110, 1), 200, 60);
    const nw = textWidth(ctx, num, nst);
    drawLine(ctx, num, 80 + (240 - nw) / 2, 80 + 240 - 28 - nst.size, nst, { color: C.white });
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
    env.fits(y, barY - 48, 'Пояснение не помещается — сократи текст');
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.ink);
    let y = 80;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 88, 1.05, -0.03)), 920);
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
    env.fits(y, H - 80, 'Пункты не помещаются — оставь до 5 коротких');
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.skyTint);
    let y = 80;
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 88, 1.05, -0.03)), 920);
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
    env.fits(y, H - 80, 'Пункты не помещаются — оставь до 6 коротких');
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    drawArc(ctx, 80, 80, 360, C.white);
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    const pill = drawRubric(ctx, 80, 80, 'numbers', 'blue', { text: d.pill });
    const footY = H - 80 - 44;
    footerRow(ctx, footY, 'onBlue', d.source, C.white);
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
    drawLogo(ctx, 80, logoY, 44, 'main');
    env.fits(y, logoY - 40, 'Строки не помещаются — оставь до 4–5 коротких');
  },
};

/* ----------------------------------------------- Пост · Партнёрский */
KINDS.partnerCover = {
  name: 'Партнёрский пост',
  format: 'post',
  tune: { title: 'Заголовок' },
  fields: [
    { key: 'pill', type: 'text', label: 'Пометка', hint: 'Обязательна на каждом оплаченном посте', sample: 'Партнёрский материал' },
    { key: 'partnerLogo', type: 'media', label: 'Логотип партнёра', hint: 'Официальная монохромная версия, PNG/SVG на прозрачном фоне', fit: 'contain' },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: 'Без превосходных степеней, до 4 строк', sample: 'Магистратура в Эдинбурге для студентов из Центральной Азии' },
    { key: 'photo', type: 'media', label: 'Фото', video: true, hint: 'Фото от вуза-партнёра' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.white);
    const pill = drawRubric(ctx, 80, 80, 'partner', 'light', { text: d.pill });
    let y = 80 + pill.h + 40;
    const lw = drawLogo(ctx, 80, y + 14, 52, 'main');
    const dx = 80 + lw + 40;
    fillRect(ctx, dx, y, 3, 80, C.mistDark);
    env.photo('partnerLogo', dx + 3 + 40, y, 240, 80, { fit: 'contain', placeholder: [C.mist, C.white, 3, 16] });
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
    const head = layoutText(ctx, d.head, S('unb', 600, 96, 1.05, -0.03), 920);
    head.draw(ctx, 80, 250, { color: C.white });
    const ctaY = H - 340 - 48;
    drawLine(ctx, d.cta, 80, ctaY, S('onest', 600, 48, 1), { color: C.white });
    const title = layoutText(ctx, d.title, env.t('title', S('onest', 700, 56, 1.15)), 840);
    env.lines(title, 3, 'Название поста');
    const cardH = 40 + 420 + 28 + title.h + 40;
    const top = 250 + head.h;
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.white);
    const q = layoutText(ctx, d.question, env.t('title', S('unb', 600, 88, 1.1, -0.03)), 920);
    env.lines(q, 4, 'Вопрос');
    const opts = d.options || [];
    const optH = 52 + 88;
    const listH = opts.length ? opts.length * optH + (opts.length - 1) * 28 : 0;
    const total = q.h + (opts.length ? 64 : 0) + listH;
    const avail = H - 250 - 340;
    env.minSpace(avail - total, 0, 'Опрос не помещается в безопасную зону Stories');
    let y = 250 + Math.max(0, avail - total) / 2;
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.paper);
    const pillO = { size: 44, padX: 40, padY: 24 };
    const pm = rubricWidth(ctx, 'quiz', 'light', Object.assign({ text: d.pill }, pillO));
    const q = layoutText(ctx, d.question, env.t('title', S('unb', 600, 80, 1.12, -0.03)), 920);
    env.lines(q, 4, 'Вопрос');
    const ast = env.t('body', S('onest', 600, 48, 1.15));
    const answers = (d.answers || []).map((a, i) => layoutText(ctx, 'ABCD'[i] + ' · ' + (a.text || ''), ast, 920 - 80));
    const ansH = answers.reduce((s, a) => s + Math.max(a.h, ast.size) + 80, 0) + Math.max(0, answers.length - 1) * 24;
    const total = pm.h + 56 + q.h + 56 + ansH;
    const avail = H - 250 - 340;
    env.minSpace(avail - total, 0, 'Квиз не помещается в безопасную зону Stories');
    let y = 250 + Math.max(0, avail - total) / 2;
    drawRubric(ctx, 80, y, 'quiz', 'light', Object.assign({ text: d.pill }, pillO));
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.ink);
    const label = layoutText(ctx, d.label, S('onest', 600, 56, 1.2), 920);
    const nBase = env.t('number', S('unb', 600, 420, 0.9, -0.05));
    const nst = fitSize(ctx, d.number || '', nBase, 920, 160);
    const num = layoutText(ctx, d.number, nst, 920);
    const unitSt = S('unb', 600, 72, 1);
    const btnO = { size: 44, weight: 700, padX: 56, padY: 36, bg: C.white, color: C.ink };
    const bm = d.cta ? pillMetrics(ctx, d.cta, btnO) : { w: 0, h: 0 };
    const parts = [label.h, num.h, d.unit ? 72 : 0, bm.h].filter(Boolean);
    const total = parts.reduce((a, b) => a + b, 0) + (parts.length - 1) * 48;
    const avail = H - 250 - 340;
    env.minSpace(avail - total, 0, 'Не помещается в безопасную зону Stories');
    let y = 250 + Math.max(0, avail - total) / 2;
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
    const headSt = S('onest', 600, 48, 1);
    const title = layoutText(ctx, d.title, env.t('title', S('onest', 700, 60, 1.15)), 920 - 96);
    env.lines(title, 3, 'Заголовок статьи');
    const btnO = { size: 44, weight: 700, padX: 56, padY: 36, bg: C.blue, color: C.white };
    const bm = d.cta ? pillMetrics(ctx, d.cta, btnO) : { w: 0, h: 0 };
    const cardH = 560 + 48 + title.h + 48;
    const total = (d.head ? 48 + 48 : 0) + cardH + (d.cta ? 48 + bm.h : 0);
    const avail = H - 250 - 340;
    env.minSpace(avail - total, 0, 'Не помещается в безопасную зону Stories');
    let y = 250 + Math.max(0, avail - total) / 2;
    if (d.head) { drawLine(ctx, d.head, 80, y, headSt, { color: C.blue }); y += 48 + 48; }
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
    const pm = rubricWidth(ctx, rubric, 'blue', pillO);
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 120, 1.05, -0.03)), 920);
    env.lines(title, 5, 'Заголовок');
    const total = pm.h + 48 + title.h;
    env.minSpace(1440 - total, 0, 'Заголовок выходит за зону обложки 1080×1440');
    let y = 240 + Math.max(0, 1440 - total) / 2;
    drawRubric(ctx, 80, y, rubric, 'blue', pillO);
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
    if (d.name) {
      const o = { size: 44, weight: 700, padX: 32, padY: 20, color: C.ink };
      const pm = pillMetrics(ctx, d.name, o);
      fillRR(ctx, 80, 250, pm.w, pm.h, 20, C.white);
      drawPill(ctx, 80, 250, d.name, o);
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
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    const lh = 720 * 211 / 940;
    const st = S('onest', 600, 48, 1);
    const total = lh + (d.text ? 64 + 48 : 0);
    let y = (H - total) / 2;
    drawLogo(ctx, (W - 720) / 2, y, lh, 'onBlue');
    y += lh + 64;
    if (d.text) drawLine(ctx, d.text, (W - textWidth(ctx, d.text, st)) / 2, y, st, { color: C.white });
  },
};

KINDS.highlight = {
  name: 'Обложка хайлайта',
  format: 'story',
  fields: [
    { key: 'icon', type: 'icon', label: 'Иконка', options: GLYPH_CHOICES, sample: 'book-open' },
    { key: 'label', type: 'text', label: 'Название хайлайта', hint: 'Не рисуется — только для имени файла', sample: 'Гайды' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    drawGlyph(ctx, d.icon || 'book-open', (W - 400) / 2, (H - 400) / 2, 400, C.white);
  },
};

/* =============================================================== TELEGRAM */

/* Фон обложки — по рубрике. На Lime и Coral текст всегда Ink. */
const TG_THEMES = {
  news: { bg: C.ink, text: C.white, pill: { bg: C.white, color: C.ink } },
  deadline: { bg: C.coral, text: C.ink, pill: { bg: C.ink, color: C.white } },
  uni: { bg: C.blue, text: C.white, pill: { bg: C.white, color: C.blue } },
  grants: { bg: C.lime, text: C.ink, pill: { bg: C.ink, color: C.white } },
  countries: { bg: C.sky, text: C.ink, pill: { bg: C.white, color: C.ink } },
  webinar: { bg: C.ink, text: C.white, pill: { border: C.bridgeLight, color: C.white, dot: C.coral } },
  stories: { bg: C.skyTint, text: C.ink, pill: { bg: C.blue, color: C.white } },
  guide: { bg: C.paper, text: C.ink, pill: { bg: C.mist, color: C.ink } },
  numbers: { bg: C.blue, text: C.white, pill: { bg: C.paper, color: C.ink } },
  partner: { bg: C.white, text: C.ink, pill: { border: C.slate, color: C.slate } },
};

KINDS.tgCover = {
  name: 'Обложка поста',
  format: 'wide',
  tune: { title: 'Заголовок' },
  fields: [
    { key: 'rubric', type: 'select', label: 'Рубрика — задаёт цвет фона', options: RUBRIC_CHOICES, sample: 'deadline' },
    { key: 'flag', type: 'flag', label: 'Флаг в плашке', hint: 'Для рубрики «Страны»', optional: true },
    { key: 'title', type: 'textarea', label: 'Заголовок', hint: 'До 2 строк. Логотип не ставим — он уже в аватаре', sample: 'Chevening: 14 дней' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    const rubric = d.rubric || 'news';
    const th = TG_THEMES[rubric] || TG_THEMES.news;
    fillRect(ctx, 0, 0, W, H, th.bg);
    drawPill(ctx, 64, 64, RUBRICS[rubric].label, Object.assign({ size: 36, padX: 36, padY: 20, borderWidth: 4, dotSize: 20, flag: d.flag || null, flagSize: 56, padFlag: 12 }, th.pill));
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 104, 1.05, -0.03)), 1152);
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
    { key: 'photo', type: 'media', label: 'Фото спикера', hint: 'Встанет в арку справа' },
  ],
  draw(ctx, d, env) {
    const { W, H } = env;
    fillRect(ctx, 0, 0, W, H, C.blue);
    env.photo('photo', W - 420, 80, 420, H - 80, { shape: 'arch', placeholder: ['#8A909C', '#A7ACB6', 4, 32] });
    const colW = W - 420 - 128;
    const pill = drawPill(ctx, 64, 64, d.pill || 'Вебинар', { size: 32, weight: 700, padX: 28, padY: 16, bg: C.white, color: C.blue, dot: C.coral, dotSize: 16, gap: 14 });
    const subY = H - 64 - 36;
    if (d.sub) drawLine(ctx, d.sub, 64, subY, S('onest', 600, 36, 1), { color: C.lime });
    const title = layoutText(ctx, d.title, env.t('title', S('unb', 600, 96, 1.02, -0.03)), colW);
    env.lines(title, 3, 'Заголовок');
    const top = 64 + pill.h;
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
    const pill = drawRubric(ctx, 64, 64, 'interview', 'photo', { text: d.pill, size: 32, weight: 700, padX: 28, padY: 16 });
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
    const tw = Math.max(textWidth(ctx, d.name, nst), textWidth(ctx, d.role, rst));
    const w = 20 + 34 + tw + 34;
    const x = 96, y = 860, h = 120;
    ctx.save();
    rrPath(ctx, x, y, w, h, 20);
    ctx.clip();
    fillRect(ctx, x, y, w, h, C.white);
    fillRect(ctx, x, y, 20, h, C.blue);
    ctx.restore();
    drawLine(ctx, d.name, x + 20 + 34, y + 18, nst, { color: C.ink });
    drawLine(ctx, d.role, x + 20 + 34, y + 18 + 44 + 8, rst, { color: C.slate });
  },
};

/* ============================================================ TEMPLATES */

/*
 * slides — стартовый набор: тип и (необязательно) свои примеры текста поверх
 * примеров из KINDS. allowed — какие типы слайдов можно добавить кнопкой
 * «+ слайд». rule/structure/volume — из «Правил для форматов» (Tone of Voice).
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
    desc: 'Bridge Blue на весь кадр, белая иконка Phosphor Fill 400 px.',
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
    desc: 'Фон по цвету рубрики, плашка слева сверху, заголовок Unbounded.',
    rule: 'Первая строка поста жирная, до 1024 знаков с обложкой',
    structure: 'Плашка → заголовок',
    volume: '1 обложка на пост',
    slides: [{ kind: 'tgCover' }],
    allowed: ['tgCover'], max: 10,
  },

  {
    id: 'ytWebinar', group: 'youtube', rubric: 'webinar', name: 'Превью вебинара',
    desc: 'Синий фон, 3–5 слов Unbounded 96, спикер в арке справа.',
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
    if (f.type === 'list') data[f.key] = JSON.parse(JSON.stringify(f.sample || []));
    else if (f.type === 'toggle') data[f.key] = f.sample ?? false;
    else data[f.key] = f.sample ?? '';
  }
  return Object.assign(data, JSON.parse(JSON.stringify(overrides)));
}

/* Пустые данные — для «Пустого шаблона»: тексты пустые, настройки (фон, флаги, иконки) как в примере. */
function emptyData(kind, overrides = {}) {
  const def = KINDS[kind];
  const data = sampleData(kind, overrides);
  for (const f of def.fields) {
    if (f.type === 'text' || f.type === 'textarea') {
      // плашки, ник и подписи-кнопки — часть вёрстки, их оставляем
      if (!['pill', 'handle', 'swipe', 'cta', 'head', 'unit'].includes(f.key)) data[f.key] = '';
    } else if (f.type === 'list') {
      data[f.key] = data[f.key].map(item => {
        const copy = {};
        for (const sub of f.item) copy[sub.key] = sub.type === 'toggle' ? false : '';
        return copy;
      });
    }
  }
  return data;
}

function templateById(id) {
  return TEMPLATES.find(t => t.id === id) || null;
}
