# devboram.github.io — 수용 기준 TODO

디자인 확정본: Claude 캔버스 "devboram 사이트" (손그림 노트/다꾸 컨셉).
갈림길 결정(2026-09-01): 태그 칩은 **표시만**(글 5편쯤 되면 JS 필터로 승격) ·
**404 포함**(confused 토끼) · **favicon+기본 OG 포함** · 다크모드/RSS/커스텀 도메인 **뺌**.

## ① 화면별 완료 기준

- [x] index.html 홈: 히어로(손글씨 제목+한 줄 소개+노트 쓰는 토끼), 최근 글 카드, 프로젝트 카드 순서대로 표시
- [x] posts.html: 태그 칩 줄(표시만) + 글 카드 목록
- [x] posts/<슬러그>.html: 제목·날짜·본문·소제목·코드블록·"참 잘했어요" 도장·이전 글 내비
- [x] 코드블록 고정폭(Nanum Gothic Coding), 긴 줄 넘침 없음(overflow 스크롤)
- [x] about.html: 폴라로이드 프로필(노트북 토끼) + 일하는 방식 카드 3
- [x] projects.html: 폴라로이드 카드 3(제목·설명·링크) + 전구 토끼
- [x] bunny.html(이스터에그): 인사 토끼 + dev.boram@gmail.com + github.com/devboram
- [x] 전 페이지 푸터 토끼 → bunny.html 이동, 상단 내비엔 미노출
- [x] 404.html: confused 토끼 + 홈 복귀 링크
- [x] 6종+404 전 페이지에 종이 배경·괘선·손그림 테두리·마스킹테이프·형광펜 재현
- [x] Gaegu/Gowun Dodum/Nanum Gothic Coding 3종 폰트 적용 (브라우저 렌더로 확인)

## ② 반응형 (1200 / 768 / 390)

- [x] 1200px: 카드 다단 + 콘텐츠 최대 폭 고정 (projects.html 3단 그리드 스크린샷 확인)
- [ ] 768px: 다단이 깨짐 없이 축소/한 컬럼 — 미디어쿼리(860px)로 커버되나 이 폭 직접 스크린샷은 안 함
- [x] 390px: 전 페이지 한 컬럼, 가로 스크롤 0 (scrollWidth===clientWidth 실측)
- [x] 390px: 글자 잘림 없음, 테이프·도장이 본문 텍스트 안 가림 (스크린샷 확인)
- [x] SVG 이미지 3폭 모두 비율 왜곡 없음 (width/height 고정 + aspect-ratio)

## ③ 접근성 최소선

- [x] 메타 텍스트 대비 4.5:1 이상 — 실측 4.85:1 (getComputedStyle + WCAG 공식)
- [x] 본문 텍스트 대비 4.5:1 이상 — 실측 6.66:1
- [x] 클릭 대상 터치 영역 44×44px 이상 (태그칩·외부버튼·푸터링크에 min-height 44px)
- [x] img/SVG alt (장식 아이콘은 alt="")
- [x] header/nav/main/article/footer 시맨틱, h1 페이지당 1개
- [x] 키보드 포커스 표시 (:focus-visible 아웃라인)
- [x] html lang="ko", 페이지별 title 상이

## ④ 성능 / 구조

- [x] 외부 요청은 Google Fonts 뿐 (grep 으로 전수 확인, github.com 은 사용자 클릭 링크일 뿐 리소스 요청 아님)
- [x] SVG 전부 assets/icons/ 로컬 또는 인라인
- [x] 공용 style.css 하나, 페이지별 CSS 없음
- [x] JS 0 — <script> 태그 자체가 없음 (이스터에그도 순수 <a href>)
- [x] HTML/CSS/assets 만으로 저장소 구성

## ⑤ 배포

- [ ] main push 후 https://devboram.github.io/ 열림 — **아직 push 안 함, 사용자 확인 후 진행**
- [ ] 전 페이지 URL 직접 진입 200 (이스터에그·404 포함) — 로컬 서버로는 확인, 배포본은 push 후 확인 필요
- [ ] 상대경로 링크·assets 경로 배포본에서 정상 — 로컬 확인 완료, 배포본 재확인 필요
- [ ] 모바일 실기기(또는 에뮬레이션)로 배포 URL 1회 확인 — 배포 후 진행

## ⑥ 콘텐츠

- [x] placeholder 문자열 0건 (grep: lorem ipsum/todo/준비 중/placeholder 전수 확인)
- [x] 샘플 글 1편 완성, 홈·목록·본문 정보 일치 (제목·날짜·태그 3곳 동일)
- [x] 프로필 자리는 토끼 SVG 로 채움 (빈 박스 없음)
- [x] 연락처·GitHub 링크 실동작 (mailto:, https://github.com/devboram)
- [x] favicon(토끼 SVG) + 기본 OG 태그(title/description)
- [x] 글 HTML 복사 → 새 글 성립 1회 실행 확인 (제목 치환·CSS 상대경로 정상, 테스트 파일은 삭제함)

## 뺀 것 (재론 시점)

- 태그 필터 실동작: 글 5편부터
- 다크모드: 안 함 (종이 컨셉 충돌)
- RSS/사이트맵: 글 쌓이면
- 커스텀 도메인: 보류
