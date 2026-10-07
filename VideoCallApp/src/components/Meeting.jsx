import React, { useState, useContext, useEffect, useRef, useCallback, useMemo } from "react";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { SOCKET_EVENTS } from "../redux/socketEvents";
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

const emptyDevices = { audioinput: [], videoinput: [], audiooutput: [] };

const fallbackDeviceLabel = (kind, index) => {
  if (kind === "audioinput") return `Microphone ${index + 1}`;
  if (kind === "videoinput") return `Camera ${index + 1}`;
  return `Speaker ${index + 1}`;
};

// Only the device is pinned; processing stays at browser defaults because this
// stream is what every peer hears.
const deviceConstraint = (deviceId) => (deviceId ? { deviceId: { exact: deviceId } } : true);

const setTrackEnabled = (track, enabled) => {
  if (track) track.enabled = enabled;
};

const buildStream = (audioTrack, videoTrack) => {
  const stream = new MediaStream();
  if (audioTrack) stream.addTrack(audioTrack);
  if (videoTrack) stream.addTrack(videoTrack);
  return stream;
};

const outputSwitchSupported = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

export const Meeting = () => {
  const [isConnected, setConnected] = useState(false);
  const [state, dispatch] = useContext(ReduxContext);
  const { socket, syncLocalStream, replaceOutgoingTrack, setRaisedHand, isScreenSharing, peerID } =
    useContext(SocketContext);
  const streamRef = useRef(null);
  const displayTrackRef = useRef(null);
  const selectedDevicesRef = useRef({ audioinput: "", videoinput: "", audiooutput: "" });

  const [activePanel, setActivePanel] = useState(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [captionError, setCaptionError] = useState(null);
  const [devices, setDevices] = useState(emptyDevices);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(selectedDevicesRef.current);
  const activePanelRef = useRef(activePanel);

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  useEffect(() => {
    selectedDevicesRef.current = selectedDeviceIds;
  }, [selectedDeviceIds]);

  const { localStream, connections, messages, name, roomID, raisedHands } = state;
  const { status: trackStatus, toggleTrack } = useTrackStatus(localStream);
  const raisedHandLocal = Boolean(peerID && raisedHands[peerID]?.raised);

  const { currentCaption, previousCaption, publishCaption } = useRoomCaptions({
    socket,
    roomID,
    senderId: socket?.id,
    senderName: name || "You",
    active: captionsOn,
  });

  // Mute is deliberately not part of this: a muted track is silence, which the
  // engine already treats as the end of an utterance.
  const { status: captionStatus } = useCaptionTranscriber({
    enabled: captionsOn && isConnected,
    localStream,
    maxUtteranceMs: 4000,
    onResult: publishCaption,
    onError: setCaptionError,
    onStart: () => setCaptionError(null),
  });

  useEffect(() => {
    if (!captionsOn) setCaptionError(null);
  }, [captionsOn]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const rawDevices = await navigator.mediaDevices.enumerateDevices();
    const nextDevices = { audioinput: [], videoinput: [], audiooutput: [] };
    rawDevices.forEach((device) => nextDevices[device.kind]?.push(device));

    setDevices(nextDevices);
    setSelectedDeviceIds((prev) => ({
      audioinput: prev.audioinput || nextDevices.audioinput[0]?.deviceId || "",
      videoinput: prev.videoinput || nextDevices.videoinput[0]?.deviceId || "",
      audiooutput: prev.audiooutput || nextDevices.audiooutput[0]?.deviceId || "",
    }));
  }, []);

  const acquireUserMedia = useCallback(
    (deviceIds = selectedDevicesRef.current) =>
      navigator.mediaDevices.getUserMedia({
        video: deviceConstraint(deviceIds.videoinput),
        audio: deviceConstraint(deviceIds.audioinput),
      }),
    []
  );

  const applyLocalStream = useCallback(
    async (nextStream, { stopPrevious = true } = {}) => {
      const previousStream = streamRef.current;
      const audioTrack = nextStream.getAudioTracks()[0] || null;
      const videoTrack = nextStream.getVideoTracks()[0] || null;

      setTrackEnabled(audioTrack, trackStatus.audio);
      setTrackEnabled(videoTrack, trackStatus.video);

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
    await applyLocalStream(cameraStream);
    await refreshDevices();
  }, [acquireUserMedia, applyLocalStream, refreshDevices]);

  const stopScreenShare = useCallback(async () => {
    const activeDisplayTrack = displayTrackRef.current;
    if (!activeDisplayTrack) return;
    displayTrackRef.current = null;
    activeDisplayTrack.stop();
    await restoreCameraTrack();
  }, [restoreCameraTrack]);

  const startScreenShare = useCallback(async () => {
    if (isScreenSharing || !navigator.mediaDevices?.getDisplayMedia) return;
    const previousStream = streamRef.current;
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const displayTrack = displayStream.getVideoTracks()[0];
    if (!displayTrack) return;

    displayTrackRef.current = displayTrack;
    // The browser's own "Stop sharing" control ends the track without going through us.
    displayTrack.addEventListener(
      "ended",
      () => {
        if (displayTrackRef.current !== displayTrack) return;
        displayTrackRef.current = null;
        restoreCameraTrack().catch((err) => console.error("Could not restore the camera:", err));
      },
      { once: true }
    );

    const nextStream = buildStream(localStream?.getAudioTracks?.()[0] || null, displayTrack);
    await applyLocalStream(nextStream, { stopPrevious: false });
    previousStream?.getVideoTracks?.().forEach((track) => track.stop());
  }, [applyLocalStream, isScreenSharing, localStream, restoreCameraTrack]);

  const handleToggleScreenShare = useCallback(() => {
    const action = isScreenSharing ? stopScreenShare : startScreenShare;
    // Cancelling the browser's share picker rejects; that is not an error worth surfacing.
    action().catch((err) => {
      if (err?.name !== "NotAllowedError") console.error("Screen share failed:", err);
    });
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const switchDevice = useCallback(
    async (kind, deviceId) => {
      const nextSelected = { ...selectedDevicesRef.current, [kind]: deviceId };
      setSelectedDeviceIds(nextSelected);

      if (kind === "audiooutput") return;
      if (isScreenSharing && kind === "videoinput") return;

      if (isScreenSharing && kind === "audioinput") {
        const previousStream = streamRef.current;
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: deviceConstraint(deviceId), video: false });
        const nextStream = buildStream(audioStream.getAudioTracks()[0] || null, displayTrackRef.current || null);
        await applyLocalStream(nextStream, { stopPrevious: false });
        previousStream?.getAudioTracks?.().forEach((track) => track.stop());
        await refreshDevices();
        return;
      }

      const nextStream = await acquireUserMedia(nextSelected);
      await applyLocalStream(nextStream);
      await refreshDevices();
    },
    [acquireUserMedia, applyLocalStream, isScreenSharing, refreshDevices]
  );

  const handleSelectDevice = useCallback(
    (kind, deviceId) => {
      switchDevice(kind, deviceId).catch((err) => console.error("Could not switch device:", err));
    },
    [switchDevice]
  );

  const panels = {
    chat: activePanel === "chat",
    participants: activePanel === "participants",
    translate: activePanel === "translate",
    captions: captionsOn,
  };

  const onTogglePanel = useCallback((key) => {
    if (key === "captions") {
      setCaptionsOn((prev) => !prev);
      return;
    }
    if (key === "chat") setUnreadCount(0);
    setActivePanel((prev) => (prev === key ? null : key));
  }, []);

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
    currentSocket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handler);
    return () => currentSocket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handler);
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
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { roomID, message: msg });
    },
    [socket, roomID, name]
  );

  const handleRaisedHandToggle = useCallback(() => {
    setRaisedHand(!raisedHandLocal);
  }, [raisedHandLocal, setRaisedHand]);

  const deviceOptions = useMemo(() => {
    const toOptions = (kind, disabled = false) =>
      devices[kind].map((device, index) => ({
        value: device.deviceId,
        label: device.label || fallbackDeviceLabel(kind, index),
        active: device.deviceId === selectedDeviceIds[kind],
        disabled,
      }));
    return {
      mic: toOptions("audioinput"),
      cam: toOptions("videoinput", isScreenSharing),
      spk: toOptions("audiooutput"),
    };
  }, [devices, isScreenSharing, selectedDeviceIds]);

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
    muted: !trackStatus.audio,
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
              captionError={captionError}
              currentCaption={currentCaption}
              previousCaption={previousCaption}
              localMuted={!trackStatus.audio}
              localHandRaised={raisedHandLocal}
              localScreenSharing={isScreenSharing}
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
        <Preview
          setConnected={setConnected}
          trackStatus={trackStatus}
          toggleTrack={toggleTrack}
        />
      )}
      <Sidebar
        isPreview={!isConnected}
        panels={panels}
        onTogglePanel={onTogglePanel}
        messageCount={unreadCount}
        trackStatus={trackStatus}
        toggleTrack={toggleTrack}
        captionStatus={captionStatus}
        deviceOptions={deviceOptions}
        onSelectDevice={handleSelectDevice}
        onToggleScreenShare={handleToggleScreenShare}
        isScreenSharing={isScreenSharing}
        onToggleRaisedHand={handleRaisedHandToggle}
        raisedHand={raisedHandLocal}
        outputSwitchSupported={outputSwitchSupported}
      />
    </div>
  );
};
