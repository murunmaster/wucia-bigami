/* ═════════ GM 서고 · 에너미 — 에너미 메이커, 에너미 목록, 전투 짜기
   룰북 '에너미'의 등급(졸개·무인·두목·이물)과 위협도 규칙을 따른다.
   영물 생명력 8+PC 수×2, 고유 1개, 구역의 주인은 「괴력난신과 네임드 에너미」의 제안.
   gm.js가 에너미 탭에서 WX_ENEMY.draw(box, ctx)를 부른다. ═════════ */
(function () {
  var LV = ["삼류", "이류", "일류", "절정", "화경", "현경"];
  var GRADES = ["졸개", "무인", "두목", "이물"];
  var KINDS = ["마인", "괴력난신", "요괴", "영물", "사람"];

  /* ── 기본 제공 에너미 목록 ── hp: 숫자 / {b: 기본, p: PC 수마다} · tn: 고정 목표치 */
  function A(n, t, r, c, e) { return { n: n, t: t, r: r, c: c, e: e }; }
  var CAT = [
    /* 귀주의 세 산주 */
    { id: "e-seomyeo", set: "귀주의 세 산주", n: "뇌공 섬여(雷公蟾蜍)", kind: "영물", grade: "이물", lv: "화경", hp: { b: 8, p: 2 }, tn: 5,
      where: "뇌공산 · 종유굴 섬여 못",
      uniq: { n: "탄마(呑魔)", e: "섬여가 있는 전투에서는 괴력난신의 '공격 성공 시 마기 1'이 일어나지 않는다. 라운드가 끝날 때마다 생명력 1 회복(전투당 3번)." },
      own: "섬여 못(수면). 수면 칸에서 회피 판정 유리점 1.",
      abil: [A("뇌명(雷鳴)", "공격", "3", "2", "간격 안 적 전원에게 사격전 1점. 맞은 대상은 다음 라운드 종료까지 명중 판정에 불리점 1."),
        A("독설(毒舌)", "공격", "3", "1", "접근전 2점. 대상을 섬여와 인접한 칸으로 끌어온다. 수면 칸이면 대상은 다음 라운드 이동 −1."),
        A("탄기(呑氣)", "보조", "2", "0", "라운드에 1번. 간격 안 캐릭터 1명(적·아군)의 마기 1을 먹는다. 그 캐릭터가 마공을 익혔으면 이번 라운드 마공을 쓸 수 없다. 섬여 생명력 1 회복."),
        A("독혹(毒瘤)", "장비", "—", "—", "섬여를 접근전으로 친 캐릭터는 상태이상 '외상'(라운드에 1번). 받는 접근전 대미지 1 감소(라운드에 1번).")],
      loot: "뇌공단(영약): 마기폭주가 바로 풀리고, 그 캠페인 동안 마기 한계에 1을 더한다(1명).",
      lore: "묘족이 뇌공이라 모시는 천 년 묵은 두꺼비. 원년의 검은 비를 마시고 등이 검은 혹으로 덮였다. 뇌공산에 고이는 마기를 먹고, 먹은 마기는 내단으로 굳는다. 묘채 무녀가 못가에 술을 부으면 울지 않는다.",
      gm: "섬여가 죽으면 이튿날부터 금잠고모가 자라고 귀주 전역 마기 한계 −1. 화운낭랑이 내단을 노린다. 싸우지 않는 길: 무녀의 술 → 비가 오고 못 아래 물길이 열려 '섬여의 허물'(피독주 효과)." },
    { id: "e-baekaek", set: "귀주의 세 산주", n: "백액대왕(白額大王)", kind: "영물", grade: "이물", lv: "화경", hp: { b: 8, p: 2 }, tn: 5, extraThreat: 1,
      where: "요왕장(제위철의 모습) / 귀주 산중",
      uniq: { n: "사람의 가죽", e: "전투를 시작할 때는 제위철의 모습이다. GM 서고 NPC '제위철'의 무공·오의로 싸우고, 대미지는 먼저 가죽(PC 수만큼)에서 깎는다. 가죽이 다 깎이면 찢어지며 본모습이 나온다. 그 라운드는 행동하지 않는다." },
      abil: [A("맹습(猛襲)", "공격", "1", "2", "이 공격 전에 3칸까지 움직인다(다른 캐릭터를 뛰어넘는다). 접근전 2점. 2칸 이상 움직였으면 대상은 회피 판정에 불리점 1."),
        A("산군포효(山君咆哮)", "보조", "3", "2", "전투당 2번. 간격 안 적 전원은 다음 판정에 불리점 1. 일류 이하인 적은 상태이상 '망각'(《섭혼》으로 회피)."),
        A("창귀(倀鬼)", "보조", "1", "1", "라운드에 1번. 인접한 칸에 창귀 졸개 1명(동시에 PC 수까지). 창귀가 인접해 있으면 대왕을 노린 공격을 대신 받을 수 있다."),
        A("백액(白額)", "장비", "—", "—", "받는 사격전 대미지 1 감소(라운드에 1번). 생명력 절반 이하면 공력에 1을 더한다.")],
      loot: "창귀가 모두 풀린다. 그 가운데 제위철의 넋이 요왕장의 비밀 하나를 말한다.",
      lore: "이마의 흰 털이 王 자 모양인 천 년 묵은 범. 먹힌 자의 넋인 창귀가 곁을 따른다. 백 년 전부터 사람을 먹지 않는다.",
      gm: "제위철을 삼키고 요왕장 장주 행세. 화운낭랑이 다른 두 산주를 건드리지 못하게 지켜본다. 호미의 청으로 소랑을 지킨다. 창귀의 이름을 《초혼》으로 부르면 풀린다. 이름 열 개 이상이면 싸우지 않고 귀주의 길 하나를 내준다." },
    { id: "e-geumjam", set: "귀주의 세 산주", n: "금잠고모(金蠶蠱母)", kind: "영물", grade: "이물", lv: "화경", hp: { b: 8, p: 2 }, hpNote: "+ 그날 쌓인 마기", tn: 5,
      where: "뇌공산 · 서강 묘채 아래 고왕동",
      uniq: { n: "마기로 자란다", e: "그날 쌓인 마기만큼 생명력이 늘어난다. 섬여가 죽은 뒤에는 날마다 생명력 +2(캠페인 동안 쌓인다)." },
      abil: [A("금잠입체(金蠶入體)", "공격", "2", "2", "사격전 1점. 맞은 대상의 몸에 금잠이 든다: 라운드가 끝날 때마다 접근전 1점. 자신의 턴에 《의술》이나 《독술》 판정에 성공하면 뺀다(공격 무공 사용으로 친다)."),
        A("황금비(黃金雨)", "공격", "3", "3", "전투당 1번. 간격 안 적 전원 집단전. 맞은 PC는 엽전 1d6냥을 얻는다. '고모의 돈'이라 쓰는 날마다 그 PC에게 마기 1. 버려도 다음 날 돌아온다. 고모를 쓰러뜨리면 그냥 돈이 된다."),
        A("분잠(分蠶)", "보조", "2", "1", "라운드에 1번. 빈 칸 둘에 누에 졸개를 하나씩(동시에 PC 수×2까지)."),
        A("황금고치(黃金繭)", "보조", "0", "0", "전투당 1번. 생명력이 절반 이하일 때. 다음 라운드 종료까지 받는 대미지를 모두 무시하고 공격하지 않는다. 그 라운드가 끝날 때 생명력 2 회복.")],
      loot: "금잠 씨(기보): 세션마다 엽전 2d6냥. 세션마다 1번 '먹이'(생명력 1이나 NPC 하나)를 요구한다.",
      lore: "묘족 고독 가운데 가장 귀한 금잠고의 어미. 오백 년 전 서강 묘채 무녀가 고왕동에 들였다. 그 뒤로 묘채는 굶은 적이 없다.",
      gm: "무녀는 해마다 바깥사람 하나를 '남편'으로 들여 피로 먹인다(암야전 살수). 지금 남편은 야묘의 스승, 늙어 피가 모자란다. 싸우지 않는 길: 새 남편이 된다(한 해 생명력 최대치 −1, 고독을 값없이)." },
    { id: "e-changgwi", set: "귀주의 세 산주", n: "창귀(倀鬼)", kind: "괴력난신", grade: "졸개", lv: "화경", hp: 1, tn: 6,
      abil: [A("부름", "공격", "2", "0", "집단전. 대상은 창귀 쪽으로 1칸 끌려온다.")],
      lore: "백액대왕에게 먹힌 자의 넋. 제 이름을 불러 달라고 운다.",
      gm: "《초혼》 판정에 성공하고 이름(GM이 정함)을 부르면 공격 대신 풀려 사라진다." },
    { id: "e-nue", set: "귀주의 세 산주", n: "금잠 누에", kind: "요괴", grade: "졸개", lv: "화경", hp: 1, tn: 6,
      abil: [A("물기", "공격", "1", "0", "접근전 1점. 맞으면 금잠이 든다(전투당 PC 1명에 1번).")],
      lore: "금잠고모가 뱉어 낸 황금빛 누에." },

    /* 이름난 괴력난신·요괴 */
    { id: "e-homi", set: "이름난 괴력난신·요괴", n: "호미(胡媚)", kind: "요괴", grade: "이물", lv: "화경", hp: { b: 8, p: 2 }, tn: 5,
      where: "귀주 · 폭포 뒤 동굴 근처",
      uniq: { n: "아홉 꼬리", e: "생명력이 0이 될 때마다 꼬리 하나를 잃고 생명력 3으로 일어선다. 남은 꼬리는 셋. 다 사라지면 죽는다." },
      abil: [A("혹심(惑心)", "공격", "3", "2", "집단전. 상태이상 '망각', 다음 라운드 첫 공격의 대상을 호미가 정한다(아군도 고를 수 있다). 《섭혼》으로 회피."),
        A("여우불(狐火)", "공격", "3", "1", "사격전 1점. 대상이 '망각' 상태면 +1."),
        A("둔갑(遁甲)", "보조", "—", "1", "라운드에 1번. 판 위의 빈 칸으로 옮기고 다음 라운드 종료까지 은신."),
        A("꼬리 감기", "장비", "—", "—", "인접한 적이 이동하려면 《신법》 판정에 성공해야 한다.")],
      loot: "사정을 안 PC에게 꼬리 하나: 은신 판정 유리점 1, 세션에 1번 '망각'을 푼다.",
      lore: "요왕장 시조 호희의 꼬리에서 자란 구미호가 사람의 몸을 얻었다. 1458년 천산에서 소교주와 혼인했고 이듬해 사라졌다.",
      gm: "소랑의 어미. 야율광풍은 아이를 모른다. 화운낭랑은 짐작한다. 아이의 피는 허물을 삼키는 그릇이 될 수 있다. 싸우지 않고 홀려서 쫓는 자와 싸우게 한다." },
    { id: "e-temur", set: "이름난 괴력난신·요괴", n: "테무르부카", kind: "괴력난신", grade: "이물", lv: "현경", hp: { b: 10, p: 2 }, tn: 5,
      where: "천산 · 성성협(군망의 검은 관)",
      uniq: { n: "원한의 방향", e: "하북팽가 핏줄(팽가 PC·팽천패·호노)이 판 위에 있으면 그만 노리고, 그 핏줄에게 주는 대미지 +1." },
      abil: [A("만호의 창", "공격", "2", "2", "접근전 2점. 대상과 인접한 다른 적 1명에게도 접근전 1점."),
        A("백 년의 관(棺)", "보조", "—", "2", "전투당 1번. 관 속으로 들어간다. 다음 라운드 종료까지 대미지를 받지 않고, 강시 졸개 PC 수만큼이 관 둘레에 일어선다."),
        A("시강(屍僵)", "장비", "—", "—", "받는 접근전·사격전 대미지 각각 1 감소(라운드에 1번). 상태이상을 받지 않는다.")],
      lore: "병마령 첫 령주, 원의 만호. 대도 성문 뒤 집에서 가족을 잃었다. 백 년을 버틴 끝에 불사강시의 첫 몸이 되었다.",
      gm: "호노(팽호)와 토목보에서 같은 들판에 있었다. 호노가 팽가 사당의 칼 이야기를 하면 관이 한 번 열린다." },
    { id: "e-uryang", set: "이름난 괴력난신·요괴", n: "백골장군 우량", kind: "괴력난신", grade: "이물", lv: "화경", hp: { b: 8, p: 2 }, tn: 5,
      where: "호광 · 무릉원 시체 마을",
      uniq: { n: "집에 가고 싶다", e: "먼저 공격하지 않는다. PC가 마을에 해를 끼치면 그때 싸운다." },
      abil: [A("철갑 주먹", "공격", "1", "2", "접근전 2점."),
        A("마을 사람들", "보조", "—", "1", "라운드에 1번. 시체 졸개 1명을 세운다. 공격하지 않고 PC를 막아선다."),
        A("쇠처럼 굳은 몸", "장비", "—", "—", "받는 접근전·사격전 대미지 각각 1 감소(라운드에 1번). 상태이상을 받지 않는다.")],
      lore: "병마령 2대 령주. 막북에서 죽은 명군 장수. 처음 한 말이 '집에 가고 싶다'였다. 집에 가고 싶은 시체들을 모아 무릉원에 마을을 만들었다.",
      gm: "고향은 산동 동평 악가 아랫마을. 악가 옛 장부에서 이름을 찾아 알려 주면 마을 시체 마흔이 북으로 걷기 시작한다." },
    { id: "e-azhdaha", set: "이름난 괴력난신·요괴", n: "혈귀 아즈다하", kind: "괴력난신", grade: "이물", lv: "현경", hp: { b: 10, p: 2 }, tn: 5,
      where: "천산 · 혈곡 가장 깊은 굴",
      uniq: { n: "피의 구결", e: "판 위 누구든 대미지를 받을 때마다 생명력 1 회복(라운드에 2번)." },
      abil: [A("혈사(血絲)", "공격", "4", "2", "사격전 1점. 피의 실이 이어진다: 대상이 이동할 때마다 접근전 1점(라운드에 1번). 《저주》 판정으로 끊는다."),
        A("광기의 구결", "공격", "3", "3", "집단전. 맞은 대상은 다음 라운드 첫 공격을 가장 가까운 캐릭터에게 한다. 마공을 익힌 대상에게는 명중 유리점 1."),
        A("혈신(血身)", "보조", "—", "2", "전투당 1번. 생명력 2를 내고 다음 라운드 종료까지 주는 대미지 +1.")],
      lore: "사마르칸트에서 쫓겨난 술사. 혈교의 '피의 스승'. 교도들은 그를 본 적이 없다.",
      gm: "천마에게서 광기 구결을 받았다. 혈교가 천마의 사육장임을 안다. 말하지 않는다." },
    { id: "e-galpae", set: "이름난 괴력난신·요괴", n: "운중호 갈패", kind: "괴력난신", grade: "두목", lv: "절정",
      where: "섬서 진령 · 백운채",
      uniq: { n: "아직 군령을 기억한다", e: "제강천이나 군마녹림 PC가 《병법》 판정에 성공하면 그 라운드 행동하지 않는다(전투당 1번)." },
      mg: "도호녹림부, 역벽화산, 산채일갈, 인다세중, 두령 + 마공 하나. 오의 3",
      lore: "산채째 괴력난신이 된 녹림 백운채의 채주. 제강천의 군문 시절 부하.",
      gm: "제강천은 누군가 대신 베어 주기를 바란다. 그 사람에게 총채주의 신임." },
    { id: "e-dancheon", set: "이름난 괴력난신·요괴", n: "단천(段天)", kind: "마인", grade: "두목", lv: "화경",
      where: "성도마다의 객잔(하룻밤 만찬)",
      uniq: { n: "마지막 만찬", e: "단천의 요리를 먹은 캐릭터는 그와의 전투 첫 라운드에 행동하지 않는다. 《간파》로 알아보고 먹지 않았거나, 국 끓이는 노파의 국을 먹었으면 해당하지 않는다." },
      mg: "공수입백인, 응급, 정혈, 무형검, 이소박대, 흡성대법(마공). 오의 4: 칼질·국물·도마·불길. 쓰는 특기 《연단》《손놀림》",
      lore: "사람을 먹는 요리사. 입마한 생업의 도. 그의 요리를 먹으면 하루 동안 마기가 쌓이지 않는다.",
      gm: "국 끓이는 노파의 사형. 단골은 모용단죽. 알묘공으로 거둔 잠재력을 요리로 굳힌다." },
    { id: "e-cloudtiger", set: "이름난 괴력난신·요괴", n: "구름 범", kind: "요괴", grade: "이물", lv: "절정", hp: 5, tn: 6, where: "섬서 진령 · 백운채",
      abil: [A("물어뜯기", "공격", "1", "1", "접근전 1점. 인접한 다른 요괴가 있으면 +1."), A("몰이", "보조", "—", "0", "같은 대상을 노린 다른 요괴의 명중 판정 유리점 1.")],
      lore: "백운채가 기르던 사냥개가 범처럼 커졌다." },

    /* 흔한 괴력난신 */
    { id: "e-heukwu", set: "마계의 흔한 것들", n: "흑우인(黑雨人) 떼", kind: "괴력난신", grade: "졸개", lv: "삼류", hp: 1, tn: 8,
      abil: [A("젖은 손", "공격", "1", "0", "접근전 1점. 맞은 대상은 다음 라운드 이동 −1.")],
      lore: "원년 사흘 검은 비를 맞은 백성. 피부가 검게 젖은 채 마르지 않는다." },
    { id: "e-heukwu1", set: "마계의 흔한 것들", n: "흑우인(이름 있는 하나)", kind: "괴력난신", grade: "이물", lv: "삼류", hp: 3, tn: 6,
      abil: [A("젖은 손", "공격", "1", "1", "접근전 1점. 맞은 대상은 다음 라운드 이동 −1."), A("비 냄새", "장비", "—", "—", "비 오는 전장에서 판정 목표치 −1.")],
      lore: "원년 검은 비를 맞은 자 가운데 아직 이름을 기억하는 자." },
    { id: "e-seosaeng", set: "마계의 흔한 것들", n: "비를 맞은 서생", kind: "괴력난신", grade: "이물", lv: "삼류", hp: 3, tn: 6,
      abil: [A("젖은 손", "공격", "1", "1", "접근전 1점. 맞은 대상은 다음 라운드 이동 −1."), A("흑필(黑筆)", "공격", "3", "2", "사격전 1점. 맞은 대상은 상태이상 '망각'."), A("비 냄새", "장비", "—", "—", "비 오는 전장에서 판정 목표치 −1.")],
      lore: "원년 개봉 과거장 밖에서 검은 비를 맞았다. 붓을 놓지 않는다. 글씨가 마기가 깃든 부적이 된다.",
      gm: "황산 서해 대협곡의 백 명 가운데 한 사람의 동생. 형의 얼굴을 한 관리를 조정에서 보았다고 한다." },
    { id: "e-gwangin", set: "마계의 흔한 것들", n: "광인(狂人) 무리", kind: "괴력난신", grade: "졸개", lv: "이류", hp: 1, tn: 8,
      abil: [A("낫과 도리깨", "공격", "1", "0", "접근전 1점.")],
      lore: "깨닫지 않고도 마기에 서서히 무너진 마을 사람. 같은 말만 한다.",
      gm: "《화술》 판정에 성공하면 한 명이 잠시 제정신이 든다(이름과 사연 하나)." },
    { id: "e-magyeon", set: "마계의 흔한 것들", n: "마견(魔犬)", kind: "요괴", grade: "이물", lv: "이류", hp: 3, tn: 6,
      abil: [A("물어뜯기", "공격", "1", "1", "접근전 1점. 인접한 다른 마견이 있으면 +1."), A("몰이", "보조", "—", "0", "같은 대상을 노린 다른 마견의 명중 판정 유리점 1.")],
      lore: "마기를 머금은 들개. 무리 지어 다닌다." },
    { id: "e-sima", set: "마계의 흔한 것들", n: "시마(屍魔)", kind: "괴력난신", grade: "이물", lv: "일류", hp: 4, tn: 6,
      abil: [A("움켜쥐기", "공격", "1", "1", "접근전 2점."), A("쓰러져도 일어난다", "장비", "—", "—", "처음 생명력 0이 될 때 1로 일어선다.")],
      lore: "옛 싸움터·무덤에서 마기로 일어선 시체. 아무도 부리지 않는다." },
    { id: "e-heukhak", set: "마계의 흔한 것들", n: "검은 학", kind: "요괴", grade: "이물", lv: "절정", hp: 5, tn: 6,
      abil: [A("부리", "공격", "2", "2", "사격전 2점."), A("날개바람", "보조", "2", "1", "간격 안 적 하나를 2칸 밀어낸다."), A("명산의 기억", "장비", "—", "—", "휴식할 수 있는 구역에서는 마기 1이 쌓이지 않는다.")],
      lore: "명산의 학이 마성을 보고 검게 물들었다. 마기가 옅은 명산에만 나온다." },
    { id: "e-sichebeople", set: "마계의 흔한 것들", n: "시체 마을 사람", kind: "괴력난신", grade: "졸개", lv: "화경", hp: 1, tn: 6,
      abil: [A("막아서기", "보조", "1", "0", "공격하지 않는다. 인접한 PC의 이동 −1.")],
      lore: "무릉원에서 집을 짓고 밭을 가는 시체들." },
    { id: "e-gangsi", set: "마계의 흔한 것들", n: "강시 졸개", kind: "괴력난신", grade: "졸개", lv: "절정", hp: 1, tn: 7,
      abil: [A("굳은 팔", "공격", "1", "0", "접근전 1점. 받는 첫 사격전 대미지는 무시한다.")],
      lore: "병마령 연단사가 부리는 시체. 천지혈전에서 쓰러진 정파의 얼굴도 있다." }
  ];

  /* endata.js(WX_EN_SEED)에서 위 목록에 없는 것을 덧붙인다 */
  (function () {
    var S = window.WX_EN_SEED; if (!S || !S.length) return;
    var HAVE = ["en-seomyeo", "en-baekaek", "en-changgwi", "en-geumjam", "en-nue", "en-heukuin", "en-heukuin1", "en-seosaeng", "en-gwangin", "en-magyeon", "en-sima", "en-heukhak", "en-galpae", "en-gureumbeom", "en-dancheon", "en-homi", "en-temurbuqa", "en-gangsi", "en-uryang", "en-sicheo", "en-azdaha"];
    var names = {}; CAT.forEach(function (c) { names[c.n] = 1; });
    S.forEach(function (x) {
      if (HAVE.indexOf(x.id) >= 0 || names[x.n]) return;
      var u = null;
      if (x.trait) { var i = x.trait.indexOf(":"); u = i > 0 && i < 20 ? { n: x.trait.slice(0, i).trim(), e: x.trait.slice(i + 1).trim() } : { n: "특징", e: x.trait }; }
      CAT.push({ id: x.id, set: x.g === "마계" ? "마계의 흔한 것들" : (x.g || "그 밖"), n: x.n, kind: x.kind || "", grade: x.grade, lv: x.lv,
        hp: x.grade === "이물" ? (x.hpPc ? { b: Number(x.hp) || 8, p: x.hpPc } : Number(x.hp) || 4) : undefined, tn: x.tn ? Number(x.tn) : undefined, hpNote: x.hpNote || "", extraThreat: x.threatAdd || 0,
        uniq: u, abil: x.abil || [], mg: [x.mg, x.og].filter(Boolean).join(". "), loot: x.loot || "", lore: x.lore || "", gm: [x.gm, x.how].filter(Boolean).join(" ") });
    });
  })();

  /* 메이커에서 고를 수 있는 이능: 목록의 이능 + 범용 몇 개 */
  var GENERIC = [
    A("할퀴기", "공격", "1", "1", "접근전 1점."), A("들이받기", "공격", "1", "2", "접근전 2점. 대상을 1칸 밀어낸다."),
    A("독침", "공격", "3", "1", "사격전 1점. 상태이상 '외상'."), A("울부짖음", "공격", "3", "2", "간격 안 적 전원 집단전."),
    A("마기 토하기", "공격", "2", "2", "사격전 1점. 맞은 대상에게 마기 1(괴력난신 규칙과 별도, 전투당 1번)."),
    A("숨기", "보조", "—", "1", "다음 라운드 종료까지 은신."), A("떼 부르기", "보조", "—", "1", "라운드에 1번. 같은 종류의 졸개 1명을 세운다."),
    A("두꺼운 가죽", "장비", "—", "—", "받는 접근전 대미지 1 감소(라운드에 1번)."), A("독 피", "장비", "—", "—", "자신을 접근전으로 친 캐릭터는 상태이상 '외상'(라운드에 1번).")
  ];
  function abilLib() {
    var seen = {}, out = [];
    CAT.forEach(function (c) { (c.abil || []).forEach(function (a) { if (!seen[a.n]) { seen[a.n] = 1; out.push(a); } }); });
    GENERIC.forEach(function (a) { if (!seen[a.n]) { seen[a.n] = 1; out.push(a); } });
    return out;
  }

  /* ── 수치 ── */
  function lvStep(lv) { var i = LV.indexOf(lv); return i < 0 ? 1 : i + 1; }
  function hpOf(x, pc) {
    if (x.grade === "졸개") return 1;
    if (x.grade === "무인") return 6;
    if (x.grade === "두목") return 6 + pc;
    if (typeof x.hp === "object" && x.hp) return x.hp.b + x.hp.p * pc;
    return Number(x.hp) || 4;
  }
  function tnOf(x) {
    if (x.grade === "졸개") { var i = LV.indexOf(x.lv); return i <= 1 ? 8 : i <= 3 ? 7 : 6; }
    if (x.grade === "이물") return x.tn || (x.kind === "영물" ? 5 : 6);
    return null;
  }
  function threatOf(x, pc) {
    var s = lvStep(x.lv);
    if (x.grade === "졸개") return 0.5;
    if (x.grade === "무인") return s;
    if (x.grade === "두목") return s + 2;
    return s + (hpOf(x, pc) >= 6 ? 1 : 0) + (x.extraThreat || 0);
  }
  function hpText(x, pc) {
    var v = hpOf(x, pc);
    if (x.grade === "두목") return v + " (6 + 추가 " + pc + ")";
    if (typeof x.hp === "object" && x.hp) return v + " (" + x.hp.b + " + PC " + pc + "×" + x.hp.p + ")" + (x.hpNote ? " " + x.hpNote : "");
    return String(v) + (x.hpNote ? " " + x.hpNote : "");
  }

  /* ── 상태 ── */
  var ST = { pc: 3, pclv: "이류", q: "", set: "", mk: blank(), enc: [], tab: "list" };
  function blank() { return { n: "", kind: "괴력난신", grade: "이물", lv: "이류", hp: 4, hpPer: false, tn: "", abil: [], uniq: "", mg: "", where: "", lore: "", gm: "", loot: "" }; }
  try { var sv = JSON.parse(sessionStorage.getItem("wx-gm-enemy") || "null"); if (sv) { ST.pc = sv.pc || 3; ST.pclv = sv.pclv || "이류"; ST.enc = sv.enc || []; ST.mk = Object.assign(blank(), sv.mk || {}); } } catch (x) { }
  function save() { try { sessionStorage.setItem("wx-gm-enemy", JSON.stringify({ pc: ST.pc, pclv: ST.pclv, enc: ST.enc, mk: ST.mk })); } catch (x) { } }

  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function mkObj() {
    var m = ST.mk, o = { n: m.n || "이름 없는 에너미", kind: m.kind, grade: m.grade, lv: m.lv, abil: m.abil, where: m.where, lore: m.lore, gm: m.gm, loot: m.loot, mg: m.mg };
    if (m.grade === "이물") o.hp = m.hpPer ? { b: Number(m.hp) || 8, p: 2 } : Number(m.hp) || 4;
    if (m.tn) o.tn = Number(m.tn);
    if (m.uniq) { var p = m.uniq.split(/[:：]/); o.uniq = p.length > 1 ? { n: p[0].trim(), e: p.slice(1).join(":").trim() } : { n: "고유", e: m.uniq }; }
    return o;
  }

  /* ── 글로 ── */
  function statText(x, pc) {
    var L = [];
    L.push("【" + x.n + "】 " + [x.kind, x.lv, x.grade].filter(Boolean).join(" · "));
    L.push("생명력 " + hpText(x, pc) + (tnOf(x) ? " · 판정 목표치 " + tnOf(x) : " · 특기는 PC처럼") + " · 위협도 " + threatOf(x, pc) + (x.grade === "이물" ? " · 공력 매 라운드 1d6" : ""));
    if (x.kind === "괴력난신") L.push("괴력난신: 감정 판정 불가, 공격이 성공하면 대상에게 마기 1(전투당 1번)");
    if (x.grade === "두목") L.push("두목: 오의 +1, 한 라운드에 서로 다른 공격 무공 2개");
    if (x.uniq) L.push("고유 " + x.uniq.n + ": " + x.uniq.e);
    if (x.own) L.push("구역의 주인: " + x.own);
    (x.abil || []).forEach(function (a) { L.push("- " + a.n + " (" + a.t + " · 간격 " + a.r + " · 코스트 " + a.c + ") " + a.e); });
    if (x.mg) L.push("무공: " + x.mg);
    if (x.loot) L.push("전과: " + x.loot);
    return L.join("\n");
  }

  /* ── 그리기 ── */
  function card(x, pc, src) {
    var t = threatOf(x, pc), tn = tnOf(x);
    return '<article class="en-card"><div class="en-h"><b>' + e(x.n) + '</b><span class="gm-meta">' + e([x.kind, x.lv, x.grade].filter(Boolean).join(" · ")) + (x.where ? " · " + e(x.where) : "") + '</span><span class="en-t">위협도 ' + t + "</span></div>" +
      '<p class="en-stat">생명력 <b>' + e(hpText(x, pc)) + "</b>" + (tn ? " · 목표치 <b>" + tn + "</b>" : " · 특기는 PC처럼") + (x.grade === "이물" ? " · 공력 1d6" : "") + (x.kind === "괴력난신" ? " · 감정 불가 · 공격 성공 시 마기 1" : "") + (x.grade === "두목" ? " · 오의 +1 · 공격 무공 2개" : "") + "</p>" +
      (x.uniq ? '<p class="en-uniq"><span class="lbl">고유</span> <b>' + e(x.uniq.n) + "</b> " + e(x.uniq.e) + "</p>" : "") +
      (x.own ? '<p class="en-uniq"><span class="lbl">구역의 주인</span> ' + e(x.own) + "</p>" : "") +
      ((x.abil || []).length ? '<div class="tablewrap"><table class="en-ab"><thead><tr><th>이능</th><th>종류</th><th>간격</th><th>코스트</th><th>효과</th></tr></thead><tbody>' + x.abil.map(function (a) { return "<tr><td>" + e(a.n) + "</td><td>" + e(a.t) + "</td><td>" + e(a.r) + "</td><td>" + e(a.c) + "</td><td>" + e(a.e) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "") +
      (x.mg ? '<p><span class="lbl">무공</span> ' + e(x.mg) + "</p>" : "") +
      (x.loot ? '<p><span class="lbl">전과</span> ' + e(x.loot) + "</p>" : "") +
      (x.lore ? '<p class="lore">' + e(x.lore) + "</p>" : "") +
      (x.gm ? '<p class="en-gm"><span class="lbl">GM</span> ' + e(x.gm) + "</p>" : "") +
      '<div class="gm-actions">' +
      '<button type="button" class="btn small" data-en="enc-add" data-src="' + src + '">전투 짜기에 넣기</button>' +
      (src.indexOf("c:") === 0 ? '<button type="button" class="btn small" data-en="to-maker" data-src="' + src + '">메이커로 불러오기</button><button type="button" class="btn small" data-en="to-npc" data-src="' + src + '">서고 NPC로 넣기</button>' : '<button type="button" class="btn small" data-en="open-npc" data-src="' + src + '">NPC 탭에서 열기</button>') +
      '<button type="button" class="btn small" data-en="copy" data-src="' + src + '">글로 복사</button></div></article>';
  }

  function savedList(ctx) {
    return (ctx.GM.npc || []).filter(function (n) { return n.enemy || n.grade === "이물" || n.grade === "졸개"; }).map(function (n) {
      var x = Object.assign({}, n.enemy || {}, { n: n.n, grade: n.grade, lv: n.lv, where: n.role || "" });
      if (!x.hp) x.hp = Number(n.hp) || (n.grade === "이물" ? 8 : 1);
      if (n.tn && !x.tn) x.tn = Number(n.tn);
      if (!x.kind) x.kind = n.grade === "이물" ? "괴력난신" : "";
      if (!x.lore && !n.enemy) x.gm = n.memo;
      x._id = n.id; return x;
    });
  }
  function findSrc(src, ctx) {
    if (src.indexOf("c:") === 0) return CAT.filter(function (c) { return c.id === src.slice(2); })[0];
    if (src.indexOf("n:") === 0) return savedList(ctx).filter(function (c) { return c._id === src.slice(2); })[0];
    if (src === "mk") return mkObj();
    return null;
  }

  function makerHtml() {
    var m = ST.mk, x = mkObj(), lib = abilLib();
    function opt(list, cur) { return list.map(function (v) { return "<option" + (v === cur ? " selected" : "") + ">" + e(v) + "</option>"; }).join(""); }
    return '<section class="en-maker"><h2>에너미 메이커</h2><p class="hint">룰북 \'에너미\'의 등급과 위협도로 계산합니다. 무인·두목의 무공 시트는 서고에 넣은 뒤 NPC 탭의 \'주사위로 만들기\'로 붙이세요.</p>' +
      '<div class="gm-grid">' +
      '<div class="field"><label for="en-n">이름</label><input id="en-n" data-mk="n" value="' + e(m.n) + '"></div>' +
      '<div class="field"><label for="en-kind">종류</label><select id="en-kind" data-mk="kind">' + opt(KINDS, m.kind) + "</select></div>" +
      '<div class="field"><label for="en-grade">등급</label><select id="en-grade" data-mk="grade">' + opt(GRADES, m.grade) + "</select></div>" +
      '<div class="field"><label for="en-lv">경지</label><select id="en-lv" data-mk="lv">' + opt(LV, m.lv) + "</select></div>" +
      (m.grade === "이물" ? '<div class="field"><label for="en-hp">생명력' + (m.hpPer ? " (기본, PC마다 +2)" : "") + '</label><input id="en-hp" data-mk="hp" inputmode="numeric" value="' + e(m.hp) + '"></div>' +
        '<div class="field"><label><input type="checkbox" data-mk="hpPer"' + (m.hpPer ? " checked" : "") + '> 영물처럼 PC 수에 비례</label></div>' +
        '<div class="field"><label for="en-tn">목표치 (비우면 6, 영물 5)</label><input id="en-tn" data-mk="tn" inputmode="numeric" value="' + e(m.tn) + '"></div>' : "") +
      '<div class="field wide"><label for="en-where">자리</label><input id="en-where" data-mk="where" value="' + e(m.where) + '"></div>' +
      (m.grade === "이물" ? '<div class="field wide"><label for="en-uniq">고유 (이름: 효과)</label><input id="en-uniq" data-mk="uniq" value="' + e(m.uniq) + '" placeholder="예: 아홉 꼬리: 생명력이 0이 될 때마다…"></div>' : "") +
      (m.grade === "무인" || m.grade === "두목" ? '<div class="field wide"><label for="en-mg">무공 (메모)</label><input id="en-mg" data-mk="mg" value="' + e(m.mg) + '" placeholder="익힌 무공, 마공, 오의"></div>' : "") +
      '<div class="field wide"><label for="en-lore">내력</label><textarea id="en-lore" data-mk="lore" rows="2">' + e(m.lore) + "</textarea></div>" +
      '<div class="field wide"><label for="en-gm">GM 메모</label><textarea id="en-gm" data-mk="gm" rows="2">' + e(m.gm) + "</textarea></div>" +
      '<div class="field wide"><label for="en-loot">전과</label><input id="en-loot" data-mk="loot" value="' + e(m.loot) + '"></div>' +
      "</div>" +
      (m.grade === "졸개" || m.grade === "이물" ? '<div class="en-pick"><label for="en-ab">이능 고르기 (' + m.abil.length + "/" + (m.grade === "졸개" ? 2 : 4) + ')</label><select id="en-ab"><option value="">이능 목록에서…</option>' +
        lib.map(function (a, i) { return '<option value="' + i + '">' + e(a.n + " · " + a.t + " · " + a.e.slice(0, 40)) + "</option>"; }).join("") +
        '</select><button type="button" class="btn small" data-en="ab-add">넣기</button><button type="button" class="btn small" data-en="ab-new">직접 쓰기</button></div>' +
        '<div class="en-ablist">' + m.abil.map(function (a, i) {
          return '<div class="en-abrow"><input data-ab="' + i + '" data-k="n" value="' + e(a.n) + '" aria-label="이능 이름"><select data-ab="' + i + '" data-k="t">' + opt(["공격", "보조", "장비"], a.t) + '</select><input data-ab="' + i + '" data-k="r" value="' + e(a.r) + '" aria-label="간격" class="sm"><input data-ab="' + i + '" data-k="c" value="' + e(a.c) + '" aria-label="코스트" class="sm"><input data-ab="' + i + '" data-k="e" value="' + e(a.e) + '" aria-label="효과" class="wide"><button type="button" class="btn small gm-del" data-en="ab-del" data-i="' + i + '">빼기</button></div>';
        }).join("") + "</div>" : "") +
      '<h3>미리 보기</h3>' + card(x, ST.pc, "mk").replace(/<div class="gm-actions">[\s\S]*<\/div><\/article>$/, "</article>") +
      '<div class="gm-actions"><button type="button" class="btn small primary" data-en="mk-npc">서고 NPC로 넣기</button><button type="button" class="btn small" data-en="enc-add" data-src="mk">전투 짜기에 넣기</button><button type="button" class="btn small" data-en="copy" data-src="mk">글로 복사</button><button type="button" class="btn small gm-del" data-en="mk-clear">비우기</button><span class="gm-saved" id="en-msg" aria-live="polite"></span></div></section>';
  }

  function encHtml() {
    var pc = ST.pc, step = lvStep(ST.pclv), base = pc * step;
    var tot = ST.enc.reduce(function (s, x) { return s + x.t * x.k; }, 0);
    var tag = !ST.enc.length ? "—" : tot <= base * 0.75 ? "쉬운 전투" : tot <= base * 1.25 ? "보통의 전투" : tot <= base * 1.75 ? "어려운 전투" : "결전";
    return '<section class="en-enc"><h2>전투 짜기</h2><div class="gm-bar">' +
      '<div class="field"><label for="en-pc">PC 수</label><input id="en-pc" data-st="pc" type="number" min="1" max="8" value="' + pc + '"></div>' +
      '<div class="field"><label for="en-pclv">PC 경지</label><select id="en-pclv" data-st="pclv">' + LV.map(function (v) { return "<option" + (v === ST.pclv ? " selected" : "") + ">" + v + "</option>"; }).join("") + "</select></div>" +
      '<p class="en-budget">보통 <b>' + base + "</b> · 쉬운 " + base / 2 + " · 어려운 " + base * 1.5 + " · 결전 " + base * 2 + "</p></div>" +
      (ST.enc.length ? '<div class="tablewrap"><table class="en-ab"><thead><tr><th>에너미</th><th>위협도</th><th>수</th><th></th></tr></thead><tbody>' + ST.enc.map(function (x, i) {
        return "<tr><td>" + e(x.n) + "</td><td>" + x.t + '</td><td><button type="button" class="btn small" data-en="enc-dec" data-i="' + i + '">−</button> ' + x.k + ' <button type="button" class="btn small" data-en="enc-inc" data-i="' + i + '">+</button></td><td><button type="button" class="btn small gm-del" data-en="enc-del" data-i="' + i + '">빼기</button></td></tr>';
      }).join("") + "</tbody></table></div>" : '<p class="hint">아래 목록이나 메이커에서 \'전투 짜기에 넣기\'를 누르세요.</p>') +
      '<p class="en-total">합계 <b>' + tot + "</b> / 보통 " + base + " → <b>" + tag + "</b>" + (ST.enc.length ? ' <button type="button" class="btn small" data-en="enc-copy">글로 복사</button> <button type="button" class="btn small gm-del" data-en="enc-clear">비우기</button>' : "") + "</p>" +
      '<p class="hint">위협도: 졸개 0.5 · 무인 경지 단계 · 두목 +2 · 이물 생명력 6 이상이면 +1. 6×6 판에 놓기 어려우면 졸개를 줄이고 두목의 추가 생명력을 늘린다.</p></section>';
  }

  function listHtml(ctx) {
    var t = ST.q.trim(), pc = ST.pc;
    var saved = savedList(ctx).filter(function (x) { return !t || (x.n + " " + (x.where || "")).indexOf(t) >= 0; });
    var sets = []; CAT.forEach(function (c) { if (sets.indexOf(c.set) < 0) sets.push(c.set); });
    var rows = CAT.filter(function (c) { return (!ST.set || c.set === ST.set) && (!t || (c.n + " " + (c.where || "") + " " + (c.lore || "") + " " + c.kind).indexOf(t) >= 0); });
    return '<section class="en-list"><h2>에너미 목록</h2><div class="gm-bar"><div class="field"><label for="en-q">찾기</label><input id="en-q" type="search" data-st="q" value="' + e(ST.q) + '" placeholder="이름·자리·종류"></div>' +
      '<div class="field"><label for="en-set">묶음</label><select id="en-set" data-st="set"><option value="">전체</option>' + sets.map(function (s) { return "<option" + (s === ST.set ? " selected" : "") + ">" + e(s) + "</option>"; }).join("") + "</select></div></div>" +
      (saved.length ? '<h3>서고에 넣은 에너미 <small>' + saved.length + "</small></h3>" + saved.map(function (x) { return card(x, pc, "n:" + x._id); }).join("") : "") +
      sets.filter(function (s) { return rows.some(function (c) { return c.set === s; }); }).map(function (s) {
        return "<h3>" + e(s) + "</h3>" + rows.filter(function (c) { return c.set === s; }).map(function (c) { return card(c, pc, "c:" + c.id); }).join("");
      }).join("") + "</section>";
  }

  function render(root, ctx) {
    root.innerHTML = '<nav class="subtabs en-tabs">' + [["list", "에너미 목록"], ["maker", "에너미 메이커"], ["enc", "전투 짜기"]].map(function (t) { return '<a href="#gm" data-en="tab" data-t="' + t[0] + '"' + (ST.tab === t[0] ? ' aria-current="page"' : "") + ">" + t[1] + (t[0] === "enc" && ST.enc.length ? " <small>" + ST.enc.length + "</small>" : "") + "</a>"; }).join("") + "</nav>" +
      (ST.tab === "maker" ? makerHtml() : ST.tab === "enc" ? encHtml() : listHtml(ctx));
  }

  function msg(root, t) { var m = root.querySelector("#en-msg"); if (m) m.textContent = t; else if (window.toast) toast(t); }
  function copy(t) { if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { if (window.toast) toast("복사했어요"); }); }
  function toNpc(x, ctx, root) {
    if (!ctx.DB) return;
    var id = "n" + Date.now().toString(36);
    var en = { kind: x.kind || "", hp: x.hp || null, tn: x.tn || null, abil: x.abil || [], uniq: x.uniq || null, own: x.own || "", loot: x.loot || "", lore: x.lore || "", mg: x.mg || "", hpNote: x.hpNote || "", extraThreat: x.extraThreat || 0, cat: x.id || "" };
    var data = { n: x.n, g: x.set || x.kind || "에너미", role: x.where || "", grade: x.grade, lv: x.lv, map: "", zone: "", memo: [x.lore, x.gm].filter(Boolean).join(" "), hp: typeof x.hp === "object" && x.hp ? String(x.hp.b) : String(x.hp || ""), tn: x.tn ? String(x.tn) : "", loot: x.loot || "", enemy: JSON.parse(JSON.stringify(en)) };
    ctx.DB.collection(ctx.COL_N).doc(id).set(data).then(function () { msg(root, "서고 NPC로 넣었어요: " + x.n); if (window.toast) toast("서고 NPC로 넣었어요"); })
      .catch(function (err) { msg(root, "넣지 못했어요 (" + (err && err.code || "오류") + ")"); });
  }

  function bind(root, ctx) {
    root.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-en]"); if (!b) return;
      ev.preventDefault();
      var a = b.dataset.en, x;
      if (a === "tab") { ST.tab = b.dataset.t; render(root, ctx); return; }
      if (a === "enc-add") { x = findSrc(b.dataset.src, ctx); if (!x) return; var t = threatOf(x, ST.pc), f = ST.enc.filter(function (y) { return y.n === x.n; })[0]; if (f) f.k++; else ST.enc.push({ n: x.n, t: t, k: 1 }); save(); if (window.toast) toast("전투 짜기에 넣었어요"); render(root, ctx); return; }
      if (a === "enc-inc" || a === "enc-dec" || a === "enc-del") { var i = Number(b.dataset.i); if (a === "enc-inc") ST.enc[i].k++; else if (a === "enc-dec") { ST.enc[i].k--; if (ST.enc[i].k <= 0) ST.enc.splice(i, 1); } else ST.enc.splice(i, 1); save(); render(root, ctx); return; }
      if (a === "enc-clear") { ST.enc = []; save(); render(root, ctx); return; }
      if (a === "enc-copy") { copy("PC " + ST.pc + "명 · " + ST.pclv + "\n" + ST.enc.map(function (y) { return y.n + " ×" + y.k + " (위협도 " + y.t + ")"; }).join("\n")); return; }
      if (a === "copy") { x = findSrc(b.dataset.src, ctx); if (x) copy(statText(x, ST.pc)); return; }
      if (a === "to-maker") {
        x = findSrc(b.dataset.src, ctx); if (!x) return;
        ST.mk = { n: x.n, kind: x.kind || "괴력난신", grade: x.grade, lv: x.lv, hp: typeof x.hp === "object" && x.hp ? x.hp.b : (x.hp || 4), hpPer: typeof x.hp === "object" && !!x.hp, tn: x.tn || "", abil: JSON.parse(JSON.stringify(x.abil || [])), uniq: x.uniq ? x.uniq.n + ": " + x.uniq.e : "", mg: x.mg || "", where: x.where || "", lore: x.lore || "", gm: x.gm || "", loot: x.loot || "" };
        ST.tab = "maker"; save(); render(root, ctx); return;
      }
      if (a === "to-npc") {
        x = findSrc(b.dataset.src, ctx); if (!x) return;
        if ((ctx.GM.npc || []).some(function (n) { return n.n === x.n || (n.enemy && n.enemy.cat === x.id); })) { if (window.toast) toast("이미 서고에 같은 이름이 있어요"); return; }
        toNpc(x, ctx, root); return;
      }
      if (a === "open-npc") { if (ctx.go) ctx.go("npc", "n:" + b.dataset.src.slice(2)); return; }
      if (a === "mk-npc") { toNpc(mkObj(), ctx, root); return; }
      if (a === "mk-clear") { ST.mk = blank(); save(); render(root, ctx); return; }
      if (a === "ab-add") { var s = root.querySelector("#en-ab"); if (!s || s.value === "") return; ST.mk.abil.push(JSON.parse(JSON.stringify(abilLib()[Number(s.value)]))); save(); render(root, ctx); return; }
      if (a === "ab-new") { ST.mk.abil.push(A("새 이능", "공격", "1", "1", "접근전 1점.")); save(); render(root, ctx); return; }
      if (a === "ab-del") { ST.mk.abil.splice(Number(b.dataset.i), 1); save(); render(root, ctx); return; }
    });
    function onField(ev) {
      var t = ev.target;
      if (t.dataset.mk) {
        var k = t.dataset.mk; ST.mk[k] = t.type === "checkbox" ? t.checked : t.value;
        if (k === "grade" || k === "kind") {
          if (ST.mk.grade === "이물" && ST.mk.kind === "영물") { ST.mk.hpPer = true; if (Number(ST.mk.hp) < 8) ST.mk.hp = 8; }
        }
        save();
        if (ev.type === "change" || t.tagName === "SELECT" || t.type === "checkbox") render(root, ctx);
        else { /* 글자를 칠 때는 미리 보기만 다시 */ var pv = root.querySelector(".en-maker .en-card"); if (pv) { var tmp = document.createElement("div"); tmp.innerHTML = card(mkObj(), ST.pc, "mk"); var nc = tmp.querySelector(".en-card"); var acts = nc.querySelector(".gm-actions"); if (acts) acts.remove(); pv.replaceWith(nc); } }
        return;
      }
      if (t.dataset.ab != null) { ST.mk.abil[Number(t.dataset.ab)][t.dataset.k] = t.value; save(); return; }
      if (t.dataset.st) {
        var v = t.value; if (t.dataset.st === "pc") v = Math.max(1, Math.min(8, Number(v) || 1));
        ST[t.dataset.st] = v; save();
        if (t.dataset.st === "q") { var keep = t.selectionStart; render(root, ctx); var q2 = root.querySelector("#en-q"); if (q2) { q2.focus(); try { q2.setSelectionRange(keep, keep); } catch (x) { } } }
        else if (ev.type === "change") render(root, ctx);
      }
    }
    root.addEventListener("input", onField);
    root.addEventListener("change", onField);
  }

  window.WX_ENEMY = {
    count: function (GM) { return CAT.length + (GM.npc || []).filter(function (n) { return n.enemy; }).length; },
    draw: function (box, ctx) {
      var root = box.querySelector(".en-root");
      if (!root) { box.innerHTML = '<div class="en-root"></div>'; root = box.querySelector(".en-root"); bind(root, ctx); }
      root._ctx = ctx;
      /* 글을 치는 중이면 다시 그리지 않는다(서고 자료가 바뀔 때마다 불린다) */
      var act = document.activeElement;
      if (act && root.contains(act) && (act.tagName === "INPUT" || act.tagName === "TEXTAREA")) return;
      render(root, ctx);
    },
    catalog: CAT
  };
})();
