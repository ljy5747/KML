"""Verify native XLSX protection, editable inputs, and normal scrolling."""
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET
NS={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for kind in ('adults','larvae'):
    path=Path(__file__).resolve().parents[1]/f'assets/templates/KML_{kind}_template.xlsx'
    with zipfile.ZipFile(path) as z:
        sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        xfs=ET.fromstring(z.read('xl/styles.xml')).find('x:cellXfs',NS)
        protection=sheet.find('x:sheetProtection',NS)
        assert protection is not None and protection.get('sheet')=='1'
        assert protection.get('deleteRows')=='1' and protection.get('insertRows')=='1'
        assert protection.get('password')
        assert sheet.find('.//x:pane',NS) is None
        def locked(style):
            p=xfs[int(style)].find('x:protection',NS)
            return p is None or p.get('locked')!='0'
        cells=sheet.findall('.//x:sheetData/x:row/x:c',NS)
        for c in cells:
            row=int(''.join(filter(str.isdigit,c.get('r'))))
            assert locked(c.get('s','0'))==(row<=2),c.get('r')
        assert any(c.get('r')=='A502' for c in cells)
        assert all(not locked(c.get('style','0')) for c in sheet.findall('x:cols/x:col',NS))
        assert 'KML 고정 예시' in ''.join(sheet.itertext())
        assert b'<x:sheetProtection' not in z.read('xl/worksheets/sheet2.xml')
    print(f'PASS: {kind} protected example/header, 500 editable rows, editable column defaults, no frozen/split panes')
