# local_twings

TWings Academy's own Moodle plugin: the place for TWings-specific behaviour (event observers that
notify the TWings backend, extra pages, scheduled tasks, settings, web service functions...).

This directory is owned by TWings: it is not upstream code, so changes here need no entry in
`infra/lms/patches.txt`. Prefer a plugin (this one, `theme_twings`, a block...) over editing Moodle core;
see [docs/LMS.md](../../../../docs/LMS.md).

After a change that Moodle must install (db/*.php, new capabilities, tasks, services), bump
`$plugin->version` in `version.php`: deploy runs Moodle's upgrade.
