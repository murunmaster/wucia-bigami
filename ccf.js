/* 코코포리아 키트: 인물지 시트를 코코포리아 말(클립보드 JSON)로 바꾸고, 룰의 표를 /roll-table 명령으로 내준다.
   말: 코코포리아 방에서 Ctrl+V 하면 생긴다(Clipboard API, kind: "character").
   판정 명령은 BCDice 공통 명령(2D6>=n, 3D6KH2>=n, choice[…])만 써서 어느 다이스봇을 골라도 돈다.
   오의는 본인과 GM만 보는 것이라 말에 넣지 않는다. */
(function () {
  "use strict";
  function A() { return window.WX_SIM_API; }
  function one(s) { return String(s == null ? "" : s).replace(/\s*\n+\s*/g, " ").trim(); }
  function bare(n) { return String(n || "").replace(/\s*\([^)]*\)\s*$/, ""); }

  /* 표: [이름, 주사위, 줄들]. short는 채팅 팔레트 choice용 짧은 말 */
  var TABLES = [
    { n: "상태이상표", d: "1D6", rows: [
      "고장. 도구 사용 불가. 턴/라운드 종료 시 《도구》로 해제",
      "마비. 습득한 특기 중 1개 사용 불가. 턴/라운드 종료 시 《단련》으로 해제",
      "외상. 턴/라운드 종료 시 접근전 1점. 턴/라운드 종료 시 《의술》로 해제",
      "행방불명. 다음 턴 등장 불가. 턴/라운드 종료 시 《추적》으로 해제",
      "망각. 모든 감정 수정 사용 불가. 턴/라운드 종료 시 《섭혼》으로 해제",
      "내상. 무작위 무공 1개 사용 불가. 턴/라운드 종료 시 《운기》로 해제"],
      short: ["고장", "마비", "외상", "행방불명", "망각", "내상"] },
    { n: "전장표", d: "1D6", rows: [
      "평지. 아무 효과 없음",
      "고소. 회피 판정 -2",
      "수중. 판정 실패 시 접근전 데미지 1",
      "악천후. 공격 무공 간격 1 감소",
      "악지. 펌블치 1 상승",
      "극지. 라운드 종료 시 1D6을 굴려 5~6이면 사격전 데미지 1점"],
      short: ["평지", "고소", "수중", "악천후", "악지", "극지"] },
    { n: "펌블표", d: "1D6", rows: [
      "아무 효과 없이 평화로움",
      "보급품 1개를 선택해 상실",
      "1 마기한계 동안 판정 -1",
      "생명력 1점 선택해 상실",
      "상태이상표 굴림",
      "마기 1 축적"],
      short: ["평화로움", "보급품 1개 상실", "1 마기한계 동안 판정 -1", "생명력 1점 상실", "상태이상표 굴림", "마기 1 축적"] },
    { n: "감정표", d: "1D6", rows: [
      "공감(긍정) / 불신(부정)", "우정(긍정) / 분노(부정)", "애정(긍정) / 질투(부정)",
      "충성(긍정) / 모멸(부정)", "동경(긍정) / 열등감(부정)", "광신(긍정) / 살의(부정)"],
      short: ["공감/불신", "우정/분노", "애정/질투", "충성/모멸", "동경/열등감", "광신/살의"] }
  ];
  function rollTable(t) { return ["/roll-table", t.n, t.d].concat(t.rows.map(function (r, i) { return (i + 1) + ":" + r; })).join("\n"); }
  function choiceLine(t) { return "choice[" + t.short.join(",") + "] " + t.n; }

  function palette(c) {
    var api = A(), T = api.targets(c), all = api.skills(), own = c.skills || [], L = [];
    function roll(sk) { var t = T[sk]; return t && t <= 12 ? "2D6>=" + t : null; }
    L.push("◆ 판정 — 6,6 스페셜 / 메인은 1,1 펌블 / 전투는 합이 공력 미만이면 주화입마");
    L.push("SC(3) 공력 설정 (괄호 안 숫자를 정한 공력으로 바꿔 보내기)");
    L.push("3D6KH2>=5 유리점 1 (목표치를 고쳐 쓰기)");
    L.push("3D6KL2>=5 불리점 1 (목표치를 고쳐 쓰기)");
    L.push("◆ 익힌 특기");
    own.forEach(function (s) { L.push("2D6>=5 《" + s + "》"); });
    L.push("◆ 무공");
    L.push((roll(c.atk) || "2D6>=5") + " 【접근전 공격】 공격 · 간격 1 · 코스트 0 · 《" + (c.atk || "지정특기 미정") + "》 접근전 1점.");
    (c.mg || []).forEach(function (n) {
      var r = api.find(n); if (!r || !r.n) return;
      var sk = r.sk && r.sk !== "—" ? r.sk : "", cmd = sk ? roll(sk) : null;
      var info = "【" + bare(r.n) + "】 " + (r.t || "") + (r.r && r.r !== "—" ? " · 간격 " + r.r : "") + (r.c && r.c !== "—" ? " · 코스트 " + r.c : "") + (sk ? " · 《" + sk + "》" : "") + " " + one(r.e);
      if (r.t === "장비") L.push(info);
      else L.push((cmd ? cmd + " " : sk ? "2D6>=5 (목표치 확인) " : "") + info);
    });
    L.push("◆ 표");
    TABLES.forEach(function (t) { L.push(choiceLine(t)); });
    L.push("1D6 흑관문 (1이면 사망)");
    L.push("1D6 극지 굴림 (5~6이면 사격전 1점)");
    L.push("1D4+1 마기 한계");
    L.push("◆ 회피·그 밖의 특기");
    var fields = {}; all.forEach(function (s) { var f = api.fieldOf(s) || ""; (fields[f] = fields[f] || []).push(s); });
    Object.keys(fields).forEach(function (f) {
      fields[f].forEach(function (s) { if (own.indexOf(s) < 0 && T[s] <= 12) L.push("2D6>=" + T[s] + " 《" + s + "》 " + f); });
    });
    return L.join("\n");
  }

  function piece(c0) {
    var api = A(), c = api.fix(JSON.parse(JSON.stringify(c0)));
    var life = 6 + ((c.bg || []).some(function (n) { return /^강골/.test(n); }) ? 1 : 0);
    var it = Object.keys(c.items || {});
    var memo = [
      (c.alias ? "[" + c.alias + "] " : "") + (c.school || "문파 미정") + " · " + c.lv,
      "특기: " + ((c.skills || []).map(function (s) { return "《" + s + "》"; }).join(" ") || "—"),
      (c.bg || []).length ? "배경: " + c.bg.map(bare).join(", ") : "",
      it.length ? "보급품: " + it.map(function (n) { return bare(n) + "×" + c.items[n]; }).join(", ") : ""
    ].filter(Boolean).join("\n");
    return { kind: "character", data: {
      name: c.name || "이름 없는 협객", memo: memo, initiative: 0, externalUrl: location.href.split("#")[0],
      status: [{ label: "생명력", value: life, max: life }, { label: "공력", value: 0, max: 6 }, { label: "마기", value: 0, max: 0 }],
      params: [{ label: "경지", value: String(c.lv || "") }, { label: "문파", value: String(c.school || "") }, { label: "소지금", value: (Number(c.money) || 0) + "냥" }, { label: "잃은 분야", value: "" }, { label: "상태이상", value: "" }],
      commands: palette(c)
    } };
  }
  function copy(text, okMsg) {
    var api = A(), say = (api && api.toast) || function () { };
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) { } ta.remove();
      say(ok ? okMsg : "복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say(okMsg); }, fallback); else fallback();
  }
  function copyPiece(c) { copy(JSON.stringify(piece(c)), "말을 복사했어요. 코코포리아 방에서 Ctrl+V"); }

  /* 인물지 시트 아래에 펼치는 상자 */
  function boxHtml() {
    return '<div class="io ccf-box" id="s-ccfbox" hidden><p><b>코코포리아 키트</b></p>' +
      '<div class="sheet-actions"><button class="btn small primary" type="button" id="ccf-piece">말 복사</button><span class="hint">코코포리아 방 화면에서 Ctrl+V 하면 이 캐릭터의 말이 생겨요.</span></div>' +
      '<ul class="hint"><li>말에는 생명력·공력·마기 칸과, 특기·무공 판정 명령이 든 채팅 팔레트가 들어 있어요. 오의는 넣지 않아요.</li>' +
      "<li>판정 명령은 어느 다이스봇을 골라도 돌아요. 6,6 스페셜과 주화입마(합이 공력 미만)는 눈으로 확인해요.</li>" +
      "<li>말의 이니셔티브 칸에 그 라운드 공력을 적으면 행동 순서대로 줄이 서요.</li>" +
      "<li>시트를 고친 뒤에는 말을 다시 복사해 붙여 넣으세요.</li></ul>" +
      '<p class="hint">표 명령(/roll-table): 복사해서 채팅에 보내거나, 스크린 패널의 클릭 액션 "채팅에 송신"에 넣어 두세요. 팔레트에도 같은 표가 choice 명령으로 들어 있어요.</p>' +
      '<div class="sheet-actions">' + TABLES.map(function (t, i) { return '<button class="btn small" type="button" data-ccf-t="' + i + '">' + t.n + "</button>"; }).join("") + "</div></div>";
  }
  function bind(root, getChar) {
    var box = root.querySelector("#s-ccfbox"), open = root.querySelector("#s-ccf"); if (!box || !open) return;
    open.onclick = function () { box.hidden = !box.hidden; };
    box.onclick = function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      if (b.id === "ccf-piece") copyPiece(getChar());
      else if (b.dataset.ccfT != null) { var t = TABLES[+b.dataset.ccfT]; copy(rollTable(t), t.n + " 명령을 복사했어요"); }
    };
  }
  window.WX_CCF = { piece: piece, palette: palette, copyPiece: copyPiece, tables: TABLES, rollTable: rollTable, boxHtml: boxHtml, bind: bind };
})();
