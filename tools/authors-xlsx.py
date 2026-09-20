#!/usr/bin/env python3
"""authors-xlsx.py -- the author-linking worksheet as an Excel workbook.

OPTIONAL, AND THE ONLY THING HERE THAT NEEDS INSTALLING.

authors-export
  people in the graph, unmerged   141
  people after aliases            119
  Persian-script names            26
  Latin-script names              115
  rows needing a decision         12

  wrote author-links.csv, author-latin.csv, author-latin-pairs.csv, author-links.json
  Fill in the latin_key column, then run: node tools/authors-link.mjs already writes the same questions as CSV, and
authors-link
  aliases before      22
  aliases after       22
  people before       119
  people after        119

  no new links — nothing in the worksheets was filled in.

  wrote data/author-aliases.json
  Now run: node tools/check-authors.mjs reads CSV back, so the whole round trip works with
nothing but Node. This adds the version that is pleasant to actually fill in:
one dropdown per row, holding all 115 English author keys, so the answer is
picked rather than typed -- and a typed key with one letter wrong is the most
likely way this task goes quietly wrong.

    pip install openpyxl
    python tools/authors-xlsx.py

Writes author-links.xlsx beside the CSVs. Fill in the yellow column on sheets
1 and 2, save as CSV over author-links.csv / author-latin-pairs.csv, and run
authors-link
  aliases before      22
  aliases after       22
  people before       119
  people after        119

  no new links — nothing in the worksheets was filled in.

  wrote data/author-aliases.json
  Now run: node tools/check-authors.mjs.

The site itself still has no dependencies; nothing here ships to a browser.
"""
import io, json, sys

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

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
