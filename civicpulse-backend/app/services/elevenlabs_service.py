import os
import re
import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Circuit breaker — if ElevenLabs fails, switch to Edge TTS permanently
_elevenlabs_unhealthy = False

# Split on shorter phrase boundaries for faster first-audio delivery
_PHRASE_SPLIT = re.compile(r'(?<=[.!?,;:\n])\s+')


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
                optimize_streaming_latency=3,  # Most aggressive latency optimization
            )

        try:
            # ElevenLabs returns a generator — run the initial API call in a thread
            # then consume chunks as they arrive
            generator = await asyncio.to_thread(_call)

            # Yield each chunk from the generator as it arrives
            for audio_chunk in generator:
                if audio_chunk:
                    yield audio_chunk

        except Exception as e:
            logger.warning(f"ElevenLabs TTS failed: {e}. Switching to Edge TTS.")
            _elevenlabs_unhealthy = True
            # Fallback to Edge TTS for this phrase
            async for chunk in self.generate_edge_tts(text):
                yield chunk

    async def generate_speech_stream(self, text_iterator):
        """
        Converts an LLM text stream into an audio stream.
        
        Buffers text until a phrase boundary (.,!?;:\n) then sends each
        phrase to TTS immediately — much faster first-audio than waiting
        for full sentences.
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

            # Split on phrase boundaries for faster first-audio
            if _PHRASE_SPLIT.search(buffer):
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
