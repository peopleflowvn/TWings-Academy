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
  CreditCard, 
  Tag, 
  Sparkles,
  Zap,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Order } from '../types';

interface CourseraCheckoutModalProps {
  course: Course;
  onClose: () => void;
  onPaymentSuccess: (order: Order) => void;
}

export const CourseraCheckoutModal: React.FC<CourseraCheckoutModalProps> = ({
  course,
  onClose,
  onPaymentSuccess,
}) => {
  const [customerName, setCustomerName] = useState('Hoàng Minh Tuấn');
  const [customerEmail, setCustomerEmail] = useState('tuan.hoang@gmail.com');
  const [customerPhone, setCustomerPhone] = useState('0912345678');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Payment states
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'verifying' | 'paid'>('pending');
  const [countdownSeconds, setCountdownSeconds] = useState(180);

  const orderCode = `CR-${Math.floor(100000 + Math.random() * 900000)}`;
  const finalPrice = Math.round(course.price * (1 - discountPercent / 100));

  // Banking config
  const bankConfig = {
    bankName: 'MB Bank (Ngân hàng Quân Đội)',
    accountNumber: '03001010888899',
    accountName: 'CONG TY CP GIAO DUC TRUC TUYEN COURSERA VIETNAM',
    transferMemo: orderCode,
  };

  // Dynamic VietQR QuickLink API
  const vietQrUrl = `https://img.vietqr.io/image/MB-${bankConfig.accountNumber}-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(bankConfig.accountName)}`;

  // Apply Coupon
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (code === 'COURSERA2026' || code === 'AILEARNER') {
      setDiscountPercent(20);
      setCouponApplied(true);
    } else if (code === 'VIP10') {
      setDiscountPercent(10);
      setCouponApplied(true);
    } else {
      setCouponError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Copy text helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Countdown timer
  useEffect(() => {
    if (paymentStatus !== 'pending') return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentStatus]);

  // Simulate Instant Banking Webhook
  const handleSimulatePaymentSuccess = () => {
    setPaymentStatus('verifying');
    setTimeout(() => {
      setPaymentStatus('paid');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderCode,
        courseId: course.id,
        courseTitle: course.title,
        amount: finalPrice,
        originalAmount: course.price,
        discountAmount: course.price - finalPrice,
        discountCode: couponApplied ? couponCode : undefined,
        customerName,
        customerEmail,
        customerPhone,
        status: 'paid',
        paymentMethod: 'vietqr',
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString()
      };
      onPaymentSuccess(newOrder);
    }, 1200);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-6">
        {/* Modal Header */}
        <div className="bg-[#00255A] text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Hệ Thống Thanh Toán Tự Động VietQR</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold">
              Đăng Ký & Kích Hoạt Khóa Học
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {paymentStatus === 'paid' ? (
            /* Success Screen */
            <div className="text-center py-8 space-y-5 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">
                  Thanh Toán Thành Công!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  Khóa học <strong className="text-slate-900">{course.title}</strong> đã được kích hoạt ngay lập tức vào tài khoản học của bạn.
                </p>
                <div className="text-xs font-mono font-bold text-slate-500">
                  Mã đơn hàng: {orderCode}
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 bg-[#0056D2] hover:bg-[#00419E] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Vào Bàn Học Của Tôi Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Order Course Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex gap-4 items-center">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-20 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[#0056D2]">
                    {course.partner?.name} · {course.level}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                    {course.title}
                  </h4>
                  <div className="text-xs text-slate-500 font-mono">
                    Học phí: <strong className="text-slate-900">{formatVND(course.price)}</strong>
                  </div>
                </div>
              </div>

              {/* Coupon input */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Nhập mã ưu đãi (Thử: COURSERA2026)"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] uppercase font-mono"
                  />
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Áp dụng
                </button>
              </form>

              {couponApplied && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="font-semibold">Mã {couponCode} áp dụng thành công: Giảm {discountPercent}%</span>
                  <span className="font-bold font-mono">-{formatVND(course.price - finalPrice)}</span>
                </div>
              )}
              {couponError && (
                <div className="text-xs text-red-600 font-medium">{couponError}</div>
              )}

              {/* QR Code and Bank Details */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-2">
                {/* VietQR Image */}
                <div className="sm:col-span-5 flex flex-col items-center space-y-2">
                  <div className="p-3 bg-white border-2 border-[#0056D2] rounded-2xl shadow-md w-full max-w-[210px] text-center">
                    <img
                      src={vietQrUrl}
                      alt="VietQR MB Bank"
                      className="w-full aspect-square object-contain"
                    />
                    <div className="text-[10px] font-bold text-slate-500 mt-2">
                      Quét bằng App Ngân Hàng bất kỳ
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Hết hạn sau: {Math.floor(countdownSeconds / 60)}:{(countdownSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                {/* Transfer Info with Copy Buttons */}
                <div className="sm:col-span-7 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Ngân hàng:</span>
                    <strong className="text-slate-900">{bankConfig.bankName}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <button
                      onClick={() => copyToClipboard(bankConfig.accountNumber, 'acc')}
                      className="flex items-center gap-1 font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      <span>{bankConfig.accountNumber}</span>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <strong className="text-slate-900 text-right truncate max-w-[180px]">{bankConfig.accountName}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Nội dung CK:</span>
                    <button
                      onClick={() => copyToClipboard(bankConfig.transferMemo, 'memo')}
                      className="flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 cursor-pointer"
                    >
                      <span>{bankConfig.transferMemo}</span>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-700 font-bold">Số tiền thanh toán:</span>
                    <span className="text-lg font-black text-[#0056D2] font-mono">
                      {formatVND(finalPrice)}
                    </span>
                  </div>

                  {copiedField && (
                    <div className="text-[11px] text-emerald-600 font-bold text-center pt-1 animate-fadeIn">
                      ✓ Đã sao chép vào bộ nhớ tạm!
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation button for demo testing */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulatePaymentSuccess}
                  disabled={paymentStatus === 'verifying'}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {paymentStatus === 'verifying' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kiểm tra giao dịch với ngân hàng...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>⚡ Giả lập Quét mã & Thanh toán thành công (Webhook Ngân Hàng)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Giao dịch an toàn 100% qua chuẩn Napas 247 & VietQR</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
