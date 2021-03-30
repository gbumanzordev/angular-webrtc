import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { servers } from '../../utils/servers';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { firebaseConfig } from '../../utils/firebase-config';
import Firestore = firebase.firestore.Firestore;

@Component({
  selector: 'app-webrtc',
  templateUrl: './webrtc.component.html',
  styleUrls: ['./webrtc.component.scss'],
})
export class WebrtcComponent implements OnInit {
  peerConnection: RTCPeerConnection = new RTCPeerConnection(servers);
  localStream!: MediaStream;
  remoteStream!: MediaStream;
  firestore!: Firestore;
  callInput = '';
  callStarted = false;

  @ViewChild('localVideo', { static: false }) webcamVideo!: ElementRef;
  @ViewChild('remoteVideo', { static: false }) remoteVideo!: ElementRef;

  ngOnInit(): void {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    this.firestore = firebase.firestore();
  }

  async webcamButton(): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    this.remoteStream = new MediaStream();

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };
    this.webcamVideo.nativeElement.srcObject = this.localStream;
    this.remoteVideo.nativeElement.srcObject = this.remoteStream;
    this.callStarted = true;
  }

  async callButtonClick(): Promise<void> {
    const callDoc = this.firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    this.callInput = callDoc.id;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        offerCandidates.add(event.candidate.toJSON());
      }
    };

    // Create offer
    const offerDescription = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.set({ offer });

    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!this.peerConnection.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        this.peerConnection.setRemoteDescription(answerDescription);
      }
    });

    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.peerConnection.addIceCandidate(candidate);
        }
      });
    });
  }

  async answerButton(): Promise<void> {
    const callId = this.callInput;
    const callDoc = this.firestore.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        answerCandidates.add(event.candidate.toJSON());
      }
    };

    const callData = (await callDoc.get()).data();

    const offerDescription = callData?.offer;
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offerDescription)
    );

    const answerDescription = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answerDescription);

    const { type, sdp } = answerDescription;
    const answer = { type, sdp };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          this.peerConnection.addIceCandidate(
            new RTCIceCandidate(change.doc.data())
          );
        }
      });
    });
  }

  hangUpCall(): void {
    // TODO : Add logic to cancel call.
    this.webcamVideo.nativeElement.srcObject = null;
    this.remoteVideo.nativeElement.srcObject = null;
    this.callStarted = false;
  }
}
