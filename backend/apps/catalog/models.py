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


class Course(BaseModel):
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

    is_published = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title


class Cohort(BaseModel):
    STATUS_CHOICES = [
        ("opening", "Đang tuyển sinh"),
        ("full", "Đã đủ sĩ số"),
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

    class Meta:
        ordering = ["start_date", "name"]
        constraints = [models.UniqueConstraint(fields=["course", "name"], name="uniq_cohort_name_per_course")]

    def __str__(self):
        return self.name


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
