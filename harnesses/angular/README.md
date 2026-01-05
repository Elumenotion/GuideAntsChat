# Angular Harness (integration guide)

This guide shows how to consume the `guideants-chat` Custom Element in an Angular app.

## 1) Enable Custom Elements

In your `AppModule` (or standalone bootstrap), add `CUSTOM_ELEMENTS_SCHEMA`:

```ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
```

## 2) Load the web component bundle

Add the built IIFE script to `index.html` (or serve from assets):

```html
<script src="/assets/guideants-chat.iife.js"></script>
```

Alternatively import in `angular.json` under `architect.build.options.scripts`.

## 3) Use the element in a template

```html
<guideants-chat api-base-url="http://localhost:5099"></guideants-chat>
```

## 4) Listen to events

Angular doesn’t natively bind Custom Event names; use `ViewChild` to add listeners:

```ts
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({ selector: 'app-root', template: `<guideants-chat #conv api-base-url="http://localhost:5099"></guideants-chat>` })
export class AppComponent implements AfterViewInit {
  @ViewChild('conv', { static: true }) conv!: ElementRef<HTMLElement>;

  ngAfterViewInit() {
    const el = this.conv.nativeElement;
    el.addEventListener('wf-complete', (e: any) => console.log('Complete', e.detail));
    el.addEventListener('wf-error', (e: any) => console.error('Error', e.detail));
  }
}
```
