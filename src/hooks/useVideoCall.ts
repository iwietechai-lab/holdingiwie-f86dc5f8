import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Peer, { MediaConnection } from 'peerjs';

interface Participant {
  oderId: string;
  userName: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface ChatMessage {
  id: string;
  oderId: string;
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
  joinRoom: (roomId: string, oderId: string, userName: string) => Promise<void>;
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
  const peerIdRef = useRef<string>('');
  const localStreamRef = useRef<MediaStream | null>(null);
  const isLeavingRef = useRef(false);

  // Generate unique peer ID to avoid "ID is taken" errors
  const generatePeerId = (userId: string, roomId: string) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${userId.substring(0, 8)}-${roomId.substring(0, 8)}-${timestamp}-${random}`;
  };

  const stopAllTracks = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    }
  }, []);

  const joinRoom = useCallback(async (roomId: string, userId: string, userName: string) => {
    try {
      setError(null);
      isLeavingRef.current = false;
      roomIdRef.current = roomId;
      userIdRef.current = userId;
      userNameRef.current = userName;
      
      // Generate unique peer ID for this session
      const peerId = generatePeerId(userId, roomId);
      peerIdRef.current = peerId;

      console.log('Joining room with peer ID:', peerId);

      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;

      // Initialize PeerJS with unique ID
      const peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ]
        }
      });

      peer.on('open', (id) => {
        console.log('PeerJS connected with ID:', id);
        setIsConnected(true);

        // Announce presence to room via Supabase Realtime
        broadcastPresence('join', id);
      });

      peer.on('call', (call) => {
        console.log('Receiving call from:', call.peer);
        // Answer the call with our stream
        call.answer(localStreamRef.current!);
        handleIncomingCall(call);
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err.type, err.message);
        // Only show error if not leaving
        if (!isLeavingRef.current) {
          setError(`Error de conexión: ${err.message}`);
        }
      });

      peer.on('disconnected', () => {
        console.log('PeerJS disconnected');
        // Try to reconnect if not intentionally leaving
        if (!isLeavingRef.current && peer.disconnected) {
          console.log('Attempting to reconnect...');
          peer.reconnect();
        }
      });

      peerRef.current = peer;

      // Subscribe to Supabase Realtime for signaling
      const channel = supabase
        .channel(`video-room-${roomId}`)
        .on('broadcast', { event: 'presence' }, ({ payload }) => {
          console.log('Received presence:', payload);
          // If someone else joined, call them
          if (payload.oderId !== peerIdRef.current && payload.action === 'join') {
            console.log('New participant joined, calling:', payload.peerId);
            // Small delay to ensure peer is ready
            setTimeout(() => {
              callPeer(payload.peerId, payload.userName, payload.oderId);
            }, 500);
          }
        })
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
          setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            oderId: payload.oderId,
            userName: payload.userName,
            message: payload.message,
            timestamp: new Date(payload.timestamp),
          }]);
        })
        .on('broadcast', { event: 'leave' }, ({ payload }) => {
          console.log('Participant leaving:', payload);
          // Remove participant
          const connection = connectionsRef.current.get(payload.peerId);
          if (connection) {
            connection.close();
            connectionsRef.current.delete(payload.peerId);
          }
          setParticipants(prev => {
            const newMap = new Map(prev);
            newMap.delete(payload.oderId);
            return newMap;
          });
        })
        .subscribe((status) => {
          console.log('Channel subscription status:', status);
        });

      channelRef.current = channel;

    } catch (err: any) {
      console.error('Error joining room:', err);
      setError(err.message);
    }
  }, []);

  const broadcastPresence = useCallback((action: 'join' | 'leave', peerId?: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: action === 'join' ? 'presence' : 'leave',
        payload: {
          oderId: userIdRef.current,
          peerId: peerId || peerIdRef.current,
          userName: userNameRef.current,
          action,
        },
      });
    }
  }, []);

  const callPeer = useCallback((peerId: string, peerName: string, oderId: string) => {
    if (!peerRef.current || !localStreamRef.current) {
      console.log('Cannot call peer - missing peer or stream');
      return;
    }

    console.log('Calling peer:', peerId, 'with name:', peerName);
    
    try {
      const call = peerRef.current.call(peerId, localStreamRef.current);
      if (call) {
        handleIncomingCall(call, peerName, oderId);
      }
    } catch (err) {
      console.error('Error calling peer:', err);
    }
  }, []);

  const handleIncomingCall = useCallback((call: MediaConnection, peerName?: string, oderId?: string) => {
    const odId = oderId || call.peer;
    
    call.on('stream', (remoteStream) => {
      console.log('Received stream from:', call.peer, 'userId:', odId);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(odId, {
          oderId: odId,
          userName: peerName || 'Participante',
          stream: remoteStream,
          audioEnabled: true,
          videoEnabled: true,
        });
        return newMap;
      });
    });

    call.on('close', () => {
      console.log('Call closed:', call.peer);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.delete(odId);
        return newMap;
      });
      connectionsRef.current.delete(call.peer);
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
    });

    connectionsRef.current.set(call.peer, call);
  }, []);

  const leaveRoom = useCallback(() => {
    console.log('Leaving room...');
    isLeavingRef.current = true;
    
    // Broadcast leave before disconnecting
    broadcastPresence('leave');

    // Stop all tracks on local stream
    stopAllTracks(localStreamRef.current);
    stopAllTracks(localStream);
    
    setLocalStream(null);
    localStreamRef.current = null;

    // Close all peer connections
    connectionsRef.current.forEach(connection => {
      try {
        connection.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    });
    connectionsRef.current.clear();

    // Destroy peer
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (e) {
        console.error('Error destroying peer:', e);
      }
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
    setError(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
    
    console.log('Left room successfully');
  }, [localStream, broadcastPresence, stopAllTracks]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

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
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => track.stop());
        }

        setLocalStream(stream);
        localStreamRef.current = stream;
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
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => track.stop());
        }

        // Create new stream with screen video and original audio
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        const newStream = new MediaStream([
          screenTrack,
          ...(audioTrack ? [audioTrack] : []),
        ]);

        setLocalStream(newStream);
        localStreamRef.current = newStream;
        setIsScreenSharing(true);
      }
    } catch (err: any) {
      console.error('Error toggling screen share:', err);
      setError(err.message);
    }
  }, [isScreenSharing]);

  const startRecording = useCallback(() => {
    if (!localStreamRef.current) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(localStreamRef.current, {
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
  }, []);

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
        oderId: userIdRef.current,
        userName: userNameRef.current,
        message,
        timestamp,
      },
    });

    // Add to local messages
    setChatMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      oderId: userIdRef.current,
      userName: userNameRef.current,
      message,
      timestamp: new Date(timestamp),
    }]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!isLeavingRef.current) {
        // Stop all tracks on cleanup
        stopAllTracks(localStreamRef.current);
        
        if (peerRef.current) {
          try {
            peerRef.current.destroy();
          } catch (e) {
            console.error('Error destroying peer on unmount:', e);
          }
        }
        
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
      }
    };
  }, [stopAllTracks]);

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