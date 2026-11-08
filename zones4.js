/* 강호 구역도 4 — 던전 지정과 새 구역(막간산·반계·조가 폐허·협객도·구룡벽). zones3.js 다음에 읽습니다.
   던전에는 dg(종류)를 붙입니다. 던전 안의 보상과 히든피스 자리는 GM 서고에서만 관리합니다. */
(function () {
  var Z = window.ZONES; if (!Z) return;
  var M = Z.maps;
  function byId(id) { return M.filter(function (m) { return m.id === id; })[0]; }
  function zoneOf(mapId, zid) { var m = byId(mapId); return m && m.zones.filter(function (z) { return z.id === zid; })[0]; }
  function addLocal(mapId, z, from, lk) { var m = byId(mapId); if (!m) return; m.zones.push(z); if (from) m.links.push([from, z.id, lk || "road"]); }

  /* 사이트에 드러나던 "히든피스 후보" 표기를 지운다 */
  M.forEach(function (m) { m.zones.forEach(function (z) {
    if (z.e) z.e = z.e.replace(/조사로 찾아야 하는 히든피스 후보\./g, "조사로 찾아야 한다.").replace(/\s*히든피스 후보\./g, " 조사할 거리가 있다.").trim();
  }); });

  /* 새 구역 */
  addLocal("r-zhejiang", { id: "mg", n: "막간산", t: "산악", e: "대나무 숲과 샘의 산. 옛 검장들이 검을 벼렸다고 한다. 조사할 거리가 있다.", at: [1, 3] }, "tm", "rough");
  addLocal("r-shaanxi", { id: "pg", n: "반계", t: "수변", e: "위수 상류의 낚시터. 옛 태공이 곧은 낚시를 드리웠다는 바위가 있다.", at: [3, 2] }, "nr", "water");
  addLocal("r-henan", { id: "jg", n: "조가 폐허", t: "폐허", e: "옛 은나라 도읍 터. 열 개의 진이 아직 풀리지 않았다는 소문이 돈다.", at: [3, 2] }, "hd");
  addLocal("r-guangdong", { id: "xk", n: "협객도", t: "섬", e: "남해의 외딴섬. 섬 안 석실 벽에 알 수 없는 글이 가득하다.", at: [3, 3] }, "hn", "water");
  addLocal("yungang", { id: "gl", n: "대왕부 구룡벽", t: "벽", e: "대동 대왕부 앞의 아홉 용 벽. 비늘 하나하나가 기관이라는 말이 있다.", at: [1, 0] }, "o1");

  /* 던전 지정: [지도, 구역, 종류] */
  [
    ["sungsan", "dm", "동굴"], ["hwasan", "jg", "벼랑"], ["cheonsan", "kz", "석굴"], ["mogao", "jj", "석굴"],
    ["yungang", "fs", "폐사"], ["longhu", "xs", "고분"], ["wuyi", "cg", "고분"], ["nanjing", "xl", "고분"],
    ["suzhou", "hq", "고분"], ["anyang", "yx", "고분"], ["hangzhou", "lf", "요괴굴"], ["r-hoguang", "wl", "요괴굴"],
    ["huangshan", "xh", "요괴굴"], ["noegong", "jy", "동굴"], ["r-guizhou", "dg", "동굴"], ["emei", "jl", "동굴"],
    ["gonryun", "sw", "설원"], ["bukhae", "oh", "성지"], ["dongpyeong", "ys", "늪"], ["akyang", "gs", "수중"],
    ["yungjung", "pm", "기관"], ["r-shaanxi", "ps", "산채"], ["seoan", "jn", "은거지"], ["cheonchuk", "nl", "폐허"],
    ["yungang", "gl", "장소형"], ["r-henan", "jg", "장소형"], ["r-guangdong", "xk", "장소형"]
  ].forEach(function (d) { var z = zoneOf(d[0], d[1]); if (z) z.dg = d[2]; });
})();
