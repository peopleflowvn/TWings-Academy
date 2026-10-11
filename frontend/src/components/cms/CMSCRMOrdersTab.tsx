import React, { useEffect, useRef, useState } from 'react';
import { AdmissionCampaign, Course, Order } from '../../types';
import { CompAILeadDetailModal } from './CompAILeadDetailModal';
import { CMSCampaignManagementModal } from './CMSCampaignManagementModal';
import { RecruitmentCampaignsView } from './RecruitmentCampaignsView';
import { LeadPipelineView, PipelineScope } from './LeadPipelineView';
import { useServerCollection } from '../../lib/serverCollection';
import { CAMPAIGNS } from '../../lib/cmsCollections';
import { getSavedCampaigns } from '../../utils/talentCampaigns';
import { confirmOrderPayment, loadOrder, saveOrderChanges } from '../../admin/data';

/**
 * Sales / admissions (/app/sales/crm):
 *   ?view=campaigns                       the admission campaigns (targets and funnel per campaign)
 *   ?view=kanban&campaignId=<id|all|none> the lead pipeline (kanban or detailed table) of one campaign,
 *                                         of every lead, or of the leads not attached to a campaign
 *   ?action=new_requisition               open a new campaign (campaign settings, "new" form)
 *   &orderId=<id>                         the lead workspace of one lead
 * Leads are filtered and counted on the server; intakes (classes, schedule, Moodle course) are managed
 * in /app/sales/intakes only.
 */
interface CMSCRMOrdersTabProps {
  courses?: Course[];
}

type View = 'campaigns' | 'kanban';

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get('campaignId');
  const creating = params.get('action') === 'new_requisition' || window.location.pathname.includes('/requisitions/new');
  const view: View = params.get('view') === 'kanban' || (campaignId && params.get('view') !== 'campaigns') ? 'kanban' : 'campaigns';
  return { view, scope: (campaignId || 'all') as PipelineScope, creating };
}

export const CMSCRMOrdersTab: React.FC<CMSCRMOrdersTabProps> = ({ courses = [] }) => {
  const { items: campaigns, update: setCampaigns, loaded } = useServerCollection<AdmissionCampaign>(CAMPAIGNS, getSavedCampaigns());
  const initial = readUrl();
  const [view, setView] = useState<View>(initial.view);
  const [scope, setScope] = useState<PipelineScope>(initial.scope);
  const [campaignModal, setCampaignModal] = useState<'closed' | 'edit' | 'create'>(initial.creating ? 'create' : 'closed');
  const [selectedLead, setSelectedLead] = useState<Order | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const scopeCode = useRef('');

  // A lead opens with its full record from the server (the pipeline holds a summary of each lead).
  const openLead = (lead: Pick<Order, 'id'>) => {
    loadOrder(lead.id)
      .then(setSelectedLead)
      .catch((err: Error) => window.alert(`Không mở được hồ sơ: ${err.message}`));
  };

  // Keep the URL in step with the screen (shareable links, browser history).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    if (view === 'kanban') params.set('campaignId', scope);
    else params.delete('campaignId');
    if (campaignModal === 'create') params.set('action', 'new_requisition');
    else params.delete('action');
    params.delete('templateCourseId');
    if (selectedLead) params.set('orderId', selectedLead.id);
    else params.delete('orderId');
    const path = window.location.pathname.includes('/requisitions') ? '/app/sales/crm' : window.location.pathname;
    const next = `${path}?${params.toString()}`;
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, '', next);
  }, [view, scope, campaignModal, selectedLead]);

  useEffect(() => {
    const sync = () => {
      const url = readUrl();
      setView(url.view);
      setScope(url.scope);
      if (url.creating) setCampaignModal('create');
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('twings:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('twings:navigate', sync);
    };
  }, []);

  // Deep link ?orderId=: open that lead, as stored on the server (nothing is added to it).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('orderId');
    if (id) openLead({ id });
  }, []);

  // A campaign created a moment ago gets its server id on save: follow it by its code.
  useEffect(() => {
    if (!loaded || scope === 'all' || scope === 'none' || campaigns.some((c) => c.id === scope)) return;
    const match = scopeCode.current ? campaigns.find((c) => c.code === scopeCode.current) : undefined;
    if (match) setScope(match.id);
  }, [campaigns, loaded, scope]);

  const openPipeline = (next: PipelineScope) => {
    scopeCode.current = campaigns.find((c) => c.id === next)?.code || '';
    setScope(next);
    setView('kanban');
  };
  const activeCampaign = campaigns.find((c) => c.id === scope);

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
          courses={courses}
          onSelectCampaign={openPipeline}
          onOpenCreateRequisition={() => setCampaignModal('create')}
        />
      ) : (
        <LeadPipelineView
          scope={scope}
          campaigns={campaigns}
          courses={courses}
          refreshKey={refreshKey}
          onChangeScope={openPipeline}
          onBack={() => setView('campaigns')}
          onOpenLeadDetail={openLead}
          onOpenEditCampaign={() => setCampaignModal('edit')}
        />
      )}

      {selectedLead && (
        <CompAILeadDetailModal
          key={selectedLead.id}
          order={selectedLead}
          onClose={() => setSelectedLead(null)}
          onOpenOrder={(id) => openLead({ id })}
          onSave={async (previous, updated) => {
            const fresh = await saveOrderChanges(previous, updated);
            setRefreshKey((k) => k + 1);
            return fresh;
          }}
          onConfirmPayment={async (amount) => {
            const fresh = await confirmOrderPayment(selectedLead.id, amount);
            setRefreshKey((k) => k + 1);
            return fresh;
          }}
        />
      )}

      <CMSCampaignManagementModal
        isOpen={campaignModal !== 'closed'}
        startCreating={campaignModal === 'create'}
        focusCampaignId={activeCampaign?.id}
        onClose={() => setCampaignModal('closed')}
        campaigns={campaigns}
        onUpdateCampaigns={setCampaigns}
        courses={courses}
        onSelectCampaign={(id) => {
          openPipeline(id);
          setCampaignModal('closed');
        }}
      />
    </div>
  );
};
