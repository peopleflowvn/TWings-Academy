/**
 * Tuyển sinh (/app/sales/crm). One class = one admission campaign:
 *   ?view=campaigns                       the classes (seats = quota, web page, code, lead funnel)
 *   ?view=kanban&campaignId=<id|all|none> the lead pipeline (kanban or table) of one class, of every
 *                                         lead, or of the leads not in a class yet
 *   ?action=new_campaign[&courseId=]      the new-class form (from a course page)
 *   &orderId=<id>                         one registration in the lead workspace
 * Leads are filtered and counted on the server; learners (one per person) are in /app/sales/learners.
 */
import React, { useEffect, useState } from 'react';
import { Course, Order } from '../../types';
import { LeadWorkspace } from '../../components/cms/LeadWorkspace';
import { LeadPipelineView, PipelineScope } from '../../components/cms/LeadPipelineView';
import { confirmOrderPayment, loadOrder, saveOrderChanges, usePrograms } from '../data';
import { ClassesView, Draft, useClasses } from './IntakesPage';

type View = 'campaigns' | 'kanban';

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get('campaignId');
  const view: View = params.get('view') === 'kanban' || (campaignId && params.get('view') !== 'campaigns') ? 'kanban' : 'campaigns';
  return {
    view,
    scope: (campaignId || 'all') as PipelineScope,
    creating: params.get('action') === 'new_campaign',
    courseId: params.get('courseId') || '' // "new class for this course" from the course page
  };
}

export const AdmissionsPage: React.FC<{ courses: Course[] }> = ({ courses }) => {
  const classes = useClasses();
  const programs = usePrograms();
  // Read once: the URL is rewritten as the screen changes (the new-class link waits for the course list).
  const [initial] = useState(readUrl);
  const [view, setView] = useState<View>(initial.view);
  const [scope, setScope] = useState<PipelineScope>(initial.scope);
  const [editing, setEditing] = useState<Draft | null>(
    initial.creating && courses.length
      ? { courseId: initial.courseId || courses[0].id, status: 'upcoming', capacity: 25, autoRolloverWaitlist: true, showQuota: true }
      : null
  );
  const [selectedLead, setSelectedLead] = useState<Order | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // The course list may arrive after the page: open the new-class form then.
  useEffect(() => {
    if (initial.creating && !editing && courses.length) {
      setEditing({ courseId: initial.courseId || courses[0].id, status: 'upcoming', capacity: 25, autoRolloverWaitlist: true, showQuota: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses.length]);

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
    if (editing && !editing.id) params.set('action', 'new_campaign');
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

  const openPipeline = (next: PipelineScope) => {
    setScope(next);
    setView('kanban');
  };
  const current = (classes.rows || []).find((c) => c.id === scope) || null;

  if (classes.error) return <p className="text-sm text-red-600">{classes.error}</p>;

  return (
    <div className="space-y-6 pb-12">
      {view === 'campaigns' ? (
        classes.rows ? (
          <ClassesView
            rows={classes.rows}
            courses={courses}
            onReload={classes.reload}
            onOpenPipeline={openPipeline}
            editing={editing}
            onEdit={setEditing}
          />
        ) : (
          <p className="text-sm text-slate-500">Đang tải…</p>
        )
      ) : (
        <LeadPipelineView
          scope={scope}
          classes={classes.rows || []}
          courses={courses}
          programs={programs}
          refreshKey={refreshKey}
          onChangeScope={openPipeline}
          onBack={() => {
            classes.reload();
            setView('campaigns');
          }}
          onOpenLeadDetail={openLead}
          onOpenEditClass={() => {
            if (!current) return;
            setEditing({ ...current });
            setView('campaigns');
          }}
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
    </div>
  );
};
