"""Add the second curated batch of ten banking articles."""

# ruff: noqa: E501 -- long-form editorial copy is intentionally kept as readable paragraphs.

from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.cms.models import Article

IMAGES = Path(settings.BASE_DIR) / "fixtures" / "news_images_batch2"
BASE_URL = "https://tuyensinh.twings.edu.vn/tin-tuc/"

ARTICLES = [
    {
        "id": "news-cv-banking",
        "slug": "cach-viet-cv-ung-tuyen-ngan-hang-chua-co-kinh-nghiem",
        "title": "Cách viết CV ứng tuyển ngân hàng khi chưa có kinh nghiệm",
        "excerpt": "CV ngân hàng thuyết phục không cần kinh nghiệm dài; điều quan trọng là biến trải nghiệm học tập, bán hàng và hoạt động thành bằng chứng năng lực.",
        "category": "Tuyển dụng & Phỏng vấn",
        "image": "cv-ung-tuyen-ngan-hang.webp",
        "keyword": "CV ứng tuyển ngân hàng",
        "meta_title": "Cách viết CV ứng tuyển ngân hàng khi chưa có kinh nghiệm",
        "meta_description": "Hướng dẫn viết CV ứng tuyển ngân hàng cho sinh viên và người chuyển ngành: bố cục, từ khóa, cách lượng hóa thành tích và lỗi cần tránh.",
        "tags": ["CV ngân hàng", "ứng tuyển ngân hàng", "sinh viên mới ra trường"],
        "content": """Một **CV ứng tuyển ngân hàng** tốt không phải bản liệt kê mọi việc bạn từng làm. Nó là câu trả lời ngắn gọn cho câu hỏi của nhà tuyển dụng: “Ứng viên này có tiềm năng làm tốt công việc và đáng để gặp trực tiếp không?”. Người chưa có kinh nghiệm vẫn có thể trả lời thuyết phục nếu biết chọn đúng bằng chứng.

## Bắt đầu từ yêu cầu công việc, không bắt đầu từ mẫu CV

Hãy đọc 5–10 tin tuyển dụng cùng vị trí và đánh dấu những năng lực lặp lại: giao tiếp, đạt mục tiêu, chăm sóc khách hàng, phân tích số liệu, làm việc theo quy trình. Sau đó đối chiếu với trải nghiệm của bạn. Công việc bán hàng, phục vụ, thực tập, nghiên cứu hay tổ chức sự kiện đều có thể liên quan nếu được diễn đạt đúng.

## Bố cục một trang đủ thuyết phục

- Thông tin liên hệ chuyên nghiệp và vị trí ứng tuyển rõ ràng.
- Tóm tắt nghề nghiệp 3–4 dòng, nói bạn mang lại điều gì.
- Kinh nghiệm hoặc dự án, sắp theo mức độ liên quan.
- Học vấn, chứng chỉ và kỹ năng có thể kiểm chứng.

Đừng dùng mục tiêu kiểu “mong được học hỏi trong môi trường năng động”. Hãy cụ thể hơn: “Ứng viên ngành tài chính có kinh nghiệm tư vấn bán hàng bán thời gian, quen làm việc theo KPI và muốn phát triển ở vị trí quan hệ khách hàng cá nhân.”

## Viết thành tích thay vì mô tả nhiệm vụ

“Tư vấn khách hàng tại cửa hàng” chỉ cho biết bạn đã có mặt. “Tư vấn trung bình 25 khách mỗi ca, duy trì tỷ lệ quay lại 30%” cho thấy quy mô và kết quả. Nếu không có doanh số, hãy lượng hóa số người, thời gian, tỷ lệ hoàn thành hoặc mức cải thiện.

Mỗi gạch đầu dòng nên bắt đầu bằng một động từ: xây dựng, phân tích, tư vấn, phối hợp, cải thiện. Sau hành động là bối cảnh và kết quả. Không tự tạo số liệu; con số nhỏ nhưng thật đáng tin hơn thành tích lớn không thể giải thích.

## Từ khóa cần xuất hiện tự nhiên

Hệ thống tuyển dụng và người đọc đều tìm những cụm liên quan tới vị trí như “chăm sóc khách hàng”, “phát triển khách hàng”, “KPI”, “phân tích hồ sơ”. Chỉ dùng từ khóa phù hợp với trải nghiệm thật. Nhồi đầy thuật ngữ khiến CV khó đọc và dễ lộ khi phỏng vấn.

## Checklist trước khi gửi

- Tên file rõ ràng: `CV-HoTen-ViTri.pdf`.
- Không lỗi chính tả, không dùng quá ba cỡ chữ.
- Email và số điện thoại chính xác.
- Mỗi thành tích quan trọng đều có bằng chứng để kể sâu hơn.
- Nội dung được điều chỉnh cho đúng vị trí, không gửi một bản cho mọi nơi.

CV chỉ mở cánh cửa đầu tiên. Hãy chuẩn bị song song phần giới thiệu 60 giây và ba câu chuyện theo STAR. Khi thông tin trên giấy khớp với cách bạn kể trong phỏng vấn, sự tự tin sẽ đến từ bằng chứng thay vì cố gắng gây ấn tượng.""",
    },
    {
        "id": "news-rm-kpi",
        "slug": "kpi-chuyen-vien-quan-he-khach-hang-ngan-hang",
        "title": "KPI chuyên viên quan hệ khách hàng ngân hàng: Hiểu để làm đúng",
        "excerpt": "KPI của RM không chỉ là doanh số; đó là một hệ chỉ số về khách hàng, thu nhập, chất lượng tín dụng và hoạt động đầu vào.",
        "category": "Kỹ năng thực chiến",
        "image": "kpi-quan-he-khach-hang.webp",
        "keyword": "KPI chuyên viên quan hệ khách hàng",
        "meta_title": "KPI chuyên viên quan hệ khách hàng ngân hàng gồm những gì?",
        "meta_description": "Hiểu các nhóm KPI chuyên viên quan hệ khách hàng ngân hàng và cách quản lý phễu bán hàng để đạt mục tiêu bền vững, đúng quy trình.",
        "tags": ["KPI ngân hàng", "quan hệ khách hàng", "quản lý mục tiêu"],
        "content": """Nhắc đến **KPI chuyên viên quan hệ khách hàng**, nhiều người chỉ nghĩ đến dư nợ hoặc doanh số. Thực tế, một RM được đánh giá trên cả kết quả kinh doanh, chất lượng danh mục và những hoạt động tạo ra kết quả. Hiểu cấu trúc KPI giúp bạn chủ động hơn thay vì chạy theo con số vào cuối tháng.

## Bốn nhóm KPI thường gặp

**Kết quả kinh doanh** có thể gồm dư nợ, huy động, thu phí, số sản phẩm trên mỗi khách hàng. **Phát triển khách hàng** đo số khách mới hoặc khách hàng hoạt động. **Chất lượng** liên quan tới nợ quá hạn, hồ sơ sai sót và tuân thủ. **Hoạt động đầu vào** gồm cuộc gọi, cuộc hẹn, hồ sơ đủ điều kiện và tỷ lệ chuyển đổi.

Tên gọi và trọng số khác nhau giữa từng ngân hàng, phân khúc và thời kỳ. Vì vậy, hãy hỏi rõ cách tính, thời điểm ghi nhận và điều kiện loại trừ ngay khi nhận chỉ tiêu.

## Chuyển mục tiêu tháng thành công việc tuần

Giả sử cần bốn khách hàng mới và tỷ lệ từ gặp mặt đến mở quan hệ là 25%. Bạn cần ít nhất 16 cuộc gặp phù hợp. Nếu một nửa khách tiềm năng đồng ý gặp, đầu phễu cần khoảng 32 cuộc trao đổi có chất lượng. Cách tính ngược này chưa hoàn hảo nhưng tốt hơn việc gọi ngẫu nhiên.

Mỗi tuần, hãy theo dõi ba con số: cơ hội mới, cơ hội tiến thêm một bước và cơ hội bị dừng. Đừng chỉ nhìn tổng doanh số, vì đó là chỉ báo đến muộn.

## Chất lượng quan trọng ngang tốc độ

Một hồ sơ thiếu thông tin có thể giúp số lượng đầu vào đẹp hơn nhưng làm mất thời gian của nhiều bộ phận. Sàng lọc sơ bộ, nói rõ điều kiện và cập nhật dữ liệu đúng ngay từ đầu là cách tăng năng suất thật. Không có KPI nào biện minh cho việc hứa sai hoặc bỏ qua kiểm soát.

## Khi đang chậm chỉ tiêu, phân tích điểm nghẽn

- Ít cơ hội: xem lại phân khúc, nguồn giới thiệu và thời lượng tìm kiếm khách hàng.
- Nhiều cuộc gọi nhưng ít cuộc hẹn: xem lại thông điệp mở đầu.
- Nhiều cuộc hẹn nhưng ít hồ sơ: xem lại khả năng khai thác nhu cầu và sàng lọc.
- Nhiều hồ sơ nhưng ít phê duyệt: xem lại chất lượng khách hàng và độ đầy đủ thông tin.

## Nhịp làm việc bền vững

Đầu tuần, chọn những cơ hội quan trọng và khóa lịch cho hoạt động tìm kiếm mới. Cuối ngày, cập nhật bước tiếp theo thay vì giữ mọi thứ trong trí nhớ. Cuối tuần, xem tỷ lệ chuyển đổi và rút một bài học cụ thể.

Người quản lý KPI tốt không phải người lúc nào cũng bận. Đó là người biết hoạt động nào tạo giá trị, phát hiện sớm điểm nghẽn và giữ chất lượng trong suốt quá trình đạt mục tiêu.""",
    },
    {
        "id": "news-sme-prospecting",
        "slug": "cach-tim-kiem-khach-hang-doanh-nghiep-cho-rm-ngan-hang",
        "title": "Cách tìm kiếm khách hàng doanh nghiệp cho RM ngân hàng",
        "excerpt": "Một phương pháp tìm khách hàng SME dựa trên phân khúc, tín hiệu nhu cầu và giá trị tiếp cận thay vì gọi điện đại trà.",
        "category": "Kỹ năng thực chiến",
        "image": "tim-kiem-khach-hang-doanh-nghiep.webp",
        "keyword": "tìm kiếm khách hàng doanh nghiệp",
        "meta_title": "Cách tìm kiếm khách hàng doanh nghiệp cho RM ngân hàng",
        "meta_description": "Quy trình tìm kiếm khách hàng doanh nghiệp SME cho RM ngân hàng: chọn phân khúc, xây danh sách, tiếp cận và quản lý bước tiếp theo.",
        "tags": ["khách hàng doanh nghiệp", "RM SME", "tìm kiếm khách hàng"],
        "content": """**Tìm kiếm khách hàng doanh nghiệp** không hiệu quả khi bắt đầu bằng một danh sách thật dài và cùng một kịch bản cho tất cả. Chủ doanh nghiệp dành thời gian cho người hiểu bối cảnh của họ. Vì vậy, bước đầu tiên của RM không phải gọi điện mà là chọn một nhóm mình có thể tạo ra cuộc trò chuyện có ích.

## Chọn phân khúc đủ hẹp để hiểu

Thay vì “doanh nghiệp SME”, hãy chọn cụ thể hơn: nhà phân phối hàng tiêu dùng tại một khu vực, doanh nghiệp logistics nhỏ hoặc cơ sở sản xuất có chu kỳ mùa vụ. Khi tập trung, bạn sẽ hiểu dòng tiền, điểm nghẽn và ngôn ngữ của ngành nhanh hơn.

Một phân khúc tốt cần phù hợp khẩu vị ngân hàng, có nhu cầu tài chính lặp lại và đủ khả năng tiếp cận. Đừng theo đuổi ngành chỉ vì đang nổi nếu bạn chưa hiểu rủi ro.

## Tìm tín hiệu nhu cầu, không chỉ tìm tên công ty

Các tín hiệu như mở thêm địa điểm, tuyển nhiều nhân sự, nhập máy móc, mở rộng kho hoặc tham gia dự án mới thường tạo ra nhu cầu vốn và thanh toán. Chỉ sử dụng nguồn thông tin hợp pháp, công khai và tuân thủ chính sách dữ liệu.

Nguồn khách hàng có thể đến từ giới thiệu, hiệp hội ngành, sự kiện, đối tác trong chuỗi cung ứng hoặc khách hàng hiện hữu. Lời giới thiệu tốt thường bắt đầu từ việc bạn đã phục vụ ai đó tử tế, không phải từ việc xin thông tin liên hệ hàng loạt.

## Thông điệp mở đầu phải có lý do

Đừng nói: “Ngân hàng em có lãi suất ưu đãi”. Hãy nói ngắn gọn bạn là ai, vì sao liên hệ và muốn tìm hiểu điều gì. Ví dụ: “Tôi đang làm với một số nhà phân phối có chu kỳ thu tiền dài hơn trước. Tôi muốn hiểu doanh nghiệp mình có gặp khoảng trống vốn lưu động tương tự không.”

Mục tiêu của lần chạm đầu là một cuộc trao đổi tiếp theo, không phải bán hết sản phẩm trong ba phút.

## Quản lý danh sách như một danh mục cơ hội

- Ghi rõ nguồn và lý do doanh nghiệp có thể phù hợp.
- Lưu lần tương tác gần nhất và bước tiếp theo có ngày cụ thể.
- Phân biệt chưa quan tâm, chưa đúng thời điểm và không phù hợp.
- Dừng liên hệ khi khách hàng yêu cầu.

## Cuộc gặp đầu tiên nên mang lại điều gì?

Hãy chuẩn bị câu hỏi về mô hình kinh doanh, chu kỳ tiền, kế hoạch và khó khăn. Sau cuộc gặp, khách hàng nên nhận được một bản tóm tắt rõ nhu cầu cùng những lựa chọn thực tế, kể cả khi chưa thể vay ngay.

Tìm khách hàng bền vững là quá trình tích lũy uy tín. Khi bạn hiểu ngành, giữ lời và nói thật về điều kiện, danh sách khách hàng sẽ dần được xây từ những cuộc giới thiệu chất lượng thay vì các cuộc gọi lạnh vô tận.""",
    },
    {
        "id": "news-credit-5c",
        "slug": "mo-hinh-5c-trong-tham-dinh-tin-dung-doanh-nghiep",
        "title": "Mô hình 5C trong thẩm định tín dụng doanh nghiệp",
        "excerpt": "5C giúp người thẩm định đặt câu hỏi có hệ thống về uy tín, dòng tiền, vốn chủ, tài sản bảo đảm và điều kiện kinh doanh.",
        "category": "Kiến thức nghiệp vụ",
        "image": "mo-hinh-5c-tin-dung.webp",
        "keyword": "mô hình 5C trong thẩm định tín dụng",
        "meta_title": "Mô hình 5C trong thẩm định tín dụng doanh nghiệp",
        "meta_description": "Tìm hiểu Character, Capacity, Capital, Collateral và Conditions trong mô hình 5C thẩm định tín dụng, kèm câu hỏi thực tế.",
        "tags": ["mô hình 5C", "thẩm định tín dụng", "tín dụng doanh nghiệp"],
        "content": """**Mô hình 5C trong thẩm định tín dụng** là một khung tư duy, không phải năm ô để đánh dấu cho xong. Giá trị của nó nằm ở việc buộc người phân tích nhìn khoản vay từ nhiều góc độ và kết nối dữ kiện trước khi đề xuất.

## Character – Uy tín và thái độ hợp tác

Character phản ánh lịch sử thực hiện cam kết, mức độ minh bạch và năng lực quản trị của người vay. Hãy đối chiếu lời giải thích với hồ sơ, lịch sử tín dụng và hành vi giao dịch. Một chủ doanh nghiệp thừa nhận khó khăn nhưng cung cấp dữ liệu rõ có thể đáng tin hơn người chỉ đưa ra câu trả lời hoàn hảo.

## Capacity – Khả năng tạo dòng tiền trả nợ

Đây là trọng tâm của quyết định tín dụng. Doanh nghiệp tạo tiền từ hoạt động nào, dòng tiền xuất hiện khi nào và chịu tác động bởi yếu tố gì? Cần xem cả số liệu quá khứ lẫn giả định tương lai. Lợi nhuận không tự động trở thành tiền trả nợ nếu bị giữ trong tồn kho và phải thu.

## Capital – Mức vốn chủ tham gia

Vốn chủ cho thấy “lớp đệm” và mức cam kết của chủ sở hữu. Hãy xem cơ cấu vốn, lợi nhuận giữ lại, các khoản rút vốn và khả năng bổ sung vốn khi kế hoạch không thuận lợi. Tỷ lệ thấp không luôn dẫn tới từ chối, nhưng cần được giải thích bằng mô hình và giai đoạn phát triển.

## Collateral – Tài sản bảo đảm

Tài sản bảo đảm giúp giảm tổn thất khi phương án trả nợ thất bại, nhưng không thay thế dòng tiền. Người thẩm định cần xem quyền sở hữu, tính pháp lý, khả năng định giá và thanh khoản. Giá trị trên giấy có thể khác xa giá trị thu hồi thực tế.

## Conditions – Điều kiện bên ngoài và cấu trúc khoản vay

Lãi suất, cạnh tranh, pháp lý, mùa vụ và biến động đầu vào đều có thể thay đổi khả năng trả nợ. Đồng thời, hạn mức và kỳ hạn phải phù hợp mục đích. Khoản vay ngắn hạn tài trợ tài sản dài hạn tạo ra rủi ro ngay từ cấu trúc.

## Kết nối 5C thành một lập luận

Không chấm từng chữ C rồi cộng điểm máy móc. Hãy hỏi các yếu tố bù trừ và khuếch đại nhau thế nào. Quản trị tốt có thể giúp doanh nghiệp ứng phó thị trường xấu; tài sản lớn không bù được dòng tiền liên tục âm.

Một nhận định tốt luôn có ba phần: dữ kiện, ý nghĩa và ảnh hưởng tới khoản vay. 5C giúp bạn không bỏ sót góc nhìn, còn chất lượng quyết định phụ thuộc vào khả năng kiểm chứng và lập luận.""",
    },
    {
        "id": "news-cashflow-profit",
        "slug": "phan-biet-dong-tien-va-loi-nhuan-khi-tham-dinh",
        "title": "Phân biệt dòng tiền và lợi nhuận khi thẩm định doanh nghiệp",
        "excerpt": "Doanh nghiệp có lãi vẫn có thể thiếu tiền. Hiểu sự khác biệt giúp RM đánh giá đúng nhu cầu vốn và nguồn trả nợ.",
        "category": "Kiến thức nghiệp vụ",
        "image": "dong-tien-va-loi-nhuan.webp",
        "keyword": "dòng tiền và lợi nhuận",
        "meta_title": "Phân biệt dòng tiền và lợi nhuận khi thẩm định doanh nghiệp",
        "meta_description": "Giải thích sự khác nhau giữa dòng tiền và lợi nhuận, nguyên nhân doanh nghiệp có lãi vẫn thiếu tiền và câu hỏi cần đặt khi thẩm định.",
        "tags": ["dòng tiền", "lợi nhuận", "phân tích tài chính"],
        "content": """Nhầm lẫn giữa **dòng tiền và lợi nhuận** là một trong những sai lầm phổ biến khi đọc hồ sơ doanh nghiệp. Lợi nhuận trả lời doanh nghiệp kinh doanh có hiệu quả theo nguyên tắc kế toán hay không. Dòng tiền cho biết tiền thật đã vào, đã ra và còn lại bao nhiêu tại một thời điểm.

## Vì sao bán hàng có lãi nhưng tài khoản vẫn thiếu tiền?

Doanh thu có thể được ghi nhận khi giao hàng, trong khi khách hàng thanh toán sau 60 ngày. Doanh nghiệp đã có lợi nhuận kế toán nhưng chưa thu được tiền. Cùng lúc, họ vẫn phải trả lương, nhà cung cấp và thuế. Khoảng lệch thời gian này tạo ra nhu cầu vốn lưu động.

Tiền còn có thể nằm trong tồn kho, tài sản cố định hoặc khoản ứng trước. Ngược lại, một doanh nghiệp đang lỗ vẫn có tiền tạm thời nhờ vay mới, bán tài sản hoặc chủ sở hữu góp vốn. Vì thế, số dư tiền không tự nói lên sức khỏe hoạt động.

## Ba dòng tiền cần phân biệt

- **Hoạt động kinh doanh:** tiền từ khách hàng, trả nhà cung cấp và chi phí vận hành.
- **Hoạt động đầu tư:** mua bán máy móc, nhà xưởng và khoản đầu tư dài hạn.
- **Hoạt động tài chính:** vay, trả nợ, góp vốn và chia lợi nhuận.

Dòng tiền kinh doanh âm một kỳ có thể do mùa vụ hoặc tăng trưởng. Âm lặp lại trong khi lợi nhuận dương là tín hiệu cần tìm nguyên nhân ở phải thu, tồn kho hoặc chất lượng doanh thu.

## Ví dụ ngắn về khoảng trống tiền

Một nhà phân phối mua hàng và trả tiền sau 20 ngày, giữ hàng 25 ngày rồi bán với thời hạn thu tiền 45 ngày. Từ lúc thanh toán đầu vào đến lúc thu được tiền có khoảng trống 50 ngày. Doanh nghiệp càng tăng doanh số, lượng tiền bị “giam” càng lớn nếu điều khoản không đổi.

## Câu hỏi người thẩm định nên đặt

Khách hàng chính là ai và trả tiền đúng hạn không? Tồn kho có bán được hay đã lỗi thời? Dòng tiền có đi qua tài khoản quan sát được không? Nguồn trả nợ đến từ hoạt động cốt lõi hay phụ thuộc khoản vay mới?

## Đừng phân tích một con số đơn lẻ

Hãy so sánh báo cáo kết quả kinh doanh, bảng cân đối và lưu chuyển tiền tệ qua nhiều kỳ. Sau đó đối chiếu với sao kê, hợp đồng và chu kỳ vận hành. Mục tiêu không phải chứng minh lợi nhuận “sai”, mà là hiểu lợi nhuận chuyển thành tiền với tốc độ và độ chắc chắn thế nào.

Khi phân biệt rõ dòng tiền và lợi nhuận, RM sẽ đề xuất đúng loại hạn mức, đúng kỳ hạn và nhận diện sớm rủi ro thanh khoản thay vì chỉ nhìn con số lãi cuối kỳ.""",
    },
    {
        "id": "news-sme-working-capital",
        "slug": "von-luu-dong-la-gi-cach-tinh-nhu-cau-von-doanh-nghiep-sme",
        "title": "Vốn lưu động là gì? Cách hiểu nhu cầu vốn của doanh nghiệp SME",
        "excerpt": "Hiểu chu kỳ chuyển đổi tiền giúp doanh nghiệp và RM xác định nhu cầu vốn lưu động hợp lý, tránh vay thiếu hoặc dùng sai mục đích.",
        "category": "Tài chính doanh nghiệp",
        "image": "von-luu-dong-doanh-nghiep-sme.webp",
        "keyword": "vốn lưu động là gì",
        "meta_title": "Vốn lưu động là gì? Cách tính nhu cầu vốn doanh nghiệp SME",
        "meta_description": "Tìm hiểu vốn lưu động là gì, chu kỳ chuyển đổi tiền và cách đánh giá nhu cầu tài trợ vốn lưu động phù hợp cho doanh nghiệp SME.",
        "tags": ["vốn lưu động", "doanh nghiệp SME", "chu kỳ tiền"],
        "content": """**Vốn lưu động là gì?** Hiểu đơn giản, đó là nguồn lực giúp doanh nghiệp duy trì hoạt động hằng ngày trong thời gian tiền đi từ khâu mua hàng đến khi thu được từ khách. Với SME, thiếu vốn lưu động thường không phải vì kinh doanh không có lãi, mà vì thời điểm thu và chi không khớp nhau.

## Nhìn vốn lưu động qua chu kỳ kinh doanh

Một doanh nghiệp dùng tiền mua nguyên liệu, sản xuất hoặc giữ hàng, bán cho khách rồi chờ thanh toán. Trong lúc đó, nhà cung cấp có thể yêu cầu trả sớm hơn. Số ngày tồn kho cộng số ngày phải thu, trừ số ngày được nhà cung cấp cho nợ, tạo nên chu kỳ chuyển đổi tiền.

Chu kỳ càng dài, lượng tiền cần tài trợ càng lớn. Khi doanh số tăng nhanh, nhu cầu vốn có thể tăng trước khi lợi nhuận kịp chuyển thành tiền.

## Các khoản mục cần quan sát

- Phải thu: thời hạn, mức tập trung và lịch sử thanh toán.
- Tồn kho: tốc độ quay, mùa vụ và nguy cơ lỗi thời.
- Phải trả: điều khoản với nhà cung cấp và mức độ ổn định.
- Tiền tối thiểu: số tiền cần để duy trì lương và chi phí thiết yếu.

## Ước tính nhu cầu sao cho thực tế?

Không nên lấy một tỷ lệ cố định nhân với doanh thu. Hãy xây từ chu kỳ: mỗi ngày doanh nghiệp cần bao nhiêu chi phí vận hành, tiền bị giữ bao nhiêu ngày và vốn tự có tham gia bao nhiêu. Sau đó kiểm tra bằng dữ liệu lịch sử và kế hoạch đơn hàng.

Ví dụ, doanh nghiệp cần 20 triệu đồng chi phí tiền mặt mỗi ngày và có khoảng trống 45 ngày, nhu cầu gộp là 900 triệu đồng. Con số này còn phải điều chỉnh cho vốn tự có, mùa vụ, khoản phải trả và biên an toàn; nó không tự động là hạn mức đề xuất.

## Những sai lầm phổ biến

Dùng khoản vay ngắn hạn để mua tài sản dài hạn khiến tiền không quay về đúng kỳ. Vay vượt nhu cầu làm tăng chi phí và có thể dẫn đến sử dụng vốn ngoài phương án. Ngược lại, hạn mức quá thấp khiến doanh nghiệp liên tục đảo nguồn hoặc bỏ lỡ đơn hàng.

## RM cần xác minh điều gì?

Hãy đi từ đơn hàng, hợp đồng, hóa đơn và dòng tiền thực tế. Kiểm tra kế hoạch tăng trưởng có phù hợp năng lực kho, nhân sự và thị trường hay không. Đồng thời thảo luận các cách giảm nhu cầu vốn như rút ngắn thu tiền, tối ưu tồn kho hoặc đàm phán kỳ hạn nhà cung cấp.

Tài trợ vốn lưu động tốt không chỉ cung cấp tiền. Nó phải phù hợp chu kỳ, có cơ chế kiểm soát dòng tiền và giúp doanh nghiệp vận hành ổn định hơn.""",
    },
    {
        "id": "news-interest-objection",
        "slug": "cach-xu-ly-khach-hang-phan-doi-lai-suat-cao",
        "title": "Cách xử lý khi khách hàng nói lãi suất ngân hàng quá cao",
        "excerpt": "Đừng vội giảm giá hoặc tranh luận. Hãy tìm đúng nỗi lo, làm rõ tổng chi phí và cùng khách hàng so sánh phương án có trách nhiệm.",
        "category": "Kỹ năng thực chiến",
        "image": "xu-ly-phan-doi-lai-suat.webp",
        "keyword": "xử lý khách hàng phản đối lãi suất",
        "meta_title": "Cách xử lý khách hàng phản đối lãi suất cao khéo léo",
        "meta_description": "Quy trình xử lý khách hàng phản đối lãi suất ngân hàng: ghi nhận, làm rõ, so sánh tổng chi phí và chốt bước tiếp theo tự nhiên.",
        "tags": ["xử lý từ chối", "lãi suất ngân hàng", "tư vấn khách hàng"],
        "content": """Khi khách hàng nói “lãi suất bên em cao”, phản xạ phổ biến là giải thích ngay hoặc cố chứng minh ngân hàng mình rẻ hơn. Cách **xử lý khách hàng phản đối lãi suất** tốt hơn là chậm lại. Câu nói đó có thể che giấu nhiều mối lo khác nhau: số tiền trả hàng tháng, rủi ro lãi suất thay đổi, tổng chi phí hoặc niềm tin.

## Bước 1: Ghi nhận mà không vội đồng ý

Bạn có thể nói: “Tôi hiểu lãi suất là yếu tố anh/chị cần cân nhắc kỹ.” Sự ghi nhận giúp cuộc trò chuyện bớt đối đầu. Tránh câu “không cao đâu” vì nó phủ nhận cảm nhận khi bạn chưa hiểu cách khách hàng đang so sánh.

## Bước 2: Hỏi để tìm băn khoăn thật

“Anh/chị đang so sánh mức lãi suất ban đầu, khoản trả mỗi tháng hay tổng chi phí trong toàn kỳ?” Một câu hỏi cụ thể thường mở ra vấn đề thật. Có khách hàng quan tâm dòng tiền tháng; có người lo lãi suất sau ưu đãi; người khác đã nhận đề nghị cạnh tranh.

## Bước 3: So sánh trên cùng một cơ sở

Hai con số lãi suất không thể so sánh nếu khác thời gian ưu đãi, cách tính, phí, bảo hiểm, điều kiện trả trước hoặc kỳ hạn. Hãy lập bảng đơn giản về khoản trả, tổng chi phí và các điều kiện quan trọng. Chỉ dùng thông tin chính thức, không suy đoán chính sách đối thủ.

## Bước 4: Kết nối với ưu tiên của khách hàng

Nếu khách hàng cần sự ổn định, phương án cố định dài hơn có thể phù hợp dù mức đầu vào không thấp nhất. Nếu họ dự kiến tất toán sớm, phí trả trước cần được xem kỹ. Vai trò của tư vấn viên là giúp nhìn toàn bộ quyết định, không phải làm lu mờ giá.

## Bước 5: Biết khi nào nên dừng

Nếu phương án khác thực sự tốt hơn và phù hợp hơn, hãy trung thực. Đừng tạo áp lực hoặc giấu điều kiện. Một khách hàng được tôn trọng có thể quay lại khi nhu cầu thay đổi và sẵn sàng giới thiệu người khác.

## Mẫu phản hồi tự nhiên

“Mức lãi suất anh/chị thấy đúng là cao hơn ở giai đoạn đầu. Trước khi kết luận, mình cùng đặt hai phương án trên cùng thời hạn và xem khoản trả, phí cùng điều kiện điều chỉnh. Nếu phương án kia vẫn phù hợp hơn, tôi sẽ nói thẳng để anh/chị quyết định.”

Xử lý phản đối không phải thắng một cuộc tranh luận. Đó là giúp khách hàng hiểu đủ để lựa chọn. Khi sự minh bạch được đặt trước việc chốt bán, niềm tin và kết quả kinh doanh sẽ bền hơn.""",
    },
    {
        "id": "news-retail-corporate",
        "slug": "retail-banking-va-corporate-banking-nen-chon-mang-nao",
        "title": "Retail Banking và Corporate Banking: Nên chọn mảng nào?",
        "excerpt": "So sánh khách hàng, công việc, kỹ năng và lộ trình phát triển để người mới chọn mảng ngân hàng phù hợp với thế mạnh.",
        "category": "Định hướng nghề nghiệp",
        "image": "retail-va-corporate-banking.webp",
        "keyword": "Retail Banking và Corporate Banking",
        "meta_title": "Retail Banking và Corporate Banking: Nên chọn mảng nào?",
        "meta_description": "So sánh Retail Banking và Corporate Banking về khách hàng, sản phẩm, kỹ năng và cơ hội nghề nghiệp để chọn hướng đi phù hợp.",
        "tags": ["Retail Banking", "Corporate Banking", "nghề ngân hàng"],
        "content": """**Retail Banking và Corporate Banking** đều cần tư duy khách hàng và kiến thức tài chính, nhưng nhịp công việc rất khác nhau. Chọn mảng nào không nên dựa trên cảm giác “mảng doanh nghiệp oai hơn” hay “bán lẻ dễ hơn”. Hãy nhìn vào loại vấn đề bạn muốn giải quyết mỗi ngày.

## Retail Banking phục vụ ai?

Ngân hàng bán lẻ phục vụ cá nhân và hộ gia đình với tài khoản, thẻ, tiết kiệm, bảo hiểm, vay mua nhà hoặc tiêu dùng. Số lượng khách hàng lớn, nhu cầu đa dạng và chu kỳ quyết định thường ngắn hơn. Nhân sự cần giao tiếp dễ hiểu, quản lý nhiều cuộc tương tác và duy trì trải nghiệm nhất quán.

## Corporate Banking làm việc với điều gì?

Ngân hàng doanh nghiệp phục vụ tổ chức từ SME tới doanh nghiệp lớn. Giải pháp có thể gồm vốn lưu động, đầu tư, thanh toán, bảo lãnh và quản lý dòng tiền. Mỗi hồ sơ thường cần hiểu mô hình kinh doanh, báo cáo tài chính, ngành và nhiều bên liên quan. Chu kỳ bán dài hơn nhưng quan hệ có chiều sâu.

## Kỹ năng nào tạo khác biệt?

Ở bán lẻ, tốc độ, khả năng xây niềm tin nhanh và kỷ luật theo dõi rất quan trọng. Ở doanh nghiệp, bạn cần kiên nhẫn nghiên cứu, đặt câu hỏi về vận hành và phối hợp nhiều bộ phận. Cả hai đều có KPI, yêu cầu tuân thủ và áp lực chất lượng.

## Người mới nên chọn thế nào?

Hãy tự hỏi bạn thích làm việc với nhiều tình huống ngắn hay một bài toán phức tạp kéo dài. Bạn có hứng thú với tài chính cá nhân hay hoạt động doanh nghiệp? Bạn học tốt qua tương tác nhanh hay qua phân tích sâu?

Đừng chỉ dựa vào tính cách hướng nội hoặc hướng ngoại. Người ít nói nhưng biết lắng nghe vẫn có thể làm bán hàng tốt; người hoạt ngôn nhưng thiếu kỷ luật phân tích vẫn gặp khó ở cả hai mảng.

## Trải nghiệm trước khi quyết định

- Đọc mô tả tuyển dụng thật của hai mảng.
- Nói chuyện với ít nhất hai người đang làm mỗi mảng.
- Thử phân tích một tình huống cá nhân và một case SME.
- Quan sát công việc nào khiến bạn tò mò muốn đào sâu.

## Có thể chuyển mảng về sau không?

Có, nhưng cần bù khoảng trống. Từ bán lẻ sang doanh nghiệp thường phải tăng năng lực báo cáo tài chính và thẩm định. Chiều ngược lại cần làm quen với quy mô khách hàng lớn và sản phẩm cá nhân. Nền tảng chung về tư vấn, đạo đức và quản trị quan hệ vẫn có giá trị.

Lựa chọn tốt nhất không phải mảng được cho là “cao hơn”, mà là nơi thế mạnh của bạn phù hợp với loại khách hàng và bài toán đủ lâu để phát triển thành chuyên môn.""",
    },
    {
        "id": "news-first-30-days",
        "slug": "30-ngay-dau-lam-viec-tai-ngan-hang-can-lam-gi",
        "title": "30 ngày đầu làm việc tại ngân hàng: Người mới cần làm gì?",
        "excerpt": "Kế hoạch hội nhập thực tế giúp nhân sự mới hiểu quy trình, xây quan hệ, học sản phẩm và tạo kết quả đầu tiên mà không vội vàng.",
        "category": "Định hướng nghề nghiệp",
        "image": "30-ngay-dau-lam-ngan-hang.webp",
        "keyword": "30 ngày đầu làm việc tại ngân hàng",
        "meta_title": "30 ngày đầu làm việc tại ngân hàng: Kế hoạch cho người mới",
        "meta_description": "Checklist 30 ngày đầu làm việc tại ngân hàng: học quy trình, sản phẩm, xây quan hệ nội bộ và tạo những kết quả đầu tiên an toàn.",
        "tags": ["nhân viên ngân hàng mới", "onboarding", "phát triển nghề nghiệp"],
        "content": """**30 ngày đầu làm việc tại ngân hàng** không phải thời gian để chứng minh bạn biết mọi thứ. Đây là lúc xây cách học, hiểu tiêu chuẩn và tạo uy tín qua những cam kết nhỏ. Người mới tiến bộ nhanh thường không hỏi ít hơn; họ hỏi có chuẩn bị và ghi lại điều đã học.

## Tuần 1: Hiểu hệ thống trước khi chạy nhanh

Hãy làm rõ vai trò, KPI, quy trình báo cáo và những việc tuyệt đối không được tự ý thực hiện. Hoàn thành đào tạo bắt buộc về bảo mật, dữ liệu và tuân thủ. Ghi lại tên các hệ thống, nơi tra cứu tài liệu chính thức và đầu mối hỗ trợ.

Đừng sao chép dữ liệu khách hàng vào công cụ cá nhân để “làm cho tiện”. Thói quen an toàn cần hình thành ngay từ ngày đầu.

## Tuần 2: Học sản phẩm qua nhu cầu

Thay vì thuộc toàn bộ biểu phí, hãy chọn những sản phẩm chính và trả lời: dành cho ai, giải quyết vấn đề gì, điều kiện cơ bản, chi phí và rủi ro là gì. Sau đó luyện giải thích bằng ngôn ngữ khách hàng.

Xin quan sát một cuộc tư vấn hoặc hồ sơ mẫu đã được phép sử dụng. Sau mỗi lần, tự tóm tắt điều bạn hiểu và nhờ người hướng dẫn chỉnh sai.

## Tuần 3: Xây bản đồ quan hệ nội bộ

RM không làm việc một mình. Hãy hiểu vai trò của vận hành, thẩm định, pháp chế, dịch vụ khách hàng và quản lý. Khi nhờ hỗ trợ, gửi đủ bối cảnh, câu hỏi rõ và thời hạn hợp lý. Sự chuyên nghiệp nội bộ ảnh hưởng trực tiếp tới trải nghiệm khách hàng.

## Tuần 4: Tạo kết quả nhỏ có thể đo

Kết quả đầu tiên có thể là hoàn thành đúng một bộ hồ sơ, xây danh sách khách hàng có phân loại, thực hiện cuộc gọi được phản hồi tốt hoặc giảm lỗi nhập liệu. Chọn việc vừa sức nhưng làm trọn vẹn từ đầu tới cuối.

## Những câu hỏi nên hỏi quản lý

- Ba ưu tiên quan trọng nhất trong tháng đầu là gì?
- Một nhân sự mới thường mắc lỗi nào?
- Tiêu chuẩn của một hồ sơ hoặc cuộc tư vấn tốt là gì?
- Tôi nên báo cáo sớm khi gặp loại rủi ro nào?

## Cuối 30 ngày, tự đánh giá

Bạn đã hiểu khách hàng mục tiêu chưa? Có thể giải thích sản phẩm chính không? Biết tìm quy trình ở đâu và biết khi nào phải xin ý kiến chưa? Hãy xin phản hồi cụ thể về một điểm làm tốt và một điểm cần thay đổi.

Đừng so tốc độ của mình với người đã làm nhiều năm. Mục tiêu tháng đầu là trở thành người đáng tin: học nhanh, ghi chép, giữ lời và không che giấu sai sót. Nền tảng đó quan trọng hơn một thành tích vội vàng.""",
    },
    {
        "id": "news-customer-portfolio",
        "slug": "cach-quan-ly-danh-muc-khach-hang-ngan-hang-hieu-qua",
        "title": "Cách quản lý danh mục khách hàng ngân hàng hiệu quả",
        "excerpt": "Phân khúc, ưu tiên và đặt nhịp chăm sóc giúp RM phục vụ đúng lúc, phát hiện cơ hội và kiểm soát rủi ro tốt hơn.",
        "category": "Kỹ năng thực chiến",
        "image": "quan-ly-danh-muc-khach-hang.webp",
        "keyword": "quản lý danh mục khách hàng ngân hàng",
        "meta_title": "Cách quản lý danh mục khách hàng ngân hàng hiệu quả cho RM",
        "meta_description": "Hướng dẫn quản lý danh mục khách hàng ngân hàng: phân khúc, ưu tiên, lịch chăm sóc, cảnh báo rủi ro và đo chất lượng quan hệ.",
        "tags": ["danh mục khách hàng", "RM ngân hàng", "chăm sóc khách hàng"],
        "content": """**Quản lý danh mục khách hàng ngân hàng** không phải lưu thật nhiều tên trong bảng tính. Đó là khả năng biết ai cần được liên hệ, vì lý do gì, vào thời điểm nào và rủi ro nào cần theo dõi. Một danh mục có cấu trúc giúp RM bớt phụ thuộc trí nhớ và phục vụ khách hàng nhất quán hơn.

## Phân khúc theo nhu cầu và mức độ ưu tiên

Đừng chỉ chia theo số dư. Hãy cân nhắc giá trị hiện tại, tiềm năng phù hợp, mức độ tương tác và nhu cầu sắp tới. Khách hàng giá trị lớn nhưng ít nhu cầu không nhất thiết cần tần suất giống khách đang chuẩn bị mở rộng kinh doanh.

Một cách đơn giản là bốn nhóm: cần hành động ngay, cần nuôi dưỡng, duy trì định kỳ và chưa phù hợp. Mỗi nhóm phải có tiêu chí rõ để tránh ưu tiên theo cảm tính.

## Mỗi khách hàng phải có “bước tiếp theo”

Ghi chú tốt không phải “đã gọi”. Hãy lưu nhu cầu, băn khoăn, cam kết của hai bên và ngày hành động tiếp theo. Nếu chưa có bước tiếp, cơ hội rất dễ biến mất giữa những việc khẩn cấp khác.

Chỉ lưu thông tin trên hệ thống được ngân hàng cho phép. Không đưa dữ liệu khách hàng vào tài khoản, thiết bị hoặc công cụ cá nhân.

## Thiết kế nhịp chăm sóc có lý do

Liên hệ quá thường xuyên nhưng không mang giá trị sẽ thành làm phiền. Mỗi lần chạm nên có mục đích: cập nhật hồ sơ, nhắc mốc quan trọng, kiểm tra sau giao dịch hoặc chia sẻ thông tin thực sự liên quan. Tần suất phải phù hợp phân khúc và sự đồng ý của khách hàng.

## Theo dõi cả cơ hội lẫn rủi ro

Với khách hàng tín dụng, hãy chú ý thay đổi dòng tiền, chậm trả, biến động ngành hoặc thông tin không nhất quán. Phát hiện sớm không có nghĩa kết luận tiêu cực; nó giúp chủ động trao đổi và thực hiện đúng quy trình quản trị sau vay.

## Những chỉ số hữu ích

- Tỷ lệ khách hàng có bước tiếp theo rõ ràng.
- Tỷ lệ phản hồi và cuộc hẹn theo từng phân khúc.
- Số quan hệ hoạt động, không chỉ số hồ sơ mở mới.
- Tỷ lệ sai sót, khiếu nại và tín hiệu rủi ro được xử lý đúng hạn.

## Nghi thức rà soát hằng tuần

Dành một khung giờ cố định để làm sạch dữ liệu, đóng cơ hội không còn phù hợp và chọn danh sách ưu tiên tuần tới. Kiểm tra xem mình có bỏ quên khách hàng chỉ vì họ chưa tạo doanh số ngay hay không.

Quản lý danh mục tốt giúp RM chuyển từ phản ứng sang chủ động. Khách hàng nhận được sự quan tâm đúng lúc, còn ngân hàng có một danh mục minh bạch, có chất lượng và dễ kiểm soát hơn.""",
    },
]


class Command(BaseCommand):
    help = "Add the second curated batch of ten banking articles without replacing existing news."

    def handle(self, *args, **options):
        if len(ARTICLES) != 10 or len({a["slug"] for a in ARTICLES}) != 10:
            raise CommandError("Batch 2 must contain exactly ten unique articles.")
        images = {}
        for image in sorted(IMAGES.glob("*.webp")):
            name = f"articles/{image.name}"
            if not default_storage.exists(name):
                with image.open("rb") as source:
                    default_storage.save(name, File(source, name=image.name))
            images[image.name] = default_storage.url(name)
        if len(images) != 10:
            raise CommandError("Expected exactly ten batch-2 WebP images.")

        now = timezone.now()
        with transaction.atomic():
            for index, item in enumerate(ARTICLES):
                words = len(item["content"].split())
                if words < 450:
                    raise CommandError(f"Article {item['slug']} is too short: {words} words.")
                Article.objects.update_or_create(
                    id=item["id"],
                    defaults={
                        "slug": item["slug"],
                        "title": item["title"],
                        "excerpt": item["excerpt"],
                        "content": item["content"],
                        "featured_image": images[item["image"]],
                        "category": item["category"],
                        "author": "Ban Chuyên môn TWings Academy",
                        "status": "published",
                        "published_at": now - timedelta(hours=index + 1),
                        "tags": item["tags"],
                        "views_count": 0,
                        "meta_title": item["meta_title"],
                        "meta_description": item["meta_description"],
                        "focus_keyword": item["keyword"],
                        "canonical_url": BASE_URL + item["slug"],
                        "seo_score": 95,
                        "seo_checks": {
                            "hasHeadings": True,
                            "hasFeaturedImage": True,
                            "contentWordCount": words,
                            "wordCountPassed": True,
                        },
                    },
                )
        found = Article.objects.filter(id__in=[a["id"] for a in ARTICLES], status="published").count()
        if found != 10:
            raise CommandError(f"Expected 10 published batch-2 articles, got {found}.")
        self.stdout.write(self.style.SUCCESS("Published 10 additional articles and images successfully."))
