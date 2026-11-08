(function () {
"use strict";

/* ═════════ 사이트 문구 — 여기만 고치면 화면 글이 바뀝니다 ═════════ */
var SITE = {
  name: "무협비가미",
  seal: "武俠",
  tagline: ["마도가 하늘에 오르다", "천하가 마도에 물들다"],
  intro: {
    lead: "천마가 하늘에 서서 마도천하가 되어버린 세상.",
    body: [
      "온 세상에 마기가 넘실대고 사람들은 미쳐나가기 시작하며 자연은 기괴하게 뒤틀립니다.",
      "여러분은 각기의 이유로 강호에 출도했습니다. 목표는 천마를 죽이고 세상에 평화를 가져오는 것.",
      "부디 당신의 앞날에 무운이 따르길."
    ]
  },
  /* 탭: [이름, 한자, 무엇인지] */
  nav: {
    home: ["산문", "山門", "처음 화면"],
    rules: ["율령", "律令", "룰북 — 규칙 전문을 페이지별로"],
    map: ["강호도", "江湖圖", "지도 — 성·명산·문파 소재지"],
    mugong: ["무공록", "武功錄", "무공 검색"],
    background: ["내력", "來歷", "배경 장점·단점 검색"],
    items: ["기물", "器物", "보급품·영약·도구, 공개된 기보"],
    mods: ["오의첩", "奧義帖", "오의 개조 강점·약점"],
    builder: ["인물지", "人物志", "캐릭터 만들기"],
    inn: ["객잔", "客棧", "방명록"],
    gm: ["GM 서고", "書庫", "GM 전용 — 기보·NPC·던전 관리"]
  },
  inn: {
    lead: "길손이여, 잔 하나 비우고 한 줄 남기고 가시게.",
    body: "세션 후기, 다음 일정 의논, GM에게 하고 싶은 말 무엇이든 좋습니다. 남긴 글은 이 페이지를 공유받은 모두가 봅니다."
  },
  /* 독립 사이트용 강호소식. 맨 위에 한 줄씩 추가: { at: "2026-11-08", title: "제목", body: "내용" } */
  news: [],
  verse: ["검을 거두면 산이 남고,", "산을 내려서면 길이 남는다."],
  credit: "무협비가미 · 시노비가미를 바탕으로 한 무협 TRPG"
};

/* 인물지 초상 자리 — 먹 실루엣 */
var PORTRAIT = '<svg viewBox="0 0 84 104" aria-hidden="true"><path fill="currentColor" opacity=".85" d="M42 18c-8 0-13 6-13 14 0 6 3 11 7 13-1 2-2 4-2 6-12 3-20 12-22 28l-1 25h62l-1-25c-2-16-10-25-22-28 0-2-1-4-2-6 4-2 7-7 7-13 0-8-5-14-13-14z"/><path fill="currentColor" opacity=".85" d="M33 20c3-7 15-9 20-2 4 1 6 4 5 8-3-4-9-5-14-5-4 0-8 1-11-1z"/><path stroke="currentColor" stroke-width="2" fill="none" opacity=".6" d="M62 36 L78 96"/><path stroke="var(--cinnabar)" stroke-width="3" d="M60 30 l6 2"/></svg>';

/* ───────── 설정 ───────── */
var SHEET_ID = "1jR7RGK0xbsZchODPm6JxrWJixCOU_T4fQCaqySihxO4";
var DOC_ID = "1BrRvHQcaBzmlwGE4GfzWdPUaQGbHZu0NoyZ7a7pqQNs";
var RANGES = {
  /* 출력리스트의 B열은 시트 검색칸에 걸린 결과라, 원본 입력 칸을 읽는다 */
  muk: "인법출력리스트!B3:K3000",
  bg: "배경출력리스트!O2:T2000",
  items: "도구출력리스트!O2:T2000",
  mods: "개조출력리스트!O2:T2000",
  gibo: "기보!B2:H500",
  skills: "특기표!A2:C200"
};

var LEVELS = ["삼류", "이류", "일류", "절정", "화경", "현경"];
var LIMITS = {
  "삼류": { exp: 0, sk: 5, mg: 4, og: 0, mod: 0, bg: 1 },
  "이류": { exp: 10, sk: 5, mg: 5, og: 1, mod: 0, bg: 1 },
  "일류": { exp: 15, sk: 6, mg: 5, og: 1, mod: 0, bg: 2 },
  "절정": { exp: 25, sk: 6, mg: 6, og: 2, mod: 1, bg: 2 },
  "화경": { exp: 35, sk: 7, mg: 6, og: 3, mod: 2, bg: 3 },
  "현경": { exp: 50, sk: 8, mg: 7, og: 3, mod: 3, bg: 4 }
};
var FIELDS = ["병기", "외공", "내공", "강호", "지략", "술법"];
var GROUPS = {
  "오대문파": { field: "내공", schools: { "무당파": ["도력", "검"], "소림사": ["법력", "권"], "곤륜파": ["운기", "신법"], "화산파": ["양기", "검"], "개방": ["발경", "정보"] } },
  "오대세가": { field: "병기", schools: { "남궁세가": ["검", "경제력"], "사천당가": ["암기", "독술"], "제갈세가": ["선", "진법"], "하북팽가": ["도", "근력"], "산동악가": ["창", "병법"] } },
  "정사지간": { field: "지략", schools: { "무림맹": ["조사", "화술"], "상회": ["계략", "상술"], "표국": ["지리", "중단전"], "낭인": ["무공학", "간파"], "금의위/동창": ["추적", "점혈"] } },
  "사도오천": { field: "강호", schools: { "패검종": ["기세", "단련"], "암야전": ["잠행", "궁"], "군마녹림": ["인맥", "부"], "장강수로채": ["도구", "삭"], "흑상": ["기만", "손놀림"] } },
  "천마신교": { field: "술법", schools: { "교주궁": ["섭혼", "마기"], "병마령": ["연단", "병법"], "비연각": ["점술", "필"], "요왕장": ["둔갑", "상단전"], "혈교": ["저주", "하단전"] } },
  "세외": { field: "외공", schools: { "북해빙궁": ["장", "음기"], "포달랍궁": ["지", "법력"], "동영": ["보법", "도"], "서역": ["조", "환술"], "천축": ["각", "방술"], "해동": ["근력", "학식", "초혼"] } }
};
var FORMS = [
  { k: "연환(連環)형", f: "연환", e: "이번 차례에 공격 무공 하나를 코스트 없이 3번까지 연달아 쓴다. 2번째부터 명중 판정 유리점 1. 기 소진 없음" },
  { k: "흡성(吸星)형", f: "흡성", e: "2칸 내 적 1명 사격전 2뎀, 입힌 만큼 자신 회복. 다음 라운드 종료까지 대상 코스트 한계 -2, 자신 +2" },
  { k: "신법(身法)형", f: "신법", e: "곧바로 4칸 이동. 이번 라운드 동안 자신을 노린 명중 판정 불리점 2, 자신을 노린 공격 1번은 빗나감. 다음 공격 무공은 대상 회피 불리점 1·대미지 +1" },
  { k: "호신강기(護身罡氣)형", f: "호신강기", e: "자신과 인접한 아군: 다음 라운드 종료까지 받는 접근전·사격전 대미지 1 감소, 상태이상에 걸리지 않음" }
];

/* ───────── 유틸 ───────── */
function $(s, r) { return (r || document).querySelector(s); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function norm(s) { return String(s || "").replace(/[\/\s·]/g, ""); }
function lvIdx(l) { var i = LEVELS.indexOf(l); return i < 0 ? 0 : i; }
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }
function copyText(text, fallbackEl) {
  var p = navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject();
  p.then(function () { toast("복사했어요"); }, function () {
    if (fallbackEl) { fallbackEl.hidden = false; fallbackEl.value = text; fallbackEl.select(); toast("선택된 텍스트를 직접 복사하세요"); }
  });
}

/* ───────── 데이터 ───────── */
var DATA = (function () {
  try { var el = document.getElementById("wx-data"); return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; }
})();
/* 시트에 아직 없는 자료(haedong.js 등)를 얹는다. 시트에 같은 이름이 있으면 건너뛴다 */
function patchData(d) { try { return window.WX_PATCH_DATA ? window.WX_PATCH_DATA(d) : d; } catch (e) { return d; } }
if (DATA && DATA.muk) DATA = patchData(DATA);
var hasData = !!(DATA && DATA.muk && DATA.muk.length);
var RULES = null;
function loadData() {
  if (hasData) return Promise.resolve();
  return fetch("data.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.muk && d.muk.length) { DATA = patchData(d); hasData = true; } })
    .catch(function () { });
}

/* ───────── 라우팅 ───────── */
var STANDALONE = !!window.WX_STANDALONE;
var ROUTES = Object.keys(SITE.nav).filter(function (k) { return !(STANDALONE && k === "inn"); });
/* 무공록·내력·기물·오의첩은 율령(룰북)의 하위 페이지: 주 메뉴에는 없고 룰북 첫머리의 자료 단추로 들어간다 */
var RULE_SUBS = ["mugong", "background", "items", "mods"];
var NAV_ROUTES = ROUTES.filter(function (k) { return RULE_SUBS.indexOf(k) < 0 && k !== "gm"; });
function topRoute(h) { return RULE_SUBS.indexOf(h) >= 0 ? "rules" : h; }
function sealHtml(cls) { return '<span class="seal ' + (cls || "") + '" aria-hidden="true"><span>' + esc(SITE.seal) + "</span></span>"; }
var app = document.getElementById("app");
app.innerHTML =
  '<header class="top"><div class="wrap">' +
  '<a class="brand" href="#home">' + sealHtml() + "<b>" + esc(SITE.name) + "</b></a>" +
  '<div class="sync" id="sync"></div>' +
  '<nav class="tabs" id="tabs" aria-label="주 메뉴">' + NAV_ROUTES.map(function (k) { var n = SITE.nav[k]; return '<a href="#' + k + '" title="' + esc(n[2]) + '">' + esc(n[0]) + '<span class="han">' + esc(n[1]) + "</span></a>"; }).join("") + "</nav>" +
  '</div></header><main class="wrap" id="view"></main>' +
  '<footer class="foot"><div class="wrap"><div><p class="verse">' + SITE.verse.map(esc).join("<br>") + "</p>" +
  "<nav>" + NAV_ROUTES.map(function (k) { return '<a href="#' + k + '">' + esc(SITE.nav[k][0]) + "</a>"; }).join("") + "</nav>" +
  "<small>" + esc(SITE.credit) + " · " + new Date().getFullYear() + ' <a href="#gm" id="gm-link" class="gm-link">GM</a></small></div>' + sealHtml() + "</div></footer>";
var view = $("#view");

function route() {
  var full = (location.hash || "").slice(1);
  var h = full.split("-")[0];
  if (ROUTES.indexOf(h) < 0) { h = "home"; full = "home"; }
  if (h === "map" && MAPST && document.getElementById("gmap")) { mapSelect(full); return; }
  if (h !== "map") { if (MAPST) cancelAnimationFrame(MAPST.anim); MAPST = null; }
  [].forEach.call(document.querySelectorAll("#tabs a"), function (a) {
    if (a.getAttribute("href") === "#" + topRoute(h)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  stopHero();
  view.className = "wrap" + (h === "home" ? " home" : "");
  if (h === "home") renderHome();
  else if (h === "inn") renderInn();
  else if (h === "map") renderMap(full);
  else if (h === "gm") { if (window.renderGM) renderGM(); else renderEmpty(); }
  else if (!hasData) renderEmpty();
  else if (h === "rules") renderRules(full);
  else ({ mugong: renderMugong, background: renderBg, items: renderItems, mods: renderMods, builder: renderBuilderRoute })[h](full);
  window.scrollTo(0, 0);
  watchReveal();
}
window.addEventListener("hashchange", route);

function ruleBar(curKey) {
  var counts = hasData ? { mugong: DATA.muk.length, background: DATA.bg.length, items: DATA.items.length + (DATA.gibo || []).length, mods: DATA.mods.length } : {};
  return '<nav class="rulebar" aria-label="룰북 자료">' + RULE_SUBS.filter(function (k) { return SITE.nav[k]; }).map(function (k) {
    var n = SITE.nav[k];
    return '<a class="rb" href="#' + k + '"' + (k === curKey ? ' aria-current="page"' : "") + '><span class="v" aria-hidden="true">' + esc(n[1]) + "</span><b>" + esc(n[0]) + "</b><span>" + esc(n[2]) + "</span>" + (counts[k] ? '<span class="n">' + counts[k] + "개</span>" : "") + "</a>";
  }).join("") + "</nav>";
}
function viewHead(key, desc) {
  var n = SITE.nav[key];
  if (RULE_SUBS.indexOf(key) >= 0) {
    return '<nav class="crumb-r" aria-label="위치"><a href="#rules">' + esc(SITE.nav.rules[0]) + '</a><i>›</i><span>' + esc(n[0]) + "</span></nav>" + ruleBar(key) +
      '<header class="view-head reveal"><h1>' + esc(n[0]) + '<span class="han">' + esc(n[1]) + "</span></h1>" + (desc ? "<p>" + desc + "</p>" : "") + "</header>";
  }
  return '<header class="view-head reveal"><h1>' + esc(n[0]) + '<span class="han">' + esc(n[1]) + "</span></h1>" + (desc ? "<p>" + desc + "</p>" : "") + "</header>";
}
function renderEmpty() {
  view.innerHTML = '<div class="empty"><h2>아직 비어 있어요</h2><p>룰 문서와 무협 데이터 시트를 아직 불러오지 않았어요. 주인장이 오른쪽 위 <b>시트 동기화</b>를 누르면 채워지고, 그 뒤로 누구나 이 링크로 볼 수 있어요.</p></div>';
}
function splitName(n) { var m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(n || ""); return m ? [m[1], m[2]] : [n || "", ""]; }
function nameHtml(n) { var p = splitName(n); return esc(p[0]) + (p[1] ? '<span class="han">' + esc(p[1]) + "</span>" : ""); }
function brushStroke() {
  return '<svg class="stroke reveal" viewBox="0 0 600 28" aria-hidden="true"><path class="p1" pathLength="1" d="M6 17 C 90 8, 180 20, 290 13 S 470 8, 560 14"/><path class="p2" pathLength="1" d="M40 21 C 140 15, 260 22, 380 17 S 520 15, 574 18"/><rect class="tip" x="572" y="9" width="8" height="8" transform="rotate(45 576 13)"/></svg>';
}

/* ───────── 산문 (처음 화면) ───────── */
var heroRaf = 0, heroScroll = null;
function stopHero() { if (heroRaf) cancelAnimationFrame(heroRaf); heroRaf = 0; if (heroScroll) window.removeEventListener("scroll", heroScroll); heroScroll = null; }
function ridge(seed, base, amp, w, h) {
  /* 주기 w의 이음매 없는 능선, 두 주기를 그려서 흘러가게 한다 */
  var harm = [[1, 1, seed], [2, .55, seed * 1.7], [3, .32, seed * 2.3], [5, .18, seed * 3.1], [8, .09, seed * 4.7], [13, .05, seed * 5.3]];
  var pts = [], step = 20;
  for (var x = 0; x <= w * 2; x += step) {
    var y = 0; harm.forEach(function (k) { y += k[1] * Math.sin((x / w) * Math.PI * 2 * k[0] + k[2]); });
    y = base - Math.abs(y) * amp * .9 - y * amp * .25;
    pts.push(x + "," + y.toFixed(1));
  }
  return "M0," + h + " L" + pts.join(" L") + " L" + (w * 2) + "," + h + " Z";
}
function mountains() {
  var W = 1200, H = 600;
  var L = [
    { c: "l1", base: 300, amp: 70, seed: .7, op: .16 },
    { c: "l2", base: 380, amp: 80, seed: 2.1, op: .28 },
    { c: "l3", base: 470, amp: 70, seed: 4.2, op: .5 },
    { c: "l4", base: 560, amp: 55, seed: 5.9, op: .85 }
  ];
  return L.map(function (l, i) {
    return '<div class="layer ' + l.c + '" data-depth="' + (i + 1) + '"><svg viewBox="0 0 ' + (W * 2) + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="mg' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="' + l.op + '"/><stop offset=".55" stop-color="currentColor" stop-opacity="' + (l.op * .45).toFixed(2) + '"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + ridge(l.seed, l.base, l.amp, W, H) + '" fill="url(#mg' + i + ')" style="color:var(--ink)"/></svg></div>' +
      (i === 1 ? '<div class="fog"></div>' : "") + (i === 2 ? '<div class="fog f2"></div>' : "");
  }).join("");
}
function renderHome() {
  var counts = hasData ? { mugong: DATA.muk.length, background: DATA.bg.length, items: DATA.items.length + (DATA.gibo || []).length, mods: DATA.mods.length } : {};
  var rulesN = hasData ? (RULES || (RULES = parseRules(DATA.rules))).length : 0;
  var guide = NAV_ROUTES.filter(function (k) { return k !== "home"; }).map(function (k) {
    var n = SITE.nav[k];
    var num = k === "rules" ? (rulesN ? rulesN + "편" : "") : counts[k] ? counts[k] + "개" : "";
    if (k === "rules") n = [n[0], n[1], n[2] + " · 무공록·내력·기물·오의첩"];
    return '<a class="gcard edge reveal" href="#' + k + '"><span class="v" aria-hidden="true">' + esc(n[1]) + "</span><b>" + esc(n[0]) + "</b><span>" + esc(n[2]) + "</span>" + (num ? '<span class="n">' + num + "</span>" : "<span></span>") + "</a>";
  }).join("");
  var sects = Object.keys(GROUPS).map(function (g) {
    return '<div class="sect reveal"><h3>' + esc(g) + '</h3><span class="field-of">' + esc(GROUPS[g].field) + " 분야</span><p>" + Object.keys(GROUPS[g].schools).map(esc).join(" · ") + "</p></div>";
  }).join("");
  view.innerHTML =
    '<section class="hero" aria-label="' + esc(SITE.nav.home[0]) + '">' + mountains() +
    '<div class="blade" aria-hidden="true"></div>' +
    '<div class="hero-text"><p class="tagline">' + esc(SITE.tagline[0]) + "　<em>" + esc(SITE.tagline[1]) + "</em></p>" +
    "<h1>" + esc(SITE.name) + "</h1>" + sealHtml("hero-seal") + "</div>" +
    '<button class="down" type="button" id="down" aria-label="아래로">' +
    '<svg viewBox="0 0 26 54" aria-hidden="true"><path d="M13 2 C 12 14, 15 26, 13 46" stroke-width="2.4"/><path d="M5 38 C 9 42, 11 45, 13 50 C 15 45, 18 41, 22 37" stroke-width="1.8"/></svg>하산</button></section>' +
    '<section class="chapter" id="sect-intro"><h2 class="reveal">門派<small>문파</small></h2><div>' +
    '<div class="prose reveal"><p class="lead">' + esc(SITE.intro.lead) + "</p>" + SITE.intro.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" +
    '<div class="sects">' + sects + "</div></div></section>" +
    brushStroke() +
    '<section class="chapter" style="padding-top:0"><h2 class="reveal">入門<small>길잡이</small></h2><div class="guide">' + guide + "</div></section>" +
    brushStroke() +
    '<section class="chapter" style="padding-top:0"><h2 class="reveal">江湖消息<small>강호소식</small></h2><div><div class="scroll reveal" id="news"></div><div id="newspost"></div></div></section>';
  $("#down").onclick = function () { var t = $("#sect-intro"); window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 90); };
  drawNews();
  /* 패럴랙스 */
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    var layers = [].slice.call(view.querySelectorAll(".hero .layer"));
    var ticking = false;
    heroScroll = function () {
      if (ticking) return; ticking = true;
      heroRaf = requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 700);
        layers.forEach(function (l) { l.style.transform = "translateY(" + (y * (0.05 + (4 - l.dataset.depth) * 0.07)).toFixed(1) + "px)"; });
        ticking = false;
      });
    };
    window.addEventListener("scroll", heroScroll, { passive: true });
  }
}

/* 강호소식: 동기화 기록 + 주인장이 올린 공지 */
var NEWS = [], newsState = "loading";
function fmtDate(t) { var d = new Date(t); return isNaN(d) ? "" : d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }); }
/* 디스코드 공지 채널에 붙여넣기 좋은 꼴. 페이지는 바깥(디스코드)으로 직접 보낼 수 없어서 복사로 대신한다 */
function discordText(n) { return "📜 **강호 소식 · " + n.title + "**" + (n.body ? "\n" + n.body : "") + "\n-# 무협비가미 · " + fmtDate(n.at); }
function drawNews() {
  var el = $("#news"); if (!el) return;
  var items = NEWS.map(function (n) { return { id: n.id, at: n.at, title: n.title, body: n.body }; });
  if (hasData && DATA.syncedAt) items.push({ at: DATA.syncedAt, title: "율령과 무공록을 새로 옮겨 적다", body: "무공 " + DATA.muk.length + "개 · 배경 " + DATA.bg.length + "개 · 기물 " + (DATA.items.length + (DATA.gibo || []).length) + "개 · 오의 개조 " + DATA.mods.length + "개", auto: true });
  items.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
  el.innerHTML = items.map(function (n) {
    return '<article class="news' + (n.auto ? " auto" : "") + '"><time>' + esc(fmtDate(n.at)) + "</time><h3>" + esc(n.title) + "</h3>" + (n.body ? "<p>" + esc(n.body) + "</p>" : "") +
      (!n.auto && CAN_EDIT ? '<div class="news-act"><button class="btn small" type="button" data-dcnews="' + esc(n.id) + '">디스코드용 복사</button><button class="btn small danger" type="button" data-delnews="' + esc(n.id) + '">내리기</button></div>' : "") + "</article>";
  }).join("") + (newsState === "loading" && !NEWS.length ? '<p class="hint">소식을 불러오는 중…</p>' : newsState === "slow" ? '<p class="hint">소식 저장소에 아직 닿지 못했어요. 잠시 뒤 다시 열어 보세요.</p>' : "") +
    (!items.length && newsState !== "loading" ? '<p class="hint">아직 올라온 소식이 없어요.</p>' : "");
  el.onclick = function (e) {
    var dc = e.target.dataset && e.target.dataset.dcnews;
    if (dc) { var nn = NEWS.filter(function (x) { return x.id === dc; })[0]; if (nn) copyText(discordText(nn)); return; }
    var id = e.target.dataset && e.target.dataset.delnews; if (!id || !DBH) return;
    DBH.collection("site/notices/items").doc(id).delete().catch(function () { toast("내리지 못했어요"); });
  };
  var pb = $("#newspost");
  if (pb) pb.innerHTML = CAN_EDIT && DBH ? '<form class="postbox" id="newsform"><div class="lbl">주인장 전용 · 새 소식 올리기</div>' +
    '<div class="field"><label for="nw-t">제목</label><input id="nw-t" maxlength="80" required placeholder="예: 다음 세션은 토요일 밤 9시"></div>' +
    '<div class="field"><label for="nw-b">내용</label><textarea id="nw-b" rows="3" maxlength="1000"></textarea></div>' +
    '<label class="hint"><input type="checkbox" id="nw-dc" checked> 올리면서 디스코드 공지용 글도 복사하기</label>' +
    '<div><button class="btn primary small" type="submit">올리기</button></div></form>' : "";
  var f = $("#newsform");
  if (f) f.onsubmit = function (e) {
    e.preventDefault();
    var t = $("#nw-t").value.trim(), b = $("#nw-b").value.trim(); if (!t) return;
    var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
    var at = new Date().toISOString(), dcOn = $("#nw-dc") && $("#nw-dc").checked, dcOk = false;
    /* 클릭한 그 순간에 복사해야 브라우저가 막지 않는다 */
    if (dcOn && navigator.clipboard) navigator.clipboard.writeText(discordText({ title: t, body: b, at: at })).then(function () { dcOk = true; }, function () { });
    DBH.collection("site/notices/items").add({ title: t, body: b, at: at })
      .then(function () { setTimeout(function () { toast(dcOk ? "소식을 올렸어요. 디스코드 공지 채널에 붙여넣으세요" : "소식을 올렸어요"); }, 150); }, function (err) { btn.disabled = false; toast(err && err.code === "quota_exceeded" ? "저장 공간이 가득 찼어요. 오래된 소식을 내려 주세요" : "올리지 못했어요. 이 페이지의 편집 권한이 있는지 확인하세요"); });
  };
}

/* ───────── 객잔 (방명록) ───────── */
var GB = [], gbState = "loading", MY_ID = null;
function renderInn() {
  view.innerHTML = viewHead("inn", esc(SITE.inn.lead)) +
    '<div class="inn"><form class="inn-form reveal" id="innform"><p class="hint">' + esc(SITE.inn.body) + "</p>" +
    '<div class="field"><label for="in-a">별호</label><input id="in-a" maxlength="30" required placeholder="예: 청풍검객"></div>' +
    '<div class="field"><label for="in-m">남길 말</label><textarea id="in-m" rows="4" maxlength="600" required placeholder="예: 오늘 흑관문에서 살아남았습니다. 다음엔 오의를 아껴 쓰겠습니다."></textarea></div>' +
    '<div class="row"><span class="hint" id="in-note"></span><button class="stamp" type="submit" id="in-go" aria-label="남기기"><span>留言</span></button></div></form>' +
    '<section aria-label="남긴 글"><div class="posts" id="posts"></div></section></div>';
  try { var last = store("wx-alias"); if (last) $("#in-a").value = last; } catch (e) { }
  drawPosts();
  $("#innform").onsubmit = function (e) {
    e.preventDefault();
    if (!DBH || !MY_ID) { $("#in-note").textContent = "오른쪽 아래 '구글로 로그인'을 누르면 글을 남길 수 있어요."; return; }
    var a = $("#in-a").value.trim(), m = $("#in-m").value.trim(); if (!a || !m) return;
    var go = $("#in-go"); go.disabled = true;
    store("wx-alias", a);
    var mine = GB.filter(function (d) { return d.id === MY_ID; })[0];
    var posts = (mine && mine.posts || []).concat([{ alias: a, text: m, at: new Date().toISOString() }]).slice(-30);
    DBH.doc("guestbook/" + MY_ID).set({ posts: posts }).then(function () {
      go.disabled = false; $("#in-m").value = ""; $("#in-note").textContent = ""; toast("남겼어요");
    }, function (err) {
      go.disabled = false;
      $("#in-note").textContent = err && err.code === "quota_exceeded" ? "방명록이 가득 찼어요. 주인장에게 알려 주세요." : "남기지 못했어요. 공유 권한이 '참여자' 이상이어야 글을 쓸 수 있어요.";
    });
  };
}
function drawPosts() {
  var el = $("#posts"); if (!el) return;
  var all = [];
  GB.forEach(function (d) { (d.posts || []).forEach(function (p, i) { all.push({ uid: d.id, i: i, alias: p.alias, text: p.text, at: p.at }); }); });
  all.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
  el.innerHTML = all.map(function (p) {
    var mine = p.uid === MY_ID;
    return '<article class="post"><div class="post-h"><b>' + esc(p.alias) + "</b><time>" + esc(fmtDate(p.at)) + "</time></div><p>" + esc(p.text) + "</p>" +
      (mine || CAN_EDIT ? '<button class="btn small danger" type="button" data-uid="' + esc(p.uid) + '" data-i="' + p.i + '">지우기</button>' : "") + "</article>";
  }).join("") ||
    (gbState === "loading" ? '<p class="hint">방명록을 펼치는 중…</p>' : gbState === "off" ? '<p class="hint">이 화면에서는 방명록을 열 수 없어요. 잠시 뒤 다시 열어 보세요.</p>' : gbState === "slow" ? '<p class="hint">방명록 저장소에 아직 닿지 못했어요. 잠시 뒤 다시 열어 보세요.</p>' : '<p class="hint">아직 아무도 다녀가지 않았어요. 첫 글을 남겨 보세요.</p>');
  el.onclick = function (e) {
    var b = e.target.closest("[data-uid]"); if (!b || !DBH) return;
    var d = GB.filter(function (x) { return x.id === b.dataset.uid; })[0]; if (!d) return;
    var posts = d.posts.slice(); posts.splice(Number(b.dataset.i), 1);
    b.disabled = true;
    DBH.doc("guestbook/" + d.id).set({ posts: posts }).catch(function () { b.disabled = false; toast("지우지 못했어요"); });
  };
}

/* ───────── 강호도 (지도) ───────── */
var GEO = window.WX_GEO || null, MAPD = window.WX_MAP || null;
var GROUP_TONE = { "오대문파": "jade", "오대세가": "gold", "정사지간": "ink", "사도오천": "soft", "천마신교": "cin", "세외": "mist" };
var MAPST = null;  /* 화면에 떠 있는 지도의 상태 */
function mproj(at) { return [(at[0] - GEO.lon0) * GEO.c * GEO.k, (GEO.lat1 - at[1]) * GEO.k]; }
function mfind(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0]; }
function provOf(id) { return mfind(GEO.provinces, id); }
function sectProv(s) { if (s.prov) return s.prov; var p = s.place && mfind(MAPD.places, s.place); return p ? p.prov : ""; }

function renderMap(full) {
  if (!GEO || !MAPD) { view.innerHTML = '<div class="empty"><h2>지도를 불러오지 못했어요</h2><p>geo.js와 mapdata.js 파일이 함께 있어야 해요.</p></div>'; return; }
  var W = GEO.w, H = GEO.h;
  var provs = GEO.provinces.map(function (p) { return '<path class="prov' + (p.outer ? " outer" : "") + '" data-prov="' + p.id + '" d="' + p.d + '"><title>' + esc(p.name) + "</title></path>"; }).join("");
  var LABEL_AT = { cheonsan: [85.0, 39.3], tagam: [96.5, 35.3], hase: [100.6, 39.5] };
  var plabels = GEO.provinces.map(function (p) {
    var at = LABEL_AT[p.id] ? mproj(LABEL_AT[p.id]) : [p.lx, p.ly];
    return '<text class="plabel' + (p.small ? " small" : "") + '" data-prov="' + p.id + '" x="' + (+at[0]).toFixed(1) + '" y="' + (+at[1]).toFixed(1) + '">' + esc(p.name) + "</text>";
  }).join("");
  var hosted = {}; MAPD.sects.forEach(function (x) { if (x.place) hosted[x.place] = 1; });
  var places = MAPD.places.map(function (p) {
    var xy = mproj(p.at);
    var h = hosted[p.id];
    return '<g class="mk place' + (h ? " hosted" : "") + '" data-place="' + p.id + '" data-x="' + xy[0].toFixed(1) + '" data-y="' + xy[1].toFixed(1) + '">' + (!h && window.WXZ && WXZ.hasPlace(p.id) ? '<circle class="zring" r="7.5"/>' : "") + '<circle r="3.2"/>' +
      (h ? '<text x="0" y="20" text-anchor="middle">' : '<text x="6" y="4">') + esc(p.name) + "</text></g>";
  }).join("");
  var sects = MAPD.sects.map(function (s) {
    var xy = mproj(s.at);
    return '<g class="mk sect tone-' + (GROUP_TONE[s.group] || "ink") + (s.approx ? " approx" : "") + '" data-sect="' + s.id + '" data-x="' + xy[0].toFixed(1) + '" data-y="' + xy[1].toFixed(1) + '" tabindex="0" role="button" aria-label="' + esc(s.name + " — " + s.where) + '">' +
      (window.WXZ && WXZ.hasSect(s.id) ? '<circle class="zring" r="9.5"/>' : "") + '<rect x="-5" y="-5" width="10" height="10" rx="1.5"/><text x="8" y="4">' + esc(s.name) + "</text></g>";
  }).join("");
  var dyn = MAPD.dynasties.map(function (d) {
    var yr = function (y) { return y < 0 ? "前" + (-y) : String(y); };
    return '<a class="dyn" href="#map-d-' + d.id + '" data-dyn="' + d.id + '"><b>' + esc(d.name) + '<span class="han">' + esc(d.han) + "</span></b><span>" + yr(d.from) + "–" + yr(d.to) + "</span></a>";
  }).join("");

  view.innerHTML = viewHead("map", "성을 누르면 그 성으로 들어가고, 산·도시·문파 표식을 누르면 설명이 열립니다. 휠이나 두 손가락으로 확대하고 끌어서 움직입니다.") +
    '<div class="atlas">' +
    '<div class="gmap-wrap"><svg class="gmap" id="gmap" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="강호도 — 중국 전도와 문파 소재지">' +
    '<defs><pattern id="wave" width="26" height="12" patternUnits="userSpaceOnUse"><path d="M0 8 Q 6.5 3 13 8 T 26 8" fill="none" class="wave"/></pattern></defs>' +
    '<rect class="sea" x="-4000" y="-4000" width="' + (W + 8000) + '" height="' + (H + 8000) + '"/><rect class="sea-w" x="-4000" y="-4000" width="' + (W + 8000) + '" height="' + (H + 8000) + '" fill="url(#wave)"/>' +
    '<path class="land" d="' + GEO.land + '"/>' + GEO.lakes.map(function (l) { return '<path class="lake" d="' + l.d + '"/>'; }).join("") +
    '<g id="g-prov">' + provs + '</g><path class="cn-outline" d="' + GEO.outline + '"/>' +
    '<g id="g-plabel">' + plabels + '</g><g id="g-caps"></g><g id="g-place">' + places + '</g><g id="g-sect">' + sects + '</g><g id="g-zlink"></g><g id="g-znode"></g>' +
    "</svg>" +
    '<div class="gmap-ctl"><button type="button" class="btn small" id="mz-in" aria-label="확대">＋</button><button type="button" class="btn small" id="mz-out" aria-label="축소">－</button><button type="button" class="btn small" id="mz-home">전도</button></div>' +
    '<div class="gmap-crumb" id="mcrumb"></div></div>' +
    '<aside class="atlas-panel" id="mpanel" aria-live="polite"></aside>' +
    '<section class="zone-host" id="mzone" aria-live="polite" hidden></section></div>' +
    '<section class="dynbar" aria-label="왕조 연표"><div class="lbl">제왕연표 帝王年表 — 누르면 도읍이 지도에 표시됩니다</div><div class="dynrow" id="dynrow">' + dyn + "</div></section>";

  var svg = $("#gmap");
  MAPST = { vb: HOME_VIEW(), svg: svg, sel: null, theme: null, dyn: null, anim: 0 };
  setVB(clampVB(fitAspect(HOME_VIEW())));
  window.addEventListener("resize", function () { if (MAPST && MAPST.svg === svg) setVB(clampVB(fitAspect(Object.assign({}, MAPST.vb)))); });
  bindMapPointer(svg);
  $("#mz-in").onclick = function () { zoomBy(1.6); };
  $("#mz-out").onclick = function () { zoomBy(1 / 1.6); };
  $("#mz-home").onclick = function () { location.hash = "map"; };
  svg.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var zp = e.target.closest("[data-zid]"); if (zp) { e.preventDefault(); zonePick(zp); return; }
    var zg = e.target.closest("[data-go]"); if (zg) { e.preventDefault(); var zv = zg.dataset.go.split(":"); location.hash = "map-" + zv[0] + "-" + zv[1]; return; }
    var g = e.target.closest("[data-sect]"); if (g) { e.preventDefault(); location.hash = "map-s-" + g.dataset.sect; }
  });
  mapSelect(full, true);
}

/* 보기 영역 */
function setVB(v) {
  var st = MAPST; if (!st || !st.svg.isConnected) return; st.vb = v;
  st.svg.setAttribute("viewBox", v.x.toFixed(1) + " " + v.y.toFixed(1) + " " + v.w.toFixed(1) + " " + v.h.toFixed(1));
  var z = GEO.w / v.w; st.zoom = z;
  var r = st.svg.getBoundingClientRect(), ppu = r.width ? Math.min(r.width / v.w, (r.height || r.width) / v.h) : 1;
  var s = (1 / ppu) * Math.min(1.25, 0.9 + 0.08 * Math.log(z + 1));
  [].forEach.call(st.svg.querySelectorAll(".mk"), function (g) { g.setAttribute("transform", "translate(" + g.dataset.x + " " + g.dataset.y + ") scale(" + s.toFixed(3) + ")"); });
  $("#g-plabel").setAttribute("font-size", ((14 + Math.min(6, z)) / ppu).toFixed(2));
  var zl = $("#g-zlink"); if (zl) zl.style.setProperty("--u", (1 / ppu).toFixed(4));
  st.svg.classList.toggle("z2", z >= 1.8);
  st.svg.classList.toggle("z3", z >= 3.2);
}
function clampVB(v) {
  var W = GEO.w, H = GEO.h, minW = W / 14, maxW = W * 1.15;
  if (v.w > maxW) { v.h = v.h * maxW / v.w; v.w = maxW; }
  if (v.w < minW) { v.h = v.h * minW / v.w; v.w = minW; }
  v.x = Math.max(-W * 0.25, Math.min(W * 1.25 - v.w, v.x));
  v.y = Math.max(-H * 0.25, Math.min(H * 1.25 - v.h, v.y));
  return v;
}
function fitAspect(v) {
  var r = MAPST.svg.getBoundingClientRect(), ar = r.width && r.height ? r.width / r.height : GEO.w / GEO.h;
  if (v.w / v.h < ar) { var nw = v.h * ar; v.x -= (nw - v.w) / 2; v.w = nw; } else { var nh = v.w / ar; v.y -= (nh - v.h) / 2; v.h = nh; }
  return v;
}
function flyTo(target) {
  var st = MAPST, from = Object.assign({}, st.vb), to = clampVB(fitAspect(Object.assign({}, target)));
  if (REDUCE) { setVB(to); return; }
  cancelAnimationFrame(st.anim);
  var t0 = performance.now(), dur = 520;
  function step(t) {
    var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    setVB({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
    if (k < 1 && MAPST === st) st.anim = requestAnimationFrame(step);
  }
  st.anim = requestAnimationFrame(step);
}
function boxAround(pts, pad, minW) {
  var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var w = Math.max(x1 - x0, minW || 120), h = Math.max(y1 - y0, (minW || 120) * 0.6);
  var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { x: cx - w * (0.5 + pad), y: cy - h * (0.5 + pad), w: w * (1 + 2 * pad), h: h * (1 + 2 * pad) };
}
function zoomBy(f, cx, cy) {
  var v = MAPST.vb; if (cx == null) { cx = v.x + v.w / 2; cy = v.y + v.h / 2; }
  var nw = v.w / f, nh = v.h / f;
  setVB(clampVB({ x: cx - (cx - v.x) * (nw / v.w), y: cy - (cy - v.y) * (nh / v.h), w: nw, h: nh }));
}
function svgPoint(svg, clientX, clientY) {
  var r = svg.getBoundingClientRect(), v = MAPST.vb;
  return [v.x + (clientX - r.left) / r.width * v.w, v.y + (clientY - r.top) / r.height * v.h];
}
function bindMapPointer(svg) {
  var pts = {}, start = null, moved = false, pinch = null;
  svg.addEventListener("wheel", function (e) {
    e.preventDefault(); var p = svgPoint(svg, e.clientX, e.clientY);
    zoomBy(e.deltaY < 0 ? 1.25 : 0.8, p[0], p[1]);
  }, { passive: false });
  svg.addEventListener("pointerdown", function (e) {
    pts[e.pointerId] = [e.clientX, e.clientY];
    try { svg.setPointerCapture(e.pointerId); } catch (x) { }
    var ids = Object.keys(pts);
    if (ids.length === 1) { start = { x: e.clientX, y: e.clientY, vb: Object.assign({}, MAPST.vb), target: e.target }; moved = false; }
    if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: Object.assign({}, MAPST.vb) }; moved = true; }
  });
  svg.addEventListener("pointermove", function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(pts), r = svg.getBoundingClientRect();
    if (ids.length === 2 && pinch) {
      var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      var mid = svgPoint(svg, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      MAPST.vb = Object.assign({}, pinch.vb); zoomBy(d / pinch.d, mid[0], mid[1]); return;
    }
    if (!start) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    if (moved) setVB(clampVB({ x: start.vb.x - dx / r.width * start.vb.w, y: start.vb.y - dy / r.height * start.vb.h, w: start.vb.w, h: start.vb.h }));
  });
  function up(e) {
    var wasStart = start; delete pts[e.pointerId];
    if (Object.keys(pts).length < 2) pinch = null;
    if (!Object.keys(pts).length) start = null;
    if (!wasStart || moved || e.type === "pointercancel") return;
    var t = wasStart.target;
    var g = t.closest && t.closest("[data-zid],[data-go],[data-sect],[data-place],[data-cap],[data-prov]"); if (!g) return;
    if (g.dataset.zid) zonePick(g);
    else if (g.dataset.go) { var gv = g.dataset.go.split(":"); location.hash = "map-" + gv[0] + "-" + gv[1]; }
    else if (g.dataset.sect) location.hash = "map-s-" + g.dataset.sect;
    else if (g.dataset.place) location.hash = "map-x-" + g.dataset.place;
    else if (g.dataset.cap) location.hash = "map-x-" + g.dataset.cap;
    else if (g.dataset.prov) location.hash = "map-p-" + g.dataset.prov;
  }
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);
}

/* 지도 위 구역을 누르면 오른쪽 설명 칸 맨 위에 그 구역 카드를 연다 */
function zonePick(g) {
  if (!window.WXZ) return;
  var panel = $("#mpanel"), box = $("#zcard");
  if (!box) { panel.insertAdjacentHTML("afterbegin", '<div class="zcard" id="zcard"></div>'); box = $("#zcard"); }
  box.innerHTML = WXZ.card(g.dataset.zm, g.dataset.zid) + '<button type="button" class="zx" id="zcard-x" aria-label="구역 설명 닫기">×</button>';
  $("#zcard-x").onclick = function () { box.remove(); [].forEach.call(document.querySelectorAll(".zn.on"), function (x) { x.classList.remove("on"); }); };
  [].forEach.call(document.querySelectorAll(".zn.on"), function (x) { x.classList.remove("on"); }); g.classList.add("on");
  if (window.matchMedia && matchMedia("(max-width: 860px)").matches) box.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "nearest" });
}

/* 선택: #map, #map-p-성, #map-x-장소, #map-s-문파, #map-t-테마, #map-d-왕조 */
function mapSelect(full, first) {
  var st = MAPST; if (!st) return;
  var m = /^map(?:-([pxstd])-(.+))?$/.exec(full) || [];
  var kind = m[1] || "", id = m[2] || "";
  var panel = $("#mpanel"), crumb = $("#mcrumb");
  st.theme = kind === "t" ? id : null; st.dyn = kind === "d" ? id : null;
  [].forEach.call(document.querySelectorAll(".dyn"), function (a) { if (a.dataset.dyn === st.dyn) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
  var focusProv = "", hiPlaces = [], hiSects = [], target = null, html = "";
  var caps = [];

  if (kind === "p") {
    var P = provOf(id);
    if (P) {
      focusProv = P.id;
      var ps = MAPD.places.filter(function (x) { return x.prov === P.id; });
      var ss = MAPD.sects.filter(function (x) { return sectProv(x) === P.id; });
      hiSects = ss.map(function (x) { return x.id; });
      hiPlaces = ps.filter(function (x) { return !ss.some(function (q) { return q.place === x.id; }); }).map(function (x) { return x.id; });
      var b = P.bbox; target = { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] }; target = padBox(target, 0.18);
      html = '<div class="lbl">' + (P.outer ? "세외 塞外" : "성 省") + '</div><h2>' + esc(P.name) + '<span class="han">' + esc(P.han) + "</span></h2>" +
        (P.cap ? '<p class="meta"><span>성도 <b>' + esc(P.cap) + '</b> <span class="han" style="margin:0">' + esc(P.capHan) + "</span></span></p>" : '<p class="meta"><span>명나라 바깥 땅</span></p>') +
        (P.modern ? '<p class="hint">지금의 ' + esc(P.modern) + "</p>" : "") +
        listBlock("문파", ss.map(sectLink)) + listBlock("명산·명승", ps.map(placeLink)) +
        (!ss.length && !ps.length ? '<p class="hint">아직 이 성에 적어 둔 장소가 없어요. mapdata.js에 추가하면 여기 나타나요.</p>' : "");
    }
  } else if (kind === "x") {
    var X = mfind(MAPD.places, id);
    if (X) {
      var xy = mproj(X.at); focusProv = X.prov; hiPlaces = [X.id];
      var here = MAPD.sects.filter(function (s) { return s.place === X.id; }); hiSects = here.map(function (s) { return s.id; });
      target = { x: xy[0] - 90, y: xy[1] - 55, w: 180, h: 110 };
      var th = MAPD.themes.filter(function (t) { return t.places.indexOf(X.id) >= 0; });
      var PP = provOf(X.prov);
      html = '<div class="lbl">' + esc(X.kind) + "</div><h2>" + esc(X.name) + '<span class="han">' + esc(X.han) + "</span></h2>" +
        (PP ? '<p class="meta"><a href="#map-p-' + PP.id + '">' + esc(PP.name) + "</a></p>" : "") +
        '<p class="prose-s">' + esc(X.desc) + "</p>" +
        listBlock("이곳의 문파", here.map(sectLink)) +
        listBlock("묶음", th.map(function (t) { return '<a href="#map-t-' + t.id + '">' + esc(t.name) + "</a>"; }));
    }
  } else if (kind === "s") {
    var S = mfind(MAPD.sects, id);
    if (S) {
      var sxy = mproj(S.at); hiSects = [S.id]; focusProv = sectProv(S);
      target = S.group === "천마신교" ? boxAround(MAPD.sects.filter(function (x) { return x.group === "천마신교"; }).map(function (x) { return mproj(x.at); }), 0.25) : { x: sxy[0] - 110, y: sxy[1] - 66, w: 220, h: 132 };
      var grp = GROUPS[S.group], cond = grp && grp.schools[S.name];
      var PL = S.place && mfind(MAPD.places, S.place);
      var mgCount = hasData ? DATA.muk.filter(function (r) { return r.s === S.name; }).length : 0;
      html = '<div class="lbl">' + esc(S.group) + (grp ? " · " + esc(grp.field) + " 분야" : "") + '</div><h2><span class="seal-dot tone-' + (GROUP_TONE[S.group] || "ink") + '"></span>' + esc(S.name) + "</h2>" +
        '<p class="meta"><span>소재지 <b>' + esc(S.where) + "</b></span></p>" +
        (S.approx ? '<p class="hint">정확한 자리가 정해지지 않아 대략 찍었어요(점선 표식).</p>' : "") +
        (cond ? '<p class="prose-s">조건: 《' + cond.map(esc).join("》·《") + "》 중 하나를 익힐 것</p>" : "") +
        '<div class="mlinks">' +
        (mgCount ? '<button type="button" class="btn small" id="m-mg" data-g="' + esc(S.group) + '" data-s="' + esc(S.name) + '">무공록에서 무공 ' + mgCount + "개 보기</button>" : "") +
        (rulesHref(S.group) ? '<a class="btn small" href="' + rulesHref(S.group) + '">율령에서 문파 정보</a>' : "") +
        (PL ? '<a class="btn small" href="#map-x-' + PL.id + '">' + esc(PL.name) + "</a>" : "") + "</div>";
    }
  } else if (kind === "t") {
    var T = mfind(MAPD.themes, id);
    if (T) {
      hiPlaces = T.places.slice();
      target = boxAround(T.places.map(function (pid) { var q = mfind(MAPD.places, pid); return q ? mproj(q.at) : [0, 0]; }), 0.2, 160);
      html = '<div class="lbl">묶음</div><h2>' + esc(T.name) + '<span class="han">' + esc(T.han) + "</span></h2><p class=\"prose-s\">" + esc(T.note) + "</p>" +
        listBlock("", T.places.map(function (pid) { var q = mfind(MAPD.places, pid); return q ? placeLink(q) : ""; }));
    }
  } else if (kind === "d") {
    var D = mfind(MAPD.dynasties, id);
    if (D) {
      caps = D.caps;
      target = boxAround(D.caps.map(function (c) { return mproj([c[1], c[2]]); }), 0.6, 260);
      var yr = function (y) { return y < 0 ? "기원전 " + (-y) + "년" : y + "년"; };
      html = '<div class="lbl">제왕연표</div><h2>' + esc(D.name) + '<span class="han">' + esc(D.han) + "</span></h2>" +
        '<p class="meta"><span>' + yr(D.from) + " – " + yr(D.to) + "</span></p><p class=\"prose-s\">" + esc(D.note) + "</p>" +
        listBlock("도읍", D.caps.map(function (c) { return "<span>" + esc(c[0]) + "</span>"; }));
    }
  }
  if (!html) html = mapOverview();
  panel.innerHTML = html;
  if (window.WXZ) {
    WXZ.show($("#mzone"), kind, id);
    var ZL = WXZ.layerFor ? WXZ.layerFor(kind, id) : null;
    if (ZL && kind !== "p" && ZL.box) target = ZL.box;
    $("#g-zlink").innerHTML = ZL ? ZL.lines : ""; $("#g-znode").innerHTML = ZL ? ZL.nodes : "";
    st.svg.classList.toggle("zonemode", !!ZL);
    if (!$("#mzone").hidden) {
      panel.insertAdjacentHTML("beforeend", '<div class="mlinks"><button type="button" class="btn small" id="m-zone">구역도 보기 ↓</button></div>');
      $("#m-zone").onclick = function () { $("#mzone").scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" }); };
    }
  }
  var mg = $("#m-mg");
  if (mg) mg.onclick = function () { store("wx-f-muk", { g: mg.dataset.g, s: mg.dataset.s }); location.hash = "mugong"; };
  bindMapSearch();

  /* 강조 */
  st.svg.classList.toggle("focus", !!(focusProv || hiPlaces.length || hiSects.length || caps.length));
  [].forEach.call(st.svg.querySelectorAll(".prov"), function (p) { p.classList.toggle("on", p.dataset.prov === focusProv); });
  [].forEach.call(st.svg.querySelectorAll("[data-place]"), function (g) { g.classList.toggle("hi", hiPlaces.indexOf(g.dataset.place) >= 0); });
  [].forEach.call(st.svg.querySelectorAll("[data-sect]"), function (g) { g.classList.toggle("hi", hiSects.indexOf(g.dataset.sect) >= 0); });
  st.svg.classList.toggle("theme", kind === "t" || kind === "d");
  $("#g-caps").innerHTML = caps.map(function (c) {
    var xy = mproj([c[1], c[2]]);
    return '<g class="mk cap" data-x="' + xy[0].toFixed(1) + '" data-y="' + xy[1].toFixed(1) + '"><circle r="6"/><circle r="2.4" class="dot"/><text x="9" y="4">' + esc(c[0]) + "</text></g>";
  }).join("");
  setVB(st.vb);
  /* 빵부스러기 */
  var crumbs = ['<a href="#map">전도</a>'];
  if (focusProv && provOf(focusProv)) crumbs.push('<a href="#map-p-' + focusProv + '">' + esc(provOf(focusProv).name) + "</a>");
  var t = panel.querySelector("h2"); if (kind && kind !== "p" && t) crumbs.push("<span>" + esc(t.textContent.replace(/[㐀-鿿豈-﫿·]+$/, "")) + "</span>");
  crumb.innerHTML = crumbs.join("<i>›</i>");
  flyTo(target || HOME_VIEW());
}
function HOME_VIEW() { var a = mproj([70, 55.5]), b = mproj([138, 17]); return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] }; }
function padBox(b, p) { return { x: b.x - b.w * p, y: b.y - b.h * p, w: b.w * (1 + 2 * p), h: b.h * (1 + 2 * p) }; }
function listBlock(title, items) {
  items = items.filter(Boolean); if (!items.length) return "";
  return '<div class="mlist">' + (title ? "<h3>" + esc(title) + "</h3>" : "") + "<ul>" + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul></div>";
}
function sectLink(s) { return '<a href="#map-s-' + s.id + '"><span class="seal-dot tone-' + (GROUP_TONE[s.group] || "ink") + '"></span>' + esc(s.name) + '</a> <span class="hint">' + esc(s.group) + "</span>"; }
function placeLink(p) { return '<a href="#map-x-' + p.id + '">' + esc(p.name) + '</a> <span class="hint">' + esc(p.kind) + "</span>"; }
function rulesHref(group) {
  if (!hasData) return "";
  if (!RULES) RULES = parseRules(DATA.rules);
  for (var i = 0; i < RULES.length; i++) {
    if (RULES[i].title.indexOf("문파 정보") < 0) continue;
    for (var j = 0; j < RULES[i].subs.length; j++) if (RULES[i].subs[j].title === group) return "#rules-" + i + (j ? "-" + j : "");
    return "#rules-" + i;
  }
  return "";
}
function mapOverview() {
  var groups = Object.keys(GROUP_TONE).map(function (g) { return '<li><span class="seal-dot tone-' + GROUP_TONE[g] + '"></span>' + esc(g) + "</li>"; }).join("");
  return '<div class="lbl">전도 全圖</div><h2>중원과 세외</h2>' +
    '<div class="field"><label for="m-q">찾기</label><input id="m-q" type="search" placeholder="성·산·도시·문파 이름" autocomplete="off"></div><div id="m-res"></div>' +
    '<div class="mlist"><h3>묶음</h3><div class="chips">' + MAPD.themes.map(function (t) { return '<a class="chip" href="#map-t-' + t.id + '">' + esc(t.name) + "</a>"; }).join("") + "</div></div>" +
    '<div class="mlist"><h3>문파 표식</h3><ul class="legend">' + groups + '<li><span class="seal-dot approx"></span>점선: 위치 미정</li><li><span class="zring-dot"></span>고리: 구역도가 있는 곳</li></ul></div>' +
    '<p class="hint">지역을 누르면 지도 위에 그 지역의 구역과 길이 그려지고, 구역을 누르면 이 칸에 설명이 열립니다. 문파나 명승을 누르면 지도 아래에 그곳의 구역도가 열립니다.</p>' +
    listBlock("한 점에 찍지 않는 세력", MAPD.roaming.map(function (r) { return "<b>" + esc(r.name) + '</b> <span class="hint">' + esc(r.where) + "</span>"; }));
}
function bindMapSearch() {
  var q = $("#m-q"); if (!q) return;
  q.oninput = function () {
    var t = q.value.trim(), res = $("#m-res");
    if (!t) { res.innerHTML = ""; return; }
    var hit = [];
    GEO.provinces.forEach(function (p) { if ((p.name + p.han + p.cap + (p.modern || "")).indexOf(t) >= 0) hit.push('<a href="#map-p-' + p.id + '">' + esc(p.name) + '</a> <span class="hint">' + (p.outer ? "세외" : "성") + '</span>'); });
    MAPD.sects.forEach(function (s) { if ((s.name + s.where).indexOf(t) >= 0) hit.push(sectLink(s)); });
    MAPD.places.forEach(function (p) { if ((p.name + p.han + p.desc).indexOf(t) >= 0) hit.push(placeLink(p)); });
    res.innerHTML = hit.length ? listBlock("", hit.slice(0, 12)) : '<p class="hint">찾는 이름이 지도에 없어요.</p>';
  };
}

/* ───────── 저장소 연결 ───────── */
var DBH = null, CAN_EDIT = false;
function setupDb() {
  if (STANDALONE) { NEWS = (SITE.news || []).map(function (n, i) { return Object.assign({ id: "s" + i }, n); }); newsState = "ready"; drawNews(); return; }
  if (!window.claude || !claude.use) { newsState = "off"; gbState = "off"; pcsState = "off"; drawNews(); drawPosts(); return; }
  Promise.all([claude.use("db"), claude.use("user")]).then(function (r) {
    DBH = r[0]; var user = r[1];
    if (window.gmBoot) gmBoot(DBH);
    if (!DBH) { newsState = "off"; gbState = "off"; pcsState = "off"; drawNews(); drawPosts(); drawArchiveIfOpen(); return; }
    var p1 = user && user.canEdit ? Promise.resolve(user.canEdit()).catch(function () { return false; }) : Promise.resolve(false);
    var p2 = user && user.id ? Promise.resolve(user.id()).catch(function () { return null; }) : Promise.resolve(null);
    Promise.all([p1, p2]).then(function (v) {
      CAN_EDIT = !!v[0]; MY_ID = v[1]; drawNews(); drawPosts(); drawArchiveIfOpen();
      if (CAN_EDIT && window.gmOwner) gmOwner();
      watchSecrets();
      if (/^#builder$|^#builder\b(?!-)/.test(location.hash || "") && $("#sheet")) drawSheet(cur());

    });
    var t1 = setTimeout(function () { if (newsState === "loading") { newsState = "slow"; drawNews(); } }, 10000);
    var t2 = setTimeout(function () { if (gbState === "loading") { gbState = "slow"; drawPosts(); } }, 10000);
    DBH.collection("site/notices/items").onSnapshot(function (s) {
      NEWS = s.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); });
      if (!s.metadata || !s.metadata.fromCache) { clearTimeout(t1); newsState = "ready"; }
      drawNews();
    }, function () { clearTimeout(t1); newsState = "off"; drawNews(); });
    var t3 = setTimeout(function () { if (pcsState === "loading") { pcsState = "slow"; drawArchiveIfOpen(); } }, 10000);
    DBH.collection("pcs").onSnapshot(function (s) {
      PCS = s.docs.map(function (d) { var x = d.data() || {}; return { id: d.id, player: x.player || "", chars: Array.isArray(x.chars) ? x.chars : [], at: x.at }; });
      if (!s.metadata || !s.metadata.fromCache) { clearTimeout(t3); pcsState = "ready"; }
      drawArchiveIfOpen();
    }, function () { clearTimeout(t3); pcsState = "off"; drawArchiveIfOpen(); });
    DBH.collection("guestbook").onSnapshot(function (s) {
      GB = s.docs.map(function (d) { var x = d.data() || {}; return { id: d.id, posts: Array.isArray(x.posts) ? x.posts.slice() : [] }; });
      if (!s.metadata || !s.metadata.fromCache) { clearTimeout(t2); gbState = "ready"; }
      drawPosts();
    }, function () { clearTimeout(t2); gbState = "off"; drawPosts(); });
  });
}

/* ───────── 먹 번짐 등장 · 먹 잔상 ───────── */
var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
var revealObs = null;
if (!REDUCE && "IntersectionObserver" in window) {
  document.documentElement.classList.add("ink-ready");
  revealObs = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
}
function watchReveal() {
  var els = document.querySelectorAll(".reveal:not(.in), .scroll:not(.in)");
  [].forEach.call(els, function (el) { if (revealObs) revealObs.observe(el); else el.classList.add("in"); });
}
function inkTrail() {
  if (REDUCE || !window.matchMedia || !matchMedia("(pointer: fine)").matches) return;
  var c = document.createElement("canvas"); c.id = "inktrail"; c.setAttribute("aria-hidden", "true"); document.body.appendChild(c);
  var ctx = c.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), dots = [], running = false;
  function size() { c.width = innerWidth * dpr; c.height = innerHeight * dpr; c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px"; }
  size(); window.addEventListener("resize", size);
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    dots.push({ x: e.clientX, y: e.clientY, r: 5 + Math.random() * 7, a: .07 });
    if (dots.length > 60) dots.shift();
    if (!running) { running = true; requestAnimationFrame(tick); }
  }, { passive: true });
  function tick() {
    var ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1a1a1a";
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = ink;
    dots.forEach(function (d) { d.a *= .93; d.r *= 1.015; ctx.globalAlpha = d.a; ctx.beginPath(); ctx.arc(d.x * dpr, d.y * dpr, d.r * dpr, 0, 6.283); ctx.fill(); });
    dots = dots.filter(function (d) { return d.a > .004; });
    ctx.globalAlpha = 1;
    if (dots.length) requestAnimationFrame(tick); else { running = false; ctx.clearRect(0, 0, c.width, c.height); }
  }
}

/* ───────── 룰북 ───────── */
function cleanMd(md) {
  return String(md || "")
    .replace(/\[([\s\S]*?)\]\(about:blank\)/g, "$1")
    .replace(/\\+</g, "&lt;").replace(/\\+>/g, "&gt;")
    .replace(/\\+~/g, "~").replace(/\\\\+-/g, "-");
}
/* 구글 문서의 탭 제목은 "# 제목  "(끝 공백 2칸)으로, 탭 안의 제목은 "# 제목"으로 들어온다.
   탭 → 페이지, 탭 안 제목 → 하위 페이지 */
var HANJA = "[\\u3400-\\u9fff\\uf900-\\ufaff]";
var SCHOOL_LINE = new RegExp("^\\s*([가-힣]+(?:\\/[가-힣]+)?)\\s*(" + HANJA + "+(?:\\/" + HANJA + "+)?)\\s*$");
function parseRules(md) {
  if (window.WX_PATCH_RULES) md = WX_PATCH_RULES(md);
  var pages = [], page = null, sub = null;
  String(md || "").split("\n").forEach(function (line) {
    var tab = /^#\s+(.+?)\s{2,}$/.exec(line);
    var head = !tab && /^#\s+(.+?)\s*$/.exec(line);
    if (tab) { page = { title: tab[1].trim(), intro: [], subs: [] }; pages.push(page); sub = null; return; }
    if (!page) { page = { title: "개요", intro: [], subs: [] }; pages.push(page); }
    if (head) { sub = { title: head[1].trim(), lines: [] }; page.subs.push(sub); return; }
    var sm = SCHOOL_LINE.exec(line);
    if (sm) line = "### " + sm[1] + ' <span class="hanja">' + sm[2] + "</span>";
    (sub ? sub.lines : page.intro).push(line);
  });
  function blank(ls) { return !ls.join("").replace(/[\s\\—–-]/g, ""); }
  pages.forEach(function (p) {
    if (!p.subs.length && p.intro.some(function (l) { return /^##\s/.test(l); })) {
      var intro = [], cur = null;
      p.intro.forEach(function (l) {
        var h2 = /^##\s+(.+?)\s*$/.exec(l);
        if (h2) { cur = { title: h2[1].replace(/\*/g, "").trim(), lines: [] }; p.subs.push(cur); }
        else (cur ? cur.lines : intro).push(l);
      });
      p.intro = intro;
    }
    p.subs = p.subs.filter(function (s) { return !blank(s.lines); });
    var introText = p.intro.join("").replace(/[\s\\*—–-]/g, "");
    if (introText && introText !== p.title.replace(/\s/g, "")) p.subs.unshift({ title: p.subs.length ? "개요" : p.title, lines: p.intro, isIntro: true });
  });
  var drop = window.WX_RULE_DROP || [], order = window.WX_RULE_ORDER || [];
  function key(t) { return String(t).replace(/\s+/g, ""); }
  var dropK = drop.map(key), orderK = order.map(key);
  pages = pages.filter(function (p) { return p.subs.length && dropK.indexOf(key(p.title)) < 0; });
  return pages.map(function (p, i) { return [p, i]; }).sort(function (a, b) {
    var x = orderK.indexOf(key(a[0].title)), y = orderK.indexOf(key(b[0].title));
    if (x < 0) x = 900 + a[1]; if (y < 0) y = 900 + b[1];
    return x - y;
  }).map(function (v) { return v[0]; });
}
function mdHtml(lines) {
  var src = cleanMd(lines.join("\n")), html;
  try {
    html = window.marked ? marked.parse(src) : "<pre>" + esc(src) + "</pre>";
    if (window.DOMPurify) html = DOMPurify.sanitize(html);
  } catch (e) { html = "<pre>" + esc(src) + "</pre>"; }
  return html;
}
/* ── 룰북 안 연결: 구글 문서의 내부 링크는 about:blank로 들어오므로 제목으로 맞는 페이지를 찾아 잇는다 ── */
var RULE_KEYS = { "문파": "문파 정보", "특기": "특기", "성장": "성장", "오의": "오의", "진행": "진행", "세계관": "세계관" };
var RULE_ROUTE_KEYS = { "무공": "#mugong", "배경": "#background", "내력": "#background", "보급품": "#items", "도구": "#items", "기보": "#items", "개조": "#mods" };
function rulePageHref(title) {
  if (!RULES) return "";
  var t = String(title || "").replace(/\s+/g, "");
  for (var i = 0; i < RULES.length; i++) if (RULES[i].title.replace(/\s+/g, "") === t) return "#rules-" + i;
  return "";
}
function resolveRuleLink(text) {
  var t = String(text || "").replace(/세부\s*사항|설명|자세히|보기|목록|\s+/g, "");
  for (var k in RULE_KEYS) if (t.indexOf(k) >= 0) { var h = rulePageHref(RULE_KEYS[k]); if (h) return h; }
  var direct = rulePageHref(t); if (direct) return direct;
  for (var r in RULE_ROUTE_KEYS) if (t.indexOf(r) >= 0) return RULE_ROUTE_KEYS[r];
  return "";
}
function linkRuleRefs(src) {
  return src.replace(/\[([\s\S]*?)\]\(about:blank\)/g, function (m, txt) {
    var label = txt.replace(/\s+/g, " ").trim(), href = resolveRuleLink(label);
    return href ? "[" + label + "](" + href + ")" : label;
  });
}
/* 캐릭터 메이킹 각 단계에서 넘어갈 곳 */
var MAKING_REL = {
  "개요": [["인물지에서 바로 만들기", "#builder"]],
  "문파": [["문파 정보", "p:문파 정보"], ["문파 현황", "p:문파 현황"], ["문파 소재지 · 강호도", "#map"]],
  "특기": [["특기 전체 목록", "p:특기"]],
  "무공": [["무공록에서 찾기", "#mugong"]],
  "배경": [["내력에서 찾기", "#background"]],
  "보급품": [["기물에서 찾기", "#items"]],
  "오의": [["오의 형태·개조 규칙", "p:오의"], ["오의첩에서 찾기", "#mods"]],
  "캐릭터의 성장": [["성장 규칙", "p:성장"]]
};
function makingRel(P, S) {
  if (P.title.replace(/\s+/g, "") !== "캐릭터메이킹") return "";
  var rel = MAKING_REL[S.title] || [];
  var items = rel.map(function (r) { var h = r[1].indexOf("p:") === 0 ? rulePageHref(r[1].slice(2)) : r[1]; return h ? '<a class="rel-a" href="' + h + '">' + esc(r[0]) + "</a>" : ""; }).filter(Boolean);
  return items.length ? '<nav class="rel" aria-label="이어서 볼 곳"><span class="lbl">이어서 보기</span>' + items.join("") + "</nav>" : "";
}
function linkFlowSteps(doc, P, pi) {
  [].forEach.call(doc.querySelectorAll("ol.rflow > li"), function (li) {
    if (li.querySelector("a")) return;
    var txt = li.textContent;
    for (var j = 0; j < P.subs.length; j++) {
      var st = P.subs[j].title; if (P.subs[j].isIntro || !st || txt.indexOf(st) < 0) continue;
      li.innerHTML = '<a href="#rules-' + pi + (j ? "-" + j : "") + '">' + li.innerHTML + "</a>"; return;
    }
    var h = resolveRuleLink(txt); if (h && h.indexOf("#rules-" + pi) !== 0) li.innerHTML = '<a href="' + h + '">' + li.innerHTML + "</a>";
  });
}
/* ── 룰북 본문: 구글 문서 내보내기를 읽기 좋은 형태로 다시 짠다 ──
   "-항목"은 목록, "–"·"--"는 한 단계 안쪽, "—"는 두 단계 안쪽, "이름: 설명"은 용어와 설명,
   "A-> B-> C"는 순서 흐름, 짧은 단독 줄은 소제목, 표와 "- "로 시작하는 진짜 마크다운 목록은 그대로 둔다. */
function rInline(t) { try { return window.marked && marked.parseInline ? marked.parseInline(t) : esc(t); } catch (e) { return esc(t); } }
function rFlow(t) {
  if (t.indexOf("&gt;") < 0) return null;
  var parts = t.replace(/^\*\*|\*\*$/g, "").split(/\s*-?&gt;\s*/).map(function (s) { return s.replace(/\*\*/g, "").trim(); }).filter(Boolean);
  if (parts.length < 2 || parts.some(function (s) { return s.length > 22; })) return null;
  return '<ol class="rflow">' + parts.map(function (s) { return "<li>" + rInline(s) + "</li>"; }).join("") + "</ol>";
}
function rItem(level, t) {
  var cls = "l" + level, body;
  if (/^ex\s*[:：]/i.test(t)) return '<li class="' + cls + ' ex"><span class="exl">예</span>' + rInline(t.replace(/^ex\s*[:：]\s*/i, "")) + "</li>";
  var fl = rFlow(t); if (fl) return '<li class="' + cls + ' flowli">' + fl + "</li>";
  var parts = t.split(/\s*\/\s*/).filter(Boolean);
  if (parts.length >= 2 && parts.every(function (p) { return /^[^=]{1,12}=\S/.test(p); })) {
    return '<li class="' + cls + ' resli"><span class="res">' + parts.map(function (p) { var i = p.indexOf("="); return "<span><b>" + rInline(p.slice(0, i).trim()) + "</b>" + rInline(p.slice(i + 1).trim()) + "</span>"; }).join("") + "</span></li>";
  }
  var m = /^\*{0,2}([^:：=*]{1,16}?)\*{0,2}\s*([:：=])\s*(\S[\s\S]*)$/.exec(t);
  if (m && !/[.,。]/.test(m[1])) body = '<b class="term">' + rInline(m[1].trim()) + "</b>" + rInline(m[3]);
  else body = rInline(t);
  return '<li class="' + cls + '">' + body + "</li>";
}
function ruleHtml(lines) {
  var src = cleanMd(linkRuleRefs(lines.join("\n"))).split("\n"), out = [], md = [], list = false, first = true, prevList = false;
  function closeList() { if (list) { out.push("</ul>"); list = false; } }
  function flushMd() { if (md.length) { closeList(); out.push(mdHtml(md)); md = []; } }
  src.forEach(function (raw) {
    var t = raw.replace(/\u00a0/g, " ").trim().replace(/^\\+(?=[-–—])/, "").replace(/^(-+)\\+-/, "$1-");
    var realMd = /^\s*\|/.test(raw) || /^\s+[-*]\s/.test(raw) || /^[-*]\s/.test(raw) || /^\s*\d+\.\s/.test(raw);
    if (realMd || (md.length && /^\s{2,}\S/.test(raw) && !t.match(/^[-–—]/))) { md.push(raw); return; }
    if (md.length && t) flushMd();
    if (!t) { if (md.length) md.push(raw); else prevList = false; return; }
    if (/^#{1,6}\s/.test(t)) { closeList(); out.push(mdHtml([t])); first = false; prevList = false; return; }
    var lm = /^(—|–|-{1,3})\s*(\S[\s\S]*)$/.exec(t);
    if (lm) {
      var lv = lm[1] === "—" || lm[1] === "---" ? 3 : lm[1] === "–" || lm[1] === "--" ? 2 : 1;
      if (!list) { out.push('<ul class="rl">'); list = true; }
      out.push(rItem(lv, lm[2])); first = false; prevList = true; return;
    }
    var fl = rFlow(t);
    if (fl) { closeList(); out.push(fl); first = false; return; }
    var bold = /^\*\*([^*]+)\*\*\s*$/.exec(t);
    if (bold && bold[1].length <= 24) { closeList(); out.push('<h3 class="rh">' + esc(bold[1].trim()) + "</h3>"); first = false; prevList = false; return; }
    if (bold && first) { closeList(); out.push('<p class="epigraph">' + esc(bold[1].trim()) + "</p>"); first = false; return; }
    if (t.length <= 12 && !/[.。:：!?,]$/.test(t) && !/^[\d(]/.test(t) && !/\*\*/.test(t)) { closeList(); out.push('<h3 class="lab">' + esc(t) + "</h3>"); first = false; prevList = false; return; }
    if (list && prevList) { out.push('<li class="cont">' + rInline(t) + "</li>"); return; }
    closeList(); out.push("<p>" + rInline(t) + "</p>"); first = false;
  });
  flushMd(); closeList();
  var html = out.join("");
  if (window.DOMPurify) html = DOMPurify.sanitize(html);
  return html;
}
/* 강호도와 함께 만든 이동·길 규칙. 룰북 '메인'의 이동 항목 바로 뒤에 붙는다 */
function moveRulesHtml() {
  var L = (window.ZONES && ZONES.links) || {};
  var rows = Object.keys(L).map(function (k) { return '<tr><th><span class="lk-s ' + k + '"></span>' + esc(L[k][0]) + "</th><td>" + esc(L[k][1]) + "</td></tr>"; }).join("");
  var items = [
    ["한 번에 한 구역", "이동은 길로 이어진 구역 하나로 한다. 경공로는 판정에 성공하면 구역 하나를 건너뛰어 두 칸을 간다."],
    ["이동하는 때", "위 규칙대로 모든 PL이 동의했을 때나 사건이 일어났을 때 옮긴다. 전투 중에는 구역을 옮기지 않는다."],
    ["같은 구역", "같은 구역에 있는 캐릭터끼리만 한 자리에 모이고 전투할 수 있다. 전투는 전투 규칙(6×6 그리드)을 따른다."],
    ["지역 사이", "객잔과 객잔은 대로, 나루와 나루는 수로(물길이 지나는 지역끼리), 산야와 산야는 험로로 이어진다. 관문이나 바닷길처럼 지역마다 따로 이웃 지역과 이어진 구역도 있다."],
    ["특별 지역", "문파 본산, 명승, 세외는 지역 지도의 입구 구역에서 들어간다. 순천부·남경·개봉부·서안부·성도부·항주는 성도 구역 자체가 입구다."],
    ["구역 효과", "판정 수정, 은신 보정, 야영 제한만 준다. 들어가는 것만으로 생명력이 깎이는 구역은 없다. 본거지 구역에서는 그 문파 소속만 야영할 수 있다."],
    ["떠도는 세력", "본거지가 없는 세력은 구역 종류로 만난다. 녹림은 산야, 장강수로채는 장강 지역의 나루, 흑상 정기시는 성도, 상회와 표국은 객잔."]
  ].map(function (r) { return '<li class="l1"><b class="term">' + esc(r[0]) + "</b>" + esc(r[1]) + "</li>"; }).join("");
  return '<aside class="rule-box" id="move-rules"><div class="rbx-head"><span class="lbl">강호도 이동 규칙</span><a class="btn small" href="#map">강호도 열기</a></div>' +
    '<p class="rbx-lead">각 지역의 지도와 구역은 강호도에서 본다. 지역을 누르면 지도 위에 그 지역의 구역과 길이 그려지고, 구역을 누르면 설명이 열린다.</p>' +
    '<ul class="rl">' + items + '</ul><div class="tablewrap"><table class="rbx-links"><tbody>' + rows + "</tbody></table></div></aside>";
}
function attachMoveRules(doc) {
  var li = [].filter.call(doc.querySelectorAll("ul.rl > li"), function (x) { return /^이동\s*[:：]?/.test(x.textContent.trim()); })[0];
  if (!li) return;
  var ul = li.parentNode, rest = document.createElement("ul"); rest.className = "rl";
  while (li.nextSibling) rest.appendChild(li.nextSibling);
  ul.insertAdjacentHTML("afterend", moveRulesHtml());
  if (rest.children.length) ul.nextSibling.insertAdjacentElement("afterend", rest);
}
function renderRules(full) {
  if (!RULES) RULES = parseRules(DATA.rules);
  var m = /^rules(?:-(\d+))?(?:-(\d+))?$/.exec(full) || [];
  var pi = Math.min(Number(m[1] || 0), RULES.length - 1), si = Number(m[2] || 0);
  var P = RULES[pi]; if (!P) { view.innerHTML = '<div class="empty"><p>룰 문서가 비어 있어요.</p></div>'; return; }
  if (si >= P.subs.length) si = 0;
  var S = P.subs[si];
  /* 앞뒤 하위 페이지 */
  var flat = [];
  RULES.forEach(function (p, i) { p.subs.forEach(function (s, j) { flat.push({ p: i, s: j, label: p.title + (p.subs.length > 1 ? " · " + s.title : "") }); }); });
  var at = flat.findIndex(function (x) { return x.p === pi && x.s === si; });
  var prev = flat[at - 1], next = flat[at + 1];
  function href(x) { return "#rules-" + x.p + (x.s ? "-" + x.s : ""); }

  var nav = RULES.map(function (p, i) {
    var on = i === pi;
    return '<div class="toc-page' + (on ? " on" : "") + '"><a href="#rules-' + i + '"' + (on ? ' aria-current="page"' : "") + ">" + esc(p.title) + "</a>" +
      (on && p.subs.length > 1 ? '<div class="toc-subs">' + p.subs.map(function (s, j) { return '<a href="#rules-' + i + (j ? "-" + j : "") + '"' + (j === si ? ' aria-current="page"' : "") + ">" + esc(s.title) + "</a>"; }).join("") + "</div>" : "") + "</div>";
  }).join("");
  var pageSel = RULES.map(function (p, i) { return '<option value="' + i + '"' + (i === pi ? " selected" : "") + ">" + esc(p.title) + "</option>"; }).join("");
  var subTabs = P.subs.length > 1 ? '<nav class="subtabs" aria-label="' + esc(P.title) + ' 하위 페이지">' + P.subs.map(function (s, j) {
    return '<a href="#rules-' + pi + (j ? "-" + j : "") + '"' + (j === si ? ' aria-current="page"' : "") + ">" + esc(s.title) + "</a>";
  }).join("") + "</nav>" : "";

  view.innerHTML = ruleBar("") + '<div class="rules"><nav class="toc" aria-label="룰북 목차">' + nav + "</nav>" +
    '<div style="min-width:0"><select class="toc-select" id="tocsel" aria-label="룰북 페이지">' + pageSel + "</select>" +
    '<div class="page-head"><div class="lbl">룰북 ' + (pi + 1) + " / " + RULES.length + "</div><h1>" + esc(P.title) + "</h1></div>" + subTabs +
    '<article class="doc rich" id="doc">' + (P.subs.length > 1 ? "<h2 class=\"sub-title\">" + esc(S.title) + "</h2>" : "") + ruleHtml(S.lines) + makingRel(P, S) + "</article>" +
    '<nav class="pager">' + (prev ? '<a href="' + href(prev) + '"><span class="lbl">이전</span>' + esc(prev.label) + "</a>" : "<span></span>") +
    (next ? '<a class="next" href="' + href(next) + '"><span class="lbl">다음</span>' + esc(next.label) + "</a>" : "<span></span>") + "</nav></div></div>";
  var doc = $("#doc");
  attachMoveRules(doc);
  linkFlowSteps(doc, P, pi);
  [].forEach.call(doc.querySelectorAll("table"), function (t) { var w = document.createElement("div"); w.className = "tablewrap"; t.parentNode.insertBefore(w, t); w.appendChild(t); });
  $("#tocsel").onchange = function (e) { location.hash = "rules-" + e.target.value; };
}

/* ───────── 공통 DB 화면 ───────── */
function dbPage(cfg) {
  var st = store("wx-f-" + cfg.key) || {};
  var shown = 80;
  view.innerHTML = viewHead(cfg.route, cfg.desc) + '<div class="db"><aside class="filters" id="filters">' + cfg.filters(st) + '</aside><section style="min-width:0"><div id="dbtop"></div><div class="count" id="count"></div><div class="list" id="list"></div><div class="more"><button class="btn" id="more" hidden>더 보기</button></div></section></div>';
  var fEl = $("#filters");
  function read() {
    var s = {};
    [].forEach.call(fEl.querySelectorAll("[data-f]"), function (el) {
      if (el.classList.contains("chip")) { if (el.getAttribute("aria-pressed") === "true") (s[el.dataset.f] = s[el.dataset.f] || []).push(el.dataset.v); }
      else s[el.dataset.f] = el.value;
    });
    return s;
  }
  function draw(reset) {
    if (reset) shown = 80;
    var s = read(); store("wx-f-" + cfg.key, s);
    if (cfg.sync) cfg.sync(s, fEl);
    var rows = cfg.rows.filter(function (r) { return cfg.match(r, s); });
    $("#dbtop").innerHTML = cfg.top ? cfg.top(s, rows) || "" : "";
    $("#count").textContent = rows.length + "개" + (rows.length !== cfg.rows.length ? " / 전체 " + cfg.rows.length + "개" : "");
    $("#list").innerHTML = rows.slice(0, shown).map(cfg.card).join("") || '<p class="hint">조건에 맞는 항목이 없어요.</p>';
    $("#more").hidden = rows.length <= shown;
  }
  fEl.addEventListener("input", function () { draw(true); });
  fEl.addEventListener("click", function (e) {
    var c = e.target.closest(".chip"); if (!c) return;
    c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true"); draw(true);
  });
  $("#more").addEventListener("click", function () { shown += 80; draw(); });
  draw(true);
}
function opts(list, cur, all) { return '<option value="">' + (all || "전체") + "</option>" + list.map(function (v) { return '<option' + (v === cur ? " selected" : "") + ">" + esc(v) + "</option>"; }).join(""); }
function uniq(arr) { var o = []; arr.forEach(function (v) { if (v && o.indexOf(v) < 0) o.push(v); }); return o; }
function chips(f, list, cur) { cur = cur || []; return '<div class="chips">' + list.map(function (v) { return '<button type="button" class="chip" data-f="' + f + '" data-v="' + esc(v) + '" aria-pressed="' + (cur.indexOf(v) >= 0) + '">' + esc(v) + "</button>"; }).join("") + "</div>"; }
function q(r, s, keys) { if (!s.q) return true; var t = s.q.trim().toLowerCase(); return keys.some(function (k) { return String(r[k] || "").toLowerCase().indexOf(t) >= 0; }); }
function lore(d) { return d ? '<details class="lore-d"><summary>내력</summary><div class="lore">' + esc(d) + "</div></details>" : ""; }

/* 무공 */
function mukCard(r) {
  return '<article class="card edge"><div class="card-head"><h3>' + nameHtml(r.n) + '</h3><span class="tag t-' + esc(r.t) + '">' + esc(r.t) + '</span><span class="lv">' + esc(r.lv) + "</span></div>" +
    '<div class="meta"><span>간격 <b>' + esc(r.r || "—") + '</b></span><span>코스트 <b>' + esc(r.c || "—") + '</b></span><span>지정특기 <b>' + (r.sk && r.sk !== "—" ? "《" + esc(r.sk) + "》" : "—") + "</b></span><span>" + esc(r.g) + (r.s && r.s !== r.g ? " · " + esc(r.s) : "") + "</span></div>" +
    '<div class="effect">' + esc(r.e) + "</div>" + lore(r.d) + "</article>";
}
function renderMugong() {
  var R = DATA.muk, initS = (store("wx-f-muk") || {}).s || "";
  dbPage({
    key: "muk", route: "mugong", desc: "이름이나 효과 문구로 찾고, 문파·종류·경지·지정특기로 거릅니다.", rows: R,
    filters: function (s) {
      return '<div class="field"><label for="f-q">검색 (이름·효과)</label><input id="f-q" type="search" data-f="q" value="' + esc(s.q || "") + '" placeholder="예: 내상, 유리점"></div>' +
        '<div class="field"><label for="f-g">문파 계열</label><select id="f-g" data-f="g">' + opts(uniq(R.map(function (r) { return r.g; })), s.g) + "</select></div>" +
        '<div class="field"><label for="f-s">문파</label><select id="f-s" data-f="s"></select></div>' +
        '<div class="field"><span class="lbl">종류</span>' + chips("t", ["공격", "보조", "장비"], s.t) + "</div>" +
        '<div class="field"><span class="lbl">경지</span>' + chips("lv", LEVELS, s.lv) + "</div>" +
        '<div class="field"><label for="f-sk">지정특기</label><select id="f-sk" data-f="sk">' + opts((DATA.skills || []).map(function (x) { return x.n; }), s.sk) + "</select></div>";
    },
    sync: function (s, fEl) {
      var sel = $("#f-s", fEl), cur = sel.value || initS; initS = "";
      var list = uniq(R.filter(function (r) { return !s.g || r.g === s.g; }).map(function (r) { return r.s; }));
      if (sel.dataset.for !== (s.g || "")) { sel.innerHTML = opts(list, list.indexOf(cur) >= 0 ? cur : ""); sel.dataset.for = s.g || ""; }
      s.s = sel.value;
    },
    match: function (r, s) {
      return q(r, s, ["n", "e"]) && (!s.g || r.g === s.g) && (!s.s || r.s === s.s) &&
        (!s.t || !s.t.length || s.t.indexOf(r.t) >= 0) && (!s.lv || !s.lv.length || s.lv.indexOf(r.lv) >= 0) && (!s.sk || r.sk === s.sk);
    },
    top: function (s, rows) {
      var sch = s.s || (rows.length && rows.every(function (r) { return r.s === rows[0].s; }) ? rows[0].s : "");
      var E = (window.WX_ENGINES || {})[sch]; if (!E) return "";
      return '<div class="eng-head"><div class="eng-k">' + esc(sch) + ' · ' + esc(E[0]) + '</div><div class="eng-n">' + esc(E[1]) + '</div><p>' + esc(E[2]) + '</p>' +
        (/^(기세|표식)$/.test(E[0]) ? '<p class="hint">기세·표식은 같은 이름끼리 3까지 쌓이고 전투가 끝나면 사라진다(룰북 \'진행 → 전투\').</p>' : "") + "</div>";
    },
    card: mukCard
  });
}

/* 배경 */
function simpleCard(r, metaHtml) {
  return '<article class="card edge"><div class="card-head"><h3>' + nameHtml(r.n) + '</h3><span class="tag t-' + esc(r.t) + '">' + esc(r.t) + "</span></div>" +
    (metaHtml ? '<div class="meta">' + metaHtml + "</div>" : "") + '<div class="effect">' + esc(r.e) + "</div>" + lore(r.d) + "</article>";
}
function renderBg() {
  var R = DATA.bg;
  dbPage({
    key: "bg", route: "background", desc: "범용과 문파 전용 장점·단점.", rows: R,
    filters: function (s) {
      return '<div class="field"><label for="f-q">검색</label><input id="f-q" type="search" data-f="q" value="' + esc(s.q || "") + '"></div>' +
        '<div class="field"><span class="lbl">종류</span>' + chips("t", uniq(R.map(function (r) { return r.t; })), s.t) + "</div>" +
        '<div class="field"><label for="f-s">문파</label><select id="f-s" data-f="s">' + opts(uniq(R.map(function (r) { return r.s; })), s.s) + "</select></div>";
    },
    match: function (r, s) { return q(r, s, ["n", "e"]) && (!s.t || !s.t.length || s.t.indexOf(r.t) >= 0) && (!s.s || r.s === s.s); },
    card: function (r) { return simpleCard(r, "<span>" + esc(r.g) + (r.s !== r.g ? " · " + esc(r.s) : "") + "</span>"); }
  });
}

/* 도구 (+공개된 기보) */
function renderItems() {
  var R = DATA.items.concat((DATA.gibo || []).map(function (g) { g.kibo = true; return g; }));
  dbPage({
    key: "items", route: "items", desc: "보급품·영약·도구와, 발견되어 공개된 기보.", rows: R,
    filters: function (s) {
      return '<div class="field"><label for="f-q">검색</label><input id="f-q" type="search" data-f="q" value="' + esc(s.q || "") + '"></div>' +
        '<div class="field"><span class="lbl">분류</span>' + chips("t", uniq(R.map(function (r) { return r.t; })), s.t) + "</div>" +
        '<div class="field"><span class="lbl">획득처</span>' + chips("src", uniq(R.map(function (r) { return r.src; })), s.src) + "</div>" +
        '<p class="hint">기보(히든피스)는 발견되어 시트에서 공개 체크된 것만 보여요.</p>';
    },
    match: function (r, s) { return q(r, s, ["n", "e"]) && (!s.t || !s.t.length || s.t.indexOf(r.t) >= 0) && (!s.src || !s.src.length || s.src.indexOf(r.src) >= 0); },
    card: function (r) { return simpleCard(r, "<span>" + esc(r.src) + "</span>" + (r.p && r.p !== "—" ? "<span>가격 <b>" + esc(r.p) + "</b></span>" : "")); }
  });
}

/* 오의 개조 */
function renderMods() {
  var R = DATA.mods;
  dbPage({
    key: "mods", route: "mods", desc: "오의에 붙이는 강점과 약점. 강점 하나에 약점 하나가 짝입니다.", rows: R,
    filters: function (s) {
      return '<div class="field"><label for="f-q">검색</label><input id="f-q" type="search" data-f="q" value="' + esc(s.q || "") + '"></div>' +
        '<div class="field"><span class="lbl">타입</span>' + chips("t", uniq(R.map(function (r) { return r.t; })), s.t) + "</div>" +
        '<div class="field"><span class="lbl">대상 오의</span>' + chips("f", ["연환", "흡성", "신법", "호신강기"], s.f) + "</div>" +
        '<p class="hint">개조는 강점 하나에 약점 하나를 함께 골라요. 절정부터는 개조 점수만큼 약점을 덜 고를 수 있어요.</p>';
    },
    match: function (r, s) { return q(r, s, ["n", "e"]) && (!s.t || !s.t.length || s.t.indexOf(r.t) >= 0) && (!s.f || !s.f.length || s.f.some(function (f) { return modFits(r, f); })); },
    card: function (r) { return simpleCard(r, "<span>대상 <b>" + esc(r.tgt) + "</b></span><span>" + esc(r.lim) + "</span>"); }
  });
}
function modFits(m, form) { return !m.tgt || m.tgt.indexOf("모든") >= 0 || m.tgt.indexOf(form) >= 0; }

/* ───────── 캐릭터 빌더 ───────── */
function blankChar() { return { id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: "", alias: "", lv: "삼류", group: "", school: "", skills: [], mg: [], bg: [], items: {}, money: 0, ougi: [], ogVer: 3, mkVer: 2, notes: "", other: false, gapManual: false, gaps: [], wrapH: false, wrapV: false, exp: 0, expLog: [], status: "플레이 중", portrait: "", pub: false, rel: [], atk: "" }; }
var STATUSES = ["플레이 중", "쉬는 중", "은퇴", "사망"];
/* 예전에 만든 캐릭터에도 새 칸을 채운다 */
var BASIC_ATK = "접근전 공격";
/* 무공 이름 판: mkVer가 WX_MK_VER보다 낮으면 익힌 무공 이름을 지금 이름으로 옮긴다(rulefix.js WX_RENAME_ALL) */
function mkUp(c) { var V = window.WX_MK_VER || 0; if ((c.mkVer || 0) >= V || !window.WX_RENAME_MG) return false; var r = WX_RENAME_MG(c.mg); c.mg = r.list; c.mkVer = V; return r.changed; }
/* 오의 판: ogVer 2 = 2차 개편(옛 6형태 + 새 4형태), 3 = 옛 6형태 폐지(새 4형태만).
   2 → 3은 지우지 않고 새 형태로 옮긴다(rulefix.js WX_OG). 그보다 옛것은 지운다. */
var OG_VER = 3;
function ogUp(c) {
  if (c.ogVer === OG_VER) return false;
  if (c.ogVer === 2 && window.WX_OG) { var r = WX_OG.migrate(c.ougi, (c.group || "") + " " + (c.school || "")); c.ougi = r.list; c.ogVer = OG_VER; return r.changed; }
  var had = (c.ougi || []).length > 0; c.ougi = []; c.ogN = 0; c.ogVer = OG_VER; return had;
}
function fixChar(c) { ogUp(c); mkUp(c); var b = blankChar(); Object.keys(b).forEach(function (k) { if (c[k] === undefined) c[k] = b[k]; }); if ((c.mg || []).indexOf(BASIC_ATK) >= 0) c.mg = c.mg.filter(function (n) { return n !== BASIC_ATK; }); return c; }
/* 접근전 공격은 누구나 기본으로 가진다. 무공 수에 들지 않고 지정특기만 고른다(자유) */
function atkLine(c) { return "<li><b>접근전 공격</b> 공격 · 간격 1 · 코스트 0 · 《" + esc(c.atk || "지정특기 미정") + '》 <span class="hint">기본</span><div class="eff">접근전 1점.</div></li>'; }
function atkOpts(c) {
  var own = (c.skills || []).slice(), rest = (DATA.skills || []).map(function (x) { return x.n; }).filter(function (n) { return own.indexOf(n) < 0; });
  function o(v) { return "<option" + (v === c.atk ? " selected" : "") + ">" + esc(v) + "</option>"; }
  return '<option value="">고르세요</option>' + (own.length ? '<optgroup label="익힌 특기">' + own.map(o).join("") + "</optgroup>" : "") + '<optgroup label="다른 특기">' + rest.map(o).join("") + "</optgroup>";
}

/* ── 판정치: 캐릭터 시트와 같은 규칙 ──
   익힌 특기 5, 위아래 +1, 옆 분야 +2 (갭이 메워져 있으면 +1), 끝 연결은 선택, 최대 24.
   갭 수동 설정을 끄면 계열 전문분야 양옆 갭이 메워진다. 갭 g는 FIELDS[g-1]과 FIELDS[g] 사이 (0 = 술법-병기). */
var GAP_NAMES = ["술법-병기", "병기-외공", "외공-내공", "내공-강호", "강호-지략", "지략-술법"];
function gapFilled(c, g) {
  if (c.gapManual) return !!(c.gaps || [])[g];
  var home = GROUPS[c.group] && GROUPS[c.group].field; if (!home) return false;
  return FIELDS[(g + 5) % 6] === home || FIELDS[g] === home;
}
function targets(c) {
  var cols = FIELDS.map(function (f) { return (DATA.skills || []).filter(function (s) { return s.f === f; }); });
  var rows = Math.max.apply(null, cols.map(function (x) { return x.length; }).concat([0]));
  var v = cols.map(function (col) { return col.map(function (s) { return c.skills.indexOf(s.n) >= 0 ? 5 : 24; }); });
  function at(ci, ri) { return v[ci] && v[ci][ri] !== undefined ? v[ci][ri] : null; }
  for (var pass = 0, changed = true; changed && pass < 80; pass++) {
    changed = false;
    for (var ci = 0; ci < 6; ci++) for (var ri = 0; ri < cols[ci].length; ri++) {
      if (v[ci][ri] === 5 && c.skills.indexOf(cols[ci][ri].n) >= 0) continue;
      var best = 24, n;
      [[ri - 1], [ri + 1]].forEach(function (r) {
        var rr = r[0];
        if (c.wrapV) rr = (rr + rows) % rows;
        n = at(ci, rr); if (n !== null) best = Math.min(best, n + 1);
      });
      var left = ci - 1, right = ci + 1;
      if (left >= 0 || c.wrapH) { var lc = (left + 6) % 6; n = at(lc, ri); if (n !== null) best = Math.min(best, n + 2 - (gapFilled(c, ci) ? 1 : 0)); }
      if (right <= 5 || c.wrapH) { var rc = right % 6; n = at(rc, ri); if (n !== null) best = Math.min(best, n + 2 - (gapFilled(c, rc) ? 1 : 0)); }
      if (best < v[ci][ri]) { v[ci][ri] = best; changed = true; }
    }
  }
  var out = {};
  cols.forEach(function (col, ci) { col.forEach(function (s, ri) { out[s.n] = v[ci][ri]; }); });
  return out;
}
var chars = store("wx-chars") || [];
(function () { var n = 0, m = 0; chars.forEach(function (c) { if (mkUp(c)) m++; }); if (m) store("wx-chars", chars); chars.forEach(function (c) { if (ogUp(c)) n++; }); if (n) { store("wx-chars", chars); setTimeout(function () { toast("옛 오의 형태(일격·광역·각성·영역·방어·회복)가 없어져 새 형태로 옮겼어요. 오의를 확인해 주세요"); }, 800); } })();
var curId = store("wx-cur");
if (!chars.length) { chars = [blankChar()]; }
chars.forEach(fixChar);
function cur() { var c = chars.filter(function (x) { return x.id === curId; })[0]; if (!c) { c = chars[0]; curId = c.id; } return c; }
function save() { store("wx-chars", chars); store("wx-cur", curId); var c = chars.filter(function (x) { return x.id === curId; })[0]; if (c && c.pub) queuePub(c); }

function isGeneral(r) { return r.g === "범용" || r.s === "범용"; }
function schoolMatch(r, c) { return c.school && (norm(r.s) === norm(c.school) || norm(r.g) === norm(c.school)); }

function renderBuilder() {
  var c = cur();
  var L = LIMITS[c.lv];
  var grp = GROUPS[c.group];
  var cond = grp && grp.schools[c.school] || [];
  var skillsBy = {};
  (DATA.skills || []).forEach(function (s) { (skillsBy[s.f] = skillsBy[s.f] || []).push(s); });

  var charOpts = chars.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.id ? " selected" : "") + ">" + esc(x.name || "이름 없는 협객") + "</option>"; }).join("");

  /* 특기표 */
  var maxRows = Math.max.apply(null, FIELDS.map(function (f) { return (skillsBy[f] || []).length; }).concat([0]));
  var TG = targets(c);
  function gapTh(g) {
    var on = gapFilled(c, g), dim = g === 0 && !c.wrapH;
    return '<th class="gap' + (on ? " filled" : "") + (dim ? " dim" : "") + '"><button type="button" class="gapbtn" data-gap="' + g + '"' + (c.gapManual ? "" : " disabled") +
      ' aria-pressed="' + on + '" aria-label="' + GAP_NAMES[g] + " 갭" + (on ? " 메움" : " 비움") + '" title="' + GAP_NAMES[g] + (on ? " · 메움" : " · 비움") + '"></button></th>';
  }
  var tbl = '<table><thead><tr>' + FIELDS.map(function (f, i) { return gapTh(i) + '<th class="' + (grp && grp.field === f ? "home" : "") + '">' + f + "</th>"; }).join("") + "</tr></thead><tbody>";
  for (var i = 0; i < maxRows; i++) {
    tbl += "<tr>" + FIELDS.map(function (f, fi) {
      var gapTd = '<td class="gap' + (gapFilled(c, fi) ? " filled" : "") + (fi === 0 && !c.wrapH ? " dim" : "") + '"></td>';
      var s = (skillsBy[f] || [])[i]; if (!s) return gapTd + "<td></td>";
      var t = TG[s.n], tCls = t >= 24 ? "none" : t <= 5 ? "five" : t <= 7 ? "easy" : t <= 9 ? "mid" : "hard";
      return gapTd + '<td><button type="button" class="sk' + (cond.indexOf(s.n) >= 0 ? " cond" : "") + '" data-sk="' + esc(s.n) + '" title="' + esc(s.d) + '" aria-pressed="' + (c.skills.indexOf(s.n) >= 0) + '"><span>' + esc(s.n) + '</span><span class="tn ' + tCls + '">' + (t >= 24 ? "—" : t) + "</span></button></td>";
    }).join("") + "</tr>";
  }
  tbl += "</tbody></table>";
  var gapCtl = '<div class="gapctl"><label><input type="checkbox" id="b-gm"' + (c.gapManual ? " checked" : "") + "> 갭 수동 설정</label>" +
    '<label><input type="checkbox" id="b-wh"' + (c.wrapH ? " checked" : "") + "> 좌우 끝 연결</label>" +
    '<label><input type="checkbox" id="b-wv"' + (c.wrapV ? " checked" : "") + "> 위아래 끝 연결</label></div>";

  var supplies = DATA.items.filter(function (r) { return r.t === "보급품"; });
  var supN = Object.keys(c.items).reduce(function (a, k) { return a + c.items[k]; }, 0);

  view.innerHTML =
    viewHead("builder", "문파와 경지를 고르면 고를 수 있는 특기·무공·배경이 추려지고, 오른쪽 시트가 규칙에 맞는지 바로 검사합니다.") + builderTabs("make") +
    '<div class="chars"><label class="lbl" for="b-char">캐릭터</label><select id="b-char">' + charOpts + '</select>' +
    '<button class="btn small" id="b-new" type="button">새 캐릭터</button><button class="btn small" id="b-roll" type="button" aria-expanded="false">무작위 생성</button><button class="btn small danger" id="b-del" type="button">이 캐릭터 지우기</button><span id="b-delc" hidden> 정말 지울까요? <button class="btn small danger" id="b-dely" type="button">지우기</button> <button class="btn small" id="b-deln" type="button">취소</button></span></div>' +
    rollPanelHtml(c) +
    '<div class="builder"><div style="min-width:0">' +

    '<section class="step"><div class="step-h"><h2>문파와 경지</h2></div><div class="row2">' +
    '<div class="field"><label for="b-name">이름</label><input id="b-name" value="' + esc(c.name) + '"></div>' +
    '<div class="field"><label for="b-alias">별호</label><input id="b-alias" value="' + esc(c.alias) + '"></div>' +
    '<div class="field"><label for="b-lv">경지</label><select id="b-lv">' + LEVELS.map(function (l) { return "<option" + (l === c.lv ? " selected" : "") + ">" + l + "</option>"; }).join("") + "</select></div>" +
    '<div class="field"><label for="b-group">계열</label><select id="b-group">' + opts(Object.keys(GROUPS), c.group, "고르세요") + "</select></div>" +
    '<div class="field"><label for="b-school">문파</label><select id="b-school">' + opts(grp ? Object.keys(grp.schools) : [], c.school, "고르세요") + "</select></div>" +
    '<div class="field"><label for="b-status">상태</label><select id="b-status">' + STATUSES.map(function (v) { return "<option" + (v === c.status ? " selected" : "") + ">" + v + "</option>"; }).join("") + "</select></div>" +
    "</div>" +
    '<div class="pt-row"><div class="pt-box">' + portraitHtml(c) + '</div><div class="pt-ctl"><span class="lbl">초상</span><label class="btn small" for="b-pt">그림 고르기</label><input type="file" id="b-pt" accept="image/*" class="vh">' +
    (c.portrait ? '<button class="btn small danger" type="button" id="b-ptdel">초상 지우기</button>' : "") + '<span class="hint">사진·그림 파일을 고르면 작게 줄여서 담아요.</span></div></div>' +
    '<p class="hint">' + esc(c.lv) + ": 특기 " + L.sk + " · 무공 " + L.mg + " · 배경 " + L.bg + " · 오의 " + L.og + " · 개조 점수 " + L.mod + (L.exp ? " · 필요 경험치 " + L.exp : "") + "</p></section>" +

    '<section class="step"><div class="step-h"><h2>특기</h2>' + quota(c.skills.length, L.sk) + "</div>" +
    '<p class="hint">' + (grp ? "《" + cond.join(cond.length > 2 ? "》, 《" : "》이나 《") + "》 중 하나(밑줄)를 익히고, " + grp.field + " 분야에서 2개 이상 고르세요." : "문파를 먼저 고르면 조건 특기가 표시돼요.") + " 칸의 숫자는 판정치예요. 익힌 특기는 5, 위아래 한 칸마다 +1, 옆 분야로 넘어가면 +2(갭이 메워져 있으면 +1)." +
    (c.gapManual ? " 분야 사이 세로줄을 눌러 갭을 메우거나 비울 수 있어요." : grp ? " 지금은 " + grp.field + " 양옆 갭이 자동으로 메워져 있어요." : "") + "</p>" + gapCtl +
    '<div class="skilltable" id="b-sk">' + tbl + "</div></section>" +

    '<section class="step"><div class="step-h"><h2>무공</h2>' + quota(c.mg.length, L.mg) + "</div>" +
    '<div class="pick-tools"><input type="search" id="b-mq" placeholder="무공 이름·효과 검색" aria-label="무공 검색"><label><input type="checkbox" id="b-other"' + (c.other ? " checked" : "") + "> 다른 문파 무공도 보기 (비급 등)</label></div>" +
    '<div class="basic-atk"><span><b>접근전 공격</b> <span class="hint">기본 · 간격 1 · 코스트 0 · 접근전 1점</span></span><label class="lbl" for="b-atk">지정특기</label><select id="b-atk">' + atkOpts(c) + '</select></div>' +
    '<p class="hint">접근전 공격은 누구나 기본으로 가지고, 무공 수에 들지 않아요. 지정특기만 하나 고르면 됩니다(익히지 않은 특기도 됨).</p>' +
    '<div class="picker" id="b-mg"></div></section>' +

    '<section class="step"><div class="step-h"><h2>배경</h2></div><p class="hint">배경은 안 골라도 돼요. 고를 때는 장점 하나마다 단점도 하나씩 골라야 하고, ' + esc(c.lv) + "은 장점 " + L.bg + "개까지예요.</p>" +
    '<div class="bgcols"><div class="bgcol"><div class="step-h"><h3>장점</h3><span id="q-pro"></span></div><div class="picker" id="b-bgp"></div></div>' +
    '<div class="bgcol"><div class="step-h"><h3>단점</h3><span id="q-con"></span></div><div class="picker" id="b-bgc"></div></div></div></section>' +

    '<section class="step"><div class="step-h"><h2>보급품</h2>' + quota(supN, 3) + '</div><p class="hint">처음 만들 때 3개까지 고를 수 있어요.</p><div class="row2" id="b-items">' +
    supplies.map(function (s) {
      var n = c.items[s.n] || 0;
      return '<div class="field"><span class="lbl">' + esc(s.n) + (s.p ? " · " + esc(s.p) : "") + '</span><div class="stepper"><button type="button" class="btn small" data-it="' + esc(s.n) + '" data-d="-1" aria-label="' + esc(s.n) + ' 빼기">−</button><span>' + n + '</span><button type="button" class="btn small" data-it="' + esc(s.n) + '" data-d="1" aria-label="' + esc(s.n) + ' 더하기"' + (supN >= 3 ? " disabled" : "") + '>＋</button></div><span class="hint">' + esc(s.e) + "</span></div>";
    }).join("") + "</div>" +
    '<div class="field money"><label for="b-money">소지금 (엽전, 냥)</label><input id="b-money" type="number" min="0" step="1" inputmode="numeric" value="' + (Number(c.money) || 0) + '"><span class="hint">보급품·도구를 사고 남은 엽전이에요.</span></div></section>' +

    '<section class="step"><div class="step-h"><h2>오의</h2>' + quota(c.ougi.length, L.og) + "</div>" +
    (L.og ? "" : '<p class="hint">오의는 이류부터 가질 수 있어요.</p>') +
    '<div id="b-og" style="display:grid;gap:12px"></div>' +
    (c.ougi.length < L.og ? '<div><button class="btn" id="b-ogadd" type="button">오의 추가</button></div>' : "") + "</section>" +

    relSectionHtml(c) +
    expSectionHtml(c, L) +
    '<section class="step"><div class="step-h"><h2>메모</h2></div><div class="field"><label for="b-notes">배경 이야기, 감정 등</label><textarea id="b-notes" rows="4">' + esc(c.notes) + "</textarea></div></section>" +

    '</div><aside class="sheet" id="sheet"></aside></div>';

  /* 무공 목록 */
  function drawMg() {
    var t = ($("#b-mq").value || "").toLowerCase();
    var rows = DATA.muk.filter(function (r) {
      if (r.n === BASIC_ATK) return false;
      if (lvIdx(r.lv) > lvIdx(c.lv) && c.mg.indexOf(r.n) < 0) return false;
      if (!(isGeneral(r) || schoolMatch(r, c) || c.other || c.mg.indexOf(r.n) >= 0)) return false;
      return !t || (r.n + " " + r.e).toLowerCase().indexOf(t) >= 0;
    });
    rows.sort(function (a, b) { return (c.mg.indexOf(b.n) >= 0) - (c.mg.indexOf(a.n) >= 0) || (schoolMatch(b, c) - schoolMatch(a, c)) || lvIdx(a.lv) - lvIdx(b.lv); });
    var full = c.mg.length >= L.mg;
    $("#b-mg").innerHTML = rows.slice(0, 200).map(function (r) {
      var on = c.mg.indexOf(r.n) >= 0, off = !on && full;
      return '<label class="pick' + (off ? " off" : "") + '"><input type="checkbox" data-mg="' + esc(r.n) + '"' + (on ? " checked" : "") + (off ? " disabled" : "") + '><span><span class="nm">' + esc(r.n) + '</span> <span class="tag t-' + esc(r.t) + '">' + esc(r.t) + '</span> <span class="lv">' + esc(r.lv) + "</span></span>" +
        '<span class="sub">' + (isGeneral(r) ? "범용" : esc(r.s)) + " · 간격 " + esc(r.r) + " · 코스트 " + esc(r.c) + (r.sk && r.sk !== "—" ? " · 《" + esc(r.sk) + "》" : "") + "<br>" + esc(r.e) + "</span></label>";
    }).join("") || '<p class="hint" style="padding:12px">고를 수 있는 무공이 없어요. 문파와 경지를 확인하세요.</p>';
  }
  /* 배경 목록 */
  function drawBg() {
    var pc = bgSplit(c), pros = pc[0], cons = pc[1];
    $("#q-pro").innerHTML = quota(pros.length, L.bg);
    $("#q-con").innerHTML = quota(cons.length, pros.length);
    drawBgList("#b-bgp", false, pros.length >= L.bg);
    drawBgList("#b-bgc", true, cons.length >= L.bg);
  }
  function drawBgList(sel, isCon, full) {
    var rows = DATA.bg.filter(function (r) { return (r.t === "단점") === isCon && (isGeneral(r) || schoolMatch(r, c) || c.bg.indexOf(r.n) >= 0); });
    rows.sort(function (a, b) { return (c.bg.indexOf(b.n) >= 0) - (c.bg.indexOf(a.n) >= 0) || (schoolMatch(b, c) - schoolMatch(a, c)); });
    $(sel).innerHTML = rows.map(function (r) {
      var on = c.bg.indexOf(r.n) >= 0, off = !on && full;
      return '<label class="pick' + (off ? " off" : "") + '"><input type="checkbox" data-bg="' + esc(r.n) + '"' + (on ? " checked" : "") + (off ? " disabled" : "") + '><span><span class="nm">' + esc(r.n) + '</span> <span class="tag t-' + esc(r.t) + '">' + esc(r.t) + '</span></span><span class="sub">' + (isGeneral(r) ? "범용" : esc(r.s)) + "<br>" + esc(r.e) + "</span></label>";
    }).join("");
  }
  /* 오의 */
  function drawOg() {
    var allSk = (DATA.skills || []).map(function (s) { return s.n; });
    $("#b-og").innerHTML = c.ougi.map(function (o, i) {
      var form = FORMS.filter(function (f) { return f.k === o.form; })[0];
      var mods = DATA.mods.filter(function (m) { return (!form || modFits(m, form.f)) && (!m.lim || m.lim === "범용" || norm(m.lim) === norm(c.school) || norm(m.lim) === norm(c.group) || o.mods.indexOf(m.n) >= 0); });
      return '<div class="ougi"><div class="row2">' +
        '<div class="field"><label for="og-n' + i + '">오의 이름</label><input id="og-n' + i + '" data-og="' + i + '" data-k="name" value="' + esc(o.name) + '"></div>' +
        '<div class="field"><label for="og-s' + i + '">지정특기</label><select id="og-s' + i + '" data-og="' + i + '" data-k="skill">' + opts(allSk, o.skill, "고르세요") + "</select></div>" +
        '<div class="field"><label for="og-f' + i + '">형태</label><select id="og-f' + i + '" data-og="' + i + '" data-k="form">' + opts(FORMS.map(function (f) { return f.k; }), o.form, "고르세요") + "</select></div></div>" +
        (form ? '<p class="hint">' + esc(form.e) + "</p>" : "") +
        '<div class="lbl">개조 ' + modBalance(o, L) + '</div><div class="picker" style="max-height:240px">' +
        mods.map(function (m) {
          return '<label class="pick"><input type="checkbox" data-ogm="' + i + '" data-m="' + esc(m.n) + '"' + (o.mods.indexOf(m.n) >= 0 ? " checked" : "") + '><span><span class="nm">' + esc(m.n) + '</span> <span class="tag t-' + esc(m.t) + '">' + esc(m.t) + '</span></span><span class="sub">' + esc(m.e) + "</span></label>";
        }).join("") + '</div><div><button type="button" class="btn small danger" data-ogdel="' + i + '">이 오의 지우기</button></div></div>';
    }).join("");
  }
  drawMg(); drawBg(); drawOg(); drawSheet(c);

  /* 이벤트 */
  function rerender() { save(); renderBuilder(); }
  $("#b-char").onchange = function (e) { curId = e.target.value; rerender(); };
  $("#b-new").onclick = function () { var n = blankChar(); chars.push(n); curId = n.id; rerender(); };
  bindRollPanel(c);
  bindExp(c, rerender);
  bindRel(c, rerender);
  $("#b-status").onchange = function (e) { c.status = e.target.value; save(); drawSheet(c); };
  $("#b-pt").onchange = function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    shrinkImage(f).then(function (url) { c.portrait = url; rerender(); toast("초상을 담았어요"); }, function () { toast("그림을 읽지 못했어요. 다른 파일로 해 보세요"); });
  };
  var ptd = $("#b-ptdel"); if (ptd) ptd.onclick = function () { c.portrait = ""; rerender(); };
  $("#b-del").onclick = function () { $("#b-delc").hidden = false; };
  $("#b-deln").onclick = function () { $("#b-delc").hidden = true; };
  $("#b-dely").onclick = function () { chars = chars.filter(function (x) { return x.id !== c.id; }); if (!chars.length) chars = [blankChar()]; curId = chars[0].id; rerender(); };
  $("#b-name").oninput = function (e) { c.name = e.target.value; save(); drawSheet(c); var o = $("#b-char").selectedOptions[0]; if (o) o.textContent = c.name || "이름 없는 협객"; };
  $("#b-alias").oninput = function (e) { c.alias = e.target.value; save(); drawSheet(c); };
  $("#b-notes").oninput = function (e) { c.notes = e.target.value; save(); drawSheet(c); };
  $("#b-money").oninput = function (e) { c.money = Math.max(0, Math.floor(Number(e.target.value) || 0)); save(); drawSheet(c); };
  $("#b-lv").onchange = function (e) { c.lv = e.target.value; rerender(); };
  $("#b-group").onchange = function (e) { c.group = e.target.value; c.school = ""; rerender(); };
  $("#b-school").onchange = function (e) { c.school = e.target.value; rerender(); };
  $("#b-gm").onchange = function (e) {
    if (e.target.checked && !(c.gaps && c.gaps.length)) c.gaps = [0, 1, 2, 3, 4, 5].map(function (g) { return gapFilled(c, g); });
    c.gapManual = e.target.checked; rerender();
  };
  $("#b-wh").onchange = function (e) { c.wrapH = e.target.checked; rerender(); };
  $("#b-wv").onchange = function (e) { c.wrapV = e.target.checked; rerender(); };
  $("#b-sk").onclick = function (e) {
    var gb = e.target.closest(".gapbtn");
    if (gb) { if (!c.gapManual) return; c.gaps = c.gaps || [false, false, false, false, false, false]; c.gaps[gb.dataset.gap] = !c.gaps[gb.dataset.gap]; rerender(); return; }
    var b = e.target.closest(".sk"); if (!b) return;
    var n = b.dataset.sk, i = c.skills.indexOf(n);
    if (i >= 0) c.skills.splice(i, 1); else if (c.skills.length < L.sk) c.skills.push(n); else { toast("특기는 " + L.sk + "개까지예요"); return; }
    rerender();
  };
  $("#b-mq").oninput = drawMg;
  $("#b-other").onchange = function (e) { c.other = e.target.checked; save(); drawMg(); };
  $("#b-atk").onchange = function (e) { c.atk = e.target.value; save(); drawSheet(c); };
  $("#b-mg").onchange = function (e) {
    var n = e.target.dataset.mg; if (!n) return;
    if (e.target.checked) { if (c.mg.indexOf(n) < 0) c.mg.push(n); } else c.mg = c.mg.filter(function (x) { return x !== n; });
    save(); drawMg(); drawSheet(c); updQuota(2, c.mg.length, L.mg);
  };
  function onBg(e) {
    var n = e.target.dataset.bg; if (!n) return;
    if (e.target.checked) { if (c.bg.indexOf(n) < 0) c.bg.push(n); } else c.bg = c.bg.filter(function (x) { return x !== n; });
    save(); drawBg(); drawSheet(c);
  }
  $("#b-bgp").onchange = onBg; $("#b-bgc").onchange = onBg;
  $("#b-items").onclick = function (e) {
    var b = e.target.closest("[data-it]"); if (!b) return;
    var n = b.dataset.it; c.items[n] = Math.max(0, (c.items[n] || 0) + Number(b.dataset.d)); if (!c.items[n]) delete c.items[n];
    rerender();
  };
  var add = $("#b-ogadd"); if (add) add.onclick = function () { c.ougi.push({ name: "", skill: "", form: "", mods: [] }); rerender(); };
  $("#b-og").addEventListener("input", function (e) {
    var i = e.target.dataset.og; if (i == null) return;
    c.ougi[i][e.target.dataset.k] = e.target.value; save();
    if (e.target.dataset.k === "form") { drawOg(); } drawSheet(c);
  });
  $("#b-og").addEventListener("change", function (e) {
    var i = e.target.dataset.ogm; if (i == null) return;
    var o = c.ougi[i], m = e.target.dataset.m;
    if (e.target.checked) { if (o.mods.indexOf(m) < 0) o.mods.push(m); } else o.mods = o.mods.filter(function (x) { return x !== m; });
    save(); drawOg(); drawSheet(c);
  });
  $("#b-og").addEventListener("click", function (e) { var d = e.target.dataset.ogdel; if (d == null) return; c.ougi.splice(Number(d), 1); rerender(); });
}
function bgSplit(c) {
  var pros = [], cons = [];
  c.bg.forEach(function (n) { (find(DATA.bg, n).t === "단점" ? cons : pros).push(n); });
  return [pros, cons];
}
function quota(n, max) { return '<span class="quota' + (n === max ? " full" : n > max ? " over" : "") + '">' + n + " / " + max + "</span>"; }
function updQuota(idx, n, max) { var q = document.querySelectorAll(".step .quota")[idx - 1]; if (q) q.outerHTML = quota(n, max); }
function modBalance(o, L) {
  var s = 0, w = 0;
  o.mods.forEach(function (n) { var m = DATA.mods.filter(function (x) { return x.n === n; })[0]; if (!m) return; if (m.t === "강점") s++; else if (m.t === "약점") w++; });
  var ok = s <= w + L.mod;
  return '<span class="quota ' + (ok ? "full" : "over") + '">강점 ' + s + " · 약점 " + w + (L.mod ? " · 개조 점수 " + L.mod : "") + (ok ? "" : " — 약점이 부족해요") + "</span>";
}
function find(list, n) { var r = list.filter(function (x) { return x.n === n; })[0]; if (!r && window.WX_RENAME && WX_RENAME[n]) { var n2 = WX_RENAME[n]; r = list.filter(function (x) { return x.n === n2; })[0]; } return r || { n: n, e: "(시트에서 찾을 수 없음)" }; }

function checks(c) {
  var L = LIMITS[c.lv], g = GROUPS[c.group], out = [];
  function add(ok, msg) { out.push([ok, msg]); }
  add(!!c.school, c.school ? "문파: " + c.group + " · " + c.school : "문파를 고르세요");
  add(c.skills.length === L.sk, "특기 " + c.skills.length + "/" + L.sk);
  if (g && c.school) {
    var cond = g.schools[c.school];
    add(cond.some(function (s) { return c.skills.indexOf(s) >= 0; }), "조건 특기 《" + cond.join("》·《") + "》 중 하나");
    var inField = c.skills.filter(function (s) { return (DATA.skills || []).some(function (x) { return x.n === s && x.f === g.field; }); }).length;
    add(inField >= 2, g.field + " 분야 특기 " + inField + "개 (2개 이상)");
  }
  add(c.mg.length === L.mg, "무공 " + c.mg.length + "/" + L.mg + " (접근전 공격 빼고)");
  add(!!c.atk, c.atk ? "접근전 공격 《" + c.atk + "》" : "접근전 공격 지정특기를 고르세요");
  var pc = bgSplit(c);
  add(pc[0].length <= L.bg, "배경 장점 " + pc[0].length + "/" + L.bg + " (안 골라도 됨)");
  add(pc[1].length === pc[0].length, "배경 단점 " + pc[1].length + "/" + pc[0].length + " (장점 수만큼)");
  var sup = Object.keys(c.items).reduce(function (a, k) { return a + c.items[k]; }, 0);
  add(sup <= 3, "보급품 " + sup + "/3");
  if (L.og) add(c.ougi.length === L.og, "오의 " + c.ougi.length + "/" + L.og);
  c.ougi.forEach(function (o, i) {
    var s = 0, w = 0;
    o.mods.forEach(function (n) { var m = find(DATA.mods, n); if (m.t === "강점") s++; else if (m.t === "약점") w++; });
    add(o.name && o.skill && o.form && s <= w + L.mod, "오의 " + (o.name || i + 1) + (o.form ? "" : " 형태 미정") + (o.skill ? "" : " 지정특기 미정") + (s <= w + L.mod ? "" : " 개조 균형 안 맞음"));
  });
  return out;
}

function sheetText(c) {
  var L = [];
  L.push((c.alias ? "[" + c.alias + "] " : "") + (c.name || "이름 없는 협객") + " — " + (c.school || "문파 미정") + " · " + c.lv);
  L.push("특기: " + c.skills.map(function (s) { return "《" + s + "》"; }).join(" "));
  L.push("경험치: " + (c.exp || 0) + " · 상태: " + (c.status || "플레이 중"));
  L.push(""); L.push("■ 무공");
  L.push("- 접근전 공격 (공격/간격 1/코스트 0/《" + (c.atk || "?") + "》) 접근전 1점. [기본]");
  c.mg.forEach(function (n) { var r = find(DATA.muk, n); L.push("- " + r.n + " (" + (r.t || "") + "/간격 " + (r.r || "—") + "/코스트 " + (r.c || "—") + "/" + (r.sk && r.sk !== "—" ? "《" + r.sk + "》" : "—") + ") " + r.e); });
  L.push(""); L.push("■ 배경");
  c.bg.forEach(function (n) { var r = find(DATA.bg, n); L.push("- " + r.n + " [" + (r.t || "") + "] " + r.e); });
  var it = Object.keys(c.items);
  if (it.length) { L.push(""); L.push("■ 보급품"); it.forEach(function (n) { L.push("- " + n + " ×" + c.items[n]); }); }
  L.push(""); L.push("■ 소지금: " + (Number(c.money) || 0) + "냥");
  if (c.ougi.length) {
    L.push(""); L.push("■ 오의");
    c.ougi.forEach(function (o) {
      var f = FORMS.filter(function (x) { return x.k === o.form; })[0];
      L.push("- " + (o.name || "무명 오의") + " 《" + (o.skill || "?") + "》 " + (o.form || "") + (f ? ": " + f.e : ""));
      o.mods.forEach(function (n) { var m = find(DATA.mods, n); L.push("   · " + m.n + "(" + (m.t || "") + ") " + m.e); });
    });
  }
  if ((c.rel || []).length) { L.push(""); L.push("■ 인물·감정"); c.rel.forEach(function (r) { L.push("- " + (r.n || "?") + (r.emo ? " — " + r.emo + "(" + (EMO_NEG.indexOf(r.emo) >= 0 ? "−" : "+") + ")" : "") + (r.home ? " · 거처" : "") + (r.secret ? " · 비밀" : "") + (r.og ? " · 오의: " + r.og : "") + (r.note ? " · " + r.note : "")); }); }
  if (c.notes) { L.push(""); L.push("■ 메모"); L.push(c.notes); }
  return L.join("\n");
}

function sheetHead(c) {
  return '<div class="portrait">' + portraitHtml(c) + '<div><div class="lbl">' + esc(c.alias || "별호 없음") + '</div><h2>' + esc(c.name || "이름 없는 협객") + '</h2><div class="meta"><span>' + esc(c.school || "문파 미정") + '</span><span class="lv" style="margin-left:0">' + esc(c.lv) + "</span></div>" +
    '<div class="meta2"><span class="st st-' + STATUSES.indexOf(c.status || "플레이 중") + '">' + esc(c.status || "플레이 중") + "</span><span>경험치 " + (c.exp || 0) + "</span></div></div></div>";
}
/* 시트 본문(읽기 전용). 인물지와 명부가 함께 쓴다 */
function sheetBody(c) {
  var it = Object.keys(c.items || {});
  return "<div><h4>특기</h4><div>" + ((c.skills || []).map(function (s) { return "《" + esc(s) + "》"; }).join(" ") || '<span class="hint">아직 없음</span>') + "</div></div>" +
    "<div><h4>무공</h4><ul>" + atkLine(c) + ((c.mg || []).map(function (n) { var r = find(DATA.muk, n); return "<li><b>" + esc(r.n) + "</b> " + esc(r.t || "") + " · 간격 " + esc(r.r || "—") + " · 코스트 " + esc(r.c || "—") + (r.sk && r.sk !== "—" ? " · 《" + esc(r.sk) + "》" : "") + '<div class="eff">' + esc(r.e) + "</div></li>"; }).join("")) + "</ul></div>" +
    "<div><h4>배경</h4><ul>" + ((c.bg || []).map(function (n) { var r = find(DATA.bg, n); return "<li><b>" + esc(r.n) + "</b> " + esc(r.t || "") + '<div class="eff">' + esc(r.e) + "</div></li>"; }).join("") || '<li class="hint">아직 없음</li>') + "</ul></div>" +
    (it.length ? "<div><h4>보급품</h4><div>" + it.map(function (n) { return esc(n) + " ×" + c.items[n]; }).join(" · ") + "</div></div>" : "") +
    "<div><h4>소지금</h4><div>" + (Number(c.money) || 0) + "냥</div></div>" +
    (!(c.ougi || []).length && c.ogN ? '<div><h4>오의</h4><div class="hint">' + c.ogN + "개 · 본인과 GM만 볼 수 있어요</div></div>" : "") +
    ((c.ougi || []).length ? "<div><h4>오의</h4><ul>" + c.ougi.map(function (o) { return "<li><b>" + esc(o.name || "무명 오의") + "</b> 《" + esc(o.skill || "?") + "》 " + esc(o.form || "") + ((o.mods || []).length ? '<div class="eff">' + o.mods.map(esc).join(", ") + "</div>" : "") + "</li>"; }).join("") + "</ul></div>" : "") +
    ((c.expLog || []).length ? "<div><h4>경험치 기록</h4><ul class=\"xplog\">" + c.expLog.slice(-6).reverse().map(function (x) { return "<li><b>" + (x.n > 0 ? "+" : "") + x.n + "</b> " + esc(x.why || "") + ' <span class="hint">' + esc(fmtDate(x.at)) + "</span></li>"; }).join("") + "</ul></div>" : "") +
    ((c.rel || []).length ? "<div><h4>인물·감정</h4><ul>" + c.rel.map(function (r) { var neg = EMO_NEG.indexOf(r.emo) >= 0; return "<li><b>" + esc(r.n || "이름 없음") + "</b> " + (r.emo ? '<span class="emo ' + (neg ? "neg" : "pos") + '">' + esc(r.emo) + (neg ? " −1" : " +1") + "</span>" : "") + ((r.home || r.secret || r.og || r.note) ? '<div class="eff">' + [r.home ? "거처 앎" : "", r.secret ? "비밀 앎" : "", r.og ? "오의: " + esc(r.og) : "", esc(r.note || "")].filter(Boolean).join(" · ") + "</div>" : "") + "</li>"; }).join("") + "</ul></div>" : "") +
    (c.notes ? '<div><h4>메모</h4><div class="eff" style="white-space:pre-wrap">' + esc(c.notes) + "</div></div>" : "");
}
function drawSheet(c) {
  var el = $("#sheet"); if (!el) return;
  var ck = checks(c);
  el.innerHTML =
    sheetHead(c) +
    '<div class="checks">' + ck.map(function (x) { return '<span class="' + (x[0] ? "good" : "bad") + '">' + (x[0] ? "✓ " : "· ") + esc(x[1]) + "</span>"; }).join("") + "</div>" +
    sheetBody(c) +
    '<div class="sheet-actions" id="s-pub">' + pubButtonsHtml(c) + "</div>" +
    '<div class="sheet-actions"><button class="btn primary small" id="s-export" type="button"' + (MCP && !STANDALONE ? "" : " hidden") + '>구글 시트로 내보내기</button><button class="btn small" id="s-copy" type="button">텍스트로 복사</button><button class="btn small" id="s-json" type="button">캐릭터 코드 복사</button><button class="btn small" id="s-imp" type="button">코드 불러오기</button></div>' +
    '<div class="io" id="s-io" hidden><textarea id="s-ta" aria-label="캐릭터 코드"></textarea><div class="sheet-actions"><button class="btn small primary" id="s-load" type="button">불러와서 새 캐릭터로</button><button class="btn small" id="s-cancel" type="button">닫기</button></div></div>' +
    '<p class="hint" id="s-exst" hidden role="status"></p>' +
    '<textarea id="s-fallback" hidden readonly aria-label="복사할 텍스트"></textarea>';
  bindPub(c);
  $("#s-copy").onclick = function () { copyText(sheetText(c), $("#s-fallback")); };
  $("#s-export").onclick = function () { exportToSheet(c, this); };
  $("#s-json").onclick = function () { copyText(JSON.stringify(c), $("#s-fallback")); };
  $("#s-imp").onclick = function () { $("#s-io").hidden = false; $("#s-ta").value = ""; $("#s-ta").focus(); };
  $("#s-cancel").onclick = function () { $("#s-io").hidden = true; };
  $("#s-load").onclick = function () {
    try {
      var o = JSON.parse($("#s-ta").value);
      var n = fixChar(Object.assign(blankChar(), o)); n.id = blankChar().id; n.pub = false;
      chars.push(n); curId = n.id; save(); renderBuilder(); toast("불러왔어요");
    } catch (e) { toast("코드를 읽지 못했어요. 캐릭터 코드 전체를 붙여넣었는지 확인하세요"); }
  };
}

/* ───────── 인물지: 인물·감정 ─────────
   캐릭터 시트의 '인물란'(인물명·거처·비밀·오의·감정·기타)과 같은 칸이다. */
var EMO_POS = ["공감", "우정", "애정", "충성", "동경", "광신"], EMO_NEG = ["불신", "분노", "질투", "모멸", "열등감", "살의"];
function relSectionHtml(c) {
  var rows = (c.rel || []).map(function (r, i) {
    var o = '<option value="">감정 없음</option><optgroup label="긍정 (+1)">' + EMO_POS.map(function (e, k) { return "<option" + (r.emo === e ? " selected" : "") + ">" + e + "</option>"; }).join("") + '</optgroup><optgroup label="부정 (−1)">' + EMO_NEG.map(function (e) { return "<option" + (r.emo === e ? " selected" : "") + ">" + e + "</option>"; }).join("") + "</optgroup>";
    return '<div class="rel-row" data-ri="' + i + '">' +
      '<input data-rk="n" value="' + esc(r.n || "") + '" placeholder="인물 이름" aria-label="인물 이름">' +
      '<select data-rk="emo" aria-label="감정">' + o + "</select>" +
      '<span class="rel-roll"><button type="button" class="btn small" data-rroll="pos" title="감정표 긍정 칸을 1d6으로">긍정 1d6</button><button type="button" class="btn small" data-rroll="neg" title="감정표 부정 칸을 1d6으로">부정 1d6</button></span>' +
      '<label><input type="checkbox" data-rk="home"' + (r.home ? " checked" : "") + "> 거처</label>" +
      '<label><input type="checkbox" data-rk="secret"' + (r.secret ? " checked" : "") + "> 비밀</label>" +
      '<input data-rk="og" value="' + esc(r.og || "") + '" placeholder="알아낸 오의" aria-label="알아낸 오의">' +
      '<input data-rk="note" value="' + esc(r.note || "") + '" placeholder="기타(관계·소속 등)" aria-label="기타">' +
      '<button type="button" class="linkbtn" data-rdel="' + i + '">지우기</button></div>';
  }).join("");
  return '<section class="step"><div class="step-h"><h2>인물·감정</h2><span class="quota">' + (c.rel || []).length + " / 23</span></div>" +
    '<p class="hint">감정을 맺은 PC·NPC를 적어 둡니다. 감정 수정은 긍정 +1, 부정 −1(최대 ±1). 숙적 소속과는 처음부터 부정 감정이에요(부정 1d6). 거처·비밀·오의는 그 인물에 대해 알아낸 정보예요. 구글 시트로 내보내면 시트의 인물란에 들어갑니다.</p>' +
    '<div class="rels" id="b-rel">' + rows + "</div>" +
    ((c.rel || []).length < 23 ? '<div><button class="btn small" type="button" id="b-reladd">인물 추가</button></div>' : "") + "</section>";
}
function bindRel(c, rerender) {
  c.rel = c.rel || [];
  var box = $("#b-rel"), add = $("#b-reladd");
  if (add) add.onclick = function () { c.rel.push({ n: "", emo: "", home: false, secret: false, og: "", note: "" }); rerender(); var ins = document.querySelectorAll('#b-rel [data-rk="n"]'); if (ins.length) ins[ins.length - 1].focus(); };
  if (!box) return;
  function upd(e) {
    var row = e.target.closest("[data-ri]"), k = e.target.dataset.rk; if (!row || !k) return;
    var r = c.rel[Number(row.dataset.ri)]; if (!r) return;
    r[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value; save(); drawSheet(c);
  }
  box.addEventListener("input", upd); box.addEventListener("change", upd);
  box.addEventListener("click", function (e) {
    var d = e.target.closest("[data-rdel]"); if (d) { c.rel.splice(Number(d.dataset.rdel), 1); rerender(); return; }
    var b = e.target.closest("[data-rroll]"); if (!b) return;
    var row = b.closest("[data-ri]"), r = c.rel[Number(row.dataset.ri)], n = 1 + Math.floor(Math.random() * 6);
    r.emo = (b.dataset.rroll === "neg" ? EMO_NEG : EMO_POS)[n - 1]; save();
    row.querySelector('[data-rk="emo"]').value = r.emo; drawSheet(c); toast("1d6 = " + n + " → " + r.emo);
  });
}
/* 시트 인물란 B25:M47 (B 인물명, E 거처, F 비밀, G 오의, J 감정, M 기타) */
function relRows(c) {
  var out = [];
  for (var i = 0; i < 23; i++) {
    var r = (c.rel || [])[i];
    out.push(r ? [r.n || "", null, null, !!r.home, !!r.secret, r.og || "", null, null, r.emo ? r.emo + (EMO_NEG.indexOf(r.emo) >= 0 ? "(−)" : "(+)") : "", null, null, r.note || ""] : ["", null, null, false, false, "", null, null, "", null, null, ""]);
  }
  return out;
}

/* ───────── 인물지: 초상 · 경험치 · 명부 · 무작위 생성 ───────── */
function builderTabs(on) {
  return '<nav class="subtabs" aria-label="인물지"><a href="#builder"' + (on === "make" ? ' aria-current="page"' : "") + '>만들기</a><a href="#builder-archive"' + (on === "archive" ? ' aria-current="page"' : "") + ">명부(名簿) — 플레이어별 PC</a>" + '<a href="#builder-sim"' + (on === "sim" ? ' aria-current="page"' : "") + ">전투 시뮬</a></nav>";
}
function renderBuilderRoute(full) {
  if (/^builder-sim/.test(full || "")) { if (window.renderSim) window.renderSim(view); else view.innerHTML = viewHead("builder", "") + builderTabs("sim") + '<p class="hint">전투 시뮬을 불러오지 못했어요.</p>'; return; }
  var m = /^builder-archive(?:-(.+))?$/.exec(full || "");
  if (m) renderArchive(m[1] ? decodeURIComponent(m[1]) : ""); else renderBuilder();
}
function portraitHtml(c) {
  return c && c.portrait && /^data:image\/(jpeg|png|webp);base64,/.test(c.portrait) ? '<img class="pt-img" src="' + c.portrait + '" alt="' + esc((c.name || "협객") + " 초상") + '">' : PORTRAIT;
}
/* 고른 그림을 240×300 안으로 줄여 JPEG로 담는다(명부 한 칸에 들어가도록) */
function shrinkImage(file) {
  return new Promise(function (ok, no) {
    var rd = new FileReader();
    rd.onerror = no;
    rd.onload = function () {
      var img = new Image();
      img.onerror = no;
      img.onload = function () {
        var W = 240, H = 300, k = Math.min(1, W / img.width, H / img.height);
        var w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
        var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        var g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
        var q = 0.82, url = cv.toDataURL("image/jpeg", q);
        while (url.length > 60000 && q > 0.4) { q -= 0.1; url = cv.toDataURL("image/jpeg", q); }
        ok(url);
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}

/* ── 경험치 ── */
var EXP_QUICK = [[1, "판정 실패"], [2, "법식 달성"], [2, "캠페인 종료"]];
function nextLv(lv) { var i = LEVELS.indexOf(lv); return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : ""; }
function expSectionHtml(c, L) {
  var nx = nextLv(c.lv), cost = nx ? LIMITS[nx].exp : 0;
  return '<section class="step"><div class="step-h"><h2>경험치</h2><span class="quota' + (nx && c.exp >= cost ? " full" : "") + '">보유 ' + (c.exp || 0) + "</span></div>" +
    '<p class="hint">판정 실패 1점 · 법식 달성 2점(세션당 1번) · 캠페인 종료 2점. 경지를 올리면 다음 경지의 경험치만큼 씁니다' + (nx ? " (" + esc(nx) + " " + cost + "점)." : ".") + "</p>" +
    '<div class="xp-row">' + EXP_QUICK.map(function (q, i) { return '<button class="btn small" type="button" data-xq="' + i + '">+' + q[0] + " " + q[1] + "</button>"; }).join("") +
    '<span class="xp-custom"><input type="number" id="b-xpn" step="1" aria-label="경험치 수" placeholder="±"><input id="b-xpw" maxlength="40" aria-label="사유" placeholder="사유(선택)"><button class="btn small" type="button" id="b-xpadd">기록</button></span></div>' +
    (nx ? '<div><button class="btn small primary" type="button" id="b-lvup"' + (c.exp >= cost ? "" : " disabled") + ">" + esc(nx) + "(으)로 경지 올리기 · " + cost + "점 사용</button></div>" : '<p class="hint">이미 가장 높은 경지예요.</p>') +
    ((c.expLog || []).length ? '<ul class="xplog">' + c.expLog.slice(-8).reverse().map(function (x, i) {
      var idx = c.expLog.length - 1 - i;
      return "<li><b>" + (x.n > 0 ? "+" : "") + x.n + "</b> " + esc(x.why || "") + ' <span class="hint">' + esc(fmtDate(x.at)) + '</span> <button type="button" class="linkbtn" data-xdel="' + idx + '" aria-label="이 기록 지우기">지우기</button></li>';
    }).join("") + "</ul>" : "") + "</section>";
}
function bindExp(c, rerender) {
  function add(n, why) { n = Math.round(Number(n) || 0); if (!n) return; c.exp = (c.exp || 0) + n; c.expLog = (c.expLog || []).concat([{ n: n, why: why || "", at: new Date().toISOString() }]).slice(-60); rerender(); }
  [].forEach.call(document.querySelectorAll("[data-xq]"), function (b) { b.onclick = function () { var q = EXP_QUICK[b.dataset.xq]; add(q[0], q[1]); }; });
  var ad = $("#b-xpadd"); if (ad) ad.onclick = function () { add($("#b-xpn").value, $("#b-xpw").value.trim() || "직접 기록"); };
  var up = $("#b-lvup"); if (up) up.onclick = function () {
    var nx = nextLv(c.lv); if (!nx) return; var cost = LIMITS[nx].exp; if ((c.exp || 0) < cost) return;
    c.exp -= cost; c.expLog = (c.expLog || []).concat([{ n: -cost, why: nx + "(으)로 경지 상승", at: new Date().toISOString() }]); c.lv = nx;
    rerender(); toast(nx + "에 올랐어요. 늘어난 특기·무공·배경·오의를 채우세요");
  };
  [].forEach.call(document.querySelectorAll("[data-xdel]"), function (b) {
    b.onclick = function () { var i = Number(b.dataset.xdel), x = c.expLog[i]; if (!x) return; c.exp = (c.exp || 0) - x.n; c.expLog.splice(i, 1); rerender(); };
  });
}

/* ── 명부: 플레이어마다 한 장(pcs/<사용자 id>)에 PC를 모아 둔다. 누구나 읽고, 쓰는 것은 자기 장만 ── */
var PCS = [], pcsState = "loading", pubTimer = 0;
function myPcs() { return PCS.filter(function (d) { return d.id === MY_ID; })[0] || null; }
function playerName() { var m = myPcs(); return (m && m.player) || store("wx-player") || ""; }
function pubClean(c) {
  var o = JSON.parse(JSON.stringify(c)); delete o.pub; o.at = new Date().toISOString();
  o.ogN = (o.ougi || []).length; delete o.ougi;
  o.rel = (o.rel || []).map(function (r) { var x = Object.assign({}, r); delete x.og; return x; });
  return o;
}
/* 오의는 본인과 GM만: pcog/<사용자 id> = { chars: { <PC id>: { ougi, relOg } } }. 규칙상 본인과 관리자(GM)만 읽는다 */
var OGS = {};
function secretOf(c) { return { ogVer: OG_VER, ougi: JSON.parse(JSON.stringify(c.ougi || [])), relOg: (c.rel || []).map(function (r) { return r.og || ""; }) }; }
function writeSecret(ids) {
  if (!DBH || !MY_ID) return Promise.resolve();
  var old = OGS[MY_ID] || {}, out = {};
  ids.forEach(function (id) { var c = chars.filter(function (x) { return x.id === id; })[0]; if (c) out[id] = secretOf(c); else if (old[id]) out[id] = old[id]; });
  OGS[MY_ID] = out;
  return DBH.doc("pcog/" + MY_ID).set({ chars: out, at: new Date().toISOString() }).catch(function () { });
}
function withSecret(uid, pc) {
  var sc = (OGS[uid] || {})[pc.id];
  if (!sc && uid === MY_ID) { var loc = chars.filter(function (x) { return x.id === pc.id; })[0]; if (loc) sc = secretOf(loc); }
  if (!sc) return pc;
  var o = JSON.parse(JSON.stringify(pc)); o.ougi = sc.ogVer === OG_VER ? (sc.ougi || []) : sc.ogVer === 2 && window.WX_OG ? WX_OG.migrate(sc.ougi, (pc.group || "") + " " + (pc.school || "")).list : []; o.ogVer = OG_VER; delete o.ogN;
  o.rel = (o.rel || []).map(function (r, i) { return (sc.relOg || [])[i] ? Object.assign({}, r, { og: sc.relOg[i] }) : r; });
  return o;
}
function watchSecrets() {
  if (!DBH || !MY_ID) return;
  function take(id, d) { OGS[id] = (d && d.chars) || {}; }
  if (CAN_EDIT) DBH.collection("pcog").onSnapshot(function (s) { OGS = {}; s.docs.forEach(function (d) { take(d.id, d.data()); }); drawArchiveIfOpen(); }, function () { });
  else DBH.doc("pcog/" + MY_ID).onSnapshot(function (d) { take(MY_ID, d && d.exists !== false ? d.data() : null); drawArchiveIfOpen(); }, function () { });
}
function writeMine(list, player) {
  if (!DBH || !MY_ID) return Promise.reject({ code: "no_db" });
  var body = { player: player || playerName() || "이름 없는 플레이어", chars: list, at: new Date().toISOString() };
  if (JSON.stringify(body).length > 900000) return Promise.reject({ code: "too_big" });
  return DBH.doc("pcs/" + MY_ID).set(body);
}
function pubErr(e) {
  var c = e && e.code;
  if (c === "no_db") return "오른쪽 아래 '구글로 로그인'을 누르면 명부에 올릴 수 있어요.";
  if (c === "too_big") return "명부 한 장이 가득 찼어요. 초상을 지우거나 오래된 PC를 내려 주세요.";
  if (c === "quota_exceeded") return "명부 저장 공간이 가득 찼어요. 주인장에게 알려 주세요.";
  return "명부에 올리지 못했어요. 잠시 뒤 다시 해 보세요.";
}
function publishChar(c, quiet) {
  if (!playerName()) { if (!quiet) toast("명부 탭에서 플레이어 이름을 먼저 정해 주세요"); return Promise.reject({ code: "no_name" }); }
  var mine = myPcs(), list = ((mine && mine.chars) || []).filter(function (x) { return x.id !== c.id; });
  list.push(pubClean(c));
  return writeMine(list).then(function () { writeSecret(list.map(function (x) { return x.id; })); if (!c.pub) { c.pub = true; store("wx-chars", chars); } if (!quiet) toast("명부에 올렸어요"); }, function (e) { if (!quiet) toast(pubErr(e)); throw e; });
}
function unpublishChar(id) {
  var mine = myPcs(); if (!mine) return Promise.resolve();
  var keep = (mine.chars || []).filter(function (x) { return x.id !== id; });
  return writeMine(keep).then(function () {
    writeSecret(keep.map(function (x) { return x.id; }));
    chars.forEach(function (x) { if (x.id === id) x.pub = false; }); store("wx-chars", chars); toast("명부에서 내렸어요");
  }, function (e) { toast(pubErr(e)); });
}
/* 올려 둔 PC는 고칠 때마다 잠시 뒤 명부도 고친다(문서 하나에 한 번씩만) */
function queuePub(c) {
  if (!DBH || !MY_ID) return;
  clearTimeout(pubTimer);
  pubTimer = setTimeout(function () { publishChar(c, true).catch(function () { }); }, 2500);
}
function pubButtonsHtml(c) {
  if (STANDALONE) return "";
  return c.pub ? '<span class="hint">명부에 올라 있어요. 고치면 명부도 따라 바뀝니다.</span><a class="btn small" href="#builder-archive-' + encodeURIComponent((MY_ID || "") + "~" + c.id) + '">명부에서 보기</a><button class="btn small danger" type="button" id="s-unpub">명부에서 내리기</button>'
    : '<button class="btn small" type="button" id="s-pubbtn">명부에 올리기</button><span class="hint">올리면 이 링크를 가진 모두가 볼 수 있어요. 오의는 나와 GM만 봐요.</span>';
}
function bindPub(c) {
  var b = $("#s-pubbtn"); if (b) b.onclick = function () { b.disabled = true; publishChar(c).then(function () { drawSheet(c); }, function () { b.disabled = false; }); };
  var u = $("#s-unpub"); if (u) u.onclick = function () { u.disabled = true; unpublishChar(c.id).then(function () { drawSheet(c); }); };
}
function drawArchiveIfOpen() { if (/^#builder-archive/.test(location.hash || "") && $("#arch")) renderArchive(ARCH_SEL); }
var ARCH_SEL = "";
function renderArchive(sel) {
  ARCH_SEL = sel || "";
  var head = viewHead("builder", "플레이어마다 지금 플레이하고 있거나 지난날 플레이했던 PC를 모아 둡니다. 이 링크를 가진 누구나 볼 수 있고(오의는 본인과 GM만), 고치는 것은 자기 PC만 할 수 있어요.") + builderTabs("archive");
  if (STANDALONE) { view.innerHTML = head + '<div class="empty"><p>명부는 claude.ai에서 연 페이지에서만 볼 수 있어요.</p></div>'; return; }
  var mine = myPcs(), myName = playerName();
  var bar = '<form class="arch-me" id="arch-me"><label class="lbl" for="ar-pn">내 플레이어 이름</label><input id="ar-pn" maxlength="30" value="' + esc(myName) + '" placeholder="예: 루루"><button class="btn small" type="submit">정하기</button>' +
    '<span class="hint">' + (MY_ID ? "인물지의 캐릭터 시트에서 '명부에 올리기'를 누르면 여기에 올라옵니다." : "오른쪽 아래 '구글로 로그인'을 누르면 명부에 올릴 수 있어요.") + "</span></form>";
  var detail = "";
  if (ARCH_SEL) {
    var p = ARCH_SEL.split("~"), doc = PCS.filter(function (d) { return d.id === p[0]; })[0], pc = doc && (doc.chars || []).filter(function (x) { return x.id === p[1]; })[0];
    if (pc) {
      var own = doc.id === MY_ID; pc = withSecret(doc.id, pc);
      detail = '<section class="arch-detail" id="arch-d"><div class="sheet">' + sheetHead(pc) + sheetBody(pc) +
        '<div class="sheet-actions"><button class="btn small primary" type="button" id="ar-take">' + (own ? "인물지로 불러와 고치기" : "내 인물지로 사본 가져오기") + "</button>" +
        (own ? '<label class="lbl" for="ar-st">상태</label><select id="ar-st">' + STATUSES.map(function (v) { return "<option" + (v === pc.status ? " selected" : "") + ">" + v + "</option>"; }).join("") + '</select><button class="btn small danger" type="button" id="ar-del">명부에서 내리기</button>' : "") +
        '<a class="btn small" href="#builder-archive">목록으로</a></div><p class="hint">' + esc(doc.player || "") + " · 올린 때 " + esc(fmtDate(pc.at)) + "</p></div></section>";
    } else if (pcsState !== "loading") detail = '<p class="hint">그 PC를 찾지 못했어요. 명부에서 내려갔을 수 있어요.</p>';
  }
  var docs = PCS.slice().sort(function (a, b) { return (b.id === MY_ID) - (a.id === MY_ID) || String(a.player || "").localeCompare(String(b.player || "")); });
  var list = docs.filter(function (d) { return (d.chars || []).length; }).map(function (d) {
    var cs = d.chars.slice().sort(function (a, b) { return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || new Date(b.at) - new Date(a.at); });
    return '<section class="arch-pl"><h2>' + esc(d.player || "이름 없는 플레이어") + (d.id === MY_ID ? ' <span class="hint">나</span>' : "") + ' <span class="hint">PC ' + cs.length + "</span></h2><div class=\"arch-grid\">" +
      cs.map(function (c) {
        var key = encodeURIComponent(d.id + "~" + c.id);
        return '<a class="arch-card' + (ARCH_SEL === d.id + "~" + c.id ? " on" : "") + '" href="#builder-archive-' + key + '"><span class="ac-pt">' + portraitHtml(c) + '</span><span class="ac-tx"><span class="lbl">' + esc(c.alias || "별호 없음") + "</span><b>" + esc(c.name || "이름 없는 협객") + "</b><span>" + esc(c.school || "문파 미정") + " · " + esc(c.lv || "") + '</span><span class="st st-' + STATUSES.indexOf(c.status || "플레이 중") + '">' + esc(c.status || "플레이 중") + "</span><span class=\"hint\">경험치 " + (c.exp || 0) + "</span></span></a>";
      }).join("") + "</div></section>";
  }).join("");
  if (!list) list = pcsState === "loading" ? '<p class="hint">명부를 펼치는 중…</p>' : pcsState === "off" ? '<p class="hint">이 화면에서는 명부를 열 수 없어요. 잠시 뒤 다시 열어 보세요.</p>' : pcsState === "slow" ? '<p class="hint">명부 저장소에 아직 닿지 못했어요. 잠시 뒤 다시 열어 보세요.</p>' : '<p class="hint">아직 올라온 PC가 없어요.</p>';
  view.innerHTML = head + bar + detail + '<div id="arch">' + list + "</div>";
  $("#arch-me").onsubmit = function (e) {
    e.preventDefault(); var n = $("#ar-pn").value.trim(); if (!n) return;
    store("wx-player", n);
    var mine = myPcs();
    if (mine && DBH && MY_ID) writeMine(mine.chars || [], n).then(function () { toast("이름을 바꿨어요"); }, function (er) { toast(pubErr(er)); });
    else toast("이름을 정했어요. 이제 PC를 명부에 올릴 수 있어요");
  };
  var tk = $("#ar-take"); if (tk) tk.onclick = function () {
    var p = ARCH_SEL.split("~"), doc = PCS.filter(function (d) { return d.id === p[0]; })[0], pc = doc && (doc.chars || []).filter(function (x) { return x.id === p[1]; })[0]; if (!pc) return;
    var own = doc.id === MY_ID, n = fixChar(JSON.parse(JSON.stringify(own ? withSecret(doc.id, pc) : pc))); delete n.at; delete n.ogN;
    if (own) { n.pub = true; var i = chars.map(function (x) { return x.id; }).indexOf(n.id); if (i >= 0) chars[i] = n; else chars.push(n); }
    else { n.id = blankChar().id; n.pub = false; n.name = n.name ? n.name + " (사본)" : ""; chars.push(n); }
    curId = n.id; store("wx-chars", chars); store("wx-cur", curId); location.hash = "builder"; toast(own ? "불러왔어요" : "사본을 가져왔어요");
  };
  var st = $("#ar-st"); if (st) st.onchange = function () {
    var p = ARCH_SEL.split("~"), mine = myPcs(); if (!mine) return;
    var list = (mine.chars || []).map(function (x) { return x.id === p[1] ? Object.assign({}, x, { status: st.value }) : x; });
    chars.forEach(function (x) { if (x.id === p[1]) x.status = st.value; }); store("wx-chars", chars);
    writeMine(list).then(function () { toast("상태를 바꿨어요"); }, function (er) { toast(pubErr(er)); });
  };
  var dl = $("#ar-del"); if (dl) dl.onclick = function () { dl.disabled = true; unpublishChar(ARCH_SEL.split("~")[1]).then(function () { location.hash = "builder-archive"; }); };
}

/* ── 무작위 생성: AI가 아니라 주사위. 룰(조건 특기·분야 2개·경지별 수·배경 짝·보급품 3개)을 지키고,
   문파의 무공이 쓰는 특기를 더 자주 고르는 식으로 앞뒤가 맞게 굴린다. 오의는 플레이어가 직접 만든다. ── */
function rnd(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[rnd(a.length)]; }
function wpick(list, w) {
  var ws = list.map(function (x) { return Math.max(0, w(x)); }), t = ws.reduce(function (a, b) { return a + b; }, 0);
  if (!t) return list.length ? pick(list) : null;
  var r = Math.random() * t;
  for (var i = 0; i < list.length; i++) { r -= ws[i]; if (r < 0) return list[i]; }
  return list[list.length - 1];
}
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
var NAMES = {
  han: { sur: ["왕", "이", "장", "유", "진", "양", "조", "황", "주", "오", "서", "손", "마", "호", "곽", "하", "고", "임", "정", "사", "한", "당", "풍", "백", "단", "위", "육", "소", "강", "모용", "사마", "상관", "구양", "독고", "황보", "제갈", "남궁"],
    giv: ["운", "풍", "천", "무", "진", "현", "청", "백", "설", "월", "영", "호", "린", "성", "휘", "상", "연", "화", "소", "명", "유", "결", "겸", "도", "혁", "산", "우", "하", "강", "비", "옥", "란", "의", "송", "학", "검", "붕", "해", "추", "경"] },
  joseon: { sur: ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍", "남", "구"],
    giv: ["석", "진", "영", "수", "현", "준", "동", "철", "희", "순", "덕", "길", "만", "복", "옥", "례", "윤", "겸", "효", "충", "의", "섭", "하", "삼", "돌", "녀"] },
  wa: { sur: ["미야모토", "야규", "사사키", "핫토리", "이토", "쓰카하라", "다케다", "아라키", "오다", "혼다", "모치즈키", "후지바야시", "가미이즈미", "시시도"], giv: ["주베에", "고지로", "한조", "겐노스케", "사쿄", "시노부", "오유키", "마타에몬", "효고", "다쓰마", "겐사이", "오린", "사코", "무네노리"] },
  xiyu: { one: ["아르슬란", "다리우스", "루스탐", "샤힌", "야스민", "나디르", "파리사", "카림", "미르자", "로산", "바흐람", "세린", "타히르", "아이굴"] },
  tianzhu: { one: ["아르준", "비크람", "라비", "데바", "수리야", "프라나브", "아난다", "락슈미", "가야트리", "칼란", "마두", "라후", "사비트리", "인드라짓"] },
  bod: { one: ["잠양", "텐진", "롭상", "도르제", "카르마", "페마", "소남", "체링", "따시", "갈첸", "니마", "다와"] },
  monk: { a: ["혜", "원", "공", "정", "각", "명", "법", "현", "지", "무"], b: ["공", "진", "명", "해", "성", "각", "인", "선", "능", "광"] },
  tao: { a: ["청", "현", "옥", "태", "자", "운", "허", "송"], b: ["허", "양", "진", "원", "명", "학", "송", "운"] }
};
var NICK = {
  light: ["청풍", "백운", "명월", "설화", "비룡", "청룡", "일점", "소요", "운중", "벽력", "금강", "옥면", "천리", "추풍", "유수", "낙화", "철심", "일월"],
  dark: ["혈영", "귀영", "흑풍", "야차", "독수", "음풍", "철혈", "귀면", "무정", "냉면", "흡혈", "단혼", "추혼", "마영", "적염", "탈백"],
  mid: ["만리", "비천", "쾌수", "무명", "풍운", "유랑", "철골", "광풍", "취선", "일엽", "고검", "낭자", "흑백", "변검"],
  by: { "검": ["검객", "검협", "검귀", "검선"], "도": ["도객", "도왕", "도귀"], "창": ["창룡", "창객", "신창"], "궁": ["신궁", "궁귀"], "암기": ["비도", "섬수", "천수"], "권": ["권왕", "철권"], "장": ["신장", "장객"], "지": ["일지", "신지"], "조": ["응조", "귀조"], "각": ["신각", "비각"], "부": ["부왕", "철부"], "봉": ["신봉"], "선": ["선생", "선객"], "필": ["판관", "서생"], "삭": ["귀삭"], "편": ["신편"] },
  tail: { light: ["협", "객", "선", "자"], dark: ["마", "귀", "살", "왕"], mid: ["객", "수", "자", "랑"] }
};
var ORIGIN = ["시골 서당 훈장의 자식", "몰락한 무가의 막내", "객잔 주방에서 자란 고아", "표국 마부의 아들딸", "관아 포졸 집안", "떠돌이 약장수 밑에서 큰 아이", "강가 뱃사공 집안", "마계를 피해 온 피난민", "이름난 문파의 잡역 제자", "장원 하인의 자식", "산적에게 길러진 아이", "사당지기 노인의 손주"];
var REASON = ["사부의 원수를 찾아서", "사라진 가족의 행방을 쫓아서", "사문의 비급을 되찾으려고", "빚을 갚을 돈을 벌려고", "천마를 끝낸다는 소문을 듣고", "입마한 형제를 거두려고", "문파의 명을 받아서", "이름을 떨치고 싶어서", "마기를 늦추는 약을 구하려고", "약조를 지키려고", "쫓기는 몸이라서", "제 무공의 끝을 보려고"];
function toneOf(group) { return group === "사도오천" || group === "천마신교" ? "dark" : group === "세외" || group === "정사지간" ? "mid" : "light"; }
function rollName(group, school) {
  var N = NAMES;
  if (school === "해동") return pick(N.joseon.sur) + pick(N.joseon.giv) + pick(N.joseon.giv);
  if (school === "동영") return pick(N.wa.sur) + " " + pick(N.wa.giv);
  if (school === "서역") return pick(N.xiyu.one);
  if (school === "천축") return pick(N.tianzhu.one);
  if (school === "포달랍궁") return pick(N.bod.one);
  if (school === "소림사") return pick(N.monk.a) + pick(N.monk.b);
  var fam = { "남궁세가": "남궁", "사천당가": "당", "제갈세가": "제갈", "하북팽가": "팽", "산동악가": "악" }[school] || (school === "북해빙궁" && Math.random() < .5 ? "북궁" : "");
  var sur = fam || pick(N.han.sur), g = pick(N.han.giv) + (Math.random() < .8 ? pick(N.han.giv) : "");
  return sur + g;
}
function rollAlias(group, mainSk) {
  var tone = toneOf(group), pre = pick(NICK[tone]), by = NICK.by[mainSk];
  return pre + (by && Math.random() < .75 ? pick(by) : pick(NICK.tail[tone]));
}
function rollChar(opt) {
  var lv = LEVELS.indexOf(opt.lv) >= 0 ? opt.lv : "삼류", L = LIMITS[lv];
  var group = GROUPS[opt.group] ? opt.group : pick(Object.keys(GROUPS)), G = GROUPS[group];
  var school = G.schools[opt.school] ? opt.school : pick(Object.keys(G.schools));
  var c = blankChar(); c.lv = lv; c.group = group; c.school = school;
  var allSk = DATA.skills || [], fieldOf = {}; allSk.forEach(function (s) { fieldOf[s.n] = s.f; });
  /* 이 문파·범용 무공 가운데 이 경지에서 익힐 수 있는 것 */
  var pool = DATA.muk.filter(function (r) { return r.n !== "접근전 공격" && lvIdx(r.lv) <= lvIdx(lv) && (isGeneral(r) || schoolMatch(r, c)); });
  var freq = {}; pool.forEach(function (r) { if (r.sk && r.sk !== "—" && fieldOf[r.sk]) freq[r.sk] = (freq[r.sk] || 0) + (schoolMatch(r, c) ? 3 : 1); });
  /* 1. 특기: 조건 특기 하나 → 주요 분야 2개 이상 → 나머지는 문파 무공이 쓰는 특기를 더 자주 */
  var cond = G.schools[school];
  c.skills.push(pick(cond));
  function addSk(cands, wfn) { cands = cands.filter(function (s) { return c.skills.indexOf(s.n) < 0; }); var s = wpick(cands, wfn); if (s) c.skills.push(s.n); }
  var home = allSk.filter(function (s) { return s.f === G.field; });
  while (c.skills.filter(function (n) { return fieldOf[n] === G.field; }).length < 2 && c.skills.length < L.sk) addSk(home, function (s) { return 1 + (freq[s.n] || 0); });
  var guard = 0;
  while (c.skills.length < L.sk && guard++ < 50) addSk(allSk, function (s) { return 0.4 + (freq[s.n] || 0) + (s.f === G.field ? 1 : 0); });
  /* 2. 무공: 문파 무공을 먼저, 익힌 특기로 쓰는 공격 무공이 적어도 하나 */
  function usable(r) { return !r.sk || r.sk === "—" || c.skills.indexOf(r.sk) >= 0; }
  function wMg(r) { return (schoolMatch(r, c) ? 3 : 1) * (usable(r) ? 3 : 0.4) * (r.t === "장비" ? 0.8 : 1) * (1 + 0.15 * lvIdx(r.lv)); }
  function addMg(cands) { cands = cands.filter(function (r) { return c.mg.indexOf(r.n) < 0; }); var r = wpick(cands, wMg); if (r) c.mg.push(r.n); return r; }
  var atk = pool.filter(function (r) { return r.t === "공격" && r.sk && c.skills.indexOf(r.sk) >= 0; });
  addMg(atk.filter(function (r) { return schoolMatch(r, c); }).length ? atk.filter(function (r) { return schoolMatch(r, c); }) : atk.length ? atk : pool.filter(function (r) { return r.t === "공격"; }));
  guard = 0;
  while (c.mg.length < L.mg && guard++ < 60) addMg(pool);
  /* 접근전 공격 지정특기: 익힌 특기 가운데 외공·병기 쪽을 더 자주 */
  c.atk = wpick(c.skills, function (n) { return fieldOf[n] === "외공" || fieldOf[n] === "병기" ? 3 : 1; }) || "";
  /* 3. 배경: 0 ~ 경지 한도 사이의 장점, 같은 수의 단점(자기 문파 것을 조금 더 자주) */
  var k = rnd(L.bg + 1), bgs = DATA.bg.filter(function (r) { return isGeneral(r) || schoolMatch(r, c); });
  var CLASH = [["무면", "당당정정"]];
  function has(x) { return c.bg.some(function (b) { return splitName(b)[0] === x; }); }
  function clash(n) { var m = splitName(n)[0]; return CLASH.some(function (p) { var i = p.indexOf(m); return i >= 0 && has(p[1 - i]); }); }
  ["장점", "단점"].forEach(function (t) {
    for (var i = 0; i < k; i++) { var r = wpick(bgs.filter(function (b) { return b.t === t && c.bg.indexOf(b.n) < 0 && !clash(b.n); }), function (b) { return schoolMatch(b, c) ? 2 : 1; }); if (r) c.bg.push(r.n); }
  });
  /* 4. 보급품 3개 */
  var sup = DATA.items.filter(function (r) { return r.t === "보급품"; });
  for (var j = 0; j < 3 && sup.length; j++) { var it = pick(sup).n; c.items[it] = (c.items[it] || 0) + 1; }
  /* 5. 이름·별호·한 줄 내력: 가장 많이 쓰는 병기 특기를 별호에 */
  var mainSk = "";
  c.mg.forEach(function (n) { var r = find(DATA.muk, n); if (!mainSk && r.t === "공격" && NICK.by[r.sk]) mainSk = r.sk; });
  c.name = rollName(group, school); c.alias = rollAlias(group, mainSk);
  c.notes = "출신: " + pick(ORIGIN) + ". 출도한 까닭: " + pick(REASON) + ".\n(무작위 생성. 오의는 직접 만드세요.)";
  return c;
}
function rollPanelHtml(c) {
  var st = store("wx-roll") || {};
  var g = GROUPS[st.group] ? st.group : "";
  return '<div class="rollp" id="b-rollp" hidden><div class="row2">' +
    '<div class="field"><label for="r-lv">경지</label><select id="r-lv">' + LEVELS.map(function (l) { return "<option" + (l === (st.lv || "삼류") ? " selected" : "") + ">" + l + "</option>"; }).join("") + "</select></div>" +
    '<div class="field"><label for="r-g">계열</label><select id="r-g">' + opts(Object.keys(GROUPS), g, "무작위") + "</select></div>" +
    '<div class="field"><label for="r-s">문파</label><select id="r-s">' + opts(g ? Object.keys(GROUPS[g].schools) : [], st.school, "무작위") + "</select></div></div>" +
    '<p class="hint">특기·무공·배경·보급품·이름·별호를 룰에 맞게 주사위로 정해 새 캐릭터로 만듭니다. 문파 무공이 쓰는 특기를 더 자주 고르고, 익힌 특기로 쓰는 공격 무공을 적어도 하나 넣어요. 오의는 비워 둡니다.</p>' +
    '<div class="sheet-actions"><button class="btn small primary" type="button" id="r-go">굴리기</button><button class="btn small" type="button" id="r-x">닫기</button></div></div>';
}
function bindRollPanel(c) {
  var p = $("#b-rollp"), b = $("#b-roll"); if (!p || !b) return;
  b.onclick = function () { p.hidden = !p.hidden; b.setAttribute("aria-expanded", String(!p.hidden)); };
  $("#r-x").onclick = function () { p.hidden = true; b.setAttribute("aria-expanded", "false"); };
  $("#r-g").onchange = function (e) { var g = GROUPS[e.target.value]; $("#r-s").innerHTML = opts(g ? Object.keys(g.schools) : [], "", "무작위"); };
  $("#r-go").onclick = function () {
    var o = { lv: $("#r-lv").value, group: $("#r-g").value, school: $("#r-s").value };
    store("wx-roll", o);
    var n = rollChar(o); chars.push(n); curId = n.id; save(); renderBuilder();
    toast((n.alias ? n.alias + " " : "") + n.name + " — " + n.school + " " + n.lv);
  };
}

/* GM 서고(gm.js)가 NPC 시트를 만들 때 쓴다 */
window.WX_NPC = {
  levels: LEVELS, groups: GROUPS, limits: LIMITS,
  roll: function (o) { return rollChar(o || {}); },
  head: function (c) { return sheetHead(fixChar(c)).replace(/<div class="meta2">[\s\S]*?<\/div>/, ""); },
  body: function (c) { return sheetBody(fixChar(c)); },
  /* NPC 시트에 접근전 공격 지정특기가 없으면: 익힌 병기·외공 특기 중 처음 것, 없으면 첫 특기 */
  autoAtk: function (c) {
    if (!c || c.atk) return c;
    var f = {}; (DATA.skills || []).forEach(function (x) { f[x.n] = x.f; });
    var sk = c.skills || [], w = sk.filter(function (n) { return f[n] === "병기" || f[n] === "외공"; })[0];
    c.atk = w || sk[0] || ""; return c;
  },
  text: function (c) { return sheetText(fixChar(c)); },
  toBuilder: function (c) { var n = fixChar(JSON.parse(JSON.stringify(c))); n.id = blankChar().id; n.pub = false; chars.push(n); curId = n.id; store("wx-chars", chars); store("wx-cur", curId); location.hash = "builder"; }
};

/* 전투 시뮬(sim.js)이 쓰는 창구 */
window.WX_SIM_API = {
  levels: LEVELS, groups: GROUPS, limits: LIMITS, mods: function () { return DATA.mods || []; }, data: function () { return DATA; }, esc: esc, toast: toast, store: store, viewHead: viewHead, builderTabs: builderTabs,
  view: function () { return view; },
  fix: fixChar, autoAtk: function (c) { return window.WX_NPC.autoAtk(c); }, roll: function (o) { return rollChar(o || {}); },
  targets: targets, find: function (n) { return find(DATA.muk, n); },
  skills: function () { return (DATA.skills || []).map(function (x) { return x.n; }); },
  fieldOf: (function () { var m = null; return function (n) { if (!m) { m = {}; (DATA.skills || []).forEach(function (x) { m[x.n] = x.f; }); } return m[n]; }; })(),
  myChars: function () { return chars.map(fixChar); },
  archive: function () { return PCS.map(function (d) { return { id: d.id, player: d.player, chars: (d.chars || []).map(function (c) { return withSecret(d.id, c); }) }; }); }
};

/* ───────── 시트 동기화 (주인장 전용) ───────── */
function payloadOf(res) {
  var p = res && (res.payload !== undefined ? res.payload : res.structuredContent);
  if (typeof p === "string") {
    var a = p.indexOf("{"), b = p.lastIndexOf("}");
    try { p = JSON.parse(p.slice(a, b + 1)); } catch (e) { }
  }
  return p || {};
}
function rows(res) { return (payloadOf(res).values || []).filter(function (r) { return r && r[0] && String(r[0]).trim(); }); }
function errText(e, server) {
  var c = e && e.code;
  if (c === "server_not_connected" || c === "selection_required") return server + " 커넥터가 연결돼 있지 않아요. claude.ai 설정 → 커넥터에서 " + server + "를 추가해 주세요.";
  if (c === "needs_reauth") return server + " 연결이 만료됐어요. claude.ai 설정 → 커넥터에서 다시 연결해 주세요.";
  if (c === "not_in_manifest" || c === "approval_required" || c === "consent_required") return server + " 사용 허용이 필요해요. 다시 눌러서 허용해 주세요.";
  if (c === "tool_error") return server + "에서 읽기에 실패했어요: " + (e.message || "");
  if (c === "server_unavailable") return server + "가 잠시 응답하지 않아요. 조금 뒤 다시 눌러 주세요.";
  if (c === "not_granted" || c === "capability_disabled") return "이 화면에서는 커넥터를 쓸 수 없어요. claude.ai에서 이 페이지를 열어 주세요.";
  return "동기화에 실패했어요 (" + (c || "알 수 없음") + "). 다시 시도해 주세요.";
}
function showStatus(msg, err) {
  var s = document.getElementById("status");
  if (!s) { s = document.createElement("div"); s.id = "status"; view.parentNode.insertBefore(s, view); s.style.cssText = "max-width:1240px;margin:16px auto 0;"; }
  s.className = "wrap"; s.innerHTML = '<div class="status' + (err ? " err" : "") + '">' + esc(msg) + "</div>";
}
function getSource(id, file) {
  var el = document.getElementById(id);
  if (el && el.textContent.trim()) return Promise.resolve(el.textContent);
  return fetch(file).then(function (r) { if (!r.ok) throw new Error(file); return r.text(); });
}
function buildHtml(data, css, js) {
  var safe = function (s) { return s.replace(/<\/(script|style)/gi, "<\\/$1"); };
  var json = JSON.stringify(data).replace(/</g, "\\u003c");
  var S = "scr" + "ipt";
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' + RESET + "</style></head><body>" +
    '<title>무협비가미</title><meta name="claude:viewport-fit-sides" content="cover">' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Nanum+Brush+Script&family=Song+Myung&display=swap">' +
    '<style id="wx-css">' + safe(css) + "</style>" +
    '<div id="app"></div>' +
    "<" + S + ' type="application/json" id="wx-data">' + json + "</" + S + ">" +
    "<" + S + ' src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></' + S + ">" +
    "<" + S + ' src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"></' + S + ">" +
    "<" + S + ' src="geo.js"></' + S + ">" + "<" + S + ' src="mapdata.js"></' + S + ">" +
    "<" + S + ' id="wx-app">' + safe(js) + "</" + S + ">" +
    "</body></html>";
}
var RESET = ":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}";

function setupSync() {
  var box = $("#sync");
  box.innerHTML = '<span id="sync-when"></span>';
  setupSyncTime();
  if (STANDALONE || !window.claude || !claude.use) return;
  Promise.all([claude.use("mcp"), claude.use("artifact"), claude.use("user")]).then(function (r) {
    var mcp = r[0], art = r[1], user = r[2];
    if (mcp) { MCP = mcp; var ex = $("#s-export"); if (ex) ex.hidden = false; }
    if (!mcp || !art) return;
    var canP = user && user.canEdit ? Promise.resolve(user.canEdit()).catch(function () { return true; }) : Promise.resolve(true);
    canP.then(function (ok) { if (ok) { addSyncBtn(mcp, art); addPushBtn(mcp); } });
  });
}
function addSyncBtn(mcp, art) {
  var box = $("#sync");
  var b = document.createElement("button");
  b.className = "btn small" + (hasData ? "" : " primary"); b.type = "button"; b.textContent = "시트 동기화";
  box.appendChild(b);
  b.onclick = function () { runSync(mcp, art, b); };
}
/* ───────── 무공 4차 개편: 사이트의 무공 목록을 시트 '인법출력리스트'에 한 번 써 넣는다 ─────────
   옛 목록은 '인법출력리스트(3차)' 탭에 사본으로 남겨 두었다. 다 쓰면 단추가 사라진다. */
var PUSH_VER = "muk4-rn1108b";
var PUSH_CHECK = "적정존(寂靜尊)";
var PUSH_LAST = 1433;
function pushDone() { return store("wx-push") === PUSH_VER; }
function addPushBtn(mcp) {
  if (pushDone() || !hasData) return;
  /* 다른 기기에서 이미 써 넣었으면 단추를 띄우지 않는다 */
  mcp.callTool("Google Sheets", "get_values", { spreadsheetId: SHEET_ID, range: "인법출력리스트!B3:B" + PUSH_LAST }, { cache: false }).then(function (res) {
    if (rows(res).some(function (r) { return r[0] === PUSH_CHECK; })) { store("wx-push", PUSH_VER); return; }
    showPushBtn(mcp);
  }, function () { showPushBtn(mcp); });
}
function showPushBtn(mcp) {
  var box = $("#sync");
  var b = document.createElement("button");
  b.className = "btn small primary"; b.type = "button"; b.textContent = "무공 시트에 쓰기";
  b.title = "4차 무공 " + DATA.muk.length + "개를 시트 '인법출력리스트'에 써 넣습니다. 옛 목록은 '인법출력리스트(3차)' 탭에 있어요.";
  box.appendChild(b);
  b.onclick = function () { runPush(mcp, b); };
}
function runPush(mcp, btn) {
  var list = DATA.muk.filter(function (r) { return r && r.n; });
  if (!window.confirm("4차 무공 " + list.length + "개를 시트 '인법출력리스트'에 써 넣을까요?\n지금 시트의 무공 목록(B3:K" + PUSH_LAST + ")은 지워지고, 옛 목록은 '인법출력리스트(3차)' 탭에 남아 있어요.")) return;
  btn.disabled = true;
  var rowsOut = list.map(function (r) { return [r.n, r.t || "", r.lv || "", r.r || "", r.c || "", r.g || "", r.s || "", r.sk || "", r.e || "", r.d || ""]; });
  var blank = []; for (var i = 3 + rowsOut.length; i <= PUSH_LAST; i++) blank.push(["", "", "", "", "", "", "", "", "", ""]);
  var CH = 150, jobs = [];
  for (var k = 0; k < rowsOut.length; k += CH) jobs.push([3 + k, rowsOut.slice(k, k + CH)]);
  for (var j = 0; j < blank.length; j += CH) jobs.push([3 + rowsOut.length + j, blank.slice(j, j + CH)]);
  var done = 0;
  function put(job) {
    var a = job[0], v = job[1];
    return mcp.callTool("Google Sheets", "update_values", { spreadsheetId: SHEET_ID, range: "인법출력리스트!B" + a + ":K" + (a + v.length - 1), values: v }, { cache: false })
      .then(function () { done++; showStatus("시트에 쓰는 중… " + done + "/" + jobs.length); });
  }
  showStatus("시트에 쓰는 중… 0/" + jobs.length);
  jobs.reduce(function (p, job) { return p.then(function () { return put(job); }); }, Promise.resolve())
    .then(function () { return mcp.callTool("Google Sheets", "get_values", { spreadsheetId: SHEET_ID, range: RANGES.muk }, { cache: false }); })
    .then(function (res) {
      var got = rows(res);
      if (got.length !== rowsOut.length || !got.some(function (r) { return r[0] === PUSH_CHECK; })) throw { code: "tool_error", message: "시트를 다시 읽었더니 " + got.length + "개만 있어요" };
      store("wx-push", PUSH_VER); btn.remove();
      showStatus("시트에 무공 " + got.length + "개를 써 넣었어요. 옛 목록은 '인법출력리스트(3차)' 탭에 있어요.");
    })
    .catch(function (e) { btn.disabled = false; showStatus(errText(e, "Google Sheets") + " (" + done + "/" + jobs.length + "까지 썼어요. 다시 누르면 처음부터 다시 씁니다.)", true); });
}
function runSync(mcp, art, btn) {
  btn.disabled = true;
  var out = {}, step = "Google Sheets";
  function get(range) { return mcp.callTool("Google Sheets", "get_values", { spreadsheetId: SHEET_ID, range: range }, { cache: false }); }
  showStatus("무공·배경·도구·개조 시트를 읽는 중…");
  Promise.all([get(RANGES.muk), get(RANGES.bg), get(RANGES.items), get(RANGES.mods), get(RANGES.gibo), get(RANGES.skills)])
    .then(function (res) {
      out.muk = rows(res[0]).map(function (r) { return { n: r[0], t: r[1] || "", lv: r[2] || "", r: r[3] || "", c: r[4] || "", g: r[5] || "", s: r[6] || "", sk: r[7] || "", e: r[8] || "", d: r[9] || "" }; });
      out.bg = rows(res[1]).map(function (r) { return { n: r[0], t: r[1] || "", g: r[2] || "", s: r[3] || "", e: r[4] || "", d: r[5] || "" }; });
      out.items = rows(res[2]).map(function (r) { return { n: r[0], t: r[1] || "", src: r[2] || "", p: r[3] || "", e: r[4] || "", d: r[5] || "" }; });
      out.mods = rows(res[3]).map(function (r) { return { n: r[0], t: r[1] || "", tgt: r[2] || "", lim: r[3] || "", e: r[4] || "", d: r[5] || "" }; });
      out.gibo = rows(res[4]).filter(function (r) { return String(r[6]).toUpperCase() === "TRUE"; }).map(function (r) { return { n: r[0], t: r[1] || "", src: r[2] || "", p: r[3] || "", e: r[4] || "", d: r[5] || "" }; });
      out.skills = rows(res[5]).map(function (r) { return { f: r[0], n: r[1], d: r[2] && r[2] !== "#ERROR!" ? r[2] : "" }; });
      if (!out.muk.length) throw { code: "tool_error", message: "무공출력리스트가 비어 있어요" };
      if (!pushDone() && !out.muk.some(function (r) { return r.n === PUSH_CHECK; })) throw { code: "tool_error", message: "시트에 아직 옛 무공 목록이 있어요. 먼저 '무공 시트에 쓰기'를 눌러 주세요" };
      step = "Google Drive";
      showStatus("룰 문서를 읽는 중…");
      return mcp.callTool("Google Drive", "read_file_content", { fileId: DOC_ID }, { cache: false });
    })
    .then(function (res) {
      var p = payloadOf(res);
      out.rules = p.fileContent || (typeof res.payload === "string" ? res.payload : "");
      out.syncedAt = new Date().toISOString();
      step = "publish";
      showStatus("무공 " + out.muk.length + " · 배경 " + out.bg.length + " · 도구 " + out.items.length + " · 개조 " + out.mods.length + "개를 페이지에 저장하는 중…");
      return null;
    })
    .then(function (src) {
      /* 데이터는 data.json 파일로 따로 저장 — 페이지 코드를 고쳐도 데이터가 남는다.
         이 방식이 막힌 화면(공개 링크 등)에서는 페이지 안에 데이터를 넣어 통째로 저장한다. */
      return art.publish({ "data.json": { content: JSON.stringify(out), contentType: "application/json" } })
        .then(function () {
          DATA = patchData(out); hasData = true; RULES = null; btn.disabled = false;
          showStatus("동기화했어요. 무공 " + out.muk.length + " · 배경 " + out.bg.length + " · 도구 " + out.items.length + " · 개조 " + out.mods.length + "개.");
          route(); setupSyncTime();
        }, function (e) {
          var c = e && e.code;
          if (c === "capability_disabled" || c === "capability_removed" || c === "invalid_content" || c === "read_only_path") {
            return Promise.all([getSource("wx-css", "app.css"), getSource("wx-app", "app.js")])
              .then(function (s) { return art.publish(buildHtml(out, s[0], s[1])); })
              .then(function () { showStatus("동기화했어요. 잠시 뒤 새 버전으로 바뀝니다."); });
          }
          throw e;
        });
    })
    .catch(function (e) {
      btn.disabled = false;
      if (step === "publish") {
        var c = e && e.code;
        if (c === "conflict") { showStatus("다른 곳에서 먼저 저장했어요. 새 버전으로 바뀌면 다시 눌러 주세요."); return; }
        if (c === "not_writer" || c === "not_granted") { showStatus("이 페이지를 고칠 권한이 없어서 저장하지 못했어요.", true); return; }
        if (c === "too_large") { showStatus("데이터가 너무 커서 저장하지 못했어요.", true); return; }
        showStatus("페이지 저장에 실패했어요 (" + (c || (e && e.message) || "알 수 없음") + ").", true); return;
      }
      showStatus(errText(e, step), true);
    });
}

/* ───────── 구글 시트로 내보내기 ─────────
   무협 데이터 시트를 통째로 사본 떠서(수식·드롭다운 유지) '캐릭터 시트' 탭의 입력 칸만 채운다. */
var MCP = null;
var CS = "'캐릭터 시트'!";
var SHEET_FORMS = { "일격·근거리형": "일격(근거리형)", "일격·원거리형": "일격(원거리형)", "광역": "광역", "각성·판정 상승": "각성(판정 상승)", "각성·순간 성공": "각성(순간 성공)", "영역·데미지 감소": "영역(데미지 감소)", "영역·판정 감소형": "영역(판정 감소)", "방어·완전방어형": "방어(완전방어)", "방어·반격형": "방어(반격)", "회복·생명력 회복": "회복(생명력 회복)", "연환(連環)형": "연환", "흡성(吸星)형": "흡성", "신법(身法)형": "신법", "호신강기(護身罡氣)형": "호신강기" };
function exportToSheet(c, btn) {
  var st = $("#s-exst");
  function say(m, link) { st.hidden = false; st.innerHTML = esc(m) + (link ? ' <a href="' + esc(link) + '" target="_blank" rel="noopener">시트 열기</a>' : ""); }
  if (!MCP) { say("이 사이트에서는 구글 시트로 내보낼 수 없어요."); return; }
  btn.disabled = true;
  var newId = null, server = "Google Drive", ptFail = false;
  var title = "무협비가미 캐릭터 — " + (c.name || "이름 없는 협객");
  function put(range, values) { return MCP.callTool("Google Sheets", "update_values", { spreadsheetId: newId, range: CS + range, values: values }, { cache: false }); }
  say("시트 사본을 만드는 중…");
  MCP.callTool("Google Drive", "copy_file", { fileId: SHEET_ID, title: title }, { cache: false })
    .then(function (res) {
      var p = payloadOf(res); newId = p.id || p.fileId || (p.file && p.file.id);
      if (!newId) throw { code: "tool_error", message: "사본 주소를 받지 못했어요" };
      server = "Google Sheets";
      say("특기표를 확인하는 중…");
      return MCP.callTool("Google Sheets", "get_values", { spreadsheetId: newId, range: CS + "S4:AO14" }, { cache: false });
    })
    .then(function (res) {
      /* 특기 이름 위치를 사본에서 직접 찾아 체크한다 */
      var grid = payloadOf(res).values || [];
      var skillGrid = grid.map(function (row) { return (row || []).map(function (cell, ci) { return ci % 4 === 0 ? (c.skills.indexOf(String((row || [])[ci + 1] || "")) >= 0) : null; }); });
      while (skillGrid.length < 11) skillGrid.push([]);
      var L = LIMITS[c.lv];
      var mg = c.mg.slice(0, 11), mgCol = [];
      for (var i = 0; i < 11; i++) { mgCol.push([mg[i] || ""]); mgCol.push([null]); }
      mgCol.pop();
      var bgPros = bgSplit(c)[0], bgCons = bgSplit(c)[1];
      var base = { "금창약(金瘡藥)": 0, "혼통적(魂通籍)": 1, "백통적(魄通籍)": 2 };
      var supply = [[null, null, null, 0], [null, null, null, 0], [null, null, null, 0], [null, null, null, 0], [null, null, null, 0], [null, null, null, 0]], extra = 3;
      Object.keys(c.items).forEach(function (n) {
        var key = Object.keys(base).filter(function (k) { return k === n || splitName(k)[0] === splitName(n)[0]; })[0];
        if (key !== undefined) supply[base[key]][3] = c.items[n];
        else if (extra < 6) { supply[extra] = [splitName(n)[0], null, null, c.items[n]]; extra++; }
      });
      var jobs = [
        ["B4", [[c.name || ""]]],
        ["C18:H18", [[c.group || "", null, null, null, null, c.school || ""]]],
        ["G20", [[c.lv]]],
        ["D21", [[c.alias || ""]]],
        ["T16:T17", [[bgPros.join(", ")], [bgCons.join(", ")]]],
        ["T18", [[c.notes || ""]]],
        ["L20", [[Number(c.exp) || 0]]],
        ["S4:AO14", skillGrid],
        ["B25:M47", relRows(c)],
        ["R2", [[!!c.wrapV]]],
        ["AO2", [[!!c.wrapH]]],
        ["Q27:Q47", mgCol],
        ["U25", [[c.atk || ""]]],
        ["AQ4:AT9", supply],
        ["AT10", [[Number(c.money) || 0]]]
      ];
      if (c.gapManual) {
        var g = (c.gaps || []).map(Boolean), row = [];
        for (var k = 0; k < 22; k++) row.push(null);   /* D50 … Y50 */
        row[0] = true; row[3] = g[0]; row[7] = g[1]; row[11] = g[2]; row[15] = g[3]; row[18] = g[4]; row[21] = g[5];
        jobs.push(["D50:Y50", [row]]);
      }
      [13, 22, 31].forEach(function (r0, i) {
        var o = c.ougi[i]; if (!o) return;
        var pros = o.mods.filter(function (n) { return find(DATA.mods, n).t !== "약점"; }), cons = o.mods.filter(function (n) { return find(DATA.mods, n).t === "약점"; });
        jobs.push(["AT" + r0 + ":AT" + (r0 + 2), [[o.name || ""], [o.skill || ""], [SHEET_FORMS[o.form] || ""]]]);
        jobs.push(["AS" + (r0 + 3) + ":AW" + (r0 + 3), [[pros.join(", "), null, null, null, cons.join(", ")]]]);
      });
      var done = 0;
      return jobs.reduce(function (p, j) {
        return p.then(function () { say("칸을 채우는 중… " + (++done) + " / " + jobs.length); return put(j[0], j[1]); });
      }, Promise.resolve()).then(function () { return c.portrait ? exportPortrait(c, newId, say).catch(function () { ptFail = true; }) : null; });
    })
    .then(function () {
      btn.disabled = false;
      say("내보냈어요. 내 구글 드라이브에 '" + title + "' 시트가 생겼어요." + (ptFail ? " 초상은 넣지 못했어요(구글 드라이브 연결을 확인해 주세요)." : ""), "https://docs.google.com/spreadsheets/d/" + newId + "/edit#gid=82558250");
    })
    .catch(function (e) {
      btn.disabled = false;
      var msg = errText(e, server);
      if (server === "Google Drive" && e && e.code === "tool_error") msg = "시트 사본을 만들지 못했어요. 원본 '무협 데이터' 시트를 볼 수 있는 계정인지 확인해 주세요. (" + (e.message || "") + ")";
      say(msg + (newId ? " 사본은 만들어졌으니 드라이브에서 확인할 수 있어요." : ""), newId ? "https://docs.google.com/spreadsheets/d/" + newId + "/edit" : "");
    });
}

/* 초상: 내 드라이브에 그림 파일을 올리고 '링크가 있는 사람 보기'로 연 뒤, 시트의 초상 칸(C3)에 IMAGE 수식으로 건다 */
function exportPortrait(c, sheetId, say) {
  var b64 = String(c.portrait || "").split(",")[1]; if (!b64) return Promise.resolve();
  var fid = null;
  say("초상을 드라이브에 올리는 중…");
  return MCP.callTool("Google Drive", "create_file", { title: "무협비가미 초상 — " + (c.name || "협객") + ".jpg", base64Content: b64, contentMimeType: "image/jpeg", disableConversionToGoogleType: true }, { cache: false })
    .then(function (res) {
      var p = payloadOf(res); fid = p.id || p.fileId || (p.file && p.file.id);
      if (!fid) throw { code: "tool_error" };
      return MCP.callTool("Google Drive", "share_file", { fileId: fid, permissionId: "anyoneWithLink", role: "reader" }, { cache: false });
    })
    .then(function () {
      say("초상을 시트에 거는 중…");
      return MCP.callTool("Google Sheets", "update_formulas", { spreadsheetId: sheetId, range: CS + "C3", formulas: [['=IMAGE("https://lh3.googleusercontent.com/d/' + fid + '")']] }, { cache: false });
    });
}

function setupSyncTime() {
  var el = $("#sync-when"); if (!el) return;
  var when = DATA && DATA.syncedAt ? new Date(DATA.syncedAt) : null;
  el.textContent = when ? "최근 동기화 " + when.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
}

view.innerHTML = '<p class="hint" style="padding-top:24px">불러오는 중…</p>';
setupSync();
setupDb();
inkTrail();
loadData().then(function () { route(); setupSyncTime(); });
})();
