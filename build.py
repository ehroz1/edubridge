#!/usr/bin/env python3
"""
Собирает конструктор edubridge в один index.html для GitHub Pages.

Что берёт:
    src/            — код (render.js, templates.js, app.js, styles.css, index.template.html)
    brand/fonts/    — Onest и Unbounded (TTF по весам)
    brand/logo/     — логотип и дуга (SVG, берутся только контуры)
    brand/glyphs/   — иконки Phosphor Fill для макетов
    brand/ui/       — иконки Phosphor Bold для интерфейса
    brand/flags/    — круглые флаги (Circle Flags)

Запуск:  python3 build.py
Результат: index.html, manifest.webmanifest, service-worker.js в корне
"""

import base64
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
BRAND = HERE / "brand"
FONTS = BRAND / "fonts"
OUT = HERE / "index.html"

# латиница, кириллица с казахскими буквами, типографские знаки, валюты (₸ € ₽), стрелки
SUBSET_UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+0400-045F,U+0490-0493,U+049A-049B,U+04A2-04A3,"
    "U+04AE-04B1,U+04BA-04BB,U+04D8-04D9,U+04E8-04E9,"
    "U+2010-2015,U+2018-201F,U+2022,U+2026,U+20AC,U+20B8,U+20BD,U+2116,"
    "U+2190-2193,U+2212,U+2248,U+2260,U+2264-2265"
)

# семейство → (имя в CSS, веса)
FONT_FAMILIES = {
    "Onest": ("EBOnest", [400, 500, 600, 700, 800]),
    "Unbounded": ("EBUnbounded", [500, 600, 700]),
}


def data_url(path: Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def subset_font(path: Path) -> tuple[bytes, bool]:
    """Урезает шрифт до нужных символов и переводит в woff2. Без fontTools — как есть."""
    try:
        from fontTools import subset  # noqa: F401
    except ImportError:
        print(f"  ! fontTools не установлен, {path.name} встраивается целиком")
        print("    (поставь: pip3 install fonttools brotli — файл станет меньше)")
        return path.read_bytes(), False

    with tempfile.TemporaryDirectory() as tmp:
        dst = Path(tmp) / "out.woff2"
        cmd = [
            sys.executable, "-m", "fontTools.subset", str(path),
            f"--unicodes={SUBSET_UNICODES}",
            "--flavor=woff2",
            f"--output-file={dst}",
            "--layout-features=kern,liga,tnum,case",
            "--no-hinting",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0 or not dst.exists():
            print(f"  ! не удалось урезать {path.name}, встраиваю целиком")
            return path.read_bytes(), False
        return dst.read_bytes(), True


def font_faces() -> str:
    faces = []
    for stem, (css_name, weights) in FONT_FAMILIES.items():
        for weight in weights:
            path = FONTS / f"{stem}-{weight}.ttf"
            if not path.exists():
                raise SystemExit(f"нет шрифта {path.relative_to(HERE)}")
            data, woff2 = subset_font(path)
            fmt, mime = ("woff2", "font/woff2") if woff2 else ("truetype", "font/ttf")
            b64 = base64.b64encode(data).decode("ascii")
            faces.append(
                f"@font-face{{font-family:'{css_name}';font-weight:{weight};font-style:normal;"
                f"font-display:block;src:url(data:{mime};base64,{b64}) format('{fmt}')}}"
            )
            print(f"шрифт {css_name} {weight}: {len(data) // 1024} КБ")
    return "\n".join(faces)


def svg_paths(path: Path) -> dict:
    """Контуры SVG: viewBox и список путей с цветом и правилом заливки."""
    svg = path.read_text(encoding="utf-8")
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split()]
    paths = []
    for tag in re.findall(r"<path[^>]*>", svg):
        d = re.search(r'\sd="([^"]+)"', tag).group(1)
        fill = re.search(r'fill="([^"]+)"', tag)
        rule = re.search(r'fill-rule="([^"]+)"', tag)
        paths.append({"d": d, "fill": fill.group(1) if fill else None,
                      "rule": rule.group(1) if rule else "nonzero"})
    return {"vb": vb, "paths": paths}


def brand_paths() -> str:
    logo = svg_paths(BRAND / "logo" / "logo.svg")
    arc = svg_paths(BRAND / "logo" / "arc.svg")
    # в logo.svg первый путь — вордмарк (Ink), второй — дуга (Bridge Blue)
    word = next(p for p in logo["paths"] if p["fill"].upper() != "#0A34F5")
    logo_arc = next(p for p in logo["paths"] if p["fill"].upper() == "#0A34F5")
    data = {
        "logo": {"vb": logo["vb"], "word": word["d"], "wordRule": word["rule"], "arc": logo_arc["d"]},
        "arc": {"vb": arc["vb"], "d": arc["paths"][0]["d"]},
    }
    return "const BRAND_PATHS = " + json.dumps(data, ensure_ascii=False) + ";\n"


def glyphs() -> str:
    """Иконки для макетов: контуры для Path2D (viewBox 256)."""
    out = {}
    for f in sorted((BRAND / "glyphs").glob("*.svg")):
        info = svg_paths(f)
        out[f.stem] = [p["d"] for p in info["paths"]]
    print(f"иконок в макетах: {len(out)}")
    return "const GLYPHS = " + json.dumps(out) + ";\n"


def ui_icons() -> str:
    """Иконки интерфейса — живая разметка SVG, цвет наследуется через currentColor."""
    out = {}
    for f in sorted((BRAND / "ui").glob("*.svg")):
        svg = " ".join(f.read_text(encoding="utf-8").split())
        svg = svg.replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)
        out[f.stem] = svg
    print(f"иконок интерфейса: {len(out)}")
    return "const ICONS = " + json.dumps(out, ensure_ascii=False) + ";\n"


def flags() -> str:
    out = {}
    for f in sorted((BRAND / "flags").glob("*.svg")):
        out[f.stem] = data_url(f, "image/svg+xml")
    print(f"флагов: {len(out)}")
    return "const FLAGS = " + json.dumps(out) + ";\n"


def partners() -> str:
    """Логотипы партнёров для ко-брендинга (brand/partners/*.svg, имена — в names.json).
    Файлы чёрные: в макете они перекрашиваются в Ink или белый под фон."""
    folder = BRAND / "partners"
    names = json.loads((folder / "names.json").read_text(encoding="utf-8")) if folder.exists() else {}
    out = []
    for f in sorted(folder.glob("*.svg")) if folder.exists() else []:
        out.append({"id": "lib:" + f.stem, "name": names.get(f.stem, f.stem), "url": data_url(f, "image/svg+xml")})
    print(f"логотипов партнёров: {len(out)}")
    return "const PARTNER_LOGOS = " + json.dumps(out, ensure_ascii=False) + ";\n"


def main() -> int:
    if not SRC.exists():
        print("нет папки src/ — запусти скрипт из корня проекта")
        return 1

    assets_js = brand_paths() + glyphs() + ui_icons() + flags() + partners()

    icon_svg = BRAND / "pwa-icon.svg"
    icon_mask = BRAND / "pwa-icon-maskable.svg"
    icon_png = BRAND / "pwa-icon-180.png"
    favicon_url = data_url(icon_svg, "image/svg+xml") if icon_svg.exists() else ""
    if icon_png.exists():
        apple_icon_url = data_url(icon_png, "image/png")
    else:
        print(f"  ! нет {icon_png.name} — apple-touch-icon будет из SVG (хуже на части iOS)")
        apple_icon_url = favicon_url

    html = (SRC / "index.template.html").read_text(encoding="utf-8")
    replacements = {
        "__FONT_FACES__": font_faces(),
        "__CSS__": (SRC / "styles.css").read_text(encoding="utf-8"),
        "__ASSETS_JS__": assets_js,
        "__FAVICON__": favicon_url,
        "__APPLE_TOUCH_ICON__": apple_icon_url,
        "__RENDER_JS__": (SRC / "render.js").read_text(encoding="utf-8"),
        "__TEMPLATES_JS__": (SRC / "templates.js").read_text(encoding="utf-8"),
        "__APP_JS__": (SRC / "app.js").read_text(encoding="utf-8"),
    }
    for token, value in replacements.items():
        if token not in html:
            print(f"ошибка сборки: в шаблоне нет {token}")
            return 1
        html = html.replace(token, value)

    OUT.write_text(html, encoding="utf-8")
    print(f"\nготово: {OUT.name}  ({OUT.stat().st_size / 1024:.0f} КБ)")

    manifest = (SRC / "manifest.template.json").read_text(encoding="utf-8")
    manifest = manifest.replace("__PWA_ICON__", favicon_url)
    manifest = manifest.replace("__PWA_ICON_MASKABLE__",
                                data_url(icon_mask, "image/svg+xml") if icon_mask.exists() else favicon_url)
    (HERE / "manifest.webmanifest").write_text(manifest, encoding="utf-8")
    (HERE / "service-worker.js").write_text((SRC / "service-worker.js").read_text(encoding="utf-8"),
                                            encoding="utf-8")
    print("готово: manifest.webmanifest, service-worker.js")
    print("залей в репозиторий и включи GitHub Pages — см. README.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
