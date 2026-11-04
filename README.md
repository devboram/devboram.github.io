# devboram.github.io

boram 의 작업노트 — GitHub Pages 가 빌드하는 Jekyll 정적 사이트. 수용 기준·결정 기록은 `TODO.md`.

## 로컬 실행

Ruby 3.3 과 bundler 4.0.16 이 필요하다 (macOS 시스템 Ruby 2.6 으로는 안 돌아간다).
`LANG` 이 UTF-8 이 아니면 한글 때문에 SCSS 변환에서 빌드가 죽는다.

```bash
brew install ruby@3.3
export PATH="$(brew --prefix ruby@3.3)/bin:$PATH" LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
bundle config set --local path vendor/bundle
bundle install
bundle exec jekyll serve
```

## 콘텐츠 추가

- 새 글: `_posts/YYYY-MM-DD-슬러그.md` 파일 하나. front matter 에 `title`·`description`·`summary`·`tags`·`minutes`(선택 `avatar` = 캐릭터 키, 기본 bunny), 본문은 Markdown. 홈 카드·퀘스트 로그·이전/다음 내비는 자동.
- 아직 안 쓴 글: `_drafts/` (빌드 제외).
- 프로젝트: `_data/projects.yml` 에 항목 추가 — 홈 카드와 프로젝트 페이지가 같이 읽는다.
- 메뉴: `_data/nav.yml` — 헤더 메뉴와 홈 타이틀 메뉴가 같이 읽는다(`cmd` = 게임 커맨드 이름).
- 캐릭터·아이템: `_data/characters.yml`, 소개 페이지 능력치: `_data/player_stats.yml`. 컨셉 변천 기록은 `_data/concept_history.yml`(`/concept.html`).
- 페이지 상단 배너: `{% include page-banner.html bg="<이름>" icon="<스프라이트>" title="..." %}`, 배경은 `assets/pixel/bg/<이름>.jpg`.
- 색·글꼴·그림자·테두리 같은 디자인 값: `pixel.css` 맨 위 `:root` 토큰만 고친다 (primitive 팔레트 → semantic 역할 이름 순서, 컴포넌트는 semantic 만 읽는다).
- 그림 생성·가공: `tools/art/` (스크립트, 빌드 제외 — 실행법은 그 폴더 `README.md`). ChatGPT·Figma 생성 원본은 저장소가 아니라 볼트 `Projects/개인 프로젝트/devboram.github.io/리소스/원본/` 에 둔다.
- 모든 페이지는 `theme: pixel`(글은 `_config.yml` 기본값). `style.css`(이전 종이 테마)는 지금 어느 페이지도 읽지 않는다.

## 배포

`main` 에 push 하면 GitHub Pages 가 빌드한다. 인라인 `style=` 은 쓰지 않고 `pixel.css` 하나에 클래스로 둔다.
