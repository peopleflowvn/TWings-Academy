<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Public Profile -- a user's public profile page
 *
 * - each user can currently have their own page (cloned from system and then customised)
 * - users can add any blocks they want
 * - the administrators can define a default site public profile for users who have
 *   not created their own public profile
 *
 * This script implements the user's view of the public profile, and allows editing
 * of the public profile.
 *
 * @package    core_user
 * @copyright  2010 Remote-Learner.net
 * @author     Hubert Chathi <hubert@remote-learner.net>
 * @author     Olav Jordan <olav.jordan@remote-learner.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../config.php');
require_once($CFG->dirroot . '/my/lib.php');
require_once($CFG->dirroot . '/user/profile/lib.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->libdir.'/filelib.php');

$userid         = optional_param('id', 0, PARAM_INT);
$edit           = optional_param('edit', null, PARAM_BOOL);    // Turn editing on and off.
$reset          = optional_param('reset', null, PARAM_BOOL);

// Even if the user didn't supply a userid, we treat page URL as if they did; this is needed so navigation works correctly.
$userid = $userid ?: $USER->id;

$PAGE->set_url('/user/profile.php', ['id' => $userid]);

if (!empty($CFG->forceloginforprofiles)) {
    require_login();
    if (isguestuser()) {
        $PAGE->set_context(context_system::instance());
        $PAGE->set_title(get_string('loginrequired'));
        echo $OUTPUT->header();
        echo $OUTPUT->confirm(
            get_string('guestcantaccessprofiles', 'error'),
            get_login_url(),
            $CFG->wwwroot,
            [
                'headinglevel' => 1,
                'confirmtitle' => get_string('loginrequired'),
            ],
        );
        echo $OUTPUT->footer();
        die;
    }
} else if (!empty($CFG->forcelogin)) {
    require_login();
}

if ((!$user = $DB->get_record('user', array('id' => $userid))) || ($user->deleted)) {
    $PAGE->set_context(context_system::instance());
    $PAGE->set_title(get_string('user'));
    echo $OUTPUT->header();
    if (!$user) {
        echo $OUTPUT->notification(get_string('invaliduser', 'error'));
    } else {
        echo $OUTPUT->notification(get_string('userdeleted'));
    }
    echo $OUTPUT->footer();
    die;
}

$currentuser = ($user->id == $USER->id);
$context = $usercontext = context_user::instance($userid, MUST_EXIST);

if (!user_can_view_profile($user, null, $context)) {

    // Course managers can be browsed at site level. If not forceloginforprofiles, allow access (bug #4366).
    $struser = get_string('user');
    $PAGE->set_context(context_system::instance());
    $PAGE->set_title($struser);  // Do not leak the name.
    $PAGE->set_heading($struser);
    $PAGE->set_pagelayout('mypublic');
    $PAGE->add_body_class('limitedwidth');
    $PAGE->set_url('/user/profile.php', array('id' => $userid));
    $PAGE->navbar->add($struser);
    echo $OUTPUT->header();
    echo $OUTPUT->notification(get_string('usernotavailable', 'error'));
    echo $OUTPUT->footer();
    exit;
}

// Get the profile page.  Should always return something unless the database is broken.
if (!$currentpage = my_get_page($userid, MY_PAGE_PUBLIC)) {
    throw new \moodle_exception('mymoodlesetup');
}

$PAGE->set_context($context);
$PAGE->set_pagelayout('mypublic');
$PAGE->add_body_class('limitedwidth');
$PAGE->set_pagetype('user-profile');

// Set up block editing capabilities.
if (isguestuser()) {     // Guests can never edit their profile.
    $USER->editing = $edit = 0;  // Just in case.
    $PAGE->set_blocks_editing_capability('moodle/my:configsyspages');  // unlikely :).
} else {
    if ($currentuser) {
        $PAGE->set_blocks_editing_capability('moodle/user:manageownblocks');
    } else {
        $PAGE->set_blocks_editing_capability('moodle/user:manageblocks');
    }
}

// Start setting up the page.
$strpublicprofile = get_string('publicprofile');

$PAGE->blocks->add_region('content');
$PAGE->set_subpage($currentpage->id);
$PAGE->set_title(fullname($user).": $strpublicprofile");
$PAGE->set_heading(fullname($user));

if (!$currentuser) {
    $PAGE->navigation->extend_for_user($user);
    if ($node = $PAGE->settingsnav->get('userviewingsettings'.$user->id)) {
        $node->forceopen = true;
    }
} else if ($node = $PAGE->settingsnav->get('dashboard', navigation_node::TYPE_CONTAINER)) {
    $node->forceopen = true;
}
if ($node = $PAGE->settingsnav->get('root')) {
    $node->forceopen = false;
}


// Toggle the editing state and switches.
if ($PAGE->user_allowed_editing()) {
    if ($reset !== null) {
        require_sesskey();
        if (!is_null($userid)) {
            if (!$currentpage = my_reset_page($userid, MY_PAGE_PUBLIC, 'user-profile')) {
                throw new \moodle_exception('reseterror', 'my');
            }
            redirect(new moodle_url('/user/profile.php', array('id' => $userid)));
        }
    } else if ($edit !== null) {             // Editing state was specified.
        $USER->editing = $edit;       // Change editing state.
    } else {                          // Editing state is in session.
        if ($currentpage->userid) {   // It's a page we can edit, so load from session.
            if (!empty($USER->editing)) {
                $edit = 1;
            } else {
                $edit = 0;
            }
        } else {
            // For the page to display properly with the user context header the page blocks need to
            // be copied over to the user context.
            if (!$currentpage = my_copy_page($userid, MY_PAGE_PUBLIC, 'user-profile')) {
                throw new \moodle_exception('mymoodlesetup');
            }
            $PAGE->set_context($usercontext);
            $PAGE->set_subpage($currentpage->id);
            // It's a system page and they are not allowed to edit system pages.
            $USER->editing = $edit = 0;          // Disable editing completely, just to be safe.
        }
    }

    // Add button for editing page.
    $params = array('edit' => !$edit, 'id' => $userid);

    $resetbutton = '';
    $resetstring = get_string('resetpage', 'my');
    $reseturl = new moodle_url("$CFG->wwwroot/user/profile.php", array('edit' => 1, 'reset' => 1, 'id' => $userid));

    if (!$currentpage->userid) {
        // Viewing a system page -- let the user customise it.
        $editstring = get_string('updatemymoodleon');
        $params['edit'] = 1;
    } else if (empty($edit)) {
        $editstring = get_string('updatemymoodleon');
        $resetbutton = $OUTPUT->single_button(
            $reseturl,
            $resetstring,
            options: [
                'data-modal' => 'confirmation',
                'data-modal-content-str' => json_encode(['resetpageconfirm', 'my']),
            ],
        );
    } else {
        $editstring = get_string('updatemymoodleoff');
        $resetbutton = $OUTPUT->single_button(
            $reseturl,
            $resetstring,
            options: [
                'data-modal' => 'confirmation',
                'data-modal-content-str' => json_encode(['resetpageconfirm', 'my']),
            ],
        );
    }

    $url = new moodle_url("$CFG->wwwroot/user/profile.php", $params);
    $button = '';
    if (!$PAGE->theme->haseditswitch) {
        $button = $OUTPUT->single_button($url, $editstring);
    }
    $PAGE->set_button($resetbutton . $button);

} else {
    $USER->editing = $edit = 0;
}

// Trigger a user profile viewed event.
profile_view($user, $usercontext);

// TODO WORK OUT WHERE THE NAV BAR IS!
echo $OUTPUT->header();

if ($user->suspended) {
    echo $OUTPUT->notification(
        html_writer::tag('h2', get_string('suspended', 'auth'), ['class' => 'alert-heading h4']) .
        get_string('suspended_help', 'auth'),
        \core\output\notification::NOTIFY_WARNING
    );
}

echo '<div class="userprofile twings-merged-profile">';

if ($currentuser) {
    $userfullname = fullname($user);
    $nameparts = explode(' ', trim($userfullname));
    $initials = count($nameparts) > 1 ? mb_substr($nameparts[count($nameparts) - 2], 0, 1) . mb_substr($nameparts[count($nameparts) - 1], 0, 1) : mb_substr($userfullname, 0, 2);
    $initials = mb_strtoupper($initials);
    $joineddate = userdate($user->firstaccess ?: time(), '%d/%m/%Y');
    $useremail = $user->email;
    $change_pwd_url = new moodle_url('/login/change_password.php');
    $grades_url = new moodle_url('/grade/report/overview/index.php');
    $calendar_url = new moodle_url('/calendar/view.php', ['view' => 'upcoming']);
    $pref_url = new moodle_url('/user/preferences.php');
    $my_courses_url = new moodle_url('/my/');

    ?>
    <!-- TWings Unified Learner Profile Header -->
    <div class="twings-profile-hero mb-4">
        <div class="twings-hero-body">
            <div class="twings-hero-avatar">
                <span><?php echo s($initials); ?></span>
            </div>
            <div class="twings-hero-details">
                <div class="twings-hero-name-row">
                    <h2 class="twings-hero-name"><?php echo s($userfullname); ?></h2>
                    <span class="twings-pill twings-pill-success">
                        <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        Học viên chính thức
                    </span>
                    <span class="twings-pill twings-pill-info">
                        <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        LMS TWings
                    </span>
                </div>
                <div class="twings-hero-meta">
                    <span class="twings-meta-item">
                        <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        <?php echo s($useremail); ?>
                    </span>
                    <span class="twings-meta-dot">•</span>
                    <span class="twings-meta-item">
                        <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Mã học viên: TW-<?php echo s($user->id); ?>
                    </span>
                    <span class="twings-meta-dot">•</span>
                    <span class="twings-meta-item">
                        <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Tham gia: <?php echo s($joineddate); ?>
                    </span>
                </div>
            </div>
            <div class="twings-hero-actions">
                <a href="<?php echo $my_courses_url; ?>" class="twings-btn twings-btn-primary">
                    <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                    Vào học LMS
                </a>
                <a href="<?php echo $change_pwd_url; ?>" class="twings-btn twings-btn-light">
                    <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                    Đổi mật khẩu
                </a>
                <a href="<?php echo $grades_url; ?>" class="twings-btn twings-btn-light">
                    <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    Bảng điểm
                </a>
                <a href="<?php echo $pref_url; ?>" class="twings-btn twings-btn-light">
                    <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                    Tùy chọn
                </a>
            </div>
        </div>
    </div>

    <!-- Navigation Tabs for Unified Profile -->
    <div class="twings-tabs-nav mb-4" id="twings-tabs">
        <button type="button" class="twings-tab-btn active" data-tab="tab-finance">
            <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Học phí & Trả góp
        </button>
        <button type="button" class="twings-tab-btn" data-tab="tab-dossier">
            <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Hồ sơ nhập học & CV
        </button>
        <button type="button" class="twings-tab-btn" data-tab="tab-courses">
            <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
            Tiến độ & Chứng chỉ
        </button>
        <button type="button" class="twings-tab-btn" data-tab="tab-moodle">
            <svg class="tw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Chi tiết tài khoản LMS
        </button>
    </div>

    <!-- Container for dynamic TWings account & commerce features -->
    <div id="twings-portal-app" data-user-email="<?php echo s($useremail); ?>" data-user-name="<?php echo s($userfullname); ?>">
        <div id="twings-loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2 small">Đang tải dữ liệu hồ sơ & học phí TWings…</p>
        </div>
        <div id="twings-content" style="display:none;"></div>
    </div>
    <?php
}

$hiddenfields = [];
if (!has_capability('moodle/user:viewhiddendetails', $usercontext)) {
    $hiddenfields = array_flip(explode(',', $CFG->hiddenuserfields));
}
if ($user->description && !isset($hiddenfields['description'])) {
    echo '<div class="description">';
    if (!empty($CFG->profilesforenrolledusersonly) && !$currentuser &&
        !$DB->record_exists('role_assignments', array('userid' => $user->id))) {
        echo get_string('profilenotshown', 'moodle');
    } else {
        $user->description = file_rewrite_pluginfile_urls($user->description, 'pluginfile.php', $usercontext->id, 'user',
                                                          'profile', null);
        echo format_text($user->description, $user->descriptionformat);
    }
    echo '</div>';
}

echo $OUTPUT->heading(get_string('userprofile', 'core_user'), 2, 'visually-hidden');
echo $OUTPUT->custom_block_region('content');

// Native Moodle blocks wrapped in tab-moodle container if current user
if ($currentuser) {
    echo '<div id="twings-tab-moodle" class="twings-tab-panel" style="display:none;">';
}

// Render custom blocks.
$renderer = $PAGE->get_renderer('core_user', 'myprofile');
$tree = core_user\output\myprofile\manager::build_tree($user, $currentuser);
echo $renderer->render($tree);

if ($currentuser) {
    echo '</div>'; // #twings-tab-moodle
    ?>
    <script>
    (function() {
        const app = document.getElementById('twings-portal-app');
        if (!app) return;
        const userEmail = app.getAttribute('data-user-email');
        const userName = app.getAttribute('data-user-name');
        const loadingEl = document.getElementById('twings-loading');
        const contentEl = document.getElementById('twings-content');
        const moodleTabEl = document.getElementById('twings-tab-moodle');
        const tabBtns = document.querySelectorAll('.twings-tab-btn');

        let accountData = null;
        let activeTab = 'tab-finance';

        function formatVND(n) {
            return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' đ';
        }
        function formatDate(d) {
            if (!d) return '';
            const dt = new Date(d);
            return dt.toLocaleDateString('vi-VN');
        }

        // Tab switching
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const target = this.getAttribute('data-tab');
                activeTab = target;
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                document.querySelectorAll('.twings-tab-panel').forEach(p => p.style.display = 'none');
                if (target === 'tab-moodle') {
                    if (moodleTabEl) moodleTabEl.style.display = 'block';
                    contentEl.style.display = 'none';
                } else {
                    if (moodleTabEl) moodleTabEl.style.display = 'none';
                    contentEl.style.display = 'block';
                    const panel = document.getElementById('twings-' + target);
                    if (panel) panel.style.display = 'block';
                }
            });
        });

        // Copy text helper
        window.twingsCopy = function(text, btn) {
            navigator.clipboard.writeText(text).then(() => {
                const old = btn.innerHTML;
                btn.innerHTML = '<span class="text-success font-weight-bold">✓ Đã chép</span>';
                setTimeout(() => { btn.innerHTML = old; }, 1800);
            });
        };

        // Render full portal
        function renderPortal(acc) {
            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
            accountData = acc;

            if (!acc || !acc.authenticated) {
                renderUnauthenticated();
                return;
            }

            const orders = acc.orders || [];
            let financeHtml = renderFinanceSection(orders);
            let dossierHtml = renderDossierSection(orders);
            let coursesHtml = renderCoursesSection(orders);

            contentEl.innerHTML = `
                <div id="twings-tab-finance" class="twings-tab-panel" style="${activeTab === 'tab-finance' ? 'display:block;' : 'display:none;'}">
                    ${financeHtml}
                </div>
                <div id="twings-tab-dossier" class="twings-tab-panel" style="${activeTab === 'tab-dossier' ? 'display:block;' : 'display:none;'}">
                    ${dossierHtml}
                </div>
                <div id="twings-tab-courses" class="twings-tab-panel" style="${activeTab === 'tab-courses' ? 'display:block;' : 'display:none;'}">
                    ${coursesHtml}
                </div>
            `;
            attachInteractiveEvents();
        }

        function renderUnauthenticated() {
            contentEl.innerHTML = `
                <div class="card border-0 shadow-sm p-4 p-md-5 text-center bg-white rounded-xl mb-4">
                    <div class="mb-3">
                        <span class="d-inline-flex align-items-center justify-content-center bg-light rounded-circle" style="width:64px;height:64px;">
                            <svg class="text-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </span>
                    </div>
                    <h4 class="font-weight-bold text-dark mb-2">Đồng bộ hồ sơ học phí & đơn hàng TWings</h4>
                    <p class="text-muted small mx-auto mb-4" style="max-w: 480px;">
                        Tài khoản Moodle của bạn là <strong>${userEmail}</strong>. Nhấn gửi mã để đồng bộ tức thì các quyền lợi, hóa đơn VAT, học phí và trả góp mà không cần mật khẩu.
                    </p>
                    <div id="twings-otp-box" class="mx-auto" style="max-width: 360px;">
                        <button type="button" id="twings-send-otp-btn" class="btn btn-primary btn-block font-weight-bold py-2 rounded-lg">
                            Gửi mã xác thực qua Email
                        </button>
                        <div id="twings-otp-input-area" class="mt-3" style="display:none;">
                            <input type="text" id="twings-otp-code" class="form-control text-center font-weight-bold" maxlength="6" placeholder="Nhập mã 6 chữ số" style="letter-spacing: 0.3em; font-size: 1.25rem;">
                            <button type="button" id="twings-verify-otp-btn" class="btn btn-success btn-block font-weight-bold mt-2 py-2 rounded-lg">
                                Xác thực & Xem hồ sơ
                            </button>
                        </div>
                        <div id="twings-otp-msg" class="small mt-2"></div>
                    </div>
                </div>
            `;
            const sendBtn = document.getElementById('twings-send-otp-btn');
            const verifyBtn = document.getElementById('twings-verify-otp-btn');
            const inputArea = document.getElementById('twings-otp-input-area');
            const msgEl = document.getElementById('twings-otp-msg');
            const codeInput = document.getElementById('twings-otp-code');

            if (sendBtn) {
                sendBtn.addEventListener('click', async () => {
                    sendBtn.disabled = true;
                    sendBtn.innerText = 'Đang gửi mã…';
                    msgEl.innerText = '';
                    try {
                        const res = await fetch('/api/v1/public/account/send-code/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: userEmail })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.detail || data.message || 'Lỗi gửi mã');
                        sendBtn.style.display = 'none';
                        inputArea.style.display = 'block';
                        msgEl.className = 'text-success small mt-2';
                        msgEl.innerText = 'Mã 6 chữ số đã được gửi tới ' + userEmail;
                    } catch (err) {
                        sendBtn.disabled = false;
                        sendBtn.innerText = 'Gửi lại mã';
                        msgEl.className = 'text-danger small mt-2';
                        msgEl.innerText = err.message;
                    }
                });
            }

            if (verifyBtn) {
                verifyBtn.addEventListener('click', async () => {
                    const code = (codeInput.value || '').trim();
                    if (code.length !== 6) return;
                    verifyBtn.disabled = true;
                    verifyBtn.innerText = 'Đang kiểm tra…';
                    msgEl.innerText = '';
                    try {
                        const res = await fetch('/api/v1/public/account/verify/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: userEmail, code: code })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.detail || data.message || 'Mã không đúng');
                        // Reload account
                        loadAccount();
                    } catch (err) {
                        verifyBtn.disabled = false;
                        verifyBtn.innerText = 'Xác thực lại';
                        msgEl.className = 'text-danger small mt-2';
                        msgEl.innerText = err.message;
                    }
                });
            }
        }

        function renderFinanceSection(orders) {
            if (orders.length === 0) {
                return `
                    <div class="card border-0 shadow-sm p-4 text-center rounded-xl">
                        <p class="text-muted mb-2">Chưa có đơn hàng hoặc học phí nào được kích hoạt với email này.</p>
                        <a href="/khoa-hoc" class="btn btn-outline-primary btn-sm mx-auto">Xem danh sách khóa học & chương trình</a>
                    </div>
                `;
            }

            return orders.map(o => {
                const p = o.payment;
                const installments = o.installments || [];
                const remaining = Math.max(o.amount - o.totalPaid, 0);

                let paymentBoxHtml = '';
                if (p && o.status === 'pending') {
                    paymentBoxHtml = `
                        <div class="twings-payment-box mt-3 p-3 bg-light rounded-lg border border-primary-subtle d-flex flex-column flex-md-row align-items-center gap-3">
                            <img src="${p.qrImageUrl}" alt="VietQR" class="rounded bg-white p-1 border shadow-2xs" style="width:130px;height:130px;object-fit:contain;">
                            <div class="flex-grow-1 small w-100">
                                <div class="font-weight-bold text-primary mb-1 h6">Cần chuyển khoản: ${formatVND(p.amount)}</div>
                                <div>Ngân hàng: <strong>${p.bankName}</strong></div>
                                <div class="d-flex align-items-center gap-2 my-1">
                                    Số tài khoản: <strong class="text-monospace">${p.accountNumber}</strong>
                                    <button type="button" class="btn btn-sm btn-light py-0 px-2" onclick="twingsCopy('${p.accountNumber}', this)">Copy</button>
                                </div>
                                <div>Chủ tài khoản: <strong>${p.accountName}</strong></div>
                                <div class="d-flex align-items-center gap-2 mt-1">
                                    Nội dung: <strong class="text-monospace text-danger">${p.transferContent}</strong>
                                    <button type="button" class="btn btn-sm btn-light py-0 px-2" onclick="twingsCopy('${p.transferContent}', this)">Copy</button>
                                </div>
                                <div class="text-muted mt-1 font-italic" style="font-size:11px;">Hệ thống TWings tự động kích hoạt sau khi nhận được tiền.</div>
                            </div>
                        </div>
                    `;
                }

                let installmentHtml = '';
                if (installments.length > 1) {
                    installmentHtml = `
                        <div class="mt-3 border rounded-lg overflow-hidden small">
                            <div class="bg-light px-3 py-2 font-weight-bold d-flex justify-content-between text-muted" style="font-size:11px;">
                                <span>TIẾN ĐỘ TRẢ GÓP</span>
                                <span>${installments.filter(i => i.paidAt).length}/${installments.length} kỳ đã đóng</span>
                            </div>
                            <div class="divide-y">
                                ${installments.map(i => `
                                    <div class="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                                        <span>Kỳ ${i.sequence} · hạn ${formatDate(i.dueDate)}</span>
                                        <span class="font-weight-bold">${formatVND(i.amount)}</span>
                                        <span class="badge ${i.paidAt ? 'badge-success' : (i.overdue ? 'badge-danger' : 'badge-light')}">
                                            ${i.paidAt ? 'Đã đóng' : (i.overdue ? 'Quá hạn' : 'Chưa đến hạn')}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="card border-0 shadow-sm rounded-xl p-4 mb-4 twings-order-card">
                        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 pb-3 border-bottom">
                            <div>
                                <span class="badge badge-primary py-1 px-2 mb-1">${o.kind === 'program' ? 'Chương trình trọn gói' : 'Khóa học thực chiến'} · Đơn #${o.orderCode}</span>
                                <h4 class="font-weight-bold text-dark mb-0">${o.title}</h4>
                                <div class="text-muted small mt-1">Ngày đăng ký: ${formatDate(o.createdAt)}</div>
                            </div>
                            <span class="badge ${o.status === 'paid' ? 'badge-success' : 'badge-warning'} py-1 px-3">
                                ${o.status === 'pending' && o.learningAccess ? 'Đang trả góp' : o.statusLabel}
                            </span>
                        </div>

                        <div class="row text-center mt-3 g-2 bg-light p-3 rounded-lg mx-0">
                            <div class="col-6 col-md-3">
                                <div class="text-muted" style="font-size:11px;">Học phí trọn gói</div>
                                <div class="font-weight-bold h6 mb-0 text-dark">${formatVND(o.amount)}</div>
                            </div>
                            <div class="col-6 col-md-3">
                                <div class="text-muted" style="font-size:11px;">Đã thanh toán</div>
                                <div class="font-weight-bold h6 mb-0 text-success">${formatVND(o.totalPaid)}</div>
                            </div>
                            <div class="col-6 col-md-3 mt-2 mt-md-0">
                                <div class="text-muted" style="font-size:11px;">Còn lại</div>
                                <div class="font-weight-bold h6 mb-0 text-warning">${formatVND(remaining)}</div>
                            </div>
                            <div class="col-6 col-md-3 mt-2 mt-md-0">
                                <div class="text-muted" style="font-size:11px;">Hoàn tiền</div>
                                <div class="font-weight-bold h6 mb-0 text-muted">${formatVND(o.refunded || 0)}</div>
                            </div>
                        </div>

                        ${installmentHtml}
                        ${paymentBoxHtml}

                        <!-- Action row: Invoice & Refund -->
                        <div class="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-3 border-top gap-2 small">
                            <button type="button" class="btn btn-sm btn-link text-muted p-0 twings-invoice-toggle-btn" data-code="${o.orderCode}">
                                ${o.invoice ? (o.invoice.status === 'issued' ? 'Đã xuất HĐ: ' + o.invoice.number : 'Đã yêu cầu xuất HĐ VAT') : 'Yêu cầu xuất hóa đơn VAT'}
                            </button>
                            ${(!o.refundRequested && o.refundable > 0) ? `
                                <button type="button" class="btn btn-sm btn-link text-danger p-0 twings-refund-toggle-btn" data-code="${o.orderCode}">
                                    Yêu cầu hoàn tiền
                                </button>
                            ` : (o.refundRequested ? '<span class="text-warning font-weight-bold">Đã gửi yêu cầu hoàn tiền</span>' : '')}
                        </div>

                        <!-- Expandable Invoice Box -->
                        <div id="twings-invoice-box-${o.orderCode}" class="twings-expand-box p-3 border rounded-lg mt-2 bg-light" style="display:none;">
                            <h6 class="font-weight-bold">Thông tin xuất hóa đơn VAT</h6>
                            <form onsubmit="twingsSubmitInvoice(event, '${o.orderCode}')" class="small">
                                <div class="form-row">
                                    <div class="col-12 col-md-6 mb-2">
                                        <input type="text" name="companyName" class="form-control form-control-sm" placeholder="Tên công ty / Đơn vị" required>
                                    </div>
                                    <div class="col-12 col-md-6 mb-2">
                                        <input type="text" name="taxCode" class="form-control form-control-sm" placeholder="Mã số thuế" required>
                                    </div>
                                    <div class="col-12 mb-2">
                                        <input type="text" name="address" class="form-control form-control-sm" placeholder="Địa chỉ công ty" required>
                                    </div>
                                    <div class="col-12 col-md-6 mb-2">
                                        <input type="email" name="email" value="${userEmail}" class="form-control form-control-sm" placeholder="Email nhận hóa đơn" required>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary btn-sm font-weight-bold">Gửi yêu cầu xuất hóa đơn</button>
                                <span class="twings-invoice-msg ml-2 small"></span>
                            </form>
                        </div>

                        <!-- Expandable Refund Box -->
                        <div id="twings-refund-box-${o.orderCode}" class="twings-expand-box p-3 border rounded-lg mt-2 bg-light" style="display:none;">
                            <h6 class="font-weight-bold text-danger">Yêu cầu hoàn tiền đơn hàng</h6>
                            <form onsubmit="twingsSubmitRefund(event, '${o.orderCode}')" class="small">
                                <textarea name="reason" rows="2" class="form-control form-control-sm mb-2" placeholder="Lý do hoàn tiền (tối thiểu 10 ký tự)" required></textarea>
                                <button type="submit" class="btn btn-danger btn-sm font-weight-bold">Xác nhận gửi yêu cầu</button>
                                <span class="twings-refund-msg ml-2 small"></span>
                            </form>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderDossierSection(orders) {
            const activeOrder = orders.find(o => o.learningAccess) || orders[0];
            if (!activeOrder) {
                return '<div class="card border-0 shadow-sm p-4 text-center text-muted rounded-xl">Chưa có thông tin hồ sơ nhập học.</div>';
            }

            return `
                <div class="card border-0 shadow-sm rounded-xl p-4 mb-4">
                    <div class="d-flex justify-content-between align-items-center pb-3 border-bottom mb-3">
                        <div>
                            <h4 class="font-weight-bold text-dark mb-1">Hồ sơ học viên & CV</h4>
                            <p class="text-muted small mb-0">Thông tin đăng ký nhập học chính thức tại TWings Academy (Số CCCD được mã hóa an toàn khi lưu).</p>
                        </div>
                        <span class="badge ${activeOrder.dossierMissing && activeOrder.dossierMissing.length ? 'badge-warning' : 'badge-success'} py-1 px-3">
                            ${activeOrder.dossierMissing && activeOrder.dossierMissing.length ? 'Còn thiếu ' + activeOrder.dossierMissing.length + ' mục' : 'Hồ sơ đã hoàn tất'}
                        </span>
                    </div>

                    <form id="twings-dossier-form" onsubmit="twingsSaveDossier(event, '${activeOrder.orderCode}')" class="small">
                        <div class="row g-2">
                            <div class="col-12 col-md-4 mb-2">
                                <label class="font-weight-bold text-muted mb-1">Ngày sinh *</label>
                                <input type="date" name="birthDate" class="form-control form-control-sm" required>
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <label class="font-weight-bold text-muted mb-1">Giới tính</label>
                                <select name="gender" class="form-control form-control-sm">
                                    <option value="">–</option>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <label class="font-weight-bold text-muted mb-1">Số CCCD *</label>
                                <input type="text" name="citizenId" maxlength="12" class="form-control form-control-sm" placeholder="Số căn cước công dân" required>
                            </div>
                            <div class="col-12 col-md-6 mb-2">
                                <label class="font-weight-bold text-muted mb-1">Địa chỉ thường trú *</label>
                                <input type="text" name="permanentAddress" class="form-control form-control-sm" placeholder="Theo CCCD" required>
                            </div>
                            <div class="col-12 col-md-6 mb-2">
                                <label class="font-weight-bold text-muted mb-1">Nơi ở hiện tại</label>
                                <input type="text" name="currentResidence" class="form-control form-control-sm" placeholder="Tỉnh/Thành phố, Quận/Huyện">
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <label class="font-weight-bold text-muted mb-1">Trình độ học vấn *</label>
                                <input type="text" name="educationLevel" class="form-control form-control-sm" placeholder="VD: Đại học / Cao đẳng" required>
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <label class="font-weight-bold text-muted mb-1">Trường đại học</label>
                                <input type="text" name="university" class="form-control form-control-sm" placeholder="Tên trường đã/đang theo học">
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <label class="font-weight-bold text-muted mb-1">Năm tốt nghiệp</label>
                                <input type="text" name="graduationYear" class="form-control form-control-sm" placeholder="VD: 2024">
                            </div>
                        </div>

                        <div class="d-flex flex-wrap align-items-center gap-3 pt-3 mt-3 border-top">
                            <button type="submit" id="twings-save-dossier-btn" class="btn btn-primary btn-sm font-weight-bold py-2 px-3">
                                Lưu hồ sơ nhập học
                            </button>
                            <label class="btn btn-outline-secondary btn-sm py-2 px-3 mb-0 cursor-pointer">
                                <span>📄 Tải CV lên (PDF/DOCX, ≤ 5MB)</span>
                                <input type="file" accept=".pdf,.docx" class="d-none" onchange="twingsUploadCv(this, '${activeOrder.orderCode}')">
                            </label>
                            <span id="twings-dossier-msg" class="small"></span>
                        </div>
                    </form>
                </div>
            `;
        }

        function renderCoursesSection(orders) {
            const allCourses = orders.flatMap(o => o.courses || []);
            if (allCourses.length === 0) {
                return '<div class="card border-0 shadow-sm p-4 text-center text-muted rounded-xl">Chưa có khóa học nào.</div>';
            }

            return `
                <div class="space-y-3">
                    ${allCourses.map(c => `
                        <div class="card border-0 shadow-sm rounded-xl p-4 mb-3">
                            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                                <div>
                                    <h5 class="font-weight-bold text-dark mb-1">${c.title}</h5>
                                    <div class="text-muted small">
                                        ${c.cohort_name ? `<span class="badge badge-light mr-1">Lớp: ${c.cohort_name}</span>` : ''}
                                        ${c.start_date ? `<span>Khai giảng: ${formatDate(c.start_date)}</span>` : ''}
                                        <span class="ml-1 text-primary font-weight-bold">· ${c.lms_status_label || 'Đang mở'}</span>
                                    </div>
                                </div>
                                <a href="/learn/my/" class="btn btn-sm btn-primary font-weight-bold">Vào học ngay →</a>
                            </div>

                            ${c.progress !== null ? `
                                <div class="mt-2 bg-light p-2 rounded-lg">
                                    <div class="d-flex justify-content-between small mb-1">
                                        <span class="text-muted font-weight-bold" style="font-size:11px;">Tiến độ hoàn thành</span>
                                        <span class="font-weight-bold text-primary">${c.progress}%</span>
                                    </div>
                                    <div class="progress" style="height: 6px;">
                                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${c.progress}%;"></div>
                                    </div>
                                </div>
                            ` : ''}

                            ${c.certificate ? `
                                <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top small">
                                    <span class="badge badge-success py-1 px-2">✓ Đã cấp chứng chỉ</span>
                                    <a href="${c.certificate.url}" target="_blank" class="font-weight-bold text-primary">Xem chứng chỉ (${c.certificate.code})</a>
                                    <a href="${c.certificate.url}in/" target="_blank" class="text-muted ml-2">Tải bản in / PDF</a>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        function attachInteractiveEvents() {
            document.querySelectorAll('.twings-invoice-toggle-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const code = this.getAttribute('data-code');
                    const box = document.getElementById('twings-invoice-box-' + code);
                    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
                });
            });
            document.querySelectorAll('.twings-refund-toggle-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const code = this.getAttribute('data-code');
                    const box = document.getElementById('twings-refund-box-' + code);
                    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
                });
            });
        }

        window.twingsSubmitInvoice = async function(e, orderCode) {
            e.preventDefault();
            const form = e.target;
            const msgEl = form.querySelector('.twings-invoice-msg');
            msgEl.innerText = 'Đang gửi…';
            try {
                const body = {
                    buyerType: 'company',
                    companyName: form.companyName.value.trim(),
                    taxCode: form.taxCode.value.trim(),
                    address: form.address.value.trim(),
                    email: form.email.value.trim()
                };
                const res = await fetch(`/api/v1/public/account/orders/${orderCode}/invoice/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!res.ok) throw new Error('Không gửi được yêu cầu');
                msgEl.className = 'twings-invoice-msg text-success ml-2 small';
                msgEl.innerText = 'Đã tiếp nhận yêu cầu xuất hóa đơn VAT!';
            } catch (err) {
                msgEl.className = 'twings-invoice-msg text-danger ml-2 small';
                msgEl.innerText = err.message;
            }
        };

        window.twingsSubmitRefund = async function(e, orderCode) {
            e.preventDefault();
            const form = e.target;
            const msgEl = form.querySelector('.twings-refund-msg');
            msgEl.innerText = 'Đang gửi…';
            try {
                const res = await fetch(`/api/v1/public/account/orders/${orderCode}/refund-request/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: form.reason.value.trim() })
                });
                if (!res.ok) throw new Error('Không gửi được yêu cầu');
                msgEl.className = 'twings-refund-msg text-success ml-2 small';
                msgEl.innerText = 'Đã gửi yêu cầu hoàn tiền thành công!';
            } catch (err) {
                msgEl.className = 'twings-refund-msg text-danger ml-2 small';
                msgEl.innerText = err.message;
            }
        };

        window.twingsSaveDossier = async function(e, orderCode) {
            e.preventDefault();
            const form = e.target;
            const msgEl = document.getElementById('twings-dossier-msg');
            const btn = document.getElementById('twings-save-dossier-btn');
            btn.disabled = true;
            msgEl.innerText = 'Đang lưu…';
            try {
                const body = {
                    birthDate: form.birthDate.value || null,
                    gender: form.gender.value,
                    citizenId: form.citizenId.value,
                    permanentAddress: form.permanentAddress.value,
                    currentResidence: form.currentResidence.value,
                    educationLevel: form.educationLevel.value,
                    university: form.university.value,
                    graduationYear: form.graduationYear.value
                };
                const res = await fetch(`/api/v1/public/account/orders/${orderCode}/dossier/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!res.ok) throw new Error('Không lưu được hồ sơ');
                msgEl.className = 'text-success font-weight-bold ml-2';
                msgEl.innerText = '✓ Đã lưu hồ sơ thành công!';
            } catch (err) {
                msgEl.className = 'text-danger font-weight-bold ml-2';
                msgEl.innerText = err.message;
            } finally {
                btn.disabled = false;
            }
        };

        window.twingsUploadCv = async function(input, orderCode) {
            const file = input.files && input.files[0];
            if (!file) return;
            const msgEl = document.getElementById('twings-dossier-msg');
            msgEl.className = 'text-muted small ml-2';
            msgEl.innerText = 'Đang tải CV lên…';
            const formData = new FormData();
            formData.append('cv', file);
            try {
                const res = await fetch(`/api/v1/public/account/orders/${orderCode}/cv/`, {
                    method: 'POST',
                    body: formData
                });
                if (!res.ok) throw new Error('Không tải được CV');
                msgEl.className = 'text-success font-weight-bold ml-2';
                msgEl.innerText = '✓ Đã tải CV thành công!';
            } catch (err) {
                msgEl.className = 'text-danger font-weight-bold ml-2';
                msgEl.innerText = err.message;
            }
        };

        // Load account data
        async function loadAccount() {
            try {
                const res = await fetch('/api/v1/public/account/');
                const data = await res.json();
                renderPortal(data);
            } catch (e) {
                renderPortal({ authenticated: false });
            }
        }

        loadAccount();
    })();
    </script>
    <?php
}

echo '</div>';  // Userprofile class.

echo $OUTPUT->footer();
