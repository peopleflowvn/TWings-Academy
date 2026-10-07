import React, { useCallback, useEffect, useState } from 'react';
import { Award, BookOpen, Briefcase, CheckCircle2, Copy, Loader2, LogOut, Mail, RotateCcw } from 'lucide-react';
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
  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-[11px] font-bold text-[#0056D2] uppercase">
          {order.kind === 'program' ? 'Chương trình' : 'Khóa học'} · Mã đơn {order.orderCode}
        </div>
        <h2 className="font-bold text-slate-900 text-lg">{order.title}</h2>
        <div className="text-xs text-slate-500">Đăng ký ngày {formatDate(order.createdAt)}</div>
      </div>
      <span className={`text-xs font-bold border rounded-full px-2.5 py-1 ${STATUS_STYLE[order.status] || ''}`}>
        {order.status === 'pending' && order.learningAccess ? 'Đang trả góp' : order.statusLabel}
      </span>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div><div className="text-slate-500">Học phí</div><div className="font-bold">{formatVND(order.amount)}</div></div>
      <div><div className="text-slate-500">Đã đóng</div><div className="font-bold text-emerald-700">{formatVND(order.totalPaid)}</div></div>
      {order.refunded > 0 && <div><div className="text-slate-500">Đã hoàn</div><div className="font-bold">{formatVND(order.refunded)}</div></div>}
      {order.status === 'pending' && <div><div className="text-slate-500">Còn lại</div><div className="font-bold text-amber-700">{formatVND(Math.max(order.amount - order.totalPaid, 0))}</div></div>}
    </div>

    {order.installments.length > 1 && (
      <div className="text-xs border border-slate-200 rounded-xl divide-y divide-slate-100">
        {order.installments.map((i) => (
          <div key={i.sequence} className="flex items-center justify-between px-3 py-2">
            <span>Kỳ {i.sequence} · hạn {formatDate(i.dueDate)}</span>
            <span className="font-mono font-bold">{formatVND(i.amount)}</span>
            <span className={i.paidAt ? 'text-emerald-700 font-bold' : i.overdue ? 'text-red-600 font-bold' : 'text-slate-500'}>
              {i.paidAt ? 'Đã đóng' : i.overdue ? 'Quá hạn' : 'Chưa đến hạn'}
            </span>
          </div>
        ))}
      </div>
    )}

    <PaymentBox order={order} />

    <div className="space-y-2">
      {order.courses.map((c, idx) => (
        <div key={`${c.title}-${idx}`} className="border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-[#0056D2]" />{c.title}</div>
              <div className="text-[11px] text-slate-500">
                {[c.cohortName && `Lớp ${c.cohortName}`, c.startDate && `khai giảng ${formatDate(c.startDate)}`, c.lmsStatusLabel].filter(Boolean).join(' · ')}
              </div>
            </div>
            {c.lmsStatus === 'done' && (
              <a href={learnUrl} className="px-3 py-1.5 rounded-xl bg-[#0056D2] text-white text-xs font-bold hover:bg-[#00419E]">Vào học</a>
            )}
          </div>
          {c.progress !== null && c.lmsStatus === 'done' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${c.completedAt ? 'bg-emerald-500' : 'bg-[#0056D2]'}`} style={{ width: `${c.progress}%` }} />
              </div>
              <span className="text-[11px] font-mono font-bold w-10 text-right">{c.progress}%</span>
            </div>
          )}
          {c.completedAt && (
            <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Hoàn thành ngày {formatDate(c.completedAt)}
            </div>
          )}
          {c.certificate && (
            <a href={c.certificate.url} target="_blank" rel="noopener" className="text-xs text-[#0056D2] font-bold flex items-center gap-1.5 hover:underline">
              <Award className="w-4 h-4" /> Chứng chỉ {c.certificate.code}
            </a>
          )}
          {c.certificate && (
            <a href={`${c.certificate.url}in/`} target="_blank" rel="noopener" className="text-xs text-slate-600 hover:underline">
              In / lưu PDF chứng chỉ
            </a>
          )}
          <ReviewBox course={c} learnerName={learnerName} />
        </div>
      ))}
    </div>

    {order.jobs && order.jobs.length > 0 && (
      <div className="text-xs border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 space-y-1.5">
        <div className="font-bold text-slate-900 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-emerald-700" /> Giới thiệu việc làm</div>
        {order.jobs.map((j, i) => (
          <div key={i}>
            <strong>{j.employer}</strong>{j.role ? ` – ${j.role}` : ''}: <span className="font-bold text-emerald-800">{j.stageLabel}</span>
            {j.interviewAt && ` · phỏng vấn ${new Date(j.interviewAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}${j.interviewLocation ? ` tại ${j.interviewLocation}` : ''}`}
            {j.startDate && ` · bắt đầu làm việc ${formatDate(j.startDate)}`}
          </div>
        ))}
      </div>
    )}
    {order.learningAccess && <DossierBox order={order} />}
    <InvoiceBox order={order} email={learnerEmail} onChange={onChange} />
    <RefundRequest order={order} onSent={onChange} />
  </div>
);

export const AccountPage: React.FC = () => {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    commerceApi.account().then(setAccount).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    document.title = 'Tài khoản học viên | TWings Academy';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Xin chào{account.name ? `, ${account.name}` : ''}</h1>
          <p className="text-xs text-slate-500">{account.email}</p>
        </div>
        <div className="flex gap-2">
          <a href={account.learnUrl} className="px-4 py-2 rounded-xl bg-[#0056D2] text-white text-sm font-bold hover:bg-[#00419E]">Vào TWings LMS</a>
          <button type="button" onClick={logout} className="px-3 py-2 rounded-xl border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </div>
      {account.orders.length === 0 && <p className="text-sm text-slate-600">Chưa có đơn đăng ký nào với email này.</p>}
      {account.orders.map((o) => (
        <OrderCard key={o.orderCode} order={o} learnUrl={account.learnUrl} learnerName={account.name} learnerEmail={account.email} onChange={replace} />
      ))}
    </div>
  );
};
