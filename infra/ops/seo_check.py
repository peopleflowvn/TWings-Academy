"""
Read-only check of what search engines and link-preview bots (Facebook, Zalo...) get from the public site.
Run from the internet (Ops task "seo-check"), not from the office network.

    python3 infra/ops/seo_check.py [https://twings.edu.vn]
"""

import re
import struct
import sys
import urllib.error
import urllib.request
from html import unescape
from urllib.parse import urljoin, urlparse

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://twings.edu.vn").rstrip("/")
UA = {
    "facebook": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "zalo": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Zalo/1.0 ZaloTheme/light",
    "google": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
}
problems: list[str] = []


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def fetch(url, ua="browser", follow=True, limit=2_000_000):
    opener = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, headers={"User-Agent": UA[ua], "Accept-Language": "vi"})
    try:
        with opener.open(req, timeout=30) as r:
            return r.status, r.geturl(), dict(r.headers), r.read(limit)
    except urllib.error.HTTPError as e:
        return e.code, url, dict(e.headers), e.read(limit) if e.fp else b""
    except Exception as e:  # noqa: BLE001
        return 0, url, {}, str(e).encode()


def metas(html: str) -> dict:
    out = {}
    for tag in re.findall(r"<meta\b[^>]*>", html, re.I):
        key = re.search(r'(?:property|name)\s*=\s*["\']([^"\']+)', tag, re.I)
        val = re.search(r'content\s*=\s*["\']([^"\']*)', tag, re.I)
        if key and val:
            out.setdefault(key.group(1).lower(), unescape(val.group(1)))
    t = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    out["<title>"] = unescape(t.group(1).strip()) if t else ""
    c = re.search(r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)', html, re.I)
    out["<canonical>"] = c.group(1) if c else ""
    out["<jsonld>"] = str(len(re.findall(r"application/ld\+json", html, re.I)))
    out["<h1>"] = str(len(re.findall(r"<h1\b", html, re.I)))
    return out


def image_size(data: bytes):
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:3] == b"\xff\xd8\xff":
        i = 2
        while i < len(data) - 9:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                return w, h
            i += 2 + struct.unpack(">H", data[i + 2 : i + 4])[0]
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        if data[12:16] == b"VP8X":
            return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
        if data[12:16] == b"VP8 ":
            w, h = struct.unpack("<HH", data[26:30])
            return w & 0x3FFF, h & 0x3FFF
        if data[12:16] == b"VP8L":
            b = int.from_bytes(data[21:25], "little")
            return (b & 0x3FFF) + 1, ((b >> 14) & 0x3FFF) + 1
    return None


def check_image(label, url):
    if not url:
        problems.append(f"{label}: no og:image")
        return
    if not url.startswith("https://"):
        problems.append(f"{label}: og:image not absolute https: {url}")
    st, final, hdr, body = fetch(url, "facebook", limit=9_000_000)
    ctype = hdr.get("Content-Type", "?")
    size = image_size(body)
    print(f"    image: {st} {ctype} {len(body) // 1024} KB {size[0]}x{size[1] if size else ''}" if size
          else f"    image: {st} {ctype} {len(body) // 1024} KB (size unknown)")
    if st != 200:
        problems.append(f"{label}: og:image answers {st}: {url}")
    elif not ctype.startswith("image/"):
        problems.append(f"{label}: og:image is {ctype}, not an image: {url}")
    else:
        if len(body) > 5_000_000:
            problems.append(f"{label}: og:image {len(body) // 1024} KB (Zalo/Facebook want < 5 MB, ideally < 1 MB)")
        if "webp" in ctype or "svg" in ctype:
            problems.append(f"{label}: og:image is {ctype} (Zalo may not preview it; prefer JPG/PNG)")
        if size and (size[0] < 600 or size[1] < 315):
            problems.append(f"{label}: og:image {size[0]}x{size[1]} is small (recommended 1200x630)")
        if size and not (1.3 <= size[0] / size[1] <= 2.1):
            problems.append(f"{label}: og:image ratio {size[0]}x{size[1]} gets cropped (recommended 1.91:1)")
    host = urlparse(url).hostname or ""
    if host.endswith("r2.dev"):
        problems.append(f"{label}: og:image on {host} (r2.dev is rate limited and not meant for production)")


def check_page(path):
    url = BASE + path
    print(f"\n=== {url}")
    st, final, hdr, body = fetch(url, "facebook")
    m = metas(body.decode("utf-8", "replace"))
    print(f"  bot: {st} final={final}")
    for k in ("<title>", "description", "<canonical>", "og:url", "og:type", "og:title", "og:description",
              "og:image", "og:image:width", "og:image:height", "og:site_name", "og:locale",
              "twitter:card", "robots", "<jsonld>", "<h1>"):
        v = m.get(k, "")
        print(f"  {k:16} {v[:150]}")
    label = path or "/"
    if st != 200:
        problems.append(f"{label}: bot gets HTTP {st}")
    if not m.get("og:title"):
        problems.append(f"{label}: no og:title")
    if not m.get("og:description") and not m.get("description"):
        problems.append(f"{label}: no description")
    t = m.get("<title>", "")
    if len(t) > 65:
        problems.append(f"{label}: <title> {len(t)} chars (Google shows ~60)")
    d = m.get("description", "")
    if d and not 50 <= len(d) <= 170:
        problems.append(f"{label}: description {len(d)} chars (aim 120-160)")
    for k in ("<canonical>", "og:url"):
        if m.get(k) and urlparse(m[k]).hostname != urlparse(BASE).hostname:
            problems.append(f"{label}: {k} points to another domain: {m[k]}")
    if not m.get("<canonical>"):
        problems.append(f"{label}: no canonical link")
    if "noindex" in m.get("robots", "").lower() or "noindex" in hdr.get("X-Robots-Tag", "").lower():
        problems.append(f"{label}: noindex on a public page")
    if m.get("<h1>") == "0":
        problems.append(f"{label}: no <h1> in the bot HTML")
    check_image(label, urljoin(url, m.get("og:image", "")) if m.get("og:image") else "")
    # Zalo shares the same HTML as Facebook?
    st2, _, _, body2 = fetch(url, "zalo")
    m2 = metas(body2.decode("utf-8", "replace"))
    if st2 != 200 or m2.get("og:title") != m.get("og:title"):
        problems.append(f"{label}: Zalo bot gets {st2} / different og:title ({m2.get('og:title', '')[:60]})")
    return m


def main():
    print(f"SEO / link preview check of {BASE}")
    # robots + sitemap
    st, _, hdr, robots = fetch(BASE + "/robots.txt", "google")
    print(f"\n--- robots.txt ({st})\n{robots.decode('utf-8', 'replace')[:800]}")
    if st != 200:
        problems.append(f"robots.txt answers {st}")
    elif re.search(r"(?mi)^disallow:\s*/\s*$", robots.decode("utf-8", "replace")):
        problems.append("robots.txt disallows the whole site")
    sm = re.search(r"(?mi)^sitemap:\s*(\S+)", robots.decode("utf-8", "replace"))
    if not sm:
        problems.append("robots.txt has no Sitemap line")
    elif urlparse(sm.group(1)).hostname != urlparse(BASE).hostname:
        problems.append(f"robots.txt Sitemap on another domain: {sm.group(1)}")
    st, _, _, smx = fetch(BASE + "/sitemap.xml", "google")
    locs = re.findall(r"<loc>([^<]+)</loc>", smx.decode("utf-8", "replace"))
    print(f"\n--- sitemap.xml ({st}): {len(locs)} URLs; hosts: {sorted({urlparse(u).hostname for u in locs})}")
    if st != 200 or not locs:
        problems.append(f"sitemap.xml answers {st} with {len(locs)} URLs")
    if any(urlparse(u).hostname != urlparse(BASE).hostname for u in locs):
        problems.append("sitemap.xml lists URLs on another domain")

    # one page of each kind
    paths = [""]
    for prefix in ("/khoa-hoc/", "/chuong-trinh/", "/tin-tuc/"):
        hit = next((u for u in locs if urlparse(u).path.startswith(prefix) and urlparse(u).path != prefix), None)
        if hit:
            paths.append(urlparse(hit).path)
    for p in ("/khoa-hoc", "/tin-tuc", "/gioi-thieu"):
        if any(urlparse(u).path.rstrip("/") == p for u in locs):
            paths.append(p)
    paths += [urlparse(u).path for u in locs if urlparse(u).path not in paths][:0]
    print(f"\nsitemap paths sample: {[urlparse(u).path for u in locs[:40]]}")
    for p in dict.fromkeys(paths):
        check_page(p)

    # sampled check of every sitemap URL for the bot: status + og:image presence
    print("\n--- every sitemap URL as Facebook bot (status, og:image)")
    for u in locs[:80]:
        st, _, _, body = fetch(u, "facebook")
        m = metas(body.decode("utf-8", "replace"))
        print(f"  {st} {'img' if m.get('og:image') else 'NO-IMG'} {u}")
        if st != 200:
            problems.append(f"{urlparse(u).path}: sitemap URL answers {st} to bots")
        elif not m.get("og:image"):
            problems.append(f"{urlparse(u).path}: no og:image")

    # redirects bots follow from old addresses
    print("\n--- redirects")
    for u in ("http://twings.edu.vn/", "https://www.twings.edu.vn/", "https://tuyensinh.twings.edu.vn/",
              "https://tuyensinh.twings.edu.vn/khoa-hoc"):
        st, _, hdr, _ = fetch(u, "facebook", follow=False)
        print(f"  {st} {u} -> {hdr.get('Location', '')}")
        if st not in (301, 308):
            problems.append(f"{u}: {st} instead of a permanent redirect")
    # people (not bots) get the SPA shell with sensible defaults too
    st, _, hdr, body = fetch(BASE + "/", "browser")
    m = metas(body.decode("utf-8", "replace"))
    print(f"\n--- SPA shell for people: {st} title={m.get('<title>', '')[:80]!r} og:image={m.get('og:image', '')[:100]}")
    print(f"    favicon: {fetch(BASE + '/favicon.ico')[0]}")

    print("\n=== PROBLEMS" if problems else "\n=== no problems found")
    for p in dict.fromkeys(problems):
        print(" -", p)


if __name__ == "__main__":
    main()
