import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  onTaskParsed?: (task: any) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscription, onTaskParsed }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        try {
          // 1. Transcribe
          const text = await geminiService.transcribeAudio(audioBlob);
          onTranscription(text);

          // 2. Try to parse as task if callback provided
          if (onTaskParsed && text.length > 5) {
             const taskData = await geminiService.parseTaskFromText(text);
             onTaskParsed(taskData);
          }

        } catch (err) {
          console.error("Voice processing error:", err);
          alert("Failed to process voice input. Check API Key.");
        } finally {
          setIsProcessing(false);
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="relative inline-flex">
       <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 shadow-sm
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-200 dark:ring-red-900' 
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
          ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}
        `}
        title="Click to speak task"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
        <span className="hidden sm:inline">
          {isProcessing ? 'Thinking...' : isRecording ? 'Listening...' : 'Voice Add'}
        </span>
        {!isRecording && !isProcessing && <Sparkles className="w-4 h-4 ml-1 text-indigo-200" />}
      </button>
    </div>
  );
};