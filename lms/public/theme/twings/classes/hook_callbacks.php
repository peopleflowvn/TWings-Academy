<?php
// This file is part of TWings Academy's Moodle (lms/), GNU GPL v3 or later like Moodle itself.

namespace theme_twings;

use core\hook\output\before_standard_head_html_generation;

/**
 * Loads the website's font (Plus Jakarta Sans) when this theme is in use.
 *
 * @package    theme_twings
 * @copyright  2026 TWings Academy
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * Font links in the page head (a CSS @import in the compiled sheet would come after other rules).
     *
     * @param before_standard_head_html_generation $hook
     */
    public static function before_standard_head_html_generation(before_standard_head_html_generation $hook): void {
        global $PAGE;
        if ($PAGE->theme->name !== 'twings') {
            return;
        }
        $hook->add_html(
            '<link rel="preconnect" href="https://fonts.googleapis.com">'
            . '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            . '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">'
            . '<style>'
            . '#tw-learn-loader { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 999999; pointer-events: none; opacity: 0; transition: opacity .25s ease; }'
            . '#tw-learn-loader.active { opacity: 1; }'
            . '#tw-learn-loader-bar { height: 100%; width: 0%; background: linear-gradient(90deg, #00388A 0%, #0073C1 50%, #38BDF8 100%); box-shadow: 0 0 10px rgba(0, 115, 193, 0.7), 0 0 4px rgba(56, 189, 248, 0.6); transition: width .3s ease-out; }'
            . '</style>'
            . '<div id="tw-learn-loader"><div id="tw-learn-loader-bar"></div></div>'
            . '<script>'
            . '(function(){'
            . 'var bar = document.getElementById("tw-learn-loader-bar");'
            . 'var wrap = document.getElementById("tw-learn-loader");'
            . 'if (!bar || !wrap) return;'
            . 'var iv = null;'
            . 'function start() {'
            . '  wrap.classList.add("active");'
            . '  bar.style.width = "25%";'
            . '  if (iv) clearInterval(iv);'
            . '  iv = setInterval(function(){'
            . '    var w = parseFloat(bar.style.width) || 0;'
            . '    if (w < 85) bar.style.width = (w + Math.random() * 15 + 5) + "%";'
            . '    else clearInterval(iv);'
            . '  }, 200);'
            . '}'
            . 'function done() {'
            . '  if (iv) clearInterval(iv);'
            . '  bar.style.width = "100%";'
            . '  setTimeout(function(){'
            . '    wrap.classList.remove("active");'
            . '    setTimeout(function(){ bar.style.width = "0%"; }, 250);'
            . '  }, 300);'
            . '}'
            . 'start();'
            . 'window.addEventListener("load", done);'
            . 'document.addEventListener("click", function(e){'
            . '  var a = e.target.closest("a");'
            . '  if (!a || !a.href || a.target === "_blank" || a.href.indexOf("javascript:") === 0 || a.href.indexOf("#") === 0) return;'
            . '  if (a.origin === window.location.origin && !e.metaKey && !e.ctrlKey && !e.shiftKey) {'
            . '    start();'
            . '  }'
            . '});'
            . 'document.addEventListener("submit", function(){ start(); });'
            . '})();'
            . '</script>'
        );
    }
}
