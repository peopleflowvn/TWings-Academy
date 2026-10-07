<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

/**
 * TWings Academy customisations: owned by TWings (not vendored upstream code), see docs/LMS.md.
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_twings';
$plugin->version   = 2026100700;  // YYYYMMDDXX: bump on every change that needs a Moodle upgrade.
$plugin->requires  = 2026042000;  // Moodle 5.2.
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
