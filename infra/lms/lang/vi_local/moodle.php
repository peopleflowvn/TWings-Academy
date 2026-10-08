<?php
// TWings wording of Moodle's own e-mails (Vietnamese, the site language). Copied by twings_setup.php to
// $CFG->dataroot/lang/vi_local/ on every deploy: Moodle's language customisation mechanism, so the
// strings survive Moodle upgrades and the language pack updates. Keep Moodle's {$a->...} placeholders.

$string['newusernewpasswordsubj'] = 'Tài khoản học trực tuyến của bạn';
$string['newusernewpasswordtext'] = 'Chào {$a->firstname},

TWings Academy đã tạo tài khoản học trực tuyến cho bạn tại {$a->sitename}.

Cách nhanh nhất: mở <a href="{$a->link}">cổng học viên</a>, chọn "Đăng nhập bằng TWings" và nhập mã 6 chữ số
gửi tới email này. Không cần nhớ mật khẩu.

Hoặc đăng nhập bằng mật khẩu:
   Tên đăng nhập: {$a->username}
   Mật khẩu: {$a->newpassword}
(Lần đăng nhập đầu tiên, hệ thống sẽ yêu cầu bạn đổi mật khẩu.)

Học phí, hóa đơn, hồ sơ nhập học và chứng chỉ có ở mục "Học phí & hồ sơ" trong cổng học viên.

Cần hỗ trợ, vui lòng liên hệ hello@twings.edu.vn.
{$a->signoff}';
$string['emailresetconfirmationsubject'] = '{$a}: Đặt lại mật khẩu';
$string['emailresetconfirmation'] = 'Chào {$a->firstname},

Có yêu cầu đặt lại mật khẩu cho tài khoản \'{$a->username}\' tại {$a->sitename}.

Để đặt mật khẩu mới, bấm vào liên kết sau:

<a href="{$a->link}">Đặt lại mật khẩu</a>

(Liên kết có hiệu lực trong {$a->resetminutes} phút kể từ khi gửi yêu cầu.)

Nếu bạn không yêu cầu, hãy bỏ qua email này. Bạn luôn có thể đăng nhập bằng nút "Đăng nhập bằng TWings"
và mã gửi qua email, không cần mật khẩu.

Cần hỗ trợ, vui lòng liên hệ hello@twings.edu.vn.
{$a->admin}';
