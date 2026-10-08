<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

namespace local_twings\task;

/**
 * Posts {courseid, userid, ts} to the TWings backend on the internal Docker network, signed with
 * HMAC-SHA256 (key derived from the web service token both sides share, see backend apps/lms/webhooks.py).
 * Throwing makes Moodle retry the task later; TWings' 30-minute sync reconciles anything lost.
 *
 * @package    local_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class notify_twings extends \core\task\adhoc_task {
    /**
     * Send the notification.
     */
    public function execute() {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');

        $token = getenv('MOODLE_WS_TOKEN');
        if (!$token) {
            mtrace('local_twings: MOODLE_WS_TOKEN not set, TWings not notified');
            return;
        }
        $data = $this->get_custom_data();
        $body = json_encode(['courseid' => (int) $data->courseid, 'userid' => (int) $data->userid, 'ts' => time()]);
        $key = hash('sha256', 'twings-lms-events:' . $token, true);
        $url = (getenv('TWINGS_BACKEND_URL') ?: 'http://backend:8000') . '/api/v1/webhooks/lms/';

        // Our own call to the TWings backend only: Moodle's SSRF guard (curlsecurityblockedhosts)
        // stays in force for every other outgoing request.
        $curl = new \curl(['ignoresecurity' => true]);
        $curl->setHeader(['Content-Type: application/json', 'X-TWings-Signature: ' . hash_hmac('sha256', $body, $key)]);
        $curl->post($url, $body, ['CURLOPT_TIMEOUT' => 15, 'CURLOPT_CONNECTTIMEOUT' => 5]);
        $code = (int) ($curl->get_info()['http_code'] ?? 0);
        if ($code < 200 || $code >= 300) {
            throw new \moodle_exception('notifyfailed', 'local_twings', '', $code);
        }
    }
}
