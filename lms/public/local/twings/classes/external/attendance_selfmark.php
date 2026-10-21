<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

namespace local_twings\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Turns student self-marking on or off for one attendance session, with mod_attendance's rotating QR
 * code (a new code every few seconds, so a photo of it cannot be shared) and the status assigned
 * automatically from the time of the scan. mod_attendance_add_session has no parameter for these, so
 * TWings sets them here after creating the session (corporate classes check in by QR).
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class attendance_selfmark extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'sessionid' => new external_value(PARAM_INT, 'attendance session id'),
            'enabled' => new external_value(PARAM_BOOL, 'students mark their own attendance'),
            'rotateqrcode' => new external_value(PARAM_BOOL, 'rotating QR code (anti-sharing)', VALUE_DEFAULT, true),
            'autoassignstatus' => new external_value(PARAM_BOOL, 'status from the scan time', VALUE_DEFAULT, true),
        ]);
    }

    /**
     * Update the session.
     *
     * @param int $sessionid
     * @param bool $enabled
     * @param bool $rotateqrcode
     * @param bool $autoassignstatus
     * @return array
     */
    public static function execute(int $sessionid, bool $enabled, bool $rotateqrcode = true,
            bool $autoassignstatus = true): array {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/mod/attendance/locallib.php');

        $params = self::validate_parameters(self::execute_parameters(), compact(
            'sessionid', 'enabled', 'rotateqrcode', 'autoassignstatus'));
        $session = $DB->get_record('attendance_sessions', ['id' => $params['sessionid']], '*', MUST_EXIST);
        $cm = get_coursemodule_from_instance('attendance', $session->attendanceid, 0, false, MUST_EXIST);
        $context = \context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('mod/attendance:manageattendances', $context);

        $rotate = $params['enabled'] && $params['rotateqrcode'];
        $DB->update_record('attendance_sessions', (object) [
            'id' => $session->id,
            'studentscanmark' => (int) $params['enabled'],
            'autoassignstatus' => (int) ($params['enabled'] && $params['autoassignstatus']),
            'includeqrcode' => 0,
            'rotateqrcode' => (int) $rotate,
            // A rotating QR code needs its own password and secret (as the session form sets them).
            'studentpassword' => $rotate ? attendance_random_string() : '',
            'rotateqrcodesecret' => $rotate ? attendance_random_string() : '',
        ]);
        return ['sessionid' => (int) $session->id, 'studentscanmark' => $params['enabled'], 'rotateqrcode' => $rotate];
    }

    /**
     * Result.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'sessionid' => new external_value(PARAM_INT, 'attendance session id'),
            'studentscanmark' => new external_value(PARAM_BOOL, 'self-marking on'),
            'rotateqrcode' => new external_value(PARAM_BOOL, 'rotating QR code on'),
        ]);
    }
}
