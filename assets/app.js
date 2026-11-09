/* МегаОпт Электроника: корзина, поиск, сортировка каталога, оформление заказа.
   Сайт работает и без скриптов (все товары и варианты — обычные ссылки); скрипт
   добавляет корзину и удобства. */
(function () {
  'use strict';
  var KEY = 'mo_cart';
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} badge(); }
  function count() { return load().reduce(function (s, i) { return s + i.q; }, 0); }
  function badge() {
    var n = count();
    document.querySelectorAll('[data-cart-n]').forEach(function (b) { b.textContent = n || ''; b.setAttribute('data-n', n); });
  }

  // --- «В корзину» ---
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    var it = JSON.parse(b.getAttribute('data-add'));
    var c = load();
    var ex = c.filter(function (i) { return i.a === it.a; })[0];
    if (ex) ex.q = Math.min(9, ex.q + 1); else { it.q = 1; c.push(it); }
    save(c);
    b.textContent = 'В корзине ✓';
    b.classList.add('ghost');
    b.setAttribute('aria-live', 'polite');
    setTimeout(function () { b.innerHTML = 'Перейти в корзину'; b.removeAttribute('data-add'); b.setAttribute('href', '/emir/cart/'); }, 700);
  });

  // --- меню каталога (компьютер) ---
  var cb = document.querySelector('.catbtn'), mega = document.querySelector('.mega');
  if (cb && mega) {
    cb.addEventListener('click', function () {
      var on = mega.classList.toggle('on');
      cb.setAttribute('aria-expanded', on);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.mega') && !e.target.closest('.catbtn')) { mega.classList.remove('on'); cb.setAttribute('aria-expanded', 'false'); }
    });
  }

  // --- поиск: скрытые теги, раскладка, транслит, опечатки ---
  // search.json: c — карточки [название, ссылка, цена, раздел, фото, теги, новинка],
  //              v — варианты [название, ссылка, цена, № карточки, текст]
  var idx = null, loading = null, vocab = null;
  function index() {
    if (idx) return Promise.resolve(idx);
    if (!loading) loading = fetch('/emir/assets/search.json').then(function (r) { return r.json(); }).then(function (d) { idx = d; return d; });
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
        var r = find(q, 8).list;
        act = -1;
        var all = '/emir/search/?q=' + encodeURIComponent(q);
        sug.innerHTML = r.map(function (x) {
          return '<a href="' + x.v[1] + '">' + (x.c[4] ? thumb(x.c[4], 'th') : '<i class="th"></i>') + '<span>' + esc(x.v[0]) + '</span><b>' + (x.v[2] ? fmt(x.v[2]) : 'по запросу') + '</b></a>';
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

  // --- страница поиска ---
  var sr = document.getElementById('search-results');
  if (sr) {
    var q = new URLSearchParams(location.search).get('q') || '';
    document.querySelectorAll('.search input').forEach(function (i) { i.value = q; });
    var h = document.getElementById('search-h');
    if (h) h.textContent = q ? 'Поиск: «' + q + '»' : 'Поиск';
    index().then(function () {
      var res = find(q, 200), r = res.list;
      if (!r.length) { sr.innerHTML = '<p class="empty">Ничего не нашли. Напишите нам в Телеграм — найдём у поставщиков.</p>'; return; }
      if (h) h.textContent = (res.loose ? 'Похожие товары: «' : 'Поиск: «') + q + '» — ' + r.length;
      sr.innerHTML = r.map(function (x) {
        var v = x.v, c = x.c;
        return '<article class="pc"><a class="pic" href="' + v[1] + '">' + thumb(c[4]) + '</a><a class="nm" href="' + v[1] + '">' + esc(v[0]) + '</a>' +
          '<span class="muted" style="font-size:13px">' + esc(c[3]) + '</span><div>' +
          (v[2] ? '<span class="price">' + fmt(v[2]) + '</span>' : '<span class="ask">Цена по запросу</span>') +
          '</div><a class="btn' + (v[2] ? '' : ' ghost') + '" href="' + v[1] + '">' + (v[2] ? 'Купить' : 'Узнать цену') + '</a></article>';
      }).join('');
    });
  }

  // --- каталог: фильтры, сортировка, «только с ценой», «показать ещё» ---
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

  // --- корзина и заказ ---
  var cartBox = document.getElementById('cart');
  if (cartBox) {
    var form = document.getElementById('order');
    var tpl = document.getElementById('row-tpl').innerHTML;
    var CARD_PCT = +cartBox.dataset.cardPct || 10;
    // промокод недели 11.11: −1 111 ₽ на заказ от 11 111 ₽, до 15.11 23:59 МСК
    var PROMO = {code: '1111', off: 1111, min: 11111, end: Date.parse('2026-11-15T23:59:59+03:00')};
    if (form.promo && !form.promo.value) { try { form.promo.value = localStorage.getItem('emir_promo') || ''; } catch (e) {} }
    if (form.promo) form.promo.addEventListener('input', function () { render(); });
    var cardPrice = function (it) { return it.c || Math.ceil(it.p * (1 + CARD_PCT / 100) / 100) * 100 - 10; };
    function render() {
      var c = load(), byCard = form.pay.value === 'card';
      if (!c.length) {
        document.getElementById('cart-full').hidden = true;
        document.getElementById('cart-empty').hidden = false;
        return;
      }
      document.getElementById('cart-items').innerHTML = c.map(function (it, i) {
        var unit = byCard ? cardPrice(it) : it.p;
        return tpl.replace(/{i}/g, i).replace(/{u}/g, esc(it.u)).replace(/{n}/g, esc(it.n))
          .replace('{q}', it.q).replace('{s}', fmt(unit * it.q)).replace('{pic}', it.i ? '<img src="' + esc(it.i) + '" alt="">' : '<span style="width:34px;height:66px;border-radius:9px;border:2px solid #1B1F2A;background:' + esc(it.h || '#C9D6EA') + ';display:block"></span>');
      }).join('');
      var goods = c.reduce(function (s, it) { return s + it.p * it.q; }, 0);
      var tot = c.reduce(function (s, it) { return s + (byCard ? cardPrice(it) : it.p) * it.q; }, 0);
      var code = form.promo ? form.promo.value.trim() : '', disc = 0, note = '';
      if (code) {
        if (code !== PROMO.code) note = 'Такого промокода нет';
        else if (Date.now() > PROMO.end) note = 'Акция 11.11 закончилась';
        else if (goods < PROMO.min) note = 'Код действует на заказ от ' + fmt(PROMO.min) + '. Добавьте товаров ещё на ' + fmt(PROMO.min - goods);
        else { disc = PROMO.off; note = 'Промокод применён: −' + fmt(PROMO.off); }
      }
      tot -= disc;
      var pn = document.getElementById('promo-note');
      if (pn) { pn.textContent = note; pn.classList.toggle('ok', disc > 0); }
      var sp = document.getElementById('s-promo');
      if (sp) { sp.hidden = !disc; document.getElementById('s-promo-v').textContent = '−' + fmt(disc); }
      var n = c.reduce(function (s, it) { return s + it.q; }, 0);
      document.getElementById('s-n').textContent = n;
      document.getElementById('s-goods').textContent = fmt(goods);
      document.getElementById('s-card').hidden = !byCard;
      document.getElementById('s-card-v').textContent = '+' + fmt(tot - goods);
      document.getElementById('s-del').textContent = form.way.value === 'courier' ? 'курьеру отдельно' : 'бесплатно';
      document.getElementById('s-tot').textContent = fmt(tot);
      document.getElementById('submit-tot').textContent = fmt(tot);
      document.getElementById('addr').hidden = form.way.value !== 'courier';
    }
    cartBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]');
      if (!b) return;
      var c = load(), i = +b.dataset.i, d = b.dataset.q;
      if (d === 'rm') c.splice(i, 1); else c[i].q = Math.max(1, Math.min(9, c[i].q + (+d)));
      save(c); render();
    });
    form.addEventListener('change', render);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = document.getElementById('err'), btn = form.querySelector('button[type=submit]');
      err.textContent = '';
      var phone = form.phone.value.replace(/[^\d+]/g, '');
      if (!form.name.value.trim()) { err.textContent = 'Напишите, как к вам обращаться'; form.name.focus(); return; }
      if (phone.replace(/\D/g, '').length < 10) { err.textContent = 'Проверьте номер телефона'; form.phone.focus(); return; }
      if (form.way.value === 'courier' && !form.address.value.trim()) { err.textContent = 'Укажите адрес доставки'; form.address.focus(); return; }
      if (!form.agree.checked) { err.textContent = 'Нужно согласие на обработку данных'; return; }
      btn.disabled = true;
      var body = {
        name: form.name.value.trim(), phone: form.phone.value.trim(), way: form.way.value, pay: form.pay.value,
        address: form.address.value.trim(), comment: form.comment.value.trim(), website: form.website.value,
        promo: form.promo ? form.promo.value.trim() : '',
        items: load().map(function (it) { return {a: it.a, q: it.q}; })
      };
      fetch('/emir/api/order', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
        .then(function (r) { return r.json().then(function (d) { return {ok: r.ok, d: d}; }); })
        .then(function (res) {
          if (!res.ok || !res.d.ok) throw new Error(res.d.error || 'Не получилось отправить заказ');
          save([]);
          document.getElementById('cart-full').hidden = true;
          document.getElementById('done').hidden = false;
          document.getElementById('order-no').textContent = res.d.number;
          window.scrollTo(0, 0);
        })
        .catch(function (x) {
          err.textContent = (x && x.message && x.message !== 'Failed to fetch' ? x.message : 'Нет связи с сайтом') +
            '. Позвоните или напишите нам — оформим вручную.';
          btn.disabled = false;
        });
    });
    render();
  }

  // --- отзыв о товаре: на модерацию владельцу ---
  var rf = document.querySelector('form[data-review]');
  if (rf) {
    rf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = rf.querySelector('[data-err]'), btn = rf.querySelector('button[type=submit]');
      var r = rf.querySelector('input[name=rating]:checked');
      var body = {article: rf.article.value, rating: r ? +r.value : 0, name: rf.name.value.trim(),
        pros: rf.pros.value.trim(), cons: rf.cons.value.trim(), text: rf.text.value.trim(), order: rf.order.value.trim()};
      err.hidden = true;
      btn.disabled = true;
      fetch('/emir/api/review', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
        .then(function (x) { return x.json().then(function (d) { return {ok: x.ok, d: d}; }); })
        .then(function (res) {
          if (!res.ok || !res.d.ok) throw new Error(res.d.error || 'Не получилось отправить');
          rf.hidden = true;
          rf.parentNode.querySelector('.rv-done').hidden = false;
        })
        .catch(function (x) {
          err.textContent = x && x.message && x.message !== 'Failed to fetch' ? x.message : 'Нет связи с сайтом';
          err.hidden = false;
          btn.disabled = false;
        });
    });
  }

  // --- главная: слайдер акций (неделя 11.11) и честный таймер до конца акции ---
  var hs = document.getElementById('hs-track'), sale = document.getElementById('sale');
  if (hs && sale) {
    var saleEnd = Date.parse(sale.dataset.end), dotsBox = document.querySelector('.hs-dots');
    var dropSale = function () { sale.remove(); if (dotsBox) dotsBox.remove(); };
    if (!(saleEnd > Date.now())) dropSale();
    else {
      var dots = dotsBox.querySelectorAll('button'), cur = 0, paused = false;
      var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      var tick = function () {
        var left = saleEnd - Date.now();
        if (left <= 0) { dropSale(); return false; }
        var d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60;
        sale.querySelector('[data-d]').textContent = d + ' д';
        sale.querySelector('[data-h]').textContent = pad(h) + ' ч';
        sale.querySelector('[data-m]').textContent = pad(m) + ' мин';
        return true;
      };
      var mark = function () {
        var w = hs.children[1] ? hs.children[1].offsetLeft - hs.children[0].offsetLeft : hs.clientWidth;
        cur = Math.round(hs.scrollLeft / w);
        dots.forEach(function (b, k) { b.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
      };
      var go = function (i) {
        var n = hs.children.length; cur = (i + n) % n;
        hs.scrollTo({left: hs.children[cur].offsetLeft - hs.children[0].offsetLeft, behavior: calm ? 'auto' : 'smooth'});
      };
      dots.forEach(function (b, k) { b.addEventListener('click', function () { go(k); }); });
      hs.addEventListener('scroll', function () { window.requestAnimationFrame(mark); }, {passive: true});
      ['pointerenter', 'focusin', 'touchstart'].forEach(function (t) { hs.addEventListener(t, function () { paused = true; }, {passive: true}); });
      ['pointerleave', 'focusout'].forEach(function (t) { hs.addEventListener(t, function () { paused = false; }); });
      if (tick()) {
        var clock = setInterval(function () { if (!tick()) clearInterval(clock); }, 20000);
        if (!calm) setInterval(function () { if (!paused && !document.hidden && document.getElementById('sale')) go(cur + 1); }, 7000);
      }
      var cb = sale.querySelector('[data-copy]');
      cb.addEventListener('click', function () {
        var code = cb.dataset.copy, lbl = cb.querySelector('[data-copied]');
        try { localStorage.setItem('emir_promo', code); } catch (e) {}
        var done = function (t) { lbl.textContent = t; setTimeout(function () { lbl.textContent = ''; }, 2200); };
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () { done('скопирован'); }, function () { done('код 1111'); });
        else done('код 1111');
      });
    }
  }

  badge();
})();
