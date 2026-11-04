// Rastreamento das páginas de venda -> painel-vsl (só observa: não muda nada na página).
(function () {
  if (window.__pvsl) return; window.__pvsl = 1;
  var E = 'https://painel-vsl.suporteselos.workers.dev/e';
  var qs = new URLSearchParams(location.search);
  if (qs.has('vsldebug')) return;                       // teste de pular o vídeo: não conta
  var host = location.hostname;
  var site = /estudio-videos/.test(host) ? 'estudio' : /renda-digital/.test(host) ? 'codigo' : /renda-conteudo/.test(host) ? 'conteudo' : host;
  if (host.split('.').length > 3) site = 'preview';      // <hash>.projeto.pages.dev
  if (qs.get('utm_source') === 'teste-monitor') site = 'teste';
  var path = location.pathname.replace(/index\.html$/, ''); if (!/\/$/.test(path)) path += '/';
  var ua = navigator.userAgent || '';
  var os = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : /Mobi/.test(ua) ? 'cel' : 'pc';
  var app = /Instagram/.test(ua) ? 'ig' : /FBAN|FBAV|FB_IAB/.test(ua) ? 'fb' : /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? 'tt' : /WhatsApp/.test(ua) ? 'wa' : 'web';
  var dev = os + '-' + app;
  var src = (qs.get('utm_source') || '') + '|' + (qs.get('utm_content') || qs.get('utm_campaign') || '');
  if (src === '|') { try { src = 'ref|' + (document.referrer ? new URL(document.referrer).hostname : 'direto'); } catch (e) { src = 'ref|?'; } }
  var sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  var q = [], sent = {}, caps = {}, prog = 0, t0 = Date.now();

  function ev(name, v, once) {
    v = v | 0;
    var k = name + ':' + v;
    if (once && sent[k]) return; sent[k] = 1;
    caps[name] = (caps[name] || 0) + 1; if (caps[name] > 12) return;
    q.push([name, v]);
  }
  function flush(final) {
    if (!q.length && !final) return;
    var body = JSON.stringify({ sid: sid, site: site, path: path, dev: dev, src: src, prog: prog, ua: ua.slice(0, 180), e: q.splice(0, 40) });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(E, body)) return;
    } catch (e) {}
    try { fetch(E, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' }); } catch (e) {}
  }
  var b10 = function (x) { return Math.min(100, Math.floor(x * 10) * 10); };
  var bs = function (s) { var c = [1, 2, 3, 5, 8, 13, 20, 30, 60]; for (var i = 0; i < c.length; i++) if (s < c[i]) return c[i]; return 99; };

  ev('view', 0, 1);
  if (document.readyState !== 'loading') ev('dcl', bs((Date.now() - t0) / 1000), 1);
  else document.addEventListener('DOMContentLoaded', function () { var n = performance.now ? performance.now() / 1000 : 0; ev('dcl', bs(n), 1); });

  // ----- VSL -----
  function pick() {
    var v = document.getElementById('vsl') || document.getElementById('film');
    if (v && v.tagName === 'VIDEO') return v;
    var all = document.getElementsByTagName('video');
    for (var i = 0; i < all.length; i++) if (all[i].duration >= 60) return all[i];
    return null;
  }
  var vid = null, playedOnce = false, metaOnce = false, waitAt = 0, soundFrom = -1;
  function hook(v) {
    if (!v || v.__pvsl) return; v.__pvsl = 1; vid = v;
    v.addEventListener('loadedmetadata', function () { if (metaOnce) ev('reload', b10(v.currentTime / (v.duration || 1))); metaOnce = true; });
    v.addEventListener('playing', function () {
      if (!playedOnce) { playedOnce = true; ev('play', 0, 1); ev('ttp', bs(performance.now() / 1000), 1); }
      if (waitAt) { var s = (Date.now() - waitAt) / 1000; waitAt = 0; if (s >= 1) ev('trava', b10(v.currentTime / (v.duration || 1))); }
    });
    v.addEventListener('waiting', function () { if (playedOnce && v.currentTime > 1) waitAt = Date.now(); });
    v.addEventListener('error', function () { var c = v.error ? v.error.code : 0; ev('erro', c); });
    v.addEventListener('volumechange', function () { if (!v.muted && v.volume > 0) { ev('som', 0, 1); if (soundFrom < 0) soundFrom = v.currentTime < 2 ? 0 : v.currentTime; } });
    v.addEventListener('pause', function () { if (playedOnce && !v.ended) ev('pausa', b10(v.currentTime / (v.duration || 1))); });
    v.addEventListener('ended', function () { if (v.currentTime >= (v.duration || 0) - 5) ev('fim', 0, 1); });
    if (v.readyState >= 1) metaOnce = true;
    if (!v.paused && v.readyState >= 3) { playedOnce = true; ev('play', 0, 1); ev('ttp', bs(performance.now() / 1000), 1); }   // script chegou com o vídeo já rodando
    v.addEventListener('timeupdate', function () {
      var d = v.duration; if (!(d > 0) || !isFinite(d) || v.seeking) return;
      var x = v.currentTime / d;
      if (x > prog / 100) prog = Math.min(100, Math.round(x * 100));
      ev('p', b10(x), 1);                                         // assistiu até X% (com ou sem som)
      if (!v.muted && soundFrom >= 0) ev('ps', Math.min(100, Math.floor(x * 20) * 5), 1);   // com som, a cada 5%
    });
  }
  hook(pick());
  if (!vid) { var tries = 0, iv = setInterval(function () { hook(pick()); if (vid || ++tries > 20) clearInterval(iv); }, 500); }

  // ----- botão de compra -----
  var BUY = 'a[href*="kiwify"], .js-checkout, [data-checkout]';
  function seen() {
    var els = document.querySelectorAll(BUY);
    if (!('IntersectionObserver' in window) || !els.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { ev('botao', vid ? b10(vid.currentTime / (vid.duration || 1)) : 0, 1); sent.botao = 1; } });
      if (sent.botao) io.disconnect();
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', seen); else seen();
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest(BUY);
    if (!a) return;
    ev('clique', vid && vid.duration ? b10(vid.currentTime / vid.duration) : 0, 1);
    flush();
  }, true);
  document.addEventListener('submit', function (e) { if (e.target && e.target.id === 'em-f') { ev('email', 0, 1); flush(); } }, true);

  // ----- envio -----
  var hb = 0;
  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    hb++;
    if (q.length) flush(); else if (hb % 2 === 0 && hb < 360) flush(true);   // sinal de "no site agora" a cada ~20 s (até 60 min)
  }, 10000);
  setTimeout(flush, 3000);
  var left = false;
  function leave() {
    if (left) return; left = true;
    ev('saiu', bs((Date.now() - t0) / 1000), 1);
    flush(true);
  }
  addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); else { left = false; flush(true); } });
})();
