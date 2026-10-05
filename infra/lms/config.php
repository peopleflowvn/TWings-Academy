<?php
// TWings Moodle configuration (baked into the lms image). Every secret comes from the environment
// (/opt/twings/env/lms.env); nothing sensitive lives in this file or the image.
unset($CFG);
global $CFG;
$CFG = new stdClass();

$CFG->dbtype    = 'pgsql';
$CFG->dblibrary = 'native';
$CFG->dbhost    = getenv('MOODLE_DB_HOST') ?: 'db';
$CFG->dbname    = getenv('MOODLE_DB_NAME') ?: 'moodle';
$CFG->dbuser    = getenv('MOODLE_DB_USER') ?: 'moodle';
$CFG->dbpass    = getenv('MOODLE_DB_PASSWORD');
$CFG->prefix    = 'mdl_';
$CFG->dboptions = ['dbpersist' => 0, 'dbport' => 5432, 'dbsocket' => ''];

// Moodle is served at /learn on every TWings site hostname (MOODLE_HOSTS, comma separated, first one
// is canonical: used by cron and in e-mails). Unknown Host headers fall back to the canonical one.
$twingshosts = array_values(array_filter(array_map('trim', explode(',', getenv('MOODLE_HOSTS') ?: ''))));
$twingshost = $_SERVER['HTTP_HOST'] ?? '';
$CFG->wwwroot = 'https://' . (in_array($twingshost, $twingshosts, true) ? $twingshost : ($twingshosts[0] ?? 'localhost')) . '/learn';
unset($twingshosts, $twingshost);

$CFG->dataroot = '/var/moodledata';
$CFG->admin    = 'admin';
$CFG->directorypermissions = 02770;

// TLS terminates at the shared gateway; the visitor IP is the right-most public address in
// X-Forwarded-For (the gateway overwrites what visitors send, our own proxies are private ranges).
$CFG->sslproxy = true;
$CFG->getremoteaddrconf = 1; // GETREMOTEADDR_SKIP_HTTP_CLIENT_IP: trust X-Forwarded-For, not Client-IP
$CFG->reverseproxyignore = '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16';
$CFG->cookiesecure = true;
$CFG->cookiehttponly = true;

// Install/upgrade through the web UI requires this key (deploy.sh does both from the CLI), so nobody
// can hijack an un-installed site or trigger an upgrade from a browser.
$CFG->upgradekey = getenv('MOODLE_UPGRADE_KEY') ?: bin2hex(random_bytes(16));

// The code directory is read-only in production: no plugin/update installs from the web UI.
$CFG->disableupdateautodeploy = true;
$CFG->disableupdatenotifications = true;
$CFG->preventexecpath = true;
$CFG->routerconfigured = false;

// Outgoing mail (Resend SMTP when configured; otherwise Moodle keeps working but sends nothing).
if (getenv('MOODLE_SMTP_HOST')) {
    $CFG->smtphosts  = getenv('MOODLE_SMTP_HOST');
    $CFG->smtpsecure = 'tls';
    $CFG->smtpauthtype = 'LOGIN';
    $CFG->smtpuser   = getenv('MOODLE_SMTP_USER');
    $CFG->smtppass   = getenv('MOODLE_SMTP_PASSWORD');
}
if (getenv('MOODLE_NOREPLY_EMAIL')) {
    $CFG->noreplyaddress = getenv('MOODLE_NOREPLY_EMAIL');
}

require_once(__DIR__ . '/lib/setup.php');
