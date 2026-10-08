<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

/**
 * SCSS of the TWings theme: Boost's default preset between the brand variables and the brand rules.
 *
 * @package    theme_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Boost's default preset followed by TWings' rules.
 *
 * @param theme_config $theme
 * @return string
 */
function theme_twings_get_main_scss_content($theme): string {
    global $CFG;
    return file_get_contents($CFG->dirroot . '/theme/boost/scss/preset/default.scss')
        . "\n" . file_get_contents($CFG->dirroot . '/theme/twings/scss/post.scss');
}

/**
 * Bootstrap / Boost variables, set before the preset (same palette and font as the website).
 *
 * @param theme_config $theme
 * @return string
 */
function theme_twings_get_pre_scss($theme): string {
    global $CFG;
    return file_get_contents($CFG->dirroot . '/theme/twings/scss/pre.scss');
}
