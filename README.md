# 🎓 TWINGS ACADEMY · NỀN TẢNG ĐÀO TẠO & TUYỂN SINH NGÂN HÀNG CHẤT LƯỢNG CAO

> **Hệ sinh thái EdTech & Talent Acquisition kết hợp chuẩn học thuật Coursera Enterprise Global và thực chiến Ngân hàng TMCP Hàng Hải Việt Nam (MSB).**

[![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Resend](https://img.shields.io/badge/Resend_Email-API_%26_Webhook-000000?style=for-the-badge&logo=mailgun)](https://resend.com/)
[![TalentFlow ATS](https://img.shields.io/badge/TalentFlow-ATS_1.0_Model-6366F1?style=for-the-badge)](https://github.com/peopleflowvn/TalentFlow1.0)
[![VietQR](https://img.shields.io/badge/VietQR-NAPAS_247_Instant-059669?style=for-the-badge)](https://vietqr.io/)

---

## 📌 MỤC LỤC
1. [Giới Thiệu Tổng Quan](#-giới-thiệu-tổng-quan)
2. [Kiến Trúc Tính Năng Trọng Tâm](#-kiến-trúc-tính-năng-trọng-tâm)
   - [2.1 Phân Hệ Tuyển Sinh TalentFlow 1.0 ATS (Campaign & Requisitions)](#21-phân-hệ-tuyển-sinh-talentflow-10-ats)
   - [2.2 Cổng Thanh Toán Tức Thì VietQR 24/7 & Webhook Gạch Nợ](#22-cổng-thanh-toán-tức-thì-vietqr-247--webhook-gạch-nợ)
   - [2.3 Hệ Thống Email Resend & Webhook Giám Sát 2 Chiều](#23-hệ-thống-email-resend--webhook-giám-sát-2-chiều)
   - [2.4 Mô Hình Phân Quyền Doanh Nghiệp (Enterprise RBAC v2.4)](#24-mô-hình-phân-quyền-doanh-nghiệp-enterprise-rbac-v24)
   - [2.5 Cổng Trải Nghiệm Học Viên & Bán Khóa Học (Customer Portal)](#25-cổng-trải-nghiệm-học-viên--bán-khóa-học-customer-portal)
3. [Công Nghệ & Thư Viện Sử Dụng (Tech Stack)](#-công-nghệ--thư-viện-sử-dụng-tech-stack)
4. [Cấu Trúc Thư Mục Dự Án (Project Structure)](#-cấu-trúc-thư-mục-dự-án-project-structure)
5. [Hướng Dẫn Cài Đặt & Khởi Chạy (Getting Started)](#-hướng-dẫn-cài-đặt--khởi-chạy-getting-started)
6. [Cấu Hình Biến Môi Trường (.env)](#-cấu-hình-biến-môi-trường-env)
7. [Tài Liệu Cấu Hình Resend Webhook](#-tài-liệu-cấu-hình-resend-webhook)
8. [Đóng Góp & Bản Quyền](#-đóng-góp--bản-quyền)

---

## 🌟 GIỚI THIỆU TỔNG QUAN

**TWINGS Academy** là nền tảng quản trị giáo dục và phát triển nhân lực tài chính - ngân hàng thế hệ mới, vận hành theo mô hình khép kín:
* **Học viên & Ứng viên**: Trải nghiệm giao diện tìm kiếm khóa học trực quan chuẩn Coursera Global, xem video bài giảng thực tế trên YouTube, đăng ký xét tuyển đầu vào và thanh toán học phí qua mã động VietQR NAPAS 24/7.
* **Hội đồng Tuyển sinh & Ban Đào tạo MSB**: Sử dụng hệ thống quản trị **TWINGS Enterprise CMS (v2.4)** phân cấp vai trò chặt chẽ, tiếp nhận hồ sơ theo cơ chế **Talent Acquisition Requisitions**, tự động đối soát thanh toán và gửi thư mời nhập học qua giao thức **Resend API**.

---

## ⚡ KIẾN TRÚC TÍNH NĂNG TRỌNG TÂM

### 2.1 Phân Hệ Tuyển Sinh TalentFlow 1.0 ATS
Lấy cảm hứng từ kiến trúc tuyển dụng chuẩn mực của **TalentFlow 1.0 (PeopleFlow ATS)**, toàn bộ phễu tuyển sinh được tổ chức khoa học:
* **Chiến Dịch Tuyển Sinh Như Chiến Dịch Tuyển Dụng (Campaign Hub)**:
  * Mỗi đợt khai giảng được quản lý như một chiến dịch tuyển dụng độc lập:
    * `CAMP-2026-Q4-HN`: Chiến dịch tuyển sinh Fresher Banker Q4/2026 - Hà Nội & Miền Bắc (Chỉ tiêu 100 Banker - Ngân sách học bổng 250 Tr).
    * `CAMP-2026-OCT-HCM`: Chiến dịch Cán bộ Tín dụng & Banker TP.HCM (Chỉ tiêu 60 Banker - Ngân sách 150 Tr).
    * `CAMP-2027-Q1-EARLY`: Chiến dịch Tuyển sớm Mùa tốt nghiệp Q1/2027 (Chỉ tiêu 120 Banker).
  * Bộ đếm tiến độ chỉ tiêu (`78/100 Chỉ tiêu - 78%`), đồng hồ đếm ngược hạn chót nộp hồ sơ và ngân sách học bổng còn lại.
* **Vị Trí Tuyển Dụng Chi Tiết (Position Tracks = Khóa Học Thực Chiến)**:
  * Trong mỗi chiến dịch, từng khóa học đại diện cho một vị trí công việc tuyển thẳng vào MSB:
    * **RM Doanh Nghiệp (CIB/SME)**: Chỉ tiêu 25 | Lương 15 - 28 Tr/tháng | Trưởng bộ môn: GV Vũ Thu Phương.
    * **RM Cá Nhân (Retail Banker)**: Chỉ tiêu 25 | Lương 12 - 22 Tr/tháng | Trưởng bộ môn: GV Đặng Văn Thành.
    * **Giao Dịch Viên (Teller & Operations)**: Chỉ tiêu 20 | Lương 10 - 16 Tr/tháng | Trưởng bộ môn: GV Nguyễn Kim Chi.
    * **Kỹ Sư AI & Automation Banking**: Chỉ tiêu 30 | Lương 18 - 35 Tr/tháng | Cố vấn: AI TWings & MSB Labs.
* **Phễu Chuyển Đổi ATS 6 Giai Đoạn**:
  1. `Ứng Tuyển (Applied)` &rarr; 2. `Sàng Lọc (Screened)` &rarr; 3. `Phỏng Vấn & Bank Tour (Interviewed)` &rarr; 4. `Thư Mời Nhập Học (Offered)` &rarr; 5. `Đã Nộp Phí & Cam Kết (Enrolled)` &rarr; 6. `Tiếp Nhận & Việc Làm (Placed)`.
  * Đo lường tỷ lệ chuyển đổi phần trăm (%) qua từng vòng giúp phát hiện điểm nghẽn tuyển sinh.
* **Định Tuyến & Vòng Đời Lớp Học (Cohort Auto-Routing & Waitlist Rollover)**:
  * Tự động khóa đăng ký khi lớp đạt sĩ số 25/25 học viên; tự động định tuyến ứng viên mới sang lớp kế nhiệm đạt chuẩn mà vẫn bảo lưu 100% chính sách học bổng.

---

### 2.2 Cổng Thanh Toán Tức Thì VietQR 24/7 & Webhook Gạch Nợ
* **Mã VietQR Động Chuẩn EMVCo**: Tự động nhúng số tiền học phí chính xác, mã đơn hàng (`0415_MSB_...`) và chủ tài khoản `CONG TY CP TWINGS ACADEMY` tại MSB.
* **Gạch Nợ Tự Động 60 Giây**: Tích hợp giao thức Webhook ngân hàng giúp kế toán không cần kiểm tra sao kê thủ công; tiền vào tài khoản là hệ thống lập tức kích hoạt tài khoản LMS và xuất biên lai.
* **Trình Mô Phỏng VietQR Webhook Reconciler**: Công cụ kiểm thử giả lập gửi thông điệp thanh toán từ ngân hàng MSB trực tiếp trên giao diện CMS để đối soát tức thời.

---

### 2.3 Hệ Thống Email Resend & Webhook Giám Sát 2 Chiều
* **Chuẩn Mực HTML Table Responsive**:
  * Thiết kế theo tiêu chuẩn tương thích 100% email client (Gmail, Outlook Desktop, Apple Mail, di động).
  * Bộ nhận diện thương hiệu học viện: Xanh Navy `#002D62`, MSB Blue `#0073C1`, chỉ viền vàng kim `#F59E0B`, chữ ký ban đào tạo và footer bảo mật pháp lý.
  * 6 Mẫu thư cốt lõi: *Giấy Báo Nhập Học*, *Thông Báo Học Phí & Mã VietQR*, *Biên Lai Thu Phí Điện Tử*, *Thư Mời VIP Bank Tour*, *Thông Báo Chuyển Đợt Lớp Kế Nhiệm*, và *Thư Chúc Mừng Tiếp Nhận Nhân Sự*.
* **Trung Tâm Webhook Resend 2 Chiều**:
  * Cung cấp sẵn Webhook URL (`https://twings.edu.vn/api/webhooks/resend`) và Signing Secret xác thực chữ ký Svix.
  * Lắng nghe 5 sự kiện: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`.
  * Bộ giả lập sự kiện Webhook (Mở thư, Click link CTA, Giao thành công) giúp quản trị viên kiểm tra nhật ký tương tác thời gian thực của ứng viên.

---

### 2.4 Mô Hình Phân Quyền Doanh Nghiệp (Enterprise RBAC v2.4)
Hệ thống phân định rạch ròi 5 vai trò công tác trong học viện:
* **Super Admin**: Quản trị viên tối cao, toàn quyền cấu hình hạ tầng, phân quyền và duyệt tài chính.
* **Ban Đào Tạo (Academic Management)**: Quản lý chương trình học, điều phối giảng viên, xếp lớp và cấp chứng chỉ.
* **Tuyển Sinh (Sales CRM)**: Tiếp cận lead, thực hiện cuộc gọi sàng lọc, hẹn lịch Bank Tour và gửi thư mời nhập học.
* **Biên Tập & SEO (Content & SEO)**: Quản trị banner, tối ưu thẻ OpenGraph, biên tập tin tức và bài viết kiến thức.
* **Kế Toán Tài Chính (Finance & Accounting)**: Theo dõi dòng tiền, đối soát VietQR, tính toán hoa hồng giới thiệu và chi trả thưởng.

> **Persona Switcher**: Thanh điều hướng trên cùng cho phép chuyển đổi tức thì giữa 5 tài khoản mẫu để kiểm toán quyền truy cập các tab.

---

### 2.5 Cổng Trải Nghiệm Học Viên & Bán Khóa Học (Customer Portal)
* **Trang chủ chuẩn Coursera Global**: Header đa tầng, Hero banner động, Thanh thống kê đối tác tuyển dụng (MSB, ROX Group, TNR Holdings...).
* **Học liệu thực chiến**: Tích hợp trình phát video YouTube dùng thử bài giảng, đề cương chi tiết từng module, đánh giá 5 sao từ cựu học viên đang làm việc tại MSB.
* **Quy trình ghi danh 1-Click**: Điền thông tin cá nhân, quét mã VietQR và nhận tài khoản Coursera Enterprise LMS tự động.

---

## 🛠 CÔNG NGHỆ & THƯ VIỆN SỬ DỤNG (TECH STACK)

| Phân Vùng | Công Nghệ / Thư Viện | Mục Đích Sử Dụng |
| :--- | :--- | :--- |
| **Core Framework** | React 19 + TypeScript 5 | Xây dựng Single Page Application hiện đại, an toàn kiểu dữ liệu |
| **Bundler & Tooling** | Vite 8 + ESBuild | Biên dịch siêu tốc, tối ưu bundle kích thước nhỏ gọn |
| **Styling & Design** | Tailwind CSS v4 | Hệ thống class tiện ích, responsive và dark-mode ready |
| **Iconography** | Lucide React | Bộ biểu tượng vector sắc nét, tối ưu ngữ cảnh tài chính |
| **Effects & Animation** | Canvas-Confetti & Motion | Hiệu ứng chúc mừng thanh toán thành công và chuyển động mượt |
| **Email Infrastructure** | Resend SDK & REST API | Hạ tầng gửi thư điện tử transactional độ tin cậy cao |
| **Payment Gateway** | VietQR API (NAPAS 247) | Sinh mã QR thanh toán liên ngân hàng tự động |
| **AI Integration** | Google GenAI SDK (`@google/genai`) | Khởi tạo bằng chứng nghiên cứu ứng viên tự động |

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT STRUCTURE)

```
twings-academy/
├── public/                     # Tài nguyên tĩnh (favicon, logo, icons)
├── src/
│   ├── components/
│   │   ├── cms/                # Hệ thống phân hệ CMS quản trị
│   │   │   ├── CMSCRMOrdersTab.tsx           # CRM Tuyển Sinh & ATS Pipeline Hub
│   │   │   ├── CMSCampaignManagementModal.tsx # Quản lý Chiến dịch & Vị trí tuyển sinh
│   │   │   ├── CompAILeadDetailModal.tsx     # Workspace 2 cột hồ sơ ứng viên chi tiết
│   │   │   ├── CMSEmailTemplatesTab.tsx      # Quản lý mẫu thư & Webhook Resend
│   │   │   ├── CMSResendWebhookModal.tsx     # Cấu hình Webhook & Bộ mô phỏng sự kiện
│   │   │   ├── SendResendEmailModal.tsx      # Modal soạn & gửi thư nhanh cho ứng viên
│   │   │   ├── CMSCohortLifecycleModal.tsx   # Quản lý đóng/mở lớp & định tuyến tự động
│   │   │   ├── CMSVietQRWebhookModal.tsx     # Bộ mô phỏng đối soát Webhook VietQR
│   │   │   ├── CMSCoursesTab.tsx             # Quản lý khóa học & nhúng video YouTube
│   │   │   ├── CMSInstructorsTab.tsx         # Quản lý hồ sơ giảng viên chuyên gia MSB
│   │   │   ├── CMSUsersTab.tsx               # Phân quyền người dùng & Ma trận RBAC
│   │   │   ├── CMSArticlesSEOTab.tsx         # Soạn thảo bài viết & chấm điểm SEO
│   │   │   ├── CMSSiteSEOSettingsTab.tsx     # Cài đặt thẻ Meta, Robots.txt & Social Card
│   │   │   ├── CMSArchitectureTab.tsx        # Tài liệu kiến trúc Django & Database schema
│   │   │   └── RBACAccessGuard.tsx           # Màn hình cảnh báo 403 khi chưa đủ quyền
│   │   ├── CourseraCMSAdmin.tsx # Khung điều hướng CMS & Sidebar 3 nhóm chức năng
│   │   ├── CourseraHeader.tsx  # Thanh điều hướng cổng học viên
│   │   ├── CourseraHero.tsx    # Banner trang chủ & thông điệp tuyển sinh
│   │   ├── CourseDetailModal.tsx # Modal chi tiết khóa học & video học thử
│   │   └── CheckoutModal.tsx   # Cổng thanh toán quét mã VietQR tự động
│   ├── data/
│   │   ├── coursesData.ts      # Dữ liệu khóa học ngân hàng & danh sách giảng viên
│   │   └── courseraData.ts     # Dữ liệu banner, đối tác tuyển dụng & người dùng RBAC
│   ├── utils/
│   │   ├── talentCampaigns.ts  # Bộ máy tính toán Campaign, Requisitions & Phễu ATS
│   │   ├── resendEmail.ts      # Thư viện mẫu thư HTML, SDK Resend & Webhook Processor
│   │   ├── cohortRouting.ts    # Logic định tuyến sĩ số lớp & tự động chuyển lớp
│   │   ├── compAiCrm.ts        # Thuật toán tính toán Readiness Score & Tier A/B/C/D
│   │   └── rbac.ts             # Ma trận quyền hạn, phân vai trò & kiểm soát truy cập
│   ├── types.ts                # Toàn bộ định nghĩa kiểu dữ liệu TypeScript
│   ├── App.tsx                 # Root component & điều hướng Portal/CMS
│   └── main.tsx                # Entry point khởi tạo React DOM
├── .env.example                # Mẫu khai báo biến môi trường
├── package.json                # Danh sách dependencies & scripts
├── tsconfig.json               # Cấu hình trình biên dịch TypeScript
└── vite.config.ts              # Cấu hình Vite build & dev server
```

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY (GETTING STARTED)

### Yêu Cầu Hệ Thống
* **Node.js**: Phiên bản `>= 18.0.0` (Khuyến nghị Node.js 20 LTS)
* **npm**: Phiên bản `>= 9.0.0`

### 1. Clone & Cài Đặt Gói Phụ Thuộc
```bash
# Clone repository
git clone https://github.com/peopleflowvn/twings-academy.git
cd twings-academy

# Cài đặt các gói npm
npm install
```

### 2. Thiết Lập Biến Môi Trường
Sao chép tệp mẫu `.env.example` thành `.env`:
```bash
cp .env.example .env
```
Cập nhật các khóa API cần thiết (xem mục bên dưới).

### 3. Khởi Chạy Máy Chủ Phát Triển (Dev Server)
```bash
npm run dev
```
Ứng dụng sẽ hoạt động tại địa chỉ: `http://localhost:3000`

### 4. Kiểm Tra Lỗi & Build Đóng Gói
```bash
# Kiểm tra an toàn kiểu dữ liệu TypeScript
npm run lint

# Đóng gói sản phẩm chạy Production
npm run build

# Xem trước bản đóng gói
npm run preview
```

---

## 🔑 CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)

Tệp cấu hình mẫu `.env`:
```env
# URL máy chủ ứng dụng
APP_URL="http://localhost:3000"

# Khóa API Resend (Tùy chọn: dùng để gửi email thật ra ngoài internet)
# Định dạng: re_xxxxxxxxxxxxxxxxxxxx
VITE_RESEND_API_KEY=""

# Địa chỉ email người gửi đã xác thực trên Resend
VITE_RESEND_FROM_EMAIL="TWings Academy <onboarding@resend.dev>"

# Khóa Google Gemini AI Studio (Dành cho tính năng AI phân tích CV)
GEMINI_API_KEY=""
```

> **Ghi chú**: Nếu không điền `VITE_RESEND_API_KEY`, hệ thống sẽ tự động kích hoạt **Realistic Resend Sandbox Simulator** – cho phép thử nghiệm gửi thư, sinh mã Message ID và đối soát Webhook hoàn chỉnh mà không tốn phí gửi email.

---

## 📨 TÀI LIỆU CẤU HÌNH RESEND WEBHOOK

Để đồng bộ trạng thái khi học viên mở email hoặc click liên kết:
1. Đăng nhập vào [Resend Dashboard](https://resend.com/webhooks).
2. Nhấn **Add Webhook**.
3. Điền các thông tin:
   * **Endpoint URL**: `https://<ten-mien-cua-ban>/api/webhooks/resend` (hoặc copy trực tiếp từ tab *Email & Resend Webhook* trong CMS).
   * **Events**: Tích chọn `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`.
4. Nhấn **Create Webhook**, sau đó copy chuỗi **Signing Secret** (`whsec_...`) và dán vào ô *Cài Đặt Webhook* trong CMS để xác thực dữ liệu gửi về.

---

## 🏢 BẢN QUYỀN & THÔNG TIN LIÊN HỆ

* **Đơn vị chủ quản**: CÔNG TY CỔ PHẦN TWINGS ACADEMY
* **Đối tác chiến lược đào tạo**: Khối Quản trị Nguồn Nhân Lực & Khối KHDN – Ngân hàng TMCP Hàng Hải Việt Nam (MSB)
* **Trụ sở học viện**: Tòa nhà ROX Tower, 54A Nguyễn Chí Thanh, Quận Đống Đa, TP. Hà Nội
* **Hotline hỗ trợ**: `1900 633 898`
* **Email tuyển sinh**: `tuyensinh@twings.edu.vn`

---
*© 2026 TWings Academy. Giữ toàn bộ bản quyền nền tảng và tài liệu đào tạo.*
