<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

namespace local_twings\privacy;

use core_privacy\local\metadata\collection;

/**
 * Privacy API: local_twings stores nothing itself; it tells the TWings backend (the organisation's own
 * system, where the learner's order and certificates live) which user's progress changed in which course.
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements \core_privacy\local\metadata\provider, \core_privacy\local\request\data_provider {
    /**
     * Data sent outside Moodle.
     *
     * @param collection $collection
     * @return collection
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_external_location_link('twings', [
            'userid' => 'privacy:metadata:twings:userid',
            'courseid' => 'privacy:metadata:twings:courseid',
        ], 'privacy:metadata:twings');
        return $collection;
    }
}
