<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

/**
 * Learning events TWings reacts to at once (certificates, risk, attendance figures).
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$observers = [];
foreach ([
    '\core\event\course_completed',
    '\core\event\user_graded',
    '\mod_attendance\event\attendance_taken',
    '\mod_attendance\event\attendance_taken_by_student',
] as $eventname) {
    $observers[] = ['eventname' => $eventname, 'callback' => '\local_twings\observer::learning_changed'];
}
