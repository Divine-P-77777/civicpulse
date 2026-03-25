import { useAuth } from "@clerk/nextjs";

interface UseUploadProps {
    sessionId: string;
    trackedSend: (msg: any) => void;
    setStatus: (status: any) => void;
    setTranscript: (transcript: string) => void;
    language: 'en' | 'hi';
}

export const useUpload = ({ sessionId, trackedSend, setStatus, setTranscript, language }: UseUploadProps) => {
    const { getToken } = useAuth();

    const uploadFile = async (file: File, isPhoto: boolean = false) => {
        try {
            const token = await getToken();
            if (!token) return;

            setStatus('uploading');
            const isHindi = language === 'hi';
            setTranscript(isPhoto ? (isHindi ? 'फ़ोटो अपलोड हो रही है...' : 'Uploading photo...') : (isHindi ? 'फ़ाइल अपलोड हो रही है...' : 'Uploading file...'));

            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', file.type.startsWith('image/') ? 'image' : 'pdf');
            formData.append('metadata', JSON.stringify({ type: isPhoto ? 'live_photo' : 'live_upload', session_id: sessionId }));

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'X-Live-Session-ID': sessionId },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            setTranscript(isHindi ? 'फ़ाइल अपलोड हो गई! प्रोसेसिंग हो रही है...' : 'File uploaded! Processing...');

            // Notify backend to auto-analyze the uploaded document
            trackedSend({
                type: 'ingestion_complete',
                filename: file.name
            });
        } catch (err) {
            setStatus('error');
            setTranscript(language === 'hi' ? 'फ़ाइल अपलोड करने में विफल।' : 'Failed to upload file.');
        }
    };

    return { uploadFile };
};
