import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Sparkles, 
  X, 
  Save, 
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { Order, CRMStatus, PaymentStatus } from '../../types';

interface CMSCRMOrdersTabProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onUpdateOrderCRM?: (updatedOrder: Order) => void;
}

export const CMSCRMOrdersTab: React.FC<CMSCRMOrdersTabProps> = ({
  orders,
  onUpdateOrderStatus,
  onUpdateOrderCRM,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCRMStatus, setSelectedCRMStatus] = useState<string>('Tất cả');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('Tất cả');
  const [selectedLead, setSelectedLead] = useState<Order | null>(null);
  const [activeLeadSection, setActiveLeadSection] = useState<number>(1);
  const [editedLead, setEditedLead] = useState<Order | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const crmStatusList: CRMStatus[] = [
    '1. Mới',
    '2. Đã tiếp cận',
    '3. Đang tư vấn',
    '4. Hẹn gặp',
    '5. Đã đóng phí',
    '6. Chăm sóc lại',
    '7. Đã hủy'
  ];

  // Filtering
  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      (ord.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.customerPhone?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.customerEmail?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.orderCode?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.citizenId?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesCRM =
      selectedCRMStatus === 'Tất cả' || ord.crmStatus === selectedCRMStatus;

    const matchesPay =
      selectedPaymentStatus === 'Tất cả' ||
      (selectedPaymentStatus === 'paid' && ord.status === 'paid') ||
      (selectedPaymentStatus === 'pending' && ord.status === 'pending');

    return matchesSearch && matchesCRM && matchesPay;
  });

  // Metrics
  const totalRevenue = orders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);
  const paidCount = orders.filter((o) => o.status === 'paid').length;
  const newLeadsCount = orders.filter((o) => !o.crmStatus || o.crmStatus === '1. Mới').length;
  const inConsultCount = orders.filter((o) => o.crmStatus === '3. Đang tư vấn' || o.crmStatus === '4. Hẹn gặp').length;

  // Duplicate & Multi-Course Registration Detection Map
  const duplicateMap = new Map<string, Order[]>();
  orders.forEach((o) => {
    const cleanPhone = (o.customerPhone || '').replace(/\D/g, '');
    const cleanEmail = (o.customerEmail || '').trim().toLowerCase();
    const key = cleanPhone || cleanEmail;
    if (key) {
      const list = duplicateMap.get(key) || [];
      list.push(o);
      duplicateMap.set(key, list);
    }
  });

  const handleAutoGenerateCode = () => {
    if (editedLead) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const cleanName = (editedLead.customerName || 'HV')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 15);
      const rand = Math.floor(100 + Math.random() * 900);
      const generated = `${dd}${mm}_${editedLead.campaignCode || 'TW3'}_${cleanName}_${rand}`;
      setEditedLead({
        ...editedLead,
        registrationCode: generated,
        orderCode: generated
      });
    }
  };

  const handleOpenLeadDetail = (order: Order) => {
    setSelectedLead(order);
    setEditedLead({ ...order });
    setActiveLeadSection(1);
  };

  const handleSaveLead = () => {
    if (editedLead && onUpdateOrderCRM) {
      onUpdateOrderCRM(editedLead);
      setSelectedLead(editedLead);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    }
  };

  const handleQuickAdvanceStatus = (nextStatus: CRMStatus) => {
    if (editedLead) {
      const updated: Order = {
        ...editedLead,
        crmStatus: nextStatus,
        status: nextStatus === '5. Đã đóng phí' ? 'paid' : editedLead.status,
        paymentStatusDetail: nextStatus === '5. Đã đóng phí' ? 'Đã đóng phí' : editedLead.paymentStatusDetail,
        totalPaidAmount: nextStatus === '5. Đã đóng phí' ? (editedLead.tuitionFee || editedLead.amount) : editedLead.totalPaidAmount
      };
      setEditedLead(updated);
      if (onUpdateOrderCRM) {
        onUpdateOrderCRM(updated);
      }
      setSelectedLead(updated);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Mã Đăng Ký',
      'Họ và Tên',
      'SĐT',
      'Email',
      'Khu vực',
      'CCCD',
      'Khóa Học',
      'Học Phí',
      'Trạng Thái CRM',
      'Trạng Thái TT',
      'Người phụ trách (PIC)',
      'Ngày Đăng Ký'
    ];
    const rows = filteredOrders.map((o) => [
      o.orderCode,
      `"${o.customerName}"`,
      o.customerPhone || '',
      o.customerEmail || '',
      `"${o.area || o.studyArea || ''}"`,
      o.citizenId || '',
      `"${o.courseTitle}"`,
      o.amount,
      `"${o.crmStatus || '1. Mới'}"`,
      `"${o.status}"`,
      `"${o.pic || 'Chưa gán'}"`,
      `"${o.registeredAt || o.createdAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CRM_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Doanh Thu CRM</div>
          <div className="text-2xl font-black text-slate-900 font-mono">{formatVND(totalRevenue)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Đối soát tự động qua VietQR</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Học Viên Đã Đóng Phí</div>
          <div className="text-2xl font-black text-emerald-600 font-mono">{paidCount} / {orders.length}</div>
          <div className="text-[11px] text-slate-500">Tỷ lệ chuyển đổi: {((paidCount / (orders.length || 1)) * 100).toFixed(1)}%</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lead Mới Cần Tiếp Cận</div>
          <div className="text-2xl font-black text-blue-600 font-mono">{newLeadsCount}</div>
          <div className="text-[11px] text-blue-600 font-semibold">Tự động phân bổ cho PIC</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đang Tư Vấn & Hẹn Gặp</div>
          <div className="text-2xl font-black text-amber-600 font-mono">{inConsultCount}</div>
          <div className="text-[11px] text-slate-500">Bank Tour & Gặp trực tiếp HO MSB</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="w-full md:w-80 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, SĐT, Email, CCCD, Mã ĐK..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-emerald-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel/CSV ({filteredOrders.length})</span>
            </button>
          </div>
        </div>

        {/* CRM Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold text-[11px] uppercase mr-1">Trạng thái:</span>
          {['Tất cả', ...crmStatusList].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedCRMStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCRMStatus === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders CRM Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Mã ĐK / Ngày</th>
                <th className="p-3.5">Học Viên</th>
                <th className="p-3.5">Khóa Học & Khu Vực</th>
                <th className="p-3.5">PIC Phụ Trách</th>
                <th className="p-3.5">Trạng Thái CRM</th>
                <th className="p-3.5">Thanh Toán</th>
                <th className="p-3.5 text-right">Chi Tiết CRM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((ord) => {
                const crmBadgeColor = () => {
                  switch (ord.crmStatus) {
                    case '1. Mới':
                      return 'bg-blue-100 text-blue-800 border-blue-200';
                    case '2. Đã tiếp cận':
                      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
                    case '3. Đang tư vấn':
                      return 'bg-purple-100 text-purple-800 border-purple-200';
                    case '4. Hẹn gặp':
                      return 'bg-amber-100 text-amber-800 border-amber-200';
                    case '5. Đã đóng phí':
                      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    case '6. Chăm sóc lại':
                      return 'bg-orange-100 text-orange-800 border-orange-200';
                    case '7. Đã hủy':
                      return 'bg-slate-100 text-slate-600 border-slate-200';
                    default:
                      return 'bg-slate-100 text-slate-700 border-slate-200';
                  }
                };

                return (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-[#0073C1] text-[11px] truncate max-w-[140px]" title={ord.orderCode}>
                        {ord.orderCode}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {ord.registeredAt || ord.createdAt?.slice(0, 10)}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{ord.customerName}</span>
                        {(() => {
                          const cp = (ord.customerPhone || '').replace(/\D/g, '');
                          const ce = (ord.customerEmail || '').trim().toLowerCase();
                          const count = (duplicateMap.get(cp) || duplicateMap.get(ce) || []).length;
                          if (count > 1) {
                            return (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300" title={`Học viên này có ${count} lượt đăng ký khóa học`}>
                                Đa khóa ({count})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{ord.customerPhone || 'Chưa có SĐT'}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-medium text-slate-800 truncate max-w-[200px]" title={ord.courseTitle}>
                        {ord.courseTitle}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{ord.area || ord.studyArea || 'Hà Nội'}</span>
                        {ord.campaignCode && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                            {ord.campaignCode}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-700 text-[11px]">{ord.pic || 'Chưa gán'}</div>
                      <div className="text-[10px] text-slate-400">{ord.source || 'Website'}</div>
                    </td>

                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${crmBadgeColor()}`}>
                        {ord.crmStatus || '1. Mới'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold font-mono text-slate-900">{formatVND(ord.amount)}</div>
                      {ord.status === 'paid' ? (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Đã đóng
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> Chờ thu
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleOpenLeadDetail(ord)}
                        className="px-3 py-1.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mở CRM</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full CRM Lead Modal with all 6 Sections matching Image 4 & 5 */}
      {selectedLead && editedLead && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-4">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-400/30">
                    Mã: {editedLead.orderCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Trạng thái: {editedLead.crmStatus || '1. Mới'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  Hồ Sơ CRM: {editedLead.customerName} - {editedLead.courseTitle}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveLead}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Hồ Sơ</span>
                </button>

                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Status Progression Bar */}
            <div className="bg-slate-100 p-2.5 border-b border-slate-200 flex items-center gap-1 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-2">Chuyển nhanh:</span>
              {crmStatusList.map((st) => (
                <button
                  key={st}
                  onClick={() => handleQuickAdvanceStatus(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    editedLead.crmStatus === st
                      ? 'bg-[#0073C1] text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Duplicate Detection Alert Banner (User: "phát hiện đăng ký trùng lặp hoặc kiểu 1 người đăng ký nhiều khóa") */}
            {(() => {
              const cp = (editedLead.customerPhone || '').replace(/\D/g, '');
              const ce = (editedLead.customerEmail || '').trim().toLowerCase();
              const sameCustomerList = duplicateMap.get(cp) || duplicateMap.get(ce) || [];
              if (sameCustomerList.length > 1) {
                return (
                  <div className="bg-amber-50 border-b border-amber-200 p-3 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <span className="font-bold text-amber-950">
                        Cảnh báo phát hiện trùng lặp: Học viên này đã đăng ký {sameCustomerList.length} khóa học trên hệ thống!
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sameCustomerList.map((other) => (
                        <button
                          key={other.id}
                          type="button"
                          onClick={() => handleOpenLeadDetail(other)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            other.id === editedLead.id
                              ? 'bg-amber-200 text-amber-950 border-amber-400'
                              : 'bg-white hover:bg-amber-100 text-slate-700 border-amber-200'
                          }`}
                        >
                          {other.courseTitle} ({other.status === 'paid' ? 'Đã đóng phí' : 'Chờ TT'})
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* 6 CRM Section Tabs (Matching attached images) */}
            <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto text-xs font-bold text-slate-600">
              <button
                onClick={() => setActiveLeadSection(1)}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeLeadSection === 1
                    ? 'border-[#0073C1] text-[#0073C1] bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                1. Thông Tin Cá Nhân
              </button>
              <button
                onClick={() => setActiveLeadSection(2)}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeLeadSection === 2
                    ? 'border-[#0073C1] text-[#0073C1] bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                2. Tiếp Cận & Chăm Sóc
              </button>
              <button
                onClick={() => setActiveLeadSection(3)}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeLeadSection === 3
                    ? 'border-[#0073C1] text-[#0073C1] bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                3. Thanh Toán Học Viên
              </button>
              <button
                onClick={() => setActiveLeadSection(4)}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeLeadSection === 4
                    ? 'border-[#0073C1] text-[#0073C1] bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                4. Thưởng Giới Thiệu
              </button>
              <button
                onClick={() => setActiveLeadSection(5)}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeLeadSection === 5
                    ? 'border-[#0073C1] text-[#0073C1] bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                5. Quản Lý Đào Tạo & Việc Làm
              </button>
              <button
                onClick={() => setActiveLeadSection(6)}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeLeadSection === 6
                    ? 'border-[#0073C1] text-[#0073C1] bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                6. Thanh Toán Học Lại
              </button>
            </div>

            {/* Modal Body - Tab contents */}
            <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {/* SECTION 1: THÔNG TIN CÁ NHÂN */}
              {activeLeadSection === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Mã đăng ký *</label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateCode}
                        className="text-[10px] font-bold text-[#0073C1] hover:underline cursor-pointer bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                        title="Tự động sinh mã chuẩn theo định dạng ngày + chiến dịch"
                      >
                        Tự sinh mã chuẩn
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editedLead.registrationCode || editedLead.orderCode}
                      onChange={(e) => setEditedLead({ ...editedLead, registrationCode: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-[#0073C1]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      value={editedLead.customerName}
                      onChange={(e) => setEditedLead({ ...editedLead, customerName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày sinh (dd/mm/yyyy) *</label>
                    <input
                      type="text"
                      value={editedLead.birthDate || '15/08/2004'}
                      onChange={(e) => setEditedLead({ ...editedLead, birthDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Giới tính</label>
                    <select
                      value={editedLead.gender || 'Nữ'}
                      onChange={(e) => setEditedLead({ ...editedLead, gender: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số điện thoại *</label>
                    <input
                      type="text"
                      value={editedLead.customerPhone || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, customerPhone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email *</label>
                    <input
                      type="text"
                      value={editedLead.customerEmail || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, customerEmail: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Khu vực *</label>
                    <input
                      type="text"
                      value={editedLead.area || 'Hà Nội'}
                      onChange={(e) => setEditedLead({ ...editedLead, area: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Hộ khẩu *</label>
                    <input
                      type="text"
                      value={editedLead.permanentAddress || 'Hà Nội'}
                      onChange={(e) => setEditedLead({ ...editedLead, permanentAddress: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số CCCD *</label>
                    <input
                      type="text"
                      value={editedLead.citizenId || '001205019888'}
                      onChange={(e) => setEditedLead({ ...editedLead, citizenId: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nơi cấp CCCD</label>
                    <input
                      type="text"
                      value={editedLead.issuedPlace || 'Cục Cảnh sát QLHC về TTXH'}
                      onChange={(e) => setEditedLead({ ...editedLead, issuedPlace: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nơi ở hiện tại *</label>
                    <input
                      type="text"
                      value={editedLead.currentResidence || 'Q. Cầu Giấy, Hà Nội'}
                      onChange={(e) => setEditedLead({ ...editedLead, currentResidence: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mã chiến dịch *</label>
                    <input
                      type="text"
                      value={editedLead.campaignCode || 'TW3'}
                      onChange={(e) => setEditedLead({ ...editedLead, campaignCode: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trình độ học vấn</label>
                    <input
                      type="text"
                      value={editedLead.educationLevel || 'Đại học'}
                      onChange={(e) => setEditedLead({ ...editedLead, educationLevel: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngành học</label>
                    <input
                      type="text"
                      value={editedLead.major || 'Tài chính - Ngân hàng'}
                      onChange={(e) => setEditedLead({ ...editedLead, major: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trường học</label>
                    <input
                      type="text"
                      value={editedLead.university || 'Học viện Ngân hàng'}
                      onChange={(e) => setEditedLead({ ...editedLead, university: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tên Người Giới Thiệu (NGT)</label>
                    <input
                      type="text"
                      value={editedLead.referrerName || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, referrerName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                      placeholder="VD: Chị An MSB"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">MNV NGT</label>
                    <input
                      type="text"
                      value={editedLead.referrerStaffCode || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, referrerStaffCode: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                      placeholder="VD: MSB_9824"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Link CV học viên</label>
                    <input
                      type="text"
                      value={editedLead.cvLink || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, cvLink: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: TIẾP CẬN VÀ CHĂM SÓC */}
              {activeLeadSection === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nguồn *</label>
                    <input
                      type="text"
                      value={editedLead.source || 'Website Form'}
                      onChange={(e) => setEditedLead({ ...editedLead, source: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày đăng ký *</label>
                    <input
                      type="text"
                      value={editedLead.registeredAt || editedLead.createdAt}
                      onChange={(e) => setEditedLead({ ...editedLead, registeredAt: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày tiếp cận *</label>
                    <input
                      type="text"
                      value={editedLead.reachedDate || new Date().toLocaleDateString('vi-VN')}
                      onChange={(e) => setEditedLead({ ...editedLead, reachedDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">PIC (Người phụ trách) *</label>
                    <input
                      type="text"
                      value={editedLead.pic || 'HuongNT22'}
                      onChange={(e) => setEditedLead({ ...editedLead, pic: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Hình thức tiếp cận *</label>
                    <select
                      value={editedLead.approachMethod || 'Gọi điện'}
                      onChange={(e) => setEditedLead({ ...editedLead, approachMethod: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Gọi điện">Gọi điện</option>
                      <option value="Zalo">Zalo</option>
                      <option value="Gặp trực tiếp HO MSB">Gặp trực tiếp HO MSB</option>
                      <option value="Bank Tour">Bank Tour</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mức độ quan tâm *</label>
                    <select
                      value={editedLead.interestLevel || 'Rất cao'}
                      onChange={(e) => setEditedLead({ ...editedLead, interestLevel: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Rất cao">Rất cao</option>
                      <option value="Cao">Cao</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Thấp">Thấp</option>
                      <option value="Đang phân vân">Đang phân vân</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trạng thái CRM *</label>
                    <select
                      value={editedLead.crmStatus || '1. Mới'}
                      onChange={(e) => setEditedLead({ ...editedLead, crmStatus: e.target.value as any })}
                      className="w-full p-2 border border-blue-400 bg-blue-50/50 rounded-lg font-bold"
                    >
                      {crmStatusList.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Đợt khai giảng *</label>
                    <input
                      type="text"
                      value={editedLead.batchCohort || 'Khóa học 8'}
                      onChange={(e) => setEditedLead({ ...editedLead, batchCohort: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Chương trình khuyến mại (CTKM)</label>
                    <input
                      type="text"
                      value={editedLead.promotionProgram || 'Cashback 2tr học viên Bank Tour'}
                      onChange={(e) => setEditedLead({ ...editedLead, promotionProgram: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="font-bold text-slate-700 block mb-1">Chi tiết ghi chú tư vấn *</label>
                    <textarea
                      rows={3}
                      value={editedLead.consultDetail || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, consultDetail: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      placeholder="Ghi nhận lịch hẹn, nhu cầu định hướng nghề nghiệp của học viên..."
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: THÔNG TIN THANH TOÁN */}
              {activeLeadSection === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Học phí *</label>
                    <input
                      type="number"
                      value={editedLead.tuitionFee || editedLead.amount}
                      onChange={(e) => setEditedLead({ ...editedLead, tuitionFee: Number(e.target.value), amount: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số tiền phải thu *</label>
                    <input
                      type="number"
                      value={editedLead.totalReceivable || editedLead.amount}
                      onChange={(e) => setEditedLead({ ...editedLead, totalReceivable: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Đã đóng Lần 1 *</label>
                    <input
                      type="number"
                      value={editedLead.paidAmountL1 ?? editedLead.amount}
                      onChange={(e) => setEditedLead({ ...editedLead, paidAmountL1: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono text-emerald-700 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trạng thái TT *</label>
                    <select
                      value={editedLead.paymentStatusDetail || (editedLead.status === 'paid' ? 'Đã đóng phí' : 'Chưa thanh toán')}
                      onChange={(e) => {
                        const val = e.target.value as PaymentStatus;
                        setEditedLead({
                          ...editedLead,
                          paymentStatusDetail: val,
                          status: val === 'Đã đóng phí' ? 'paid' : 'pending'
                        });
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                    >
                      <option value="Chưa thanh toán">Chưa thanh toán</option>
                      <option value="Đã đóng phí">Đã đóng phí</option>
                      <option value="Đã đóng 1 phần">Đã đóng 1 phần</option>
                      <option value="Đã hoàn tiền">Đã hoàn tiền</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phương thức TT *</label>
                    <input
                      type="text"
                      value={editedLead.paymentMethodDetail || 'Chuyển khoản VietQR MB Bank'}
                      onChange={(e) => setEditedLead({ ...editedLead, paymentMethodDetail: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mã giao dịch ngân hàng</label>
                    <input
                      type="text"
                      value={editedLead.transactionCode || 'FT262529881023'}
                      onChange={(e) => setEditedLead({ ...editedLead, transactionCode: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">STK Ngân hàng</label>
                    <input
                      type="text"
                      value={editedLead.bankAccountNumber || '03001010999988'}
                      onChange={(e) => setEditedLead({ ...editedLead, bankAccountNumber: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngân hàng thụ hưởng</label>
                    <input
                      type="text"
                      value={editedLead.bankName || 'MSB'}
                      onChange={(e) => setEditedLead({ ...editedLead, bankName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Hoa hồng cho NGT</label>
                    <input
                      type="number"
                      value={editedLead.referralCommission || 500000}
                      onChange={(e) => setEditedLead({ ...editedLead, referralCommission: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 4: THƯỞNG GIỚI THIỆU */}
              {activeLeadSection === 4 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số tiền thưởng</label>
                    <input
                      type="number"
                      value={editedLead.referralRewardAmount || 500000}
                      onChange={(e) => setEditedLead({ ...editedLead, referralRewardAmount: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tình trạng duyệt</label>
                    <select
                      value={editedLead.referralRewardStatus || 'Chờ duyệt'}
                      onChange={(e) => setEditedLead({ ...editedLead, referralRewardStatus: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Chờ duyệt">Chờ duyệt</option>
                      <option value="Đã chi">Đã chi</option>
                      <option value="Không duyệt">Không duyệt</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">STK Người nhận thưởng</label>
                    <input
                      type="text"
                      value={editedLead.referralRewardBankAcc || '04001010887766 (MSB - Chị An)'}
                      onChange={(e) => setEditedLead({ ...editedLead, referralRewardBankAcc: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày trả thưởng</label>
                    <input
                      type="text"
                      value={editedLead.referralRewardDate || '20/09/2026'}
                      onChange={(e) => setEditedLead({ ...editedLead, referralRewardDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Ghi chú TT thưởng</label>
                    <input
                      type="text"
                      value={editedLead.referralRewardNote || 'Thưởng GTNB sinh viên đợt 8'}
                      onChange={(e) => setEditedLead({ ...editedLead, referralRewardNote: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 5: QUẢN LÝ ĐÀO TẠO & VIỆC LÀM */}
              {activeLeadSection === 5 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tình trạng chương trình</label>
                    <select
                      value={editedLead.trainingStatus || 'Đang học'}
                      onChange={(e) => setEditedLead({ ...editedLead, trainingStatus: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                    >
                      <option value="Đang học">Đang học</option>
                      <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                      <option value="Bảo lưu">Bảo lưu</option>
                      <option value="Thôi học">Thôi học</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mã đối tác (ID MSB)</label>
                    <input
                      type="text"
                      value={editedLead.partnerTraineeId || 'MSB_INTERN_2026_08'}
                      onChange={(e) => setEditedLead({ ...editedLead, partnerTraineeId: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email MSB</label>
                    <input
                      type="text"
                      value={editedLead.partnerEmail || 'linhntk.intern@msb.com.vn'}
                      onChange={(e) => setEditedLead({ ...editedLead, partnerEmail: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Loại chứng nhận</label>
                    <input
                      type="text"
                      value={editedLead.certificateType || 'Chứng nhận Tín dụng Doanh nghiệp'}
                      onChange={(e) => setEditedLead({ ...editedLead, certificateType: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mã số chứng nhận</label>
                    <input
                      type="text"
                      value={editedLead.certificateNumber || 'TW-2026-K8-012'}
                      onChange={(e) => setEditedLead({ ...editedLead, certificateNumber: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ĐV tiếp nhận làm việc</label>
                    <input
                      type="text"
                      value={editedLead.placementCompany || 'Khối KH Doanh nghiệp - MSB Sở Giao Dịch'}
                      onChange={(e) => setEditedLead({ ...editedLead, placementCompany: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tình trạng tiếp nhận CV</label>
                    <select
                      value={editedLead.placementStatus || 'Đã thực tập'}
                      onChange={(e) => setEditedLead({ ...editedLead, placementStatus: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Chờ phỏng vấn">Chờ phỏng vấn</option>
                      <option value="Đã thực tập">Đã thực tập</option>
                      <option value="Đã ký HĐLĐ">Đã ký HĐLĐ</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày vào làm việc</label>
                    <input
                      type="text"
                      value={editedLead.workStartDate || '01/11/2026'}
                      onChange={(e) => setEditedLead({ ...editedLead, workStartDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày bắt đầu bảo lãnh</label>
                    <input
                      type="text"
                      value={editedLead.guaranteeStartDate || '01/11/2026'}
                      onChange={(e) => setEditedLead({ ...editedLead, guaranteeStartDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 6: THANH TOÁN HỌC LẠI */}
              {activeLeadSection === 6 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số môn Thi lại</label>
                    <input
                      type="number"
                      value={editedLead.reExamCount || 0}
                      onChange={(e) => setEditedLead({ ...editedLead, reExamCount: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số môn Học lại</label>
                    <input
                      type="number"
                      value={editedLead.retakeCount || 0}
                      onChange={(e) => setEditedLead({ ...editedLead, retakeCount: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Học lại thực địa</label>
                    <input
                      type="text"
                      value={editedLead.fieldStudyRetake || 'Không'}
                      onChange={(e) => setEditedLead({ ...editedLead, fieldStudyRetake: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số tiền HL/TL (VND)</label>
                    <input
                      type="number"
                      value={editedLead.retakeAmount || 0}
                      onChange={(e) => setEditedLead({ ...editedLead, retakeAmount: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tình trạng đóng</label>
                    <input
                      type="text"
                      value={editedLead.retakePaymentStatus || 'Không có'}
                      onChange={(e) => setEditedLead({ ...editedLead, retakePaymentStatus: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ghi chú TTHL</label>
                    <input
                      type="text"
                      value={editedLead.retakeNote || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, retakeNote: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                      placeholder="Ghi chú chi tiết..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {saveToast ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã lưu thành công hồ sơ CRM!</span>
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  Dữ liệu được đồng bộ trực tiếp vào hệ thống quản lý học viên.
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={handleSaveLead}
                  className="px-5 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
