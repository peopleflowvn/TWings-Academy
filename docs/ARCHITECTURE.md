# Kiến trúc hệ thống TWings Academy

Cập nhật 07/10/2026. Tài liệu gồm hai phần: **hiện trạng** (mục 1–8, đúng như code đang chạy) và
**kiến trúc đề xuất** (mục 9–12: đánh giá, kiến trúc đích, lộ trình, quyết định kiến trúc).
Vận hành chi tiết xem [DEPLOYMENT.md](DEPLOYMENT.md). Moodle trong repo xem [LMS.md](LMS.md).

## 1. Bối cảnh và nguyên tắc

TWings Academy là nền tảng **tuyển sinh, đào tạo và giới thiệu việc làm** cho nhân sự ngân hàng. Hệ thống phục vụ
hành trình 10 khâu: tiếp thị, tư vấn, thanh toán, nhập học, học tập, tốt nghiệp, giới thiệu việc làm và theo dõi
sau tuyển dụng.

Ràng buộc chi phối thiết kế:

| Ràng buộc | Hệ quả |
|---|---|
| Một VPS ARM64 (6 GB RAM, CPU dùng chung) chạy cùng sản phẩm khác, sau một gateway TLS dùng chung | Mọi container có giới hạn RAM và CPU, không mở cổng ra host, không thêm hạ tầng (Redis, broker…) khi chưa thật cần |
| Repo công khai | Secret chỉ nằm trên VPS và trong GitHub Environment. Log CI không in dữ liệu nhạy cảm. gitleaks chạy trên toàn bộ lịch sử |
| Nhóm phát triển nhỏ | Một monorepo, một pipeline, một cơ sở dữ liệu. Dùng tính năng có sẵn (Moodle, Django) trước khi tự viết |
| Dữ liệu cá nhân và tiền học phí | Server quyết định mọi quyền và mọi số tiền. Mã hóa trường nhạy cảm. Có audit log |

Nguyên tắc:
1. **Mỗi loại dữ liệu có đúng một nơi gốc** (mục 5). Hệ thống khác chỉ đọc hoặc nhận bản sao một chiều.
2. **Moodle làm việc của LMS** (nội dung, học, kiểm tra, điểm danh, sổ điểm). **TWings làm phần còn lại**
   (con người, tiền, đợt học, chứng chỉ, việc làm).
3. **Hỏng một phần không kéo sập cả hệ thống**: Moodle lỗi không được làm hỏng thanh toán. Mọi bước đồng bộ
   đều idempotent và có thử lại.
4. **Mặc định đóng**: quyền không khai báo là bị từ chối. Mạng nội bộ không ra Internet nếu không cần.

## 2. Kiến trúc hiện tại

```mermaid
flowchart LR
    U[Học viên / ứng viên] -->|HTTPS| GW
    S[Nhân sự nội bộ] -->|HTTPS| GW
    HR[HR ngân hàng đối tác] -->|HTTPS link có hạn| GW
    BANK[SePay / ngân hàng] -->|Webhook API key| GW
    RS[Resend] -->|Webhook Svix| GW
    subgraph VPS[VPS dùng chung · Docker Compose 'twings']
        GW[Gateway TLS dùng chung<br/>không thuộc TWings] --> WEB
        WEB[web · Caddy<br/>SPA React + định tuyến] -->|/api, /xac-minh, /bien-nhan,<br/>/doi-tac, bot SEO| API
        WEB -->|/learn| LMS[lms · Moodle 5.2<br/>Apache + PHP 8.3]
        API[backend · Django + DRF<br/>gunicorn] --> DB[(PostgreSQL 18<br/>DB twings + DB moodle)]
        LMS --> DB
        CRON[lms-cron · Moodle tasks] --> DB
        API -->|Web Service REST<br/>mạng nội bộ| LMS
        LMS -.->|OAuth2 SSO<br/>token / userinfo| API
        HOSTCRON[cron của host<br/>docker compose exec] -.-> API
    end
    API -->|S3 API| R2[(Cloudflare R2<br/>media · tài liệu riêng tư)]
    API -->|REST| RS
    LMS -->|SMTP| RS
    VPS -->|backup mã hóa age 02:30| BK[(R2 backup)]
```

| Thành phần | Công nghệ | Mã nguồn | Chạy ở |
|---|---|---|---|
| Website + CMS/CRM `/app` | React 19, TypeScript, Vite 8, Tailwind 4 | `frontend/` | Container `web` (Caddy). Bản sao tùy chọn trên Cloudflare Pages |
| API, trang Django, SSO | Django 6.1, DRF, gunicorn (2 worker × 4 thread) | `backend/` | Container `backend` (non-root, FS chỉ đọc) |
| LMS | Moodle 5.2.4, PHP 8.3, Apache (tối đa 10 worker) + 4 plugin + `local_twings` | `lms/` | Container `lms`, `lms-cron` |
| CSDL | PostgreSQL 18 (DB `twings` và `moodle`, role riêng) | – | Container `db`, volume `pgdata` |
| File | R2 (2 bucket) hoặc volume `appdata`. File Moodle trong volume `moodledata` | – | – |
| Email | Resend (API từ Django, SMTP từ Moodle) | – | – |
| CI/CD | GitHub Actions → GHCR (amd64 + arm64) → SSH forced-command → `deploy.sh` | `.github/`, `infra/` | – |

**Mạng Docker** (cô lập theo nhu cầu):

| Mạng | Thành viên | Ra Internet |
|---|---|---|
| `gateway` (ngoài) | web | – (chỉ gateway gọi vào) |
| `app` (internal) | web, backend, lms | Không |
| `data` (internal) | backend, db, lms, lms-cron | Không |
| `egress` | backend, lms, lms-cron | Có (Resend, R2, gói ngôn ngữ Moodle) |

**Định tuyến theo đường dẫn** trên mọi tên miền của trang (một bản build chạy được trên mọi tên miền, không cần CORS,
cookie luôn là first-party):

| Đường dẫn | Đích |
|---|---|
| `/`, `/khoa-hoc/…`, `/tin-tuc/…`, `/tai-khoan`, `/app/…` | SPA React. Bot xem trước link và bot tìm kiếm nhận HTML do Django render (`/_seo/…`) |
| `/api/v1/…` | Django API |
| `/xac-minh/…`, `/bien-nhan/…`, `/doi-tac/…`, `/sitemap.xml`, `/robots.txt` | Trang Django (chứng chỉ, biên nhận, trang cho HR đối tác) |
| `/learn/…` | Moodle. `/learn/webservice/*` trả 404 từ Internet |
| Tên miền `api-…` | Webhook (SePay, Resend), Django admin, `/media` khi không dùng R2 |

## 3. Mã nguồn (monorepo)

| Thư mục | Ngôn ngữ | Nội dung |
|---|---|---|
| `backend/` | Python | 9 app Django (mục 4), lệnh định kỳ, test (pytest) |
| `frontend/` | TypeScript | `storefront/` (website), `admin/` (CMS/CRM `/app`), `components/`, `lib/` |
| `lms/` | PHP | Moodle 5.2.4 + plugin bên thứ ba (git subtree) + `public/local/twings` (plugin TWings) |
| `infra/` | Shell, Caddyfile, PHP config | `caddy/`, `lms/` (Dockerfile, config, `vendor.py`, `patches.txt`), `vps/` (deploy, backup), `ops/`, `env/*.example` |
| `docs/` | Markdown | Kiến trúc, triển khai, LMS |

Python, PHP và TypeScript không gọi lẫn nhau trong cùng tiến trình. Chúng chỉ giao tiếp qua **hợp đồng HTTP**: REST API
của Django, Web Service của Moodle, OAuth2. Nhờ vậy mỗi phần build, test và nâng cấp độc lập.

## 4. Backend: các app Django

| App | Trách nhiệm | Model chính |
|---|---|---|
| `core` | Middleware bảo mật, mã hóa trường, audit log, upload, health | `SiteConfig`, `AuditLog` |
| `accounts` | Nhân sự, 5 vai trò, ma trận quyền | `User` |
| `catalog` | Khóa học, chương trình, đợt khai giảng, lịch học, giảng viên, đối tác, trả góp, mã giảm giá, đánh giá | `Course`, `Cohort`, `CohortSession`, `ProgramCourse`, `InstallmentPlan`, `Coupon`, `CourseReview` |
| `cms` | Bài viết, banner, SEO, trang pháp lý, đo lượt xem không cookie | `Article`, `HeroBanner`, `PageViewDaily` |
| `crm` | Lead và đơn, chiến dịch, hoạt động, việc cần làm, lịch hẹn, hóa đơn VAT, trả góp, giới thiệu việc làm, link đối tác | `Order`, `AdmissionCampaign`, `Activity`, `FollowupTask`, `Appointment`, `Installment`, `Placement`, `PartnerShare` |
| `payments` | VietQR, webhook ngân hàng, xác nhận thủ công, hoàn tiền, biên nhận | `BankTransaction`, `Payment`, `Refund` |
| `notifications` | Mẫu email, gửi qua Resend, trạng thái giao nhận, email theo hành trình | `EmailTemplate`, `EmailLog`, `EmailEvent` |
| `lms` | Ghi danh Moodle, đợt học thành khóa Moodle, đồng bộ tiến độ/chuyên cần/điểm, rủi ro, chứng chỉ | `LmsEnrollment`, `Certificate` |
| `sso` | Nhà cung cấp OAuth2 cho Moodle, đăng nhập bằng mã email, tài khoản học viên | – (cache) |

API: tiền tố `/api/v1/` với các nhóm `health/`, `auth/` (cookie phiên + CSRF), `public/` (chỉ đọc, form có giới hạn
tần suất và honeypot), `staff/` (cookie phiên + CSRF + mã quyền RBAC), `webhooks/` (API key, chữ ký Svix),
`sso/` (OAuth2). JSON dùng camelCase, ngày dạng `dd/mm/yyyy`.

## 5. Ranh giới TWings ↔ Moodle

| Dữ liệu | Nơi gốc | Chiều đồng bộ | Cơ chế hiện tại |
|---|---|---|---|
| Danh tính (học viên, nhân sự, giảng viên) | TWings | TWings → Moodle | Tạo tài khoản qua WS. Đăng nhập SSO OAuth2 (TWings là nhà cung cấp) |
| Khóa học bán, giá, đơn, thanh toán | TWings | – | – |
| Đợt khai giảng, lịch học | TWings | TWings → Moodle | Sao chép khóa mẫu (`core_course_duplicate_course`), sự kiện lịch, phiên điểm danh |
| Ghi danh | TWings (đơn có quyền học) | TWings → Moodle | `enrol_manual_*` sau khi giao dịch DB commit. Lỗi thì cron thử lại mỗi 10 phút |
| Nội dung, bài kiểm tra, ngân hàng đề | Moodle | Moodle → web (chỉ tên chương) | Đề cương công khai qua `core_course_get_contents` |
| Điểm danh, điểm, hoàn thành | Moodle | Moodle → TWings | Đọc định kỳ mỗi 30 phút (`sync_lms_completion`) |
| Chứng chỉ, rủi ro học tập, việc làm | TWings | – | Tính từ dữ liệu đã đồng bộ |

Kênh tích hợp: (1) **Web Service REST**: backend gọi `http://lms:8080/learn` trên mạng nội bộ, token chỉ dùng được
từ IP nội bộ, vai trò quyền tối thiểu (`twings_setup.php`). (2) **OAuth2**: Moodle đổi mã lấy token qua tên miền công
khai. (3) **Đọc định kỳ** từ cron của host.

## 6. Luồng chính

```mermaid
sequenceDiagram
    participant B as Trình duyệt
    participant A as Django
    participant N as Ngân hàng / SePay
    participant M as Moodle
    B->>A: POST /public/checkout/ (khóa, thông tin, mã giảm giá, đồng ý điều khoản)
    A->>A: Tính giá từ DB, khóa dòng coupon, tạo Order
    A-->>B: Số tiền, nội dung CK = mã đơn, ảnh VietQR
    N->>A: POST /webhooks/bank/ (chống trùng theo id giao dịch)
    A->>A: Khớp mã đơn → Payment → learning_access / paid, gửi biên nhận
    A->>M: (sau commit) tìm/tạo user, ghi danh vào khóa của đợt
    A-->>B: Email "khóa học đã mở" + SSO
    B->>M: /learn → "Đăng nhập bằng TWings" (mã email)
    M->>A: OAuth2 token + userinfo
    Note over A,M: mỗi 30 phút: A đọc điểm danh / điểm / hoàn thành → rủi ro, chứng chỉ
```

Trình duyệt không bao giờ gửi số tiền. Mọi giá trị tiền đều đọc từ CSDL.

| Khâu | Module |
|---|---|
| 1 Tiếp thị | `cms` (SEO, bot prerender), nguồn khách UTM → `Order.attribution`, `PageViewDaily` |
| 2 Đợt khai giảng | `catalog.Cohort`, `refresh_intakes`, khóa Moodle riêng cho mỗi đợt |
| 3–4 Tư vấn | `crm` (giao lead, hạn phản hồi, lịch hẹn, việc cần làm) |
| 5 Thanh toán | `payments` (VietQR, trả góp, hoàn tiền, biên nhận, hóa đơn VAT) |
| 6 Nhập học | hồ sơ nhập học + CV (bucket riêng tư), danh sách lớp |
| 7–8 Học tập, tốt nghiệp | `lms` (điểm danh mod_attendance, sổ điểm, rủi ro, quy tắc chuyên cần, chứng chỉ `TWC-…`) |
| 9–10 Việc làm | `crm.Placement`, link `/doi-tac/<token>` cho HR, mốc thử việc và cam kết |

**Tác vụ định kỳ** (cron của host, `docker compose exec backend …`): `sync_lms_enrollments` (10 phút),
`sync_lms_completion` (30 phút), `refresh_intakes` (00:15), `remind_installments` (09:00), `run_journeys` (09:30),
`remind_appointments` (mỗi giờ 7–21h), `backup.sh` (02:30). Moodle có cron riêng trong `lms-cron`.

## 7. Phân quyền

- Ma trận quyền ở `backend/apps/accounts/rbac.py`, dùng chung mã quyền với frontend (`frontend/src/utils/rbac.ts`).
  Frontend chỉ ẩn hoặc hiện giao diện; **server quyết định**.
- 5 vai trò: Quản trị tối cao, Biên tập nội dung & SEO, Tư vấn tuyển sinh & CRM, Vận hành đào tạo & LMS,
  Kế toán & tài chính.
- Mỗi viewset khai báo `permission_map` theo action. Action không có trong map bị từ chối. Sửa đơn được kiểm tra theo
  nhóm trường (thanh toán, thưởng giới thiệu, phân công PIC).
- Moodle: nhân sự Đào tạo được gán vai trò *manager*, giảng viên là *editing teacher* của khóa đợt, học viên là
  *student*. Tài khoản tích hợp `twings_ws` chỉ dùng được qua Web Service.

## 8. Dữ liệu cá nhân và bảo mật

| Dữ liệu | Cách lưu |
|---|---|
| CCCD, hộ khẩu, nơi ở, số tài khoản ngân hàng | Mã hóa Fernet (`EncryptedTextField`). CCCD có blind index HMAC để phát hiện trùng |
| Họ tên, SĐT, email | Văn bản thường (cần tìm kiếm). Chỉ API nội bộ có quyền mới đọc được |
| Đồng ý xử lý dữ liệu, đồng ý điều khoản | Thời điểm và phiên bản trên hồ sơ. Moodle dùng cùng chính sách làm *site policy* |
| CV, hồ sơ nhập học | Bucket R2 riêng tư, link ký có hạn 5 phút |
| File CSV xuất ra | Không chứa trường mã hóa, chống chèn công thức, có audit log |
| Backup | `pg_dump` (2 DB) + `moodledata`, mã hóa `age`, lên R2 |

Container chạy non-root, `no-new-privileges`, `cap_drop: ALL`, FS chỉ đọc (trừ volume dữ liệu). Image ghim theo digest.
CI không dùng secret với PR.

## 9. Đánh giá kiến trúc hiện tại

**Điểm mạnh:** ranh giới rõ giữa thương mại (Django) và học tập (Moodle). Tích hợp chỉ qua API chính thức của Moodle.
Định tuyến một-tên-miền đơn giản và an toàn. Bảo mật nhiều lớp (mạng, quyền, mã hóa, secret). Một pipeline CI/CD có
health check và rollback. Mọi đồng bộ đều idempotent.

**Điểm cần cải thiện** (theo mức ảnh hưởng):

| # | Vấn đề | Hệ quả |
|---|---|---|
| 1 | Gọi Moodle **ngay trong tiến trình web** (`transaction.on_commit` sau thanh toán, khi lưu đợt khai giảng). Một lần sao chép khóa có thể mất hàng chục giây | Chiếm worker gunicorn (chỉ có 8 luồng), nhân viên chờ lâu. Moodle chậm thì website chậm theo |
| 2 | Moodle → TWings **chỉ đọc định kỳ** (30 phút) và gọi API **theo từng học viên** | Chứng chỉ và cảnh báo rủi ro trễ tới 30 phút. Số lượt gọi tăng tuyến tính theo số học viên |
| 3 | Tác vụ định kỳ nằm trong **cron của host** (`/etc/cron.d/twings-*`), lỗi bị nuốt (`>/dev/null`) | Cấu hình nằm ngoài Compose, khó quan sát, phải chạy lại `setup-shared` khi thêm lịch |
| 4 | **Vòng đời danh tính chưa khép kín**: quyền *manager* trên Moodle không bị thu hồi. Tài khoản Moodle `auth=manual` vẫn đặt lại được mật khẩu ngoài SSO | Nhân sự nghỉ việc có thể vẫn vào được LMS |
| 5 | SSO: Moodle gọi `token`/`userinfo` qua **tên miền công khai** (đi vòng ra gateway) | Phụ thuộc DNS và gateway cho một lời gọi nội bộ |
| 6 | **Ngân sách RAM** chưa khớp: Apache 10 worker × `memory_limit` 256 MB trong container 512 MB. Postgres dùng chung 320 MB và 50 kết nối | Có thể bị kill khi nhiều thao tác nặng chạy cùng lúc |
| 7 | **Quan sát** chỉ có log của container | Không có cảnh báo lỗi, không đo được độ trễ hay tác vụ thất bại |
| 8 | Giao diện Moodle (Boost mặc định) khác website | Trải nghiệm học viên không liền mạch |

## 10. Kiến trúc đề xuất

```mermaid
flowchart LR
    GW[Gateway TLS] --> WEB[web · Caddy]
    WEB --> API[backend · Django<br/>chỉ phục vụ request]
    WEB --> LMS[lms · Moodle<br/>theme_twings + local_twings]
    API -->|enqueue| Q[(Hàng đợi tác vụ<br/>bảng Postgres)]
    WK[worker · Django Tasks<br/>+ lịch định kỳ] -->|lấy việc| Q
    WK -->|Web Service REST| LMS
    LMS -->|sự kiện: hoàn thành, điểm,<br/>điểm danh · HMAC nội bộ| API
    LMS -->|OAuth2 token/userinfo<br/>http://backend:8000| API
    API --> DB[(PostgreSQL)]
    WK --> DB
    LMS --> DB
    CRON[lms-cron] --> DB
    API & WK & LMS -.-> OBS[Lỗi + uptime<br/>GlitchTip/Sentry, kiểm tra /health]
```

### 10.1 Hàng đợi tác vụ trên Postgres và container `worker` (ưu tiên 1)

- Dùng **Django Tasks** (`django.tasks`, có từ Django 6.0) với backend lưu trong CSDL (gói `django-tasks`,
  `DatabaseBackend`). **Không cần Redis hay broker**: hàng đợi là một bảng trong DB `twings`, có transaction cùng
  dữ liệu nghiệp vụ, và được backup cùng DB.
- Chuyển vào task: ghi danh hoặc hủy ghi danh Moodle, tạo khóa cho đợt, đẩy lịch học và điểm danh, gửi email,
  đồng bộ học tập. View chỉ `enqueue` sau commit và trả lời ngay.
- Container `worker` (cùng image backend, khoảng 192 MB) chạy `db_worker` và **lịch định kỳ** thay cho cron của host.
  Mọi lịch nằm trong code và Compose. `setup-shared` không còn phải ghi `/etc/cron.d`. Lỗi được ghi vào bảng task
  và hiện trên /app.

### 10.2 Moodle báo sự kiện cho TWings (ưu tiên 1)

- Plugin `local_twings` đăng ký observer cho `\core\event\course_completed`, `\core\event\user_graded`, sự kiện điểm
  danh của `mod_attendance` và thay đổi ghi danh. Observer chỉ ghi một **adhoc task** của Moodle (không chặn request
  của giáo viên). Task này `POST` tới `http://backend:8000/api/v1/webhooks/lms/` trên mạng nội bộ, ký HMAC, có
  thử lại.
- TWings xử lý ngay (chứng chỉ, rủi ro, email chúc mừng). **Đọc định kỳ giữ lại thành đối soát hằng đêm**, đề
  phòng sự kiện bị mất.
- Kết quả: chứng chỉ gần như tức thì, số lượt gọi Moodle giảm từ mỗi học viên mỗi 30 phút xuống theo sự kiện thực tế.

### 10.3 TWings là nhà cung cấp danh tính duy nhất (ưu tiên 1)

- Tài khoản Moodle của học viên, giảng viên và nhân sự dùng `auth=oauth2`: không còn email mật khẩu Moodle, không
  "quên mật khẩu" ngoài SSO. Chỉ giữ một tài khoản `admin` khẩn cấp với mật khẩu.
- Khi nhân sự bị khóa hoặc đổi vai trò, khi đơn bị hoàn hay hủy: task `suspend` tài khoản Moodle và gỡ *manager*.
  Tất cả ghi vào audit log.
- `token_endpoint` và `userinfo_endpoint` trỏ vào `http://backend:8000` (thêm `backend` vào `ALLOWED_HOSTS`). Chỉ
  `authorization_endpoint` cần tên miền công khai vì trình duyệt mở nó.
- Về sau: nâng SSO thành OpenID Connect đầy đủ (id_token, PKCE) để dùng lại cho ứng dụng khác của TWings.

### 10.4 Ngân sách tài nguyên trên VPS dùng chung (ưu tiên 1)

| Container | RAM hiện tại | Đề xuất | Ghi chú |
|---|---|---|---|
| db | 320 MB | 384 MB | `max_connections` 50 → giữ. Theo dõi kết nối của Moodle |
| backend | 448 MB | 384 MB | Bớt việc nặng nhờ đã chuyển sang worker |
| worker | – | 192 MB | 1 tiến trình, chạy tuần tự |
| lms | 512 MB | 512 MB | `MaxRequestWorkers` 10 → **4**, `memory_limit` giữ 256 MB |
| lms-cron | 256 MB | 256 MB | – |
| web | 64 MB | 64 MB | – |
| **Tổng** | 1,6 GB | 1,8 GB | Phần còn lại dành cho các sản phẩm khác trên host |

### 10.5 Trải nghiệm và chất lượng (ưu tiên 2)

- **`theme_twings`** (kế thừa Boost): dùng chung màu, font (Plus Jakarta Sans) và logo với website. Nên gom màu thương
  hiệu thành biến CSS dùng chung cho cả `frontend/` và theme. Header có liên kết về `/tai-khoan`. Quyết định có hỗ trợ ứng dụng Moodle Mobile hay
  không (nếu có thì mở `webservice/pluginfile.php` và `login/token.php` ở Caddy).
- **Một hệ chứng chỉ**: chứng chỉ do TWings cấp (`TWC-…`, có trang xác minh) là bản chính thức. Tắt `mod_customcert`
  trong khóa, hoặc chỉ dùng nó để in đúng mẫu `TWC-…`.
- **Test hợp đồng với Moodle thật**: bước CI đang cài Moodle từ đầu sẽ chạy thêm bộ test `apps.lms` của backend
  nhắm vào container đó. Mọi hàm Web Service mà backend dùng được kiểm tra trên đúng phiên bản Moodle trong `lms/`.
  Sửa lõi hoặc cập nhật Moodle mà làm hỏng tích hợp thì CI báo lỗi ngay.
- **Quan sát**: GlitchTip hoặc Sentry (bản SaaS, không tự host trên VPS) cho Django và frontend. Kiểm tra uptime cho
  `/`, `/api/v1/health/`, `/learn/`. Cảnh báo khi task worker hoặc task Moodle thất bại liên tục.
- **2FA (TOTP)** cho nhân sự, bắt buộc với Quản trị tối cao và Kế toán.

### 10.6 Khi quy mô tăng (ưu tiên 3: chỉ làm khi chạm ngưỡng)

| Ngưỡng | Bước |
|---|---|
| Postgres thường xuyên > 70% RAM hoặc CPU, hoặc DB > 20 GB | Tách Postgres sang máy riêng hoặc dịch vụ quản lý. Hai DB vẫn tách như hiện nay |
| `moodledata` > 30 GB (video, bài nộp) | Đưa file Moodle lên R2 bằng plugin object storage (`tool_objectfs`). Video nên để YouTube hoặc Stream |
| Cần nhiều hơn 1 node Moodle hoặc backend | Redis cho cache và session của Moodle (MUC), `moodledata` dùng chung, nhiều replica sau gateway |
| Hơn khoảng 2.000 học viên đang học cùng lúc | Tách LMS sang máy riêng. TWings và Moodle vẫn chỉ nói chuyện qua WS, sự kiện và OAuth2, nên không phải sửa code |

## 11. Lộ trình

| Giai đoạn | Việc | Kết quả đo được |
|---|---|---|
| **Ngay** (1–2 tuần) | 10.3 (thu hồi quyền, `auth=oauth2`, SSO nội bộ). 10.4 (worker Apache, RAM) | Không còn đường vào LMS ngoài SSO. Không OOM |
| **Tháng 1** | 10.1 (Django Tasks + worker, bỏ cron host). 10.2 (sự kiện Moodle → TWings) | Request web không gọi Moodle. Chứng chỉ < 1 phút sau khi hoàn thành |
| **Tháng 2** | 10.5 (theme, test hợp đồng, quan sát, 2FA) | Giao diện thống nhất. Lỗi tích hợp bị bắt ở CI. Có cảnh báo |
| **Khi chạm ngưỡng** | 10.6 | Theo bảng ngưỡng |

## 12. Các quyết định kiến trúc

| Quyết định | Lý do | Đã cân nhắc |
|---|---|---|
| Dùng Moodle cho LMS, không tự viết trong Django | Quiz, ngân hàng đề, sổ điểm, điểm danh, SCORM/H5P, ứng dụng di động là hàng chục năm-người công sức | Tự viết: tốn kém, kém tính năng |
| Mã nguồn Moodle **trong repo** (`lms/`, git subtree squash) | Tùy biến mọi chỗ, review và CI như code khác, vẫn gộp được bản vá bảo mật (`vendor.py update`) | Tải lúc build (khó tùy biến). Bản tách rời bỏ upstream (không vá được) |
| Tùy biến ưu tiên plugin (`local_twings`, `theme_twings`), sửa lõi phải khai báo (`patches.txt`) | Giữ chi phí nâng cấp thấp. Biết chính xác TWings lệch khỏi bản gốc ở đâu | – |
| Một Postgres, hai DB, role riêng | Một thứ để vận hành, backup và giám sát trên VPS nhỏ. Vẫn tách được khi cần | Hai cụm Postgres: tốn RAM |
| Hàng đợi trên Postgres (Django Tasks), không Celery/Redis | Không thêm dịch vụ. Transaction cùng dữ liệu. Đủ cho tải hiện tại | Celery + Redis: thêm 2 thành phần cần vận hành |
| Một tên miền, định tuyến theo đường dẫn | Không CORS. Cookie first-party. SSO và `/learn` cùng origin | Tên miền con riêng cho API và LMS |
| TWings là nhà cung cấp danh tính (OAuth2) cho Moodle | Một nơi quản lý con người và quyền. Học viên chỉ cần email | Moodle tự quản tài khoản: hai nơi, dễ lệch |
