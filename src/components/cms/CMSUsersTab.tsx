import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Key, 
  Phone, 
  Mail, 
  Lock,
  Sparkles,
  X
} from 'lucide-react';
import { AdminUser, UserRole } from '../../types';
import { INITIAL_ADMIN_USERS } from '../../data/courseraData';

export const CMSUsersTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('sales_crm');

  const roleLabels: Record<UserRole, { label: string; desc: string; color: string }> = {
    super_admin: {
      label: 'Quản trị tối cao (Super Admin)',
      desc: 'Toàn quyền cấu hình hệ thống, doanh thu và cơ sở dữ liệu',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    academic_management: {
      label: 'Vận hành Đào tạo & LMS',
      desc: 'Quản lý học viên, cấp tài khoản LMS riêng, quản lý chứng nhận & thực tập MSB',
      color: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    sales_crm: {
      label: 'Tư vấn Tuyển sinh & CRM',
      desc: 'Tiếp nhận lead, gọi điện tư vấn, cập nhật trạng thái CRM & chốt khóa học',
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    content_seo: {
      label: 'Biên tập Nội dung & SEO',
      desc: 'Soạn thảo bài viết, chấm điểm SEO On-page, cấu hình sitemap và banner',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    finance_accountant: {
      label: 'Kế toán & Tài chính',
      desc: 'Đối soát dòng tiền VietQR, xuất hóa đơn và chi trả hoa hồng người giới thiệu',
      color: 'bg-amber-100 text-amber-800 border-amber-200'
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleToggleStatus = (userId: string) => {
    setUsers(users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          status: u.status === 'active' ? 'suspended' : 'active'
        };
      }
      return u;
    }));
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  };

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
      permissions: ['read', 'write', newUserRole]
    };

    setUsers([newUser, ...users]);
    setShowAddModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0073C1]" />
            <h2 className="text-lg font-bold text-slate-900">
              Quản Trị Người Dùng & Phân Quyền Vận Hành (RBAC)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Phân định rõ ràng 5 vai trò nghiệp vụ: Super Admin, Đào tạo/LMS, Tư vấn CRM, Biên tập SEO và Kế toán.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm Nhân Sự Mới</span>
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.keys(roleLabels) as UserRole[]).map((r) => (
          <div key={r} className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${roleLabels[r].color}`}>
              {roleLabels[r].label}
            </span>
            <p className="text-[11px] text-slate-600 leading-snug">
              {roleLabels[r].desc}
            </p>
          </div>
        ))}
      </div>

      {/* Filter and User Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Lọc vai trò:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-xl bg-slate-50"
            >
              <option value="all">Tất cả vai trò ({users.length})</option>
              <option value="super_admin">Super Admin</option>
              <option value="sales_crm">Tư vấn CRM</option>
              <option value="academic_management">Vận hành Đào tạo / LMS</option>
              <option value="content_seo">Nội dung & SEO</option>
              <option value="finance_accountant">Kế toán</option>
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
                <th className="p-3.5">Trạng Thái</th>
                <th className="p-3.5">Hoạt Động Gần Nhất</th>
                <th className="p-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {u.id}</div>
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
                      className="text-xs font-bold border border-slate-300 rounded-lg p-1.5 bg-slate-50"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="sales_crm">Tư vấn CRM</option>
                      <option value="academic_management">Vận hành Đào tạo / LMS</option>
                      <option value="content_seo">Nội dung & SEO</option>
                      <option value="finance_accountant">Kế toán</option>
                    </select>
                  </td>

                  <td className="p-3.5">
                    {u.status === 'active' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3" /> Hoạt động
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold text-[10px] flex items-center gap-1 w-max">
                        <XCircle className="w-3 h-3" /> Tạm khóa
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                    {u.lastActive}
                  </td>

                  <td className="p-3.5 text-right space-x-1">
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                        u.status === 'active'
                          ? 'bg-red-50 hover:bg-red-100 text-red-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Thêm Thành Viên Vận Hành</span>
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
                <label className="font-bold text-slate-700 block mb-1">Họ và tên *</label>
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
                <label className="font-bold text-slate-700 block mb-1">Email làm việc *</label>
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
                <label className="font-bold text-slate-700 block mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="0988112233"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vai trò vận hành *</label>
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
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu & Cấp Quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
