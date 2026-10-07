from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import BaseModel


class Partner(BaseModel):
    name = models.CharField(max_length=200)
    type = models.CharField(
        max_length=20, choices=[("university", "Trường"), ("company", "Doanh nghiệp")], blank=True
    )
    logo_text = models.CharField(max_length=50, blank=True)
    logo_color = models.CharField(max_length=50, blank=True)
    logo_url = models.CharField(max_length=500, blank=True)
    badge_icon = models.CharField(max_length=50, blank=True)
    slogan = models.CharField(max_length=300, blank=True)
    theme_color = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    tag = models.CharField(max_length=100, blank=True)
    website_url = models.URLField(max_length=500, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Instructor(BaseModel):
    STATUS_CHOICES = [("active", "Đang dạy"), ("on_leave", "Tạm nghỉ"), ("adjunct", "Thỉnh giảng")]

    name = models.CharField(max_length=200)
    title = models.CharField(max_length=300)
    organization = models.CharField(max_length=200, blank=True)
    avatar = models.CharField(max_length=500, blank=True)
    bio = models.TextField(blank=True)
    credential = models.CharField(max_length=300, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    students_count = models.PositiveIntegerField(default=0)
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)
    bank_position = models.CharField(max_length=200, blank=True)
    linkedin_url = models.URLField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    # Internal contact details: never exposed by public endpoints.
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class InstallmentPlan(models.Model):
    """
    Optional pay-in-installments plan offered at checkout: the price split into `installment_count`
    payments `installment_interval_days` apart (the first is due at once and opens the learning).
    """

    installment_count = models.PositiveSmallIntegerField(
        default=1, validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    installment_interval_days = models.PositiveSmallIntegerField(
        default=30, validators=[MinValueValidator(7), MaxValueValidator(180)]
    )

    class Meta:
        abstract = True


class Course(InstallmentPlan, BaseModel):
    DELIVERY_CHOICES = [
        ("offline", "Trực tiếp"),
        ("hybrid", "Kết hợp"),
        ("online_external_lms", "Online qua LMS"),
    ]

    slug = models.SlugField(max_length=200, unique=True)
    title = models.CharField(max_length=300)
    subtitle = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    overview = models.TextField(blank=True)
    partner = models.ForeignKey(
        Partner, null=True, blank=True, on_delete=models.SET_NULL, related_name="courses"
    )
    instructors = models.ManyToManyField(Instructor, blank=True, related_name="courses")
    type = models.CharField(max_length=100, blank=True)
    level = models.CharField(max_length=100, blank=True)
    delivery_format = models.CharField(max_length=32, choices=DELIVERY_CHOICES, blank=True)
    location_text = models.CharField(max_length=300, blank=True)
    category = models.CharField(max_length=100, blank=True)
    career_role = models.CharField(max_length=200, blank=True)
    badge_section = models.CharField(max_length=50, blank=True)
    badge_type = models.CharField(max_length=50, blank=True)
    thumbnail = models.CharField(max_length=500, blank=True)
    duration = models.CharField(max_length=100, blank=True)
    rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    reviews_count = models.PositiveIntegerField(default=0)
    enrolled_count = models.CharField(max_length=50, blank=True)
    lessons_count = models.PositiveIntegerField(default=0)
    students_count = models.PositiveIntegerField(default=0)

    # Prices in VND. The checkout always reads these server-side; the client never supplies amounts.
    price = models.PositiveBigIntegerField(default=0)
    original_price = models.PositiveBigIntegerField(default=0)
    is_free_enrollment_available = models.BooleanField(default=False)
    # Step 8 – certificate only with at least this attendance (% of sessions taken) when the intake
    # takes attendance; 0 = no attendance requirement.
    min_attendance_rate = models.PositiveSmallIntegerField(default=80, validators=[MaxValueValidator(100)])

    youtube_trial_url = models.URLField(max_length=500, blank=True)
    youtube_video_id = models.CharField(max_length=32, blank=True)

    skills = models.JSONField(default=list, blank=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    objectives = models.JSONField(default=list, blank=True)
    target_audience = models.JSONField(default=list, blank=True)
    requirements = models.JSONField(default=list, blank=True)
    guarantees = models.JSONField(default=list, blank=True)
    # Module[] tree (modules → lessons → quizzes/flashcards). Public API strips non-preview lessons.
    syllabus = models.JSONField(default=list, blank=True)
    reviews = models.JSONField(default=list, blank=True)

    # Lifecycle: draft -> review -> published (on sale) -> archived. Only "published" is public; the
    # price is approved by whoever publishes (courses.publish), later changes need courses.pricing.
    STATUS_CHOICES = [
        ("draft", "Nháp"),
        ("review", "Chờ duyệt"),
        ("published", "Đang bán"),
        ("archived", "Ngừng bán"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    review_note = models.TextField(blank=True)  # the reviewer's feedback when sending back to draft
    published_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=False)  # kept in step with status (public filters)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        self.is_published = self.status == "published"
        if "update_fields" in kwargs and kwargs["update_fields"] is not None:
            kwargs["update_fields"] = {*kwargs["update_fields"], "is_published"}
        super().save(*args, **kwargs)


class Cohort(BaseModel):
    STATUS_CHOICES = [
        ("opening", "Đang tuyển sinh"),
        ("full", "Đã đủ sĩ số"),
        ("closed", "Đã đóng tuyển sinh"),
        ("in_progress", "Đang học"),
        ("completed", "Đã kết thúc"),
        ("upcoming", "Sắp mở"),
    ]

    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="cohorts")
    name = models.CharField(max_length=200)
    start_date = models.DateField(null=True, blank=True)
    registration_deadline = models.DateField(null=True, blank=True)
    capacity = models.PositiveIntegerField(default=25)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="upcoming")
    next_cohort = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    auto_rollover_waitlist = models.BooleanField(default=True)
    lead_instructor = models.ForeignKey(Instructor, null=True, blank=True, on_delete=models.SET_NULL)
    location = models.CharField(max_length=300, blank=True)
    notes = models.TextField(blank=True)
    # Shown to visitors, e.g. "Tối thứ 2-4-6, 19:00–21:00" (filled by the session generator in /app).
    schedule_text = models.CharField(max_length=200, blank=True)
    # Early-bird price for this intake until the deadline (inclusive); otherwise the course price.
    early_bird_price = models.PositiveBigIntegerField(null=True, blank=True)
    early_bird_deadline = models.DateField(null=True, blank=True)
    # Moodle calendar events of deleted sessions, removed at the next calendar sync.
    calendar_cleanup = models.JSONField(default=list, blank=True)
    # Step 7 – the intake's "Điểm danh" activity (mod_attendance instance) and sessions to remove.
    moodle_attendance_id = models.PositiveIntegerField(null=True, blank=True)
    attendance_cleanup = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["start_date", "name"]
        constraints = [models.UniqueConstraint(fields=["course", "name"], name="uniq_cohort_name_per_course")]

    def __str__(self):
        return self.name

    def early_bird_active(self, today=None) -> bool:
        from django.utils import timezone

        today = today or timezone.localdate()
        return bool(
            self.early_bird_price is not None
            and self.early_bird_deadline
            and today <= self.early_bird_deadline
            and self.early_bird_price < self.course.price
        )

    def price(self, today=None) -> int:
        """What a learner pays for this intake today (before coupons)."""
        return self.early_bird_price if self.early_bird_active(today) else self.course.price


class CohortSession(BaseModel):
    """One class session of an intake; mirrored as an event in the intake's Moodle course calendar."""

    cohort = models.ForeignKey(Cohort, on_delete=models.CASCADE, related_name="sessions")
    title = models.CharField(max_length=200, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    location = models.CharField(max_length=300, blank=True)
    online = models.BooleanField(default=False)
    moodle_event_id = models.PositiveIntegerField(null=True, blank=True)
    moodle_attendance_session_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["starts_at"]

    def __str__(self):
        return f"{self.cohort_id} {self.starts_at:%Y-%m-%d %H:%M}"


class Program(InstallmentPlan, BaseModel):
    """A program ("Chương trình"): several courses sold together at one price, Coursera-style."""

    slug = models.SlugField(max_length=200, unique=True)
    title = models.CharField(max_length=300)
    subtitle = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    thumbnail = models.CharField(max_length=500, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    courses = models.ManyToManyField(Course, through="ProgramCourse", related_name="programs")
    price = models.PositiveBigIntegerField(default=0)
    original_price = models.PositiveBigIntegerField(default=0)
    is_published = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title


class ProgramCourse(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="program_courses")
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="+")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
        constraints = [models.UniqueConstraint(fields=["program", "course"], name="uniq_program_course")]

    def __str__(self):
        return f"{self.program_id} #{self.position}: {self.course_id}"


class CourseReview(BaseModel):
    """
    A review written by a learner who took the course (from the learner account), published on the
    course page only after staff approval and with the learner's consent.
    """

    STATUS_CHOICES = [("pending", "Chờ duyệt"), ("approved", "Đã đăng"), ("rejected", "Không đăng")]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="learner_reviews")
    order = models.OneToOneField("crm.Order", on_delete=models.CASCADE, related_name="review")
    display_name = models.CharField(max_length=100)
    role = models.CharField(max_length=150, blank=True)  # e.g. "Chuyên viên QHKH – MSB"
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(max_length=2000)
    completed = models.BooleanField(default=False)  # the learner had finished the course when writing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True)
    moderation_note = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.course_id} {self.rating}★ {self.display_name}"


class Coupon(BaseModel):
    code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=300, blank=True)
    discount_percent = models.PositiveSmallIntegerField(validators=[MaxValueValidator(100)])
    max_discount_amount = models.PositiveBigIntegerField(null=True, blank=True)
    min_order_amount = models.PositiveBigIntegerField(default=0)
    valid_until = models.DateField(null=True, blank=True)
    max_usage = models.PositiveIntegerField(null=True, blank=True)
    usage_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.code

    def discount_for(self, amount: int) -> int:
        discount = amount * self.discount_percent // 100
        if self.max_discount_amount is not None:
            discount = min(discount, self.max_discount_amount)
        return discount
