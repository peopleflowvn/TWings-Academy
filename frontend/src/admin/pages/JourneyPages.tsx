import React, { useEffect, useState } from 'react';
import { Download, FileText, Users } from 'lucide-react';
import { api, ApiError, Paginated } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { formatVND } from '../../lib/commerce';
import { Appointment, CHANNEL_LABEL, STATUS_LABEL } from '../../components/cms/LeadContactPanel';

interface Consultant {
  id: string;
  name: string;
  email: string;
  receivesLeads: boolean;
  openLeads: number;
  overdue: number;
}

/** Step 4: who receives new leads, workload, overdue first responses, upcoming consultations. */
export const ConsultingPage: React.FC = () => {
  const canAssign = useStaffCan('crm.assign_pic');
  const canEdit = useStaffCan('crm.edit_status');
  const [team, setTeam] = useState<Consultant[]>([]);
  const [mine, setMine] = useState(false);
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [error, setError] = useState('');

  const loadTeam = () => api.get<Consultant[]>('/staff/consultants/').then(setTeam).catch((e: Error) => setError(e.message));
  const loadAppts = () => {
    setAppts(null);
    api.get<Paginated<Appointment>>(`/staff/appointments/?upcoming=1&pageSize=100${mine ? '&mine=1' : ''}`)
      .then((r) => setAppts(r.results))
      .catch((e: Error) => setError(e.message));
  };
  useEffect(() => {
    loadTeam();
  }, []);
  useEffect(loadAppts, [mine]);

  const toggle = async (c: Consultant) => {
    try {
      setTeam(await api.patch<Consultant[]>('/staff/consultants/', { id: c.id, receivesLeads: !c.receivesLeads }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được');
    }
  };
  const outcome = async (a: Appointment, status: Appointment['status']) => {
    await api.patch(`/staff/appointments/${a.id}/`, { status }).catch(() => undefined);
    loadAppts();
  };

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-bold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-[#0073C1]" /> Đội tư vấn & phân lead tự động</h2>
        <p className="text-xs text-slate-500">
          Lead mới từ website tự giao cho tư vấn viên đang ít lead mở nhất (người cũ của khách được ưu tiên), kèm email báo và việc
          “Liên hệ lead mới” theo cam kết thời gian phản hồi. Tắt khi nhân viên nghỉ phép.
        </p>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 text-left"><tr><th className="py-1.5">Tư vấn viên</th><th className="text-right">Lead đang mở</th><th className="text-right">Quá hạn phản hồi</th><th className="text-right">Nhận lead mới</th></tr></thead>
          <tbody>
            {team.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="py-2">{c.name} <span className="text-xs text-slate-400">{c.email}</span></td>
                <td className="text-right">{c.openLeads}</td>
                <td className={`text-right font-bold ${c.overdue ? 'text-red-600' : ''}`}>{c.overdue}</td>
                <td className="text-right">
                  <input type="checkbox" disabled={!canAssign} checked={c.receivesLeads} onChange={() => toggle(c)} />
                </td>
              </tr>
            ))}
            {team.length === 0 && <tr><td className="py-2 text-slate-500" colSpan={4}>Chưa có nhân viên vai trò Tư vấn tuyển sinh – lead mới sẽ chưa được tự giao.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Lịch hẹn tư vấn sắp tới</h2>
          <label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Chỉ lịch của tôi</label>
        </div>
        {!appts ? <p className="text-sm text-slate-500">Đang tải…</p> : appts.length === 0 && <p className="text-sm text-slate-500">Không có lịch hẹn.</p>}
        {appts?.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm">
            <div>
              <strong>{new Date(a.startsAt).toLocaleString('vi-VN')}</strong> · {a.customerName} ({a.customerPhone}) · {CHANNEL_LABEL[a.channel]}
              <div className="text-xs text-slate-500">{a.courseTitle} · đơn {a.orderCode}{a.staffName ? ` · ${a.staffName}` : ''}{a.location ? ` · ${a.location}` : ''}</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold">{STATUS_LABEL[a.status]}</span>
              {canEdit && a.status === 'planned' && (
                <>
                  <button type="button" className="text-emerald-700 font-bold cursor-pointer" onClick={() => outcome(a, 'done')}>Đã tư vấn</button>
                  <button type="button" className="text-amber-700 font-bold cursor-pointer" onClick={() => outcome(a, 'no_show')}>Không đến</button>
                </>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

interface InvoiceRow {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  courseTitle: string;
  amount: number;
  totalPaid: number;
  buyerType: 'company' | 'person';
  companyName: string;
  taxCode: string;
  address: string;
  email: string;
  status: 'requested' | 'issued' | 'cancelled';
  invoiceNumber: string;
  issuedAt: string | null;
  issuedByName: string;
  createdAt: string;
}

/** Step 5: VAT invoices requested by learners; issue them in the e-invoice software, record the number. */
export const InvoicesPage: React.FC = () => {
  const canIssue = useStaffCan('finance.confirm_manual');
  const [status, setStatus] = useState<InvoiceRow['status']>('requested');
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState('');
  const load = () => {
    setRows(null);
    api.get<Paginated<InvoiceRow>>(`/staff/invoices/?status=${status}&pageSize=100`).then((r) => setRows(r.results)).catch((e: Error) => setError(e.message));
  };
  useEffect(load, [status]);
  const issue = async (r: InvoiceRow) => {
    const number = window.prompt(`Số hóa đơn đã xuất cho ${r.companyName || r.customerName}:`);
    if (!number) return;
    try {
      await api.patch(`/staff/invoices/${r.id}/`, { status: 'issued', invoiceNumber: number.trim() });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được');
    }
  };
  const copy = (r: InvoiceRow) =>
    navigator.clipboard.writeText([r.companyName || r.customerName, r.taxCode && `MST: ${r.taxCode}`, r.address, r.email, `Đơn ${r.orderCode} – ${r.courseTitle} – ${formatVND(r.totalPaid)}`].filter(Boolean).join('\n'));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Học viên / doanh nghiệp yêu cầu hóa đơn khi thanh toán hoặc trong Tài khoản học viên. Xuất hóa đơn trên phần mềm hóa đơn
        điện tử, rồi ghi số hóa đơn tại đây. Biên nhận thanh toán đã tự gửi cho học viên sau mỗi lần thu.
      </p>
      <div className="flex gap-2">
        {(['requested', 'issued', 'cancelled'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${status === s ? 'bg-[#0073C1] text-white border-[#0073C1]' : 'border-slate-200 text-slate-600'}`}>
            {{ requested: 'Chờ xuất', issued: 'Đã xuất', cancelled: 'Đã hủy' }[s]}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!rows ? <p className="text-sm text-slate-500">Đang tải…</p> : rows.length === 0 && <p className="text-sm text-slate-500">Không có yêu cầu.</p>}
      <div className="space-y-2">
        {rows?.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 text-sm flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-bold">{r.buyerType === 'company' ? r.companyName : `${r.customerName} (cá nhân)`}</div>
              <div className="text-xs text-slate-500">
                {r.taxCode && `MST ${r.taxCode} · `}{r.address && `${r.address} · `}{r.email}
              </div>
              <div className="text-xs text-slate-500">Đơn {r.orderCode} · {r.courseTitle} · đã thu {formatVND(r.totalPaid)} / {formatVND(r.amount)}</div>
              {r.invoiceNumber && <div className="text-xs text-emerald-700 font-bold">Hóa đơn {r.invoiceNumber}{r.issuedByName ? ` · ${r.issuedByName}` : ''}</div>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => copy(r)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Chép thông tin</button>
              {canIssue && r.status === 'requested' && (
                <button type="button" onClick={() => issue(r)} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">Ghi số hóa đơn</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface RosterRow {
  orderId: string;
  orderCode: string;
  name: string;
  phone: string;
  email: string;
  learningAccess: boolean;
  payment: string;
  remaining: number;
  dossierMissing: string[];
  hasCv: boolean;
  lmsStatus: string;
  progress: number | null;
}

const MISSING_LABEL: Record<string, string> = {
  birth_date: 'ngày sinh',
  citizen_id: 'CCCD',
  permanent_address: 'địa chỉ',
  education_level: 'trình độ'
};

/** Step 6: class list of an intake (payment, enrolment file, LMS), exportable to CSV. */
export const RosterModal: React.FC<{ cohortId: string; onClose: () => void }> = ({ cohortId, onClose }) => {
  const [data, setData] = useState<{ cohort: string; course: string; capacity: number; rows: RosterRow[] } | null>(null);
  useEffect(() => {
    api.get<typeof data>(`/staff/cohorts/${cohortId}/roster/`).then(setData).catch(() => setData({ cohort: '', course: '', capacity: 0, rows: [] }));
  }, [cohortId]);
  const exportCsv = () => {
    if (!data) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Mã đơn', 'Họ tên', 'SĐT', 'Email', 'Học phí', 'Còn lại', 'Hồ sơ thiếu', 'CV', 'LMS', 'Tiến độ %']]
      .concat(data.rows.map((r) => [r.orderCode, r.name, r.phone, r.email, r.payment, String(r.remaining), r.dossierMissing.map((m) => MISSING_LABEL[m] || m).join(', '), r.hasCv ? 'Có' : '', r.lmsStatus, r.progress === null ? '' : String(r.progress)]));
    const url = URL.createObjectURL(new Blob(['﻿' + lines.map((l) => l.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh-sach-lop-${data.cohort}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-6 p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-lg">Danh sách lớp {data ? `${data.course} · ${data.cohort} (${data.rows.length}/${data.capacity})` : ''}</h3>
          <div className="flex gap-2">
            <button type="button" onClick={exportCsv} className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold cursor-pointer flex items-center gap-1"><Download className="w-3.5 h-3.5" /> CSV</button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer">Đóng</button>
          </div>
        </div>
        {!data ? <p className="text-slate-500">Đang tải…</p> : (
          <table className="w-full">
            <thead className="text-left text-slate-500"><tr><th className="py-1.5">Học viên</th><th>Liên hệ</th><th>Học phí</th><th>Hồ sơ nhập học</th><th>LMS</th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.orderId} className="border-t border-slate-100 align-top">
                  <td className="py-2 font-bold">{r.name}<div className="font-normal text-slate-400">{r.orderCode}</div></td>
                  <td className="py-2">{r.phone}<div className="text-slate-500">{r.email}</div></td>
                  <td className="py-2">{r.payment}{r.remaining > 0 && <div className="text-amber-700">còn {formatVND(r.remaining)}</div>}</td>
                  <td className="py-2">
                    {r.dossierMissing.length ? <span className="text-red-600">Thiếu: {r.dossierMissing.map((m) => MISSING_LABEL[m] || m).join(', ')}</span> : <span className="text-emerald-700 font-bold">Đủ</span>}
                    {r.hasCv && <div className="text-slate-500">Có CV</div>}
                  </td>
                  <td className="py-2">{r.lmsStatus || '–'}{r.progress !== null && ` · ${r.progress}%`}</td>
                </tr>
              ))}
              {data.rows.length === 0 && <tr><td colSpan={5} className="py-2 text-slate-500">Chưa có học viên.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
