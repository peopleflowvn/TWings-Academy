# Hướng dẫn triển khai Production

Hướng dẫn đưa hệ thống lên **Oracle Cloud VPS (Caddy + Docker) + GitHub Actions**. Cloudflare (R2, Pages) là tùy chọn.
Làm một lần theo đúng thứ tự dưới đây. Từ đó về sau, mỗi lần push lên `main` hệ thống sẽ tự triển khai.

| Tên miền | Trỏ tới | Phục vụ |
|---|---|---|
| `tuyensinh.twings.edu.vn` | IP VPS (A) | Trang tuyển sinh + CMS (React, Caddy phục vụ file tĩnh) |
| `api-tuyensinh.twings.edu.vn` | IP VPS (A) | API Django, sau Caddy (HTTPS Let's Encrypt) |

DNS của `twings.edu.vn` vẫn ở **Mắt Bão**; chỉ cần thêm 2 bản ghi trên, không đụng tới email hay bản ghi khác.

> **Nguyên tắc vàng:** secret chỉ nằm ở 3 nơi: tệp `.env` ở thư mục gốc repo trên máy quản trị (gitignored, có
> bản sao trong trình quản lý mật khẩu), tệp `/opt/twings/env/*.env` trên VPS (chmod 600) và mục *Secrets* của
> GitHub Environment `production`. Không bao giờ commit, không dán vào issue/PR/chat.

Ký hiệu dùng trong tài liệu: `<vps-ip>`, `<admin-key>` (khóa SSH quản trị của bạn).

---

## Bước 1 – Cloudflare (tùy chọn, làm sau cũng được)

Không có R2, ảnh upload được lưu trên VPS (volume `appdata`, phục vụ tại `https://api-tuyensinh.twings.edu.vn/media/`)
và backup mã hóa được giữ 14 ngày tại `/var/backups/twings`. Bật R2 để có backup ngoài VPS.

1. **R2** → tạo 3 bucket:
   - `twings-media`: ảnh công khai. *Settings → Public Development URL* → **Allow**; chép tên miền
     `pub-<id>.r2.dev` vào `R2_PUBLIC_DOMAIN`.
   - `twings-private`: tài liệu riêng tư (CV…). **Không** bật public access.
   - `twings-backups`: bản sao lưu CSDL. Thêm *Lifecycle rule* tự xóa sau 35 ngày.
2. **R2 → Manage API Tokens**: tạo 2 token riêng biệt, áp dụng nguyên tắc quyền tối thiểu:
   - `twings-app`: *Object Read & Write*, chỉ cho `twings-media` và `twings-private`.
   - `twings-backup`: *Object Read & Write*, chỉ cho `twings-backups`.
3. **Workers & Pages** → *Create* → *Pages* → *Direct Upload*, tên dự án `twings-academy`.
   *Custom domains* → thêm `tuyensinh.twings.edu.vn`; Cloudflare sẽ yêu cầu bản ghi CNAME ở bước 2.
4. **My Profile → API Tokens** → tạo token với quyền duy nhất **Account · Cloudflare Pages · Edit** (để CI upload frontend).

## Bước 2 – DNS tại Mắt Bão

| Loại | Tên | Giá trị | TTL |
|---|---|---|---|
| A | `tuyensinh` | `<vps-ip>` | 300 |
| A | `api-tuyensinh` | `<vps-ip>` | 300 |

Kiểm tra: `nslookup api-tuyensinh.twings.edu.vn 1.1.1.1` trả về `<vps-ip>`. Caddy chỉ xin được chứng chỉ
HTTPS khi bản ghi A đã có hiệu lực và cổng 80/443 đã mở (bước 4).

## Bước 3 – Khóa SSH cho CI (tạo trên máy của bạn)

```bash
ssh-keygen -t ed25519 -f .secrets/ci-deploy -C "github-actions-deploy" -N ""   # .secrets/ đã được gitignore
```

- `ci-deploy.pub`: chép lên VPS ở bước 4.
- `ci-deploy` (khóa riêng): dán vào GitHub Secret ở bước 6.
  Khóa này **chỉ** chạy được lệnh `deploy <sha>`: không có shell, không port-forward.
- Khóa quản trị `<admin-key>` của bạn **không bao giờ** đưa lên GitHub.

## Bước 4 – Chuẩn bị VPS (Ubuntu 22.04/24.04)

1. **Oracle Console → VCN → Security List**: ingress **TCP 22** (tốt nhất giới hạn theo IP của bạn),
   **TCP 80**, **TCP 443** và **UDP 443** (HTTP/3) từ `0.0.0.0/0`.
2. Từ máy của bạn (thư mục gốc repo):

```bash
scp -i <admin-key> -r infra ubuntu@<vps-ip>:/tmp/twings-infra
scp -i <admin-key> .secrets/ci-deploy.pub ubuntu@<vps-ip>:/tmp/ci-deploy.pub
ssh -i <admin-key> ubuntu@<vps-ip> 'sudo bash /tmp/twings-infra/vps/bootstrap.sh /tmp/ci-deploy.pub'
```

Script `bootstrap.sh` thực hiện:
- cài Docker, fail2ban và tự động cập nhật bảo mật;
- tắt đăng nhập SSH bằng mật khẩu và đăng nhập root;
- mở cổng 80/443 trên firewall của máy (iptables mặc định của Oracle chặn);
- tạo user `deploy` với khóa CI bị giới hạn bằng forced command;
- dựng cấu trúc `/opt/twings` (kèm Caddyfile) và lịch backup hằng đêm.

> **Kiểm tra trước khi đóng phiên SSH**: mở một cửa sổ mới và chạy `ssh -i <admin-key> ubuntu@<vps-ip>`
> để chắc chắn bạn vẫn đăng nhập được sau khi cấu hình SSH thay đổi.

## Bước 5 – Đưa secret lên VPS

Mọi giá trị production nằm trong phần **3. Production** của `.env` ở thư mục gốc repo, dưới dạng
`PROD_<FILE>__<BIẾN>`. Các khóa ngẫu nhiên (Django, mã hóa dữ liệu, webhook, mật khẩu DB, khóa `age`)
đã được sinh sẵn; bạn chỉ điền phần lấy từ dịch vụ ngoài (R2, Resend, số tài khoản nhận học phí).

```bash
python infra/vps/render_env.py "$TEMP/twings-env"        # sinh backend.env, db.env, caddy.env, backup.env
scp -i <admin-key> "$TEMP"/twings-env/*.env ubuntu@<vps-ip>:/tmp/twings-env/
ssh -i <admin-key> ubuntu@<vps-ip> 'sudo install -m 600 -o root -g root /tmp/twings-env/*.env /opt/twings/env/ && rm -rf /tmp/twings-env'
rm -rf "$TEMP/twings-env"
```

Script in ra những biến còn trống. Các giá trị chính trong `backend.env`:

| Biến | Giá trị |
|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` |
| `DJANGO_ALLOWED_HOSTS` | `api-tuyensinh.twings.edu.vn` |
| `DJANGO_CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` | `https://tuyensinh.twings.edu.vn` |
| `REAL_IP_HEADER` | `X-Real-IP` (Caddy ghi đè header này bằng IP thật của người truy cập) |
| `DATABASE_URL` | `postgres://twings_app:<APP_DB_PASSWORD>@db:5432/twings` |
| `R2_*` | token `twings-app`, endpoint `https://<account_id>.r2.cloudflarestorage.com`, `R2_PUBLIC_DOMAIN=pub-<id>.r2.dev` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` | từ Resend (bước 8) |
| `VIETQR_ACCOUNT_NUMBER`, `VIETQR_ACCOUNT_NAME`, `VIETQR_BANK_BIN` | tài khoản nhận học phí |

**Khóa sao lưu `age`**: VPS chỉ giữ khóa công khai (`AGE_RECIPIENT`). Khóa bí mật (`BACKUP_AGE_SECRET_KEY`
trong `.env`) dùng để khôi phục backup và tuyệt đối không đưa lên VPS.

> ⚠️ **Sao lưu file `.env` gốc vào trình quản lý mật khẩu.** Nếu mất `FIELD_ENCRYPTION_KEYS` và
> `BLIND_INDEX_KEY`, dữ liệu CCCD, địa chỉ và số tài khoản đã mã hóa sẽ không đọc lại được, kể cả khi còn
> backup; mất `BACKUP_AGE_SECRET_KEY` thì không giải mã được backup.

## Bước 6 – GitHub

**Settings → Environments → New environment `production`**:
- *Deployment branches*: chỉ `main`.
- *(Khuyến nghị)* *Required reviewers*: bạn, để mỗi lần deploy phải có người bấm duyệt.
- **Environment secrets**:

| Secret | Giá trị |
|---|---|
| `VPS_HOST` | `<vps-ip>` |
| `VPS_DEPLOY_SSH_KEY` | toàn bộ nội dung file `ci-deploy` (khóa riêng) |
| `VPS_KNOWN_HOSTS` | kết quả `ssh-keyscan -t ed25519 <vps-ip>`. Trước khi dán, đối chiếu vân tay với lệnh `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` chạy trên VPS |
| `CLOUDFLARE_PAGES_API_TOKEN` | token ở bước 1.4 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID của Cloudflare |

**Settings → Secrets and variables → Actions → Variables** (thông tin công khai, không phải secret):

| Variable | Giá trị |
|---|---|
| `API_BASE_URL` | `https://api-tuyensinh.twings.edu.vn` |
| `CF_PAGES_PROJECT` | `twings-academy` (bước 1.3) |

**Thiết lập bảo mật cho repo public:**
- *Settings → Actions → General → Fork pull request workflows*: chọn **Require approval for all external contributors**.
- *Settings → Branches*: bảo vệ `main`: cấm force-push và xóa nhánh. (Hiện đang push thẳng lên `main` để vừa
  triển khai vừa phát triển; Deploy vẫn chỉ chạy khi CI xanh. Khi có thêm người cùng làm, bật thêm "bắt buộc qua PR".)
- *Settings → Code security*: bật **Secret scanning + Push protection**, **Dependabot alerts**.

## Bước 7 – Lần triển khai đầu tiên

1. Push lên `main`. CI chạy; nếu xanh, workflow *Deploy* sẽ tự build image và triển khai.
2. Sau lần push image đầu tiên: *GitHub → Packages → twings-academy-backend → Package settings* → đổi sang **Public**
   (image không chứa secret). Nếu muốn giữ private, chạy `docker login ghcr.io` trên VPS bằng PAT chỉ có quyền `read:packages`.
3. Tạo tài khoản quản trị đầu tiên và nạp nội dung mẫu:

```bash
ssh -i <admin-key> ubuntu@<vps-ip>
cd /opt/twings
sudo docker compose exec backend python manage.py createsuperuser
sudo docker compose exec backend python manage.py seed_content
```

4. Kiểm tra: `https://api-tuyensinh.twings.edu.vn/api/v1/health/` trả về `{"status":"ok"}`, và trang
   `https://tuyensinh.twings.edu.vn` tải được khóa học.

## Bước 8 – Kết nối dịch vụ ngoài

- **Resend**: xác minh tên miền gửi thư (SPF/DKIM), tạo API key với quyền *Sending access*. Thêm Webhook URL
  `https://api-tuyensinh.twings.edu.vn/api/v1/webhooks/resend/` cho các sự kiện `email.sent`, `email.delivered`, `email.opened`,
  `email.clicked`, `email.bounced`, `email.complained`. Chép *Signing secret* vào `RESEND_WEBHOOK_SECRET`.
- **SePay** (hoặc dịch vụ báo biến động số dư tương thích): Webhook URL `https://api-tuyensinh.twings.edu.vn/api/v1/webhooks/bank/`,
  kiểu xác thực **API Key** = `BANK_WEBHOOK_API_KEY`, chỉ gửi giao dịch tiền vào.
- Sau khi đổi giá trị trong `.env`: chạy lại bước 5, rồi `cd /opt/twings && sudo docker compose up -d backend`.

---

## Chế độ máy dùng chung

Nếu VPS đã chạy sản phẩm khác và cổng 80/443 do một gateway Caddy dùng chung giữ, thì:

- **Không** chạy `bootstrap.sh`. Thay vào đó chạy Ops task `setup-shared` (`infra/vps/setup-shared.sh`).
  Task này chỉ cài age/rclone/jq, tạo user `deploy` và thư mục `/opt/twings`, không đụng tới Docker daemon,
  sshd, firewall hay timezone.
- Stack không publish cổng nào. Chỉ container `web` vào mạng Docker của gateway (alias `twings-web`).
  Backend và DB nằm trong mạng nội bộ, nên container của sản phẩm khác không truy cập được.
- Giới hạn tài nguyên: DB 320 MB, backend 448 MB (2 worker), web 64 MB. Cả ba có `cpu_shares` 512, tức
  sản phẩm khác được ưu tiên CPU khi máy bận.
- Thông tin riêng của máy (mạng, container và đường dẫn Caddyfile của gateway) nằm trong
  `/opt/twings/env/gateway.env`, được sinh từ `PROD_GATEWAY__*` trong `.env`. Các giá trị này **không** đưa vào git.
- Định tuyến: `infra/vps/bin/gateway-sync.sh` thêm một khối có đánh dấu vào Caddyfile của gateway, kiểm tra
  cấu hình rồi reload êm; nếu lỗi thì tự khôi phục file cũ. Script chỉ chạy khi DNS đã trỏ về VPS, và chỉ
  chạy khi chủ gateway đồng ý. Nếu sản phẩm kia deploy và ghi đè Caddyfile, chạy lại script này.

### Tên miền test và API cùng origin

Frontend được build với `VITE_API_BASE_URL=same-origin`, nên trang gọi `/api/...` trên chính tên miền
đang mở. Container `web` chuyển các request đó vào backend. Nhờ vậy cùng một bản build chạy được trên mọi
tên miền mà không cần CORS, và cookie đăng nhập luôn là cookie của chính tên miền đó.

`TEST_DOMAIN` (trong `caddy.env`) phục vụ y hệt trang chính trên một tên miền phụ. Dùng khi một mạng nào
đó chặn tên miền chính. Tên miền này trả header `X-Robots-Tag: noindex` và `robots.txt` chặn toàn bộ, nên
không bị Google index. Nhớ thêm tên miền này vào `DJANGO_ALLOWED_HOSTS` và `DJANGO_CSRF_TRUSTED_ORIGINS`.
`api-tuyensinh.…` vẫn được giữ cho webhook (SePay, Resend) và trang admin Django.

## LMS (Moodle)

Moodle 5.2 (image `twings-academy-lms`, `infra/lms/`) chạy tại `<tên miền>/learn` trên mọi tên miền của trang. Moodle
dùng chung Postgres với TWings (database `moodle` riêng); file của Moodle nằm trong volume `moodledata`.

- **Luồng học viên:** đơn chuyển sang "đã thanh toán" (webhook ngân hàng, kế toán xác nhận, hoặc CMS) → backend gọi
  Web Service của Moodle: tìm/tạo khóa (theo `idnumber` = id khóa TWings, hoặc `shortname` = slug khóa, nên có thể
  soạn sẵn khóa trên Moodle), tìm/tạo tài khoản theo email (Moodle tự gửi email mật khẩu), rồi ghi danh vai trò
  *student*. Lỗi được ghi ở `LmsEnrollment` và worker thử lại mỗi 10 phút (`sync_lms_enrollments`).
- **SSO "Đăng nhập bằng TWings":** dùng tính năng OAuth 2 có sẵn của Moodle, TWings đóng vai nhà cung cấp danh tính
  (`/api/v1/sso/`). Học viên nhập email, nhận mã 6 số qua Resend; chỉ email có đơn đã thanh toán mới nhận được mã.
  Nhân sự đang đăng nhập CMS thì vào thẳng. Moodle tự liên kết theo email (`requireconfirmation` tắt), nên tài khoản
  được tạo khi ghi danh dùng được ngay. Mỗi tên miền trong `MOODLE_HOSTS` có một issuer riêng, nên nút đăng nhập luôn
  trỏ tới tên miền mà mạng của người dùng truy cập được. Mật khẩu Moodle vẫn dùng được, làm phương án dự phòng.
- **Quản lý từ /app:** tab **Học Tập Trực Tuyến (LMS)** liệt kê từng khóa, đối chiếu đơn đã thanh toán với học viên
  thực có trên Moodle, cho xem tiến độ từng học viên và đánh dấu người chưa vào học quá 7 ngày. Trong chi tiết đơn,
  tab **Học Tập (LMS)** hiện tài khoản, % hoàn thành, điểm và lần truy cập; các thao tác gồm ghi danh lại, hủy ghi danh,
  tạm khóa/mở khóa, gửi email hướng dẫn vào học. Nút **Mở Moodle** đăng nhập bằng tài khoản CMS; nhân sự Đào tạo
  được gán vai trò *manager* của Moodle. Quyền: `lms.view` (Sales, Đào tạo), `lms.manage` (Đào tạo). Dữ liệu đọc
  trực tiếp từ Moodle, không lưu bản sao. Học viên đã bị hủy ghi danh sẽ không bị ghi danh lại khi có người sửa đơn.
- **Đợt khai giảng = khóa Moodle riêng:** mỗi khóa TWings có một *khóa mẫu* trên Moodle (soạn nội dung, ngân hàng đề
  một lần). Khi tạo một đợt (Cohort) trong /app, hệ thống sao chép khóa mẫu thành khóa riêng của đợt (không chép học
  viên), đặt ngày khai giảng, và gán giảng viên của khóa cùng giảng viên phụ trách đợt làm *editing teacher*. Đơn đã
  thanh toán được ghi danh vào khóa của đợt; khóa có chia đợt mà đơn chưa xếp đợt thì ở trạng thái **Chờ xếp lớp**
  và được ghi danh ngay khi được xếp. Chuyển đợt thì ghi danh được chuyển theo. Khóa không chia đợt học thẳng trong
  khóa mẫu (tự học). Giảng viên đăng nhập Moodle bằng mã gửi qua email (SSO).
- **Hoàn thành & chứng chỉ:** Moodle báo ngay khi hoàn thành (sự kiện, `local_twings`), worker đối soát 30 phút/lần; khi Moodle ghi nhận hoàn thành, TWings cấp chứng chỉ
  `TWC-XXXXXXXXXX` có trang xác minh công khai `/xac-minh/<mã>/`, cập nhật CRM và gửi email chúc mừng.
- **Mã nguồn trong repo** (`lms/`, xem [LMS.md](LMS.md)): lõi Moodle 5.2.4 và các plugin Attendance
  (điểm danh), Completion Progress (thanh tiến độ), Ad-hoc database queries (báo cáo SQL cho cán bộ quản lý), cùng
  plugin riêng `local_twings`. Chứng chỉ chính thức là `TWC-…` của TWings (không dùng plugin chứng chỉ của Moodle).
- **Giao diện và email:** theme `theme_twings` (`lms/public/theme/twings`), menu Trang chủ TWings / Học phí & hồ sơ
  (`local_twings`). Email của Moodle và của backend dùng chung khung TWings. Nội dung email tạo tài khoản / đặt lại mật
  khẩu của Moodle: `infra/lms/lang/vi_local/moodle.php` (sửa ở đây, không sửa trong trang quản trị Moodle).
- **Soạn nội dung:** đăng nhập `/learn` bằng `admin` (mật khẩu `PROD_LMS__MOODLE_ADMIN_PASSWORD` trong `.env`). Dùng
  các tính năng sẵn có của Moodle: bài giảng, video YouTube, quiz, bài tập, hoàn thành khóa học, huy hiệu.
- **Bảo mật:** `/learn/webservice/*` bị chặn từ Internet, chỉ backend gọi được qua mạng nội bộ. Token có giới hạn IP
  nội bộ và một vai trò quyền tối thiểu. Không ai tự đăng ký được (`registerauth` tắt, `forcelogin` bật). Cài đặt hoặc
  nâng cấp qua web cần `MOODLE_UPGRADE_KEY`; `deploy.sh` làm việc này bằng CLI. Thư mục code chỉ đọc nên không cài
  plugin qua web được.
- **Email:** cần SMTP (ví dụ Resend: `smtp.resend.com:587`, user `resend`, password = API key) trong
  `PROD_LMS__MOODLE_SMTP_*`. Thiếu SMTP thì học viên không nhận được email mật khẩu.
- **Nâng cấp Moodle / vá bảo mật:** `python infra/lms/vendor.py update core <commit> --ref <tag>` (merge 3 chiều,
  giữ chỉnh sửa của TWings; xem [LMS.md](LMS.md)). Giống migration, bước nâng cấp DB của Moodle không đảo ngược
  được khi rollback.
- **Backup:** `backup.sh` sao lưu DB `twings`, DB `moodle` và `moodledata` (bỏ cache), mã hóa `age`, đẩy lên R2.

## Tác vụ nền (worker)

- Container `worker` (cùng image backend) chạy `python manage.py db_worker`: hàng đợi `django.tasks` lưu trong Postgres
  (`django-tasks-db`). Ghi danh / hủy ghi danh Moodle, tạo khóa cho đợt, đồng bộ tài khoản Moodle được xếp hàng sau
  commit; các việc định kỳ (đồng bộ LMS, nhắc trả góp, email hành trình, trạng thái đợt…) theo lịch trong
  `backend/apps/core/schedule.py` (giờ Việt Nam). Chỉ `backup.sh` còn là cron của host.
- Chế độ hàng đợi do `TASKS_QUEUE=database` trong `docker-compose.prod.yml` bật cho backend và worker. File compose và
  việc gỡ cron cũ (`/etc/cron.d/twings-lms`, `twings-billing`) đến VPS qua ops **`setup-shared`**: sau khi deploy
  image có worker, chạy `setup-shared` rồi chạy lại **Deploy** để tạo container `worker`.
- Theo dõi: /app → Hệ thống → **Tình trạng tích hợp** (mục Tác vụ nền: việc quá hạn nghĩa là worker đã dừng; tác vụ lỗi
  7 ngày có nút Chạy lại; lịch các việc định kỳ). Chi tiết thêm: Django admin, log của container `worker`.

## Bán hàng: chương trình, trả góp, hoàn tiền, tài khoản học viên

- **Chương trình** (`/app` → Chương trình): nhiều khóa bán một giá. Khi học viên được học, mỗi khóa tự có một
  *đơn thành phần* (số tiền 0, gắn đơn gốc) để xếp lớp và ghi danh Moodle như mua lẻ. Trang bán: `/chuong-trinh`.
- **Trả góp**: bật ở khóa học/chương trình (số kỳ, khoảng cách ngày). VietQR luôn hiển thị số tiền *đến hạn*
  (kỳ kế tiếp). Đóng kỳ 1 là mở khóa học (`learning_access`); đóng đủ thì đơn chuyển "Đã thanh toán".
  Việc định kỳ `remind_installments` (09:00 hằng ngày, worker) gửi email nhắc trước hạn 3 ngày và tạo việc cần làm khi quá hạn.
- **Hoàn tiền** (quyền `finance.refund`, tab "Học phí & hoàn tiền" của đơn): ghi nhận sau khi đã chuyển trả.
  Hoàn toàn bộ (hoặc chọn kết thúc ghi danh) → đơn "Đã hoàn tiền", hủy ghi danh LMS, thu hồi chứng chỉ,
  áp dụng cho mọi khóa của chương trình. Chuyển khoản tới đơn đã hoàn không được ghi nhận tự động.
- **Cổng học viên** `/learn` (một cổng duy nhất): Moodle cho khóa học, bài học, điểm, lịch; trang
  **Học phí & hồ sơ** `/learn/tai-khoan` (do website phục vụ, có trong menu chính của Moodle nhờ `local_twings`)
  cho đơn, lịch trả góp + QR, hóa đơn VAT, hồ sơ nhập học, chứng chỉ, đánh giá, yêu cầu hoàn tiền (tạo việc ưu tiên
  cao). Đăng nhập bằng mã email, cùng phiên với SSO. Đường dẫn cũ `/tai-khoan` chuyển hướng 301 sang `/learn/tai-khoan`.

## Email tự động & báo cáo

- **Email theo hành trình** (`/app` → Email tự động theo hành trình), việc định kỳ `run_journeys` 09:30 hằng ngày (worker):
  nhắc hoàn tất thanh toán (đơn VietQR chưa chuyển sau 1–7 ngày), sắp khai giảng (3 ngày trước), nhắc bắt đầu
  học (7 ngày, tiến độ 0%), chúc mừng hoàn thành + gợi ý học tiếp. Mỗi đơn nhận mỗi email tối đa một lần
  (EmailLog `journey_<key>` là dấu đã gửi); bật/tắt từng hành trình, có nút gửi ngay.
- **Báo cáo** (`/app` → Báo cáo): doanh thu thuần theo tháng, còn phải thu và trả góp quá hạn, lead/chuyển đổi
  theo tháng và theo nguồn, doanh thu theo khóa/chương trình, kết quả học tập; xuất CSV từng bảng.
  Mỗi phần chỉ hiện với quyền tương ứng (tài chính / CRM / LMS).
- Thiết lập bán hàng ban đầu: ops task `seed-sales` (chạy một lần; chạy lại không thay đổi gì).

## SEO & chia sẻ mạng xã hội

- Mỗi trang có URL riêng: `/khoa-hoc`, `/khoa-hoc/<slug>`, `/chuong-trinh/<slug>`, `/ve-chung-toi`, `/tin-tuc`,
  `/tin-tuc/<slug>` (router: `frontend/src/lib/routes.ts`).
- Bot xem trước link (Facebook, Messenger, Zalo, X, LinkedIn, Telegram…) và bot tìm kiếm (Google, Bing,
  Cốc Cốc…) không chạy JavaScript: Caddy nhận diện User-Agent và chuyển sang Django `/_seo/<path>`, trả HTML có
  tiêu đề, mô tả, ảnh chia sẻ, canonical, JSON-LD (Course, Article, Breadcrumb) và nội dung chính
  (`backend/apps/cms/seo.py`). Người dùng vẫn nhận SPA, SPA lấy cùng metadata từ `/api/v1/public/seo/`.
- `/sitemap.xml` và `/robots.txt` do Django sinh (robots luôn chặn /app, /api, /learn, /tai-khoan).
  Địa chỉ chuẩn: `PUBLIC_SITE_URL` (mặc định https://tuyensinh.twings.edu.vn).
- Sau khi đổi ảnh/tiêu đề một trang đã từng được chia sẻ, Facebook giữ bản cũ trong cache: dùng
  https://developers.facebook.com/tools/debug/ → "Scrape Again".

- Trang pháp lý `/chinh-sach-bao-mat`, `/dieu-khoan`: bản mặc định trong `backend/apps/cms/legal.py`
  (cần pháp chế rà soát), thay được trong /app → Cài đặt SEO website. Moodle dùng cùng trang này làm
  "site policy" (học viên đồng ý khi đăng nhập LMS lần đầu; tài khoản tích hợp `twings_ws` được miễn).
- Đề cương công khai lấy từ Moodle: /app → Học viên & tiến độ → "Đề cương → web" (tên chương / hoạt động
  của khóa mẫu, không lấy nội dung bài; điền mô tả khóa nếu trống).

## Đợt khai giảng (hành trình khâu 2)

- /app → Đợt khai giảng & chỉ tiêu: mở / sửa đợt, sĩ số, hạn đăng ký, **giá đăng ký sớm** (áp dụng khi
  thanh toán tới hết hạn ưu đãi), đợt kế tiếp; tình hình chỗ / đã đóng phí / chờ thanh toán; chỉ tiêu chiến dịch.
- **Lịch học**: tạo nhanh theo mẫu (thứ trong tuần, giờ, số buổi), lưu là đẩy sang lịch khóa Moodle của đợt
  (`core_calendar_*`); xếp lại lịch thì sự kiện cũ trên Moodle được xóa.
- **Tự chuyển trạng thái** (`refresh_intakes` 00:15 hằng ngày + ngay sau mỗi thanh toán): đủ chỗ → Đã đủ sĩ số,
  quá hạn đăng ký → Đã đóng tuyển sinh, tới ngày khai giảng → Đang học; đợt đủ / đóng chuyển học viên chưa đóng
  phí sang đợt kế tiếp nếu bật.

## Tiếp thị & đo lường (hành trình khâu 3)

- **Nguồn khách**: trình duyệt giữ lần chạm đầu / cuối (utm_*, `?ref=`, trang giới thiệu, trang đích) 90 ngày
  trong localStorage và gửi kèm form đăng ký / thanh toán → `Order.attribution`; `utm_campaign` trùng mã chiến dịch
  tuyển sinh thì gắn luôn chiến dịch; `ref` → mã người giới thiệu. /app → Link chiến dịch (UTM) tạo link sẵn.
- **Lượt xem không cookie**: `POST /api/v1/public/track/` cộng bộ đếm theo ngày / trang / kênh (`PageViewDaily`, không IP,
  không định danh); trang Báo cáo có phễu lượt xem → lead → đóng phí theo kênh và theo khóa học.
- **Đánh giá thật**: học viên (đã ghi danh LMS) viết trong Tài khoản, đồng ý đăng → /app → Đánh giá của học viên duyệt
  → hiện trên trang khóa học với nhãn “Học viên đã học”.

## Tư vấn, thanh toán, nhập học (hành trình khâu 4–6)

- **Khâu 4**: lead website tự giao tư vấn viên (vai trò Tư vấn tuyển sinh, bật “nhận lead”; ít lead mở nhất, khách cũ
  giữ người cũ) + email báo + việc “Liên hệ lead mới”; hạn phản hồi `LEAD_RESPONSE_HOURS` (mặc định 4 giờ, tính trong
  8:00–20:00); lead quá hạn trên Tổng quan. Lịch hẹn tư vấn (email xác nhận; `remind_appointments` mỗi giờ 7–21h nhắc
  khách và tư vấn viên ~2 giờ trước). /app → Tư vấn & lịch hẹn.
- **Khâu 5**: thanh toán bắt buộc đồng ý Điều khoản (lưu thời điểm + phiên bản); mỗi khoản thu gửi **biên nhận**
  (`/bien-nhan/<token>/`, in / lưu PDF); yêu cầu **hóa đơn VAT** (lúc thanh toán hoặc trong Tài khoản) → /app → Hóa đơn
  theo yêu cầu (xuất trên phần mềm HĐĐT rồi ghi số).
- **Khâu 6**: học viên tự hoàn thiện **hồ sơ nhập học** + CV (kho riêng tư, nhân viên tải trong hồ sơ lead); email vào học
  kèm lịch lớp; /app → Đợt khai giảng → **Danh sách lớp** (học phí, hồ sơ thiếu, LMS, CSV).

## Học tập & tốt nghiệp (hành trình khâu 7–8)

- Lưu lịch học cho đợt sẽ tạo hoạt động **“Điểm danh”** (mod_attendance) trong khóa Moodle, mỗi buổi học thành một phiên điểm danh. Giảng viên điểm danh ngay trên Moodle.
- Việc định kỳ `sync_lms_completion` (30 phút/lần, worker; ngoài ra cập nhật ngay khi Moodle báo sự kiện) đọc từ Moodle: chuyên cần, điểm tổng (gradereport_user), lần vào khóa gần nhất. Hệ thống gắn mức **cần theo dõi** hoặc **có nguy cơ** khi có các dấu hiệu: không vào học ≥ 7 ngày, chuyên cần dưới mức, tiến độ chậm, điểm dưới 50%.
- /app → Học viên cần hỗ trợ: danh sách kèm nút gọi/Zalo, xuất CSV. Đợt khai giảng → “Học tập”: xem sổ điểm và gửi email thông báo cho cả lớp.
- Tốt nghiệp: khóa học có ngưỡng “chuyên cần tối thiểu” (mặc định 80%, 0 = không yêu cầu). Học viên đã hoàn thành nhưng thiếu chuyên cần sẽ bị giữ chứng chỉ; chứng chỉ tự cấp khi điểm danh được bổ sung. Có thể cấp ngoại lệ (bắt buộc ghi lý do, lưu vào lịch sử).
- Chứng chỉ có bản in A4 tại `/xac-minh/<mã>/in/`, dùng để in hoặc lưu PDF.

## Giới thiệu việc làm & sau tuyển dụng (hành trình khâu 9–10)

- /app → Việc làm → Giới thiệu việc làm. Tab "Chờ giới thiệu" liệt kê học viên có chứng chỉ hợp lệ nhưng chưa có hồ sơ giới thiệu đang mở. Các bước: Đề cử → Đã gửi hồ sơ → Phỏng vấn → Nhận offer → Đã nhận việc (hoặc Không đạt / Ứng viên rút). Học viên nhận email khi có lịch phỏng vấn, khi nhận offer và khi nhận việc.
- **Gửi hồ sơ cho đối tác:** chọn ứng viên rồi tạo link `/doi-tac/<token>/` (hết hạn sau 1–90 ngày, có thể thu hồi, tùy chọn cho tải CV). HR ngân hàng không cần tài khoản: mở link để xem khóa học, điểm, chuyên cần, chứng chỉ đã xác minh, rồi tự ghi lịch phỏng vấn, đạt/không đạt, ngày nhận việc. Link chỉ hiển thị một lần vì hệ thống chỉ lưu bản băm. Mọi thao tác trên link được ghi vào audit log.
- **Khi nhận việc:** hệ thống tự tính thử việc 60 ngày và cam kết việc làm 12 tháng, đồng thời tạo việc cần làm ở các mốc: tuần đầu, 30 ngày, hết thử việc, 6 tháng, hết cam kết. Nếu học viên không qua thử việc hoặc nghỉ việc trong thời gian cam kết, họ được đưa lại vào danh sách chờ giới thiệu.
- **Kết quả việc làm:** tỷ lệ có việc theo khóa, số ngày trung bình từ tốt nghiệp đến khi đi làm, tiến độ so với chỉ tiêu tuyển dụng theo vị trí, danh sách đến hạn đánh giá thử việc.
- **Quyền:** `placement.view` (Tư vấn, Đào tạo), `placement.manage` (Đào tạo, Super Admin).

## Quản trị VPS qua GitHub Actions (khi mạng không cho SSH)

Workflow **Ops** (`.github/workflows/ops.yml`) chạy trên máy của GitHub, SSH vào VPS bằng khóa quản trị
lưu trong environment `ops` (chỉ dùng được từ `main`). Vì repo công khai, **không có output nào từ VPS
xuất hiện trong log**: kết quả được mã hóa bằng `OPS_OUTPUT_KEY` thành artifact giữ 1 ngày.

```bash
python infra/ops/sync_github.py                        # đẩy secret/variable từ .env lên GitHub (không in giá trị)
gh workflow run ops.yml -f task=status                 # status | bootstrap | sync-env | logs | seed-content | create-admin | restart
gh run watch "$(gh run list -w ops.yml -L1 --json databaseId -q '.[0].databaseId')"
python infra/ops/fetch_output.py <run-id>              # tải và giải mã kết quả
gh workflow run ops.yml -f task=create-admin -f arg=ban@twings.edu.vn   # mật khẩu ngẫu nhiên nằm trong output đã mã hóa
```

Lần chạy đầu workflow tự quét host key của VPS và in vân tay; chép dòng `ssh-keyscan` vào `GH_VPS_KNOWN_HOSTS`
trong `.env` rồi chạy lại `sync_github.py` để ghim cố định. Thu hồi quyền: xóa secret `VPS_ADMIN_SSH_KEY`.

## Vận hành

| Việc | Lệnh (trên VPS, thư mục `/opt/twings`) |
|---|---|
| Xem log API | `sudo docker compose logs -f --tail=200 backend` |
| Xem log HTTPS/chứng chỉ | `sudo docker compose logs --tail=100 caddy` |
| Lịch sử triển khai | `journalctl -t twings-deploy` |
| Rollback về commit cũ | `sudo /opt/twings/bin/deploy.sh <git-sha-cũ>` (chỉ đổi image, không đảo migration) |
| Chạy backup thủ công | `sudo /opt/twings/bin/backup.sh && journalctl -t twings-backup -n 5` |
| Khôi phục backup | xem cuối file `infra/vps/bin/backup.sh` (thực hiện trên máy có khóa riêng `age`) |
| Cập nhật cấu hình infra | chép lại thư mục `infra/` lên `/tmp/twings-infra` và chạy lại `bootstrap.sh` (an toàn khi chạy nhiều lần) |

**Xoay vòng khóa mã hóa dữ liệu cá nhân**: thêm khóa mới **vào đầu** danh sách `FIELD_ENCRYPTION_KEYS`
(phân cách bằng dấu phẩy, giữ khóa cũ phía sau) rồi khởi động lại backend. Bản ghi cũ vẫn đọc được bằng khóa cũ
và sẽ được mã hóa lại bằng khóa mới khi lưu. Chỉ bỏ khóa cũ sau khi mọi bản ghi đã được lưu lại.

**Migration an toàn khi rollback**: mỗi thay đổi schema nên tương thích ngược với image trước đó (mở rộng trước,
dọn dẹp ở release sau), vì rollback chỉ đổi image chứ không đảo migration.
