import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Award, BookOpen, Briefcase, CheckCircle2, Copy, Loader2, LogOut, Mail, RotateCcw } from 'lucide-react';
import { ApiError, isBackendEnabled, resetCsrfToken } from '../lib/api';
import { Account, AccountCourse, AccountOrder, commerceApi, Dossier, formatDate, formatVND } from '../lib/commerce';

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  refunded: 'bg-slate-100 text-slate-600 border-slate-300',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-300'
};

const SignIn: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await commerceApi.sendCode(email.trim());
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được mã, vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await commerceApi.verify(email.trim(), code.trim());
      resetCsrfToken();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Mã không đúng hoặc đã hết hạn.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#0056D2]';
  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <div>
        <h1 className="text-xl font-black text-slate-900">Tài khoản học viên</h1>
        <p className="text-xs text-slate-600 mt-1">
          Đăng nhập bằng email bạn đã dùng khi đăng ký khóa học. Chúng tôi gửi mã 6 chữ số, không cần mật khẩu.
        </p>
      </div>
      {step === 'email' ? (
        <form onSubmit={send} className="space-y-3">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email của bạn" className={input} />
          <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#0056D2] hover:bg-[#00419E] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Gửi mã đăng nhập
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-xs text-slate-600">
            Nếu <strong>{email}</strong> đã đăng ký tại TWings, mã đã được gửi tới hộp thư (kiểm tra cả Spam). Mã có hiệu lực 10 phút.
          </p>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="Mã 6 chữ số" className={`${input} font-mono tracking-[0.4em] text-center text-lg`} />
          <button type="submit" disabled={busy || code.length !== 6} className="w-full py-2.5 rounded-xl bg-[#0056D2] hover:bg-[#00419E] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Đăng nhập
          </button>
          <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
            Dùng email khác
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

const PaymentBox: React.FC<{ order: AccountOrder }> = ({ order }) => {
  const [copied, setCopied] = useState('');
  const p = order.payment;
  if (!p) return null;
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center bg-blue-50 border border-blue-200 rounded-xl p-4">
      <img src={p.qrImageUrl} alt="VietQR" className="w-36 h-36 bg-white rounded-lg border border-slate-200" />
      <div className="text-xs space-y-1.5 flex-1 w-full">
        <div className="font-bold text-[#0056D2] text-sm">Cần thanh toán: {formatVND(p.amount)}</div>
        <div>Ngân hàng: <strong>{p.bankName}</strong></div>
        <div className="flex items-center gap-2">
          Số tài khoản: <strong className="font-mono">{p.accountNumber}</strong>
          <button type="button" onClick={() => copy(p.accountNumber, 'acc')} className="text-slate-500 cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
        </div>
        <div>Chủ tài khoản: <strong>{p.accountName}</strong></div>
        <div className="flex items-center gap-2">
          Nội dung: <strong className="font-mono text-amber-700">{p.transferContent}</strong>
          <button type="button" onClick={() => copy(p.transferContent, 'memo')} className="text-slate-500 cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
        </div>
        {copied && <div className="text-emerald-700 font-bold">Đã sao chép</div>}
        <div className="text-slate-500">Hệ thống tự xác nhận sau khi nhận tiền.</div>
      </div>
    </div>
  );
};

const RefundRequest: React.FC<{ order: AccountOrder; onSent: (o: AccountOrder) => void }> = ({ order, onSent }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (order.refundRequested) {
    return <p className="text-xs text-amber-700 font-semibold">Đã gửi yêu cầu hoàn tiền – TWings sẽ liên hệ bạn trong 3 ngày làm việc.</p>;
  }
  if (order.refundable <= 0 || order.status === 'refunded') return null;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer">
        <RotateCcw className="w-3.5 h-3.5" /> Yêu cầu hoàn tiền
      </button>
    );
  }
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      onSent(await commerceApi.requestRefund(order.orderCode, reason.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3}
        placeholder="Lý do bạn muốn hoàn tiền" className="w-full p-2.5 text-xs border border-slate-300 rounded-xl" />
      <div className="flex gap-2">
        <button type="button" disabled={busy || reason.trim().length < 5} onClick={submit}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
          Gửi yêu cầu
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-slate-500 cursor-pointer">Hủy</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

/** A learner reviews a course they took; shown on the course page after TWings approves it. */
const ReviewBox: React.FC<{ course: AccountCourse; learnerName: string }> = ({ course, learnerName }) => {
  const [review, setReview] = useState(course.review);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(course.review?.rating || 5);
  const [comment, setComment] = useState(course.review?.comment || '');
  const [name, setName] = useState(learnerName);
  const [role, setRole] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!course.canReview) return null;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-[#0056D2] font-bold hover:underline cursor-pointer">
        {review ? `Đánh giá của bạn: ${review.rating}★ (${{ pending: 'chờ duyệt', approved: 'đã đăng', rejected: 'không đăng' }[review.status]}) – sửa` : 'Viết đánh giá khóa học'}
      </button>
    );
  }
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const next = await commerceApi.review({ orderCode: course.orderCode, rating, comment: comment.trim(), displayName: name.trim(), role: role.trim(), consent });
      setReview(next.review);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được đánh giá.');
    } finally {
      setBusy(false);
    }
  };
  const field = 'w-full p-2 text-xs border border-slate-300 rounded-xl';
  return (
    <div className="space-y-2 border-t border-slate-100 pt-2 text-xs">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className={`text-lg cursor-pointer ${n <= rating ? 'text-amber-500' : 'text-slate-300'}`}>★</button>
        ))}
      </div>
      <textarea rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className={field}
        placeholder="Điều bạn thấy hữu ích nhất, giảng viên, bài tập… (ít nhất 20 ký tự)" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={field} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Tên hiển thị (VD: Hà N.)" />
        <input className={field} value={role} maxLength={150} onChange={(e) => setRole(e.target.value)} placeholder="Vị trí / nơi làm việc (tùy chọn)" />
      </div>
      <label className="flex items-start gap-2 text-slate-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>Tôi đồng ý để TWings Academy đăng đánh giá này (kèm tên hiển thị và vị trí ở trên) trên website.</span>
      </label>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || comment.trim().length < 20 || !name.trim() || !consent} onClick={submit}
          className="px-3 py-1.5 rounded-xl bg-[#0056D2] text-white font-bold cursor-pointer disabled:opacity-50">Gửi đánh giá</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-slate-500 cursor-pointer">Hủy</button>
      </div>
    </div>
  );
};

/** Step 6: the learner completes the enrolment file (CCCD is stored encrypted and never shown back). */
const DossierBox: React.FC<{ order: AccountOrder }> = ({ order }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Dossier | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const missing = data ? data.missing : order.dossierMissing;
  const load = () =>
    commerceApi.dossier(order.orderCode).then((d) => {
      setData(d);
      setForm({
        birthDate: d.birthDate || '', gender: d.gender || '', citizenId: '', issuedPlace: d.issuedPlace || '',
        permanentAddress: d.permanentAddress || '', currentResidence: d.currentResidence || '', educationLevel: d.educationLevel || '',
        major: d.major || '', university: d.university || '', graduationYear: d.graduationYear || '',
        contactPersonName: d.contactPersonName || '', contactPersonPhone: d.contactPersonPhone || '', contactRelation: d.contactRelation || ''
      });
    });
  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const body: Record<string, string | null> = { ...form, birthDate: form.birthDate || null };
      const next = await commerceApi.saveDossier(order.orderCode, body);
      setData(next);
      setForm({ ...form, citizenId: '' });
      setMsg(next.missing.length ? 'Đã lưu – còn thiếu một số mục bắt buộc.' : 'Đã lưu hồ sơ nhập học. Cảm ơn bạn!');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Không lưu được hồ sơ.');
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setMsg('');
    try {
      setData(await commerceApi.uploadCv(order.orderCode, file));
      setMsg('Đã tải CV lên.');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Không tải được CV.');
    } finally {
      setBusy(false);
    }
  };
  const field = 'w-full p-2 text-xs border border-slate-300 rounded-xl';
  const f = (key: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="text-[11px] text-slate-600">{label}
      <input className={field} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </label>
  );
  if (!open) {
    return (
      <button type="button" onClick={() => { setOpen(true); load(); }}
        className={`text-xs font-bold hover:underline cursor-pointer ${missing.length ? 'text-amber-700' : 'text-emerald-700'}`}>
        {missing.length ? `Hồ sơ nhập học: còn thiếu ${missing.length} mục – hoàn thiện ngay` : 'Hồ sơ nhập học: đã đủ – xem / sửa'}
      </button>
    );
  }
  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
      <div className="font-bold text-slate-800">Hồ sơ nhập học <span className="font-normal text-slate-500">(* bắt buộc; CCCD được mã hóa khi lưu)</span></div>
      {!data ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {f('birthDate', 'Ngày sinh *', { type: 'date' })}
            <label className="text-[11px] text-slate-600">Giới tính
              <select className={field} value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">–</option><option>Nam</option><option>Nữ</option><option>Khác</option>
              </select>
            </label>
            {f('citizenId', data.citizenIdMasked ? `CCCD * (đã lưu ${data.citizenIdMasked}; để trống nếu không đổi)` : 'Số CCCD *', { inputMode: 'numeric', maxLength: 12 })}
            {f('issuedPlace', 'Nơi cấp')}
            {f('permanentAddress', 'Địa chỉ thường trú *')}
            {f('currentResidence', 'Nơi ở hiện tại')}
            {f('educationLevel', 'Trình độ * (VD: Đại học)')}
            {f('major', 'Chuyên ngành')}
            {f('university', 'Trường')}
            {f('graduationYear', 'Năm tốt nghiệp')}
            {f('contactPersonName', 'Người liên hệ khẩn cấp')}
            {f('contactPersonPhone', 'SĐT người liên hệ')}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy} onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0056D2] text-white font-bold cursor-pointer disabled:opacity-50">Lưu hồ sơ</button>
            <label className="cursor-pointer text-[#0056D2] font-bold">
              {data.hasCv ? 'Thay CV (PDF/DOCX)' : 'Tải CV lên (PDF/DOCX, ≤ 5 MB)'}
              <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {data.hasCv && <span className="text-emerald-700">Đã có CV</span>}
            <button type="button" onClick={() => setOpen(false)} className="text-slate-500 cursor-pointer">Đóng</button>
          </div>
          {msg && <p className={msg.startsWith('Đã') ? 'text-emerald-700' : 'text-red-600'}>{msg}</p>}
        </>
      )}
    </div>
  );
};

/** Step 5: VAT invoice request (company or personal). */
const InvoiceBox: React.FC<{ order: AccountOrder; email: string; onChange: (o: AccountOrder) => void }> = ({ order, email, onChange }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ buyerType: 'company' as 'company' | 'person', companyName: '', taxCode: '', address: '', email });
  const [error, setError] = useState('');
  if (order.invoice?.status === 'issued') return <p className="text-xs text-emerald-700">Đã xuất hóa đơn {order.invoice.number}.</p>;
  if (order.totalPaid <= 0) return null;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer">
        {order.invoice ? 'Đã gửi yêu cầu xuất hóa đơn – sửa thông tin' : 'Yêu cầu xuất hóa đơn VAT'}
      </button>
    );
  }
  const submit = async () => {
    setError('');
    try {
      onChange(await commerceApi.requestInvoice(order.orderCode, form));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu.');
    }
  };
  const field = 'w-full p-2 text-xs border border-slate-300 rounded-xl';
  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
      <div className="flex gap-3">
        {(['company', 'person'] as const).map((t) => (
          <label key={t} className="flex items-center gap-1.5"><input type="radio" checked={form.buyerType === t} onChange={() => setForm({ ...form, buyerType: t })} />{t === 'company' ? 'Công ty' : 'Cá nhân'}</label>
        ))}
      </div>
      {form.buyerType === 'company' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className={field} placeholder="Tên công ty *" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <input className={field} placeholder="Mã số thuế *" value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value.trim() })} />
          <input className={`${field} sm:col-span-2`} placeholder="Địa chỉ *" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
      )}
      <input className={field} type="email" placeholder="Email nhận hóa đơn" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={submit} className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold cursor-pointer">Gửi yêu cầu</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-slate-500 cursor-pointer">Hủy</button>
      </div>
    </div>
  );
};

const OrderCard: React.FC<{ order: AccountOrder; learnUrl: string; learnerName: string; learnerEmail: string; onChange: (o: AccountOrder) => void }> = ({ order, learnUrl, learnerName, learnerEmail, onChange }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-xs hover:shadow-md transition-shadow">
    <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0056D2] uppercase tracking-wider mb-1.5">
          {order.kind === 'program' ? 'Chương trình trọn gói' : 'Khóa học thực chiến'} · Đơn #{order.orderCode}
        </div>
        <h2 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">{order.title}</h2>
        <div className="text-xs text-slate-500 mt-0.5">Ngày đăng ký: {formatDate(order.createdAt)}</div>
      </div>
      <span className={`text-xs font-bold border rounded-full px-3 py-1 shadow-2xs ${STATUS_STYLE[order.status] || ''}`}>
        {order.status === 'pending' && order.learningAccess ? 'Đang trả góp' : order.statusLabel}
      </span>
    </div>

    {/* Financial & Installment Summary */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs">
      <div>
        <div className="text-slate-500 text-[11px]">Học phí trọn gói</div>
        <div className="font-extrabold text-slate-900 text-sm mt-0.5">{formatVND(order.amount)}</div>
      </div>
      <div>
        <div className="text-slate-500 text-[11px]">Đã thanh toán</div>
        <div className="font-extrabold text-emerald-700 text-sm mt-0.5">{formatVND(order.totalPaid)}</div>
      </div>
      {order.refunded > 0 && (
        <div>
          <div className="text-slate-500 text-[11px]">Đã hoàn</div>
          <div className="font-extrabold text-slate-600 text-sm mt-0.5">{formatVND(order.refunded)}</div>
        </div>
      )}
      {order.status === 'pending' && (
        <div>
          <div className="text-slate-500 text-[11px]">Còn lại cần đóng</div>
          <div className="font-extrabold text-amber-700 text-sm mt-0.5">{formatVND(Math.max(order.amount - order.totalPaid, 0))}</div>
        </div>
      )}
    </div>

    {order.installments.length > 1 && (
      <div className="text-xs border border-slate-200/70 rounded-xl overflow-hidden divide-y divide-slate-100">
        <div className="bg-slate-50 px-3.5 py-2 font-bold text-slate-700 flex justify-between text-[11px] uppercase tracking-wider">
          <span>Tiến độ trả góp</span>
          <span>{order.installments.filter(i => i.paidAt).length}/{order.installments.length} kỳ hoàn thành</span>
        </div>
        {order.installments.map((i) => (
          <div key={i.sequence} className="flex items-center justify-between px-3.5 py-2.5">
            <span className="font-medium text-slate-700">Kỳ {i.sequence} · hạn {formatDate(i.dueDate)}</span>
            <span className="font-mono font-bold text-slate-800">{formatVND(i.amount)}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${i.paidAt ? 'bg-emerald-50 text-emerald-700' : i.overdue ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
              {i.paidAt ? 'Đã đóng' : i.overdue ? 'Quá hạn' : 'Chưa đến hạn'}
            </span>
          </div>
        ))}
      </div>
    )}

    <PaymentBox order={order} />

    {/* Course List inside Order */}
    <div className="space-y-3 pt-2">
      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-[#0056D2]" /> Các khóa học trong đơn
      </div>
      <div className="grid grid-cols-1 gap-3">
        {order.courses.map((c, idx) => (
          <div key={`${c.title}-${idx}`} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white hover:border-blue-200 transition-colors">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>{c.title}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                  {c.cohortName && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">Lớp: {c.cohortName}</span>}
                  {c.startDate && <span>Khai giảng: {formatDate(c.startDate)}</span>}
                  <span className={`font-semibold ${c.lmsStatus === 'done' ? 'text-emerald-700' : 'text-slate-500'}`}>
                    · {c.lmsStatusLabel}
                  </span>
                </div>
              </div>
              {c.lmsStatus === 'done' && (
                <a
                  href={learnUrl}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0056D2] to-[#0073C1] hover:from-[#00419E] hover:to-[#0056D2] text-white text-xs font-bold shadow-xs hover:shadow-sm inline-flex items-center gap-1.5 transition-all"
                >
                  Vào học LMS <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {c.progress !== null && c.lmsStatus === 'done' && (
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium text-[11px]">Tiến độ học tập</span>
                  <span className="font-mono font-bold text-[#0056D2]">{c.progress}%</span>
                </div>
                <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${c.completedAt ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#0073C1] to-[#0056D2]'}`}
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              </div>
            )}

            {c.completedAt && (
              <div className="text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-100 rounded-lg p-2.5 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Chúc mừng! Bạn đã hoàn thành khóa học vào {formatDate(c.completedAt)}.</span>
              </div>
            )}

            {c.certificate && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={c.certificate.url}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-[#0056D2] font-bold inline-flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Award className="w-4 h-4" /> Xem chứng chỉ {c.certificate.code}
                </a>
                <a
                  href={`${c.certificate.url}in/`}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Tải bản in / PDF
                </a>
              </div>
            )}

            <ReviewBox course={c} learnerName={learnerName} />
          </div>
        ))}
      </div>
    </div>

    {order.jobs && order.jobs.length > 0 && (
      <div className="text-xs border border-emerald-200 bg-emerald-50/60 rounded-xl p-4 space-y-2">
        <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
          <Briefcase className="w-4 h-4 text-emerald-700" /> Kết nối cơ hội việc làm
        </div>
        {order.jobs.map((j, i) => (
          <div key={i} className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 space-y-1">
            <div className="flex justify-between items-center">
              <strong className="text-slate-900">{j.employer}</strong>
              <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">{j.stageLabel}</span>
            </div>
            {j.role && <div className="text-slate-600">Vị trí: {j.role}</div>}
            {j.interviewAt && (
              <div className="text-slate-600">
                Phỏng vấn: {new Date(j.interviewAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                {j.interviewLocation ? ` tại ${j.interviewLocation}` : ''}
              </div>
            )}
            {j.startDate && <div className="text-emerald-700 font-medium">Bắt đầu công việc: {formatDate(j.startDate)}</div>}
          </div>
        ))}
      </div>
    )}

    {order.learningAccess && <DossierBox order={order} />}
    
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
      <InvoiceBox order={order} email={learnerEmail} onChange={onChange} />
      <RefundRequest order={order} onSent={onChange} />
    </div>
  </div>
);

export const AccountPage: React.FC = () => {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'my_learning' | 'all_orders'>(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    return tabParam === 'all_orders' ? 'all_orders' : 'my_learning';
  });

  const handleTabChange = (tab: 'my_learning' | 'all_orders') => {
    setActiveTab(tab);
    const search = new URLSearchParams(window.location.search);
    if (search.get('tab') !== tab) {
      search.set('tab', tab);
      window.history.replaceState(null, '', `${window.location.pathname}?${search.toString()}`);
    }
  };

  useEffect(() => {
    const onPop = () => {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'all_orders' || tabParam === 'my_learning') {
        setActiveTab(tabParam);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const load = useCallback(() => {
    commerceApi.account().then(setAccount).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    document.title = 'Bảng điều khiển học viên | TWings Academy';
    if (isBackendEnabled()) load();
  }, [load]);

  if (!isBackendEnabled()) return <p className="text-sm text-slate-600">Trang tài khoản cần kết nối máy chủ TWings.</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!account) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!account.authenticated) return <SignIn onDone={load} />;

  const logout = async () => {
    await commerceApi.logout();
    resetCsrfToken();
    load();
  };
  const replace = (next: AccountOrder) =>
    setAccount({ ...account, orders: account.orders.map((o) => (o.orderCode === next.orderCode ? next : o)) });

  // Calculate learning metrics across all orders
  const allEnrolledCourses = account.orders.flatMap(o => o.courses);
  const activeCourses = allEnrolledCourses.filter(c => c.lmsStatus === 'done' && !c.completedAt);
  const completedCourses = allEnrolledCourses.filter(c => !!c.completedAt);
  const certificatesCount = allEnrolledCourses.filter(c => !!c.certificate).length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Learner Hero Banner with Coursera/LMS Style */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#00388A] via-[#0050D8] to-[#0073C1] text-white p-6 sm:p-8 shadow-md">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-blue-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Không gian học tập cá nhân
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Chào mừng trở lại{account.name ? `, ${account.name}` : ''}!
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              Tài khoản: <strong className="font-mono text-white">{account.email}</strong>. Truy cập hệ thống TWings LMS để tiếp tục bài học, làm bài tập và nhận chứng chỉ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={account.learnUrl}
              className="px-5 py-3 rounded-xl bg-white text-[#00388A] hover:bg-blue-50 text-sm font-extrabold shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#0056D2]" /> Vào học ngay trên LMS <ArrowRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-white">
          <div className="bg-white/10 rounded-2xl p-3.5 backdrop-blur-xs border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">Khóa đang học</div>
            <div className="text-2xl font-black mt-0.5">{activeCourses.length}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3.5 backdrop-blur-xs border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">Đã hoàn thành</div>
            <div className="text-2xl font-black mt-0.5 text-emerald-300">{completedCourses.length}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3.5 backdrop-blur-xs border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">Chứng chỉ nhận được</div>
            <div className="text-2xl font-black mt-0.5 text-amber-300">{certificatesCount}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3.5 backdrop-blur-xs border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">Tổng số đơn hàng</div>
            <div className="text-2xl font-black mt-0.5">{account.orders.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('my_learning')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'my_learning'
              ? 'bg-[#0056D2] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Khóa học & Lớp học ({allEnrolledCourses.length})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('all_orders')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'all_orders'
              ? 'bg-[#0056D2] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Học phí & Đơn đăng ký ({account.orders.length})
        </button>
      </div>

      {/* Tab 1: My Learning Quick Deck */}
      {activeTab === 'my_learning' && (
        <div className="space-y-6">
          {allEnrolledCourses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-lg">Bạn chưa có khóa học nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Khám phá ngay các khóa học nghiệp vụ Ngân hàng thực chiến tại TWings Academy để bắt đầu lộ trình học tập.
              </p>
              <a
                href="/khoa-hoc"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0056D2] text-white text-xs font-bold hover:bg-[#00419E]"
              >
                Xem danh sách khóa học
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allEnrolledCourses.map((course, idx) => (
                <div
                  key={`${course.title}-${idx}`}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#0056D2] bg-blue-50 px-2.5 py-0.5 rounded-full uppercase">
                        Khóa học
                      </span>
                      {course.completedAt ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã xong
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500">
                          {course.lmsStatusLabel}
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">
                      {course.title}
                    </h3>
                    <div className="text-xs text-slate-500">
                      {[course.cohortName && `Lớp ${course.cohortName}`, course.startDate && `Khai giảng ${formatDate(course.startDate)}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    {course.progress !== null && course.lmsStatus === 'done' && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 text-[11px]">Tiến độ học</span>
                          <span className="font-mono font-bold text-[#0056D2]">{course.progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${course.completedAt ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#0073C1] to-[#0056D2]'}`}
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {course.certificate ? (
                        <a
                          href={course.certificate.url}
                          target="_blank"
                          rel="noopener"
                          className="text-xs text-[#0056D2] font-bold inline-flex items-center gap-1 hover:underline"
                        >
                          <Award className="w-3.5 h-3.5" /> Chứng chỉ
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">Chưa có chứng chỉ</span>
                      )}
                      {course.lmsStatus === 'done' ? (
                        <a
                          href={account.learnUrl}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0056D2] hover:bg-[#00419E] text-white text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          Vào lớp <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Đang chuẩn bị</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Orders & Invoices List */}
      {activeTab === 'all_orders' && (
        <div className="space-y-5">
          {account.orders.length === 0 && (
            <p className="text-sm text-slate-600 bg-white p-6 rounded-2xl border border-slate-200 text-center">
              Chưa có đơn đăng ký nào với email này.
            </p>
          )}
          {account.orders.map((o) => (
            <OrderCard key={o.orderCode} order={o} learnUrl={account.learnUrl} learnerName={account.name} learnerEmail={account.email} onChange={replace} />
          ))}
        </div>
      )}
    </div>
  );
};

