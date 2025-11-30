import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Task, Priority, Recurrence } from '../types';

// Helper to encode audio blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Decode base64 to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Convert raw PCM data to AudioBuffer
async function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert 16-bit PCM to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  // 1. Transcribe Audio (Voice Input)
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!this.apiKey) throw new Error("API Key missing");

    const base64Audio = await blobToBase64(audioBlob);
    
    // Using gemini-2.5-flash for audio transcription as requested
    const model = this.ai.models;
    
    const result = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Audio
            }
          },
          {
            text: "Transcribe this audio exactly as spoken. Return only the text."
          }
        ]
      }
    });

    return result.text || "";
  }

  // 2. Parse Natural Language into Task Object
  async parseTaskFromText(text: string): Promise<Partial<Task>> {
    if (!this.apiKey) throw new Error("API Key missing");

    const model = this.ai.models;
    
    const result = await model.generateContent({
      model: 'gemini-2.5-flash', // Using flash for speed/cost
      contents: `Extract task details from the following text: "${text}". 
                 If the date is relative (e.g. tomorrow), calculate the ISO date assuming today is ${new Date().toISOString()}.
                 If start time or end time is mentioned (e.g. "at 2pm", "from 10 to 11"), extract them in "HH:mm" 24-hour format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            dueDate: { type: Type.STRING, description: "ISO 8601 date string" },
            startTime: { type: Type.STRING, description: "Start time in HH:mm format" },
            endTime: { type: Type.STRING, description: "End time in HH:mm format" },
            priority: { type: Type.STRING, enum: [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT] },
            category: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            recurrence: { type: Type.STRING, enum: [Recurrence.NONE, Recurrence.DAILY, Recurrence.WEEKLY, Recurrence.MONTHLY] }
          },
          required: ["title"]
        }
      }
    });

    if (result.text) {
      return JSON.parse(result.text);
    }
    return { title: text };
  }

  // 3. Generate Speech (TTS)
  async speakText(text: string): Promise<void> {
    if (!this.apiKey) throw new Error("API Key missing");

    const model = this.ai.models;
    
    // Using gemini-2.5-flash-preview-tts as requested
    const response = await model.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Fenrir is usually deep and clear
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    // Decode and play raw PCM audio
    const sampleRate = 24000; // Gemini TTS standard sample rate
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    
    const pcmData = decode(base64Audio);
    const audioBuffer = await pcmToAudioBuffer(pcmData, audioContext, sampleRate, 1);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  }
}

export const geminiService = new GeminiService();