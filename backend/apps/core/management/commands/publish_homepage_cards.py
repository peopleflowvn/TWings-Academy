"""Publish curated, article-backed hero cards to the homepage."""

# ruff: noqa: E501

from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.cms.models import Article, HeroBanner

SITE = "https://tuyensinh.twings.edu.vn"

CARDS = [
    {
        "id": "home-card-course-08",
        "article": "recap-khai-giang-twings-academy-khoa-08",
        "image": "course_08_news/khai-giang-twings-academy-khoa-08.webp",
        "title": "TWings Academy Khóa 08: Hành trình mới chính thức bắt đầu",
        "subtitle": "Kết nối học viên Hà Nội và TP. Hồ Chí Minh trong một hành trình học tập thực tiễn, năng động và giàu trải nghiệm.",
        "template": "modern_split",
        "gradient": "from-[#071A35] via-[#0E4C86] to-[#0073C1]",
        "button": "Xem recap khai giảng",
        "partners": [{"name": "TWINGS ACADEMY", "color": "#5FBEFF"}, {"name": "KHÓA 08", "color": "#FF8A3D"}],
        "badges": [
            {"text": "Hà Nội · TP. Hồ Chí Minh", "position": "top-left"},
            {"text": "Học thật · Trải nghiệm thật", "position": "bottom-right"},
        ],
        "sort": 10,
    },
    {
        "id": "home-card-hust-partnership",
        "article": "twings-academy-dong-hanh-truong-kinh-te-dai-hoc-bach-khoa-ha-noi",
        "image": "partnership_news/twings-tntalent-hust.webp",
        "title": "Kết nối tri thức, kiến tạo sự nghiệp ngân hàng",
        "subtitle": "TWings Academy đồng hành cùng Trường Kinh tế – Đại học Bách khoa Hà Nội, đưa đào tạo đến gần hơn với nhu cầu doanh nghiệp.",
        "template": "badge_highlight",
        "gradient": "from-[#26120A] via-[#8F2D12] to-[#EA580C]",
        "button": "Khám phá dấu mốc hợp tác",
        "partners": [{"name": "TNTALENT", "color": "#FCA5A5"}, {"name": "HUST", "color": "#FDE68A"}],
        "badges": [
            {"text": "Đào tạo gắn với thực tiễn", "position": "top-left"},
            {"text": "Kết nối cơ hội nghề nghiệp", "position": "bottom-right"},
        ],
        "sort": 20,
    },
    {
        "id": "home-card-banking-career",
        "article": "lo-trinh-tro-thanh-chuyen-vien-quan-he-khach-hang-ngan-hang",
        "image": "news_images/lo-trinh-chuyen-vien-quan-he-khach-hang.webp",
        "title": "Bắt đầu sự nghiệp ngân hàng từ con số 0",
        "subtitle": "Lộ trình rõ ràng để xây nền tảng nghiệp vụ, kỹ năng khách hàng và sự tự tin cho vị trí quan hệ khách hàng ngân hàng.",
        "template": "floating_showcase",
        "gradient": "from-[#071A16] via-[#075A48] to-[#10B981]",
        "button": "Xem lộ trình nghề nghiệp",
        "partners": [{"name": "CAREER PATH", "color": "#6EE7B7"}, {"name": "BANKING", "color": "#FDE68A"}],
        "badges": [
            {"text": "Lộ trình từng bước", "position": "top-left"},
            {"text": "Kiến thức · Kỹ năng · Trải nghiệm", "position": "bottom-right"},
        ],
        "sort": 30,
    },
    {
        "id": "home-card-ai-banking",
        "article": "ung-dung-ai-trong-ngan-hang-lam-viec-hieu-qua-an-toan",
        "image": "news_images/ung-dung-ai-trong-ngan-hang.webp",
        "title": "Ứng dụng AI trong ngân hàng an toàn và hiệu quả",
        "subtitle": "Tám cách dùng AI để nâng cao năng suất mà vẫn bảo vệ dữ liệu khách hàng và tuân thủ nguyên tắc nghề nghiệp.",
        "template": "cyber_glow",
        "gradient": "from-[#020617] via-[#0C3261] to-[#0891B2]",
        "button": "Khám phá 8 ứng dụng AI",
        "partners": [{"name": "AI FOR BANKING", "color": "#67E8F9"}],
        "badges": [
            {"text": "Tăng năng suất có trách nhiệm", "position": "top-left"},
            {"text": "An toàn dữ liệu", "position": "bottom-right"},
        ],
        "sort": 40,
    },
    {
        "id": "home-card-bank-interview",
        "article": "phong-van-ngan-hang-cau-hoi-va-cach-tra-loi-star",
        "image": "news_images/phong-van-ngan-hang.webp",
        "title": "Tự tin chinh phục phỏng vấn ngân hàng",
        "subtitle": "Chuẩn bị 12 câu hỏi thường gặp, cách trình bày trải nghiệm và tư duy trả lời giúp bạn tạo ấn tượng chuyên nghiệp.",
        "template": "minimal_editorial",
        "gradient": "from-[#111827] via-[#263060] to-[#475569]",
        "button": "Luyện phỏng vấn ngay",
        "partners": [{"name": "CAREER READY", "color": "#C4B5FD"}],
        "badges": [
            {"text": "12 câu hỏi trọng tâm", "position": "top-right"},
            {"text": "Trả lời rõ ràng, thuyết phục", "position": "bottom-left"},
        ],
        "sort": 50,
    },
]


class Command(BaseCommand):
    help = "Add five curated hero cards to the homepage without deleting existing banners."

    def handle(self, *args, **options):
        slugs = {card["article"] for card in CARDS}
        published = set(
            Article.objects.filter(slug__in=slugs, status="published").values_list("slug", flat=True)
        )
        missing = slugs - published
        if missing:
            raise CommandError("Missing published articles: " + ", ".join(sorted(missing)))

        with transaction.atomic():
            for card in CARDS:
                image = Path(settings.BASE_DIR) / "fixtures" / card["image"]
                if not image.is_file():
                    raise CommandError(f"Missing card image: {image}")
                storage_name = f"banners/{image.name}"
                if not default_storage.exists(storage_name):
                    with image.open("rb") as source:
                        default_storage.save(storage_name, File(source, name=image.name))

                HeroBanner.objects.update_or_create(
                    id=card["id"],
                    defaults={
                        "title": card["title"],
                        "subtitle": card["subtitle"],
                        "bg_gradient": card["gradient"],
                        "card_template": card["template"],
                        "button_text": card["button"],
                        "button_action": "custom_link",
                        "button_style": "primary",
                        "partner_badges": card["partners"],
                        "floating_badges": card["badges"],
                        "image_url": default_storage.url(storage_name),
                        "display_type": "card",
                        "link_url": f"{SITE}/tin-tuc/{card['article']}",
                        "target_blank": False,
                        "show_overlay_text": False,
                        "show_overlay_button": False,
                        "sort_order": card["sort"],
                        "is_active": True,
                    },
                )

        active = HeroBanner.objects.filter(id__in=[card["id"] for card in CARDS], is_active=True).count()
        if active != len(CARDS):
            raise CommandError(f"Expected {len(CARDS)} active homepage cards, got {active}.")
        self.stdout.write(self.style.SUCCESS(f"Published {active} homepage hero cards."))
