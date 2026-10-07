import React from 'react';
import { BarChart3, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { AdminUser } from '../../types';
import { navigate, linkProps } from '../router';
import { DashboardPage } from './DashboardPage';
import { ReportsPage } from './ReportsPage';

interface OverviewReportsPageProps {
  user: AdminUser;
  currentPath: string;
  canViewReports: boolean;
}

/**
 * Unified Overview & Reports page (/app and /app/reports).
 * Merges real-time operations dashboard and analytical BI reports with dedicated deep links for both views.
 */
export const OverviewReportsPage: React.FC<OverviewReportsPageProps> = ({
  user,
  currentPath,
  canViewReports
}) => {
  const isReports = currentPath === '/reports';

  return (
    <div className="space-y-6">
      {/* Sub-navigation tab bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="inline-flex p-1 bg-slate-100/90 rounded-xl gap-1">
          <a
            {...linkProps('/')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              !isReports
                ? 'bg-white text-[#0073C1] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Vận hành hôm nay</span>
          </a>
          {canViewReports ? (
            <a
              {...linkProps('/reports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                isReports
                  ? 'bg-white text-[#0073C1] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Báo cáo & Phân tích xu hướng</span>
            </a>
          ) : (
            <div
              title="Cần quyền tài chính, CRM hoặc LMS để xem báo cáo"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs text-slate-400 cursor-not-allowed opacity-60"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Báo cáo (chưa phân quyền)</span>
            </div>
          )}
        </div>

        <div className="text-[11px] font-medium text-slate-500 px-2 sm:px-0">
          {!isReports ? (
            <span>Tổng quan thời gian thực: KPI, phễu tuyển sinh, cảnh báo & việc cần làm</span>
          ) : (
            <span>Báo cáo hiệu quả: Doanh thu theo tháng, chuyển đổi, nguồn lead & LMS</span>
          )}
        </div>
      </div>

      {/* View content based on active route */}
      {isReports ? (
        canViewReports ? (
          <ReportsPage />
        ) : (
          <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-sm text-amber-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-1">Giới hạn quyền truy cập Báo cáo</div>
              <p className="text-xs text-amber-800">
                Tài khoản của bạn chưa được cấp quyền xem dữ liệu báo cáo phân tích (Tài chính, CRM hoặc LMS). 
                Vui lòng quay lại{' '}
                <a {...linkProps('/')} className="font-bold underline text-[#0073C1]">
                  trang Vận hành hôm nay
                </a>{' '}
                hoặc liên hệ Quản trị viên để được cấp quyền.
              </p>
            </div>
          </div>
        )
      ) : (
        <DashboardPage user={user} />
      )}
    </div>
  );
};
