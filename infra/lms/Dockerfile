# syntax=docker/dockerfile:1.7
# TWings LMS: Moodle on the official Moodle HQ PHP/Apache image. Build context = repository root.
#   docker build -f infra/lms/Dockerfile .
# Contains no secrets (config.php reads everything from the environment).

ARG PHP_IMAGE=moodlehq/moodle-php-apache:8.3@sha256:501f19fa75ad3cdc8962f2a742f39d179b8aa8ffdc2ff233d8d27a32f14e0e05

# ---------------------------------------------------------------- Moodle source, pinned by commit
FROM --platform=$BUILDPLATFORM ${PHP_IMAGE} AS source
# Moodle 5.2.4 (tag v5.2.4). Fetching an exact commit makes a tampered tag or mirror detectable.
ARG MOODLE_COMMIT=2df605b1e093248e8f8d1e2fc081fb3b1f65665f
RUN command -v git >/dev/null || (apt-get update -q && apt-get install -yq --no-install-recommends git ca-certificates)
RUN git init -q /moodle \
 && git -C /moodle fetch -q --depth 1 https://github.com/moodle/moodle.git "$MOODLE_COMMIT" \
 && git -C /moodle checkout -q FETCH_HEAD \
 && test "$(git -C /moodle rev-parse HEAD)" = "$MOODLE_COMMIT" \
 && rm -rf /moodle/.git

# ---------------------------------------------------------------- runtime
FROM ${PHP_IMAGE}
LABEL org.opencontainers.image.source="https://github.com/peopleflowvn/TWings-Academy" \
      org.opencontainers.image.description="TWings Academy LMS (Moodle 5.2)"

COPY --from=source /moodle /var/www/moodle
COPY infra/lms/config.php infra/lms/twings_setup.php /var/www/moodle/
COPY infra/lms/php.ini /usr/local/etc/php/conf.d/zz-twings.ini
COPY infra/lms/apache.conf /etc/apache2/sites-available/twings.conf

# Unprivileged Apache on :8080; code owned by root and read-only for www-data; data in a volume.
RUN : > /etc/apache2/ports.conf \
 && a2dissite -q 000-default \
 && a2ensite -q twings \
 && install -d /var/www/empty \
 && install -d -o www-data -g www-data -m 2770 /var/moodledata \
 && chown -R root:root /var/www/moodle \
 && chmod -R a+rX,go-w /var/www/moodle

USER www-data
EXPOSE 8080
VOLUME ["/var/moodledata"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD php -r 'exit(@file_get_contents("http://127.0.0.1:8080/learn/admin/environment.xml") === false ? 1 : 0);'
