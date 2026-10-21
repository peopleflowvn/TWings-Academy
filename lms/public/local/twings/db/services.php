<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

/**
 * Web service functions of local_twings, called by the TWings backend (twings_setup.php adds them to
 * the "twings" external service).
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_twings_attendance_selfmark' => [
        'classname' => 'local_twings\external\attendance_selfmark',
        'description' => 'Student self-marking with a rotating QR code for one attendance session.',
        'type' => 'write',
        'capabilities' => 'mod/attendance:manageattendances',
    ],
];
