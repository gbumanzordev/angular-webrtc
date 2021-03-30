import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { WebrtcModule } from './webrtc/webrtc.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, WebrtcModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
