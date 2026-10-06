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
import { api, ApiError, isBackendEnabled } from '../lib/api';
import { getAttribution } from '../lib/attribution';
import { InstallmentRow, installmentPreview, Program } from '../lib/commerce';

export interface CheckoutPrefill {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface CourseraCheckoutModalProps {
  /** What is bought: a course, or a program (bundle of courses) when `program` is given. */
  course?: Course;
  program?: Program;
  prefill?: CheckoutPrefill;
  onClose: () => void;
  onPaymentSuccess: (order: Order) => void;
}

/** Payment instructions returned by POST /public/checkout/ (amount & memo come from the server). */
interface CheckoutInfo {
  orderCode: string;
  amount: number;
  originalAmount: number;
  discountAmount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  qrImageUrl: string;
  /** Whole price after discount; `amount` is what to transfer now (first installment when paying in installments). */
  totalAmount?: number;
  installments?: InstallmentRow[];
}

// Offline demo only (no backend configured): mirrors the seeded coupons.
const DEMO_COUPONS: Record<string, number> = { TWINGS2026: 20, MSB2026: 20, AILEARNER: 20, VIP10: 10 };
const DEMO_BANK = {
  bankBin: '970426',
  bankName: 'MSB (Ngân hàng Hàng Hải Việt Nam)',
  accountNumber: '0000000000',
  accountName: 'CONG TY CP TWINGS ACADEMY (DEMO)'
};
const POLL_INTERVAL_MS = 5000;

const newDemoOrderCode = () => {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return 'TW' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};

export const CourseraCheckoutModal: React.FC<CourseraCheckoutModalProps> = ({
  course,
  program,
  prefill,
  onClose,
  onPaymentSuccess,
}) => {
  const liveMode = isBackendEnabled();
  const item = {
    id: program?.id ?? course!.id,
    title: program?.title ?? course!.title,
    thumbnail: program?.thumbnail || course?.thumbnail || '',
    caption: program
      ? `Chương trình · ${program.courses.length} khóa học`
      : `${course!.partner?.name ?? 'TWings'} · ${course!.level}`,
    price: program?.price ?? course!.price,
    installmentCount: (program?.installmentCount ?? course!.installmentCount) || 1
  };
  const [payInInstallments, setPayInInstallments] = useState(false);
  // Course sold in intakes: the learner picks one (its early-bird price applies until the deadline).
  const intakes = (course?.upcomingCohorts || []).filter((c) => c.status === 'opening' && c.seatsLeft > 0);
  const [intakeName, setIntakeName] = useState(intakes[0]?.name || '');
  const chosenIntake = intakes.find((c) => c.name === intakeName);
  if (chosenIntake?.price !== undefined) item.price = chosenIntake.price;
  const [customerName, setCustomerName] = useState(prefill?.customerName || '');
  const [customerEmail, setCustomerEmail] = useState(prefill?.customerEmail || '');
  const [customerPhone, setCustomerPhone] = useState(prefill?.customerPhone || '');
  const [couponCode, setCouponCode] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Once created, the order (and its transfer memo) never changes while this modal is open.
  const [checkout, setCheckout] = useState<CheckoutInfo | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'verifying' | 'paid'>('pending');
  const [countdownSeconds, setCountdownSeconds] = useState(15 * 60);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!customerName.trim() || !customerEmail.includes('@') || customerPhone.trim().length < 9) {
      setFormError('Vui lòng nhập đầy đủ họ tên, email và số điện thoại hợp lệ.');
      return;
    }
    if (!privacyConsent) {
      setFormError('Bạn cần đồng ý với chính sách xử lý dữ liệu cá nhân để tiếp tục.');
      return;
    }

    if (!liveMode) {
      const code = couponCode.trim().toUpperCase();
      if (code && !DEMO_COUPONS[code]) {
        setFormError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
        return;
      }
      const discount = code ? Math.round((item.price * DEMO_COUPONS[code]) / 100) : 0;
      const demoCode = newDemoOrderCode();
      const amount = item.price - discount;
      setCheckout({
        orderCode: demoCode,
        amount,
        originalAmount: item.price,
        discountAmount: discount,
        bankName: DEMO_BANK.bankName,
        accountNumber: DEMO_BANK.accountNumber,
        accountName: DEMO_BANK.accountName,
        transferContent: demoCode,
        qrImageUrl: `https://img.vietqr.io/image/${DEMO_BANK.bankBin}-${DEMO_BANK.accountNumber}-compact2.png?amount=${amount}&addInfo=${demoCode}&accountName=${encodeURIComponent(DEMO_BANK.accountName)}`
      });
      return;
    }

    setSubmitting(true);
    try {
      const info = await api.post<CheckoutInfo>('/public/checkout/', {
        ...(program ? { programId: program.id } : { courseId: course!.id }),
        payInInstallments: payInInstallments && item.installmentCount > 1,
        ...(chosenIntake ? { batchCohort: chosenIntake.name } : {}),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        couponCode: couponCode.trim(),
        privacyConsent,
        attribution: getAttribution(),
        website: honeypot,
        source: 'Website Checkout'
      });
      setCheckout(info);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Không tạo được đơn hàng, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = (info: CheckoutInfo) => {
    setPaymentStatus('paid');
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    onPaymentSuccess({
      id: info.orderCode,
      orderCode: info.orderCode,
      courseId: item.id,
      courseTitle: item.title,
      amount: info.amount,
      originalAmount: info.originalAmount,
      discountAmount: info.discountAmount,
      discountCode: info.discountAmount ? couponCode.trim().toUpperCase() : undefined,
      customerName,
      customerEmail,
      customerPhone,
      status: 'paid',
      paymentMethod: 'vietqr',
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    });
  };

  // Live mode: poll the order status until the bank webhook confirms the transfer.
  useEffect(() => {
    if (!liveMode || !checkout || paymentStatus === 'paid') return;
    const timer = setInterval(async () => {
      try {
        const res = await api.get<{ status: string; learningAccess?: boolean }>(
          `/public/orders/${checkout.orderCode}/status/`
        );
        // Paid in full, or (installments) the first installment opened the learning.
        if (res.status === 'paid' || res.learningAccess) {
          clearInterval(timer);
          markPaid(checkout);
        }
      } catch {
        // transient network error: keep polling
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // markPaid is recreated each render; the effect only needs to restart when the order changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode, checkout, paymentStatus]);

  // Copy text helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Countdown timer (shown while waiting for the transfer)
  useEffect(() => {
    if (!checkout || paymentStatus !== 'pending') return;
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
  }, [checkout, paymentStatus]);

  // Offline demo only: pretend the bank webhook arrived.
  const handleSimulatePaymentSuccess = () => {
    if (!checkout) return;
    setPaymentStatus('verifying');
    setTimeout(() => markPaid(checkout), 1200);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const orderCode = checkout?.orderCode || '';

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
                  {liveMode ? (
                    <>
                      {program ? 'Chương trình' : 'Khóa học'} <strong className="text-slate-900">{item.title}</strong> đã
                      được mở trên hệ thống học TWings LMS. Thông tin đăng nhập được gửi tới email bạn đã đăng ký trong
                      ít phút (kiểm tra cả thư mục Spam).
                      {(checkout?.installments?.length ?? 0) > 1 && (
                        <>
                          {' '}Lịch đóng các kỳ tiếp theo và mã QR luôn có trong{' '}
                          <a href="/tai-khoan" className="text-[#0056D2] font-bold hover:underline">Tài khoản của tôi</a>.
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      Khóa học <strong className="text-slate-900">{item.title}</strong> đã được kích hoạt ngay lập tức vào tài khoản học của bạn.
                    </>
                  )}
                </p>
                <div className="text-xs font-mono font-bold text-slate-500">
                  Mã đơn hàng: {orderCode}
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                {liveMode ? (
                  <>
                    <a
                      href="/learn/"
                      className="w-full sm:w-auto px-6 py-3 bg-[#0056D2] hover:bg-[#00419E] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span>Vào Học Ngay (TWings LMS)</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <a
                      href="/tai-khoan"
                      className="w-full sm:w-auto px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      Tài khoản của tôi
                    </a>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-3 bg-[#0056D2] hover:bg-[#00419E] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Vào Bàn Học Của Tôi Ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Order Course Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex gap-4 items-center">
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-20 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[#0056D2]">{item.caption}</div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                    {item.title}
                  </h4>
                  <div className="text-xs text-slate-500 font-mono">
                    Học phí: <strong className="text-slate-900">{formatVND(item.price)}</strong>
                  </div>
                </div>
              </div>

              {!checkout ? (
                /* Step 1: applicant details; the order is created and priced server-side */
                <form onSubmit={handleCreateOrder} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Họ và tên *"
                      autoComplete="name"
                      maxLength={200}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2]"
                    />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email *"
                      autoComplete="email"
                      maxLength={254}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2]"
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Số điện thoại *"
                      autoComplete="tel"
                      maxLength={20}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2]"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Mã ưu đãi (nếu có)"
                      maxLength={50}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] uppercase font-mono"
                    />
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  {liveMode && intakes.length > 0 && (
                    <label className="block text-xs">
                      <span className="font-bold text-slate-700">Đợt khai giảng</span>
                      <select value={intakeName} onChange={(e) => setIntakeName(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl">
                        {intakes.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                            {c.startDate ? ` – khai giảng ${new Date(`${c.startDate}T00:00:00`).toLocaleDateString('vi-VN')}` : ''}
                            {c.price !== undefined ? ` – ${formatVND(c.price)}` : ''}
                            {c.earlyBirdDeadline ? ' (ưu đãi sớm)' : ''}
                            {` – còn ${c.seatsLeft} chỗ`}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {liveMode && item.installmentCount > 1 && item.price > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[false, true].map((split) => (
                        <label
                          key={String(split)}
                          className={`p-3 rounded-xl border cursor-pointer ${
                            payInInstallments === split ? 'border-[#0056D2] bg-blue-50' : 'border-slate-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="plan"
                            checked={payInInstallments === split}
                            onChange={() => setPayInInstallments(split)}
                            className="mr-2"
                          />
                          {split ? (
                            <>
                              <strong>Trả góp {item.installmentCount} kỳ</strong> – kỳ đầu{' '}
                              {formatVND(installmentPreview(item.price, item.installmentCount)[0])}, vào học ngay
                            </>
                          ) : (
                            <strong>Thanh toán một lần</strong>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  {/* Honeypot: hidden from people, filled in by bots */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                  />
                  <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Tôi đồng ý để TWings Academy xử lý dữ liệu cá nhân (họ tên, email, số điện thoại) nhằm ghi danh,
                      thanh toán và tư vấn khóa học theo{' '}<a href="/chinh-sach-bao-mat" target="_blank" rel="noopener" className="text-[#0056D2] underline">Chính sách bảo mật</a>.
                    </span>
                  </label>
                  {formError && <div className="text-xs text-red-600 font-medium">{formError}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-[#0056D2] hover:bg-[#00419E] disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    <span>Tạo Mã Thanh Toán VietQR</span>
                  </button>
                </form>
              ) : (
              <>
              {(checkout.installments?.length ?? 0) > 1 && (
                <div className="p-3 bg-blue-50 text-slate-700 text-xs rounded-xl border border-blue-200 space-y-1">
                  <div className="font-bold text-[#0056D2]">
                    Trả góp {checkout.installments!.length} kỳ – tổng {formatVND(checkout.totalAmount ?? checkout.amount)}
                  </div>
                  {checkout.installments!.map((i) => (
                    <div key={i.sequence} className="flex justify-between font-mono">
                      <span>Kỳ {i.sequence} · {new Date(`${i.dueDate}T00:00:00`).toLocaleDateString('vi-VN')}</span>
                      <span className={i.sequence === 1 ? 'font-bold text-slate-900' : ''}>{formatVND(i.amount)}</span>
                    </div>
                  ))}
                  <div className="text-[11px] text-slate-500">
                    Chuyển khoản kỳ 1 bên dưới để vào học ngay; hệ thống nhắc các kỳ sau qua email.
                  </div>
                </div>
              )}
              {checkout.discountAmount > 0 && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="font-semibold">Ưu đãi đã áp dụng</span>
                  <span className="font-bold font-mono">-{formatVND(checkout.discountAmount)}</span>
                </div>
              )}

              {/* QR Code and Bank Details */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-2">
                {/* VietQR Image */}
                <div className="sm:col-span-5 flex flex-col items-center space-y-2">
                  <div className="p-3 bg-white border-2 border-[#0056D2] rounded-2xl shadow-md w-full max-w-[210px] text-center">
                    <img
                      src={checkout.qrImageUrl}
                      alt={`VietQR ${checkout.bankName}`}
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
                    <strong className="text-slate-900">{checkout.bankName}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <button
                      onClick={() => copyToClipboard(checkout.accountNumber, 'acc')}
                      className="flex items-center gap-1 font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      <span>{checkout.accountNumber}</span>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <strong className="text-slate-900 text-right truncate max-w-[180px]">{checkout.accountName}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Nội dung CK:</span>
                    <button
                      onClick={() => copyToClipboard(checkout.transferContent, 'memo')}
                      className="flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 cursor-pointer"
                    >
                      <span>{checkout.transferContent}</span>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-700 font-bold">Số tiền thanh toán:</span>
                    <span className="text-lg font-black text-[#0056D2] font-mono">
                      {formatVND(checkout.amount)}
                    </span>
                  </div>

                  {copiedField && (
                    <div className="text-[11px] text-emerald-600 font-bold text-center pt-1 animate-fadeIn">
                      ✓ Đã sao chép vào bộ nhớ tạm!
                    </div>
                  )}
                </div>
              </div>

              {liveMode ? (
                <div className="pt-2 text-xs text-slate-600 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0056D2]" />
                  <span>Đang chờ ngân hàng xác nhận – trang sẽ tự cập nhật sau khi bạn chuyển khoản.</span>
                </div>
              ) : (
              /* Offline demo only: no backend, so simulate the bank webhook */
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
                      <span>⚡ [Demo] Giả lập thanh toán thành công</span>
                    </>
                  )}
                </button>
              </div>
              )}
              </>
              )}

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
