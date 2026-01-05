import { transcribeAudio, TranscriptionResult } from '../GuideantsApi';

export interface AudioRecorderConfig {
  maxDurationSeconds: number;
  /** Seconds of silence before auto-stopping. Set to 0 to disable. Default: 2 */
  silenceTimeoutSeconds?: number;
  /** Audio level threshold (0-1) below which is considered silence. Default: 0.03 */
  silenceThreshold?: number;
  onTranscriptionComplete: (text: string) => void;
  onError: (error: string) => void;
  onStateChange: () => void;
}

export interface AudioRecorderState {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
}

/**
 * AudioRecorder handles audio recording and transcription for the minimal client.
 * Uses MediaRecorder API to capture audio and sends it to the server for transcription.
 */
export class AudioRecorder {
  private config: AudioRecorderConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private maxDurationTimeout: ReturnType<typeof setTimeout> | null = null;
  private startTime: number = 0;
  
  // Silence detection
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private silenceCheckInterval: ReturnType<typeof setInterval> | null = null;
  private silenceStartTime: number | null = null;
  private silenceTimeoutSeconds: number;
  private silenceThreshold: number;
  
  // API params for transcription
  private baseUrl: string = '';
  private pubId: string = '';
  private authToken: string | null = null;
  private useProxyPaths: boolean = false;
  
  // Public state
  public isRecording: boolean = false;
  public isTranscribing: boolean = false;
  public recordingDuration: number = 0;
  public isSupported: boolean = false;

  constructor(config: AudioRecorderConfig) {
    this.config = config;
    this.silenceTimeoutSeconds = config.silenceTimeoutSeconds ?? 2;
    this.silenceThreshold = config.silenceThreshold ?? 0.03;
    this.checkBrowserSupport();
  }

  private checkBrowserSupport(): void {
    this.isSupported = typeof navigator !== 'undefined' 
      && navigator.mediaDevices 
      && typeof navigator.mediaDevices.getUserMedia === 'function'
      && typeof MediaRecorder !== 'undefined';
  }

  public setApiParams(params: {
    baseUrl: string;
    pubId: string;
    authToken: string | null;
    useProxyPaths: boolean;
  }): void {
    this.baseUrl = params.baseUrl;
    this.pubId = params.pubId;
    this.authToken = params.authToken;
    this.useProxyPaths = params.useProxyPaths;
  }

  public async startRecording(): Promise<void> {
    if (!this.isSupported) {
      this.config.onError('Voice recording not supported in this browser.');
      return;
    }

    if (this.isRecording || this.isTranscribing) {
      return;
    }

    this.audioChunks = [];

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine best supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType || undefined,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = () => {
        this.config.onError('Recording error occurred.');
        this.cleanup();
        this.config.onStateChange();
      };

      // Set up onstop handler here so it works for both manual and auto-stop
      this.mediaRecorder.onstop = async () => {
        console.log('[AudioRecorder] MediaRecorder stopped');
        this.isRecording = false;
        this.clearTimers();
        this.stopSilenceDetection();
        this.stopStream();

        const chunks = this.audioChunks;
        const recordedDuration = Math.floor((Date.now() - this.startTime) / 1000);
        
        if (chunks.length === 0 || recordedDuration < 1) {
          this.config.onError('Recording too short. Please try again.');
          this.audioChunks = [];
          this.mediaRecorder = null;
          this.config.onStateChange();
          return;
        }

        const audioBlob = new Blob(chunks, { type: this.mediaRecorder!.mimeType || 'audio/webm' });
        this.audioChunks = [];
        this.mediaRecorder = null;

        // Transcribe
        this.isTranscribing = true;
        this.config.onStateChange();

        try {
          const result = await this.transcribe(audioBlob);
          
          if (!result.text || result.text.trim() === '') {
            this.config.onError('No speech detected. Please try again.');
          } else {
            this.config.onTranscriptionComplete(result.text);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Transcription failed. Please try again.';
          this.config.onError(msg);
        } finally {
          this.isTranscribing = false;
          this.config.onStateChange();
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.recordingDuration = 0;
      this.startTime = Date.now();
      this.silenceStartTime = null;

      // Update duration every 100ms
      this.durationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.recordingDuration = elapsed;
        this.config.onStateChange();
      }, 100);

      // Auto-stop at max duration - directly stop MediaRecorder
      this.maxDurationTimeout = setTimeout(() => {
        if (this.mediaRecorder?.state === 'recording') {
          console.log('[AudioRecorder] Max duration reached, stopping');
          this.mediaRecorder.stop();
        }
      }, this.config.maxDurationSeconds * 1000);

      // Set up silence detection using Web Audio API
      if (this.silenceTimeoutSeconds > 0) {
        this.setupSilenceDetection(this.stream);
      }

      this.config.onStateChange();

    } catch (err) {
      let msg = 'Failed to access microphone.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Microphone access denied. Please enable in browser settings.';
        } else if (err.name === 'NotFoundError') {
          msg = 'No microphone found on this device.';
        }
      }
      this.config.onError(msg);
      this.cleanup();
    }
  }

  public async stopRecording(): Promise<void> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return;
    }
    
    // Simply stop the recorder - the onstop handler set during startRecording will handle everything
    console.log('[AudioRecorder] Manual stop requested');
    this.mediaRecorder.stop();
  }

  public cancelRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    this.isTranscribing = false;
    this.recordingDuration = 0;
    this.cleanup();
    this.config.onStateChange();
  }

  private async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    if (!this.baseUrl || !this.pubId) {
      throw new Error('API params not configured');
    }

    return transcribeAudio({
      baseUrl: this.baseUrl,
      audioBlob,
      pubId: this.pubId,
      authToken: this.authToken || undefined,
      useProxyPaths: this.useProxyPaths,
    });
  }

  private setupSilenceDetection(stream: MediaStream): void {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3; // Lower smoothing for faster response
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      let logCounter = 0;

      console.log('[AudioRecorder] Silence detection initialized', { 
        silenceTimeoutSeconds: this.silenceTimeoutSeconds, 
        silenceThreshold: this.silenceThreshold 
      });
      
      // Start silence timer immediately
      this.silenceStartTime = Date.now();

      // Check audio level every 100ms
      this.silenceCheckInterval = setInterval(() => {
        if (!this.analyser || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average audio level (0-255 -> 0-1)
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length / 255;
        const isSilent = average < this.silenceThreshold;

        // Log every 500ms (every 5 intervals) for better visibility
        logCounter++;
        if (logCounter % 5 === 0) {
          const silenceElapsed = this.silenceStartTime ? ((Date.now() - this.silenceStartTime) / 1000).toFixed(1) : '0';
          console.log(`[AudioRecorder] level=${average.toFixed(3)} silent=${isSilent} silenceTimer=${silenceElapsed}s`);
        }

        if (!isSilent) {
          // Speech detected - reset silence timer
          this.silenceStartTime = Date.now();
        } else {
          // Silent - check if we've exceeded the timeout
          const silenceDuration = (Date.now() - this.silenceStartTime!) / 1000;
          if (silenceDuration >= this.silenceTimeoutSeconds) {
            console.log('[AudioRecorder] >>> AUTO-STOPPING after', silenceDuration.toFixed(1), 's of silence <<<');
            if (this.mediaRecorder?.state === 'recording') {
              this.mediaRecorder.stop();
            }
          }
        }
      }, 100);
    } catch (err) {
      // Silence detection is optional - continue without it if AudioContext fails
      console.warn('[AudioRecorder] Silence detection unavailable:', err);
    }
  }

  private cleanup(): void {
    this.clearTimers();
    this.stopSilenceDetection();
    this.stopStream();
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordingDuration = 0;
    this.silenceStartTime = null;
  }

  private clearTimers(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    if (this.maxDurationTimeout) {
      clearTimeout(this.maxDurationTimeout);
      this.maxDurationTimeout = null;
    }
  }

  private stopSilenceDetection(): void {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  public destroy(): void {
    this.cancelRecording();
  }

  public getState(): AudioRecorderState {
    return {
      isRecording: this.isRecording,
      isTranscribing: this.isTranscribing,
      recordingDuration: this.recordingDuration,
    };
  }
}

