import os
import asyncio
import base64
from dotenv import load_dotenv

load_dotenv()

# Circuit breaker to prevent repeated failed calls to Sarvam
_sarvam_unhealthy = False

class SarvamService:
    def __init__(self):
        self.api_key = os.getenv("SARVAM_API_KEY")
        
        try:
            from sarvamai import SarvamAI
            self.client = SarvamAI(api_subscription_key=self.api_key) if self.api_key else None
        except ImportError:
            self.client = None
    
    async def generate_edge_tts_fallback(self, text: str):
        import edge_tts
        # Fallback to Edge TTS Swara voice if Sarvam fails
        edge_voice = "hi-IN-SwaraNeural"
        
        communicate = edge_tts.Communicate(text, edge_voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    async def generate_speech_stream(self, text_iterator):
        global _sarvam_unhealthy
        import re
        buffer = ""
        # Simple sentence split heuristic
        sentence_endings = re.compile(r'(?<=[.!?|।])\s+') # Includes purna viram (।) for Hindi

        async def process_sentence(sentence):
            global _sarvam_unhealthy
            if not sentence: return
            
            if self.client and not _sarvam_unhealthy:
                try:
                    # Run Sarvam blocking call in a background thread to prevent blocking WebSocket
                    def _call_sarvam():
                        print(f"[Sarvam Debug] Calling text_to_speech.convert for: {sentence}")
                        response = self.client.text_to_speech.convert(
                            text=sentence,
                            target_language_code="hi-IN",
                            speaker="ritu", # As requested by user
                        )
                        # Sarvam SDK returns base64 string under audios[0] typically (verify structure)
                        if getattr(response, 'audios', None) and len(response.audios) > 0:
                            b64_str = response.audios[0]
                            # Sarvam often returns standard WAF/MP3 encoded in base64 string
                            return base64.b64decode(b64_str)
                        else:
                            raise Exception("Invalid response structure from Sarvam")
                        
                    audio_data = await asyncio.to_thread(_call_sarvam)
                    if audio_data:
                        yield audio_data
                    return # Success, no fallback needed
                except Exception as e:
                    print(f"Sarvam TTS Warning: {e}")
                    print("Marking Sarvam as unhealthy. Switching to Edge TTS fallback permanently.")
                    _sarvam_unhealthy = True
                    
            # Fallback to Edge TTS
            edge_audio = b""
            async for chunk in self.generate_edge_tts_fallback(sentence):
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
sarvam_service = SarvamService()
