"""Publish the TNTalent and HUST School of Economics partnership announcement."""

# ruff: noqa: E501

from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.cms.models import Article

IMAGE = Path(settings.BASE_DIR) / "fixtures" / "partnership_news" / "twings-tntalent-hust.webp"
SLUG = "twings-academy-dong-hanh-truong-kinh-te-dai-hoc-bach-khoa-ha-noi"

CONTENT = """Ngày 12/10/2026, Công ty Cổ phần Quản trị Nguồn nhân lực TNTalent và Trường Kinh tế – Đại học Bách khoa Hà Nội chính thức ký kết thỏa thuận hợp tác. Dấu mốc này mở ra một hành trình kết nối thiết thực giữa nhà trường, doanh nghiệp và sinh viên, hướng tới mục tiêu cùng phát triển nguồn nhân lực trẻ chất lượng cao, có khả năng thích ứng với những yêu cầu ngày càng đa dạng của thị trường lao động.

Với vai trò là đơn vị đào tạo trực thuộc TNTalent, **TWings Academy đồng hành cùng Trường Kinh tế – Đại học Bách khoa Hà Nội** trong định hướng đưa kiến thức học thuật đến gần hơn với thực tiễn nghề nghiệp, đặc biệt trong lĩnh vực ngân hàng, tài chính và quản trị kinh doanh.

## Từ một lễ ký kết đến những giá trị dài hạn

Lễ ký kết không chỉ ghi nhận mối quan hệ hợp tác giữa hai đơn vị. Quan trọng hơn, thỏa thuận tạo nền tảng để các bên từng bước triển khai những hoạt động có giá trị thực tế đối với sinh viên: định hướng nghề nghiệp, đào tạo kỹ năng, chia sẻ kinh nghiệm từ doanh nghiệp, kết nối tuyển dụng và tạo cơ hội tiếp cận môi trường làm việc chuyên nghiệp ngay khi còn trên giảng đường.

Trong bối cảnh công việc thay đổi nhanh, kiến thức chuyên môn vẫn là nền móng nhưng chưa phải toàn bộ hành trang. Sinh viên cần hiểu doanh nghiệp vận hành ra sao, nhà tuyển dụng đánh giá điều gì và làm thế nào để chuyển kiến thức thành năng lực giải quyết vấn đề. Sự phối hợp giữa nhà trường và doanh nghiệp giúp những câu hỏi đó được trả lời sớm hơn, cụ thể hơn.

## Kết nối đào tạo với nhu cầu của thị trường lao động

Khoảng cách giữa “học” và “làm” thường xuất hiện khi sinh viên chưa có đủ cơ hội quan sát công việc thật. Một môn học có thể cung cấp khung lý thuyết vững chắc; trải nghiệm thực tế giúp người học nhận ra cách khung lý thuyết ấy được sử dụng trong một cuộc tư vấn, một hồ sơ tài chính, một dự án hoặc một quyết định kinh doanh.

Thông qua thỏa thuận hợp tác, TNTalent và Trường Kinh tế – Đại học Bách khoa Hà Nội kỳ vọng từng bước tạo thêm những điểm chạm giữa hai môi trường. Sinh viên không chỉ được lắng nghe câu chuyện nghề nghiệp mà còn có cơ hội rèn tư duy, kỹ năng và tác phong cần thiết để bước vào thị trường lao động với sự chuẩn bị tốt hơn.

## Vai trò cầu nối của TWings Academy

Là đơn vị đào tạo trực thuộc TNTalent, TWings Academy theo đuổi định hướng gắn nội dung học tập với yêu cầu của công việc. Vai trò của học viện không dừng ở việc cung cấp khóa học, mà còn là kết nối kiến thức, trải nghiệm và cơ hội nghề nghiệp trong hệ sinh thái MSB, ROX Group cùng các doanh nghiệp đối tác.

Với sinh viên quan tâm đến ngành ngân hàng, sự chuẩn bị cần bắt đầu từ nhiều lớp năng lực:

- Hiểu nền tảng tài chính, sản phẩm và hoạt động của ngân hàng.
- Biết phân tích nhu cầu, dữ liệu và tình huống kinh doanh.
- Giao tiếp rõ ràng, làm việc theo mục tiêu và tôn trọng quy trình.
- Có tư duy phục vụ khách hàng đi cùng ý thức quản trị rủi ro.
- Chủ động học hỏi và thích ứng với môi trường số.

Những năng lực này khó hình thành chỉ bằng việc ghi nhớ. Người học cần được đặt trong tình huống, được thực hành, nhận phản hồi và hiểu tiêu chuẩn của một kết quả công việc tốt. Đó cũng là tinh thần “học thật – trải nghiệm thật – tiếp cận công việc thật” mà TWings Academy kiên định theo đuổi.

## Thêm cơ hội để sinh viên hiểu mình và hiểu nghề

Định hướng nghề nghiệp có ý nghĩa nhất khi giúp sinh viên trả lời được ba câu hỏi: mình phù hợp với công việc nào, đang thiếu năng lực gì và cần hành động ra sao. Các hoạt động chia sẻ chuyên môn, workshop kỹ năng hoặc kết nối với doanh nghiệp có thể giúp người học kiểm chứng hình dung của mình trước khi đưa ra lựa chọn dài hạn.

Đối với ngành ngân hàng, trải nghiệm sớm còn giúp sinh viên nhìn nghề nghiệp toàn diện hơn. Bên cạnh cơ hội phát triển là yêu cầu về kỷ luật, tính chính xác, trách nhiệm với dữ liệu và khả năng cân bằng mục tiêu kinh doanh với chất lượng phục vụ. Hiểu đúng từ đầu giúp người học chuẩn bị thực chất thay vì chỉ chạy theo hình ảnh bề ngoài của nghề.

## Cùng kiến tạo thế hệ nhân lực trẻ sẵn sàng cho tương lai

Sự hợp tác giữa TNTalent và Trường Kinh tế – Đại học Bách khoa Hà Nội được kỳ vọng sẽ trở thành nền tảng cho nhiều chương trình đồng hành ý nghĩa trong thời gian tới. Khi nhà trường, đơn vị đào tạo và doanh nghiệp cùng chia sẻ trách nhiệm phát triển người học, sinh viên sẽ có thêm cơ hội tiếp cận tri thức thực tiễn, rèn năng lực và tự tin hơn trước những lựa chọn nghề nghiệp.

TWings Academy trân trọng chúc mừng dấu mốc hợp tác giữa TNTalent và Trường Kinh tế – Đại học Bách khoa Hà Nội. Hy vọng mối quan hệ này sẽ ngày càng phát triển bền vững, mang đến những giá trị thiết thực cho sinh viên, nhà trường và cộng đồng doanh nghiệp; đồng thời góp phần rút ngắn khoảng cách giữa đào tạo và tuyển dụng trong một thị trường lao động đang không ngừng đổi mới."""


class Command(BaseCommand):
    help = "Publish the HUST School of Economics partnership news article and event image."

    def handle(self, *args, **options):
        if not IMAGE.is_file():
            raise CommandError(f"Missing partnership image: {IMAGE}")
        storage_name = f"articles/{IMAGE.name}"
        if not default_storage.exists(storage_name):
            with IMAGE.open("rb") as source:
                default_storage.save(storage_name, File(source, name=IMAGE.name))
        image_url = default_storage.url(storage_name)
        words = len(CONTENT.split())
        if words < 750:
            raise CommandError(f"Partnership article is too short: {words} words.")

        with transaction.atomic():
            Article.objects.update_or_create(
                id="news-partnership-hust",
                defaults={
                    "slug": SLUG,
                    "title": "TWings Academy đồng hành cùng Trường Kinh tế – Đại học Bách khoa Hà Nội",
                    "excerpt": (
                        "TNTalent và Trường Kinh tế – Đại học Bách khoa Hà Nội ký kết hợp tác, "
                        "mở rộng kết nối đào tạo, trải nghiệm và cơ hội nghề nghiệp cho sinh viên."
                    ),
                    "content": CONTENT,
                    "featured_image": image_url,
                    "category": "Tin tức & Sự kiện",
                    "author": "TWings Academy",
                    "status": "published",
                    "published_at": timezone.now(),
                    "tags": ["TWings Academy", "TNTalent", "Đại học Bách khoa Hà Nội", "hợp tác đào tạo"],
                    "views_count": 0,
                    "meta_title": "TWings Academy đồng hành cùng Trường Kinh tế – ĐH Bách khoa Hà Nội",
                    "meta_description": (
                        "TNTalent và Trường Kinh tế – Đại học Bách khoa Hà Nội ký kết hợp tác, "
                        "kết nối đào tạo với trải nghiệm và cơ hội nghề nghiệp cho sinh viên."
                    ),
                    "focus_keyword": "TWings Academy đồng hành cùng Trường Kinh tế",
                    "canonical_url": f"https://tuyensinh.twings.edu.vn/tin-tuc/{SLUG}",
                    "seo_score": 95,
                    "seo_checks": {
                        "hasHeadings": True,
                        "hasFeaturedImage": True,
                        "contentWordCount": words,
                        "wordCountPassed": True,
                    },
                },
            )
        self.stdout.write(self.style.SUCCESS("Published the TWings Academy–HUST partnership article."))
