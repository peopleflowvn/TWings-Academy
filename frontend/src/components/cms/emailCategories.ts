/** E-mail template categories (EmailTemplate.category on the server). */
export const EMAIL_CATEGORY_LABELS: Record<string, string> = {
  admission: '🎓 Tuyển sinh',
  payment: '💳 Học phí',
  lms: '📚 Đào tạo LMS',
  crm: '🤝 Chăm sóc (CRM)',
  scheduling: '📅 Lịch học',
  security: '🔐 Bảo mật',
  corporate: '🏢 Doanh nghiệp (B2B)',
  marketing: '📣 Marketing'
};

export const EMAIL_CATEGORIES = Object.keys(EMAIL_CATEGORY_LABELS);

export const EMAIL_STATUS_LABELS: Record<string, string> = {
  queued: 'Đang chờ gửi',
  sent: 'Đã gửi',
  delivered: 'Đã tới hộp thư',
  opened: 'Đã mở',
  clicked: 'Đã bấm liên kết',
  bounced: 'Bị trả về',
  complained: 'Bị báo spam',
  failed: 'Lỗi gửi',
  simulated: 'Mô phỏng (chưa gửi thật)'
};
