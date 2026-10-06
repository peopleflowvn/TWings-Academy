from django.core.management.base import BaseCommand

from apps.payments.reminders import remind_due_installments


class Command(BaseCommand):
    help = "E-mail learners whose installment is due within 3 days or overdue; flag overdue ones for staff."

    def handle(self, *args, **options):
        self.stdout.write(f"{remind_due_installments()}")
