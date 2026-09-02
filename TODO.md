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
- [x] JS 0 — 사이트 자체 JS 없음. 예외는 giscus 댓글 위젯 script 1줄만 (2026-09-02 결정)
- [x] HTML/CSS/assets + Jekyll(_layouts/_posts/_config.yml) 로 저장소 구성 — 빌드는 GitHub Pages 가 수행

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
- [x] 새 글 = `_posts/YYYY-MM-DD-슬러그.md` 파일 하나 (front matter: title·description·summary·tags·minutes). 홈 카드·목록·이전/다음 내비 자동

## ⑦ Jekyll 전환 + GitHub Discussions 댓글·방명록 (2026-09-02)

결정: "GitHub 이 제공하는 것만" — 글 관리는 Jekyll(Pages 내장 빌드), 댓글·방명록은 giscus(저장소 Discussions).
Firebase 는 배제(폰 글쓰기는 github.com 파일 편집으로 해결, JS 0 원칙 유지).

- [x] `_layouts/default.html`(head·header·footer 공용 껍데기) · `_layouts/post.html`(글 상세: 메타·도장·이전/다음 내비·댓글)
- [x] `_config.yml`: permalink `/posts/:title.html` 로 기존 글 URL 유지, jekyll-feed·jekyll-sitemap 플러그인
- [x] 홈 최근 글 3장·글 목록·태그 칩·글 개수 → `site.posts` 루프로 자동 생성
- [x] 아직 안 쓴 글 2편(회의록 파이프라인·바텀시트 offset) → `_drafts/` 로 이동 (빌드 제외, 제목·요약 보존)
- [x] `guestbook.html` 신설 + 내비에 "방명록" 추가, `_includes/comments.html`(giscus)
- [x] 로컬 빌드: `Gemfile`(github-pages) + Ruby 3.3 — `bundle exec jekyll serve`
- [ ] **giscus 발급**: 저장소 Settings → Discussions 켜기 → giscus.app 에서 앱 설치·카테고리 선택 → `_config.yml` 의 `giscus.repo_id`·`category`·`category_id` 채우기. 비어 있으면 "준비 중" 문구만 표시
- [ ] giscus 테마를 종이 컨셉에 맞추기 (`data-theme` 에 커스텀 CSS URL 지정 가능) — 발급 후
- [ ] 배포본에서 `/feed.xml`·`/sitemap.xml`·글 URL 200 확인

## 뺀 것 (재론 시점)

- 태그 필터 실동작: 글 5편부터
- 다크모드: 안 함 (종이 컨셉 충돌)
- ~~RSS/사이트맵: 글 쌓이면~~ → Jekyll 플러그인 2줄로 09-02 포함
- 커스텀 도메인: 보류
