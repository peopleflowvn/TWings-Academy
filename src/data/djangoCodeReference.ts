export const DJANGO_MODELS_CODE = `# backend_django/courses/models.py
"""
Twings Edu - Django ORM Models for Course Sales, Moodle-like LMS & VietQR Payments
Compatible with Django 5.x + Django REST Framework + PostgreSQL
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify

class Category(models.Model):
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=150, unique=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Instructor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='instructor_profile')
    title = models.CharField(max_length=200, help_text="e.g. Giám đốc Học thuật Twings Edu")
    bio = models.TextField()
    credential = models.CharField(max_length=255, help_text="e.g. IELTS 8.5 · MA TESOL Bristol UK")
    avatar = models.ImageField(upload_to='instructors/', blank=True, null=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.0)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.credential})"

class Course(models.Model):
    LEVEL_CHOICES = (
        ('zero', 'Mất gốc'),
        ('4.5_5.5', '4.5 - 5.5'),
        ('6.0_7.5', '6.0 - 7.5'),
        ('7.5_plus', '7.5+ Master'),
        ('all', 'Mọi trình độ'),
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    subtitle = models.CharField(max_length=500)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='courses')
    instructor = models.ForeignKey(Instructor, on_delete=models.CASCADE, related_name='courses')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='all')
    price = models.DecimalField(max_digits=12, decimal_places=0, help_text="Price in VND")
    original_price = models.DecimalField(max_digits=12, decimal_places=0, help_text="Original strike-through price")
    duration = models.CharField(max_length=100, default='36 giờ học')
    is_published = models.BooleanField(default=True)
    is_bestseller = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class Chapter(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Lesson(models.Model):
    LESSON_TYPES = (
        ('video', 'Video Lecture (H.264/DASH)'),
        ('audio_listening', 'Audio Listening Test'),
        ('quiz', 'Interactive Quiz Assessment'),
        ('pdf_material', 'PDF Companion Slide'),
        ('flashcard', 'Spaced Repetition Flashcard Deck'),
    )
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    lesson_type = models.CharField(max_length=30, choices=LESSON_TYPES, default='video')
    duration = models.CharField(max_length=50, default='15 phút')
    order = models.PositiveIntegerField(default=1)
    is_free_preview = models.BooleanField(default=False)
    video_url = models.URLField(blank=True, null=True)
    audio_file = models.FileField(upload_to='audios/', blank=True, null=True)
    transcript = models.TextField(blank=True)
    pdf_attachment = models.FileField(upload_to='materials/', blank=True, null=True)
    
    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.chapter.title} -> {self.title}"

class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Chờ thanh toán'),
        ('paid', 'Đã thanh toán'),
        ('cancelled', 'Đã hủy'),
    )
    PAYMENT_METHODS = (
        ('vietqr', 'VietQR Napas 247'),
        ('momo', 'MoMo QR'),
        ('vnpay', 'VNPay Gateway'),
        ('bank_transfer', 'Chuyển khoản thủ công'),
    )
    order_code = models.CharField(max_length=50, unique=True)
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='orders')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHODS, default='vietqr')
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=20)
    transaction_reference = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Order #{self.order_code} - {self.course.title} ({self.status})"
`;

export const DJANGO_VIEWS_CODE = `# backend_django/courses/views.py
"""
Django REST Framework Viewsets & Automated VietQR Payment Webhook
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import Course, Chapter, Lesson, Order
from .serializers import CourseSerializer, OrderSerializer

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.filter(is_published=True).prefetch_related('chapters__lessons')
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def create_vietqr_checkout(self, request):
        """
        Khởi tạo đơn hàng & tạo mã VietQR động theo chuẩn Napas247
        """
        course_id = request.data.get('course_id')
        name = request.data.get('customer_name')
        email = request.data.get('customer_email')
        phone = request.data.get('customer_phone')
        
        course = Course.objects.get(id=course_id)
        import random
        order_code = f"TW-{random.randint(10000, 99999)}"
        
        order = Order.objects.create(
            order_code=order_code,
            course=course,
            amount=course.price,
            customer_name=name,
            customer_email=email,
            customer_phone=phone,
            status='pending',
            payment_method='vietqr'
        )
        
        # Tạo chuỗi Quick Link VietQR Napas
        # Ngân hàng MB Bank (970422), STK: 9999TWINGS8888
        vietqr_url = f"https://img.vietqr.io/image/970422-9999TWINGS8888-compact2.png?amount={int(course.price)}&addInfo={order_code}&accountName=CONG%20TY%20CP%20GIAO%20DUC%20TWINGS"
        
        return Response({
            'order_code': order_code,
            'amount': course.price,
            'qr_image_url': vietqr_url,
            'account_number': '9999TWINGS8888',
            'bank_name': 'MB Bank',
            'account_name': 'CONG TY CP GIAO DUC TWINGS VIET NAM'
        })

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def vietqr_webhook_handler(request):
    """
    Webhook tự động nhận tín hiệu thanh toán từ cổng Open Banking / Casso / SeAPay
    Khi có biến động số dư khớp mã nội dung 'TW-XXXXX', hệ thống tự động kích hoạt khóa học!
    """
    data = request.data
    order_code = data.get('content') # Ví dụ: 'TW-89241'
    amount = data.get('transferAmount')
    
    try:
        order = Order.objects.get(order_code=order_code, status='pending')
        if int(amount) >= int(order.amount):
            order.status = 'paid'
            order.paid_at = timezone.now()
            order.transaction_reference = data.get('referenceCode', '')
            order.save()
            
            # Gửi email xác nhận & cấp tài khoản LMS Moodle tự động
            # send_enrollment_email(order.customer_email, order.course)
            return Response({'success': True, 'message': 'Course auto-activated'}, status=200)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)
`;

export const NEXTJS_APP_ROUTER_CODE = `// frontend_nextjs/app/courses/[slug]/page.tsx
/**
 * Next.js 15 App Router - Server-Side Rendered (SSR) Course Detail Page
 * Connects directly to Twings Edu Django REST API backend
 */
import { notFound } from 'next/navigation';
import CourseHeader from '@/components/course/CourseHeader';
import SyllabusAccordion from '@/components/course/SyllabusAccordion';
import VietQRCheckoutButton from '@/components/payment/VietQRCheckoutButton';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCourse(slug: string) {
  const res = await fetch(\`\${process.env.DJANGO_API_URL}/api/courses/\${slug}/\`, {
    next: { revalidate: 60 } // Next.js ISR (Incremental Static Regeneration)
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <CourseHeader course={course} />
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="text-xl font-bold text-[#0F294D] mb-4">Chương trình học Moodle chuẩn hóa</h2>
            <SyllabusAccordion chapters={course.chapters} />
          </section>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-3xl font-extrabold text-[#0F294D]">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(course.price)}
            </p>
            <VietQRCheckoutButton courseId={course.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
`;
