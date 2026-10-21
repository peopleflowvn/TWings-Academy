# KẾ HOẠCH TÍCH HỢP QUẢN TRỊ ĐÀO TẠO DOANH NGHIỆP (TMS) VÀO TWINGS-ACADEMY

**Phiên bản:** 6.0 – thay V5 sau khi đối chiếu từng nhận định với mã nguồn
**Ngày rà soát:** 21/10/2026
**Mốc mã nguồn kiểm tra:** `main` – `d8558ba71`
**Nguồn lực:** 01 người phát triển (kiến trúc, code, kiểm thử, triển khai) + 01 cán bộ nghiệp vụ đào tạo
**Mục tiêu:** Đưa nghiệp vụ đào tạo doanh nghiệp (B2B) vào TWings bằng một mô-đun mới, dùng chung tài khoản, khóa
học, lớp/buổi, Moodle, email, báo cáo và CI/CD. Không dựng hệ TMS thứ hai, không viết lại LMS, không đổi framework.

> **Khuyến nghị quyết định:** Phê duyệt mở rộng TWings thành nền tảng B2C + B2B. Trong 08 tuần làm **trọn đường găng
> vận hành lớp doanh nghiệp** (khách hàng → lớp → DSHV → Moodle → điểm danh → khảo sát → kết quả → email có CC →
> nghiệm thu MSB/ROX). Các nghiệp vụ tài chính sâu (ngân sách, tạm ứng, mua sắm, phân bổ, công nợ) làm ở **giai đoạn
> 2 (4–6 tuần)**. Trong 08 tuần, các nghiệp vụ này được ghi nhận thủ công có nhật ký, ghi rõ trong biên bản.

## 0. THAY ĐỔI SO VỚI V5

| # | V5 | V6 | Lý do (bằng chứng trong code) |
|---|---|---|---|
| 1 | Không nhắc tới SSO | Sửa `identity_for_email` ngay tuần 1 | `backend/apps/sso/services.py:36` chỉ cho đăng nhập khi có `Order.learning_access=True`. Học viên B2B không đăng nhập được `/learn`, và `apps/lms/overview.py: sync_account` sẽ **khóa** tài khoản Moodle của họ |
| 2 | `CorporateLmsEnrollment` song song | Mở rộng `LmsEnrollment` dùng chung: `order` hoặc `corporate_enrollment` (đúng một trong hai) | `LmsEnrollment.order` là OneToOne bắt buộc. Chuyên cần, điểm, rủi ro, webhook Moodle, `sync_lms_completion`, `Certificate` đều gắn vào nó (khoảng 38 chỗ trong `apps/lms/`). Bảng song song = chép lại toàn bộ mảng LMS. Hệ thống đang thử nghiệm, được phép refactor |
| 3 | Tự viết endpoint QR trong Django nếu Moodle không đáp ứng | Dùng QR tự điểm danh có sẵn của `mod_attendance`, chỉ thêm 1 hàm WS trong `local_twings` | `mod_attendance` 2026042102 trong `lms/` có `studentscanmark`, `includeqrcode`, `rotateqrcode` (QR xoay vòng chống chia sẻ), `autoassignstatus`. WS `mod_attendance_add_session` không có tham số bật QR, nên cần một hàm WS nhỏ |
| 4 | Khảo sát: Moodle hoặc form riêng | Chốt dùng `mod_feedback` (lõi Moodle, hỗ trợ ẩn danh) | Có sẵn WS `mod_feedback_get_responses_analysis`, `mod_feedback_get_non_respondents` |
| 5 | Không có cơ chế ẩn lớp B2B khỏi storefront | Thêm `Cohort.audience` và lọc ở mọi chỗ công khai/tuyển sinh | `catalog/intakes.py: seats_taken`, public API, `refresh_intakes`, chiến dịch, checkout đều đọc `Cohort` |
| 6 | Khoảng 45 model mới | Khoảng 16 model ở GĐ1, khoảng 4 ở GĐ2 | Gộp các model trùng vai trò (mục 5) |
| 7 | 22 nhóm đều phải "khả dụng" trong 08 tuần | Ma trận 22 nhóm có cột giai đoạn và mức đáp ứng | 280–320 giờ không đủ cho 22 nhóm kèm các cổng chất lượng |
| 8 | Email: chỉ sửa transport | Sửa transport, `EmailLog`, khung email theo thương hiệu | `EmailLog` chỉ có một `recipient_email` và FK `order`. `notifications/layout.py` chỉ có khung TWings |
| 9 | Không nhắc thư viện Excel | Thêm `openpyxl` | `requirements.txt` chưa có thư viện đọc/ghi XLSX, repo hiện chỉ xuất CSV |
| 10 | Cổng khách hàng có tài khoản | Link xem có hạn theo mẫu `PartnerShare` | `crm/partner.py` + `/doi-tac/<token>` đã chạy cho HR đối tác |
| 11 | Giả định có staging | Repo chỉ có production (VPS TA). Staging là điều kiện khởi động | `.github/workflows/`: `ci.yml`, `deploy.yml`, `ops.yml`, không có môi trường thứ hai |
| 12 | Chưa nói về repo công khai | Không đưa mẫu/dữ liệu thật của khách hàng vào repo | Repo công khai (ARCHITECTURE mục 1) |

## 1. TÓM TẮT ĐIỀU HÀNH

TWings đang phục vụ hành trình B2C: **tuyển sinh → đơn học phí → lớp → Moodle → kết quả → chứng chỉ → việc làm**.
TMS bổ sung hành trình B2B: **khách hàng doanh nghiệp → hợp đồng → kế hoạch → PIC → DSHV → lớp/buổi → điểm danh →
khảo sát → kết quả → báo cáo + CC CBQL → nghiệm thu → (GĐ2) chi phí, công nợ**.

Hai hành trình dùng chung người học, khóa, lớp, buổi, Moodle, email, nhưng **không dùng chung giao dịch**. Học viên
doanh nghiệp được ghi danh theo danh sách cử đi học, không mua khóa và không có `crm.Order`. Giá trị hợp đồng,
nghiệm thu B2B không bao giờ cộng vào doanh thu học phí, VietQR hay báo cáo B2C.

**Sau 08 tuần:** trong `/app` có khu vực **Đào tạo doanh nghiệp**. Nhân viên chạy trọn một lớp MSB và một lớp ROX,
từ nhập kế hoạch đến xuất bảng nghiệm thu đúng mẫu. Học viên đăng nhập `/learn` bằng email, tự điểm danh bằng QR,
làm khảo sát, nhận email kết quả có CC đúng CBQL. Khách hàng xem báo cáo qua link có hạn. Số liệu xuất ra khớp dữ
liệu nguồn. Toàn bộ test B2C hiện có vẫn pass.

**Cảnh báo:** 08 tuần cho 01 người phát triển chỉ khả thi với phạm vi ở mục 4. Không tuyên bố go-live khi chưa đạt
các cổng ở mục 11 (bảo mật giữa khách hàng, gửi nhầm email, số liệu nghiệm thu, khôi phục backup, hồi quy B2C).

## 2. HIỆN TRẠNG ĐÃ KIỂM CHỨNG

| Lớp hiện có | Bằng chứng | Dùng lại được | Việc phải làm cho B2B |
|---|---|---|---|
| Frontend React 19, TS, Vite 8, Tailwind 4 | `frontend/src/admin/AdminApp.tsx`, trang dạng `XxxPages.tsx` | Shell `/app`, menu, bảng, modal, auth | Thêm nhóm menu B2B, file `CorporatePages.tsx` theo quy ước hiện có |
| Django 6.1 + DRF + PostgreSQL 18 | `backend/config/staff_urls.py` | REST, phân trang, `permission_map` | App mới `corporate` |
| Danh mục | `catalog.Course`, `Program`, `Instructor`, `Partner` | Course, Instructor dùng chung | `Program` là gói bán học phí, không phải kế hoạch B2B. `Partner` là đối tác hiển thị website, không phải khách hàng hợp đồng. `Course` có `status` (draft/…/published): lớp B2B phải mở được trên khóa **chưa bán công khai** (kiểm tra tuần 1) |
| Đợt học, buổi học | `catalog.Cohort`, `CohortSession`, `catalog/intakes.py` | Lịch buổi, sao chép khóa Moodle theo đợt, lịch Moodle, phiên điểm danh | `Cohort` không có trường phân loại đối tượng; `seats_taken` đếm `Order` + giữ chỗ checkout. Cần `audience` và đếm riêng cho B2B |
| Người học | `crm.Learner` (một người, nhiều đăng ký; ghép theo email → SĐT → CCCD) | Danh tính chung | Thêm quan hệ nhân sự tại doanh nghiệp (mã CBNV, đơn vị, CBQL theo thời gian) |
| Tuyển sinh, học phí | `crm.Order`, `payments.*`, `crm.InvoiceRequest` (1–1 `Order`) | Giữ nguyên | Không tạo đơn 0 đồng giả cho B2B |
| Ghi danh Moodle | `lms.LmsEnrollment` (`order` OneToOne bắt buộc), `lms/services.py: process, provision_cohort` | Toàn bộ quy trình tạo user, ghi danh, thử lại, đồng bộ | Mở rộng để nhận đăng ký B2B (mục 3.2) |
| SSO / cổng học viên | `sso/services.py: identity_for_email`, `lms/overview.py: sync_account`, `/learn/tai-khoan` | OAuth2 cho Moodle, đăng nhập bằng mã email | **Chặn:** chỉ nhận người có `Order` đang học. Phải nhận đăng ký B2B còn hiệu lực |
| Điểm danh | `lms/learning.py` (mỗi đợt một hoạt động `mod_attendance`, mỗi buổi một phiên, đọc lại qua `mod_attendance_get_session`) | Đầy đủ cho giảng viên điểm danh | Bật QR tự điểm danh từng phiên (hàm WS mới trong `local_twings`) |
| Khảo sát | `mod_feedback` (lõi Moodle) | Ẩn danh, phân tích, danh sách chưa phản hồi qua WS | Thêm hàm WS vào `infra/lms/twings_setup.php`, đọc kết quả vào snapshot |
| Chứng chỉ | `lms.Certificate` (1–1 `LmsEnrollment`, mã `TWC-…`) | Dùng được khi `LmsEnrollment` dùng chung | Quyết định nghiệp vụ: B2B có cấp `TWC-…` không (mục 12.2) |
| Email | `notifications.EmailTemplate`, `EmailLog`, `EmailEvent`, `resend.py`, `layout.py` | Mẫu, gửi Resend, webhook giao/bounce, idempotency | `send_email(to: str)` một người nhận; `EmailLog` một người nhận + FK `order`; khung email chỉ có TWings |
| Tác vụ nền | `core/schedule.py`, `django.tasks` + `django-tasks-db`, container `worker` | Hàng đợi, lịch định kỳ, nút chạy lại trong /app | Thêm job B2B, không cần Celery/Redis |
| Báo cáo | `core/reports.py` (`Order`, `LmsEnrollment`), `OverviewReportsPage` | Khung KPI | Khi `LmsEnrollment` dùng chung, báo cáo B2C phải lọc `order__isnull=False` |
| Phân quyền, audit | `accounts/rbac.py` (5 vai trò), `frontend/src/utils/rbac.ts`, `core.AuditLog` | RBAC phía server, audit | Thêm vai trò và quyền `corporate.*` |
| Link chia sẻ có hạn | `crm.PartnerShare`, `crm/partner.py`, `/doi-tac/<token>` | Mẫu cổng chỉ đọc cho bên ngoài | Làm `ClientShare` cùng mẫu |
| Excel | Chỉ có xuất CSV (`crm/views.py`) | – | Thêm `openpyxl` cho import và xuất mẫu nghiệm thu |
| Hạ tầng, CI | VPS ARM64 TA dùng chung (6 GB RAM), `infra/docker-compose.prod.yml`, CI cài Moodle thật + `lms_contract_check`, e2e Playwright | Deploy, rollback, backup, test hợp đồng Moodle | Không có staging; job e2e B2B mới |

**Phạm vi kiểm tra:** đã đọc mã nguồn tại commit trên (model, service, SSO, LMS, email, RBAC, báo cáo, plugin Moodle
đi kèm). Chưa chạy pytest/e2e, chưa kiểm tra hiệu năng thực tế. "Có sẵn" nghĩa là có trong code, chưa phải đã được
khách hàng B2B chấp nhận.

## 3. KIẾN TRÚC ĐÍCH

**Một monorepo, một bộ quản trị, hai quy trình kinh doanh.**

- **Giữ nguyên:** website, CRM tuyển sinh, `Order`, VietQR, hoàn tiền, trả góp, việc làm, Moodle, DB, deploy.
- **Dùng chung có kiểm soát:** `Learner`, `Course`, `Instructor`, `Cohort`, `CohortSession`, `LmsEnrollment`,
  `Certificate`, `EmailTemplate`/`EmailLog`, upload, audit, hàng đợi.
- **App mới `backend/apps/corporate`:** khách hàng, hợp đồng, kế hoạch, lớp B2B, DSHV, import, kết quả, truyền
  thông, nghiệm thu, hồ sơ, (GĐ2) tài chính. Chỉ tách thành nhiều app khi khối lượng thực sự tăng.
- **Moodle giữ hoạt động học:** nội dung, kiểm tra, sổ điểm, điểm danh (kể cả QR), khảo sát. TWings giữ số liệu
  tổng hợp đã xác minh và **snapshot chốt** để báo cáo, nghiệm thu.
- **Không thêm dịch vụ hạ tầng.**

### 3.1. Nơi gốc của từng loại dữ liệu

| Dữ liệu | Nơi gốc | Ghi chú |
|---|---|---|
| Cá nhân người học | `crm.Learner` | Dùng chung; nhân viên chỉ thấy theo quyền |
| Nhân sự của khách hàng, CBQL | `corporate.CorporateEmployee` | Mã CBNV duy nhất trong một pháp nhân; CBQL và đơn vị theo ngày hiệu lực |
| Khóa học, giảng viên | `catalog.Course`, `Instructor` | Không có catalog B2B thứ hai |
| Lớp, buổi | `catalog.Cohort` (`audience=corporate`), `CohortSession` | Thông tin B2B nằm ở `corporate.CorporateClass` (1–1) |
| Quyền học B2C | `crm.Order` → `LmsEnrollment(order=…)` | Không đổi |
| Quyền học B2B | `corporate.CorporateEnrollment` → `LmsEnrollment(corporate_enrollment=…)` | Không qua thanh toán |
| Nội dung, điểm, chuyên cần, khảo sát | Moodle | TWings đồng bộ về, rồi chốt vào `ResultSnapshot` |
| Điều chỉnh điểm danh | `corporate.AttendanceAdjustment` | Có lý do, bằng chứng, người duyệt; không ghi vào Moodle bằng SQL |
| Hợp đồng, đơn giá, nghiệm thu | App `corporate` | Không liên quan `Order`/`Payment` |
| Email | `notifications` (mở rộng) | Thêm CC/BCC, liên kết lô gửi B2B |
| Kết quả đã phát hành | `corporate.ResultSnapshot` | Không tự đổi khi dữ liệu nguồn thay đổi; sửa = phiên bản mới |

### 3.2. Dùng chung `LmsEnrollment` thay vì làm bảng song song

```
LmsEnrollment
  order                 OneToOne crm.Order            null=True   (B2C)
  corporate_enrollment  OneToOne corporate.CorporateEnrollment  null=True   (B2B)
  CheckConstraint: đúng một trong hai khác null
  accessors: learner_email, learner_name, course, cohort, is_corporate
```

- `lms/services.py: process / target_course / ensure_user / provision_cohort` đọc qua accessor, không đọc `order`
  trực tiếp.
- `completion.py`, `learning.py`, `webhooks.py`, `Certificate` chạy y nguyên cho cả hai loại.
- Phân nhánh bắt buộc: B2B **không** nhận email hành trình B2C (`send_access_email`, `run_journeys`, nhắc trả góp,
  thư thanh toán); B2B có thư mời và thư mở lớp riêng. `revoke_access` của B2B kích hoạt khi hủy/chuyển lớp, không
  phải khi hoàn tiền.
- Báo cáo B2C trong `core/reports.py` lọc `order__isnull=False`.
- Migration: thêm cột, nới `null`, thêm constraint. Dữ liệu hiện có đều có `order` nên không cần backfill.

### 3.3. Lớp B2B dùng `Cohort` có cờ đối tượng

- `Cohort.audience`: `public` (mặc định) | `corporate`.
- Mọi truy vấn công khai và tuyển sinh chỉ lấy `public`: API công khai, `intakes.JOINABLE` / `refresh_statuses`,
  `seats_taken`, chiến dịch, checkout, sitemap, `/app` mục tuyển sinh. Nên gom vào một manager (`Cohort.objects.public()`)
  để không sót.
- Sĩ số lớp B2B = số `CorporateEnrollment` còn hiệu lực; không dùng giữ chỗ checkout.
- `CorporateClass` (1–1 `Cohort`) giữ hợp đồng, dòng kế hoạch, PIC, chính sách hoàn thành, trạng thái B2B, mốc chốt.
- Nếu tuần 1 phát hiện vòng đời lớp B2B xung đột không cô lập được (ví dụ trạng thái `Cohort` tự đổi theo hạn đăng
  ký), cho `refresh_statuses` bỏ qua `corporate` thay vì sửa logic bán hàng.

### 3.4. Ranh giới doanh thu

- **B2C:** `Order` → `Payment` / `Refund`.
- **B2B:** `ServiceContract` → `AcceptanceBatch/Line` → (GĐ2) `Receivable` + tiền thu; chi phí qua `Expense`.
- Dashboard tách cột: "tiền đã thu (B2C)", "giá trị hợp đồng", "giá trị nghiệm thu", "đã xuất hóa đơn" (GĐ2). Không
  cộng các loại này thành một con số.

## 4. MA TRẬN 22 NHÓM NGHIỆP VỤ

**Loại:** T tái sử dụng · M mở rộng · N mới. **Mức trong 08 tuần:** Đủ = chạy trên hệ thống, có test ·
Tối thiểu = luồng chính, chưa có cấu hình nâng cao · Thủ công = ghi nhận/đính kèm có nhật ký, chưa tự tính · GĐ2 =
sau 08 tuần.

| # | Nhóm | Nền tảng có sẵn | Cách làm | Loại | Mức 08 tuần |
|---|---|---|---|---|---|
| 01 | Khách hàng & hợp đồng | – (`Partner` là đối tác website) | `CorporateClient`, `ClientUnit`, `ServiceContract` (phụ lục = phiên bản), `ContractRate` | N | Đủ |
| 02 | Yêu cầu & SLA | `crm.FollowupTask` | Yêu cầu đào tạo ghi thành `TrainingTask` loại "yêu cầu"; chưa đo SLA | M | Thủ công |
| 03 | Kế hoạch đào tạo | – | `TrainingPlan` (có phiên bản) + `PlanLine`, import Excel | N | Đủ |
| 04 | PIC & công việc | `accounts.User` | PIC trên lớp; `TrainingTask` (hạn, nhắc qua job hằng ngày) | M+N | Tối thiểu |
| 05 | Khóa & chương trình | `Course`, `Instructor` | Dùng lại; nhóm lớp theo dòng kế hoạch, không cần model "dự án" riêng | T | Đủ |
| 06 | Giảng viên & nguồn lực | `Instructor`, `Cohort.lead_instructor` | Đơn giá giảng viên trong `ContractRate`/`Expense`; phòng/thiết bị ghi trên buổi (`location`) | M | Tối thiểu |
| 07 | Học viên & đăng ký | `crm.Learner` | `CorporateEmployee`, `CorporateEnrollment`, import có staging và chống trùng | M+N | Đủ |
| 08 | Lớp & buổi | `Cohort`, `CohortSession` | `Cohort.audience`, `CorporateClass`; chuyển lớp, học bù, hủy/hoãn buổi | T+M | Đủ |
| 09 | Điểm danh/check-in | `mod_attendance` + đồng bộ | QR xoay vòng của `mod_attendance`; `AttendanceAdjustment` cho đi muộn/vắng có phép/học bù | M | Đủ |
| 10 | Khảo sát | `mod_feedback` | Mẫu khảo sát chuẩn trong khóa mẫu Moodle; đọc kết quả qua WS | M | Đủ |
| 11 | Truyền thông | Email + Resend + webhook | To/CC/BCC, chính sách người nhận, lô gửi, xem trước, duyệt, gửi lại; ICS đính kèm | M | Đủ |
| 12 | Báo cáo sau đào tạo | Số liệu đồng bộ từ Moodle | `ResultSnapshot` có phiên bản; 4 góc nhìn (nội bộ, khách hàng, học viên, CBQL) | M+N | Đủ (xuất XLSX; PDF ở GĐ2) |
| 13 | Ngân sách & chi phí | – | GĐ1: `Expense` ghi chi phí thực tế theo lớp kèm chứng từ. GĐ2: dự toán/cam kết | N | Thủ công → GĐ2 |
| 14 | Mua sắm & nhà cung cấp | – | Nhà cung cấp là trường văn bản trên `Expense`; PO ở GĐ2 nếu thật sự cần | N | GĐ2 |
| 15 | Phân bổ chi phí | – | `CostAllocation` | N | GĐ2 |
| 16 | Nghiệm thu/quyết toán | – | `AcceptanceBatch`, `AcceptanceLine` (dòng điều chỉnh, không ghi đè), xuất mẫu MSB/ROX | N | Đủ |
| 17 | Hóa đơn/công nợ B2B | `InvoiceRequest` chỉ cho `Order` | `Receivable` (số hóa đơn phần mềm kế toán, đã thu, quá hạn) | N | GĐ2 (GĐ1: ghi số hóa đơn trên đợt nghiệm thu) |
| 18 | Hồ sơ & template | Upload R2, mẫu email | `ClassDocument` (phiên bản), checklist hồ sơ theo hợp đồng; mẫu XLSX trong `ImportTemplate`/mẫu xuất | M+N | Đủ |
| 19 | Workflow/phê duyệt | RBAC, `AuditLog` | `ApprovalRequest` dùng chung cho: phát hành kết quả, gửi lô email, điều chỉnh điểm danh, nghiệm thu | M | Tối thiểu (1 cấp duyệt) |
| 20 | Cổng học viên/khách hàng/giảng viên | `/learn`, Moodle, `PartnerShare` | Học viên: `/learn` (sau khi sửa SSO). Giảng viên: Moodle. Khách hàng: `ClientShare` link có hạn, chỉ đọc | M | Tối thiểu |
| 21 | BI & dashboard | `core/reports.py`, `OverviewReportsPage` | Phân đoạn B2B, từ điển KPI, xuất XLSX | M | Tối thiểu |
| 22 | Quản trị, audit, AI | RBAC, audit, CI, health | Quyền `corporate.*`, audit mọi thao tác chốt/gửi/điều chỉnh, cảnh báo đối soát; AI không làm trong GĐ1 | M | Tối thiểu |

**Đường găng:** sửa SSO + `LmsEnrollment` dùng chung → import DSHV → QR điểm danh → snapshot kết quả → email CC
đúng người → xuất nghiệm thu MSB/ROX.

## 5. MÔ HÌNH DỮ LIỆU

### 5.1. Model mới trong `apps/corporate`

| Cụm | Model | Quy tắc cốt lõi | GĐ |
|---|---|---|---|
| Khách hàng | `CorporateClient` | Tenant; tên miền email được phép nhận CC; cấu hình CC mặc định | 1 |
| | `ClientUnit` | Cây pháp nhân/đơn vị (`parent`, `kind`: pháp nhân/phòng ban) | 1 |
| | `CorporateEmployee` | `learner`, `client`, `unit`, `employee_code`, `manager` (→ `CorporateEmployee`), `valid_from/valid_to`. Duy nhất: (pháp nhân, mã CBNV, khoảng hiệu lực). Đổi CBQL = dòng mới, không sửa dòng cũ | 1 |
| Hợp đồng | `ServiceContract` | Số HĐ, khách hàng, hiệu lực, `amends` (phụ lục trỏ HĐ gốc), file đính kèm | 1 |
| | `ContractRate` | Loại đơn giá (lớp/học viên/buổi/giờ/trọn gói), số tiền VND, thuế, hiệu lực; không lấy `Course.price` | 1 |
| Kế hoạch | `TrainingPlan` | Khách hàng, năm/kỳ, `version`, trạng thái, file gốc. Sửa sau duyệt = phiên bản mới | 1 |
| | `PlanLine` | Khóa, đơn vị, thời gian dự kiến, chỉ tiêu, ngân sách dự kiến, PIC | 1 |
| Lớp | `CorporateClass` | 1–1 `Cohort`; HĐ, dòng kế hoạch, PIC, `completion_policy` (JSON: % chuyên cần, điểm, khảo sát), trạng thái B2B, `locked_at` | 1 |
| | `CorporateEnrollment` | Lớp × nhân sự, duy nhất; trạng thái: mời/đã ghi danh/chuyển lớp/hủy/hoàn thành/không đạt; `transferred_from` | 1 |
| | `AttendanceAdjustment` | Ghi danh × buổi, trạng thái được công nhận, lý do, bằng chứng, người duyệt | 1 |
| | `TrainingTask` | Lớp hoặc HĐ, loại, người làm, hạn, trạng thái | 1 |
| Import | `ImportTemplate` | Khách hàng × loại file (kế hoạch/DSHV/nghiệm thu), ánh xạ cột, `version` | 1 |
| | `ImportBatch` | File gốc, fingerprint, các dòng staging (JSON), lỗi theo dòng, trạng thái (đã tải → đã kiểm → đã nhập), người nhập | 1 |
| Kết quả | `ResultSnapshot` | Lớp, `version`, số liệu từng học viên (chuyên cần sau điều chỉnh, điểm, khảo sát, hoàn thành), KPI lớp, người phát hành. Bất biến sau khi phát hành | 1 |
| Truyền thông | `CommunicationBatch` | Lớp, loại thư, mẫu (khóa tại thời điểm duyệt), snapshot, trạng thái duyệt/gửi | 1 |
| | `CommunicationRecipient` | Một dòng = một thư: To, CC, BCC (snapshot lúc duyệt), `EmailLog`. Idempotency `(lô, người học, loại thư)` | 1 |
| Nghiệm thu | `AcceptanceBatch` | HĐ, kỳ, trạng thái, mẫu xuất, số hóa đơn tham chiếu (GĐ1), file đã xuất | 1 |
| | `AcceptanceLine` | Lớp/dịch vụ, khối lượng (lấy từ snapshot), đơn giá, thành tiền; `kind=adjustment` cho điều chỉnh | 1 |
| Hồ sơ | `ClassDocument` | Gắn lớp/HĐ/đợt nghiệm thu, loại, `version`, khóa file R2 riêng tư; checklist theo HĐ | 1 |
| Duyệt | `ApprovalRequest` | Đối tượng (generic), hành động, người đề nghị/duyệt, trạng thái, ghi chú | 1 |
| Cổng khách hàng | `ClientShare` | Token, khách hàng (tùy chọn: lớp), hết hạn, nhật ký xem | 1 |
| Tài chính | `Expense` | `kind`: chi phí/tạm ứng/hoàn ứng; nhà cung cấp (văn bản), số tiền, thuế, lớp/HĐ, chứng từ. Tạm ứng không tính là chi phí | 1 (tối thiểu) |
| | `Budget` + `BudgetLine` | Dự toán/cam kết theo hạng mục | 2 |
| | `CostAllocation` | Tổng phân bổ ≤ khoản gốc; chốt kỳ | 2 |
| | `Receivable` | Nghiệm thu → hóa đơn → đã thu → còn phải thu | 2 |

Tiền VND dùng `PositiveBigIntegerField` (đồng), giống `Course.price`. Thuế lưu riêng; không lưu số tiền dạng float.

### 5.2. Thay đổi model hiện có

| Model | Thay đổi |
|---|---|
| `lms.LmsEnrollment` | `order` null; thêm `corporate_enrollment` (OneToOne, null); `CheckConstraint` đúng một; accessor (mục 3.2) |
| `catalog.Cohort` | `audience` (`public`/`corporate`, mặc định `public`, có index); manager `public()` |
| `notifications.EmailLog` | `cc`, `bcc` (JSON list), `reply_to`; `order` giữ nullable; liên kết ngược từ `CommunicationRecipient` |
| `notifications.EmailTemplate` | `brand` (`twings`/`tntalent`), `audience` (B2C/B2B) để lọc mẫu |

### 5.3. Nguyên tắc bất biến

1. `Order`/`Payment` chỉ dành cho B2C. Không tạo đơn miễn phí giả để mở Moodle cho B2B.
2. Mọi API B2B lọc theo khách hàng ở **server**, qua một hàm dùng chung (`scoped_clients(user)`). Không tin
   `clientId` gửi từ frontend.
3. Một người có thể vừa là học viên cá nhân vừa là nhân viên khách hàng. Dữ liệu B2C của họ không hiện cho khách
   hàng; dữ liệu khách hàng này không hiện cho khách hàng khác.
4. `CohortSession` là lịch chuẩn. Điểm danh được công nhận = Moodle + `AttendanceAdjustment` đã duyệt; không đếm số
   lần quét.
5. Sau khi chốt: sửa = phiên bản/dòng điều chỉnh mới + audit; không ghi đè số đã phát hành.
6. Migration có kế hoạch rollback; mọi thay đổi chạm `lms`, `catalog`, `notifications`, `sso` phải giữ test B2C xanh.
7. Không thao tác DB Moodle bằng SQL từ Django; chỉ qua WS và `local_twings`.
8. Không commit file mẫu hay dữ liệu thật của khách hàng (repo công khai). Test và CI dùng dữ liệu giả có cùng cấu
   trúc.

## 6. QUY TRÌNH END-TO-END

**01** Khách hàng/HĐ/đơn giá → **02** Import kế hoạch, phân PIC → **03** Tạo lớp (`Cohort audience=corporate` +
`CorporateClass`) và buổi → **04** Import DSHV + CBQL → **05** Thư mời + ICS → **06** Ghi danh Moodle
(`CorporateEnrollment` → `LmsEnrollment`), học viên vào `/learn` bằng SSO → **07** Điểm danh QR, kiểm tra, khảo sát
→ **08** Điều chỉnh, duyệt, chốt `ResultSnapshot` → **09** Báo cáo + lô email To/CC → **10** Hồ sơ, checklist →
**11** Nghiệm thu, xuất mẫu → **12** (GĐ2) chi phí, phân bổ, công nợ, đóng hồ sơ.

Trạng thái đào tạo, hồ sơ, báo cáo, nghiệm thu, thanh toán **độc lập**: lớp đã học xong vẫn có thể thiếu chứng từ
mà không làm sai số liệu học tập. Nghiệm thu phụ thuộc HĐ và snapshot, không chờ email học viên nếu HĐ không yêu cầu.

### 6.1. Import dữ liệu

- Đọc XLSX bằng `openpyxl` (chế độ read-only, giới hạn kích thước file và số dòng). Lưu file gốc ở bucket riêng tư.
- Ánh xạ cột theo `ImportTemplate` của khách hàng; không viết cứng vị trí cột trong code.
- Staging → kiểm tra → xem trước (thêm/sửa/bỏ qua/lỗi) → xác nhận. Chạy trong worker nếu file lớn.
- Chống trùng: fingerprint file + khóa nghiệp vụ (pháp nhân + mã CBNV; lớp + người học). Import lại không tạo bản
  ghi trùng.
- Ghép người học qua logic có sẵn của `crm/learners.py` (email → SĐT → CCCD). Khi email công ty khác email cá nhân
  đã có, hiện cảnh báo để người nhập quyết định, không tự gộp.
- CBQL lấy từ DSHV, tạo dòng `CorporateEmployee` mới khi đổi CBQL (ngày hiệu lực).
- File nghiệm thu chỉ nhập **khối lượng đề nghị/điều chỉnh**, không thay lịch sử điểm danh đã chốt.

### 6.2. Điểm danh bằng QR

- Giữ cơ chế hiện có: mỗi lớp một hoạt động `mod_attendance`, mỗi buổi một phiên (`lms/learning.py`).
- Thêm vào `local_twings` một hàm WS (ví dụ `local_twings_attendance_session_selfmark`) để bật/tắt cho một phiên:
  `studentscanmark`, `includeqrcode`, `rotateqrcode`, `autoassignstatus`. Đăng ký hàm trong
  `infra/lms/twings_setup.php` và thêm vào test hợp đồng (`tests/test_moodle_contract.py`, `lms_contract_check`).
- Giảng viên/PIC chiếu QR xoay vòng từ Moodle (hoặc nút "Mở QR buổi này" trong Class Workspace trỏ sang Moodle).
  Học viên quét, đăng nhập bằng SSO, được ghi nhận có mặt/đi muộn theo giờ.
- Sự kiện `attendance_taken_by_student` đã được `local_twings` gửi về TWings (ARCHITECTURE 10.2), không cần thêm
  đồng bộ.
- Đi muộn, về sớm, vắng có phép, điểm danh hộ, học bù: ghi `AttendanceAdjustment` có duyệt; KPI tính từ trạng thái
  đã công nhận.
- Kiểm tra trong tuần 1: thời gian xoay QR, hành vi khi học viên chưa đăng nhập, tải khi 50–100 người quét cùng lúc
  trên `lms` (4 worker Apache).

### 6.3. Khảo sát và báo cáo

- Tách đánh giá công khai sản phẩm (`CourseReview`, B2C) khỏi khảo sát chất lượng lớp doanh nghiệp.
- Đặt một hoạt động `mod_feedback` (ẩn danh khi khách hàng yêu cầu) trong khóa mẫu Moodle. Khi sao chép khóa theo đợt,
  khảo sát đi theo. Đọc kết quả bằng `mod_feedback_get_responses_analysis`, tỷ lệ phản hồi bằng
  `mod_feedback_get_non_respondents`.
- Từ điển KPI (lưu trong code + tài liệu, hiện ở dashboard): lượt học viên, học viên duy nhất, tỷ lệ tham gia theo
  người/buổi/giờ, tỷ lệ hoàn thành, tỷ lệ phản hồi, điểm hài lòng, giá trị nghiệm thu; (GĐ2) chi phí/học viên, công nợ.
- Báo cáo 4 góc nhìn sinh từ cùng một `ResultSnapshot`: nội bộ (đầy đủ); khách hàng (tập thể + từng nhân viên của
  khách hàng đó); học viên (kết quả cá nhân); CBQL (nhân viên thuộc quyền). Xuất XLSX; PDF ở GĐ2.

### 6.4. Truyền thông cuối khóa (bắt buộc)

- `resend.send_email(to, cc=None, bcc=None, reply_to=None, attachments=None, sender=None)`; Resend API hỗ trợ sẵn các
  trường này. Có test cho từng trường.
- Mặc định **mỗi học viên một thư**: To = học viên; CC = CBQL hiệu lực tại ngày gửi + CC cố định của khách hàng.
  Chính sách người nhận: mọi địa chỉ CC phải thuộc tên miền được phép của khách hàng hoặc tên miền nội bộ; địa chỉ
  ngoài danh sách bị chặn khi xem trước.
- Quy trình lô: tạo → xem trước danh sách người nhận và nội dung từng thư → duyệt (`ApprovalRequest`) → gửi trong
  worker. Người nhận và mẫu được snapshot lúc duyệt.
- Idempotency `(lô, phiên bản snapshot, người học, loại thư)`. Gửi lại/đính chính tạo lô mới trỏ lô cũ.
- Trạng thái: `queued` → `sent` → `delivered`/`bounced` qua webhook. Không coi `sent` là `delivered`. Giới hạn:
  Resend báo trạng thái theo thư, không theo từng người CC; ghi rõ trong UAT.
- Thương hiệu: `layout.wrap(html, brand=…)`; thư B2B dùng logo, màu, chân thư TNTalent và địa chỉ gửi đã xác minh
  DNS trên Resend (quyết định ở mục 12.2).
- Lịch học: đính kèm ICS. Lịch Outlook/Graph 2 chiều chỉ làm khi có quyền admin của khách hàng (GĐ2).

## 7. TÀI CHÍNH B2B VÀ NGHIỆM THU

| Chuỗi | GĐ1 (08 tuần) | GĐ2 | Biện pháp chống sai |
|---|---|---|---|
| Hợp đồng, đơn giá | Đủ: đơn giá theo lớp/học viên/buổi/giờ/trọn gói, phụ lục | Điều kiện tối thiểu, chiết khấu bậc | Phiên bản theo hiệu lực; không lấy `Course.price` |
| Nghiệm thu | Đủ: nhiều đợt, khối lượng từ snapshot, điều chỉnh có lịch sử, xuất mẫu MSB/ROX | – | Chỉ lấy từ `ResultSnapshot` đã phát hành; điều chỉnh là dòng mới |
| Chi phí | Thủ công: `Expense` theo lớp + chứng từ, biên lợi nhuận gộp theo lớp | Dự toán/cam kết/thực tế/đã trả | Mỗi khoản có lớp/HĐ, hạng mục, người duyệt |
| Tạm ứng/hoàn ứng | Thủ công: `Expense(kind=advance/settlement)` | Đối chiếu tự động | Tạm ứng không tính là chi phí |
| Phân bổ | – | `CostAllocation` theo lớp/giờ/người/tỷ lệ | Tổng phân bổ ≤ khoản gốc; chốt kỳ |
| Hóa đơn, công nợ | Ghi số hóa đơn trên đợt nghiệm thu | `Receivable`, đã thu, quá hạn | Không trộn với VietQR B2C |
| Quản trị | Giá trị HĐ, giá trị nghiệm thu theo lớp/HĐ | Biên đóng góp đầy đủ | Số quản trị, không phải sổ kế toán |

**Đầu vào bắt buộc tuần 1:** mẫu nghiệm thu MSB và ROX thật, bảng kê chi phí, checklist hồ sơ. Lưu ngoài repo (bucket
riêng tư hoặc thư mục dự án ngoài Git). Thiếu mẫu thì không thể nghiệm thu nhóm 16.

## 8. GIAO DIỆN, PHÂN QUYỀN, THƯƠNG HIỆU

**Menu `/app` → Đào tạo doanh nghiệp:** Tổng quan · Khách hàng & hợp đồng · Kế hoạch · Lớp học · Học viên & CBQL ·
Nghiệm thu · Hồ sơ · (GĐ2) Tài chính.

**Class Workspace** (tab): Tổng quan | Học viên | Buổi & điểm danh | Khảo sát & kết quả | Truyền thông | Hồ sơ |
Nghiệm thu | Lịch sử.

- Code ở `frontend/src/admin/pages/CorporatePages.tsx` (tách thêm file khi quá lớn), API client
  `frontend/src/lib/corporate.ts`, route lazy trong `AdminApp.tsx`. Dùng lại bảng, modal, filter hiện có.
- **Vai trò mới** "Đào tạo doanh nghiệp" (`corporate_training`) trong `accounts/rbac.py` và `frontend/src/utils/rbac.ts`.
  Quyền:
  `corporate.view`, `corporate.clients` (khách hàng, HĐ, đơn giá), `corporate.classes` (kế hoạch, lớp, DSHV),
  `corporate.import`, `corporate.attendance_adjust`, `corporate.results_publish`, `corporate.communications_send`,
  `corporate.acceptance`, `corporate.approve`, `corporate.share` (tạo link khách hàng), (GĐ2) `corporate.finance`.
  Kế toán có `corporate.view` + `corporate.acceptance` (+ `corporate.finance` ở GĐ2).
- **Phạm vi khách hàng:** GĐ1 nhân sự nội bộ có quyền `corporate.view` thấy mọi khách hàng (giống quyết định tư vấn
  viên thấy mọi lead). Mọi truy vấn vẫn đi qua `scoped_clients(user)` để sau này giới hạn theo khách hàng chỉ sửa
  một chỗ.
- **Bên ngoài:** học viên dùng `/learn`; giảng viên dùng Moodle (SSO giảng viên đã có); khách hàng dùng `ClientShare`
  (link có hạn, chỉ thấy dữ liệu khách hàng đó, có nhật ký xem). Không làm tài khoản khách hàng ở GĐ1.
- **Thương hiệu:** storefront giữ TWings. Thư, file xuất B2B dùng cấu hình thương hiệu TNTalent. Không đổi màu giao
  diện `/app` hay B2C.

## 9. KẾ HOẠCH 08 TUẦN

| Tuần | Kỹ thuật | Nghiệp vụ | Điểm kiểm soát |
|---|---|---|---|
| **1. Nền tích hợp** | Chạy toàn bộ pytest + e2e làm baseline. Refactor `LmsEnrollment` dùng chung (3.2). Sửa `identity_for_email` cho B2B. `Cohort.audience` + manager `public()` + lọc ở mọi chỗ công khai. Khung app `corporate`, vai trò, quyền. Thử QR `mod_attendance` thủ công. Kiểm tra lớp trên khóa chưa bán công khai | Bàn giao mẫu kế hoạch, DSHV, báo cáo, nghiệm thu MSB/ROX, chi phí. Chốt định nghĩa KPI, điều kiện hoàn thành | Test B2C xanh. Test mới: đăng ký B2B giả → SSO cấp danh tính → ghi danh Moodle; lớp `corporate` không hiện ở API công khai |
| **2. Khách hàng & kế hoạch** | `CorporateClient`, `ClientUnit`, HĐ, đơn giá. `TrainingPlan`/`PlanLine`. Khung import (`openpyxl`, `ImportTemplate`, `ImportBatch`) áp cho kế hoạch. Tạo lớp B2B (`Cohort` + `CorporateClass`) + buổi. Class Workspace khung | Thử 2 bộ kế hoạch thật trên staging | Import kế hoạch → tạo lớp, buổi, PIC; import lại không trùng |
| **3. DSHV & ghi danh** | `CorporateEmployee` (CBQL theo hiệu lực), import DSHV, chống trùng người học. `CorporateEnrollment` → `LmsEnrollment`. `resend.send_email` có CC/BCC/đính kèm; thư mời + ICS | Kiểm tra DSHV MSB/ROX, danh sách CBQL, người trùng | Học viên B2B vào được bài học qua `/learn`; thư mời đúng người; đơn B2C đã trả tiền vẫn học bình thường |
| **4. Điểm danh & khảo sát** | Hàm WS QR trong `local_twings` + test hợp đồng. `AttendanceAdjustment` + duyệt. Chuyển lớp, học bù, hủy ghi danh B2B. `mod_feedback` trong khóa mẫu + đọc kết quả. `completion_policy` | Chạy lớp giả lập nhiều buổi: đi muộn, vắng, học bù | Chuyên cần đã công nhận khớp Moodle + điều chỉnh; khảo sát có số liệu; quét lặp không đếm hai lần |
| **5. Kết quả & truyền thông** | `ResultSnapshot` (phát hành, phiên bản). `CommunicationBatch`/`Recipient`, chính sách CC, xem trước, duyệt, gửi lại. Khung thư theo thương hiệu. `ClientShare` | Chốt nội dung thư recap/kết quả, quy tắc CC từng khách hàng | Mỗi học viên một thư, CC đúng CBQL, không lộ email người khác; webhook cập nhật trạng thái; snapshot phát hành không tự đổi |
| **6. Nghiệm thu & hồ sơ** | `AcceptanceBatch`/`Line` từ snapshot × đơn giá, nhiều đợt, điều chỉnh. Xuất XLSX theo mẫu MSB/ROX. `ClassDocument` + checklist. `ApprovalRequest` cho nghiệm thu | Đối chiếu bảng nghiệm thu với Excel đang dùng | Xuất đúng 2 mẫu; điểm danh → snapshot → nghiệm thu khớp; điều chỉnh có lịch sử |
| **7. Dashboard & chi phí tối thiểu** | Phân đoạn B2B trong `core/reports.py` + trang tổng quan, từ điển KPI, xuất XLSX. `Expense` theo lớp + chứng từ. Cảnh báo đối soát (lớp đã chốt chưa nghiệm thu, thư bounce, thiếu hồ sơ). Job nhắc việc | UAT vòng 1 hồ sơ MSB end-to-end | Báo cáo B2C không đổi số; KPI B2B khớp snapshot |
| **8. E2E & hardening** | e2e Playwright cho luồng B2B trong CI (cùng mẫu `e2e/admissions_test.py`). Test bảo mật giữa khách hàng (API, link chia sẻ, email). Diễn tập khôi phục backup. Đo tải QR. Sửa lỗi, hướng dẫn sử dụng | UAT ROX end-to-end, ký checklist pass/fail | Đạt cổng go-live mục 11; danh sách giới hạn và backlog GĐ2 |

**Nhịp làm việc:** demo 30–45 phút cuối tuần; nghiệp vụ phản hồi trong 01 ngày làm việc; kỹ thuật 35–40 giờ/tuần,
nghiệp vụ 10–15 giờ/tuần. Đây là điều kiện của kế hoạch, chưa phải cam kết đã được bố trí.

**Giai đoạn 2 (4–6 tuần, sau UAT GĐ1):** ngân sách/dự toán/cam kết, tạm ứng-hoàn ứng đối chiếu, phân bổ chi phí,
công nợ/hóa đơn/thu tiền, PO và nhà cung cấp (nếu cần), PDF báo cáo, SLA yêu cầu, duyệt nhiều cấp, lịch Outlook, gợi
ý văn bản bằng AI (khi có chấp thuận dữ liệu).

**Nguyên tắc ưu tiên:**
- Không tự làm thứ Moodle đã có: ngân hàng đề, bài học, quiz, sổ điểm, điểm danh, QR, khảo sát.
- Không thêm ERP/BI/workflow độc lập, không thêm Redis/Celery/Metabase.
- AI không tự chốt chi phí, điểm danh hay nghiệm thu.

## 10. THAY ĐỔI MÃ NGUỒN CỤ THỂ

**Tạo mới:**

```
backend/apps/corporate/
    models.py            # tách thành package models/ khi quá lớn
    services/            # imports.py, enrollment.py, attendance.py, results.py, communications.py, acceptance.py
    exports.py           # XLSX theo mẫu (openpyxl)
    permissions.py       # scoped_clients(user)
    serializers.py
    views.py
    urls.py
    tasks.py
    migrations/
backend/tests/test_corporate_*.py
frontend/src/admin/pages/CorporatePages.tsx
frontend/src/lib/corporate.ts
e2e/corporate_test.py
lms/public/local/twings/   # hàm WS QR (classes/external/…, db/services.php, version.php)
```

**Sửa có giới hạn:**

| File/vùng | Thay đổi |
|---|---|
| `backend/apps/lms/models.py`, `services.py`, `completion.py`, `emails.py`, `tasks.py` | `LmsEnrollment` dùng chung, accessor, phân nhánh email B2C/B2B |
| `backend/apps/sso/services.py` | `identity_for_email` nhận `CorporateEnrollment` còn hiệu lực (`sync_account` tự theo) |
| `backend/apps/catalog/models.py`, `intakes.py`, `views.py`, `serializers.py` | `Cohort.audience`, manager `public()`, `seats_taken` theo loại |
| `backend/apps/crm/public_campaigns.py`, checkout, SEO/sitemap | Chỉ dùng `Cohort.objects.public()` |
| `backend/apps/notifications/resend.py`, `models.py`, `layout.py`, `views.py` | CC/BCC/reply-to/đính kèm/người gửi; `EmailLog.cc/bcc`; khung theo thương hiệu |
| `backend/apps/core/reports.py` | Lọc B2C `order__isnull=False`; thêm phân đoạn B2B |
| `backend/apps/core/schedule.py` | Job B2B (nhắc việc, đồng bộ khảo sát) có giới hạn tần suất |
| `backend/apps/accounts/rbac.py`, `frontend/src/utils/rbac.ts` | Vai trò `corporate_training`, quyền `corporate.*` |
| `backend/config/settings`, `staff_urls.py` | `INSTALLED_APPS`, mount `/api/v1/staff/corporate/…` |
| `frontend/src/admin/AdminApp.tsx`, `router.ts` | Nhóm menu, route lazy |
| `infra/lms/twings_setup.php` | Bật hàm WS QR của `local_twings` và các hàm `mod_feedback_*` cần dùng |
| `backend/requirements.in` / `requirements.txt` | Thêm `openpyxl` (khóa hash bằng `uv pip compile`) |
| `.github/workflows/ci.yml` | Job e2e B2B; test hợp đồng Moodle có hàm WS mới |
| `docs/ARCHITECTURE.md` | Thêm app `corporate`, ranh giới B2B, quyết định kiến trúc mới |

**Không làm:** đổi React/Django, tách microservice, cổng LMS thứ hai, sửa lõi Moodle (chỉ plugin), thay Resend bằng
Outlook, dùng `Order` miễn phí cho B2B, bảng `LmsEnrollment` song song, sổ check-in riêng trong Django.

## 11. UAT / ĐỊNH NGHĨA HOÀN THÀNH

| Kiểm thử | Kết quả bắt buộc |
|---|---|
| Hồi quy B2C | Đăng ký, checkout, VietQR, mã giảm giá, hoàn tiền, ghi danh Moodle, chứng chỉ, CRM, báo cáo B2C: test hiện có pass, số liệu báo cáo không đổi |
| Tạo B2B | Khách hàng, HĐ, kế hoạch, lớp, buổi; không phát sinh `Order`/`Payment`; lớp không hiện trên website/tuyển sinh |
| Import | Kế hoạch + DSHV MSB/ROX (dữ liệu giả cùng cấu trúc trong CI, file thật trên staging); import lại không trùng; lỗi theo dòng; lịch sử |
| SSO & Moodle | Học viên B2B đăng nhập `/learn`, vào được bài học; hủy/chuyển lớp khóa đúng quyền; `sync_account` không khóa nhầm; học viên B2C không bị ảnh hưởng |
| Điểm danh | QR xoay vòng; quét lặp không đếm hai lần; nhiều buổi, đi muộn, học bù, điều chỉnh có duyệt |
| Khảo sát | Ẩn danh khi cấu hình; mẫu số đúng; tách khỏi đánh giá công khai |
| Kết quả, báo cáo | 4 góc nhìn đúng quyền; xuất lại cùng phiên bản cho kết quả giống hệt |
| Truyền thông | Mỗi học viên một thư; CC đúng CBQL tại ngày gửi; địa chỉ ngoài chính sách bị chặn; phân biệt sent/delivered/bounced |
| Nghiệm thu | 2 mẫu MSB/ROX đúng định dạng đã duyệt; nghiệm thu một phần; điều chỉnh có audit |
| Bảo mật khách hàng | Link của MSB không xem/tải được dữ liệu ROX; API kiểm quyền ở server; email không chứa dữ liệu khách hàng khác |
| Backup & deploy | Migration trên PostgreSQL; khôi phục thử một lần; CI + deploy + rollback |
| Hiệu năng | Số người quét QR đồng thời theo tải thí điểm chốt tuần 1, không làm chậm checkout B2C |
| Bàn giao | Hướng dẫn sử dụng, sơ đồ dữ liệu, ma trận quyền, mẫu import/export, biên bản UAT, backlog GĐ2 |

**Cổng go-live:** không có lỗi P0 về rò dữ liệu giữa khách hàng, gửi nhầm email, số liệu nghiệm thu, tiền,
backup/khôi phục, hồi quy thu học phí. Mọi nhóm ở mức "Thủ công" hoặc "GĐ2" có phương án vận hành thay thế được lãnh
đạo và nghiệp vụ chấp nhận.

## 12. RỦI RO VÀ QUYẾT ĐỊNH CẦN CHỐT

### 12.1. Rủi ro

| Rủi ro | Đối sách |
|---|---|
| Một người làm toàn bộ kỹ thuật | Một repo, PR nhỏ, CI, không thêm hạ tầng; phạm vi theo mục 4 |
| Refactor `LmsEnrollment`/SSO làm hỏng B2C | Làm tuần 1, baseline test trước, test hồi quy riêng cho thanh toán → Moodle → chứng chỉ |
| Sót chỗ công khai khi thêm `Cohort.audience` | Một manager `public()`; test API công khai, sitemap, checkout với lớp `corporate` |
| Moodle vendor subtree lớn | Chỉ sửa `local_twings`, tăng version, chạy `vendor.py check` |
| QR quá tải `lms` (4 worker Apache) | Đo tải tuần 1; xoay QR vừa phải; chia nhóm quét nếu cần |
| RAM VPS dùng chung 6 GB | Không thêm dịch vụ; import/xuất file chạy trong worker; giới hạn kích thước file |
| Mẫu Excel MSB/ROX thay đổi | `ImportTemplate` + mẫu xuất có phiên bản; không viết cứng cột |
| Chưa có staging | Điều kiện khởi động; không thử email/QR với dữ liệu thật trên production |
| Repo công khai | Không commit dữ liệu, mẫu thật, tên người học; tài liệu nghiệp vụ nhạy cảm để ngoài repo |
| Gửi nhầm To/CC | Chính sách tên miền, xem trước, duyệt, một thư mỗi học viên |
| Thiếu dữ liệu điểm danh/khảo sát | Snapshot ghi trạng thái "thiếu/chờ xác minh"; không tự bù số |
| TMS cho TNTalent nhưng repo mang thương hiệu TWings | Thương hiệu là cấu hình thư/file xuất; không đổi tên miền, pháp nhân B2C |

### 12.2. Quyết định cần chốt trước tuần 2

1. Học viên B2B có được cấp chứng chỉ `TWC-…` không, hay theo từng HĐ (cờ trên `CorporateClass`)?
2. Địa chỉ gửi thư B2B (tên miền TNTalent hay TWings) và ai cấu hình DNS cho Resend.
3. Người duyệt: phát hành kết quả, điều chỉnh điểm danh, gửi lô email, nghiệm thu.
4. Staging: dựng thêm một stack trên VPS (tốn RAM) hay dùng máy riêng/tạm thời.
5. Tải thí điểm: số học viên mỗi lớp, số lớp chạy song song, số người quét QR cùng lúc.
6. Danh sách CC mặc định và tên miền được phép của MSB, ROX.

### 12.3. Trách nhiệm

**Người phát triển:** kiến trúc, DB, API, frontend, Moodle/email, test, CI/CD, bảo mật, vận hành thí điểm, hướng dẫn.

**Cán bộ nghiệp vụ:** cung cấp và chốt file nguồn, KPI, điều kiện điểm danh/hoàn thành/nghiệm thu, duyệt nội dung
thư và báo cáo, kiểm thử hằng tuần, ký xác nhận.

**Lãnh đạo:** phê duyệt chủ trương, cấp quyền hạ tầng/gửi mail, quyết định các mục 12.2, xác nhận nội dung pháp
lý/tài chính. Không lập PMO.

### 12.4. Điều kiện khởi động (tuần 1)

1. Quyền GitHub (nhánh, Actions), truy cập log.
2. Môi trường staging không dùng dữ liệu thật khi thử QR/email.
3. Một bộ kế hoạch + DSHV có CBQL/CC, một file điểm danh, một khảo sát, một báo cáo sau học (lưu ngoài repo).
4. Đúng mẫu nghiệm thu MSB và ROX, bảng kê chi phí, checklist hồ sơ, ít nhất một tình huống đối soát.
5. Trả lời các câu hỏi ở mục 12.2.

## 13. ĐỀ NGHỊ PHÊ DUYỆT

- Dùng repository TWings-Academy làm nền tảng và nguồn mã duy nhất cho TMS B2B.
- 08 tuần, 01 phát triển + 01 nghiệp vụ, phạm vi GĐ1 theo ma trận mục 4; GĐ2 tài chính 4–6 tuần sau UAT GĐ1.
- Cho phép refactor có kiểm soát `LmsEnrollment`, SSO, `Cohort`, email để dùng chung cho B2B, với điều kiện test hồi
  quy B2C luôn xanh.
- Cho phép dùng biểu mẫu/dữ liệu MSB/ROX trên staging theo thẩm quyền, không đưa vào repo công khai.
- Nghiệm thu theo ma trận 22 nhóm (đúng mức đáp ứng đã cam kết), bằng chứng UAT và cổng go-live; không nghiệm thu trên
  giao diện mô phỏng.

**Kết luận:** dùng lại Moodle (điểm danh QR, khảo sát), `LmsEnrollment`, SSO và hạ tầng sẵn có giúp 08 tuần tập trung
vào phần thực sự mới: dữ liệu doanh nghiệp, import, chốt kết quả, email có CC và nghiệm thu. Rủi ro lớn nhất là đầu
vào (mẫu MSB/ROX, quy tắc nghiệp vụ) và việc refactor phần lõi tuần 1, không phải số lượng màn hình.

## PHỤ LỤC A — NGUỒN KIỂM TRA (đường dẫn trong repo)

- Kiến trúc, LMS: `docs/ARCHITECTURE.md`, `docs/LMS.md`
- Danh mục, đợt học: `backend/apps/catalog/models.py`, `backend/apps/catalog/intakes.py`
- Người học, đơn: `backend/apps/crm/models.py`, `backend/apps/crm/learners.py`, `backend/apps/crm/partner.py`
- Ghi danh, đồng bộ: `backend/apps/lms/models.py`, `services.py`, `completion.py`, `learning.py`, `webhooks.py`, `overview.py`
- SSO: `backend/apps/sso/services.py`
- Email: `backend/apps/notifications/models.py`, `resend.py`, `layout.py`
- Phân quyền: `backend/apps/accounts/rbac.py`, `frontend/src/utils/rbac.ts`
- Báo cáo, lịch: `backend/apps/core/reports.py`, `backend/apps/core/schedule.py`
- Quản trị: `frontend/src/admin/AdminApp.tsx`
- Moodle: `lms/public/mod/attendance/` (QR: `db/install.xml`, `externallib.php`), `lms/public/mod/feedback/db/services.php`,
  `lms/public/local/twings/`, `infra/lms/twings_setup.php`
- Hạ tầng, CI: `infra/docker-compose.prod.yml`, `.github/workflows/ci.yml`, `e2e/`

*Các nhận định đúng tại commit `d8558ba71`. Trước khi code, xem diff từ mốc này.*
