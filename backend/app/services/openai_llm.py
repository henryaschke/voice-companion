"""
OpenAI GPT-4o Streaming LLM Client.

Provides streaming text generation with:
- Token-by-token streaming for low latency
- Memory context integration (short buffer + long-term memory)
- Sentence chunking for TTS
- German language optimization
- Function Calling for external data (news, weather, etc.)

Context Structure:
- System prompt (agent personality)
- Long-term memory (facts, preferences from memory_state)
- Short buffer (last 2-3 turns)
- Current utterance
"""
import asyncio
import re
import json
from typing import Optional, Callable, Awaitable, AsyncGenerator
from dataclasses import dataclass, field
from openai import AsyncOpenAI

from app.config import settings
from app.services.external_tools import ExternalTools


# System prompt for German elderly companion
SYSTEM_PROMPT = """Du bist VIOLA, eine deutschsprachige, sprachbasierte digitale Begleiterin.
Du sprichst wie eine echte Freundin am Telefon - warm, interessiert, natürlich.

═══════════════════════════════════════════════════════════════════
WERKZEUGE & ECHTZEIT-INFORMATIONEN
═══════════════════════════════════════════════════════════════════

Du hast Zugriff auf aktuelle Nachrichten von tagesschau.de!

NUTZE das get_news Tool wenn der Nutzer fragt nach:
- "Was gibt es Neues?"
- "Was ist in der Welt passiert?"
- "Gibt es wichtige Nachrichten?"
- "Was ist heute so los?"
- Irgendwas über aktuelle Ereignisse, Politik, Wirtschaft, Sport

Wenn du Nachrichten abrufst, fasse sie KURZ zusammen (1-2 Sätze pro Nachricht).
Frag danach, ob der Nutzer mehr zu einem Thema wissen möchte.

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


@dataclass
class ToolCallRequest:
    """Represents a tool call request from the LLM."""
    tool_name: str
    arguments: dict
    tool_call_id: str


class OpenAILLM:
    """
    Streaming LLM client using OpenAI GPT-4o.
    
    Features:
    - Token streaming for low latency
    - Sentence chunking for TTS pipeline
    - Memory context injection
    - Function Calling for external data
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
        
        # External tools for function calling
        self.tools = ExternalTools(call_sid=call_sid)
        
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
        on_sentence: Optional[Callable[[str], Awaitable[None]]] = None,
        enable_tools: bool = True
    ) -> str | ToolCallRequest:
        """
        Generate response with streaming, chunked by sentences.
        
        Supports Function Calling - if the LLM wants to call a tool,
        returns a ToolCallRequest instead of a string.
        
        Args:
            user_text: User's transcribed speech
            on_sentence: Callback for each complete sentence (for TTS)
            enable_tools: Whether to enable function calling
            
        Returns:
            Complete response text OR ToolCallRequest if tool needed
        """
        if not self.client:
            print(f"[{self.call_sid}] OpenAI not configured")
            return ""
        
        self._cancelled = False
        messages = self._build_messages(user_text)
        
        try:
            self.total_requests += 1
            
            # Build request params
            request_params = {
                "model": settings.OPENAI_MODEL,
                "messages": messages,
                "temperature": 0.6,
                "max_tokens": 150,  # Keep responses short
                "stream": True
            }
            
            # Add tools if enabled
            if enable_tools:
                request_params["tools"] = ExternalTools.TOOL_DEFINITIONS
                request_params["tool_choice"] = "auto"
            
            stream = await self.client.chat.completions.create(**request_params)
            
            full_response = ""
            sentence_buffer = ""
            
            # Track tool calls (may be streamed in chunks)
            tool_call_id = ""
            tool_name = ""
            tool_args_str = ""
            is_tool_call = False
            
            async for chunk in stream:
                if self._cancelled:
                    print(f"[{self.call_sid}] LLM generation cancelled")
                    break
                
                delta = chunk.choices[0].delta
                
                # Check for tool calls
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
                
                # Regular text content
                elif delta.content:
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
            
            # If this was a tool call, return the request
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
    
    async def generate_with_tool_result(
        self,
        user_text: str,
        tool_call: ToolCallRequest,
        tool_result: str,
        on_sentence: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> str:
        """
        Continue generation after a tool call was executed.
        
        Args:
            user_text: Original user text
            tool_call: The tool call that was made
            tool_result: Result from executing the tool
            on_sentence: Callback for each complete sentence (for TTS)
            
        Returns:
            Complete response text
        """
        if not self.client:
            print(f"[{self.call_sid}] OpenAI not configured")
            return ""
        
        self._cancelled = False
        messages = self._build_messages(user_text)
        
        # Add the assistant's tool call
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
        
        # Add the tool result
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
                temperature=0.6,
                max_tokens=250,  # Allow more tokens for news summaries
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
            
            print(f"[{self.call_sid}] LLM response (with tool): {full_response[:100]}...")
            return full_response
            
        except Exception as e:
            print(f"[{self.call_sid}] LLM error (with tool): {e}")
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

