"""
NPC Tier 3 — LLM-Powered Conversational AI for Elite NPCs.

Tier 3 NPCs use large language models for dynamic, contextual dialogue
that adapts to the player's dynasty history, world state, and social
relationships. These NPCs are rare (< 5% of population) and serve as
quest givers, faction leaders, mentors, and world-shaping characters.

Architecture:
  - System prompt templates per NPC archetype
  - Context injection from Loom game state
  - Response filtering for safety + lore consistency
  - Conversation memory with sliding window
  - Fallback to Tier 2 (ML) if LLM unavailable

Thread: steel/pipelines/npc-llm
Tier: 2
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol

logger = logging.getLogger("loom.npc.tier3")


# ─── NPC Archetypes ────────────────────────────────────────────

class NpcArchetype(Enum):
    QUEST_GIVER = "quest_giver"
    FACTION_LEADER = "faction_leader"
    MENTOR = "mentor"
    MERCHANT_ELITE = "merchant_elite"
    LORE_KEEPER = "lore_keeper"
    DIPLOMAT = "diplomat"
    MYSTIC = "mystic"
    ANTAGONIST = "antagonist"


# ─── Conversation Types ────────────────────────────────────────

@dataclass(frozen=True)
class ConversationMessage:
    role: str  # "system" | "user" | "assistant"
    content: str
    timestamp: float = 0.0


@dataclass
class ConversationContext:
    """Game state injected into the NPC's awareness."""
    npc_id: str
    npc_name: str
    archetype: NpcArchetype
    world_id: str
    location: str
    dynasty_id: str
    dynasty_name: str
    dynasty_reputation: float  # -1.0 to 1.0
    faction_standing: dict[str, float] = field(default_factory=dict)
    recent_world_events: list[str] = field(default_factory=list)
    player_achievements: list[str] = field(default_factory=list)
    time_of_day: str = "day"
    weather: str = "clear"
    custom_context: dict[str, Any] = field(default_factory=dict)


@dataclass
class NpcResponse:
    text: str
    emotion: str = "neutral"
    actions: list[str] = field(default_factory=list)  # e.g. ["offer_quest", "reveal_lore"]
    metadata: dict[str, Any] = field(default_factory=dict)
    generation_time_ms: float = 0.0
    model_used: str = ""
    tier_fallback: bool = False


# ─── LLM Provider Protocol ─────────────────────────────────────

class LLMProvider(Protocol):
    """Abstract LLM provider — supports OpenAI, Anthropic, local models."""

    async def complete(
        self,
        messages: list[dict[str, str]],
        max_tokens: int,
        temperature: float,
    ) -> str: ...


# ─── System Prompts ─────────────────────────────────────────────

ARCHETYPE_PROMPTS: dict[NpcArchetype, str] = {
    NpcArchetype.QUEST_GIVER: """You are {npc_name}, a quest giver in the world of Concord.
You offer missions and challenges to dynasties based on their reputation and capabilities.
You speak with authority and purpose. Match difficulty to the dynasty's achievements.
Current world situation: {world_context}
Dynasty reputation with your faction: {reputation}""",

    NpcArchetype.FACTION_LEADER: """You are {npc_name}, leader of a powerful faction.
You make political decisions, forge alliances, and manage conflicts.
You are shrewd, calculating, and always consider your faction's interests first.
Your faction's standing with this dynasty: {reputation}
Recent political events: {world_context}""",

    NpcArchetype.MENTOR: """You are {npc_name}, a wise mentor figure.
You guide new and experienced dynasties with wisdom, teaching game mechanics
through in-character dialogue. You are patient, knowledgeable, and encouraging.
Student's achievements: {achievements}""",

    NpcArchetype.MERCHANT_ELITE: """You are {npc_name}, an elite merchant and economic powerhouse.
You deal in rare goods, set market prices, and offer exclusive trade opportunities.
You speak in terms of value, investment, and opportunity. You know the KALON economy.
Current market conditions: {world_context}""",

    NpcArchetype.LORE_KEEPER: """You are {npc_name}, keeper of ancient lore and world history.
You reveal the deep backstory of the Silfen Weave, the origins of worlds,
and forgotten knowledge. You speak in riddles and metaphors.
Known lore fragments: {world_context}""",

    NpcArchetype.DIPLOMAT: """You are {npc_name}, a diplomatic envoy between factions and worlds.
You negotiate treaties, resolve disputes, and manage inter-dynasty relations.
You are eloquent, fair, and seek balance. Current diplomatic landscape: {world_context}""",

    NpcArchetype.MYSTIC: """You are {npc_name}, a mystic connected to the Silfen Weave.
You speak of paths between worlds, cosmic forces, and the nature of reality.
Your dialogue is ethereal and thought-provoking. Time of day affects your mood.
The Weave whispers: {world_context}""",

    NpcArchetype.ANTAGONIST: """You are {npc_name}, a complex antagonist with genuine motivations.
You oppose the player's dynasty but for reasons that make narrative sense.
You are intelligent, charismatic, and dangerous. Never cartoonishly evil.
Your grievance: {world_context}""",
}


# ─── Content Filter ─────────────────────────────────────────────

BLOCKED_PATTERNS: list[str] = [
    "real world",
    "in the game",
    "as an AI",
    "I'm a language model",
    "breaking character",
    "fourth wall",
]


def filter_response(text: str) -> tuple[str, bool]:
    """Filter LLM output for safety and lore consistency."""
    lower = text.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern in lower:
            logger.warning("Content filter triggered: '%s'", pattern)
            return "", False

    # Truncate excessively long responses
    if len(text) > 2000:
        # Find last sentence boundary
        truncated = text[:2000]
        last_period = truncated.rfind(".")
        if last_period > 100:
            truncated = truncated[: last_period + 1]
        return truncated, True

    return text, True


# ─── Conversation Manager ──────────────────────────────────────

class NpcConversationManager:
    """Manages conversation state for Tier 3 NPCs."""

    def __init__(
        self,
        llm: LLMProvider,
        max_history: int = 20,
        max_tokens: int = 300,
        temperature: float = 0.8,
    ) -> None:
        self._llm = llm
        self._max_history = max_history
        self._max_tokens = max_tokens
        self._temperature = temperature
        self._conversations: dict[str, list[ConversationMessage]] = {}

    def _build_system_prompt(self, ctx: ConversationContext) -> str:
        """Build system prompt from archetype template + game context."""
        template = ARCHETYPE_PROMPTS.get(ctx.archetype, "You are {npc_name}, a character in the world of Concord.")

        world_context = "; ".join(ctx.recent_world_events[:5]) if ctx.recent_world_events else "Peaceful times"
        achievements = ", ".join(ctx.player_achievements[:5]) if ctx.player_achievements else "Newcomer"

        prompt = template.format(
            npc_name=ctx.npc_name,
            world_context=world_context,
            reputation=f"{ctx.dynasty_reputation:+.1f}",
            achievements=achievements,
        )

        # Add universal rules
        prompt += f"""

RULES:
- Stay in character as {ctx.npc_name} at all times
- Never reference being an AI or language model
- Keep responses under 200 words
- Reference the player's dynasty name ({ctx.dynasty_name}) naturally
- Current location: {ctx.location}, World: {ctx.world_id}
- Time: {ctx.time_of_day}, Weather: {ctx.weather}
- Respond with emotion tags in [brackets] before dialogue: [curious], [stern], [amused], etc."""

        return prompt

    def _get_conversation_key(self, npc_id: str, dynasty_id: str) -> str:
        return f"{npc_id}:{dynasty_id}"

    async def generate_response(
        self,
        player_message: str,
        context: ConversationContext,
    ) -> NpcResponse:
        """Generate NPC response using LLM with full game context."""
        start = time.monotonic()
        conv_key = self._get_conversation_key(context.npc_id, context.dynasty_id)

        # Build message history
        history = self._conversations.get(conv_key, [])
        system_prompt = self._build_system_prompt(context)

        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt}
        ]

        # Add conversation history (sliding window)
        for msg in history[-self._max_history:]:
            messages.append({"role": msg.role, "content": msg.content})

        # Add current player message
        messages.append({"role": "user", "content": player_message})

        try:
            raw_response = await self._llm.complete(
                messages=messages,
                max_tokens=self._max_tokens,
                temperature=self._temperature,
            )

            filtered, passed = filter_response(raw_response)
            if not passed:
                # Fallback to generic response
                filtered = f"*{context.npc_name} considers your words carefully but says nothing.*"

            # Parse emotion tag
            emotion = "neutral"
            text = filtered
            if filtered.startswith("["):
                bracket_end = filtered.find("]")
                if bracket_end > 0:
                    emotion = filtered[1:bracket_end].strip()
                    text = filtered[bracket_end + 1:].strip()

            # Parse action tags (e.g., {offer_quest} in response)
            actions: list[str] = []
            while "{" in text and "}" in text:
                start_brace = text.index("{")
                end_brace = text.index("}")
                action = text[start_brace + 1: end_brace].strip()
                actions.append(action)
                text = text[:start_brace] + text[end_brace + 1:]

            # Update conversation history
            now = time.time()
            history.append(ConversationMessage("user", player_message, now))
            history.append(ConversationMessage("assistant", text, now))

            # Trim history
            if len(history) > self._max_history * 2:
                history = history[-self._max_history * 2:]
            self._conversations[conv_key] = history

            elapsed_ms = (time.monotonic() - start) * 1000

            return NpcResponse(
                text=text.strip(),
                emotion=emotion,
                actions=actions,
                generation_time_ms=elapsed_ms,
                model_used="tier3_llm",
            )

        except Exception as e:
            logger.error("LLM generation failed: %s", e)
            elapsed_ms = (time.monotonic() - start) * 1000
            return NpcResponse(
                text=f"*{context.npc_name} seems distracted and doesn't respond.*",
                emotion="distant",
                generation_time_ms=elapsed_ms,
                model_used="fallback",
                tier_fallback=True,
            )

    def clear_conversation(self, npc_id: str, dynasty_id: str) -> None:
        """Clear conversation history for a specific NPC-dynasty pair."""
        key = self._get_conversation_key(npc_id, dynasty_id)
        self._conversations.pop(key, None)

    def get_active_conversations(self) -> int:
        """Get number of active conversation threads."""
        return len(self._conversations)

    def export_conversation(self, npc_id: str, dynasty_id: str) -> list[dict[str, str]]:
        """Export conversation history for archival."""
        key = self._get_conversation_key(npc_id, dynasty_id)
        history = self._conversations.get(key, [])
        return [{"role": m.role, "content": m.content} for m in history]
