# ruff: noqa: E501

from django.core.management.base import BaseCommand

from apps.core.models import SiteConfig

ABOUT = {
    "enabled": True,
    "title": "Học để làm được việc. Học để tiến xa hơn.",
    "subtitle": "VỀ TWINGS ACADEMY",
    "heroEyebrow": "HỌC VIỆN ĐÀO TẠO THỰC CHIẾN TÀI CHÍNH – NGÂN HÀNG",
    "heroHeadline": "NÂNG TẦM NĂNG LỰC, KIẾN TẠO TƯƠNG LAI",
    "heroDescription": "TWings Academy thu hẹp khoảng cách giữa kiến thức và yêu cầu công việc thực tế bằng các chương trình học tập trung, giàu trải nghiệm và có thể ứng dụng ngay.",
    "heroPrimaryButton": "Khám phá khóa học",
    "heroSecondaryButton": "Nhận tư vấn lộ trình",
    "stats": [
        "100%|Giảng viên thực chiến|Chuyên gia giàu kinh nghiệm trong ngành",
        "5.000+|Lượt học viên|Đã tham gia các chương trình đào tạo",
        "Ứng dụng ngay|Kiến thức và kỹ năng|Gắn với tình huống công việc thực tế",
        "Đồng hành|Định hướng nghề nghiệp|Kết nối học tập với cơ hội phát triển",
    ],
    "lead": "TWings Academy là học viện đào tạo thực chiến, tập trung vào lĩnh vực tài chính – ngân hàng và các năng lực nghề nghiệp thiết yếu. Chúng tôi thiết kế chương trình từ những yêu cầu thật của công việc, giúp học viên hiểu đúng bản chất, rèn luyện qua tình huống và tự tin áp dụng sau khóa học.\n\nBên cạnh các chương trình chuyên sâu, hệ sinh thái short course của TWings mang đến những lộ trình tinh gọn, đúng trọng tâm và linh hoạt cho sinh viên, người mới đi làm và nhân sự đang muốn nâng cấp năng lực. Mỗi khóa học đều hướng đến một kết quả rõ ràng: học viên làm được việc tốt hơn và chủ động hơn trên hành trình nghề nghiệp.",
    "philosophyTitle": "Học đi đôi với hành",
    "philosophyDescription": "Mỗi bài học được xây dựng quanh tình huống, dữ liệu và bài toán nghiệp vụ thực tế. Học viên không chỉ ghi nhớ kiến thức mà còn luyện cách phân tích, ra quyết định và trình bày phương án như trong môi trường làm việc.",
    "pillars": [
        "Tình huống thực tế|Nội dung bám sát quy trình, hồ sơ và bài toán thường gặp trong công việc.",
        "Lộ trình tinh gọn|Chương trình tập trung vào năng lực cốt lõi để học viên tiết kiệm thời gian và sớm tạo ra kết quả.",
        "Đồng hành nghề nghiệp|Học viên được định hướng cách phát triển năng lực, chuẩn bị tuyển dụng và xây dựng lộ trình phù hợp.",
    ],
    "visionTitle": "Tầm nhìn",
    "vision": "Trở thành học viện đào tạo thực chiến uy tín tại Việt Nam trong lĩnh vực tài chính – ngân hàng, là cầu nối giữa tri thức, năng lực nghề nghiệp và nhu cầu nhân sự của doanh nghiệp.",
    "visionFooter": "Kiến thức thực tiễn · Năng lực bền vững · Cơ hội rộng mở",
    "missionTitle": "Sứ mệnh",
    "missionFooter": "Đồng hành cùng sự phát triển nghề nghiệp của học viên",
    "mission": [
        "Chuyển hóa kiến thức chuyên môn thành năng lực có thể áp dụng trong công việc.",
        "Tạo ra trải nghiệm học tập linh hoạt, tập trung và phù hợp với từng giai đoạn nghề nghiệp.",
        "Kết nối học viên với chuyên gia, doanh nghiệp và những cơ hội phát triển thiết thực.",
    ],
    "coreValuesTitle": "Giá trị cốt lõi của TWings Academy",
    "coreValuesDescription": "Những nguyên tắc định hướng cách chúng tôi thiết kế chương trình, giảng dạy và đồng hành cùng học viên.",
    "coreValuesEyebrow": "Nền tảng văn hóa",
    "coreValues": [
        "Thấu hiểu: Lắng nghe điểm xuất phát, nhu cầu và mục tiêu nghề nghiệp của từng nhóm học viên.",
        "Thực tiễn: Ưu tiên kiến thức, công cụ và kỹ năng có thể ứng dụng vào công việc.",
        "Tinh gọn: Tổ chức nội dung rõ ràng, đúng trọng tâm và tôn trọng thời gian của người học.",
        "Đổi mới: Liên tục cập nhật nội dung, phương pháp và công nghệ học tập.",
        "Đồng hành: Hỗ trợ học viên chuyển hóa việc học thành sự tiến bộ trong nghề nghiệp.",
    ],
    "instructorsDescription": "Đội ngũ chuyên gia giàu kinh nghiệm trực tiếp chia sẻ góc nhìn nghề nghiệp, phương pháp xử lý tình huống và bài học từ thực tế.",
    "instructorsEyebrow": "Đội ngũ chuyên gia",
    "instructorCardFooter": "Chuyên gia đồng hành cùng TWings",
    "galleryDescription": "Những khoảnh khắc học tập, trao đổi và thực hành trong các chương trình tại TWings Academy.",
    "galleryEyebrow": "Hình ảnh thực tế",
    "partnersTitle": "Đối tác đồng hành",
    "partnersDescription": "Kết nối đào tạo với nhu cầu phát triển nguồn nhân lực của doanh nghiệp.",
    "ctaEyebrow": "BẮT ĐẦU HÀNH TRÌNH PHÁT TRIỂN NĂNG LỰC",
    "ctaTitle": "Sẵn sàng tiến xa hơn cùng TWings Academy?",
    "ctaDescription": "Khám phá chương trình phù hợp với mục tiêu của bạn hoặc để đội ngũ TWings tư vấn một lộ trình học tập rõ ràng và thiết thực.",
    "ctaPrimaryButton": "Xem danh mục khóa học",
    "ctaSecondaryButton": "Nhận tư vấn lộ trình",
}


class Command(BaseCommand):
    help = "Publish the reviewed About page copy into homepage_sections."

    def handle(self, *args, **options):
        config, _ = SiteConfig.objects.get_or_create(key=SiteConfig.KEY_HOMEPAGE_SECTIONS)
        data = dict(config.data or {})
        data["about"] = ABOUT
        data.setdefault("instructors", {}).setdefault("title", "Đội ngũ giảng viên và chuyên gia")
        gallery = data.setdefault("gallery", {})
        gallery.setdefault("title", "Hình ảnh học tập thực tế")
        gallery.setdefault("photos", [])
        config.data = data
        config.save(update_fields=["data", "updated_at"])
        self.stdout.write(self.style.SUCCESS("Published reviewed About page content to homepage_sections."))
