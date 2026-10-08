# syntax=docker/dockerfile:1.7
# TWings LMS: Moodle on the official Moodle HQ PHP/Apache image. Build context = repository root.
#   docker build -f infra/lms/Dockerfile .
# The code is lms/ in this repository: Moodle 5.2 core + third-party plugins vendored with git subtree
# (versions in infra/lms/vendor.json, TWings changes in infra/lms/patches.txt; see docs/LMS.md) and
# TWings' own plugins. Context filter: infra/lms/Dockerfile.dockerignore. Contains no secrets
# (config.php reads everything from the environment).

ARG PHP_IMAGE=moodlehq/moodle-php-apache:8.3@sha256:501f19fa75ad3cdc8962f2a742f39d179b8aa8ffdc2ff233d8d27a32f14e0e05

FROM ${PHP_IMAGE}
LABEL org.opencontainers.image.source="https://github.com/peopleflowvn/TWings-Academy" \
      org.opencontainers.image.description="TWings Academy LMS (Moodle 5.2)"

# Apache: unprivileged on :8080, only the TWings site. Done before copying the code so this layer stays
# cached when lms/ changes.
COPY infra/lms/php.ini /usr/local/etc/php/conf.d/zz-twings.ini
COPY infra/lms/apache.conf /etc/apache2/sites-available/twings.conf
RUN : > /etc/apache2/ports.conf \
 && a2dissite -q 000-default \
 && a2ensite -q twings \
 && install -d /var/www/empty \
 && install -d -o www-data -g www-data -m 2770 /var/moodledata

# Code owned by root and read-only for www-data (COPY gives root:root with git's 644/755 modes, so no
# chown/chmod layer that would duplicate ~400 MB); data lives in the moodledata volume.
COPY --link lms/ /var/www/moodle/
COPY --link infra/lms/config.php infra/lms/twings_setup.php /var/www/moodle/
# TWings wording of Moodle's e-mails, copied to dataroot/lang/*_local by twings_setup.php (outside public/).
COPY --link infra/lms/lang/ /var/www/moodle/twings_lang/

USER www-data
# The upstream entrypoint writes PHP ini files from env vars as root; our ini is baked in above, so use
# the plain PHP image entrypoint (CMD stays apache2-foreground).
ENTRYPOINT ["docker-php-entrypoint"]
CMD ["apache2-foreground"]
EXPOSE 8080
VOLUME ["/var/moodledata"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD php -r 'exit(@file_get_contents("http://127.0.0.1:8080/learn/admin/environment.xml") === false ? 1 : 0);'
