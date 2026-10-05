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
];
foreach ($settings as $name => $value) {
    set_config($name, $value);
}
// The site administrator is the sender shown on system e-mails.
if ($admin->firstname !== 'TWings' || $admin->lastname !== 'Academy') {
    user_update_user((object) ['id' => $admin->id, 'firstname' => 'TWings', 'lastname' => 'Academy'], false, false);
}

$auths = array_filter(explode(',', get_config('core', 'auth') ?: ''));
if (!in_array('webservice', $auths, true)) {
    $auths[] = 'webservice';
    set_config('auth', implode(',', $auths));
}

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
foreach ([$studentroleid, $managerroleid] as $target) {
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

purge_caches();
$out('done');
