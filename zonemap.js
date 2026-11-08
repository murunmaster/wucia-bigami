/* ═════════ 구역도 — 강호도에서 지역·문파를 고르면 지도 아래에 그 구역도를 그립니다. 자료는 zones.js ═════════ */
(function () {
  var ZD = window.ZONES, GEO = window.WX_GEO, MAPD = window.WX_MAP;
  if (!ZD || !GEO || !MAPD) return;
  var PX = 136, PY = 96, BW = 120, BH = 52, PAD = 14;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function byId(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectName(id) { var s = byId(MAPD.sects, id); return s ? s.name : id; }
  function mapForSect(id) { return ZD.maps.filter(function (m) { return (m.sects || []).indexOf(id) >= 0; })[0]; }
  function mapForPlace(id) { return ZD.maps.filter(function (m) { return (m.places || []).indexOf(id) >= 0; })[0]; }

  /* 지역 공통 틀에 그 지역의 성도·명승·특별 지역 입구를 채운다 */
  function regionMap(P) {
    var own0 = byId(ZD.maps, "r-" + P.id); if (own0) return own0;
    var specials = ZD.maps.filter(function (m) { return m.prov === P.id; });
    var own = specials.filter(function (m) { return m.slot === "outer"; })[0];
    if (own) return own;
    var tpl = clone(byId(ZD.maps, P.outer ? "tpl-outer" : "tpl-province"));
    var Z = {}; tpl.zones.forEach(function (z) { Z[z.id] = z; });
    var reg = ZD.regions.filter(function (r) { return r[0] === P.name; })[0];
    if (!P.outer) {
      Z.sd.n = P.cap; Z.sd.t = "성도";
      var ms = reg && reg[3] !== "—" ? reg[3].split(/,\s*/) : [];
      Z.ms.home = 0; Z.ms.n = ms.length ? ms[0] + (ms.length > 1 ? " 외" : "") : "명승";
      Z.ms.t = "명승"; Z.ms.e = ms.length ? "명승 구역: " + ms.join(", ") + "." : "아직 정하지 않은 명승 칸.";
    } else { Z.sj.home = 0; }
    specials.forEach(function (m) {
      var z = Z[m.slot]; if (!z) return;
      var names = (m.sects || []).map(sectName).join("·");
      if (m.slot === "sd") z.n = m.name;
      z.t = "입구 · " + names; z.home = 1; z.go = "s:" + m.sects[0];
      z.e = (z.e ? z.e + " " : "") + names + "의 구역도(" + m.name + ")로 들어간다.";
    });
    tpl.name = P.name; tpl.han = P.han; tpl.region = true;
    tpl.where = P.outer ? "세외" : "명나라 지역";
    tpl.attach = "—";
    tpl.note = P.outer ? "세외 공통 틀. 관문은 중원 쪽 지역의 객잔과 이어진다." : "모든 지역이 같은 틀을 쓴다. 붉은 칸을 누르면 그 특별 지역 구역도로 들어간다.";
    return tpl;
  }

  function cen(z) { return [PAD + z.at[0] * PX + BW / 2, PAD + z.at[1] * PY + BH / 2]; }
  function edge(c, d, gap) {
    var dx = d[0] - c[0], dy = d[1] - c[1];
    var t = Math.min(dx ? (BW / 2 + gap) / Math.abs(dx) : Infinity, dy ? (BH / 2 + gap) / Math.abs(dy) : Infinity);
    return [c[0] + dx * t, c[1] + dy * t];
  }
  function goOf(m, z) {
    if (z.go) return z.go;
    if (z.out && m.prov && m.slot !== "outer" && !m.region) return "p:" + m.prov;
    return "";
  }
  function svgFor(m) {
    var Z = {}, mc = 0, mr = 0;
    m.zones.forEach(function (z) { Z[z.id] = z; mc = Math.max(mc, z.at[0]); mr = Math.max(mr, z.at[1]); });
    var W = PAD * 2 + mc * PX + BW, H = PAD * 2 + mr * PY + BH, mk = "zar-" + m.id;
    var lines = m.links.map(function (l) {
      var a = cen(Z[l[0]]), b = cen(Z[l[1]]), p = edge(a, b, 2), q = edge(b, a, l[2] === "one" ? 5 : 2);
      return '<line class="zl ' + l[2] + '" x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"' + (l[2] === "one" ? ' marker-end="url(#' + mk + ')"' : "") + "><title>" + esc(Z[l[0]].n + " — " + Z[l[1]].n + " · " + ZD.links[l[2]][0]) + "</title></line>";
    }).join("");
    var boxes = m.zones.map(function (z) {
      var x = PAD + z.at[0] * PX, y = PAD + z.at[1] * PY, cx = x + BW / 2, go = goOf(m, z);
      var cls = "zb" + (z.home ? " home" : "") + (z.out ? " out" : "") + (go ? " go" : "") + (z.dg ? " dg" : "");
      var inner = z.out
        ? '<text class="n" x="' + cx + '" y="' + (y + BH / 2) + '">' + esc(z.n) + "</text>"
        : '<text class="n" x="' + cx + '" y="' + (y + 19) + '">' + esc(z.n) + '</text><text class="t" x="' + cx + '" y="' + (y + 37) + '">' + esc(z.dg ? "던전 · " + z.dg : z.t) + "</text>";
      var attrs = z.out ? (go ? ' data-go="' + go + '" tabindex="0" role="link"' : "") : ' data-zm="' + esc(m.id) + '" data-zid="' + z.id + '" tabindex="0" role="button"';
      return '<g class="' + cls + (z.out ? "" : " pick") + '"' + attrs + '><title>' + esc(z.n + (z.e ? " — " + z.e : "")) + '</title><rect x="' + x + '" y="' + y + '" width="' + BW + '" height="' + BH + '" rx="5"/>' + inner + "</g>";
    }).join("");
    return '<svg class="zmap" viewBox="0 0 ' + W + " " + H + '" style="max-width:' + W + 'px" role="img" aria-label="' + esc(m.name + " 구역도") + '"><defs><marker id="' + mk + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="zah" d="M0 0L10 5L0 10z"/></marker></defs>' + lines + boxes + "</svg>";
  }
  function tableFor(m) {
    var Z = {}; m.zones.forEach(function (z) { Z[z.id] = z; });
    return '<table class="zt"><thead><tr><th>구역</th><th>성격</th><th>효과</th><th>연결</th></tr></thead><tbody>' +
      m.zones.filter(function (z) { return !z.out; }).map(function (z) {
        var con = m.links.filter(function (l) { return l[0] === z.id || l[1] === z.id; }).map(function (l) {
          var o = Z[l[0] === z.id ? l[1] : l[0]], k = ZD.links[l[2]][0];
          if (l[2] === "one") k = l[0] === z.id ? "일방, 나감" : "일방, 들어옴";
          return esc(o.n) + "(" + k + ")";
        }).join(", ");
        return '<tr><td class="nm' + (z.home ? " home" : "") + '">' + esc(z.n) + '</td><td class="tg">' + esc(z.t) + "</td><td>" + esc(z.e) + "</td><td class=\"cn\">" + con + "</td></tr>";
      }).join("") + "</tbody></table>";
  }
  function legend() {
    return '<ul class="zlegend">' + Object.keys(ZD.links).map(function (k) {
      return '<li title="' + esc(ZD.links[k][1]) + '"><svg width="30" height="10" viewBox="0 0 30 10" aria-hidden="true"><line class="zl ' + k + '" x1="1" y1="5" x2="29" y2="5"/></svg>' + ZD.links[k][0] + "</li>";
    }).join("") + '<li><span class="zsw home"></span>본거지·입구</li><li><span class="zsw out"></span>다른 지도</li></ul>';
  }

  function infoBlock(I) {
    if (!I) return "";
    var rows = [["역사", I.hist], ["자연지리", I.geo], ["특이 지형", I.terr], ["강호 설정", I.lore]].filter(function (r) { return r[1]; });
    return '<dl class="zinfo">' + rows.map(function (r) { return "<div><dt>" + r[0] + (r[0] === "강호 설정" ? ' <span class="hint">창작</span>' : "") + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") +
      (I.nb ? '<div><dt>이웃</dt><dd>' + esc(I.nb) + "</dd></div>" : "") + "</dl>";
  }
  function pick(kind, id) {
    if (kind === "s") return mapForSect(id);
    if (kind === "x") {
      var pm = mapForPlace(id); if (pm) return pm;
      var here = MAPD.sects.filter(function (s) { return s.place === id; });
      for (var i = 0; i < here.length; i++) { var m = mapForSect(here[i].id); if (m) return m; }
      return null;
    }
    if (kind === "p") { var P = byId(GEO.provinces, id); return P ? regionMap(P) : null; }
    return null;
  }

  function show(host, kind, id) {
    if (!host) return;
    var m = pick(kind, id);
    if (m) CACHE[m.id] = m;
    if (!m) { host.hidden = true; host.innerHTML = ""; return; }
    var names = (m.sects || []).map(sectName).join("·");
    host.innerHTML =
      '<div class="zhead"><div class="lbl">구역도 區域圖</div><h3>' + esc(m.name) + '<span class="han">' + esc(m.han) + "</span></h3>" +
      '<p class="zmeta">' + (names ? "<span>문파 <b>" + esc(names) + "</b></span>" : "") +
      (m.attach && m.attach !== "—" ? "<span>입구 <b>" + esc(m.attach) + "</b></span>" : "") +
      (m.shape && m.shape !== "공통" ? "<span>모양 <b>" + esc(m.shape) + "</b></span>" : "") + "</p>" +
      (m.note ? '<p class="hint">' + esc(m.note) + "</p>" : "") + infoBlock(m.info) + "</div>" +
      '<div class="zscroll">' + svgFor(m) + "</div>" + legend() +
      '<div class="zsel" aria-live="polite"><p class="hint">구역을 누르면 여기에 설명이 열립니다.</p></div>' +
      '<details class="zdetail"><summary>구역 효과와 연결 보기</summary><div class="zscroll">' + tableFor(m) + "</div></details>";
    host.hidden = false;
  }

  function bind(host) {
    if (!host || host.dataset.bound) return; host.dataset.bound = "1";
    function go(t) {
      var p = t.closest && t.closest("[data-zid]");
      if (p) {
        var box = host.querySelector(".zsel"); if (box) { box.innerHTML = card(p.dataset.zm, p.dataset.zid); }
        [].forEach.call(host.querySelectorAll(".zb.on"), function (x) { x.classList.remove("on"); }); p.classList.add("on");
        return true;
      }
      var g = t.closest && t.closest("[data-go]"); if (!g) return false; var v = g.dataset.go.split(":"); location.hash = "map-" + v[0] + "-" + v[1]; return true;
    }
    host.addEventListener("click", function (e) { go(e.target); });
    host.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && go(e.target)) e.preventDefault(); });
  }



  /* ── 구역 설명 카드 ── */
  var TAGDESC = {
    "객잔": "길손이 묵어 가고 소문이 오가는 관도변 객잔.", "시가": "사람과 물건이 몰리는 저잣거리.", "성도": "지역을 다스리는 관부가 있는 큰 고을.",
    "촌락": "논밭과 우물이 있는 작은 마을.", "수변": "배가 닿고 짐이 오르내리는 물가.", "산야": "인적 드문 산과 들. 길보다 짐승 길이 많다.",
    "관문": "길목을 막고 오가는 이를 살피는 관문.", "관청": "관리와 병졸이 지키는 관아.", "본거지": "문파의 본산. 소속이 아니면 오래 머물기 어렵다.",
    "사찰": "승려들이 머무는 절.", "도관": "도사들이 머무는 도관.", "사당": "옛 인물이나 신을 모신 사당.", "수상": "배를 타야 다닐 수 있는 물 위.",
    "석굴": "벼랑에 굴을 파고 불상을 새긴 곳.", "정상": "산꼭대기. 사방이 트여 있다.", "봉우리": "구름 위로 솟은 봉우리.", "협곡": "양쪽 벼랑 사이 좁은 골짜기.",
    "설산": "눈과 얼음이 덮인 높은 산.", "성채": "변경을 지키는 성.", "항구": "바닷배가 드나드는 항구.", "섬": "물로 둘러싸인 땅.", "동굴": "빛이 들지 않는 굴.",
    "폭포": "물이 쏟아져 내리는 벼랑.", "고개": "산을 넘는 고갯길.", "산악": "깊고 험한 산.", "도읍": "나라의 서울.", "도성": "나라의 서울.", "옛 도읍": "옛 왕조의 서울.",
    "성지": "신령하게 여겨지는 곳.", "사막": "물 없는 모래와 돌의 땅.", "잔도": "벼랑에 나무를 박아 건 길.", "벼랑길": "벼랑에 붙어 난 아슬아슬한 길.", "벼랑": "깎아지른 벼랑.",
    "연무장": "무공을 닦는 마당.", "누각": "경치를 내려다보는 높은 누각.", "명산": "이름난 산.", "고을": "관아가 있는 고을.", "산림": "하늘이 안 보일 만큼 짙은 숲.",
    "서원": "선비들이 글을 읽는 서원.", "감옥": "죄인을 가두는 옥.", "장원": "세가의 담장 두른 저택.", "산문": "산으로 드는 문.", "폐허": "무너진 옛 터.", "폐성": "버려진 성.",
    "황야": "끝없이 트인 거친 땅.", "옛 절": "버려진 지 오래된 절.", "탑": "높이 솟은 탑.", "능묘": "임금이나 귀인의 무덤.", "시장": "변경의 장터.", "운하": "사람이 판 물길.", "강": "배가 다니는 강."
  };
  function descOf(z) {
    if (z.d) return z.d;
    var t = String(z.t || "");
    if (t.indexOf("입구") === 0) return "다른 구역도로 들어가는 길목.";
    return TAGDESC[t] || TAGDESC[t.split("·")[0].trim()] || "";
  }
  var CACHE = {};
  /* GM 서고에서 이 구역에 둔 기보 (GM에게만 채워진다) */
  function gmNote(mapId, zid) {
    var f = window.WX_GM_AT; if (typeof f !== "function") return "";
    var list = f(mapId, zid) || []; if (!list.length) return "";
    return '<p class="zgm"><b>GM · 이곳의 기보</b> ' + list.map(esc).join(" · ") + "</p>";
  }
  function card(mapId, zid) {
    var m = CACHE[mapId] || byId(ZD.maps, mapId); if (!m) return "";
    var Z = {}; m.zones.forEach(function (z) { Z[z.id] = z; });
    var z = Z[zid]; if (!z) return "";
    var con = m.links.filter(function (l) { return l[0] === zid || l[1] === zid; }).map(function (l) {
      var o = Z[l[0] === zid ? l[1] : l[0]], k = ZD.links[l[2]][0];
      if (l[2] === "one") k = l[0] === zid ? "일방, 나감" : "일방, 들어옴";
      return esc(o.n) + ' <span class="hint">' + k + "</span>";
    });
    var ds = descOf(z), btn = "";
    if (z.go) { var v = z.go.split(":"); btn = '<a class="btn small" href="#map-' + v[0] + "-" + v[1] + '">' + (v[0] === "p" ? "그 지역으로" : "구역도 들어가기") + "</a>"; }
    return '<div class="zcard-in"><div class="lbl">구역 · ' + esc(m.name) + '</div><h4>' + esc(z.n) + (z.t ? ' <span class="zchip' + (z.home ? " home" : "") + '">' + esc(z.t) + "</span>" : "") + (z.dg ? ' <span class="zchip dg">던전 · ' + esc(z.dg) + "</span>" : "") + "</h4>" +
      (ds ? '<p class="zds">' + esc(ds) + "</p>" : "") + (z.e ? '<p class="zef"><b>효과</b> ' + esc(z.e) + "</p>" : "") +
      (con.length ? '<p class="zcn"><b>이어진 곳</b> ' + con.join(" · ") + "</p>" : "") + gmNote(mapId, zid) + (btn ? '<div class="mlinks">' + btn + "</div>" : "") + "</div>";
  }
  /* ── 전도 위에 얹는 지역 구역도 ── */
  function proj(at) { return [(at[0] - GEO.lon0) * GEO.c * GEO.k, (GEO.lat1 - at[1]) * GEO.k]; }
  function provName(id) { var p = byId(GEO.provinces, id); return p ? p.name : id; }
  function hubOf(pid, kind) {
    var ZG = window.ZONE_GEO, G = ZG.at["r-" + pid];
    if (G) { var k = kind === "nr" ? "nr" : (G.gj ? "gj" : "gm"); return G[k] || null; }
    return kind === "nr" ? null : (ZG.gate[pid] || null);
  }
  function layer(pid, mm) {
    var ZG = window.ZONE_GEO; if (!ZG) return null;
    var m = mm || byId(ZD.maps, "r-" + pid) || ZD.maps.filter(function (x) { return x.prov === pid && x.slot === "outer"; })[0];
    var G = m && ZG.at[m.id]; if (!G) return null;
    var hub = G.gj || G.gm || (ZG.hub && ZG.hub[m.id] && G[ZG.hub[m.id]]);
    var nodes = [], lines = [], has = {};
    m.zones.forEach(function (z) { if (G[z.id]) has[z.id] = 1; });
    function line(a, b, type, ghost) { var p = proj(a), q = proj(b); lines.push('<line class="zg ' + type + (ghost ? " ghost" : "") + '" x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'); }
    function node(at, z, cls) {
      var p = proj(at), w = Math.round(String(z.n).length * 11.6 + 14), go = z.go || "";
      var attrs = z.out || !z.id ? (go ? ' data-go="' + go + '" tabindex="0" role="link"' : "") : ' data-zm="' + esc(m.id) + '" data-zid="' + z.id + '" tabindex="0" role="button"';
      nodes.push('<g class="mk zn' + cls + '" data-x="' + p[0].toFixed(1) + '" data-y="' + p[1].toFixed(1) + '"' + attrs + '><title>' + esc(z.n + (z.t ? " · " + z.t : "") + (z.e ? " — " + z.e : "")) + '</title><rect x="' + (-w / 2) + '" y="-10" width="' + w + '" height="20" rx="4"/><text y="4" text-anchor="middle">' + esc(z.n) + "</text></g>");
    }
    m.links.forEach(function (l) { if (has[l[0]] && has[l[1]]) line(G[l[0]], G[l[1]], l[2] === "one" ? "road" : l[2]); });
    var explicit = {};
    m.zones.forEach(function (z) { if (has[z.id] && z.go && z.go.indexOf("p:") === 0) explicit[z.go.slice(2)] = 1; });
    var P = pid && byId(GEO.provinces, pid);
    if (P) {
    var bb = P.bbox, mg = 0.05 * Math.max(bb[2] - bb[0], bb[3] - bb[1]);
    var box = [bb[0] - mg, bb[1] - mg, bb[2] + mg, bb[3] + mg], ghosts = {};
    function edgePoint(h, t) {
      var dx = t[0] - h[0], dy = t[1] - h[1], s = Infinity;
      if (dx > 0) s = Math.min(s, (box[2] - h[0]) / dx); if (dx < 0) s = Math.min(s, (box[0] - h[0]) / dx);
      if (dy > 0) s = Math.min(s, (box[3] - h[1]) / dy); if (dy < 0) s = Math.min(s, (box[1] - h[1]) / dy);
      if (!isFinite(s) || s > 1) s = 1;
      return [h[0] + dx * s, h[1] + dy * s];
    }
    function ghost(nb, fromAt, type) {
      var NP = byId(GEO.provinces, nb); if (!NP) return;
      var h = proj(fromAt), c = [(NP.bbox[0] + NP.bbox[2]) / 2, (NP.bbox[1] + NP.bbox[3]) / 2];
      if (!ghosts[nb]) { ghosts[nb] = edgePoint(proj(hub || fromAt), c); }
      var g = ghosts[nb];
      lines.push('<line class="zg ' + type + ' ghost" x1="' + h[0].toFixed(1) + '" y1="' + h[1].toFixed(1) + '" x2="' + g[0].toFixed(1) + '" y2="' + g[1].toFixed(1) + '"/>');
    }
    var from = hub;
    (ZG.land[pid] || []).forEach(function (nb) { if (!explicit[nb] && from) ghost(nb, from, "road"); });
    ZG.water.forEach(function (w) {
      var nb = w[0] === pid ? w[1] : w[1] === pid ? w[0] : null;
      if (nb && G.nr && byId(ZD.maps, "r-" + nb) && (ZG.at["r-" + nb] || {}).nr) ghost(nb, G.nr, "water");
    });
    Object.keys(ghosts).forEach(function (nb) {
      var g = ghosts[nb], name = provName(nb), w = Math.round(name.length * 11.6 + 14);
      nodes.push('<g class="mk zn ghost" data-x="' + g[0].toFixed(1) + '" data-y="' + g[1].toFixed(1) + '" data-go="p:' + nb + '" tabindex="0" role="link"><title>' + esc(name + " — 이웃 지역. 누르면 그 지역 구역도로 간다.") + '</title><rect x="' + (-w / 2) + '" y="-10" width="' + w + '" height="20" rx="4"/><text y="4" text-anchor="middle">' + esc(name) + "</text></g>");
    });
    }
    m.zones.forEach(function (z) { if (has[z.id]) node(G[z.id], z, (z.home ? " home" : "") + (z.out ? " ghost" : "") + (z.id === "sd" ? " cap" : "") + (z.dg ? " dg" : "")); });
    var pts = m.zones.filter(function (z) { return has[z.id]; }).map(function (z) { return proj(G[z.id]); });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var bw = Math.max(x1 - x0, 60), bh = Math.max(y1 - y0, 40), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    CACHE[m.id] = m;
    return { lines: lines.join(""), nodes: nodes.join(""), box: { x: cx - bw * 0.68, y: cy - bh * 0.72, w: bw * 1.36, h: bh * 1.44 } };
  }
  /* 지역(p)은 그 지역 지도를, 문파(s)·장소(x)는 전도 위 자리가 정해진 세외 지도만 얹는다 */
  function layerFor(kind, id) {
    if (kind === "p") return layer(id);
    var m = kind === "s" ? mapForSect(id) : kind === "x" ? mapForPlace(id) : null;
    if (!m || !window.ZONE_GEO || !window.ZONE_GEO.at[m.id]) return null;
    return layer(m.prov && byId(GEO.provinces, m.prov) && m.slot === "outer" ? m.prov : null, m);
  }
  window.WXZ = {
    hasSect: function (id) { return !!mapForSect(id); },
    hasPlace: function (id) { return !!mapForPlace(id); },
    layer: layer,
    layerFor: layerFor,
    card: card,
    show: function (host, kind, id) { bind(host); show(host, kind, id); }
  };
})();
