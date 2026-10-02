import React from 'react';
import { ShieldAlert, Lock, ArrowRight, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';
import { AdminUser, UserRole, RolePermissionConfig } from '../../types';
import { TAB_PERMISSION_MAP, SYSTEM_PERMISSIONS } from '../../utils/rbac';

interface RBACAccessGuardProps {
  currentTabId: string;
  tabLabel: string;
  currentUser: AdminUser;
  roleConfigs: Record<UserRole, RolePermissionConfig>;
  /** Demo persona switch; omitted for real staff sessions (privileges come from the server). */
  onSwitchToSuperAdmin?: () => void;
  onRequestPermission?: (permCode: string) => void;
  onNavigateToAllowedTab?: () => void;
}

export const RBACAccessGuard: React.FC<RBACAccessGuardProps> = ({
  currentTabId,
  tabLabel,
  currentUser,
  roleConfigs,
  onSwitchToSuperAdmin,
  onRequestPermission,
  onNavigateToAllowedTab,
}) => {
  const mapping = TAB_PERMISSION_MAP[currentTabId];
  const requiredCodes = mapping ? mapping.codes : [];
  const requiredPermissions = SYSTEM_PERMISSIONS.filter((p) => requiredCodes.includes(p.code));
  const currentRoleConfig = roleConfigs[currentUser.role];

  return (
    <div className="max-w-3xl mx-auto my-8 p-6 sm:p-10 bg-white rounded-3xl border border-red-200 shadow-xl space-y-6 text-center animate-fadeIn">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-inner">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold font-mono">
          <Lock className="w-3.5 h-3.5" />
          <span>HTTP 403 · TRUY CẬP BỊ GIỚI HẠN (RBAC ACCESS DENIED)</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Bạn không có quyền truy cập mô-đun "{tabLabel}"
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Tài khoản <strong>{currentUser.name}</strong> đang đăng nhập với vai trò{' '}
          <span className="font-bold text-slate-900 underline">{currentRoleConfig?.roleName || currentUser.role}</span> ({currentRoleConfig?.department}), chưa được cấp quyền thực hiện tác vụ này.
        </p>
      </div>

      {/* Required permissions details card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
        <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-200 pb-2">
          <span className="flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>Quyền hạn hệ thống bắt buộc (Required Permissions):</span>
          </span>
          <span className="text-[11px] text-slate-500 font-normal">Yêu cầu tối thiểu 1 trong các quyền:</span>
        </div>

        <div className="space-y-2">
          {requiredPermissions.map((p) => (
            <div key={p.code} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span>{p.name}</span>
                  <code className="text-[10px] bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
                    {p.code}
                  </code>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{p.description}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                p.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {p.riskLevel === 'high' ? 'Rủi ro cao' : 'Tiêu chuẩn'}
              </span>
            </div>
          ))}
          {requiredPermissions.length === 0 && (
            <div className="text-slate-500 italic">Quyền bảo mật cấp hệ thống.</div>
          )}
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Nhóm vai trò được phép: <strong>{mapping?.minRoleDesc || 'Super Admin'}</strong></span>
        </div>
      </div>

      {/* Action CTA Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onSwitchToSuperAdmin && (
        <button
          type="button"
          onClick={onSwitchToSuperAdmin}
          className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Chuyển sang Hoàng Tùng (Super Admin - Toàn quyền)</span>
        </button>
        )}

        {onNavigateToAllowedTab && (
          <button
            type="button"
            onClick={onNavigateToAllowedTab}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Về mô-đun được phân quyền</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {onRequestPermission && requiredCodes[0] && (
          <button
            type="button"
            onClick={() => onRequestPermission(requiredCodes[0])}
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Gửi yêu cầu cấp quyền
          </button>
        )}
      </div>
    </div>
  );
};
