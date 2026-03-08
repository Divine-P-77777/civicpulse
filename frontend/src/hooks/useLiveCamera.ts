import { useState, useRef, useEffect, RefObject } from 'react';

export type CameraMode = 'off' | 'viewfinder' | 'review';

interface UseLiveCameraParams {
  wsReadyState: number | undefined;
  sendCaptureFrame: (base64: string) => void;
}

export function useLiveCamera({ wsReadyState, sendCaptureFrame }: UseLiveCameraParams) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('off');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronization Effect to attach active stream to video element
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraMode, isCameraActive]);

  // Passive Background Feed for vision (1fps capture when camera is "on" but not in viewfinder)
  useEffect(() => {
    if (isCameraActive && !cameraMode.includes('viewfinder') && wsReadyState === WebSocket.OPEN) {
      frameIntervalRef.current = setInterval(() => {
        capturePassiveFrame();
      }, 1000);
    } else {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [isCameraActive, cameraMode, wsReadyState]);

  const capturePassiveFrame = () => {
    if (!videoRef.current || !canvasRef.current || wsReadyState !== WebSocket.OPEN) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      sendCaptureFrame(base64);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraMode('viewfinder');
      setIsCameraActive(true);
      return true;
    } catch (err) {
      console.error('Camera access denied', err);
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraMode('off');
    setCapturedImage(null);
    setIsCameraActive(false);
  };

  const toggleCamera = async () => {
    if (!isCameraActive) {
      await startCamera();
      // Only keep background feed
      setCameraMode('off');
    } else {
      stopCamera();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(dataUrl);
      setCameraMode('review');
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setCameraMode('viewfinder');
  };

  return {
    cameraMode, setCameraMode, isCameraActive, capturedImage,
    videoRef, canvasRef,
    startCamera, stopCamera, capturePhoto, toggleCamera, handleRetry
  };
}
