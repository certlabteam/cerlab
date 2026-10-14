"""피그마 계단 맞추기(서트랩) — 계단에 없는 값만 가까운 계단으로 옮긴다(색·말·그림은 그대로).

일구미 tools/snap_scale.py 를 본떠 표만 서트랩 값으로 새로 만들었다(2026-10-14 · _공용/피그마_토큰.md).
  글자   20px 이하는 위로 올림(12 아래로 안 내림 · 크리스 눈) · 그보다 큰 제목은 가까운 칸
  여백   가까운 칸 · 같으면 작은 쪽(폰 자리)
  둥글기 가까운 칸(일구미 표와 같은 쪽) · 99·999(알약)은 그대로
  #printArea(시험장 인쇄 · A4 접기 맞춤) 줄은 건드리지 않는다.
쓰는 법: cerlab 폴더에서  python scripts/snap_scale.py [--보기]
되돌릴 원본: certlab 컨텐츠/_디자인/_백업_피그마계단_20261014/
"""
import re, sys

FONT = {10: 12, 10.5: 12, 11: 12, 12.5: 14, 13: 14, 13.5: 14, 14.5: 16, 15: 16, 17: 18, 19: 20,
        21: 20, 22: 24, 25: 24, 26: 24, 32: 30, 34: 36, 38: 36, 40: 36, 44: 48, 46: 48, 52: 48}
RAD = {1: 2, 3: 4, 5: 4, 7: 6, 9: 8, 10: 12, 11: 12, 13: 12, 14: 12, 18: 16, 20: 24, 30: 24}
SPACE = {3: 2, 5: 4, 7: 6, 9: 8, 11: 10, 13: 12, 15: 14, 18: 16, 22: 20, 26: 24, 30: 28,
         34: 32, 58: 56, 84: 80, 86: 80}
RULES = [('글자', re.compile(r'(font-size:\s*)([^;"`}]+)'), FONT),
         ('둥글기', re.compile(r'(border-radius:\s*)([^;"`}]+)'), RAD),
         ('여백', re.compile(r'((?:padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)?:\s*)([^;"`}]+)'), SPACE)]
FILES = ['style.css', 'subjective-responsive.css']
보기만 = '--보기' in sys.argv
셈 = {}


def num(t):
    v = float(t)
    return int(v) if v == int(v) else v


for f in FILES:
    src = open(f, encoding='utf-8').read()
    out = []
    for line in src.split('\n'):
        if line.lstrip().startswith('#printArea'):
            out.append(line)
            continue
        for 이름, rx, m in RULES:
            def fix(mt, m=m, 이름=이름):
                def px(p):
                    v = num(p.group(1))
                    if v in m:
                        셈[(이름, v, m[v])] = 셈.get((이름, v, m[v]), 0) + 1
                        return '%spx' % m[v]
                    return p.group(0)
                return mt.group(1) + re.sub(r'(?<![\d.])(\d+(?:\.\d+)?)px', px, mt.group(2))
            line = rx.sub(fix, line)
        out.append(line)
    new = '\n'.join(out)
    if new != src and not 보기만:
        open(f, 'w', encoding='utf-8', newline='').write(new)
        print('고침', f)
for (이름, a, b), n in sorted(셈.items(), key=lambda x: (x[0][0], x[0][1])):
    print('%s %s→%s  %d곳' % (이름, a, b, n))
