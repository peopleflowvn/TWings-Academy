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
  *student*. Lỗi được ghi ở `LmsEnrollment` và cron thử lại mỗi 10 phút (`sync_lms_enrollments`).
- **Soạn nội dung:** đăng nhập `/learn` bằng `admin` (mật khẩu `PROD_LMS__MOODLE_ADMIN_PASSWORD` trong `.env`). Dùng
  các tính năng sẵn có của Moodle: bài giảng, video YouTube, quiz, bài tập, hoàn thành khóa học, huy hiệu.
- **Bảo mật:** `/learn/webservice/*` bị chặn từ Internet, chỉ backend gọi được qua mạng nội bộ. Token có giới hạn IP
  nội bộ và một vai trò quyền tối thiểu. Không ai tự đăng ký được (`registerauth` tắt, `forcelogin` bật). Cài đặt hoặc
  nâng cấp qua web cần `MOODLE_UPGRADE_KEY`; `deploy.sh` làm việc này bằng CLI. Thư mục code chỉ đọc nên không cài
  plugin qua web được.
- **Email:** cần SMTP (ví dụ Resend: `smtp.resend.com:587`, user `resend`, password = API key) trong
  `PROD_LMS__MOODLE_SMTP_*`. Thiếu SMTP thì học viên không nhận được email mật khẩu.
- **Nâng cấp Moodle:** đổi `MOODLE_COMMIT` trong `infra/lms/Dockerfile` sang commit của tag mới. Giống migration, bước
  nâng cấp DB của Moodle không đảo ngược được khi rollback.
- **Backup:** `backup.sh` sao lưu DB `twings`, DB `moodle` và `moodledata` (bỏ cache), mã hóa `age`, đẩy lên R2.

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
