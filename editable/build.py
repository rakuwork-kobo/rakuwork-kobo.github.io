#!/usr/bin/env python3
"""editable/content.yml から samples/editable/index.html を作ります。

使い方: python editable/build.py
  - content.yml の文字はすべて HTML として無害な形（エスケープ）にしてから入れます。
  - 書き方に誤りがあれば、日本語で理由を出して終了コード 1 で止まります。
    その場合は何も書き換えません（今のページがそのまま残ります）。
"""
import datetime
import html
import re
import shutil
import sys
import tempfile
from pathlib import Path

try:
    import yaml
except ImportError:
    print("エラー: PyYAML が入っていません。pip install pyyaml で入れてください。", file=sys.stderr)
    sys.exit(1)

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
CONTENT = HERE / "content.yml"
TEMPLATE = HERE / "template.html"
ASSETS = HERE / "assets"
OUT = REPO / "samples" / "editable"

PHOTO_RE = re.compile(r"^img/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$", re.IGNORECASE)
DATE_RE = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})$")
PRICE_RE = re.compile(r"^\d+$")
MAX_TEXT = 400


class ContentError(Exception):
    pass


def esc(s):
    return html.escape(s, quote=True)


def text(data, key, where, required=True):
    """文字の項目を取り出す。BaseLoader なので値はすべて文字列で届く。"""
    if not isinstance(data, dict):
        raise ContentError(f"「{where}」の形が正しくありません。")
    if key not in data:
        if required:
            raise ContentError(f"「{where}{key}」がありません。消さずに残してください。")
        return ""
    v = data[key]
    if isinstance(v, (list, dict)):
        raise ContentError(f"「{where}{key}」は文字で書いてください（行の頭の - や字下げを確かめてください）。")
    v = (v or "").strip()
    if required and not v:
        raise ContentError(f"「{where}{key}」が空です。何か書いてください。")
    if len(v) > MAX_TEXT:
        raise ContentError(f"「{where}{key}」が長すぎます（{MAX_TEXT}文字まで）。")
    return v


def items(data, key, where, allow_empty=False):
    v = data.get(key)
    if v is None or v == "":
        if allow_empty:
            return []
        raise ContentError(f"「{where}{key}」がありません。1行以上書いてください。")
    if not isinstance(v, list):
        raise ContentError(f"「{where}{key}」は「- 」で始まる行の並びで書いてください。")
    if not v and not allow_empty:
        raise ContentError(f"「{key}」が空です。1行以上書いてください。")
    return v


def br(s):
    return "<br>".join(esc(line) for line in s.splitlines())


def load():
    try:
        raw = CONTENT.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise ContentError("editable/content.yml が見つかりません。")
    except UnicodeDecodeError:
        raise ContentError("content.yml の文字コードが UTF-8 ではありません。")
    try:
        # BaseLoader: 17:00 や yes などを勝手に数や真偽に変えず、すべて文字のまま読む
        data = yaml.load(raw, Loader=yaml.BaseLoader)
    except yaml.YAMLError as e:
        mark = getattr(e, "problem_mark", None)
        pos = f"{mark.line + 1}行目あたり" if mark else "どこか"
        raise ContentError(
            f"content.yml の{pos}の書き方が崩れています。"
            "「: 」のあとの空白、字下げ（行頭の空白の数）、\" の閉じ忘れを確かめてください。"
        )
    if not isinstance(data, dict):
        raise ContentError("content.yml の中身が読めません。shop_name: などの行が消えていないか確かめてください。")
    return data


def build_values(d):
    v = {}
    v["shop_name"] = esc(text(d, "shop_name", ""))
    v["catch"] = br(text(d, "catch", ""))
    v["holidays"] = esc(text(d, "holidays", ""))

    hours = items(d, "hours", "")
    rows = []
    for i, h in enumerate(hours, 1):
        label = text(h, "label", f"hours の{i}行目の ")
        time = text(h, "time", f"hours の{i}行目の ")
        rows.append((label, time))
    v["hours_first"] = esc(rows[0][1])
    v["hours_sub"] = esc(" ".join(rows[1]) if len(rows) > 1 else rows[0][0])
    v["hours_rows"] = "\n".join(
        f"          <div><dt>{esc(l)}</dt><dd>{esc(t)}</dd></div>" for l, t in rows
    )

    notices = []
    for i, n in enumerate(items(d, "notices", "", allow_empty=True), 1):
        date = text(n, "date", f"notices の{i}件目の ")
        body = text(n, "text", f"notices の{i}件目の ")
        m = DATE_RE.match(date)
        try:
            if not m:
                raise ValueError
            day = datetime.date(int(m[1]), int(m[2]), int(m[3]))
        except ValueError:
            raise ContentError(f"notices の{i}件目の date「{date}」は 2026-10-25 の形で、ある日付を書いてください。")
        notices.append((day, body))
    notices.sort(key=lambda x: x[0], reverse=True)  # 新しい順にそろえる
    if notices:
        lis = "\n".join(
            f'        <li><time datetime="{day.isoformat()}">{day.year}年{day.month}月{day.day}日</time>'
            f"<p>{esc(body)}</p></li>"
            for day, body in notices
        )
        v["notices"] = f'      <ul class="news-list">\n{lis}\n      </ul>'
    else:
        v["notices"] = '      <p class="news-empty">いまお知らせはありません。</p>'

    menu = []
    for i, it in enumerate(items(d, "menu", ""), 1):
        name = text(it, "name", f"menu の{i}品目の ")
        price = text(it, "price", f"menu の{i}品目の ").replace(",", "").replace("円", "").strip()
        price = f"{int(price):,}" if PRICE_RE.match(price) else price
        menu.append(f"          <li><span>{esc(name)}</span><i></i><b>{esc(price)}</b></li>")
    v["menu"] = "\n".join(menu)

    photos = d.get("photos")
    if not isinstance(photos, dict):
        raise ContentError("「photos」がありません。hero と story の写真を書いてください。")
    for key in ("hero", "story"):
        p = text(photos, key, "photos の ")
        if not PHOTO_RE.match(p):
            raise ContentError(
                f"photos の {key}「{p}」は img/○○.jpg の形で書いてください"
                "（使える字は英数字と - _ . 、形式は jpg・png・webp）。"
            )
        if not (ASSETS / p).is_file():
            raise ContentError(f"photos の {key}「{p}」の写真が editable/assets/{p} にありません。")
        v[f"photo_{key}"] = esc(p)
        v[f"photo_{key}_alt"] = esc(text(photos, f"{key}_alt", "photos の ", required=False) or "お店の写真")
    return v


def render(values):
    tpl = TEMPLATE.read_text(encoding="utf-8")
    tpl = re.sub(r"\A(<!doctype html>\n)<!--.*?-->\n", r"\1", tpl, flags=re.S)
    missing = []

    def sub(m):
        k = m.group(1)
        if k not in values:
            missing.append(k)
            return ""
        return values[k]

    out = re.sub(r"\{\{(\w+)\}\}", sub, tpl)  # 1回だけ置き換える（値の中の {{ }} は置き換えない）
    if missing:
        raise ContentError(f"template.html に知らない差し込み口があります: {', '.join(sorted(set(missing)))}")
    return out


def write(page):
    """全部そろってから、まとめて差し替える。"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix=".editable-", dir=OUT.parent))
    try:
        (tmp / "index.html").write_text(page, encoding="utf-8", newline="\n")
        shutil.copy2(ASSETS / "style.css", tmp / "style.css")
        shutil.copytree(ASSETS / "img", tmp / "img")
        if OUT.exists():
            shutil.rmtree(OUT)
        tmp.rename(OUT)
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass
    try:
        page = render(build_values(load()))
    except ContentError as e:
        print(f"エラー: {e}", file=sys.stderr)
        print("ページは書き換えていません（今のページがそのまま出ています）。", file=sys.stderr)
        return 1
    write(page)
    print(f"できました: {OUT.relative_to(REPO).as_posix()}/index.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
