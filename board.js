/* 전투판(戰鬪板): 여럿이 함께 쓰는 실시간 6×6 전투판. 강호도 → 전투판.
   방 하나 = Firestore rooms/<id> 문서 하나. { n, gm, gmName, rows[6], set, round, phase: "plot"|"act", tk: {말}, log: [...], pend }
   말 = { n, o: 주인 uid, on, s: "A"|"B", x, y, life[6] | hp, ex, g: 공력, gs: 정했나, used: 쓴 코스트, mv: 쓴 이동, mk: 마기, st: 상태, c: 시트, tv: 고정 목표치 }
   공력은 공개 전까지 화면에서만 가린다(문서에는 들어 있다). 대미지와 효과 적용은 사람이 한다. 전장도(field.js)가 있어야 한다. */
(function () {
  "use strict";
  var N = 6, C = 150, LIFE = ["병기", "외공", "내공", "강호", "지략", "술법"], BLOCK = { "#": 1, "_": 1, "D": 1 };
  var DB = null, ME = { id: "", gm: false, name: "" }, RID = "", R = null, LIST = [], unR = null, unL = null, SEL = "", MODE = null, ADV = 0, FREE = false, view = null, tries = 0, sideWait = false;
  function A() { return window.WX_SIM_API; }
  function F() { return window.WX_FIELD; }
  function e(s) { return A().esc(s == null ? "" : String(s)); }
  function FV() { return window.firebase && firebase.firestore && firebase.firestore.FieldValue; }
  function toast(m) { A().toast(m); }
  function isGm() { return !!R && !!ME.id && (R.gm === ME.id || ME.gm); }
  function ctrl(t) { return !!t && !!ME.id && (isGm() || t.o === ME.id); }
  function toks() { return R && R.tk ? Object.keys(R.tk).map(function (id) { return Object.assign({ id: id }, R.tk[id]); }) : []; }
  function tok(id) { return R && R.tk && R.tk[id] ? Object.assign({ id: id }, R.tk[id]) : null; }
  function ref() { return DB.collection("rooms").doc(RID); }
  function up(o) { return ref().update(o).catch(function (err) { toast("반영하지 못했어요 (" + (err && err.code || "오류") + ")"); }); }
  function who() { var t = tok(SEL); return (t && ctrl(t) ? t.n : ME.name) || "협객"; }
  function ent(m, k, w) { return { i: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), w: w || who(), m: m, k: k || "" }; }
  function say(m, k, extra, w) { var o = extra || {}, en = ent(m, k, w); o.log = FV() ? FV().arrayUnion(en) : (R.log || []).concat([en]).slice(-200); return up(o); }
  function lifeLeft(t) { return t.life ? t.life.filter(Boolean).length + (t.ex || 0) : (t.hp || 0); }

  /* ── 주사위 ── */
  function d6() { return 1 + Math.floor(Math.random() * 6); }
  function roll2(adv) {
    var n = 2 + Math.abs(adv || 0), all = [], i; for (i = 0; i < n; i++) all.push(d6());
    var s = all.slice().sort(function (a, b) { return adv < 0 ? a - b : b - a; }), keep = s.slice(0, 2);
    return { all: all, keep: keep, sum: keep[0] + keep[1], sp: keep[0] === 6 && keep[1] === 6 };
  }
  /* 판정 글. tv = 목표치(없으면 0), g = 공력(전투 중 주화입마 확인) */
  function judge(tv, g, mob) {
    var r = roll2(ADV), txt = "2D6" + (ADV ? (ADV > 0 ? " 유리점 " : " 불리점 ") + Math.abs(ADV) + " [" + r.all.join(",") + "]" : "") + " → " + r.keep.join("+") + "=" + r.sum, ok = null;
    if (r.sp) { ok = true; txt += " 스페셜!"; }
    else if (g && r.sum < g) { ok = false; txt += mob ? " (공력 " + g + " 미만) 실패" : " (공력 " + g + " 미만) 주화입마!"; }
    else if (tv) { ok = r.sum >= tv; txt += " (목표 " + tv + ") " + (ok ? "성공" : "실패"); }
    else txt += " (목표치를 몰라 성패는 직접 판단)";
    return { ok: ok, txt: txt };
  }
  function tvOf(t, sk) { if (t.tv) return t.tv; if (!t.c || !sk || sk === "—") return 0; var v = A().targets(t.c)[sk]; return v || 0; }

  /* ── 판 계산 ── */
  function grid() { return F().parse(R.rows).g; }
  function at(x, y) { return toks().filter(function (t) { return t.x === x && t.y === y; })[0]; }
  function reach(t, budget) {
    var g = grid(), best = {}, q = [[t.x, t.y, 0]]; best[t.x + "," + t.y] = 0;
    while (q.length) {
      q.sort(function (a, b) { return a[2] - b[2]; }); var c = q.shift();
      if (g[c[1]][c[0]] === "w" && !(c[0] === t.x && c[1] === t.y)) continue;   /* 수면에 들어가면 이동이 끝난다 */
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue; var x = c[0] + dx, y = c[1] + dy;
        if (x < 0 || y < 0 || x >= N || y >= N || BLOCK[g[y][x]]) continue;
        if (dx && dy && BLOCK[g[c[1]][x]] && BLOCK[g[y][c[0]]]) continue;
        var from = g[c[1]][c[0]], to = g[y][x], cost = 1;
        if (to === "~" || (to === "^" && from !== "^") || (from === "v" && to !== "v")) cost = 2;
        var nc = c[2] + cost, k = x + "," + y;
        if (nc <= budget && (best[k] == null || nc < best[k])) { best[k] = nc; q.push([x, y, nc]); }
      }
    }
    return best;
  }
  function dist(a, b) { var dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y), mn = Math.min(dx, dy); return Math.max(dx, dy) - mn + 1.5 * mn; }
  function blocked(a, b) {
    var g = grid(), i;
    if (a.y === b.y) { for (i = Math.min(a.x, b.x) + 1; i < Math.max(a.x, b.x); i++) if (g[a.y][i] === "#") return true; }
    if (a.x === b.x) { for (i = Math.min(a.y, b.y) + 1; i < Math.max(a.y, b.y); i++) if (g[i][a.x] === "#") return true; }
    return false;
  }
  function rangeOf(t, r, b) {
    var s = String(r.r || ""), m = /(\d+)\s*~\s*(\d+)/.exec(s), v = /인접/.test(s) ? 1.5 : m ? +m[2] : parseInt(s, 10);
    if (isNaN(v)) return -1;
    if (/사격전/.test(r.e || "") && b) { var g = grid(), f = g[t.y][t.x], to = g[b.y][b.x]; if (f === "^" && to !== "^") v += 1; if (f === "v" && to !== "v") v -= 1; }
    return v;
  }
  function skillsOf(t) {
    var out = [{ n: "접근전 공격", t: "공격", r: "1", c: "0", sk: (t.c && t.c.atk) || "", e: "접근전 1점." }];
    if (t.c) (t.c.mg || []).forEach(function (n) { var r = A().find(n); if (r && r.n && r.t !== "장비") out.push(r); });
    return out;
  }
  function bare(n) { return String(n || "").replace(/\s*\([^)]*\)\s*$/, ""); }

  /* ── 그리기 ── */
  function boardSvg() {
    var f = F(), m = f.parse(R.rows), set = f.setOf(R.set), s = f.svg(m, set, { titles: true, marks: R.round === 1 && R.phase === "plot" }), o = "", t = tok(SEL);
    if (t && MODE && MODE.type === "move") {
      var b = FREE ? null : reach(t, Math.max(0, (t.g || 0) - (t.mv || 0)));
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        if (at(x, y)) continue; var ok = FREE ? !BLOCK[m.g[y][x]] || isGm() : b[x + "," + y] != null;
        if (ok) o += '<rect x="' + (x * C + 6) + '" y="' + (y * C + 6) + '" width="' + (C - 12) + '" height="' + (C - 12) + '" rx="10" fill="#3f9b6a" fill-opacity=".28" stroke="#2c7a51" stroke-width="5" pointer-events="none"/>' + (b ? '<text x="' + (x * C + C - 16) + '" y="' + (y * C + 30) + '" text-anchor="end" font-size="24" fill="#1d5a3a" pointer-events="none">' + b[x + "," + y] + "</text>" : "");
      }
    }
    toks().forEach(function (k) {
      var cx = k.x * C + C / 2, cy = k.y * C + C / 2, col = k.s === "B" ? "#a8322d" : "#2f5d8a", sel = k.id === SEL, down = lifeLeft(k) <= 0, tg = false;
      if (t && MODE && MODE.type === "skill" && k.id !== t.id) { var rg = rangeOf(t, MODE.r, k); tg = rg >= 0 && dist(t, k) <= rg && !(MODE.r.t === "공격" && blocked(t, k)); }
      o += '<g pointer-events="none" opacity="' + (down ? ".45" : "1") + '">' + (tg ? '<circle cx="' + cx + '" cy="' + cy + '" r="68" fill="none" stroke="#e0a800" stroke-width="9" stroke-dasharray="14 8"/>' : "") +
        '<circle cx="' + cx + '" cy="' + cy + '" r="54" fill="' + col + '" stroke="' + (sel ? "#fff" : "#1a1a1a") + '" stroke-width="' + (sel ? 9 : 4) + '"/>' +
        '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="34" font-weight="700" fill="#fff">' + e(String(k.n).slice(0, 3)) + "</text>" +
        '<text x="' + cx + '" y="' + (cy + 36) + '" text-anchor="middle" font-size="24" fill="#fff">' + (down ? "쓰러짐" : "♥" + lifeLeft(k)) + "</text>" +
        (R.phase === "act" && k.g ? '<circle cx="' + (cx + 44) + '" cy="' + (cy - 44) + '" r="22" fill="#f4eede" stroke="#1a1a1a" stroke-width="3"/><text x="' + (cx + 44) + '" y="' + (cy - 34) + '" text-anchor="middle" font-size="28" font-weight="700" fill="#1a1a1a">' + k.g + "</text>" : "") + "</g>";
    });
    return s.replace("</svg>", o + "</svg>");
  }
  function opt(list, cur, labels) { return list.map(function (v, i) { return '<option value="' + e(v) + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + e(labels ? labels[i] : v) + "</option>"; }).join(""); }
  function sideHtml() {
    var f = F(), gm = isGm(), list = toks(), t = tok(SEL), h = "", plot = R.phase === "plot";
    h += '<div class="bd-box"><b>' + e(R.n) + "</b> · " + R.round + "라운드 · " + (plot ? "공력 정하기" : "행동") + ' <span class="hint">GM ' + e(R.gmName || "") + "</span>" +
      (gm ? '<div class="sheet-actions">' + (plot ? '<button class="btn small primary" data-b="reveal">공력 공개</button>' : '<button class="btn small primary" data-b="next">라운드 종료</button>') + '<button class="btn small" data-b="mapbox">맵 바꾸기</button></div>' : "") + "</div>";
    if (gm && MODE && MODE.type === "map") {
      var set = f.setOf(R.set);
      h += '<div class="bd-box"><div class="gm-bar"><select data-f="set" aria-label="묶음">' + opt(f.sets.map(function (s) { return s.id; }), R.set, f.sets.map(function (s) { return s.n; })) + '</select><select data-f="map" aria-label="맵"><option value="">맵 고르기</option>' + opt(set.maps.map(function (m, i) { return i; }), "", set.maps.map(function (m) { return m.n; })) + '</select><button class="btn small" data-b="genmap">무작위</button></div>' +
        '<textarea id="bd-code" rows="6" class="dg-code" spellcheck="false" aria-label="맵 코드">' + e(R.rows.join("\n")) + '</textarea><div class="sheet-actions"><button class="btn small" data-b="code">맵 코드 적용</button></div><p class="hint">던전메이커나 전장도의 맵 코드를 붙여 넣을 수 있어요.</p></div>';
    }
    if (R.pend) {
      var pa = tok(R.pend.a), pb = tok(R.pend.b);
      h += '<div class="bd-box bd-pend"><b>회피 차례</b> ' + e((pa ? pa.n : "?") + " → " + (pb ? pb.n : "?")) + " 【" + e(R.pend.mn) + "】 " + (pb && ctrl(pb) ? '<div class="sheet-actions"><button class="btn small primary" data-b="dodge">회피 굴리기' + (tvOf(pb, R.pend.sk) ? " (《" + e(R.pend.sk) + "》 목표 " + tvOf(pb, R.pend.sk) + ")" : "") + '</button><button class="btn small" data-b="nododge">그냥 맞기</button></div>' : '<span class="hint">상대가 회피를 굴립니다.</span>') + "</div>";
    }
    var ord = list.slice().sort(function (a, b) { return plot ? (a.s < b.s ? -1 : a.s > b.s ? 1 : 0) : (b.g || 0) - (a.g || 0); });
    h += '<div class="bd-box"><b>' + (plot ? "말" : "행동 순서") + '</b><div class="bd-ord">' + (ord.map(function (k) {
      var gtxt = plot ? (k.gs ? (ctrl(k) ? "공력 " + k.g : "정함") : "아직") : "공력 " + (k.g || "–");
      return '<button type="button" class="bd-row' + (k.id === SEL ? " on" : "") + '" data-sel="' + e(k.id) + '"><span class="bd-dot ' + (k.s === "B" ? "b" : "a") + '"></span>' + e(k.n) + ' <small>' + gtxt + " · ♥" + lifeLeft(k) + (k.mk ? " · 마기 " + k.mk : "") + (k.st ? " · " + e(k.st) : "") + "</small></button>";
    }).join("") || '<span class="hint">아직 말이 없어요.</span>') + "</div></div>";
    if (t) {
      var can = ctrl(t), left = (t.g || 0) - (t.used || 0), g = grid(), ter = f.terr[g[t.y][t.x]];
      h += '<div class="bd-box"><b>' + e(t.n) + '</b> <span class="hint">' + (t.s === "B" ? "을" : "갑") + (t.on ? " · " + e(t.on) : "") + (t.c ? " · " + e((t.c.school || "") + " " + (t.c.lv || "")) : "") + " · 선 칸: " + e(ter[0]) + "</span>";
      if (can) {
        if (plot) h += '<div class="bd-gong" role="group" aria-label="공력">공력 ' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<button class="chip' + (t.gs && t.g === n ? " on" : "") + '" data-g="' + n + '">' + n + "</button>"; }).join("") + "</div>";
        else h += '<p class="hint">공력 ' + (t.g || "–") + " · 남은 코스트 " + Math.max(0, left) + " · 남은 이동 " + Math.max(0, (t.g || 0) - (t.mv || 0)) + "</p>";
        h += t.life ? '<div class="bd-life" role="group" aria-label="생명력">' + LIFE.map(function (n, i) { return '<button class="chip' + (t.life[i] ? " on" : "") + '" data-life="' + i + '">' + n + "</button>"; }).join("") + ' <span>추가 <button class="btn small" data-b="ex-">−</button> ' + (t.ex || 0) + ' <button class="btn small" data-b="ex+">+</button></span></div>'
          : '<div class="bd-life">생명력 <button class="btn small" data-b="hp-">−</button> ' + (t.hp || 0) + ' <button class="btn small" data-b="hp+">+</button></div>';
        h += '<div class="bd-life">마기 <button class="btn small" data-b="mk-">−</button> ' + (t.mk || 0) + ' <button class="btn small" data-b="mk+">+</button> <input data-f="st" value="' + e(t.st || "") + '" placeholder="상태이상·메모" aria-label="상태"></div>';
        h += '<div class="sheet-actions"><button class="btn small' + (MODE && MODE.type === "move" ? " primary" : "") + '" data-b="move">이동</button><label class="hint"><input type="checkbox" data-f="free"' + (FREE ? " checked" : "") + '> 비용 없이 옮기기(밀기·당기기)</label><button class="btn small danger" data-b="del">말 빼기</button></div>';
        h += '<div class="bd-sk">' + skillsOf(t).map(function (r, i) {
          var on = MODE && MODE.type === "skill" && MODE.i === i;
          return '<button type="button" class="bd-skb' + (on ? " on" : "") + '" data-sk="' + i + '" title="' + e(r.e || "") + '"><b>' + e(bare(r.n)) + "</b> <small>" + e(r.t + (r.r && r.r !== "—" ? " · 간격 " + r.r : "") + (r.c && r.c !== "—" ? " · 코스트 " + r.c : "") + (r.sk && r.sk !== "—" ? " · 《" + r.sk + "》" : "")) + "</small></button>";
        }).join("") + "</div>";
        if (MODE && MODE.type === "skill") h += '<p class="hint bd-eff">' + e(MODE.r.e || "") + "</p><p class=\"hint\">" + (rangeOf(t, MODE.r) >= 0 ? "노란 테를 두른 말을 누르면 명중 판정을 굴립니다. " : "") + '<button class="btn small" data-b="useself">대상 없이 쓰기</button></p>';
      }
      h += "</div>";
    }
    if (ME.id) {
      var mine = A().myChars(), npcs = gm && window.WX_GM_NPCS ? WX_GM_NPCS() : [];
      h += '<details class="bd-box"><summary><b>말 추가</b></summary><div class="gm-bar"><select id="bd-ch" aria-label="내 캐릭터">' + mine.map(function (c, i) { return '<option value="' + i + '">' + e((c.name || "이름 없음") + " · " + (c.lv || "")) + "</option>"; }).join("") + '</select><select id="bd-sd" aria-label="진영"><option value="A">갑</option><option value="B">을</option></select><button class="btn small" data-b="addme">내 캐릭터 올리기</button></div>' +
        (gm ? (npcs.length ? '<div class="gm-bar"><select id="bd-npc" aria-label="서고 NPC">' + npcs.map(function (n) { return '<option value="' + e(n.id) + '">' + e(n.n + " · " + (n.lv || "")) + '</option>'; }).join("") + '</select><button class="btn small" data-b="addnpc">서고 NPC 올리기(을)</button></div>' : "") +
          '<div class="gm-bar"><input id="bd-mn" placeholder="이름(졸개·이물)" size="8" aria-label="이름"><label class="hint">수 <input id="bd-mc" type="number" min="1" max="8" value="1" style="width:3.5em"></label><label class="hint">생명력 <input id="bd-mh" type="number" min="1" max="40" value="1" style="width:3.5em"></label><label class="hint">목표치 <input id="bd-mt" type="number" min="2" max="12" value="8" style="width:3.5em"></label><button class="btn small" data-b="addmob">올리기(을)</button></div>' : "") + "</details>";
      h += '<div class="bd-box"><b>주사위</b><div class="gm-bar"><select data-f="adv" aria-label="유리점·불리점">' + opt([2, 1, 0, -1, -2], ADV, ["유리점 2", "유리점 1", "보통", "불리점 1", "불리점 2"]) + '</select><input id="bd-tv" type="number" min="2" max="12" placeholder="목표치" style="width:5em" aria-label="목표치"><input id="bd-lb" placeholder="무엇을(회피·특기 이름)" size="10" aria-label="판정 이름"><button class="btn small" data-b="roll">2D6</button><button class="btn small" data-b="d6">1D6</button></div></div>';
    } else h += '<p class="hint">구글로 로그인하면 말을 올리고 움직일 수 있어요. 지금은 구경만 됩니다.</p>';
    return h;
  }
  function logHtml() {
    return (R.log || []).slice(-80).map(function (l) { return '<div class="bd-l ' + e(l.k || "") + '"><b>' + e(l.w) + "</b> " + e(l.m) + "</div>"; }).join("");
  }
  function draw(force) {
    if (!view || !R || !/^#map-b-/.test(location.hash)) return;
    if (!document.getElementById("bd-board")) {
      view.innerHTML = A().viewHead("map", "전투판(戰鬪板) — 함께 보는 실시간 전투판입니다. 공력을 정하고, 말을 옮기고, 무공을 눌러 판정을 굴립니다. 대미지와 효과는 직접 적용합니다.") + nav() +
        '<div class="bd"><div><div id="bd-board" class="fld-board"></div><p class="hint">말을 눌러 고르고, \'이동\'을 누른 뒤 초록 칸을 누르면 옮깁니다. 칸에 마우스를 올리면 지형 효과가 보여요.</p></div><div id="bd-side"></div><div class="bd-logwrap"><div id="bd-log" aria-live="polite"></div><form id="bd-chat" class="gm-bar"><input id="bd-msg" placeholder="말하기" autocomplete="off" aria-label="말하기"><button class="btn small">보내기</button></form></div></div>';
      bind();
    }
    document.getElementById("bd-board").innerHTML = boardSvg();
    var side = document.getElementById("bd-side"), ae = document.activeElement;
    if (!force && ae && side.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type !== "checkbox") sideWait = true;
    else { var op = side.querySelector("details"), was = op && op.open; side.innerHTML = sideHtml(); if (was) side.querySelector("details").open = true; sideWait = false; }
    var lg = document.getElementById("bd-log"), stick = lg.scrollHeight - lg.scrollTop - lg.clientHeight < 60; lg.innerHTML = logHtml(); if (stick) lg.scrollTop = lg.scrollHeight;
  }
  function nav() { return '<nav class="subtabs" aria-label="강호도"><a href="#map">전도·구역도</a><a href="#map-f">전장도(戰場圖)</a><a href="#map-b" aria-current="page">전투판(戰鬪板)</a></nav>'; }

  /* ── 손질 ── */
  function freeCell(side) {
    var m = F().parse(R.rows), st = side === "B" ? m.b : m.a, i, x, y;
    for (i = 0; i < st.length; i++) if (!at(st[i][0], st[i][1])) return st[i];
    for (i = 0; i < N * N; i++) { x = side === "B" ? N - 1 - Math.floor(i / N) : Math.floor(i / N); y = i % N; if (!BLOCK[m.g[y][x]] && !at(x, y)) return [x, y]; }
    return [0, 0];
  }
  function slim(c) { var o = JSON.parse(JSON.stringify(c)); ["ougi", "notes", "rel", "pub", "img", "portrait", "exp", "log"].forEach(function (k) { delete o[k]; }); Object.keys(o).forEach(function (k) { if (typeof o[k] === "string" && o[k].length > 1500) delete o[k]; }); return o; }
  function addTok(t) { var p = freeCell(t.s), id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), o = {}; t.x = p[0]; t.y = p[1]; t.g = 0; t.gs = false; t.used = 0; t.mv = 0; t.mk = 0; t.st = ""; o["tk." + id] = t; if (!R.tk) { o = { tk: {} }; o.tk[id] = t; } if (R.tk) R.tk[id] = t; return say(t.n + " 등장 (" + (t.s === "B" ? "을" : "갑") + ")", "sys", o, "판"); }
  function setT(id, o) { var u = {}; Object.keys(o).forEach(function (k) { u["tk." + id + "." + k] = o[k]; }); return u; }
  function useSkill(t, r, b) {
    var cost = parseInt(r.c, 10) || 0, left = (t.g || 0) - (t.used || 0);
    if (R.phase !== "act") { toast("공력을 공개한 뒤에 쓸 수 있어요"); return; }
    if (cost > left && !FREE) { toast("남은 코스트(" + Math.max(0, left) + ")가 모자라요. 그래도 쓰려면 '비용 없이'를 켜세요"); return; }
    var sk = r.sk && r.sk !== "—" ? r.sk : "", j = sk ? judge(tvOf(t, sk), t.g, !t.c) : { ok: true, txt: "" };
    var msg = "【" + bare(r.n) + "】" + (b ? " → " + b.n : "") + (sk ? " 《" + sk + "》 " + j.txt : "") + (!b || j.ok === false ? "" : ""), u = setT(t.id, { used: (t.used || 0) + (FREE ? 0 : cost) });
    if (b && r.t === "공격" && j.ok !== false) u.pend = { a: t.id, b: b.id, sk: sk, mn: bare(r.n), e: r.e || "" };
    else if (j.ok !== false && r.e) msg += " — " + r.e;
    MODE = null; say(msg, j.ok === false ? "bad" : "act", u, t.n);
  }
  function onBoard(ev) {
    var g = ev.target.closest("g[data-x]"); if (!g || !R) return;
    var x = +g.dataset.x, y = +g.dataset.y, here = at(x, y), t = tok(SEL);
    if (t && ctrl(t) && MODE && MODE.type === "skill" && here && here.id !== t.id) {
      var rg = rangeOf(t, MODE.r, here);
      if (rg < 0 || dist(t, here) > rg) { toast("간격 밖이에요"); return; }
      if (MODE.r.t === "공격" && blocked(t, here)) { toast("장애물에 가려 공격 무공의 대상으로 고를 수 없어요"); return; }
      useSkill(t, MODE.r, here); return;
    }
    if (here) { SEL = here.id; MODE = null; draw(true); return; }
    if (t && ctrl(t) && MODE && MODE.type === "move") {
      var gr = grid(), cost = 0;
      if (FREE) { if (BLOCK[gr[y][x]] && !isGm()) return; }
      else { if (R.phase !== "act") { toast("공력을 공개한 뒤에 움직여요"); return; } var b = reach(t, Math.max(0, (t.g || 0) - (t.mv || 0))); if (b[x + "," + y] == null) return; cost = b[x + "," + y]; }
      var u = setT(t.id, { x: x, y: y, mv: (t.mv || 0) + cost }), tn = F().terr[gr[y][x]][0];
      R.tk[t.id].x = x; R.tk[t.id].y = y; R.tk[t.id].mv = (t.mv || 0) + cost; draw(true);
      if (gr[y][x] !== ".") say("→ " + tn + " 칸으로 이동", "sys", u, t.n); else up(u);
    }
  }
  function onSide(ev) {
    var el = ev.target, b = el.closest("[data-b]"), t = tok(SEL), v;
    if (el.closest("[data-sel]")) { SEL = el.closest("[data-sel]").dataset.sel; MODE = null; draw(true); return; }
    if (el.closest("[data-g]") && t && ctrl(t)) { up(setT(t.id, { g: +el.closest("[data-g]").dataset.g, gs: true })); return; }
    if (el.closest("[data-life]") && t && ctrl(t)) { var i = +el.closest("[data-life]").dataset.life, l = t.life.slice(); l[i] = l[i] ? 0 : 1; say(LIFE[i] + (l[i] ? " 회복" : " 상실") + " (♥" + (l.filter(Boolean).length + (t.ex || 0)) + ")", "sys", setT(t.id, { life: l }), t.n); return; }
    if (el.closest("[data-sk]") && t && ctrl(t)) { var k = +el.closest("[data-sk]").dataset.sk; MODE = MODE && MODE.type === "skill" && MODE.i === k ? null : { type: "skill", i: k, r: skillsOf(t)[k] }; draw(true); return; }
    if (!b) return; var act = b.dataset.b;
    if (act === "reveal" && isGm()) { var miss = toks().filter(function (k) { return !k.gs && lifeLeft(k) > 0; }); if (miss.length && b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "아직 안 정한 말 " + miss.length + " · 그래도 공개"; return; } say(R.round + "라운드 공력 공개: " + toks().filter(function (k) { return k.gs; }).sort(function (a, c) { return c.g - a.g; }).map(function (k) { return k.n + " " + k.g; }).join(", "), "sys", { phase: "act" }, "판"); return; }
    if (act === "next" && isGm()) {
      var g = grid(), u = { phase: "plot", round: R.round + 1, pend: null }, hz = [];
      toks().forEach(function (k) { Object.assign(u, setT(k.id, { g: 0, gs: false, used: 0, mv: 0 })); if (g[k.y][k.x] === "!" && lifeLeft(k) > 0) hz.push(k.n); });
      u.log = (R.log || []).slice(-120).concat([ent(R.round + "라운드 끝." + (hz.length ? " 위험지에 선 말: " + hz.join(", ") + " → 집단전." : "") + " 상태이상 해제 판정과 전장 효과를 처리하세요.", "sys", "판")]);
      MODE = null; up(u); return;
    }
    if (act === "mapbox") { MODE = MODE && MODE.type === "map" ? null : { type: "map" }; draw(true); return; }
    if (act === "genmap" && isGm()) { up({ rows: F().toRows(F().generate(F().setOf(R.set))) }); return; }
    if (act === "code" && isGm()) { var rows = document.getElementById("bd-code").value.split(/\r?\n/).map(function (r) { return r.replace(/\s/g, ""); }).filter(Boolean); if (rows.length !== 6 || rows.some(function (r) { return r.length !== 6; })) { toast("맵 코드는 6줄, 줄마다 6글자여야 해요"); return; } up({ rows: rows }); return; }
    if (act === "dodge" || act === "nododge") {
      var pb = tok(R.pend.b); if (!pb || !ctrl(pb)) return;
      if (act === "nododge") { say("회피하지 않음 — 【" + R.pend.mn + "】 " + R.pend.e, "bad", { pend: null }, pb.n); return; }
      var j = judge(tvOf(pb, R.pend.sk), R.phase === "act" ? pb.g : 0, !pb.c);
      say("회피" + (R.pend.sk ? " 《" + R.pend.sk + "》 " : " ") + j.txt + (j.ok ? "" : " — " + (j.ok === false ? "맞음: " : "맞았다면: ") + "【" + R.pend.mn + "】 " + R.pend.e), j.ok ? "ok" : "bad", { pend: null }, pb.n); return;
    }
    if (act === "roll") { v = +document.getElementById("bd-tv").value || 0; var lb = document.getElementById("bd-lb").value.trim(), j2 = judge(v, t && ctrl(t) && R.phase === "act" ? t.g : 0, t && !t.c); say((lb ? lb + " " : "") + j2.txt, j2.ok === false ? "bad" : j2.ok ? "ok" : ""); return; }
    if (act === "d6") { say("1D6 → " + d6()); return; }
    if (act === "addme") { var c = A().myChars()[+document.getElementById("bd-ch").value]; if (!c) { toast("인물지에서 캐릭터를 먼저 만들어 주세요"); return; } var hard = (c.bg || []).some(function (n) { return /^강골/.test(n); }); addTok({ n: c.name || "협객", o: ME.id, on: ME.name, s: document.getElementById("bd-sd").value, life: [1, 1, 1, 1, 1, 1], ex: hard ? 1 : 0, c: slim(c) }); return; }
    if (act === "addnpc" && isGm()) { var np = WX_GM_NPCS().filter(function (n) { return n.id === document.getElementById("bd-npc").value; })[0]; if (np) addTok({ n: np.n, o: ME.id, on: "GM", s: "B", life: [1, 1, 1, 1, 1, 1], ex: 0, c: slim(np.c) }); return; }
    if (act === "addmob" && isGm()) {
      var nm = document.getElementById("bd-mn").value.trim() || "졸개", cnt = Math.max(1, Math.min(8, +document.getElementById("bd-mc").value || 1)), hp = Math.max(1, +document.getElementById("bd-mh").value || 1), tv = Math.max(2, Math.min(12, +document.getElementById("bd-mt").value || 8)), i2 = 0;
      (function nx() { if (i2 >= cnt) return; i2++; addTok({ n: cnt > 1 ? nm + i2 : nm, o: ME.id, on: "GM", s: "B", hp: hp, tv: tv }).then(nx); })(); return;
    }
    if (!t || !ctrl(t)) return;
    if (act === "move") { MODE = MODE && MODE.type === "move" ? null : { type: "move" }; draw(true); }
    else if (act === "useself" && MODE && MODE.type === "skill") useSkill(t, MODE.r, null);
    else if (act === "hp-" || act === "hp+") { v = Math.max(0, (t.hp || 0) + (act === "hp+" ? 1 : -1)); say("생명력 " + v, "sys", setT(t.id, { hp: v }), t.n); }
    else if (act === "ex-" || act === "ex+") up(setT(t.id, { ex: Math.max(0, (t.ex || 0) + (act === "ex+" ? 1 : -1)) }));
    else if (act === "mk-" || act === "mk+") { v = Math.max(0, (t.mk || 0) + (act === "mk+" ? 1 : -1)); say("마기 " + v, "sys", setT(t.id, { mk: v }), t.n); }
    else if (act === "del") { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "한 번 더 누르면 뺌"; return; } var tk = Object.assign({}, R.tk); delete tk[t.id]; SEL = ""; MODE = null; say(t.n + " 퇴장", "sys", { tk: tk }, "판"); }
  }
  function onSideChange(ev) {
    var el = ev.target, f = el.dataset.f, t = tok(SEL);
    if (f === "adv") { ADV = +el.value; }
    else if (f === "free") { FREE = el.checked; draw(true); }
    else if (f === "st" && t && ctrl(t)) { up(setT(t.id, { st: el.value.slice(0, 40) })); }
    else if (f === "set" && isGm()) { up({ set: el.value, rows: F().setOf(el.value).maps[0].rows }); }
    else if (f === "map" && isGm() && el.value !== "") { up({ rows: F().setOf(R.set).maps[+el.value].rows }); }
    if (sideWait) setTimeout(function () { if (sideWait) draw(); }, 50);
  }
  function bind() {
    document.getElementById("bd-board").addEventListener("click", onBoard);
    var side = document.getElementById("bd-side"); side.addEventListener("click", onSide); side.addEventListener("change", onSideChange);
    side.addEventListener("focusout", function () { setTimeout(function () { if (sideWait) draw(); }, 80); });
    document.getElementById("bd-chat").addEventListener("submit", function (ev) { ev.preventDefault(); var i = document.getElementById("bd-msg"), m = i.value.trim(); if (!m) return; if (!ME.id) { toast("로그인해야 말할 수 있어요"); return; } i.value = ""; say(m.slice(0, 300), "chat"); });
  }

  /* ── 방 목록 ── */
  function listHtml() {
    return A().viewHead("map", "전투판(戰鬪板) — 함께 보는 실시간 전투판입니다. 방을 만든 사람이 그 방의 GM입니다.") + nav() +
      (ME.id ? '<form id="bd-new" class="gm-bar"><input id="bd-rn" placeholder="방 이름" maxlength="30" aria-label="방 이름"><button class="btn small primary">방 만들기</button></form>' : '<p class="hint">구글로 로그인하면 방을 만들 수 있어요. 구경은 로그인 없이 됩니다.</p>') +
      (!DB ? '<p class="hint">저장소에 연결하는 중…</p>' : "") +
      '<div class="gm-dgs">' + LIST.map(function (r) { return '<article class="gm-dg"><div><b>' + e(r.n) + '</b> <span class="gm-meta">' + (r.round || 1) + "라운드 · 말 " + Object.keys(r.tk || {}).length + " · GM " + e(r.gmName || "") + '</span></div><div class="sheet-actions"><a class="btn small primary" href="#map-b-' + e(r.id) + '">들어가기</a>' + (ME.id && (r.gm === ME.id || ME.gm) ? '<button class="btn small danger" data-delroom="' + e(r.id) + '">방 없애기</button>' : "") + "</div></article>"; }).join("") + "</div>" +
      (DB && !LIST.length ? '<p class="hint">아직 방이 없어요.</p>' : "");
  }
  function drawList() {
    if (!view || !/^#map-b$/.test(location.hash)) return;
    view.innerHTML = listHtml();
    var f = document.getElementById("bd-new");
    if (f) f.onsubmit = function (ev) {
      ev.preventDefault(); var n = document.getElementById("bd-rn").value.trim() || "이름 없는 판", id = Math.random().toString(36).slice(2, 8), s0 = F().sets[0];
      DB.collection("rooms").doc(id).set({ n: n, gm: ME.id, gmName: ME.name, set: s0.id, rows: s0.maps[0].rows, round: 1, phase: "plot", tk: {}, log: [], pend: null, at: Date.now() })
        .then(function () { location.hash = "#map-b-" + id; }, function (err) { toast("방을 만들지 못했어요 (" + (err && err.code || "오류") + "). 저장소 규칙에 rooms가 들어갔는지 확인해 주세요"); });
    };
    view.onclick = function (ev) { var b = ev.target.closest("[data-delroom]"); if (!b) return; if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "한 번 더 누르면 없앰"; return; } DB.collection("rooms").doc(b.dataset.delroom).delete().catch(function () { toast("없애지 못했어요"); }); };
  }
  function stop() { if (unR) { unR(); unR = null; } R = null; }
  function render(v, id) {
    view = v; var api = A(); DB = api.db ? api.db() : null; var me = api.me ? api.me() : null; if (me) ME = me;
    if (!ME.name && window.firebase && firebase.auth && firebase.auth().currentUser) ME.name = firebase.auth().currentUser.displayName || "";
    if (!F()) { view.innerHTML = '<div class="empty"><p>전장도 자료가 없어 전투판을 열 수 없어요.</p></div>'; return; }
    view.onclick = null;
    if (!DB) { view.innerHTML = listHtml(); if (tries++ < 12) setTimeout(function () { if (/^#map-b/.test(location.hash)) render(view, id); }, 700); return; }
    if (!id) {
      stop(); RID = "";
      if (!unL) unL = DB.collection("rooms").onSnapshot(function (s) { LIST = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); drawList(); }, function () { LIST = []; drawList(); });
      drawList(); return;
    }
    if (id === RID && R) { draw(true); return; }
    stop(); RID = id; SEL = ""; MODE = null; view.innerHTML = A().viewHead("map", "전투판(戰鬪板)") + nav() + '<p class="hint">판을 여는 중…</p>';
    unR = DB.collection("rooms").doc(id).onSnapshot(function (d) {
      if (!/^#map-b-/.test(location.hash)) { stop(); return; }
      var data = d.exists === false || !d.data ? null : d.data();
      if (!data) { R = null; view.innerHTML = A().viewHead("map", "전투판(戰鬪板)") + nav() + '<p class="hint">없는 방이에요. <a href="#map-b">방 목록으로</a></p>'; return; }
      R = data; if (SEL && !R.tk[SEL]) SEL = ""; draw();
    }, function (err) { view.innerHTML = A().viewHead("map", "전투판(戰鬪板)") + nav() + '<p class="hint">판을 읽지 못했어요 (' + e(err && err.code || "오류") + ").</p>"; });
  }
  window.WX_BOARD = { render: render };
})();
