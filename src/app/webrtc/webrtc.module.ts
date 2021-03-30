import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebrtcComponent } from './components/webrtc/webrtc.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [WebrtcComponent],
  exports: [
    WebrtcComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
})
export class WebrtcModule { }
