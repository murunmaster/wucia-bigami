/* ═════════ GM 서고 — 기보·NPC·던전 관리.
   LOCKED = false: PL 공개 전. 누구나 열고 고칠 수 있다.
   LOCKED = true : 주인장(편집 권한이 있는 사람)만 연다. 비밀번호는 묻지 않는다.
     잠글 때는 저장소 규칙도 함께 바꾼다(gmg-·gmn- 저장소를 read/write admin으로) — 그래야 코드를 들여다봐도 못 읽는다.
     주인장과 Claude는 규칙상 언제나 읽고 쓸 수 있다. ═════════ */
(function () {
  var GM = { gibo: [], npc: [], giboReady: false, npcReady: false, err: "", tab: "gibo", open: "", f: {} };
  var DB = null, KEY = "", COL_G = "", COL_N = "";
  var SALT = "wuxia-gm:";
  var LOCKED = true;
  var OPEN_KEY = "8430c8fb1398196e6ddaf919";   /* 서고 자료가 든 저장소 이름 */
  var IS_OWNER = false;
  /* app.js가 편집 권한을 확인하면 부른다 */
  window.gmOwner = function () { IS_OWNER = true; var db = window.WX_GM_DB; if (db && !DB) { gmStart(db, OPEN_KEY); if (onGm()) window.renderGM(); } };
  function mayOpen() { return !LOCKED || IS_OWNER; }
  function sha(text) {
    var buf = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", buf).then(function (h) { return Array.from(new Uint8Array(h)).map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); });
  }
  function ssGet() { try { return sessionStorage.getItem("wx-gm-key") || ""; } catch (x) { return ""; } }
  function ssSet(v) { try { if (v) sessionStorage.setItem("wx-gm-key", v); else sessionStorage.removeItem("wx-gm-key"); } catch (x) { } }
  var STATUS = ["미정", "배치", "보유", "발견", "공개"];
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function q(s, r) { return (r || document).querySelector(s); }
  function maps() { return ((window.ZONES && ZONES.maps) || []).filter(function (m) { return m.group !== "tpl"; }); }
  function mapById(id) { return maps().filter(function (m) { return m.id === id; })[0]; }
  function zoneName(m, zid) { var z = m && m.zones.filter(function (x) { return x.id === zid; })[0]; return z ? z.n : ""; }
  function npcById(id) { return GM.npc.filter(function (n) { return n.id === id; })[0]; }
  function kindOf(m) { return m.region ? "지역" : m.group === "세외" ? "세외" : m.slot === "place" ? "명승" : "문파"; }
  function mapHref(m) {
    if (!m) return "";
    if (m.region) return "#map-p-" + m.prov;
    if (m.slot === "outer" && m.prov) return "#map-p-" + m.prov;
    if (m.places && m.places.length) return "#map-x-" + m.places[0];
    if (m.sects && m.sects.length) return "#map-s-" + m.sects[0];
    return "#map";
  }
  function whereText(r) {
    var parts = [];
    if (r.map) { var m = mapById(r.map); parts.push(m ? m.name + (r.zone ? " · " + zoneName(m, r.zone) : "") : r.map); }
    if (r.holder) { var n = npcById(r.holder); parts.push("소지 " + (n ? n.n : r.holder)); }
    if (!parts.length && r.pool) parts.push("묶음 " + r.pool);
    return parts.join(" / ") || "미정";
  }

  /* 강호도 구역 카드에 GM용으로 그곳의 기보·NPC를 보여 준다 */
  window.WX_GM_AT = function (mapId, zid) {
    var out = [];
    GM.gibo.forEach(function (r) { if (r.map === mapId && r.zone === zid) out.push(r.n); });
    GM.npc.forEach(function (n) {
      if (n.map === mapId && n.zone === zid) {
        var held = GM.gibo.filter(function (r) { return r.holder === n.id; }).map(function (r) { return r.n; });
        out.push("NPC " + n.n + (held.length ? "(" + held.join("·") + ")" : ""));
      }
    });
    return out;
  };

  function gmStart(db, key) {
    if (DB || !db || !key) return; DB = db; KEY = key; COL_G = "gmg-" + key; COL_N = "gmn-" + key;
    var t = setTimeout(function () { if (!GM.giboReady) { GM.err = "자료를 아직 불러오지 못했어요. 연결이 느릴 수 있어요."; redraw(); } }, 10000);
    db.collection(COL_G).onSnapshot(function (s) {
      GM.gibo = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.no || 0) - (b.no || 0); });
      if (!s.metadata.fromCache) { GM.giboReady = true; clearTimeout(t); GM.err = ""; }
      redraw();
    }, function (err) { clearTimeout(t); GM.err = "기보 자료를 읽지 못했어요 (" + (err && err.code || "오류") + ")."; redraw(); });
    db.collection(COL_N).onSnapshot(function (s) {
      GM.npc = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
      if (!s.metadata.fromCache) GM.npcReady = true;
      redraw();
    }, function () { GM.npcReady = true; redraw(); });
  }
  /* 비밀번호를 확인하고 연다. 저장소에 기보가 하나라도 있으면 맞는 비밀번호다 */
  function tryKey(db, key) {
    return db.collection("gmg-" + key).limit(1).get().then(function (s) { return !s.empty; });
  }
  window.gmBoot = function (db) {
    window.WX_GM_DB = db;
    var k = OPEN_KEY || ssGet();
    if (db && !DB && mayOpen()) { gmStart(db, OPEN_KEY); if (onGm()) window.renderGM(); return; }
    if (LOCKED) { if (onGm()) window.renderGM(); return; }
    if (!k || DB || !db) { if (onGm() && !DB) window.renderGM(); return; }
    tryKey(db, k).then(function (ok) { if (ok) { gmStart(db, k); if (onGm()) window.renderGM(); } else ssSet(""); }).catch(function () { });
  };

  function onGm() { return /^#gm(\b|-|$)/.test(location.hash || ""); }
  function redraw() { if (onGm() && q("#gm-body")) { if (!q("#gm-list")) drawBody(); else { drawTabs(); drawList(); } } }

  window.renderGM = function () {
    var view = q("#view");
    if (!DB && mayOpen() && window.WX_GM_DB) gmStart(window.WX_GM_DB, OPEN_KEY);
    if (!DB && LOCKED && !IS_OWNER) {
      view.innerHTML = '<div class="empty gm-lock"><h2>GM 서고<span class="han">書庫</span></h2><p>GM 전용 서고예요. 주인장만 열 수 있어요.</p><p><a href="#home">산문으로 돌아가기</a></p></div>';
      return;
    }
    if (!DB) {
      view.innerHTML = '<div class="empty gm-lock"><h2>GM 서고<span class="han">書庫</span></h2><p class="hint">서고를 여는 중…</p><p class="hint">오래 걸리면 주인장 계정으로 로그인했는지 확인해 주세요.</p><p><a href="#home">산문으로 돌아가기</a></p></div>';
      return;
    }
    if (!DB) {
      var db = window.WX_GM_DB;
      view.innerHTML = '<div class="empty gm-lock"><h2>GM 서고<span class="han">書庫</span></h2><p>GM 비밀번호를 넣으면 열립니다.</p>' +
        (db ? '<form id="gm-pw" class="gm-pw"><label for="gm-pw-in">비밀번호</label><input id="gm-pw-in" type="password" inputmode="numeric" autocomplete="current-password" required><button type="submit" class="btn small">열기</button></form><p class="hint" id="gm-pw-msg" aria-live="polite"></p>'
          : '<p class="hint">서고 자료를 불러오려면 주인장 계정으로 로그인해야 해요.</p>') +
        '<p><a href="#home">산문으로 돌아가기</a></p></div>';
      var f = q("#gm-pw");
      if (f) f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var inp = q("#gm-pw-in"), msg = q("#gm-pw-msg"), btn = q("button", f), pw = inp.value.trim();
        if (!pw) { msg.textContent = "비밀번호를 넣어 주세요."; return; }
        btn.disabled = true; msg.textContent = "확인하는 중…";
        sha(SALT + pw).then(function (h) {
          var key = h.slice(0, 24);
          return tryKey(db, key).then(function (ok) {
            if (!ok) { msg.textContent = "비밀번호가 맞지 않아요."; btn.disabled = false; inp.select(); return; }
            ssSet(key); gmStart(db, key); window.renderGM();
          });
        }).catch(function (err) { msg.textContent = "열지 못했어요 (" + (err && err.code || "연결 오류") + "). 잠시 뒤 다시 해 보세요."; btn.disabled = false; });
      });
      if (q("#gm-pw-in")) q("#gm-pw-in").focus();
      return;
    }
    view.innerHTML = '<header class="view-head"><h1>GM 서고<span class="han">書庫</span></h1><p>기보의 자리와 상태, NPC, 던전을 관리합니다. 서고를 연 브라우저 탭에서는 강호도의 구역을 누르면 그곳에 둔 기보와 NPC도 함께 보입니다. </p></header>' +
      '<nav class="subtabs gm-tabs" id="gm-tabs" aria-label="GM 서고 분류"></nav><div id="gm-body"></div>';
    if (q("#gm-lockbtn")) q("#gm-lockbtn").onclick = function () { ssSet(""); location.reload(); };
    q("#gm-tabs").addEventListener("click", function (ev) { var a = ev.target.closest("[data-tab]"); if (!a) return; ev.preventDefault(); GM.tab = a.dataset.tab; GM.open = ""; drawBody(); });
    var body = q("#gm-body");
    body.addEventListener("input", function (ev) { var f = ev.target.closest("[data-gf]"); if (f) { GM.f[f.dataset.gf] = f.value; drawList(); } });
    body.addEventListener("change", function (ev) {
      var t = ev.target;
      if (t.matches("[data-gf]")) { GM.f[t.dataset.gf] = t.value; drawList(); }
      if (t.matches("select[data-ed='map']")) { var form = t.closest("form"); var zs = q("select[data-ed='zone']", form); zs.innerHTML = zoneOpts(t.value, ""); }
    });
    body.addEventListener("click", onClick);
    body.addEventListener("submit", onSubmit);
    drawBody();
  };

  function drawTabs() {
    var tabs = q("#gm-tabs"); if (!tabs) return;
    var dgCount = maps().reduce(function (n, m) { return n + m.zones.filter(function (z) { return z.dg; }).length; }, 0);
    tabs.innerHTML = [["gibo", "기보", GM.gibo.length], ["npc", "NPC", GM.npc.length], ["dungeon", "던전", dgCount]].map(function (t) {
      return '<a href="#gm" data-tab="' + t[0] + '"' + (GM.tab === t[0] ? ' aria-current="page"' : "") + ">" + t[1] + " <small>" + t[2] + "</small></a>";
    }).join("");
  }
  function drawBody() {
    if (!q("#gm-tabs")) return;
    drawTabs();
    var body = q("#gm-body");
    var msg = GM.err ? '<p class="hint gm-err">' + e(GM.err) + "</p>" : !GM.giboReady && !GM.gibo.length ? '<p class="hint">불러오는 중…</p>' : "";
    if (GM.tab === "gibo") body.innerHTML = msg + giboFilters() + '<div id="gm-list"></div>';
    else if (GM.tab === "npc") body.innerHTML = msg + '<div class="gm-bar"><div class="field"><label for="gm-nq">찾기</label><input id="gm-nq" type="search" data-gf="nq" value="' + e(GM.f.nq || "") + '" placeholder="이름·소속·역할"></div><button type="button" class="btn small" data-act="npc-add">NPC 추가</button></div><div id="gm-list"></div>';
    else body.innerHTML = msg + '<p class="hint">던전은 구역도에 지정된 곳이에요. 보상은 기보 탭에서 그 던전 구역에 기보를 두면 여기 함께 나와요.</p><div id="gm-list"></div>';
    drawList();
  }

  function uniq(a) { var o = []; a.forEach(function (v) { if (v && o.indexOf(v) < 0) o.push(v); }); return o; }
  function sel(id, gf, label, list, cur) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-gf="' + gf + '"><option value="">전체</option>' +
      list.map(function (v) { return "<option" + (v === cur ? " selected" : "") + ">" + e(v) + "</option>"; }).join("") + "</select></div>";
  }
  function giboFilters() {
    return '<div class="gm-bar"><div class="field"><label for="gm-q">찾기</label><input id="gm-q" type="search" data-gf="q" value="' + e(GM.f.q || "") + '" placeholder="이름·효과·자리"></div>' +
      sel("gm-cat", "cat", "분류", uniq(GM.gibo.map(function (r) { return r.cat; })), GM.f.cat) +
      sel("gm-src", "src", "획득처", uniq(GM.gibo.map(function (r) { return r.src; })), GM.f.src) +
      sel("gm-st", "st", "상태", STATUS, GM.f.st) + "</div>";
  }

  function drawList() {
    var box = q("#gm-list"); if (!box) return;
    if (GM.tab === "gibo") box.innerHTML = giboList();
    else if (GM.tab === "npc") box.innerHTML = npcList();
    else box.innerHTML = dungeonList();
  }

  function giboList() {
    var f = GM.f, t = (f.q || "").trim();
    var rows = GM.gibo.filter(function (r) {
      return (!f.cat || r.cat === f.cat) && (!f.src || r.src === f.src) && (!f.st || (r.status || "미정") === f.st) &&
        (!t || (r.n + " " + r.e + " " + whereText(r) + " " + (r.memo || "")).indexOf(t) >= 0);
    });
    if (!rows.length) return '<p class="hint">' + (GM.gibo.length ? "조건에 맞는 기보가 없어요." : "아직 등록된 기보가 없어요.") + "</p>";
    return '<p class="count">' + rows.length + "개</p>" + '<div class="gm-rows">' + rows.map(function (r) {
      var open = GM.open === "g:" + r.id;
      return '<article class="gm-row' + (open ? " open" : "") + '"><button type="button" class="gm-head" data-act="open" data-id="g:' + r.id + '" aria-expanded="' + open + '">' +
        '<b>' + e(r.n) + "</b>" + '<span class="gm-meta">' + e(r.cat) + " · " + e(r.src) + "</span>" +
        '<span class="gm-where">' + e(whereText(r)) + "</span>" + '<span class="gm-st st-' + e(r.status || "미정") + '">' + e(r.status || "미정") + "</span></button>" +
        (open ? giboEditor(r) : "") + "</article>";
    }).join("") + "</div>";
  }

  function mapOpts(cur) {
    var groups = {}; maps().forEach(function (m) { (groups[kindOf(m)] = groups[kindOf(m)] || []).push(m); });
    return '<option value="">정하지 않음</option>' + ["지역", "문파", "명승", "세외"].map(function (k) {
      return groups[k] ? '<optgroup label="' + k + '">' + groups[k].map(function (m) { return '<option value="' + e(m.id) + '"' + (m.id === cur ? " selected" : "") + ">" + e(m.name) + "</option>"; }).join("") + "</optgroup>" : "";
    }).join("");
  }
  function zoneOpts(mapId, cur) {
    var m = mapById(mapId); if (!m) return '<option value="">—</option>';
    return '<option value="">지역 전체</option>' + m.zones.filter(function (z) { return !z.out; }).map(function (z) {
      return '<option value="' + e(z.id) + '"' + (z.id === cur ? " selected" : "") + ">" + e(z.n) + (z.dg ? " (던전)" : "") + "</option>";
    }).join("");
  }
  function npcOpts(cur) {
    return '<option value="">없음</option>' + GM.npc.map(function (n) { return '<option value="' + e(n.id) + '"' + (n.id === cur ? " selected" : "") + ">" + e(n.n) + (n.g ? " · " + e(n.g) : "") + "</option>"; }).join("");
  }
  function giboEditor(r) {
    var m = mapById(r.map);
    return '<form class="gm-ed" data-kind="gibo" data-id="' + e(r.id) + '">' +
      '<div class="gm-text"><p>' + e(r.e) + '</p>' + (r.d ? '<p class="hint">' + e(r.d) + "</p>" : "") + "</div>" +
      '<div class="gm-grid">' +
      '<div class="field"><label for="ed-st">상태</label><select id="ed-st" data-ed="status">' + STATUS.map(function (s) { return "<option" + (s === (r.status || "미정") ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="ed-map">지도</label><select id="ed-map" data-ed="map">' + mapOpts(r.map) + "</select></div>" +
      '<div class="field"><label for="ed-zone">구역</label><select id="ed-zone" data-ed="zone">' + zoneOpts(r.map, r.zone) + "</select></div>" +
      '<div class="field"><label for="ed-holder">소지 NPC</label><select id="ed-holder" data-ed="holder">' + npcOpts(r.holder) + "</select></div>" +
      '<div class="field"><label for="ed-pool">던전 묶음</label><input id="ed-pool" data-ed="pool" value="' + e(r.pool || "") + '" placeholder="예: 고분"></div>' +
      '<div class="field wide"><label for="ed-memo">메모</label><textarea id="ed-memo" data-ed="memo" rows="2" placeholder="단서, 지키는 자, 얻는 조건">' + e(r.memo || "") + "</textarea></div>" +
      "</div>" +
      '<div class="gm-actions"><button type="submit" class="btn small">저장</button>' + (m ? '<a class="btn small" href="' + mapHref(m) + '">강호도에서 보기</a>' : "") + '<span class="gm-saved" aria-live="polite">' + (GM.saved === r.id ? "저장했어요" : "") + '</span></div></form>';
  }

  function npcList() {
    var t = (GM.f.nq || "").trim();
    var rows = GM.npc.filter(function (n) { return !t || (n.n + " " + (n.g || "") + " " + (n.role || "")).indexOf(t) >= 0; });
    if (!rows.length) return '<p class="hint">' + (GM.npc.length ? "조건에 맞는 NPC가 없어요." : "아직 등록된 NPC가 없어요. NPC 추가를 눌러 만드세요.") + "</p>";
    return '<p class="count">' + rows.length + "명</p>" + '<div class="gm-rows">' + rows.map(function (n) {
      var open = GM.open === "n:" + n.id, m = mapById(n.map);
      var held = GM.gibo.filter(function (r) { return r.holder === n.id; }).map(function (r) { return r.n; });
      return '<article class="gm-row' + (open ? " open" : "") + '"><button type="button" class="gm-head" data-act="open" data-id="n:' + n.id + '" aria-expanded="' + open + '">' +
        "<b>" + e(n.n || "(이름 없음)") + "</b>" + '<span class="gm-meta">' + e(n.g || "") + (n.role ? " · " + e(n.role) : "") + (n.lv || n.grade ? ' <small class="gm-st">' + e([n.lv, n.grade].filter(Boolean).join(" ")) + (n.sheet ? " · 시트" : "") + "</small>" : "") + "</span>" +
        '<span class="gm-where">' + e(m ? m.name + (n.zone ? " · " + zoneName(m, n.zone) : "") : "떠돎") + "</span>" +
        '<span class="gm-st">' + (held.length ? e(held.join(" · ")) : "") + "</span></button>" + (open ? npcEditor(n) : "") + "</article>";
    }).join("") + "</div>";
  }
  /* ── NPC·에너미 시트 (룰북 '에너미'의 등급·위협도) ── */
  var GRADES = ["", "졸개", "무인", "두목", "이물"];
  var LV = ["삼류", "이류", "일류", "절정", "화경", "현경"];
  function threat(n) {
    var i = LV.indexOf(n.lv), base = i < 0 ? 0 : i + 1;
    if (n.grade === "졸개") return 0.5;
    if (n.grade === "무인") return base;
    if (n.grade === "두목") return base + 2;
    if (n.grade === "이물") return base + (Number(n.hp) >= 6 ? 1 : 0);
    return 0;
  }
  function sel2(id, k, list, cur, none) { return '<select id="' + id + '" data-ed="' + k + '">' + (none ? '<option value="">' + none + "</option>" : "") + list.filter(Boolean).map(function (v) { return "<option" + (v === cur ? " selected" : "") + ">" + e(v) + "</option>"; }).join("") + "</select>"; }
  function sheetStr(n) { return !n.sheet ? "" : typeof n.sheet === "string" ? n.sheet : JSON.stringify(n.sheet); }
  function sheetOf(n) {
    var c = null;
    try { c = !n.sheet ? null : typeof n.sheet === "string" ? JSON.parse(n.sheet) : JSON.parse(JSON.stringify(n.sheet)); } catch (x) { c = null; }
    if (c && !c.name) c.name = n.n || "";
    if (c && window.WX_NPC && WX_NPC.autoAtk) WX_NPC.autoAtk(c);
    return c;
  }
  /* 전투 시뮬에 NPC 시트를 건넨다(서고를 연 사람만) */
  window.WX_GM_NPCS = function () { return !DB ? [] : GM.npc.map(function (n) { return { id: n.id, n: n.n, lv: n.lv, grade: n.grade, c: sheetOf(n) }; }).filter(function (x) { return x.c; }); };
  function guessSchool(g) {
    var G = window.WX_NPC && WX_NPC.groups; if (!G || !g) return {};
    for (var k in G) { if (k === g) return { group: k }; for (var s in G[k].schools) if (s === g || s.indexOf(g) >= 0 || g.indexOf(s) >= 0) return { group: k, school: s }; }
    return {};
  }
  function npcEditor(n) {
    var m = mapById(n.map), sh = sheetOf(n), N = window.WX_NPC, t = threat(n);
    return '<form class="gm-ed" data-kind="npc" data-id="' + e(n.id) + '"><div class="gm-grid">' +
      '<div class="field"><label for="ed-n">이름</label><input id="ed-n" data-ed="n" value="' + e(n.n || "") + '"></div>' +
      '<div class="field"><label for="ed-g">소속</label><input id="ed-g" data-ed="g" value="' + e(n.g || "") + '"></div>' +
      '<div class="field"><label for="ed-role">역할</label><input id="ed-role" data-ed="role" value="' + e(n.role || "") + '"></div>' +
      '<div class="field"><label for="ed-map">지도</label><select id="ed-map" data-ed="map">' + mapOpts(n.map) + "</select></div>" +
      '<div class="field"><label for="ed-zone">구역</label><select id="ed-zone" data-ed="zone">' + zoneOpts(n.map, n.zone) + "</select></div>" +
      '<div class="field"><label for="ed-grade">등급</label>' + sel2("ed-grade", "grade", GRADES, n.grade, "정하지 않음") + "</div>" +
      '<div class="field"><label for="ed-lv">경지</label>' + sel2("ed-lv", "lv", LV, n.lv, "정하지 않음") + "</div>" +
      '<div class="field"><label for="ed-hp">추가 생명력 / 이물 생명력</label><input id="ed-hp" data-ed="hp" inputmode="numeric" value="' + e(n.hp || "") + '" placeholder="두목은 PC 수"></div>' +
      '<div class="field"><label for="ed-tn">고정 목표치 (졸개·이물)</label><input id="ed-tn" data-ed="tn" inputmode="numeric" value="' + e(n.tn || "") + '" placeholder="졸개 8·7·6 / 이물 6"></div>' +
      '<div class="field wide"><label for="ed-home">거처</label><input id="ed-home" data-ed="home" value="' + e(n.home || "") + '" placeholder="PC가 거처를 알아내면 공개할 내용"></div>' +
      '<div class="field wide"><label for="ed-secret">비밀</label><textarea id="ed-secret" data-ed="secret" rows="2" placeholder="PC가 비밀을 알아내면 공개할 내용">' + e(n.secret || "") + "</textarea></div>" +
      '<div class="field wide"><label for="ed-loot">전과</label><input id="ed-loot" data-ed="loot" value="' + e(n.loot || "") + '" placeholder="쓰러뜨리면 얻는 것: 보급품·엽전·기보·경험치"></div>' +
      '<div class="field wide"><label for="ed-memo">메모</label><textarea id="ed-memo" data-ed="memo" rows="3" placeholder="성격, 목적, 관계, 진상">' + e(n.memo || "") + "</textarea></div>" +
      '<input type="hidden" data-ed="sheet" value="' + e(sheetStr(n)) + '">' +
      '</div><p class="hint">위협도 ' + (t ? "<b>" + t + "</b>" : "—") + " · 소지 기보는 기보 탭에서 \"소지 NPC\"로 정해요.</p>" +
      '<div class="gm-sheet"><div class="gm-sheet-h"><span class="lbl">무공 시트 (무인·두목)</span>' +
      (N ? '<button type="button" class="btn small" data-act="npc-roll" data-id="' + e(n.id) + '">주사위로 만들기</button>' : "") +
      '<button type="button" class="btn small" data-act="npc-paste" data-id="' + e(n.id) + '">인물지 코드 붙여넣기</button>' +
      (sh && N ? '<button type="button" class="btn small" data-act="npc-open" data-id="' + e(n.id) + '">인물지에서 고치기</button><button type="button" class="btn small gm-del" data-act="npc-unsheet" data-id="' + e(n.id) + '">시트 지우기</button>' : "") + "</div>" +
      '<div class="io" data-paste="' + e(n.id) + '" hidden><textarea aria-label="인물지 캐릭터 코드" placeholder="인물지에서 \'캐릭터 코드 복사\'로 복사한 코드를 붙여넣으세요"></textarea><div><button type="button" class="btn small primary" data-act="npc-paste-ok" data-id="' + e(n.id) + '">넣기</button></div></div>' +
      (sh && N ? '<div class="sheet gm-npc-sheet">' + N.head(sh) + N.body(sh) + "</div>" : '<p class="hint">인물지와 같은 시트를 붙일 수 있어요. 경지·소속에 맞춰 주사위로 만들거나, 인물지에서 만든 캐릭터 코드를 붙여넣으세요. 고친 뒤에는 저장을 누르세요.</p>') + "</div>" +
      '<div class="gm-actions"><button type="submit" class="btn small">저장</button>' + (m ? '<a class="btn small" href="' + mapHref(m) + '">강호도에서 보기</a>' : "") +
      '<button type="button" class="btn small gm-del" data-act="npc-del" data-id="' + e(n.id) + '">삭제</button><span class="gm-saved" aria-live="polite">' + (GM.saved === n.id ? "저장했어요" : "") + '</span></div></form>';
  }
  function setSheet(id, c) {
    var form = document.querySelector('form.gm-ed[data-id="' + id + '"]'); if (!form) return;
    var h = form.querySelector('[data-ed="sheet"]'); h.value = c ? JSON.stringify(c) : "";
    var n = npcById(id); if (n) n.sheet = h.value;
    var saved = q(".gm-saved", form); if (saved) saved.textContent = "시트를 바꿨어요. 저장을 누르세요.";
    var keep = {}; [].forEach.call(form.querySelectorAll("[data-ed]"), function (el) { keep[el.dataset.ed] = el.value; });
    Object.assign(n, keep); drawList();
    var s2 = q(".gm-saved", document.querySelector('form.gm-ed[data-id="' + id + '"]')); if (s2) s2.textContent = "시트를 바꿨어요. 저장을 누르세요.";
  }

  function dungeonList() {
    var out = [];
    maps().forEach(function (m) { m.zones.forEach(function (z) {
      if (!z.dg) return;
      var items = GM.gibo.filter(function (r) { return r.map === m.id && r.zone === z.id; });
      var npcs = GM.npc.filter(function (n) { return n.map === m.id && n.zone === z.id; });
      out.push('<article class="gm-dg"><div><b>' + e(z.n) + '</b> <span class="gm-meta">' + e(m.name) + " · " + e(z.dg) + "</span></div>" +
        '<p class="hint">' + e(z.e || "") + "</p>" +
        '<p><span class="lbl">보상</span> ' + (items.length ? items.map(function (r) { return e(r.n) + ' <small class="gm-st st-' + e(r.status || "미정") + '">' + e(r.status || "미정") + "</small>"; }).join(" · ") : '<span class="hint">아직 없음</span>') + "</p>" +
        (npcs.length ? '<p><span class="lbl">지키는 자</span> ' + npcs.map(function (n) { return e(n.n); }).join(" · ") + "</p>" : "") +
        '<a class="btn small" href="' + mapHref(m) + '">강호도에서 보기</a></article>');
    }); });
    return '<div class="gm-dgs">' + out.join("") + "</div>";
  }

  var confirmDel = "";
  function onClick(ev) {
    var b = ev.target.closest("[data-act]"); if (!b) return;
    var act = b.dataset.act;
    if (act === "open") { GM.open = GM.open === b.dataset.id ? "" : b.dataset.id; confirmDel = ""; GM.saved = ""; drawList(); return; }
    if (act === "npc-add") {
      if (!DB) return;
      var ref = DB.collection(COL_N).doc("n" + Date.now().toString(36));
      b.disabled = true;
      ref.set({ n: "새 NPC", g: "", role: "", map: "", zone: "", memo: "" }).then(function () { GM.open = "n:" + ref.id; drawList(); })
        .catch(function (err) { alert0(b, "추가하지 못했어요 (" + (err && err.code || "오류") + ")"); }).then(function () { b.disabled = false; });
      return;
    }
    if (act === "npc-roll") {
      var n0 = npcById(b.dataset.id), f0 = b.closest("form"); if (!n0 || !window.WX_NPC) return;
      var lv = f0.querySelector('[data-ed="lv"]').value || "삼류", gs = guessSchool(f0.querySelector('[data-ed="g"]').value);
      var c = WX_NPC.roll({ lv: lv, group: gs.group, school: gs.school });
      c.name = f0.querySelector('[data-ed="n"]').value || c.name; c.notes = "";
      setSheet(n0.id, c); return;
    }
    if (act === "npc-paste") { var io = document.querySelector('[data-paste="' + b.dataset.id + '"]'); if (io) { io.hidden = !io.hidden; if (!io.hidden) q("textarea", io).focus(); } return; }
    if (act === "npc-paste-ok") {
      var io2 = document.querySelector('[data-paste="' + b.dataset.id + '"]');
      try { var c2 = JSON.parse(q("textarea", io2).value); if (!c2 || !c2.lv) throw 0; delete c2.pub; setSheet(b.dataset.id, c2); }
      catch (x) { alert0(b, "코드를 읽지 못했어요. 인물지의 캐릭터 코드 전체를 붙여넣었는지 확인하세요"); }
      return;
    }
    if (act === "npc-unsheet") { setSheet(b.dataset.id, null); return; }
    if (act === "npc-open") { var n3 = npcById(b.dataset.id), c3 = n3 && sheetOf(n3); if (c3 && window.WX_NPC) WX_NPC.toBuilder(c3); return; }
    if (act === "npc-del") {
      var id = b.dataset.id;
      if (confirmDel !== id) { confirmDel = id; b.textContent = "한 번 더 누르면 삭제"; return; }
      DB.collection(COL_N).doc(id).delete().then(function () { GM.open = ""; confirmDel = ""; })
        .catch(function (err) { alert0(b, "삭제하지 못했어요 (" + (err && err.code || "오류") + ")"); });
    }
  }
  function alert0(el, msg) { var s = el.closest("form") ? q(".gm-saved", el.closest("form")) : null; if (s) s.textContent = msg; else if (window.toast) toast(msg); }
  function onSubmit(ev) {
    var form = ev.target.closest("form.gm-ed"); if (!form) return;
    ev.preventDefault();
    if (!DB) return;
    var data = {};
    [].forEach.call(form.querySelectorAll("[data-ed]"), function (el) { data[el.dataset.ed] = el.value; });
    var col = form.dataset.kind === "npc" ? COL_N : COL_G, btn = q("button[type=submit]", form), saved = q(".gm-saved", form);
    btn.disabled = true; saved.textContent = "저장하는 중…"; GM.saved = "";
    DB.collection(col).doc(form.dataset.id).update(data).then(function () { GM.saved = form.dataset.id; var s2 = q(".gm-saved", document.querySelector('form.gm-ed[data-id="' + form.dataset.id + '"]') || form); if (s2) s2.textContent = "저장했어요"; })
      .catch(function (err) { saved.textContent = "저장하지 못했어요 (" + (err && err.code || "오류") + ")"; }).then(function () { btn.disabled = false; });
  }
})();
