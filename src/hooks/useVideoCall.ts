import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Peer, { MediaConnection } from 'peerjs';

interface Participant {
  oderId: string;
  odername: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export interface UseVideoCallReturn {
  localStream: MediaStream | null;
  participants: Map<string, Participant>;
  chatMessages: ChatMessage[];
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  error: string | null;
  joinRoom: (roomId: string, userId: string, userName: string) => Promise<void>;
  leaveRoom: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => Blob | null;
  sendChatMessage: (message: string) => void;
}

export function useVideoCall(): UseVideoCallReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, MediaConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const roomIdRef = useRef<string>('');
  const userIdRef = useRef<string>('');
  const userNameRef = useRef<string>('');

  const joinRoom = useCallback(async (roomId: string, userId: string, userName: string) => {
    try {
      setError(null);
      roomIdRef.current = roomId;
      userIdRef.current = userId;
      userNameRef.current = userName;

      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);

      // Initialize PeerJS
      const peer = new Peer(userId, {
        debug: 2,
      });

      peer.on('open', (id) => {
        console.log('PeerJS connected with ID:', id);
        setIsConnected(true);

        // Announce presence to room via Supabase Realtime
        broadcastPresence('join');
      });

      peer.on('call', (call) => {
        console.log('Receiving call from:', call.peer);
        call.answer(stream);
        handleIncomingCall(call);
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        setError(err.message);
      });

      peerRef.current = peer;

      // Subscribe to Supabase Realtime for signaling
      const channel = supabase
        .channel(`video-room-${roomId}`)
        .on('broadcast', { event: 'presence' }, ({ payload }) => {
          if (payload.userId !== userId && payload.action === 'join') {
            // New participant joined, call them
            callPeer(payload.userId, payload.userName, stream);
          }
        })
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
          setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            userId: payload.userId,
            userName: payload.userName,
            message: payload.message,
            timestamp: new Date(payload.timestamp),
          }]);
        })
        .on('broadcast', { event: 'leave' }, ({ payload }) => {
          // Remove participant
          const connection = connectionsRef.current.get(payload.userId);
          if (connection) {
            connection.close();
            connectionsRef.current.delete(payload.userId);
          }
          setParticipants(prev => {
            const newMap = new Map(prev);
            newMap.delete(payload.userId);
            return newMap;
          });
        })
        .subscribe();

      channelRef.current = channel;

    } catch (err: any) {
      console.error('Error joining room:', err);
      setError(err.message);
    }
  }, []);

  const broadcastPresence = useCallback((action: 'join' | 'leave') => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'presence',
        payload: {
          userId: userIdRef.current,
          userName: userNameRef.current,
          action,
        },
      });
    }
  }, []);

  const callPeer = useCallback((peerId: string, peerName: string, stream: MediaStream) => {
    if (!peerRef.current) return;

    console.log('Calling peer:', peerId);
    const call = peerRef.current.call(peerId, stream);
    handleIncomingCall(call, peerName);
  }, []);

  const handleIncomingCall = useCallback((call: MediaConnection, peerName?: string) => {
    call.on('stream', (remoteStream) => {
      console.log('Received stream from:', call.peer);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(call.peer, {
          oderId: call.peer,
          odername: peerName || 'Participante',
          stream: remoteStream,
          audioEnabled: true,
          videoEnabled: true,
        });
        return newMap;
      });
    });

    call.on('close', () => {
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.delete(call.peer);
        return newMap;
      });
    });

    connectionsRef.current.set(call.peer, call);
  }, []);

  const leaveRoom = useCallback(() => {
    broadcastPresence('leave');

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Close all peer connections
    connectionsRef.current.forEach(connection => connection.close());
    connectionsRef.current.clear();

    // Destroy peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setParticipants(new Map());
    setIsConnected(false);
    setChatMessages([]);
  }, [localStream, broadcastPresence]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing, revert to camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        // Replace video track in all connections
        const videoTrack = stream.getVideoTracks()[0];
        connectionsRef.current.forEach(connection => {
          const sender = (connection as any).peerConnection?.getSenders()?.find(
            (s: any) => s.track?.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Stop old stream video track
        if (localStream) {
          localStream.getVideoTracks().forEach(track => track.stop());
        }

        setLocalStream(stream);
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in all connections
        connectionsRef.current.forEach(connection => {
          const sender = (connection as any).peerConnection?.getSenders()?.find(
            (s: any) => s.track?.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Listen for screen share stop
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        // Stop camera video track
        if (localStream) {
          localStream.getVideoTracks().forEach(track => track.stop());
        }

        // Create new stream with screen video and original audio
        const audioTrack = localStream?.getAudioTracks()[0];
        const newStream = new MediaStream([
          screenTrack,
          ...(audioTrack ? [audioTrack] : []),
        ]);

        setLocalStream(newStream);
        setIsScreenSharing(true);
      }
    } catch (err: any) {
      console.error('Error toggling screen share:', err);
      setError(err.message);
    }
  }, [isScreenSharing, localStream]);

  const startRecording = useCallback(() => {
    if (!localStream) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(localStream, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(1000); // Collect data every second
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  }, [localStream]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return null;

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    if (recordedChunksRef.current.length > 0) {
      return new Blob(recordedChunksRef.current, { type: 'video/webm' });
    }
    return null;
  }, []);

  const sendChatMessage = useCallback((message: string) => {
    if (!channelRef.current) return;

    const timestamp = new Date().toISOString();
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: {
        userId: userIdRef.current,
        userName: userNameRef.current,
        message,
        timestamp,
      },
    });

    // Add to local messages
    setChatMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      userId: userIdRef.current,
      userName: userNameRef.current,
      message,
      timestamp: new Date(timestamp),
    }]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  return {
    localStream,
    participants,
    chatMessages,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isRecording,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    sendChatMessage,
  };
}
