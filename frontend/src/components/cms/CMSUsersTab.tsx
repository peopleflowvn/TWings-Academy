import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Key,
  Phone,
  Mail,
  Lock,
  Sparkles,
  X,
  Sliders,
  DollarSign,
  AlertTriangle,
  History,
  Save,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Filter,
  FileCheck,
  Check,
  CheckSquare,
  Square,
  Activity,
  Layers,
  Award,
  Zap,
  RefreshCw,
  Download
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AdminUser, UserRole, PermissionDefinition, RolePermissionConfig } from '../../types';
import { INITIAL_ADMIN_USERS } from '../../data/courseraData';
import {
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLE_CONFIGS,
  runRBACSecurityAudit,
  checkUserHasPermission,
  RBACOverviewAudit
} from '../../utils/rbac';

// Mock audit log history
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  status: 'success' | 'warning' | 'info';
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '02/10/2026 09:30',
    actor: 'Hoàng Tùng (Super Admin)',
    action: 'Kiểm toán hệ thống RBAC',
    target: 'Chạy quét an toàn Separation of Duties & Principle of Least Privilege - Đạt 98/100 điểm',
    status: 'success'
  },
  {
    id: 'log-2',
    timestamp: '01/10/2026 23:45',
    actor: 'Hoàng Tùng (Super Admin)',
    action: 'Cập nhật ma trận phân quyền',
    target: 'Cấp quyền crm.export_excel cho vai trò Tư vấn Tuyển sinh',
    status: 'success'
  },
  {
    id: 'log-3',
    timestamp: '01/10/2026 21:10',
    actor: 'Hoàng Tùng (Super Admin)',
    action: 'Cấp tài khoản mới',
    target: 'Thêm nhân sự Vũ Thu Phương vào Ban Đào tạo & LMS',
    status: 'success'
  },
  {
    id: 'log-4',
    timestamp: '30/09/2026 16:30',
    actor: 'Đặng Thanh Loan (Kế toán)',
    action: 'Xác nhận đối soát VietQR',
    target: 'Gạch nợ đơn TW_89241 khóa QHKH Cá nhân',
    status: 'info'
  },
  {
    id: 'log-5',
    timestamp: '29/09/2026 14:15',
    actor: 'Hoàng Tùng (Super Admin)',
    action: 'Khóa tài khoản thử nghiệm',
    target: 'Tạm ngưng quyền truy cập của tài khoản test@twings.edu.vn',
    status: 'warning'
  }
];

interface CMSUsersTabProps {
  users?: AdminUser[];
  onUpdateUsers?: (users: AdminUser[]) => void;
  roleConfigs?: Record<UserRole, RolePermissionConfig>;
  onUpdateRoleConfigs?: (configs: Record<UserRole, RolePermissionConfig>) => void;
  currentActorUser?: AdminUser;
  onSelectCurrentActor?: (user: AdminUser) => void;
}

export const CMSUsersTab: React.FC<CMSUsersTabProps> = ({
  users: propUsers,
  onUpdateUsers,
  roleConfigs: propRoleConfigs,
  onUpdateRoleConfigs,
  currentActorUser,
  onSelectCurrentActor,
}) => {
  // Navigation sub-tabs (Now includes 5: Security & Compliance Audit)
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'roles' | 'compliance' | 'audit'>('users');

  // Core state (syncs with props or falls back to local)
  const [localUsers, setLocalUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const users = propUsers || localUsers;
  const setUsers = (newUsers: AdminUser[]) => {
    if (onUpdateUsers) onUpdateUsers(newUsers);
    setLocalUsers(newUsers);
  };

  const [localRoleConfigs, setLocalRoleConfigs] = useState<Record<UserRole, RolePermissionConfig>>(DEFAULT_ROLE_CONFIGS);
  const roleConfigs = propRoleConfigs || localRoleConfigs;
  const setRoleConfigs = (newConfigs: Record<UserRole, RolePermissionConfig>) => {
    if (onUpdateRoleConfigs) onUpdateRoleConfigs(newConfigs);
    setLocalRoleConfigs(newConfigs);
  };

  const currentActorName = currentActorUser?.name || 'Hoàng Tùng (Super Admin)';
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [editingUserOverrides, setEditingUserOverrides] = useState<AdminUser | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // Live security audit report calculation
  const [auditReport, setAuditReport] = useState<RBACOverviewAudit>(() => runRBACSecurityAudit(users, roleConfigs));

  const refreshAudit = () => {
    const fresh = runRBACSecurityAudit(users, roleConfigs);
    setAuditReport(fresh);
    showToast('Đã quét và cập nhật báo cáo kiểm toán bảo mật RBAC mới nhất.', 'info');
  };

  // Helper toast notification (Replaces window.alert)
  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4000);
  };

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('sales_crm');

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered permissions for matrix
  const filteredPermissions = SYSTEM_PERMISSIONS.filter((p) => {
    const matchesCategory = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Toggle user status
  const handleToggleStatus = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const nextStatus: 'active' | 'suspended' = targetUser?.status === 'active' ? 'suspended' : 'active';
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u));
    setUsers(updatedUsers);

    // Log action
    if (targetUser) {
      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        actor: currentActorName,
        action: nextStatus === 'active' ? 'Mở khóa tài khoản' : 'Tạm khóa tài khoản',
        target: `${targetUser.name} (${targetUser.email})`,
        status: nextStatus === 'active' ? 'success' : 'warning'
      };
      setAuditLogs([newLog, ...auditLogs]);
      showToast(
        nextStatus === 'active'
          ? `Đã mở khóa tài khoản cho ${targetUser.name}.`
          : `Đã tạm ngưng tài khoản của ${targetUser.name}. Quyền truy cập bị vô hiệu hóa.`,
        nextStatus === 'active' ? 'success' : 'warning'
      );
    }
  };

  // Change user role
  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const targetUser = users.find((u) => u.id === userId);
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    setUsers(updatedUsers);

    if (targetUser) {
      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        actor: currentActorName,
        action: 'Thay đổi vai trò nhân sự',
        target: `Chuyển ${targetUser.name} sang vai trò ${roleConfigs[newRole].roleName}`,
        status: 'info'
      };
      setAuditLogs([newLog, ...auditLogs]);
      showToast(`Đã chuyển nhân sự ${targetUser.name} sang vai trò "${roleConfigs[newRole].roleName}".`, 'info');
    }
  };

  // Toggle a permission in matrix for a specific role
  const handleToggleMatrixPermission = (role: UserRole, permCode: string) => {
    if (role === 'super_admin') {
      showToast('Vai trò Quản trị tối cao (Super Admin) luôn giữ toàn bộ quyền hệ thống để đảm bảo an toàn.', 'warning');
      return;
    }

    const currentAllowed = roleConfigs[role].allowedPermissionCodes;
    const isAllowed = currentAllowed.includes(permCode);
    const updatedCodes = isAllowed
      ? currentAllowed.filter((c) => c !== permCode)
      : [...currentAllowed, permCode];

    const updatedConfigs = {
      ...roleConfigs,
      [role]: {
        ...roleConfigs[role],
        allowedPermissionCodes: updatedCodes
      }
    };

    setRoleConfigs(updatedConfigs);
  };

  // Save policy matrix
  const handleSavePolicyMatrix = () => {
    showToast('Đã lưu thành công cấu hình ma trận phân quyền chi tiết cho toàn bộ 5 vai trò!', 'success');
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('vi-VN'),
      actor: currentActorName,
      action: 'Lưu thay đổi ma trận RBAC',
      target: 'Áp dụng chính sách phân quyền chi tiết mới vào phiên làm việc',
      status: 'success'
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  // Reset policy matrix to defaults (without window.confirm)
  const handleConfirmResetMatrix = () => {
    setRoleConfigs(DEFAULT_ROLE_CONFIGS);
    setShowResetConfirmModal(false);
    showToast('Đã khôi phục ma trận phân quyền về chuẩn mặc định an toàn của TWings Academy.', 'info');
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('vi-VN'),
      actor: currentActorName,
      action: 'Đặt lại chuẩn ma trận RBAC',
      target: 'Khôi phục toàn bộ quyền của 5 vai trò về mặc định',
      status: 'info'
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  // Handle adding new user
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: AdminUser = {
      id: `usr-${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      phone: newUserPhone || '0900000000',
      role: newUserRole,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      lastActive: 'Vừa tạo',
      permissions: roleConfigs[newUserRole].allowedPermissionCodes
    };

    setUsers([newUser, ...users]);
    setShowAddModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('vi-VN'),
      actor: currentActorName,
      action: 'Tạo nhân sự mới',
      target: `Cấp quyền cho ${newUserName} (${newUserEmail}) vai trò ${roleConfigs[newUserRole].roleName}`,
      status: 'success'
    };
    setAuditLogs([newLog, ...auditLogs]);

    showToast(`Đã tạo thành công tài khoản cho "${newUserName}" với vai trò ${roleConfigs[newUserRole].roleName}.`, 'success');
  };

  // 3-state Custom User Override Handler
  const getUserPermissionState = (user: AdminUser, permCode: string): 'inherited' | 'granted' | 'revoked' => {
    if (user.customOverrides?.revokedCodes?.includes(permCode)) return 'revoked';
    if (user.customOverrides?.grantedCodes?.includes(permCode)) return 'granted';
    return 'inherited';
  };

  const handleSetUserPermissionState = (user: AdminUser, permCode: string, newState: 'inherited' | 'granted' | 'revoked') => {
    const currentGranted = user.customOverrides?.grantedCodes || [];
    const currentRevoked = user.customOverrides?.revokedCodes || [];

    let updatedGranted = currentGranted.filter((c) => c !== permCode);
    let updatedRevoked = currentRevoked.filter((c) => c !== permCode);

    if (newState === 'granted') {
      updatedGranted.push(permCode);
    } else if (newState === 'revoked') {
      updatedRevoked.push(permCode);
    }

    const updatedUser: AdminUser = {
      ...user,
      customOverrides: {
        grantedCodes: updatedGranted,
        revokedCodes: updatedRevoked
      }
    };

    setEditingUserOverrides(updatedUser);
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* 1. TOP HEADER & RBAC STATS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-100 text-[#0073C1]">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Quản Trị Người Dùng & Phân Quyền Chi Tiết (RBAC)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Hệ thống kiểm soát truy cập theo vai trò (Role-Based Access Control) chuẩn doanh nghiệp: Ma trận quyền hạn chi tiết cho từng mô-đun, phân quyền riêng cho từng nhân sự và kiểm toán tuân thủ bảo mật.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setActiveTab('compliance');
                refreshAudit();
              }}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Điểm Tuân Thủ: {auditReport.score}/100</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Nhân Sự Mới</span>
            </button>
          </div>
        </div>

        {/* Global Notification Toast */}
        {notificationMsg && (
          <div
            className={`p-3.5 rounded-xl flex items-center justify-between gap-2 text-xs font-bold animate-fadeIn border ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notificationMsg.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notificationMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {notificationMsg.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
              {notificationMsg.type === 'info' && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
              <span>{notificationMsg.text}</span>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sub-Tabs Bar: All 5 Sub-Modules */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Danh Sách Thành Viên & Cấp Quyền ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-[#0073C1] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. Ma Trận Phân Quyền Chi Tiết ({SYSTEM_PERMISSIONS.length} Quyền)</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>3. Hồ Sơ 5 Vai Trò Nghiệp Vụ</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('compliance');
              refreshAudit();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'compliance'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>4. Kiểm Toán An Toàn & Tuân Thủ (SoD / PoLP)</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>5. Nhật Ký Kiểm Toán ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* =============================================================== */}
      {/* TAB 1: DANH SÁCH THÀNH VIÊN & PHÂN QUYỀN TRỰC TIẾP */}
      {/* =============================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Quick Role Badges Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(Object.keys(roleConfigs) as UserRole[]).map((r) => {
              const count = users.filter((u) => u.role === r).length;
              return (
                <div
                  key={r}
                  className={`p-3.5 rounded-2xl border bg-white space-y-1 shadow-2xs ${
                    selectedRoleFilter === r ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleConfigs[r].color}`}>
                      {roleConfigs[r].roleName.split(' ')[0]}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900">{count} nhân sự</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-800 truncate">{roleConfigs[r].roleName}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {roleConfigs[r].allowedPermissionCodes.length} quyền kích hoạt
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-80 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm nhân sự theo tên, email, SĐT..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Lọc vai trò:</span>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="text-xs p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold"
                >
                  <option value="all">Tất cả ({users.length} thành viên)</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="academic_management">Vận hành Đào tạo / LMS</option>
                  <option value="sales_crm">Tư vấn Tuyển sinh & CRM</option>
                  <option value="content_seo">Nội dung & SEO</option>
                  <option value="finance_accountant">Kế toán & Tài chính</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Thành Viên</th>
                    <th className="p-3.5">Liên Hệ</th>
                    <th className="p-3.5">Vai Trò Nghiệp Vụ</th>
                    <th className="p-3.5">Đặc Cách Riêng (Custom)</th>
                    <th className="p-3.5">Trạng Thái</th>
                    <th className="p-3.5">Đang Đăng Nhập</th>
                    <th className="p-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const customGrantedCount = u.customOverrides?.grantedCodes?.length || 0;
                    const customRevokedCount = u.customOverrides?.revokedCodes?.length || 0;
                    const isCurrentActor = currentActorUser?.id === u.id;

                    return (
                      <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isCurrentActor ? 'bg-blue-50/40' : ''}`}>
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isCurrentActor && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">
                                    Hiện tại
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="text-slate-700 flex items-center gap-1 font-mono text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                          <div className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="text-xs font-bold border border-slate-300 rounded-xl p-1.5 bg-slate-50 focus:bg-white"
                          >
                            <option value="super_admin">Super Admin (Tối cao)</option>
                            <option value="academic_management">Vận hành Đào tạo / LMS</option>
                            <option value="sales_crm">Tư vấn Tuyển sinh & CRM</option>
                            <option value="content_seo">Nội dung & SEO</option>
                            <option value="finance_accountant">Kế toán & Tài chính</option>
                          </select>
                        </td>

                        <td className="p-3.5">
                          {customGrantedCount > 0 || customRevokedCount > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {customGrantedCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  +{customGrantedCount} cấp thêm
                                </span>
                              )}
                              {customRevokedCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                                  -{customRevokedCount} thu hồi
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Theo vai trò chuẩn</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {u.status === 'active' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" /> Đang hoạt động
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold text-[10px] flex items-center gap-1 w-max">
                              <XCircle className="w-3 h-3" /> Đã tạm khóa
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {onSelectCurrentActor && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCurrentActor(u);
                                showToast(`Đã chuyển phiên làm việc sang "${u.name}" (${roleConfigs[u.role].roleName}).`, 'info');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isCurrentActor
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                              title="Chuyển phiên làm việc để trải nghiệm quyền truy cập của nhân sự này"
                            >
                              {isCurrentActor ? '✓ Đang duyệt' : 'Đăng nhập thử'}
                            </button>
                          )}
                        </td>

                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingUserOverrides(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0073C1] font-bold text-[11px] transition-colors cursor-pointer"
                            title="Tùy chỉnh cấp thêm hoặc chặn quyền riêng cho nhân sự này"
                          >
                            <Sliders className="w-3.5 h-3.5 inline mr-1" />
                            <span>Phân quyền riêng</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u.id)}
                            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                              u.status === 'active'
                                ? 'bg-red-50 hover:bg-red-100 text-red-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 2: MA TRẬN PHÂN QUYỀN CHI TIẾT (RBAC MATRIX) */}
      {/* =============================================================== */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#0073C1]" />
                  <span>Bảng Ma Trận Phân Quyền Chi Tiết Theo Vai Trò (Matrix RBAC)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tích chọn để bật/tắt quyền hạn cụ thể cho từng nhóm vai trò vận hành trong hệ thống LMS & CMS TWings.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Đặt lại toàn bộ quyền về mặc định"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Đặt Lại Chuẩn</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePolicyMatrix}
                  className="px-4 py-2 rounded-xl bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Chính Sách Phân Quyền</span>
                </button>
              </div>
            </div>

            {/* Filter by Category & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Mô-đun:</span>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'crm', label: '1. CRM & Đơn hàng' },
                  { id: 'courses', label: '2. Khóa học & YouTube' },
                  { id: 'homepage', label: '3. Banner & Trang chủ' },
                  { id: 'articles_seo', label: '4. Bài viết & SEO' },
                  { id: 'finance', label: '5. Kế toán VietQR' },
                  { id: 'rbac', label: '6. Quản trị RBAC' },
                  { id: 'system', label: '7. Hệ thống & Kiến trúc' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategoryFilter === cat.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-64 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm quyền hạn theo tên hoặc code..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[11px]">
                  <tr>
                    <th className="p-3.5 min-w-[280px]">Hành Động / Quyền Hạn Chi Tiết</th>
                    <th className="p-3.5 text-center min-w-[130px] bg-red-950/80 border-l border-slate-800">
                      Super Admin
                      <span className="block text-[9px] font-normal text-red-300">
                        {roleConfigs.super_admin.allowedPermissionCodes.length} quyền (Toàn quyền)
                      </span>
                    </th>
                    <th className="p-3.5 text-center min-w-[140px] bg-purple-950/80 border-l border-slate-800">
                      Đào Tạo & LMS
                      <span className="block text-[9px] font-normal text-purple-300">
                        {roleConfigs.academic_management.allowedPermissionCodes.length} quyền kích hoạt
                      </span>
                    </th>
                    <th className="p-3.5 text-center min-w-[130px] bg-blue-950/80 border-l border-slate-800">
                      Tư Vấn CRM
                      <span className="block text-[9px] font-normal text-blue-300">
                        {roleConfigs.sales_crm.allowedPermissionCodes.length} quyền kích hoạt
                      </span>
                    </th>
                    <th className="p-3.5 text-center min-w-[130px] bg-emerald-950/80 border-l border-slate-800">
                      Nội Dung & SEO
                      <span className="block text-[9px] font-normal text-emerald-300">
                        {roleConfigs.content_seo.allowedPermissionCodes.length} quyền kích hoạt
                      </span>
                    </th>
                    <th className="p-3.5 text-center min-w-[130px] bg-amber-950/80 border-l border-slate-800">
                      Kế Toán & Thu Phí
                      <span className="block text-[9px] font-normal text-amber-300">
                        {roleConfigs.finance_accountant.allowedPermissionCodes.length} quyền kích hoạt
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredPermissions.map((perm) => (
                    <tr key={perm.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{perm.name}</span>
                          {perm.riskLevel === 'high' && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold text-[9px] flex items-center gap-0.5"
                              title="Quyền có rủi ro cao - Thay đổi dữ liệu nhạy cảm"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Nhạy cảm</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-snug">{perm.description}</div>
                        <div className="text-[10px] font-mono text-[#0073C1] mt-0.5">
                          <code>{perm.code}</code> · {perm.categoryLabel}
                        </div>
                      </td>

                      {/* Super Admin (Always Checked & Locked) */}
                      <td className="p-3.5 text-center bg-red-50/20 border-l border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleToggleMatrixPermission('super_admin', perm.code)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          title="Super Admin toàn quyền bắt buộc"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Academic Management */}
                      <td className="p-3.5 text-center bg-purple-50/20 border-l border-slate-100">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roleConfigs.academic_management.allowedPermissionCodes.includes(perm.code)}
                            onChange={() => handleToggleMatrixPermission('academic_management', perm.code)}
                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Sales CRM */}
                      <td className="p-3.5 text-center bg-blue-50/20 border-l border-slate-100">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roleConfigs.sales_crm.allowedPermissionCodes.includes(perm.code)}
                            onChange={() => handleToggleMatrixPermission('sales_crm', perm.code)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Content SEO */}
                      <td className="p-3.5 text-center bg-emerald-50/20 border-l border-slate-100">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roleConfigs.content_seo.allowedPermissionCodes.includes(perm.code)}
                            onChange={() => handleToggleMatrixPermission('content_seo', perm.code)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Finance Accountant */}
                      <td className="p-3.5 text-center bg-amber-50/20 border-l border-slate-100">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roleConfigs.finance_accountant.allowedPermissionCodes.includes(perm.code)}
                            onChange={() => handleToggleMatrixPermission('finance_accountant', perm.code)}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                          />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 3: HỒ SƠ CHI TIẾT 5 VAI TRÒ NGHIỆP VỤ */}
      {/* =============================================================== */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(roleConfigs) as UserRole[]).map((rKey) => {
              const cfg = roleConfigs[rKey];
              const members = users.filter((u) => u.role === rKey);
              return (
                <div
                  key={rKey}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-block ${cfg.color}`}>
                          {cfg.roleName}
                        </span>
                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                          {cfg.department}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {members.length} nhân sự
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{cfg.description}</p>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-700 mb-2">
                        Các quyền hạn được cấp ({cfg.allowedPermissionCodes.length}/{SYSTEM_PERMISSIONS.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cfg.allowedPermissionCodes.slice(0, 8).map((code) => {
                          const pDef = SYSTEM_PERMISSIONS.find((p) => p.code === code);
                          return (
                            <span
                              key={code}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium"
                              title={pDef?.description}
                            >
                              {pDef?.name || code}
                            </span>
                          );
                        })}
                        {cfg.allowedPermissionCodes.length > 8 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-50 text-[#0073C1] font-bold">
                            +{cfg.allowedPermissionCodes.length - 8} quyền khác...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Members in role */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center -space-x-2">
                      {members.map((m) => (
                        <img
                          key={m.id}
                          src={m.avatar}
                          alt={m.name}
                          className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs"
                          title={`${m.name} (${m.email})`}
                        />
                      ))}
                      {members.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">Chưa gán nhân sự</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoleFilter(rKey);
                        setActiveTab('users');
                      }}
                      className="text-[11px] text-[#0073C1] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Xem danh sách</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 4: BÁO CÁO KIỂM TOÁN AN TOÀN & TUÂN THỦ (NEW COMPLIANCE AUDIT) */}
      {/* =============================================================== */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* 1. Scorecard Hero */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#0048C8] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-mono font-bold backdrop-blur-xs border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>BÁO CÁO KIỂM TOÁN PHÂN QUYỀN RBAC ĐỘC LẬP</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                Chỉ Số Tuân Thủ Bảo Mật: {auditReport.score}/100
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hệ thống tự động rà soát ma trận quyền hạn, đảm bảo nguyên tắc phân tách trách nhiệm (Separation of Duties - SoD) và quyền tối thiểu (Principle of Least Privilege - PoLP) theo tiêu chuẩn bảo mật hệ thống ngân hàng.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-xs border border-white/10 shrink-0">
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-400">{auditReport.score}</div>
                <div className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">Điểm An Toàn</div>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <button
                type="button"
                onClick={refreshAudit}
                className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Quét Lại Ngay</span>
              </button>
            </div>
          </div>

          {/* 2. Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
                <span>Tổng Nhân Sự</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{auditReport.totalUsers}</div>
              <div className="text-[11px] text-emerald-600 font-bold">{auditReport.activeUsers} đang kích hoạt</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
                <span>Super Admin (Tối cao)</span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{auditReport.superAdminCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Chỉ dành cho BOD TWings</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
                <span>Quyền Rủi Ro Cao</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-700">{auditReport.highRiskPermissionsAssigned}</div>
              <div className="text-[11px] text-slate-500 font-medium">Lượt gán quyền nhạy cảm</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
                <span>Đặc Cách Riêng (Overrides)</span>
                <Sliders className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-700">{auditReport.usersWithOverridesCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Nhân sự có quyền riêng</div>
            </div>
          </div>

          {/* 3. Detailed Audit Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1: Separation of Duties (SoD) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">1. Phân Tách Trách Nhiệm (SoD)</h4>
                    <span className="text-[11px] text-slate-500">Ngăn ngừa xung đột lợi ích giữa các phòng ban</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  auditReport.sodCompliance.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {auditReport.sodCompliance.passed ? '✓ Đạt Chuẩn' : 'Cần Xử Lý'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sales & Tuyển sinh:</strong> Không được quyền duyệt thanh toán tài chính hoặc sửa giáo trình bài học.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kế toán & Tài chính:</strong> Chỉ xem báo cáo doanh số và duyệt VietQR, không có quyền xóa lead hoặc xuất bản tin tức.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Đào tạo & LMS:</strong> Không có quyền truy cập mã nguồn Django backend hoặc cấu hình SEO domain.
                  </span>
                </div>
              </div>

              {auditReport.sodCompliance.issues.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-700">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Lỗi SoD phát hiện:</span>
                  </div>
                  {auditReport.sodCompliance.issues.map((iss, i) => (
                    <div key={i} className="pl-5 text-[11px] list-disc">• {iss}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Pillar 2: Principle of Least Privilege (PoLP) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">2. Quyền Hạn Tối Thiểu (PoLP)</h4>
                    <span className="text-[11px] text-slate-500">Giới hạn đặc quyền theo đúng mô tả công việc</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  auditReport.polpCompliance.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {auditReport.polpCompliance.passed ? '✓ Tối Ưu' : 'Cảnh Báo'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Chỉ có vai trò <strong>Super Admin</strong> mới nắm giữ toàn quyền ma trận và hạ tầng backend.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Các quyền nhạy cảm (như <code>crm.delete_lead</code>, <code>courses.delete</code>, <code>rbac.edit_matrix</code>) đều được bảo vệ và yêu cầu phê duyệt cấp cao.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Nhân sự khi nghỉ việc hoặc tạm ngưng sẽ lập tức bị khóa quyền với cơ chế <code>status: suspended</code>.
                  </span>
                </div>
              </div>

              {auditReport.polpCompliance.issues.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-800">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Lỗi PoLP cần lưu ý:</span>
                  </div>
                  {auditReport.polpCompliance.issues.map((iss, i) => (
                    <div key={i} className="pl-5 text-[11px]">• {iss}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Recommendations & Security Checklist */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#0073C1]" />
              <span>Khuyến Nghị An Toàn & Đánh Giá Kiểm Toán Hệ Thống</span>
            </h4>

            <div className="space-y-2 text-xs">
              {auditReport.recommendations.map((rec, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="font-mono font-bold text-blue-600 shrink-0">#{i + 1}</span>
                  <span className="text-slate-700 leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 5: NHẬT KÝ KIỂM TOÁN QUYỀN (AUDIT LOG) */}
      {/* =============================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <span>Nhật Ký Hoạt Động & Kiểm Toán Phân Quyền (Audit Trail)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ghi lại chi tiết mọi hành vi thay đổi quyền, đổi vai trò, khóa tài khoản hoặc xuất dữ liệu khách hàng.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({log.timestamp})</span>
                  </div>
                  <div className="text-slate-600">{log.target}</div>
                  <div className="text-[11px] text-slate-400">
                    Thực hiện bởi: <strong>{log.actor}</strong>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold w-max ${
                    log.status === 'success'
                      ? 'bg-emerald-100 text-emerald-800'
                      : log.status === 'warning'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {log.status === 'success' ? 'Thành công' : log.status === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL 1: THÊM NHÂN SỰ MỚI */}
      {/* =============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Thêm Thành Viên Vận Hành & Gán Quyền</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên nhân sự *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Tuấn"
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email công vụ (@twings.edu.vn) *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="tuan.nv@twings.edu.vn"
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="0988112233"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vai trò vận hành (RBAC) *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50"
                >
                  <option value="sales_crm">Tư vấn Tuyển sinh & CRM</option>
                  <option value="academic_management">Vận hành Đào tạo & LMS</option>
                  <option value="content_seo">Biên tập Nội dung & SEO</option>
                  <option value="finance_accountant">Kế toán & Đối soát VietQR</option>
                  <option value="super_admin">Quản trị tối cao (Super Admin)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nhân sự sẽ tự động thừa hưởng toàn bộ {roleConfigs[newUserRole].allowedPermissionCodes.length} quyền hạn theo vai trò đã chọn.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Lưu & Cấp Quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL 2: TÙY CHỈNH PHÂN QUYỀN RIÊNG 3 TRẠNG THÁI (USER OVERRIDES) */}
      {/* =============================================================== */}
      {editingUserOverrides && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Phân Quyền Chi Tiết: {editingUserOverrides.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vai trò mặc định: <strong className="text-blue-300">{roleConfigs[editingUserOverrides.role].roleName}</strong>
                </p>
              </div>

              <button
                onClick={() => setEditingUserOverrides(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0073C1] shrink-0 mt-0.5" />
                <div>
                  Hệ thống hỗ trợ 3 trạng thái phân quyền chi tiết cho nhân sự:
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 font-bold text-[11px]">
                    <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded">Thừa hưởng: Theo vai trò chuẩn</span>
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">+ Cấp thêm: Đặc cách riêng</span>
                    <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded">- Thu hồi: Chặn riêng dù vai trò có</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {SYSTEM_PERMISSIONS.map((perm) => {
                  const roleHas = roleConfigs[editingUserOverrides.role].allowedPermissionCodes.includes(perm.code);
                  const permState = getUserPermissionState(editingUserOverrides, perm.code);

                  return (
                    <div
                      key={perm.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        permState === 'granted'
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : permState === 'revoked'
                          ? 'bg-red-50/50 border-red-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{perm.name}</span>
                          {roleHas && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                              Vai trò có sẵn
                            </span>
                          )}
                          {permState === 'granted' && (
                            <span className="text-[9px] px-2 py-0.2 rounded bg-emerald-600 text-white font-bold">
                              + Cấp đặc cách riêng
                            </span>
                          )}
                          {permState === 'revoked' && (
                            <span className="text-[9px] px-2 py-0.2 rounded bg-red-600 text-white font-bold">
                              - Đã bị chặn riêng
                            </span>
                          )}
                          {perm.riskLevel === 'high' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                              Rủi ro cao
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-snug">{perm.description}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          <code>{perm.code}</code> · {perm.categoryLabel}
                        </div>
                      </div>

                      {/* 3-State Controls */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleSetUserPermissionState(editingUserOverrides, perm.code, 'inherited')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            permState === 'inherited'
                              ? 'bg-white text-slate-800 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Mặc định ({roleHas ? 'Bật' : 'Tắt'})
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetUserPermissionState(editingUserOverrides, perm.code, 'granted')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            permState === 'granted'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          + Cho phép
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetUserPermissionState(editingUserOverrides, perm.code, 'revoked')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            permState === 'revoked'
                              ? 'bg-red-600 text-white shadow-2xs'
                              : 'text-red-700 hover:bg-red-100'
                          }`}
                        >
                          - Chặn
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Hiệu lực tức thì đối với nhân sự <strong>{editingUserOverrides.name}</strong>.
              </span>
              <button
                type="button"
                onClick={() => setEditingUserOverrides(null)}
                className="px-5 py-2 bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Hoàn Tất & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL 3: XÁC NHẬN ĐẶT LẠI CHUẨN MA TRẬN (NO WINDOW.CONFIRM) */}
      {/* =============================================================== */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-slate-900">
                Xác nhận đặt lại ma trận phân quyền?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hành động này sẽ khôi phục toàn bộ quyền hạn của 5 vai trò về thiết lập mặc định của TWings Academy. Các đặc cách riêng của từng người dùng sẽ không bị ảnh hưởng.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetMatrix}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Đồng Ý Đặt Lại Chuẩn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
