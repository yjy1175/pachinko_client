import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Video = styled.video`
  width: 100%;
  max-width: 800px;
  height: auto;
`;

const VideoStream = ({ signalingServerUrl }) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    let peerConnection = null;
    let socket = useRef(null);

    useEffect(() => {
        // 웹소켓 연결
        const connectWebSocket = () => {
            socket = new WebSocket(signalingServerUrl);

            // 웹소켓 연결 이벤트 처리
            socket.onopen = () => {
                console.log('WebSocket 연결 성공');

                initializePeerConnection();

                sendOffer();
            };

            // 웹소켓 메시지 수신 이벤트 처리
            socket.onmessage = async event => {
                const blobData = event.data;

                // Blob 데이터를 ArrayBuffer로 읽어오기
                const arrayBuffer = await blobData.arrayBuffer();

                // ArrayBuffer를 텍스트로 변환
                const textData = new TextDecoder('utf-8').decode(arrayBuffer);

                // JSON으로 파싱
                const signal = JSON.parse(textData);

                if (signal.type === 'offer') {
                    // Offer 메시지 수신 시 처리
                    await handleOfferMessage(signal.message);
                } else if (signal.type === 'answer') {
                    // Answer 메시지 수신 시 처리
                    await handleAnswerMessage(signal.message);
                } else if (signal.type === 'candidate') {
                    // ICE Candidate 메시지 수신 시 처리
                    handleIceCandidateMessage(signal.message);
                }
            };

            // 웹소켓 에러 처리
            socket.onerror = error => {
                console.error('WebSocket 에러:', error);
            };

            // 웹소켓 연결 닫힘 처리
            socket.onclose = () => {
                console.log('WebSocket 연결 닫힘');
            };
        };
        // WebRTC 연결 설정
        const initializePeerConnection = async () => {
            try {
                // ICE 서버 설정
                const configuration = {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        // Add more ICE servers as needed
                    ],
                };

                // Peer Connection 생성
                peerConnection = new RTCPeerConnection(configuration);

                // ICE Candidate 수신 시 시그널링 서버로 전송
                peerConnection.onicecandidate = event => {
                    if (event.candidate) {
                        sendToServer({ type: 'candidate', message: JSON.stringify(event.candidate) });
                    }
                };

                // 원격 비디오 스트림 수신 시 처리
                peerConnection.ontrack = event => {
                    if (event.track.kind === 'video' && videoRef.current) {
                        videoRef.current.srcObject = event.streams[0];
                    } else if (event.track.kind === 'audio' && audioRef.current) {
                        audioRef.current.srcObject = event.streams[0];
                    }
                };
            } catch (error) {
                console.error('Error initializing Peer Connection:', error);
            }
        };

        // Offer 메시지 처리 함수
        const handleOfferMessage = async offerString => {
            try {
                const offerData = JSON.parse(offerString);
                const offerInit = {
                    type: "offer",
                    sdp: offerData.sdp,
                }
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offerInit));
                const answer = await peerConnection.createAnswer();
                peerConnection.setLocalDescription(answer);

                const answerData = {
                    type: answer.type,
                    sdp: answer.sdp
                };

                sendToServer({ type: 'answer', message: JSON.stringify(answerData) });
            } catch (error) {
                console.error('Error handling Offer message:', error);
            }
        };
        // Answer 메시지 처리 함수
        const handleAnswerMessage = async answerString => {
            try {
                const answerData = JSON.parse(answerString);
                const answerInit = {
                    type: "answer",
                    sdp: answerData.sdp
                }
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answerInit));
            } catch (error) {
                console.error('Error handling Answer message:', error);
            }
        };
        // ICE Candidate 메시지 처리 함수
        const handleIceCandidateMessage = icecandidateString => {
            try {
                const icecandidate = JSON.parse(icecandidateString);
                peerConnection.addIceCandidate(new RTCIceCandidate(icecandidate));
            } catch (error) {
                console.error('Error handling ICE Candidate message:', error);
            }
        };
        // 서버로 메시지 전송
        const sendToServer = message => {
            socket.send(JSON.stringify(message));
        };
        // 원격 피어에게 오퍼 전송
        const sendOffer = async () => {
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                const offerData = {
                    type: offer.type,
                    sdp: offer.sdp,
                };

                sendToServer({ type: 'offer', message: JSON.stringify(offerData) });
            } catch (error) {
                console.error('Error creating and sending offer:', error);
            }
        };

        connectWebSocket();
    }, [signalingServerUrl]);

    return (
        <Video ref={videoRef} autoPlay controls />
    );
};

export default VideoStream;