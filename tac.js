/* 전술 계산 한 벌: 전투판(board.js)과 전투 시뮬(sim.js)이 같이 쓴다. 룰북 '전투 → 지형'을 따른다.
   grid = 6×6 지형 기호. 이동은 대각선도 1칸, 무공 간격은 대각선 1.5칸. */
(function () {
  "use strict";
  var N = 6, BLOCK = { "#": 1, "_": 1, "D": 1 };
  function flat() { var g = []; for (var y = 0; y < N; y++) { g.push([]); for (var x = 0; x < N; x++) g[y].push("."); } return g; }
  /* 한 칸 옮기는 데 드는 이동: 험지, 고지로 오르기, 분지에서 나가기는 2칸 */
  function stepCost(from, to) { return to === "~" || (to === "^" && from !== "^") || (from === "v" && to !== "v") ? 2 : 1; }
  /* 갈 수 있는 칸. o.occ(x,y)=다른 말이 있나(지나가지도 서지도 못한다. o.pass면 지나가기만 한다), o.stop(x,y)=들어가면 이동이 끝나는 칸(수면 말고 더)
     돌려주는 값: { "x,y": 든 이동 } (출발 칸 포함) */
  function reach(g, from, budget, o) {
    o = o || {}; g = g || flat();
    var best = {}, q = [[from.x, from.y, 0]]; best[from.x + "," + from.y] = 0;
    while (q.length) {
      q.sort(function (a, b) { return a[2] - b[2]; }); var c = q.shift(), start = c[0] === from.x && c[1] === from.y;
      if (!start && (g[c[1]][c[0]] === "w" && !o.nowater || (o.stop && o.stop(c[0], c[1])))) continue;
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue; var x = c[0] + dx, y = c[1] + dy;
        if (x < 0 || y < 0 || x >= N || y >= N || BLOCK[g[y][x]]) continue;
        if (dx && dy && BLOCK[g[c[1]][x]] && BLOCK[g[y][c[0]]]) continue;
        if (o.occ && o.occ(x, y) && !o.pass) continue;
        var nc = c[2] + stepCost(g[c[1]][c[0]], g[y][x]), k = x + "," + y;
        if (nc <= budget && (best[k] == null || nc < best[k])) { best[k] = nc; q.push([x, y, nc]); }
      }
    }
    if (o.occ) Object.keys(best).forEach(function (k) { var p = k.split(","); if (!(+p[0] === from.x && +p[1] === from.y) && o.occ(+p[0], +p[1])) delete best[k]; });
    return best;
  }
  function reachPass(g, from, budget, o) { o = Object.assign({}, o || {}); o.pass = true; return reach(g, from, budget, o); }
  function dist(a, b) { var dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y), mn = Math.min(dx, dy); return Math.max(dx, dy) - mn + 1.5 * mn; }
  /* 같은 가로줄·세로줄 사이에 장애물이 있으면 공격 무공의 대상으로 고를 수 없다 */
  function los(g, a, b) {
    if (!g) return true; var i;
    if (a.y === b.y) { for (i = Math.min(a.x, b.x) + 1; i < Math.max(a.x, b.x); i++) if (g[a.y][i] === "#") return false; }
    if (a.x === b.x) { for (i = Math.min(a.y, b.y) + 1; i < Math.max(a.y, b.y); i++) if (g[i][a.x] === "#") return false; }
    return true;
  }
  /* 사격전 간격: 고지에서 아래로 +1, 분지에서 밖으로 −1 */
  function elev(g, a, b) { if (!g) return 0; var f = g[a.y][a.x], t = g[b.y][b.x]; return (f === "^" && t !== "^" ? 1 : 0) - (f === "v" && t !== "v" ? 1 : 0); }
  /* 간격 글 → 숫자. 없으면 -1(대상을 고르지 않는 무공) */
  function range(s) { s = String(s == null ? "" : s); if (/인접/.test(s)) return 1.5; if (/무제한/.test(s)) return 99; var m = /(\d+)\s*~\s*(\d+)/.exec(s); if (m) return +m[2]; m = /(\d+(?:\.\d+)?)/.exec(s); return m ? +m[1] : -1; }
  /* 목표치: 잃은 분야의 특기와 마비된 특기는 기준이 되지 못한다. 못 하면 99 */
  function tn(c, sk, lostFields, para) {
    var A = window.WX_SIM_API; if (!A || !c || !sk) return 99;
    var lost = {}; (lostFields || []).forEach(function (f) { lost[f] = 1; });
    var skills = (c.skills || []).filter(function (s) { return !lost[A.fieldOf(s)] && s !== para; });
    var v = A.targets(Object.assign({}, c, { skills: skills }))[sk];
    return v == null || v >= 24 ? 99 : v;
  }
  window.WX_TAC = { N: N, BLOCK: BLOCK, flat: flat, stepCost: stepCost, reach: reach, reachPass: reachPass, dist: dist, los: los, elev: elev, range: range, tn: tn };
})();
