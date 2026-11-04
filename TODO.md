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
- [x] projects.html: 폴라로이드 카드 3(제목·설명·기술스택 — 링크 없음, 데이터는 `_data/projects.yml`) + 전구 토끼
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
- [x] 강조색(`--accent`, `.pen` 텍스트) 대비 4.5:1 이상 — 실측 4.66:1 (`#d1495b` 4.25:1 → `#c94256` 으로 조정, 2026-11-04)
- [x] `prefers-reduced-motion: reduce` 에서 부드러운 스크롤·토끼 흔들기 비활성

## ④ 성능 / 구조

- [x] 외부 요청은 Google Fonts 뿐 (grep 으로 전수 확인, github.com 은 사용자 클릭 링크일 뿐 리소스 요청 아님)
- [x] SVG 전부 assets/icons/ 로컬 또는 인라인
- [x] 공용 style.css 하나, 페이지별 CSS 없음 — 인라인 `style=` 0건, main 모양은 front matter `main_class` (2026-11-04 정리)
- [x] JS 0 — 사이트 자체 JS 없음. 예외는 giscus 댓글 위젯 script 1줄만 (2026-09-02 결정)
- [x] HTML/CSS/assets + Jekyll(_layouts/_posts/_config.yml) 로 저장소 구성 — 빌드는 GitHub Pages 가 수행

## ⑤ 배포

- [x] main push 후 https://devboram.github.io/ 열림 — 2026-11-04 확인 (200)
- [x] 전 페이지 URL 직접 진입 200 (이스터에그·404 포함) — 2026-11-04 배포본 확인: 홈·글 목록·글 상세·프로젝트·소개·방명록·bunny·404·feed.xml·sitemap.xml·robots.txt
- [ ] 상대경로 링크·assets 경로 배포본에서 정상 — 홈 히어로 이미지가 상대경로였던 것을 절대경로로 통일(2026-11-04). 이번 변경 push 후 배포본 재확인 필요
- [ ] 모바일 실기기(또는 에뮬레이션)로 배포 URL 1회 확인 — 배포 후 진행

## ⑥ 콘텐츠

- [x] placeholder 문자열 0건 (grep: lorem ipsum/todo/준비 중/placeholder + `[…스크린샷]` 형태 전수 확인 — 프로젝트 카드의 스크린샷 자리 글자는 토끼 SVG 로 교체, 2026-11-04)
- [x] 샘플 글 1편 완성, 홈·목록·본문 정보 일치 (제목·날짜·태그 3곳 동일)
- [x] 프로필 자리는 토끼 SVG 로 채움 (빈 박스 없음)
- [x] 연락처·GitHub 링크 실동작 (mailto:, https://github.com/devboram)
- [x] favicon(토끼 SVG) + OG 태그 — jekyll-seo-tag: title/description·canonical·`og:image`(`assets/og-default.png` 1200×630)·twitter 카드 (2026-11-04)
- [x] 새 글 = `_posts/YYYY-MM-DD-슬러그.md` 파일 하나 (front matter: title·description·summary·tags·minutes, 본문은 Markdown). 홈 카드·목록·이전/다음 내비 자동

## ⑦ Jekyll 전환 + GitHub Discussions 댓글·방명록 (2026-09-02)

결정: "GitHub 이 제공하는 것만" — 글 관리는 Jekyll(Pages 내장 빌드), 댓글·방명록은 giscus(저장소 Discussions).
Firebase 는 배제(폰 글쓰기는 github.com 파일 편집으로 해결, JS 0 원칙 유지).

- [x] `_layouts/default.html`(head·header·footer 공용 껍데기) · `_layouts/post.html`(글 상세: 메타·도장·이전/다음 내비·댓글)
- [x] `_config.yml`: permalink `/posts/:title.html` 로 기존 글 URL 유지, jekyll-feed·jekyll-sitemap 플러그인
- [x] 홈 최근 글 3장·글 목록·태그 칩·글 개수 → `site.posts` 루프로 자동 생성
- [x] 아직 안 쓴 글 2편(회의록 파이프라인·바텀시트 offset) → `_drafts/` 로 이동 (빌드 제외, 제목·요약 보존)
- [x] `guestbook.html` 신설 + 내비에 "방명록" 추가, `_includes/comments.html`(giscus)
- [x] 로컬 빌드: `Gemfile`(github-pages) + Ruby 3.3 — `bundle exec jekyll serve`
- [x] **giscus 발급**: `_config.yml` 의 `giscus.repo_id`·`category`·`category_id` 채움, 배포본 글 페이지에 giscus script 존재 확인 (2026-11-04). 비어 있으면 "준비 중" 문구만 표시
- [x] giscus 테마를 종이 컨셉에 맞추기 — `assets/giscus-paper.css` (기본 light 위에 덮어쓰기). 로컬에서 CORS 헤더 있는 서버로 렌더 확인 (2026-11-04)
- [ ] 배포본에서 giscus 종이 테마 렌더 확인 — CSS 가 배포 URL 에 올라간 뒤. 위젯이 안 뜨면 `_includes/comments.html` 의 `data-theme` 을 `"light"` 로 되돌린다
- [x] 배포본에서 `/feed.xml`·`/sitemap.xml`·글 URL 200 확인 (2026-11-04)

## ⑧ 개선·리팩토링 (2026-11-04)

- [x] 홈·프로젝트 카드 데이터를 `_data/projects.yml` 하나로 (홈에서 빠져 있던 qa-runner 포함)
- [x] 인라인 `style=` 67곳 → CSS 클래스, front matter `main_style` → `main_class`
- [x] 홈 프로젝트 그리드가 모바일에서도 2컬럼이던 문제(인라인이 미디어쿼리를 이김) → 한 컬럼
- [x] 죽은 CSS 제거 (`.stamp-svg circle`, `.site-header .logo img`)
- [x] 글 본문 raw HTML → Markdown (kramdown `smart_quotes` 로 따옴표 모양 유지)
- [x] Google Fonts preconnect, giscus `data-loading="lazy"`, README.md (로컬 실행법)
- [x] 검증: 8페이지 × 1200/768/390 요소 위치 해시 비교 — 소개·글 목록·404·방명록·비밀 페이지는 기준선과 동일, 홈·프로젝트·글 상세는 의도한 변경만
- [ ] 프로젝트 카드 토끼 자리에 실제 스크린샷이 생기면 `_data/projects.yml` 의 `image` 와 카드 템플릿 교체

## ⑨ 디자인 시스템 (2026-11-04)

방향(사용자 지시): 손그림 노트 컨셉 → **옛날 픽셀 게임 느낌 + 화려한 아바타·캐릭터를 많이 쓰는 컨셉**으로 교체 예정. 교체 전 기반 작업을 먼저 끝낸다.

- [x] 1단계 토큰화: `style.css` 맨 위 `:root` 에 primitive(팔레트)·semantic(역할) 2층 44개. `:root` 밖 하드코딩 색 0건, 도장 SVG 색도 `--stamp` 로. **화면 변화 0** — 8페이지×3폭 요소별 계산값(위치·색·테두리·그림자·글꼴·크기·변형) 해시가 기준선과 동일 (글 상세 SVG 안의 상속 `color` 값만 다르고 실제 칠해지는 stroke/fill 은 동일)
- 손그림 전용 값(불규칙 반경·카드 기울기)은 토큰화하지 않음 — 컨셉 교체 때 삭제 대상
- [ ] 타입·간격 스케일: 값이 바뀌는 작업이라 화면 변화 0 인 1단계에서 제외, 컨셉 교체와 함께
- [x] 컨셉 교체 1차(홈·캐릭터 설정집만): "미래도시의 달빛 옥상" — 사이버펑크 밤 도시 × 90년대 마법소녀 감성 (2026-11-04)
  - `theme: pixel` 페이지만 `pixel.css`, 나머지 페이지는 아직 `style.css`(종이). 본문 Pretendard·픽셀 Galmuri(둘 다 OFL, jsDelivr 버전 고정)
  - 장면 `assets/pixel/scene-night.png`(480x150): 핑크 격자 철탑·금빛 초승달·BORAM 간판·마법소녀 아이돌 전광판(오리지널)·빌딩 14종
  - 캐릭터 스프라이트 `_data/sprites.yml`(+포즈 4종), 설정집 데이터 `_data/characters.yml`(이름·스토리는 초안)
  - 세일러문·웨딩피치 등 실제 작품 캐릭터는 저작권 때문에 쓰지 않는다 — 장르 요소(초승달·별 지팡이·리본·날개)만
  - 다크 배경을 쓰게 되면서 "다크모드 안 함"(종이 컨셉 충돌 사유) 결정은 이 테마에선 해당 없음
- [x] 글 목록·프로젝트·소개·방명록·404·비밀 페이지 픽셀 테마로 확장 — 페이지별 배경 배너(assets/pixel/bg), 404·비밀은 치비 (2026-11-04)
- [x] 글 상세(_layouts/post.html) 픽셀 테마(퀘스트 화면)로 확장 — 이제 모든 페이지가 pixel.css (2026-11-04)
- [ ] 종이 테마 잔재 정리 여부 결정 — style.css·assets/giscus-paper.css·default.html 의 종이 분기·assets/icons 손그림 토끼는 더 이상 어느 페이지도 안 읽는다(파비콘 제외)
- [ ] 배포본에서 방명록 giscus `transparent_dark` 테마 렌더 확인
- [ ] 장면 캐릭터 프레임 애니메이션 나머지 4명 (ChatGPT 무료 이미지 한도 — 2026-11-05 20:13 이후). 토끼와 같은 방식: 캐릭터 PNG 첨부 + 초록(#00FF00) 단색 배경 + 3열×2행 6프레임 + 발 위치 고정 → `tools/art/make_strip.py`(배경 제거·칸 위치 보존), 원본은 볼트 `리소스/원본/` 에 먼저 보관 → `assets/chars/anim/<키>_<동작>.webp`
  - 로봇: 하트 안테나 깜빡이며 떠서 순찰 / 고양이: 간판 위에서 꼬리 살랑이며 꾸벅 / 슬라임: 찌그러졌다 펴지며 통통 점프 / 글리치 킹: 망토 펄럭이며 반짝이 버그 뿌리기
- [ ] 인라인 SVG 스프라이트 용량 줄이기(홈 HTML 약 130KB — 가로로 이어진 픽셀 합치기 등)
- [ ] 외부 글꼴 CDN 2곳(jsDelivr) — 확정 후 필요한 글자만 서브셋해 자체 호스팅 검토

## 뺀 것 (재론 시점)

- 태그 필터 실동작: 글 5편부터
- 다크모드: 안 함 (종이 컨셉 충돌)
- ~~RSS/사이트맵: 글 쌓이면~~ → Jekyll 플러그인 2줄로 09-02 포함
- 커스텀 도메인: 보류
