import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Building2, 
  CreditCard, 
  Tag, 
  Sparkles,
  Zap,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Order, Coupon } from '../types';
import { TWINGS_CONFIG, INITIAL_COUPONS } from '../data/coursesData';

interface CheckoutModalProps {
  course: Course;
  onClose: () => void;
  onPaymentSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  course,
  onClose,
  onPaymentSuccess,
}) => {
  const [customerName, setCustomerName] = useState('Nguyễn Hoàng Nam');
  const [customerEmail, setCustomerEmail] = useState('hoangnam.edu@gmail.com');
  const [customerPhone, setCustomerPhone] = useState('0987654321');
  const [couponCode, setCouponCode] = useState('TWINGS2026');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(INITIAL_COUPONS[0]);
  const [couponError, setCouponError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Order state
  const [orderCode] = useState(() => `TW-${Math.floor(10000 + Math.random() * 90000)}`);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes

  // Price calculations
  const originalPrice = course.price;
  const discountRate = appliedCoupon ? appliedCoupon.discountPercent / 100 : 0;
  const discountAmount = Math.round(originalPrice * discountRate);
  const finalAmount = originalPrice - discountAmount;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  // Timer countdown
  useEffect(() => {
    if (isPaid) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaid]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const found = INITIAL_COUPONS.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.isActive
    );
    if (found) {
      setAppliedCoupon(found);
    } else {
      setCouponError('Mã ưu đãi không hợp lệ hoặc đã hết lượt sử dụng.');
    }
  };

  const triggerPaymentSuccess = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const order: Order = {
        id: `ord-${Date.now()}`,
        orderCode,
        courseId: course.id,
        courseTitle: course.title,
        amount: finalAmount,
        originalAmount: course.originalPrice,
        discountAmount: course.originalPrice - finalAmount,
        discountCode: appliedCoupon?.code,
        status: 'paid',
        paymentMethod: 'vietqr',
        customerName,
        customerEmail,
        customerPhone,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      };

      setPaidOrder(order);
      setIsPaid(true);
      setIsVerifying(false);

      // Fire festive celebration
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // graceful ignore
      }

      onPaymentSuccess(order);
    }, 1200);
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  // VietQR Dynamic Image URL
  const vietQrUrl = `https://img.vietqr.io/image/${TWINGS_CONFIG.bankBin}-${TWINGS_CONFIG.accountNumber}-compact2.png?amount=${finalAmount}&addInfo=${orderCode}&accountName=${encodeURIComponent(
    'CONG TY CP GIAO DUC TWINGS'
  )}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#0F294D] text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isPaid ? 'Thanh Toán Thành Công & Kích Hoạt Khóa Học' : 'Cổng Thanh Toán Tự Động VietQR 24/7'}
              </h2>
              <p className="text-xs text-slate-300">
                {isPaid ? 'Đơn hàng đã được xác thực qua hệ thống Napas' : 'Mã đơn hàng: ' + orderCode + ' · Bảo mật chuẩn ngân hàng'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isPaid && paidOrder ? (
          /* Payment Success State */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Giao Dịch Đã Hoàn Tất Thành Công!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Hệ thống Twings Edu đã tự động đối soát giao dịch và kích hoạt khóa học vào tài khoản học viên của bạn.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 max-w-lg mx-auto text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-[#0F294D]">{paidOrder.orderCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Khóa học đăng ký:</span>
                <span className="font-semibold text-slate-800 text-right max-w-xs">{course.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Học viên:</span>
                <span className="font-medium text-slate-800">{paidOrder.customerName} ({paidOrder.customerPhone})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Phương thức thanh toán:</span>
                <span className="font-semibold text-emerald-700">VietQR Napas 24/7 (MB Bank)</span>
              </div>
              <div className="flex justify-between py-1 text-sm font-bold text-[#0F294D] pt-1">
                <span>Tổng tiền đã thanh toán:</span>
                <span className="font-mono text-base text-emerald-600">{formatVND(paidOrder.amount)}</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={onClose}
                className="px-8 py-3.5 bg-[#0F294D] hover:bg-[#1E3A8A] text-white font-bold text-sm rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Vào Phòng Học LMS Moodle Ngay</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        ) : (
          /* Active Checkout & VietQR State */
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left: QR Code & Bank Info (md:col-span-6) */}
            <div className="md:col-span-6 flex flex-col items-center justify-between space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="w-full flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#0F294D]" />
                  Quét mã qua App Ngân Hàng
                </span>
                <span className="text-amber-700 font-mono font-medium">
                  Hết hạn sau {minutes}:{seconds < 10 ? '0' : ''}{seconds}
                </span>
              </div>

              {/* QR Image with Frame */}
              <div className="relative p-2 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col items-center">
                <img
                  src={vietQrUrl}
                  alt={`VietQR ${orderCode}`}
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  onError={(e) => {
                    // Fallback visual QR matrix if remote image fails
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-48 h-48 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white text-xs p-4 text-center';
                      fallback.innerHTML = `<span class="text-amber-400 font-bold mb-2">VIETQR NAPAS 247</span><p>Mã: ${orderCode}</p><p class="mt-2 text-[11px] text-slate-300">Quét qua bất kỳ ứng dụng ngân hàng nào</p>`;
                      parent.appendChild(fallback);
                    }
                  }}
                />
                <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Mã QR động tự điền số tiền & nội dung
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="w-full space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Ngân hàng</span>
                    <span className="font-semibold text-slate-800">{TWINGS_CONFIG.bankName}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard('MB Bank', 'bank')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                    title="Sao chép"
                  >
                    {copiedField === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Số tài khoản</span>
                    <span className="font-mono font-bold text-[#0F294D] text-sm">{TWINGS_CONFIG.accountNumber}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(TWINGS_CONFIG.accountNumber, 'acc')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                    title="Sao chép"
                  >
                    {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Chủ tài khoản</span>
                    <span className="font-semibold text-slate-800">{TWINGS_CONFIG.accountName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <div>
                    <span className="text-amber-800 text-[10px] block font-medium">Nội dung chuyển khoản (Bắt buộc)</span>
                    <span className="font-mono font-bold text-amber-900 text-sm">{orderCode}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(orderCode, 'code')}
                    className="p-1 hover:bg-amber-100 rounded text-amber-800 cursor-pointer"
                    title="Sao chép"
                  >
                    {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Instant webhook simulation trigger */}
              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={triggerPaymentSuccess}
                  disabled={isVerifying}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xác thực giao dịch...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>⚡ Mô Phỏng Nhận Tiền Tự Động (Bank Webhook)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Order Details & Student Info (md:col-span-6) */}
            <div className="md:col-span-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0F294D] uppercase tracking-wider mb-2">
                    Thông Tin Khóa Học Đăng Ký
                  </h3>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 text-xs">{course.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {course.category} · Band {course.level} · {course.duration}
                    </div>
                  </div>
                </div>

                {/* Student Info Inputs */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#0F294D] uppercase tracking-wider">
                    Thông Tin Học Viên
                  </h3>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Họ và tên học viên
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Email nhận tài khoản
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Promo Voucher */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Mã ưu đãi / Voucher khuyến mãi
                  </label>
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Nhập mã (vd: TWINGS2026)"
                        className="w-full pl-9 pr-3 py-2 text-xs uppercase font-mono border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Áp Dụng
                    </button>
                  </form>
                  {appliedCoupon && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã áp dụng mã {appliedCoupon.code}: -{appliedCoupon.discountPercent}% ({appliedCoupon.description})
                    </div>
                  )}
                  {couponError && (
                    <div className="text-[11px] text-rose-600 font-medium">
                      {couponError}
                    </div>
                  )}
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Học phí khóa học:</span>
                  <span className="font-mono">{formatVND(originalPrice)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Ưu đãi voucher ({appliedCoupon.code} -{appliedCoupon.discountPercent}%):</span>
                    <span className="font-mono">-{formatVND(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-[#0F294D]">Số tiền cần thanh toán:</span>
                  <span className="text-xl font-extrabold text-[#0F294D] font-mono tabular-nums">
                    {formatVND(finalAmount)}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 italic text-center pt-2">
                  * Hệ thống ngân hàng Napas 24/7 đối soát tự động trong 3 - 5 giây. Không cần xác nhận qua tổng đài viên.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
