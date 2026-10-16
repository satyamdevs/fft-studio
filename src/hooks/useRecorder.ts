import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface RecorderState {
  recording: boolean;
  blobUrl: string | null;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/** Record a canvas to webm via captureStream + MediaRecorder. */
export function useRecorder(canvasRef: RefObject<HTMLCanvasElement | null>): RecorderState {
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    setError(null);
    setBlobUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas not ready yet.');
      return;
    }
    const stream = (canvas as HTMLCanvasElement & {
      captureStream?: (fps?: number) => MediaStream;
    }).captureStream?.(60);
    if (!stream) {
      setError('Recording not supported in this browser (needs canvas.captureStream).');
      return;
    }
    try {
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setBlobUrl(URL.createObjectURL(blob));
        setRecording(false);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [canvasRef]);

  useEffect(() => {
    return () => {
      setBlobUrl((u) => {
        if (u) URL.revokeObjectURL(u);
        return null;
      });
    };
  }, []);

  return { recording, blobUrl, error, start, stop };
}
