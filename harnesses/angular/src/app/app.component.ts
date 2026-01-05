import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [
    `:host { font-family: ui-sans-serif, system-ui; display: block; padding: 24px; }`
  ]
})
export class AppComponent implements AfterViewInit {
  @ViewChild('conv', { static: true }) conv!: ElementRef<HTMLElement>;

  private readonly apiBaseUrl = 'http://localhost:5106';
  private readonly pubId = '11111111-1111-1111-1111-111111111111';

  // Simple local auth service, matching the other harnesses
  private authService = {
    getToken: async () => 'demo-valid-token',
    refreshToken: async () => 'demo-valid-token'
  };

  async ngAfterViewInit(): Promise<void> {
    const el = this.conv?.nativeElement as any;
    if (!el) return;

    // Configure via the web component's public API
    el.setApiBaseUrl(this.apiBaseUrl);
    el.setPubId(this.pubId);

    const token = await this.authService.getToken();
    el.setAuthToken(token);

    try {
      const cfg = await el.testAuthentication();
      // eslint-disable-next-line no-console
      console.log('[angular harness] Published guide config:', cfg);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[angular harness] Authentication/config test failed:', err);
    }

    el.addEventListener('wf-complete', (e: any) => {
      // eslint-disable-next-line no-console
      console.log('[angular harness] Complete', e.detail);
    });

    el.addEventListener('wf-error', (e: any) => {
      // eslint-disable-next-line no-console
      console.error('[angular harness] Error', e.detail);
    });

    el.addEventListener('wf-auth-error', async (e: any) => {
      // eslint-disable-next-line no-console
      console.warn('[angular harness] Auth error from component:', e.detail);
      const newToken = await this.authService.refreshToken();
      el.setAuthToken(newToken);
    });
  }
}


