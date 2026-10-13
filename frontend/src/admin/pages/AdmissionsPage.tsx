/**
 * Tuyển sinh (/app/sales/crm):
 *   ?view=campaigns                       admission campaigns (quotas and leads per stage)
 *   ?view=kanban&campaignId=<id|all|none> the lead pipeline (kanban or table) of one campaign, of every
 *                                         lead, or of the leads not attached to a campaign
 *   ?action=new_campaign                  the new-campaign form
 *   &orderId=<id>                         one registration in the lead workspace
 * Leads are filtered and counted on the server; intakes (classes, schedule, Moodle course) are managed in
 * /app/sales/intakes, learners (one per person) in /app/sales/learners.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AdmissionCampaign, Course, Order } from '../../types';
import { LeadWorkspace } from '../../components/cms/LeadWorkspace';
import { CampaignEditor } from '../../components/cms/CampaignEditor';
import { CampaignListView } from '../../components/cms/CampaignListView';
import { LeadPipelineView, PipelineScope } from '../../components/cms/LeadPipelineView';
import { useServerCollection } from '../../lib/serverCollection';
import { CAMPAIGNS } from '../../lib/cmsCollections';
import { confirmOrderPayment, loadOrder, saveOrderChanges, usePrograms } from '../data';

type View = 'campaigns' | 'kanban';
/** The campaign form: closed, a new campaign, or the campaign with this id. */
type Editing = null | 'new' | string;

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get('campaignId');
  const view: View = params.get('view') === 'kanban' || (campaignId && params.get('view') !== 'campaigns') ? 'kanban' : 'campaigns';
  return {
    view,
    scope: (campaignId || 'all') as PipelineScope,
    creating: params.get('action') === 'new_campaign',
    courseId: params.get('courseId') || '' // "new campaign for this course" from the course page
  };
}

export const AdmissionsPage: React.FC<{ courses: Course[] }> = ({ courses }) => {
  const { items: campaigns, update: setCampaigns, loaded } = useServerCollection<AdmissionCampaign>(CAMPAIGNS, []);
  const programs = usePrograms();
  const initial = readUrl();
  const [view, setView] = useState<View>(initial.view);
  const [scope, setScope] = useState<PipelineScope>(initial.scope);
  const [editing, setEditing] = useState<Editing>(initial.creating ? 'new' : null);
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
    if (editing === 'new') params.set('action', 'new_campaign');
    else {
      params.delete('action');
      params.delete('courseId');
    }
    if (selectedLead) params.set('orderId', selectedLead.id);
    else params.delete('orderId');
    const next = `${window.location.pathname}?${params.toString()}`;
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, '', next);
  }, [view, scope, editing, selectedLead]);

  useEffect(() => {
    const sync = () => {
      const url = readUrl();
      setView(url.view);
      setScope(url.scope);
      if (url.creating) setEditing('new');
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('twings:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('twings:navigate', sync);
    };
  }, []);

  // Deep link ?orderId=: open that registration, as stored on the server.
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
  const editedCampaign = editing && editing !== 'new' ? campaigns.find((c) => c.id === editing) || null : null;

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
        <CampaignListView
          campaigns={campaigns}
          courses={courses}
          onSelectCampaign={openPipeline}
          onCreateCampaign={() => setEditing('new')}
          onEditCampaign={(id) => setEditing(id)}
        />
      ) : (
        <LeadPipelineView
          scope={scope}
          campaigns={campaigns}
          courses={courses}
          programs={programs}
          refreshKey={refreshKey}
          onChangeScope={openPipeline}
          onBack={() => setView('campaigns')}
          onOpenLeadDetail={openLead}
          onOpenEditCampaign={() => setEditing(scope)}
        />
      )}

      {selectedLead && (
        <LeadWorkspace
          key={selectedLead.id}
          order={selectedLead}
          onClose={() => setSelectedLead(null)}
          onOpenOrder={(id) => openLead({ id })}
          courses={courses}
          programs={programs}
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

      {editing && (editing === 'new' || editedCampaign) && (
        <CampaignEditor
          key={editing}
          campaign={editedCampaign}
          initialCourseId={editing === 'new' ? initial.courseId : ''}
          campaigns={campaigns}
          courses={courses}
          onClose={() => setEditing(null)}
          onOpenPipeline={(id) => {
            setEditing(null);
            openPipeline(id);
          }}
          onSave={(list, saved) => {
            setCampaigns(list);
            setEditing(null);
            if (editing === 'new') {
              scopeCode.current = saved.code;
              setScope(saved.id);
              setView('kanban');
            } else if (!list.some((c) => c.id === saved.id) && scope === saved.id) {
              setScope('all'); // the campaign in view was deleted
            }
          }}
        />
      )}
    </div>
  );
};
