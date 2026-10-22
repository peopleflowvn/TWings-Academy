"""
Whether a course's trial video can be watched embedded (YouTube oEmbed): a private, deleted or
non-embeddable video would show "Video unavailable" on the course page, so the page hides it and the
publishing checklist flags it. Answers are cached; when YouTube cannot be reached the answer is unknown.
"""

import requests
from django.conf import settings
from django.core.cache import cache

OEMBED = "https://www.youtube.com/oembed"


def video_playable(video_id: str) -> bool | None:
    if not video_id or not getattr(settings, "YOUTUBE_CHECK", True):
        return None
    key = f"youtube-playable:{video_id}"
    cached = cache.get(key, "unset")
    if cached != "unset":
        return cached
    try:
        res = requests.get(
            OEMBED, params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"}, timeout=4
        )
        answer = (
            True if res.status_code == 200 else False if res.status_code in (400, 401, 403, 404) else None
        )
    except requests.RequestException:
        answer = None
    cache.set(key, answer, 6 * 3600 if answer is not None else 600)
    return answer
