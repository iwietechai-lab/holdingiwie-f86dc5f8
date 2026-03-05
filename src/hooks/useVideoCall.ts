import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Peer, { MediaConnection } from 'peerjs';
import { logger } from '@/utils/logger';

interface Participant {
  oderId: string;
  peerId: string;
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

// Track active sessions globally to prevent duplicates
const activeRoomSessions = new Map<string, Set<string>>();

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
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const knownParticipantsRef = useRef<Set<string>>(new Set());
  const connectionTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique peer ID - simpler format to avoid issues
  const generatePeerId = (userId: string, roomId: string) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    // Use shorter, cleaner format
    return `p_${userId.substring(0, 6)}_${random}_${timestamp % 100000}`;
  };

  const stopAllTracks = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
    }
  }, []);

  const clearConnectionTimeout = useCallback((peerId: string) => {
    const timeout = connectionTimeoutsRef.current.get(peerId);
    if (timeout) {
      clearTimeout(timeout);
      connectionTimeoutsRef.current.delete(peerId);
    }
  }, []);

  const removeParticipant = useCallback((oderId: string, peerId?: string) => {
    console.log('Removing participant:', oderId, peerId);
    
    // Clean up connection
    if (peerId) {
      const connection = connectionsRef.current.get(peerId);
      if (connection) {
        try {
          connection.close();
        } catch (e) {
          console.error('Error closing connection:', e);
        }
        connectionsRef.current.delete(peerId);
      }
      clearConnectionTimeout(peerId);
    }
    
    // Remove from known participants
    knownParticipantsRef.current.delete(oderId);
    
    // Update state
    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.delete(oderId);
      return newMap;
    });
  }, [clearConnectionTimeout]);

  const handleIncomingCall = useCallback((call: MediaConnection, peerName?: string, oderId?: string) => {
    const odId = oderId || call.metadata?.oderId || call.peer;
    const name = peerName || call.metadata?.userName || 'Participante';
    const callPeerId = call.peer;
    
    console.log('Handling incoming call from:', callPeerId, 'oderId:', odId, 'name:', name);
    
    // Prevent duplicate participants - check by oderId
    if (knownParticipantsRef.current.has(odId) && odId !== callPeerId) {
      console.log('Participant already exists, ignoring duplicate:', odId);
      return;
    }

    // Clear any existing timeout for this peer
    clearConnectionTimeout(callPeerId);
    
    // Set timeout for stream reception
    const timeout = setTimeout(() => {
      console.log('Stream timeout for:', callPeerId);
      // Keep participant but mark as no stream
      setParticipants(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(odId);
        if (existing && !existing.stream) {
          console.log('Removing unconnected participant:', odId);
          newMap.delete(odId);
          knownParticipantsRef.current.delete(odId);
        }
        return newMap;
      });
    }, 15000);
    
    connectionTimeoutsRef.current.set(callPeerId, timeout);

    call.on('stream', (remoteStream) => {
      console.log('Received stream from:', callPeerId, 'for user:', odId);
      clearConnectionTimeout(callPeerId);
      
      // Mark as known
      knownParticipantsRef.current.add(odId);
      
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(odId, {
          oderId: odId,
          peerId: callPeerId,
          userName: name,
          stream: remoteStream,
          audioEnabled: true,
          videoEnabled: true,
        });
        return newMap;
      });
    });

    call.on('close', () => {
      console.log('Call closed:', callPeerId);
      removeParticipant(odId, callPeerId);
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
      clearConnectionTimeout(callPeerId);
    });

    connectionsRef.current.set(callPeerId, call);
  }, [clearConnectionTimeout, removeParticipant]);

  const callPeer = useCallback((peerId: string, peerName: string, oderId: string) => {
    if (!peerRef.current || !localStreamRef.current) {
      console.log('Cannot call peer - missing peer or stream');
      return;
    }

    // Prevent duplicate calls to the same user
    if (knownParticipantsRef.current.has(oderId)) {
      console.log('Already connected to this user, skipping call:', oderId);
      return;
    }

    // Check if we already have a connection to this peer
    if (connectionsRef.current.has(peerId)) {
      console.log('Already have connection to peer:', peerId);
      return;
    }

    console.log('Calling peer:', peerId, 'with name:', peerName, 'oderId:', oderId);
    
    try {
      const call = peerRef.current.call(peerId, localStreamRef.current, {
        metadata: {
          userName: userNameRef.current,
          oderId: userIdRef.current,
        }
      });
      
      if (call) {
        handleIncomingCall(call, peerName, oderId);
      }
    } catch (err) {
      console.error('Error calling peer:', err);
    }
  }, [handleIncomingCall]);

  const broadcastPresence = useCallback((action: 'join' | 'leave' | 'heartbeat', peerId?: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: action === 'join' ? 'presence' : action === 'leave' ? 'leave' : 'heartbeat',
        payload: {
          oderId: userIdRef.current,
          peerId: peerId || peerIdRef.current,
          userName: userNameRef.current,
          action,
          timestamp: Date.now(),
        },
      });
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (!isLeavingRef.current && peerRef.current && !peerRef.current.disconnected) {
        broadcastPresence('heartbeat');
      }
    }, 10000); // Every 10 seconds
  }, [broadcastPresence]);

  const attemptReconnect = useCallback(async () => {
    if (isLeavingRef.current || reconnectAttemptRef.current >= maxReconnectAttempts) {
      if (reconnectAttemptRef.current >= maxReconnectAttempts) {
        setError('No se pudo reconectar después de varios intentos');
      }
      return;
    }

    reconnectAttemptRef.current++;
    console.log(`Reconnect attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts}`);

    if (peerRef.current && peerRef.current.disconnected && !peerRef.current.destroyed) {
      try {
        peerRef.current.reconnect();
      } catch (e) {
        console.error('Reconnect failed:', e);
        // Try again after delay
        setTimeout(() => attemptReconnect(), 2000 * reconnectAttemptRef.current);
      }
    }
  }, []);

  const joinRoom = useCallback(async (roomId: string, userId: string, userName: string) => {
    try {
      setError(null);
      isLeavingRef.current = false;
      reconnectAttemptRef.current = 0;
      roomIdRef.current = roomId;
      userIdRef.current = userId;
      userNameRef.current = userName;
      
      // Clear previous session
      knownParticipantsRef.current.clear();
      
      // Track this session
      if (!activeRoomSessions.has(roomId)) {
        activeRoomSessions.set(roomId, new Set());
      }
      activeRoomSessions.get(roomId)?.add(userId);
      
      // Generate unique peer ID for this session
      const peerId = generatePeerId(userId, roomId);
      peerIdRef.current = peerId;

      console.log('Joining room with peer ID:', peerId, 'user:', userId);

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

      // Initialize PeerJS with unique ID and better config
      const peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
          iceCandidatePoolSize: 10,
        }
      });

      peer.on('open', (id) => {
        console.log('PeerJS connected with ID:', id);
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;

        // Announce presence to room via Supabase Realtime
        setTimeout(() => {
          broadcastPresence('join', id);
          startHeartbeat();
        }, 500);
      });

      peer.on('call', (call) => {
        console.log('Receiving call from:', call.peer, 'metadata:', call.metadata);
        // Answer the call with our stream
        call.answer(localStreamRef.current!);
        handleIncomingCall(call, call.metadata?.userName, call.metadata?.oderId);
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err.type, err.message);
        
        // Only show error if not leaving
        if (!isLeavingRef.current) {
          // Handle specific errors
          if (err.type === 'unavailable-id') {
            // Generate new ID and try again
            const newPeerId = generatePeerId(userIdRef.current, roomIdRef.current);
            peerIdRef.current = newPeerId;
            console.log('ID unavailable, generated new one:', newPeerId);
          } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
            setError(`Error de conexión: ${err.message}`);
            attemptReconnect();
          } else if (err.type === 'peer-unavailable') {
            // Peer not available, this is normal when someone leaves
            console.log('Peer unavailable - may have left the call');
          } else {
            setError(`Error: ${err.message}`);
          }
        }
      });

      peer.on('disconnected', () => {
        console.log('PeerJS disconnected');
        setIsConnected(false);
        
        if (!isLeavingRef.current) {
          setError('Conexión perdida. Reconectando...');
          attemptReconnect();
        }
      });

      peer.on('close', () => {
        console.log('PeerJS closed');
        setIsConnected(false);
      });

      peerRef.current = peer;

      // Subscribe to Supabase Realtime for signaling
      const channel = supabase
        .channel(`video-room-${roomId}`, {
          config: {
            presence: {
              key: peerId,
            },
          },
        })
        .on('broadcast', { event: 'presence' }, ({ payload }) => {
          console.log('Received presence:', payload);
          
          // Ignore our own messages
          if (payload.oderId === userIdRef.current) {
            return;
          }
          
          // If someone else joined, call them
          if (payload.action === 'join' && payload.peerId) {
            console.log('New participant joined, calling:', payload.peerId);
            // Small delay to ensure peer is ready
            setTimeout(() => {
              callPeer(payload.peerId, payload.userName, payload.oderId);
            }, 800);
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
          removeParticipant(payload.oderId, payload.peerId);
        })
        .on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
          // Keep track of active participants
          if (payload.oderId !== userIdRef.current) {
            // Participant is still active
            console.log('Heartbeat from:', payload.userName);
          }
        })
        .subscribe((status) => {
          console.log('Channel subscription status:', status);
          if (status === 'SUBSCRIBED') {
            // Re-announce presence after subscription
            setTimeout(() => {
              broadcastPresence('join', peerIdRef.current);
            }, 300);
          }
        });

      channelRef.current = channel;

    } catch (err: any) {
      console.error('Error joining room:', err);
      setError(err.message);
    }
  }, [broadcastPresence, callPeer, handleIncomingCall, attemptReconnect, startHeartbeat, removeParticipant]);

  const leaveRoom = useCallback(() => {
    console.log('Leaving room...');
    isLeavingRef.current = true;
    
    // Stop heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Clear all connection timeouts
    connectionTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    connectionTimeoutsRef.current.clear();
    
    // Broadcast leave before disconnecting
    broadcastPresence('leave');

    // Stop all tracks on local stream
    stopAllTracks(localStreamRef.current);
    stopAllTracks(localStream);
    
    setLocalStream(null);
    localStreamRef.current = null;

    // Close all peer connections
    connectionsRef.current.forEach((connection, key) => {
      try {
        connection.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    });
    connectionsRef.current.clear();
    
    // Clear known participants
    knownParticipantsRef.current.clear();

    // Remove from active sessions
    if (roomIdRef.current && activeRoomSessions.has(roomIdRef.current)) {
      activeRoomSessions.get(roomIdRef.current)?.delete(userIdRef.current);
    }

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
        // Stop heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // Clear all connection timeouts
        connectionTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        
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
