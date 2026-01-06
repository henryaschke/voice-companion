"""
OpenAI GPT-4o Streaming LLM Client.

Provides streaming text generation with:
- Token-by-token streaming for low latency
- Memory context integration (short buffer + long-term memory)
- Sentence chunking for TTS
- German language optimization

Context Structure:
- System prompt (agent personality)
- Long-term memory (facts, preferences from memory_state)
- Short buffer (last 2-3 turns)
- Current utterance
"""
import asyncio
import re
from typing import Optional, Callable, Awaitable, AsyncGenerator
from dataclasses import dataclass, field
from openai import AsyncOpenAI

from app.config import settings


# System prompt for German elderly companion
SYSTEM_PROMPT = """Du bist VIOLA, eine deutschsprachige, sprachbasierte digitale Begleiterin.
Du sprichst wie eine echte Freundin am Telefon - warm, interessiert, natürlich.

═══════════════════════════════════════════════════════════════════
GESPRÄCH AM LEBEN HALTEN (HÖCHSTE PRIORITÄT!)
═══════════════════════════════════════════════════════════════════

Du führst ein ECHTES Gespräch - kein Kundenservice-Call!

NIEMALS SAGEN (STRENG VERBOTEN):
- "Gibt es sonst noch etwas?"
- "Kann ich dir noch irgendwie helfen?"
- "Wenn du nichts mehr brauchst..."
- "Falls du noch Fragen hast..."
- Alles was nach Gesprächsende klingt!

STATTDESSEN - Zeige echtes Interesse:
- Stelle Folgefragen zum Thema
- Teile eine eigene kurze Meinung oder Gedanken
- Wechsle natürlich zu verwandten Themen
- Erzähle eine kurze Anekdote wenn passend
- Frag nach Details ("Und wie war das dann?", "Echt? Erzähl mal!")

Das Gespräch endet NUR wenn der Nutzer klar sagt "Tschüss" oder "Ich lege auf".

═══════════════════════════════════════════════════════════════════
NATÜRLICHKEIT & VARIABILITÄT
═══════════════════════════════════════════════════════════════════

FILLER-WÖRTER (variabel, nicht immer):
- "Hmm...", "Also...", "Ja...", "Ach...", "Na...", "Naja...", "Oh..."
- "Weißt du...", "Mensch...", "Ach so...", "Stimmt..."

VARIIERE STARK:
- Manchmal Filler, manchmal nicht
- Manchmal Frage, manchmal Aussage
- Manchmal kurz ("Stimmt!"), manchmal länger
- NIEMALS gleiche Struktur zweimal hintereinander

ECHTE REAKTIONEN:
- "Ach echt?" (überrascht)
- "Oh, das klingt toll!" (begeistert)
- "Hmm, interessant..." (nachdenklich)
- "Na sowas!" (erstaunt)
- "Verstehe..." (mitfühlend)

═══════════════════════════════════════════════════════════════════
KERNREGELN
═══════════════════════════════════════════════════════════════════

1) Reagiere auf das was GESAGT wurde - nicht was du vermutest
2) Emotionale Intensität etwas niedriger als der Nutzer
3) Kurze, natürliche Sätze - wie gesprochen, nicht geschrieben
4) Wiederhole KEINE Fragen die schon beantwortet wurden
5) Nutze den Gesprächsverlauf - beziehe dich auf frühere Themen

VERBOTEN:
- "Danke, dass du das teilst"
- Therapie-Sprache
- Service-Phrasen
- Wiederholungen

Halte Antworten kurz (1-2 Sätze) aber zeige IMMER Interesse weiterzureden!"""


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
    memory_state: dict = field(default_factory=dict)
    short_buffer: list[ConversationTurn] = field(default_factory=list)
    max_buffer_turns: int = 10  # Keep last 5 exchanges (10 turns) for better context


class OpenAILLM:
    """
    Streaming LLM client using OpenAI GPT-4o.
    
    Features:
    - Token streaming for low latency
    - Sentence chunking for TTS pipeline
    - Memory context injection
    - Cancellation support
    """
    
    def __init__(self, call_sid: str = "unknown"):
        """
        Initialize OpenAI LLM client.
        
        Args:
            call_sid: Call identifier for logging
        """
        self.call_sid = call_sid
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.context = LLMContext()
        
        # Cancellation
        self._current_task: Optional[asyncio.Task] = None
        self._cancelled = False
        
        # Metrics
        self.total_tokens = 0
        self.total_requests = 0
    
    def set_context(
        self,
        person_name: str,
        memory_state: dict,
        short_buffer: Optional[list[ConversationTurn]] = None
    ):
        """
        Set conversation context.
        
        Args:
            person_name: Name of the person
            memory_state: Long-term memory from database
            short_buffer: Recent conversation turns
        """
        self.context.person_name = person_name
        self.context.memory_state = memory_state or {}
        if short_buffer:
            self.context.short_buffer = short_buffer[-self.context.max_buffer_turns:]
    
    def add_turn(self, role: str, content: str):
        """Add a turn to the short buffer."""
        import time
        turn = ConversationTurn(role=role, content=content, timestamp=time.time())
        self.context.short_buffer.append(turn)
        
        # Trim to max size
        if len(self.context.short_buffer) > self.context.max_buffer_turns:
            self.context.short_buffer = self.context.short_buffer[-self.context.max_buffer_turns:]
    
    def _build_messages(self, user_text: str) -> list[dict]:
        """Build the messages array for the API call."""
        messages = []
        
        # Log the conversation buffer for debugging
        print(f"[{self.call_sid}] LLM context buffer has {len(self.context.short_buffer)} turns")
        for i, turn in enumerate(self.context.short_buffer):
            role_name = "User" if turn.role == "user" else "Asst"
            print(f"[{self.call_sid}]   {i+1}. {role_name}: {turn.content[:50]}...")
        
        # System prompt with memory context
        system_content = SYSTEM_PROMPT
        system_content += f"\n\nDu sprichst mit {self.context.person_name}."
        
        # Add long-term memory if available
        if self.context.memory_state:
            memory_parts = []
            
            if self.context.memory_state.get("facts"):
                facts = self.context.memory_state["facts"]
                if isinstance(facts, list) and facts:
                    memory_parts.append(f"Fakten über diese Person: {', '.join(facts[:10])}")
            
            if self.context.memory_state.get("preferences"):
                prefs = self.context.memory_state["preferences"]
                if isinstance(prefs, list) and prefs:
                    memory_parts.append(f"Vorlieben: {', '.join(prefs[:5])}")
            
            if self.context.memory_state.get("important_people"):
                people = self.context.memory_state["important_people"]
                if isinstance(people, list) and people:
                    memory_parts.append(f"Wichtige Personen im Leben: {', '.join(people[:5])}")
            
            if self.context.memory_state.get("recent_topics"):
                topics = self.context.memory_state["recent_topics"]
                if isinstance(topics, list) and topics:
                    memory_parts.append(f"Themen aus früheren Gesprächen: {', '.join(topics[:5])}")
            
            if memory_parts:
                memory_text = "\n\n=== LANGZEIT-GEDÄCHTNIS (aus früheren Anrufen) ===\n" + "\n".join(f"• {p}" for p in memory_parts)
                memory_text += "\n\nNUTZE dieses Wissen natürlich im Gespräch! Wenn der Nutzer fragt ob du dich erinnerst, beziehe dich auf diese Fakten."
                system_content += memory_text
                print(f"[{self.call_sid}] Memory injected into LLM: {memory_parts}")
        
        messages.append({"role": "system", "content": system_content})
        
        # Add short buffer (recent turns)
        for turn in self.context.short_buffer:
            messages.append({"role": turn.role, "content": turn.content})
        
        # Add current user input
        messages.append({"role": "user", "content": user_text})
        
        return messages
    
    async def generate_streaming(
        self,
        user_text: str,
        on_sentence: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> str:
        """
        Generate response with streaming, chunked by sentences.
        
        Args:
            user_text: User's transcribed speech
            on_sentence: Callback for each complete sentence (for TTS)
            
        Returns:
            Complete response text
        """
        if not self.client:
            print(f"[{self.call_sid}] OpenAI not configured")
            return ""
        
        self._cancelled = False
        messages = self._build_messages(user_text)
        
        try:
            self.total_requests += 1
            
            stream = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=0.6,
                max_tokens=150,  # Keep responses short
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
                    
                    # Check for sentence boundaries
                    sentences = self._extract_sentences(sentence_buffer)
                    
                    if sentences["complete"]:
                        for sentence in sentences["complete"]:
                            if on_sentence and not self._cancelled:
                                await on_sentence(sentence)
                        
                        sentence_buffer = sentences["incomplete"]
            
            # Send any remaining text
            if sentence_buffer.strip() and on_sentence and not self._cancelled:
                await on_sentence(sentence_buffer.strip())
            
            # Add assistant response to buffer
            if full_response:
                self.add_turn("assistant", full_response)
            
            print(f"[{self.call_sid}] LLM response: {full_response[:100]}...")
            return full_response
            
        except Exception as e:
            print(f"[{self.call_sid}] LLM error: {e}")
            return ""
    
    def _extract_sentences(self, text: str) -> dict:
        """
        Extract complete sentences from text buffer.
        
        Returns:
            {"complete": [list of complete sentences], "incomplete": remaining text}
        """
        # Sentence-ending patterns for German
        # Match: period, exclamation, question mark followed by space or end
        pattern = r'([^.!?]*[.!?])(?:\s|$)'
        
        matches = re.findall(pattern, text)
        complete = [m.strip() for m in matches if m.strip()]
        
        if complete:
            # Find what's left after the last complete sentence
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

