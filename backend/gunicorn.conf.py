import multiprocessing
import os

bind = "0.0.0.0:8000"
workers = int(os.environ.get("GUNICORN_WORKERS", min(4, multiprocessing.cpu_count() * 2 + 1)))
threads = int(os.environ.get("GUNICORN_THREADS", 2))
# Per-container tmpfs; recommended by gunicorn when the root filesystem is read-only.
worker_tmp_dir = "/dev/shm"  # noqa: S108
timeout = 30
graceful_timeout = 20
max_requests = 2000
max_requests_jitter = 200
limit_request_line = 8190
limit_request_fields = 100
# Cloudflare Tunnel is the only client; trust its X-Forwarded-* headers.
forwarded_allow_ips = "*"
accesslog = "-"
errorlog = "-"
# No query strings in access logs: they could contain personal data.
access_log_format = '%(h)s "%(m)s %(U)s %(H)s" %(s)s %(B)s %(M)sms "%(a)s"'
