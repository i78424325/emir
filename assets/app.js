/* Е-МИР: витрина. Сайт работает и без скриптов, скрипт добавляет корзину и удобства. */
(function () {
'use strict';
/* ядро: адреса, хранилище, корзина, избранное, недавно смотрели, всплывашки */
var B = document.documentElement.getAttribute('data-base') || '';
var KEY = 'emir_cart', FKEY = 'emir_fav', RKEY = 'emir_recent';
var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
function ls(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function load() { return ls(KEY, []); }
function favs() { return ls(FKEY, []); }
function save(c) { lss(KEY, c); badge(true); }
function count() { return load().reduce(function (s, i) { return s + i.q; }, 0); }
function badge(bump) {
  var n = count(), f = favs().length;
  document.querySelectorAll('[data-cart-n]').forEach(function (b) {
    b.textContent = n || ''; b.setAttribute('data-n', n);
    if (bump && n) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  });
  document.querySelectorAll('[data-fav-n]').forEach(function (b) { b.textContent = f || ''; b.setAttribute('data-n', f); });
}
var toastT;
function toast(html, ms) {
  var t = document.querySelector('[data-toast]');
  if (!t) return;
  t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, ms || 2600);
}
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }
function parseItem(el, attr) { try { return JSON.parse(el.getAttribute(attr)); } catch (e) { return null; } }
function addItem(it, silent) {
  var c = load(), ex = c.filter(function (i) { return i.a === it.a; })[0];
  if (ex) ex.q = Math.min(9, ex.q + 1); else { it.q = 1; c.push(it); }
  save(c); buzz();
  if (!silent) toast('✓ ' + esc(it.n.length > 38 ? it.n.slice(0, 36) + '…' : it.n) + ' · <a href="' + B + '/cart/">В корзину</a>');
}
function pic(it, cls) {
  return it.i ? '<img src="' + esc(it.i) + '" alt="" loading="lazy"' + (cls ? ' class="' + cls + '"' : '') + '>' :
    '<span style="width:30px;height:60px;border-radius:9px;background:' + esc(it.h || '#C9D6EA') + ';display:block"></span>';
}

/* общее поведение: шапка, меню, шторки, промокод, избранное, «В корзину», отсчёт до конца акции */
(function () {
  var c = document.querySelector('[data-concept]');
  try { if (sessionStorage.getItem('emir_concept_x') && c) c.hidden = true; } catch (e) {}
  var x = document.querySelector('[data-concept-x]');
  if (x) x.addEventListener('click', function () { c.hidden = true; try { sessionStorage.setItem('emir_concept_x', '1'); } catch (e) {} });
})();
(function () {
  var top = document.querySelector('[data-top]');
  if (!top) return;
  var on = false;
  window.addEventListener('scroll', function () {
    var y = window.scrollY > 8;
    if (y !== on) { on = y; top.classList.toggle('sc', y); }
  }, {passive: true});
})();
(function () {
  var cb = document.querySelector('.catbtn'), mega = document.querySelector('.mega');
  if (!cb || !mega) return;
  cb.addEventListener('click', function () { var on = mega.classList.toggle('on'); cb.setAttribute('aria-expanded', on); });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.mega') && !e.target.closest('.catbtn')) { mega.classList.remove('on'); cb.setAttribute('aria-expanded', 'false'); }
  });
})();
// шторки: data-sheet-open="ключ" открывает <div data-sheet="ключ">
var bg = document.querySelector('[data-sheet-bg]');
function openSheet(k) {
  var s = document.querySelector('[data-sheet="' + k + '"]');
  if (!s) return;
  s.hidden = false; if (bg) bg.hidden = false; document.body.classList.add('lock');
  var f = s.querySelector('input:not([type=hidden])'); if (f && window.innerWidth > 900) f.focus();
}
function closeSheets() {
  document.querySelectorAll('[data-sheet]').forEach(function (s) { s.hidden = true; });
  if (bg) bg.hidden = true; document.body.classList.remove('lock');
}
document.addEventListener('click', function (e) {
  var o = e.target.closest('[data-sheet-open]');
  if (o) { e.preventDefault(); openSheet(o.getAttribute('data-sheet-open')); return; }
  if (e.target.closest('[data-sheet-x]') || e.target === bg) closeSheets();
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheets(); });
// копировать промокод — и сразу запомнить его для корзины
function copyCode(code, btn) {
  lss('emir_promo', code);
  var ok = function () {
    buzz(18); if (btn) btn.classList.add('ok');
    toast('Код <b>' + esc(code) + '</b> скопирован — применится в корзине сам');
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(ok, ok); else ok();
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-copy]');
  if (b) { e.preventDefault(); copyCode(b.getAttribute('data-copy'), b); }
});
// «В корзину»
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-add]');
  if (!b) return;
  e.preventDefault();
  var it = parseItem(b, 'data-add');
  if (!it) return;
  var then = b.getAttribute('data-then');
  addItem(it, !!then);
  if (then) { location.href = B + then; return; }
  if (b.classList.contains('add')) { b.classList.add('done'); setTimeout(function () { b.classList.remove('done'); }, 1200); }
  else if (b.classList.contains('btn')) {
    var t = b.innerHTML; b.textContent = 'В корзине ✓';
    setTimeout(function () { b.innerHTML = t; }, 1500);
  }
});
// избранное
function favSync() {
  var keys = favs().map(function (f) { return f.a; });
  document.querySelectorAll('[data-fav]').forEach(function (b) {
    var it = parseItem(b, 'data-fav');
    var on = it && keys.indexOf(it.a) >= 0;
    b.classList.toggle('on', !!on);
    var s = b.querySelector('span'); if (s) s.textContent = on ? 'В избранном' : 'В избранное';
  });
  badge();
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-fav]');
  if (!b) return;
  e.preventDefault();
  var it = parseItem(b, 'data-fav'); if (!it) return;
  var f = favs(), i = -1;
  f.forEach(function (x, k) { if (x.a === it.a) i = k; });
  if (i >= 0) { f.splice(i, 1); toast('Убрали из избранного'); }
  else { f.unshift(it); buzz(); toast('♥ В избранном · <a href="' + B + '/favorites/">Открыть</a>'); }
  lss(FKEY, f.slice(0, 60)); favSync();
});
// поделиться
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-share]');
  if (!b) return;
  var d = {title: document.title, url: location.href};
  if (navigator.share) navigator.share(d).catch(function () {});
  else if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { toast('Ссылка скопирована'); });
});
// отсчёт до конца акции: data-cd="2026-11-15T23:59:59+03:00"
(function () {
  var els = document.querySelectorAll('[data-cd]');
  if (!els.length) return;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function tick() {
    els.forEach(function (el) {
      var left = Date.parse(el.getAttribute('data-cd')) - Date.now();
      if (!(left > 0)) { el.hidden = true; document.querySelectorAll('[data-promo]').forEach(function (p) { p.hidden = true; }); return; }
      var s = Math.floor(left / 1000);
      var set = function (q, v) { var x = el.querySelector(q); if (x && x.textContent !== v) x.textContent = v; };
      set('[data-d]', String(Math.floor(s / 86400))); set('[data-h]', pad(Math.floor(s / 3600) % 24));
      set('[data-m]', pad(Math.floor(s / 60) % 60)); set('[data-s]', pad(s % 60));
    });
  }
  tick(); setInterval(tick, 1000);
})();
favSync();

/* поиск по каталогу */
var idx = null, loading = null, vocab = null;
function index() {
  if (idx) return Promise.resolve(idx);
  if (!loading) loading = fetch(B + '/assets/search.json').then(function (r) { return r.json(); }).then(function (d) { idx = d; return d; });
  return loading;
}
// как search.norm() на сервере
function norm(s) {
  return String(s).toLowerCase().replace(/ё/g, 'е')
    .replace(/(\d)\s*гб(?![а-я])/g, '$1gb').replace(/(\d)\s*тб(?![а-я])/g, '$1tb')
    .replace(/[^a-zа-я0-9+]+/g, ' ')
    .replace(/([a-zа-я])(?=\d)|(\d)(?=[a-zа-я])/g, '$1$2 ')
    .replace(/\s+/g, ' ').trim();
}
var EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`", RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
function swap(w) {   // «шзрщту» → «iphone», «ghbdtn» → «привет»
  return w.toLowerCase().split('').map(function (ch) {
    var i = RU.indexOf(ch); if (i >= 0) return EN[i];
    i = EN.indexOf(ch); return i >= 0 ? RU[i] : ch;
  }).join('');
}
var TR = {а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ъ: '', ь: ''};
function translit(w) { return w.split('').map(function (ch) { return ch in TR ? TR[ch] : ch; }).join(''); }

function words() {   // все слова каталога с частотой — для исправления опечаток
  if (vocab) return vocab;
  vocab = {};
  var add = function (t) { t.split(' ').forEach(function (w) { if (w.length > 2) vocab[w] = (vocab[w] || 0) + 1; }); };
  idx.c.forEach(function (c) { add(c[5]); });
  idx.v.forEach(function (v) { add(v[4]); });
  return vocab;
}
function dist(a, b, max) {   // расстояние Левенштейна с ранним выходом
  if (Math.abs(a.length - b.length) > max) return max + 1;
  var prev = [], cur, i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    cur = [i]; var best = i;
    for (j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
// Слово запроса -> варианты написания (каждый — список токенов).
function parse(q) {
  var voc = null;
  return q.split(/\s+/).filter(Boolean).map(function (raw) {
    var alts = [norm(raw), norm(swap(raw))];
    alts.push(translit(alts[0]), translit(alts[1]));
    alts = alts.filter(function (a, i) { return a && alts.indexOf(a) === i; });
    var known = alts.some(function (a) {
      return a.split(' ').every(function (t) {
        voc = voc || words();
        if (/^\d+$/.test(t) || t.length < 3) return true;
        for (var w in voc) if (w.indexOf(t) === 0) return true;
        return false;
      });
    });
    if (!known && alts[0].length >= 4 && alts[0].indexOf(' ') < 0) {
      var max = alts[0].length >= 8 ? 2 : 1, best = null, bd = max + 1;
      alts.forEach(function (a) {
        for (var w in voc) {
          var d = dist(a, w.slice(0, a.length + 1), max);
          if (d < bd || (d === bd && best && voc[w] > voc[best])) { bd = d; best = w; }
        }
      });
      if (best) alts.push(best);
    }
    return alts.map(function (a) { return a.split(' ').filter(Boolean); }).filter(function (a) { return a.length; });
  }).filter(function (w) { return w.length; });
}
function tok(t, text) {   // 3 — слово целиком, 2 — начало слова, 1 — часть слова
  if (text.indexOf(' ' + t + ' ') >= 0) return 3;
  if (/^\d+$/.test(t)) return 0;
  if (text.indexOf(' ' + t) >= 0) return 2;
  return t.length >= 4 && text.indexOf(t) >= 0 ? 1 : 0;
}
function wscore(alts, name, tags) {
  var best = 0;
  alts.forEach(function (toks) {
    var s = Infinity;
    toks.forEach(function (t) { s = Math.min(s, Math.max(tok(t, name), tok(t, tags) - 0.5)); });
    if (s > best) best = s;
  });
  return best;
}
function find(q, lim) {
  var ws = parse(q);
  if (!ws.length) return {list: [], loose: false};
  var run = function (miss) {
    var best = {};
    idx.v.forEach(function (v) {
      var c = idx.c[v[3]], name = ' ' + v[4] + ' ', tags = ' ' + c[5] + ' ', total = 0, missed = 0;
      for (var i = 0; i < ws.length; i++) {
        var s = wscore(ws[i], name, tags);
        if (!s && ++missed > miss) return;
        total += s;
      }
      if (c[3] === 'Аксессуары' || c[3] === 'Уценка') total -= 1.5;
      if (v[2]) total += 0.5;
      var b = best[v[3]];
      if (!b || total > b.s) best[v[3]] = {s: total, v: v, c: c, n: v[3]};
    });
    return Object.keys(best).map(function (k) { return best[k]; })
      .sort(function (a, b) { return b.s - a.s || (!a.v[2]) - (!b.v[2]) || b.c[6] - a.c[6] || (b.c[7] || 0) - (a.c[7] || 0) || a.n - b.n; });
  };
  var r = run(0), loose = false;
  if (!r.length && ws.length > 1) { r = run(1); loose = true; }
  return {list: r.slice(0, lim), loose: loose};
}

/* подсказки поиска и страница результатов (логика поиска — как на сайте МегаОпт: теги, раскладка, транслит, опечатки) */
var thumb = function (src, cls) { return src ? '<img src="' + src + '" alt="" loading="lazy" class="' + (cls || '') + '">' : ''; };
document.querySelectorAll('.search').forEach(function (box) {
  var inp = box.querySelector('input'), sug = box.querySelector('.suggest');
  if (!inp || !sug) return;
  var act = -1;
  inp.addEventListener('focus', index);
  inp.addEventListener('input', function () {
    var q = inp.value;
    if (q.trim().length < 2) { sug.classList.remove('on'); return; }
    index().then(function () {
      if (inp.value !== q) return;
      var r = find(q, 7).list;
      act = -1;
      var all = B + '/search/?q=' + encodeURIComponent(q);
      sug.innerHTML = r.map(function (x) {
        return '<a href="' + x.v[1] + '">' + (x.c[4] ? thumb(x.c[4], 'th') : '<i class="th"></i>') + '<span>' + esc(x.v[0]) + '</span><b>' + fmt(x.v[2]) + '</b></a>';
      }).join('') + '<a href="' + all + '"><span>' + (r.length ? 'Все результаты' : 'Ничего не нашли — показать похожие') + '</span><b>→</b></a>';
      sug.classList.add('on');
    });
  });
  inp.addEventListener('keydown', function (e) {
    var links = sug.querySelectorAll('a');
    if (!links.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      act = (act + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach(function (l, i) { l.classList.toggle('act', i === act); });
    } else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); location.href = links[act].href; }
    else if (e.key === 'Escape') sug.classList.remove('on');
  });
  document.addEventListener('click', function (e) { if (!box.contains(e.target)) sug.classList.remove('on'); });
});
var sr = document.getElementById('search-results');
if (sr) {
  var q0 = new URLSearchParams(location.search).get('q') || '';
  document.querySelectorAll('.search input').forEach(function (i) { i.value = q0; });
  var sh = document.getElementById('search-h');
  if (sh) sh.textContent = q0 ? 'Поиск: «' + q0 + '»' : 'Поиск';
  index().then(function () {
    var res = find(q0, 200), r = res.list;
    if (!r.length) { sr.innerHTML = '<p class="empty">Ничего не нашли. Попробуйте короче или напишите нам — подберём.</p>'; return; }
    if (sh) sh.textContent = (res.loose ? 'Похожие: «' : 'Поиск: «') + q0 + '» — ' + r.length;
    sr.innerHTML = r.map(function (x) {
      var v = x.v, c = x.c;
      return '<article class="pc"><div class="pic-w"><a class="pic" href="' + v[1] + '">' + thumb(c[4]) + '</a>' +
        '<a class="add" href="' + v[1] + '" aria-label="Открыть"><svg class="i" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></a></div>' +
        '<div class="pc-b"><a class="nm" href="' + v[1] + '">' + esc(v[0]) + '</a><span class="muted">' + esc(c[3]) + '</span>' +
        '<div class="pc-p"><span class="price">' + fmt(v[2]) + '</span></div></div></article>';
    }).join('');
  });
}

/* каталог: фильтры, сортировка, «только с ценой», «показать ещё» */
var grid = document.querySelector('.grid[data-list]');
if (grid) {
  var PAGE = 40, shown = PAGE;
  var cards = Array.prototype.slice.call(grid.children);
  cards.forEach(function (c, i) { c._i = i; });
  var sortSel = document.getElementById('sort'), onlyPriced = document.getElementById('priced'), more = document.querySelector('.more');
  var ff = document.querySelector('[data-filters]'), nores = document.querySelector('.nores');
  var num = function (v) { return +String(v || '').replace(/\D/g, '') || 0; };
  function wanted() {
    var w = {}, n = 0;
    if (!ff) return {w: w, n: 0, min: 0, max: 0};
    ff.querySelectorAll('input[type=checkbox]:checked').forEach(function (i) { (w[i.name] = w[i.name] || []).push(i.value); n++; });
    var min = ff.pmin ? num(ff.pmin.value) : 0, max = ff.pmax ? num(ff.pmax.value) : 0;
    return {w: w, n: n + (min ? 1 : 0) + (max ? 1 : 0), min: min, max: max};
  }
  function fits(c, f) {
    var p = +c.dataset.p || 0;
    if (onlyPriced && onlyPriced.checked && !p) return false;
    if ((f.min || f.max) && (!p || (f.min && p < f.min) || (f.max && p > f.max))) return false;
    for (var k in f.w) {
      var have = (c.getAttribute('data-' + k) || '').split('|');
      if (!f.w[k].some(function (v) { return have.indexOf(v) >= 0; })) return false;
    }
    return true;
  }
  function apply() {
    var list = cards.slice(), f = wanted();
    var s = sortSel ? sortSel.value : '';
    if (s === 'new') {
      list.sort(function (a, b) { return (b.dataset.new ? 1 : 0) - (a.dataset.new ? 1 : 0) || a._i - b._i; });
    } else if (s === 'az') {
      var nm = function (c) { var x = c.querySelector('.nm'); return x ? x.textContent.trim() : ''; };
      list.sort(function (a, b) { return nm(a).localeCompare(nm(b), 'ru', {numeric: true}); });
    } else if (s === 'asc' || s === 'desc') {
      list.sort(function (a, b) {
        var pa = +a.dataset.p || 0, pb = +b.dataset.p || 0;
        if (!pa) return 1; if (!pb) return -1;
        return s === 'asc' ? pa - pb : pb - pa;
      });
    }
    var n = 0;
    list.forEach(function (c) {
      grid.appendChild(c);
      var ok = fits(c, f);
      c.classList.toggle('hide', !ok || n >= shown);
      if (ok) n++;
    });
    if (more) more.style.display = n > shown ? '' : 'none';
    if (nores) nores.hidden = n > 0;
    document.querySelectorAll('[data-fn]').forEach(function (x) { x.textContent = n; });
    document.querySelectorAll('[data-fcount]').forEach(function (x) { x.textContent = f.n || ''; });
  }
  var again = function () { shown = PAGE; apply(); };
  if (sortSel) sortSel.addEventListener('change', again);
  if (onlyPriced) onlyPriced.addEventListener('change', again);
  if (more) more.addEventListener('click', function () { shown += PAGE * 2; apply(); });
  if (ff) {
    ff.addEventListener('change', again);
    ff.addEventListener('input', function (e) { if (e.target.name === 'pmin' || e.target.name === 'pmax') again(); });
    ff.addEventListener('reset', function () { setTimeout(again, 0); });
    ff.addEventListener('submit', function (e) { e.preventDefault(); });
    var close = function () { ff.classList.remove('on'); document.body.classList.remove('fopen'); };
    document.querySelectorAll('[data-fopen]').forEach(function (b) { b.addEventListener('click', function () { ff.classList.add('on'); document.body.classList.add('fopen'); }); });
    ff.querySelectorAll('[data-fclose]').forEach(function (b) { b.addEventListener('click', close); });
    document.querySelectorAll('[data-freset]').forEach(function (b) { b.addEventListener('click', function () { ff.reset(); if (onlyPriced) onlyPriced.checked = false; }); });
  }
  apply();
}


/* главная: слайдер баннеров, сторис, «вы смотрели» */
(function () {
  var hero = document.querySelector('[data-hero]');
  if (!hero) return;
  var track = hero.querySelector('[data-track]'), slides = track.children, dots = hero.querySelector('[data-dots]');
  if (!slides.length) return;
  var cur = 0, hold = 0;
  for (var i = 0; i < slides.length; i++) {
    var d = document.createElement('button');
    d.type = 'button'; d.setAttribute('aria-label', 'Баннер ' + (i + 1));
    (function (k) { d.addEventListener('click', function () { go(k); hold = Date.now(); }); })(i);
    dots.appendChild(d);
  }
  function mark() { Array.prototype.forEach.call(dots.children, function (d, k) { d.setAttribute('aria-current', k === cur ? 'true' : 'false'); }); }
  function go(k) { cur = (k + slides.length) % slides.length; track.scrollTo({left: slides[cur].offsetLeft - slides[0].offsetLeft, behavior: 'smooth'}); mark(); }
  var tm;
  track.addEventListener('scroll', function () {
    clearTimeout(tm);
    tm = setTimeout(function () { cur = Math.round(track.scrollLeft / Math.max(slides[0].offsetWidth, 1)); mark(); }, 60);
  }, {passive: true});
  ['pointerdown', 'touchstart', 'wheel'].forEach(function (t) { track.addEventListener(t, function () { hold = Date.now(); }, {passive: true}); });
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calm && slides.length > 1) setInterval(function () {
    if (Date.now() - hold > 9000 && !document.hidden && track.getBoundingClientRect().bottom > 0) go(cur + 1);
  }, 6500);
  mark();
})();

/* сторис: просмотр на весь экран, тап — дальше, свайп вниз — закрыть */
(function () {
  var data = document.getElementById('stories-data'), sv = document.querySelector('[data-sv]');
  if (!data || !sv) return;
  var S = JSON.parse(data.textContent), seen = ls('emir_seen', []);
  var ICO = {swap: '<path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/>',
    check: '<path d="M5 12l5 5 9-10"/>', percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    truck: '<rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v5h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'};
  var svg = function (b, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + b + '</svg>'; };
  document.querySelectorAll('[data-story]').forEach(function (b) { if (seen.indexOf(S[+b.dataset.story].t) >= 0) b.classList.add('seen'); });
  var si = 0, li = 0, t0 = 0, dur = 5000, paused = false, raf = null;
  function slideHtml(st, s) {
    var cta = function (t, u) { return '<a class="btn volt" href="' + esc(u) + '">' + esc(t) + '</a>'; };
    if (s.k === 'promo') return '<div class="sv-img"><img src="' + esc(s.i) + '" alt=""></div><span class="sv-k">' + esc(st.t) + ' · ' + esc(s.until) + '</span>' +
      '<div class="sv-h huge">' + esc(s.h) + '</div><p class="sv-p">' + esc(s.p) + '</p>' +
      '<button class="code" type="button" data-copy="' + esc(s.code) + '"><span>Код <b>' + esc(s.code) + '</b> — скопировать</span></button>' + cta('Выбрать технику', B + '/promo/');
    if (s.k === 'prod') return '<div class="sv-img wb"><img src="' + esc(s.i) + '" alt=""></div><span class="sv-k">' + esc(st.t) + '</span>' +
      '<div class="sv-h">' + esc(s.n) + '</div><div class="sv-price"><b>' + fmt(s.p) + '</b>' + (s.pp ? '<span>с кодом ' + fmt(s.pp) + '</span>' : '') + '</div>' + cta('Смотреть', s.u);
    return '<span class="sv-ic">' + svg(ICO[s.ic] || ICO.check, 38) + '</span><span class="sv-k">' + esc(st.t) + '</span><div class="sv-h">' + esc(s.h) + '</div>' +
      '<p class="sv-p">' + esc(s.p) + '</p>' + (s.cta ? cta(s.cta[0], s.cta[1]) : '');
  }
  function render() {
    var st = S[si], s = st.s[li];
    dur = s.k === 'info' ? 5500 : 4500;
    sv.innerHTML = '<div class="sv-in"><div class="sv-bars">' + st.s.map(function (_, k) { return '<i class="' + (k < li ? 'done' : '') + '"><b></b></i>'; }).join('') + '</div>' +
      '<div class="sv-head"><img src="' + esc(st.c) + '" alt=""><b>' + esc(st.t) + '</b><button class="sv-x" type="button" aria-label="Закрыть" data-sv-x>' + svg('<path d="M6 6l12 12M18 6L6 18"/>', 24) + '</button></div>' +
      '<button class="sv-tap sv-prev" type="button" aria-label="Назад" data-sv-prev></button><button class="sv-tap sv-next" type="button" aria-label="Дальше" data-sv-next></button>' +
      '<div class="sv-body">' + slideHtml(st, s) + '</div></div>';
    t0 = performance.now();
    if (seen.indexOf(st.t) < 0) { seen.push(st.t); lss('emir_seen', seen); var b = document.querySelector('[data-story="' + si + '"]'); if (b) b.classList.add('seen'); }
  }
  function step(now) {
    if (!sv.hidden) {
      if (paused) t0 += 16;
      var p = Math.min(1, (now - t0) / dur), bar = sv.querySelectorAll('.sv-bars i')[li];
      if (bar) bar.firstChild.style.width = (p * 100) + '%';
      if (p >= 1) next();
      raf = requestAnimationFrame(step);
    }
  }
  function open(i) { si = i; li = 0; sv.hidden = false; document.body.classList.add('lock'); render(); cancelAnimationFrame(raf); raf = requestAnimationFrame(step); }
  function close() { sv.hidden = true; document.body.classList.remove('lock'); cancelAnimationFrame(raf); }
  function next() { if (li < S[si].s.length - 1) li++; else if (si < S.length - 1) { si++; li = 0; } else { close(); return; } render(); }
  function prev() { if (li > 0) li--; else if (si > 0) { si--; li = 0; } render(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-story]');
    if (b) { open(+b.dataset.story); return; }
    if (sv.hidden) return;
    if (e.target.closest('[data-sv-x]')) close();
    else if (e.target.closest('[data-sv-next]')) next();
    else if (e.target.closest('[data-sv-prev]')) prev();
  });
  var y0 = null;
  sv.addEventListener('touchstart', function (e) { paused = true; y0 = e.touches[0].clientY; }, {passive: true});
  sv.addEventListener('touchend', function (e) { paused = false; if (y0 !== null && e.changedTouches[0].clientY - y0 > 90) close(); y0 = null; });
  sv.addEventListener('mousedown', function () { paused = true; });
  sv.addEventListener('mouseup', function () { paused = false; });
  document.addEventListener('keydown', function (e) {
    if (sv.hidden) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev();
  });
})();

/* «вы смотрели» — из истории просмотров в этом браузере */
(function () {
  var box = document.querySelector('[data-recent]');
  if (!box) return;
  var cur = document.querySelector('[data-product]'), me = cur ? parseItem(cur, 'data-product') : null;
  var list = ls(RKEY, []).filter(function (x) { return !me || x.a !== me.a; }).slice(0, 10);
  if (!list.length) return;
  box.querySelector('[data-recent-list]').innerHTML = list.map(function (it) {
    return '<article class="pc"><div class="pic-w"><a class="pic" href="' + esc(it.u) + '">' + pic(it) + '</a>' +
      '<button class="add" type="button" data-add=\'' + esc(JSON.stringify(it)) + '\' aria-label="В корзину"><svg class="i" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="pc-b"><a class="nm" href="' + esc(it.u) + '">' + esc(it.n) + '</a><div class="pc-p"><span class="price">' + fmt(it.p) + '</span></div></div></article>';
  }).join('');
  box.hidden = false;
})();

/* страница товара: галерея, история просмотров, нижняя панель, покупка в 1 клик */
document.querySelectorAll('[data-gal]').forEach(function (track) {
  var thumbs = track.parentNode.querySelectorAll('[data-g]');
  var mark = function (i) { thumbs.forEach(function (t, k) { t.classList.toggle('on', k === i); }); };
  thumbs.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault(); var i = +t.dataset.g;
      track.scrollTo({left: track.clientWidth * i, behavior: 'smooth'}); mark(i);
    });
  });
  var tm;
  track.addEventListener('scroll', function () {
    clearTimeout(tm); tm = setTimeout(function () { mark(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1))); }, 80);
  }, {passive: true});
});
(function () {
  var p = document.querySelector('[data-product]');
  if (!p) return;
  var it = parseItem(p, 'data-product');
  if (it) {
    var r = ls(RKEY, []).filter(function (x) { return x.a !== it.a; });
    r.unshift(it); lss(RKEY, r.slice(0, 16));
  }
  var buy = document.querySelector('.buy'), bar = document.querySelector('.buybar');
  if (buy && bar && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { bar.classList.toggle('on', !en.isIntersecting && en.boundingClientRect.top < 0); });
    }).observe(buy);
  }
})();
document.querySelectorAll('form[data-oneclick]').forEach(function (f) {
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = f.querySelector('.err'), phone = f.phone.value.replace(/\D/g, '');
    err.textContent = '';
    if (phone.length < 10) { err.textContent = 'Проверьте номер телефона'; f.phone.focus(); return; }
    var it = JSON.parse(f.item.value), no = 'Е-' + (1000 + Math.floor(Math.random() * 9000));
    var done = f.parentNode.querySelector('.oc-done');
    done.innerHTML = '<b>Заказ ' + no + ' принят</b><br>' + esc(it.n) + ' — ' + fmt(it.p) + '.<br>Менеджер позвонит на ' + esc(f.phone.value) +
      ', уточнит доставку и оплату.<br><span class="note">Демо: в рабочей версии заказ сразу приходит в Telegram-бот магазина.</span>';
    f.hidden = true; done.hidden = false; buzz(30);
  });
});

/* корзина: промокод недели, доставка, рассрочка, оформление (демо — без сервера и списания денег) */
var cartBox = document.getElementById('cart');
if (cartBox) (function () {
  var form = document.getElementById('order'), tpl = document.getElementById('row-tpl').innerHTML;
  var FREE = +cartBox.dataset.free || 0, MONTHS = +cartBox.dataset.months || 12;
  var PR = {}; try { PR = JSON.parse(cartBox.dataset.promo || '{}'); } catch (e) {}
  var applied = '';
  var saved = ls('emir_promo', '');
  if (saved && form.promo) { form.promo.value = String(saved); applied = String(saved); }
  function promoState(goods) {
    var code = String(applied || '').trim().toUpperCase();
    if (!code) return {d: 0, note: '', cls: ''};
    if (!PR.code || code !== String(PR.code).toUpperCase()) return {d: 0, note: 'Такого промокода нет', cls: 'bad'};
    if (Date.parse(PR.end) < Date.now()) return {d: 0, note: 'Акция закончилась', cls: 'bad'};
    if (goods < PR.min) return {d: 0, note: 'Код действует от ' + fmt(PR.min) + ' — добавьте ещё на ' + fmt(PR.min - goods), cls: 'bad'};
    return {d: PR.off, note: '✓ ' + PR.title + ': −' + fmt(PR.off), cls: 'ok'};
  }
  function render() {
    var c = load();
    document.getElementById('cart-empty').hidden = !!c.length;
    form.hidden = !c.length;
    if (!c.length) return;
    document.getElementById('cart-items').innerHTML = c.map(function (it, i) {
      return tpl.replace(/{i}/g, i).replace(/{u}/g, esc(it.u)).replace(/{n}/g, esc(it.n)).replace('{q}', it.q)
        .replace('{s}', fmt(it.p * it.q)).replace('{pic}', pic(it));
    }).join('');
    var goods = c.reduce(function (s, it) { return s + it.p * it.q; }, 0), n = c.reduce(function (s, it) { return s + it.q; }, 0);
    var pr = promoState(goods), way = form.way.value, del = 0, delT = 'бесплатно';
    if (way === 'courier') delT = FREE && goods - pr.d >= FREE ? 'бесплатно' : 'по тарифу курьера';
    else if (way === 'russia') delT = 'по тарифу СДЭК';
    var tot = goods - pr.d + del;
    document.getElementById('s-n').textContent = n;
    document.getElementById('s-goods').textContent = fmt(goods);
    document.getElementById('s-promo').hidden = !pr.d;
    document.getElementById('s-pc').textContent = pr.d ? String(PR.code) : '';
    document.getElementById('s-promo-v').textContent = '−' + fmt(pr.d);
    document.getElementById('s-del').textContent = delT;
    var note = document.getElementById('promo-note'); note.textContent = pr.note; note.className = 'promo-note ' + pr.cls;
    document.getElementById('s-tot').textContent = fmt(tot);
    document.getElementById('s-inst').textContent = tot >= 10000 ? 'или от ' + fmt(Math.ceil(tot / MONTHS / 10) * 10) + ' в месяц в рассрочку' : '';
    document.getElementById('addr').hidden = way === 'pickup';
    var fb = document.querySelector('[data-freebar]');
    if (fb && FREE && way === 'courier') {
      var left = FREE - (goods - pr.d);
      fb.hidden = false; fb.classList.toggle('full', left <= 0);
      fb.querySelector('.fb-t').innerHTML = left > 0 ? 'До бесплатной доставки по Москве — <b>' + fmt(left) + '</b>' : '✓ Доставка по Москве бесплатно';
      fb.querySelector('i').style.width = Math.min(100, (goods - pr.d) / FREE * 100) + '%';
    } else if (fb) fb.hidden = true;
  }
  cartBox.addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]');
    if (!b) return;
    var c = load(), i = +b.dataset.i, d = b.dataset.q;
    if (d === 'rm') c.splice(i, 1); else c[i].q = Math.max(1, Math.min(9, c[i].q + (+d)));
    save(c); buzz(8); render();
  });
  form.addEventListener('change', render);
  var ap = form.querySelector('[data-promo-apply]');
  if (ap) ap.addEventListener('click', function () { applied = form.promo.value; lss('emir_promo', applied); render(); });
  if (form.promo) form.promo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ap.click(); } });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('err'); err.textContent = '';
    var phone = form.phone.value.replace(/\D/g, '');
    if (!form.name.value.trim()) { err.textContent = 'Напишите, как к вам обращаться'; form.name.focus(); return; }
    if (phone.length < 10) { err.textContent = 'Проверьте номер телефона'; form.phone.focus(); return; }
    if (form.way.value !== 'pickup' && !form.address.value.trim()) { err.textContent = 'Укажите адрес доставки'; form.address.focus(); return; }
    var payT = {card: 'картой онлайн', sbp: 'по СБП', inst: 'в рассрочку', cash: 'при получении'}[form.pay.value];
    var no = 'Е-' + (1000 + Math.floor(Math.random() * 9000));
    document.getElementById('order-no').textContent = no;
    document.getElementById('done-t').textContent = 'Сумма ' + document.getElementById('s-tot').textContent + ', оплата ' + payT +
      '. Это демо-версия: деньги не списаны, заказ никуда не отправлен.';
    save([]); lss('emir_promo', '');
    form.hidden = true; document.getElementById('done').hidden = false; buzz(40);
    window.scrollTo(0, 0);
  });
  render();
})();

/* избранное */
var favBox = document.querySelector('[data-favs]');
if (favBox) (function () {
  function draw() {
    var f = favs();
    document.querySelector('[data-favs-empty]').hidden = !!f.length;
    favBox.innerHTML = f.map(function (it) {
      var j = esc(JSON.stringify(it));
      return '<article class="pc"><div class="pic-w"><a class="pic" href="' + esc(it.u) + '">' + pic(it) + '</a>' +
        '<button class="fav on" type="button" data-fav=\'' + j + '\' aria-label="Убрать из избранного"><svg class="i" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 20s-7.5-4.6-9.3-9.2C1.6 7.9 3.5 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.5 0 5.4 3.4 4.3 6.3C19.5 15.4 12 20 12 20z"/></svg></button>' +
        '<button class="add" type="button" data-add=\'' + j + '\' aria-label="В корзину"><svg class="i" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
        '<div class="pc-b"><a class="nm" href="' + esc(it.u) + '">' + esc(it.n) + '</a><div class="pc-p"><span class="price">' + fmt(it.p) + '</span></div></div></article>';
    }).join('');
  }
  draw();
  favBox.addEventListener('click', function (e) { if (e.target.closest('[data-fav]')) setTimeout(draw, 0); });
})();

/* заявки: трейд-ин и проверка по IMEI (демо — без сервера; в рабочей версии уходят в Telegram-бот магазина) */
var luhn = function (d) {
  var s = 0; for (var i = 0; i < d.length; i++) { var n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } s += n; }
  return s % 10 === 0;
};
document.querySelectorAll('form[data-req]').forEach(function (f) {
  var err = f.querySelector('.err'), res = f.querySelector('[data-res]');
  if (res && f.code) f.code.addEventListener('input', function () {
    var raw = f.code.value.replace(/[\s-]/g, ''), d = raw.replace(/\D/g, '');
    if (!raw) { res.hidden = true; return; }
    res.hidden = false;
    if (/^\d{15}$/.test(raw)) {
      var ok = luhn(d);
      res.className = 'chk-res ' + (ok ? 'ok' : 'bad');
      res.textContent = ok ? 'IMEI записан правильно — контрольная цифра сходится.' : 'Контрольная цифра IMEI не сходится — проверьте, нет ли опечатки.';
    } else if (/^[A-Za-z0-9]{8,14}$/.test(raw) && /[A-Za-z]/.test(raw)) { res.className = 'chk-res ok'; res.textContent = 'Похоже на серийный номер — проверим по нему.'; }
    else { res.className = 'chk-res'; res.textContent = 'IMEI — 15 цифр, серийный номер Apple — 10–12 букв и цифр.'; }
  });
  f.addEventListener('submit', function (ev) {
    ev.preventDefault(); if (err) err.textContent = '';
    if (f.agree && !f.agree.checked) { err.textContent = 'Нужно согласие на обработку данных'; return; }
    var ph = f.phone ? f.phone.value.replace(/\D/g, '') : '1234567890';
    if (f.phone && ph.length < 10 && !/@/.test(f.phone.value)) { err.textContent = 'Оставьте телефон, чтобы мы прислали ответ'; f.phone.focus(); return; }
    Array.prototype.forEach.call(f.querySelectorAll('label,.err,button,h2,[data-res]'), function (x) { x.hidden = true; });
    var done = f.querySelector('.req-done'); done.hidden = false; buzz(30);
  });
});

/* «Как работает система»: чат с ботом проигрывается, когда виден на экране */
(function () {
  var box = document.querySelector('[data-chat]'), data = document.getElementById('chat-data');
  if (!box || !data) return;
  var M = JSON.parse(data.textContent), timer = [], started = false;
  var wait = function (ms, fn) { timer.push(setTimeout(fn, ms)); };
  function scroll() { box.scrollTop = box.scrollHeight; }
  function add(html, cls) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; box.appendChild(d); scroll(); return d; }
  function show(i) {
    if (i >= M.length) return;
    var m = M[i];
    if (m.who === 'tap') {
      var kbs = box.querySelectorAll('.kb'), kb = kbs[kbs.length - 1];
      if (kb) kb.querySelectorAll('span').forEach(function (s) { if (s.textContent === m.t) s.classList.add('hit'); });
      return wait(700, function () { show(i + 1); });
    }
    var go = function () {
      var body = (m.fwd ? '<span class="fwd">Переслано от ' + esc(m.fwd) + '</span>' : '') +
        (m.h ? '<span class="mh">' + esc(m.h) + '</span>' : '') + esc(m.t || (m.rows || []).join('\n'));
      var el = add(body + (m.progress ? '<div class="pbar"><i></i></div>' : ''), 'msg ' + (m.who === 'in' ? 'in' : 'bot') + (m.card ? ' card' : '') + (m.order ? ' order' : ''));
      if (m.progress) setTimeout(function () { var b = el.querySelector('.pbar i'); if (b) b.style.width = '100%'; }, 60);
      if (m.btns) add(m.btns.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join(''), 'kb');
      wait(m.progress ? 2000 : (m.who === 'in' ? 900 : 1300), function () { show(i + 1); });
    };
    if (m.typing) { var t = add('<i></i><i></i><i></i>', 'typing'); wait(m.typing, function () { t.remove(); go(); }); } else go();
  }
  function start() { timer.forEach(clearTimeout); timer = []; box.innerHTML = ''; show(0); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting && !started) { started = true; start(); } }); }, {threshold: .35}).observe(box);
  } else start();
  var rp = document.querySelector('[data-chat-replay]');
  if (rp) rp.addEventListener('click', start);
})();
badge();

})();
