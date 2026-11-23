import re
import sys
import zipfile
from xml.etree import ElementTree as ET

PATH = r"c:\Users\b.carson\Downloads\New Zealand v South Africa 63406779 (3).xlsm"
NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def col_row(ref: str) -> tuple[str, int]:
    m = re.match(r"^([A-Z]+)(\d+)$", ref)
    if not m:
        raise ValueError(ref)
    return m.group(1), int(m.group(2))


def col_index(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - ord("A") + 1)
    return n


def read_shared_strings(z: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    out: list[str] = []
    for si in root.findall(".//m:si", NS):
        parts = [t.text or "" for t in si.findall(".//m:t", NS)]
        out.append("".join(parts))
    return out


def cell_parts(c_el: ET.Element, shared: list[str]) -> tuple[str, str]:
    """Returns (cached_value, formula_or_literal)."""
    f_el = c_el.find("m:f", NS)
    formula = ("=" + f_el.text) if f_el is not None and f_el.text else ""
    t = c_el.get("t")
    v_el = c_el.find("m:v", NS)
    if v_el is None or v_el.text is None:
        if formula:
            return ("", formula)
        is_el = c_el.find("m:is", NS)
        if is_el is not None:
            parts = [t.text or "" for t in is_el.findall(".//m:t", NS)]
            return ("".join(parts), formula)
        return ("", formula)
    if t == "s":
        return (shared[int(v_el.text)], formula)
    return (v_el.text, formula)


def sheet_cells(z: zipfile.ZipFile, sheet_path: str) -> dict[str, tuple[str, str]]:
    root = ET.fromstring(z.read(sheet_path))
    shared = read_shared_strings(z)
    cells: dict[str, tuple[str, str]] = {}
    for c in root.findall(".//m:c", NS):
        ref = c.get("r")
        if ref:
            cells[ref] = cell_parts(c, shared)
    return cells


def sheet_cells_flat(z: zipfile.ZipFile, sheet_path: str) -> dict[str, str]:
    return {k: (v[1] or v[0]) for k, v in sheet_cells(z, sheet_path).items()}


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else PATH
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sheets: list[tuple[str, str]] = []
        for sh in wb.findall(".//m:sheet", NS):
            sheets.append(
                (
                    sh.get("name") or "",
                    sh.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id") or "",
                )
            )
        print("SHEETS:", [n for n, _ in sheets])

        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid_to_target = {rel.get("Id"): rel.get("Target") for rel in rels}

        prep_names = [n for n, _ in sheets if "prep" in n.lower()]
        if not prep_names:
            print("No sheet with 'prep' in name; trying all sheets for DH24 formula...")
            targets = sheets
        else:
            targets = [(n, rid) for n, rid in sheets if "prep" in n.lower()]

        addrs = [
            "M21",
            "L24",
            "M24",
            "CD24",
            "DV24",
            "DH24",
            "L45",
            "M45",
            "CD45",
            "DV45",
            "DH45",
            "I24",
            "I45",
        ]
        header_rows = [20, 21, 22, 23]

        for name, rid in targets:
            target = rid_to_target.get(rid, "")
            if not target:
                continue
            sheet_path = "xl/" + target.lstrip("/")
            print(f"\n=== {name} ({sheet_path}) ===")
            cells = sheet_cells(z, sheet_path)
            for addr in addrs:
                cached, formula = cells.get(addr, ("<missing>", ""))
                if formula:
                    print(f"  {addr}: {formula}  =>  {cached}")
                else:
                    print(f"  {addr}: {cached}")

            # Row 24: print labels for columns near L, CD, DV, DH
            for col in ["I", "J", "K", "L", "M", "N", "CC", "CD", "CE", "DU", "DV", "DW", "DG", "DH", "DI"]:
                for hr in header_rows:
                    ref = f"{col}{hr}"
                    if ref in cells:
                        cached, formula = cells[ref]
                        label = formula or cached
                        if label:
                            print(f"  header {ref}: {label}")

            # If DH24 is formula, show related cells in row 24
            dh_cached, dh_formula = cells.get("DH24", ("", ""))
            dh = dh_formula or dh_cached
            if dh.startswith("=") or name in prep_names:
                print("  --- row 24 sample (cols I through P) ---")
                for c in range(col_index("I"), col_index("P") + 1):
                    col = ""
                    n = c
                    while n:
                        n, rem = divmod(n - 1, 26)
                        col = chr(rem + ord("A")) + col
                    ref = f"{col}24"
                    if ref in cells:
                        cached, formula = cells[ref]
                        line = formula or cached
                        print(f"    {ref}: {line[:160]}")


if __name__ == "__main__":
    main()
