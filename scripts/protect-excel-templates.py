"""Add native example-row protection after Artifact Tool XLSX export.

Only the main input sheet is protected. Column defaults and all body cells
are unlocked, including new rows below the preformatted 500-entry area.
"""
import sys
import zipfile
from pathlib import Path
from xml.dom import minidom

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'


def elements(node, name):
    return list(node.getElementsByTagNameNS(NS, name))


def protect(path):
    path = Path(path)
    with zipfile.ZipFile(path) as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]
    files = {info.filename: data for info, data in entries}
    styles = minidom.parseString(files['xl/styles.xml'])
    sheet = minidom.parseString(files['xl/worksheets/sheet1.xml'])
    xfs = elements(styles, 'cellXfs')[0]
    originals = [node for node in xfs.childNodes if node.nodeType == node.ELEMENT_NODE]
    cache = {}

    def style(index, locked):
        key = (index, locked)
        if key in cache:
            return cache[key]
        xf = originals[index].cloneNode(deep=True)
        for old in elements(xf, 'protection'):
            xf.removeChild(old)
        xf.setAttribute('applyProtection', '1')
        prefix = xf.prefix + ':' if xf.prefix else ''
        protection = styles.createElementNS(NS, prefix + 'protection')
        protection.setAttribute('locked', '1' if locked else '0')
        xf.appendChild(protection)
        result = len([n for n in xfs.childNodes if n.nodeType == n.ELEMENT_NODE])
        xfs.appendChild(xf)
        cache[key] = result
        return result

    for col in elements(sheet, 'col'):
        col.setAttribute('style', str(style(int(col.getAttribute('style') or 0), False)))
    for cell in elements(sheet, 'c'):
        row = int(''.join(ch for ch in cell.getAttribute('r') if ch.isdigit()))
        cell.setAttribute('s', str(style(int(cell.getAttribute('s') or 0), row <= 2)))
    xfs.setAttribute('count', str(len([n for n in xfs.childNodes if n.nodeType == n.ELEMENT_NODE])))
    root = sheet.documentElement
    prefix = root.prefix + ':' if root.prefix else ''
    protection = sheet.createElementNS(NS, prefix + 'sheetProtection')
    # Standard Excel worksheet password hash. This prevents accidental changes;
    # it is not encryption or an access-control boundary.
    password = 'KML-example'
    hashed = 0
    for i, ch in enumerate(password, 1):
        value = ord(ch) << i
        hashed ^= (value & 0x7fff) | (value >> 15)
    hashed ^= len(password) ^ 0xCE4B
    attrs = dict(password=f'{hashed:04X}', sheet='1', objects='1', scenarios='1',
                 formatCells='0', formatColumns='0', formatRows='0',
                 insertColumns='0', insertRows='1', deleteColumns='1',
                 deleteRows='1', selectLockedCells='0', selectUnlockedCells='0')
    for key, value in attrs.items():
        protection.setAttribute(key, value)
    previous = (elements(sheet, 'sheetCalcPr') or elements(sheet, 'sheetData'))[0]
    root.insertBefore(protection, previous.nextSibling)
    files['xl/styles.xml'] = styles.toxml(encoding='UTF-8')
    files['xl/worksheets/sheet1.xml'] = sheet.toxml(encoding='UTF-8')
    temporary = path.with_suffix('.protected.tmp')
    with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as output:
        for info, data in entries:
            output.writestr(info, files[info.filename])
    temporary.replace(path)


if __name__ == '__main__':
    protect(sys.argv[1])
