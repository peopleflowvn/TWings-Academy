# TWings Academy

Nền tảng đào tạo và tuyển sinh nhân sự ngân hàng: website bán khóa học, đăng ký xét tuyển, thanh toán học phí bằng VietQR, cùng CMS/CRM nội bộ để quản lý lead, lớp học, nội dung và email.

[![CI](https://github.com/peopleflowvn/TWings-Academy/actions/workflows/ci.yml/badge.svg)](https://github.com/peopleflowvn/TWings-Academy/actions/workflows/ci.yml)

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Frontend | React 19 · TypeScript · Vite 8 · Tailwind CSS 4 | [`frontend/`](frontend/) |
| Backend API | Django 5.2 LTS · Django REST Framework · PostgreSQL 18 | [`backend/`](backend/) |
| Hạ tầng | Docker Compose · Cloudflare Tunnel / R2 / Pages · Oracle Cloud VPS | [`infra/`](infra/) |
| CI/CD | GitHub Actions · GHCR | [`.github/workflows/`](.github/workflows/) |

Tài liệu:
- [Kiến trúc hệ thống](docs/ARCHITECTURE.md): sơ đồ, API, luồng thanh toán, phân quyền, dữ liệu cá nhân.
- [Hướng dẫn triển khai](docs/DEPLOYMENT.md): Cloudflare, VPS, GitHub secrets, vận hành.
- [Chính sách bảo mật](SECURITY.md): báo cáo lỗ hổng, quy tắc khi đóng góp.

## Chạy trên máy cá nhân

Yêu cầu: Node.js 22+, Python 3.13+.

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate            # macOS/Linux: source .venv/bin/activate
pip install --require-hashes --no-deps -r requirements.txt -r requirements-dev.txt

cp .env.example ../.env           # .env ở thư mục gốc repo là file secret duy nhất; điền khóa bằng lệnh dưới
python scripts/generate_secrets.py
# Đặt DATABASE_URL=sqlite:///db.sqlite3 để chạy nhanh không cần PostgreSQL

python manage.py migrate
python manage.py createcachetable
python manage.py seed_content     # nạp khóa học, bài viết, banner, mẫu email mẫu
python manage.py createsuperuser
python manage.py runserver        # http://127.0.0.1:8000/api/v1/health/
```

Kiểm tra chất lượng: `ruff check . && ruff format --check . && pytest`

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local        # VITE_API_BASE_URL=http://127.0.0.1:8000
npm run dev                       # http://127.0.0.1:3000
```

Nếu để trống `VITE_API_BASE_URL`, giao diện chạy ở **chế độ demo**: dùng dữ liệu đóng gói sẵn, thanh toán và email
chỉ mô phỏng, CMS cho phép chuyển vai trò để xem thử phân quyền. Khi có backend, CMS bắt buộc đăng nhập và mọi
quyền được kiểm tra phía server.

## Triển khai

Push lên `main` → CI (quét secret, kiểm tra kiểu, test, audit dependency) → build image đa kiến trúc lên GHCR →
triển khai qua SSH lên VPS (có health check và tự rollback) → đăng frontend lên Cloudflare Pages.
Chi tiết thiết lập lần đầu xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Bảo mật

Repository công khai: **không bao giờ commit secret**. Secret chỉ nằm trên VPS (`/opt/twings/env/*.env`) và
trong GitHub Environment `production`. Hãy cài hook chặn secret trước khi commit:
`pip install pre-commit && pre-commit install`.

---
© 2026 TWings Academy.
