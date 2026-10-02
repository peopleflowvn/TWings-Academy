# Hướng dẫn triển khai Production

Hướng dẫn đưa hệ thống lên **Oracle Cloud VPS + Cloudflare (Tunnel, R2, Pages) + GitHub Actions**.
Làm một lần theo đúng thứ tự dưới đây. Từ đó về sau, mỗi lần push lên `main` hệ thống sẽ tự triển khai.

> **Nguyên tắc vàng:** secret chỉ nằm ở 2 nơi: tệp `/opt/twings/env/*.env` trên VPS (chmod 600) và mục
> *Secrets* của GitHub Environment `production`. Không bao giờ commit, không dán vào issue/PR/chat,
> không lưu trong thư mục dự án.

Ký hiệu dùng trong tài liệu: `<domain>` (ví dụ `twings.edu.vn`), `<vps-ip>`, `<admin-key>` (khóa SSH quản trị của bạn).

---

## Bước 1 – Cloudflare

Tên miền phải dùng DNS của Cloudflare.

1. **SSL/TLS** → *Edge Certificates*: bật **Always Use HTTPS** và đặt **Minimum TLS 1.2**.
2. **R2** → tạo 3 bucket:
   - `twings-media`: ảnh công khai. Gắn *Custom Domain* `media.<domain>`.
   - `twings-private`: tài liệu riêng tư (CV…). **Không** bật public access.
   - `twings-backups`: bản sao lưu CSDL. Thêm *Lifecycle rule* tự xóa sau 35 ngày.
3. **R2 → Manage API Tokens**: tạo 2 token riêng biệt, áp dụng nguyên tắc quyền tối thiểu:
   - `twings-app`: *Object Read & Write*, chỉ cho `twings-media` và `twings-private`.
   - `twings-backup`: *Object Read & Write*, chỉ cho `twings-backups`.
4. **Zero Trust → Networks → Tunnels** → *Create tunnel* (loại Cloudflared), đặt tên `twings-vps`:
   - Sao chép **token** (dùng ở bước 4).
   - *Public Hostname*: `api.<domain>` → Service `HTTP` → `backend:8000`.
5. **Workers & Pages** → *Create* → *Pages* → *Direct Upload*, đặt tên dự án (ví dụ `twings-academy`).
   Gắn *Custom domain* `<domain>` và/hoặc `www.<domain>`.
6. **My Profile → API Tokens** → tạo token với quyền duy nhất **Account · Cloudflare Pages · Edit** (để CI upload frontend).
7. *(Khuyến nghị)* **Security → WAF → Rate limiting rules**: giới hạn `api.<domain>/api/v1/auth/login/` ở mức 10 request/phút/IP.
8. *(Khuyến nghị)* **Zero Trust → Access → Applications**: bảo vệ `api.<domain>/<DJANGO_ADMIN_URL>` bằng đăng nhập email công ty.

## Bước 2 – Khóa SSH cho CI (tạo trên máy của bạn)

```bash
ssh-keygen -t ed25519 -f ci-deploy -C "github-actions-deploy" -N ""
```

- `ci-deploy.pub`: chép lên VPS ở bước 3.
- `ci-deploy` (khóa riêng): chỉ dán vào GitHub Secret ở bước 5, sau đó **xóa file khỏi máy**.
  Khóa này **chỉ** chạy được lệnh `deploy <sha>`: không có shell, không port-forward.
- Khóa quản trị `<admin-key>` của bạn **không bao giờ** đưa lên GitHub.

## Bước 3 – Chuẩn bị VPS (Ubuntu 22.04/24.04)

1. **Oracle Console → VCN → Security List**: chỉ cho phép ingress **TCP 22**, tốt nhất giới hạn theo IP của bạn.
   Không cần mở 80/443 vì Cloudflare Tunnel kết nối từ VPS ra ngoài.
2. Từ máy của bạn (thư mục gốc repo):

```bash
scp -i <admin-key> -r infra ubuntu@<vps-ip>:/tmp/twings-infra
scp -i <admin-key> ci-deploy.pub ubuntu@<vps-ip>:/tmp/ci-deploy.pub
ssh -i <admin-key> ubuntu@<vps-ip> 'sudo bash /tmp/twings-infra/vps/bootstrap.sh /tmp/ci-deploy.pub'
```

Script `bootstrap.sh` thực hiện:
- cài Docker, fail2ban và tự động cập nhật bảo mật;
- tắt đăng nhập SSH bằng mật khẩu và đăng nhập root;
- tạo user `deploy` với khóa CI bị giới hạn bằng forced command;
- dựng cấu trúc `/opt/twings` và lịch backup hằng đêm.

> **Kiểm tra trước khi đóng phiên SSH**: mở một cửa sổ mới và chạy `ssh -i <admin-key> ubuntu@<vps-ip>`
> để chắc chắn bạn vẫn đăng nhập được sau khi cấu hình SSH thay đổi.

## Bước 4 – Điền secret trên VPS

Secret được sinh ngay trên VPS để không đi qua máy của bạn:

```bash
scp -i <admin-key> backend/scripts/generate_secrets.py ubuntu@<vps-ip>:/tmp/
ssh -i <admin-key> ubuntu@<vps-ip>
python3 /tmp/generate_secrets.py && python3 /tmp/generate_secrets.py | grep POSTGRES   # chạy 2 lần: 2 mật khẩu DB khác nhau
sudo nano /opt/twings/env/db.env           # POSTGRES_PASSWORD, APP_DB_PASSWORD
sudo nano /opt/twings/env/backend.env      # dựa trên backend/.env.example (xem bảng dưới)
sudo nano /opt/twings/env/cloudflared.env  # TUNNEL_TOKEN từ bước 1.4
sudo nano /opt/twings/env/backup.env       # AGE_RECIPIENT + token R2 twings-backup
sudo chmod 600 /opt/twings/env/*.env
```

Các giá trị bắt buộc trong `backend.env`:

| Biến | Giá trị |
|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` |
| `DJANGO_SECRET_KEY`, `DJANGO_ADMIN_URL`, `FIELD_ENCRYPTION_KEYS`, `BLIND_INDEX_KEY`, `BANK_WEBHOOK_API_KEY` | lấy từ `generate_secrets.py` |
| `DJANGO_ALLOWED_HOSTS` | `api.<domain>` |
| `DJANGO_CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` | `https://<domain>,https://www.<domain>` |
| `TRUST_CLOUDFLARE_IP_HEADER` | `true` |
| `DATABASE_URL` | `postgres://twings_app:<APP_DB_PASSWORD>@db:5432/twings` |
| `R2_*` | token `twings-app`, endpoint `https://<account_id>.r2.cloudflarestorage.com`, `R2_PUBLIC_DOMAIN=media.<domain>` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` | từ Resend (bước 7) |
| `VIETQR_ACCOUNT_NUMBER`, `VIETQR_ACCOUNT_NAME`, `VIETQR_BANK_BIN` | tài khoản nhận học phí |

**Khóa sao lưu `age`**: tạo trên một máy tin cậy bằng `age-keygen -o twings-backup.key`.
Chỉ đưa dòng *public key* (`age1…`) vào `backup.env`. File `twings-backup.key` cất trong trình quản lý
mật khẩu hoặc két offline: mất file này thì không khôi phục được backup, và tuyệt đối không để nó trên VPS.

> ⚠️ **Sao lưu `FIELD_ENCRYPTION_KEYS` và `BLIND_INDEX_KEY` ở nơi an toàn ngoài VPS.** Nếu mất 2 khóa
> này, dữ liệu CCCD, địa chỉ và số tài khoản đã mã hóa sẽ không đọc lại được, kể cả khi còn backup.

## Bước 5 – GitHub

**Settings → Environments → New environment `production`**:
- *Deployment branches*: chỉ `main`.
- *(Khuyến nghị)* *Required reviewers*: bạn, để mỗi lần deploy phải có người bấm duyệt.
- **Environment secrets**:

| Secret | Giá trị |
|---|---|
| `VPS_HOST` | `<vps-ip>` |
| `VPS_DEPLOY_SSH_KEY` | toàn bộ nội dung file `ci-deploy` (khóa riêng) |
| `VPS_KNOWN_HOSTS` | kết quả `ssh-keyscan -t ed25519 <vps-ip>`. Trước khi dán, đối chiếu vân tay với lệnh `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` chạy trên VPS |
| `CLOUDFLARE_PAGES_API_TOKEN` | token ở bước 1.6 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID của Cloudflare |

**Settings → Secrets and variables → Actions → Variables** (thông tin công khai, không phải secret):

| Variable | Giá trị |
|---|---|
| `API_BASE_URL` | `https://api.<domain>` |
| `CF_PAGES_PROJECT` | tên dự án Pages (bước 1.5) |

**Thiết lập bảo mật cho repo public:**
- *Settings → Actions → General → Fork pull request workflows*: chọn **Require approval for all external contributors**.
- *Settings → Branches*: bảo vệ `main`: bắt buộc qua PR, bắt buộc CI xanh, cấm force-push.
- *Settings → Code security*: bật **Secret scanning + Push protection**, **Dependabot alerts**.

## Bước 6 – Lần triển khai đầu tiên

1. Merge nhánh `feat/platform-architecture` vào `main`. CI chạy; nếu xanh, workflow *Deploy* sẽ tự build image và triển khai.
2. Sau lần push image đầu tiên: *GitHub → Packages → twings-academy-backend → Package settings* → đổi sang **Public**
   (image không chứa secret). Nếu muốn giữ private, chạy `docker login ghcr.io` trên VPS bằng PAT chỉ có quyền `read:packages`.
3. Tạo tài khoản quản trị đầu tiên và nạp nội dung mẫu:

```bash
ssh -i <admin-key> ubuntu@<vps-ip>
cd /opt/twings
sudo docker compose exec backend python manage.py createsuperuser
sudo docker compose exec backend python manage.py seed_content
```

4. Kiểm tra: `https://api.<domain>/api/v1/health/` trả về `{"status":"ok"}`, và trang `https://<domain>` tải được khóa học.

## Bước 7 – Kết nối dịch vụ ngoài

- **Resend**: xác minh tên miền gửi thư (SPF/DKIM), tạo API key với quyền *Sending access*. Thêm Webhook URL
  `https://api.<domain>/api/v1/webhooks/resend/` cho các sự kiện `email.sent`, `email.delivered`, `email.opened`,
  `email.clicked`, `email.bounced`, `email.complained`. Chép *Signing secret* vào `RESEND_WEBHOOK_SECRET`.
- **SePay** (hoặc dịch vụ báo biến động số dư tương thích): Webhook URL `https://api.<domain>/api/v1/webhooks/bank/`,
  kiểu xác thực **API Key** = `BANK_WEBHOOK_API_KEY`, chỉ gửi giao dịch tiền vào.
- Sau khi đổi `backend.env`: `cd /opt/twings && sudo docker compose up -d backend`.

---

## Vận hành

| Việc | Lệnh (trên VPS, thư mục `/opt/twings`) |
|---|---|
| Xem log API | `sudo docker compose logs -f --tail=200 backend` |
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
