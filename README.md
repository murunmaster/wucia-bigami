# 무협비가미

무협 TRPG 「무협비가미」의 룰북·무공록·인물지·명부·GM 서고 사이트.

- 정적 파일: GitHub Pages로 그대로 서비스한다.
- 저장소: Firebase(Firestore + 구글 로그인). 설정은 `fb-config.js`, 보안 규칙은 `firestore.rules`.

## 처음 한 번
1. Firebase 콘솔 → Authentication → 로그인 방법 → Google 사용.
2. Authentication → 설정 → 승인된 도메인에 `murunmaster.github.io` 추가.
3. Firestore Database → 규칙 탭에 `firestore.rules` 내용을 붙여 넣고 게시.
4. `fb-config.js`의 `WX_FB_CONFIG`에 웹 앱 설정값을 넣는다.
5. 주인장 계정으로 로그인 → 오른쪽 아래 '자료 가져오기'로 옛 사이트 자료(JSON)를 올린다.

## 권한
| 저장소 | 읽기 | 쓰기 |
|---|---|---|
| 공지 `site/notices/items` | 누구나 | 주인장 |
| 명부 `pcs/{uid}`, 방명록 `guestbook/{uid}` | 누구나 | 본인·주인장 |
| 오의 `pcog/{uid}` | 본인·주인장 | 본인·주인장 |
| GM 서고 `gm…` | 주인장 | 주인장 |

주인장 = `fb-config.js`의 `WX_OWNER_EMAIL` 계정(규칙 파일의 이메일과 같아야 한다).
