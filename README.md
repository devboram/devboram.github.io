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

- 새 글: `_posts/YYYY-MM-DD-슬러그.md` 파일 하나. front matter 에 `title`·`description`·`summary`·`tags`·`minutes`, 본문은 Markdown. 홈 카드·글 목록·이전/다음 내비는 자동.
- 아직 안 쓴 글: `_drafts/` (빌드 제외).
- 프로젝트: `_data/projects.yml` 에 항목 추가 — 홈 카드와 프로젝트 페이지가 같이 읽는다.
- 페이지별 `main` 모양: front matter 의 `main_class` (`main-post`·`main-bunny`·`main-notfound`, 정의는 `style.css`).

## 배포

`main` 에 push 하면 GitHub Pages 가 빌드한다. 인라인 `style=` 은 쓰지 않고 `style.css` 하나에 클래스로 둔다.
