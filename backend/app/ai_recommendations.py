import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
import httpx
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Ensure .env is loaded from project root or backend root
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
load_dotenv(_PROJECT_ROOT / ".env")
load_dotenv(_BACKEND_DIR / ".env")

logger = logging.getLogger("vikassetu.ai")

def get_groq_api_key() -> Optional[str]:
    """Retrieve Groq API key from environment without ever logging or exposing it."""
    # Ensure fresh read if .env was updated
    return (
        os.getenv("GROQ_API_KEY")
        or os.getenv("groq_api")
        or os.getenv("GROQ_API")
        or None
    )

def get_groq_model() -> str:
    """Configurable model ID, default to verified available model."""
    return os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

class RecommendationPedagogy(BaseModel):
    activity_id: str
    domain: str
    title: str
    reason: str
    observed_strengths: List[str] = Field(default_factory=list)
    focus_skills: List[str] = Field(default_factory=list)
    teaching_strategy: str
    teacher_steps: List[str] = Field(default_factory=list)
    success_criteria: str
    next_step_if_successful: str
    next_step_if_support_needed: str
    evidence: List[str] = Field(default_factory=list)
    is_ai_generated: bool = True

class ChildRecommendationResult(BaseModel):
    child_id: str
    recommendations: List[RecommendationPedagogy]
    generated_at: str
    model_used: Optional[str] = None
    fallback: bool = False
    fallback_reason: Optional[str] = None

def build_deterministic_item(
    child_id: str,
    domain: str,
    score: int,
    activity: Dict[str, Any],
    evidence_notes: List[str],
    child_strengths: List[str],
    child_needs: List[str],
    recent_outcomes: List[Dict[str, Any]],
) -> RecommendationPedagogy:
    """
    Structured fallback recommendation adhering strictly to the same rich schema.
    Provides sound pedagogical guidance even when AI is offline.
    """
    skills = activity.get("skills", [])
    activity_name = activity.get("name", "Learning Activity")
    act_id = activity.get("id", "")

    # Domain display name helper
    domain_titles = {
        "alphabet": "Alphabet & Language",
        "numbers": "Numbers & Counting",
        "colours": "Colours & Shapes",
        "art": "Art & Creativity",
        "stories": "Stories, Habits & Games",
    }
    dom_title = domain_titles.get(domain, domain.capitalize())

    # Build pedagogical reasoning
    if score == 1:
        prefix = f"Child is building foundational understanding in {dom_title} (Level 1/3)."
    elif score == 2:
        prefix = f"Child is developing fluency and independence in {dom_title} (Level 2/3)."
    else:
        prefix = f"Child has demonstrated mastery in {dom_title} (Level 3/3)."

    action_text = (
        f"{activity_name} offers creative extension and leadership practice in {', '.join(skills[:2])}."
        if score == 3
        else f"{activity_name} provides guided, hands-on practice in {', '.join(skills[:2])}."
    )
    evidence_text = f' Recent observation: "{evidence_notes[0]}".' if evidence_notes else ""
    reason = f"{prefix} {action_text}{evidence_text}"

    # Formulate teacher steps from activity steps
    steps = activity.get("steps", [])
    if not steps:
        steps = [
            f"Introduce {activity_name} using familiar physical examples.",
            f"Guide the child through the activity steps with clear prompts.",
            "Observe independent responses and offer gentle encouragement.",
        ]

    # Teaching strategy based on support needs
    support_logs = [
        log for log in recent_outcomes
        if log.get("outcome") == "tried_needs_support"
    ]

    if support_logs:
        prev_note = support_logs[0].get("note")
        note_snippet = f' (prior note: "{prev_note}")' if prev_note else ""
        strategy = (
            f"Support Adaptation: Since the child needed support in earlier practice{note_snippet}, "
            f"break {activity_name} into concrete micro-steps with hands-on manipulatives, immediate positive modeling, "
            f"and reduced choice complexity to build early confidence."
        )
    else:
        strategy = (
            f"Begin by reinforcing demonstrated strengths in {dom_title}, then introduce new concepts "
            f"one at a time with hands-on manipulatives."
        )

    # Observable success criteria
    success_criteria = (
        f"Child independently engages with {skills[0] if skills else 'the activity'} "
        f"and completes at least 2 key steps without requiring direct hand-over-hand prompting."
    )

    # Next steps
    next_step_success = (
        f"Reinforce mastery by introducing a slight variation or advancing to a higher difficulty activity in {dom_title}."
    )
    next_step_support = (
        f"Pair the child with a peer partner or simplify the task to fewer items with guided one-on-one prompts."
    )

    return RecommendationPedagogy(
        activity_id=act_id,
        domain=domain,
        title=f"Guided Practice: {activity_name}",
        reason=reason,
        observed_strengths=child_strengths if child_strengths else ["Curiosity and classroom participation"],
        focus_skills=skills if skills else [dom_title],
        teaching_strategy=strategy,
        teacher_steps=steps,
        success_criteria=success_criteria,
        next_step_if_successful=next_step_success,
        next_step_if_support_needed=next_step_support,
        evidence=evidence_notes[:3],
        is_ai_generated=False,
    )

async def generate_ai_recommendation(
    child_id: str,
    domain: str,
    score: int,
    candidate_activities: List[Dict[str, Any]],
    evidence_notes: List[str],
    child_strengths: List[str],
    child_needs: List[str],
    recent_logs: List[Dict[str, Any]],
    api_key_override: Optional[str] = None,
    child_age: Optional[float] = 4.0,
) -> RecommendationPedagogy:
    """
    Calls Groq to generate deeply personalized, observation-driven learning guidance.
    Enforces candidate catalog constraints and falls back deterministically on any failure.
    """
    if not candidate_activities:
        raise ValueError("No candidate activities supplied.")

    key = api_key_override or get_groq_api_key()
    if not key:
        logger.info("Groq API key not configured. Using deterministic fallback.")
        return build_deterministic_item(
            child_id, domain, score, candidate_activities[0],
            evidence_notes, child_strengths, child_needs, recent_logs
        )

    # Anonymized child learning profile (NO child ID, NO names, NO personal PII sent to Groq)
    child_context = {
        "age_years": child_age or 4.0,
        "learning_domain": domain,
        "current_level": f"Level {score}/3",
        "demonstrated_strengths": child_strengths,
        "current_needs": child_needs,
        "classroom_observations": evidence_notes[:5],
        "recent_activity_trials": [
            {
                "activity_id": log.get("activity_id"),
                "outcome": log.get("outcome"),
                "teacher_note": log.get("note"),
            }
            for log in recent_logs[:5]
        ],
    }

    # Candidate catalog with only necessary activity info
    candidates_data = [
        {
            "id": act["id"],
            "name": act["name"],
            "difficulty": act.get("difficulty"),
            "minutes": act.get("minutes"),
            "skills": act.get("skills", []),
            "steps": act.get("steps", []),
        }
        for act in candidate_activities
    ]

    valid_activity_ids = {act["id"] for act in candidate_activities}

    system_prompt = (
        "You are an expert early childhood pedagogical specialist for the VikasSetu preschool learning platform.\n"
        "Your task is to analyze the child's age, developmental needs, demonstrated strengths, and observational evidence, and recommend the single most suitable activity from the candidate activities list.\n\n"
        "MANDATORY RULES:\n"
        "1. 'activity_id' MUST EXACTLY match one of the candidate activity IDs provided. Never invent or alter activity IDs.\n"
        "2. Ground the recommendation in real observations and learning needs. Match the child's age and specific developmental focus areas with the candidate activity that best addresses them.\n"
        "3. Provide concrete, actionable teaching steps for the teacher using simple, everyday English.\n"
        "4. Provide an observable and measurable success criterion (how the teacher knows the child succeeded).\n"
        "5. Provide actionable next steps for both outcomes: (a) if the child succeeds, and (b) if the child needs support.\n"
        "6. ACTIVITY ROTATION & SCAFFOLDING: Never recommend an activity that the child has already completed. Choose exclusively from the provided candidate activities list. If the child previously needed support (tried_needs_support), explicitly tailor the 'teaching_strategy' and 'next_step_if_support_needed' with scaffolded adaptations (e.g. fewer objects, concrete tactile aids, paired modeling) directly addressing that prior struggle.\n"
        "7. Return ONLY a valid JSON object matching the requested schema.\n"
    )

    user_prompt = f"""
Child Learning Context:
{json.dumps(child_context, indent=2)}

Candidate Activities (Select ONE from this list):
{json.dumps(candidates_data, indent=2)}

Respond with a JSON object with this exact structure:
{{
  "activity_id": "ONE_VALID_ID_FROM_CANDIDATES",
  "domain": "{domain}",
  "title": "A short engaging recommendation title",
  "reason": "Detailed, evidence-based reason explaining why this activity fits the child's exact observational needs and strengths",
  "observed_strengths": ["Demonstrated skills supported by evidence"],
  "focus_skills": ["Specific skills to practice during this activity"],
  "teaching_strategy": "Concrete pedagogical strategy for the teacher to apply during the activity",
  "teacher_steps": [
    "Step 1: Specific action for teacher",
    "Step 2: Specific action for teacher",
    "Step 3: Specific action for teacher"
  ],
  "success_criteria": "Observable, measurable criterion for successful completion",
  "next_step_if_successful": "Appropriate pedagogical progression if the child succeeds",
  "next_step_if_support_needed": "How to adapt, simplify, or scaffold if the child struggles",
  "evidence": ["Direct reference to observations or trial notes used"]
}}
"""

    model_name = get_groq_model()

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3,
                },
            )

        if response.status_code != 200:
            logger.warning(f"Groq API returned HTTP {response.status_code}. Using fallback.")
            return build_deterministic_item(
                child_id, domain, score, candidate_activities[0],
                evidence_notes, child_strengths, child_needs, recent_logs
            )

        payload = response.json()
        raw_content = payload["choices"][0]["message"]["content"]
        data = json.loads(raw_content)

        # Validate activity ID is in valid candidates and ensure all fields match it
        chosen_id = data.get("activity_id")
        was_hallucinated = chosen_id not in valid_activity_ids
        matching_act = next((a for a in candidate_activities if a["id"] == chosen_id), None)
        if not matching_act:
            logger.warning(
                f"Groq returned activity_id '{chosen_id}' not in candidate list. Correcting to first candidate."
            )
            matching_act = candidate_activities[0]
            chosen_id = matching_act["id"]

        activity_name = matching_act.get("name", "Learning Activity")
        raw_title = str(data.get("title", "")).strip()
        if was_hallucinated or not raw_title:
            title = f"Guided Practice: {activity_name}"
        else:
            title = raw_title

        teacher_steps = list(data.get("teacher_steps", []))
        if not teacher_steps or len(teacher_steps) < 2:
            teacher_steps = list(matching_act.get("steps", []))

        focus_skills = list(data.get("focus_skills", []))
        if not focus_skills:
            focus_skills = list(matching_act.get("skills", []))

        return RecommendationPedagogy(
            activity_id=chosen_id,
            domain=matching_act.get("domain", domain),
            title=title,
            reason=str(data.get("reason", f"Personalized learning recommendation for {activity_name}.")),
            observed_strengths=list(data.get("observed_strengths", child_strengths)),
            focus_skills=focus_skills,
            teaching_strategy=str(data.get("teaching_strategy", "")),
            teacher_steps=teacher_steps,
            success_criteria=str(data.get("success_criteria", "")),
            next_step_if_successful=str(data.get("next_step_if_successful", "")),
            next_step_if_support_needed=str(data.get("next_step_if_support_needed", "")),
            evidence=list(data.get("evidence", evidence_notes[:2])),
            is_ai_generated=True,
        )

    except (httpx.TimeoutException, httpx.RequestError) as net_err:
        logger.warning(f"Network error or timeout connecting to Groq: {net_err}. Using fallback.")
        return build_deterministic_item(
            child_id, domain, score, candidate_activities[0],
            evidence_notes, child_strengths, child_needs, recent_logs
        )
    except (json.JSONDecodeError, KeyError, Exception) as parse_err:
        logger.warning(f"Error parsing Groq response: {parse_err}. Using fallback.")
        return build_deterministic_item(
            child_id, domain, score, candidate_activities[0],
            evidence_notes, child_strengths, child_needs, recent_logs
        )
