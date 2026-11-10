/* AIE 2027 — interactions (no dependencies) */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header scroll state ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    header.addEventListener('click', function (e) {
      if (e.target.closest('.nav a')) {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- countdowns ---------- */
  var nodes = document.querySelectorAll('[data-deadline]');
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function tick() {
    var now = Date.now();
    nodes.forEach(function (el) {
      var target = Date.parse(el.getAttribute('data-deadline'));
      var out = el.querySelector('.deadline__count');
      var row = el.closest('.deadline');
      if (!out || isNaN(target)) return;
      var diff = target - now;
      if (diff <= 0) {
        out.textContent = el.getAttribute('data-past') || 'CLOSED';
        if (row) row.classList.add('is-past');
        return;
      }
      var d = Math.floor(diff / 864e5);
      var h = Math.floor((diff % 864e5) / 36e5);
      var m = Math.floor((diff % 36e5) / 6e4);
      out.textContent = d > 0 ? d + 'D ' + pad(h) + 'H ' + pad(m) + 'M' : pad(h) + 'H ' + pad(m) + 'M';
    });
  }
  if (nodes.length) { tick(); window.setInterval(tick, 30000); }

  /* ---------- program tabs ---------- */
  var tabs = document.querySelectorAll('[role="tab"]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var panelId = tab.getAttribute('aria-controls');
      tabs.forEach(function (t) {
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = true;
      });
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      var panel = document.getElementById(panelId);
      if (panel) panel.hidden = false;
    });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var list = Array.prototype.slice.call(tabs);
      var i = list.indexOf(tab);
      var next = e.key === 'ArrowRight' ? list[(i + 1) % list.length] : list[(i - 1 + list.length) % list.length];
      next.focus(); next.click();
    });
  });

  /* ---------- reveal on scroll ----------
     用一个 rAF 限流的 sweep 而不是 IntersectionObserver：
     IO 在快速滚动（End/Home、触控板一甩）时会漏掉整段元素，
     漏掉的元素会永久停在 opacity:0，看起来像页面缺了一块。 */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (revealables.length) {
    if (reduce) {
      revealables.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var pending = revealables;
      var ticking = false;
      var sweep = function () {
        ticking = false;
        var vh = window.innerHeight || document.documentElement.clientHeight;
        pending = pending.filter(function (el) {
          var r = el.getBoundingClientRect();
          // 只要顶端进入视口下沿就算出现；已被滚过头（top 为负）同样放行，
          // 否则 End/锚点跳转一次跨过多段时，被跳过的那几段会永久停在 opacity:0。
          if (r.top < vh * 0.94) { el.classList.add('is-in'); return false; }
          return true;
        });
        if (!pending.length) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
      };
      var onScroll = function () {
        if (!ticking) { ticking = true; requestAnimationFrame(sweep); }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      sweep();
    }
  }

  /* ---------- current year ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
