<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

namespace local_twings\privacy;

/**
 * Privacy API: local_twings stores no personal data (update this when it starts to).
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements \core_privacy\local\metadata\null_provider {
    /**
     * Language string explaining why no data is stored.
     *
     * @return string
     */
    public static function get_reason(): string {
        return 'privacy:metadata';
    }
}
