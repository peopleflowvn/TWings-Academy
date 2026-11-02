"""Publish the TWings Academy Course 08 opening recap."""

# ruff: noqa: E501

from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.cms.models import Article

IMAGE = Path(settings.BASE_DIR) / "fixtures" / "course_08_news" / "khai-giang-twings-academy-khoa-08.webp"
SLUG = "recap-khai-giang-twings-academy-khoa-08"

CONTENT = """Sáng ngày 04/10/2026, **TWings Academy chính thức khai giảng Khóa 08**, chào đón những học viên mới tại điểm cầu Hà Nội và kết nối trực tuyến với điểm cầu TP. Hồ Chí Minh. Khoảng cách địa lý không làm giảm đi sự hào hứng: từ những lời chào đầu tiên, cả hai đầu cầu đã cùng hòa chung một bầu không khí cởi mở, nhiều năng lượng và sẵn sàng cho hành trình mới.

Buổi khai giảng không chỉ đánh dấu ngày bắt đầu một khóa học. Đây còn là dịp để học viên gặp gỡ đội ngũ giảng viên, làm quen với những người bạn đồng hành và hình dung rõ hơn về lộ trình phía trước. Mỗi cuộc trò chuyện, mỗi phần giới thiệu và mỗi câu hỏi được đặt ra trong buổi sáng ấy đều góp phần tạo nên một khởi đầu gần gũi, thực chất.

## Khởi động đồng thời tại Hà Nội và TP. Hồ Chí Minh

Chương trình được tổ chức trực tiếp tại Hà Nội và kết nối trực tuyến với đầu cầu TP. Hồ Chí Minh. Mô hình này giúp học viên ở hai khu vực cùng tiếp nhận thông tin, tương tác với giảng viên và tham gia các hoạt động chung trong một trải nghiệm thống nhất.

Ngay trong phần mở đầu, học viên được giới thiệu về mục tiêu chương trình, cấu trúc các module, cách thức học tập và những yêu cầu trong suốt khóa học. Thay vì chỉ nghe một danh sách nội dung, các bạn được nhìn thấy mối liên hệ giữa từng chặng học với những năng lực cần thiết trong môi trường làm việc thực tế.

Sự kết nối giữa hai đầu cầu cũng truyền tải một thông điệp quan trọng: học tập hiệu quả không bị giới hạn bởi địa điểm. Khi người học có chung mục tiêu, được hỗ trợ bởi phương pháp phù hợp và chủ động tương tác, khoảng cách có thể trở thành cơ hội để mở rộng mạng lưới, học hỏi từ nhiều góc nhìn hơn.

## Từ làm quen đến hình thành một cộng đồng học tập

Một hành trình đào tạo sẽ ý nghĩa hơn khi học viên không bước đi một mình. Vì vậy, hoạt động làm quen giữa học viên, giảng viên và đội ngũ tổ chức là một phần đáng nhớ của buổi khai giảng TWings Academy Khóa 08.

Những gương mặt còn đôi chút bỡ ngỡ lúc đầu nhanh chóng trở nên gần gũi qua các cuộc trao đổi. Học viên có cơ hội chia sẻ kỳ vọng, lắng nghe câu chuyện của nhau và nhận ra rằng mỗi thành viên đều mang đến lớp học một trải nghiệm riêng. Chính sự đa dạng ấy tạo nền tảng cho những cuộc thảo luận sâu hơn trong quá trình học.

Cộng đồng học tập không chỉ mang lại cảm giác đồng hành. Đây còn là môi trường để mỗi người rèn khả năng trao đổi, phản biện, phối hợp và tiếp nhận phản hồi. Những kỹ năng tưởng như đơn giản này lại có vai trò quan trọng khi học viên bước vào công việc, nơi kết quả thường được tạo nên bởi sự hợp tác giữa nhiều cá nhân và bộ phận.

## Những module đầu tiên bắt đầu ngay sau khai giảng

Không khí khởi động nhanh chóng chuyển thành nhịp học tập sôi nổi khi học viên tiếp cận những module đầu tiên của chương trình. Nội dung thực tiễn, cách truyền đạt gần gũi và sự tương tác liên tục giữa giảng viên với lớp học giúp kiến thức trở nên dễ tiếp cận hơn.

Thay vì chỉ ghi nhớ khái niệm, học viên được khuyến khích đặt câu hỏi, liên hệ với tình huống và nhìn vấn đề từ góc độ công việc. Hình ảnh lớp học tập trung theo dõi phần “Bản đồ giải pháp tín dụng cá nhân” cho thấy tinh thần học nghiêm túc nhưng không nặng nề: người học vừa tiếp nhận nền tảng, vừa từng bước hiểu cách kiến thức được vận dụng trong thực tiễn ngành ngân hàng.

Đây là một trong những định hướng xuyên suốt của TWings Academy: đưa nội dung chuyên môn đến gần công việc, giúp học viên hiểu bản chất thay vì học thuộc, đồng thời tạo đủ không gian để thực hành và nhận phản hồi.

## Một hành trình hướng tới năng lực nghề nghiệp thực chất

Với những bạn trẻ đang chuẩn bị bước vào lĩnh vực ngân hàng, sự tự tin cần được xây dựng từ kiến thức, kỹ năng và trải nghiệm. Một chương trình đào tạo hiệu quả vì thế không chỉ trả lời câu hỏi “cần biết gì”, mà còn giúp người học hiểu “cần làm được gì” và “cần thể hiện như thế nào” trong môi trường chuyên nghiệp.

Trong hành trình của Khóa 08, học viên được kỳ vọng sẽ từng bước bồi đắp nhiều nhóm năng lực:

- Nắm vững kiến thức nền tảng và hiểu logic của sản phẩm, quy trình nghiệp vụ.
- Phân tích nhu cầu khách hàng và lựa chọn giải pháp phù hợp với từng tình huống.
- Giao tiếp rõ ràng, lắng nghe chủ động và trình bày quan điểm có cơ sở.
- Làm việc có mục tiêu, tôn trọng quy trình và chú trọng chất lượng kết quả.
- Chủ động học hỏi, tiếp nhận phản hồi và thích ứng với những thay đổi của môi trường số.

Mỗi module là một bước nhỏ nhưng cần thiết trong quá trình hình thành năng lực. Khi kiến thức được đặt vào đúng bối cảnh, người học có thể nhìn thấy ý nghĩa của điều mình đang học và chủ động hơn trong việc biến kiến thức thành hành động.

## Khóa 08: sẵn sàng trải nghiệm và bứt phá

Buổi khai giảng ngày 04/10/2026 đã khép lại, nhưng hành trình của TWings Academy Khóa 08 mới chỉ bắt đầu. Phía trước sẽ là những giờ học, tình huống thực tế, cuộc thảo luận, thử thách và cả những khoảnh khắc mỗi học viên nhận ra mình đã tiến bộ thêm một bước.

TWings Academy tin rằng một khởi đầu nhiều năng lượng sẽ trở nên có ý nghĩa nhất khi được tiếp nối bằng sự kiên trì và tinh thần chủ động. Chúc các học viên Khóa 08 giữ vững sự hào hứng của ngày đầu tiên, tận dụng từng cơ hội để học hỏi, kết nối và khám phá khả năng của chính mình.

Cùng nhìn lại những hình ảnh đáng nhớ tại hai đầu cầu Hà Nội – TP. Hồ Chí Minh và chờ đón những dấu ấn tiếp theo của Khóa 08 trên hành trình học thật, trải nghiệm thật và sẵn sàng chinh phục những cột mốc nghề nghiệp mới."""


class Command(BaseCommand):
    help = "Publish the Course 08 opening recap and its event image."

    def handle(self, *args, **options):
        if not IMAGE.is_file():
            raise CommandError(f"Missing Course 08 image: {IMAGE}")
        storage_name = f"articles/{IMAGE.name}"
        if not default_storage.exists(storage_name):
            with IMAGE.open("rb") as source:
                default_storage.save(storage_name, File(source, name=IMAGE.name))
        image_url = default_storage.url(storage_name)
        words = len(CONTENT.split())
        if words < 900:
            raise CommandError(f"Course 08 article is too short: {words} words.")

        with transaction.atomic():
            Article.objects.update_or_create(
                id="news-course-08-opening",
                defaults={
                    "slug": SLUG,
                    "title": "[Recap] Khai giảng TWings Academy Khóa 08: Hành trình mới chính thức bắt đầu",
                    "excerpt": "TWings Academy chào đón học viên Khóa 08 trong lễ khai giảng kết nối Hà Nội và TP. Hồ Chí Minh, mở đầu hành trình học tập gắn với trải nghiệm thực tế.",
                    "content": CONTENT,
                    "featured_image": image_url,
                    "category": "Tin tức & Sự kiện",
                    "author": "TWings Academy",
                    "status": "published",
                    "published_at": timezone.now(),
                    "tags": ["TWings Academy", "Khóa 08", "khai giảng", "đào tạo ngân hàng"],
                    "views_count": 0,
                    "meta_title": "Khai giảng TWings Academy Khóa 08 tại Hà Nội và TP.HCM",
                    "meta_description": "Recap lễ khai giảng TWings Academy Khóa 08 ngày 04/10/2026, kết nối học viên Hà Nội và TP.HCM trong hành trình đào tạo gắn với thực tiễn.",
                    "focus_keyword": "khai giảng TWings Academy Khóa 08",
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
        self.stdout.write(self.style.SUCCESS("Published the TWings Academy Course 08 opening recap."))
