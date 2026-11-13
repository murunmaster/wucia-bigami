/* 던전메이커 — GM 서고 '던전' 탭. 「던전 공통 규칙」의 틀(층 → 구역 → 길)로 던전을 짜고 고친다.
   저장: GM 서고 기보 저장소(gmg-…)에 문서 id "dg-<구역도>-<구역>", { kind: "dungeon", map, zone, n, j: 원본(JSON 문자열) }.
   원본 형식: { kind, dir, mist, floors: [ { n, shape, mist, zones: [ { id, n, k, e, foes, f, m, in, down, end, at:[열,행] } ], links: [ [a, b, 길] ] } ] }
   전장도(field.js)가 있어야 맵 미리보기·PNG가 나온다. gm.js가 window.WX_DG를 부른다. */
(function () {
  "use strict";
  var KINDS = ["빈 곳", "전투", "함정", "관문", "조사", "쉼터", "보물", "보스"];
  var KCOL = { "빈 곳": "#b9b2a3", "전투": "#b5544a", "함정": "#c08a3e", "관문": "#6d6aa8", "조사": "#4f8a7a", "쉼터": "#5f8f52", "보물": "#b79a2f", "보스": "#7a2318" };
  var LINKS = { road: "대로", rough: "험로", secret: "암도", one: "일방", qing: "경공로", water: "수로" };
  var SHAPES = ["일자", "갈림", "고리", "미궁", "회오리"];
  var DIRS = ["내려감", "올라감", "들어감"];
  /* 종류별 규모: [층 수, 구역 수 최소, 최대, 모양] */
  var SCALE = { "은거지": [1, 4, 6, "고리"], "폐사": [1, 4, 6, "고리"], "동굴": [2, 4, 6, "갈림"], "석굴": [2, 4, 6, "갈림"], "벼랑": [2, 4, 6, "일자"], "산채": [2, 4, 6, "일자"],
    "늪": [2, 4, 6, "회오리"], "설원": [2, 4, 6, "일자"], "고분": [3, 4, 6, "미궁"], "요괴굴": [3, 4, 6, "회오리"], "성지": [3, 4, 6, "고리"], "수중": [3, 4, 6, "회오리"],
    "폐허": [3, 4, 6, "미궁"], "기관": [3, 5, 7, "미궁"], "장소형": [1, 4, 5, "일자"] };
  var DIROF = { "벼랑": "올라감", "늪": "들어감", "설원": "들어감", "기관": "들어감", "은거지": "들어감", "산채": "올라감", "성지": "들어감" };
  var NAMES = {
    cave: ["굴 어귀", "좁은 굴길", "종유석 방", "지하 물길", "무너진 굴", "박쥐 굴", "석순 숲", "깊은 못", "바람 구멍"],
    ruin: ["묘도", "석문", "전실", "이실", "배장갱", "부장품 방", "벽화 회랑", "무너진 통로", "현실"],
    cliff: ["잔도 들머리", "쇠사슬 길", "바위턱", "벼랑 굴", "구름다리", "매달린 사당", "바람목", "꼭대기"],
    water: ["물가 들머리", "갈대 물길", "뻘밭", "가라앉은 배", "수초 숲", "물밑 굴", "소용돌이 목", "용소"],
    snow: ["눈 고개", "얼음 골", "눈사태 터", "빙벽", "얼음 굴", "바람 능선", "얼어붙은 못", "만년설 꼭대기"],
    temple: ["산문 터", "무너진 회랑", "종루", "법당", "승방", "탑 아래", "경판고", "지하 감실"],
    village: ["사립문", "약초밭", "초당", "서고", "연못가", "뒤뜰", "지하 석실"],
    gate: ["망루 아래", "목책", "취의청", "곳간", "뒷길", "감옥", "두령의 방"]
  };
  /* 종류가 따로 이름을 가지는 곳 */
  var NAMES_K = { "기관": ["진문(陣門)", "돌기둥 숲", "회전 석벽", "쇠뇌 회랑", "거울 방", "물레 방", "사문(死門)", "생문(生門)", "진안(陣眼)"],
    "요괴굴": ["굴 어귀", "뼈 무더기", "허물 벗은 자리", "끈끈한 굴길", "알 방", "사람 가죽 걸린 방", "깊은 못", "요괴의 자리"],
    "성지": ["들머리 돌무지", "서낭 나무", "제단 아래", "물가 바위", "바람 언덕", "굿당", "신령의 자리"] };
  /* 기본 제공: 시범 던전 달마동(「던전 — 달마동」 문서와 같은 내용) */
  var SEED = { "sungsan~dm": { kind: "동굴", dir: "내려감", mist: "1d4+1", floors: [
    { n: "면벽굴", shape: "갈림", zones: [
      { id: "a", n: "굴 어귀", k: "관문", "in": 1, at: [0, 0], f: "cave", e: "계율원 무승 둘이 막는다. 《화술》이나 《기만》 판정에 성공하면 비킨다(소림 PC는 유리점 1). 힘으로 뚫으면 전투. 싸우면 나한 통로의 순찰조가 기습을 당하지 않는다. 탑림 암도로 오면 이 구역을 거치지 않고 무너진 샛굴로 들어온다.", foes: "졸개 무승 × PC 수" },
      { id: "b", n: "면벽 석실", k: "조사", at: [1, 0], e: "달마가 마주 앉았다는 벽. 새 손자국이 있다. 《법력》이나 《무공학》 성공: 혜명이 아래로 내려갔다는 것을 안다. 성공한 PC는 심마의 벽 판정에 유리점 1." },
      { id: "c", n: "무너진 샛굴", k: "함정", at: [1, 1], e: "천장이 내려앉는다. 길잡이가 《간파》나 《경공》으로 판정. 실패하면 일행 전원이 상태이상표를 1번 굴린다." },
      { id: "d", n: "나한 통로", k: "전투", at: [2, 0], f: "cave", e: "계율원 순찰조. 벽감마다 나한상이 서 있다. 쉬운 전투.", foes: "졸개 무승 × PC 수, 무인 1(이류)" },
      { id: "e", n: "내림 틈", k: "보스", down: 1, at: [3, 0], f: "cave", m: ["A..#.B", "A....B", "A.c.B_", "A.c.B_", "A....B", "A..#.B"], e: "중간 보스. 계율원 집사승 법계(法戒). 원각의 명으로 굴을 막고 있으나 진상은 모른다. 방장 범허의 이름을 걸고 《화술》(불리점 1)에 성공하거나 면벽 석실에서 알아낸 것을 들이대면 비킨다(위기 해결 1점). 틈이 낭떠러지다.", foes: "법계(일류 두목), 졸개 무승 × PC 수" }],
      links: [["a", "b", "road"], ["b", "d", "road"], ["d", "e", "road"], ["a", "c", "rough"], ["c", "e", "rough"]] },
    { n: "심마굴", shape: "회오리", mist: "1d4", zones: [
      { id: "f", n: "지하 물길", k: "전투", "in": 1, at: [0, 0], f: "cave", m: ["A.#.wB", "A...wB", "..~ww.", "A.ww#.", "A.w..B", "..w~.B"], e: "마기를 먹은 박쥐 떼. 쉬운 전투.", foes: "혈복(이물·요괴) 2무리: 생명력 4, 목표치 6. 「떼로 덮치기」 공격·간격 2·코스트 1·접근전 1점. 「피 냄새」 장비·생명력을 잃은 대상을 노린 명중 판정에 유리점 1." },
      { id: "g", n: "달마 좌대", k: "쉼터", at: [1, 0], e: "물이 닿지 않는 돌 좌대. 야영할 수 있다. 여기서 야영하면 마기 한계를 1d4로 굴린다." },
      { id: "h", n: "심마의 벽", k: "관문", at: [1, 1], e: "벽에 비친 자기 그림자가 말을 건다. 각자 《상단전》이나 《법력》으로 판정. 한 명이라도 성공하면 열린다. 실패한 PC는 마기 1과 '망각'. 성공한 PC 수를 적어 둔다." },
      { id: "i", n: "최심부", k: "보스", end: 1, at: [0, 1], f: "cave", m: ["A.#..B", "A..!.B", "..vv..", "A.vv.B", "A.!..B", "..#w.B"], e: "최종 보스. 천지의 잔영(殘影). 그 뒤에 혜명이 벽을 보고 앉아 있다. 심마의 벽에서 성공한 PC 수만큼 전투 중 판정 1번을 다시 굴린다(혜명의 일갈). 쓰러뜨리면 혜명이 '진의 모양'을 말해 주고, 좌대 뒤 석순에서 공청석유를 얻는다. 날목: 물길로 탑림까지.", foes: "천지의 잔영(이물·괴력난신): 생명력 PC 수 × 3, 목표치 6, 공력 1d6. 「혈전의 창날」 공격·간격 2·코스트 2·접근전 2점. 「수확」 공격·간격 3·코스트 3·간격 안 원하는 전원 사격전 1점, 맞힌 대상마다 생명력 1 회복, 전투당 2번. 「얼음 밑 그림자」 라운드 끝에 빈 칸 하나가 위험지(4칸까지). 그림자 병졸(졸개, 목표치 7) × PC 수." }],
      links: [["f", "g", "road"], ["g", "h", "road"], ["h", "i", "road"]] }] } };

  var ST = { open: "", ed: null, fl: 0, z: "", dirty: false, msg: "", del: false, seq: 0 };
  var CTX = null;
  function F() { return window.WX_FIELD; }
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function zid() { ST.seq++; return "z" + Date.now().toString(36).slice(-4) + ST.seq; }
  function docId(key) { return "dg-" + key.replace("~", "-"); }
  function stored(key) { var d = (CTX.gm.dg || []).filter(function (x) { return x.id === docId(key); })[0]; if (!d) return null; try { return JSON.parse(d.j); } catch (x) { return null; } }
  function zoneOf(key) { var p = key.split("~"), m = CTX.maps().filter(function (x) { return x.id === p[0]; })[0]; return { m: m, z: m && m.zones.filter(function (x) { return x.id === p[1]; })[0] }; }
  function setFor(kind, name) { return (F() && (F().setForZone(kind, name) || "")) || ""; }

  /* ── 층 깔기: 모양과 구역 수 → 자리와 길 ── */
  function layout(shape, n) {
    var at = [], links = [], i, inI = 0, downI = n - 1;
    function chain(a, b, t) { links.push([a, b, t || "road"]); }
    if (shape === "갈림" && n >= 4) {
      var k1 = Math.ceil((n - 2) / 2), k2 = n - 2 - k1, W = Math.max(k1, k2) + 1;
      at[0] = [0, 1]; for (i = 0; i < k1; i++) at[1 + i] = [1 + i, 0]; for (i = 0; i < k2; i++) at[1 + k1 + i] = [1 + i, 2]; at[n - 1] = [W, 1];
      chain(0, 1); for (i = 1; i < k1; i++) chain(i, i + 1); chain(k1, n - 1);
      if (k2) { chain(0, 1 + k1, "rough"); for (i = 1; i < k2; i++) chain(k1 + i, k1 + i + 1, "rough"); chain(k1 + k2, n - 1, "rough"); }
    } else if (shape === "고리" && n >= 4) {
      var ring = [[0, 1], [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2]], m = Math.min(n - 1, 8), pick = [];
      for (i = 0; i < m; i++) pick.push(ring[Math.round(i * 8 / m) % 8]);
      for (i = 0; i < m; i++) { at[i] = pick[i]; chain(i, (i + 1) % m); }
      at[m] = [1, 1]; chain(Math.floor(m / 2), m); downI = m;
      for (i = m + 1; i < n; i++) { at[i] = [3 + (i - m - 1), 1]; chain(i === m + 1 ? Math.floor(m / 2) : i - 1, i); }
    } else if (shape === "미궁") {
      var cols = 3, cells = [], idx = {}, seen = {}, tree = {};
      for (i = 0; i < n; i++) { at[i] = [i % cols, Math.floor(i / cols)]; idx[at[i].join()] = i; }
      (function walk(c) { seen[c] = 1; shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).forEach(function (d) { var o = idx[(at[c][0] + d[0]) + "," + (at[c][1] + d[1])]; if (o != null && !seen[o]) { chain(c, o, Math.random() < .25 ? "rough" : "road"); tree[c + "-" + o] = tree[o + "-" + c] = 1; walk(o); } }); })(0);
      var dist = [0], qu = [0]; while (qu.length) { var c0 = qu.shift(); links.forEach(function (l) { var o = l[0] === c0 ? l[1] : l[1] === c0 ? l[0] : -1; if (o >= 0 && dist[o] == null) { dist[o] = dist[c0] + 1; qu.push(o); } }); }
      downI = 0; for (i = 0; i < n; i++) if ((dist[i] || 0) > (dist[downI] || 0)) downI = i;
      var extra = []; for (i = 0; i < n; i++) [[1, 0], [0, 1]].forEach(function (d) { var o = idx[(at[i][0] + d[0]) + "," + (at[i][1] + d[1])]; if (o != null && !tree[i + "-" + o]) extra.push([i, o]); });
      if (extra.length) { var x = extra[rint(0, extra.length - 1)]; chain(x[0], x[1], "secret"); }
    } else if (shape === "회오리") {
      var w = Math.ceil(Math.sqrt(n)), h = Math.ceil(n / w), l = 0, t = 0, r = w - 1, b = h - 1, sp = [], xx, yy;
      while (l <= r && t <= b) { for (xx = l; xx <= r; xx++) sp.push([xx, t]); for (yy = t + 1; yy <= b; yy++) sp.push([r, yy]); if (t < b) for (xx = r - 1; xx >= l; xx--) sp.push([xx, b]); if (l < r) for (yy = b - 1; yy > t; yy--) sp.push([l, yy]); l++; t++; r--; b--; }
      for (i = 0; i < n; i++) { at[i] = sp[i]; if (i) chain(i - 1, i); }
    } else {
      for (i = 0; i < n; i++) { var row = Math.floor(i / 4), c = i % 4; at[i] = [row % 2 ? 3 - c : c, row]; if (i) chain(i - 1, i); }
    }
    return { at: at, links: links, inI: inI, downI: downI };
  }
  /* 층 하나를 새로 만든다. last = 마지막 층(끝방), mid = 중간 보스가 내림목을 지킨다, fi = 몇 번째 층 */
  function makeFloor(shape, n, opt) {
    var L = layout(shape, n), pool = (NAMES_K[opt.kind] || NAMES[opt.set] || []).slice(), ids = [], zones = [], i;
    var bag = ["전투"]; if (n >= 5) bag.push("함정"); bag.push("조사"); if (opt.fi > 0 && n >= 4) bag.push("쉼터"); if (n >= 6) bag.push("관문");
    while (bag.length < n) bag.push(Math.random() < .5 ? "전투" : "빈 곳");
    bag = shuffle(bag.slice(0, n));
    for (i = 0; i < n; i++) ids.push(zid());
    for (i = 0; i < n; i++) {
      var z = { id: ids[i], n: "", k: bag[i], e: "", at: L.at[i] };
      if (i === L.inI) { z["in"] = 1; z.k = "빈 곳"; }
      if (i === L.downI) { if (opt.last) { z.end = 1; z.k = "보스"; z.e = "최종 보스."; } else { z.down = 1; z.k = opt.mid ? "보스" : "관문"; if (opt.mid) z.e = "중간 보스."; } }
      if (z.k === "전투" || z.k === "보스") z.f = opt.set || "";
      zones.push(z);
    }
    /* 이름: 들머리가 첫 이름, 끝이 마지막 이름 */
    var first = pool.shift(), lastN = pool.pop(); pool = shuffle(pool);
    zones.forEach(function (z, i2) { z.n = z["in"] ? (first || "들머리") : (z.end || z.down) ? (z.end ? (lastN || "끝방") : (pool.pop() || "내림목")) : (pool.pop() || "구역 " + (i2 + 1)); });
    return { n: (opt.fi + 1) + "층", shape: shape, zones: zones, links: L.links.map(function (l) { return [ids[l[0]], ids[l[1]], l[2]]; }) };
  }
  function makeDungeon(kind, name) {
    var sc = SCALE[kind] || [2, 4, 6, "갈림"], set = setFor(kind, name), d = { kind: kind, dir: DIROF[kind] || "내려감", mist: "1d4+1", floors: [] };
    for (var i = 0; i < sc[0]; i++) d.floors.push(makeFloor(i === sc[0] - 1 && sc[0] > 1 && sc[3] !== "일자" ? (sc[3] === "회오리" ? "회오리" : sc[3]) : sc[3], rint(sc[1], sc[2]), { set: set, kind: kind, fi: i, last: i === sc[0] - 1, mid: sc[0] >= 2 && i === sc[0] - 2 }));
    return d;
  }

  /* ── 그림: 층 구역도 ── */
  function floorSvg(fl, sel) {
    var CW = 150, CH = 92, maxX = 0, maxY = 0, P = {}, o = "";
    fl.zones.forEach(function (z) { maxX = Math.max(maxX, z.at[0]); maxY = Math.max(maxY, z.at[1]); P[z.id] = [z.at[0] * CW + CW / 2, z.at[1] * CH + CH / 2]; });
    var W = (maxX + 1) * CW, H = (maxY + 1) * CH;
    fl.links.forEach(function (l) {
      var a = P[l[0]], b = P[l[1]]; if (!a || !b) return;
      var st = l[2] === "rough" ? ' stroke-dasharray="9 6"' : l[2] === "secret" ? ' stroke-dasharray="2 6"' : l[2] === "qing" ? ' stroke-dasharray="16 5 3 5"' : "";
      o += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (l[2] === "water" ? "#4d7fa3" : l[2] === "secret" ? "#7a2318" : "#5a5346") + '" stroke-width="4"' + st + (l[2] === "one" ? ' marker-end="url(#dgarr)"' : "") + "/>";
    });
    fl.zones.forEach(function (z) {
      var p = P[z.id], on = z.id === sel, mark = z["in"] ? "들머리" : z.down ? "내림목" : z.end ? "끝방" : "";
      o += '<g class="dg-node" data-dgz="' + e(z.id) + '" tabindex="0" role="button" aria-label="' + e(z.n + " " + z.k) + '"><rect x="' + (p[0] - 62) + '" y="' + (p[1] - 30) + '" width="124" height="60" rx="8" fill="#f4eede" stroke="' + (on ? "#1a1a1a" : KCOL[z.k] || "#888") + '" stroke-width="' + (on ? 5 : 3) + '"/>' +
        '<rect x="' + (p[0] - 62) + '" y="' + (p[1] - 30) + '" width="124" height="18" rx="8" fill="' + (KCOL[z.k] || "#888") + '"/><text x="' + p[0] + '" y="' + (p[1] - 17) + '" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">' + e(z.k + (mark ? " · " + mark : "")) + "</text>" +
        '<text x="' + p[0] + '" y="' + (p[1] + 12) + '" text-anchor="middle" font-size="14" fill="#1a1a1a">' + e(z.n.length > 9 ? z.n.slice(0, 8) + "…" : z.n) + "</text></g>";
    });
    return '<svg class="dg-map" viewBox="0 0 ' + W + " " + H + '" style="max-width:' + Math.max(W, 300) + 'px" font-family="sans-serif"><defs><marker id="dgarr" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#5a5346"/></marker></defs>' + o + "</svg>";
  }
  function mapOf(z) { var f = F(); if (!f) return null; if (z.m && z.m.length === 6) return f.parse(z.m); var s = z.f && f.setOf(z.f); return s && s.id === z.f ? f.parse(s.maps[0].rows) : null; }

  /* ── 화면 ── */
  function opts(list, cur, labels) { return list.map(function (v, i) { return '<option value="' + e(v) + '"' + (v === cur ? " selected" : "") + ">" + e(labels ? labels[i] : v) + "</option>"; }).join(""); }
  function fld(label, inner, cls) { return '<div class="field' + (cls ? " " + cls : "") + '"><label>' + label + inner + "</label></div>"; }
  function summary(d) { if (!d || !d.floors || !d.floors.length) return ""; var n = 0, boss = 0; d.floors.forEach(function (f) { n += f.zones.length; f.zones.forEach(function (z) { if (z.k === "보스") boss++; }); }); return d.floors.length + "층 · 구역 " + n + " · 보스 " + boss; }
  function editor(key) {
    var d = ST.ed, zi = zoneOf(key), fl = d.floors[ST.fl], f = F();
    var h = '<div class="dg-ed"><div class="gm-bar">' +
      fld("종류", '<input data-dgf="d.kind" value="' + e(d.kind || "") + '" size="6">') +
      fld("방향", '<select data-dgf="d.dir">' + opts(DIRS, d.dir) + "</select>") +
      fld("마기 한계", '<select data-dgf="d.mist">' + opts(["1d4+1", "1d4", "1d4+2"], d.mist) + "</select>") +
      '<button type="button" class="btn small" data-dg="auto">통째로 새로 짜기</button><button type="button" class="btn small primary" data-dg="save">저장</button><button type="button" class="btn small" data-dg="md">문서로 복사</button>' +
      (stored(key) ? '<button type="button" class="btn small danger" data-dg="del">' + (ST.del ? "한 번 더 누르면 지움" : "저장한 것 지우기") + "</button>" : "") +
      '<span class="gm-saved" role="status">' + e(ST.msg || (ST.dirty ? "저장하지 않은 변경이 있어요" : "")) + "</span></div>" +
      '<nav class="subtabs dg-floors" aria-label="층">' + d.floors.map(function (x, i) { return '<a href="#gm" data-dg="floor:' + i + '"' + (i === ST.fl ? ' aria-current="page"' : "") + ">" + (i + 1) + "층 " + e(x.n) + "</a>"; }).join("") + '<a href="#gm" data-dg="addfloor">+ 층 추가</a></nav>';
    if (!fl) return h + '<p class="hint">아직 층이 없어요. \'통째로 새로 짜기\'나 \'층 추가\'를 누르세요.</p></div>';
    h += '<div class="gm-bar">' + fld("층 이름", '<input data-dgf="f.n" value="' + e(fl.n) + '">') + fld("모양", '<select data-dgf="f.shape">' + opts(SHAPES, fl.shape) + "</select>") +
      fld("구역 수", '<input type="number" min="2" max="9" id="dg-n" value="' + fl.zones.length + '" style="width:4.5em">') +
      fld("이 층 마기 한계", '<select data-dgf="f.mist">' + opts(["", "1d4+1", "1d4", "1d4+2"], fl.mist || "", ["던전과 같음", "1d4+1", "1d4", "1d4+2"]) + "</select>") +
      '<button type="button" class="btn small" data-dg="relay">이 모양으로 다시 깔기</button><button type="button" class="btn small danger" data-dg="delfloor">층 지우기</button></div>' +
      '<p class="hint">\'다시 깔기\'는 이 층의 구역과 길을 새로 만듭니다(적어 둔 내용은 사라져요). 구역을 눌러 고르세요.</p>' +
      '<div class="dg-cols"><div>' + floorSvg(fl, ST.z) + '<div class="sheet-actions"><button type="button" class="btn small" data-dg="addzone">구역 추가</button></div>' +
      '<h4>길</h4><div class="dg-links">' + fl.links.map(function (l, i) {
        var zo = fl.zones.map(function (z) { return z.id; }), zl = fl.zones.map(function (z) { return z.n; });
        return '<div class="dg-link"><select data-dgl="' + i + ':0" aria-label="길의 한쪽">' + opts(zo, l[0], zl) + '</select><select data-dgl="' + i + ':2" aria-label="길 종류">' + opts(Object.keys(LINKS), l[2], Object.keys(LINKS).map(function (k) { return LINKS[k]; })) + '</select><select data-dgl="' + i + ':1" aria-label="길의 다른 쪽">' + opts(zo, l[1], zl) + '</select><button type="button" class="btn small danger" data-dg="dellink:' + i + '" aria-label="길 지우기">×</button></div>';
      }).join("") + '</div><div class="sheet-actions"><button type="button" class="btn small" data-dg="addlink">길 추가</button></div><p class="hint">일방은 왼쪽 구역에서 오른쪽 구역으로만 갑니다.</p></div>';
    var z = fl.zones.filter(function (x) { return x.id === ST.z; })[0];
    if (!z) h += '<div class="dg-zone"><p class="hint">구역을 누르면 여기서 고칩니다.</p></div>';
    else {
      var mark = z["in"] ? "in" : z.down ? "down" : z.end ? "end" : "", fight = z.k === "전투" || z.k === "보스", mp = fight ? mapOf(z) : null, set = f && z.f ? f.setOf(z.f) : null;
      h += '<div class="dg-zone"><div class="gm-bar">' + fld("이름", '<input data-dgf="z.n" value="' + e(z.n) + '">') + fld("내용", '<select data-dgf="z.k">' + opts(KINDS, z.k) + "</select>") +
        fld("표지", '<select data-dgf="z.mark">' + opts(["", "in", "down", "end"], mark, ["없음", "들머리", "내림목", "끝방"]) + "</select>") +
        fld("열", '<input type="number" min="0" max="8" data-dgf="z.x" value="' + z.at[0] + '" style="width:4em">') + fld("행", '<input type="number" min="0" max="8" data-dgf="z.y" value="' + z.at[1] + '" style="width:4em">') + "</div>" +
        fld("일어나는 일(설명·판정)", '<textarea data-dgf="z.e" rows="4">' + e(z.e || "") + "</textarea>", "wide") +
        (fight ? fld("에너미", '<textarea data-dgf="z.foes" rows="3">' + e(z.foes || "") + "</textarea>", "wide") : "") +
        (fight && f ? '<div class="gm-bar">' + fld("전장도 묶음", '<select data-dgf="z.f">' + opts([""].concat(f.sets.map(function (s) { return s.id; })), z.f || "", ["정하지 않음"].concat(f.sets.map(function (s) { return s.n; }))) + "</select>") +
          (set && set.id === z.f ? fld("묶음의 맵", '<select data-dgf="z.pick">' + opts(["", "0", "1", "2"].slice(0, set.maps.length + 1), "", ["골라서 넣기"].concat(set.maps.map(function (m) { return m.n; }))) + "</select>") + '<button type="button" class="btn small" data-dg="genmap">무작위 맵</button>' : "") +
          (mp ? '<button type="button" class="btn small" data-dg="png">PNG 저장</button>' : "") + "</div>" +
          fld("전용 맵 코드(6줄 × 6글자. 비우면 묶음의 첫 맵)", '<textarea data-dgf="z.m" rows="6" class="dg-code" spellcheck="false">' + e((z.m || []).join("\n")) + "</textarea>", "wide") +
          (mp ? '<div class="dg-thumb">' + f.svg(mp, set || f.sets[0], { titles: true }) + "</div>" : "") +
          '<p class="hint">맵을 칸 단위로 고치려면 <a href="#map-f' + (z.f ? "-" + e(z.f) : "") + '">전장도</a>에서 고친 뒤 \'맵 코드 복사\'로 가져와 붙여 넣으세요(저장을 먼저 하세요).</p>' : "") +
        '<div class="sheet-actions"><button type="button" class="btn small danger" data-dg="delzone">이 구역 지우기</button></div></div>';
    }
    var loot = CTX.gm.gibo.filter(function (r) { return zi.m && r.map === zi.m.id && r.zone === zi.z.id; }).map(function (r) { return r.n; });
    return h + "</div>" + '<p class="hint">보상(기보 탭에서 이 던전에 둔 것): ' + (loot.length ? e(loot.join(" · ")) : "아직 없음") + ". 전투 크기: 보스 없는 구역은 쉬운(PC 경지 단계 합의 절반), 중간 보스는 보통, 최종 보스는 어려운(1.5배).</p></div>";
  }
  function html(ctx) {
    CTX = ctx; var out = [];
    ctx.maps().forEach(function (m) { m.zones.forEach(function (z) {
      if (!z.dg) return;
      var key = m.id + "~" + z.id, sd = stored(key), seed = SEED[key], open = ST.open === key;
      var items = ctx.gm.gibo.filter(function (r) { return r.map === m.id && r.zone === z.id; }), npcs = ctx.gm.npc.filter(function (n) { return n.map === m.id && n.zone === z.id; });
      out.push('<article class="gm-dg' + (open ? " open" : "") + '"><div><b>' + e(z.n) + '</b> <span class="gm-meta">' + e(m.name) + " · " + e(z.dg) + "</span></div>" +
        '<p class="hint">' + e(z.e || "") + "</p>" +
        '<p><span class="lbl">짜임</span> ' + (sd ? e(summary(sd)) : seed ? e(summary(seed)) + ' <span class="hint">(기본 제공)</span>' : '<span class="hint">아직 안 짬</span>') + "</p>" +
        '<p><span class="lbl">보상</span> ' + (items.length ? items.map(function (r) { return e(r.n); }).join(" · ") : '<span class="hint">아직 없음</span>') + "</p>" +
        (npcs.length ? '<p><span class="lbl">지키는 자</span> ' + npcs.map(function (n) { return e(n.n); }).join(" · ") + "</p>" : "") +
        '<div class="sheet-actions"><button type="button" class="btn small' + (open ? " primary" : "") + '" data-dg="open:' + e(key) + '">' + (open ? "닫기" : sd || seed ? "열어서 고치기" : "던전 짜기") + '</button><a class="btn small" href="' + ctx.mapHref(m) + '">강호도에서 보기</a></div>' +
        (open && ST.ed ? editor(key) : "") + "</article>");
    }); });
    return '<div class="gm-dgs dg-list">' + out.join("") + "</div>";
  }

  /* ── 문서로 내보내기 ── */
  function toMd(key) {
    var d = ST.ed, zi = zoneOf(key), f = F(), o = ["# 던전 — " + zi.z.n, "", "- 자리: " + zi.m.name + " 구역도의 " + zi.z.n, "- 종류·방향: " + (d.kind || "") + " · " + d.dir, "- 마기 한계: " + d.mist, ""];
    d.floors.forEach(function (fl, i) {
      var N = {}; fl.zones.forEach(function (z) { N[z.id] = z.n; });
      o.push("## " + (i + 1) + "층 " + fl.n + " — " + fl.shape + (fl.mist ? " (마기 한계 " + fl.mist + ")" : ""), "", "| 구역 | 내용 | 일어나는 일 | 에너미 | 전장도 |", "|---|---|---|---|---|");
      fl.zones.forEach(function (z) { var mark = z["in"] ? " (들머리)" : z.down ? " (내림목)" : z.end ? " (끝방)" : ""; o.push("| " + z.n + mark + " | " + z.k + " | " + (z.e || "").replace(/\n/g, " ") + " | " + (z.foes || "").replace(/\n/g, " ") + " | " + (z.m ? "전용" : z.f && f ? f.setOf(z.f).n : "") + " |"); });
      o.push("", "길: " + fl.links.map(function (l) { return N[l[0]] + (l[2] === "one" ? " → " : " — ") + N[l[1]] + "(" + LINKS[l[2]] + ")"; }).join(", "), "");
      fl.zones.forEach(function (z) { if (z.m) o.push(z.n + " 전용 전장도:", "```", z.m.join("\n"), "```", ""); });
    });
    return o.join("\n");
  }

  /* ── 손질 ── */
  function touch() { ST.dirty = true; ST.msg = ""; ST.del = false; }
  function curFloor() { return ST.ed && ST.ed.floors[ST.fl]; }
  function curZone() { var fl = curFloor(); return fl && fl.zones.filter(function (x) { return x.id === ST.z; })[0]; }
  function setMark(fl, z, v) {
    ["in", "down", "end"].forEach(function (k) { delete z[k]; });
    if (v) { fl.zones.forEach(function (o) { delete o[v]; if (v === "down") delete o.end; if (v === "end") delete o.down; }); z[v] = 1; }
  }
  function onChange(ev) {
    var t = ev.target; if (!ST.ed) return false;
    if (t.dataset.dgl) { var p = t.dataset.dgl.split(":"), fl0 = curFloor(); fl0.links[+p[0]][+p[1]] = t.value; touch(); CTX.redraw(); return true; }
    var k = t.dataset.dgf; if (!k) return false;
    var d = ST.ed, fl = curFloor(), z = curZone(), v = t.value, re = false;
    if (k === "d.kind") d.kind = v; else if (k === "d.dir") d.dir = v; else if (k === "d.mist") d.mist = v;
    else if (k === "f.n") { fl.n = v; re = true; } else if (k === "f.shape") fl.shape = v; else if (k === "f.mist") { if (v) fl.mist = v; else delete fl.mist; }
    else if (z && k === "z.n") { z.n = v; re = true; } else if (z && k === "z.k") { z.k = v; if ((v === "전투" || v === "보스") && !z.f) z.f = setFor(d.kind, z.n); re = true; }
    else if (z && k === "z.mark") { setMark(fl, z, v); re = true; }
    else if (z && (k === "z.x" || k === "z.y")) { var n = Math.max(0, Math.min(8, Math.round(+v) || 0)); z.at = k === "z.x" ? [n, z.at[1]] : [z.at[0], n]; re = true; }
    else if (z && k === "z.e") z.e = v; else if (z && k === "z.foes") z.foes = v;
    else if (z && k === "z.f") { z.f = v; re = true; }
    else if (z && k === "z.pick") { var s = F().setOf(z.f); if (v !== "" && s.maps[+v]) z.m = s.maps[+v].rows.slice(); re = true; }
    else if (z && k === "z.m") { var rows = v.split(/\r?\n/).map(function (r) { return r.replace(/\s/g, ""); }).filter(Boolean); if (!rows.length) delete z.m; else if (rows.length === 6 && rows.every(function (r) { return r.length === 6; })) z.m = rows; else { ST.msg = "맵 코드는 6줄, 줄마다 6글자여야 해요"; CTX.redraw(); return true; } re = true; }
    else return false;
    touch(); if (re) CTX.redraw(); else { var s2 = document.querySelector(".dg-ed .gm-saved"); if (s2) s2.textContent = "저장하지 않은 변경이 있어요"; }
    return true;
  }
  function onClick(ev) {
    var node = ev.target.closest("[data-dgz]");
    if (node && ST.ed) { ST.z = node.dataset.dgz; CTX.redraw(); return true; }
    var b = ev.target.closest("[data-dg]"); if (!b) return false;
    ev.preventDefault();
    var a = b.dataset.dg, arg = a.indexOf(":") > 0 ? a.slice(a.indexOf(":") + 1) : "", act = a.split(":")[0], d = ST.ed, fl = curFloor(), z = curZone(), key = ST.open, zi;
    if (act === "open") {
      if (ST.open === arg) { if (ST.dirty && b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "저장 안 한 변경을 버리고 닫기"; return true; } ST.open = ""; ST.ed = null; }
      else { ST.open = arg; ST.ed = clone(stored(arg) || SEED[arg] || { kind: zoneOf(arg).z.dg, dir: DIROF[zoneOf(arg).z.dg] || "내려감", mist: "1d4+1", floors: [] }); ST.fl = 0; ST.z = ""; }
      ST.dirty = false; ST.msg = ""; ST.del = false; CTX.redraw(); return true;
    }
    if (!d) return true;
    zi = zoneOf(key);
    if (act === "floor") { ST.fl = +arg; ST.z = ""; }
    else if (act === "auto") { if (d.floors.length && b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "지금 짜임을 버리고 새로 짜기"; return true; } var nd = makeDungeon(d.kind || zi.z.dg, zi.z.n); d.floors = nd.floors; d.dir = nd.dir; ST.fl = 0; ST.z = ""; touch(); }
    else if (act === "addfloor") { var last = d.floors[d.floors.length - 1]; if (last) last.zones.forEach(function (o) { if (o.end) { delete o.end; o.down = 1; } }); d.floors.push(makeFloor((SCALE[d.kind] || [0, 0, 0, "갈림"])[3], rint(4, 6), { set: setFor(d.kind, zi.z.n), kind: d.kind, fi: d.floors.length, last: true })); ST.fl = d.floors.length - 1; ST.z = ""; touch(); }
    else if (act === "delfloor" && fl) { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "한 번 더 누르면 지움"; return true; } d.floors.splice(ST.fl, 1); ST.fl = Math.max(0, ST.fl - 1); ST.z = ""; touch(); }
    else if (act === "relay" && fl) { var n = Math.max(2, Math.min(9, +document.getElementById("dg-n").value || fl.zones.length)), isLast = ST.fl === d.floors.length - 1, nf = makeFloor(fl.shape, n, { set: setFor(d.kind, zi.z.n), kind: d.kind, fi: ST.fl, last: isLast, mid: !isLast && ST.fl === d.floors.length - 2 }); nf.n = fl.n; if (fl.mist) nf.mist = fl.mist; d.floors[ST.fl] = nf; ST.z = ""; touch(); }
    else if (act === "addzone" && fl) { var mx = 0, my = 0; fl.zones.forEach(function (o) { my = Math.max(my, o.at[1]); }); fl.zones.forEach(function (o) { if (o.at[1] === my) mx = Math.max(mx, o.at[0] + 1); }); var nz = { id: zid(), n: "새 구역", k: "빈 곳", e: "", at: [Math.min(mx, 8), my] }; fl.zones.push(nz); ST.z = nz.id; touch(); }
    else if (act === "delzone" && fl && z) { fl.zones = fl.zones.filter(function (o) { return o !== z; }); fl.links = fl.links.filter(function (l) { return l[0] !== z.id && l[1] !== z.id; }); ST.z = ""; touch(); }
    else if (act === "addlink" && fl && fl.zones.length > 1) { fl.links.push([ST.z || fl.zones[0].id, fl.zones[fl.zones[0].id === ST.z ? 1 : fl.zones.length - 1].id, "road"]); touch(); }
    else if (act === "dellink" && fl) { fl.links.splice(+arg, 1); touch(); }
    else if (act === "genmap" && z && F()) { z.m = F().toRows(F().generate(F().setOf(z.f))); touch(); }
    else if (act === "png" && z && F()) { var mp = mapOf(z); if (mp) F().savePng(mp, F().setOf(z.f || "cave"), zi.z.n + "-" + z.n, true); return true; }
    else if (act === "md") { var txt = toMd(key); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { ST.msg = "문서(마크다운)로 복사했어요"; CTX.redraw(); }, function () { ST.msg = "복사하지 못했어요"; CTX.redraw(); }); return true; }
    else if (act === "save") {
      if (!CTX.db) return true;
      var bad = ""; d.floors.forEach(function (f2, i) { if (!f2.zones.some(function (o) { return o["in"]; })) bad = (i + 1) + "층에 들머리가 없어요"; else if (!f2.zones.some(function (o) { return o.down || o.end; })) bad = (i + 1) + "층에 내림목이나 끝방이 없어요"; });
      ST.msg = "저장하는 중…"; CTX.redraw();
      CTX.db.collection(CTX.col).doc(docId(key)).set({ kind: "dungeon", map: zi.m.id, zone: zi.z.id, n: zi.z.n, j: JSON.stringify(d), at: Date.now() })
        .then(function () { ST.dirty = false; ST.msg = "저장했어요" + (bad ? " (" + bad + ")" : ""); CTX.redraw(); }, function (err) { ST.msg = "저장하지 못했어요 (" + (err && err.code || "오류") + ")"; CTX.redraw(); });
      return true;
    }
    else if (act === "del") {
      if (!ST.del) { ST.del = true; CTX.redraw(); return true; }
      CTX.db.collection(CTX.col).doc(docId(key)).delete().then(function () { ST.open = ""; ST.ed = null; ST.del = false; CTX.redraw(); }, function (err) { ST.msg = "지우지 못했어요 (" + (err && err.code || "오류") + ")"; CTX.redraw(); });
      return true;
    }
    CTX.redraw(); return true;
  }
  window.WX_DG = { html: html, onClick: onClick, onChange: onChange, isDoc: function (d) { return d && (d.kind === "dungeon" || /^dg-/.test(d.id || "")); }, make: makeDungeon, layout: layout, seed: SEED, toMd: toMd, state: ST };
})();
