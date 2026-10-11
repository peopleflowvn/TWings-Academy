"""
Group the existing registrations into learners (one per person) and re-check duplicate flags.

Registrations are taken oldest first; one joins the learner already seen with the same e-mail, else
phone, else CCCD. The learner keeps the newest non-empty value of each detail (the latest form the
person filled), and the consultant of the newest registration. Program courses follow their program
registration. A registration stays flagged as a duplicate only when the same learner registered for
the same course / program earlier and that registration is still active.
"""

from django.db import migrations

from apps.core.crypto import blind_index
from apps.crm.learners import PERSON_FIELDS, phone_key
from apps.crm.models import new_learner_code


def forwards(apps, schema_editor):
    Order = apps.get_model("crm", "Order")
    Learner = apps.get_model("crm", "Learner")
    by_email, by_phone, by_cid = {}, {}, {}

    for order in Order.objects.filter(parent__isnull=True, learner__isnull=True).order_by("created_at").iterator():
        email = (order.customer_email or "").strip().lower()
        phone = phone_key(order.customer_phone)
        cid = order.citizen_id_index
        learner_id = (email and by_email.get(email)) or (phone and by_phone.get(phone)) or (cid and by_cid.get(cid))
        values = {lf: getattr(order, of) for lf, of in PERSON_FIELDS.items()}
        if learner_id:
            learner = Learner.objects.get(pk=learner_id)
            for field, value in values.items():
                if value:
                    setattr(learner, field, value)
            if order.assigned_to_id:
                learner.owner_id = order.assigned_to_id
        else:
            learner = Learner(code=new_learner_code(), owner_id=order.assigned_to_id, **values)
            if not learner.full_name:
                learner.full_name = order.customer_name or order.order_code
        learner.citizen_id_index = blind_index(learner.citizen_id or "")
        learner.phone_index = phone_key(learner.phone)
        learner.save()
        for key, index in ((email, by_email), (phone, by_phone), (cid, by_cid)):
            if key:
                index[key] = learner.pk
        Order.objects.filter(pk=order.pk).update(learner_id=learner.pk)

    for component in Order.objects.filter(parent__isnull=False, learner__isnull=True).select_related("parent"):
        Order.objects.filter(pk=component.pk).update(learner_id=component.parent.learner_id)

    active = {"cancelled", "refunded"}
    for order in Order.objects.filter(parent__isnull=True, is_duplicate=True):
        earlier = Order.objects.filter(
            learner_id=order.learner_id, parent__isnull=True, created_at__lt=order.created_at
        ).exclude(status__in=active).exclude(crm_status="7. Đã hủy")
        if order.course_id:
            earlier = earlier.filter(course_id=order.course_id)
        elif order.program_id:
            earlier = earlier.filter(program_id=order.program_id)
        else:
            earlier = earlier.none()
        codes = list(earlier.values_list("order_code", flat=True)[:5])
        if codes:
            note = f"Học viên đã có đăng ký đang mở cho khóa này: {', '.join(codes)}"[:300]
            Order.objects.filter(pk=order.pk).update(duplicate_note=note)
        else:
            Order.objects.filter(pk=order.pk).update(is_duplicate=False, duplicate_note="")


class Migration(migrations.Migration):
    dependencies = [("crm", "0006_learners")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
