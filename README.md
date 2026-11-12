# devboram.github.io

버그 잡는 개발자 log — GitHub Pages 가 빌드하는 Jekyll 정적 사이트. 수용 기준·결정 기록은 `TODO.md`.

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

- 새 글: 글은 티스토리(h4r3.tistory.com)에 쓴다. `python3 -I tools/tistory_posts.py` 가 공개 글 목록을 `_data/tistory.json` 으로 받아 오고, 홈·사냥 일지·3D 스테이지가 그 파일을 읽는다.
- 버그: `_data/bugs.yml` — 버그 도감(/bugs.html)과 3D 스테이지 퀴즈가 같이 읽는다.
- 사냥 장비: `_data/projects.yml` 에 항목 추가 — 홈 카드·인벤토리 페이지·3D 스테이지 전시(앞 3개)가 같이 읽는다.
- 메뉴: `_data/nav.yml` — 헤더 메뉴와 홈 타이틀 메뉴가 같이 읽는다(`cmd` = 게임 커맨드 이름).
- 캐릭터·아이템: `_data/characters.yml`, 소개 페이지 능력치: `_data/player_stats.yml`. 컨셉 변천 기록은 `_data/concept_history.yml`(`/concept.html`).
- 페이지 상단 배너: `{% include page-banner.html bg="<이름>" icon="<스프라이트>" title="..." %}`, 배경은 `assets/pixel/bg/<이름>.jpg`.
- 색·글꼴·그림자·테두리 같은 디자인 값: `pixel.css` 맨 위 `:root` 토큰만 고친다 (primitive 팔레트 → semantic 역할 이름 순서, 컴포넌트는 semantic 만 읽는다).
- 그림 생성·가공: `tools/art/` (스크립트, 빌드 제외 — 실행법은 그 폴더 `README.md`). ChatGPT·Figma 생성 원본은 저장소가 아니라 볼트 `Projects/개인 프로젝트/devboram.github.io/리소스/원본/` 에 둔다.
- 스타일은 `pixel.css` 하나(토큰·공용 컴포넌트). 한 페이지만 쓰는 큰 덩어리는 따로 두고 front matter `css:` 로 읽는다 — 지금은 `/play.html` 의 `play.css` 뿐.

## 배포

`main` 에 push 하면 GitHub Pages 가 빌드한다. 인라인 `style=` 은 쓰지 않고 `pixel.css`(페이지 전용은 `css:` 로 읽는 파일)에 클래스로 둔다.
