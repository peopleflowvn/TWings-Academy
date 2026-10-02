import React, { useState } from 'react';
import { 
  Database, 
  Check, 
  Copy, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Server, 
  Code2, 
  Sparkles, 
  Terminal, 
  Cpu, 
  ShieldCheck,
  TrendingUp,
  FileCode
} from 'lucide-react';
import { DJANGO_MODELS_CODE } from '../../data/djangoCodeReference';

export const CMSArchitectureTab: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeCodeFile, setActiveCodeFile] = useState<'models' | 'serializers' | 'views' | 'settings'>('models');
  const [simulatedMigration, setSimulatedMigration] = useState(false);
  const [migrationOutput, setMigrationOutput] = useState<string[]>([]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunMigration = () => {
    setSimulatedMigration(true);
    setMigrationOutput([
      'Operations to perform:',
      '  Apply all migrations: admin, auth, contenttypes, crm_orders, courses, articles',
      'Running migrations:',
      '  Applying courses.0001_initial... OK (PostgreSQL 16.2)',
      '  Applying crm_orders.0001_initial... OK (Index: idx_crm_phone, idx_crm_citizen)',
      '  Applying articles.0001_initial... OK (Full-Text Search Vector: gin_idx_articles)',
      '  Applying webhook_vietqr.0001_initial... OK (Row-level lock enabled)',
      'All 4 migrations successfully applied in 0.048s. Database is in sync.'
    ]);
  };

  const codeSnippets = {
    models: DJANGO_MODELS_CODE,
    serializers: `# crm_orders/serializers.py
from rest_framework import serializers
from .models import OrderCRM, Course, ArticleSEO

class OrderCRMSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderCRM
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'order_code')

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'

class ArticleSEOSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleSEO
        fields = '__all__'
`,
    views: `# crm_orders/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import OrderCRM
from .serializers import OrderCRMSerializer

class OrderCRMViewSet(viewsets.ModelViewSet):
    queryset = OrderCRM.objects.all().order_by('-created_at')
    serializer_class = OrderCRMSerializer

    @action(detail=False, methods=['post'], url_path='vietqr-webhook')
    def handle_vietqr_webhook(self, request):
        """
        Idempotent Webhook Handler for VietQR Bank Transactions
        Uses PostgreSQL Row-Level Locking ('select_for_update')
        """
        transaction_code = request.data.get('transaction_code')
        order_code = request.data.get('order_code')
        amount = request.data.get('amount')

        with transaction.atomic():
            order = OrderCRM.objects.select_for_update().filter(order_code=order_code).first()
            if not order:
                return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
            
            if order.status == 'paid':
                return Response({'status': 'already_processed'}, status=status.HTTP_200_OK)

            order.status = 'paid'
            order.crm_status = '5. Đã đóng phí'
            order.payment_status_detail = 'Đã đóng phí'
            order.paid_amount_l1 = amount
            order.transaction_code = transaction_code
            order.save()

        return Response({'success': True, 'order_code': order_code}, status=status.HTTP_200_OK)
`,
    settings: `# core/settings.py (Production PostgreSQL Configuration)
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# PostgreSQL Database Configuration (High Concurrency & Row-Level Locking)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'coursera_lms_crm'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'secure_password_here'),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600, # Persistent connection pooling
        'OPTIONS': {
            'sslmode': 'prefer',
        },
    }
}

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20
}
`
  };

  return (
    <div className="space-y-8">
      {/* 1. Direct Consultation Answer to User */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#0073C1]" />
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Tư Vấn Kiến Trúc: Django & Cơ Sở Dữ Liệu (PostgreSQL vs SQLite)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Django Analysis */}
          <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-200 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0073C1] uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-[#0073C1]" />
              <span>1. Về việc sử dụng Python Django: CỰC KỲ THÍCH HỢP</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Django</strong> là một trong những framework backend tiêu chuẩn vàng cho các hệ thống giáo dục, bán khóa học và CRM nhờ các ưu thế vượt trội:
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li><strong>Django Admin</strong> sẵn sàng ngay lập tức để quản lý dữ liệu, phân quyền tài khoản (RBAC) chi tiết.</li>
              <li><strong>Bảo mật cấp doanh nghiệp:</strong> Tích hợp sẵn cơ chế chống SQL Injection, CSRF, XSS, Clickjacking.</li>
              <li><strong>Django ORM & Transactions:</strong> Hỗ trợ giao dịch tài chính an toàn với <code className="bg-blue-100 px-1 rounded font-mono">transaction.atomic()</code> khi đối soát VietQR.</li>
              <li><strong>Django REST Framework (DRF):</strong> Dễ dàng kết nối API với giao diện React/Next.js phía frontend.</li>
            </ul>
          </div>

          {/* Database Comparison Conclusion */}
          <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>2. Nên dùng SQLite hay PostgreSQL: BẮT BUỘC DÙNG POSTGRESQL</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Khuyến nghị dứt khoát từ chuyên gia kiến trúc phần mềm: <strong>Phải chọn PostgreSQL</strong> cho môi trường triển khai thực tế (Production):
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li><strong>SQLite chỉ dùng để test local:</strong> SQLite khóa toàn bộ file database khi có một giao dịch ghi. Khi nhiều học viên cùng đăng ký hoặc Webhook VietQR ngân hàng gọi cùng lúc, SQLite sẽ bị lỗi <code className="text-red-700 bg-red-100 px-1 rounded font-mono">database is locked</code>.</li>
              <li><strong>PostgreSQL chịu tải hàng triệu bản ghi:</strong> Khóa cấp hàng (Row-level locking MVCC), hàng nghìn kết nối đồng thời mà không bao giờ bị nghẽn.</li>
              <li><strong>Kiểu dữ liệu JSONB:</strong> Cực kỳ tối ưu để lưu trữ Syllabus khóa học, danh sách bài giảng linh hoạt mà không cần tạo hàng chục bảng con.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2. Detailed SQLite vs PostgreSQL Comparison Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0073C1]" />
            <h3 className="font-bold text-sm text-slate-900">
              Bảng So Sánh Kỹ Thuật Chi Tiết: SQLite vs PostgreSQL
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            Khuyên dùng: PostgreSQL 16+
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Tiêu Chí Đánh Giá</th>
                <th className="p-3.5 text-slate-500">SQLite (Local/Demo)</th>
                <th className="p-3.5 text-[#0073C1] bg-blue-50/50">PostgreSQL (Khuyên Dùng Cho Production)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3.5 font-bold text-slate-800">Cơ chế Khóa dữ liệu (Locking)</td>
                <td className="p-3.5 text-red-600 font-semibold">Khóa toàn bộ Database (File-level lock). Không cho phép 2 tiến trình ghi cùng lúc.</td>
                <td className="p-3.5 text-emerald-700 font-semibold bg-blue-50/30">Khóa cấp dòng (Row-level lock / MVCC). Hàng ngàn học viên ghi dữ liệu song song.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-800">Xử lý Webhook VietQR tự động</td>
                <td className="p-3.5 text-amber-700">Dễ gặp lỗi "database is locked" khi webhook ngân hàng gọi tới lúc đang có đơn hàng mới.</td>
                <td className="p-3.5 text-emerald-700 font-semibold bg-blue-50/30">Hoàn hảo với <code className="font-mono text-[11px]">select_for_update()</code>, chống gian lận đơn hàng kép.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-800">Lưu trữ Syllabus & Curriculum</td>
                <td className="p-3.5 text-slate-600">Lưu text thuần, khó đánh chỉ mục (index) tìm kiếm sâu.</td>
                <td className="p-3.5 text-emerald-700 font-semibold bg-blue-50/30">Hỗ trợ <strong>JSONB + GIN Index</strong>, truy vấn bài giảng và câu hỏi quiz siêu tốc.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-800">Tìm kiếm Toàn văn (Full-Text Search)</td>
                <td className="p-3.5 text-slate-600">Rất hạn chế, không tối ưu cho SEO tiếng Việt.</td>
                <td className="p-3.5 text-emerald-700 font-semibold bg-blue-50/30">Tích hợp sẵn <code className="font-mono text-[11px]">tsvector</code> & <code className="font-mono text-[11px]">pg_trgm</code> tìm kiếm bài viết chuẩn SEO.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-800">Khả năng sao lưu & Khôi phục</td>
                <td className="p-3.5 text-slate-600">Copy file thủ công, dễ hỏng nếu copy lúc đang ghi.</td>
                <td className="p-3.5 text-emerald-700 font-semibold bg-blue-50/30">pg_dump, WAL archiving, Point-In-Time Recovery (PITR) bảo vệ dữ liệu doanh thu tuyệt đối.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Ready-To-Use Django Code Repository */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs space-y-0">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#0073C1]" />
              <span>Mã Nguồn Django Backend Sẵn Sàng Triển Khai</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Được kiến trúc đầy đủ các trường CRM học viên, Webhook ngân hàng và quản lý bài viết chuẩn SEO.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunMigration}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chạy migrate (DB Check)</span>
            </button>

            <button
              onClick={() => handleCopy(codeSnippets[activeCodeFile])}
              className="px-3.5 py-1.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Đã sao chép!' : 'Sao chép File'}</span>
            </button>
          </div>
        </div>

        {/* Code tabs */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-slate-100 text-xs font-mono font-bold text-slate-600">
          <button
            onClick={() => setActiveCodeFile('models')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeCodeFile === 'models' ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-200'
            }`}
          >
            models.py (CRM & Course)
          </button>
          <button
            onClick={() => setActiveCodeFile('serializers')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeCodeFile === 'serializers' ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-200'
            }`}
          >
            serializers.py (DRF)
          </button>
          <button
            onClick={() => setActiveCodeFile('views')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeCodeFile === 'views' ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-200'
            }`}
          >
            views.py (Webhook VietQR)
          </button>
          <button
            onClick={() => setActiveCodeFile('settings')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeCodeFile === 'settings' ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-200'
            }`}
          >
            settings.py (PostgreSQL)
          </button>
        </div>

        {/* Code Viewer */}
        <div className="bg-slate-950 p-6 text-slate-200 text-xs font-mono overflow-x-auto max-h-[480px] overflow-y-auto leading-relaxed border-t border-slate-800">
          <pre>{codeSnippets[activeCodeFile]}</pre>
        </div>

        {/* Simulated Migration Terminal Output */}
        {simulatedMigration && (
          <div className="bg-black/90 p-4 border-t border-slate-800 text-emerald-400 font-mono text-[11px] space-y-1">
            <div className="text-slate-400 font-bold flex items-center gap-1.5 mb-2">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>$ python manage.py migrate --database=default</span>
            </div>
            {migrationOutput.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
