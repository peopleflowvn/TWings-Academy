/**
 * /app/system/users: staff accounts and their permissions. Everything here is read from and written to the
 * server (/staff/users/, the source of truth); role defaults are fixed in code (backend apps/accounts/rbac.py,
 * mirrored in utils/rbac.ts), so a person's access is adjusted with their own grants / blocks.
 * The server refuses to let anyone manage an account with more power than their own; the screen hides
 * those actions in the same way so nobody clicks into a 403.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Key,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  UserPlus,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { api, Paginated } from '../../lib/api';
import { AdminUser, UserRole } from '../../types';
import { DEFAULT_ROLE_CONFIGS, SYSTEM_PERMISSIONS } from '../../utils/rbac';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  status: 'active' | 'suspended';
  permissions: string[];
  permissionOverrides: { granted?: string[]; revoked?: string[] };
  receivesLeads: boolean;
  lastLogin: string | null;
  dateJoined: string;
}

interface AuditLogDTO {
  id: number;
  at: string;
  actorLabel: string;
  action: string;
  objectId: string;
  details: Record<string, unknown>;
}

const ROLES = Object.keys(DEFAULT_ROLE_CONFIGS) as UserRole[];
const roleName = (r: UserRole) => DEFAULT_ROLE_CONFIGS[r]?.roleName || r;
const roleHas = (r: UserRole, code: string) => DEFAULT_ROLE_CONFIGS[r]?.allowedPermissionCodes.includes(code) ?? false;
const permName = (code: string) => SYSTEM_PERMISSIONS.find((p) => p.code === code)?.name || code;
const isSuper = (u: { role: UserRole }) => u.role === 'super_admin';
const subset = (a: string[], b: Set<string>) => a.every((c) => b.has(c));
const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '');
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null);
const errorText = (e: unknown, fallback = 'Thao tác thất bại') => (e instanceof Error ? e.message : fallback);

const CATEGORIES = Array.from(new Map(SYSTEM_PERMISSIONS.map((p) => [p.category, p.categoryLabel])).entries());

const AUDIT_LABELS: Record<string, string> = {
  'staff_user.create': 'Tạo tài khoản',
  'staff_user.update': 'Sửa tài khoản / quyền',
  'staff_user.password_reset_sent': 'Gửi liên kết đặt lại mật khẩu',
  'auth.password_change': 'Tự đổi mật khẩu',
  'auth.password_reset': 'Đặt lại mật khẩu qua email',
  'crm.consultant_toggle': 'Đổi nhận lead / quản lý tuyển sinh'
};

const STATUS_LABEL: Record<string, string> = { active: 'mở khóa', suspended: 'khóa' };

/** What an audit entry changed, in words. */
function describeChange(d: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof d.role === 'string') parts.push(`vai trò → ${roleName(d.role as UserRole)}`);
  if (typeof d.status === 'string') parts.push(STATUS_LABEL[d.status] || String(d.status));
  if (d.password_changed || d.passwordChanged) parts.push('đặt mật khẩu tạm thời');
  const ov = (d.permission_overrides || d.permissionOverrides) as { granted?: string[]; revoked?: string[] } | undefined;
  if (ov) {
    const g = ov.granted || [];
    const r = ov.revoked || [];
    parts.push(g.length || r.length ? `quyền riêng: ${[...g.map((c) => `+${permName(c)}`), ...r.map((c) => `−${permName(c)}`)].join(', ')}` : 'bỏ hết quyền riêng');
  }
  for (const k of ['name', 'phone', 'receives_leads', 'receivesLeads', 'lead_manager', 'leadManager']) {
    if (k in d) parts.push(`${k} → ${String(d[k])}`);
  }
  return parts.join(' · ');
}

const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({
  title,
  onClose,
  wide,
  children
}) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
    <div
      className={`bg-white rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
        <h3 className="font-bold text-sm">{title}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 cursor-pointer" aria-label="Đóng">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-5 overflow-y-auto text-xs space-y-4">{children}</div>
    </div>
  </div>
);

const ErrorLine: React.FC<{ text: string }> = ({ text }) =>
  text ? (
    <p role="alert" className="text-red-600 font-medium">
      {text}
    </p>
  ) : null;

const input = 'w-full p-2.5 border border-slate-300 rounded-xl';
const btnPrimary = 'px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer';
const btnGhost = 'px-4 py-2 border border-slate-300 hover:bg-slate-100 disabled:opacity-50 rounded-xl font-bold text-slate-700 cursor-pointer';

interface Confirm {
  title: string;
  body: React.ReactNode;
  label: string;
  danger?: boolean;
  run: () => Promise<unknown>;
  done: string;
}

export const CMSUsersTab: React.FC<{ currentActorUser?: AdminUser }> = ({ currentActorUser: actor }) => {
  const [tab, setTab] = useState<'users' | 'roles' | 'review' | 'audit'>('users');
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const actorPerms = useMemo(
    () => new Set(actor?.role === 'super_admin' ? SYSTEM_PERMISSIONS.map((p) => p.code) : actor?.permissions || []),
    [actor]
  );
  const canManage = actorPerms.has('rbac.manage_roles');
  const canOverride = actorPerms.has('rbac.edit_matrix');
  /** Mirrors the server: only accounts with no permission the actor lacks (or the actor's own). */
  const canTouch = (u: StaffUser) => canManage && (u.id === actor?.id || subset(u.permissions, actorPerms));
  const assignableRoles = ROLES.filter((r) => subset(DEFAULT_ROLE_CONFIGS[r].allowedPermissionCodes, actorPerms));

  const say = (text: string, ok = true) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 5000);
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get<Paginated<StaffUser>>('/staff/users/?pageSize=500');
      setUsers(res.results);
      setLoadError('');
      return res.results;
    } catch (e) {
      setLoadError(errorText(e, 'Không tải được danh sách nhân sự'));
      return null;
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // ---------- users tab: filters ----------
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const shown = (users || []).filter((u) => {
    const q = query.trim().toLowerCase();
    const hit = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone || '').includes(q);
    return hit && (roleFilter === 'all' || u.role === roleFilter) && (statusFilter === 'all' || u.status === statusFilter);
  });

  // ---------- confirmations (role change, lock) ----------
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const ask = (c: Confirm) => {
    setConfirmError('');
    setConfirm(c);
  };
  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    setConfirmError('');
    try {
      await confirm.run();
      say(confirm.done);
      setConfirm(null);
      await load();
    } catch (e) {
      setConfirmError(errorText(e));
    } finally {
      setConfirmBusy(false);
    }
  };

  const askRoleChange = (u: StaffUser, role: UserRole) => {
    if (role === u.role) return;
    const before = new Set(DEFAULT_ROLE_CONFIGS[u.role].allowedPermissionCodes);
    const after = new Set(DEFAULT_ROLE_CONFIGS[role].allowedPermissionCodes);
    const gained = [...after].filter((c) => !before.has(c));
    const lost = [...before].filter((c) => !after.has(c));
    ask({
      title: 'Đổi vai trò',
      label: 'Đổi vai trò',
      danger: role === 'super_admin' || u.id === actor?.id,
      done: `Đã chuyển ${u.name} sang vai trò ${roleName(role)}.`,
      run: () => api.patch(`/staff/users/${u.id}/`, { role }),
      body: (
        <>
          <p>
            Chuyển <strong>{u.name}</strong> từ <strong>{roleName(u.role)}</strong> sang <strong>{roleName(role)}</strong>? Có hiệu
            lực ngay.
          </p>
          {gained.length > 0 && <p className="text-emerald-700">Thêm {gained.length} quyền: {gained.map(permName).join(', ')}.</p>}
          {lost.length > 0 && <p className="text-red-700">Mất {lost.length} quyền: {lost.map(permName).join(', ')}.</p>}
          {role === 'sales_crm' && <p className="text-slate-600">Tư vấn viên tự nhận lead mới từ website (tắt ở Tư vấn & lịch hẹn khi nghỉ phép).</p>}
          {u.role === 'sales_crm' && <p className="text-amber-700">Người này thôi nhận lead mới tự động; lead đang giữ vẫn đứng tên họ.</p>}
          {u.id === actor?.id && <p className="text-red-700 font-bold">Đây là tài khoản của chính bạn: bạn có thể mất quyền vào trang này.</p>}
        </>
      )
    });
  };

  const askToggleStatus = (u: StaffUser) => {
    const lock = u.status === 'active';
    ask({
      title: lock ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      label: lock ? 'Khóa' : 'Mở khóa',
      danger: lock,
      done: lock ? `Đã khóa tài khoản ${u.name}.` : `Đã mở khóa tài khoản ${u.name}.`,
      run: () => api.patch(`/staff/users/${u.id}/`, { status: lock ? 'suspended' : 'active' }),
      body: lock ? (
        <p>
          Khóa <strong>{u.name}</strong>: đăng xuất ngay khỏi mọi phiên và không đăng nhập được nữa. Lead, việc, lịch hẹn của họ vẫn giữ
          nguyên; hãy giao lại cho người khác nếu cần.
        </p>
      ) : (
        <p>
          Mở khóa <strong>{u.name}</strong>: đăng nhập lại được với mật khẩu cũ (hoặc gửi liên kết đặt lại mật khẩu).
        </p>
      )
    });
  };

  // ---------- create / edit account ----------
  const [form, setForm] = useState<{ id?: string; name: string; email: string; phone: string; role: UserRole; password: string } | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const openCreate = () => {
    setFormError('');
    setForm({ name: '', email: '', phone: '', role: assignableRoles.includes('sales_crm') ? 'sales_crm' : assignableRoles[0], password: '' });
  };
  const openEdit = (u: StaffUser) => {
    setFormError('');
    setForm({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', role: u.role, password: '' });
  };
  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.id && form.password.length < 12) {
      setFormError('Mật khẩu ban đầu cần tối thiểu 12 ký tự.');
      return;
    }
    setFormBusy(true);
    setFormError('');
    const contact = { name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim() };
    try {
      if (form.id) {
        await api.patch(`/staff/users/${form.id}/`, contact);
        say(`Đã lưu thông tin ${contact.name}.`);
      } else {
        await api.post('/staff/users/', { ...contact, role: form.role, status: 'active', password: form.password });
        say(`Đã tạo tài khoản cho ${contact.name}. Gửi mật khẩu ban đầu qua kênh riêng và đề nghị đổi sau lần đăng nhập đầu.`);
      }
      setForm(null);
      await load();
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setFormBusy(false);
    }
  };

  // ---------- password reset ----------
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState('');
  const runReset = async (call: () => Promise<unknown>, ok: string) => {
    setResetBusy(true);
    setResetError('');
    try {
      await call();
      setResetTarget(null);
      say(ok);
    } catch (e) {
      setResetError(errorText(e));
    } finally {
      setResetBusy(false);
    }
  };

  // ---------- per-person grants / blocks ----------
  const [overrideUserId, setOverrideUserId] = useState<string | null>(null);
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideError, setOverrideError] = useState('');
  const overrideUser = users?.find((u) => u.id === overrideUserId) || null;
  const setOverride = async (u: StaffUser, code: string, state: 'inherited' | 'granted' | 'revoked') => {
    const granted = (u.permissionOverrides?.granted || []).filter((c) => c !== code);
    const revoked = (u.permissionOverrides?.revoked || []).filter((c) => c !== code);
    if (state === 'granted') granted.push(code);
    if (state === 'revoked') revoked.push(code);
    setOverrideBusy(true);
    setOverrideError('');
    try {
      await api.patch(`/staff/users/${u.id}/`, { permissionOverrides: { granted, revoked } });
    } catch (e) {
      setOverrideError(errorText(e));
    } finally {
      await load(); // the modal reads the person from the reloaded list: it always shows what is saved
      setOverrideBusy(false);
    }
  };

  // ---------- audit trail (needs rbac.edit_matrix: it holds IP addresses) ----------
  const [audit, setAudit] = useState<AuditLogDTO[] | null>(null);
  const [auditError, setAuditError] = useState('');
  const loadAudit = useCallback(() => {
    setAudit(null);
    setAuditError('');
    api
      .get<Paginated<AuditLogDTO>>('/staff/audit-logs/?object_type=accounts.User&pageSize=200')
      .then((r) => setAudit(r.results))
      .catch((e) => setAuditError(errorText(e, 'Không tải được nhật ký')));
  }, []);
  useEffect(() => {
    if (tab === 'audit' && canOverride) loadAudit();
  }, [tab, canOverride, loadAudit]);

  // ---------- review: facts worth acting on, from the live accounts ----------
  const review = useMemo(() => {
    const list = users || [];
    const active = list.filter((u) => u.status === 'active');
    return {
      supers: active.filter(isSuper),
      consultants: active.filter((u) => u.role === 'sales_crm'),
      consultantsTaking: active.filter((u) => u.role === 'sales_crm' && u.receivesLeads),
      admins: active.filter((u) => !isSuper(u) && u.permissions.some((c) => c === 'rbac.manage_roles' || c === 'rbac.edit_matrix')),
      overrides: list.filter((u) => (u.permissionOverrides?.granted?.length || 0) + (u.permissionOverrides?.revoked?.length || 0) > 0),
      neverLoggedIn: active.filter((u) => !u.lastLogin),
      idle: active.filter((u) => (daysSince(u.lastLogin) ?? 0) > 60)
    };
  }, [users]);

  if (!users) {
    return loadError ? (
      <div className="p-6 bg-white rounded-2xl border border-red-200 text-sm text-red-700 flex items-center justify-between gap-3">
        <span>{loadError}</span>
        <button type="button" onClick={load} className={btnGhost}>
          Thử lại
        </button>
      </div>
    ) : (
      <div className="py-16 flex justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const tabBtn = (id: typeof tab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
        tab === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const reviewWarnings = (review.supers.length < 2 ? 1 : 0) + (review.consultantsTaking.length === 0 ? 1 : 0) + (review.idle.length ? 1 : 0);

  return (
    <div className="space-y-5 pb-24">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0073C1]" /> Nhân sự & phân quyền
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Mỗi người có một vai trò (bộ quyền mặc định) và có thể được cấp thêm hoặc chặn riêng từng quyền. Khóa tài khoản đăng xuất
              người đó ngay.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 cursor-pointer" aria-label="Tải lại">
              <RefreshCw className="w-4 h-4" />
            </button>
            {canManage && (
              <button type="button" onClick={openCreate} className={`${btnPrimary} text-xs flex items-center gap-2`}>
                <UserPlus className="w-4 h-4" /> Thêm nhân sự
              </button>
            )}
          </div>
        </div>

        {toast && (
          <div
            role="status"
            className={`p-3 rounded-xl flex items-center justify-between gap-2 text-xs font-bold border ${
              toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span>{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} className="text-slate-400 cursor-pointer" aria-label="Đóng">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {loadError && <ErrorLine text={loadError} />}

        <div className="flex flex-wrap items-center gap-2">
          {tabBtn('users', `Nhân sự (${users.length})`, <Users className="w-4 h-4" />)}
          {tabBtn('roles', 'Quyền theo vai trò', <Lock className="w-4 h-4" />)}
          {tabBtn('review', reviewWarnings ? `Rà soát (${reviewWarnings})` : 'Rà soát', <ShieldAlert className="w-4 h-4" />)}
          {canOverride && tabBtn('audit', 'Nhật ký', <History className="w-4 h-4" />)}
        </div>
      </div>

      {/* ================= USERS ================= */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative md:w-80">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên, email, số điện thoại…"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')} className="text-xs p-2 border border-slate-300 rounded-xl" aria-label="Lọc vai trò">
              <option value="all">Mọi vai trò</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleName(r)} ({users.filter((u) => u.role === r).length})
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-xs p-2 border border-slate-300 rounded-xl" aria-label="Lọc trạng thái">
              <option value="all">Mọi trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="suspended">Đã khóa</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                <tr>
                  <th className="p-3">Nhân sự</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Quyền riêng</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Đăng nhập gần nhất</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((u) => {
                  const me = u.id === actor?.id;
                  const editable = canTouch(u);
                  const granted = u.permissionOverrides?.granted || [];
                  const revoked = u.permissionOverrides?.revoked || [];
                  return (
                    <tr key={u.id} className={me ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {u.name || u.email}
                          {me && <span className="px-1.5 rounded bg-blue-600 text-white text-[9px]">Bạn</span>}
                        </div>
                        <div className="text-slate-600 flex items-center gap-1 font-mono text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" /> {u.email}
                        </div>
                        {u.phone && (
                          <div className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" /> {u.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {editable && assignableRoles.includes(u.role) ? (
                          <select
                            value={u.role}
                            onChange={(e) => askRoleChange(u, e.target.value as UserRole)}
                            className="text-xs font-bold border border-slate-300 rounded-xl p-1.5"
                            aria-label={`Vai trò của ${u.name}`}
                          >
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>
                                {roleName(r)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${DEFAULT_ROLE_CONFIGS[u.role]?.color || ''}`}>{roleName(u.role)}</span>
                        )}
                        {u.role === 'sales_crm' && (
                          <div className={`text-[10px] mt-1 ${u.receivesLeads ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {u.receivesLeads ? 'Đang nhận lead mới' : 'Đang tạm dừng nhận lead'}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {isSuper(u) ? (
                          <span className="text-[11px] text-slate-400">Toàn quyền</span>
                        ) : granted.length || revoked.length ? (
                          <div className="flex flex-wrap gap-1" title={[...granted.map((c) => `+ ${permName(c)}`), ...revoked.map((c) => `− ${permName(c)}`)].join('\n')}>
                            {granted.length > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">+{granted.length} cấp thêm</span>}
                            {revoked.length > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">−{revoked.length} chặn</span>}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Theo vai trò</span>
                        )}
                      </td>
                      <td className="p-3">
                        {u.status === 'active' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Hoạt động
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px] inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Đã khóa
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{u.lastLogin ? dateTime(u.lastLogin) : <span className="text-slate-400">Chưa đăng nhập</span>}</td>
                      <td className="p-3 text-right whitespace-nowrap space-x-1">
                        {editable && (
                          <button type="button" onClick={() => openEdit(u)} className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer" title="Sửa tên, email, số điện thoại">
                            <Pencil className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                        {canOverride && editable && !isSuper(u) && (
                          <button type="button" onClick={() => { setOverrideError(''); setOverrideUserId(u.id); }} className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0073C1] font-bold text-[11px] cursor-pointer">
                            <Sliders className="w-3.5 h-3.5 inline mr-1" />
                            Quyền riêng
                          </button>
                        )}
                        {editable && !me && (
                          <button type="button" onClick={() => { setTempPassword(''); setResetError(''); setResetTarget(u); }} className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] cursor-pointer">
                            <Key className="w-3.5 h-3.5 inline mr-1" />
                            Mật khẩu
                          </button>
                        )}
                        {editable && !me && (
                          <button
                            type="button"
                            onClick={() => askToggleStatus(u)}
                            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${
                              u.status === 'active' ? 'bg-red-50 hover:bg-red-100 text-red-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Không có nhân sự phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!canManage && <p className="p-3 text-[11px] text-slate-500 border-t border-slate-100">Bạn chỉ có quyền xem danh sách nhân sự.</p>}
        </div>
      )}

      {/* ================= ROLE DEFAULTS (read-only) ================= */}
      {tab === 'roles' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <p className="text-xs text-slate-500">
            Quyền mặc định của từng vai trò do hệ thống quy định (không sửa ở đây). Cần khác đi cho một người: dùng “Quyền riêng” ở danh sách
            nhân sự. Quản trị tối cao luôn có toàn quyền.
          </p>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-white text-[11px]">
                <tr>
                  <th className="p-3 text-left min-w-[260px]">Quyền</th>
                  {ROLES.map((r) => (
                    <th key={r} className="p-3 text-center min-w-[96px]">
                      {roleName(r)}
                      <span className="block font-normal text-slate-300">{users.filter((u) => u.role === r).length} người</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(([cat, label]) => (
                  <React.Fragment key={cat}>
                    <tr className="bg-slate-50">
                      <td colSpan={ROLES.length + 1} className="px-3 py-2 font-bold text-slate-700">
                        {label}
                      </td>
                    </tr>
                    {SYSTEM_PERMISSIONS.filter((p) => p.category === cat).map((p) => (
                      <tr key={p.code} className="border-t border-slate-100">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {p.name}
                            {p.riskLevel === 'high' && <span className="px-1.5 rounded bg-red-100 text-red-700 text-[9px]">Nhạy cảm</span>}
                          </div>
                          <div className="text-[11px] text-slate-500">{p.description}</div>
                          <code className="text-[10px] text-[#0073C1]">{p.code}</code>
                        </td>
                        {ROLES.map((r) => (
                          <td key={r} className="p-3 text-center">
                            {roleHas(r, p.code) ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" aria-label="Có" /> : <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= REVIEW ================= */}
      {tab === 'review' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              {
                title: 'Quản trị tối cao đang hoạt động',
                people: review.supers,
                warn: review.supers.length < 2,
                note:
                  review.supers.length < 2
                    ? 'Chỉ có một người: nếu người này bị khóa hoặc quên mật khẩu thì không ai quản lý được tài khoản. Nên có thêm một người dự phòng.'
                    : 'Toàn quyền hệ thống, kể cả xóa dữ liệu và sửa quyền. Giữ càng ít người càng tốt.'
              },
              {
                title: 'Tư vấn viên nhận lead mới',
                people: review.consultantsTaking,
                warn: review.consultantsTaking.length === 0,
                note:
                  review.consultantsTaking.length === 0
                    ? `Không ai nhận lead tự động: lead mới từ website nằm ở “chưa có tư vấn viên” cho tới khi được giao tay. ${
                        review.consultants.length ? 'Bật “Nhận lead mới” ở Tư vấn & lịch hẹn.' : 'Gán vai trò “Tư vấn Tuyển sinh & CRM” cho nhân viên tư vấn.'
                      }`
                    : 'Lead mới chia cho người đang ít lead mở nhất.'
              },
              {
                title: 'Người không phải quản trị tối cao nhưng quản lý được tài khoản',
                people: review.admins,
                warn: false,
                note: 'Có quyền gán vai trò hoặc sửa quyền riêng. Chỉ quản lý được tài khoản không có quyền nào hơn họ.'
              },
              {
                title: 'Có quyền riêng (cấp thêm / chặn)',
                people: review.overrides,
                warn: false,
                note: 'Ngoại lệ so với vai trò: nên rà lại định kỳ, bỏ khi không còn cần.',
                detail: (u: StaffUser) =>
                  [...(u.permissionOverrides?.granted || []).map((c) => `+${permName(c)}`), ...(u.permissionOverrides?.revoked || []).map((c) => `−${permName(c)}`)].join(', ')
              },
              {
                title: 'Hơn 60 ngày không đăng nhập',
                people: review.idle,
                warn: review.idle.length > 0,
                note: 'Tài khoản còn mở nhưng không dùng: cân nhắc khóa nếu người đó đã nghỉ.',
                detail: (u: StaffUser) => `lần cuối ${dateTime(u.lastLogin)}`
              },
              {
                title: 'Chưa đăng nhập lần nào',
                people: review.neverLoggedIn,
                warn: false,
                note: 'Đã tạo nhưng chưa dùng. Nếu họ chưa nhận được mật khẩu: gửi liên kết đặt lại mật khẩu.',
                detail: (u: StaffUser) => `tạo ${dateTime(u.dateJoined)}`
              }
            ] as { title: string; people: StaffUser[]; warn: boolean; note: string; detail?: (u: StaffUser) => string }[]
          ).map((card) => (
            <div key={card.title} className={`bg-white rounded-2xl border p-5 space-y-2 ${card.warn ? 'border-amber-300' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  {card.warn && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  {card.title}
                </h3>
                <span className="text-sm font-black text-slate-900">{card.people.length}</span>
              </div>
              <p className={`text-xs ${card.warn ? 'text-amber-800' : 'text-slate-500'}`}>{card.note}</p>
              {card.people.length > 0 && (
                <ul className="text-xs text-slate-700 space-y-0.5">
                  {card.people.slice(0, 12).map((u) => (
                    <li key={u.id}>
                      <strong>{u.name || u.email}</strong> <span className="text-slate-400">{u.email}</span>
                      {card.detail && <span className="text-slate-500"> · {card.detail(u)}</span>}
                    </li>
                  ))}
                  {card.people.length > 12 && <li className="text-slate-400">… và {card.people.length - 12} người khác</li>}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================= AUDIT TRAIL ================= */}
      {tab === 'audit' && canOverride && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">200 thay đổi gần nhất về tài khoản nhân sự: tạo, đổi vai trò, quyền riêng, khóa, mật khẩu.</p>
            <button type="button" onClick={loadAudit} className="p-2 rounded-xl border border-slate-200 text-slate-600 cursor-pointer" aria-label="Tải lại nhật ký">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <ErrorLine text={auditError} />
          {!audit && !auditError && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
          {audit && audit.length === 0 && <p className="text-xs text-slate-500">Chưa có thay đổi nào.</p>}
          {audit && audit.length > 0 && (
            <div className="divide-y divide-slate-100 text-xs">
              {audit.map((a) => {
                const target = users.find((u) => u.id === a.objectId);
                const what = describeChange(a.details || {});
                return (
                  <div key={a.id} className="py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <div>
                      <span className="font-bold text-slate-900">{AUDIT_LABELS[a.action] || a.action}</span>
                      {' · '}
                      <span className="text-slate-700">{target ? target.name || target.email : String(a.details?.email || a.objectId)}</span>
                      {what && <div className="text-slate-500">{what}</div>}
                    </div>
                    <div className="text-[11px] text-slate-400 sm:text-right shrink-0">
                      {dateTime(a.at)}
                      <div>bởi {a.actorLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}
      {confirm && (
        <Modal title={confirm.title} onClose={() => !confirmBusy && setConfirm(null)}>
          <div className="space-y-2 text-slate-700">{confirm.body}</div>
          <ErrorLine text={confirmError} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(null)} disabled={confirmBusy} className={btnGhost}>
              Hủy
            </button>
            <button
              type="button"
              onClick={runConfirm}
              disabled={confirmBusy}
              className={confirm.danger ? 'px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer' : btnPrimary}
            >
              {confirmBusy ? 'Đang lưu…' : confirm.label}
            </button>
          </div>
        </Modal>
      )}

      {form && (
        <Modal title={form.id ? 'Sửa thông tin nhân sự' : 'Thêm nhân sự'} onClose={() => !formBusy && setForm(null)}>
          <form onSubmit={saveForm} className="space-y-3">
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">Họ và tên *</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">Email đăng nhập *</span>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">Số điện thoại</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${input} font-mono`} />
            </label>
            {!form.id && (
              <>
                <label className="block">
                  <span className="font-bold text-slate-700 block mb-1">Vai trò *</span>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className={`${input} font-bold`}>
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {roleName(r)}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {DEFAULT_ROLE_CONFIGS[form.role].description}
                    {form.role === 'sales_crm' && '. Tự nhận lead mới từ website.'}
                  </span>
                </label>
                <label className="block">
                  <span className="font-bold text-slate-700 block mb-1">Mật khẩu ban đầu * (tối thiểu 12 ký tự)</span>
                  <input type="password" autoComplete="new-password" minLength={12} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${input} font-mono`} />
                </label>
              </>
            )}
            {form.id && <p className="text-slate-500">Đổi email thì người này đăng nhập bằng email mới.</p>}
            <ErrorLine text={formError} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} disabled={formBusy} className={btnGhost}>
                Hủy
              </button>
              <button type="submit" disabled={formBusy} className={btnPrimary}>
                {formBusy ? 'Đang lưu…' : form.id ? 'Lưu' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetTarget && (
        <Modal title="Đặt lại mật khẩu" onClose={() => !resetBusy && setResetTarget(null)}>
          <p className="text-slate-600">
            Nhân sự: <strong className="text-slate-900">{resetTarget.name}</strong> <span className="font-mono">({resetTarget.email})</span>
          </p>
          <div className="space-y-2">
            <div className="font-bold text-slate-800">Cách 1 (khuyến nghị): gửi liên kết qua email</div>
            <p className="text-slate-500">Nhân sự tự đặt mật khẩu mới qua liên kết dùng một lần, hiệu lực 1 giờ. Quản trị viên không biết mật khẩu.</p>
            <button
              type="button"
              disabled={resetBusy || resetTarget.status !== 'active'}
              onClick={() =>
                runReset(
                  () => api.post(`/staff/users/${resetTarget.id}/send-password-reset/`),
                  `Đã gửi liên kết đặt lại mật khẩu tới ${resetTarget.email} (hiệu lực 1 giờ).`
                )
              }
              className={`${btnPrimary} flex items-center gap-2`}
            >
              <Mail className="w-3.5 h-3.5" /> Gửi liên kết đặt lại
            </button>
            {resetTarget.status !== 'active' && <p className="text-amber-700">Tài khoản đang khóa: hãy mở khóa trước khi gửi liên kết.</p>}
          </div>
          <form
            className="space-y-2 border-t border-slate-200 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (tempPassword.length < 12) return setResetError('Mật khẩu tạm thời cần tối thiểu 12 ký tự.');
              runReset(
                () => api.patch(`/staff/users/${resetTarget.id}/`, { password: tempPassword }),
                `Đã đặt mật khẩu tạm thời cho ${resetTarget.name}; các phiên đăng nhập cũ của họ đã bị đăng xuất. Gửi mật khẩu qua kênh riêng và đề nghị đổi ngay.`
              );
            }}
          >
            <div className="font-bold text-slate-800">Cách 2: đặt mật khẩu tạm thời</div>
            <p className="text-slate-500">Dùng khi email không nhận được. Các phiên đăng nhập hiện tại của nhân sự sẽ bị đăng xuất.</p>
            <input
              type="password"
              autoComplete="new-password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              minLength={12}
              required
              placeholder="Tối thiểu 12 ký tự"
              aria-label="Mật khẩu tạm thời"
              className={`${input} font-mono`}
            />
            <button type="submit" disabled={resetBusy} className={btnGhost}>
              Đặt mật khẩu tạm thời
            </button>
          </form>
          <ErrorLine text={resetError} />
        </Modal>
      )}

      {overrideUser && (
        <Modal
          wide
          onClose={() => !overrideBusy && setOverrideUserId(null)}
          title={
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-300" /> Quyền riêng: {overrideUser.name} · {roleName(overrideUser.role)}
            </span>
          }
        >
          <p className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
            “Theo vai trò”: giống mọi người cùng vai trò. “Cho phép”: cấp thêm dù vai trò không có. “Chặn”: bỏ dù vai trò có. Lưu ngay khi
            bấm; bạn chỉ cấp được quyền mà chính bạn có.
          </p>
          <ErrorLine text={overrideError} />
          {CATEGORIES.map(([cat, label]) => (
            <div key={cat} className="space-y-2">
              <div className="font-bold text-slate-700 pt-1">{label}</div>
              {SYSTEM_PERMISSIONS.filter((p) => p.category === cat).map((p) => {
                const fromRole = roleHas(overrideUser.role, p.code);
                const state = overrideUser.permissionOverrides?.revoked?.includes(p.code)
                  ? 'revoked'
                  : overrideUser.permissionOverrides?.granted?.includes(p.code)
                    ? 'granted'
                    : 'inherited';
                const can = actorPerms.has(p.code);
                const opt = (s: typeof state, text: string, on: string) => (
                  <button
                    type="button"
                    disabled={overrideBusy || (s === 'granted' && !can)}
                    onClick={() => state !== s && setOverride(overrideUser, p.code, s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${state === s ? on : 'text-slate-600 hover:bg-white'}`}
                  >
                    {text}
                  </button>
                );
                return (
                  <div
                    key={p.code}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      state === 'granted' ? 'bg-emerald-50/60 border-emerald-300' : state === 'revoked' ? 'bg-red-50/60 border-red-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        {p.name}
                        {p.riskLevel === 'high' && <span className="px-1.5 rounded bg-amber-100 text-amber-800 text-[9px]">Nhạy cảm</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">{p.description}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                      {opt('inherited', `Theo vai trò (${fromRole ? 'có' : 'không'})`, 'bg-white text-slate-900 shadow-2xs')}
                      {opt('granted', '+ Cho phép', 'bg-emerald-600 text-white')}
                      {opt('revoked', '− Chặn', 'bg-red-600 text-white')}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
};
