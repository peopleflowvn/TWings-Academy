"""HTML sanitising for CMS-authored rich text, so a compromised editor account cannot plant XSS."""

import nh3

ALLOWED_TAGS = {
    "a",
    "abbr",
    "b",
    "blockquote",
    "caption",
    "col",
    "colgroup",
    "del",
    "br",
    "code",
    "div",
    "em",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
}
ALLOWED_ATTRIBUTES = {
    "*": {"class", "style"},
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height", "loading"},
    "td": {"colspan", "rowspan", "colwidth"},
    "th": {"colspan", "rowspan", "colwidth"},
    "col": {"span"},
}
# Inline styles the article editor writes (alignment, text / highlight colour, table and image width);
# every other property (position, url(), expression...) is dropped.
ALLOWED_STYLES = {
    "text-align",
    "color",
    "background-color",
    "width",
    "min-width",
    "max-width",
    "height",
    "font-size",
}


def sanitize_html(value: str) -> str:
    if not value:
        return value
    return nh3.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes={"http", "https", "mailto", "tel"},
        filter_style_properties=ALLOWED_STYLES,
        link_rel="noopener noreferrer nofollow",
    )
