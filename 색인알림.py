# -*- coding: utf-8 -*-
"""IndexNow 로 **주소를 검색엔진에 직접 알린다.** 로그인이 필요 없다.

왜 이걸 하나 —
  2026-09-04 재 보니 `site:certlab.ai.kr` 이 빙에서 **0쪽**이었다.
  사이트맵 767개·robots 열림·llms.txt 다 있는데 빙이 사이트를 모르는 것이다.
  ChatGPT 웹검색이 빙 색인을 크게 기대므로, 빙에 없으면 AI 가 우리를 인용할 길이 없다.

IndexNow 는 빙·야후·네이버·얀덱스가 같이 받는다. 한 번 넣으면 네 곳에 간다.

  python 색인알림.py            사이트맵 전부
  python 색인알림.py --몇개 50   앞에서 50개만 (시험용)
"""
import io
import json
import os
import re
import sys
import time
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace',
                              line_buffering=True)
여기 = os.path.dirname(os.path.abspath(__file__))
집 = 'certlab.ai.kr'


def 열쇠찾기():
    """뿌리에 놓인 <열쇠>.txt 를 찾는다. 파일 이름이 곧 열쇠다."""
    for f in os.listdir(여기):
        m = re.fullmatch(r'([0-9a-f]{32})\.txt', f)
        if m:
            return m.group(1)
    return None


def main():
    몇개 = None
    if '--몇개' in sys.argv:
        몇개 = int(sys.argv[sys.argv.index('--몇개') + 1])
    열쇠 = 열쇠찾기()
    if not 열쇠:
        print('뿌리에 <열쇠32자>.txt 가 없습니다')
        return 2

    x = urllib.request.urlopen('https://%s/sitemap.xml' % 집, timeout=30).read().decode('utf-8')
    주소 = re.findall(r'<loc>(.*?)</loc>', x)
    if 몇개:
        주소 = 주소[:몇개]
    print('열쇠 %s… · 주소 %d개' % (열쇠[:8], len(주소)))

    # 열쇠 파일이 정말 올라가 있는지 먼저 본다 — 없으면 IndexNow 가 통째로 무른다
    try:
        확인 = urllib.request.urlopen('https://%s/%s.txt' % (집, 열쇠), timeout=20).read().decode().strip()
    except Exception as e:
        print('열쇠 파일이 사이트에 없습니다: %s' % e)
        return 3
    if 확인 != 열쇠:
        print('열쇠 파일 속이 다릅니다: %r' % 확인[:40])
        return 3
    print('열쇠 파일 확인됨')

    # ⚠ 한 번에 767개를 보내면 403 이 온다. 규격은 10000개까지라는데 안 받는다.
    #    100개씩 나누면 전부 200 이다. 2026-09-04 확인.
    한번에 = 100
    보냄 = 0
    for i in range(0, len(주소), 한번에):
        짐 = {'host': 집, 'key': 열쇠,
              'keyLocation': 'https://%s/%s.txt' % (집, 열쇠),
              'urlList': 주소[i:i + 한번에]}
        req = urllib.request.Request(
            'https://api.indexnow.org/indexnow',
            data=json.dumps(짐).encode('utf-8'),
            headers={'Content-Type': 'application/json; charset=utf-8'})
        try:
            r = urllib.request.urlopen(req, timeout=60)
            코드 = r.getcode()
        except urllib.error.HTTPError as e:
            코드 = e.code
        print('  묶음 %d · %d개 · HTTP %s %s'
              % (i // 한번에 + 1, len(짐['urlList']), 코드,
                 '(받았습니다)' if 코드 in (200, 202) else '(안 받았습니다)'))
        if 코드 in (200, 202):
            보냄 += len(짐['urlList'])
        time.sleep(2)
    print('')
    print('알린 주소 %d개' % 보냄)
    return 0


if __name__ == '__main__':
    sys.exit(main())
