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

  /* ---------- hero lattice（自组装点阵） ----------
     散点 → 逐层吸附到 3D 格点 → 保持 → 解散，16 秒一个循环。
     只有 100 个点和约 300 条键，每帧全量重画，开销可忽略。 */
  (function () {
    var canvas = document.getElementById('hero-lattice');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var NX = 5, NY = 5, NZ = 4, STEP = 112, CYCLE = 16000;
    var AMBER = '226,196,150';
    var ICE = '206,229,248';

    // 固定种子：每次刷新构图一致，避免"每次都长得不一样"
    var seed = 23;
    function rand() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    function idxOf(i, j, k) { return (i * NY + j) * NZ + k; }

    var nodes = [], maxOrder = 0;
    for (var i = 0; i < NX; i++) {
      for (var j = 0; j < NY; j++) {
        for (var k = 0; k < NZ; k++) {
          var th = rand() * Math.PI * 2;
          var ph = Math.acos(2 * rand() - 1);
          var rr = 165 + rand() * 195;
          var nd = {
            home: [(i - (NX - 1) / 2) * STEP, (j - (NY - 1) / 2) * STEP, (k - (NZ - 1) / 2) * STEP],
            away: [Math.sin(ph) * Math.cos(th) * rr, Math.sin(ph) * Math.sin(th) * rr * 0.82, Math.cos(ph) * rr],
            order: i + j + k + rand() * 0.5,
            phase: rand() * 6.283,
            gx: i, gy: j, gz: k
          };
          if (nd.order > maxOrder) maxOrder = nd.order;
          nodes.push(nd);
        }
      }
    }
    for (var n0 = 0; n0 < nodes.length; n0++) {
      nodes[n0].delay = (nodes[n0].order / maxOrder) * 0.45;
    }

    var W = 744, H = 744;
    function resize() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function project(x, y, z, rotY, rotX, scale) {
      var cy = Math.cos(rotY), sy = Math.sin(rotY);
      var X = x * cy - z * sy;
      var Z = x * sy + z * cy;
      var cx = Math.cos(rotX), sx = Math.sin(rotX);
      var Y = y * cx - Z * sx;
      Z = y * sx + Z * cx;
      var s = 1500 / (1500 + Z + 380);
      return { x: W / 2 + X * s * scale, y: H / 2 + Y * s * scale, s: s, z: Z };
    }

    function draw(now) {
      var t = calm ? 0.7 : (now % CYCLE) / CYCLE;
      var u;
      if (t < 0.12) u = 0;                                  // 漂移
      else if (t < 0.38) u = easeOut((t - 0.12) / 0.26);    // 吸附
      else if (t < 0.90) u = 1;                             // 保持（占一半以上时间）
      else u = 1 - easeInOut((t - 0.90) / 0.10);            // 解散

      var rotY = 0.42 + (calm ? 0 : now * 0.000055);
      var rotX = -0.30 + (calm ? 0 : Math.sin(now * 0.00019) * 0.05);
      var scale = W / 744;
      var drift = calm ? 0 : (1 - u) * 9;

      ctx.clearRect(0, 0, W, H);

      var pos = [];
      for (var n = 0; n < nodes.length; n++) {
        var nd = nodes[n];
        var p = clamp01((u - nd.delay) / (1 - nd.delay));
        var wob = Math.sin(now * 0.0009 + nd.phase) * drift;
        var x = nd.away[0] + (nd.home[0] - nd.away[0]) * p + wob;
        var y = nd.away[1] + (nd.home[1] - nd.away[1]) * p + wob * 0.6;
        var z = nd.away[2] + (nd.home[2] - nd.away[2]) * p;
        var pr = project(x, y, z, rotY, rotX, scale);
        pr.p = p;
        pos.push(pr);
      }

      // 键：两端都基本就位才出现
      ctx.lineWidth = 1.1;
      for (var a = 0; a < nodes.length; a++) {
        var A = pos[a];
        if (A.p < 0.55) continue;
        var gi = nodes[a].gx, gj = nodes[a].gy, gk = nodes[a].gz;
        var links = [];
        if (gi + 1 < NX) links.push(idxOf(gi + 1, gj, gk));
        if (gj + 1 < NY) links.push(idxOf(gi, gj + 1, gk));
        if (gk + 1 < NZ) links.push(idxOf(gi, gj, gk + 1));
        for (var b = 0; b < links.length; b++) {
          var B = pos[links[b]];
          if (B.p < 0.55) continue;
          var amt = Math.min(A.p, B.p);
          var alpha = (0.035 + Math.min(0.13, (A.s + B.s) * 0.04)) * amt;
          ctx.strokeStyle = 'rgba(158,196,230,' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(A.x, A.y);
          ctx.lineTo(B.x, B.y);
          ctx.stroke();
        }
      }

      // 未就位的点：只画一小段拖尾，暗示运动方向，不画成连线
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (var m = 0; m < nodes.length; m++) {
        var P = pos[m];
        if (P.p <= 0.02 || P.p >= 0.97) continue;
        var h = project(nodes[m].home[0], nodes[m].home[1], nodes[m].home[2], rotY, rotX, scale);
        var dx = h.x - P.x, dy = h.y - P.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 3) continue;
        var tail = Math.min(26, len * 0.42);
        ctx.strokeStyle = 'rgba(' + AMBER + ',' + (0.30 * (1 - P.p)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(P.x, P.y);
        ctx.lineTo(P.x + dx / len * tail, P.y + dy / len * tail);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';

      // 点：由远及近
      var order = [];
      for (var o = 0; o < pos.length; o++) order.push(o);
      order.sort(function (p1, p2) { return pos[p2].z - pos[p1].z; });

      for (var q = 0; q < order.length; q++) {
        var P2 = pos[order[q]];
        var r = Math.max(1.2, 5.0 * P2.s * scale);
        var settled = P2.p > 0.98;
        var tint = settled ? ICE : AMBER;
        // 近处的点亮一些、远处的暗一些，叠出体积感
        var depthF = 0.58 + 0.42 * clamp01((P2.s - 0.71) / 0.2);
        var base = (settled ? 1.0 : 0.34 + P2.p * 0.6) * depthF;

        var g = ctx.createRadialGradient(P2.x, P2.y, 0, P2.x, P2.y, r * 2.2);
        g.addColorStop(0, 'rgba(' + tint + ',' + (base * 0.95).toFixed(3) + ')');
        g.addColorStop(0.42, 'rgba(' + tint + ',' + (base * 0.28).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + tint + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(P2.x, P2.y, r * 2.2, 0, 6.2832);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,' + (settled ? 0.94 : 0.5 + P2.p * 0.4).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(P2.x, P2.y, r * 0.62, 0, 6.2832);
        ctx.fill();
      }
    }

    var raf = 0;
    function loop(now) {
      if (!document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    }

    resize();
    if (calm) {
      draw(0);                       // 静止画面：就位后的晶格
    } else {
      raf = requestAnimationFrame(loop);
    }

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        if (calm) draw(0);
      }, 150);
    });
  })();

  /* ---------- current year ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
