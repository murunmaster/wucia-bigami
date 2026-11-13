/* 전장도(戰場圖): 6×6 전투 격자맵. 룰북 '전투 → 지형'의 기호를 그대로 쓴다.
   맵 원본 = 6줄 × 6글자(지형 기호. 시작 칸은 A·B). 이 원본 하나에서 화면 그림(SVG)과 코코포리아용 PNG를 함께 만든다.
   던전메이커(GM 서고)도 window.WX_FIELD를 쓴다. */
(function () {
  "use strict";
  var N = 6, C = 150;
  function A() { return window.WX_SIM_API; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ── 지형: 기호 → [이름, 효과, 던전 전용] ── */
  var TERR = {
    ".": ["평지", "효과 없음."],
    "#": ["장애물", "들어가거나 지나갈 수 없다. 같은 가로줄·세로줄 사이에 있으면 공격 무공의 대상으로 고를 수 없다(보조 무공과 대각선은 막지 않는다). 밀려나다 부딪히면 그 앞 칸에서 멈춘다."],
    "~": ["험지", "이 칸에 들어갈 때 이동 2칸이 든다."],
    "c": ["엄폐", "이 칸의 캐릭터를 노린 사격전 공격의 명중 판정에 불리점 1."],
    "b": ["수풀", "이 칸에서 하는 은신 판정에 유리점 1."],
    "w": ["수면", "들어가면 그 라운드 이동이 끝난다. 수면에 있는 캐릭터는 수중 전장의 효과를 받는다."],
    "^": ["고지", "고지에서 고지가 아닌 칸을 노린 사격전은 간격 +1. 아래에서 올라올 때는 험지로 친다."],
    "v": ["분지", "분지에서 분지가 아닌 칸을 노린 사격전은 간격 −1. 밖으로 나갈 때는 험지로 친다."],
    "!": ["위험지", "라운드가 끝날 때 이 칸에 있는 캐릭터는 집단전을 받는다."],
    "T": ["함정", "발견 전에는 평지로 보인다. 들어가면 집단전을 받고 그 라운드 이동이 끝난다. 한 번 터지면 평지가 된다.", 1],
    "D": ["문", "닫혀 있으면 장애물이다. 인접한 캐릭터가 자기 턴에 열거나 닫는다.", 1],
    "=": ["다리·잔도", "평지처럼 다닌다. 여기서 낭떠러지 쪽으로 밀리면 떨어진다.", 1],
    "_": ["낭떠러지", "들어갈 수 없고 시야는 막지 않는다. 떨어지면 접근전 1점을 받고 다음 라운드 시작에 가까운 평지로 돌아온다.", 1],
    "i": ["얼음", "이 칸에서 이동을 마치면 온 방향으로 1칸 더 미끄러진다.", 1]
  };
  var BLOCK = { "#": 1, "_": 1 };
  /* 구역 성격(zones.js의 t, 이름) → 묶음. 앞에 있는 것부터 맞춰 본다 */
  var ZMAP = [["ruin", /폐허|고분|능묘|무덤|옛 절|폐사|옛 도읍|옛 성터|기관|미로/], ["snow", /설산|설원|빙하|빙|얼음/], ["cave", /석굴|동굴|굴$|비동/], ["cliff", /벼랑|잔도|봉우리|정상|절벽|능선|돌계단|바위|언덕|다리/],
    ["water", /수상|갈대|호수|바다|뱃길|늪|수중/], ["shore", /수변|나루|강|운하|항구|섬|폭포|물가|제방|해구|해안$|온천|샘|^항$|밀무역/], ["gate", /관문|성채|성벽|산채|폐성|성문|장성/], ["temple", /사찰|도관|사당|탑|절|연무장|궁|산문|성지|서원|승원|비석/],
    ["inn", /객잔|저택|장원|기루|누각|감옥|본가|본거지|객관|서각|역참|학당|약원|원림|정자/], ["village", /촌락|마을|천막/], ["waste", /황야|초원|사막|싸움터/], ["wild", /산야|산림|숲|협곡|산악|명산|고개|계곡|차밭|험로|산/], ["street", /시가|관청|저자|유흥|고을|도읍|도성|시장|성도|야간|야외|관도|입구|^벽$/]];
  function setForZone(t, name) {
    var a = String(t || ""), b = String(name || ""), i;
    for (i = 0; i < ZMAP.length; i++) if (ZMAP[i][1].test(a)) return ZMAP[i][0];
    for (i = 0; i < ZMAP.length; i++) if (ZMAP[i][1].test(b)) return ZMAP[i][0];
    return "";
  }

  /* ── 묶음: 구역 성격별. floor = 바닥색, obs = 장애물의 생김새, gen = 무작위 생성 때 쓰는 지형과 비중, maps = 손으로 만든 맵 ── */
  var SETS = [
    { id: "street", n: "시가·저자", z: "성도, 시가, 저자, 유흥가, 관청 앞", floor: "#d9d0bd", obs: "수레·담장", gen: { "#": 4, c: 3, "~": 1 },
      maps: [{ n: "저잣거리", rows: ["A.#..B", "A.c...", "...#.B", "A.#...", "...c.B", "A..#.B"], memo: "좌판과 수레가 길을 끊는다." }, { n: "네거리", rows: ["A.#..B", "A....B", "..c#..", "..#c..", "A....B", "A..#.B"], memo: "길 넷이 만나는 자리. 가운데가 막혀 돌아가야 한다." }, { n: "관아 앞", rows: ["A#..#B", "A....B", "A.cc.B", "A....B", "A....B", ".#..#."], memo: "돌사자 넷, 가운데 하마비가 엄폐." }] },
    { id: "inn", n: "객잔·저택", z: "관도 객잔, 저택, 기루, 본가 내원", floor: "#cbb898", obs: "기둥·탁자", gen: { "#": 4, c: 4 },
      maps: [{ n: "객잔 대청", rows: ["A.c..B", "A#..#.", "..c..B", "A..c..", ".#..#B", "A..c.B"], memo: "기둥 넷, 엎은 탁자가 엄폐." }, { n: "뒤뜰", rows: ["A.b..B", "A.#..B", "..c.c.", "A....B", "A..#.B", ".b...B"], memo: "장독대와 우물, 담 밑 수풀." }, { n: "연회장", rows: ["A.c.c.", "A....B", "A#..#B", "A#..#B", "A....B", ".c.c.B"], memo: "가운데가 트인 큰 방. 기둥 넷." }] },
    { id: "temple", n: "사찰·도관", z: "사찰, 도관, 사당, 탑전, 본산 대전", floor: "#d3cab6", obs: "향로·석등", gen: { "#": 3, "^": 3, c: 2 },
      maps: [{ n: "대전 앞마당", rows: ["A..^^B", "A.#^^B", "A....B", "A....B", "A.#^^B", "...^^."], memo: "가운데 길 양옆이 섬돌 위 고지." }, { n: "탑 아래", rows: ["A....B", "A.c..B", "..##..", "..##..", "A..c.B", "A....B"], memo: "가운데 탑이 시야를 끊는다." }, { n: "산문 돌계단", rows: ["A..^^B", "A..^^B", "A.#^^B", "A..^^B", "A.c^^B", "...^^."], memo: "지키는 쪽(을)이 계단 위에 선다." }] },
    { id: "village", n: "촌락", z: "촌락, 천막촌, 절 마을", floor: "#d0c8a5", obs: "초가·우물", gen: { "#": 3, c: 2, b: 2, "~": 2 },
      maps: [{ n: "마을 어귀", rows: ["A.b#.B", "A....B", "..#c..", "A.c...", "A...~B", ".b.#.B"], memo: "초가 사이 고샅길." }, { n: "우물가", rows: ["A.#..B", "A...cB", "..#..B", "A.~b..", "A..#.B", "b....."], memo: "초가 셋과 우물." }, { n: "논두렁", rows: ["A.~~.B", "A.~~.B", "A....B", "..c...", "A.~~.B", ".b~~.B"], memo: "무논이 험지. 두렁길로만 빠르게 지난다." }] },
    { id: "wild", n: "산야·숲", z: "산야, 숲, 협곡, 산길", floor: "#bcc7a2", obs: "바위·고목", gen: { b: 4, "#": 3, "~": 3, "^": 2 },
      maps: [{ n: "숲속 빈터", rows: ["Ab.#.B", "A..b~B", ".#...B", "A...#.", "A~b..B", "..#.b."], memo: "수풀이 많아 매복하기 좋다." }, { n: "산등성이", rows: ["A.^^.B", "A~^^.B", "..#...", "...#..", "A.^^~B", "A.^^.B"], memo: "등성이를 먼저 잡는 쪽이 유리하다." }, { n: "대숲", rows: ["AbbbbB", "A.b.b.", "...#.B", "A#....", "Ab.b.B", ".bbbbB"], memo: "어디서든 숨는다." }] },
    { id: "shore", n: "수변·나루", z: "나루, 물가, 강가, 호숫가", floor: "#d2cbad", obs: "짐더미·말뚝", gen: { w: 5, "#": 2, c: 2 },
      maps: [{ n: "나루터", rows: ["A.#.wB", "A...ww", "A.c.=B", "...#.B", "A.wwwB", "..www."], memo: "물이 판을 파고든다. 잔교 하나." }, { n: "강변 자갈밭", rows: ["wwwwww", "A.~..B", "A.#..B", "A..c.B", "A.~..B", "Awww.B"], memo: "위아래가 강물." }, { n: "선착장", rows: ["A...wB", "A.c.=B", "A#..ww", "A..c.B", "A....B", "..#..B"], memo: "배 댄 자리. 잔교 하나." }] },
    { id: "water", n: "수상·갈대", z: "수상, 갈대숲, 뗏목길, 배 위", floor: "#c3cdb8", obs: "돛대·선실", gen: { w: 7, b: 3, "#": 1 },
      maps: [{ n: "갈대숲 뱃길", rows: ["Abww.B", "A.wwbB", "..b.w.", "Aw..b.", "Awwb.B", ".bww.B"], memo: "마른 땅이 띄엄띄엄 있다." }, { n: "뗏목 위", rows: ["wwwwww", "wA..Bw", "wA#.Bw", "wA.#Bw", "wA..Bw", "wwwwww"], memo: "사방이 물인 좁은 판. 밀리면 빠진다." }, { n: "수초 늪", rows: ["Ab.wwB", "A..w.B", "..~b..", "..b~..", "A.w..B", "Aww.bB"], memo: "물과 뻘과 수풀이 섞였다." }] },
    { id: "cliff", n: "벼랑·잔도", z: "벼랑, 잔도, 봉우리, 정상", floor: "#c6c0b2", obs: "암벽", gen: { "_": 5, "=": 2, "^": 2, "#": 2 },
      maps: [{ n: "벼랑 잔도", rows: ["A.#__B", "A.==.B", "..__..", "A.__#.", "A.==.B", "..__.B"], memo: "잔도 둘로만 건넌다. 밀리면 떨어진다." }, { n: "외나무다리", rows: ["A.__.B", "A.__.B", "A.==.B", "A.__.B", "A.__.B", "..__.."], memo: "다리 하나로만 건넌다." }, { n: "절벽 끝", rows: ["A...^B", "A.#.^B", "A....B", "A..c.B", "______", "______"], memo: "아래쪽이 낭떠러지. 등지면 위험하다." }] },
    { id: "cave", n: "석굴·동굴", z: "석굴, 동굴, 종유굴, 비동", floor: "#aaa49a", obs: "석주·불상", gen: { "#": 4, "~": 3, v: 2, c: 1 },
      maps: [{ n: "종유굴", rows: ["A.#..B", "A~..#B", "..vv..", "A.vv~.", "A#...B", "..~#.B"], memo: "가운데가 꺼진 굴." }, { n: "지하 물길", rows: ["A.#.wB", "A...wB", "..~ww.", "A.ww#.", "A.w..B", "..w~.B"], memo: "굴 속을 물이 가로지른다." }, { n: "석불 동굴", rows: ["A#..#B", "A....B", "..cc..", "A....B", "A#..#B", "A....B"], memo: "석주 넷, 가운데 불단이 엄폐." }] },
    { id: "waste", n: "황야·초원", z: "황야, 초원, 사막, 옛 싸움터", floor: "#d8c99e", obs: "바위", gen: { "~": 3, v: 3, "^": 3, b: 1 },
      maps: [{ n: "모래 언덕", rows: ["A..^^B", "A~.^.B", "..v...", "A.vv~.", "A....B", ".^..~B"], memo: "언덕과 모래 구덩이." }, { n: "마른 강바닥", rows: ["A.vv.B", "A.vv.B", "..vv..", "A.vv~.", "A~vv.B", "..vv.B"], memo: "가운데 골이 분지. 건너려면 내려갔다 올라와야 한다." }, { n: "옛 싸움터", rows: ["A.~..B", "A..#.B", ".c..!.", ".!..c.", "A.#..B", "A..~.B"], memo: "마기가 고인 웅덩이 둘.", hazard: "마기 웅덩이" }] },
    { id: "snow", n: "설원·빙하", z: "설원, 빙하, 얼어붙은 호수", floor: "#e5e9eb", obs: "얼음 기둥", gen: { i: 5, "~": 3, "#": 2 },
      maps: [{ n: "얼어붙은 호수", rows: ["A.~..B", "A.ii.B", ".iii#.", "A#iii.", "A.ii.B", "..~..B"], memo: "가운데가 빙판. 가장자리는 눈더미." }, { n: "눈보라 고개", rows: ["A.~~.B", "A.#..B", "..~~..", "A.~~..", "A..#.B", ".~~..B"], memo: "눈더미가 발을 잡는다." }, { n: "빙벽 아래", rows: ["A.#i.B", "A.ii.B", "A.i^^.", "..i^^B", "A.ii.B", "..#i.B"], memo: "얼음 띠와 바위턱." }] },
    { id: "gate", n: "관문·성벽", z: "관문, 성문, 성벽, 산채", floor: "#c9c3b5", obs: "성벽", gen: { "#": 5, "^": 3, D: 1, c: 2 },
      maps: [{ n: "관문 앞", rows: ["A.c#^B", "A..#^B", "A..D.B", "A..#^B", "..c#^.", "A...^B"], memo: "문 하나, 성벽 위가 고지." }, { n: "성벽 위", rows: ["______", "A.c..B", "A....B", "A.#c.B", "A....B", "______"], memo: "좁고 긴 성가퀴. 양옆이 허공." }, { n: "산채 목책", rows: ["A..#.B", "A..#.B", "A..D.B", "..c#..", "A..#^B", "A..D^B"], memo: "문 둘. 망루가 고지." }] },
    { id: "ruin", n: "폐허·고분", z: "폐허, 고분, 폐사, 기관 미로(던전)", floor: "#b6af9f", obs: "무너진 벽·석관", gen: { "#": 4, T: 2, "~": 2, "!": 1, D: 1 },
      maps: [{ n: "묘실", rows: ["A.#..B", "A.T.#B", "..#D#.", "A....B", "A#.T.B", ".~..!.", ], memo: "함정 둘, 독무 한 칸.", hazard: "독무" }, { n: "무너진 전각", rows: ["A.#~.B", "A....B", ".~#.c.", ".c.#~.", "A....B", "A.~#.B"], memo: "무너진 벽과 기와 더미." }, { n: "기관실", rows: ["A.T..B", "A#.#.B", "..T.D.", "A#.#..", "A..T.B", "..!..B"], memo: "함정 셋, 불 뿜는 구멍 하나.", hazard: "화염 분사구" }] }
  ];

  /* ── 원본 읽기 ── */
  function parse(rows) {
    var g = [], a = [], b = [];
    for (var y = 0; y < N; y++) { g.push([]); for (var x = 0; x < N; x++) { var ch = (rows[y] || "").charAt(x) || "."; if (ch === "A") { a.push([x, y]); ch = "."; } else if (ch === "B") { b.push([x, y]); ch = "."; } if (!TERR[ch]) ch = "."; g[y].push(ch); } }
    return { g: g, a: a, b: b };
  }
  function toRows(m) {
    var rows = m.g.map(function (r) { return r.slice(); });
    m.a.forEach(function (p) { rows[p[1]][p[0]] = "A"; }); m.b.forEach(function (p) { rows[p[1]][p[0]] = "B"; });
    return rows.map(function (r) { return r.join(""); });
  }
  /* 두 진영 시작 칸이 서로 걸어서 닿는가 */
  function connected(m) {
    if (!m.a.length || !m.b.length) return true;
    var seen = {}, q = [m.a[0]]; seen[m.a[0].join()] = 1;
    while (q.length) { var p = q.shift(); for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { if ((dx === 0) === (dy === 0)) continue; var x = p[0] + dx, y = p[1] + dy; if (x < 0 || y < 0 || x >= N || y >= N || seen[x + "," + y] || BLOCK[m.g[y][x]]) continue; seen[x + "," + y] = 1; q.push([x, y]); } }
    return m.a.concat(m.b).every(function (p) { return seen[p.join()]; });
  }
  /* ── 무작위 생성: 묶음의 비중대로 지형을 놓고, 점대칭으로 맞춰 양쪽이 공평하게 한다 ── */
  function generate(set) {
    var keys = Object.keys(set.gen), bag = []; keys.forEach(function (k) { for (var i = 0; i < set.gen[k]; i++) bag.push(k); });
    var CL = { w: 1, "_": 1, "^": 1, v: 1, i: 1 };
    for (var tryN = 0; tryN < 60; tryN++) {
      var g = []; for (var y = 0; y < N; y++) { g.push([]); for (var x = 0; x < N; x++) g[y].push("."); }
      var a = [], b = [], ys = [0, 1, 2, 3, 4, 5].sort(function () { return Math.random() - .5; }).slice(0, 5);
      ys.forEach(function (yy, i) { var xx = i < 4 ? 0 : 1; a.push([xx, yy]); b.push([N - 1 - xx, N - 1 - yy]); });
      var taken = {}; a.concat(b).forEach(function (p) { taken[p.join()] = 1; });
      var want = 2 + Math.floor(Math.random() * 3), last = null;
      for (var k = 0; k < want; k++) {
        var t = bag[Math.floor(Math.random() * bag.length)], x1, y1, ok = false;
        for (var j = 0; j < 30 && !ok; j++) {
          if (CL[t] && last && last.t === t && Math.random() < .8) { x1 = last.x + [-1, 0, 1][Math.floor(Math.random() * 3)]; y1 = last.y + [-1, 0, 1][Math.floor(Math.random() * 3)]; }
          else { x1 = 1 + Math.floor(Math.random() * 4); y1 = Math.floor(Math.random() * N); }
          ok = x1 >= 0 && y1 >= 0 && x1 < N && y1 < N && !taken[x1 + "," + y1] && !taken[(N - 1 - x1) + "," + (N - 1 - y1)] && g[y1][x1] === ".";
        }
        if (!ok) continue;
        g[y1][x1] = t; g[N - 1 - y1][N - 1 - x1] = t; last = { t: t, x: x1, y: y1 };
        if (CL[t] && Math.random() < .7) want++;
        if (want > 5) want = 5;
      }
      var m = { g: g, a: a, b: b };
      var cnt = 0; g.forEach(function (r) { r.forEach(function (c) { if (c !== ".") cnt++; }); });
      if (cnt >= 4 && cnt <= 10 && connected(m)) return m;
    }
    return parse(set.maps[0].rows);
  }

  /* ── 그림(SVG): 화면과 PNG가 같은 그림을 쓴다 ── */
  function shade(hex, d) { var n = parseInt(hex.slice(1), 16), r = (n >> 16) + d, g = ((n >> 8) & 255) + d, b = (n & 255) + d; function c(v) { return Math.max(0, Math.min(255, v)); } return "rgb(" + c(r) + "," + c(g) + "," + c(b) + ")"; }
  function rnd(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function cellArt(ch, x, y, floor) {
    var X = x * C, Y = y * C, R = rnd(x * 7 + y * 13 + ch.charCodeAt(0)), o = "", i;
    function rect(f, extra) { return '<rect x="' + X + '" y="' + Y + '" width="' + C + '" height="' + C + '" fill="' + f + '"' + (extra || "") + "/>"; }
    if (ch === "#") { o += rect(shade(floor, -18)) + '<rect x="' + (X + 14) + '" y="' + (Y + 14) + '" width="' + (C - 28) + '" height="' + (C - 28) + '" rx="14" fill="#4a443b" stroke="#2c2822" stroke-width="5"/>'; for (i = 0; i < 4; i++) o += '<line x1="' + (X + 30 + i * 26) + '" y1="' + (Y + 28) + '" x2="' + (X + 22 + i * 26) + '" y2="' + (Y + C - 28) + '" stroke="#6a6256" stroke-width="4"/>'; }
    else if (ch === "~") { o += rect(shade(floor, -10)); for (i = 0; i < 9; i++) { var px = X + 18 + R() * (C - 36), py = Y + 18 + R() * (C - 36), s = 8 + R() * 9; o += '<polygon points="' + px + "," + (py - s) + " " + (px + s) + "," + (py + s * .7) + " " + (px - s) + "," + (py + s * .7) + '" fill="#7d7466" stroke="#55503f" stroke-width="2"/>'; } }
    else if (ch === "c") { o += rect(floor) + '<rect x="' + (X + 16) + '" y="' + (Y + 52) + '" width="' + (C - 32) + '" height="46" rx="6" fill="#8d7b5c" stroke="#55493a" stroke-width="5"/><line x1="' + (X + 16) + '" y1="' + (Y + 75) + '" x2="' + (X + C - 16) + '" y2="' + (Y + 75) + '" stroke="#55493a" stroke-width="3"/><line x1="' + (X + 56) + '" y1="' + (Y + 52) + '" x2="' + (X + 56) + '" y2="' + (Y + 75) + '" stroke="#55493a" stroke-width="3"/><line x1="' + (X + 94) + '" y1="' + (Y + 75) + '" x2="' + (X + 94) + '" y2="' + (Y + 98) + '" stroke="#55493a" stroke-width="3"/>'; }
    else if (ch === "b") { o += rect("#a9bd8a"); for (i = 0; i < 8; i++) o += '<circle cx="' + (X + 24 + R() * (C - 48)) + '" cy="' + (Y + 24 + R() * (C - 48)) + '" r="' + (14 + R() * 12) + '" fill="' + (i % 2 ? "#5f8551" : "#4c7244") + '" stroke="#3a5a36" stroke-width="2"/>'; }
    else if (ch === "w") { o += rect("#7fa9c4"); for (i = 0; i < 3; i++) { var wy = Y + 36 + i * 40; o += '<path d="M' + (X + 14) + " " + wy + " q 16 -14 32 0 t 32 0 t 32 0 t 26 0" + '" fill="none" stroke="#dcecf4" stroke-width="5" stroke-linecap="round"/>'; } }
    else if (ch === "^") { o += rect(shade(floor, 22)); for (i = 0; i < 3; i++) o += '<rect x="' + (X + 10 + i * 16) + '" y="' + (Y + 10 + i * 16) + '" width="' + (C - 20 - i * 32) + '" height="' + (C - 20 - i * 32) + '" rx="10" fill="none" stroke="#8a7a52" stroke-width="4"/>'; o += '<polygon points="' + (X + 75) + "," + (Y + 62) + " " + (X + 90) + "," + (Y + 88) + " " + (X + 60) + "," + (Y + 88) + '" fill="#8a7a52"/>'; }
    else if (ch === "v") { o += rect(shade(floor, -34)); for (i = 0; i < 3; i++) o += '<rect x="' + (X + 10 + i * 16) + '" y="' + (Y + 10 + i * 16) + '" width="' + (C - 20 - i * 32) + '" height="' + (C - 20 - i * 32) + '" rx="10" fill="none" stroke="#4d463a" stroke-width="4" stroke-dasharray="10 8"/>'; o += '<polygon points="' + (X + 75) + "," + (Y + 90) + " " + (X + 90) + "," + (Y + 64) + " " + (X + 60) + "," + (Y + 64) + '" fill="#4d463a"/>'; }
    else if (ch === "!") { o += rect("#d9a07a"); for (i = 0; i < 5; i++) { var fx = X + 26 + i * 24, fy = Y + 100 - (i % 2) * 22; o += '<path d="M' + fx + " " + fy + " q -16 -26 0 -52 q 4 18 14 22 q 6 16 -14 30 z" + '" fill="#b23a2a" stroke="#7a2318" stroke-width="2"/>'; } }
    else if (ch === "T") { o += rect(floor) + '<rect x="' + (X + 26) + '" y="' + (Y + 26) + '" width="' + (C - 52) + '" height="' + (C - 52) + '" fill="none" stroke="#a8322d" stroke-width="5" stroke-dasharray="12 9"/><path d="M' + (X + 50) + " " + (Y + 50) + " l 50 50 M" + (X + 100) + " " + (Y + 50) + " l -50 50" + '" stroke="#a8322d" stroke-width="6" stroke-linecap="round"/>'; }
    else if (ch === "D") { o += rect(shade(floor, -18)) + '<rect x="' + (X + 8) + '" y="' + (Y + 50) + '" width="' + (C - 16) + '" height="50" fill="#8a5a36" stroke="#4d3220" stroke-width="5"/><line x1="' + (X + 75) + '" y1="' + (Y + 50) + '" x2="' + (X + 75) + '" y2="' + (Y + 100) + '" stroke="#4d3220" stroke-width="4"/><circle cx="' + (X + 64) + '" cy="' + (Y + 75) + '" r="5" fill="#d8b860"/><circle cx="' + (X + 86) + '" cy="' + (Y + 75) + '" r="5" fill="#d8b860"/>'; }
    else if (ch === "=") { o += rect("#3b3832") + '<rect x="' + X + '" y="' + (Y + 30) + '" width="' + C + '" height="' + (C - 60) + '" fill="#a98458" stroke="#5e4529" stroke-width="4"/>'; for (i = 1; i < 6; i++) o += '<line x1="' + (X + i * 25) + '" y1="' + (Y + 30) + '" x2="' + (X + i * 25) + '" y2="' + (Y + C - 30) + '" stroke="#5e4529" stroke-width="3"/>'; }
    else if (ch === "_") { o += rect("#2f2c28"); for (i = 0; i < 5; i++) o += '<line x1="' + (X + 10 + i * 30) + '" y1="' + (Y + 12) + '" x2="' + (X + 2 + i * 30) + '" y2="' + (Y + C - 12) + '" stroke="#48443d" stroke-width="5"/>'; }
    else if (ch === "i") { o += rect("#cfe3ee"); for (i = 0; i < 4; i++) o += '<line x1="' + (X + 20 + i * 30) + '" y1="' + (Y + 110 - i * 8) + '" x2="' + (X + 50 + i * 30) + '" y2="' + (Y + 40 - i * 8) + '" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>'; }
    else { o += rect(floor); for (i = 0; i < 5; i++) o += '<circle cx="' + (X + 12 + R() * (C - 24)) + '" cy="' + (Y + 12 + R() * (C - 24)) + '" r="' + (2 + R() * 2.5) + '" fill="' + shade(floor, -26) + '"/>'; }
    return o;
  }
  function svg(m, set, opt) {
    opt = opt || {}; var S = N * C, floor = (set && set.floor) || "#d0c8b4", o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + S + " " + S + '"' + (opt.size ? ' width="' + opt.size + '" height="' + opt.size + '"' : "") + ' font-family="sans-serif">', x, y;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) o += '<g data-x="' + x + '" data-y="' + y + '">' + cellArt(m.g[y][x], x, y, floor) + (opt.titles ? "<title>" + esc(TERR[m.g[y][x]][0] + " — " + TERR[m.g[y][x]][1]) + "</title>" : "") + "</g>";
    if (opt.marks !== false) {
      [[m.a, "#2f5d8a", "갑"], [m.b, "#a8322d", "을"]].forEach(function (t) { t[0].forEach(function (p) { o += '<rect x="' + (p[0] * C + 8) + '" y="' + (p[1] * C + 8) + '" width="' + (C - 16) + '" height="' + (C - 16) + '" rx="12" fill="' + t[1] + '" fill-opacity=".13" stroke="' + t[1] + '" stroke-width="4" stroke-dasharray="14 10" pointer-events="none"/><text x="' + (p[0] * C + C / 2) + '" y="' + (p[1] * C + C / 2 + 14) + '" text-anchor="middle" font-size="40" fill="' + t[1] + '" fill-opacity=".55" pointer-events="none">' + t[2] + "</text>"; }); });
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (m.g[y][x] !== ".") o += '<text x="' + (x * C + 10) + '" y="' + (y * C + C - 12) + '" font-size="22" font-weight="700" fill="#fff" stroke="#1a1a1a" stroke-width="5" paint-order="stroke" pointer-events="none">' + esc(TERR[m.g[y][x]][0]) + "</text>";
    }
    for (x = 0; x <= N; x++) o += '<line x1="' + x * C + '" y1="0" x2="' + x * C + '" y2="' + S + '" stroke="#1a1a1a" stroke-opacity=".45" stroke-width="' + (x % N ? 2 : 6) + '"/><line x1="0" y1="' + x * C + '" x2="' + S + '" y2="' + x * C + '" stroke="#1a1a1a" stroke-opacity=".45" stroke-width="' + (x % N ? 2 : 6) + '"/>';
    return o + "</svg>";
  }
  function savePng(m, set, name, marks) {
    var S = N * C, img = new Image(), url = URL.createObjectURL(new Blob([svg(m, set, { size: S, marks: marks })], { type: "image/svg+xml" }));
    img.onload = function () {
      var cv = document.createElement("canvas"); cv.width = S; cv.height = S; cv.getContext("2d").drawImage(img, 0, 0, S, S); URL.revokeObjectURL(url);
      cv.toBlob(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (name || "전장도") + (marks ? "" : "-그림만") + ".png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }, "image/png");
    };
    img.onerror = function () { A().toast("그림을 만들지 못했어요"); };
    img.src = url;
  }

  /* ── 화면 ── */
  var UI = { set: SETS[0].id, idx: 0, m: null, name: "", memo: "", edit: false, brush: "#" };
  function setOf(id) { return SETS.filter(function (s) { return s.id === id; })[0] || SETS[0]; }
  function mine() { return (A().store("wx-fields") || []); }
  function load(set, i) { var mp = set.maps[i] || set.maps[0]; UI.set = set.id; UI.idx = i; UI.m = parse(mp.rows); UI.name = mp.n; UI.memo = mp.memo || ""; }
  function render(view, setId) {
    var api = A(); if (setId && setOf(setId).id === setId && (setId !== UI.set || !UI.m)) load(setOf(setId), 0);
    var set = setOf(UI.set); if (!UI.m) load(set, 0);
    var used = {}; UI.m.g.forEach(function (r) { r.forEach(function (c) { used[c] = 1; }); });
    var my = mine();
    view.innerHTML = api.viewHead("map", "전장도(戰場圖) — 6×6 전투판에 까는 지형 맵입니다. 싸움이 난 구역의 성격에 맞는 묶음에서 고르거나 무작위로 만들고, 코코포리아에 넣을 그림으로 내려받습니다. 지형 효과는 율령 '전투'의 지형 규칙을 따릅니다.") + '<nav class="subtabs" aria-label="강호도"><a href="#map">전도·구역도</a><a href="#map-f" aria-current="page">전장도(戰場圖)</a>' + (window.WX_BOARD ? '<a href="#map-b">전투판(戰鬪板)</a>' : "") + '</nav>' +
      '<div class="fld"><aside class="fld-side"><h3>묶음</h3><div class="chips">' + SETS.map(function (s) { return '<button type="button" class="chip' + (s.id === set.id ? " on" : "") + '" data-set="' + s.id + '">' + esc(s.n) + "</button>"; }).join("") + "</div>" +
      '<p class="hint">' + esc(set.z) + " · 장애물: " + esc(set.obs) + "</p>" +
      "<h3>맵</h3><div class=\"fld-list\">" + set.maps.map(function (mp, i) { return '<button type="button" class="btn small' + (UI.idx === i ? " primary" : "") + '" data-map="' + i + '">' + esc(mp.n) + "</button>"; }).join("") +
      '<button type="button" class="btn small" id="fld-gen">무작위로 만들기</button></div>' +
      (my.length ? "<h3>내 맵</h3><div class=\"fld-list\">" + my.map(function (mp, i) { return '<span class="fld-my"><button type="button" class="btn small" data-my="' + i + '">' + esc(mp.n) + '</button><button type="button" class="btn small danger" data-mydel="' + i + '" aria-label="' + esc(mp.n) + ' 지우기">×</button></span>'; }).join("") + "</div>" : "") +
      "</aside><section class=\"fld-main\"><div class=\"fld-title\"><input id=\"fld-name\" aria-label=\"맵 이름\" value=\"" + esc(UI.name) + '"><label><input type="checkbox" id="fld-edit"' + (UI.edit ? " checked" : "") + "> 고치기</label></div>" +
      (UI.edit ? '<div class="fld-brush" role="group" aria-label="붓">' + Object.keys(TERR).map(function (k) { return '<button type="button" class="chip' + (UI.brush === k ? " on" : "") + '" data-brush="' + esc(k) + '">' + esc(TERR[k][0]) + "</button>"; }).join("") + '<button type="button" class="chip' + (UI.brush === "A" ? " on" : "") + '" data-brush="A">갑 시작 칸</button><button type="button" class="chip' + (UI.brush === "B" ? " on" : "") + '" data-brush="B">을 시작 칸</button></div><p class="hint">붓을 고르고 칸을 누르세요. 같은 붓으로 다시 누르면 평지로 돌아갑니다.</p>' : "") +
      '<div class="fld-board" id="fld-board">' + svg(UI.m, set, { titles: true }) + "</div>" +
      (connected(UI.m) ? "" : '<p class="hint bad">두 진영의 시작 칸이 서로 닿지 않아요. 장애물이나 낭떠러지를 줄여 주세요.</p>') +
      (UI.memo ? '<p class="hint">' + esc(UI.memo) + "</p>" : "") +
      '<div class="sheet-actions"><button type="button" class="btn small primary" id="fld-png">PNG 저장</button><button type="button" class="btn small" id="fld-png2">PNG 저장(그림만)</button><button type="button" class="btn small" id="fld-code">맵 코드 복사</button><button type="button" class="btn small" id="fld-keep">내 맵에 담기</button></div>' +
      '<p class="hint">코코포리아: 그림을 방의 전경(前景)으로 넣고 가로·세로 칸 수를 같게 맞추면 격자 6×6이 그대로 맞습니다. 갑·을은 두 진영의 시작 칸입니다.</p>' +
      '<h3>이 맵의 지형</h3><dl class="fld-legend">' + Object.keys(TERR).filter(function (k) { return used[k] && k !== "."; }).map(function (k) { return "<dt>" + esc(TERR[k][0]) + (k === "!" && set.maps[UI.idx] && set.maps[UI.idx].hazard ? " (" + esc(set.maps[UI.idx].hazard) + ")" : "") + "</dt><dd>" + esc(TERR[k][1]) + "</dd>"; }).join("") + "</dl>" +
      "</section></div>";
    function again() { render(view); }
    view.querySelector(".fld-side").onclick = function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.set) { load(setOf(b.dataset.set), 0); if (history.replaceState) history.replaceState(null, "", "#map-f-" + b.dataset.set); again(); }
      else if (b.dataset.map) { load(set, +b.dataset.map); again(); }
      else if (b.id === "fld-gen") { UI.m = generate(set); UI.idx = -1; UI.name = set.n + " 무작위"; UI.memo = ""; again(); }
      else if (b.dataset.my) { var mp = mine()[+b.dataset.my]; if (mp) { UI.set = mp.set || UI.set; UI.idx = -1; UI.m = parse(mp.rows); UI.name = mp.n; UI.memo = ""; again(); } }
      else if (b.dataset.mydel) { var l = mine(); l.splice(+b.dataset.mydel, 1); api.store("wx-fields", l); again(); }
    };
    view.querySelector("#fld-name").oninput = function (e) { UI.name = e.target.value; };
    view.querySelector("#fld-edit").onchange = function (e) { UI.edit = e.target.checked; again(); };
    var br = view.querySelector(".fld-brush"); if (br) br.onclick = function (ev) { var b = ev.target.closest("[data-brush]"); if (b) { UI.brush = b.dataset.brush; again(); } };
    view.querySelector("#fld-board").onclick = function (ev) {
      if (!UI.edit) return; var g = ev.target.closest("g[data-x]"); if (!g) return;
      var x = +g.dataset.x, y = +g.dataset.y, k = x + "," + y, m = UI.m;
      function drop(list) { for (var i = list.length - 1; i >= 0; i--) if (list[i].join() === k) { list.splice(i, 1); return true; } return false; }
      if (UI.brush === "A" || UI.brush === "B") { var own = UI.brush === "A" ? m.a : m.b, oth = UI.brush === "A" ? m.b : m.a; if (!drop(own)) { drop(oth); own.push([x, y]); m.g[y][x] = "."; } }
      else { drop(m.a); drop(m.b); m.g[y][x] = m.g[y][x] === UI.brush ? "." : UI.brush; }
      UI.idx = -1; again();
    };
    view.querySelector("#fld-png").onclick = function () { savePng(UI.m, set, UI.name, true); };
    view.querySelector("#fld-png2").onclick = function () { savePng(UI.m, set, UI.name, false); };
    view.querySelector("#fld-code").onclick = function () { var t = toRows(UI.m).join("\n"); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { api.toast("맵 코드를 복사했어요"); }, function () { api.toast("복사하지 못했어요"); }); };
    view.querySelector("#fld-keep").onclick = function () { var l = mine(); l.push({ n: UI.name || "이름 없는 맵", set: set.id, rows: toRows(UI.m) }); api.store("wx-fields", l); api.toast("내 맵에 담았어요(이 브라우저에만 남아요)"); again(); };
  }
  window.WX_FIELD = { terr: TERR, sets: SETS, parse: parse, toRows: toRows, generate: generate, connected: connected, svg: svg, savePng: savePng, setOf: setOf, setForZone: setForZone, render: render };
})();
