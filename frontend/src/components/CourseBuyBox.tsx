import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, MapPin, MessageCircle, QrCode, ShieldCheck, Clock3 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Order } from '../types';
import { api, ApiError, isBackendEnabled } from '../lib/api';
import { getAttribution } from '../lib/attribution';
import { canBuy, installmentLine, Intake, openIntakes, priceFor, viDate, vnd } from '../lib/selling';
import type { CheckoutPrefill } from './CourseraCheckoutModal';

interface CourseBuyBoxProps {
  course: Course;
  onCheckout: (course: Course, prefill: CheckoutPrefill) => void;
  onConsultSent?: (order: Order) => void;
}

/**
 * The course page's buying panel: price today, the intake to join, "Đăng ký học" (payment) first and a
 * short consultation form second. A course with no intake taking learners only takes consultations.
 */
export const CourseBuyBox: React.FC<CourseBuyBoxProps> = ({ course, onCheckout, onConsultSent }) => {
  const intakes = course.upcomingCohorts || [];
  const open = openIntakes(course);
  const buyable = canBuy(course);
  const [intakeName, setIntakeName] = useState(open[0]?.name || '');
  const intake: Intake | undefined = open.find((c) => c.name === intakeName);
  const price = priceFor(course, intake);
  const struck = course.originalPrice > price ? course.originalPrice : 0;
  const plan = installmentLine(course, price);

  const [consultOpen, setConsultOpen] = useState(!buyable);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nhập họ và tên';
    if (!/^\+?[0-9 .-]{9,20}$/.test(phone.trim())) e.phone = 'Số điện thoại chưa đúng';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Email chưa đúng';
    if (!consent) e.consent = 'Cần đồng ý để TWings liên hệ tư vấn';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const sendConsult = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    let code = `REG-${Date.now().toString(36).toUpperCase()}`;
    if (isBackendEnabled()) {
      setSending(true);
      try {
        const res = await api.post<{ registrationCode: string }>('/public/registrations/', {
          courseId: course.id,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          batchCohort: intakeName,
          consultNeed: note,
          source: 'Form Chi Tiết Khóa Học',
          privacyConsent: consent,
          attribution: getAttribution(),
          website: honeypot
        });
        code = res.registrationCode;
      } catch (err) {
        setServerError(err instanceof ApiError ? err.message : 'Không gửi được, vui lòng thử lại.');
        return;
      } finally {
        setSending(false);
      }
    }
    setSent(true);
    onConsultSent?.({
      id: code,
      orderCode: code,
      courseId: course.id,
      courseTitle: course.title,
      amount: course.price,
      originalAmount: course.originalPrice,
      status: 'pending',
      paymentMethod: 'vietqr',
      createdAt: new Date().toISOString(),
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      crmStatus: '1. Mới'
    } as Order);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
  };

  const field = (key: string) =>
    `w-full p-2.5 border rounded-xl bg-white text-sm ${errors[key] ? 'border-red-500' : 'border-slate-300'} focus:outline-none focus:border-[#0073C1]`;

  return (
    <div id="dang-ky" className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden scroll-mt-24">
      <div className="p-5 sm:p-6 space-y-5">
        {/* Price today */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Học phí trọn khóa</div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-black text-slate-900 whitespace-nowrap">{vnd(price)}</span>
            {struck > 0 && <span className="text-sm text-slate-400 line-through whitespace-nowrap">{vnd(struck)}</span>}
          </div>
          {struck > 0 && (
            <div className="text-xs font-bold text-red-600">
              Tiết kiệm {vnd(struck - price)}
              {intake?.earlyBirdDeadline && intake.price === price
                ? ` · ưu đãi đăng ký sớm đến ${viDate(intake.earlyBirdDeadline)}`
                : course.promotionEndsOn
                  ? ` · ưu đãi đến hết ${viDate(course.promotionEndsOn)}`
                  : ''}
            </div>
          )}
          {plan && <div className="mt-1 text-xs text-slate-600">Hoặc {plan.charAt(0).toLowerCase() + plan.slice(1)}, vào học ngay</div>}
        </div>

        {/* Intake to join */}
        {intakes.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-[#0073C1]" /> Chọn đợt khai giảng
            </legend>
            {intakes.map((c) => {
              const full = c.seatsLeft <= 0;
              const selected = c.name === intakeName;
              return (
                <label
                  key={c.name}
                  className={`flex items-start gap-3 p-3 rounded-2xl border text-xs transition-colors ${
                    full ? 'opacity-50 cursor-not-allowed border-slate-200' : selected ? 'border-[#0073C1] bg-blue-50/60 cursor-pointer' : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <input type="radio" name="intake" className="mt-0.5" disabled={full} checked={selected} onChange={() => setIntakeName(c.name)} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{c.startDate ? `Khai giảng ${viDate(c.startDate)}` : c.name}</span>
                      <span className={`shrink-0 font-bold ${full ? 'text-slate-500' : c.seatsLeft <= 5 && c.showQuota !== false ? 'text-red-600' : 'text-emerald-700'}`}>
                        {full ? 'Hết chỗ' : c.showQuota === false ? 'Còn chỗ' : `Còn ${c.seatsLeft} chỗ`}
                      </span>
                    </span>
                    <span className="block text-slate-500">
                      {c.startDate ? c.name : 'Ngày khai giảng sắp công bố'}
                      {c.status === 'upcoming' ? ' · sắp mở' : ''}
                    </span>
                    {c.scheduleText && (
                      <span className="flex items-center gap-1 text-slate-600"><Clock3 className="w-3 h-3" /> {c.scheduleText}</span>
                    )}
                    {c.location && (
                      <span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3 h-3" /> {c.location}</span>
                    )}
                    {c.earlyBirdDeadline && c.price !== undefined && c.price < course.price && (
                      <span className="block text-emerald-700 font-bold">
                        Ưu đãi sớm {vnd(c.price)} đến {viDate(c.earlyBirdDeadline)}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {/* Actions */}
        {buyable ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onCheckout(course, { customerName: name, customerEmail: email, customerPhone: phone, intakeName })}
              className="w-full py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#D94F04] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4" /> Đăng ký học
            </button>
            {!consultOpen && !sent && (
              <button
                type="button"
                onClick={() => setConsultOpen(true)}
                className="w-full py-3 rounded-xl border border-slate-300 hover:border-[#0073C1] hover:text-[#0073C1] text-slate-700 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" /> Nhận tư vấn miễn phí
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Khóa học chưa có đợt khai giảng nhận học viên. Để lại thông tin, TWings báo bạn ngay khi mở lớp mới.
          </div>
        )}

        {/* Short consultation form */}
        {sent ? (
          <div className="text-center py-4 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <div className="font-bold text-slate-900">Đã nhận thông tin của bạn</div>
            <p className="text-xs text-slate-600">
              Tư vấn viên sẽ gọi số <strong>{phone}</strong> trong giờ làm việc. Email xác nhận đã gửi tới {email}.
            </p>
          </div>
        ) : (
          consultOpen && (
            <form onSubmit={sendConsult} noValidate className="space-y-3 pt-1 border-t border-slate-100">
              <div className="pt-3 text-sm font-bold text-[#263060]">Nhận tư vấn lộ trình & học phí</div>
              <div>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Họ và tên *" autoComplete="name" className={field('name')} />
                {errors.name && <p className="text-[11px] text-red-600 mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại *" type="tel" inputMode="tel" autoComplete="tel" className={field('phone')} />
                {errors.phone && <p className="text-[11px] text-red-600 mt-0.5">{errors.phone}</p>}
              </div>
              <div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" type="email" inputMode="email" autoComplete="email" className={field('email')} />
                {errors.email && <p className="text-[11px] text-red-600 mt-0.5">{errors.email}</p>}
              </div>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bạn cần tư vấn gì? (lịch học, trả góp…)" className={field('note')} />
              <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                <span>
                  Tôi đồng ý để TWings Academy xử lý dữ liệu cá nhân nhằm tư vấn và ghi danh theo{' '}
                  <a href="/chinh-sach-bao-mat" target="_blank" rel="noopener" className="text-[#0073C1] underline">Chính sách bảo mật</a>.
                </span>
              </label>
              {errors.consent && <p className="text-[11px] text-red-600 -mt-2">{errors.consent}</p>}
              {serverError && <p className="text-xs text-red-600 font-semibold">{serverError}</p>}
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-xl font-extrabold text-sm cursor-pointer disabled:opacity-60 bg-gradient-to-r from-[#FF6B35] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C23010] text-white shadow-md shadow-orange-500/20 transition-all"
              >
                {sending ? 'Đang gửi…' : 'Gửi thông tin tư vấn'}
              </button>
            </form>
          )
        )}

        {/* What happens when buying */}
        <ul className="space-y-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
          <li className="flex items-start gap-2 pt-3"><ShieldCheck className="w-3.5 h-3.5 text-[#0073C1] shrink-0 mt-px" /> Chuyển khoản VietQR, hệ thống tự xác nhận và gửi biên nhận qua email</li>
          <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-[#0073C1] shrink-0 mt-px" /> Giữ chỗ và học phí trong thời gian chờ chuyển khoản</li>
          {(course.guarantees || []).map((g) => (
            <li key={g} className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-[#0073C1] shrink-0 mt-px" /> {g}</li>
          ))}
          <li className="pl-5.5">
            Học phí, trả góp, hoàn phí theo{' '}
            <a href="/dieu-khoan" target="_blank" rel="noopener" className="text-[#0073C1] underline">Điều khoản dịch vụ</a>
          </li>
        </ul>
      </div>
    </div>
  );
};

/** Phones: price and the main action always at hand on the course page (replaces the bottom nav). */
export const CourseBuyBar: React.FC<{ course: Course; onBuy: () => void }> = ({ course, onBuy }) => {
  const price = priceFor(course, openIntakes(course)[0]);
  const plan = installmentLine(course, price);
  const buyable = canBuy(course);
  const toBox = () => document.getElementById('dang-ky')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] print:hidden">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-black text-slate-900 leading-tight whitespace-nowrap">{vnd(price)}</div>
          <div className="text-[11px] text-slate-500 truncate">{plan || (buyable ? 'Thanh toán VietQR' : 'Chưa có lịch khai giảng')}</div>
        </div>
        {buyable ? (
          <>
            <button type="button" onClick={toBox} className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer">
              Tư vấn
            </button>
            <button type="button" onClick={onBuy} className="px-4 py-2.5 rounded-xl bg-[#EA580C] text-white text-sm font-extrabold shadow-md cursor-pointer">
              Đăng ký học
            </button>
          </>
        ) : (
          <button type="button" onClick={toBox} className="px-4 py-2.5 rounded-xl bg-[#EA580C] text-white text-sm font-extrabold shadow-md cursor-pointer">
            Nhận tư vấn
          </button>
        )}
      </div>
    </div>
  );
};
