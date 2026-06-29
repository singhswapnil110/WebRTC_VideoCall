import React, { useState, useContext, useEffect, useRef, useCallback, useMemo } from "react";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { useTrackStatus } from "../hooks/useTrackStatus";
import { useCaptionTranscriber } from "../hooks/useCaptionTranscriber";
import { useRoomCaptions } from "../hooks/useRoomCaptions";
import { Preview } from "./Preview";
import { Room } from "./Room";
import { Sidebar } from "./Sidebar";
import { SidePanel } from "./SidePanel";
import { ChatPanel } from "./ChatPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { TranslatePanel } from "./TranslatePanel";

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: false,
  channelCount: 1,
};

const emptyDevices = {
  audioinput: [],
  videoinput: [],
  audiooutput: [],
};

const fallbackDeviceLabel = (kind, index) => {
  if (kind === "audioinput") return `Microphone ${index + 1}`;
  if (kind === "videoinput") return `Camera ${index + 1}`;
  return `Speaker ${index + 1}`;
};

const setTrackEnabled = (track, enabled) => {
  if (track) track.enabled = enabled;
};

const buildStream = (audioTrack, videoTrack) => {
  const stream = new MediaStream();
  if (audioTrack) stream.addTrack(audioTrack);
  if (videoTrack) stream.addTrack(videoTrack);
  return stream;
};

export const Meeting = () => {
  const [isConnected, setConnected] = useState(false);
  const [state, dispatch] = useContext(ReduxContext);
  const {
    socket,
    syncLocalStream,
    replaceOutgoingTrack,
    setRaisedHand,
    isScreenSharing,
    peerID,
  } = useContext(SocketContext);
  const streamRef = useRef(null);
  const displayTrackRef = useRef(null);
  const activePanelRef = useRef(null);
  const selectedDevicesRef = useRef({ audioinput: "", videoinput: "", audiooutput: "" });

  const [activePanel, setActivePanel] = useState(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [captionError, setCaptionError] = useState(null);
  const [devices, setDevices] = useState(emptyDevices);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState({
    audioinput: "",
    videoinput: "",
    audiooutput: "",
  });
  const [raisedHandLocal, setRaisedHandLocal] = useState(false);

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  useEffect(() => {
    selectedDevicesRef.current = selectedDeviceIds;
  }, [selectedDeviceIds]);

  const { localStream, connections, messages, name, roomID, raisedHands } = state;
  const { status: trackStatus, toggleTrack } = useTrackStatus(localStream);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const rawDevices = await navigator.mediaDevices.enumerateDevices();
    const nextDevices = {
      audioinput: [],
      videoinput: [],
      audiooutput: [],
    };

    rawDevices.forEach((device) => {
      if (!nextDevices[device.kind]) return;
      nextDevices[device.kind].push(device);
    });

    setDevices(nextDevices);
    setSelectedDeviceIds((prev) => ({
      audioinput: prev.audioinput || nextDevices.audioinput[0]?.deviceId || "",
      videoinput: prev.videoinput || nextDevices.videoinput[0]?.deviceId || "",
      audiooutput: prev.audiooutput || nextDevices.audiooutput[0]?.deviceId || "",
    }));
  }, []);

  const acquireUserMedia = useCallback(async (deviceIds = selectedDevicesRef.current) => {
    const audioConstraint = deviceIds.audioinput
      ? { ...AUDIO_CONSTRAINTS, deviceId: { exact: deviceIds.audioinput } }
      : AUDIO_CONSTRAINTS;
    const videoConstraint = deviceIds.videoinput
      ? { deviceId: { exact: deviceIds.videoinput } }
      : true;

    return navigator.mediaDevices.getUserMedia({
      video: videoConstraint,
      audio: audioConstraint,
    });
  }, []);

  const applyLocalStream = useCallback(
    async (nextStream, { preserveTrackState = true, stopPrevious = true } = {}) => {
      const previousStream = streamRef.current;
      const audioTrack = nextStream.getAudioTracks()[0] || null;
      const videoTrack = nextStream.getVideoTracks()[0] || null;

      if (preserveTrackState) {
        setTrackEnabled(audioTrack, trackStatus.audio);
        setTrackEnabled(videoTrack, trackStatus.video);
      }

      await replaceOutgoingTrack("audio", audioTrack);
      await replaceOutgoingTrack("video", videoTrack);

      streamRef.current = nextStream;
      syncLocalStream(nextStream);

      if (stopPrevious && previousStream && previousStream !== nextStream) {
        previousStream.getTracks().forEach((track) => track.stop());
      }
    },
    [replaceOutgoingTrack, syncLocalStream, trackStatus.audio, trackStatus.video]
  );

  const restoreCameraTrack = useCallback(async () => {
    const cameraStream = await acquireUserMedia(selectedDevicesRef.current);
    displayTrackRef.current = null;
    await applyLocalStream(cameraStream, { preserveTrackState: true, stopPrevious: true });
    await refreshDevices();
  }, [acquireUserMedia, applyLocalStream, refreshDevices]);

  const stopScreenShare = useCallback(async () => {
    if (!displayTrackRef.current) return;
    const activeDisplayTrack = displayTrackRef.current;
    displayTrackRef.current = null;
    activeDisplayTrack.stop();
    await restoreCameraTrack();
  }, [restoreCameraTrack]);

  const switchDevice = useCallback(
    async (kind, deviceId) => {
      const nextSelected = {
        ...selectedDevicesRef.current,
        [kind]: deviceId,
      };
      setSelectedDeviceIds(nextSelected);

      if (kind === "audiooutput") {
        return;
      }

      if (isScreenSharing && kind === "videoinput") {
        return;
      }

      if (isScreenSharing && kind === "audioinput") {
        const previousStream = streamRef.current;
        const audioConstraint = deviceId
          ? { ...AUDIO_CONSTRAINTS, deviceId: { exact: deviceId } }
          : AUDIO_CONSTRAINTS;
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
        const nextStream = buildStream(audioStream.getAudioTracks()[0] || null, displayTrackRef.current || null);
        await applyLocalStream(nextStream, { preserveTrackState: true, stopPrevious: false });
        previousStream?.getAudioTracks?.().forEach((track) => track.stop());
        await refreshDevices();
        return;
      }

      const nextStream = await acquireUserMedia(nextSelected);
      await applyLocalStream(nextStream, { preserveTrackState: true, stopPrevious: true });
      await refreshDevices();
    },
    [acquireUserMedia, applyLocalStream, isScreenSharing, refreshDevices]
  );

  const startScreenShare = useCallback(async () => {
    if (isScreenSharing || !navigator.mediaDevices?.getDisplayMedia) return;
    const previousStream = streamRef.current;
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const displayTrack = displayStream.getVideoTracks()[0];
    if (!displayTrack) return;

    displayTrackRef.current = displayTrack;
    displayTrack.addEventListener(
      "ended",
      () => {
        if (displayTrackRef.current !== displayTrack) return;
        displayTrackRef.current = null;
        void restoreCameraTrack();
      },
      { once: true }
    );

    const nextStream = buildStream(localStream?.getAudioTracks?.()[0] || null, displayTrack);
    await applyLocalStream(nextStream, { preserveTrackState: true, stopPrevious: false });
    previousStream?.getVideoTracks?.().forEach((track) => track.stop());
  }, [applyLocalStream, isScreenSharing, localStream, restoreCameraTrack]);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }
    await startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const captionsEnabled = Boolean(captionsOn && isConnected && trackStatus.audio);

  const {
    currentCaption,
    previousCaption,
    publishCaption,
    clearCurrentCaption,
    clearAllCaptions,
  } = useRoomCaptions({
    socket,
    roomID,
    senderId: socket?.id,
    senderName: name || "You",
    enabled: captionsOn,
  });

  const { supported: captionsSupported, status: captionStatus } = useCaptionTranscriber({
    enabled: captionsEnabled,
    localStream,
    maxUtteranceMs: 4000,
    onResult: ({ text, isFinal, detectedLanguage }) => {
      publishCaption({
        text,
        isFinal,
        detectedLanguage,
      });
    },
    onError: setCaptionError,
    onStart: () => setCaptionError(null),
    onEnd: () => {
      if (!captionsEnabled) {
        clearCurrentCaption();
      }
    },
  });

  useEffect(() => {
    if (!captionsOn) {
      clearAllCaptions();
      setCaptionError(null);
    }
  }, [captionsOn, clearAllCaptions]);

  useEffect(() => {
    if (!trackStatus.audio) {
      clearCurrentCaption();
    }
  }, [trackStatus.audio, clearCurrentCaption]);

  useEffect(() => {
    if (!peerID) return;
    setRaisedHandLocal(Boolean(raisedHands[peerID]?.raised));
  }, [peerID, raisedHands]);

  const panels = {
    chat: activePanel === "chat",
    participants: activePanel === "participants",
    translate: activePanel === "translate",
    captions: captionsOn,
  };

  const onTogglePanel = useCallback(
    (key) => {
      if (key === "captions") {
        if (!captionsSupported) return;
        setCaptionsOn((prev) => !prev);
        return;
      }
      if (key === "chat") setUnreadCount(0);
      setActivePanel((prev) => (prev === key ? null : key));
    },
    [captionsSupported]
  );

  useEffect(() => {
    let mounted = true;

    acquireUserMedia(selectedDevicesRef.current)
      .then(async (stream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        syncLocalStream(stream);
        await refreshDevices();
      })
      .catch((err) => {
        console.error("Camera/microphone access denied:", err);
      });

    const handleDeviceChange = () => {
      void refreshDevices();
    };

    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);

    return () => {
      mounted = false;
      navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      displayTrackRef.current?.stop();
    };
  }, [acquireUserMedia, refreshDevices, syncLocalStream]);

  useEffect(() => {
    if (!socket) return;
    const currentSocket = socket;
    const handler = (msg) => {
      const isMe = msg.senderId === currentSocket.id;
      dispatch({ type: "ADD_MESSAGE", payload: { ...msg, me: isMe } });
      if (!isMe && activePanelRef.current !== "chat") setUnreadCount((c) => c + 1);
    };
    currentSocket.on("receive_message", handler);
    return () => currentSocket.off("receive_message", handler);
  }, [socket, dispatch]);

  const handleSendMessage = useCallback(
    (text) => {
      if (!socket || !roomID) return;
      const msg = {
        id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderId: socket.id,
        senderName: name || "You",
        text,
        timestamp: Date.now(),
      };
      socket.emit("send_message", { roomID, message: msg });
    },
    [socket, roomID, name]
  );

  const handleRaisedHandToggle = useCallback(() => {
    setRaisedHand(!raisedHandLocal);
  }, [raisedHandLocal, setRaisedHand]);

  const deviceOptions = useMemo(
    () => ({
      mic: devices.audioinput.map((device, index) => ({
        value: device.deviceId,
        label: device.label || fallbackDeviceLabel("audioinput", index),
        active: device.deviceId === selectedDeviceIds.audioinput,
        disabled: false,
      })),
      cam: devices.videoinput.map((device, index) => ({
        value: device.deviceId,
        label: device.label || fallbackDeviceLabel("videoinput", index),
        active: device.deviceId === selectedDeviceIds.videoinput,
        disabled: isScreenSharing,
      })),
      spk: devices.audiooutput.map((device, index) => ({
        value: device.deviceId,
        label: device.label || fallbackDeviceLabel("audiooutput", index),
        active: device.deviceId === selectedDeviceIds.audiooutput,
        disabled: false,
      })),
    }),
    [devices, isScreenSharing, selectedDeviceIds]
  );

  const participantList = Object.values(connections).map((conn) => ({
    id: conn.peer,
    name: conn.name || conn.peer?.slice(-4)?.toUpperCase() || "??",
    muted: !conn.remoteStream?.getAudioTracks?.()[0]?.enabled,
    stream: conn.remoteStream,
    handRaised: Boolean(raisedHands[conn.peer]?.raised),
  }));

  const localUser = {
    id: peerID || "local",
    name: name ? `You (${name})` : "You",
    muted: !localStream?.getAudioTracks?.()[0]?.enabled,
    stream: localStream,
    handRaised: raisedHandLocal,
    isScreenSharing,
  };

  return (
    <div className="app-screen">
      {isConnected ? (
        <>
          <div className="app-main">
            <Room
              captionsOn={captionsOn}
              captionStatus={captionStatus}
              currentCaption={currentCaption}
              previousCaption={previousCaption}
              outputSinkId={selectedDeviceIds.audiooutput}
            />
          </div>
          <SidePanel open={panels.chat}>
            <ChatPanel
              onClose={() => setActivePanel(null)}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </SidePanel>
          <SidePanel open={panels.participants}>
            <ParticipantsPanel
              onClose={() => setActivePanel(null)}
              participants={participantList}
              localUser={localUser}
            />
          </SidePanel>
          <SidePanel open={panels.translate}>
            <TranslatePanel onClose={() => setActivePanel(null)} />
          </SidePanel>
        </>
      ) : (
        <Preview setConnected={setConnected} />
      )}
      <Sidebar
        isPreview={!isConnected}
        panels={panels}
        onTogglePanel={onTogglePanel}
        messageCount={unreadCount}
        trackStatus={trackStatus}
        toggleTrack={toggleTrack}
        captionsSupported={captionsSupported}
        captionStatus={captionStatus}
        captionError={captionError}
        deviceOptions={deviceOptions}
        onSelectDevice={switchDevice}
        onToggleScreenShare={handleToggleScreenShare}
        isScreenSharing={isScreenSharing}
        onToggleRaisedHand={handleRaisedHandToggle}
        raisedHand={raisedHandLocal}
        outputSwitchSupported={typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype}
      />
    </div>
  );
};
