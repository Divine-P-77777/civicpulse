import os
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv

load_dotenv()

class ElevenLabsService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.client = ElevenLabs(api_key=self.api_key)
        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM") # Default "Rachel"
    
    def generate_speech(self, text: str):
        """Generates audio bytes stream from a full string of text."""
        return self.client.text_to_speech.convert(
            text=text,
            voice_id=self.voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
            optimize_streaming_latency=2 # Scale 0-4
        )

    def generate_speech_stream(self, text_iterator):
        """
        Accepts an LLM text chunk iterator and groups them into logical sentences.
        Then generates and yields audio for each sentence in a continuous stream.
        This provides a simulated ultra-low latency 'input stream' that works perfectly 
        with the v2 SDK synchronous convert method.
        """
        import re
        buffer = ""
        # Simple sentence split heuristic
        sentence_endings = re.compile(r'(?<=[.!?])\s+')
        
        for chunk in text_iterator:
            buffer += chunk
            if sentence_endings.search(buffer) or "\n" in buffer:
                # We hit a sentence boundary, flush it to audio immediately
                sentence = buffer.strip()
                if sentence:
                    for audio_chunk in self.generate_speech(sentence):
                        yield audio_chunk
                buffer = ""
                
        # Flush whatever remains
        sentence = buffer.strip()
        if sentence:
            for audio_chunk in self.generate_speech(sentence):
                yield audio_chunk

# Singleton instance
elevenlabs_service = ElevenLabsService()
