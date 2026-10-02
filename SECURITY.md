# Chính sách bảo mật

## Báo cáo lỗ hổng

Vui lòng **không** tạo issue công khai. Hãy gửi mô tả lỗ hổng qua GitHub
*Security → Report a vulnerability* (private advisory) của repository này. Chúng tôi phản hồi trong vòng 3 ngày làm việc.

## Quy tắc cho người đóng góp

- Repository này **công khai**. Không commit `.env`, khóa SSH, token, mật khẩu, dữ liệu học viên thật, hoặc file dump CSDL.
- Biến `VITE_*` được nhúng vào bundle JavaScript công khai, nên tuyệt đối không đặt secret vào đó.
- Cài hook chặn secret trước khi commit: `pip install pre-commit && pre-commit install`.
- CI chạy gitleaks trên toàn bộ lịch sử git; PR có secret sẽ bị chặn.
- Nếu lỡ commit một secret: **coi như secret đó đã lộ**. Thu hồi và tạo mới ngay, sau đó mới xử lý lịch sử git.

## Các lớp bảo vệ đang áp dụng

| Lớp | Biện pháp |
|---|---|
| Mạng | Cloudflare Tunnel (VPS không mở cổng web), WAF/DDoS của Cloudflare, firewall chỉ mở SSH, PostgreSQL ở mạng Docker nội bộ không có đường ra Internet |
| Máy chủ | SSH chỉ dùng khóa, cấm root, fail2ban, tự động cập nhật bảo mật, container chạy non-root, filesystem chỉ đọc, `cap_drop: ALL`, `no-new-privileges` |
| Triển khai | Khóa CI chỉ chạy được 1 forced command, host key được ghim cố định, có health check và tự rollback, action được ghim theo SHA, dependency khóa kèm hash |
| Ứng dụng | Cookie phiên HttpOnly/Secure/SameSite, CSRF (kể cả trang đăng nhập), Argon2, khóa tài khoản sau 5 lần sai, RBAC mặc định từ chối, CSP và các security header, lọc HTML, mã hóa lại ảnh upload, chống chèn công thức khi xuất CSV |
| Dữ liệu | CCCD, địa chỉ và số tài khoản được mã hóa ở mức trường dữ liệu, audit log chỉ đọc, backup mã hóa bằng `age`, ghi nhận đồng ý xử lý dữ liệu theo NĐ 13/2023 |
| Tích hợp | Giá luôn tính phía server, webhook ngân hàng xác thực bằng API key và chống xử lý trùng, webhook Resend xác thực chữ ký Svix và chống phát lại, API key Resend chỉ nằm trên server |
