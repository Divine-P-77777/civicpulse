import os
import re
import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Circuit breaker — if ElevenLabs fails, switch to Edge TTS permanently
_elevenlabs_unhealthy = False

# Split only on SENTENCE boundaries for natural-sounding TTS
# (not commas/semicolons which create choppy 3-word fragments)
_SENTENCE_SPLIT = re.compile(r'(?<=[.!?\n])\s+')

# Minimum chars before flushing to TTS — ensures proper intonation
_MIN_PHRASE_LENGTH = 80


class TTSService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")

        try:
            from elevenlabs.client import ElevenLabs
            self.client = ElevenLabs(api_key=self.api_key) if self.api_key else None
        except ImportError:
            self.client = None

        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")

    async def generate_edge_tts(self, text: str):
        """Fallback TTS using Microsoft Edge TTS (free, fast)."""
        import edge_tts
        edge_voice = "en-US-AvaNeural"
        communicate = edge_tts.Communicate(text, edge_voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    async def _elevenlabs_stream(self, text: str):
        """
        Stream audio from ElevenLabs — yields chunks as they arrive
        instead of buffering the entire response.
        """
        global _elevenlabs_unhealthy

        def _call():
            return self.client.text_to_speech.convert(
                text=text,
                voice_id=self.voice_id,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128",
                optimize_streaming_latency=3,
            )

        try:
            generator = await asyncio.to_thread(_call)
            
            # Buffer the entire audio response for this phrase
            # Browser <audio> elements cannot play arbitrary byte-slices of an MP3 stream.
            full_audio = b""
            for audio_chunk in generator:
                if audio_chunk:
                    full_audio += audio_chunk
                    
            if full_audio:
                yield full_audio

        except Exception as e:
            logger.warning(f"ElevenLabs TTS failed: {e}. Switching to Edge TTS.")
            _elevenlabs_unhealthy = True
            # Fallback to Edge TTS for this phrase
            async for chunk in self.generate_edge_tts(text):
                yield chunk

    async def generate_speech_stream(self, text_iterator):
        """
        Converts an LLM text stream into an audio stream.
        
        Buffers text into COMPLETE SENTENCES before sending to TTS.
        This produces natural-sounding speech with proper intonation,
        unlike splitting on every comma which creates choppy fragments.
        """
        global _elevenlabs_unhealthy
        buffer = ""

        async def process_phrase(phrase: str):
            """Send a phrase to TTS and yield audio chunks."""
            if not phrase.strip():
                return

            if self.client and not _elevenlabs_unhealthy:
                async for audio_chunk in self._elevenlabs_stream(phrase):
                    yield audio_chunk
            else:
                # Edge TTS fallback
                edge_audio = b""
                async for chunk in self.generate_edge_tts(phrase):
                    edge_audio += chunk
                if edge_audio:
                    yield edge_audio

        for text_chunk in text_iterator:
            buffer += text_chunk

            # Only flush when we have a complete sentence AND enough text
            if _SENTENCE_SPLIT.search(buffer) and len(buffer) >= _MIN_PHRASE_LENGTH:
                phrase = buffer.strip()
                if phrase:
                    async for audio_chunk in process_phrase(phrase):
                        yield audio_chunk
                buffer = ""

        # Flush remaining buffer
        if buffer.strip():
            async for audio_chunk in process_phrase(buffer.strip()):
                yield audio_chunk


# Singleton instance
elevenlabs_service = TTSService()
