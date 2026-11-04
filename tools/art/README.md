# tools/art — 사이트 그림 생성·가공 스크립트

빌드에 들어가지 않는다(`_config.yml` exclude). 전부 **저장소 루트에서** 실행한다(`gen_*` 는 이 폴더에서).
필요: `python3` + Pillow. 원본 이미지(ChatGPT·Figma 생성본)는 저장소가 아니라 볼트
`Projects/개인 프로젝트/devboram.github.io/리소스/원본/` 에 있고, 파일 목록·출처·프롬프트는 같은 폴더의 `리소스 관리.md`.

| 스크립트 | 만드는 것 | 실행 |
|---|---|---|
| `gen_sprites.py` | 코드 픽셀 스프라이트 → `_data/sprites.yml`·`_data/pixel_palette.yml`·`assets/pixel/sparkle-*.svg` | `cd tools/art && python3 -I gen_sprites.py data ../..` (미리보기: `preview <html>`) |
| `gen_scene.py` | 홈 장면 `scene-night.png`(480×150) + 배경 타일 `stars`·`stardust`·`heartline` | `cd tools/art && python3 -I gen_scene.py ../../assets/pixel` |
| `cut_sheets.py` | ChatGPT 배경 6분할 → `assets/pixel/bg/*.jpg`, 소품·치비 시트 → `assets/chars/sheets/` | `python3 -I tools/art/cut_sheets.py <원본 폴더>` |
| `cut_chibi.py` | 치비 시트 5×3 → `assets/chars/chibi/<키>_<front·joy·doze>.png` (흰 배경 제거) | `python3 -I tools/art/cut_chibi.py` |
| `make_strip.py` | 초록(#00FF00) 배경 프레임 시트 → 투명 가로 스트립(칸 위치 보존) | `python3 -I tools/art/make_strip.py <원본.png> <출력.png> <프레임 수> <높이> [행 수]` → WebP 로 변환해 `assets/chars/anim/` |
| `cors_server.py` | CORS 헤더 있는 정적 서버(giscus 테마 로컬 확인용) | `python3 -I tools/art/cors_server.py 4011 _site` |

주의
- 흰 캐릭터(토끼)는 흰 배경에서 배경 제거가 귀까지 지운다 — 프레임은 초록 단색 배경으로 받는다(`bunny_front` 치비가 그렇게 빠졌다).
- `gen_scene.py` 의 `BILLBOARD` 는 현재 사이트와 같은 값으로 고정돼 있다. 바꾸면 장면이 달라진다.
