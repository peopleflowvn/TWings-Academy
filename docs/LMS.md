# LMS (Moodle) trong repo

Toàn bộ mã nguồn Moodle nằm trong `lms/`, sửa trực tiếp được như `backend/` và `frontend/`. Moodle là
ứng dụng PHP chạy trong container riêng (`lms`, `lms-cron`). Nó nói chuyện với Django qua Web Service
(REST) và OAuth2 (SSO), nên hai ngôn ngữ không phụ thuộc nhau. Cách tích hợp với TWings (ghi danh, SSO,
đợt khai giảng, chứng chỉ…) xem [DEPLOYMENT.md](DEPLOYMENT.md#lms-moodle).

## Cấu trúc

```
lms/                                 Moodle 5.2.4 (PHP 8.3); web root là lms/public/
  admin/cli/  config.php*  lib/…     *config.php thật nằm ở infra/lms/ (đọc secret từ env)
  public/
    mod/attendance/  blocks/completion_progress/  report/customsql/   plugin bên thứ ba
    local/twings/                    plugin riêng của TWings  ← code tùy biến đặt ở đây
    theme/twings/                    (khi cần) giao diện TWings
infra/lms/
  Dockerfile  Dockerfile.dockerignore  config.php  twings_setup.php  apache.conf  php.ini
  vendor.json                        phiên bản gốc của từng thành phần
  patches.txt                        danh sách file gốc mà TWings đã sửa, kèm lý do
  vendor.py                          công cụ kiểm tra / so sánh / cập nhật
```

Moodle và 3 plugin được đưa vào bằng `git subtree --squash`. Mỗi thành phần có một commit
`Squashed '<path>/' …` trong lịch sử, chứa **đúng nguyên văn** mã nguồn gốc. Commit này là mốc để:
- biết chính xác TWings đã sửa gì so với bản gốc (`vendor.py status`, `vendor.py diff`);
- gộp bản vá bảo mật của Moodle về sau bằng merge 3 chiều, giữ nguyên các chỉnh sửa của TWings.

Không bắt buộc phải cập nhật Moodle. Nhưng nếu cần thì vẫn làm được, không phải chép tay lại các chỉnh sửa.

## Tùy biến: chọn đúng chỗ

Theo thứ tự ưu tiên (càng lên trên càng dễ bảo trì):

1. **Cấu hình**: `infra/lms/twings_setup.php` (chạy mỗi lần deploy), dùng cho setting, vai trò, dịch vụ web.
2. **Plugin của TWings**: `lms/public/local/twings` (logic, trang, observer sự kiện, task, web service),
   `lms/public/theme/twings` (giao diện, template Mustache, renderer ghi đè). Không cần khai báo gì thêm.
3. **Sửa lõi Moodle hoặc plugin bên thứ ba**: được phép, với 3 quy tắc:
   - đánh dấu trong code: `// TWINGS: <lý do>` (JS/PHP) hoặc `{{! TWINGS: … }}` (Mustache);
   - thêm một dòng vào `infra/lms/patches.txt`: `lms/public/…/file.php   <lý do>`;
   - CI (`vendor.py check`) **báo lỗi** nếu một file gốc bị sửa, thêm hoặc xóa mà không có trong
     `patches.txt`, hoặc có trong danh sách nhưng thực tế không còn khác bản gốc.

Đổi thứ cần Moodle cài đặt (bảng DB, capability, task, service) thì tăng `$plugin->version` trong
`version.php` của plugin. Khi deploy, `deploy.sh` chạy `upgrade.php`. Cũng như migration của Django,
bước nâng cấp DB của Moodle **không đảo ngược được** khi rollback.

```bash
python infra/lms/vendor.py status                 # thành phần, phiên bản, các file đã sửa
python infra/lms/vendor.py diff lms/public/…/x.php # so sánh với bản gốc (tính cả thay đổi chưa commit)
python infra/lms/vendor.py check                   # như CI
```

## Cập nhật bản gốc (vá bảo mật)

Moodle công bố bản vá bảo mật tại https://moodle.org/security. Để áp dụng một bản vá:

```bash
git switch -c lms/moodle-5.2.5
python infra/lms/vendor.py update core <commit của tag v5.2.5> --ref v5.2.5
python infra/lms/vendor.py check
```

`update` tải đúng commit đó (chỉ bản mới nhất, không kéo cả lịch sử), merge 3 chiều vào `lms/`, rồi ghi
lại `vendor.json` và danh sách commit gốc trong `.gitleaks.toml`. Nếu bị conflict thì sửa xong, `git commit`,
rồi chạy `vendor.py record core`. Plugin bên thứ ba cập nhật cùng cách (`update mod_attendance …`).
Thêm plugin mới: `vendor.py add <tên> lms/public/<loại>/<tên> <repo> <commit>`. Bỏ một plugin: `vendor.py remove
<tên>` rồi thêm nó vào bước gỡ plugin trong `twings_setup.php` (chỉ gỡ khi không còn hoạt động nào dùng nó).

## Quy tắc git cho `lms/`

- **Merge PR bằng merge commit hoặc fast-forward, không dùng "Squash and merge" hay "Rebase and merge".**
  Hai cách đó viết lại các commit `Squashed '…'`, làm mất mốc gốc. `vendor.py check` và gitleaks sẽ báo lỗi.
- Không sửa các commit `Squashed '…'` và không rebase qua chúng.
- `lms/` được giữ nguyên từng byte như bản gốc (`.gitattributes`: `-text`, một số file dùng CRLF). Riêng
  plugin của TWings dùng LF như phần còn lại của repo.
- gitleaks bỏ qua đúng các commit ảnh chụp bản gốc (khóa mẫu và dữ liệu test của Moodle và SDK). Mọi commit
  của TWings trong `lms/` vẫn bị quét.

## CI và image

- `lms-vendor`: chạy `vendor.py check`.
- `docker`: build image từ `lms/`, kiểm tra cú pháp PHP của config và plugin TWings, kiểm tra Apache, rồi
  **cài Moodle từ đầu trên Postgres** (lõi, 3 plugin, `local_twings`, `twings_setup.php`) trước khi cho deploy.
- Image chép `lms/` vào `/var/www/moodle` (thuộc root, chỉ đọc với www-data), bỏ công cụ dev của Moodle
  (`.github`, `.grunt`, `node_modules`). Không còn tải mã nguồn từ GitHub lúc build.
