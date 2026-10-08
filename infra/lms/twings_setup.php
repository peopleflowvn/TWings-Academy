<?php
// Idempotent TWings configuration of Moodle, run by deploy.sh after every install/upgrade:
//   php /var/www/moodle/twings_setup.php
// Uses Moodle's own APIs only. Reads MOODLE_WS_TOKEN (shared with the TWings backend) from the env.
define('CLI_SCRIPT', true);
require(__DIR__ . '/config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/user/lib.php');

$syscontext = context_system::instance();
$admin = get_admin();
$out = fn(string $m) => mtrace('twings-setup: ' . $m);

// ---------------------------------------------------------------- site policy
$settings = [
    'timezone' => 'Asia/Ho_Chi_Minh',
    'forcetimezone' => 'Asia/Ho_Chi_Minh',
    'country' => 'VN',
    'registerauth' => '',          // no self sign-up: accounts come from paid TWings orders
    'guestloginbutton' => 0,
    'forcelogin' => 1,             // nothing is visible without an account
    'autologinguests' => 0,
    'allowframembedding' => 0,
    'enablecompletion' => 1,       // activity/course completion tracking
    'enablebadges' => 1,
    'enablecourserelativedates' => 1,
    'enablewebservices' => 1,
    'webserviceprotocols' => 'rest',
    'passwordpolicy' => 1,
    'minpasswordlength' => 10,
    'lockoutthreshold' => 5,       // account lockout after failed logins
    'cookiesecure' => 1,
    'allowuserthemes' => 0,
    'updateautocheck' => 0,
    // Vietnamese names read family name first ("Nguyễn Văn An").
    'fullnamedisplay' => 'lastname firstname',
    'alternativefullnameformat' => 'lastname firstname',
    // Mail comes from no-reply@<domain> as "TWings Academy", without a "(via ...)" suffix.
    'emailfromvia' => 0,
    // Allow users and admins to log in using email address
    'auth_allowemail' => 1,
];
foreach ($settings as $name => $value) {
    set_config($name, $value);
}
// The site administrator is the sender shown on system e-mails and administrative account.
$admin_email = getenv('MOODLE_ADMIN_EMAIL') ?: 'tuyendung@tntalent.vn';
$admin_updates = ['id' => $admin->id];
if ($admin->firstname !== 'TWings' || $admin->lastname !== 'Academy') {
    $admin_updates['firstname'] = 'TWings';
    $admin_updates['lastname'] = 'Academy';
}
if ($admin->email !== $admin_email) {
    $admin_updates['email'] = $admin_email;
}
if (count($admin_updates) > 1) {
    user_update_user((object) $admin_updates, false, false);
}

$auths = array_filter(explode(',', get_config('core', 'auth') ?: ''));
if (!in_array('webservice', $auths, true)) {
    $auths[] = 'webservice';
    set_config('auth', implode(',', $auths));
}

// ---------------------------------------------------------------- TWings Theme & Brand Styling
// Configures theme_boost with TWings design language:
// Brand blue #0073C1, modern typography (Plus Jakarta Sans), clean card UI for learner dashboard (/my).
set_config('brandcolor', '#0073C1', 'theme_boost');

$twings_head_css = <<<'HTML'
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style id="twings-lms-custom-theme">
/* === TWINGS ACADEMY MODERN LMS OVERHAUL === */
:root {
  --twings-font: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
  --twings-blue: #0073C1 !important;
  --twings-blue-dark: #0056D2 !important;
  --twings-navy: #00388A !important;
  --twings-bg: #F8FAFC !important;
  --twings-card-border: #E2E8F0 !important;
}

body, html, #page, #page-wrapper, .navbar, .btn, .card {
  font-family: var(--twings-font) !important;
}

body {
  background-color: var(--twings-bg) !important;
  color: #0F172A !important;
  -webkit-font-smoothing: antialiased;
}

/* 1. Header / Navbar */
.navbar.fixed-top {
  background: #ffffff !important;
  border-bottom: 1px solid var(--twings-card-border) !important;
  box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.04) !important;
  height: 64px !important;
  padding: 0 1.5rem !important;
}

.navbar-brand {
  font-weight: 800 !important;
  font-size: 1.15rem !important;
  color: var(--twings-navy) !important;
  text-transform: uppercase !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.6rem !important;
}

.navbar-brand::before {
  content: "TW" !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, #00388A 0%, #0056D2 50%, #0073C1 100%) !important;
  color: #ffffff !important;
  font-size: 0.85rem !important;
  font-weight: 900 !important;
  box-shadow: 0 2px 6px rgba(0, 115, 193, 0.3) !important;
}

/* 2. Page Header / Greetings Banner */
.pagelayout-mydashboard #page-header {
  background: transparent !important;
  padding: 1.5rem 0 0.5rem !important;
  border: none !important;
}

.pagelayout-mydashboard #page-header h1 {
  font-weight: 800 !important;
  font-size: 2rem !important;
  letter-spacing: -0.03em !important;
  color: #0F172A !important;
}

/* 3. Main content area wrapper */
#page.drawers .main-inner {
  max-width: 1280px !important;
  margin: 0 auto !important;
  background: transparent !important;
}

#region-main {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}

/* 4. Blocks General Styling */
.block {
  background: #ffffff !important;
  border: 1px solid var(--twings-card-border) !important;
  border-radius: 1.25rem !important;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04) !important;
  padding: 1.25rem !important;
  margin-bottom: 1.75rem !important;
  transition: all 0.2s ease !important;
}

.block .card-title {
  font-weight: 800 !important;
  font-size: 1.15rem !important;
  color: #0F172A !important;
  letter-spacing: -0.02em !important;
  margin-bottom: 1rem !important;
}

/* 5. Course Overview (My Courses) Card Deck */
.block_myoverview {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

.block_myoverview [data-region="filter"] {
  background: #ffffff !important;
  border: 1px solid var(--twings-card-border) !important;
  border-radius: 1rem !important;
  padding: 0.75rem 1rem !important;
  margin-bottom: 1.5rem !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02) !important;
}

.block_myoverview [data-region="filter"] .btn,
.block_myoverview [data-region="filter"] .form-control,
.block_myoverview [data-region="filter"] .custom-select {
  border-radius: 0.75rem !important;
  border: 1px solid #CBD5E1 !important;
  font-size: 0.875rem !important;
  font-weight: 500 !important;
}

/* Individual Course Cards */
.block_myoverview .course-card {
  background: #ffffff !important;
  border: 1px solid var(--twings-card-border) !important;
  border-radius: 1.25rem !important;
  overflow: hidden !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03) !important;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease !important;
}

.block_myoverview .course-card:hover {
  transform: translateY(-4px) !important;
  box-shadow: 0 12px 24px -6px rgba(0, 115, 193, 0.12), 0 4px 8px -2px rgba(0, 115, 193, 0.06) !important;
  border-color: #93C5FD !important;
}

.block_myoverview .course-card .card-img-top {
  height: 9.5rem !important;
  background-size: cover !important;
  background-position: center !important;
  position: relative !important;
}

.block_myoverview .course-card .card-img-top::after {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.45) 100%) !important;
}

.block_myoverview .course-card .card-body {
  padding: 1.25rem !important;
}

.block_myoverview .course-card .coursename {
  font-weight: 800 !important;
  font-size: 1.05rem !important;
  line-height: 1.45 !important;
  color: #0F172A !important;
  text-decoration: none !important;
  transition: color 0.15s ease !important;
}

.block_myoverview .course-card .coursename:hover {
  color: var(--twings-blue-dark) !important;
}

.block_myoverview .course-card .categoryname {
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  color: var(--twings-blue) !important;
  background: #EFF6FF !important;
  padding: 0.25rem 0.65rem !important;
  border-radius: 9999px !important;
  display: inline-block !important;
  margin-bottom: 0.5rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
}

/* Progress bar inside course card */
.block_myoverview .course-card .progress {
  height: 6px !important;
  border-radius: 9999px !important;
  background-color: #F1F5F9 !important;
  overflow: hidden !important;
  margin-top: 0.5rem !important;
}

.block_myoverview .course-card .progress-bar {
  background: linear-gradient(90deg, #0073C1 0%, #0056D2 100%) !important;
  border-radius: 9999px !important;
}

/* 6. Timeline Block & Calendar Block */
.block_timeline, .block_calendar_month {
  border-radius: 1.25rem !important;
  border: 1px solid var(--twings-card-border) !important;
}

.block_calendar_month .calendartable th,
.block_calendar_month .calendartable td {
  border-radius: 0.5rem !important;
}

.block_calendar_month .today {
  background-color: #EFF6FF !important;
  color: var(--twings-blue) !important;
  font-weight: 800 !important;
  border-radius: 9999px !important;
}

/* 7. Action buttons */
.btn-primary {
  background: linear-gradient(135deg, #0056D2 0%, #0073C1 100%) !important;
  border: none !important;
  border-radius: 0.85rem !important;
  font-weight: 700 !important;
  padding: 0.55rem 1.25rem !important;
  box-shadow: 0 2px 4px rgba(0, 115, 193, 0.25) !important;
  transition: all 0.2s ease !important;
}

.btn-primary:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 8px rgba(0, 115, 193, 0.35) !important;
}
</style>
HTML;

set_config('additionalhtmlhead', $twings_head_css);

$twings_scss = <<<'SCSS'
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');

:root {
  --font-family-base: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --twings-primary: #0073C1;
  --twings-primary-dark: #0056D2;
  --twings-primary-navy: #00388A;
  --twings-surface: #F8FAFC;
  --twings-border: #E2E8F0;
  --twings-text-main: #0F172A;
  --twings-text-muted: #64748B;
}

body, html {
  font-family: var(--font-family-base) !important;
  background-color: var(--twings-surface) !important;
  color: var(--twings-text-main) !important;
  -webkit-font-smoothing: antialiased;
}

// Top Navbar Modernization
.navbar.fixed-top {
  background: #ffffff !important;
  border-bottom: 1px solid var(--twings-border) !important;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04) !important;
  height: 64px;
  padding: 0 1.5rem;

  .navbar-brand {
    font-weight: 800;
    font-size: 1.15rem;
    letter-spacing: -0.025em;
    color: var(--twings-primary-navy) !important;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &::before {
      content: "TW";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, #00388A 0%, #0056D2 50%, #0073C1 100%);
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 900;
      letter-spacing: 0;
      box-shadow: 0 2px 4px rgba(0, 115, 193, 0.25);
    }
  }

  .primary-navigation .navigation .nav-link {
    font-weight: 600;
    font-size: 0.875rem;
    color: #475569;
    border-radius: 0.75rem;
    padding: 0.5rem 0.875rem;
    transition: all 0.15s ease-in-out;

    &:hover {
      color: var(--twings-primary-dark);
      background-color: #F1F5F9;
    }

    &.active {
      color: var(--twings-primary-dark);
      background-color: #EFF6FF;
    }
  }
}

// Modern Dashboard Header & Welcome Banner
.pagelayout-mydashboard {
  #page-header {
    background: transparent;
    padding: 1.75rem 0 1rem;
    border-bottom: none;

    .page-context-header {
      .page-header-headings {
        h1 {
          font-weight: 800;
          font-size: 1.85rem;
          color: var(--twings-text-main);
          letter-spacing: -0.025em;
        }
      }
    }
  }
}

// Course Cards Modernization (Coursera/Modern LMS Aesthetics)
.block_myoverview {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;

  .card-grid {
    gap: 1.5rem 0;
  }

  .course-card {
    border: 1px solid var(--twings-border) !important;
    border-radius: 1rem !important;
    overflow: hidden;
    background: #ffffff !important;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05) !important;
    height: 100%;
    display: flex;
    flex-direction: column;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px -5px rgba(0, 115, 193, 0.1), 0 8px 10px -6px rgba(0, 115, 193, 0.06) !important;
      border-color: #BFDBFE !important;
    }

    .card-img-top {
      height: 9rem !important;
      background-size: cover;
      background-position: center;
      position: relative;

      &::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.4) 100%);
      }
    }

    .card-body {
      padding: 1.25rem 1.25rem 0.75rem !important;
      flex: 1 1 auto;

      .coursename {
        font-weight: 700;
        font-size: 1.05rem;
        line-height: 1.4;
        color: var(--twings-text-main) !important;
        text-decoration: none !important;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 0.5rem;

        &:hover {
          color: var(--twings-primary-dark) !important;
        }
      }

      .categoryname {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--twings-primary-dark);
        background: #EFF6FF;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        display: inline-block;
        margin-bottom: 0.5rem;
      }
    }

    .card-footer {
      background: #ffffff !important;
      border-top: 1px solid #F1F5F9 !important;
      padding: 0.85rem 1.25rem !important;

      .progress-text {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--twings-text-muted);
        margin-bottom: 0.35rem;
        display: flex;
        justify-content: space-between;
      }

      .progress {
        height: 6px !important;
        border-radius: 9999px !important;
        background-color: #F1F5F9 !important;
        overflow: hidden;

        .progress-bar {
          background: linear-gradient(90deg, #0073C1 0%, #0056D2 100%) !important;
          border-radius: 9999px;
        }
      }
    }
  }

  // Filter toolbar styling
  [data-region="filter"] {
    background: #ffffff;
    border: 1px solid var(--twings-border);
    border-radius: 0.875rem;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem !important;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);

    .btn, .form-control, .custom-select {
      border-radius: 0.625rem;
      font-size: 0.85rem;
      font-weight: 500;
      border-color: var(--twings-border);
    }
  }
}

// Side Drawers & Blocks styling
.drawer {
  border-left: 1px solid var(--twings-border);
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.03);
}

.block {
  border: 1px solid var(--twings-border) !important;
  border-radius: 1rem !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04) !important;
  background: #ffffff !important;
  margin-bottom: 1.5rem;

  .card-title {
    font-weight: 700;
    font-size: 1rem;
    color: var(--twings-text-main);
    letter-spacing: -0.01em;
  }
}

// Modern buttons
.btn-primary {
  background-color: var(--twings-primary) !important;
  border-color: var(--twings-primary) !important;
  border-radius: 0.75rem !important;
  font-weight: 600 !important;
  padding: 0.5rem 1.15rem !important;
  box-shadow: 0 1px 2px 0 rgba(0, 115, 193, 0.2) !important;
  transition: all 0.15s ease-in-out !important;

  &:hover, &:focus {
    background-color: var(--twings-primary-dark) !important;
    border-color: var(--twings-primary-dark) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 115, 193, 0.3) !important;
  }
}

.btn-secondary {
  border-radius: 0.75rem !important;
  font-weight: 600 !important;
}
SCSS;
set_config('scss', $twings_scss, 'theme_boost');


// ---------------------------------------------------------------- Vietnamese language pack
if (!get_string_manager()->translation_exists('vi', false)) {
    try {
        $controller = new \tool_langimport\controller();
        $controller->install_languagepacks(['vi']);
        get_string_manager()->reset_caches();
        $out('installed language pack: vi');
    } catch (Throwable $e) {
        $out('WARNING: could not install the vi language pack: ' . $e->getMessage());
    }
}
if (get_string_manager()->translation_exists('vi', false)) {
    set_config('lang', 'vi');
}

// ---------------------------------------------------------------- site policy
// Moodle's own consent step: on first sign-in learners must agree to the TWings privacy policy
// (published on the website, the same text for site and LMS).
$policyhosts = array_values(array_filter(array_map('trim', explode(',', getenv('MOODLE_HOSTS') ?: ''))));
if ($policyhosts) {
    $policyurl = 'https://' . $policyhosts[0] . '/chinh-sach-bao-mat';
    if (get_config('core', 'sitepolicy') !== $policyurl) {
        set_config('sitepolicy', $policyurl);
        set_config('sitepolicyguest', $policyurl);
        $out('site policy: ' . $policyurl);
    }
}

// ---------------------------------------------------------------- integration role + user
$capabilities = [
    'webservice/rest:use',
    'moodle/webservice:createtoken',
    'moodle/course:create', 'moodle/course:view', 'moodle/course:viewhiddencourses',
    'moodle/course:changeidnumber', 'moodle/course:changeshortname', 'moodle/course:changesummary',
    'moodle/category:manage', 'moodle/category:viewhiddencategories',
    'moodle/user:create', 'moodle/user:viewdetails', 'moodle/user:viewalldetails',
    'moodle/user:viewhiddendetails',
    'enrol/manual:enrol', 'moodle/role:assign', 'moodle/course:enrolreview',
    // Learning overview and management from the TWings CMS (/app):
    'enrol/manual:unenrol', 'moodle/user:update', 'moodle/course:viewparticipants',
    'report/completion:view', 'moodle/grade:viewall', 'gradereport/overview:view',
    // Learners' e-mail must be visible to the integration: users are looked up by e-mail (an existing
    // account must be reused, never duplicated) and the CMS lists learners with their e-mail.
    'moodle/site:viewuseridentity', 'moodle/course:useremail', 'moodle/site:viewfullnames',
    // Intake class sessions as course calendar events.
    'moodle/calendar:manageentries',
    // Attendance activity + sessions, reading marks; gradebook of every learner.
    'moodle/course:manageactivities', 'mod/attendance:addinstance', 'mod/attendance:manageattendances',
    'mod/attendance:takeattendances', 'mod/attendance:view', 'gradereport/user:view',
    // One Moodle course per intake, copied from the course's template (backup/restore) and dated.
    // Find each intake course's Announcements forum.
    'mod/forum:viewdiscussion',
    'moodle/backup:backupcourse', 'moodle/backup:configure', 'moodle/restore:restorecourse',
    'moodle/restore:configure', 'moodle/restore:rolldates', 'moodle/course:update',
    'moodle/course:changefullname', 'moodle/course:visibility',
];
$role = $DB->get_record('role', ['shortname' => 'twingsintegration']);
$roleid = $role ? $role->id : create_role(
    'TWings integration', 'twingsintegration', 'Used only by the TWings backend web service user.'
);
set_role_contextlevels($roleid, [CONTEXT_SYSTEM]);
foreach ($capabilities as $cap) {
    if (get_capability_info($cap)) {
        assign_capability($cap, CAP_ALLOW, $roleid, $syscontext->id, true);
    }
}
$studentroleid = $DB->get_field('role', 'id', ['shortname' => 'student'], MUST_EXIST);
// Roles the integration may hand out: student (enrolment) and manager (TWings training staff).
// core_role_set_assign_allowed() inserts unconditionally (unique index): only call it once.
$managerroleid = $DB->get_field('role', 'id', ['shortname' => 'manager'], MUST_EXIST);
$teacherroleid = $DB->get_field('role', 'id', ['shortname' => 'editingteacher'], MUST_EXIST);
foreach ([$studentroleid, $managerroleid, $teacherroleid] as $target) {
    if (!$DB->record_exists('role_allow_assign', ['roleid' => $roleid, 'allowassign' => $target])) {
        core_role_set_assign_allowed($roleid, $target);
    }
}

$wsuser = $DB->get_record('user', ['username' => 'twings_ws', 'mnethostid' => $CFG->mnet_localhost_id]);
if (!$wsuser) {
    $id = user_create_user((object) [
        'username' => 'twings_ws',
        'auth' => 'webservice',          // cannot log in through the web UI
        'firstname' => 'TWings',
        'lastname' => 'Integration',
        'email' => 'noreply@localhost.invalid',
        'confirmed' => 1,
        'mnethostid' => $CFG->mnet_localhost_id,
        'password' => 'not cached',
    ], false, false);
    $wsuser = $DB->get_record('user', ['id' => $id], '*', MUST_EXIST);
    $out('created web service user twings_ws');
}
role_assign($roleid, $wsuser->id, $syscontext->id);
// The site policy (below) must never block the integration account's web service calls.
if (empty($wsuser->policyagreed)) {
    $DB->set_field('user', 'policyagreed', 1, ['id' => $wsuser->id]);
}

// ---------------------------------------------------------------- external service + token
$functions = [
    'core_webservice_get_site_info',
    'core_course_get_categories', 'core_course_create_categories',
    'core_course_get_courses_by_field', 'core_course_create_courses',
    'core_user_get_users_by_field', 'core_user_create_users',
    'enrol_manual_enrol_users',
    // /app learning overview and actions
    'core_enrol_get_users_courses', 'core_enrol_get_enrolled_users',
    'core_completion_get_course_completion_status', 'gradereport_overview_get_course_grades',
    'enrol_manual_unenrol_users', 'core_user_update_users', 'core_role_assign_roles',
    // Staff who leave or change role lose Moodle's manager role
    'core_role_unassign_roles',
    // Intakes: copy the template course, set its dates
    'core_course_duplicate_course', 'core_course_update_courses',
    // Public syllabus on the website: section and activity names of the template course
    'core_course_get_contents',
    // Intake class sessions in the course calendar
    'core_calendar_create_calendar_events', 'core_calendar_delete_calendar_events',
    // Attendance (mod_attendance) per intake, and the gradebook per learner
    'mod_attendance_add_attendance', 'mod_attendance_add_session', 'mod_attendance_remove_session',
    'mod_attendance_get_session', 'gradereport_user_get_grade_items',
    // Link /app straight to the course's Announcements forum (class announcements live in Moodle)
    'mod_forum_get_forums_by_courses',
];
$service = $DB->get_record('external_services', ['shortname' => 'twings']);
if (!$service) {
    $service = (object) [
        'name' => 'TWings integration', 'shortname' => 'twings', 'enabled' => 1, 'restrictedusers' => 1,
        'requiredcapability' => '', 'downloadfiles' => 0, 'uploadfiles' => 0, 'timecreated' => time(),
        'timemodified' => time(), 'component' => null,
    ];
    $service->id = $DB->insert_record('external_services', $service);
    $out('created external service twings');
}
$DB->set_field('external_services', 'enabled', 1, ['id' => $service->id]);
foreach ($functions as $fn) {
    if (!$DB->record_exists('external_services_functions', ['externalserviceid' => $service->id, 'functionname' => $fn])) {
        $DB->insert_record('external_services_functions', ['externalserviceid' => $service->id, 'functionname' => $fn]);
    }
}
$private = '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16'; // Docker networks only
if (!$DB->record_exists('external_services_users', ['externalserviceid' => $service->id, 'userid' => $wsuser->id])) {
    $DB->insert_record('external_services_users', [
        'externalserviceid' => $service->id, 'userid' => $wsuser->id, 'iprestriction' => $private,
        'validuntil' => null, 'timecreated' => time(),
    ]);
}

$token = getenv('MOODLE_WS_TOKEN');
if (!$token || !preg_match('/^[A-Za-z0-9]{32}$/', $token)) {
    cli_error('MOODLE_WS_TOKEN must be 32 alphanumeric characters');
}
// One token for the backend: replace any previous one (rotation = change the env value + redeploy).
$DB->delete_records_select('external_tokens', 'externalserviceid = ? AND userid = ? AND token <> ?',
    [$service->id, $wsuser->id, $token]);
if (!$DB->record_exists('external_tokens', ['token' => $token])) {
    $DB->insert_record('external_tokens', [
        'token' => $token, 'privatetoken' => random_string(64), 'tokentype' => EXTERNAL_TOKEN_PERMANENT,
        'userid' => $wsuser->id, 'externalserviceid' => $service->id, 'contextid' => $syscontext->id,
        'creatorid' => $admin->id, 'iprestriction' => $private, 'validuntil' => 0, 'timecreated' => time(),
        'name' => 'twings-backend',
    ]);
    $out('installed web service token');
}

// ---------------------------------------------------------------- SSO: "Đăng nhập bằng TWings"
// Moodle's built-in OAuth 2 login with TWings as the provider (backend apps/sso). One issuer per site
// hostname, so the button always sends people to a hostname their network can reach; a small footer
// script shows only the button of the hostname being browsed.
$ssosecret = getenv('MOODLE_SSO_CLIENT_SECRET');
$ssohosts = array_values(array_filter(array_map('trim', explode(',', getenv('MOODLE_HOSTS') ?: ''))));
if ($ssosecret && $ssohosts) {
    $auths = array_filter(explode(',', get_config('core', 'auth') ?: ''));
    if (!in_array('oauth2', $auths, true)) {
        array_unshift($auths, 'oauth2');
        set_config('auth', implode(',', $auths));
    }
    $idbyhost = [];
    foreach ($ssohosts as $i => $host) {
        $name = "TWings @ {$host}";
        $issuer = \core\oauth2\issuer::get_record(['name' => $name]) ?: new \core\oauth2\issuer(0, (object) ['name' => $name]);
        foreach ([
            'clientid' => getenv('MOODLE_SSO_CLIENT_ID') ?: 'moodle',
            'clientsecret' => $ssosecret,
            'baseurl' => '',
            'image' => '',
            'loginpagename' => 'Đăng nhập bằng TWings',
            'enabled' => 1,
            'showonloginpage' => \core\oauth2\issuer::LOGINONLY,
            'requireconfirmation' => 0,   // e-mail ownership is proven by TWings (one-time code)
            'basicauth' => 0,
            'loginscopes' => 'openid profile email',
            'loginscopesoffline' => 'openid profile email',
            'sortorder' => $i,
        ] as $field => $value) {
            $issuer->set($field, $value);
        }
        $issuer->get('id') ? $issuer->update() : $issuer->create();
        $base = "https://{$host}/api/v1/sso";
        foreach (['authorization_endpoint' => "$base/authorize/", 'token_endpoint' => "$base/token/",
                  'userinfo_endpoint' => "$base/userinfo/"] as $epname => $url) {
            $ep = \core\oauth2\endpoint::get_record(['issuerid' => $issuer->get('id'), 'name' => $epname])
                ?: new \core\oauth2\endpoint(0, (object) ['issuerid' => $issuer->get('id'), 'name' => $epname]);
            $ep->set('url', $url);
            $ep->get('id') ? $ep->update() : $ep->create();
        }
        foreach (['email' => 'email', 'given_name' => 'firstname', 'family_name' => 'lastname', 'locale' => 'lang'] as $ext => $int) {
            if (!\core\oauth2\user_field_mapping::get_record(['issuerid' => $issuer->get('id'), 'externalfield' => $ext])) {
                (new \core\oauth2\user_field_mapping(0, (object) [
                    'issuerid' => $issuer->get('id'), 'externalfield' => $ext, 'internalfield' => $int,
                ]))->create();
            }
        }
        $idbyhost[$issuer->get('id')] = $host;
    }
    $map = json_encode($idbyhost, JSON_UNESCAPED_SLASHES);
    set_config('additionalhtmlfooter', "<script>/* twings-sso */(function(){var m={$map};"
        . "document.querySelectorAll('a[href*=\"/auth/oauth2/login.php\"]').forEach(function(a){"
        . "var r=/[?&]id=(\\d+)/.exec(a.href);if(r&&m[r[1]]&&m[r[1]]!==location.host){a.style.display='none';}});})();</script>");
    $out('SSO issuers: ' . implode(', ', $ssohosts));
}

// ---------------------------------------------------------------- plugins removed from lms/
// Code deleted from the repository (infra/lms/vendor.py remove) leaves the plugin "missing from disk":
// uninstall it, but only while it holds no activity (TWings issues the official certificates).
require_once($CFG->libdir . '/adminlib.php');
$pluginman = core_plugin_manager::instance();
foreach (['mod_customcert' => 'customcert'] as $component => $table) {
    $info = $pluginman->get_plugin_info($component);
    if (!$info || $info->get_status() !== core_plugin_manager::PLUGIN_STATUS_MISSING) {
        continue;
    }
    $used = $DB->get_manager()->table_exists($table) ? $DB->count_records($table) : 0;
    if ($used > 0 || !$pluginman->can_uninstall_plugin($component)) {
        $out("WARNING: {$component} is missing from disk but kept ({$used} activities): remove them in Moodle first");
        continue;
    }
    $progress = new progress_trace_buffer(new text_progress_trace(), false);
    $pluginman->uninstall_plugin($component, $progress);
    $progress->finished();
    $out("uninstalled {$component} (removed from lms/)");
}

purge_caches();
$out('done');
