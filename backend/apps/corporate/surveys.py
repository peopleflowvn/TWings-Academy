"""
Surveys of corporate classes. They are Moodle feedback activities (mod_feedback: anonymous or named,
questions on a rating scale, numbers, text) placed in the course template, so every class course
copied from it has them. TWings only reads the results back (with the learning refresh, or on demand):
response count and rate, who answered when the survey is named, per-question results, satisfaction.
Course reviews on the website (catalog.CourseReview) are a different thing and stay separate.
"""

import json
import logging

from apps.lms import moodle

from .models import ClassSurvey

logger = logging.getLogger(__name__)

ANONYMOUS_YES = 1  # mod_feedback's FEEDBACK_ANONYMOUS_YES


def class_course_id(corporate_class) -> int | None:
    """The class's Moodle course (copied from the template for its intake)."""
    from apps.lms.models import LmsEnrollment
    from apps.lms.services import COHORT_PREFIX, _find_course

    known = (
        LmsEnrollment.objects.filter(cohort=corporate_class.cohort, moodle_course_id__isnull=False)
        .values_list("moodle_course_id", flat=True)
        .first()
    )
    if known:
        return known
    found = _find_course("idnumber", f"{COHORT_PREFIX}{corporate_class.cohort_id}")
    return found["id"] if found else None


def _item(entry: dict) -> dict:
    item = entry.get("item") or {}
    out = {
        "name": item.get("name", ""),
        "type": item.get("typ", ""),
        "average": None,
        "scale_max": None,
        "answers": [],
    }
    data = entry.get("data") or []
    if out["type"] == "multichoicerated":
        answers = [json.loads(d) if isinstance(d, str) else d for d in data]
        total = sum(int(a.get("answercount") or 0) for a in answers)
        out["answers"] = [
            {"text": a.get("answertext", ""), "count": int(a.get("answercount") or 0)} for a in answers
        ]
        if total:
            out["average"] = round(sum(float(a.get("avg") or 0) for a in answers), 2)
            out["scale_max"] = max(float(a.get("value") or 0) for a in answers) or None
    elif out["type"] == "numeric":
        values = [float(v) for v in data if str(v).strip() not in ("", "-")]
        out["average"] = round(sum(values) / len(values), 2) if values else None
    elif out["type"] == "multichoice":
        answers = [json.loads(d) if isinstance(d, str) else d for d in data]
        out["answers"] = [
            {"text": a.get("answertext", ""), "count": int(a.get("answercount") or 0)} for a in answers
        ]
    return out


def sync_surveys(corporate_class) -> list[ClassSurvey]:
    """Read every feedback activity of the class course; failures keep the last known results."""
    course_id = class_course_id(corporate_class)
    if course_id is None:
        return []
    try:
        feedbacks = moodle.call("mod_feedback_get_feedbacks_by_courses", courseids=[course_id]).get(
            "feedbacks", []
        )
    except moodle.MoodleError as exc:
        logger.warning("Surveys of corporate class %s unreadable: %s", corporate_class.pk, exc)
        return list(corporate_class.surveys.all())
    surveys = []
    for fb in feedbacks:
        try:
            analysis = moodle.call("mod_feedback_get_analysis", feedbackid=fb["id"])
            answers = moodle.call("mod_feedback_get_responses_analysis", feedbackid=fb["id"], perpage=0)
        except moodle.MoodleError as exc:
            logger.warning("Survey %s unreadable: %s", fb.get("id"), exc)
            continue
        items = [_item(e) for e in analysis.get("itemsdata", [])]
        rated = [i["average"] / i["scale_max"] for i in items if i["average"] is not None and i["scale_max"]]
        survey, _ = ClassSurvey.objects.update_or_create(
            corporate_class=corporate_class,
            moodle_feedback_id=fb["id"],
            defaults={
                "name": fb.get("name", "")[:300],
                "anonymous": int(fb.get("anonymous") or ANONYMOUS_YES) == ANONYMOUS_YES,
                "responses": int(answers.get("totalattempts") or 0)
                + int(answers.get("totalanonattempts") or 0),
                "respondents": sorted(
                    {int(a["userid"]) for a in answers.get("attempts", []) if a.get("userid")}
                ),
                "items": items,
                "satisfaction": round(100 * sum(rated) / len(rated), 1) if rated else None,
            },
        )
        surveys.append(survey)
    return surveys


def summary(corporate_class) -> dict:
    """Surveys with the response rate over the learners still on the list (the denominator)."""
    from apps.lms.models import LmsEnrollment

    listed = LmsEnrollment.objects.filter(
        corporate_enrollment__corporate_class=corporate_class,
        corporate_enrollment__status__in=("enrolled", "completed", "not_passed"),
    )
    learners = listed.count()
    user_ids = set(listed.exclude(moodle_user_id__isnull=True).values_list("moodle_user_id", flat=True))
    out = []
    for s in corporate_class.surveys.all():
        out.append(
            {
                "id": s.pk,
                "name": s.name,
                "anonymous": s.anonymous,
                "responses": s.responses,
                "learners": learners,
                "response_rate": round(100 * min(s.responses, learners) / learners) if learners else None,
                "respondents_listed": None if s.anonymous else len(user_ids & set(s.respondents)),
                "satisfaction": s.satisfaction,
                "items": s.items,
                "synced_at": s.synced_at,
            }
        )
    return {"learners": learners, "surveys": out}
