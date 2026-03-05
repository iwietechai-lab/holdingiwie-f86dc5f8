import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface UseMeetingRecordingReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => Promise<{
    transcription: string;
    summary: string;
    durationSeconds: number;
  } | null>;
  isProcessing: boolean;
}

export function useMeetingRecording(): UseMeetingRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback((stream: MediaStream) => {
    try {
      recordedChunksRef.current = [];
      setRecordingDuration(0);
      startTimeRef.current = Date.now();
      
      const audioStream = new MediaStream(stream.getAudioTracks());
      
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      logger.log('Recording started');
    } catch (error) {
      logger.error('Error starting recording:', error);
      toast.error('Error al iniciar la grabación');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return null;
    
    setIsProcessing(true);
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    return new Promise<{
      transcription: string;
      summary: string;
      durationSeconds: number;
    } | null>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        setIsRecording(false);
        
        if (recordedChunksRef.current.length === 0) {
          setIsProcessing(false);
          resolve(null);
          return;
        }

        try {
          const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              
              toast.info('Transcribiendo audio...');
              const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-audio', {
                body: { audio: base64Audio, mimeType: 'audio/webm' },
              });

              if (transcriptionError) {
                logger.error('Transcription error:', transcriptionError);
                throw new Error('Error al transcribir audio');
              }

              const transcription = transcriptionData?.text || '';
              
              if (!transcription) {
                toast.warning('No se detectó audio para transcribir');
                setIsProcessing(false);
                resolve({ transcription: '', summary: '', durationSeconds });
                return;
              }

              toast.info('Generando resumen...');
              const { data: summaryData, error: summaryError } = await supabase.functions.invoke('generate-meeting-summary', {
                body: { 
                  transcription,
                  duration_seconds: durationSeconds,
                },
              });

              if (summaryError) {
                logger.error('Summary error:', summaryError);
              }

              const summary = summaryData?.summary || '';

              setIsProcessing(false);
              resolve({ transcription, summary, durationSeconds });
            } catch (error) {
              logger.error('Processing error:', error);
              setIsProcessing(false);
              resolve(null);
            }
          };

          reader.onerror = () => {
            logger.error('Error reading audio blob');
            setIsProcessing(false);
            resolve(null);
          };
        } catch (error) {
          logger.error('Error processing recording:', error);
          setIsProcessing(false);
          resolve(null);
        }
      };

      mediaRecorderRef.current!.stop();
    });
  }, []);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    isProcessing,
  };
}
