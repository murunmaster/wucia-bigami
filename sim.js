/* ───────── 전투 시뮬 ─────────
   룰북 '전투'를 따라 6×6 판에서 싸움을 돌린다.
   - 공력 설정 → 높은 순서로 이동 → 높은 순서로 턴(같은 공력은 동시행동: 결과는 그 공력 끝에 한꺼번에)
   - 명중 판정 → 회피 판정 → 데미지(접근전 1d6 분야 / 사격전 고름 / 집단전 상태이상표)
   - 판정 결과가 설정 공력 미만이면 주화입마(그 라운드 판정 불가), 6·6은 스페셜(대미지 +1)
   - 생명력은 분야 6칸. 잃은 분야의 익힌 특기는 판정치의 기준이 되지 못한다(시노비가미식)
   - 무공 효과는 fx.js(WX_FX)의 효과 표기를 따른다(표기 규칙은 아래 parseClause 위 설명).
   - 오의는 형태의 숫자와 개조(강점·약점)를 따른다.
   app.js가 window.WX_SIM_API를 열어 주면 동작한다. */
(function () {
  "use strict";
  var A = null;
  var FIELDS = ["병기", "외공", "내공", "강호", "지략", "술법"];
  var TERRAIN = ["평지", "고소", "수중", "악천후", "악지", "극지"];
  var STATUS = ["고장", "마비", "외상", "행방불명", "망각", "내상"];
  var CURE = { "고장": "도구", "마비": "단련", "외상": "의술", "행방불명": "추적", "망각": "섭혼", "내상": "운기", "한기": "양기", "빙결": "양기", "단장독": "의술" };
  var N = 6, LV = ["삼류", "이류", "일류", "절정", "화경", "현경"];
  /* 규칙 손잡이. 오의는 2차 개편안(확정) 값. 무공 쪽(mukLvDm 등)은 무공 개편 전이라 지금 룰북 그대로 */
  var RULES = { ogNear: 3, ogFar: 2, ogWide: 1, ogGuard: 2, ogCounter: 2, ogSpend: true, ogCheck: false, killDeclare: true, mukLvDm: 0, mukCostDown: 0, signature: {}, mkCap: 3, condOff: {}, mkOff: {}, mkLose: {}, mkTick: {}, mkBurst: {}, newOg: { chainN: 3, chainAdv: 1, drainCl: 2, drainHp: 2, dashMv: 4, dashHd: 2, dashEd: 1, dashDm: 1, dashNeg: 1, auraDr: 1, auraDur: 2, auraSt: true, auraOnce: 3 } };

  function d6() { return 1 + Math.floor(Math.random() * 6); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function num(s, dflt) { var m = /(-?\d+(?:\.\d+)?)/.exec(String(s == null ? "" : s)); return m ? Number(m[1]) : dflt; }
  function lvi(f) { return Math.max(0, LV.indexOf((f.c && f.c.lv) || "삼류")); }

  /* ── 효과 표기 ──
     무공 = 절 ; 절.  절 = 트리거[조건,...] 효과 ... /r1|/bN
     트리거 P상시 X이 공격 A공격 성공(대상마다) F공격이 회피당함 H명중 직전 E회피 직전(또는 노려졌을 때)
            D대미지 받을 때 T내 턴 S공격 성공 직후 V회피 성공 직후 R공력 공개 직후 Z라운드 끝 N전투 밖 ?다루지 못함
     효과   [self:|ally:|allies:|foe:|foes:]키[:인자][수] [@조건] [~지속] [#횟수] */
  var FXC = {};
  function compile(name) {
    if (FXC[name]) return FXC[name];
    var src = (window.WX_FX || {})[name], out = { cl: [], none: false, unk: false, outside: false, raw: src };
    if (src == null) { out.none = true; FXC[name] = out; return out; }
    String(src).split(" ; ").forEach(function (s, i) {
      s = s.trim(); if (!s) return;
      var m = /^([PXAFHEDTSVRZN?])(?:\[([^\]]*)\])?\s*(.*?)\s*(?:\/([rb])(\d+))?$/.exec(s);
      if (!m) return;
      if (m[1] === "N") { out.outside = true; return; }
      if (m[1] === "?") { out.unk = true; return; }
      var cl = { id: name + "#" + i, trig: m[1], conds: m[2] ? m[2].split(",").map(function (x) { return x.trim(); }).filter(Boolean) : [], effs: [], lim: m[4] ? { t: m[4], n: Number(m[5]) } : null };
      m[3].split(/\s+/).filter(Boolean).forEach(function (t) { cl.effs.push(parseEff(t)); });
      out.cl.push(cl);
    });
    FXC[name] = out; return out;
  }
  function parseEff(t) {
    var e = { raw: t, who: "", key: "", arg: "", v: 0, sub: "", dur: 0, uses: 0 };
    var w = /^(self|ally|allies|foe|foes):/.exec(t); if (w) { e.who = w[1]; t = t.slice(w[0].length); }
    var u = /#(\d+)/.exec(t); if (u) { e.uses = Number(u[1]); t = t.replace(u[0], ""); }
    var d = /~(\d+)/.exec(t); if (d) { e.dur = Number(d[1]); t = t.replace(d[0], ""); }
    var at = t.indexOf("@"); if (at >= 0) { e.sub = t.slice(at + 1); t = t.slice(0, at); }
    var k = /^([a-z]+)/.exec(t); e.key = k ? k[1] : t; var rest = t.slice(e.key.length);
    if (rest.charAt(0) === ":") { e.arg = rest.slice(1); var n2 = /(-?[\d.]+)$/.exec(e.arg); e.v = n2 && !/^[a-z]/.test(e.arg) ? 0 : 0; if (/^[sc]\d$/.test(e.arg)) e.v = Number(e.arg.slice(1)); }
    else if (rest) e.v = Number(rest.replace(/^\+/, "")) || 0;
    if (!rest && e.v === 0) e.v = 1;
    return e;
  }
  /* 시뮬이 실제로 처리하는 효과 키 */
  var IMPL = ("ha ea ed hd dm dr r rng cl mv hp adv all cure curesk fum cost noev nofum noreduce rr noterr nohigh nowater nocold st push pull pushhard heal mend cleanse cleanseall unstun move c s g " +
    "noatk nosup noougi noequip noatkfld noatkme taunt stun area as lvr uses postmv premv selfhurt pay evsk evbest evself evfld noevadv pierce aline centerdm sixv onlyzone adjbefore " +
    "redirect dodge reflect reflectadj absorb exp vuln vulnr mark hdme immob mvcap powcap powlt dispel splash splashall again passst traitor debt debtdm debtback curse burn noheal nohide hide unhide posthide keephide lurk seehidden " +
    "execute finish kill water zone immovable nostun endure nodeath lastround immune immunest thorns thornsd thornsmiss aura stunatk stunev lostok altsk setsk hdmulti forcereev bank nomvdebuff nopull ignoreg stpick twoatk " +
    "burst mk mkclr mkpop mkdm mkadj smkdm zmk zmkfoe seen hurttraitor starttraitor hurtmk smkhit starthide rage steal evmk startmk noburst predict predwide predall unyoka bloodpay bloodhit supmk allyhurtmk mvmk needmv zmkhurt zally powhi mkuse smkv keepmk nomk mkplus extra hit crit tfum evbeat evtwice blur negc negall sanct yoka fury both drunk rainbow first endst stackdm selfpowcap setterr onev chillup graze noevb asatk ").split(/\s+/);
  var IMPLS = {}; IMPL.forEach(function (k) { if (k) IMPLS[k] = 1; });
  function fxGaps(name) {
    var o = compile(name), miss = {};
    o.cl.forEach(function (cl) { cl.effs.forEach(function (e) { if (!IMPLS[e.key]) miss[e.key] = 1; }); });
    return { unk: o.unk || Object.keys(miss).length > 0, none: o.none, outside: o.outside && !o.cl.length && !o.unk };
  }

  /* ── 거리 ── */
  function dist(a, b) { var dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y), mn = Math.min(dx, dy), mx = Math.max(dx, dy); return mx - mn + 1.5 * mn; }
  function cheb(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
  function inLine(a, b) { var dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y); return dx === 0 || dy === 0 || dx === dy; }
  function rangeOf(r) {
    r = String(r || "");
    if (r === "—" || r === "" || r === "가변") return 1;
    if (/인접/.test(r)) return 1.5;
    if (/상하좌우/.test(r)) return 1;
    if (/무제한/.test(r)) return 99;
    var m = /(\d+)\s*~\s*(\d+)/.exec(r); if (m) return Number(m[2]);
    return num(r, 1);
  }
  function choices(sk) {
    sk = String(sk || "");
    if (!sk || sk === "—") return [];
    if (/자유/.test(sk)) return A.skills();
    var m = /^(.+?)\s*중\s*1/.exec(sk);
    if (m) return m[1].split(/[·,]/).reduce(function (acc, x) { x = x.trim(); if (FIELDS.indexOf(x) >= 0) return acc.concat(A.skills().filter(function (s) { return A.fieldOf(s) === x; })); return acc.concat([x]); }, []);
    return [sk];
  }

  /* ── 무공 → 공격·보조·상시 ── */
  function readAttack(r) {
    var e = r.e || "", o = { name: r.n, t: r.t, sk: r.sk || "—", r: rangeOf(r.r), minR: 0, cost: Math.max(0, num(r.c, 0) - RULES.mukCostDown), line: /직선/.test(r.r || ""), s: r.s || "", g: r.g || "", lv: r.lv || "" };
    var m = /(\d+)\s*~/.exec(r.r || ""); if (m) o.minR = 0;
    var dm = /(접근전|사격전|집단전)(?:\s*(\d+)\s*점)?/.exec(e);
    if (/^대미지 없음/.test(e) || !dm) { o.type = ""; o.dmg = 0; }
    else { o.type = dm[1]; o.dmg = dm[1] === "집단전" ? 1 : Number(dm[2] || 1); if (o.type !== "집단전" && !r.v4) { var li = LV.indexOf(o.lv); if (RULES.mukLvDm && li >= (RULES.mukLvFrom == null ? 3 : RULES.mukLvFrom)) o.dmg += RULES.mukLvDm; if (RULES.mukHiDm && li >= 4) o.dmg += RULES.mukHiDm; if (RULES.mukAllDm) o.dmg += RULES.mukAllDm; } }
    if (RULES.signature[r.n] && o.type && o.type !== "집단전") { o.dmg += 1; o.cost = Math.max(0, o.cost - 1); }
    o.area = /전원/.test(e) ? (/5×5/.test(e) ? "blast2" : /3×3|둘레 8칸/.test(e) ? "blast" : /십자/.test(e) ? "cross" : /곧게|방향/.test(e) ? "line" : "all") : "one";
    var up = /(\d)명까지/.exec(e); if (up) { o.area = "upto"; o.k = Number(up[1]); }
    if (/자신에게서 2칸 안/.test(e) && o.area !== "one") { o.r = 2; o.area = "all"; }
    return o;
  }

  /* ── 투사 ── */
  var UID = 0;
  function makeFighter(c, opt) {
    opt = opt || {};
    c = A.fix(JSON.parse(JSON.stringify(c)));
    if (!c.atk) A.autoAtk(c);
    var f = {
      id: "f" + (++UID), name: c.name || "이름 없음", side: opt.side || 0, c: c, grade: opt.grade || "무인", pc: !!opt.pc, ctrl: opt.ctrl || null,
      lost: {}, extra: 0, pool: 0, pos: null, st: {}, buffs: [], ogUsed: {}, ogReuse: false, out: false, dead: false, mk: {},
      pow: 0, spent: 0, stun: false, dealt: 0, ogUse: 0, used: {}, lim: {}, hidden: 0, debt: 0, traitor: false,
      R: {}, B: { hurtBy: {}, dealtTo: {}, atkUsed: 0, names: {} }, last: { atk: false }
    };
    f.mgs = (c.mg || []).map(function (n) { var r = A.find(n); return r ? { r: r, fx: compile(r.n) } : null; }).filter(Boolean);
    f.passive = []; f.attacks = []; f.supports = [];
    var basic = { name: "접근전 공격", t: "공격", sk: c.atk || "", r: 1, minR: 0, cost: 0, type: "접근전", dmg: 1, area: "one", cl: [], s: c.school || "", basic: true };
    f.attacks.push(basic);
    f.mgs.forEach(function (m) {
      var cl = m.fx.cl;
      cl.filter(function (x) { return x.trig === "P"; }).forEach(function (x) { f.passive.push(x); });
      if (m.r.t === "공격") {
        var a = readAttack(m.r); a.cl = cl.filter(function (x) { return "XAF".indexOf(x.trig) >= 0; });
        a.cl.filter(function (x) { return x.trig === "X"; }).forEach(function (x) { x.effs.forEach(function (e) { applyStatic(a, e, f); }); });
        if (a.type || a.cl.some(function (x) { return x.trig === "A"; })) f.attacks.push(a);
      } else if (m.r.t === "보조") {
        cl.filter(function (x) { return "HEDTSVRZ".indexOf(x.trig) >= 0; }).forEach(function (x) { f.supports.push({ n: m.r.n, sk: m.r.sk || "—", cost: num(m.r.c, 0), rng: rangeOf(m.r.r), cl: x, trig: x.trig }); });
      }
    });
    /* 상시 수치 */
    f.passive.forEach(function (x) { if (x.conds.length) return; x.effs.forEach(function (e) { if (e.key === "hp" && !e.who) f.extra += e.v; }); });
    f.flags = {};
    f.passive.forEach(function (x) { if (x.conds.length || x.lim) return; x.effs.forEach(function (e) { if (!e.sub && !e.v) return; if (["immovable", "nostun", "nohigh", "nowater", "nocold", "noterr", "rr", "endure", "nodeath", "lastround", "stunatk", "stunev", "lostok", "seehidden", "lurk", "nomvdebuff", "nopull", "stpick", "drunk", "ignoreg", "hdmulti", "bank", "debtback"].indexOf(e.key) >= 0) f.flags[e.key] = e.arg || true; if (e.key === "immune") f.flags["im_" + e.arg] = true; }); });
    if (f.flags.drunk) f.drunk = true;
    f.unparsed = f.mgs.filter(function (m) { var g = fxGaps(m.r.n); return g.unk || g.none; }).map(function (m) { return m.r.n; });
    f.ougi = (window.WX_OG ? WX_OG.migrate(c.ougi, (c.group || "") + " " + (c.school || "")).list : (c.ougi || [])).filter(function (o) { return o && o.form; }).map(function (o, i) { return { i: i, name: o.name || "무명 오의", form: o.form, skill: o.skill, mods: o.mods || [] }; });
    if (f.grade === "졸개") { f.pool = 1; f.extra = 0; }
    if (f.grade === "이물") f.pool = Math.max(1, Number(opt.hp) || 4);
    if (f.grade === "두목") f.extra += Math.max(0, Number(opt.bossHp) || 0);
    return f;
  }
  /* X 절 가운데 조건 없이 공격의 꼴을 바꾸는 것 */
  function applyStatic(a, e, f) {
    if (e.key === "area" && e.arg) { var m = /^upto(\d)/.exec(e.arg); if (m) { a.area = "upto"; a.k = Number(m[1]); } else a.area = e.arg; }
    else if (e.key === "rng" && !e.who) a.r = e.v;
    else if (e.key === "as") { var t = e.arg.charAt(0); a.type = t === "s" ? "사격전" : t === "c" ? "접근전" : "집단전"; a.dmg = Number(e.arg.slice(1)) || 0; if (a.dmg === 0 && t === "s") a.type = "사격전"; }
    else if (e.key === "lvr") { var L = e.arg.split(",").map(Number), i = lvi(f); a.r = i < 2 ? L[0] : i < 4 ? L[1] : L[2]; }
    else if (e.key === "uses") a.uses = e.v;
    else if (e.key === "needmv") a.needmv = Number(e.arg) || 3;
    else if (e.key === "aline") a.aline = true;
  }

  function hpLeft(f) { return f.pool ? f.pool : FIELDS.filter(function (x) { return !f.lost[x]; }).length + f.extra; }
  function alive(f) { return !f.out; }
  function isMg(f) { return f.grade === "이물" || !!f.yoka || f.buffs.some(function (b) { return b.key === "yoka"; }) || f.mgs.some(function (m) { return m.r.s === "마공"; }); }

  /* 판정치: 잃은 분야와 마비된 특기는 기준에서 뺀다 */
  function tnOf(f, sk) {
    var key = Object.keys(f.lost).sort().join() + "|" + (f.st["마비"] || "") + "|" + (f.flags.lostok || hasBuff(f, "lostok") ? 1 : 0);
    if (f._tnKey !== key) {
      var lostOk = f.flags.lostok || hasBuff(f, "lostok");
      var skills = (f.c.skills || []).filter(function (s) { var fl = A.fieldOf(s); return (lostOk || !f.lost[fl]) && s !== f.st["마비"]; });
      f._tn = A.targets(Object.assign({}, f.c, { skills: skills })); f._tnKey = key;
    }
    var best = 99;
    choices(sk).forEach(function (s) { var t = f._tn[s]; if (t !== undefined && t < best) best = t; });
    return best >= 24 ? 99 : best;
  }
  function bestSkill(f, sk) { var b = null, bt = 99; choices(sk).forEach(function (s) { var t = tnOf(f, s); if (t < bt) { bt = t; b = s; } }); return b || sk; }
  function hasBuff(f, k) { return f.buffs.some(function (b) { return b.key === k; }); }

  /* ── 한 판 ── */
  function Battle(fighters, opt) {
    this.f = fighters; this.opt = opt || {}; this.round = 0; this.log = []; this.zones = [];
    this.map = this.opt.map || null; this.grid = this.map ? this.map.g : null;
    this.terrain = this.opt.terrain || "평지"; this.maxRounds = this.opt.maxRounds || 15; this.quiet = !!this.opt.quiet;
    this.place();
  }
  var B = Battle.prototype;
  B.say = function (s, cls) { if (!this.quiet) { this.log.push({ r: this.round, s: s, c: cls || "" }); if (this.opt.onLog) this.opt.onLog(); } };
  B.cellOf = function (f) { return this.grid ? this.grid[f.pos.y][f.pos.x] : "."; };
  B.place = function () {
    var used = {}, self = this;
    if (this.map && this.map.a.length && this.map.b.length) {
      [0, 1].forEach(function (side) {
        var st = (side === 0 ? self.map.a : self.map.b).slice(), i, x, y;
        for (i = 0; i < 36; i++) { x = side === 0 ? Math.floor(i / 6) : 5 - Math.floor(i / 6); y = [2, 3, 1, 4, 0, 5][i % 6]; if (!WX_TAC.BLOCK[self.grid[y][x]]) st.push([x, y]); }
        self.f.filter(function (f) { return f.side === side; }).forEach(function (f) { for (var k = 0; k < st.length; k++) if (!used[st[k].join()]) { used[st[k].join()] = 1; f.pos = { x: st[k][0], y: st[k][1] }; break; } });
      });
      return;
    }
    [0, 1].forEach(function (side) {
      var list = self.f.filter(function (f) { return f.side === side; }), cols = side === 0 ? [0, 1] : [5, 4], k = 0;
      list.forEach(function (f) { var ys = [2, 3, 1, 4, 0, 5]; while (k < 12) { var x = cols[Math.floor(k / 6)], y = ys[k % 6]; k++; if (!used[x + "," + y]) { used[x + "," + y] = 1; f.pos = { x: x, y: y }; break; } } });
    });
  };
  B.at = function (x, y) { return this.f.filter(function (f) { return alive(f) && f.pos.x === x && f.pos.y === y; })[0] || null; };
  B.foes = function (f) { return this.f.filter(function (g) { return alive(g) && g.side !== f.side; }); };
  B.friends = function (f) { return this.f.filter(function (g) { return alive(g) && g.side === f.side; }); };
  B.adjAllies = function (f) { return this.friends(f).filter(function (g) { return g !== f && cheb(g.pos, f.pos) <= 1; }); };
  B.adjFoes = function (f) { return this.foes(f).filter(function (g) { return cheb(g.pos, f.pos) <= 1; }); };
  B.over = function () { var a = this.f.some(function (f) { return alive(f) && f.side === 0; }), b = this.f.some(function (f) { return alive(f) && f.side === 1; }); return !a || !b; };
  B.inZone = function (f, kind, side) { return this.zones.filter(function (z) { return (!kind || z.kind === kind) && (side == null || z.side === side) && cheb(z.c, f.pos) <= z.rad; }); };
  B.water = function (f) { return this.terrain === "수중" || this.cellOf(f) === "w" || this.inZone(f, "water").some(function (z) { return z.side !== f.side || true; }); };

  /* ── 조건 ── */
  B.cond = function (c, me, foe, atk) {
    if (!c) return true;
    if (c.charAt(0) === "!") return !this.cond(c.slice(1), me, foe, atk);
    if (RULES.condOff[c] || RULES.condOff[c.split(">")[0]]) return false;
    var self = this, m;
    if (c.indexOf("|") >= 0 && !/^(sk|msk|fld|mfld|msch|terr):/.test(c)) return c.split("|").some(function (x) { return self.cond(x, me, foe, atk); });
    var F = foe || {}, fp = F.pos, P = me.pos;
    if (c === "c" || c === "s" || c === "g") return !!atk && atk.type === { c: "접근전", s: "사격전", g: "집단전" }[c];
    if ((m = /^(m?sk):(.+)$/.exec(c))) { if (!atk) return false; var sks = m[2].split("|"); return sks.some(function (s) { return atk.sk === s || atk.sk.indexOf(s) >= 0 || atk._sk === s; }); }
    if ((m = /^(m?fld):(.+)$/.exec(c))) { if (!atk) return false; var fl = A.fieldOf(atk._sk || bestSkill(me, atk.sk)); return m[2].split("|").indexOf(fl) >= 0; }
    if ((m = /^msch:(.+)$/.exec(c))) { if (!atk) return false; return m[1].split("|").indexOf(atk.s) >= 0 || m[1].split("|").indexOf(atk.g) >= 0; }
    if ((m = /^terr:(.+)$/.exec(c))) return m[1].split("|").indexOf(this.terrain) >= 0;
    if ((m = /^lv>=(.+)$/.exec(c))) return lvi(me) >= LV.indexOf(m[1]);
    if ((m = /^pow>=\+(\d+)$/.exec(c))) return !!foe && me.pow >= F.pow + Number(m[1]);
    if ((m = /^pow>=(\d+)$/.exec(c))) return me.pow >= Number(m[1]);
    if ((m = /^pow<=(\d+)$/.exec(c))) return me.pow <= Number(m[1]);
    if ((m = /^pow=(\d+)$/.exec(c))) return me.pow === Number(m[1]);
    if (c === "pow>") return !!foe && (me.pow > F.pow || hasBuff(me, "powhi"));
    if (c === "pow<") return !!foe && me.pow < F.pow;
    if (c === "odd") return me.pow % 2 === 1;
    if (c === "even") return me.pow % 2 === 0;
    if ((m = /^hp<=(\d+)$/.exec(c))) return hpLeft(me) <= Number(m[1]) || (Number(m[1]) >= 3 && hasBuff(me, "rage"));
    if (c === "hurtme") return !!me.R.hurt;
    if ((m = /^hp>=(\d+)$/.exec(c))) return hpLeft(me) >= Number(m[1]);
    if ((m = /^thp<=(\d+)$/.exec(c))) return !!foe && hpLeft(F) <= Number(m[1]);
    if (c === "hp<") return !!foe && hpLeft(me) < hpLeft(F);
    if (c === "hp>") return !!foe && hpLeft(me) > hpLeft(F);
    if (c === "thp<") return !!foe && hpLeft(F) < hpLeft(me);
    var JZ = me.mk["강시"] ? Math.min(2, me.mk["강시"]) : Math.min(1, me.mk["종자"] || 0); /* 종자(강시·표물·동료)는 주인 곁에 선 아군으로 친다 */
    if (c === "adj") return this.adjAllies(me).length + JZ > 0;
    if (c === "alone") return this.adjAllies(me).length === 0;
    if (c === "adj2") return this.adjAllies(me).length + JZ >= 2;
    if (c === "adjother") return this.adjAllies(me).some(function (g) { return g.c && me.c && g.c.school !== me.c.school; });
    if (c === "alone2") return !this.friends(me).some(function (g) { return g !== me && cheb(g.pos, P) <= 2; });
    if (c === "nofoeadj") return this.adjFoes(me).length === 0;
    if ((m = /^foesadj(\d+)$/.exec(c))) return this.adjFoes(me).length >= Number(m[1]);
    if ((m = /^tadj(\d+)$/.exec(c))) return !!foe && this.friends(me).filter(function (g) { return g !== me && cheb(g.pos, fp) <= 1; }).length + (JZ && cheb(me.pos, fp) <= 1 ? 1 : 0) >= Number(m[1]);
    if (c === "duel") { if (!foe) return false; var af = this.adjFoes(me); return af.length === 1 && af[0] === F && this.f.filter(function (g) { return alive(g) && g !== me && g !== F && cheb(g.pos, fp) <= 1; }).length === 0; }
    if (c === "mg") return !!foe && isMg(F);
    if (c === "lvhi") return !!foe && lvi(F) > lvi(me);
    if (c === "lvhi2") return !!foe && lvi(F) >= lvi(me) + 2;
    if (c === "lvlo") return !!foe && lvi(F) < lvi(me);
    if (c === "r1") return this.round === 1;
    if (c === "still") return !me.R.moved;
    if (c === "moved") return !!me.R.moved;
    if ((m = /^mv>=(\d+)$/.exec(c))) return (me.R.moved || 0) >= Number(m[1]);
    if (c === "tmoved") return !!foe && !!F.R.moved;
    if (c === "tstill") return !!foe && !F.R.moved;
    if ((m = /^far>=(\d+)$/.exec(c))) return !!foe && dist(P, fp) >= Number(m[1]);
    if (c === "ortho") return !!foe && (P.x === fp.x || P.y === fp.y);
    if (c === "rge2") return !!atk && atk.r >= 2;
    if (c === "stat") return !!foe && Object.keys(F.st).length > 0;
    if (c === "timmob") return !!foe && (hasBuff(F, "immob") || !!F.st["빙결"]);
    if (c === "tchill") return !!foe && !!(F.st["한기"] || F.st["빙결"]);
    if (c === "tfrozen") return !!foe && !!F.st["빙결"];
    if ((m = /^([ts])mk:([^>]+?)(?:>=(\d+))?$/.exec(c))) { var who0 = m[1] === "t" ? F : me; return (!!who0.mk && (who0.mk[m[2]] || 0) >= Number(m[3] || 1)); }
    if (c === "unspent") return me.pow - me.spent > 0;
    if (c === "unspent2") return me.pow - me.spent >= 2;
    if (c === "tpred") return !!foe && (hasBuff(me, "predall") || !!(me.R.pred && me.R.pred[F.id]));
    if (c === "predok") return hasBuff(me, "predall") || !!(me.R.pred && Object.keys(me.R.pred).length);
    if (c === "tadjme") return !!foe && cheb(P, fp) <= 1;
    if (c === "mystat") return Object.keys(me.st).length > 0;
    if (c === "tbuff") return !!foe && F.buffs.some(function (b) { return POS_KEYS[b.key] && b.v > 0; });
    if (c === "mukatk") return !!atk && !atk.basic;
    if (c === "ttraitor") return !!foe && F.traitor;
    if (c === "tdebt") return !!foe && F.debt > 0;
    if (c === "tzone") return !!foe && this.zones.some(function (z) { return cheb(z.c, fp) <= z.rad; });
    if (c === "water") return this.water(me);
    if (c === "twater") return !!foe && this.water(F);
    if (c === "hidden") return me.hidden > 0 || !!me.R.hidAtk;
    if (c === "rested") return !me.last.atk;
    if (c === "drunk") return !!me.drunk;
    if (c === "yoka") return !!me.yoka || hasBuff(me, "yoka");
    if (c === "fury") return hasBuff(me, "fury");
    if (c === "calm") return !hasBuff(me, "fury") || hasBuff(me, "both");
    if (c === "both") return hasBuff(me, "both");
    if (c === "tnotacted") return !!foe && !F.R.acted;
    if (c === "tatkd") return !!foe && !!F.R.atk;
    if (c === "tatkb") return !!foe && F.B.atkUsed > 0;
    if (c === "tatked") return !!foe && !!F.R.atkOn && Object.keys(F.R.atkOn).some(function (id) { var g = self.byId(id); return g && g.side === me.side && (g === me || cheb(g.pos, P) <= 1); });
    if (c === "tusedsup") return !!foe && !!F.R.sup;
    if (c === "usedsup") return !!me.R.sup;
    if (c === "nosupround") return !me.R.sup;
    if (c === "firstatk") return me.B.atkUsed === 0;
    if (c === "firstuse") return !!atk && !me.B.names[atk.name];
    if (c === "firstact") return !me.R.acted;
    if (c === "noatkyet" || c === "noatkturn" || c === "noatkround") return !me.R.atk;
    if (c === "atked") return !!me.R.atk;
    if (c === "thit") return !!foe && !!F.R.hitBySide && F.R.hitBySide[me.side] > 0;
    if (c === "thurt") return !!foe && !!F.R.hurt;
    if (c === "thurtme") return !!foe && Object.keys(F.B.dealtTo).some(function (id) { var g = self.byId(id); return g && g.side === me.side; });
    if (c === "thurtally") return !!foe && !!F.R.dealtTo && Object.keys(F.R.dealtTo).some(function (id) { var g = self.byId(id); return g && g !== me && g.side === me.side && cheb(g.pos, P) <= 1; });
    if (c === "hurtby") return !!foe && (!!me.R.hurtBy[F.id] || !!me.last.hurtBy && !!me.last.hurtBy[F.id]);
    if (c === "hurtbyb") return !!foe && !!me.B.hurtBy[F.id];
    if (c === "tdealt") return !!foe && !!me.B.dealtTo[F.id];
    if (c === "tevaded") return !!foe && !!me.R.evaded && !!me.R.evaded[F.id];
    if (c === "tmissed") return !!foe && !!F.R.missed;
    if ((m = /^tcost(\d+)$/.exec(c))) return !!foe && F.spent >= Number(m[1]);
    if (c === "allyout") return this.f.some(function (g) { return g.side === me.side && g.out; });
    if (c === "highest") return !this.f.some(function (g) { return alive(g) && g.pow > me.pow; });
    if (c === "lowest") return !this.f.some(function (g) { return alive(g) && g.pow < me.pow; });
    return false; /* 모르는 조건은 거짓 */
  };
  B.byId = function (id) { return this.f.filter(function (g) { return g.id === id; })[0]; };
  B.limOk = function (f, cl) { if (!cl.lim) return true; var k = cl.id + (cl.lim.t === "r" ? "@" + this.round : ""); return (f.lim[k] || 0) < cl.lim.n; };
  B.limUse = function (f, cl) { if (!cl.lim) return; var k = cl.id + (cl.lim.t === "r" ? "@" + this.round : ""); f.lim[k] = (f.lim[k] || 0) + 1; };
  B.clOk = function (f, cl, foe, atk) { var self = this; return this.limOk(f, cl) && cl.conds.every(function (c) { return self.cond(c, f, foe, atk); }); };

  /* 수치 모으기: 상시(P)·버프·오라·영역·이 공격(X)·고른 보조(H/E)
     commit이면 횟수 제한을 쓴 것으로 친다 */
  B.mod = function (f, key, foe, atk, extra, commit) {
    var sum = 0, self = this, usedCl = [];
    function eff(e, owner, cl, foeCtx) {
      if (e.key === "smkv") { var q3 = e.arg.split(":"); if (q3[0] === key) sum += Math.min(Number(q3[2] || 3), owner.mk[q3[1]] || 0); return; }
      if (key === "dm" && e.key === "smkdm") { var q2 = e.arg.split(":"); sum += Math.min(Number(q2[1] || 3), owner.mk[q2[0]] || 0); return; }
      if (key === "dm" && e.key === "mkdm") { var q = e.arg.split(":"); if (foeCtx && foeCtx.mk) sum += Math.min(Number(q[1] || 3), foeCtx.mk[q[0]] || 0); return; }
      if (e.key !== key) return;
      if (e.who && e.who !== "self") return;
      if (e.sub && !self.cond(e.sub, owner, foeCtx, atk)) return;
      sum += e.v; if (cl && cl.lim) usedCl.push([owner, cl]);
    }
    if (!(hasBuff(f, "noequip"))) f.passive.forEach(function (cl) { if (!self.clOk(f, cl, foe, atk)) return; cl.effs.forEach(function (e) { eff(e, f, cl, foe); }); });
    /* 오라: 인접한 아군의 P aura:키 */
    this.adjAllies(f).forEach(function (g) { g.passive.forEach(function (cl) { if (!self.clOk(g, cl, foe, atk)) return; cl.effs.forEach(function (e) { if (e.key === "aura" && e.arg.replace(/-?\d+$/, "") === key && (!e.sub || self.cond(e.sub, f, foe, atk))) sum += num(e.arg, 1); }); }); });
    f.buffs.forEach(function (b) {
      if (b.key !== key) return;
      if (b.sub && !self.cond(b.sub, f, foe, atk)) return;
      sum += b.v; if (commit && b.uses) { b.uses--; if (b.uses <= 0) b.left = 0; }
    });
    if (atk && atk.cl) atk.cl.forEach(function (cl) { if (cl.trig !== "X" || !self.clOk(f, cl, foe, atk)) return; cl.effs.forEach(function (e) { eff(e, f, cl, foe); }); });
    (extra || []).forEach(function (cl) { cl.effs.forEach(function (e) { eff(e, f, cl, foe); }); });
    if (commit) usedCl.forEach(function (p) { self.limUse(p[0], p[1]); });
    if (commit) f.buffs = f.buffs.filter(function (b) { return b.left > 0; });
    return sum;
  };
  B.flag = function (f, k) { return !!f.flags[k] || hasBuff(f, k); };

  /* 2d6 판정. adv 유불리, flat 보정 */
  B.check = function (f, sk, adv, why, o) {
    o = o || {};
    if (f.stun && !(o.stunOk)) { this.say(f.name + "은(는) 주화입마라 " + why + " 판정을 못 한다", "dim"); return { ok: false, none: true, sum: 0 }; }
    adv = (adv || 0) + this.mod(f, "all", o.foe, o.atk, null, true) + (o.stunOk && f.stun ? -1 : 0);
    if (this.inZone(f, "dis").some(function (z) { return z.side !== f.side; })) adv -= 1;
    if (this.inZone(f, "noadv").some(function (z) { return z.side !== f.side; }) && adv > 0) adv = 0;
    var adSk = 0; f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "adv" && !cl.conds.length && sk && e.arg.replace(/\d+$/, "") === sk) adSk += num(e.arg, 1); }); });
    adv += adSk;
    if (f.instant && !o.noInstant) { var io = f.instant; f.instant = null; this.say(f.name + " — 오의 「" + io.name + "」(순간 성공)으로 " + why + " 성공", "og"); if (io.next) f.buffs.push({ key: "all", v: 1, left: 2, uses: 1 }); return { ok: true, sp: io.sp, sum: 10 }; }
    var tn = tnOf(f, sk);
    if (tn >= 99) { this.say(f.name + "은(는) 《" + sk + "》 판정을 할 수 없다", "dim"); return { ok: false, none: true, sum: 0 }; }
    var k = 2 + Math.abs(adv), ds = []; for (var i = 0; i < Math.min(k, 6); i++) ds.push(d6());
    ds.sort(function (a, b) { return adv >= 0 ? b - a : a - b; });
    var two = ds.slice(0, 2), sum = two[0] + two[1] + (o.flat || 0);
    var sp = (two[0] === 6 && two[1] === 6) || (o.crit && sum >= o.crit && two[0] + two[1] >= o.crit);
    var ok = sp || sum >= tn;
    var fumLine = f.pow + (this.terrain === "악지" ? 1 : 0) + this.mod(f, "fum", o.foe, o.atk) + (o.fumAdd || 0) + (this.inZone(f, "rough").some(function (z) { return z.side !== f.side; }) ? 1 : 0);
    var noFum = f.grade === "졸개" || o.nofum || this.flag(f, "nostun") || (f.drunk && !o.notPow);
    var fum = !sp && !noFum && sum < fumLine;
    /* 뒤집기 오의: 실패를 성공으로 */
    if ((!ok || fum) && f.flip && !o.noInstant) { var fo = f.flip; f.flip = null; f.ogUsed[fo.i] = true; f.ogUse++; this.say(f.name + " — 오의 「" + fo.name + "」(뒤집기)로 결과를 성공으로 바꾼다", "og"); return { ok: true, sum: 10 }; }
    if (fum) { ok = false; f.stun = true; }
    if (!ok && !o.isEv) f.R.missed = f.R.missed || (o.isHit ? true : false);
    this.say(f.name + " " + why + " 《" + sk + "》 " + tn + "+ → [" + ds.join(",") + "]" + (adv ? (adv > 0 ? " 유리" : " 불리") + Math.abs(adv) : "") + (o.flat ? " " + o.flat : "") + " = " + sum + (sp ? " 스페셜!" : ok ? " 성공" : " 실패") + (fum ? " · 주화입마" : ""), sp ? "sp" : fum ? "fum" : ok ? "ok" : "no");
    /* 수중 전장·수면: 판정에 실패하면 접근전 1점(만든 쪽의 수면은 자기 편에게 듣지 않는다) */
    if (!ok && !this._wet && alive(f) && !this.flag(f, "nowater") && (this.terrain === "수중" || this.cellOf(f) === "w" || this.inZone(f, "water").some(function (z) { return z.side !== f.side; }))) {
      this._wet = true; this.say(f.name + " — 물에 휩쓸린다", "hit"); this.hurt(f, "접근전", 1, null); this._wet = false;
    }
    return { ok: ok, sp: sp, fum: fum, sum: sum };
  };

  /* ── 버프·상태이상 ── */
  var POS_KEYS = { powhi: 1, predall: 1, rage: 1, ha: 1, ea: 1, dm: 1, dr: 1, hd: 1, cl: 1, mv: 1, all: 1, r: 1, immovable: 1, immunest: 1, nostun: 1, sanct: 1, blur: 1, negc: 1, negall: 1, yoka: 1, fury: 1, both: 1, graze: 1, lostok: 1, twoatk: 1, nomvdebuff: 1, first: 1 };
  var BUFF_KEYS = "ha ea ed hd dm dr r cl mv all cure fum cost exp vuln vulnr mark hdme immob mvcap noatk nosup noougi noequip noatkfld noatkme taunt sanct blur negc negall immunest immovable nostun lostok yoka fury both graze noevb nomvdebuff first endst nohide noheal powcap drunk twoatk curse keepmk rage nowater predall powhi".split(" ");
  var BUFFS = {}; BUFF_KEYS.forEach(function (k) { BUFFS[k] = 1; });
  B.addBuff = function (t, e, owner, dflt) {
    if (!alive(t)) return;
    var neg = e.v < 0 || ["immob", "mvcap", "noatk", "nosup", "noougi", "noequip", "noatkfld", "noatkme", "taunt", "exp", "vuln", "vulnr", "mark", "hdme", "noevb", "nohide", "noheal", "powcap", "curse", "cost"].indexOf(e.key) >= 0;
    if (neg && t.side !== owner.side && hasBuff(t, "immunest")) return;
    if (neg && (e.key === "mv" || e.key === "immob" || e.key === "mvcap") && this.flag(t, "nomvdebuff")) return;
    var b = { key: e.key, v: e.v, arg: e.arg, sub: e.sub, left: e.dur || dflt || 2, uses: e.uses || 0, src: owner.id };
    if (e.key === "powcap") b.v = num(e.arg || e.raw, 3);
    t.buffs.push(b);
  };
  B.addStatus = function (f, s) {
    if (!alive(f)) return;
    if (s === "?" ) s = STATUS[d6() - 1];
    if (s === "pick") s = f.st["외상"] ? (f.st["내상"] ? "마비" : "내상") : "외상";
    if (f.flags["im_" + s] || hasBuff(f, "immunest")) return;
    if (s === "한기" && (f.flags.nocold || f.flags["im_한기"])) return;
    if (s === "한기" && f.st["한기"]) { s = "빙결"; }
    if (s === "빙결") { f.st["한기"] = true; f.st["빙결"] = this.round + 1; this.say(f.name + " 〔빙결〕", "hit"); return; }
    if (s === "마비") { var sk = (f.c.skills || []).filter(function (x) { return !f.lost[A.fieldOf(x)]; }); f.st[s] = sk.length ? pick(sk) : "?"; }
    else if (s === "내상") { var a = f.attacks.filter(function (x) { return !x.basic; }); f.st[s] = a.length ? pick(a).name : "?"; }
    else f.st[s] = true;
    this.say(f.name + " 상태이상 〔" + s + "〕" + (typeof f.st[s] === "string" ? " (" + f.st[s] + ")" : ""), "hit");
  };
  B.statusRoll = function (f) {
    if (this.flag(f, "ignoreg") && this.limOk(f, { id: f.id + "ig", lim: { t: "r", n: 1 } })) { this.limUse(f, { id: f.id + "ig", lim: { t: "r", n: 1 } }); this.say(f.name + " — 집단전 상태이상을 무시", "dim"); return; }
    var r = STATUS[d6() - 1];
    if (this.flag(f, "stpick")) { var r2 = STATUS[d6() - 1]; var order = ["고장", "망각", "행방불명", "마비", "내상", "외상"]; r = order.indexOf(r) < order.indexOf(r2) ? r : r2; }
    this.addStatus(f, r);
  };

  /* ── 피해 ── */
  B.chooseLoss = function (f) {
    var left = FIELDS.filter(function (x) { return !f.lost[x]; });
    if (!left.length) return null;
    if (f.ctrl && f.ctrl.lossPick) { var p = f.ctrl.lossPick(f, left); if (p && left.indexOf(p) >= 0) return p; }
    var use = {}; f.attacks.forEach(function (a) { choices(a.sk).forEach(function (s) { use[A.fieldOf(s)] = (use[A.fieldOf(s)] || 0) + 2; }); });
    left.sort(function (a, b) { function w(x) { return (use[x] || 0) + (f.c.skills || []).filter(function (s) { return A.fieldOf(s) === x; }).length; } return w(a) - w(b); });
    return left[0];
  };
  /* o: {noreduce, pierce, atk, noev} */
  B.hurt = function (f, type, n, src, o) {
    o = o || {};
    if (!alive(f) || n <= 0 || f.gone) return 0;
    var self = this;
    if (type === "집단전") {
      if (src) { f.R.hurtBy[src.id] = 1; }
      if (f.pool) { this.losePool(f, 1, src); return 1; }
      this.statusRoll(f); return 0;
    }
    var orig = n;
    /* 받는 쪽의 경감 */
    if (!o.noreduce && !hasBuff(f, "vulnr")) {
      if (type === "접근전") { var ng = f.buffs.filter(function (b) { return b.key === "negc"; })[0]; if (ng && this.limOk(f, { id: f.id + "negc", lim: { t: "r", n: 1 } })) { this.limUse(f, { id: f.id + "negc", lim: { t: "r", n: 1 } }); this.say(f.name + " — 접근전 대미지를 무효로 한다", "og"); n = 0; } }
      var dr = this.mod(f, "dr", src, o.atk, o.dsup, true);
      this.zones.forEach(function (z) { if (z.kind === "dr" && z.side === f.side && cheb(z.c, f.pos) <= z.rad && n > 0) dr += z.v; });
      if (o.ogDr) dr += o.ogDr;
      var once0 = f.buffs.filter(function (b) { return b.key === "drOnce" && b.v > 0; })[0]; if (once0 && n > 0) { dr += once0.v; once0.v = 0; }
      if (dr > 0 && n > 0) {
        var cut = Math.min(n, dr); n -= cut; this.say(f.name + " — 대미지 " + cut + "점을 줄인다", "dim");
        if (src && hasBuff(f, "thornsg") && this.limOk(f, { id: f.id + "tg" + src.id, lim: { t: "r", n: 1 } })) { this.limUse(f, { id: f.id + "tg" + src.id, lim: { t: "r", n: 1 } }); this.say(f.name + " — 반진", "og"); this.hurt(src, "집단전", 1, f); }
        var tdx = f.passive.filter(function (cl) { return cl.effs.some(function (e) { return e.key === "thornsd"; }) && self.clOk(f, cl, src, o.atk); })[0];
        if (tdx && src) { this.limUse(f, tdx); var te = tdx.effs.filter(function (e) { return e.key === "thornsd"; })[0]; if (te.arg === "g") this.hurt(src, "집단전", 1, f); else if (te.arg === "debt") src.debt++; }
      }
      if (o.pierce && orig > 0 && n < 1) n = 1;
    }
    if (n <= 0) return 0;
    if (src && o.og) src.ogDealt = (src.ogDealt || 0) + n;
    if (src) { src.dealt += n; src.B.dealtTo[f.id] = 1; src.R.dealtTo = src.R.dealtTo || {}; src.R.dealtTo[f.id] = 1; f.R.hurtBy[src.id] = 1; f.B.hurtBy[src.id] = 1; if (src.flags.debtback) {} }
    if (src && f.flags.debtback && this.limOk(f, { id: f.id + "db", lim: { t: "r", n: 1 } })) { this.limUse(f, { id: f.id + "db", lim: { t: "r", n: 1 } }); src.debt++; }
    this.f.forEach(function (g) { if (alive(g) && g.side === f.side && (g === f || cheb(g.pos, f.pos) <= 1)) g.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "allyhurtmk") self.applyEff({ key: "mk", arg: e.arg, v: 1 }, g, g, {}); }); }); });
    f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "hurtmk" && (!cl.conds.length || self.clOk(f, cl, src, o.atk))) self.applyEff({ key: "mk", arg: e.arg, v: 1 }, f, f, {}); }); });
    if (src && f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "hurttraitor"; }); })) this.applyEff({ key: "traitor", v: 1 }, f, src, {});
    Object.keys(RULES.mkLose).forEach(function (k) { if (f.mk[k] && hasBuff(f, "keepmk")) return; if (f.mk[k] && f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "keepmk" && e.arg === k; }); })) return; if (f.mk[k] && typeof RULES.mkLose[k] === "number") { f.mk[k] = Math.max(0, f.mk[k] - RULES.mkLose[k]); if (!f.mk[k]) delete f.mk[k]; return; } if (f.mk[k]) { delete f.mk[k]; self.say(f.name + " — " + k + "이(가) 흐트러진다", "dim"); } });
    f.R.hurt = true; if (f.hidden) { f.hidden = 0; this.say(f.name + " 은신이 풀린다", "dim"); }
    if (f.pool) { this.losePool(f, n, src); return n; }
    for (var i = 0; i < n && hpLeft(f) > 0; i++) {
      if (f.extra > 0) { f.extra--; this.say(f.name + " 추가 생명력 1 잃음 (남은 " + hpLeft(f) + ")", "hit"); continue; }
      var fl = null;
      if (type === "접근전" && !o.choose) { fl = FIELDS[d6() - 1]; if (f.lost[fl]) fl = this.chooseLoss(f); }
      else fl = this.chooseLoss(f);
      if (!fl) break;
      f.lost[fl] = true;
      this.say(f.name + " 생명력 〈" + fl + "〉 잃음 (남은 " + hpLeft(f) + ")", "hit");
    }
    if (hpLeft(f) <= 0) this.ko(f);
    return n;
  };
  B.losePool = function (f, n, src) {
    f.pool = Math.max(0, f.pool - n);
    this.say(f.name + " 생명력 " + n + " 잃음 (남은 " + f.pool + ")", "hit");
    if (f.pool <= 0) this.ko(f);
  };
  B.heal = function (f, n) {
    if (!alive(f) || n <= 0) return 0;
    if (hasBuff(f, "noheal")) { this.say(f.name + "은(는) 생명력을 회복할 수 없다", "dim"); return 0; }
    if (f.pool) return 0;
    var lost = FIELDS.filter(function (x) { return f.lost[x]; }), got = 0;
    while (n > 0 && lost.length) { delete f.lost[lost.shift()]; n--; got++; }
    if (got) this.say(f.name + " 생명력 " + got + " 회복 (남은 " + hpLeft(f) + ")", "ok");
    return got;
  };
  B.cleanse = function (f, all) {
    var ks = Object.keys(f.st); if (!ks.length) return;
    (all ? ks : [ks.sort(function (a, b) { return ["외상", "내상", "마비", "빙결", "한기", "단장독", "행방불명", "망각", "고장"].indexOf(a) - ["외상", "내상", "마비", "빙결", "한기", "단장독", "행방불명", "망각", "고장"].indexOf(b); })[0]]).forEach(function (k) { delete f.st[k]; if (k === "한기") delete f.st["빙결"]; });
    this.say(f.name + " 상태이상을 " + (all ? "모두 " : "") + "푼다", "ok");
  };
  B.ko = function (f) {
    if (f.out) return;
    if (f.flags.endure && !f.used.endure) { f.used.endure = 1; var fl = FIELDS.filter(function (x) { return f.lost[x]; })[0]; if (fl && !f.pool) delete f.lost[fl]; else if (f.pool) f.pool = 1; this.say(f.name + " — 쓰러지지 않고 버틴다 (생명력 1)", "og"); return; }
    if (f.flags.lastround && !f.used.lastround) { f.used.lastround = 1; f.dying = true; this.say(f.name + " — 생명력 0이지만 라운드가 끝날 때까지 싸운다", "og"); return; }
    if (this.f.some(function (g) { return alive(g) && g !== f && g.side === f.side && g.st && g.zoneSave; })) { }
    f.out = true; f.hidden = 0;
    if (f.flags.nodeath) { this.say(f.name + " 탈락 (죽지 않는다)", "out"); return; }
    if (f.pc && !RULES.killDeclare) { this.say(f.name + " 탈락 — 숨통은 끊지 않았다 (전투 뒤 생명력 1 회복)", "out"); return; }
    if (f.pc) {
      if (!this.quiet) this.say("숨통을 끊겠다고 선언한다", "dim");
      var r = d6(); if (r === 1 && f.flags.rr) { r = d6(); }
      if (r === 1) { f.dead = true; this.say(f.name + " 탈락 — 흑관문 1. 사망", "dead"); }
      else this.say(f.name + " 탈락 — 흑관문 " + r + ". 살아남는다", "out");
    } else this.say(f.name + " 탈락", "out");
  };

  /* ── 위치 ── */
  B.free = function (x, y) { return x >= 0 && y >= 0 && x < N && y < N && !this.at(x, y) && !this.blocked(x, y); };
  B.blocked = function (x, y) { return !!(this.grid && WX_TAC.BLOCK[this.grid[y][x]]); };
  B.shove = function (t, from, n, toward) {
    if (!alive(t) || n <= 0) return 0;
    if (this.flag(t, "immovable") || (toward && this.flag(t, "nopull"))) { this.say(t.name + "은(는) 밀리지 않는다", "dim"); return 0; }
    var dx = Math.sign(t.pos.x - from.x), dy = Math.sign(t.pos.y - from.y); if (toward) { dx = -dx; dy = -dy; }
    if (!dx && !dy) return 0;
    var moved = 0;
    for (var i = 0; i < n; i++) {
      var nx = t.pos.x + dx, ny = t.pos.y + dy;
      if (toward && nx === from.x && ny === from.y) break;
      if (!this.free(nx, ny)) break;
      t.pos = { x: nx, y: ny }; moved++;
    }
    if (moved) this.say(t.name + " " + moved + "칸 " + (toward ? "끌려온다" : "밀려난다"), "dim");
    return moved;
  };
  B.stepAway = function (f, n) {
    var foes = this.foes(f), best = f.pos, bs = -1, self = this;
    this.reachable(f, n).forEach(function (c) { var s = Math.min.apply(null, foes.map(function (g) { return cheb(c, g.pos); }).concat([9])); if (s > bs) { bs = s; best = c; } });
    if (best !== f.pos) { f.pos = { x: best.x, y: best.y }; }
  };
  B.teleportNear = function (f, n, tgt) {
    var cells = this.reachable(f, n, true), best = null, bd = 99;
    cells.forEach(function (c) { var d = dist(c, tgt.pos); if (d < bd && d >= 1) { bd = d; best = c; } });
    if (best) f.pos = { x: best.x, y: best.y };
  };

  /* ── 효과 하나 적용 ── */
  B.applyEff = function (e, owner, t, ctx, dflt) {
    if (!t || !alive(t)) return;
    var k = e.key, self = this, m;
    if (e.sub && !this.cond(e.sub, t, owner, ctx && ctx.atk)) return;
    if (BUFFS[k]) { this.addBuff(t, e, owner, dflt || 2); return; }
    switch (k) {
      case "st": this.addStatus(t, e.arg); return;
      case "push": this.shove(t, owner.pos, e.v || 1, false); return;
      case "pull": this.shove(t, owner.pos, e.v || 1, true); return;
      case "pushhard": if (!this.shove(t, owner.pos, e.v || 1, false)) this.hurt(t, "접근전", 1, owner); return;
      case "heal": this.heal(t, e.v || 1); return;
      case "mend": if (FIELDS.some(function (x) { return t.lost[x]; })) this.heal(t, e.v || 1); else this.cleanse(t); return;
      case "cleanse": this.cleanse(t); return;
      case "cleanseall": this.cleanse(t, true); return;
      case "unstun": t.stun = false; return;
      case "c": this.hurt(t, "접근전", e.v || 1, owner); return;
      case "s": this.hurt(t, "사격전", e.v || 1, owner); return;
      case "g": this.hurt(t, "집단전", 1, owner); return;
      case "stun": t.stun = true; return;
      case "dispel": t.buffs = t.buffs.filter(function (b, i) { return !(i === t.buffs.findIndex(function (x) { return POS_KEYS[x.key] && x.v > 0; })); }); return;
      case "splash": case "splashall":
        var others = this.f.filter(function (g) { return alive(g) && g !== t && g.side !== owner.side && cheb(g.pos, t.pos) <= 1; });
        (k === "splash" ? others.slice(0, 1) : others).forEach(function (g) { var tp = e.arg.charAt(0); self.hurt(g, tp === "c" ? "접근전" : tp === "s" ? "사격전" : "집단전", num(e.arg, 1), owner); });
        return;
      case "passst": var ks = Object.keys(owner.st); if (ks.length) { var s0 = ks[0]; delete owner.st[s0]; this.addStatus(t, s0); } else if (e.arg) this.addStatus(t, e.arg); return;
      case "mk": if (RULES.mkCap <= 0) return; var mm = /^(.+?)(?:\*(\d+))?$/.exec(e.arg || ""); if (mm && !RULES.mkOff[mm[1]]) { if (t !== owner && t.passive.some(function (cl) { return cl.effs.some(function (x) { return x.key === "nomk" && x.arg === mm[1]; }); })) return; var plus = 0; if (owner && owner !== t) { var pc0 = owner.passive.filter(function (cl) { return cl.effs.some(function (x) { return x.key === "mkplus" && x.arg === mm[1]; }) && self.limOk(owner, cl); })[0]; if (pc0) { plus = 1; self.limUse(owner, pc0); } } var was = t.mk[mm[1]] || 0; t.mk[mm[1]] = Math.min(RULES.mkCap, was + Number(mm[2] || 1) + plus); if (t.mk[mm[1]] > was) this.say(t.name + " — " + mm[1] + " " + t.mk[mm[1]], "dim"); var bu = RULES.mkBurst[mm[1]]; if (!bu && owner) owner.passive.some(function (cl) { return cl.effs.some(function (x) { if (x.key === "burst" && String(x.arg).split(":")[0] === mm[1]) { bu = String(x.arg).split(":")[1] || "s1"; return true; } }); }); if (bu && t.mk[mm[1]] >= RULES.mkCap && !t.passive.some(function (cl) { return cl.effs.some(function (x) { return x.key === "noburst" && x.arg === mm[1]; }); })) { delete t.mk[mm[1]]; this.say(t.name + " — " + mm[1] + "이(가) 한꺼번에 진다", "og"); this.hurt(t, bu.charAt(0) === "c" ? "접근전" : "사격전", Number(bu.slice(1)) || 1, owner); } } return;
      case "mkadj": var nb = this.f.filter(function (g) { return alive(g) && g !== t && g.side === t.side && cheb(g.pos, t.pos) <= 1; }).sort(function (a, b) { return (a.mk[e.arg] || 0) - (b.mk[e.arg] || 0); })[0]; if (nb) this.applyEff({ key: "mk", arg: e.arg, v: 1 }, owner, nb, ctx); return;
      case "mkuse": var mu = e.arg.split(":"); if (t.mk[mu[0]]) { t.mk[mu[0]] = Math.max(0, t.mk[mu[0]] - Number(mu[1] || 1)); if (!t.mk[mu[0]]) delete t.mk[mu[0]]; } return;
      case "smkhit": var sh = e.arg.split(":"), sn = Math.min(Number(sh[2] || 2), owner.mk[sh[0]] || 0); if (sn) { delete owner.mk[sh[0]]; this.hurt(t, sh[1] === "c" ? "접근전" : "사격전", sn, owner); } return;
      case "steal": var bi = t.buffs.findIndex(function (b) { return POS_KEYS[b.key] && b.v > 0; }); if (bi >= 0) { var sb = t.buffs.splice(bi, 1)[0]; owner.buffs.push(Object.assign({}, sb, { src: owner.id })); this.say(owner.name + " — " + t.name + "의 기세를 빼앗는다", "dim"); } return;
      case "unyoka": t.buffs = t.buffs.filter(function (b) { return b.key !== "yoka"; }); return;
      case "bloodhit": var bt = e.arg.charAt(0) === "c" ? "접근전" : "사격전", bn = num(e.arg, 1); if (t.mk["혈인"]) { t.mk["혈인"]--; if (!t.mk["혈인"]) delete t.mk["혈인"]; this.hurt(t, bt, bn, owner); } else if (hpLeft(owner) > 3) { this.hurt(owner, "사격전", 1, null, { noreduce: true }); this.hurt(t, bt, bn, owner); } return;
      case "bloodpay": if (t.mk["혈인"]) { t.mk["혈인"]--; if (!t.mk["혈인"]) delete t.mk["혈인"]; } else this.hurt(owner, "사격전", 1, null, { noreduce: true }); return;
      case "mkclr": if (t.mk[e.arg]) { this.say(t.name + " — " + e.arg + "을(를) 떨군다", "dim"); delete t.mk[e.arg]; } return;
      case "mkpop": var pp = e.arg.split(":"), pn = t.mk[pp[0]] || 0; if (pn) { delete t.mk[pp[0]]; this.say(t.name + " — " + pp[0] + " " + pn + "송이를 떨군다", "og"); this.hurt(t, pp[1] === "c" ? "접근전" : "사격전", pn, owner); } return;
      case "traitor": if (!t.traitor) { t.traitor = true; this.say(t.name + " — 역적이 된다", "hit"); } return;
      case "debt": t.debt += e.v || 1; return;
      case "burn": t.burn = this.round + 1; return;
      case "hide": if (hasBuff(t, "nohide")) return; if (!this.adjFoes(t).length || e.who) { t.hidden = 2; this.say(t.name + " 은신", "dim"); } return;
      case "unhide": if (t.hidden) { t.hidden = 0; this.say(t.name + " 은신이 풀린다", "dim"); } return;
      case "execute": if (hpLeft(t) <= (e.v || 2)) { this.say(t.name + " — 혼을 빼앗긴다", "hit"); this.kill(t); } else this.hurt(t, "집단전", 1, owner); return;
      case "finish": if (hpLeft(t) <= (e.v || 1)) this.kill(t); return;
      case "kill": this.kill(t); return;
      case "water": this.zones.push({ kind: "water", side: owner.side, c: { x: t.pos.x, y: t.pos.y }, rad: 0, rounds: e.dur || 2 }); return;
      case "rainbow": var r1 = d6(); if (r1 <= 2) this.hurt(t, "사격전", 2, owner); else if (r1 <= 4) { this.hurt(t, "사격전", 1, owner); this.addStatus(t, "마비"); } else if (r1 === 5) { this.addBuff(t, { key: "noatk", v: 1 }, owner, 2); this.addBuff(t, { key: "nosup", v: 1 }, owner, 2); } else { this.hurt(t, "사격전", 2, owner); this.addStatus(t, "마비"); } return;
      case "move": if (ctx && ctx.toward) this.teleportNear(t, e.v || 1, ctx.toward); return;
      case "selfhurt": var tp2 = e.arg.charAt(0); this.hurt(owner, tp2 === "c" ? "접근전" : "사격전", num(e.arg, 1), null, { choose: tp2 !== "c" }); return;
      case "pay": this.hurt(owner, "사격전", e.v || 1, null, { noreduce: true }); return;
      case "zone": this.makeZone(e, owner, t, ctx); return;
      case "powlt": this.addBuff(t, { key: "powcap", v: Math.max(1, owner.pow - 1), raw: "" + Math.max(1, owner.pow - 1) }, owner, 2); return;
      case "selfpowcap": this.addBuff(owner, { key: "powcap", v: e.v || 3, raw: "" + (e.v || 3) }, owner, 2); return;
      case "setterr": this.terrain = e.arg; this.say("전장이 " + e.arg + "(으)로 바뀐다", "dim"); return;
      case "chillup": return;
      case "asatk": owner.R.atk = true; return;
    }
    if (BUFFS[k]) this.addBuff(t, e, owner, dflt || 2);
  };
  B.kill = function (t) { if (!alive(t)) return; t.extra = 0; if (t.pool) t.pool = 0; FIELDS.forEach(function (x) { t.lost[x] = true; }); t.used.endure = 1; t.used.lastround = 1; this.ko(t); };
  B.makeZone = function (e, owner, t, ctx) {
    var p = e.arg.split(":"), kind = p[0], rad = Number(p[1] || 1), at = p[2] === "self" ? owner.pos : (t ? t.pos : owner.pos);
    this.zones.push({ kind: kind, side: owner.side, c: { x: at.x, y: at.y }, rad: rad, rounds: e.dur || 2, owner: owner, evsk: ctx && ctx.evsk });
    this.say(owner.name + " — " + { g: "독", s1: "참절", s1x: "독무", chill: "빙판", water: "물", rough: "돌무더기", dis: "판정 감소", evdis: "회피 감소", nosup: "홀림", noadv: "단천", noougi: "철혼", noatk: "판마정", "cl-1": "흡성", gut: "굿판", noequip: "막비왕토" }[kind] + " 영역", "og");
  };
  /* 대상 고르기를 거친 효과 묶음 적용: who별로 */
  B.applyClause = function (cl, owner, tgt, ctx) {
    var self = this, rng = 3, noev = false, evsk = null;
    cl.effs.forEach(function (e) { if (e.key === "rng") rng = e.v; if (e.key === "noev") noev = true; if (e.key === "evsk") evsk = e.arg; });
    var groups = {};
    cl.effs.forEach(function (e) { if (e.key === "rng" || e.key === "noev" || e.key === "evsk") return; var w = e.who || (ctx.dfltWho || "self"); (groups[w] = groups[w] || []).push(e); });
    Object.keys(groups).forEach(function (w) {
      var list = [];
      if (w === "self") list = [owner];
      else if (w === "ally") { var al = self.friends(owner).filter(function (g) { return dist(g.pos, owner.pos) <= rng; }); al.sort(function (a, b) { return hpLeft(a) - hpLeft(b) || Object.keys(b.st).length - Object.keys(a.st).length; }); list = al.slice(0, 1); }
      else if (w === "allies") list = self.friends(owner).filter(function (g) { return g === owner || dist(g.pos, owner.pos) <= rng; });
      else if (w === "foe") list = tgt ? [tgt] : [];
      else if (w === "foes") list = self.foes(owner).filter(function (g) { return dist(g.pos, owner.pos) <= rng; });
      list.forEach(function (t) {
        if ((w === "foe" || w === "foes") && t.side !== owner.side && !noev && ctx.evade !== false) {
          var sk = evsk || ctx.sk; if (sk && !t.stun) { var ev = self.check(t, sk, 0, "회피"); if (ev.ok) return; }
        }
        groups[w].forEach(function (e) { self.applyEff(e, owner, t, Object.assign({}, ctx, { evsk: evsk }), ctx.dflt); });
      });
    });
  };

  /* ── 오의 ── */
  function ogKind(o) { var f = o.form || ""; return /^일격/.test(f) ? "strike" : /^광역/.test(f) ? "wide" : /각성·판정/.test(f) ? "awake" : /각성·순간/.test(f) ? "instant" : /영역·데미지/.test(f) ? "zdr" : /영역·판정/.test(f) ? "zdis" : /완전방어/.test(f) ? "guard" : /반격/.test(f) ? "counter" : /회복/.test(f) ? "heal" : /^연환/.test(f) ? "chain" : /^흡성/.test(f) ? "drain" : /^신법/.test(f) ? "dash" : /^호신강기/.test(f) ? "aura" : ""; }
  function hasMod(o, n) { return (o.mods || []).some(function (m) { return m === n || m.indexOf(n) === 0; }); }
  function ogRange(o) { var k = ogKind(o), r = /근거리/.test(o.form) ? 2 : /원거리/.test(o.form) ? 4 : k === "wide" ? 4 : 0; if (k === "strike" || k === "wide") r += (hasMod(o, "뻗기") ? 1 : 0) - (hasMod(o, "단척") ? 1 : 0); return r; }
  B.ougiOk = function (f, o, target) {
    if (f.ogUsed[o.i] || hasBuff(f, "noougi")) return false;
    if (this.inZone(f, "noougi").some(function (z) { return z.side !== f.side; })) return false;
    if (hasMod(o, "급류") && f.pow < 4) return false;
    if (hasMod(o, "완보") && f.pow > 3) return false;
    if (hasMod(o, "궁지") && hpLeft(f) > 3) return false;
    if (hasMod(o, "역경") && !Object.keys(f.st).length && !f.stun) return false;
    if (target && hasMod(o, "협의") && hpLeft(target) < hpLeft(f)) return false;
    if (hasMod(o, "소진")) { var it = f.c.items || {}, n = Object.keys(it).reduce(function (s, k) { return s + (it[k] || 0); }, 0) - (f.used.items || 0); if (n <= 0) return false; }
    return true;
  };
  B.ougiReady = function (f, kind) { var self = this; return f.ougi.filter(function (o) { return ogKind(o) === kind && self.ougiOk(f, o); }); };
  /* 오의 격파: 정보가 공개된 오의(호명)를 적이 무효로 한다. 꺾기 오의도 막는다 */
  B.breakOugi = function (f, o, target) {
    var self = this, foes = this.foes(f);
    if (target && target.side !== f.side) {
      var kk = target.ougi.filter(function (q) { return hasMod(q, "꺾기") && self.ougiOk(target, q); })[0];
      if (kk && (ogKind(o) === "strike" || ogKind(o) === "wide")) { target.ogUsed[kk.i] = true; target.ogUse++; this.say(target.name + " — 오의 「" + kk.name + "」(꺾기)로 「" + o.name + "」을 무효로 한다", "og"); return true; }
    }
    if (!hasMod(o, "호명")) return false;
    var br = foes.filter(function (g) { return !g.stun; }).sort(function (a, b) { return tnOf(a, o.skill) - tnOf(b, o.skill); })[0];
    if (!br) return false;
    var r = this.check(br, o.skill, hasMod(o, "비틀기") ? -1 : 0, "오의 격파");
    if (r.ok) { this.say(br.name + " — 「" + o.name + "」 격파", "og"); if (hasMod(o, "반서")) { f.stun = true; this.say(f.name + " — 반서로 주화입마", "fum"); } return true; }
    return false;
  };
  B.useOugi = function (f, o, target, queue) {
    var kk0 = ogKind(o);
    if (RULES.ogCheck && kk0 !== "guard" && kk0 !== "counter") {
      var oc = this.check(f, o.skill, 0, "오의 「" + o.name + "」 발동");
      if (!oc.ok) { f.ogFail = (f.ogFail || 0) + 1; return; }
    }
    f.ogUsed[o.i] = true; f.ogUse++;
    if (RULES.ogSpend && (kk0 === "strike" || kk0 === "wide")) f.R.ogSpent = true;
    if (hasMod(o, "소진")) f.used.items = (f.used.items || 0) + 1;
    var k = ogKind(o), self = this;
    this.say("★ " + f.name + " 오의 「" + o.name + "」 (" + o.form + ((o.mods || []).length ? " · " + o.mods.join("·") : "") + ")", "og");
    if (this.breakOugi(f, o, target)) return;
    var dur = 2 + (hasMod(o, "버티기") ? 1 : 0) - (hasMod(o, "단시") ? 1 : 0);
    if (k === "strike") {
      var dmg = (/근거리/.test(o.form) ? RULES.ogNear : RULES.ogFar) + (hasMod(o, "베기") ? 1 : 0) - (hasMod(o, "미력") ? 1 : 0);
      var tgts = [target];
      var gd = this.aiGuard(target, f, { type: "접근전" }, dmg), gdr = 0;
      if (gd) { this.useOugi(gd.g, gd.o, f, queue); gdr = this.guardAmount(gd.o); if (ogKind(gd.o) === "counter" || hasMod(gd.o, "되받기")) { var cd = (ogKind(gd.o) === "counter" ? 1 : 0) + (hasMod(gd.o, "되받기") ? 1 : 0); queue.push(function () { self.hurt(f, "접근전", cd, gd.g); }); } }
      queue.push(function () {
        var lostAny = false;
        tgts.forEach(function (t) {
          var before = hpLeft(t);
          self.hurt(t, "접근전", dmg, f, { pierce: hasMod(o, "뚫기"), og: true, ogDr: gdr });
          if (hasMod(o, "날리기")) self.hurt(t, "사격전", 1, f);
          if (hpLeft(t) < before) { lostAny = true; if (hasMod(o, "흩뜨리기")) self.statusRoll(t); }
          if (hasMod(o, "결사") && alive(t) && hpLeft(t) > 0) self.hurt(f, "사격전", 2, null);
        });
        if (lostAny && hasMod(o, "삼키기")) self.heal(f, 1);
      });
    } else if (k === "wide") {
      var cells = 4 + (hasMod(o, "뻗기") ? 1 : 0) - (hasMod(o, "단척") ? 1 : 0);
      var hit = this.f.filter(function (g) { return alive(g) && (hasMod(o, "혼전") ? g !== f : g.side !== f.side) && cheb(g.pos, target.pos) <= 1; }).slice(0, cells);
      var dm2 = RULES.ogWide - (hasMod(o, "미력") ? 1 : 0);
      queue.push(function () {
        var lostAny = false;
        hit.forEach(function (g, i) { var before = hpLeft(g); self.hurt(g, "사격전", dm2, f, { pierce: hasMod(o, "뚫기"), og: true }); if (i === 0 && hasMod(o, "날리기")) self.hurt(g, "사격전", 1, f); if (hpLeft(g) < before) { lostAny = true; if (hasMod(o, "흩뜨리기")) self.statusRoll(g); } });
        if (lostAny && hasMod(o, "삼키기")) self.heal(f, 1);
      });
    }
    else if (k === "awake") { f.buffs.push({ key: "all", v: 2, left: dur }); if (hasMod(o, "나누기")) { var al = this.friends(f).filter(function (g) { return g !== f && cheb(g.pos, f.pos) <= 2; })[0]; if (al) al.buffs.push({ key: "all", v: 2, left: dur }); } }
    else if (k === "instant") { f.instant = { name: o.name, sp: hasMod(o, "빛내기"), next: hasMod(o, "잇기") }; }
    else if (k === "chain") { var NO = RULES.newOg; f.R.chain = NO.chainN + (hasMod(o, "잇기") ? 1 : 0) - (hasMod(o, "미력") ? 1 : 0); f.R.chainAdv = NO.chainAdv + (hasMod(o, "빛내기") ? 1 : 0); f.R.chainFree = hasMod(o, "연격"); if (hasMod(o, "탈력")) f.buffs.push({ key: "ea", v: -1, left: 1 }); }
    else if (k === "drain") {
      var NO2 = RULES.newOg, dc = NO2.drainCl + (hasMod(o, "두르기") ? 1 : 0);
      this.addBuff(target, { key: "cl", v: -dc }, f, dur); f.buffs.push({ key: "cl", v: dc, left: dur });
      if (hasMod(o, "역류")) this.addBuff(target, { key: "nosup", v: 1 }, f, dur);
      if (NO2.drainHp) { var dh = Math.max(0, NO2.drainHp - (hasMod(o, "미력") ? 1 : 0)), tMg = isMg(target); queue.push(function () { var got = self.hurt(target, "사격전", dh, f, { og: true, pierce: hasMod(o, "뚫기") }); if (hasMod(o, "역혈") && tMg) { self.say(f.name + " — 마기가 역류한다", "hit"); self.hurt(f, "사격전", 1, null); } else if (got) self.heal(f, got + (hasMod(o, "삼키기") ? 1 : 0)); }); }
      this.say(target.name + " 코스트 한계 -" + dc + ", " + f.name + " +" + dc, "og");
    }
    else if (k === "dash") {
      var NO3 = RULES.newOg, mvN = NO3.dashMv + (hasMod(o, "뻗기") ? 1 : 0) - (hasMod(o, "단척") ? 1 : 0);
      if (target && target !== f) this.teleportNear(f, mvN, target);
      f.buffs.push({ key: "hd", v: NO3.dashHd, left: dur - 1 || 1 });
      if (NO3.dashDm) f.buffs.push({ key: "dm", v: NO3.dashDm + (hasMod(o, "베기") ? 1 : 0), left: 1, uses: 1 });
      if (hasMod(o, "탈력")) f.buffs.push({ key: "ea", v: -1, left: 1 });
      if (NO3.dashNeg) f.buffs.push({ key: "negall", v: 1, left: 1, uses: NO3.dashNeg + (hasMod(o, "버티기") ? 1 : 0) });
      if (NO3.dashEd || hasMod(o, "베기")) f.buffs.push({ key: "ed", v: Math.max(NO3.dashEd, 1), left: 1, uses: 1 });
    }
    else if (k === "aura") {
      var NO4 = RULES.newOg, ad = NO4.auraDr + (hasMod(o, "두르기") ? 1 : 0) - (hasMod(o, "박벽") ? 1 : 0), au = NO4.auraDur + (hasMod(o, "버티기") ? 1 : 0);
      this.friends(f).filter(function (g) { return cheb(g.pos, f.pos) <= (hasMod(o, "나누기") ? 2 : 1); }).forEach(function (g) { g.buffs.push({ key: "dr", v: ad, left: au }); if (g === f) g.buffs.push({ key: "drOnce", v: NO4.auraOnce, left: au }); if (NO4.auraSt || hasMod(o, "씻기")) g.buffs.push({ key: "immunest", v: 1, left: au }); if (hasMod(o, "반진")) g.buffs.push({ key: "thornsg", v: 1, left: au }); });
      if (hasMod(o, "고정")) f.buffs.push({ key: "immob", v: 1, left: 2 });
    }
    else if (k === "zdr") this.zones.push({ kind: "dr", side: f.side, c: { x: f.pos.x, y: f.pos.y }, rad: 1, rounds: dur, v: 2 + (hasMod(o, "두르기") ? 1 : 0) - (hasMod(o, "박벽") ? 1 : 0), follow: hasMod(o, "따르기") ? f : null });
    else if (k === "zdis") this.zones.push({ kind: "dis", side: f.side, c: { x: (target || f).pos.x, y: (target || f).pos.y }, rad: 1, rounds: dur, squeeze: hasMod(o, "조이기"), follow: hasMod(o, "따르기") ? f : null });
    else if (k === "heal") {
      var h = Math.max(d6(), d6()); if (hasMod(o, "다지기")) h = Math.max(3, h); if (hasMod(o, "기허")) h = Math.max(0, h - 2);
      this.heal(f, h); if (hasMod(o, "씻기")) { this.cleanse(f); f.stun = false; }
    }
  };
  B.guardAmount = function (o) { var k = ogKind(o); return (k === "guard" ? RULES.ogGuard : RULES.ogCounter) + (hasMod(o, "두르기") ? 1 : 0) - (hasMod(o, "박벽") ? 1 : 0); };
  /* 방어 오의 후보: 맞는 본인, 또는 감싸기가 붙은 아군(3칸, 근신이면 1칸) */
  B.guardOptions = function (t) {
    var self = this, out = [];
    this.friends(t).forEach(function (g) {
      g.ougi.forEach(function (o) {
        var k = ogKind(o); if (k !== "guard" && k !== "counter") return;
        if (!self.ougiOk(g, o)) return;
        var reach = hasMod(o, "근신") ? 1 : 3;
        if (g === t || (hasMod(o, "감싸기") && cheb(g.pos, t.pos) <= reach)) out.push({ g: g, o: o });
      });
    });
    return out;
  };
  B.aiGuard = function (t, src, a, dmg) {
    if (!a.type || a.type === "집단전") return null;
    var opts = this.guardOptions(t); if (!opts.length) return null;
    if (dmg >= hpLeft(t) || dmg >= 3 || (dmg >= 2 && Math.random() < 0.4)) return opts.filter(function (p) { return ogKind(p.o) === "guard"; })[0] || opts[0];
    return null;
  };

  /* ── 공격 ── */
  B.canTarget = function (f, g, a) {
    if (!alive(g) || g.gone) return false;
    if (hasBuff(g, "sanct")) return false;
    if (g.hidden && !this.flag(f, "seehidden") && (!a || a.area === "one" || a.area === "upto")) return false;
    if (f.buffs.some(function (b) { return b.key === "noatkme" && b.src === g.id; })) return false;
    if (a && this.grid && !WX_TAC.los(this.grid, f.pos, g.pos)) return false;
    return true;
  };
  B.rangeOfAtk = function (f, a, extra) {
    var r = a.r + this.mod(f, "r", null, a, extra) - (this.terrain === "악천후" && !this.flag(f, "noterr") && f.flags.noterr !== "악천후|극지" ? 1 : 0);
    return Math.max(1, r);
  };
  B.inReach = function (f, a, g, extra) {
    var d = dist(f.pos, g.pos), r = this.rangeOfAtk(f, a, extra);
    if (a.type === "사격전" && this.grid) r += WX_TAC.elev(this.grid, f.pos, g.pos);
    if (d > r) return false;
    if ((a.line || a.aline) && !inLine(f.pos, g.pos)) return false;
    if (a.area === "cross" || a.area === "crossg") return true;
    return true;
  };
  B.targetsOf = function (f, a, main, extra) {
    var self = this, foes = this.foes(f);
    var taunt = f.buffs.filter(function (b) { return b.key === "taunt"; }).map(function (b) { return self.byId(b.src); }).filter(function (g) { return g && alive(g); })[0];
    var inR = foes.filter(function (g) { return self.canTarget(f, g, a) && self.inReach(f, a, g, extra); });
    if (taunt && inR.indexOf(taunt) >= 0 && (a.area === "one" || a.area === "upto")) main = taunt;
    if (a.cl && a.cl.some(function (cl) { return cl.effs.some(function (e) { return e.key === "onlyzone"; }); })) inR = inR.filter(function (g) { return self.zones.some(function (z) { return cheb(z.c, g.pos) <= z.rad; }); });
    if (a.cl && a.cl.some(function (cl) { return cl.effs.some(function (e) { return e.key === "adjbefore"; }); })) inR = inR.filter(function (g) { return f.B.adjSeen && f.B.adjSeen[g.id]; });
    if (main && inR.indexOf(main) < 0) main = null;
    main = main || inR.slice().sort(function (x, y) { return hpLeft(x) - hpLeft(y); })[0];
    if (!main) return [];
    var all = this.f.filter(function (g) { return alive(g) && g !== f; });
    switch (a.area) {
      case "one": return [main];
      case "upto": return [main].concat(inR.filter(function (g) { return g !== main; })).slice(0, a.k || 2);
      case "blast": return foes.filter(function (g) { return cheb(g.pos, main.pos) <= 1; });
      case "blast2": return foes.filter(function (g) { return cheb(g.pos, main.pos) <= 2; });
      case "blastc": return foes.filter(function (g) { return cheb(g.pos, main.pos) <= 1; });
      case "blastall": return all.concat([f]).filter(function (g) { return cheb(g.pos, main.pos) <= 1; });
      case "burst2": return all.filter(function (g) { return cheb(g.pos, f.pos) <= 2; });
      case "cross": case "crossg": return all.filter(function (g) { return (g.pos.x === main.pos.x && Math.abs(g.pos.y - main.pos.y) <= 1) || (g.pos.y === main.pos.y && Math.abs(g.pos.x - main.pos.x) <= 1); }).filter(function (g) { return a.area === "crossg" || g.side !== f.side; });
      case "rowcol": return foes.filter(function (g) { return g.pos.x === main.pos.x || g.pos.y === main.pos.y; });
      case "line": case "lineall":
        var dx = Math.sign(main.pos.x - f.pos.x), dy = Math.sign(main.pos.y - f.pos.y);
        return (a.area === "lineall" ? all : foes).filter(function (g) { var ddx = g.pos.x - f.pos.x, ddy = g.pos.y - f.pos.y; return inLine(f.pos, g.pos) && Math.sign(ddx) === dx && Math.sign(ddy) === dy && dist(f.pos, g.pos) <= self.rangeOfAtk(f, a, extra); });
      case "all": return inR;
    }
    return [main];
  };
  B.clauseEffs = function (cls, key) { var out = []; cls.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === key) out.push(e); }); }); return out; };
  B.hasEff = function (cls, key) { return this.clauseEffs(cls, key).length > 0; };
  /* 보조 하나 쓰기: 코스트·판정. 성공하면 true */
  B.useSupport = function (f, s, why) {
    if (f.stun) return false;
    var cost = s.cost + this.mod(f, "cost");
    f.spent += Math.max(0, cost); f.R.sup = true;
    var self = this; f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "supmk" && self.limOk(f, cl)) { self.limUse(f, cl); self.applyEff({ key: "mk", arg: e.arg, v: 1 }, f, f, {}); } }); });
    if (this.inZone(f, "nosup").some(function (z) { return z.side !== f.side; }) || hasBuff(f, "nosup") || f.st["빙결"]) return false;
    var sk = bestSkill(f, s.sk);
    if (!sk || sk === "—") { this.limUse(f, s.cl); return true; }
    var r = this.check(f, sk, 0, "보조 " + s.n + (why ? "(" + why + ")" : ""));
    if (r.ok) this.limUse(f, s.cl);
    return r.ok;
  };
  B.budget = function (f) { return f.pow + this.mod(f, "cl") - f.spent + (f.bankNow || 0); };
  B.supsFor = function (f, trig, foe, atk) {
    var self = this;
    if (hasBuff(f, "nosup") || f.st["빙결"] || f.stun) return [];
    return f.supports.filter(function (s) { return s.trig === trig && (trig === "T" && !foe ? self.limOk(f, s.cl) : self.clOk(f, s.cl, foe, atk)) && (s.sk === "—" || tnOf(f, bestSkill(f, s.sk)) <= 8); });
  };

  B.attack = async function (f, a, main, hsup, queue, depth) {
    depth = depth || 0;
    var self = this, extraCl = [];
    if (hasBuff(f, "noatk") || this.inZone(f, "noatk").some(function (z) { return z.side !== f.side; }) && false) return;
    /* H 보조 */
    var hsOk = [];
    (hsup || []).forEach(function (s) { if (self.budget(f) >= s.cost && self.useSupport(f, s, "명중 직전")) { hsOk.push(s.cl); } });
    extraCl = hsOk;
    if (f.stun) return;
    var tgts = this.targetsOf(f, a, main, extraCl);
    if (!tgts.length) { this.say(f.name + " — " + a.name + "이(가) 닿는 상대가 없다", "dim"); return; }
    var nExtra = this.clauseEffs(extraCl, "extra").length;
    if (nExtra) { var ex = this.foes(f).filter(function (g) { return tgts.indexOf(g) < 0 && cheb(g.pos, tgts[0].pos) <= 1 && self.canTarget(f, g, a); }).slice(0, nExtra); tgts = tgts.concat(ex); }
    var sk = bestSkill(f, a.sk); var setsk = this.clauseEffs(extraCl, "setsk")[0]; if (setsk) sk = setsk.arg;
    var alt = f.passive.filter(function (cl) { return cl.effs.some(function (e) { return e.key === "altsk"; }) && self.clOk(f, cl, tgts[0], a); })[0];
    if (alt) { var opts = alt.effs.filter(function (e) { return e.key === "altsk"; })[0].arg; var list = opts === "own" ? (f.c.skills || []) : opts.split("|").concat([sk]); var bs = list.slice().sort(function (x, y) { return tnOf(f, x) - tnOf(f, y); })[0]; if (bs) sk = bs; }
    a._sk = sk;
    /* X 절의 자기 효과(쓸 때) */
    a.cl.filter(function (cl) { return cl.trig === "X" && self.clOk(f, cl, tgts[0], a); }).forEach(function (cl) { cl.effs.forEach(function (e) { if (e.who === "self") self.applyEff(e, f, f, { atk: a }, 1); if (e.key === "selfhurt" || e.key === "pay") self.applyEff(e, f, f, { atk: a }); }); });
    var tn0 = tgts[0];
    /* 표적이 된 쪽의 대응(E 중 명중 전에 쓰는 것) */
    var live = [];
    for (var i = 0; i < tgts.length; i++) {
      var g = tgts[i], skip = false;
      if (g.buffs.some(function (b) { return b.key === "blur"; }) && d6() <= 2) { this.say(g.name + " — 환영을 쳤다", "og"); continue; }
      var na = g.buffs.filter(function (b) { return b.key === "negall" && b.uses > 0; })[0];
      if (na) { na.uses--; this.say(g.name + " — 분신이 대신 맞는다", "og"); continue; }
      var pre = g.ctrl ? [] : this.supsFor(g, "E", f, a).filter(function (s) { return self.hasEff([s.cl], "redirect") || self.hasEff([s.cl], "dodge") || self.hasEff([s.cl], "hd"); });
      for (var j = 0; j < pre.length && !skip; j++) {
        var s = pre[j]; if (this.budget(g) < s.cost) continue;
        var dodge1 = this.hasEff([s.cl], "dodge") && this.clauseEffs([s.cl], "dodge")[0].v === 1 && this.clauseEffs([s.cl], "dodge")[0].raw === "dodge1";
        if (dodge1 && a.r > 1.5) continue;
        if (this.hasEff([s.cl], "redirect")) { var other = this.f.filter(function (h) { return alive(h) && h !== g && h !== f && cheb(h.pos, g.pos) <= 1 && h.side === f.side; })[0]; if (!other) continue; if (this.useSupport(g, s, "대상 바꾸기")) { this.say(g.name + " — 공격을 " + other.name + "에게 돌린다", "og"); tgts[i] = g = other; } break; }
        if (this.useSupport(g, s, "명중 전")) { if (this.hasEff([s.cl], "dodge")) { this.say(g.name + " — 공격을 흘린다", "og"); skip = true; } else g._preHd = (g._preHd || 0) + this.clauseEffs([s.cl], "hd").reduce(function (n, e) { return n + e.v; }, 0); }
      }
      if (!skip) live.push(g);
    }
    if (!live.length) { f.spent += a.cost + this.mod(f, "cost"); this.markAtk(f, a); return; }
    /* 명중 */
    var main0 = live[0];
    var adv = this.mod(f, "ha", main0, a, extraCl, true);
    main0.buffs.forEach(function (b) { if (b.key === "exp") { adv += b.v; if (b.uses) { b.uses--; if (b.uses <= 0) b.left = 0; } } });
    adv -= this.mod(main0, "hd", f, a, null, true) + (main0._preHd || 0); main0._preHd = 0;
    f.buffs.forEach(function (b) { if (b.key === "hdme" && b.src === main0.id) adv -= b.v; });
    if (main0.flags.hdmulti && main0.R.targeted) adv -= 1;
    if (this.zones.some(function (z) { return z.kind === "gut" && z.side !== f.side && cheb(z.c, f.pos) <= z.rad; }) && isMg(f)) adv -= 1;
    if (a.type === "사격전" && this.grid && this.grid[main0.pos.y][main0.pos.x] === "c") adv -= 1;   /* 엄폐 */
    live.forEach(function (g) { g.R.targeted = (g.R.targeted || 0) + 1; });
    var crit = this.clauseEffs(extraCl, "crit")[0];
    var nofum = this.hasEff(a.cl.filter(function (c) { return c.trig === "X"; }), "nofum") || this.hasEff(extraCl, "nofum") || f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "nofum"; }) && self.clOk(f, cl, main0, a); });
    var h = f.stun && f.flags.stunatk && a.type === "접근전" ? this.check(f, sk, adv, a.name + " 명중", { stunOk: true, foe: main0, atk: a, isHit: true }) : this.check(f, sk, adv, a.name + " 명중", { foe: main0, atk: a, nofum: nofum, crit: crit ? crit.v : 0, isHit: true });
    f.spent += Math.max(0, a.cost + this.mod(f, "cost"));
    this.markAtk(f, a);
    if (!h.ok) { live.forEach(function (g) { self.onMiss(f, a, g, queue, true); }); return; }
    var xNoev = this.hasEff(a.cl.filter(function (c) { return c.trig === "X" && self.clOk(f, c, main0, a); }), "noev") || this.hasEff(extraCl, "noev");
    var noreduce = this.hasEff(a.cl.filter(function (c) { return c.trig === "X"; }), "noreduce") || this.hasEff(extraCl, "noreduce") || f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "noreduce"; }) && self.clOk(f, cl, main0, a); });
    var pierce = this.hasEff(a.cl, "pierce");
    for (var k2 = 0; k2 < live.length; k2++) {
      var t = live[k2]; if (!alive(t)) continue;
      t.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "seen") self.applyEff({ key: "mk", arg: e.arg, v: 1 }, t, f, {}); }); });
      var evaded = false;
      if (!xNoev && !hasBuff(t, "noevb") && !(t.stun && !t.flags.stunev)) {
        evaded = this.evade(t, f, a, sk, h, extraCl);
      } else if (xNoev) this.say(t.name + "은(는) 회피할 수 없다", "dim");
      if (evaded) { this.onMiss(f, a, t, queue, false); continue; }
      /* 맞음 */
      t.R.hitBySide = t.R.hitBySide || {}; t.R.hitBySide[f.side] = (t.R.hitBySide[f.side] || 0) + 1;
      var dmg = a.dmg + (h.sp ? 1 : 0) + this.mod(f, "dm", t, a, extraCl, true);
      if (a.area === "blastc" && t !== main0) dmg = 1;
      if (a.area === "blastc" && t === main0) dmg += this.clauseEffs(a.cl, "centerdm").reduce(function (n, e) { return n + e.v; }, 0);
      t.buffs.forEach(function (b) { if (b.key === "vuln" && (!b.uses || b.uses > 0)) { dmg += b.v; if (b.uses) b.uses--; } if (b.key === "mark" && b.src === f.id && self.limOk(f, { id: f.id + "mk", lim: { t: "r", n: 1 } })) { dmg += b.v; self.limUse(f, { id: f.id + "mk", lim: { t: "r", n: 1 } }); } });
      if (this.hasEff(a.cl, "debtdm")) { var dd = Math.min(2, t.debt); dmg += dd; t.debt -= dd; }
      if (this.hasEff(a.cl, "stackdm")) { var stk = (f.B.stack = f.B.stack || {}); dmg += Math.min(2, stk[t.id] || 0); stk[t.id] = (stk[t.id] || 0) + 1; }
      if (this.hasEff(a.cl, "sixv") && d6() === 1) dmg += 1;
      if (a.type === "집단전") dmg = 1;
      if (a.type === "") dmg = 0;
      var guard = null;
      if (dmg > 0 && a.type && a.type !== "집단전") guard = t.ctrl && t.ctrl.guard ? await t.ctrl.guard(t, f, a, dmg, this) : this.aiGuard(t, f, a, dmg);
      var ogDr = 0, nulled = false;
      if (guard) {
        var gk = ogKind(guard.o);
        this.useOugi(guard.g, guard.o, f, queue);
        if (!guard.g.ogUsed[guard.o.i]) {}
        ogDr = this.guardAmount(guard.o);
        if (gk === "counter") { var cdm = 1 + (hasMod(guard.o, "되받기") ? 1 : 0); (function (gg) { queue.push(function () { self.hurt(f, "접근전", cdm, gg); }); })(guard.g); }
        else if (hasMod(guard.o, "되받기") && cheb(f.pos, t.pos) <= 2) (function (gg) { queue.push(function () { self.hurt(f, "접근전", 1, gg); }); })(guard.g);
      }
      var dsup = [];
      if (!t.ctrl && dmg > 0 && a.type !== "집단전") this.supsFor(t, "D", f, a).forEach(function (s) { if (self.budget(t) >= s.cost && (self.hasEff([s.cl], "dr") || self.hasEff([s.cl], "absorb"))) { if (self.useSupport(t, s, "대미지")) dsup.push(s.cl); } });
      (function (tt, d, og, ds) {
        queue.push(function () {
          if (self.hasEff(ds, "absorb")) { self.say(tt.name + " — 대미지를 빨아들여 되돌린다", "og"); var rv = self.check(f, sk, 0, "회피"); if (!rv.ok) self.hurt(f, a.type, d, tt); return; }
          var before = hpLeft(tt);
          var got = self.hurt(tt, a.type || "사격전", d, f, { noreduce: noreduce, pierce: pierce, atk: a, dsup: ds, ogDr: og });
          ds.forEach(function (cl) { var rest = cl.effs.filter(function (e) { return e.key !== "dr" && e.key !== "absorb"; }); if (rest.length) self.applyClause({ effs: rest }, tt, f, { dfltWho: "self", evade: false, dflt: 2 }); });
          if (alive(f) && f.buffs.some(function (b) { return b.key === "curse" && b.src === tt.id; })) self.hurt(f, "집단전", 1, tt);
        });
      })(t, dmg, ogDr, dsup);
      this.onHit(f, a, t, extraCl, queue, depth);
    }
    /* 공격이 끝난 뒤 */
    if (this.hasEff(a.cl, "posthide") && !this.adjFoes(f).length) { f.hidden = 2; this.say(f.name + " 은신", "dim"); }
    var pm = this.clauseEffs(a.cl.filter(function (c) { return c.trig === "X"; }), "postmv")[0]; if (pm && !f.ctrl) this.stepAway(f, pm.v || 1);
  };
  B.markAtk = function (f, a) {
    f.R.atk = true; f.R.acted = true; f.B.atkUsed++; f.B.names[a.name] = (f.B.names[a.name] || 0) + 1; f.last.atkNow = true;
    var keep = f.passive.filter(function (cl) { return cl.effs.some(function (e) { return e.key === "keephide"; }) && this.clOk(f, cl, null, a); }, this)[0];
    if (f.hidden) f.R.hidAtk = true;
    if (f.hidden && !keep) { f.hidden = 0; } else if (keep) this.limUse(f, keep);
  };
  B.evade = function (t, f, a, sk, h, extraCl) {
    var self = this, esk = sk, adv = 0, flat = 0;
    var xEv = this.clauseEffs(a.cl.filter(function (c) { return c.trig === "X"; }), "evsk")[0]; if (xEv) esk = xEv.arg;
    if (this.hasEff(a.cl, "evbest")) esk = (t.c.skills || []).slice().sort(function (x, y) { return tnOf(t, x) - tnOf(t, y); })[0] || esk;
    var esup = [];
    if (!t.ctrl || true) this.supsFor(t, "E", f, a).forEach(function (s) {
      if (self.budget(t) < s.cost) return;
      var cls = [s.cl];
      if (!(self.hasEff(cls, "ea") || self.hasEff(cls, "evself") || self.hasEff(cls, "dr"))) return;
      if (self.hasEff(cls, "ea") && tnOf(t, bestSkill(t, s.sk)) > 8 && s.sk !== "—") return;
      if (self.useSupport(t, s, "회피 직전")) esup.push(s.cl);
    });
    var es = this.clauseEffs(esup, "evself")[0]; if (es) esk = es.arg;
    var ef = t.passive.filter(function (cl) { return cl.effs.some(function (e) { return e.key === "evfld"; }) && self.clOk(t, cl, f, a); })[0];
    if (ef) { var fld = ef.effs.filter(function (e) { return e.key === "evfld"; })[0].arg; var best = (t.c.skills || []).filter(function (s) { return A.fieldOf(s) === fld; }).sort(function (x, y) { return tnOf(t, x) - tnOf(t, y); })[0]; if (best && tnOf(t, best) < tnOf(t, esk)) { esk = best; this.limUse(t, ef); } }
    adv += this.mod(t, "ea", f, a, esup, true);
    adv -= this.mod(f, "ed", t, a, extraCl, true);
    if (this.inZone(t, "evdis").some(function (z) { return z.side !== t.side; })) adv -= 1;
    if (this.hasEff(a.cl.filter(function (c) { return c.trig === "X"; }), "noevadv") && adv > 0) adv = 0;
    if (this.terrain === "고소" && !this.flag(t, "nohigh")) flat -= 2;
    var tf = this.clauseEffs(extraCl, "tfum")[0];
    var r = this.check(t, esk, adv, "회피", { flat: flat, foe: f, atk: a, fumAdd: tf ? tf.v : 0, isEv: true, stunOk: t.stun && t.flags.stunev });
    if (r.ok && this.hasEff(extraCl, "evbeat") && r.sum < h.sum) { this.say("— 명중 결과(" + h.sum + ")에 못 미쳐 피하지 못한다", "dim"); r.ok = false; }
    if (r.ok && this.hasEff(a.cl, "evtwice")) { var r2 = this.check(t, esk, adv, "회피(두 번째)", { flat: flat, foe: f, atk: a, isEv: true }); r.ok = r2.ok; }
    if (r.ok) { var fr = f.passive.filter(function (cl) { return cl.effs.some(function (e) { return e.key === "forcereev"; }) && self.clOk(f, cl, t, a); })[0]; if (fr) { this.limUse(f, fr); var r3 = this.check(t, esk, adv, "회피(다시)", { flat: flat, foe: f, atk: a, isEv: true }); r.ok = r3.ok; } }
    if (r.ok) {
      t.R.evaded = t.R.evaded || {}; t.R.evaded[f.id] = 1;
      esup.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "onev" && (!e.sub || self.cond(e.sub, t, f, a))) self.applyEff(parseEff(e.arg), t, f, { atk: a }); if (e.who === "self" && e.key !== "ea") self.applyEff(e, t, t, { atk: a }); }); });
      this.afterEvade(t, f, a);
    }
    return r.ok;
  };
  B.afterEvade = function (t, f, a) {
    var self = this;
    t.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "evmk") self.applyEff({ key: "mk", arg: e.arg, v: 1 }, t, t, {}); }); });
    var tm = t.passive.filter(function (cl) { return cl.effs.some(function (e) { return e.key === "thornsmiss"; }) && self.clOk(t, cl, f, a); })[0];
    if (tm && a.type === "접근전") { this.limUse(t, tm); this.hurt(f, "사격전", 1, t); }
    if (t.ctrl && t.ctrl.noV) return;
    this.supsFor(t, "V", f, a).forEach(function (s) {
      if (self.budget(t) < s.cost) return;
      var cls = [s.cl];
      if (self.hasEff(cls, "reflect") || self.hasEff(cls, "reflectadj")) {
        if (self.useSupport(t, s, "되돌리기")) {
          var to = self.hasEff(cls, "reflectadj") ? self.foes(t).filter(function (g) { return g !== f && cheb(g.pos, t.pos) <= 1; })[0] || f : f;
          self.say(t.name + " — 공격을 " + to.name + "에게 되돌린다", "og");
          var rv = self.check(to, a._sk || a.sk, 0, "회피"); if (!rv.ok) self.hurt(to, a.type || "사격전", a.dmg, t);
        }
        return;
      }
      var foeEff = cls[0].effs.filter(function (e) { return e.who === "foe"; });
      var rng = (self.clauseEffs(cls, "rng")[0] || { v: 1.5 }).v;
      if (foeEff.length && dist(t.pos, f.pos) > rng) return;
      if (self.useSupport(t, s, "회피 성공 뒤")) self.applyClause(s.cl, t, f, { atk: a, sk: s.sk, dfltWho: "self", evade: self.hasEff(cls, "noev") ? false : true });
    });
  };
  B.onMiss = function (f, a, t, queue, hitFailed) {
    var self = this;
    if (!hitFailed) {
      var gz = f.buffs.filter(function (b) { return b.key === "graze" && (!b.sub || self.cond(b.sub, f, t, a)); })[0];
      if (gz && a.type === "접근전") this.hurt(t, "접근전", 1, f);
      a.cl.filter(function (cl) { return cl.trig === "F" && self.clOk(f, cl, t, a); }).forEach(function (cl) {
        self.limUse(f, cl);
        cl.effs.forEach(function (e) {
          if (e.key === "again") { self.say(f.name + " — 한 번 더", "dim"); queue.push(function () { }); self._again = { f: f, a: a, t: t }; return; }
          var who = e.who === "self" ? f : t;
          self.applyEff(e, f, who, { atk: a }, 2);
        });
      });
    }
  };
  B.onHit = function (f, a, t, extraCl, queue, depth) {
    var self = this;
    var riders = a.cl.filter(function (cl) { return cl.trig === "A" && self.clOk(f, cl, t, a); });
    f.passive.forEach(function (cl) { if (self.clOk(f, cl, t, a) && cl.effs.some(function (e) { return e.key === "hit"; })) riders.push({ id: cl.id, lim: cl.lim, effs: cl.effs.filter(function (e) { return e.key === "hit"; }).map(function (e) { return parseEff(e.arg); }), conds: [] , src: cl}); });
    extraCl.forEach(function (cl) { var hs = cl.effs.filter(function (e) { return e.key === "hit"; }); if (hs.length) riders.push({ id: cl.id + "h", effs: hs.map(function (e) { return parseEff(e.arg); }), conds: [] }); });
    riders.forEach(function (cl) {
      queue.push(function () {
        if (cl.src) self.limUse(f, cl.src); else self.limUse(f, cl);
        cl.effs.forEach(function (e) {
          if (e.key === "again") { if (depth < 3 && alive(t)) self._againQ = (self._againQ || []).concat([{ f: f, a: a, t: t, depth: depth + 1 }]); return; }
          var who = e.who === "self" ? f : e.who === "ally" || e.who === "allies" ? null : t;
          if (!who) { self.applyClause({ effs: [e] }, f, t, { atk: a, evade: false, dflt: 2 }); return; }
          self.applyEff(e, f, who, { atk: a }, 2);
        });
      });
    });
    /* S 보조: 공격 성공 직후 */
    if (!f.ctrl || f.ctrl.autoS) this.supsFor(f, "S", t, a).forEach(function (s) {
      if (self.budget(f) < s.cost) return;
      if (self.useSupport(f, s, "공격 성공 뒤")) queue.push(function () { s.cl.effs.forEach(function (e) { self.applyEff(e, f, e.who === "self" ? f : t, { atk: a }, 2); }); });
    });
  };

  /* ── AI ── */
  function pHit(tn, adv, pow) {
    if (tn >= 99) return 0;
    var cnt = 0, k = 2 + Math.min(4, Math.abs(adv || 0)), rolls = Math.pow(6, k);
    for (var i = 0; i < rolls; i++) {
      var ds = [], x = i; for (var j = 0; j < k; j++) { ds.push(x % 6 + 1); x = Math.floor(x / 6); }
      ds.sort(function (a, b) { return adv >= 0 ? b - a : a - b; });
      var s = ds[0] + ds[1];
      if ((ds[0] === 6 && ds[1] === 6) || (s >= tn && s >= pow)) cnt++;
    }
    return cnt / rolls;
  }
  var PH = {};
  function ph(tn, adv, pow) { adv = Math.max(-3, Math.min(3, adv)); var k = tn + "|" + adv + "|" + pow; if (PH[k] === undefined) PH[k] = pHit(tn, adv, pow); return PH[k]; }

  B.aiPlan = function (f, pow, fromPos) {
    var foes = this.foes(f), self = this, best = null, P0 = f.pos;
    if (hasBuff(f, "noatk")) return null;
    var budget = pow + this.mod(f, "cl") + (f.bankNow || 0);
    f.attacks.forEach(function (a) {
      var cost = a.cost + self.mod(f, "cost");
      if (cost > budget) return;
      if (f.st["내상"] === a.name) return;
      if (a.uses && (f.B.names[a.name] || 0) >= a.uses) return;
      if (a.needmv && (f.R.moved || 0) < a.needmv) return;
      if (f.buffs.some(function (b) { return b.key === "noatkfld" && A.fieldOf(bestSkill(f, a.sk)) === b.arg; })) return;
      var sk = bestSkill(f, a.sk), tn = tnOf(f, sk); if (tn >= 99) return;
      foes.forEach(function (g) {
        if (!self.canTarget(f, g, a)) return;
        var need = Math.max(0, dist(P0, g.pos) - self.rangeOfAtk(f, a)), steps = pow + self.mod(f, "mv");
        if (need > steps + 0.5) return;
        var gtn = tnOf(g, sk), pe = gtn >= 99 ? 0 : ph(gtn, -self.mod(f, "ed", g, a), g.pow || 3);
        var n = a.area === "one" ? 1 : 1.4;
        var dm = (a.type === "집단전" ? 0.8 : a.type === "" ? 0.6 : a.dmg) + self.mod(f, "dm", g, a);
        var v = ph(tn, self.mod(f, "ha", g, a), pow) * (1 - pe) * dm * n;
        if (hpLeft(g) <= dm) v *= 1.4;
        v -= cost * 0.02;
        if (!best || v > best.v) best = { a: a, g: g, v: v };
      });
    });
    return best;
  };
  B.aiPow = function (f) {
    var bestP = 3, bestV = -1, cap = 6;
    f.buffs.forEach(function (b) { if (b.key === "powcap") cap = Math.min(cap, b.v); });
    for (var p = 1; p <= cap; p++) {
      var pl = this.aiPlan(f, p), v = (pl ? pl.v : 0) + 0.06 * p - (p >= 5 ? 0.05 * (p - 4) : 0);
      if (v > bestV + 0.01) { bestV = v; bestP = p; }
    }
    if (Math.random() < 0.25) bestP = Math.max(1, Math.min(cap, bestP + (Math.random() < 0.5 ? -1 : 1)));
    return bestP;
  };
  B.moveSteps = function (f) {
    if (hasBuff(f, "immob") || f.st["빙결"]) return 0;
    var mv = this.mod(f, "mv"); if (mv < 0 && this.flag(f, "nomvdebuff")) mv = 0;
    var s = f.pow + mv - (f.st["한기"] && !f.flags.nocold ? 1 : 0);
    f.buffs.forEach(function (b) { if (b.key === "mvcap") s = Math.min(s, b.v); });
    return Math.max(0, s);
  };
  B.reachable = function (f, steps, jump) {
    if (steps == null) steps = this.moveSteps(f);
    var self = this, nw = !!this.flag(f, "nowater");
    var r = WX_TAC[jump ? "reachPass" : "reach"](this.grid, f.pos, steps, {
      nowater: nw, occ: function (x, y) { var o = self.at(x, y); return !!o && o !== f; },
      stop: function (x, y) { return !nw && self.zones.some(function (z) { return z.kind === "water" && z.side !== f.side && cheb(z.c, { x: x, y: y }) <= (z.rad || 0); }); }
    });
    var out = [{ x: f.pos.x, y: f.pos.y, d: 0 }];
    Object.keys(r).forEach(function (k) { var p = k.split(","); if (+p[0] === f.pos.x && +p[1] === f.pos.y) return; out.push({ x: +p[0], y: +p[1], d: r[k] }); });
    return out;
  };
  B.aiMove = function (f) {
    var plan = this.aiPlan(f, f.pow), cells = this.reachable(f), self = this, foes = this.foes(f);
    if (!foes.length || !cells.length) return f.pos;
    var g = plan ? plan.g : foes.slice().sort(function (a, b) { return dist(f.pos, a.pos) - dist(f.pos, b.pos); })[0];
    var r = plan ? this.rangeOfAtk(f, plan.a) : 1;
    var run = f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "mvmk"; }); }), P0 = f.pos;
    cells.sort(function (c1, c2) {
      function sc(c) {
        var d = dist(c, g.pos), ok = d <= r ? 0 : 10 + d;
        var threat = foes.filter(function (h) { return dist(c, h.pos) <= 1.5; }).length * (r > 1.5 ? 0.6 : 0);
        return ok + threat + c.d * 0.05 - (r > 1.5 ? d * 0.1 : 0) - (plan && (plan.a.line || plan.a.aline) && inLine(c, g.pos) ? 0.5 : 0) - (run && cheb(c, P0) >= 3 ? 0.8 : 0);
      }
      return sc(c1) - sc(c2);
    });
    return cells[0] || f.pos;
  };
  /* 턴에 쓸 보조(T): 쓸 만하면 쓴다 */
  B.aiTSupports = function (f, phase, reserve, queue) {
    var self = this;
    this.supsFor(f, "T", null, null).forEach(function (s) {
      if (!alive(f) || f.stun) return;
      if (self.budget(f) - reserve < s.cost) return;
      var cls = [s.cl], effs = s.cl.effs;
      var rng = (self.clauseEffs(cls, "rng")[0] || { v: s.rng || 3 }).v;
      var foeEff = effs.filter(function (e) { return e.who === "foe" || e.who === "foes" || e.key === "zone"; });
      var tgt = null;
      if (foeEff.length) {
        if (phase !== "pre" && self.hasEff(cls, "asatk")) return;
        var cand = self.foes(f).filter(function (g) { return dist(g.pos, f.pos) <= rng && self.clOk(f, s.cl, g, null) && !g.gone; });
        if (!cand.length) return;
        tgt = cand.sort(function (a, b) { return hpLeft(a) - hpLeft(b); })[0];
        if (self.hasEff(cls, "zone")) { var z = self.clauseEffs(cls, "zone")[0]; if (/:self$/.test(z.arg) && !self.foes(f).some(function (g) { return cheb(g.pos, f.pos) <= Number(z.arg.split(":")[1]); })) return; }
      } else {
        if (!self.clOk(f, s.cl, null, null)) return;
        var useful = effs.some(function (e) {
          if (e.key === "heal" || e.key === "mend") return self.friends(f).some(function (g) { return dist(g.pos, f.pos) <= Math.max(rng, 0) && FIELDS.some(function (x) { return g.lost[x]; }); });
          if (e.key === "cleanse" || e.key === "cleanseall") return self.friends(f).some(function (g) { return dist(g.pos, f.pos) <= Math.max(rng, 0) && Object.keys(g.st).length; });
          if (e.key === "hide") return !self.adjFoes(f).length && phase === "post";
          if (e.key === "move" || e.key === "twoatk") return false;
          if (effs.some(function (x) { return x.key === "pay"; }) && hpLeft(f) <= 4) return false;
          if (e.key === "mk" && effs.some(function (x) { return x.key === "mkclr" && (x.who === "self" || !x.who) && (f.mk[x.arg] || 0) > 0; })) return false;
          if (e.key === "mk" && (!e.who || e.who === "self")) { var mn = /^(.+?)(?:\*\d+)?$/.exec(e.arg)[1]; return (f.mk[mn] || 0) < 2; }
          return POS_KEYS[e.key] && e.v > 0 && !f.buffs.some(function (b) { return b.key === e.key && b.src === f.id && b.clid === s.cl.id; });
        });
        if (!useful || (phase === "pre" && effs.some(function (e) { return e.key === "hide"; }))) return;
      }
      if (f.R.usedT && f.R.usedT[s.cl.id]) return;
      if (tnOf(f, bestSkill(f, s.sk)) > 9 && s.sk !== "—") return;
      f.R.usedT = f.R.usedT || {}; f.R.usedT[s.cl.id] = 1;
      if (self.useSupport(f, s, "")) {
        self.applyClause(s.cl, f, tgt, { sk: s.sk === "—" ? null : bestSkill(f, s.sk), dfltWho: "self", dflt: 2 });
        f.buffs.forEach(function (b) { if (!b.clid && b.src === f.id) b.clid = s.cl.id; });
        if (self.hasEff(cls, "asatk")) f.R.atk = true;
      }
    });
  };
  B.aiTurn = async function (f, queue) {
    var foes = this.foes(f); if (!foes.length) return;
    var self = this;
    /* 오의 */
    var strike = this.ougiReady(f, "strike").concat(this.ougiReady(f, "wide"));
    for (var i = 0; i < strike.length; i++) {
      var o = strike[i], R = ogRange(o);
      var tg = foes.filter(function (g) { return dist(f.pos, g.pos) <= R && self.ougiOk(f, o, g) && !g.gone; }).sort(function (a, b) { return hpLeft(a) - hpLeft(b); })[0];
      if (tg && (this.round >= 2 || hpLeft(tg) <= 5 || Math.random() < 0.4)) { this.useOugi(f, o, tg, queue); break; }
    }
    var lost = FIELDS.filter(function (x) { return f.lost[x]; }).length;
    var heal = this.ougiReady(f, "heal")[0]; if (heal && lost >= 3) this.useOugi(f, heal, f, queue);
    var aw = this.ougiReady(f, "awake")[0]; if (aw && this.round <= 2) this.useOugi(f, aw, f, queue);
    var zd = this.ougiReady(f, "zdr")[0]; if (zd && this.friends(f).filter(function (h) { return cheb(h.pos, f.pos) <= 1; }).length >= 2) this.useOugi(f, zd, f, queue);
    var zs = this.ougiReady(f, "zdis")[0]; if (zs) { var near = foes.filter(function (g) { return cheb(g.pos, f.pos) <= 2; }); if (near.length) this.useOugi(f, zs, near[0], queue); }
    var ins = this.ougiReady(f, "instant")[0];
    if (ins && hasMod(ins, "뒤집기")) { f.flip = ins; ins = null; }
    var dr0 = this.ougiReady(f, "drain")[0]; if (dr0 && this.round <= 3) { var dt = foes.filter(function (g) { return dist(f.pos, g.pos) <= 2 + (hasMod(dr0, "뻗기") ? 1 : 0); }).sort(function (a, b) { return b.pow - a.pow; })[0]; if (dt) this.useOugi(f, dr0, dt, queue); }
    var au0 = this.ougiReady(f, "aura")[0]; if (au0 && this.adjFoes(f).length && (this.adjAllies(f).length || hpLeft(f) <= 4 || this.round >= 2)) this.useOugi(f, au0, f, queue);
    var da0 = this.ougiReady(f, "dash")[0];
    if (da0 && (!this.aiPlan(f, f.pow) || hpLeft(f) <= 3 || (RULES.newOg.dashNeg && this.adjFoes(f).length && this.round >= 2))) { var nf = foes.slice().sort(function (a, b) { return dist(f.pos, a.pos) - dist(f.pos, b.pos); })[0]; if (nf) this.useOugi(f, da0, nf, queue); }
    if (f.R.ogSpent) { this.say(f.name + " — 오의에 기를 모두 쏟아 무공을 더 쓰지 못한다", "dim"); return; }
    var plan = this.aiPlan(f, f.pow);
    this.aiTSupports(f, "pre", plan ? plan.a.cost : 0, queue);
    plan = this.aiPlan(f, f.pow);
    if (!plan || f.R.atk) { if (!plan) this.say(f.name + " — 닿는 상대가 없어 숨을 고른다", "dim"); this.aiTSupports(f, "post", 0, queue); return; }
    /* 따라붙기: 공격 직전 이동형 보조/X */
    if (ins && plan.a.dmg >= 2 && !f.instant) this.useOugi(f, ins, f, queue);
    var budget = this.budget(f) - plan.a.cost;
    var hs = this.supsFor(f, "H", plan.g, plan.a).filter(function (s) {
      var cls = [s.cl]; if (!(self.hasEff(cls, "ha") || self.hasEff(cls, "ed") || self.hasEff(cls, "dm") || self.hasEff(cls, "noev") || self.hasEff(cls, "noreduce") || self.hasEff(cls, "extra") || self.hasEff(cls, "hit") || self.hasEff(cls, "crit") || self.hasEff(cls, "tfum") || self.hasEff(cls, "evbeat"))) return false;
      if (self.hasEff(cls, "pay") && hpLeft(f) <= 3) return false;
      if (tnOf(f, bestSkill(f, s.sk)) > 8 && s.sk !== "—") return false;
      if (s.cost <= budget) { budget -= s.cost; return true; } return false;
    }).slice(0, 2);
    var ch0 = this.ougiReady(f, "chain")[0];
    if (ch0 && plan.a.dmg >= 1 && (this.round >= 2 || hpLeft(plan.g) <= 4 || Math.random() < 0.4)) this.useOugi(f, ch0, plan.g, queue);
    await this.attack(f, plan.a, plan.g, hs, queue);
    if (f.R.chain) {
      var times = f.R.chain - 1; f.R.chain = 0;
      for (var ci = 0; ci < times && alive(f) && !f.stun; ci++) {
        var ca = Object.assign({}, plan.a, { cost: 0 });
        var tgt2 = alive(plan.g) && !f.R.chainFree ? plan.g : null; if (!tgt2) { var p3 = this.aiPlan(f, 6); if (!p3) break; tgt2 = p3.g; ca = Object.assign({}, p3.a, { cost: 0 }); }
        f.buffs.push({ key: "ha", v: f.R.chainAdv || 1, left: 1, uses: 1 });
        this.say(f.name + " — 연환", "og");
        await this.attack(f, ca, tgt2, [], queue);
      }
    }
    /* 두 번째 공격 */
    var two = hasBuff(f, "twoatk") || f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "twoatk"; }) && self.clOk(f, cl, null, null); });
    if (two && alive(f) && !f.stun) {
      var p2 = this.aiPlan(f, f.pow - f.spent > 0 ? f.pow : 0);
      if (p2 && p2.a.cost <= this.budget(f) && p2.a.cost <= 2) { f.buffs.push({ key: "ha", v: -1, left: 1, uses: 1 }); var tw = f.passive.filter(function (cl) { return cl.effs.some(function (e) { return e.key === "twoatk"; }); })[0]; if (tw) this.limUse(f, tw); f.buffs = f.buffs.filter(function (b) { return b.key !== "twoatk"; }); await this.attack(f, p2.a, p2.g, [], queue); }
    }
    this.aiTSupports(f, "post", 0, queue);
  };
  B.aiRound = function (f) {
    var self = this;
    this.supsFor(f, "R", null, null).forEach(function (s) {
      if (self.budget(f) < s.cost || Math.random() < 0.3) return;
      var effs = s.cl.effs; if (!effs.some(function (e) { return POS_KEYS[e.key] && e.v > 0 || e.key === "nostun" && f.pow >= 5; })) return;
      if (self.useSupport(f, s, "라운드 시작")) self.applyClause(s.cl, f, null, { sk: s.sk, dfltWho: "self", dflt: 1 });
    });
  };

  /* ── 라운드 ── */
  B.runRound = async function () {
    this.round++;
    var self = this, live = this.f.filter(alive);
    this.say("── " + this.round + "라운드 ──", "rd");
    live.forEach(function (f) { f.last.hurtBy = f.R.hurtBy; f.last.atk = !!f.last.atkNow; f.last.atkNow = false; f.R = { hurtBy: {} }; f.spent = 0; f.stun = false; f.gone = false; f.bankNow = f.bankNext || 0; f.bankNext = 0; if (f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "predict"; }); })) { var pf = self.foes(f).sort(function (a, b) { return dist(a.pos, f.pos) - dist(b.pos, f.pos); })[0]; var pw = f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "predwide"; }); }); f.R.pred = {}; if (pf && Math.random() < (pw ? 0.7 : 0.55)) f.R.pred[pf.id] = true; } self.adjFoes(f).forEach(function (g) { (f.B.adjSeen = f.B.adjSeen || {})[g.id] = 1; }); });
    var mobPow = null;
    for (var i = 0; i < live.length; i++) {
      var f = live[i];
      if (f.grade === "졸개" && f.side === 1 && mobPow) { f.pow = mobPow; continue; }
      f.pow = f.ctrl && f.ctrl.pow ? await f.ctrl.pow(f, this) : this.aiPow(f);
      var cap = 6; f.buffs.forEach(function (b) { if (b.key === "powcap") cap = Math.min(cap, b.v); }); f.pow = Math.min(f.pow, cap);
      if (f.grade === "졸개" && f.side === 1) mobPow = f.pow;
    }
    this.say("공력 — " + live.map(function (f) { return f.name + " " + f.pow; }).join(" · "), "dim");
    live.forEach(function (f) { if (!f.ctrl) self.aiRound(f); });
    var order = live.slice().sort(function (a, b) { return b.pow - a.pow || (hasBuff(b, "first") ? 1 : 0) - (hasBuff(a, "first") ? 1 : 0) || (Math.random() - 0.5); });
    for (var j = 0; j < order.length; j++) {
      var m = order[j]; if (!alive(m)) continue;
      if (m.st["행방불명"]) { m.gone = true; this.say(m.name + " — 행방불명이라 이번 라운드에 나서지 못한다", "dim"); continue; }
      var to = m.ctrl && m.ctrl.move ? await m.ctrl.move(m, this) : this.aiMove(m);
      if (to && (to.x !== m.pos.x || to.y !== m.pos.y)) { m.R.moved = Math.max(Math.abs(to.x - m.pos.x), Math.abs(to.y - m.pos.y)); m.pos = { x: to.x, y: to.y }; }
    }
    this.zones.forEach(function (z) { if (z.follow && alive(z.follow)) z.c = { x: z.follow.pos.x, y: z.follow.pos.y }; });
    /* 북원 마세: 이동 단계에 N칸 이상 움직였으면 기세를 얻는다(mvmk:이름:N, 카드마다 라운드에 1번) */
    live.forEach(function (f) { if (!alive(f)) return; f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key !== "mvmk") return; var q = e.arg.split(":"); if ((f.R.moved || 0) >= Number(q[1] || 3)) self.applyEff({ key: "mk", arg: q[0], v: 1 }, f, f, {}); }); }); });
    if (this.opt.onDraw) this.opt.onDraw();
    for (var p = 6; p >= 1 && !this.over(); p--) {
      var grp = order.filter(function (f) { return alive(f) && f.pow === p; });
      if (!grp.length) continue;
      var queue = [];
      for (var k = 0; k < grp.length; k++) {
        var g = grp[k];
        if (g.gone) continue;
        if (g.stun && !g.flags.stunatk) { this.say(g.name + " — 주화입마라 아무것도 못 한다", "dim"); g.R.acted = true; continue; }
        if (g.ctrl && g.ctrl.turn) await g.ctrl.turn(g, this, queue); else await this.aiTurn(g, queue);
        g.R.acted = true;
        while (this._againQ && this._againQ.length) { var aq = this._againQ.shift(); queue.forEach(function (fn) { fn(); }); queue = []; if (alive(aq.f) && alive(aq.t)) { this.say(aq.f.name + " — " + aq.a.name + " 한 번 더", "dim"); await this.attack(aq.f, aq.a, aq.t, [], queue, aq.depth); } }
        if (this._again) { var ag = this._again; this._again = null; if (alive(ag.f) && alive(ag.t)) await this.attack(ag.f, ag.a, ag.t, [], queue, 3); }
      }
      queue.forEach(function (fn) { fn(); });
      this.f.forEach(function (f) { if (f.dying) {} });
      if (this.opt.onDraw) this.opt.onDraw();
    }
    this.roundEnd();
    if (this.opt.onDraw) this.opt.onDraw();
  };
  B.roundEnd = function () {
    var self = this;
    /* 영역 효과 */
    this.zones.forEach(function (z) {
      var inside = self.f.filter(function (g) { return alive(g) && cheb(g.pos, z.c) <= z.rad; });
      inside.forEach(function (g) {
        var foe = g.side !== z.side;
        if (z.kind === "gut" && !foe && Object.keys(g.st).length) self.cleanse(g);
        if (!foe) return;
        var ev = function (sk) { if (!sk || g.stun) return false; return self.check(g, sk, 0, "영역 회피").ok; };
        if (z.kind === "g" && !ev(z.evsk)) self.hurt(g, "집단전", 1, z.owner);
        if (z.kind === "s1" && !ev(z.evsk)) self.hurt(g, "사격전", 1, z.owner);
        if (z.kind === "s1x" && !ev(z.evsk || "독술")) { self.hurt(g, "사격전", 1, z.owner); self.addStatus(g, "외상"); }
        if (z.kind === "chill" && !ev(z.evsk || "음기")) self.addStatus(g, "한기");
        if (z.kind === "cl-1") self.addBuff(g, { key: "cl", v: -1 }, z.owner || g, 1);
        if (z.kind === "noatk" && !ev("섭혼")) self.addBuff(g, { key: "noatk", v: 1 }, z.owner || g, 2);
      });
    });
    this.f.filter(alive).forEach(function (f) {
      f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "aura" && /^g/.test(e.arg) && self.clOk(f, cl, null, null)) self.adjFoes(f).forEach(function (g) { self.hurt(g, "집단전", 1, f); }); }); });
      self.supsFor(f, "Z", null, null).forEach(function (s) { if (self.budget(f) >= s.cost && self.useSupport(f, s, "라운드 끝")) self.applyClause(s.cl, f, null, { sk: s.sk, dfltWho: "self" }); });
      if (f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "chillup"; }); }) || f.supports.some(function (s) { return s.trig === "Z" && s.cl.effs.some(function (e) { return e.key === "chillup"; }); })) { var cg = self.foes(f).filter(function (g) { return g.st["한기"] && !g.st["빙결"] && cheb(g.pos, f.pos) <= 3; })[0]; if (cg) self.addStatus(cg, "한기"); }
    });
    this.f.filter(alive).forEach(function (f) {
      if (f.st["외상"]) { self.say(f.name + " — 외상", "hit"); self.hurt(f, "접근전", 1, null); }
      if (!alive(f)) return;
      if (f.st["한기"] && !f.flags.nocold && d6() >= 5) { self.say(f.name + " — 한기", "hit"); self.hurt(f, "사격전", 1, null); }
      if (f.st["단장독"] && d6() <= 2) { self.say(f.name + " — 단장독", "hit"); self.hurt(f, "사격전", 1, null); }
      if (f.burn && f.burn <= self.round) { f.burn = 0; self.say(f.name + " — 붉은 불꽃", "hit"); self.hurt(f, "사격전", 1, null); }
      if (!alive(f)) return;
      if (self.terrain === "극지" && !self.flag(f, "noterr") && !f.flags.nocold && d6() >= 5) { self.say(f.name + " — 극지의 추위", "hit"); self.hurt(f, "사격전", 1, null); }
      if (!alive(f)) return;
      if (f.buffs.some(function (b) { return b.key === "endst"; })) self.statusRoll(f);
      if (alive(f) && self.cellOf(f) === "!") { self.say(f.name + " — 위험지", "hit"); self.statusRoll(f); }
      f.stun = false;
      Object.keys(f.st).forEach(function (s) {
        if (s === "행방불명" && f.gone) { delete f.st[s]; return; }
        if (s === "고장" || s === "망각") return;
        if (s === "빙결") { if (f.st[s] <= self.round) { delete f.st["빙결"]; delete f.st["한기"]; } return; }
        if (hasBuff(f, "immunest")) return;
        var sk = CURE[s]; var cs = f.passive.filter(function (cl) { return cl.effs.some(function (e) { return e.key === "curesk"; }); })[0]; if (cs) { var alt = cs.effs.filter(function (e) { return e.key === "curesk"; })[0].arg; if (tnOf(f, alt) < tnOf(f, sk)) sk = alt; }
        var r = self.check(f, sk, self.mod(f, "cure"), "〔" + s + "〕 풀기", { notPow: true });
        if (r.ok) { delete f.st[s]; if (s === "한기") delete f.st["빙결"]; }
      });
      f.stun = false;
      if (f.flags.lurk && !f.R.hurt) { f.hidden = 2; }
      Object.keys(RULES.mkTick).forEach(function (k) { var tk = RULES.mkTick[k]; if ((f.mk[k] || 0) >= tk.min) { self.say(f.name + " — " + k + "이(가) 돈다", "hit"); self.hurt(f, "사격전", tk.dm || 1, null); if (alive(f)) { f.mk[k] -= tk.dec || 0; if (f.mk[k] <= 0) delete f.mk[k]; } } });
      f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "zmk" && self.clOk(f, cl, null, null)) { self.limUse(f, cl); self.applyEff({ key: "mk", arg: e.arg, v: 1 }, f, f, {}); } }); });
      f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "zmkhurt") { var q = e.arg.split(":"); self.foes(f).filter(function (g) { return alive(g) && (g.mk[q[0]] || 0) >= Number(q[1] || 3); }).forEach(function (g) { self.hurt(g, q[2] === "c" ? "접근전" : "사격전", 1, f); }); } }); }); /* 라운드 끝 표식 피해(당가 화공대법) */
      f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "zally" && alive(f) && self.clOk(f, cl, null, null)) { var al = self.friends(f).filter(function (g) { return g !== f && alive(g) && cheb(g.pos, f.pos) <= 2; })[0]; if (al) { al.buffs.push({ key: e.arg || "ha", v: 1, left: 2, uses: 1 }); self.say(f.name + " — 호령: " + al.name, "dim"); } } }); }); /* 무림맹 호령 */
      f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "zmkfoe" && self.clOk(f, cl, null, null)) { var fz = self.foes(f).filter(function (g) { return g.mk[e.arg] > 0; })[0]; if (fz) self.applyEff({ key: "mk", arg: e.arg, v: 1 }, f, fz, {}); } }); });
      if (f.flags.bank) f.bankNext = Math.min(lvi(f) >= 2 ? 2 : 1, Math.max(0, self.budget(f)));
      f.buffs.forEach(function (b) { b.left--; }); f.buffs = f.buffs.filter(function (b) { return b.left > 0; });
      if (f.hidden) { f.hidden--; }
    });
    this.f.forEach(function (f) { if (f.dying && !f.out) { f.dying = false; f.used.lastround = 1; self.ko(f); } });
    this.zones.forEach(function (z) { z.rounds--; }); this.zones = this.zones.filter(function (z) { return z.rounds > 0; });
  };
  B.run = async function () {
    var self0 = this;
    this.f.forEach(function (f) { if (f.c && f.c.school === "표국") f.mk["종자"] = 1; }); /* 표물(종자) */
    this.f.forEach(function (f) { f.passive.forEach(function (cl) { cl.effs.forEach(function (e) { if (e.key === "startmk") self0.applyEff({ key: "mk", arg: e.arg, v: 1 }, f, f, {}); }); }); });
    this.f.forEach(function (f) { if (f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "starthide"; }); }) && !self0.adjFoes(f).length) { f.hidden = 2; } });
    this.f.forEach(function (f) { if (f.passive.some(function (cl) { return cl.effs.some(function (e) { return e.key === "starttraitor"; }); })) { var tg = self0.foes(f)[0]; if (tg) self0.applyEff({ key: "traitor", v: 1 }, f, tg, {}); } });
    while (!this.over() && this.round < this.maxRounds) await this.runRound();
    var a = this.f.some(function (f) { return alive(f) && f.side === 0; }), b = this.f.some(function (f) { return alive(f) && f.side === 1; });
    this.winner = a && !b ? 0 : b && !a ? 1 : -1;
    this.say(this.winner === 0 ? "아군 승리" : this.winner === 1 ? "적군 승리" : "승부가 나지 않았다 (" + this.maxRounds + "라운드)", "end");
    return this;
  };

  async function runMany(specs, opt, times, onProg) {
    var res = { n: 0, win: [0, 0, 0], rounds: 0, per: {}, errors: 0 };
    specs.forEach(function (s) { res.per[s.key] = { name: s.c.name, side: s.side, ko: 0, dead: 0, dealt: 0, hp: 0, og: 0, ogDealt: 0 }; });
    var sample = null;
    for (var t = 0; t < times; t++) {
      var fs = specs.map(function (s) { var f = makeFighter(s.c, s); f.key = s.key; return f; });
      var terr = opt.terrain === "무작위" ? pick(TERRAIN) : opt.terrain;
      var b = new Battle(fs, { terrain: terr, map: pickMap(), maxRounds: opt.maxRounds, quiet: t > 0 });
      try { await b.run(); } catch (err) { res.errors++; if (window.console) console.error(err); continue; }
      if (!sample) sample = b;
      res.n++; res.win[b.winner === -1 ? 2 : b.winner]++; res.rounds += b.round;
      fs.forEach(function (f) { var p = res.per[f.key]; if (f.out) p.ko++; if (f.dead) p.dead++; p.dealt += f.dealt; p.hp += f.out ? 0 : hpLeft(f); p.og += f.ogUse; p.ogDealt += f.ogDealt || 0; });
      if (onProg && t % 20 === 19) { onProg(t + 1); await new Promise(function (r) { setTimeout(r, 0); }); }
    }
    res.sample = sample;
    return res;
  }

  /* ── 무작위 오의 ── */
  var OG_PRE = ["자하", "청풍", "백운", "천강", "현천", "태을", "일월", "명월", "광풍", "고검", "북명", "철골", "만리", "천애", "유랑", "풍운"];
  var OG_PRE_M = ["혈영", "귀영", "단혼", "흑풍", "음풍", "마영", "적염", "유명"];
  var OG_SUF = { strike: ["일섬", "절명", "단혼", "관일", "파천"], wide: ["낙성", "폭우", "분운", "만천"], awake: ["개안", "통명"], instant: ["돈오", "귀원"], zdr: ["옥문", "천라", "결계", "진세"], zdis: ["천라", "결계", "진세", "옥문"], guard: ["철벽", "불괴", "금강", "부동"], counter: ["금강", "부동", "철벽"], heal: ["회춘", "소생", "환골", "귀식"], chain: ["연환", "연참", "추혼"], drain: ["흡성", "탈기", "탐혼"], dash: ["유영", "섬영", "환보"], aura: ["강기", "호체", "금종"] };
  function modFits(form, tgt) {
    return String(tgt || "").split("·").some(function (t) {
      t = t.trim();
      if (t === "모든 오의") return true;
      var m = /^(.+?)\((.+)\)$/.exec(t);
      if (m) { var base = m[1], sub = m[2].replace("대미지 감소", "데미지 감소"); return form.indexOf(base) === 0 && form.replace(/형$/, "").indexOf(sub.replace(/형$/, "")) >= 0; }
      return form.indexOf(t) === 0;
    });
  }
  function genOugi(c, grade) {
    var L = A.limits[c.lv] || { og: 0, mod: 0 }, n = L.og + (grade === "두목" ? 1 : 0);
    var mods = A.mods(), out = [];
    var dark = /천마신교|사도/.test(c.group || "");
    var forms = ["연환(連環)형", "흡성(吸星)형", "신법(身法)형", "호신강기(護身罡氣)형"];
    for (var i = 0; i < n; i++) {
      var form = pick(forms), k = ogKind({ form: form });
      var fit = mods.filter(function (m) { return modFits(form, m.tgt) && ["빼앗기", "원한(怨恨)", "탁기(濁氣)", "일로(一路)", "편방(偏防)", "마성(魔性)"].indexOf(m.n) < 0; });
      var strong = fit.filter(function (m) { return m.t === "강점"; }), weak = fit.filter(function (m) { return m.t === "약점"; });
      var ns = Math.floor(Math.random() * 3), nw = Math.max(0, ns - L.mod), picked = [];
      function take(list, cnt) { list = list.slice(); for (var j = 0; j < cnt && list.length; j++) { var m = list.splice(Math.floor(Math.random() * list.length), 1)[0]; if ((m.n === "감추기" && picked.indexOf("호명(呼名)") >= 0) || (m.n === "호명(呼名)" && picked.indexOf("감추기") >= 0)) continue; picked.push(m.n); } }
      take(strong, ns); take(weak, nw + (Math.random() < 0.3 ? 1 : 0));
      var sk = pick(c.skills && c.skills.length ? c.skills : ["검"]);
      out.push({ name: pick(dark ? OG_PRE_M : OG_PRE) + pick(OG_SUF[k]), skill: sk, form: form, mods: picked });
    }
    return out;
  }

  /* ───────── 화면 ───────── */
  var UI = { mode: "bal", sides: [[], []], terrain: "평지", rounds: 15, times: 300, busy: false, res: null, practice: null, rl: ["일류", "일류"], rg: ["", ""], rgr: ["무인", "무인"] };
  function esc(s) { return A.esc(s); }
  function store(k, v) { return A.store(k, v); }
  function loadSides() { var s = store("wx-sim"); if (s && s.sides) { UI.sides = s.sides; UI.terrain = s.terrain || "평지"; UI.rounds = s.rounds || 15; UI.times = s.times || 300; } }
  function saveSides() { store("wx-sim", { sides: UI.sides, terrain: UI.terrain, rounds: UI.rounds, times: UI.times }); }

  function sources() {
    var out = [];
    A.myChars().forEach(function (c) { out.push({ k: "my:" + c.id, label: (c.name || "이름 없음") + " · " + c.lv + " (내 인물지)", c: c, pc: true }); });
    A.archive().forEach(function (d) { (d.chars || []).forEach(function (c) { out.push({ k: "ar:" + d.id + "~" + c.id, label: (c.name || "이름 없음") + " · " + c.lv + " (명부: " + (d.player || "?") + ")", c: c, pc: true }); }); });
    (window.WX_GM_NPCS ? window.WX_GM_NPCS() : []).forEach(function (n) { if (n.c) out.push({ k: "npc:" + n.id, label: n.n + " · " + (n.lv || "") + " " + (n.grade || "") + " (GM NPC)", c: n.c, grade: n.grade, npc: true }); });
    return out;
  }
  function entryHtml(e, side, i) {
    var gs = ["무인", "두목", "졸개", "이물"];
    return '<li class="sim-ent"><b>' + esc(e.c.name || "이름 없음") + '</b> <span class="hint">' + esc((e.c.school || "") + " · " + (e.c.lv || "")) + "</span>" +
      '<select data-sg="' + side + "," + i + '" aria-label="등급">' + gs.map(function (g) { return "<option" + (g === e.grade ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select>" +
      (e.grade === "이물" ? '<label class="hint">생명력 <input type="number" min="1" max="20" value="' + (e.hp || 4) + '" data-sh="' + side + "," + i + '" style="width:4em"></label>' : "") +
      '<label class="hint"><input type="checkbox" data-spc="' + side + "," + i + '"' + (e.pc ? " checked" : "") + "> PC</label>" +
      '<button class="btn small danger" type="button" data-sdel="' + side + "," + i + '">빼기</button></li>';
  }
  function sideHtml(side) {
    var L = UI.sides[side], src = sources();
    return '<section class="sim-side"><h3>' + (side ? "적군" : "아군") + ' <span class="hint">' + L.length + "명</span></h3><ul>" + L.map(function (e, i) { return entryHtml(e, side, i); }).join("") + "</ul>" +
      '<div class="sim-add"><select id="sa-' + side + '"><option value="">— 시트에서 넣기 —</option>' + src.map(function (s) { return '<option value="' + esc(s.k) + '">' + esc(s.label) + "</option>"; }).join("") + "</select>" +
      '<button class="btn small" type="button" data-sadd="' + side + '">넣기</button></div>' +
      '<div class="sim-add"><select id="sr-lv-' + side + '">' + A.levels.map(function (l) { return "<option" + (l === (UI.rl[side] || "일류") ? " selected" : "") + ">" + l + "</option>"; }).join("") + "</select>" +
      '<select id="sr-g-' + side + '"><option value="">무작위 계열</option>' + Object.keys(A.groups).map(function (g) { return "<option" + (g === UI.rg[side] ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("") + "</select>" +
      '<select id="sr-gr-' + side + '">' + ["무인", "두목", "졸개"].map(function (g) { return "<option" + (g === UI.rgr[side] ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select>" +
      '<button class="btn small" type="button" data-sroll="' + side + '">무작위로 넣기</button></div></section>';
  }
  function bossHp() { return UI.sides[0].filter(function (e) { return e.pc; }).length || UI.sides[0].length; }

  function render(view) {
    loadSides();
    var head = A.viewHead("builder", "룰북 '전투'대로 6×6 판에서 싸움을 굴려 봅니다. 공력·이동·명중·회피·데미지·상태이상·전장·오의 형태까지 따르고, 무공 효과 문장은 흔한 꼴만 읽어요.") + A.builderTabs("sim");
    var modeBar = '<div class="sim-mode" role="tablist"><button type="button" class="chip' + (UI.mode === "bal" ? " on" : "") + '" data-smode="bal">밸런스 시험</button><button type="button" class="chip' + (UI.mode === "prac" ? " on" : "") + '" data-smode="prac">연습 대련</button></div>';
    var body = UI.mode === "bal" ? balHtml() : pracHtml();
    view.innerHTML = head + modeBar + body;
    bind(view);
    if (UI.mode === "prac" && UI.practice) drawPractice();
  }
  function pickMap() { var F = window.WX_FIELD; if (!UI.fmap || !F) return null; var s = F.setOf(UI.fmap); return s.id === UI.fmap ? F.parse(pick(s.maps).rows) : null; }
  function optsHtml() {
    var F = window.WX_FIELD;
    return '<div class="sim-opts">' + (F ? '<label>지형 <select id="so-m"><option value="">없음(빈 판)</option>' + F.sets.map(function (s) { return '<option value="' + s.id + '"' + (s.id === UI.fmap ? " selected" : "") + ">" + esc(s.n) + "</option>"; }).join("") + "</select></label>" : "") + '<label>전장 <select id="so-t">' + TERRAIN.concat(["무작위"]).map(function (t) { return "<option" + (t === UI.terrain ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></label>" +
      '<label>최대 라운드 <input id="so-r" type="number" min="3" max="30" value="' + UI.rounds + '"></label>' +
      '<label><input id="so-k" type="checkbox"' + (RULES.killDeclare ? " checked" : "") + '> 적이 숨통 끊기를 선언 (PC가 쓰러지면 흑관문)</label>' +
      (UI.mode === "bal" ? '<label>반복 <select id="so-n">' + [100, 300, 1000].map(function (n) { return "<option" + (n === UI.times ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select>판</label>" : "") + "</div>";
  }
  function balHtml() {
    var r = UI.res;
    return '<p class="hint">두목은 아군 PC 수만큼 추가 생명력을 받습니다(지금 ' + bossHp() + "). 적군 졸개는 라운드마다 공력을 하나로 같이 정해요. 무작위로 넣은 인물은 오의도 경지에 맞게 무작위로 붙어요.</p>" +
      '<div class="sim-sides">' + sideHtml(0) + sideHtml(1) + "</div>" + optsHtml() +
      '<div class="sheet-actions"><button class="btn primary" type="button" id="s-run"' + (UI.busy ? " disabled" : "") + ">" + (UI.busy ? "굴리는 중…" : "굴리기") + '</button><span class="hint" id="s-prog"></span></div>' +
      (r ? resHtml(r) : "") + unparsedHtml();
  }
  function unparsedHtml() {
    var all = UI.sides[0].concat(UI.sides[1]); if (!all.length) return "";
    var rows = all.map(function (e) { var f = makeFighter(e.c, e); return f.unparsed.length ? "<li><b>" + esc(f.name) + "</b> — " + f.unparsed.map(esc).join(", ") + "</li>" : ""; }).join("");
    return rows ? '<details class="sim-note"><summary>시뮬이 일부나 전부를 다루지 못하는 무공</summary><p class="hint">이 무공들은 피해·간격 같은 기본만 계산하고, 표시하지 못한 효과는 빠집니다.</p><ul>' + rows + "</ul></details>" : "";
  }
  function pct(a, b) { return b ? Math.round(a * 1000 / b) / 10 + "%" : "—"; }
  function resHtml(r) {
    var per = Object.keys(r.per).map(function (k) { return r.per[k]; });
    var tbl = '<table class="sim-tbl"><thead><tr><th>이름</th><th>편</th><th>탈락률</th><th>사망률</th><th>판당 입힌 대미지</th><th>남은 생명력(평균)</th><th>판당 오의</th></tr></thead><tbody>' +
      per.map(function (p) { return "<tr><td>" + esc(p.name) + "</td><td>" + (p.side ? "적" : "아") + "</td><td>" + pct(p.ko, r.n) + "</td><td>" + pct(p.dead, r.n) + "</td><td>" + (Math.round(p.dealt / r.n * 10) / 10) + "</td><td>" + (Math.round(p.hp / r.n * 10) / 10) + "</td><td>" + (Math.round(p.og / r.n * 10) / 10) + "</td></tr>"; }).join("") + "</tbody></table>";
    var bars = '<div class="sim-bar" aria-label="승률"><span class="a" style="width:' + (r.win[0] / r.n * 100) + '%"></span><span class="d" style="width:' + (r.win[2] / r.n * 100) + '%"></span><span class="b" style="width:' + (r.win[1] / r.n * 100) + '%"></span></div>';
    return '<section class="sim-res"><h3>' + r.n + "판 결과</h3>" + bars +
      '<p><b>아군 ' + pct(r.win[0], r.n) + "</b> · 비김 " + pct(r.win[2], r.n) + " · <b>적군 " + pct(r.win[1], r.n) + "</b> · 평균 " + (Math.round(r.rounds / r.n * 10) / 10) + "라운드</p>" + tbl + verdict(r) +
      '<details class="sim-log"><summary>예시 한 판 기록 (' + esc(r.sample.terrain) + ")</summary>" + logHtml(r.sample.log) + "</details></section>";
  }
  function verdict(r) {
    var a = r.win[0] / r.n;
    var s = a >= 0.85 ? "아군이 너무 쉽게 이깁니다. 적을 늘리거나 두목을 세게 해도 됩니다." : a >= 0.6 ? "아군이 유리하지만 다칠 만한 싸움입니다." : a >= 0.4 ? "팽팽합니다. 오의와 판정 운에 따라 갈려요." : a >= 0.15 ? "적이 유리합니다. PC 사망이 나올 수 있어요." : "아군이 거의 집니다. 의도한 패배 장면이 아니라면 적을 줄이세요.";
    var dead = Object.keys(r.per).map(function (k) { return r.per[k]; }).filter(function (p) { return p.side === 0 && p.dead / r.n >= 0.05; });
    return '<p class="sim-verdict">' + s + (dead.length ? " 사망률 5%를 넘는 PC: " + dead.map(function (p) { return esc(p.name); }).join(", ") + "." : "") + "</p>";
  }
  function logHtml(L) { return '<ol class="sim-lines">' + L.map(function (l) { return '<li class="' + l.c + '">' + esc(l.s) + "</li>"; }).join("") + "</ol>"; }

  /* ── 연습 대련 ── */
  function pracHtml() {
    if (UI.practice) return '<div id="sim-prac"></div>';
    var mine = A.myChars(), src = sources().filter(function (s) { return s.npc; });
    return '<p class="hint">내 PC 하나로 상대와 겨룹니다. 공력·이동·무공·오의는 직접 고르고, 상대는 시뮬이 움직여요. 회피와 데미지 분야는 주사위가 정합니다.</p>' +
      '<div class="sim-sides"><section class="sim-side"><h3>내 PC</h3>' + (mine.length ? '<select id="sp-me">' + mine.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc((c.name || "이름 없음") + " · " + c.lv) + "</option>"; }).join("") + "</select>" : '<p class="hint">인물지에서 캐릭터를 먼저 만들어 주세요.</p>') + "</section>" +
      '<section class="sim-side"><h3>상대</h3><div class="sim-add"><select id="sp-lv">' + A.levels.map(function (l) { return "<option" + (l === "삼류" ? " selected" : "") + ">" + l + "</option>"; }).join("") + "</select>" +
      '<select id="sp-g"><option value="">무작위 계열</option>' + Object.keys(A.groups).map(function (g) { return "<option>" + esc(g) + "</option>"; }).join("") + "</select>" +
      '<select id="sp-n"><option value="1">1명</option><option value="2">2명</option><option value="3">졸개 3명</option></select></div>' +
      (src.length ? '<div class="sim-add"><select id="sp-npc"><option value="">— 또는 GM NPC —</option>' + src.map(function (s) { return '<option value="' + esc(s.k) + '">' + esc(s.label) + "</option>"; }).join("") + "</select></div>" : "") +
      "</section></div>" + optsHtml() + (mine.length ? '<div class="sheet-actions"><button class="btn primary" type="button" id="sp-go">대련 시작</button></div>' : "");
  }
  function startPractice() {
    var me = A.myChars().filter(function (c) { return c.id === $("#sp-me").value; })[0]; if (!me) return;
    var lv = $("#sp-lv").value, g = $("#sp-g").value, n = $("#sp-n").value, npcK = $("#sp-npc") && $("#sp-npc").value;
    var fs = [], P = { wait: null };
    var mf = makeFighter(me, { side: 0, pc: true, ctrl: humanCtrl(P) }); fs.push(mf);
    if (npcK) { var s = sources().filter(function (x) { return x.k === npcK; })[0]; fs.push(makeFighter(s.c, { side: 1, grade: s.grade === "두목" ? "두목" : "무인", bossHp: 1 })); }
    else if (n === "3") { for (var i = 0; i < 3; i++) { var z = A.roll({ lv: lv, group: g }); z.name = "졸개 " + (i + 1); fs.push(makeFighter(z, { side: 1, grade: "졸개" })); } }
    else for (var j = 0; j < Number(n); j++) { var rc = A.roll({ lv: lv, group: g }); rc.ougi = genOugi(rc, "무인"); fs.push(makeFighter(rc, { side: 1 })); }
    var terr = UI.terrain === "무작위" ? pick(TERRAIN) : UI.terrain;
    var b = new Battle(fs, { terrain: terr, map: pickMap(), maxRounds: UI.rounds, onDraw: function () { drawPractice(); }, onLog: function () { drawLogOnly(); } });
    P.b = b; P.me = mf; UI.practice = P;
    render(A.view());
    b.run().then(function () { P.done = true; P.wait = null; drawPractice(); });
  }
  /* 사람이 고르는 컨트롤러: 각 단계에서 화면에 고를 것을 띄우고 Promise로 기다린다 */
  function humanCtrl(P) {
    function ask(kind, data) { return new Promise(function (ok) { P.wait = { kind: kind, data: data, ok: function (v) { P.wait = null; ok(v); drawPractice(); } }; drawPractice(); }); }
    return {
      pow: function (f) { return ask("pow", {}); },
      move: function (f, b) { return ask("move", { cells: b.reachable(f) }); },
      turn: function (f, b, queue) { return ask("turn", { queue: queue }).then(function (act) { return doHumanAct(f, b, act, queue); }); },
      guard: function (g, src, a, dmg, b) {
        var gs = b.guardOptions(g).filter(function (p) { return p.g === g; }).map(function (p) { return p.o; });
        if (!gs.length || a.type === "집단전") return Promise.resolve(b.aiGuard(g, src, a, dmg) && b.guardOptions(g).filter(function (p) { return p.g !== g; })[0] || null);
        return ask("guard", { gs: gs, src: src, a: a, dmg: dmg }).then(function (o) { return o ? { g: g, o: o } : null; });
      },
      lossPick: null,
      autoS: true
    };
  }
  async function doHumanAct(f, b, act, queue) {
    if (!act) return;
    var tg = b.f.filter(function (x) { return x.id === act.tg; })[0];
    (act.og || []).forEach(function (o) { var tgt = o.tg ? b.f.filter(function (x) { return x.id === o.tg; })[0] : f; var og = f.ougi.filter(function (q) { return q.i === o.i; })[0]; b.useOugi(f, og, tgt || f, queue); });
    (act.tsup || []).forEach(function (i) {
      var s = f.supports[i]; if (!s || b.budget(f) < s.cost) return;
      var foeT = s.cl.effs.some(function (e) { return e.who === "foe" || e.who === "foes" || e.key === "zone"; }) ? (tg || b.foes(f).sort(function (x, y) { return dist(f.pos, x.pos) - dist(f.pos, y.pos); })[0]) : null;
      if (b.useSupport(f, s, "")) { b.applyClause(s.cl, f, foeT, { sk: bestSkill(f, s.sk), dfltWho: "self", dflt: 2 }); if (b.hasEff([s.cl], "asatk")) f.R.atk = true; }
    });
    if (act.atk != null && !f.stun) {
      var a = f.attacks[act.atk];
      var sup = (act.sup || []).map(function (i) { return f.supports[i]; });
      await b.attack(f, a, tg, sup, queue);
    }
  }
  function cellCls(b, x, y) { var f = b.at(x, y); return f ? (f.side ? "foe" : "me") : ""; }
  function drawLogOnly() { var el = document.getElementById("sp-log"); var P = UI.practice; if (el && P) { el.innerHTML = logHtml(P.b.log.slice(-300)); el.scrollTop = el.scrollHeight; } }
  function drawPractice() {
    var el = document.getElementById("sim-prac"), P = UI.practice; if (!el || !P) return;
    var b = P.b, w = P.wait, me = P.me, sel = P.sel || {};
    var reach = {}; if (w && w.kind === "move") w.data.cells.forEach(function (c) { reach[c.x + "," + c.y] = 1; });
    var atkA = w && w.kind === "turn" && sel.atk != null ? me.attacks[sel.atk] : null;
    var inR = {}; if (atkA) b.targetsOf(me, atkA, null).concat(b.foes(me).filter(function (g) { return b.targetsOf(me, atkA, g).indexOf(g) >= 0; })).forEach(function (g) { inR[g.id] = 1; });
    var grid = '<div class="sim-grid t-' + TERRAIN.indexOf(b.terrain) + '">';
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var f = b.at(x, y), k = x + "," + y, zone = b.zones.some(function (z) { return cheb(z.c, { x: x, y: y }) <= (z.rad == null ? 1 : z.rad); });
      var tc = b.grid ? b.grid[y][x] : ".", tname = tc !== "." && window.WX_FIELD ? WX_FIELD.terr[tc][0] : "";
      grid += '<button type="button" class="cell ' + cellCls(b, x, y) + (reach[k] ? " reach" : "") + (f && inR[f.id] ? " tgt" : "") + (f && sel.tg === f.id ? " sel" : "") + (zone ? " zone" : "") + (tname ? " tr tr-" + "#~cbw^v!TD=_i".indexOf(tc) : "") + '" data-cx="' + x + '" data-cy="' + y + '" title="' + esc((f ? f.name + " " : "") + (tname ? tname + " — " + WX_FIELD.terr[tc][1] : "")) + '">' + (tname ? '<span class="trn">' + esc(tname) + "</span>" : "") +
        (f ? '<span class="tok">' + esc(f.name.slice(0, 2)) + '</span><span class="hpd">' + hpLeft(f) + "</span>" : "") + "</button>";
    }
    grid += "</div>";
    var roster = b.f.slice().sort(function (x, y) { return (y.pow || 0) - (x.pow || 0); }).map(function (f) {
      return '<li class="' + (f.side ? "foe" : "me") + (f.out ? " out" : "") + '"><b>' + esc(f.name) + "</b> " + esc(f.c.lv || "") + " " + (f.grade !== "무인" ? esc(f.grade) + " " : "") + "· 생명력 " + hpLeft(f) +
        (f.pool ? "" : ' <span class="hint">' + FIELDS.map(function (x) { return f.lost[x] ? "<s>" + x + "</s>" : x; }).join(" ") + (f.extra ? " +" + f.extra : "") + "</span>") +
        (f.pow ? " · 공력 " + (f.side && w && w.kind === "pow" ? "?" : f.pow) : "") + (Object.keys(f.st).length ? " · 〔" + Object.keys(f.st).join("·") + "〕" : "") + (f.stun ? " · 주화입마" : "") + Object.keys(f.mk || {}).map(function (k) { return " · " + k + " " + f.mk[k]; }).join("") + (f.dead ? " · 사망" : "") + "</li>";
    }).join("");
    var ctl = "";
    if (P.done) ctl = '<p><b>' + (b.winner === 0 ? "이겼습니다" : b.winner === 1 ? "졌습니다" : "승부가 나지 않았습니다") + '</b></p><div class="sheet-actions"><button class="btn primary" type="button" id="sp-again">다시 하기</button></div>';
    else if (!w) ctl = '<p class="hint">상대가 움직이는 중…</p>';
    else if (w.kind === "pow") ctl = "<p><b>" + b.round + "라운드 · 공력을 정하세요</b> " + '<span class="hint">높을수록 먼저 움직이고, 그만큼 이동·코스트 한계. 판정이 공력보다 낮으면 주화입마.</span></p><div class="sim-pow">' + [1, 2, 3, 4, 5, 6].map(function (p) { return '<button class="btn" type="button" data-pow="' + p + '">' + p + "</button>"; }).join("") + "</div>";
    else if (w.kind === "move") ctl = "<p><b>이동</b> — 밝은 칸을 누르세요 (" + b.moveSteps(me) + '칸까지). <span class="hint">무공 간격에서 대각선은 1.5칸이라, 간격 1 무공은 옆으로 붙어야 닿아요.</span></p><div class="sheet-actions"><button class="btn small" type="button" id="sp-stay">제자리</button></div>';
    else if (w.kind === "guard") ctl = "<p><b>" + esc(w.data.src.name) + "</b>의 " + esc(w.data.a.name) + " — 대미지 " + w.data.dmg + ". 방어 오의를 쓸까요?</p><div class=\"sheet-actions\">" + w.data.gs.map(function (o, i) { return '<button class="btn small" type="button" data-gd="' + i + '">「' + esc(o.name) + "」 " + esc(o.form) + "</button>"; }).join("") + '<button class="btn small" type="button" data-gd="-1">맞는다</button></div>';
    else if (w.kind === "turn") {
      var budget = b.budget(me);
      var atks = me.attacks.map(function (a, i) {
        var sk = bestSkill(me, a.sk), tn = tnOf(me, sk);
        var why = me.R.atk ? "이미 공격함" : a.cost > budget ? "코스트 부족" : tn >= 99 ? "판정할 수 없음" : me.st["내상"] === a.name ? "내상" : (a.uses && (me.B.names[a.name] || 0) >= a.uses) ? "횟수를 다 씀" : (a.needmv && (me.R.moved || 0) < a.needmv) ? "이동이 모자람" : "", dis = !!why;
        return '<label class="pick' + (dis ? " off" : "") + '"><input type="radio" name="sp-a" value="' + i + '"' + (sel.atk === i ? " checked" : "") + (dis ? " disabled" : "") + '><span><span class="nm">' + esc(a.name) + '</span> <span class="hint">《' + esc(sk) + "》 " + (tn >= 99 ? "—" : tn + "+") + " · 간격 " + b.rangeOfAtk(me, a) + " · 코스트 " + a.cost + " · " + esc(a.type) + (a.type === "집단전" ? "" : " " + a.dmg) + (a.area !== "one" ? " · 여럿" : "") + (why ? " · <b>" + why + "</b>" : "") + "</span></span></label>";
      }).join("");
      var sups = me.supports.map(function (s, i) { if (s.trig !== "H" || !b.clOk(me, s.cl, null, atkA)) return ""; return '<label class="hint"><input type="checkbox" data-sup="' + i + '"' + ((sel.sup || []).indexOf(i) >= 0 ? " checked" : "") + "> 명중 직전 보조 " + esc(s.n) + " (코스트 " + s.cost + ")</label>"; }).join(" ");
      var tsups = me.supports.map(function (s, i) { if (s.trig !== "T" || !b.limOk(me, s.cl)) return ""; return '<label class="hint"><input type="checkbox" data-tsup="' + i + '"' + ((sel.tsup || []).indexOf(i) >= 0 ? " checked" : "") + "> 턴 보조 " + esc(s.n) + " (코스트 " + s.cost + ")</label>"; }).join(" ");
      var ogs = me.ougi.filter(function (o) { return b.ougiOk(me, o); }).map(function (o) { var k = ogKind(o); if (k === "guard" || k === "counter") return ""; return '<label class="hint"><input type="checkbox" data-og="' + o.i + '"' + ((sel.og || []).indexOf(o.i) >= 0 ? " checked" : "") + "> 오의 「" + esc(o.name) + "」 " + esc(o.form) + ((o.mods || []).length ? " · " + esc(o.mods.join("·")) : "") + "</label>"; }).join(" ");
      ctl = "<p><b>내 턴</b> — 공력 " + me.pow + " · 남은 코스트 " + budget + '. 무공을 고르고 판에서 대상을 누르세요.</p><div class="picker sp-atks">' + atks + "</div>" +
        (atkA && A.find(atkA.name) && A.find(atkA.name).e ? '<p class="hint sp-eff"><b>' + esc(atkA.name) + "</b> " + esc(A.find(atkA.name).e) + "</p>" : "") +
        (function () { var eq = (me.c.mg || []).map(function (n) { return A.find(n); }).filter(function (r) { return r && r.t === "장비"; }); return eq.length ? '<details class="hint"><summary>내 장비 무공 ' + eq.length + "개(늘 켜져 있음)</summary>" + eq.map(function (r) { return "<p><b>" + esc(r.n) + "</b> " + esc(r.e || "") + "</p>"; }).join("") + "</details>" : ""; })() + (sups.trim() ? "<div>" + sups + "</div>" : "") + (tsups.trim() ? "<div>" + tsups + '</div><p class="hint">턴 보조는 공격 전에 씁니다. 적에게 거는 것은 판에서 고른 대상(없으면 가장 가까운 적)에게 갑니다.</p>' : "") + (ogs ? "<div>" + ogs + '</div><p class="hint">흡성은 판에서 고른 대상(2칸 안)에게 씁니다.</p>' : "") +
        '<div class="sheet-actions"><button class="btn primary small" type="button" id="sp-act">실행</button><button class="btn small" type="button" id="sp-pass">턴 넘기기</button></div>';
    }
    el.innerHTML = '<div class="sim-prac"><div>' + grid + '<p class="hint">전장: ' + esc(b.terrain) + " · " + b.round + '라운드</p></div><div><ul class="sim-roster">' + roster + "</ul>" + ctl + '</div></div><div class="sim-log2" id="sp-log"></div>' +
      '<div class="sheet-actions"><button class="btn small danger" type="button" id="sp-quit">대련 그만두기</button></div>';
    drawLogOnly();
    bindPractice(el);
  }
  function bindPractice(el) {
    var P = UI.practice, w = P.wait, me = P.me;
    P.sel = P.sel || {};
    el.onclick = function (e) {
      var t = e.target.closest("button, input"); if (!t) return;
      if (t.id === "sp-quit" || t.id === "sp-again") { UI.practice = null; render(A.view()); return; }
      if (!w) return;
      if (t.dataset.pow) { w.ok(Number(t.dataset.pow)); return; }
      if (t.id === "sp-stay") { w.ok(me.pos); return; }
      if (t.dataset.gd != null) { var gi = Number(t.dataset.gd); w.ok(gi < 0 ? null : w.data.gs[gi]); return; }
      if (t.dataset.cx != null) {
        var x = Number(t.dataset.cx), y = Number(t.dataset.cy);
        if (w.kind === "move") { if (w.data.cells.some(function (c) { return c.x === x && c.y === y; })) w.ok({ x: x, y: y }); return; }
        if (w.kind === "turn") { var f = P.b.at(x, y); if (f && f.side !== me.side) { P.sel.tg = f.id; drawPractice(); } return; }
      }
      if (t.name === "sp-a") { P.sel.atk = Number(t.value); drawPractice(); return; }
      if (t.dataset.sup != null) { var si = Number(t.dataset.sup), L = P.sel.sup || []; P.sel.sup = t.checked ? L.concat([si]) : L.filter(function (v) { return v !== si; }); return; }
      if (t.dataset.tsup != null) { var ti = Number(t.dataset.tsup), L3 = P.sel.tsup || []; P.sel.tsup = t.checked ? L3.concat([ti]) : L3.filter(function (v) { return v !== ti; }); return; }
      if (t.dataset.og != null) { var oi = Number(t.dataset.og), L2 = P.sel.og || []; P.sel.og = t.checked ? L2.concat([oi]) : L2.filter(function (v) { return v !== oi; }); return; }
      if (t.id === "sp-pass") { P.sel = {}; w.ok(null); return; }
      if (t.id === "sp-act") {
        var s = P.sel, ogs = (s.og || []).map(function (i) { var o = me.ougi.filter(function (q) { return q.i === i; })[0], k = ogKind(o); return { i: i, tg: (k === "strike" || k === "wide" || k === "zdis") ? s.tg : null }; });
        var needTg = ogs.some(function (o) { var k = ogKind(me.ougi.filter(function (q) { return q.i === o.i; })[0]); return (k === "strike" || k === "wide") && !o.tg; });
        if (needTg) { A.toast("공격 오의를 쓸 대상을 판에서 누르세요"); return; }
        var badOg = ogs.filter(function (o) { var q = me.ougi.filter(function (z) { return z.i === o.i; })[0], k = ogKind(q), tg = P.b.f.filter(function (z) { return z.id === o.tg; })[0]; return k === "drain" && tg && dist(me.pos, tg.pos) > 2 + (hasMod(q, "뻗기") ? 1 : 0) - (hasMod(q, "단척") ? 1 : 0); });
        if (badOg.length) { A.toast("오의가 닿지 않아요 (흡성 2칸)"); return; }
        if (s.atk != null) {
          var a = me.attacks[s.atk], tg = P.b.f.filter(function (z) { return z.id === s.tg; })[0];
          if (!tg || P.b.targetsOf(me, a, tg).indexOf(tg) < 0) { A.toast("그 무공이 닿는 대상을 판에서 누르세요"); return; }
          var cost = a.cost + (s.sup || []).concat(s.tsup || []).reduce(function (n, i) { return n + me.supports[i].cost; }, 0);
          if (cost > P.b.budget(me)) { A.toast("코스트 한계를 넘어요"); return; }
        }
        var act = { atk: s.atk, tg: s.tg, sup: s.sup || [], tsup: s.tsup || [], og: ogs }; P.sel = {}; w.ok(act);
      }
    };
  }

  function $(s) { return document.querySelector(s); }
  function bind(view) {
    view.querySelectorAll("[data-smode]").forEach(function (b) { b.onclick = function () { UI.mode = b.dataset.smode; render(view); }; });
    var fm = $("#so-m"); if (fm) fm.onchange = function () { UI.fmap = fm.value; };
    var t = $("#so-t"); if (t) t.onchange = function () { UI.terrain = t.value; saveSides(); };
    var kd = $("#so-k"); if (kd) kd.onchange = function () { RULES.killDeclare = kd.checked; };
    var r = $("#so-r"); if (r) r.onchange = function () { UI.rounds = Math.max(3, Math.min(30, Number(r.value) || 15)); saveSides(); };
    var n = $("#so-n"); if (n) n.onchange = function () { UI.times = Number(n.value); saveSides(); };
    view.querySelectorAll("[data-sadd]").forEach(function (b) {
      b.onclick = function () {
        var side = Number(b.dataset.sadd), k = $("#sa-" + side).value; if (!k) return;
        var s = sources().filter(function (x) { return x.k === k; })[0]; if (!s) return;
        UI.sides[side].push({ c: JSON.parse(JSON.stringify(s.c)), grade: s.grade && ["무인", "두목", "졸개", "이물"].indexOf(s.grade) >= 0 ? s.grade : "무인", pc: !!s.pc, side: side, key: "k" + Date.now() + Math.random() });
        saveSides(); render(view);
      };
    });
    view.querySelectorAll("[data-sroll]").forEach(function (b) {
      b.onclick = function () {
        var side = Number(b.dataset.sroll), c = A.roll({ lv: $("#sr-lv-" + side).value, group: $("#sr-g-" + side).value });
        var gr = $("#sr-gr-" + side).value;
        if (gr !== "졸개") c.ougi = genOugi(c, gr);
        UI.rl[side] = $("#sr-lv-" + side).value; UI.rg[side] = $("#sr-g-" + side).value; UI.rgr[side] = gr;
        if (gr === "졸개") c.name = "졸개 " + (UI.sides[side].filter(function (e) { return e.grade === "졸개"; }).length + 1);
        UI.sides[side].push({ c: c, grade: gr, pc: side === 0 && gr !== "졸개", side: side, key: "k" + Date.now() + Math.random() });
        saveSides(); render(view);
      };
    });
    view.querySelectorAll("[data-sdel]").forEach(function (b) { b.onclick = function () { var p = b.dataset.sdel.split(","); UI.sides[p[0]].splice(Number(p[1]), 1); saveSides(); render(view); }; });
    view.querySelectorAll("[data-sg]").forEach(function (s) { s.onchange = function () { var p = s.dataset.sg.split(","); UI.sides[p[0]][p[1]].grade = s.value; saveSides(); render(view); }; });
    view.querySelectorAll("[data-sh]").forEach(function (s) { s.onchange = function () { var p = s.dataset.sh.split(","); UI.sides[p[0]][p[1]].hp = Number(s.value) || 4; saveSides(); }; });
    view.querySelectorAll("[data-spc]").forEach(function (s) { s.onchange = function () { var p = s.dataset.spc.split(","); UI.sides[p[0]][p[1]].pc = s.checked; saveSides(); }; });
    var run = $("#s-run"); if (run) run.onclick = function () {
      if (!UI.sides[0].length || !UI.sides[1].length) { A.toast("양편에 한 명 이상 넣어 주세요"); return; }
      UI.busy = true; render(view);
      var bh = bossHp();
      var specs = UI.sides[0].concat(UI.sides[1]).map(function (e) { return { c: e.c, side: e.side, grade: e.grade, pc: e.pc, hp: e.hp, bossHp: bh, key: e.key }; });
      runMany(specs, { terrain: UI.terrain, maxRounds: UI.rounds }, UI.times, function (k) { var p = $("#s-prog"); if (p) p.textContent = k + " / " + UI.times; })
        .then(function (res) { UI.res = res; UI.busy = false; render(view); }, function (err) { UI.busy = false; render(view); A.toast("굴리다 멈췄어요: " + (err && err.message)); });
    };
    var go = $("#sp-go"); if (go) go.onclick = startPractice;
  }

  window.renderSim = function (view) { A = window.WX_SIM_API; if (!A) return; render(view); };
  /* 시험용 */
  window.WX_SIM = { rules: RULES, compile: compile, fxGaps: fxGaps, makeFighter: makeFighter, Battle: Battle, runMany: runMany, genOugi: genOugi, setApi: function (a) { A = a; } };
})();
