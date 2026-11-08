/* 바깥 사이트용 연결: claude.use("db"/"user")를 파이어베이스로 바꿔 준다.
   db  = Firestore(compat) 그대로. 문서·컬렉션·onSnapshot 모양이 같다.
   user = 구글 로그인. 주인장 = WX_OWNER_EMAIL 계정.
   mcp·artifact(시트 동기화·게시)는 없다 → null. */
(function () {
  var cfg = window.WX_FB_CONFIG;
  var ready;
  if (!cfg || !window.firebase) {
    ready = Promise.resolve(null);
  } else {
    firebase.initializeApp(cfg);
    var auth = firebase.auth(), fs = firebase.firestore();
    var first = true;
    ready = new Promise(function (res) {
      auth.onAuthStateChanged(function (u) {
        if (first) { first = false; res({ fs: fs, u: u }); drawLogin(u); return; }
        location.reload(); /* 로그인·로그아웃하면 새로 연다 */
      });
    });
    auth.getRedirectResult().catch(function (e) { toastLogin("로그인하지 못했어요 (" + (e && e.code || "오류") + ")"); });
  }
  function owner(u) { return !!(u && u.email && window.WX_OWNER_EMAIL && u.email.toLowerCase() === String(WX_OWNER_EMAIL).toLowerCase()); }
  function userApi(u) {
    return {
      isOwner: function () { return owner(u); },
      canEdit: function () { return owner(u); },
      can: function (n) { return n === "data.write" ? !!u : null; },
      id: function () { return u ? u.uid : null; },
      me: function () { return u ? { id: u.uid, name: u.displayName || "" } : { id: "", name: "" }; },
      profiles: function (ids) { var o = {}; (ids || []).forEach(function (i) { o[i] = { id: i, name: u && i === u.uid ? (u.displayName || "") : "" }; }); return o; },
      guest: !u
    };
  }
  window.claude = {
    use: function (name) {
      return ready.then(function (r) {
        if (!r) return null;
        if (name === "db") return r.fs;
        if (name === "user") return userApi(r.u);
        return null;
      });
    }
  };
  /* 로그인 단추 */
  function signIn() {
    var p = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(p).catch(function (e) {
      if (e && /popup/.test(e.code || "")) return firebase.auth().signInWithRedirect(p);
      toastLogin("로그인하지 못했어요 (" + (e && e.code || "오류") + ")");
    });
  }
  function drawLogin(u) {
    function put() {
      var b = document.getElementById("wx-login");
      if (!b) { b = document.createElement("div"); b.id = "wx-login"; document.body.appendChild(b); }
      if (u) {
        b.innerHTML = '<span class="who"></span><button type="button">로그아웃</button>';
        b.querySelector(".who").textContent = (u.displayName || u.email || "로그인됨") + (owner(u) ? " · 주인장" : "");
        b.querySelector("button").onclick = function () { firebase.auth().signOut(); };
        if (owner(u)) addImport(b);
      } else {
        b.innerHTML = '<button type="button" class="in">구글로 로그인</button>';
        b.querySelector("button").onclick = signIn;
      }
    }
    if (document.body) put(); else document.addEventListener("DOMContentLoaded", put);
  }
  function toastLogin(t) { var b = document.getElementById("wx-login"); if (b) b.setAttribute("title", t); try { alert(t); } catch (x) { } }
  /* 주인장 전용: 옛 사이트 자료(JSON 파일) 가져오기. {docs:[{path, data}]} */
  function addImport(box) {
    var lab = document.createElement("label"); lab.className = "imp"; lab.textContent = "자료 가져오기";
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json"; inp.hidden = true;
    lab.appendChild(inp); box.appendChild(lab);
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      f.text().then(function (t) {
        var j = JSON.parse(t), docs = (j && j.docs) || [];
        if (!confirm(docs.length + "개 문서를 덮어씁니다. 진행할까요?")) return;
        var fs = firebase.firestore(), i = 0, bad = 0;
        lab.firstChild.textContent = "가져오는 중 0/" + docs.length;
        function next() {
          if (i >= docs.length) { alert("끝났어요. " + (docs.length - bad) + "개 저장" + (bad ? ", " + bad + "개 실패" : "")); location.reload(); return; }
          var d = docs[i++];
          fs.doc(d.path).set(d.data).catch(function (e) { bad++; console.warn(d.path, e); }).then(function () { lab.firstChild.textContent = "가져오는 중 " + i + "/" + docs.length; next(); });
        }
        next();
      }).catch(function (e) { alert("파일을 읽지 못했어요: " + e.message); });
    };
  }
  window.WX_SIGNIN = signIn;
})();
