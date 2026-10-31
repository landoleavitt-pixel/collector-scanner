# Builds fake-panini.xlsx for the tests. FAKE data only.
import zipfile
rows = [
    ["Card #", "Player", "Team", "Subset", "Rookie"],
    ["101", "FAKE PLAYER SIX", "FAKE TEAM F", "Base", "No"],
    ["102", "FAKE PLAYER SEVEN", "FAKE TEAM G", "Rookie", "Yes"],
    ["103", "FAKE PLAYER EIGHT", "FAKE TEAM H", "Insert", "No"],
]
def cell(ref, v):
    if isinstance(v, str):
        return f'<c r="{ref}" t="inlineStr"><is><t>{v}</t></is></c>'
    return f'<c r="{ref}"><v>{v}</v></c>'
letters = "ABCDE"
sheet_rows = ""
for i, r in enumerate(rows, 1):
    cells = "".join(cell(f"{letters[j]}{i}", v) for j, v in enumerate(r))
    sheet_rows += f'<row r="{i}">{cells}</row>'
sheet = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
         '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
         f'<sheetData>{sheet_rows}</sheetData></worksheet>')
files = {
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="FAKE" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": sheet,
}
with zipfile.ZipFile("fake-panini.xlsx", "w", zipfile.ZIP_DEFLATED) as z:
    for name, body in files.items():
        z.writestr(name, body)
print("wrote fake-panini.xlsx")
