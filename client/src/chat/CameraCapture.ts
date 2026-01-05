/**
 * CameraCapture handles camera access and still image capture for the minimal client.
 * Uses getUserMedia API to access the device camera.
 */
export interface CameraCaptureConfig {
  maxWidth: number;
  maxHeight: number;
  imageQuality: number;
  preferredFacingMode: 'user' | 'environment';
  onCapture: (blob: Blob, fileName: string) => Promise<void>;
  onError: (error: string) => void;
  onStateChange: () => void;
}

export interface CameraCaptureState {
  isOpen: boolean;
  isCapturing: boolean;
  capturedImageDataUrl: string | null;
  availableCameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
}

export class CameraCapture {
  private config: CameraCaptureConfig;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private capturedBlob: Blob | null = null;
  
  // Public state
  public isOpen: boolean = false;
  public isCapturing: boolean = false;
  public capturedImageDataUrl: string | null = null;
  public availableCameras: MediaDeviceInfo[] = [];
  public selectedCameraId: string | null = null;
  public isSupported: boolean = false;

  constructor(config: CameraCaptureConfig) {
    this.config = config;
    this.checkBrowserSupport();
  }

  private checkBrowserSupport(): void {
    this.isSupported = typeof navigator !== 'undefined'
      && navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function';
  }

  public async loadCameras(): Promise<void> {
    if (!this.isSupported) return;

    try {
      // Request permission first to get real labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(d => d.kind === 'videoinput');
    } catch (err) {
      console.error('Failed to enumerate cameras:', err);
    }
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  private async startStream(deviceId?: string): Promise<void> {
    if (!this.isSupported || !this.videoElement) {
      return;
    }

    try {
      this.stopStream();

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: this.config.preferredFacingMode },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      // Update selected camera
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.deviceId) {
          this.selectedCameraId = settings.deviceId;
        }
      }
    } catch (err) {
      let msg = 'Failed to access camera.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Camera access denied. Please enable in browser settings.';
        } else if (err.name === 'NotFoundError') {
          msg = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          msg = 'Camera is being used by another application.';
        }
      }
      this.config.onError(msg);
    }
  }

  public async open(shadowRoot: ShadowRoot): Promise<void> {
    if (!this.isSupported) {
      this.config.onError('Camera capture not supported in this browser.');
      return;
    }

    this.isOpen = true;
    this.capturedImageDataUrl = null;
    this.capturedBlob = null;
    this.config.onStateChange();

    // Create modal in shadow DOM
    this.createModal(shadowRoot);

    await this.loadCameras();
    await this.startStream();
    this.config.onStateChange();
  }

  private createModal(shadowRoot: ShadowRoot): void {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'wf-camera-modal';
    modal.className = 'wf-camera-modal';
    modal.innerHTML = `
      <button id="wf-camera-close" class="wf-camera-close" aria-label="Close camera">×</button>
      
      <div id="wf-camera-error" class="wf-camera-error hidden"></div>
      
      <div class="wf-camera-preview-container">
        <video id="wf-camera-video" autoplay playsinline muted class="wf-camera-preview"></video>
        <img id="wf-camera-captured" class="wf-camera-preview hidden" alt="Captured photo" />
      </div>
      
      <canvas id="wf-camera-canvas" class="hidden"></canvas>
      
      <div id="wf-camera-selector" class="wf-camera-selector hidden">
        <label>Camera:</label>
        <select id="wf-camera-select"></select>
      </div>
      
      <div class="wf-camera-controls">
        <button id="wf-camera-retake" class="wf-camera-btn wf-camera-btn-secondary hidden">Retake</button>
        <button id="wf-camera-capture" class="wf-camera-capture-btn">
          <span id="wf-camera-capture-inner"></span>
        </button>
        <button id="wf-camera-confirm" class="wf-camera-btn wf-camera-btn-primary hidden">Use Photo</button>
      </div>
    `;

    // Get overlay root or create one
    let overlayRoot = shadowRoot.querySelector('#wf-overlay-root') as HTMLElement;
    if (!overlayRoot) {
      overlayRoot = document.createElement('div');
      overlayRoot.id = 'wf-overlay-root';
      shadowRoot.appendChild(overlayRoot);
    }
    overlayRoot.appendChild(modal);

    // Bind elements
    this.videoElement = modal.querySelector('#wf-camera-video') as HTMLVideoElement;
    this.canvasElement = modal.querySelector('#wf-camera-canvas') as HTMLCanvasElement;
    
    const closeBtn = modal.querySelector('#wf-camera-close') as HTMLButtonElement;
    const captureBtn = modal.querySelector('#wf-camera-capture') as HTMLButtonElement;
    const retakeBtn = modal.querySelector('#wf-camera-retake') as HTMLButtonElement;
    const confirmBtn = modal.querySelector('#wf-camera-confirm') as HTMLButtonElement;
    const cameraSelect = modal.querySelector('#wf-camera-select') as HTMLSelectElement;

    // Bind events
    closeBtn.addEventListener('click', () => this.close(shadowRoot));
    captureBtn.addEventListener('click', () => this.capture(shadowRoot));
    retakeBtn.addEventListener('click', () => this.retake(shadowRoot));
    confirmBtn.addEventListener('click', () => this.confirm(shadowRoot));
    cameraSelect.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      this.switchCamera(select.value, shadowRoot);
    });

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close(shadowRoot);
      }
    };
    modal.addEventListener('keydown', handleKeyDown);
    (modal as any)._keyHandler = handleKeyDown;
  }

  private updateModalUI(shadowRoot: ShadowRoot): void {
    const modal = shadowRoot.querySelector('#wf-camera-modal');
    if (!modal) return;

    const video = modal.querySelector('#wf-camera-video') as HTMLVideoElement;
    const capturedImg = modal.querySelector('#wf-camera-captured') as HTMLImageElement;
    const captureBtn = modal.querySelector('#wf-camera-capture') as HTMLButtonElement;
    const retakeBtn = modal.querySelector('#wf-camera-retake') as HTMLButtonElement;
    const confirmBtn = modal.querySelector('#wf-camera-confirm') as HTMLButtonElement;
    const selectorDiv = modal.querySelector('#wf-camera-selector') as HTMLDivElement;
    const cameraSelect = modal.querySelector('#wf-camera-select') as HTMLSelectElement;

    if (this.capturedImageDataUrl) {
      // Review mode
      video.classList.add('hidden');
      capturedImg.src = this.capturedImageDataUrl;
      capturedImg.classList.remove('hidden');
      captureBtn.classList.add('hidden');
      retakeBtn.classList.remove('hidden');
      confirmBtn.classList.remove('hidden');
      selectorDiv.classList.add('hidden');
    } else {
      // Camera mode
      video.classList.remove('hidden');
      capturedImg.classList.add('hidden');
      captureBtn.classList.remove('hidden');
      retakeBtn.classList.add('hidden');
      confirmBtn.classList.add('hidden');

      // Camera selector
      if (this.availableCameras.length > 1) {
        selectorDiv.classList.remove('hidden');
        cameraSelect.innerHTML = this.availableCameras.map((cam, i) => 
          `<option value="${cam.deviceId}" ${cam.deviceId === this.selectedCameraId ? 'selected' : ''}>
            ${cam.label || `Camera ${i + 1}`}
          </option>`
        ).join('');
      } else {
        selectorDiv.classList.add('hidden');
      }
    }
  }

  public capture(shadowRoot: ShadowRoot): void {
    if (!this.videoElement || !this.canvasElement) return;

    this.isCapturing = true;
    this.config.onStateChange();

    try {
      const video = this.videoElement;
      const canvas = this.canvasElement;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Calculate scaled dimensions
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > this.config.maxWidth) {
        height = (height * this.config.maxWidth) / width;
        width = this.config.maxWidth;
      }
      if (height > this.config.maxHeight) {
        width = (width * this.config.maxHeight) / height;
        height = this.config.maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw video frame
      ctx.drawImage(video, 0, 0, width, height);

      // Get data URL
      this.capturedImageDataUrl = canvas.toDataURL('image/jpeg', this.config.imageQuality);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          this.capturedBlob = blob;
        },
        'image/jpeg',
        this.config.imageQuality
      );

      // Stop stream
      this.stopStream();

      this.updateModalUI(shadowRoot);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to capture image.';
      this.config.onError(msg);
    } finally {
      this.isCapturing = false;
      this.config.onStateChange();
    }
  }

  public async retake(shadowRoot: ShadowRoot): Promise<void> {
    this.capturedImageDataUrl = null;
    this.capturedBlob = null;
    await this.startStream(this.selectedCameraId || undefined);
    this.updateModalUI(shadowRoot);
    this.config.onStateChange();
  }

  public async confirm(shadowRoot: ShadowRoot): Promise<void> {
    if (!this.capturedBlob) return;

    const fileName = `camera-capture-${Date.now()}.jpg`;
    
    try {
      await this.config.onCapture(this.capturedBlob, fileName);
      this.close(shadowRoot);
    } catch (err) {
      console.error('Failed to upload captured image:', err);
    }
  }

  public async switchCamera(deviceId: string, shadowRoot: ShadowRoot): Promise<void> {
    await this.startStream(deviceId);
    this.updateModalUI(shadowRoot);
    this.config.onStateChange();
  }

  public close(shadowRoot: ShadowRoot): void {
    this.stopStream();
    this.isOpen = false;
    this.capturedImageDataUrl = null;
    this.capturedBlob = null;
    this.selectedCameraId = null;
    this.videoElement = null;
    this.canvasElement = null;

    // Remove modal
    const modal = shadowRoot.querySelector('#wf-camera-modal');
    if (modal) {
      modal.remove();
    }

    this.config.onStateChange();
  }

  public destroy(): void {
    this.stopStream();
    this.videoElement = null;
    this.canvasElement = null;
  }

  public getState(): CameraCaptureState {
    return {
      isOpen: this.isOpen,
      isCapturing: this.isCapturing,
      capturedImageDataUrl: this.capturedImageDataUrl,
      availableCameras: this.availableCameras,
      selectedCameraId: this.selectedCameraId,
    };
  }
}

