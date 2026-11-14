/* 전투판(戰鬪板) 2판: 여럿이 함께 쓰는 실시간 6×6 전투판. 강호도 → 전투판. 룰북 '전투'의 차례를 따른다.
   라운드: 공력 정하기(plot) → 공개 → 이동(move, 공력 높은 순) → 턴(act, 공력 높은 순·같은 공력은 동시행동) → 라운드 끝(end)
   방 = Firestore rooms/<id>: { n, gm, gmName, mem[], rows[6], set, ter: 전장, round, phase, cur: 지금 공력, pre: 선제 공격, tk: {말}, pd: [회피 대기], log, rev: {드러난 함정}, tmp: [기한 있는 칸], mkL, mkN, memo }
   말 = { n, o, on, s: "A"|"B", x, y, life[6] | hp, ex, g, gs, used, mv, dn: 이 단계 마침, atk: 공격함, stun: 주화입마, sts: [상태이상], dq: [받을 대미지], out: 탈락·도주·사망, dth: 사망 공격, mk, ks, pm, st, c: 시트, cid, nid, tv, px, py, pmv }
   계산은 tac.js(WX_TAC)를 시뮬과 같이 쓴다. 오의는 문서에 넣지 않고 주인·GM의 화면에서만 읽는다. */
(function () {
  "use strict";
  var N = 6, C = 150, LIFE = ["병기", "외공", "내공", "강호", "지략", "술법"], TERS = ["평지", "고소", "수중", "악천후", "악지", "극지"];
  var STS = ["고장", "마비", "외상", "행방불명", "망각", "내상", "한기", "빙결"], CURE = { "고장": "도구", "마비": "단련", "외상": "의술", "행방불명": "추적", "망각": "섭혼", "내상": "운기", "한기": "양기", "빙결": "양기" };
  var DB = null, ME = { id: "", gm: false, name: "" }, RID = "", R = null, LIST = [], unR = null, unL = null, view = null, tries = 0, sideWait = false;
  var SEL = "", MODE = null, ADV = 0, MOD = 0, FREE = false, MULTI = false, SECRET = false, INFO = "";
  function A() { return window.WX_SIM_API; }
  function F() { return window.WX_FIELD; }
  function T() { return window.WX_TAC; }
  function e(s) { return A().esc(s == null ? "" : String(s)); }
  function FV() { return window.firebase && firebase.firestore && firebase.firestore.FieldValue; }
  function toast(m) { A().toast(m); }
  function isGm() { return !!R && !!ME.id && (R.gm === ME.id || ME.gm); }
  function member() { return !!R && !!ME.id && (isGm() || !R.mem || R.mem.indexOf(ME.id) >= 0); }
  function ctrl(t) { return !!t && member() && (isGm() || t.o === ME.id); }
  function toks() { return R && R.tk ? Object.keys(R.tk).map(function (id) { return Object.assign({ id: id }, R.tk[id]); }) : []; }
  function tok(id) { return R && R.tk && R.tk[id] ? Object.assign({ id: id }, R.tk[id]) : null; }
  function ref() { return DB.collection("rooms").doc(RID); }
  function up(o) { return ref().update(o).catch(function (err) { toast("반영하지 못했어요 (" + (err && err.code || "오류") + ")"); }); }
  function who() { var t = tok(SEL); return (t && ctrl(t) ? t.n : ME.name) || "협객"; }
  function ent(m, k, w) { return { i: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), w: w || who(), m: m, k: k || "" }; }
  function say(m, k, extra, w) { var o = extra || {}, en = ent(m, k, w); o.log = FV() ? FV().arrayUnion(en) : (R.log || []).concat([en]).slice(-250); return up(o); }
  function U(id, o, into) { var u = into || {}; Object.keys(o).forEach(function (k) { u["tk." + id + "." + k] = o[k]; }); return u; }
  function lifeLeft(t) { return t.life ? t.life.filter(Boolean).length + (t.ex || 0) : (t.hp || 0); }
  function alive(t) { return !t.out && (lifeLeft(t) > 0 || !!t.dth); }
  function lostOf(t) { return t.life ? LIFE.filter(function (n, i) { return !t.life[i]; }) : []; }
  function bare(n) { return String(n || "").replace(/\s*\([^)]*\)\s*$/, ""); }
  function grid() { return F().parse(R.rows).g; }
  function at(x, y) { return toks().filter(function (t) { return !t.out && t.x === x && t.y === y; })[0]; }
  function setCell(x, y, ch) { return R.rows.map(function (r, i) { return i === y ? r.slice(0, x) + ch + r.slice(x + 1) : r; }); }
  function stunLine(t) { return (t.g || 0) + (R.ter === "악지" ? 1 : 0); }
  function wet(t) { return R.ter === "수중" || grid()[t.y][t.x] === "w"; }
  function TN(t, sk) { if (t.tv) return t.tv; if (!t.c || !sk || sk === "—") return 0; var para = (t.sts || []).indexOf("마비") >= 0 ? t.para : null; return T().tn(t.c, sk, lostOf(t), para); }

  /* ── 주사위 ── */
  function d6() { return 1 + Math.floor(Math.random() * 6); }
  /* 판정. 유리·불리·수정치는 한 번 쓰면 보통으로 돌아간다. tv 0 = 모름, 99 = 못 함. line = 주화입마 선 */
  function judge(tv, line, mob, flat, adv0) {
    var adv = ADV + (adv0 || 0), fl = MOD + (flat || 0), n = 2 + Math.min(4, Math.abs(adv)), all = [], i; ADV = 0; MOD = 0;
    if (tv >= 99) return { ok: false, txt: "판정할 수 없다(잃은 분야·익히지 않은 특기)", none: true };
    for (i = 0; i < n; i++) all.push(d6());
    var s = all.slice().sort(function (a, b) { return adv < 0 ? a - b : b - a; }), raw = s[0] + s[1], sum = raw + fl, sp = s[0] === 6 && s[1] === 6, ok = null, stun = false;
    var txt = "2D6" + (adv ? (adv > 0 ? " 유리점 " : " 불리점 ") + Math.abs(adv) + " [" + all.join(",") + "]" : "") + " → " + s[0] + "+" + s[1] + (fl ? (fl > 0 ? "+" : "") + fl : "") + "=" + sum;
    if (sp) { ok = true; txt += " 스페셜!"; }
    else if (line && sum < line) { ok = false; stun = !mob; txt += " (공력 " + line + " 미만) " + (mob ? "실패" : "주화입마!"); }
    else if (tv) { ok = sum >= tv; txt += " (목표 " + tv + ") " + (ok ? "성공" : "실패"); }
    else txt += " (목표치를 몰라 성패는 직접 판단)";
    return { ok: ok, txt: txt, sp: sp, stun: stun };
  }

  /* ── 차례 ── */
  function nextCur(list, below) { var m = 0; list.forEach(function (t) { if (alive(t) && t.g && t.g < below && t.g > m) m = t.g; }); return m; }
  /* 지금 공력의 말이 모두 마쳤으면 다음으로 넘긴다. list = 바뀐 뒤의 말들. 돌려주는 값: 덧붙일 갱신과 기록 */
  function advance(list, u) {
    u = u || {}; var ph = R.phase, cur = R.cur || 0, notes = [];
    if (ph !== "move" && ph !== "act") return { u: u, notes: notes };
    for (var guard = 0; guard < 14; guard++) {
      if (list.some(function (t) { return alive(t) && t.g === cur && !t.dn; })) break;
      var nx = nextCur(list, cur);
      if (nx) { cur = nx; continue; }
      if (ph === "move") { ph = "act"; cur = nextCur(list, 7); list.forEach(function (t) { t.dn = false; U(t.id, { dn: false }, u); }); notes.push("이동이 끝났습니다. 턴을 시작합니다."); if (!cur) { ph = "end"; break; } continue; }
      ph = "end"; cur = 0; notes.push("모든 턴이 끝났습니다. GM이 라운드를 마칩니다."); break;
    }
    if (ph !== R.phase) u.phase = ph; if (cur !== (R.cur || 0)) u.cur = cur;
    return { u: u, notes: notes };
  }
  function myTurn(t) { return alive(t) && (R.phase === "move" || R.phase === "act") && t.g === R.cur && !t.dn; }
  function dqReady(it) { return !(it.sim && R.phase === "act" && it.r === R.round && it.g === R.cur); }

  /* ── 무공 ── */
  function skillsOf(t) {
    var out = [{ n: "접근전 공격", t: "공격", r: "1", c: "0", sk: (t.c && t.c.atk) || "", e: "접근전 1점." }];
    if (t.c) (t.c.mg || []).forEach(function (n) { var r = A().find(n); if (r && r.n) out.push(r); });
    return out;
  }
  function ougiOf(t) {
    var c = null;
    if (t.cid && t.o === ME.id) c = pcList().filter(function (x) { return x.id === t.cid; })[0];
    if (!c && t.nid && window.WX_GM_NPCS) { var n = WX_GM_NPCS().filter(function (x) { return x.id === t.nid; })[0]; c = n && n.c; }
    return (c && c.ougi || []).filter(function (o) { return o && o.name; });
  }
  function rangeTo(t, r, b) { var v = T().range(r.r); if (v < 0) return -1; if (r.t === "공격" && R.ter === "악천후") v = Math.max(1, v - 1); if (/사격전/.test(r.e || "") && b) v += T().elev(grid(), t, b); return v; }
  function whyNot(t, r, b) {
    var rg = rangeTo(t, r, b), d = T().dist(t, b);
    if (rg < 0) return "대상을 고르지 않는 무공이에요";
    if (d > rg) return "간격 " + rg + "인데 " + d + "칸 떨어져 있어요(대각선은 1.5칸)";
    if (r.t === "공격" && !T().los(grid(), t, b)) return "장애물에 가려 공격 무공의 대상으로 고를 수 없어요";
    return "";
  }
  function dmgOf(r, sp) { var m = /(접근전|사격전)[^0-9집]{0,8}(\d+)\s*점/.exec(r.e || ""); if (m) return { ty: m[1], n: +m[2] + (sp ? 1 : 0) }; if (/집단전/.test(r.e || "")) return { ty: "집단전", n: 1 }; return null; }
  function useSkill(t, r, targets) {
    var cost = parseInt(r.c, 10) || 0, left = (t.g || 0) - (t.used || 0), pre = !!R.pre && R.phase === "plot";
    if (!FREE && !pre) {
      if (R.phase !== "act") { toast(R.phase === "move" ? "아직 이동 단계예요. 무공은 턴에 씁니다" : "공력을 공개한 뒤에 쓸 수 있어요"); return; }
      if (!myTurn(t)) { toast("지금은 공력 " + R.cur + "의 차례예요"); return; }
      if (r.t === "공격" && t.atk) { toast("공격 무공은 턴에 하나예요. 한 번 더 치는 효과라면 '제한 풀기'를 켜세요"); return; }
      if (cost > left) { toast("남은 코스트(" + Math.max(0, left) + ")가 모자라요"); return; }
    }
    if (t.stun) { toast("주화입마라 이번 라운드에는 판정할 수 없어요"); return; }
    var sk = r.sk && r.sk !== "—" ? r.sk : "", g = grid(), cover = targets.length === 1 && /사격전/.test(r.e || "") && g[targets[0].y][targets[0].x] === "c";
    var j = sk || t.tv ? judge(TN(t, sk), pre ? 0 : stunLine(t), !t.c, 0, cover ? -1 : 0) : { ok: true, txt: "" };
    var dm = r.t === "공격" ? dmgOf(r, j.sp) : null, u = U(t.id, { used: (t.used || 0) + (FREE || pre ? 0 : cost) }), pd = (R.pd || []).slice();
    var msg = "【" + bare(r.n) + "】" + (targets.length ? " → " + targets.map(function (b) { return b.n; }).join(", ") : "") + (cover ? " (엄폐: 불리점 1)" : "") + (sk ? " 《" + sk + "》 " + j.txt : j.txt ? " " + j.txt : "");
    if (r.t === "공격") { u["tk." + t.id + ".atk"] = true; if (t.dth) u["tk." + t.id + ".out"] = "사망"; }
    if (j.stun) u["tk." + t.id + ".stun"] = true;
    if (j.ok === false && !j.none && wet(t) && t.c) { u["tk." + t.id + ".dq"] = (t.dq || []).concat([{ ty: "접근전", n: 1, mn: "수중", r: R.round, g: R.cur }]); msg += " — 물에 휩쓸려 접근전 1점"; }
    if (j.ok !== false && targets.length && (r.t === "공격" || /회피/.test(r.e || ""))) {
      var sim = toks().filter(function (k) { return alive(k) && k.g === t.g; }).length > 1;
      targets.forEach(function (b) { pd.push({ i: Math.random().toString(36).slice(2, 8), a: t.id, b: b.id, sk: sk, mn: bare(r.n), e: r.e || "", dm: dm, g: R.cur || 0, r: R.round, sim: sim }); });
      u.pd = pd; if (j.sp && dm && dm.ty !== "집단전") msg += " (스페셜: 대미지 +1)";
    } else if (j.ok !== false && r.e) msg += " — " + r.e;
    MODE = null; say(msg, j.ok === false ? "bad" : "act", u, t.n);
  }

  /* ── 그리기 ── */
  function shown() { var g = grid(); if (!isGm()) for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (g[y][x] === "T" && !(R.rev || {})[x + "_" + y]) g[y][x] = "."; return g; }
  function boardSvg() {
    var f = F(), m = f.parse(R.rows), set = f.setOf(R.set), t = tok(SEL), o = "", mv = MODE && MODE.type === "move", b = null;
    m.g = shown();
    var s = f.svg(m, set, { marks: R.round === 1 && R.phase === "plot" });
    if (t && mv) b = FREE ? null : T().reach(grid(), t, Math.max(0, (t.g || 0) - (t.mv || 0)), { occ: function (x, y) { var k = at(x, y); return !!k && k.id !== t.id; } });
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var here = at(x, y);
      if (t && mv && !here) { var ok = FREE ? (!T().BLOCK[m.g[y][x]] || isGm()) : b[x + "," + y] != null; if (ok) o += '<rect x="' + (x * C + 6) + '" y="' + (y * C + 6) + '" width="' + (C - 12) + '" height="' + (C - 12) + '" rx="10" fill="#3f9b6a" fill-opacity=".28" stroke="#2c7a51" stroke-width="5" pointer-events="none"/>' + (b ? '<text x="' + (x * C + C - 16) + '" y="' + (y * C + 30) + '" text-anchor="end" font-size="24" fill="#1d5a3a" pointer-events="none">' + b[x + "," + y] + "</text>" : ""); }
      if (MODE && MODE.type === "edit") o += '<rect x="' + (x * C + 3) + '" y="' + (y * C + 3) + '" width="' + (C - 6) + '" height="' + (C - 6) + '" fill="none" stroke="#6d6aa8" stroke-width="3" stroke-dasharray="8 8" pointer-events="none"/>';
    }
    toks().forEach(function (k) {
      if (k.out) return;
      var cx = k.x * C + C / 2, cy = k.y * C + C / 2, col = k.s === "B" ? "#a8322d" : "#2f5d8a", sel = k.id === SEL, down = !alive(k), tg = false, note = "", picked = MODE && MODE.tg && MODE.tg.indexOf(k.id) >= 0;
      if (t && MODE && MODE.type === "skill" && k.id !== t.id) { tg = !whyNot(t, MODE.r, k); var ev = /사격전/.test(MODE.r.e || "") ? T().elev(grid(), t, k) : 0; note = ev > 0 ? "+1 고지" : ev < 0 ? "−1 분지" : ""; }
      o += '<g pointer-events="none" opacity="' + (down ? ".45" : "1") + '">' + (tg ? '<circle cx="' + cx + '" cy="' + cy + '" r="68" fill="' + (picked ? "#e0a800" : "none") + '" fill-opacity=".35" stroke="#e0a800" stroke-width="9" stroke-dasharray="14 8"/>' : "") +
        (myTurn(k) ? '<circle cx="' + cx + '" cy="' + cy + '" r="62" fill="none" stroke="#fff" stroke-width="5"/><circle cx="' + cx + '" cy="' + cy + '" r="62" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-dasharray="6 6"/>' : "") +
        '<circle cx="' + cx + '" cy="' + cy + '" r="54" fill="' + col + '" stroke="' + (sel ? "#fff" : "#1a1a1a") + '" stroke-width="' + (sel ? 9 : 4) + '"/>' +
        '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" font-size="' + (String(k.n).length > 3 ? 26 : 34) + '" font-weight="700" fill="#fff">' + e(String(k.n).slice(0, 4)) + "</text>" +
        '<text x="' + cx + '" y="' + (cy + 34) + '" text-anchor="middle" font-size="22" fill="#fff">' + (down ? "쓰러짐" : "♥" + lifeLeft(k) + (k.stun ? " 주화" : "")) + "</text>" +
        (k.g && R.phase !== "plot" ? '<circle cx="' + (cx + 44) + '" cy="' + (cy - 44) + '" r="22" fill="#f4eede" stroke="#1a1a1a" stroke-width="3"/><text x="' + (cx + 44) + '" y="' + (cy - 34) + '" text-anchor="middle" font-size="28" font-weight="700" fill="#1a1a1a">' + k.g + "</text>" : "") +
        (R.phase === "plot" && k.gs ? '<circle cx="' + (cx + 44) + '" cy="' + (cy - 44) + '" r="20" fill="#3f9b6a" stroke="#1a1a1a" stroke-width="3"/><text x="' + (cx + 44) + '" y="' + (cy - 36) + '" text-anchor="middle" font-size="22" fill="#fff">정</text>' : "") +
        ((k.sts || []).length ? '<text x="' + cx + '" y="' + (cy - 60) + '" text-anchor="middle" font-size="20" font-weight="700" fill="#fff" stroke="#1a1a1a" stroke-width="4" paint-order="stroke">' + e(k.sts.join("·")) + "</text>" : "") +
        (note ? '<text x="' + cx + '" y="' + (cy + 74) + '" text-anchor="middle" font-size="20" font-weight="700" fill="#fff" stroke="#1a1a1a" stroke-width="4" paint-order="stroke">' + note + "</text>" : "") + "</g>";
    });
    return s.replace("</svg>", o + "</svg>");
  }
  /* 이번 라운드 상태(무공 조건 셈용): 옮긴 칸, 맞음, 맞힌 대상, 기세·표식 */
  function rstate(k) {
    var o = [];
    if (k.mc) o.push("이동 " + k.mc + "칸");
    if (k.rh) o.push("맞음(" + k.rh + ")");
    if (k.rt && k.rt.length) o.push("맞힘 " + k.rt.join("·"));
    if (k.ks) o.push("기세 " + k.ks);
    if (k.pm) o.push("표식 " + k.pm);
    return o.length ? " · " + o.join(" · ") : "";
  }
  function opt(list, cur, labels) { return list.map(function (v, i) { return '<option value="' + e(v) + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + e(labels ? labels[i] : v) + "</option>"; }).join(""); }
  function guide() {
    if (!ME.id) return "구경 중입니다. 구글로 로그인하면 참가할 수 있어요.";
    if (!member()) return "이 판에 아직 참가하지 않았습니다. 오른쪽 '참가하기'를 누르세요.";
    var mine = toks().filter(function (t) { return ctrl(t) && alive(t) && (!isGm() || t.o === ME.id); }), ph = R.phase;
    var dod = (R.pd || []).filter(function (p) { var b = tok(p.b); return b && ctrl(b); })[0];
    if (dod) return (tok(dod.b) || {}).n + ": 회피를 굴릴 차례입니다(판 아래 상자).";
    var hurt = toks().filter(function (t) { return ctrl(t) && (t.dq || []).some(dqReady); })[0];
    if (hurt) return hurt.n + ": 받을 대미지가 있습니다(판 아래 상자).";
    if (ph === "plot") { var no = mine.filter(function (t) { return !t.gs; }); return no.length ? no.map(function (t) { return t.n; }).join(", ") + ": 공력을 정하세요(말을 누르고 1~6)." + (R.pre ? " 지금은 선제 공격을 할 수 있습니다." : "") : isGm() ? "모두 공력을 정했으면 '공력 공개'를 누르세요." : "공력을 정했습니다. GM이 공개하기를 기다립니다."; }
    if (ph === "end") return isGm() ? "모든 턴이 끝났습니다. '라운드 종료'를 누르세요." : "모든 턴이 끝났습니다. GM이 라운드를 마칩니다.";
    var now = toks().filter(myTurn), me2 = now.filter(function (t) { return ctrl(t); });
    var names = now.map(function (t) { return t.n; }).join(", ") + (now.length > 1 ? " (동시행동)" : "");
    if (ph === "move") return "이동 단계 · 공력 " + R.cur + " — " + names + (me2.length ? ". 말을 누르고 '이동' → 초록 칸. 다 움직였으면 '이동 마침'." : "의 이동을 기다립니다.");
    return "턴 · 공력 " + R.cur + " — " + names + (me2.length ? ". 무공을 고르고 대상을 누르세요. 끝나면 '턴 마침'." : "의 턴입니다.");
  }
  function alertHtml() {
    var h = "";
    (R.pd || []).forEach(function (p) {
      var a = tok(p.a), b = tok(p.b); if (!b) return;
      var tv = TN(b, p.sk), can = ctrl(b);
      h += '<div class="bd-box bd-pend"><b>회피</b> ' + e((a ? a.n : "?") + " → " + b.n) + " 【" + e(p.mn) + "】" + (p.dm ? " " + e(p.dm.ty + (p.dm.ty === "집단전" ? "" : " " + p.dm.n + "점")) : "") + '<span class="hint"> ' + e(p.e) + "</span>" +
        (can ? '<div class="sheet-actions">' + (b.stun ? '<span class="hint">주화입마라 회피할 수 없어요.</span>' : '<button class="btn small primary" data-b="dodge" data-i="' + p.i + '">회피 굴리기' + (p.sk ? " 《" + e(p.sk) + "》" + (tv && tv < 99 ? " 목표 " + tv : tv >= 99 ? " 판정 불가" : "") : "") + (R.ter === "고소" ? " (고소 −2)" : "") + '</button><button class="btn small" data-b="flee" data-i="' + p.i + '">도주(《신법》)</button>') + '<button class="btn small" data-b="nododge" data-i="' + p.i + '">그냥 맞기</button>' + (isGm() ? '<button class="btn small" data-b="pdx" data-i="' + p.i + '">없던 일로</button>' : "") + "</div>" : '<span class="hint"> 상대가 회피를 굴립니다.</span>') + "</div>";
    });
    toks().forEach(function (t) {
      if (!ctrl(t)) return;
      var it = (t.dq || [])[0];
      if (it && !t.out) {
        h += '<div class="bd-box bd-pend" data-tid="' + e(t.id) + '"><b>' + e(t.n) + '</b> 받을 대미지: ' + e(it.ty + (it.ty === "집단전" ? "" : " " + it.n + "점")) + (it.mn ? " 【" + e(it.mn) + "】" : "") + ((t.dq || []).length > 1 ? ' <span class="hint">+' + (t.dq.length - 1) + "건 더</span>" : "");
        if (!dqReady(it)) h += '<p class="hint">동시행동이라 공력 ' + it.g + "의 턴이 모두 끝나면 적용합니다.</p>";
        else if (it.ty === "집단전") h += '<div class="sheet-actions"><button class="btn small primary" data-b="dq-st">상태이상표 굴리기</button>';
        else if (!t.life) h += '<div class="sheet-actions"><button class="btn small primary" data-b="dq-hp">받기(생명력 −' + it.n + ")</button>";
        else if (it.ty === "접근전") h += '<div class="sheet-actions"><button class="btn small primary" data-b="dq-roll">분야 굴리기(1D6' + (it.n > 1 ? " × " + it.n : "") + ")</button>";
        else h += '<p class="hint">잃을 분야를 ' + it.n + '개 고르세요.</p><div class="bd-life">' + LIFE.map(function (n, i) { return t.life[i] ? '<button class="chip on" data-b="dq-pick" data-i="' + i + '">' + n + "</button>" : ""; }).join("") + (t.ex ? '<button class="chip on" data-b="dq-pick" data-i="-1">추가 생명력</button>' : "") + '</div><div class="sheet-actions">';
        if (dqReady(it)) h += '<button class="btn small" data-b="dq-less">1점 줄이기(경감)</button><button class="btn small" data-b="dq-x">받지 않음</button></div>';
        h += "</div>";
      }
      if (!t.out && lifeLeft(t) <= 0 && !t.dth && !(t.dq || []).length) h += '<div class="bd-box bd-pend" data-tid="' + e(t.id) + '"><b>' + e(t.n) + '</b> 생명력이 0이 되었습니다.<div class="sheet-actions"><button class="btn small primary" data-b="out">탈락</button>' + (t.c ? '<button class="btn small" data-b="dth">사망 공격 선언</button>' : "") + (isGm() ? '<button class="btn small danger" data-b="black">숨통 끊기 선언 → 흑관문 1D6</button>' : "") + '</div><p class="hint">흑관문은 쓰러뜨린 쪽이 숨통 끊기를 선언했을 때만 굴립니다. 사망 공격은 공격을 한 번 하고 사망합니다(보조 무공 코스트 0).</p></div>';
    });
    return h;
  }
  function sideHtml() {
    var f = F(), gm = isGm(), mem = member(), list = toks(), t = tok(SEL), h = "", ph = R.phase, plot = ph === "plot";
    var phn = { plot: "공력 정하기", move: "이동 · 공력 " + R.cur, act: "턴 · 공력 " + R.cur, end: "라운드 끝" }[ph];
    h += '<div class="bd-box"><div><b>' + e(R.n) + "</b> · " + R.round + "라운드 · " + phn + " · 전장 " + e(R.ter || "평지") + "</div>" + '<div class="hint">GM ' + e(R.gmName || "") + " · 마기 " + (R.mkN || 0) + " / 한계 " + (R.mkL || "–") + "</div>" +
      (ME.id && !mem ? '<div class="sheet-actions"><button class="btn small primary" data-b="join">참가하기</button></div>' : "") +
      (gm ? '<div class="sheet-actions">' + (plot ? '<button class="btn small primary" data-b="reveal">공력 공개</button>' : "") + (ph === "move" || ph === "act" ? '<button class="btn small" data-b="skip">공력 ' + R.cur + " 전부 마침</button>" : "") + (!plot ? '<button class="btn small' + (ph === "end" ? " primary" : "") + '" data-b="next">라운드 종료</button>' : "") + "</div>" : "") + "</div>";
    if (gm) {
      var set = f.setOf(R.set);
      h += '<details class="bd-box" data-keep="gm"><summary><b>GM 도구</b></summary>' +
        '<div class="gm-bar"><label class="hint">전장 <select data-f="ter">' + opt(TERS, R.ter || "평지") + '</select></label><button class="btn small" data-b="terroll">전장표 굴리기</button><label class="hint"><input type="checkbox" data-f="pre"' + (R.pre ? " checked" : "") + "> 선제 공격 허용(기습·매복)</label></div>" +
        '<div class="gm-bar"><span class="hint">졸개 공력 한꺼번에</span>' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<button class="chip" data-mobg="' + n + '">' + n + "</button>"; }).join("") + "</div>" +
        '<div class="gm-bar"><span class="hint">마기</span><button class="btn small" data-b="mkn-">−</button>' + (R.mkN || 0) + '<button class="btn small" data-b="mkn+">+</button><span class="hint">한계</span><button class="btn small" data-b="mkl-">−</button>' + (R.mkL || 0) + '<button class="btn small" data-b="mkl+">+</button><button class="btn small" data-b="mklroll">1D4+1</button></div>' +
        '<div class="gm-bar"><select data-f="set" aria-label="묶음">' + opt(f.sets.map(function (s) { return s.id; }), R.set, f.sets.map(function (s) { return s.n; })) + '</select><select data-f="map" aria-label="맵"><option value="">맵 고르기</option>' + opt(set.maps.map(function (m, i) { return i; }), "", set.maps.map(function (m) { return m.n; })) + '</select><button class="btn small" data-b="genmap">무작위 맵</button></div>' +
        '<div class="gm-bar"><button class="btn small' + (MODE && MODE.type === "edit" ? " primary" : "") + '" data-b="edit">칸 고치기</button>' + (MODE && MODE.type === "edit" ? '<select data-f="brush" aria-label="붓">' + opt(Object.keys(f.terr), MODE.brush, Object.keys(f.terr).map(function (k) { return f.terr[k][0]; })) + '</select><label class="hint"><input type="checkbox" data-f="temp"' + (MODE.temp ? " checked" : "") + "> 다음 라운드 끝까지만</label>" : "") + "</div>" +
        (MODE && MODE.type === "edit" ? '<p class="hint">붓을 고르고 판의 칸을 누르세요. 무공이 만든 수면·벽·위험지는 \'다음 라운드 끝까지만\'을 켜면 저절로 사라집니다. 함정은 참가자에게 보이지 않다가 밟으면 터집니다. 함정 붓으로 함정 칸을 다시 누르면 모두에게 드러납니다.</p>' : "") +
        '<details><summary class="hint">맵 코드</summary><textarea id="bd-code" rows="6" class="dg-code" spellcheck="false" aria-label="맵 코드">' + e(R.rows.join("\n")) + '</textarea><div class="sheet-actions"><button class="btn small" data-b="code">적용</button></div></details>' +
        (R.memo ? '<p class="hint bd-eff"><b>메모</b> ' + e(R.memo) + "</p>" : "") + "</details>";
    }
    var live = list.filter(function (k) { return !k.out; }), gone = list.filter(function (k) { return k.out; });
    var ord = live.slice().sort(function (a, b) { return plot ? (a.s < b.s ? -1 : a.s > b.s ? 1 : 0) : (b.g || 0) - (a.g || 0); });
    h += '<div class="bd-box"><b>' + (plot ? "말" : "행동 순서") + '</b><div class="bd-ord">' + (ord.map(function (k) {
      var gtxt = plot ? (k.gs ? (ctrl(k) ? "공력 " + k.g : "정함") : "아직") : "공력 " + (k.g || "–");
      return '<button type="button" class="bd-row' + (k.id === SEL ? " on" : "") + (myTurn(k) ? " now" : "") + (!alive(k) || k.dn ? " dim" : "") + '" data-sel="' + e(k.id) + '"><span class="bd-dot ' + (k.s === "B" ? "b" : "a") + '"></span>' + e(k.n) + " <small>" + gtxt + " · ♥" + lifeLeft(k) + (myTurn(k) ? " · 지금 차례" : k.dn && !plot ? " · 마침" : "") + rstate(k) + (k.stun ? " · 주화입마" : "") + ((k.sts || []).length ? " · " + e(k.sts.join("·")) : "") + (k.mk ? " · 마기 " + k.mk : "") + (k.st ? " · " + e(k.st) : "") + "</small></button>";
    }).join("") || '<span class="hint">아직 말이 없어요.</span>') + (gone.length ? '<p class="hint">판을 떠남: ' + gone.map(function (k) { return e(k.n + "(" + k.out + ")"); }).join(", ") + "</p>" : "") + "</div></div>";
    if (t) {
      var can = ctrl(t), left = (t.g || 0) - (t.used || 0), g = shown(), ter = f.terr[g[t.y][t.x]];
      h += '<div class="bd-box"><div><b>' + e(t.n) + '</b> <span class="hint">' + (t.s === "B" ? "을" : "갑") + (t.on ? " · " + e(t.on) : "") + (t.c ? " · " + e((t.c.school || "") + " " + (t.c.lv || "")) : "") + "</span></div>" + '<div class="hint">선 칸: <b>' + e(ter[0]) + "</b> " + e(ter[1]) + "</div>";
      if (can) {
        if (plot) h += '<div class="bd-gong" role="group" aria-label="공력">공력 ' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<button class="chip' + (t.gs && t.g === n ? " on" : "") + '" data-g="' + n + '">' + n + "</button>"; }).join("") + "</div>";
        else h += '<p class="hint">공력 ' + (t.g || "–") + " · 남은 코스트 " + Math.max(0, left) + " · 남은 이동 " + Math.max(0, (t.g || 0) - (t.mv || 0)) + (t.stun ? " · <b>주화입마</b>(이번 라운드 판정 불가)" : "") + "</p>";
        if (ph === "move" && myTurn(t)) h += '<div class="sheet-actions"><button class="btn small' + (MODE && MODE.type === "move" ? " primary" : "") + '" data-b="move">이동</button>' + (t.px != null ? '<button class="btn small" data-b="undo">이동 되돌리기</button>' : "") + '<button class="btn small primary" data-b="done">이동 마침</button></div>';
        if (ph === "act" && myTurn(t)) h += '<div class="sheet-actions"><button class="btn small primary" data-b="done">턴 마침</button></div>';
        h += t.life ? '<div class="bd-life" role="group" aria-label="생명력">' + LIFE.map(function (n, i) { return '<button class="chip' + (t.life[i] ? " on" : "") + '" data-life="' + i + '">' + n + "</button>"; }).join("") + ' <span>추가 <button class="btn small" data-b="ex-">−</button> ' + (t.ex || 0) + ' <button class="btn small" data-b="ex+">+</button></span></div>'
          : '<div class="bd-life">생명력 <button class="btn small" data-b="hp-">−</button> ' + (t.hp || 0) + ' <button class="btn small" data-b="hp+">+</button></div>';
        h += '<div class="bd-life">' + (t.sts || []).map(function (s) { return '<span class="chip on">' + e(s) + ' <button class="bd-x" data-b="cure" data-s="' + e(s) + '" title="해제 판정">《' + e(CURE[s] || "") + '》</button><button class="bd-x" data-b="stx" data-s="' + e(s) + '" aria-label="' + e(s) + ' 떼기">×</button></span>'; }).join("") + '<select data-f="addst" aria-label="상태이상 붙이기"><option value="">+ 상태이상</option>' + opt(STS, "") + '</select><button class="btn small" data-b="stroll">상태이상표</button></div>';
        h += '<div class="bd-life">마기 <button class="btn small" data-b="mk-">−</button>' + (t.mk || 0) + '<button class="btn small" data-b="mk+">+</button> 기세 <button class="btn small" data-b="ks-">−</button>' + (t.ks || 0) + '<button class="btn small" data-b="ks+">+</button> 표식 <button class="btn small" data-b="pm-">−</button>' + (t.pm || 0) + '<button class="btn small" data-b="pm+">+</button></div>';
        h += '<div class="bd-life"><input data-f="st" value="' + e(t.st || "") + '" placeholder="메모" aria-label="메모"></div>';
        h += '<div class="gm-bar"><select data-f="adv" aria-label="유리점·불리점">' + opt([2, 1, 0, -1, -2], ADV, ["유리점 2", "유리점 1", "보통", "불리점 1", "불리점 2"]) + '</select><select data-f="mod" aria-label="수정치">' + opt([3, 2, 1, 0, -1, -2, -3], MOD, ["+3", "+2", "+1", "수정 없음", "−1", "−2", "−3"]) + '</select><label class="hint"><input type="checkbox" data-f="multi"' + (MULTI ? " checked" : "") + '> 여럿 고르기</label><label class="hint"><input type="checkbox" data-f="free"' + (FREE ? " checked" : "") + "> 제한 풀기(밀기·당기기·추가 행동)</label></div>" +
          '<p class="hint">유리점·수정치는 다음 판정 한 번에만 듭니다. 엄폐·고소·악지·고지·분지는 저절로 계산돼요.</p>';
        var sks = skillsOf(t);
        h += '<div class="bd-sk">' + sks.map(function (r, i) {
          if (r.t === "장비") return "";
          var on = MODE && MODE.type === "skill" && MODE.i === i, tv = r.sk && r.sk !== "—" ? TN(t, r.sk) : 0, off = r.t === "공격" && t.atk && !FREE;
          return '<button type="button" class="bd-skb' + (on ? " on" : "") + (off ? " dim" : "") + '" data-sk="' + i + '"><b>' + e(bare(r.n)) + "</b> <small>" + e(r.t + (r.r && r.r !== "—" ? " · 간격 " + r.r : "") + (r.c && r.c !== "—" ? " · 코스트 " + r.c : "") + (r.sk && r.sk !== "—" ? " · 《" + r.sk + "》" + (tv >= 99 ? " 불가" : tv ? " " + tv + "+" : "") : "") + (off ? " · 이미 공격함" : "")) + "</small>" + (on ? '<span class="bd-eff">' + e(r.e || "") + "</span>" : "") + "</button>";
        }).join("") + "</div>";
        if (MODE && MODE.type === "skill") h += '<p class="hint">' + (rangeTo(t, MODE.r) >= 0 ? (MULTI ? "노란 테의 말을 여럿 고른 뒤 '쓰기'를 누르세요. " : "노란 테를 두른 말을 누르면 바로 판정을 굴립니다. ") : "") + '</p><div class="sheet-actions">' + (MULTI ? '<button class="btn small primary" data-b="usemulti">고른 대상 ' + (MODE.tg || []).length + "명에게 쓰기</button>" : "") + '<button class="btn small" data-b="useself">대상 없이 쓰기</button></div>';
        var eq = sks.filter(function (r) { return r.t === "장비"; }), ogs = ougiOf(t);
        if (eq.length) h += '<details data-keep="eq"><summary class="hint">장비 무공 ' + eq.length + "개(늘 켜져 있음)</summary>" + eq.map(function (r) { return '<p class="hint"><b>' + e(bare(r.n)) + "</b> " + e(r.e || "") + "</p>"; }).join("") + "</details>";
        if (ogs.length) h += '<details data-keep="og"><summary class="hint">오의 ' + ogs.length + "개(나와 GM에게만 보임)</summary>" + ogs.map(function (o, i) { var used = (t.ogu || []).indexOf(o.name) >= 0; return '<button type="button" class="bd-skb' + (used ? " dim" : "") + '" data-og="' + i + '"><b>「' + e(o.name) + "」</b> <small>" + e((o.form || "") + ((o.mods || []).length ? " · " + o.mods.join("·") : "") + (o.skill ? " · 《" + o.skill + "》" : "") + (used ? " · 씀" : "")) + "</small></button>"; }).join("") + '<p class="hint">누르면 이름·형태·지정특기가 기록에 공개됩니다. 효과와 대미지는 직접 적용하세요.</p></details>';
        h += '<div class="sheet-actions"><button class="btn small" data-b="place">자리 옮기기(비용 없음)</button>' + (t.cid && t.o === ME.id ? '<button class="btn small" data-b="resheet">시트 다시 읽기</button>' : "") + '<button class="btn small danger" data-b="del">말 빼기</button></div>';
      } else h += '<p class="hint">♥' + lifeLeft(t) + (t.life ? " · 잃은 분야: " + (lostOf(t).join("·") || "없음") : "") + ((t.sts || []).length ? " · " + e(t.sts.join("·")) : "") + "</p>";
      h += "</div>";
    }
    if (mem) {
      var mine = pcList(), npcs = gm && window.WX_GM_NPCS ? WX_GM_NPCS() : [];
      h += '<details class="bd-box" data-keep="add"' + (list.length ? "" : " open") + '><summary><b>말 추가</b></summary><div class="gm-bar"><select id="bd-ch" aria-label="내 캐릭터">' + mine.map(function (c, i) { return '<option value="' + i + '">' + e((c.name || "이름 없음") + " · " + (c.lv || "")) + "</option>"; }).join("") + '</select><select id="bd-sd" aria-label="진영"><option value="A">갑</option><option value="B">을</option></select><button class="btn small" data-b="addme">내 캐릭터 올리기</button></div>' +
        (mine.length ? "" : '<p class="hint">인물지에서 캐릭터를 만들거나 명부에 올리면 여기 뜹니다.</p>') +
        (gm ? (npcs.length ? '<div class="gm-bar"><select id="bd-npc" aria-label="서고 NPC">' + npcs.map(function (n) { return '<option value="' + e(n.id) + '">' + e(n.n + " · " + (n.lv || "")) + "</option>"; }).join("") + '</select><button class="btn small" data-b="addnpc">서고 NPC 올리기(을)</button></div>' : "") +
          '<div class="gm-bar"><input id="bd-mn" placeholder="이름(졸개·이물)" size="8" aria-label="이름"><label class="hint">수 <input id="bd-mc" type="number" min="1" max="8" value="1" style="width:3.5em"></label><label class="hint">생명력 <input id="bd-mh" type="number" min="1" max="40" value="1" style="width:3.5em"></label><label class="hint">목표치 <input id="bd-mt" type="number" min="2" max="12" value="7" style="width:3.5em"></label><button class="btn small" data-b="addmob">올리기(을)</button></div>' : "") + "</details>";
      h += '<div class="bd-box"><b>주사위</b><div class="gm-bar"><input id="bd-tv" type="number" min="2" max="12" placeholder="목표치" style="width:5em" aria-label="목표치"><input id="bd-lb" placeholder="무엇을(특기 이름)" size="10" aria-label="판정 이름"><button class="btn small" data-b="roll">2D6</button><button class="btn small" data-b="d6">1D6</button>' + (gm ? '<label class="hint"><input type="checkbox" data-f="secret"' + (SECRET ? " checked" : "") + "> 혼자 보기</label>" : "") + "</div></div>";
    }
    h += '<details class="bd-box" data-keep="help"><summary><b>처음이라면</b></summary><ol class="hint"><li><b>공력 정하기</b>: 말을 누르고 1~6을 고릅니다. 높을수록 먼저 움직이고, 그 수만큼 이동하고 코스트를 씁니다. 판정 합이 공력보다 낮으면 주화입마입니다.</li><li><b>이동</b>: GM이 공개하면 공력 높은 순서로 움직입니다. \'이동\' → 초록 칸(숫자는 드는 이동) → \'이동 마침\'. 다른 말이 선 칸은 지나갈 수 없습니다.</li><li><b>턴</b>: 공력 높은 순서. 무공을 누르면 효과가 펼쳐지고, 노란 테의 말을 누르면 명중 판정을 굴립니다. 끝나면 \'턴 마침\'. 공력이 같으면 동시행동이라 대미지는 그 공력이 끝난 뒤 적용됩니다.</li><li><b>맞으면</b>: 판 아래 상자에서 회피를 굴립니다. 실패하면 같은 자리에서 대미지를 받습니다(접근전은 주사위가 분야를 정하고, 사격전은 고릅니다).</li><li>공력은 화면에서만 가립니다. 같이 하는 사람끼리 믿고 쓰는 판입니다.</li></ol></details>';
    return h;
  }
  function logHtml() { return (R.log || []).slice(-120).map(function (l) { return '<div class="bd-l ' + e(l.k || "") + '"><b>' + e(l.w) + "</b> " + e(l.m) + "</div>"; }).join(""); }
  function nav() { return '<nav class="subtabs" aria-label="강호도"><a href="#map">전도·구역도</a><a href="#map-f">전장도(戰場圖)</a><a href="#map-b" aria-current="page">전투판(戰鬪板)</a></nav>'; }
  function draw(force) {
    if (!view || !R || !/^#map-b-/.test(location.hash)) return;
    if (!document.getElementById("bd-board")) {
      view.innerHTML = A().viewHead("map", "전투판(戰鬪板) — 함께 보는 실시간 전투판입니다. 룰북 '전투'의 차례대로 공력 → 이동 → 턴을 진행합니다.") + nav() +
        '<p id="bd-guide" class="bd-guide" role="status" aria-live="polite"></p><div class="bd"><div><div id="bd-board" class="fld-board"></div><p id="bd-info" class="hint"></p><div id="bd-alert"></div></div><div id="bd-side"></div><div class="bd-logwrap"><div id="bd-log" aria-live="polite"></div><form id="bd-chat" class="gm-bar"><input id="bd-msg" placeholder="말하기" autocomplete="off" aria-label="말하기"><button class="btn small">보내기</button></form></div></div>';
      bind();
    }
    document.getElementById("bd-guide").textContent = guide();
    document.getElementById("bd-board").innerHTML = boardSvg();
    document.getElementById("bd-info").textContent = INFO || "칸을 누르면 지형 효과가 여기 보입니다.";
    document.getElementById("bd-alert").innerHTML = alertHtml();
    var side = document.getElementById("bd-side"), ae = document.activeElement;
    if (!force && ae && side.contains(ae) && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && ae.type !== "checkbox") sideWait = true;
    else { var open = {}; side.querySelectorAll("details[data-keep]").forEach(function (d) { open[d.dataset.keep] = d.open; }); var had = side.innerHTML !== ""; side.innerHTML = sideHtml(); if (had) side.querySelectorAll("details[data-keep]").forEach(function (d) { d.open = !!open[d.dataset.keep]; }); sideWait = false; }
    var lg = document.getElementById("bd-log"), stick = lg.scrollHeight - lg.scrollTop - lg.clientHeight < 60; lg.innerHTML = logHtml(); if (stick) lg.scrollTop = lg.scrollHeight;
  }

  /* ── 손질 ── */
  function pcList() {
    var out = A().myChars().slice(), seen = {}; out.forEach(function (c) { seen[c.id] = 1; });
    ((A().archive && A().archive()) || []).forEach(function (d) { if (d.id === ME.id) (d.chars || []).forEach(function (c) { if (c.id && !seen[c.id]) { seen[c.id] = 1; var k = JSON.parse(JSON.stringify(c)); out.push(A().fix ? A().fix(k) : k); } }); });
    return out;
  }
  function freeCell(side) {
    var m = F().parse(R.rows), st = side === "B" ? m.b : m.a, i, x, y;
    for (i = 0; i < st.length; i++) if (!at(st[i][0], st[i][1])) return st[i];
    for (i = 0; i < N * N; i++) { x = side === "B" ? N - 1 - Math.floor(i / N) : Math.floor(i / N); y = i % N; if (!T().BLOCK[m.g[y][x]] && !at(x, y)) return [x, y]; }
    return [0, 0];
  }
  function slim(c) { var o = JSON.parse(JSON.stringify(c)); ["ougi", "notes", "rel", "pub", "img", "portrait", "exp", "log", "secret"].forEach(function (k) { delete o[k]; }); Object.keys(o).forEach(function (k) { if (typeof o[k] === "string" && o[k].length > 1500) delete o[k]; }); return o; }
  function addTok(t) { var p = freeCell(t.s), id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), o = {}; Object.assign(t, { x: p[0], y: p[1], g: 0, gs: false, used: 0, mv: 0, mk: 0, st: "", sts: [], dq: [], out: "" }); o["tk." + id] = t; R.tk = R.tk || {}; R.tk[id] = t; return say(t.n + " 등장 (" + (t.s === "B" ? "을" : "갑") + ")", "sys", o, "판"); }
  /* 말 하나를 고친 뒤 차례를 넘길지 보고 한 번에 쓴다 */
  function commit(t, patch, msg, kind) {
    var list = toks().map(function (k) { return k.id === t.id ? Object.assign(k, patch) : k; }), r = advance(list, U(t.id, patch));
    var text = [msg].concat(r.notes).filter(Boolean).join(" ");
    return text ? say(text, kind || "sys", r.u, t.n) : up(r.u);
  }
  function onAlert(ev) {
    var b = ev.target.closest("[data-b]"); if (!b || !R) return;
    var act = b.dataset.b, pd = (R.pd || []), p = pd.filter(function (x) { return x.i === b.dataset.i; })[0];
    if (p && /^(dodge|flee|nododge|pdx)$/.test(act)) {
      var tb = tok(p.b), rest = pd.filter(function (x) { return x !== p; }); if (!tb) { up({ pd: rest }); return; }
      if (act === "pdx") { if (isGm()) say("【" + p.mn + "】 없던 일로", "sys", { pd: rest }, "판"); return; }
      if (!ctrl(tb)) return;
      var hit = function (pre, stun) { var u = { pd: rest }, ta = tok(p.a); if (stun) u["tk." + tb.id + ".stun"] = true; u["tk." + tb.id + ".rh"] = ta ? ta.n : (p.mn || "?"); if (ta) u["tk." + ta.id + ".rt"] = (ta.rt || []).concat([tb.n]); /* 라운드 상태: 맞음·맞힘 */ if (p.dm) u["tk." + tb.id + ".dq"] = (tb.dq || []).concat([{ ty: p.dm.ty, n: p.dm.n, mn: p.mn, g: p.g, r: p.r, sim: !!p.sim }]); say(pre + " — 맞음: 【" + p.mn + "】 " + p.e, "bad", u, tb.n); };
      var line = R.phase === "plot" ? 0 : stunLine(tb);
      if (act === "nododge") { hit("회피하지 않음"); return; }
      if (act === "flee") { var jf = judge(TN(tb, "신법"), line, !tb.c); if (jf.ok) { var u2 = U(tb.id, { out: "도주" }); u2.pd = rest.filter(function (x) { return x.b !== tb.id; }); say("도주 《신법》 " + jf.txt + " — 전투에서 벗어난다(전과 없음)", "ok", u2, tb.n); } else hit("도주 《신법》 " + jf.txt, jf.stun); return; }
      var j = judge(TN(tb, p.sk), line, !tb.c, R.ter === "고소" ? -2 : 0), head = "회피" + (p.sk ? " 《" + p.sk + "》 " : " ") + j.txt;
      if (j.ok) { say(head, "ok", { pd: rest }, tb.n); return; }
      if (j.ok === null) { say(head + " — 맞았다면 '그냥 맞기'를 누르세요", "", {}, tb.n); return; }
      hit(head, j.stun); return;
    }
    var box = b.closest("[data-tid]"), t = box && tok(box.dataset.tid); if (!t || !ctrl(t)) return;
    var dq = (t.dq || []).slice(), it = dq[0];
    if (act === "out") { commit(t, { out: "탈락" }, "전투에서 탈락", "bad"); return; }
    if (act === "dth") { commit(t, { dth: true, dn: false }, "사망 공격을 선언한다(공격을 마치면 사망. 보조 무공 코스트 0은 '제한 풀기'로)", "bad"); return; }
    if (act === "black") { if (!isGm()) return; var r6 = d6(); commit(t, { out: r6 === 1 ? "사망" : "탈락" }, "흑관문 1D6 → " + r6 + (r6 === 1 ? " — 사망" : " — 살아남아 탈락(전투가 끝나면 무작위 생명력 1 회복)"), "bad"); return; }
    if (!it || !dqReady(it)) return;
    if (act === "dq-x") { dq.shift(); say("대미지를 받지 않음(" + it.ty + ")", "sys", U(t.id, { dq: dq }), t.n); }
    else if (act === "dq-less") { if (it.n > 1) dq[0] = Object.assign({}, it, { n: it.n - 1 }); else dq.shift(); say("대미지 1점 경감", "sys", U(t.id, { dq: dq }), t.n); }
    else if (act === "dq-st") { var s6 = d6(), st = STS[s6 - 1], sts = (t.sts || []).slice(); if (sts.indexOf(st) < 0) sts.push(st); dq.shift(); say("집단전 — 상태이상표 " + s6 + ": " + st + " (《" + CURE[st] + "》 판정으로 해제)", "bad", U(t.id, { dq: dq, sts: sts }), t.n); }
    else if (act === "dq-hp") { dq.shift(); var hp = Math.max(0, (t.hp || 0) - it.n); say(it.ty + " " + it.n + "점 — 생명력 " + hp, "bad", U(t.id, { dq: dq, hp: hp }), t.n); }
    else if (act === "dq-roll") {
      var life = t.life.slice(), ex = t.ex || 0, pick = 0, out = [];
      for (var i = 0; i < it.n; i++) { var d = d6(); if (life[d - 1]) { life[d - 1] = 0; out.push(d + " " + LIFE[d - 1]); } else { pick++; out.push(d + " " + LIFE[d - 1] + "(이미 잃음 → 고르기)"); } }
      if (pick && (life.some(Boolean) || ex > 0)) dq[0] = { ty: "사격전", n: pick, mn: it.mn, g: it.g, r: it.r }; else dq.shift();
      say("접근전 " + it.n + "점 — 1D6: " + out.join(", ") + " (♥" + (life.filter(Boolean).length + ex) + ")", "bad", U(t.id, { dq: dq, life: life, ex: ex }), t.n);
    }
    else if (act === "dq-pick") {
      var idx = +b.dataset.i, life2 = t.life.slice(), ex2 = t.ex || 0, nm; if (idx < 0) { ex2--; nm = "추가 생명력"; } else { life2[idx] = 0; nm = LIFE[idx]; }
      if (it.n > 1 && (life2.some(Boolean) || ex2 > 0)) dq[0] = Object.assign({}, it, { n: it.n - 1 }); else dq.shift();
      say(it.ty + " — " + nm + " 상실 (♥" + (life2.filter(Boolean).length + ex2) + ")", "bad", U(t.id, { dq: dq, life: life2, ex: ex2 }), t.n);
    }
  }
  function moveTo(t, x, y, cost, free) {
    var gr = grid(), ch = gr[y][x], u = U(t.id, { x: x, y: y, mv: (t.mv || 0) + cost, mc: (t.mc || 0) + (free ? 0 : Math.max(Math.abs(x - t.x), Math.abs(y - t.y))), pmc: t.mc || 0, px: free ? null : t.x, py: free ? null : t.y, pmv: t.mv || 0 }), msg = "", trap = ch === "T" && !free;
    if (trap) { u.rows = setCell(x, y, "."); u["tk." + t.id + ".mv"] = t.g || 0; u["tk." + t.id + ".dq"] = (t.dq || []).concat([{ ty: "집단전", n: 1, mn: "함정", r: R.round, g: 0 }]); u["tk." + t.id + ".px"] = null; msg = "함정을 밟았다! 이동이 끝나고 집단전을 받는다"; }
    else if (ch !== "." && ch !== "T" && !free) msg = "→ " + F().terr[ch][0] + " 칸" + (ch === "w" ? "(이동 끝)" : "");
    if (DB.runTransaction && FV()) {
      DB.runTransaction(function (tx) { return tx.get(ref()).then(function (d) { var tk = (d.data() || {}).tk || {}; Object.keys(tk).forEach(function (id) { if (id !== t.id && !tk[id].out && tk[id].x === x && tk[id].y === y) throw new Error("occupied"); }); tx.update(ref(), msg ? Object.assign({ log: FV().arrayUnion(ent(msg, trap ? "bad" : "sys", t.n)) }, u) : u); }); })
        .catch(function (err) { toast(err && err.message === "occupied" ? "그 칸에 방금 다른 말이 들어왔어요" : "옮기지 못했어요 (" + (err && err.code || "오류") + ")"); });
    } else if (msg) say(msg, trap ? "bad" : "sys", u, t.n); else up(u);
  }
  function onBoard(ev) {
    var gEl = ev.target.closest("[data-x]"); if (!gEl || !R) return;
    var x = +gEl.dataset.x, y = +gEl.dataset.y, here = at(x, y), t = tok(SEL), gr = grid(), sg = shown();
    INFO = F().terr[sg[y][x]][0] + " — " + F().terr[sg[y][x]][1];
    if (MODE && MODE.type === "edit" && isGm()) {
      var u = {}, ch = MODE.brush;
      if (gr[y][x] === "T" && ch === "T") { u["rev." + x + "_" + y] = true; say("함정이 드러났다", "sys", u, "판"); return; }
      u.rows = setCell(x, y, ch); if (MODE.temp) u.tmp = (R.tmp || []).concat([{ x: x, y: y, was: gr[y][x], until: R.round + 1 }]);
      up(u); return;
    }
    if (t && ctrl(t) && MODE && MODE.type === "skill" && here && here.id !== t.id) {
      var why = whyNot(t, MODE.r, here); if (why) { toast(why); return; }
      if (MULTI) { MODE.tg = MODE.tg || []; var ix = MODE.tg.indexOf(here.id); if (ix >= 0) MODE.tg.splice(ix, 1); else MODE.tg.push(here.id); draw(true); return; }
      useSkill(t, MODE.r, [here]); return;
    }
    if (here && !(MODE && (MODE.type === "move" || MODE.type === "place"))) { SEL = here.id; MODE = null; draw(true); return; }
    if (t && ctrl(t) && MODE && (MODE.type === "move" || MODE.type === "place") && !here) {
      if (MODE.type === "place" || FREE) { if (T().BLOCK[gr[y][x]] && !isGm()) { toast("들어갈 수 없는 칸이에요"); return; } MODE = null; moveTo(t, x, y, 0, true); return; }
      if (R.phase !== "move" || !myTurn(t)) { toast("이동은 이동 단계의 내 차례에만 해요. 밀기·당기기는 '자리 옮기기'를 쓰세요"); return; }
      var b = T().reach(gr, t, Math.max(0, (t.g || 0) - (t.mv || 0)), { occ: function (ax, ay) { var k = at(ax, ay); return !!k && k.id !== t.id; } });
      if (b[x + "," + y] == null) { toast("이동이 모자라거나 막힌 칸이에요"); return; }
      moveTo(t, x, y, b[x + "," + y], false); return;
    }
    draw(true);
  }
  function onSide(ev) {
    var el = ev.target, b = el.closest("[data-b]"), t = tok(SEL), v;
    if (el.closest("[data-sel]")) { SEL = el.closest("[data-sel]").dataset.sel; MODE = null; draw(true); return; }
    if (el.closest("[data-mobg]") && isGm()) { var gv = +el.closest("[data-mobg]").dataset.mobg, um = {}; toks().forEach(function (k) { if (!k.c && alive(k)) U(k.id, { g: gv, gs: true }, um); }); if (Object.keys(um).length) up(um); else toast("졸개가 없어요"); return; }
    if (el.closest("[data-g]") && t && ctrl(t)) { up(U(t.id, { g: +el.closest("[data-g]").dataset.g, gs: true })); return; }
    if (el.closest("[data-life]") && t && ctrl(t)) { var i = +el.closest("[data-life]").dataset.life, l = t.life.slice(); l[i] = l[i] ? 0 : 1; say(LIFE[i] + (l[i] ? " 회복" : " 상실") + " (♥" + (l.filter(Boolean).length + (t.ex || 0)) + ")", "sys", U(t.id, { life: l }), t.n); return; }
    if (el.closest("[data-sk]") && t && ctrl(t)) { var k = +el.closest("[data-sk]").dataset.sk; MODE = MODE && MODE.type === "skill" && MODE.i === k ? null : { type: "skill", i: k, r: skillsOf(t)[k], tg: [] }; draw(true); return; }
    if (el.closest("[data-og]") && t && ctrl(t)) { var o = ougiOf(t)[+el.closest("[data-og]").dataset.og]; if (!o) return; say("오의 「" + o.name + "」 — " + (o.form || "") + ((o.mods || []).length ? " · " + o.mods.join("·") : "") + (o.skill ? " · 지정특기 《" + o.skill + "》" : ""), "act", U(t.id, { ogu: (t.ogu || []).concat([o.name]) }), t.n); return; }
    if (!b) return; var act = b.dataset.b;
    if (act === "join") { if (ME.id) up({ mem: FV() ? FV().arrayUnion(ME.id) : (R.mem || []).concat([ME.id]) }); return; }
    if (!member()) return;
    if (act === "reveal" && isGm()) {
      var live = toks().filter(alive), miss = live.filter(function (k) { return !k.gs; });
      if (miss.length && b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "아직 안 정한 말 " + miss.length + " · 그래도 공개"; return; }
      var u = { phase: "move", cur: nextCur(live.filter(function (k) { return k.gs; }), 7), pre: false }; if (!u.cur) { toast("공력을 정한 말이 없어요"); return; }
      miss.forEach(function (k) { U(k.id, { dn: true }, u); });
      say(R.round + "라운드 공력 공개: " + live.filter(function (k) { return k.gs; }).sort(function (a, c) { return c.g - a.g; }).map(function (k) { return k.n + " " + k.g; }).join(", ") + ". 공력 높은 순서로 이동합니다.", "sys", u, "판"); return;
    }
    if (act === "skip" && isGm()) { var list = toks(), us = {}, was = R.cur; list.forEach(function (k) { if (alive(k) && k.g === R.cur && !k.dn) { k.dn = true; U(k.id, { dn: true }, us); } }); var ra = advance(list, us); say("공력 " + was + " 마침. " + ra.notes.join(" "), "sys", ra.u, "판"); return; }
    if (act === "next" && isGm()) {
      var g = grid(), un = { phase: "plot", round: R.round + 1, cur: 0, pd: [] }, notes = [], rows = R.rows, keep = [];
      (R.tmp || []).forEach(function (c) { if (c.until <= R.round) rows = rows.map(function (r, i) { return i === c.y ? r.slice(0, c.x) + c.was + r.slice(c.x + 1) : r; }); else keep.push(c); });
      if ((R.tmp || []).length) { un.rows = rows; un.tmp = keep; }
      toks().forEach(function (k) {
        var p = { g: 0, gs: false, used: 0, mv: 0, mc: 0, rh: null, rt: [], dn: false, atk: false, stun: false, px: null }, dq = (k.dq || []).slice();
        if (alive(k)) {
          if (g[k.y][k.x] === "!") { dq.push({ ty: "집단전", n: 1, mn: "위험지", r: R.round + 1, g: 0 }); notes.push(k.n + " 위험지(집단전)"); }
          if (R.ter === "극지") { var c6 = d6(); if (c6 >= 5) { dq.push({ ty: "사격전", n: 1, mn: "극지", r: R.round + 1, g: 0 }); notes.push(k.n + " 극지 굴림 " + c6 + "(사격전 1점)"); } }
          if ((k.sts || []).length) notes.push(k.n + " 상태이상 " + k.sts.join("·"));
        }
        p.dq = dq; U(k.id, p, un);
      });
      un.log = (R.log || []).slice(-150).concat([ent(R.round + "라운드 끝. " + (notes.length ? notes.join(" / ") + "." : ""), "sys", "판")]);
      MODE = null; up(un); return;
    }
    if (isGm()) {
      if (act === "terroll") { var tr = d6(); say("전장표 " + tr + ": " + TERS[tr - 1], "sys", { ter: TERS[tr - 1] }, "판"); return; }
      if (act === "mkn-" || act === "mkn+") { up({ mkN: Math.max(0, (R.mkN || 0) + (act === "mkn+" ? 1 : -1)) }); return; }
      if (act === "mkl-" || act === "mkl+") { up({ mkL: Math.max(0, (R.mkL || 0) + (act === "mkl+" ? 1 : -1)) }); return; }
      if (act === "mklroll") { var m4 = 2 + Math.floor(Math.random() * 4); say("마기 한계 1D4+1 → " + m4, "sys", { mkL: m4, mkN: 0 }, "판"); return; }
      if (act === "genmap") { setMap(F().toRows(F().generate(F().setOf(R.set)))); return; }
      if (act === "edit") { MODE = MODE && MODE.type === "edit" ? null : { type: "edit", brush: "#", temp: false }; draw(true); return; }
      if (act === "code") { var rows2 = document.getElementById("bd-code").value.split(/\r?\n/).map(function (r) { return r.replace(/\s/g, ""); }).filter(Boolean); if (rows2.length !== 6 || rows2.some(function (r) { return r.length !== 6; })) { toast("맵 코드는 6줄, 줄마다 6글자여야 해요"); return; } setMap(rows2); return; }
    }
    if (act === "roll") { v = +document.getElementById("bd-tv").value || 0; var lb = document.getElementById("bd-lb").value.trim(), tt = t && ctrl(t) ? t : null; if (tt && tt.stun) { toast("주화입마라 판정할 수 없어요"); return; } var j2 = judge(v, tt && R.phase !== "plot" ? stunLine(tt) : 0, tt && !tt.c); if (SECRET && isGm()) { toast((lb ? lb + " " : "") + j2.txt); draw(true); return; } say((lb ? lb + " " : "") + j2.txt, j2.ok === false ? "bad" : j2.ok ? "ok" : "", tt && j2.stun ? U(tt.id, { stun: true }) : {}); return; }
    if (act === "d6") { var r1 = d6(); if (SECRET && isGm()) { toast("1D6 → " + r1); return; } say("1D6 → " + r1); return; }
    if (act === "addme") { var c = pcList()[+document.getElementById("bd-ch").value]; if (!c) { toast("인물지에서 캐릭터를 먼저 만들어 주세요"); return; } addTok({ n: c.name || "협객", o: ME.id, on: ME.name, s: document.getElementById("bd-sd").value, life: [1, 1, 1, 1, 1, 1], ex: (c.bg || []).some(function (n) { return /^강골/.test(n); }) ? 1 : 0, c: slim(c), cid: c.id || "" }); return; }
    if (act === "addnpc" && isGm()) { var np = WX_GM_NPCS().filter(function (n) { return n.id === document.getElementById("bd-npc").value; })[0]; if (np) addTok({ n: np.n, o: ME.id, on: "GM", s: "B", life: [1, 1, 1, 1, 1, 1], ex: 0, c: slim(np.c), nid: np.id }); return; }
    if (act === "addmob" && isGm()) {
      var nm = document.getElementById("bd-mn").value.trim() || "졸개", cnt = Math.max(1, Math.min(8, +document.getElementById("bd-mc").value || 1)), hp = Math.max(1, +document.getElementById("bd-mh").value || 1), tv = Math.max(2, Math.min(12, +document.getElementById("bd-mt").value || 7)), i2 = 0;
      (function nx() { if (i2 >= cnt) return; i2++; addTok({ n: cnt > 1 ? nm + i2 : nm, o: ME.id, on: "GM", s: "B", hp: hp, tv: tv }).then(nx); })(); return;
    }
    if (!t || !ctrl(t)) return;
    if (act === "move") { MODE = MODE && MODE.type === "move" ? null : { type: "move" }; draw(true); }
    else if (act === "place") { MODE = MODE && MODE.type === "place" ? null : { type: "place" }; INFO = "옮길 칸을 누르세요(비용 없음)."; draw(true); }
    else if (act === "undo" && t.px != null) { up(U(t.id, { x: t.px, y: t.py, mv: t.pmv || 0, mc: t.pmc || 0, px: null })); }
    else if (act === "done") { MODE = null; commit(t, { dn: true }, R.phase === "move" ? "" : "턴 마침", "sys"); }
    else if (act === "useself" && MODE && MODE.type === "skill") useSkill(t, MODE.r, []);
    else if (act === "usemulti" && MODE && MODE.type === "skill") { var tg = (MODE.tg || []).map(tok).filter(Boolean); if (!tg.length) { toast("대상을 고르세요"); return; } useSkill(t, MODE.r, tg); }
    else if (act === "hp-" || act === "hp+") { v = Math.max(0, (t.hp || 0) + (act === "hp+" ? 1 : -1)); say("생명력 " + v, "sys", U(t.id, { hp: v }), t.n); }
    else if (act === "ex-" || act === "ex+") up(U(t.id, { ex: Math.max(0, (t.ex || 0) + (act === "ex+" ? 1 : -1)) }));
    else if (/^(mk|ks|pm)[-+]$/.test(act)) { var key = act.slice(0, 2), o2 = {}; o2[key] = Math.max(0, (t[key] || 0) + (act.slice(2) === "+" ? 1 : -1)); if (key === "mk") say("마기 " + o2.mk, "sys", U(t.id, o2), t.n); else up(U(t.id, o2)); }
    else if (act === "stx") up(U(t.id, { sts: (t.sts || []).filter(function (s) { return s !== b.dataset.s; }) }));
    else if (act === "cure") { if (t.stun) { toast("주화입마라 판정할 수 없어요"); return; } var s = b.dataset.s, jc = judge(TN(t, CURE[s]), R.phase === "plot" ? 0 : stunLine(t), !t.c), uc = jc.ok ? U(t.id, { sts: (t.sts || []).filter(function (z) { return z !== s; }) }) : jc.stun ? U(t.id, { stun: true }) : {}; say(s + " 해제 《" + CURE[s] + "》 " + jc.txt, jc.ok ? "ok" : "bad", uc, t.n); }
    else if (act === "stroll") { var s6 = d6(), st = STS[s6 - 1], sts = (t.sts || []).slice(); if (sts.indexOf(st) < 0) sts.push(st); say("상태이상표 " + s6 + ": " + st, "bad", U(t.id, { sts: sts }), t.n); }
    else if (act === "resheet") { var nc = pcList().filter(function (x) { return x.id === t.cid; })[0]; if (nc) { up(U(t.id, { c: slim(nc), n: nc.name || t.n })); toast("시트를 다시 읽었어요"); } else toast("이 기기에서 그 캐릭터를 찾지 못했어요"); }
    else if (act === "del") { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "한 번 더 누르면 뺌"; return; } var tk = Object.assign({}, R.tk); delete tk[t.id]; SEL = ""; MODE = null; say(t.n + " 퇴장", "sys", { tk: tk, pd: (R.pd || []).filter(function (p) { return p.a !== t.id && p.b !== t.id; }) }, "판"); }
  }
  /* 맵을 바꾸면 막힌 칸에 선 말을 가까운 빈 칸으로 옮긴다 */
  function setMap(rows, setId) {
    var g = F().parse(rows).g, u = { rows: rows, rev: {}, tmp: [] }, taken = {}; if (setId) u.set = setId;
    toks().forEach(function (k) { if (!k.out && !T().BLOCK[g[k.y][k.x]]) taken[k.x + "," + k.y] = 1; });
    toks().forEach(function (k) {
      if (k.out || !T().BLOCK[g[k.y][k.x]]) return; var best = null, bd = 99;
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (!T().BLOCK[g[y][x]] && !taken[x + "," + y]) { var d = Math.max(Math.abs(x - k.x), Math.abs(y - k.y)); if (d < bd) { bd = d; best = [x, y]; } }
      if (best) { taken[best.join()] = 1; U(k.id, { x: best[0], y: best[1] }, u); }
    });
    up(u);
  }
  function onSideChange(ev) {
    var el = ev.target, f = el.dataset.f, t = tok(SEL), re = false;
    if (f === "adv") ADV = +el.value; else if (f === "mod") MOD = +el.value;
    else if (f === "free") { FREE = el.checked; re = true; } else if (f === "multi") { MULTI = el.checked; if (MODE && MODE.tg) MODE.tg = []; re = true; } else if (f === "secret") SECRET = el.checked;
    else if (f === "brush" && MODE) MODE.brush = el.value; else if (f === "temp" && MODE) MODE.temp = el.checked;
    else if (f === "st" && t && ctrl(t)) up(U(t.id, { st: el.value.slice(0, 40) }));
    else if (f === "addst" && t && ctrl(t) && el.value) { var sts = (t.sts || []).slice(); if (sts.indexOf(el.value) < 0) sts.push(el.value); say("상태이상 " + el.value, "bad", U(t.id, { sts: sts }), t.n); }
    else if (isGm() && f === "ter") say("전장: " + el.value, "sys", { ter: el.value }, "판");
    else if (isGm() && f === "pre") up({ pre: el.checked });
    else if (isGm() && f === "set") setMap(F().setOf(el.value).maps[0].rows, el.value);
    else if (isGm() && f === "map" && el.value !== "") setMap(F().setOf(R.set).maps[+el.value].rows);
    if (re) draw(true); else if (sideWait) setTimeout(function () { if (sideWait) draw(); }, 50);
  }
  function bind() {
    document.getElementById("bd-board").addEventListener("click", onBoard);
    document.getElementById("bd-alert").addEventListener("click", onAlert);
    var side = document.getElementById("bd-side"); side.addEventListener("click", onSide); side.addEventListener("change", onSideChange);
    side.addEventListener("focusout", function () { setTimeout(function () { if (sideWait) draw(); }, 80); });
    document.getElementById("bd-chat").addEventListener("submit", function (ev) { ev.preventDefault(); var i = document.getElementById("bd-msg"), m = i.value.trim(); if (!m) return; if (!member()) { toast("참가해야 말할 수 있어요"); return; } i.value = ""; say(m.slice(0, 300), "chat"); });
  }

  /* ── 방 목록·만들기 ── */
  function create(o) {
    o = o || {}; var s0 = F().setOf(o.set || F().sets[0].id), id = Math.random().toString(36).slice(2, 8);
    return DB.collection("rooms").doc(id).set({ n: o.n || "이름 없는 판", gm: ME.id, gmName: ME.name, mem: [ME.id], set: s0.id, rows: o.rows || s0.maps[0].rows, ter: "평지", round: 1, phase: "plot", cur: 0, pre: false, tk: {}, pd: [], log: [], rev: {}, tmp: [], mkL: 0, mkN: 0, memo: o.memo || "", at: Date.now() })
      .then(function () { location.hash = "#map-b-" + id; }, function (err) { toast("방을 만들지 못했어요 (" + (err && err.code || "오류") + "). 저장소 규칙에 rooms가 들어갔는지 확인해 주세요"); });
  }
  /* 던전메이커·전장도에서 부른다: { n, set, rows, memo } */
  function openWith(o) { var api = A(); DB = api.db ? api.db() : null; var me = api.me ? api.me() : null; if (me) ME = me; if (!DB || !ME.id) { toast("로그인해야 전투판을 열 수 있어요"); return; } create(o); }
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
    if (f) f.onsubmit = function (ev) { ev.preventDefault(); create({ n: document.getElementById("bd-rn").value.trim() }); };
    view.onclick = function (ev) { var b = ev.target.closest("[data-delroom]"); if (!b) return; if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "한 번 더 누르면 없앰"; return; } DB.collection("rooms").doc(b.dataset.delroom).delete().catch(function () { toast("없애지 못했어요"); }); };
  }
  function stop() { if (unR) { unR(); unR = null; } R = null; }
  function render(v, id) {
    view = v; var api = A(); DB = api.db ? api.db() : null; var me = api.me ? api.me() : null; if (me) ME = me;
    if (!ME.name && window.firebase && firebase.auth && firebase.auth().currentUser) ME.name = firebase.auth().currentUser.displayName || "";
    if (!F() || !T()) { view.innerHTML = '<div class="empty"><p>전장도 자료가 없어 전투판을 열 수 없어요.</p></div>'; return; }
    view.onclick = null;
    if (!DB) { view.innerHTML = listHtml(); if (tries++ < 12) setTimeout(function () { if (/^#map-b/.test(location.hash)) render(view, id); }, 700); return; }
    if (!id) {
      stop(); RID = "";
      if (!unL) unL = DB.collection("rooms").onSnapshot(function (s) { LIST = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); drawList(); }, function () { LIST = []; drawList(); });
      drawList(); return;
    }
    if (id === RID && R) { draw(true); return; }
    stop(); RID = id; SEL = ""; MODE = null; INFO = ""; view.innerHTML = A().viewHead("map", "전투판(戰鬪板)") + nav() + '<p class="hint">판을 여는 중…</p>';
    unR = DB.collection("rooms").doc(id).onSnapshot(function (d) {
      if (!/^#map-b-/.test(location.hash)) { stop(); return; }
      var data = d.exists === false || !d.data ? null : d.data();
      if (!data) { R = null; view.innerHTML = A().viewHead("map", "전투판(戰鬪板)") + nav() + '<p class="hint">없는 방이에요. <a href="#map-b">방 목록으로</a></p>'; return; }
      R = data; R.tk = R.tk || {}; if (!R.phase) R.phase = "plot"; if (R.phase === "act" && !R.cur) R.phase = "end"; if (SEL && !R.tk[SEL]) SEL = ""; draw();
    }, function (err) { view.innerHTML = A().viewHead("map", "전투판(戰鬪板)") + nav() + '<p class="hint">판을 읽지 못했어요 (' + e(err && err.code || "오류") + ").</p>"; });
  }
  window.WX_BOARD = { render: render, open: openWith };
})();
