# Hướng dẫn sử dụng – Đào tạo doanh nghiệp (TMS B2B)

Dành cho nhân sự vận hành đào tạo doanh nghiệp, kế toán và người duyệt. Mọi màn hình nằm trong
`/app` → nhóm **Đào tạo doanh nghiệp**. Câu hỏi nghiệp vụ còn mở và mặc định hệ thống đang dùng:
[TMS_CAU_HOI_CAN_TRA_LOI.md](TMS_CAU_HOI_CAN_TRA_LOI.md).

## 1. Vai trò và quyền

| Vai trò | Làm được |
|---|---|
| **Đào tạo doanh nghiệp** | Toàn bộ quy trình: khách hàng, hợp đồng, kế hoạch, lớp, học viên, điểm danh, khảo sát, kết quả, email, nghiệm thu, hồ sơ, chi phí, link cho khách hàng, duyệt |
| **Kế toán & Tài chính** | Xem; lập và xuất nghiệm thu; ghi nhận chi phí |
| **Vận hành Đào tạo & LMS** | Xem |
| **Quản trị tối cao** | Tất cả |

Quyền chi tiết chỉnh ở **Hệ thống → Nhân sự & phân quyền** (nhóm "8. Đào tạo doanh nghiệp"). Các bước
"duyệt" cần quyền **Duyệt (doanh nghiệp)**.

**Duyệt 2 cấp:** đợt nghiệm thu từ **100.000.000 đ** và khoản chi từ **20.000.000 đ** (gồm VAT) cần hai người:
người thứ nhất bấm *Duyệt* (ghi "Đã duyệt cấp 1 · chờ duyệt cấp cuối"), sau đó **một người khác** có quyền
**Duyệt cấp cuối (doanh nghiệp)** bấm *Duyệt cấp cuối*. Mặc định chỉ Quản trị tối cao có quyền này; cấp thêm
cho trưởng bộ phận ở màn phân quyền. Đợt trả về "Đang lập" hoặc khoản chi bị sửa sau cấp 1 thì duyệt lại từ đầu.
Ngưỡng đổi bằng biến `CORPORATE_SECOND_APPROVAL_ACCEPTANCE` / `_EXPENSE` (0 = một cấp).

## 2. Quy trình một lớp, từ đầu đến cuối

1. **Khách hàng & hợp đồng** → *Thêm khách hàng* (mã viết tắt, **tên miền email** được nhận CC, **CC mặc định**).
   Hệ thống tạo sẵn một pháp nhân; thêm đơn vị / phòng ban nếu cần. *Thêm hợp đồng*: số HĐ, hiệu lực, giá trị,
   VAT và **đơn giá** (theo lớp / học viên / buổi / giờ / trọn gói; có thể riêng cho một khóa).
2. **Kế hoạch đào tạo** → *Thêm kế hoạch* → thêm dòng hoặc **Nhập từ Excel** (file kế hoạch của khách hàng) →
   *Duyệt*. Kế hoạch đã duyệt không sửa; cần đổi thì *Tạo phiên bản mới*. Ở mỗi dòng đã duyệt: **Tạo lớp**.
3. **Lớp doanh nghiệp** → *Tạo lớp* (khách hàng, khóa học, tên, ngày, địa điểm, hợp đồng). Lớp **không hiện trên
   website / tuyển sinh**, có khóa Moodle riêng.
4. **Học viên** (tab *Học viên*): thêm từng người hoặc **Nhập từ Excel** (DSHV). Có cột *Email CBQL* thì CBQL được
   lưu theo ngày. Trùng email / điện thoại với học viên đã có → dùng chung hồ sơ. Học viên được **mở khóa học trên
   Moodle ngay**, đăng nhập `/learn` bằng email + mã 6 số.
5. **Lịch học**: nút *Lịch học* → tạo nhanh theo mẫu → *Lưu lịch* (đưa lên lịch Moodle; mỗi buổi một phiên điểm danh).
6. **Thư mời**: nút *Gửi thư mời* → xem trước người nhận (To, CC, CC bị loại do sai tên miền) → gửi. Mỗi học viên
   một thư, kèm tệp lịch `.ics`.
7. **Điểm danh** (tab *Điểm danh*): ở đầu buổi, giảng viên / PIC bấm **Mở QR** của buổi đó (trang Moodle hiện mã QR
   xoay vòng), học viên quét bằng điện thoại. Có mặt / đi muộn theo giờ quét. Sai sót (quên quét, vắng có phép, học bù):
   bấm vào ô của học viên → *Gửi đề nghị* có lý do; **chỉ tính khi được duyệt**.
8. **Khảo sát** (tab *Khảo sát*): tạo hoạt động **Phản hồi (Feedback)** trên Moodle (nên đặt ở khóa mẫu để lớp nào
   cũng có). Kết quả tự đọc về; nút *Cập nhật từ Moodle* để lấy ngay.
9. **Kết quả** (tab *Kết quả*): đặt điều kiện hoàn thành (chuyên cần, điểm, khảo sát, hoàn thành Moodle) →
   *Tính kết quả (bản nháp)* → kiểm tra → **Phát hành**. Phát hành **chốt lớp**: không điều chỉnh điểm danh nữa,
   bản phát hành không đổi. Cần sửa: *Mở lại để sửa* → phiên bản mới. *Xuất Excel* để gửi khách hàng;
   *In / Lưu PDF* mở bản in A4 (bản nháp có nhãn BẢN NHÁP).
10. **Truyền thông** (tab *Truyền thông*): *Tạo lô thư kết quả* (lời nhắn chung) → xem người nhận → **Duyệt** →
    *Gửi*. Mỗi học viên nhận kết quả của riêng mình, CC CBQL. Gửi nhầm → *Gửi đính chính*.
    Loại thư **Báo cáo cho cán bộ quản lý**: mỗi CBQL một thư tổng hợp kết quả các nhân viên của mình
    (CBQL ngoài tên miền được phép thì không gửi).
11. **Hồ sơ** (tab *Hồ sơ*): checklist tự đánh dấu mục hệ thống đã có; tải lên bản ký (điểm danh, biên bản…),
    tải lại cùng tiêu đề = phiên bản mới.
12. **Chi phí** (tab *Chi phí*): ghi nhận chi phí theo hạng mục; **tạm ứng** chỉ tính vào chi phí khi có
    **quyết toán**. Khoản đã duyệt không sửa / xóa.
13. **Nghiệm thu** → *Lập đợt nghiệm thu* (khách hàng, hợp đồng, kỳ, cơ sở tính học viên) → các lớp đã phát hành
    kết quả được tính tự động (khối lượng × đơn giá, VAT) → *Gửi duyệt* → **Duyệt** → *Khách hàng đã nghiệm thu*
    (nhập số / ngày hóa đơn). Đợt đã nghiệm thu không sửa; sai sót → đợt mới chọn *chỉ gồm điều chỉnh* → *Dòng điều
    chỉnh* (số tiền âm để giảm, gắn với dòng cũ). *Xuất Excel* hoặc *In / Lưu PDF*: biên bản nghiệm thu chuẩn
    (quốc hiệu, căn cứ hợp đồng, Bên A / Bên B, khối lượng – giá trị – số tiền bằng chữ, chất lượng, thanh toán,
    chữ ký) + bảng kê theo lớp + danh sách học viên. Địa chỉ, MST, người đại diện của khách hàng nhập ở trang khách
    hàng; của TNTalent đặt trong cấu hình (`CORPORATE_PROVIDER_*`); để trống thì in dòng chấm để điền tay.
14. **Công nợ**: các đợt khách hàng đã nghiệm thu (gồm VAT), hạn thanh toán (ngày hóa đơn + số ngày trong hợp
    đồng), tuổi nợ. *Ghi nhận tiền về* (số tiền, ngày, chứng từ); không ghi vượt số còn phải thu.
15. **Chi phí chung theo hợp đồng** (trang khách hàng): khoản chi cho nhiều lớp (hội trường cả đợt…) → *Phân bổ*
    theo số học viên / buổi / giờ / chia đều; tổng phân bổ đúng bằng khoản chi. Chi phí lớp = chi phí riêng + phần
    được phân bổ.
16. **Thực hiện kế hoạch** (trang kế hoạch đã duyệt): mỗi dòng so lớp đã mở / xong, học viên, chi phí so với
    ngân sách (vượt thì tô đỏ), giá trị đã nghiệm thu.
17. **Yêu cầu & SLA**: mọi yêu cầu của khách hàng (mở lớp, đổi lịch / học viên, báo cáo, hồ sơ) → *Ghi nhận yêu
    cầu* (khách hàng, nội dung, người yêu cầu, kênh, **ưu tiên**, người xử lý). Hạn xử lý tự tính theo giờ làm việc
    thứ 2–6 (8h–17h): **Khẩn 4 giờ, Cao 1 ngày, Thường 3 ngày, Thấp 5 ngày**; ngày lễ thì sửa hạn bằng tay. Xong thì
    chọn trạng thái *Đã xong* + ghi kết quả. Mỗi sáng ngày làm việc (8h15) người xử lý nhận email các yêu cầu quá hạn
    / sắp đến hạn; yêu cầu chưa giao người gửi về email liên hệ chung (`CORPORATE_CONTACT_EMAIL`).

## 3. Theo dõi

- **Tổng quan B2B**: lớp, lượt / học viên duy nhất, buổi đã học; hoàn thành, chuyên cần, hài lòng; giá trị HĐ, đã /
  chờ nghiệm thu, chi phí, **biên đóng góp theo lớp**. Rê chuột lên ô số để xem định nghĩa.
  Mục **Cần xử lý**: lớp học xong chưa chốt kết quả, đã chốt chưa nghiệm thu, chưa gắn HĐ, hồ sơ thiếu, điều chỉnh
  chờ duyệt, thư bị dội, đợt đã duyệt lâu chưa được nghiệm thu, **yêu cầu quá hạn / sắp đến hạn SLA**. Bấm để mở
  đúng lớp / đợt / trang yêu cầu.
- **Yêu cầu & SLA**: số đang mở, quá hạn, **tỷ lệ xong đúng hạn 90 ngày**.
- **Link báo cáo cho khách hàng** (trang khách hàng): tạo link có hạn để khách hàng tự xem kết quả đã chốt (không cần
  tài khoản). Link chỉ hiện **một lần** khi tạo; thu hồi được bất cứ lúc nào. Khách hàng in / lưu PDF trang này được
  (mỗi lớp một trang).

## 4. Nguyên tắc cần nhớ

- Lớp doanh nghiệp **không qua đơn học phí**; doanh thu B2B (nghiệm thu) không cộng vào học phí / VietQR B2C.
- Số liệu đã **phát hành / nghiệm thu** không bao giờ bị sửa đè: sửa = phiên bản mới hoặc dòng điều chỉnh, có nhật ký.
- Thiếu dữ liệu thì hiện **"Chờ xác minh"**, hệ thống không tự bù.
- Email: mỗi học viên một thư; CC ngoài tên miền khách hàng / nội bộ bị loại tự động.
- Không đưa file thật của khách hàng vào kho mã (repo công khai); tải lên qua `/app` (kho riêng tư).
