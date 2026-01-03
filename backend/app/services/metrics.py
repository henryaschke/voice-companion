"""
Observability and Metrics for Voice Agent.

Tracks key latency metrics without storing PII:
- STT latency (partial and final)
- LLM time-to-first-byte
- TTS time-to-first-byte
- Total turn latency
- Barge-in events

All metrics are logged as structured data for easy parsing.
No transcripts or PII in logs.
"""
import time
from dataclasses import dataclass, field
from typing import Optional
import json


@dataclass
class TurnMetrics:
    """Metrics for a single conversation turn."""
    turn_id: int = 0
    
    # Timing points (Unix timestamps)
    user_speech_start: float = 0.0
    user_speech_end: float = 0.0
    stt_final_received: float = 0.0
    llm_request_start: float = 0.0
    llm_first_token: float = 0.0
    llm_complete: float = 0.0
    tts_request_start: float = 0.0
    tts_first_audio: float = 0.0
    tts_complete: float = 0.0
    
    # Computed latencies (in ms)
    @property
    def stt_latency_ms(self) -> float:
        """Time from speech end to final transcript."""
        if self.user_speech_end and self.stt_final_received:
            return (self.stt_final_received - self.user_speech_end) * 1000
        return 0.0
    
    @property
    def llm_ttfb_ms(self) -> float:
        """LLM time-to-first-byte."""
        if self.llm_request_start and self.llm_first_token:
            return (self.llm_first_token - self.llm_request_start) * 1000
        return 0.0
    
    @property
    def llm_total_ms(self) -> float:
        """Total LLM generation time."""
        if self.llm_request_start and self.llm_complete:
            return (self.llm_complete - self.llm_request_start) * 1000
        return 0.0
    
    @property
    def tts_ttfb_ms(self) -> float:
        """TTS time-to-first-byte."""
        if self.tts_request_start and self.tts_first_audio:
            return (self.tts_first_audio - self.tts_request_start) * 1000
        return 0.0
    
    @property
    def total_turn_latency_ms(self) -> float:
        """Total time from speech end to first agent audio."""
        if self.user_speech_end and self.tts_first_audio:
            return (self.tts_first_audio - self.user_speech_end) * 1000
        return 0.0
    
    def to_dict(self) -> dict:
        """Convert to dictionary for logging."""
        return {
            "turn_id": self.turn_id,
            "stt_latency_ms": round(self.stt_latency_ms, 1),
            "llm_ttfb_ms": round(self.llm_ttfb_ms, 1),
            "llm_total_ms": round(self.llm_total_ms, 1),
            "tts_ttfb_ms": round(self.tts_ttfb_ms, 1),
            "total_turn_latency_ms": round(self.total_turn_latency_ms, 1)
        }


@dataclass
class CallMetrics:
    """Metrics for an entire call session."""
    call_sid: str = ""
    call_start: float = 0.0
    call_end: float = 0.0
    
    # Turn tracking
    turns: list[TurnMetrics] = field(default_factory=list)
    current_turn: Optional[TurnMetrics] = None
    
    # Counters
    barge_in_count: int = 0
    stt_partial_count: int = 0
    stt_final_count: int = 0
    llm_token_count: int = 0
    tts_char_count: int = 0
    
    def start_call(self, call_sid: str):
        """Initialize call metrics."""
        self.call_sid = call_sid
        self.call_start = time.time()
        self.turns = []
        self.current_turn = None
    
    def start_turn(self):
        """Start a new conversation turn."""
        turn_id = len(self.turns) + 1
        self.current_turn = TurnMetrics(turn_id=turn_id)
        self.current_turn.user_speech_start = time.time()
    
    def end_user_speech(self):
        """Mark end of user speech."""
        if self.current_turn:
            self.current_turn.user_speech_end = time.time()
    
    def stt_final(self):
        """Mark receipt of final STT transcript."""
        if self.current_turn:
            self.current_turn.stt_final_received = time.time()
            self.stt_final_count += 1
    
    def llm_start(self):
        """Mark start of LLM request."""
        if self.current_turn:
            self.current_turn.llm_request_start = time.time()
    
    def llm_first_token(self):
        """Mark receipt of first LLM token."""
        if self.current_turn and not self.current_turn.llm_first_token:
            self.current_turn.llm_first_token = time.time()
    
    def llm_complete(self):
        """Mark completion of LLM response."""
        if self.current_turn:
            self.current_turn.llm_complete = time.time()
    
    def tts_start(self):
        """Mark start of TTS request."""
        if self.current_turn:
            self.current_turn.tts_request_start = time.time()
    
    def tts_first_audio(self):
        """Mark receipt of first TTS audio."""
        if self.current_turn and not self.current_turn.tts_first_audio:
            self.current_turn.tts_first_audio = time.time()
    
    def tts_complete(self):
        """Mark completion of TTS."""
        if self.current_turn:
            self.current_turn.tts_complete = time.time()
    
    def end_turn(self):
        """Finalize current turn and add to history."""
        if self.current_turn:
            self.turns.append(self.current_turn)
            self._log_turn(self.current_turn)
            self.current_turn = None
    
    def record_barge_in(self):
        """Record a barge-in event."""
        self.barge_in_count += 1
        print(f"[{self.call_sid}] METRIC: barge_in_count={self.barge_in_count}")
    
    def end_call(self):
        """Finalize call metrics."""
        self.call_end = time.time()
        self._log_summary()
    
    def _log_turn(self, turn: TurnMetrics):
        """Log turn metrics (no PII)."""
        metrics = turn.to_dict()
        metrics["call_sid"] = self.call_sid
        print(f"[{self.call_sid}] METRIC: turn_complete {json.dumps(metrics)}")
    
    def _log_summary(self):
        """Log call summary metrics."""
        duration_sec = self.call_end - self.call_start if self.call_end else 0
        
        # Compute averages
        total_latencies = [t.total_turn_latency_ms for t in self.turns if t.total_turn_latency_ms > 0]
        avg_latency = sum(total_latencies) / len(total_latencies) if total_latencies else 0
        
        summary = {
            "call_sid": self.call_sid,
            "duration_sec": round(duration_sec, 1),
            "total_turns": len(self.turns),
            "barge_in_count": self.barge_in_count,
            "avg_turn_latency_ms": round(avg_latency, 1),
            "stt_finals": self.stt_final_count,
            "llm_tokens": self.llm_token_count,
            "tts_chars": self.tts_char_count
        }
        
        print(f"[{self.call_sid}] METRIC: call_complete {json.dumps(summary)}")
    
    def get_summary(self) -> dict:
        """Get call summary as dictionary."""
        duration_sec = self.call_end - self.call_start if self.call_end else 0
        total_latencies = [t.total_turn_latency_ms for t in self.turns if t.total_turn_latency_ms > 0]
        avg_latency = sum(total_latencies) / len(total_latencies) if total_latencies else 0
        
        return {
            "duration_sec": round(duration_sec, 1),
            "total_turns": len(self.turns),
            "barge_in_count": self.barge_in_count,
            "avg_turn_latency_ms": round(avg_latency, 1)
        }

