<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

/**
 * Hook callbacks of local_twings.
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$callbacks = [
    [
        'hook' => \core\hook\navigation\primary_extend::class,
        'callback' => [\local_twings\hook_callbacks::class, 'primary_extend'],
    ],
];
