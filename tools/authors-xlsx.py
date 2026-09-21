#!/usr/bin/env python3
"""authors-xlsx.py -- the author-linking worksheet as an Excel workbook.

OPTIONAL, AND THE ONLY THING IN THIS REPOSITORY THAT NEEDS INSTALLING.

tools/authors-export.mjs already writes the same questions as CSV and
tools/authors-link.mjs reads CSV back, so the whole round trip works with
nothing but Node. This adds the version that is pleasant to actually fill in:
one dropdown per row holding all 115 English author keys, so the answer is
picked rather than typed -- and a typed key with one letter wrong is the most
likely way this task goes quietly wrong.

    pip install openpyxl
    python tools/authors-xlsx.py            # write the workbook
    python tools/authors-xlsx.py --read     # read the answers back to CSV

--read is the return leg, and it exists because Excel's Save As CSV writes
only the ACTIVE sheet. By hand that means saving sheet 1 over
author-links.csv, switching to sheet 2, saving that over
author-latin-pairs.csv, and getting neither the order nor the encoding wrong.
This does both in one step; then

    node tools/authors-link.mjs

applies them to data/author-aliases.json.

The site itself still has no dependencies; nothing here ships to a browser.
"""
import io, json, sys

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

# --------------------------------------------------------------------------
# --read: the filled workbook back into the two CSVs
# --------------------------------------------------------------------------
#
# WHY THIS REBUILDS THE CSVs RATHER THAN EDITING THEM.
#
# The obvious implementation reads the workbook and writes each answer into
# the matching row of the existing author-links.csv. It broke the first time
# it was used, and for a reason worth keeping written down: the person filling
# the workbook in had ALSO done the sensible-looking thing and saved sheet 1
# over author-links.csv from Excel. That file then held the sheet's own
# layout -- four rows of instructions, then the human-readable column titles
# -- and nothing that a tool expecting persian_key could match against.
#
# So the CSVs are regenerated from author-links.json, the inventory that
# authors-export.mjs writes and nothing else edits, and the answers are
# matched by the Persian display NAME. That survives the CSVs having been
# overwritten, reordered or saved from Excel in between, which is the normal
# condition of a file a human has been working in.
# --------------------------------------------------------------------------
if '--read' in sys.argv:
    import csv
    import json
    from openpyxl import load_workbook

    src = 'author-links.xlsx'
    inv = json.load(io.open('author-links.json', encoding='utf-8'))
    wb = load_workbook(src, data_only=True)

    # Sheet 1: Persian display name -> the English key chosen for it.
    ws = wb['1 Persian to English']
    chosen = {}
    for row in ws.iter_rows(min_row=7, values_only=True):
        if not row[0]:
            continue
        answer = str(row[5] or '').strip()
        if answer:
            chosen[str(row[0]).strip()] = answer

    valid = {p['key'] for p in inv['latin']}
    filled = persian_only = 0
    unknown = []
    missing = []

    link_head = ['persian_key', 'persian_name', 'papers', 'translit', 'suggested',
                 'suggested_name', 'verdict', 'confidence', 'alt1', 'alt2',
                 'latin_key', 'currently_linked', 'titles']
    link_rows = []
    for r in inv['rows']:
        answer = chosen.get(r['persian_name'].strip(), '')
        if answer.lower().startswith('none'):
            answer = 'NONE'
            persian_only += 1
        elif answer:
            if answer not in valid:
                unknown.append((r['persian_name'], answer))
            else:
                filled += 1
        else:
            missing.append(r['persian_name'])
        link_rows.append([
            r['persian_key'], r['persian_name'], r['papers'], r['translit'],
            r['suggested'], r['suggested_name'], r['verdict'], r['confidence'],
            r.get('alt1', ''), r.get('alt2', ''), answer,
            r.get('currently_linked', ''), r['titles'],
        ])

    if unknown:
        print('These answers are not English author keys -- nothing written:')
        for name, answer in unknown:
            print('   %s  ->  "%s"' % (name, answer))
        sys.exit(1)

    with io.open('author-links.csv', 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, quoting=csv.QUOTE_ALL)
        w.writerow(link_head)
        w.writerows(link_rows)

    # Sheet 2 carries both keys on the row, so it is matched on the keys.
    ws2 = wb['2 English spelt twice']
    keep = {}
    for row in ws2.iter_rows(min_row=5, values_only=True):
        if row[1] and row[7]:
            keep[(str(row[1]).strip(), str(row[4]).strip())] = str(row[7]).strip()

    pair_head = ['key_a', 'name_a', 'papers_a', 'key_b', 'name_b', 'papers_b',
                 'why', 'fold_a_into_b']
    pair_rows = []
    pairs_written = 0
    for pr in inv['pairs']:
        answer = keep.get((pr['a'], pr['b']), '')
        if answer:
            pairs_written += 1
        pair_rows.append([pr['a'], pr['aName'], pr['aCount'],
                          pr['b'], pr['bName'], pr['bCount'], pr['why'], answer])

    with io.open('author-latin-pairs.csv', 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, quoting=csv.QUOTE_ALL)
        w.writerow(pair_head)
        w.writerows(pair_rows)

    print('read %s' % src)
    print('  links to make          %d' % filled)
    print('  marked Persian-only    %d' % persian_only)
    print('  English pairs to merge %d' % pairs_written)
    if missing:
        print('  left blank             %d (they will come back next time)' % len(missing))
    print('')
    print('  wrote author-links.csv, author-latin-pairs.csv')
    print('  Now run: node tools/authors-link.mjs --dry-run')
    sys.exit(0)

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'author-links.xlsx'

d = json.load(io.open(ROOT + '/author-links.json', encoding='utf-8'))
rows, pairs, latin, linked = d['rows'], d['pairs'], d['latin'], d['linked']

HEAD = PatternFill('solid', fgColor='1F3A4D')
ASK = PatternFill('solid', fgColor='FFF2CC')
NOTE = PatternFill('solid', fgColor='EEF4F8')
WHITE = Font(color='FFFFFF', bold=True, size=11)
BOLD = Font(bold=True)
THIN = Border(*[Side(style='thin', color='C8D4DC')] * 4)
WRAP = Alignment(wrap_text=True, vertical='top')
TOP = Alignment(vertical='top')

wb = Workbook()

# ---------------------------------------------------------------- sheet 1
ws = wb.active
ws.title = '1 Persian to English'

intro = [
    'Each row is a name that appears ONLY in Persian in publications.json.',
    'If that person also publishes in English here, put their English key in the yellow column (pick from the dropdown).',
    'If they publish only in Persian, choose  NONE - Persian only.  Leaving a row blank also means "not decided yet".',
    'The suggestion is a computer guess from transliteration. Check it. The paper titles are in the last column to help.',
]
for i, line in enumerate(intro, start=1):
    ws.cell(row=i, column=1, value=line).font = BOLD if i == 1 else Font(size=10)
    ws.merge_cells(start_row=i, start_column=1, end_row=i, end_column=8)
    ws.cell(row=i, column=1).fill = NOTE
    ws.cell(row=i, column=1).alignment = Alignment(vertical='center')

HR = len(intro) + 2
headers = ['Persian name', 'Papers', 'Suggested English', 'Suggested (key)',
           'How sure', 'YOUR ANSWER (key)', 'Other candidates', 'Papers they appear on']
for c, h in enumerate(headers, start=1):
    cell = ws.cell(row=HR, column=c, value=h)
    cell.fill = HEAD
    cell.font = WHITE
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    cell.border = THIN

NONE = 'NONE - Persian only'
choices = [NONE] + [p['key'] for p in sorted(latin, key=lambda x: x['key'])]

for i, r in enumerate(rows):
    rr = HR + 1 + i
    alts = ' | '.join(x for x in [r.get('alt1', ''), r.get('alt2', '')] if x)
    vals = [r['persian_name'], r['papers'], r['suggested_name'], r['suggested'],
            r['verdict'], '', alts, r['titles'].replace(' ¶ ', '\n')]
    for c, v in enumerate(vals, start=1):
        cell = ws.cell(row=rr, column=c, value=v)
        cell.border = THIN
        cell.alignment = WRAP if c in (7, 8) else TOP
        if c == 1:
            cell.alignment = Alignment(horizontal='right', vertical='top')
        if c == 6:
            cell.fill = ASK

# The dropdown. Excel caps an inline list at 255 characters, so the choices
# live on their own sheet and the validation points at that range.
lookup = wb.create_sheet('_choices')
for i, v in enumerate(choices, start=1):
    lookup.cell(row=i, column=1, value=v)
lookup.sheet_state = 'hidden'

dv = DataValidation(
    type='list',
    formula1="=_choices!$A$1:$A${}".format(len(choices)),
    allow_blank=True,
    showDropDown=False,   # False here means "show the arrow" in OOXML
)
dv.error = 'Pick a key from the list, or NONE - Persian only.'
dv.errorTitle = 'Not one of the English author keys'
dv.prompt = 'Pick the English name for this person, or NONE - Persian only.'
dv.promptTitle = 'Link this author'
ws.add_data_validation(dv)
dv.add('F{}:F{}'.format(HR + 1, HR + len(rows)))

for col, w in zip('ABCDEFGH', [22, 8, 26, 24, 24, 26, 46, 70]):
    ws.column_dimensions[col].width = w
ws.freeze_panes = 'A{}'.format(HR + 1)
ws.row_dimensions[HR].height = 30

# ---------------------------------------------------------------- sheet 2
ws2 = wb.create_sheet('2 English spelt twice')
note2 = [
    'These are pairs of ENGLISH names that may be the same person written two ways.',
    'To merge a pair, put the key you want KEPT in the yellow column. Leave blank to keep them separate.',
]
for i, line in enumerate(note2, start=1):
    ws2.cell(row=i, column=1, value=line).font = BOLD if i == 1 else Font(size=10)
    ws2.merge_cells(start_row=i, start_column=1, end_row=i, end_column=7)
    ws2.cell(row=i, column=1).fill = NOTE

H2 = len(note2) + 2
for c, h in enumerate(['Name A', 'Key A', 'Papers', 'Name B', 'Key B', 'Papers',
                       'Why flagged', 'KEEP WHICH KEY?'], start=1):
    cell = ws2.cell(row=H2, column=c, value=h)
    cell.fill = HEAD
    cell.font = WHITE
    cell.alignment = Alignment(horizontal='center', wrap_text=True)
    cell.border = THIN

for i, p in enumerate(pairs):
    rr = H2 + 1 + i
    for c, v in enumerate([p['aName'], p['a'], p['aCount'],
                           p['bName'], p['b'], p['bCount'], p['why'], ''], start=1):
        cell = ws2.cell(row=rr, column=c, value=v)
        cell.border = THIN
        if c == 8:
            cell.fill = ASK

if pairs:
    pl = wb['_choices']
    start = len(choices) + 2
    pair_choices = []
    for p in pairs:
        pair_choices += [p['a'], p['b']]
    pair_choices = sorted(set(pair_choices))
    for i, v in enumerate(pair_choices, start=start):
        pl.cell(row=i, column=1, value=v)
    dv2 = DataValidation(
        type='list',
        formula1="=_choices!$A${}:$A${}".format(start, start + len(pair_choices) - 1),
        allow_blank=True, showDropDown=False)
    ws2.add_data_validation(dv2)
    dv2.add('H{}:H{}'.format(H2 + 1, H2 + len(pairs)))

for col, w in zip('ABCDEFGH', [26, 26, 8, 26, 26, 8, 30, 26]):
    ws2.column_dimensions[col].width = w
ws2.freeze_panes = 'A{}'.format(H2 + 1)

# ---------------------------------------------------------------- sheet 3
ws3 = wb.create_sheet('3 English authors')
ws3.cell(row=1, column=1, value='Every English-script author in the graph. This is the list the dropdowns use.').font = BOLD
ws3.merge_cells('A1:C1')
ws3.cell(row=1, column=1).fill = NOTE
for c, h in enumerate(['Key', 'Name', 'Papers'], start=1):
    cell = ws3.cell(row=3, column=c, value=h)
    cell.fill = HEAD
    cell.font = WHITE
    cell.border = THIN
for i, p in enumerate(sorted(latin, key=lambda x: (-x['count'], x['label']))):
    for c, v in enumerate([p['key'], p['label'], p['count']], start=1):
        ws3.cell(row=4 + i, column=c, value=v).border = THIN
for col, w in zip('ABC', [30, 30, 10]):
    ws3.column_dimensions[col].width = w
ws3.freeze_panes = 'A4'

# ---------------------------------------------------------------- sheet 4
ws4 = wb.create_sheet('4 Already linked')
ws4.cell(row=1, column=1,
         value='Links already in data/author-aliases.json. Nothing to do here '
               '- shown so you can check none of them is wrong.').font = BOLD
ws4.merge_cells('A1:B1')
ws4.cell(row=1, column=1).fill = NOTE
for c, h in enumerate(['This name...', '...is this person'], start=1):
    cell = ws4.cell(row=3, column=c, value=h)
    cell.fill = HEAD
    cell.font = WHITE
    cell.border = THIN
for i, l in enumerate(linked):
    ws4.cell(row=4 + i, column=1, value=l['from']).border = THIN
    ws4.cell(row=4 + i, column=2, value=l['to']).border = THIN
ws4.column_dimensions['A'].width = 34
ws4.column_dimensions['B'].width = 34
ws4.freeze_panes = 'A4'

wb.save(OUT)
print('wrote', OUT)
print('  sheet 1: %d Persian names to decide' % len(rows))
print('  sheet 2: %d English pairs to decide' % len(pairs))
print('  sheet 3: %d English authors' % len(latin))
print('  sheet 4: %d links already in place' % len(linked))
