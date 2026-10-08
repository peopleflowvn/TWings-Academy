<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

/**
 * TWings Academy theme: Boost with the website's brand (colours, Plus Jakarta Sans, cards).
 *
 * @package    theme_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'theme_twings';
$plugin->version   = 2026100800;  // YYYYMMDDXX.
$plugin->requires  = 2026042000;  // Moodle 5.2.
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
$plugin->dependencies = ['theme_boost' => 2026042000];
