/* ═════════ 강호도(江湖圖) 자료 — 장소·문파·테마·왕조를 여기서 고칩니다 ═════════
   좌표는 [경도, 위도]. prov는 성 id(geo.js). approx: true면 '정확한 위치 미정'으로 점선 표시. */
window.WX_MAP = {
  places: [
    /* 오악 */
    { id: "taishan", name: "태산", han: "泰山", prov: "shandong", at: [117.10, 36.25], kind: "산", desc: "오악 가운데 동악. 역대 황제가 하늘에 제사를 올리던 봉선의 산이다." },
    { id: "huashan", name: "화산", han: "華山", prov: "shaanxi", at: [110.08, 34.48], kind: "산", desc: "오악 가운데 서악. 깎아지른 화강암 봉우리와 벼랑길로 이름난 험산이다." },
    { id: "hengnan", name: "형산", han: "衡山", prov: "hoguang", at: [112.70, 27.25], kind: "산", desc: "오악 가운데 남악. 일흔두 봉우리가 이어진 산으로 도관과 절이 함께 자리한다." },
    { id: "hengbei", name: "항산", han: "恆山", prov: "shanxi", at: [113.73, 39.67], kind: "산", desc: "오악 가운데 북악. 벼랑에 기둥을 박아 매단 현공사가 있다." },
    { id: "songshan", name: "숭산", han: "嵩山", prov: "henan", at: [113.03, 34.48], kind: "산", desc: "오악 가운데 중악. 서쪽 소실산 기슭에 소림사가 있다." },
    /* 불교 4대 명산 */
    { id: "wutai", name: "오대산", han: "五臺山", prov: "shanxi", at: [113.58, 39.05], kind: "산", desc: "봉우리 다섯이 평평한 대(臺)를 이룬다. 문수보살의 도량으로 받든다." },
    { id: "emei", name: "아미산", han: "峨眉山", prov: "sichuan", at: [103.33, 29.52], kind: "산", desc: "보현보살의 도량. 정상의 금정에서 운해와 불광을 본다고 한다." },
    { id: "putuo", name: "보타산", han: "普陀山", prov: "zhejiang", at: [122.38, 30.00], kind: "섬", desc: "동해에 뜬 섬. 관음보살의 도량으로 뱃사람들이 기도하러 건너간다." },
    { id: "jiuhua", name: "구화산", han: "九華山", prov: "namjikrye", at: [117.80, 30.48], kind: "산", desc: "지장보살의 도량. 신라 왕족 출신 승려 김교각이 수행한 곳으로 전한다." },
    /* 도교 4대 명산 */
    { id: "wudang", name: "무당산", han: "武當山", prov: "hoguang", at: [111.00, 32.40], kind: "산", desc: "주봉 천주봉 꼭대기에 금전이 있는 도교의 성산. 진무대제를 모신다." },
    { id: "longhu", name: "용호산", han: "龍虎山", prov: "jiangxi", at: [116.97, 28.08], kind: "산", desc: "정일교 천사 장씨 가문이 대대로 머문 곳. 붉은 사암 봉우리가 강을 따라 선다." },
    { id: "qiyun", name: "제운산", han: "齊雲山", prov: "namjikrye", at: [118.03, 29.82], kind: "산", desc: "구름과 나란히 솟았다는 이름의 단하 지형 산. 벼랑마다 도관이 붙어 있다." },
    { id: "qingcheng", name: "청성산", han: "靑城山", prov: "sichuan", at: [103.57, 30.90], kind: "산", desc: "사철 푸른 숲이 성벽처럼 둘러싼 산. 천사도의 발상지로 꼽힌다." },
    /* 4대 석굴 */
    { id: "mogao", name: "막고굴", han: "莫高窟", prov: "hase", at: [94.80, 40.04], kind: "석굴", desc: "돈황 명사산 벼랑에 뚫은 석굴 수백 개. 비단길을 오간 이들의 벽화가 남았다." },
    { id: "yungang", name: "운강석굴", han: "雲岡石窟", prov: "shanxi", at: [113.12, 40.11], kind: "석굴", desc: "북위가 도읍 평성 곁 산에 새긴 거대한 석불들." },
    { id: "longmen", name: "용문석굴", han: "龍門石窟", prov: "henan", at: [112.47, 34.56], kind: "석굴", desc: "낙양 남쪽 이수 양쪽 벼랑에 북위부터 당까지 새긴 불상 굴." },
    { id: "maiji", name: "맥적산석굴", han: "麥積山石窟", prov: "hase", at: [106.00, 34.35], kind: "석굴", desc: "보릿단을 쌓은 듯한 외딴 봉우리 벼랑에 잔도를 걸어 판 석굴." },
    /* 7대 고도 */
    { id: "xian", name: "서안부(장안)", han: "西安府", prov: "shaanxi", at: [108.94, 34.34], kind: "고도", desc: "주·진·한·수·당이 도읍한 관중의 중심. 당대에는 장안이라 불렸다." },
    { id: "luoyang", name: "낙양", han: "洛陽", prov: "henan", at: [112.45, 34.62], kind: "고도", desc: "황하 남쪽 낙수 가의 도읍. 동주·동한·위·서진·북위가 이곳에 도읍했다." },
    { id: "nanjing", name: "남경(응천부)", han: "南京·應天府", prov: "namjikrye", at: [118.78, 32.06], kind: "고도", desc: "장강 남쪽 기슭의 도읍. 육조와 명 초가 도읍했고 금릉·건강이라고도 불렸다." },
    { id: "kaifeng", name: "개봉부", han: "開封府", prov: "henan", at: [114.31, 34.80], kind: "고도", desc: "황하 남쪽 평야의 도읍. 북송의 수도 동경 변량이다." },
    { id: "hangzhou", name: "항주", han: "杭州", prov: "zhejiang", at: [120.15, 30.27], kind: "고도", desc: "서호를 끼고 있는 강남의 도시. 남송이 임안이라 부르며 도읍했다." },
    { id: "anyang", name: "안양", han: "安陽", prov: "henan", at: [114.35, 36.10], kind: "고도", desc: "상(은)나라 후기의 도읍 은허가 있는 곳. 갑골문이 이곳에서 나왔다." },
    { id: "beijing", name: "북경(순천부)", han: "北京·順天府", prov: "bukjikrye", at: [116.40, 39.90], kind: "고도", desc: "원의 대도, 명·청의 수도. 황궁 자금성이 있다." },
    /* 문파와 이어진 곳 */
    { id: "kunlun", name: "곤륜산", han: "崑崙山", prov: "tagam", at: [94.10, 35.60], kind: "산", desc: "서쪽 끝 하늘에 닿는 산줄기. 신선이 사는 곳으로 전해 온다." },
    { id: "bogda", name: "보거다봉·천지", han: "博格達峰·天池", prov: "cheonsan", at: [88.20, 43.85], kind: "산", desc: "천산 동부의 높은 봉우리와 그 아래 산정 호수." },
    { id: "xingxing", name: "성성협", han: "星星峽", prov: "cheonsan", at: [95.15, 41.79], kind: "관문", desc: "감숙에서 신강으로 넘어가는 좁은 골짜기. 동쪽에서 천산으로 드는 길목이다." },
    { id: "huoyan", name: "화염산", han: "火焰山", prov: "cheonsan", at: [89.55, 42.92], kind: "산", desc: "투루판 분지의 붉은 사암 산줄기. 한여름 열기에 산이 타오르는 듯 보인다." },
    { id: "kuqa", name: "쿠처(구자)", han: "龜茲", prov: "cheonsan", at: [82.96, 41.72], kind: "도시", desc: "천산 남쪽 기슭의 오아시스 왕국 구자가 있던 곳. 비단길 북도의 요지다." },
    { id: "tomur", name: "토무르봉", han: "托木爾峰", prov: "cheonsan", at: [80.13, 42.04], kind: "산", desc: "천산에서 가장 높은 봉우리. 서쪽 끝에 빙하를 거느리고 선다." },
    { id: "leigong", name: "뇌공산", han: "雷公山", prov: "guizhou", at: [108.20, 26.38], kind: "산", desc: "귀주 동남 묘령산맥의 주봉. 원시림과 안개가 짙은 묘족의 땅이다." },
    { id: "longzhong", name: "융중", han: "隆中", prov: "hoguang", at: [112.03, 32.02], kind: "명승", desc: "양양 서쪽의 산골. 제갈량이 유비를 만나기 전 밭을 갈며 지낸 곳이다." },
    { id: "yueyang", name: "악양", han: "岳陽", prov: "hoguang", at: [113.13, 29.37], kind: "도시", desc: "동정호 입구의 도시. 호수를 굽어보는 악양루가 있다." },
    { id: "potala", name: "포탈라궁", han: "布達拉宮", prov: "osajang", at: [91.12, 29.66], kind: "명승", desc: "납살 홍산 위에 선 궁전. 달라이 라마가 머무는 곳이다." },
    { id: "hefei", name: "합비", han: "合肥", prov: "namjikrye", at: [117.27, 31.86], kind: "도시", desc: "여주부의 치소. 장강과 회하 사이, 소호 북쪽 물가에 자리한 고을이다." },
    { id: "chengdu", name: "성도부", han: "成都府", prov: "sichuan", at: [104.07, 30.57], kind: "도시", desc: "사천의 성도. 촉 땅 분지 한가운데의 큰 고을로 비단과 차가 모인다." },
    { id: "zhending", name: "진정부", han: "眞定府", prov: "bukjikrye", at: [114.57, 38.15], kind: "도시", desc: "북경 남쪽 관도의 큰 고을. 서쪽 획록현에 석가장이라는 작은 마을이 딸려 있다." },
    { id: "dongping", name: "동평주", han: "東平州", prov: "shandong", at: [116.47, 35.94], kind: "도시", desc: "연주부에 딸린 고을. 대운하가 지나고 북쪽으로 양산박 물가가 펼쳐진다." },
    { id: "huangshan", name: "황산", han: "黃山", prov: "namjikrye", at: [118.17, 30.13], kind: "산", desc: "기암괴석과 운해, 소나무로 이름난 강남의 산. 봉우리 사이 바윗길이 아찔하다." },
    { id: "wuyi", name: "무이산", han: "武夷山", prov: "fujian", at: [117.95, 27.72], kind: "산", desc: "붉은 봉우리 사이로 아홉 굽이 계곡이 흐르는 산. 벼랑 틈에서 귀한 차가 난다." },
    { id: "sanxia", name: "장강 삼협", han: "長江三峽", prov: "sichuan", at: [110.0, 31.0], kind: "협곡", desc: "장강이 산을 뚫고 흐르는 구당협·무협·서릉협. 물살이 빠르고 벼랑이 높다." },
    { id: "dali", name: "대리", han: "大理", prov: "yunnan", at: [100.23, 25.6], kind: "도시", desc: "옛 대리국의 도읍. 창산과 이해 사이에 숭성사 삼탑이 선다." },
    { id: "shanhai", name: "산해관", han: "山海關", prov: "bukjikrye", at: [119.75, 40.0], kind: "관문", desc: "장성의 동쪽 끝 관문. 산과 바다 사이 좁은 길을 막고 요동으로 가는 길을 지킨다." },
    { id: "suzhou", name: "소주", han: "蘇州", prov: "namjikrye", at: [120.62, 31.3], kind: "도시", desc: "운하가 집 사이로 흐르는 강남의 도시. 비단과 원림으로 이름났다." },
    { id: "haedong", name: "해동(조선)", han: "海東", prov: "", at: [126.98, 37.57], kind: "세외", desc: "압록강 건너 조선. 도성 한양을 두고, 의주에서 요동을 거쳐 북경으로 조천 사신을 보낸다." },
    { id: "baikal", name: "바이칼호", han: "貝加爾湖", prov: "", at: [108.00, 53.50], kind: "호수", desc: "북쪽 끝 초승달 모양의 깊은 호수. 겨울이면 두껍게 얼어붙는다." }
  ],

  /* 문파 표시 — 『문파 소재지』 문서 기준. group 이름은 문파 계열 */
  sects: [
    { id: "wudang", name: "무당파", group: "오대문파", at: [111.00, 32.40], where: "호광 무당산 천주봉", place: "wudang" },
    { id: "shaolin", name: "소림사", group: "오대문파", at: [112.94, 34.51], where: "하남 숭산 소실산", place: "songshan" },
    { id: "kunlunpa", name: "곤륜파", group: "오대문파", at: [94.10, 35.60], where: "타감 곤륜산", place: "kunlun" },
    { id: "huashanpa", name: "화산파", group: "오대문파", at: [110.08, 34.48], where: "섬서 화산", place: "huashan" },
    { id: "gaibang", name: "개방", group: "오대문파", at: [114.31, 34.80], where: "하남 개봉부", place: "kaifeng" },
    { id: "namgung", name: "남궁세가", group: "오대세가", at: [117.27, 31.86], where: "남직례 여주부 합비", place: "hefei" },
    { id: "tang", name: "사천당가", group: "오대세가", at: [104.07, 30.57], where: "사천 성도부 당가타", place: "chengdu" },
    { id: "jegal", name: "제갈세가", group: "오대세가", at: [112.03, 32.02], where: "호광 양양부 융중", place: "longzhong" },
    { id: "paeng", name: "하북팽가", group: "오대세가", at: [114.57, 38.15], where: "북직례 진정부", place: "zhending" },
    { id: "ak", name: "산동악가", group: "오대세가", at: [116.47, 35.94], where: "산동 연주부 동평주", place: "dongping" },
    { id: "murim", name: "무림맹", group: "정사지간", at: [113.13, 29.37], where: "호광 악주부 악양", place: "yueyang" },
    { id: "geumui", name: "금의위/동창", group: "정사지간", at: [116.40, 39.90], where: "북직례 순천부(북경)", place: "beijing" },
    { id: "paegeom", name: "패검종", group: "사도오천", at: [108.94, 34.34], where: "섬서 서안부 장안", place: "xian" },
    { id: "amya", name: "암야전", group: "사도오천", at: [108.20, 26.38], where: "귀주 뇌공산", place: "leigong" },
    { id: "gyoju", name: "교주궁", group: "천마신교", at: [88.20, 43.85], where: "천산 보거다봉 아래 천지", place: "bogda" },
    { id: "byeongma", name: "병마령", group: "천마신교", at: [95.15, 41.79], where: "하미위 성성협", place: "xingxing" },
    { id: "yowang", name: "요왕장", group: "천마신교", at: [89.55, 42.92], where: "토로번 화염산", place: "huoyan" },
    { id: "biyeon", name: "비연각", group: "천마신교", at: [82.96, 41.72], where: "천산 남로 쿠처", place: "kuqa" },
    { id: "hyeol", name: "혈교", group: "천마신교", at: [80.40, 41.60], where: "천산 서쪽 끝, 토무르봉 남쪽", place: "tomur" },
    { id: "bukhae", name: "북해빙궁", group: "세외", at: [108.00, 53.50], where: "바이칼호", place: "baikal" },
    { id: "podal", name: "포달랍궁", group: "세외", at: [91.12, 29.66], where: "오사장 납살", place: "potala" },
    { id: "dongyeong", name: "동영", group: "세외", at: [136.00, 35.30], where: "바다 건너 섬나라", approx: true },
    { id: "seoyeok", name: "서역", group: "세외", at: [71.60, 40.30], where: "땅 끝 너머 색목인의 땅 (서쪽 바깥)", approx: true },
    { id: "cheonchuk", name: "천축", group: "세외", at: [82.00, 24.00], where: "천축국", approx: true },
    { id: "haedong", name: "해동", group: "세외", at: [129.60, 41.80], where: "해동 함경도 경성 북병영", place: "haedong" }
  ],
  /* 지도에 한 점으로 찍지 않는 세력 */
  roaming: [
    { name: "군마녹림", group: "사도오천", where: "녹림칠십이채가 중원 산길 곳곳에 흩어져 있다. 총채 미정." },
    { name: "장강수로채", group: "사도오천", where: "장강에서 시작해 중원의 물길 전체. 본채 미정." },
    { name: "흑상", group: "사도오천", where: "본단 위치는 아무도 모른다. 중원 곳곳에 정기시를 연다." },
    { name: "상회", group: "정사지간", where: "정해진 본거지 없음." },
    { name: "표국", group: "정사지간", where: "정해진 본거지 없음." },
    { name: "낭인", group: "정사지간", where: "정해진 본거지 없음." }
  ],

  themes: [
    { id: "oak", name: "중원오악", han: "中原五嶽", places: ["taishan", "huashan", "hengnan", "hengbei", "songshan"], note: "동·서·남·북·중앙의 다섯 신령한 산." },
    { id: "bul", name: "불교 4대 명산", han: "佛敎四大名山", places: ["wutai", "emei", "putuo", "jiuhua"], note: "문수·보현·관음·지장 네 보살의 도량." },
    { id: "do", name: "도교 4대 명산", han: "道敎四大名山", places: ["wudang", "longhu", "qiyun", "qingcheng"], note: "도관이 모인 네 산." },
    { id: "gul", name: "4대 석굴", han: "四大石窟", places: ["mogao", "yungang", "longmen", "maiji"], note: "벼랑에 새긴 불교 석굴 넷." },
    { id: "godo", name: "7대 고도", han: "七大古都", places: ["xian", "luoyang", "nanjing", "kaifeng", "hangzhou", "anyang", "beijing"], note: "여러 왕조가 도읍한 일곱 도시." }
  ],

  /* 왕조 — 연대는 통상 쓰는 값. caps: [이름, 경도, 위도] */
  dynasties: [
    { id: "zhou", name: "주", han: "周", from: -1046, to: -256, caps: [["호경(서안 부근)", 108.80, 34.23], ["낙읍(낙양)", 112.45, 34.62]], note: "서주는 호경, 동주는 낙읍에 도읍했다." },
    { id: "qin", name: "진", han: "秦", from: -221, to: -206, caps: [["함양", 108.71, 34.33]], note: "처음으로 천하를 통일한 왕조." },
    { id: "han", name: "한", han: "漢", from: -202, to: 220, caps: [["장안", 108.94, 34.34], ["낙양", 112.45, 34.62]], note: "전한은 장안, 후한은 낙양." },
    { id: "sanguo", name: "삼국", han: "三國", from: 220, to: 280, caps: [["위 낙양", 112.45, 34.62], ["촉 성도", 104.07, 30.57], ["오 건업", 118.78, 32.06]], note: "위·촉·오가 셋으로 나눠 다툰 시대." },
    { id: "jin", name: "진", han: "晉", from: 266, to: 420, caps: [["낙양", 112.45, 34.62], ["건강(남경)", 118.78, 32.06]], note: "서진은 낙양, 동진은 강남 건강." },
    { id: "nanbei", name: "남북조", han: "南北朝", from: 420, to: 589, caps: [["남조 건강", 118.78, 32.06], ["북위 평성(대동)", 113.30, 40.08], ["북위 낙양", 112.45, 34.62]], note: "남은 송·제·양·진, 북은 북위와 그 뒤를 이은 나라들." },
    { id: "sui", name: "수", han: "隋", from: 581, to: 618, caps: [["대흥(장안)", 108.94, 34.34]], note: "남북을 다시 하나로 묶고 대운하를 팠다." },
    { id: "tang", prov: "sichuan", name: "당", han: "唐", from: 618, to: 907, caps: [["장안", 108.94, 34.34]], note: "장안이 비단길의 동쪽 끝으로 번성했다." },
    { id: "wudai", name: "오대십국", han: "五代十國", from: 907, to: 979, caps: [["변경(개봉)", 114.31, 34.80]], note: "북쪽 다섯 왕조와 남쪽 여러 나라가 갈마든 시대." },
    { id: "liao", name: "요", han: "遼", from: 916, to: 1125, caps: [["상경 임황부", 119.39, 43.95]], note: "거란이 세운 북방 왕조." },
    { id: "song", name: "송", han: "宋", from: 960, to: 1279, caps: [["북송 동경(개봉)", 114.31, 34.80], ["남송 임안(항주)", 120.15, 30.27]], note: "북송은 개봉, 금에 밀려 남송은 항주." },
    { id: "xixia", name: "서하", han: "西夏", from: 1038, to: 1227, caps: [["흥경부(은천)", 106.23, 38.49]], note: "당항족이 하서 회랑에 세운 나라." },
    { id: "jinn", name: "금", han: "金", from: 1115, to: 1234, caps: [["상경 회령부", 126.97, 45.52], ["중도(북경)", 116.40, 39.90]], note: "여진이 세워 북송을 무너뜨린 왕조." },
    { id: "yuan", name: "원", han: "元", from: 1271, to: 1368, caps: [["대도(북경)", 116.40, 39.90]], note: "몽골이 세운 왕조." },
    { id: "ming", name: "명", han: "明", from: 1368, to: 1644, caps: [["남경", 118.78, 32.06], ["북경", 116.40, 39.90]], note: "남경에서 일어나 영락제 때 북경으로 옮겼다." },
    { id: "qing", name: "청", han: "淸", from: 1644, to: 1912, caps: [["북경", 116.40, 39.90]], note: "만주족이 세운 마지막 왕조." }
  ]
};
