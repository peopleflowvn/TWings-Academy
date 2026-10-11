import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Bot, Building2, CreditCard, User } from 'lucide-react';
import { AdmissionCampaign, Course, Order } from '../../types';
import { CompAILeadDetailModal } from './CompAILeadDetailModal';
import { CMSCampaignManagementModal } from './CMSCampaignManagementModal';
import { RecruitmentCampaignsView } from './RecruitmentCampaignsView';
import { AdmissionRequisitionPage } from './AdmissionRequisitionPage';
import { LeadPipelineView, PipelineScope } from './LeadPipelineView';
import { useServerCollection } from '../../lib/serverCollection';
import { CAMPAIGNS } from '../../lib/cmsCollections';
import { getSavedCampaigns } from '../../utils/talentCampaigns';

/**
 * Sales / admissions (/app/sales/crm):
 *   ?view=campaigns                       the admission campaigns (targets and funnel per campaign)
 *   ?view=kanban&campaignId=<id|all|none> the lead pipeline (kanban or detailed table) of one campaign,
 *                                         of every lead, or of the leads not attached to a campaign
 *   ?action=new_requisition               open a new campaign
 * Intakes (classes, schedule, Moodle course) are managed in /app/sales/intakes only.
 */
interface CMSCRMOrdersTabProps {
  orders: Order[];
  courses?: Course[];
  onUpdateOrderCRM?: (updatedOrder: Order) => void;
  /** The full order (the list leaves out identity documents and bank accounts). */
  onLoadOrder: (orderId: string) => Promise<Order>;
  /** Finance: record a received amount; resolves to the order as now stored. */
  onConfirmPayment: (orderId: string, amount: number) => Promise<Order | null>;
}

// Course categories definition with distinctive color coding and icons
export const CRM_COURSE_CATEGORIES = [
  {
    id: 'all',
    title: 'Tất Cả Khóa Học',
    shortName: 'Tất cả',
    icon: BookOpen,
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    accentColor: 'text-[#0073C1]',
    description: 'Toàn bộ chương trình đào tạo của TWings Academy & MSB'
  },
  {
    id: 'twings-qhkh-doanh-nghiep',
    title: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    shortName: 'RM Doanh Nghiệp (CIB)',
    icon: Building2,
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: 'text-blue-600',
    description: 'Đào tạo kỹ năng thẩm định tài chính, bán hàng B2B và quản trị danh mục SME/CIB'
  },
  {
    id: 'twings-qhkh-ca-nhan',
    title: 'Quan hệ Khách hàng cá nhân',
    shortName: 'RM Cá Nhân (RB)',
    icon: User,
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentColor: 'text-indigo-600',
    description: 'Tư vấn tín dụng tiêu dùng, thẻ tín dụng, huy động vốn & bảo hiểm bancassurance'
  },
  {
    id: 'gdv-ngan-hang',
    title: 'Giao dịch viên & Vận hành Dịch vụ Khách hàng',
    shortName: 'Giao Dịch Viên (GDV)',
    icon: CreditCard,
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentColor: 'text-emerald-600',
    description: 'Nghiệp vụ quầy, kiểm soát thanh toán quốc tế và dịch vụ khách hàng xuất sắc'
  },
  {
    id: 'deeplearning-ai-agents',
    title: 'Xây dựng các Đại lý AI & Quy trình Làm việc Tự động',
    shortName: 'AI Agents & Automation',
    icon: Bot,
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    accentColor: 'text-purple-600',
    description: 'Ứng dụng AI tạo sinh, tự động hóa quy trình nghiệp vụ và chấm điểm tín dụng'
  }
];

type View = 'campaigns' | 'kanban';

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get('campaignId');
  const creating = params.get('action') === 'new_requisition' || window.location.pathname.includes('/requisitions/new');
  const view: View = params.get('view') === 'kanban' || (campaignId && params.get('view') !== 'campaigns') ? 'kanban' : 'campaigns';
  return { view, scope: (campaignId || 'all') as PipelineScope, creating, templateCourseId: params.get('templateCourseId') || '' };
}

export const CMSCRMOrdersTab: React.FC<CMSCRMOrdersTabProps> = ({
  orders,
  courses = [],
  onUpdateOrderCRM,
  onLoadOrder,
  onConfirmPayment
}) => {
  const { items: campaigns, update: setCampaigns } = useServerCollection<AdmissionCampaign>(CAMPAIGNS, getSavedCampaigns());
  const initial = readUrl();
  const [view, setView] = useState<View>(initial.view);
  const [scope, setScope] = useState<PipelineScope>(initial.scope);
  const [creating, setCreating] = useState(initial.creating);
  const [templateCourseId, setTemplateCourseId] = useState(initial.templateCourseId);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Order | null>(null);

  // A lead opens with its full record from the server (the list holds a summary of each lead).
  const openLead = (lead: Order) => {
    onLoadOrder(lead.id)
      .then(setSelectedLead)
      .catch((err: Error) => window.alert(`Không mở được hồ sơ: ${err.message}`));
  };

  // Keep the URL in step with the screen (shareable links, browser history).
  useEffect(() => {
    if (window.location.pathname.includes('/requisitions/new')) return;
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    if (view === 'kanban') params.set('campaignId', scope);
    else params.delete('campaignId');
    if (creating) params.set('action', 'new_requisition');
    else {
      params.delete('action');
      params.delete('templateCourseId');
    }
    const next = `${window.location.pathname}?${params.toString()}`;
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, '', next);
  }, [view, scope, creating]);

  useEffect(() => {
    const sync = () => {
      const url = readUrl();
      setView(url.view);
      setScope(url.scope);
      setCreating(url.creating);
      setTemplateCourseId(url.templateCourseId);
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('twings:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('twings:navigate', sync);
    };
  }, []);

  // Deep link ?orderId=: open that lead once, as stored on the server (nothing is added to it).
  const deepLinked = useRef(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('orderId');
    if (id && !selectedLead && !deepLinked.current) {
      const match = orders.find((o) => o.id === id || o.orderCode === id);
      if (match) {
        deepLinked.current = true;
        openLead(match);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedLead) params.set('orderId', selectedLead.id);
    else params.delete('orderId');
    const next = `${window.location.pathname}?${params.toString()}`;
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, '', next);
  }, [selectedLead]);

  const openPipeline = (next: PipelineScope) => {
    setScope(next);
    setView('kanban');
  };
  const updateCampaigns = (updated: AdmissionCampaign[]) => {
    setCampaigns(updated);
  };
  const activeCampaign = campaigns.find((c) => c.id === scope);

  if (creating) {
    return (
      <AdmissionRequisitionPage
        courses={courses}
        initialTemplateCourseId={templateCourseId}
        onSaveCampaign={(campaign) => {
          updateCampaigns([campaign, ...campaigns.filter((c) => c.id !== campaign.id)]);
          setCreating(false);
          openPipeline(campaign.id);
        }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {view === 'campaigns' && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={() => openPipeline('all')} className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">
            Pipeline tất cả lead
          </button>
          <button type="button" onClick={() => openPipeline('none')} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold cursor-pointer">
            Lead chưa gắn chiến dịch
          </button>
        </div>
      )}
      {view === 'campaigns' ? (
        <RecruitmentCampaignsView
          campaigns={campaigns}
          orders={orders}
          courses={courses}
          onSelectCampaign={openPipeline}
          onOpenCreateRequisition={() => {
            setTemplateCourseId('');
            setCreating(true);
          }}
          onEditCampaign={() => setShowCampaignModal(true)}
        />
      ) : (
        <LeadPipelineView
          scope={scope}
          campaigns={campaigns}
          orders={orders}
          onChangeScope={setScope}
          onBack={() => setView('campaigns')}
          onUpdateOrderCRM={onUpdateOrderCRM}
          onOpenLeadDetail={openLead}
          onOpenEditCampaign={() => setShowCampaignModal(true)}
        />
      )}

      {selectedLead && (
        <CompAILeadDetailModal
          order={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSave={(updated) => {
            if (onUpdateOrderCRM) onUpdateOrderCRM(updated);
            setSelectedLead(null);
          }}
          onConfirmPayment={(amount) => onConfirmPayment(selectedLead.id, amount)}
        />
      )}

      <CMSCampaignManagementModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        campaigns={activeCampaign ? [activeCampaign, ...campaigns.filter((c) => c.id !== activeCampaign.id)] : campaigns}
        onUpdateCampaigns={updateCampaigns}
        orders={orders}
        courses={courses}
        onSelectCampaign={(id) => {
          openPipeline(id);
          setShowCampaignModal(false);
        }}
      />
    </div>
  );
};
