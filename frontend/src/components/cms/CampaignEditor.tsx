/**
 * Create or edit one admission campaign: what it is (code = utm_campaign of its links, dates, status,
 * place, person in charge, scholarship budget), its overall quota, and the courses it offers with a
 * quota each (and, for train-to-hire courses, the job it leads to at the partner). Progress against
 * every quota is counted by the server (enrolled = may study: paid, or first installment paid).
 */
import React, { useMemo, useState } from 'react';
import { ExternalLink, Plus, Save, Trash2, X } from 'lucide-react';
import { AdmissionCampaign, CampaignCourse, Course } from '../../types';
import { isoToViDate, viDateToIso } from '../../lib/serverCollection';
import { CatalogOptions, catalogItems } from '../../admin/catalog';

interface Props {
  /** The campaign to edit, or null for a new one. */
  campaign: AdmissionCampaign | null;
  /** New campaign: start with this course (opened from the course page). */
  initialCourseId?: string;
  campaigns: AdmissionCampaign[];
  courses: Course[];
  onSave: (list: AdmissionCampaign[], saved: AdmissionCampaign) => void;
  onClose: () => void;
  onOpenPipeline?: (campaignId: string) => void;
}

const vnd = (n?: number) => `${new Intl.NumberFormat('vi-VN').format(n || 0)} ₫`;
const pct = (n: number, of: number) => (of ? Math.min(100, Math.round((100 * n) / of)) : 0);

function blank(): AdmissionCampaign {
  const now = new Date();
  return {
    id: `camp-${Date.now()}`,
    code: `CAMP-${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`,
    name: '',
    startDate: '',
    deadline: '',
    status: 'planning',
    targetHeadcount: 0,
    totalEnrolled: 0,
    positions: [],
    leadRecruiter: '',
    scholarshipBudget: 0,
    location: '',
    description: ''
  };
}

export const CampaignEditor: React.FC<Props> = ({ campaign, initialCourseId, campaigns, courses, onSave, onClose, onOpenPipeline }) => {
  const isNew = campaign === null;
  const [form, setForm] = useState<AdmissionCampaign>(() => {
    if (campaign) return { ...campaign, positions: [...campaign.positions] };
    const fresh = blank();
    const course = courses.find((c) => c.id === initialCourseId);
    if (course) {
      fresh.name = `Tuyển sinh ${course.title}`;
      fresh.positions = [{ id: `pos-${Date.now()}`, courseId: course.id, targetQuota: 0, positionTitle: '', department: '', salaryRange: '' }];
    }
    return fresh;
  });
  const [error, setError] = useState('');
  const set = <K extends keyof AdmissionCampaign>(key: K, value: AdmissionCampaign[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setCourse = (i: number, patch: Partial<CampaignCourse>) =>
    setForm((f) => ({ ...f, positions: f.positions.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  const courseQuota = form.positions.reduce((sum, p) => sum + (p.targetQuota || 0), 0);
  const progress = useMemo(
    () => Object.fromEntries((campaign?.funnel?.courses || []).map((c) => [c.courseId, c])),
    [campaign]
  );

  const save = () => {
    const code = form.code.trim();
    if (!form.name.trim() || !code) return setError('Cần mã và tên chiến dịch.');
    if (!/^[A-Za-z0-9._-]+$/.test(code)) return setError('Mã chỉ gồm chữ, số, dấu chấm, gạch ngang (dùng làm utm_campaign).');
    if (campaigns.some((c) => c.id !== form.id && c.code.toLowerCase() === code.toLowerCase()))
      return setError(`Mã "${code}" đã được dùng cho chiến dịch khác.`);
    if (form.positions.some((p) => !p.courseId)) return setError('Chọn khóa học cho mọi dòng (hoặc xóa dòng trống).');
    const ids = form.positions.map((p) => p.courseId);
    if (new Set(ids).size !== ids.length) return setError('Mỗi khóa học chỉ xuất hiện một lần trong chiến dịch.');
    const saved = { ...form, code, name: form.name.trim() };
    const list = isNew ? [saved, ...campaigns] : campaigns.map((c) => (c.id === saved.id ? saved : c));
    onSave(list, saved);
  };

  const remove = () => {
    if (!campaign) return;
    if (!window.confirm(`Xóa chiến dịch "${campaign.name}"? Các lead vẫn được giữ (thành lead chưa gắn chiến dịch).`)) return;
    onSave(campaigns.filter((c) => c.id !== campaign.id), campaign);
  };

  const input = 'w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white';
  const label = 'font-bold text-slate-700 block mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col text-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-base text-slate-900">{isNew ? 'Chiến dịch tuyển sinh mới' : `Chiến dịch ${campaign.code}`}</h2>
          <div className="flex items-center gap-2">
            {!isNew && onOpenPipeline && (
              <button type="button" onClick={() => onOpenPipeline(campaign.id)} className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50">
                Mở pipeline <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button type="button" onClick={onClose} title="Đóng" className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className={label}>Mã chiến dịch * (utm_campaign)</span>
              <input value={form.code} onChange={(e) => set('code', e.target.value)} className={`${input} font-mono`} />
            </label>
            <label className="block sm:col-span-2">
              <span className={label}>Tên chiến dịch *</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={input} />
            </label>
            <label className="block">
              <span className={label}>Trạng thái</span>
              <select value={form.status} onChange={(e) => set('status', e.target.value as AdmissionCampaign['status'])} className={input}>
                <option value="planning">Lên kế hoạch</option>
                <option value="active">Đang tuyển sinh</option>
                <option value="closed">Đã đóng</option>
              </select>
            </label>
            <label className="block">
              <span className={label}>Bắt đầu</span>
              <input type="date" value={viDateToIso(form.startDate) || ''} onChange={(e) => set('startDate', isoToViDate(e.target.value))} className={input} />
            </label>
            <label className="block">
              <span className={label}>Hạn nhận hồ sơ</span>
              <input type="date" value={viDateToIso(form.deadline) || ''} onChange={(e) => set('deadline', isoToViDate(e.target.value))} className={input} />
            </label>
            <label className="block">
              <span className={label}>Chỉ tiêu tổng (học viên)</span>
              <input type="number" min={0} value={form.targetHeadcount || ''} onChange={(e) => set('targetHeadcount', Number(e.target.value) || 0)} className={input} />
            </label>
            <label className="block">
              <span className={label}>Ngân sách học bổng (₫)</span>
              <input type="number" min={0} value={form.scholarshipBudget || ''} onChange={(e) => set('scholarshipBudget', Number(e.target.value) || 0)} className={input} />
            </label>
            <label className="block">
              <span className={label}>Địa điểm</span>
              <input value={form.location} onChange={(e) => set('location', e.target.value)} className={input} />
            </label>
            <label className="block sm:col-span-3">
              <span className={label}>Người / nhóm phụ trách</span>
              <input value={form.leadRecruiter} onChange={(e) => set('leadRecruiter', e.target.value)} className={input} />
            </label>
            <label className="block sm:col-span-3">
              <span className={label}>Mô tả</span>
              <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} className={input} />
            </label>
          </div>

          {!isNew && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-1">
              <span>
                Nhập học: <strong>{campaign.totalEnrolled}</strong>
                {form.targetHeadcount ? ` / ${form.targetHeadcount} (${pct(campaign.totalEnrolled, form.targetHeadcount)}%)` : ' · chưa đặt chỉ tiêu tổng'}
              </span>
              <span>Lead: <strong>{campaign.funnel?.leads || 0}</strong></span>
              {form.scholarshipBudget ? <span>Ngân sách học bổng: {vnd(form.scholarshipBudget)}</span> : null}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Khóa học & chỉ tiêu theo khóa</h3>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, positions: [...f.positions, { id: `pos-${Date.now()}`, courseId: '', targetQuota: 0, positionTitle: '', department: '', salaryRange: '' }] }))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm khóa
              </button>
            </div>
            {form.targetHeadcount > 0 && courseQuota > 0 && courseQuota !== form.targetHeadcount && (
              <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2">
                Tổng chỉ tiêu theo khóa ({courseQuota}) khác chỉ tiêu tổng ({form.targetHeadcount}).
              </p>
            )}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Khóa học</th>
                    <th className="px-2 py-2 w-24">Chỉ tiêu</th>
                    <th className="px-2 py-2">Tiến độ</th>
                    <th className="px-2 py-2">Vị trí việc làm đầu ra (nếu có)</th>
                    <th className="px-2 py-2">Đơn vị</th>
                    <th className="px-2 py-2">Thu nhập tham khảo</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {form.positions.map((p, i) => {
                    const got = progress[p.courseId];
                    return (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 min-w-[180px]">
                          <select value={p.courseId ? `c:${p.courseId}` : ''} onChange={(e) => setCourse(i, { courseId: e.target.value.slice(2) })} className={input}>
                            <option value="">Chọn khóa…</option>
                            <CatalogOptions
                              items={catalogItems(courses, [], 'active', { withPrograms: false })}
                              current={p.courseId ? { value: `c:${p.courseId}`, title: courses.find((c) => c.id === p.courseId)?.title || 'Khóa đã lưu trữ' } : undefined}
                            />
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} value={p.targetQuota || ''} onChange={(e) => setCourse(i, { targetQuota: Number(e.target.value) || 0 })} className={input} />
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-slate-600">
                          {got ? (
                            <>
                              {got.paid}/{p.targetQuota || '–'} đã đóng phí{p.targetQuota ? ` (${pct(got.paid, p.targetQuota)}%)` : ''}
                              <div className="text-[10px] text-slate-400">{got.leads} lead</div>
                            </>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 min-w-[160px]">
                          <input value={p.positionTitle} onChange={(e) => setCourse(i, { positionTitle: e.target.value })} placeholder="VD: Chuyên viên QHKH" className={input} />
                        </td>
                        <td className="px-2 py-1.5 min-w-[120px]">
                          <input value={p.department} onChange={(e) => setCourse(i, { department: e.target.value })} className={input} />
                        </td>
                        <td className="px-2 py-1.5 min-w-[120px]">
                          <input value={p.salaryRange} onChange={(e) => setCourse(i, { salaryRange: e.target.value })} className={input} />
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" title="Bỏ khóa này" onClick={() => setForm((f) => ({ ...f, positions: f.positions.filter((_, j) => j !== i) }))} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.positions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-slate-500">Chưa có khóa học. Lead vẫn được gắn chiến dịch qua link UTM.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-slate-500">
              Vị trí việc làm đầu ra được dùng khi giới thiệu học viên tốt nghiệp sang đối tác (Việc làm). Chỉ tiêu theo đợt khai giảng (sĩ số lớp) đặt ở Lớp & đợt khai giảng.
            </p>
          </div>
          {error && <p className="text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100">
          {!isNew ? (
            <button type="button" onClick={remove} className="px-3 py-2 rounded-xl text-red-700 hover:bg-red-50 font-bold flex items-center gap-1.5 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> Xóa chiến dịch
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200 font-bold cursor-pointer">Hủy</button>
            <button type="button" onClick={save} className="px-4 py-2 rounded-xl bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold flex items-center gap-1.5 cursor-pointer">
              <Save className="w-3.5 h-3.5" /> {isNew ? 'Tạo chiến dịch' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
