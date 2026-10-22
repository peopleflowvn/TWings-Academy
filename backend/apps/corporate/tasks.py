"""
E-mail sending of corporate classes, queued for the worker (django.tasks): a class of 100 learners
must not hold a web request for minutes. Both are safe to run twice (rows are locked per e-mail).
"""

from django.tasks import task


def _user(user_id):
    from apps.accounts.models import User

    return User.objects.filter(pk=user_id).first() if user_id else None


@task
def send_invitations(class_id: str, user_id: str | None, only_new: bool = True) -> dict:
    from .communications import send_invitations as send
    from .models import CorporateClass

    corporate_class = CorporateClass.objects.select_related("cohort__course", "client").get(pk=class_id)
    return send(corporate_class, sent_by=_user(user_id), only_new=only_new)


@task
def send_batch(batch_id: str, user_id: str | None) -> dict:
    from .communications import send_batch as send
    from .models import CommunicationBatch

    return send(CommunicationBatch.objects.select_related("snapshot").get(pk=batch_id), user=_user(user_id))
