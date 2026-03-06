import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

# Circuit breaker to prevent repeated failed calls to ElevenLabs if limit/voice is broken
_elevenlabs_unhealthy = False

class TTSService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        
        try:
            from elevenlabs.client import ElevenLabs
            self.client = ElevenLabs(api_key=self.api_key) if self.api_key else None
        except ImportError:
            self.client = None

        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL") # Default "Sarah"
    
    async def generate_edge_tts(self, text: str):
        import edge_tts
        # Pick Hindi voice if text contains Devnagari, else English Ava
        is_hindi = any(0x0900 <= ord(c) <= 0x097F for c in text)
        edge_voice = "hi-IN-SwaraNeural" if is_hindi else "en-US-AvaNeural"
        
        communicate = edge_tts.Communicate(text, edge_voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    async def generate_speech_stream(self, text_iterator):
        global _elevenlabs_unhealthy
        import re
        buffer = ""
        # Simple sentence split heuristic
        sentence_endings = re.compile(r'(?<=[.!?])\s+')

        async def process_sentence(sentence):
            global _elevenlabs_unhealthy
            if not sentence: return
            
            if self.client and not _elevenlabs_unhealthy:
                try:
                    # Run ElevenLabs blocking call in a background thread to prevent blocking WebSocket
                    def _call_elevenlabs():
                        print(f"[ElevenLabs Debug] Calling text_to_speech.convert for: {sentence}")
                        generator = self.client.text_to_speech.convert(
                            text=sentence,
                            voice_id=self.voice_id,
                            model_id="eleven_multilingual_v2",
                            output_format="mp3_44100_128",
                            optimize_streaming_latency=2
                        )
                        return b"".join(list(generator)) # consume fully in thread
                        
                    audio_data = await asyncio.to_thread(_call_elevenlabs)
                    if audio_data:
                        yield audio_data
                    return # Success, no fallback needed
                except Exception as e:
                    print(f"ElevenLabs TTS Warning: {e}")
                    print("Marking ElevenLabs as unhealthy. Switching to Edge TTS fallback permanently.")
                    _elevenlabs_unhealthy = True
                    
            # Fallback to Edge TTS
            edge_audio = b""
            async for chunk in self.generate_edge_tts(sentence):
                edge_audio += chunk
            if edge_audio:
                yield edge_audio

        for chunk in text_iterator:
            buffer += chunk
            if sentence_endings.search(buffer) or "\n" in buffer:
                sentence = buffer.strip()
                if sentence:
                    async for audio_chunk in process_sentence(sentence):
                        yield audio_chunk
                buffer = ""
                
        # Flush whatever remains
        sentence = buffer.strip()
        if sentence:
            async for audio_chunk in process_sentence(sentence):
                yield audio_chunk

# Singleton instance
elevenlabs_service = TTSService()
