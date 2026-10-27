<?php
// This file is part of TWings Academy's Moodle theme, GNU GPL v3 or later.

defined('MOODLE_INTERNAL') || die();

/**
 * A modern login page layout for the TWings theme.
 *
 * @package   theme_twings
 * @copyright 2026 TWings Academy
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$bodyattributes = $OUTPUT->body_attributes();

// Left-panel instructions.
$leftinstructions = !empty($CFG->auth_instructions)
    ? format_text($CFG->auth_instructions, FORMAT_MOODLE, ['context' => context_system::instance()])
    : null;

$templatecontext = [
    'sitename' => format_string($SITE->shortname, true, ['context' => context_course::instance(SITEID), "escape" => false]),
    'output' => $OUTPUT,
    'bodyattributes' => $bodyattributes,
    'leftinstructions' => $leftinstructions,
];

echo $OUTPUT->render_from_template('theme_twings/login', $templatecontext);
