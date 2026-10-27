from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel


def sync_registration_names(*, course=None, program=None, cohort=None) -> None:
    """
    Registrations keep the name of their course / program / intake (e-mails, exports, SSO read it):
    a renamed course, program or intake is renamed on every registration too.
    """
    from apps.crm.models import Order

    if course is not None:
        stale = Order.objects.filter(course=course).exclude(course_title=course.title)
        stale.update(course_title=course.title)
        Order.objects.filter(course=course, parent__isnull=True).exclude(
            interested_course=course.title
        ).update(interested_course=course.title)
    if program is not None:
        mine = Order.objects.filter(program=program, parent__isnull=True, course__isnull=True)
        mine.exclude(course_title=program.title).update(
            course_title=program.title, interested_course=program.title
        )
    if cohort is not None:
        Order.objects.filter(cohort=cohort).exclude(batch_cohort=cohort.name).update(batch_cohort=cohort.name)


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
    # Rating, review and learner counts are not stored: the public API counts approved learner reviews
    # (CourseReview) and learners who may study, so the site never shows a figure nobody measured.
    lessons_count = models.PositiveIntegerField(default=0)  # from the syllabus (apps.lms.outline)

    # Prices in VND. The checkout always reads these server-side; the client never supplies amounts.
    price = models.PositiveBigIntegerField(default=0)  # 0 = free course
    # A struck-through list price is a price promotion: it is shown only until `sale_ends_on`
    # (no date = never shown), and may be at most twice the price (discount ≤ 50%).
    original_price = models.PositiveBigIntegerField(default=0)
    sale_ends_on = models.DateField(null=True, blank=True)
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
        sync_registration_names(course=self)

    @property
    def sellable(self) -> bool:
        """New registrations are taken for courses on sale only."""
        return self.status == "published"

    def list_price(self, today=None) -> int:
        """The struck-through price shown today: the list price while the promotion runs, else the price."""
        today = today or timezone.localdate()
        if self.original_price > self.price and self.sale_ends_on and self.sale_ends_on >= today:
            return self.original_price
        return self.price


class CohortQuerySet(models.QuerySet):
    def public(self):
        """Intakes sold to individuals: the website, admissions, checkout and intake planning use these."""
        return self.filter(audience=Cohort.AUDIENCE_PUBLIC)

    def on_website(self, today=None):
        """
        Classes the public site lists under "Đang tuyển sinh" (/tuyen-sinh/<slug>), like job postings:
        switched on, taking registrations, of a course on sale, not past the registration deadline (nor
        started, without one). They come off on their own when the deadline passes, the class fills /
        closes or the course is taken off sale.
        """
        from django.utils import timezone

        today = today or timezone.localdate()
        return (
            self.public()
            .filter(is_published=True, status__in=Cohort.JOINABLE, course__status="published")
            .exclude(slug="")
            .filter(models.Q(registration_deadline__isnull=True) | models.Q(registration_deadline__gte=today))
            .filter(
                models.Q(registration_deadline__isnull=False)
                | models.Q(start_date__isnull=True)
                | models.Q(start_date__gte=today)
            )
        )


class Cohort(BaseModel):
    AUDIENCE_PUBLIC = "public"
    AUDIENCE_CORPORATE = "corporate"
    # A corporate class (apps.corporate.CorporateClass) is a private intake of one client company: same
    # sessions, Moodle course and attendance, but never on sale and its learners have no orders.
    AUDIENCE_CHOICES = [(AUDIENCE_PUBLIC, "Tuyển sinh công khai"), (AUDIENCE_CORPORATE, "Lớp doanh nghiệp")]
    STATUS_CHOICES = [
        ("opening", "Đang tuyển sinh"),
        ("full", "Đã đủ sĩ số"),
        ("closed", "Đã đóng tuyển sinh"),
        ("in_progress", "Đang học"),
        ("completed", "Đã kết thúc"),
        ("upcoming", "Sắp mở"),
    ]
    # Statuses that take registrations (and may show on the website).
    JOINABLE = ("opening", "upcoming")

    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="cohorts")
    name = models.CharField(max_length=200)
    audience = models.CharField(
        max_length=20, choices=AUDIENCE_CHOICES, default=AUDIENCE_PUBLIC, db_index=True
    )
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

    # Admissions: a class is recruited for like a job posting (it replaces the separate campaigns).
    # The code tags its leads (UTM / registration form); the quota is the capacity.
    code = models.CharField(max_length=50, blank=True, db_index=True)
    slug = models.SlugField(max_length=90, blank=True)  # /tuyen-sinh/<slug>
    is_published = models.BooleanField(default=False, db_index=True)  # "Hiện trên website"
    is_featured = models.BooleanField(default=False)
    show_quota = models.BooleanField(default=True)  # show the places left
    summary = models.CharField(max_length=300, blank=True)  # the hook on the card
    image = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    view_count = models.PositiveIntegerField(default=0)
    scholarship_budget = models.PositiveBigIntegerField(default=0)
    recruiter = models.CharField(max_length=200, blank=True)  # who runs the admissions of this class
    # Train-to-hire: the job the class leads to at the partner, and how many hires are planned.
    job_title = models.CharField(max_length=300, blank=True)
    job_department = models.CharField(max_length=200, blank=True)
    salary_range = models.CharField(max_length=100, blank=True)
    job_quota = models.PositiveIntegerField(default=0)

    objects = CohortQuerySet.as_manager()

    class Meta:
        ordering = ["start_date", "name"]
        constraints = [
            models.UniqueConstraint(fields=["course", "name"], name="uniq_cohort_name_per_course"),
            models.UniqueConstraint(fields=["code"], condition=~models.Q(code=""), name="uniq_cohort_code"),
            models.UniqueConstraint(fields=["slug"], condition=~models.Q(slug=""), name="uniq_cohort_slug"),
        ]

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

    @property
    def display_name(self) -> str:
        """The class as visitors and staff name it: course and intake ("RM Doanh nghiệp · Khóa 10")."""
        return f"{self.course.title} · {self.name}"

    def website_state(self, today=None) -> tuple[str, str]:
        """(live | off, label): whether the class shows on the public site, and why not."""
        from django.utils import timezone

        today = today or timezone.localdate()
        if self.audience != self.AUDIENCE_PUBLIC:
            return "off", "Lớp doanh nghiệp: không đăng website"
        if self.status not in self.JOINABLE:
            return "off", f"Không hiện: {self.get_status_display().lower()}"
        if self.course.status != "published":
            return "off", f"Không hiện: khóa học {self.course.get_status_display().lower()}"
        if not self.is_published:
            return "off", "Không hiện: chưa bật Hiện trên website"
        if self.registration_deadline and self.registration_deadline < today:
            return "off", "Không hiện: đã qua hạn đăng ký"
        if not self.registration_deadline and self.start_date and self.start_date < today:
            return "off", "Không hiện: lớp đã khai giảng"
        return "live", "Đang hiện trên website"

    def save(self, *args, **kwargs):
        from django.utils.text import slugify

        if self.status not in self.JOINABLE or self.audience != self.AUDIENCE_PUBLIC:
            self.is_published = False  # a class that does not take registrations comes off the site
        self.code = (self.code or "").strip().upper()
        if self.is_published and not self.slug:
            base = slugify(unidecode_vi(f"{self.course.title} {self.name}"))[:80] or "lop"
            slug, n = base, 2
            while Cohort.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        if "update_fields" in kwargs and kwargs["update_fields"] is not None:
            kwargs["update_fields"] = {*kwargs["update_fields"], "is_published", "slug", "code"}
        super().save(*args, **kwargs)
        sync_registration_names(cohort=self)


def unidecode_vi(text: str) -> str:
    """Vietnamese without accents (đ → d), for URLs."""
    import unicodedata

    text = text.replace("đ", "d").replace("Đ", "D")
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()


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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        sync_registration_names(program=self)

    @property
    def sellable(self) -> bool:
        return self.is_published


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
