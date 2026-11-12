# 티스토리 공개 글 목록 → _data/tistory.json (제목·주소·날짜·분류·요약). 본문은 가져오지 않는다 — 목록에서 누르면 티스토리로 간다.
# 새 글을 쓴 뒤 저장소 루트에서 실행: python3 -I tools/tistory_posts.py  → 바뀐 _data/tistory.json 을 커밋·배포
import html, json, re, time, urllib.request

BLOG, OUT = 'https://h4r3.tistory.com', '_data/tistory.json'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=20).read().decode('utf-8', 'replace')


def meta(page, prop):
    m = re.search(r'<meta property="%s" content="([^"]*)"' % prop, page)
    return html.unescape(m.group(1)).strip() if m else ''


urls = [u for u in re.findall(r'<loc>([^<]+)</loc>', get(BLOG + '/sitemap.xml')) if re.search(r'tistory\.com/(entry/|\d+$)', u)]
posts = []
for i, url in enumerate(urls):
    page = get(url)
    cat = re.search(r'"categoryLabel":"([^"]*)"', page)
    summary = re.sub(r'\s+', ' ', meta(page, 'og:description'))
    post = {
        'title': meta(page, 'og:title'),
        'url': url,
        'date': meta(page, 'article:published_time')[:10],
        'category': cat.group(1).rstrip('.') if cat else '',
        'summary': summary[:110] + ('…' if len(summary) > 110 else ''),
    }
    assert post['title'] and re.fullmatch(r'\d{4}-\d\d-\d\d', post['date']), url  # 스킨이 바뀌어 못 읽으면 조용히 빈 목록을 내지 않는다
    posts.append(post)
    print(i + 1, '/', len(urls), post['date'], post['title'][:40])
    time.sleep(0.3)

posts.sort(key=lambda p: p['date'], reverse=True)
json.dump(posts, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(posts), 'posts ->', OUT)
