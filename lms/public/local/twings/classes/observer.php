<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

namespace local_twings;

/**
 * Tells TWings that a learner's progress changed. The observer only queues an ad-hoc task (no network
 * call while a teacher saves grades or attendance); identical pending notifications are merged.
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class observer {
    /**
     * Course completed, user graded, attendance taken.
     *
     * @param \core\event\base $event
     */
    public static function learning_changed(\core\event\base $event): void {
        if (empty($event->courseid) || $event->courseid == SITEID) {
            return;
        }
        $task = new task\notify_twings();
        $task->set_custom_data([
            'courseid' => (int) $event->courseid,
            // The learner concerned (graded / completed); for attendance, the teacher who took it.
            'userid' => (int) ($event->relateduserid ?: $event->userid),
        ]);
        \core\task\manager::queue_adhoc_task($task, true);
    }
}
