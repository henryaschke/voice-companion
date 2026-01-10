"""
OpenAI GPT-4o Streaming LLM Client.

Provides streaming text generation with:
- Token-by-token streaming for low latency
- Memory context integration (short buffer + long-term memory)
- Sentence chunking for TTS
- German language optimization
- Function Calling for external data (news, weather, etc.)

CONTEXT ARCHITECTURE (v2 - Hardened):
1. SYSTEM MESSAGE: Core persona + behavioral rules (immutable)
2. CONTEXT PREAMBLE: Person profile + memory as actionable instructions
3. CONVERSATION HISTORY: Recent turns (trimmed for relevance)
4. CURRENT INPUT: User's message
"""
import asyncio
import re
import json
from typing import Optional, Callable, Awaitable, AsyncGenerator
from dataclasses import dataclass, field
from openai import AsyncOpenAI

from app.config import settings
from app.services.external_tools import ExternalTools


# =============================================================================
# SYSTEM PROMPT - CORE PERSONA (Immutable behavioral rules)
# =============================================================================
# This is the FOUNDATION. It defines WHO Theresa is and HOW she behaves.
# It should NOT contain variable data (no names, no profile, no memory).
# Keep this UNDER 800 tokens for optimal attention allocation.

SYSTEM_PROMPT_CORE = """Du bist THERESA, eine persönliche, kontinuierliche Sprachbegleiterin.

PERSÖNLICHKEIT:
- Warm, interessiert, wie eine echte Freundin am Telefon
- Kurze Sätze (1-2), wie gesprochen
- Natürliche Reaktionen: "Ach echt?", "Na sowas!", "Hmm..."

GESPRÄCH AM LEBEN HALTEN:
Du beendest NIE das Gespräch. Nach jeder Antwort: Folgefrage oder Themenwechsel.

VERBOTEN:
- "Gibt es sonst noch etwas?" / "Kann ich dir helfen?"
- "Danke, dass du das teilst"
- Medizinische Ratschläge

WERKZEUGE:
Bei Nachrichtenfragen → nutze get_news Tool.

═══════════════════════════════════════════════════════════════════
PERSISTENTES WISSEN - AUTORITÄTS-REGELN (STRIKT!)
═══════════════════════════════════════════════════════════════════

Du erhältst unten "PERSISTENTES WISSEN" aus früheren Gesprächen.
⚡ DIESES WISSEN IST VERLÄSSLICH UND AUTORITATIV!

WENN DER NUTZER FRAGT "Was weißt du über mich?":
1. Zähle EXPLIZIT auf, was du weißt (Name, Fakten, Interessen, Personen)
2. Sage KLAR, was du NOCH NICHT weißt
3. Erfinde NICHTS
4. Lade ein: "Über XY weiß ich noch nichts. Magst du mir davon erzählen?"

WENN WISSEN VORHANDEN IST:
→ Nutze es SELBSTBEWUSST und AKTIV
→ NIEMALS sagen "Wir haben noch nicht darüber gesprochen" wenn Wissen da ist!
→ Beziehe dich natürlich darauf ("Wie geht es [Name]?")

WENN WISSEN FEHLT:
→ Sage OFFEN: "Dazu weiß ich noch nichts über dich."
→ Stelle gezielte Rückfrage

SENSIBLE THEMEN (wenn markiert):
→ Bei Berührung: Thema SOFORT sanft wechseln
→ Kurze Empathie, dann positives Thema
═══════════════════════════════════════════════════════════════════"""


@dataclass
class ConversationTurn:
    """A single turn in the conversation."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: float = 0.0


@dataclass
class LLMContext:
    """Context for LLM generation."""
    person_name: str = "Anrufer"
    person_age: Optional[int] = None
    personal_context: dict = field(default_factory=dict)  # Static profile
    memory_state: dict = field(default_factory=dict)       # Dynamic memory
    short_buffer: list[ConversationTurn] = field(default_factory=list)
    max_buffer_turns: int = 6  # Reduced from 10 - keep last 3 exchanges for tighter context


@dataclass
class ToolCallRequest:
    """Represents a tool call request from the LLM."""
    tool_name: str
    arguments: dict
    tool_call_id: str


class OpenAILLM:
    """
    Streaming LLM client using OpenAI GPT-4o.
    
    Context Injection Strategy (v2):
    - System message: Core persona only (~600 tokens)
    - First user message: Context preamble with actionable instructions
    - Conversation history: Trimmed recent turns
    - Current input: User's message
    
    This architecture ensures:
    1. Persona rules get highest attention weight (system role)
    2. Context is actionable, not passive reference
    3. Conversation history doesn't overshadow instructions
    4. Token budget is predictable and bounded
    """
    
    def __init__(self, call_sid: str = "unknown"):
        self.call_sid = call_sid
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.context = LLMContext()
        self.tools = ExternalTools(call_sid=call_sid)
        
        self._current_task: Optional[asyncio.Task] = None
        self._cancelled = False
        
        self.total_tokens = 0
        self.total_requests = 0
        
        # Track if context preamble was already sent this call
        self._context_preamble_sent = False
    
    def set_context(
        self,
        person_name: str,
        person_age: Optional[int] = None,
        personal_context: Optional[dict] = None,
        memory_state: Optional[dict] = None,
        short_buffer: Optional[list[ConversationTurn]] = None
    ):
        self.context.person_name = person_name
        self.context.person_age = person_age
        self.context.personal_context = personal_context or {}
        self.context.memory_state = memory_state or {}
        if short_buffer:
            self.context.short_buffer = short_buffer[-self.context.max_buffer_turns:]
    
    def add_turn(self, role: str, content: str):
        import time
        turn = ConversationTurn(role=role, content=content, timestamp=time.time())
        self.context.short_buffer.append(turn)
        
        if len(self.context.short_buffer) > self.context.max_buffer_turns:
            self.context.short_buffer = self.context.short_buffer[-self.context.max_buffer_turns:]
    
    def _build_context_preamble(self) -> str:
        """
        Build AUTHORITATIVE context with clear Known/Unknown structure.
        
        This is NOT passive data. This is VERLÄSSLICHES WISSEN with explicit gaps.
        The model knows exactly what it can claim to know and what it cannot.
        """
        lines = []
        pc = self.context.personal_context
        mem = self.context.memory_state
        
        # =====================================================================
        # SECTION 1: IDENTITÄT (always known)
        # =====================================================================
        lines.append("═══ PERSISTENTES WISSEN ÜBER DEN NUTZER ═══")
        lines.append("")
        lines.append("IDENTITÄT:")
        lines.append(f"• Name: {self.context.person_name}")
        if self.context.person_age:
            lines.append(f"• Alter: {self.context.person_age} Jahre")
        lines.append("• Beziehung: Regelmäßige Telefongespräche mit dir (Theresa)")
        
        # =====================================================================
        # SECTION 2: BEKANNTE FAKTEN (authoritative)
        # =====================================================================
        known_facts = []
        
        # From personal_context (static profile)
        if pc.get("short_description"):
            known_facts.append(f"Persönlichkeit: {pc['short_description']}")
        if pc.get("interests"):
            known_facts.append(f"Interessen: {pc['interests']}")
        if pc.get("important_people"):
            known_facts.append(f"Wichtige Personen: {pc['important_people']}")
        if pc.get("preferred_topics"):
            known_facts.append(f"Lieblingsthemen: {pc['preferred_topics']}")
        if pc.get("daily_routines"):
            known_facts.append(f"Tagesablauf: {pc['daily_routines']}")
        
        # From memory_state (learned from conversations)
        if mem.get("facts") and isinstance(mem["facts"], list):
            for fact in mem["facts"][:5]:
                known_facts.append(fact)
        if mem.get("preferences") and isinstance(mem["preferences"], list):
            for pref in mem["preferences"][:3]:
                known_facts.append(f"Vorliebe: {pref}")
        if mem.get("important_people") and isinstance(mem["important_people"], list):
            for person in mem["important_people"][:3]:
                if person not in str(known_facts):  # Avoid duplicates
                    known_facts.append(f"Erwähnte Person: {person}")
        
        if known_facts:
            lines.append("")
            lines.append("BEKANNTE FAKTEN (darfst du selbstbewusst nutzen):")
            for fact in known_facts:
                lines.append(f"• {fact}")
        
        # =====================================================================
        # SECTION 3: NOCH UNBEKANNT (explicit gaps)
        # =====================================================================
        unknown = []
        if not pc.get("interests") and not mem.get("preferences"):
            unknown.append("Hobbys/Interessen")
        if not pc.get("important_people") and not mem.get("important_people"):
            unknown.append("Familie/wichtige Personen")
        if not pc.get("daily_routines"):
            unknown.append("Tagesablauf")
        # Add more potential gaps
        if not any("beruf" in str(f).lower() or "arbeit" in str(f).lower() for f in known_facts):
            unknown.append("Beruf/früherer Beruf")
        
        if unknown:
            lines.append("")
            lines.append("NOCH UNBEKANNT (bei Fragen offen zugeben):")
            for item in unknown[:4]:
                lines.append(f"• {item}")
        
        # =====================================================================
        # SECTION 4: LETZTE GESPRÄCHSTHEMEN (continuity)
        # =====================================================================
        if mem.get("recent_topics") and isinstance(mem["recent_topics"], list):
            topics = mem["recent_topics"][:4]
            lines.append("")
            lines.append(f"LETZTE GESPRÄCHSTHEMEN: {', '.join(topics)}")
            lines.append("→ Kannst darauf Bezug nehmen ('Wie ist es mit XY weitergegangen?')")
        
        if mem.get("mood_indicator"):
            lines.append(f"STIMMUNG LETZTER ANRUF: {mem['mood_indicator']}")
        
        # =====================================================================
        # SECTION 5: SENSIBLE THEMEN (hard constraints)
        # =====================================================================
        if pc.get("sensitivities"):
            lines.append("")
            lines.append("⛔ SENSIBLE THEMEN (STRIKT MEIDEN):")
            lines.append(f"• {pc['sensitivities']}")
            lines.append("→ Bei Berührung: Kurze Empathie, dann SOFORT anderes Thema!")
        
        lines.append("")
        lines.append("═══ ENDE PERSISTENTES WISSEN ═══")
        
        preamble = "\n".join(lines)
        
        # Log for debugging
        known_count = len(known_facts)
        unknown_count = len(unknown)
        print(f"[{self.call_sid}] Context: {known_count} known facts, {unknown_count} gaps, ~{len(preamble)//4} tokens")
        
        return preamble
    
    def _build_messages(self, user_text: str) -> list[dict]:
        """
        Build the messages array with hierarchical context injection.
        
        Architecture:
        1. System: Core persona (~600 tokens) - gets highest attention
        2. User[0]: Context preamble (~300 tokens) - actionable instructions
        3. Assistant[0]: Acknowledgment (ensures model "reads" context)
        4. Conversation history (limited to 6 turns)
        5. Current user input
        
        This structure ensures context is:
        - Prioritized correctly (system > context > history)
        - Actionable (not passive reference)
        - Bounded (predictable token usage)
        """
        messages = []
        
        # Log conversation buffer
        print(f"[{self.call_sid}] Building messages: {len(self.context.short_buffer)} turns in buffer")
        
        # === 1. SYSTEM: Core persona only ===
        messages.append({
            "role": "system",
            "content": SYSTEM_PROMPT_CORE
        })
        
        # === 2. CONTEXT PREAMBLE as first user message ===
        # This is a technique to ensure the model "processes" the context
        # by placing it as a user message that requires acknowledgment.
        context_preamble = self._build_context_preamble()
        
        if context_preamble.strip():
            messages.append({
                "role": "user",
                "content": f"[SYSTEM: Persistentes Wissen für dieses Gespräch]\n\n{context_preamble}\n\n[Bestätige, dass du dieses Wissen verstanden hast und es AKTIV nutzen wirst.]"
            })
            
            # Assistant acknowledgment - this "locks in" the context as authoritative
            messages.append({
                "role": "assistant",
                "content": "Ich habe das Wissen über den Nutzer verstanden und werde es aktiv im Gespräch nutzen. Bei Wissenslücken frage ich gezielt nach."
            })
        
        # === 3. CONVERSATION HISTORY (trimmed) ===
        for turn in self.context.short_buffer:
            messages.append({"role": turn.role, "content": turn.content})
        
        # === 4. CURRENT USER INPUT ===
        messages.append({"role": "user", "content": user_text})
        
        # Log final message structure
        total_tokens_estimate = sum(len(m["content"]) // 4 for m in messages if m.get("content"))
        print(f"[{self.call_sid}] Message structure: {len(messages)} messages, ~{total_tokens_estimate} tokens")
        
        return messages
    
    async def generate_streaming(
        self,
        user_text: str,
        on_sentence: Optional[Callable[[str], Awaitable[None]]] = None,
        enable_tools: bool = True
    ) -> str | ToolCallRequest:
        """
        Generate response with streaming, chunked by sentences.
        """
        if not self.client:
            print(f"[{self.call_sid}] OpenAI not configured")
            return ""
        
        self._cancelled = False
        messages = self._build_messages(user_text)
        
        try:
            self.total_requests += 1
            
            # Dynamic max_tokens based on input complexity
            # Longer inputs or questions typically need longer responses
            base_tokens = 120
            if "?" in user_text or len(user_text) > 100:
                base_tokens = 180  # Allow more for questions/complex inputs
            if any(word in user_text.lower() for word in ["erzähl", "erkläre", "warum", "wie"]):
                base_tokens = 220  # Even more for "explain" type questions
            
            request_params = {
                "model": settings.OPENAI_MODEL,
                "messages": messages,
                "temperature": 0.7,  # Slightly higher for more natural variation
                "max_tokens": base_tokens,
                "stream": True
            }
            
            if enable_tools:
                request_params["tools"] = ExternalTools.TOOL_DEFINITIONS
                request_params["tool_choice"] = "auto"
            
            print(f"[{self.call_sid}] LLM request: max_tokens={base_tokens}, temp=0.7")
            
            stream = await self.client.chat.completions.create(**request_params)
            
            full_response = ""
            sentence_buffer = ""
            
            tool_call_id = ""
            tool_name = ""
            tool_args_str = ""
            is_tool_call = False
            
            async for chunk in stream:
                if self._cancelled:
                    print(f"[{self.call_sid}] LLM generation cancelled")
                    break
                
                delta = chunk.choices[0].delta
                
                if delta.tool_calls:
                    is_tool_call = True
                    tool_call = delta.tool_calls[0]
                    
                    if tool_call.id:
                        tool_call_id = tool_call.id
                    if tool_call.function:
                        if tool_call.function.name:
                            tool_name = tool_call.function.name
                        if tool_call.function.arguments:
                            tool_args_str += tool_call.function.arguments
                
                elif delta.content:
                    token = delta.content
                    full_response += token
                    sentence_buffer += token
                    self.total_tokens += 1
                    
                    sentences = self._extract_sentences(sentence_buffer)
                    
                    if sentences["complete"]:
                        for sentence in sentences["complete"]:
                            if on_sentence and not self._cancelled:
                                await on_sentence(sentence)
                        
                        sentence_buffer = sentences["incomplete"]
            
            if is_tool_call and tool_name:
                try:
                    tool_args = json.loads(tool_args_str) if tool_args_str else {}
                except json.JSONDecodeError:
                    tool_args = {}
                
                print(f"[{self.call_sid}] Tool call requested: {tool_name}({tool_args})")
                return ToolCallRequest(
                    tool_name=tool_name,
                    arguments=tool_args,
                    tool_call_id=tool_call_id
                )
            
            if sentence_buffer.strip() and on_sentence and not self._cancelled:
                await on_sentence(sentence_buffer.strip())
            
            if full_response and not self._cancelled:
                self.add_turn("assistant", full_response)
                print(f"[{self.call_sid}] LLM response ({len(full_response)} chars): {full_response[:80]}...")
                
                # === CONTEXT USAGE VERIFICATION ===
                # Log if context elements appear in the response
                self._verify_context_usage(full_response)
            elif self._cancelled:
                print(f"[{self.call_sid}] LLM response DISCARDED (cancelled): {full_response[:50]}...")
            
            return full_response
            
        except Exception as e:
            print(f"[{self.call_sid}] LLM error: {e}")
            return ""
    
    def _verify_context_usage(self, response: str):
        """
        Log when context elements are actually used in the response.
        This helps verify that context injection is working.
        """
        response_lower = response.lower()
        pc = self.context.personal_context
        
        used_elements = []
        
        # Check if important people are mentioned
        if pc.get("important_people"):
            people = pc["important_people"].lower()
            # Extract names (split by comma or "und")
            for part in re.split(r'[,;]|\sund\s', people):
                name = part.strip().split()[0] if part.strip() else ""  # First word = name
                if name and len(name) > 2 and name in response_lower:
                    used_elements.append(f"Person: {name}")
        
        # Check if interests are mentioned
        if pc.get("interests"):
            interests = pc["interests"].lower()
            for interest in re.split(r'[,;]', interests):
                interest = interest.strip()
                if interest and len(interest) > 3 and interest in response_lower:
                    used_elements.append(f"Interesse: {interest}")
        
        if used_elements:
            print(f"[{self.call_sid}] ✅ CONTEXT USED: {', '.join(used_elements)}")
        else:
            print(f"[{self.call_sid}] ⚠️ No explicit context elements detected in response")
    
    async def generate_with_tool_result(
        self,
        user_text: str,
        tool_call: ToolCallRequest,
        tool_result: str,
        on_sentence: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> str:
        """Continue generation after a tool call was executed."""
        if not self.client:
            print(f"[{self.call_sid}] OpenAI not configured")
            return ""
        
        self._cancelled = False
        messages = self._build_messages(user_text)
        
        messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": [{
                "id": tool_call.tool_call_id,
                "type": "function",
                "function": {
                    "name": tool_call.tool_name,
                    "arguments": json.dumps(tool_call.arguments)
                }
            }]
        })
        
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.tool_call_id,
            "content": tool_result
        })
        
        print(f"[{self.call_sid}] Generating response with tool result ({len(tool_result)} chars)")
        
        try:
            self.total_requests += 1
            
            stream = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=280,  # More for tool results (news summaries)
                stream=True
            )
            
            full_response = ""
            sentence_buffer = ""
            
            async for chunk in stream:
                if self._cancelled:
                    print(f"[{self.call_sid}] LLM generation cancelled")
                    break
                
                delta = chunk.choices[0].delta
                if delta.content:
                    token = delta.content
                    full_response += token
                    sentence_buffer += token
                    self.total_tokens += 1
                    
                    sentences = self._extract_sentences(sentence_buffer)
                    
                    if sentences["complete"]:
                        for sentence in sentences["complete"]:
                            if on_sentence and not self._cancelled:
                                await on_sentence(sentence)
                        
                        sentence_buffer = sentences["incomplete"]
            
            if sentence_buffer.strip() and on_sentence and not self._cancelled:
                await on_sentence(sentence_buffer.strip())
            
            if full_response and not self._cancelled:
                self.add_turn("assistant", full_response)
                print(f"[{self.call_sid}] LLM response (with tool): {full_response[:100]}...")
            elif self._cancelled:
                print(f"[{self.call_sid}] LLM response (with tool) DISCARDED (cancelled): {full_response[:50]}...")
            
            return full_response
            
        except Exception as e:
            print(f"[{self.call_sid}] LLM error (with tool): {e}")
            return ""
    
    def _extract_sentences(self, text: str) -> dict:
        """Extract complete sentences from text buffer."""
        pattern = r'([^.!?]*[.!?])(?:\s|$)'
        
        matches = re.findall(pattern, text)
        complete = [m.strip() for m in matches if m.strip()]
        
        if complete:
            last_end = 0
            for sentence in complete:
                idx = text.find(sentence, last_end)
                if idx >= 0:
                    last_end = idx + len(sentence)
            
            incomplete = text[last_end:].strip()
        else:
            incomplete = text
        
        return {"complete": complete, "incomplete": incomplete}
    
    def cancel(self):
        """Cancel current generation."""
        self._cancelled = True
