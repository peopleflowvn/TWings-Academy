<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

namespace local_twings;

use core\hook\navigation\primary_extend;
use navigation_node;

/**
 * One learner portal at /learn: Moodle's own pages (courses, grades, calendar) plus the TWings pages
 * served under the same path (/learn/tai-khoan: fees, installments, invoices, enrolment documents,
 * certificates), all reachable from Moodle's primary navigation.
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * Adds "Học phí & hồ sơ" (the TWings account page of the portal) for signed-in users.
     *
     * @param primary_extend $hook
     */
    public static function primary_extend(primary_extend $hook): void {
        if (!isloggedin() || isguestuser()) {
            return;
        }
        $hook->get_primaryview()->add(
            get_string('account', 'local_twings'),
            new \moodle_url('/tai-khoan'),
            navigation_node::TYPE_CUSTOM,
            null,
            'twingsaccount'
        );
    }
}
