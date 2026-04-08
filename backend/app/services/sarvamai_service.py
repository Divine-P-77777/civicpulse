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
        # Sanitize text before sending to Edge TTS — removes chars that cause NoAudioReceived
        clean = text.strip()
        # Remove markdown that slipped through
        import re
        clean = re.sub(r'[*_#`~]', '', clean).strip()
        # Edge TTS chokes on empty or very short strings
        if not clean or len(clean) < 3:
            return
        
        edge_voice = "hi-IN-SwaraNeural"
        try:
            communicate = edge_tts.Communicate(clean, edge_voice)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        except Exception as e:
            print(f"[Edge TTS] Failed for sentence '{clean[:40]}...': {e}")
            # Don't raise — just skip this sentence rather than crashing the turn
            return

    async def generate_speech_stream(self, text_iterator):
        global _sarvam_unhealthy
        import re
        buffer = ""
        # Improved sentence split heuristic: split on punctuation even if no space follows
        # This helps with LLMs that don't always put spaces after punctuation.
        sentence_endings = re.compile(r'([.!?|।])')

        async def process_sentence(sentence):
            global _sarvam_unhealthy
            if not sentence: return
            
            # Normalize text for Sarvam AI
            # Replacing Hindi | and । with . often gives better phrasing/prosody in Indian TTS engines
            normalized_sentence = sentence.replace('।', '.').replace('|', '.')
            # Remove any non-speech characters if they snuck in
            normalized_sentence = re.sub(r'[*_#`~]', '', normalized_sentence)
            
            if self.client and not _sarvam_unhealthy:
                try:
                    # Run Sarvam blocking call in a background thread to prevent blocking WebSocket
                    def _call_sarvam():
                        print(f"[Sarvam Debug] Calling text_to_speech.convert for: {normalized_sentence}")
                        response = self.client.text_to_speech.convert(
                            text=normalized_sentence,
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
                    
            # Fallback to Edge TTS (using normalized sentence)
            edge_audio = b""
            try:
                async for chunk in self.generate_edge_tts_fallback(normalized_sentence):
                    edge_audio += chunk
            except Exception as e:
                print(f"[Sarvam Fallback] Edge TTS also failed: {e}")
            if edge_audio:
                yield edge_audio

        for chunk in text_iterator:
            buffer += chunk
            # Split by punctuation
            parts = sentence_endings.split(buffer)
            # parts will be [text, punct, text, punct, ...]
            # We process pairs till the last part
            while len(parts) > 1:
                sentence = (parts.pop(0) + parts.pop(0)).strip()
                if sentence:
                    async for audio_chunk in process_sentence(sentence):
                        yield audio_chunk
            buffer = parts[0]
                
        # Flush whatever remains
        sentence = buffer.strip()
        if sentence:
            async for audio_chunk in process_sentence(sentence):
                yield audio_chunk

# Singleton instance
sarvam_service = SarvamService()
