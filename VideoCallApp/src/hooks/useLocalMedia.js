import { useCallback, useEffect, useRef, useState } from "react";

const emptyDevices = { audioinput: [], videoinput: [], audiooutput: [] };
const mediaKindFor = { audioinput: "audio", videoinput: "video" };

// Only the device is pinned; processing stays at browser defaults because this
// stream is what every peer hears.
const deviceConstraint = (deviceId) => (deviceId ? { deviceId: { exact: deviceId } } : true);

const firstTrack = (stream, kind) => stream?.getTracks().find((track) => track.kind === kind) || null;

const buildStream = (audioTrack, videoTrack) => new MediaStream([audioTrack, videoTrack].filter(Boolean));

// Owns the local camera/mic stream, screen sharing, and device selection.
export function useLocalMedia({ syncLocalStream, replaceOutgoingTrack }) {
  const streamRef = useRef(null);
  const displayTrackRef = useRef(null);
  const cameraEnabledRef = useRef(true);
  const selectedRef = useRef({ audioinput: "", videoinput: "", audiooutput: "" });
  const queueRef = useRef(Promise.resolve());

  const [isScreenSharing, setScreenSharing] = useState(false);
  const [devices, setDevices] = useState(emptyDevices);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(selectedRef.current);

  const setSelected = useCallback((next) => {
    selectedRef.current = next;
    setSelectedDeviceIds(next);
  }, []);

  // Media changes run one at a time, so a double click or a device switch
  // during a share cannot interleave track swaps.
  const enqueue = useCallback((task) => {
    const run = queueRef.current.then(task);
    queueRef.current = run.catch(() => {});
    return run;
  }, []);

  // Mute state is read from the live tracks rather than React state, so
  // callbacks that outlive a render (the browser's "Stop sharing") cannot unmute.
  const applyStream = useCallback(
    async (nextStream, { videoEnabled } = {}) => {
      const audioTrack = firstTrack(nextStream, "audio");
      const videoTrack = firstTrack(nextStream, "video");
      if (audioTrack) audioTrack.enabled = firstTrack(streamRef.current, "audio")?.enabled ?? true;
      if (videoTrack) videoTrack.enabled = videoEnabled ?? firstTrack(streamRef.current, "video")?.enabled ?? true;

      await Promise.all([replaceOutgoingTrack("audio", audioTrack), replaceOutgoingTrack("video", videoTrack)]);
      streamRef.current = nextStream;
      syncLocalStream(nextStream);
    },
    [replaceOutgoingTrack, syncLocalStream]
  );

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const rawDevices = await navigator.mediaDevices.enumerateDevices();
    const nextDevices = { audioinput: [], videoinput: [], audiooutput: [] };
    rawDevices.forEach((device) => nextDevices[device.kind]?.push(device));

    // Prefer the device actually in use, then the last pick, then Chrome's
    // "default" entry, and drop ids that are gone so the next request does not
    // ask for an unplugged device.
    const inUse = {
      audioinput: firstTrack(streamRef.current, "audio")?.getSettings?.().deviceId,
      videoinput: displayTrackRef.current ? undefined : firstTrack(streamRef.current, "video")?.getSettings?.().deviceId,
    };
    const pick = (kind) => {
      const ids = new Set(nextDevices[kind].map((device) => device.deviceId));
      return [inUse[kind], selectedRef.current[kind], "default"].find((id) => id && ids.has(id)) || "";
    };

    setDevices(nextDevices);
    setSelected({ audioinput: pick("audioinput"), videoinput: pick("videoinput"), audiooutput: pick("audiooutput") });
  }, [setSelected]);

  const stopScreenShare = useCallback(async () => {
    const displayTrack = displayTrackRef.current;
    if (!displayTrack) return;
    displayTrackRef.current = null;
    setScreenSharing(false);
    displayTrack.stop();

    const audioTrack = firstTrack(streamRef.current, "audio");
    let cameraTrack = null;
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: deviceConstraint(selectedRef.current.videoinput),
      });
      cameraTrack = firstTrack(cameraStream, "video");
    } finally {
      // Without a camera, fall back to audio only instead of leaving peers on
      // the ended screen track.
      await applyStream(buildStream(audioTrack, cameraTrack), { videoEnabled: cameraEnabledRef.current });
    }
  }, [applyStream]);

  const startScreenShare = useCallback(async () => {
    if (displayTrackRef.current || !navigator.mediaDevices?.getDisplayMedia) return;
    const cameraStream = streamRef.current;
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const displayTrack = firstTrack(displayStream, "video");
    if (!displayTrack) return;

    cameraEnabledRef.current = firstTrack(cameraStream, "video")?.enabled ?? true;
    displayTrackRef.current = displayTrack;
    setScreenSharing(true);
    // The browser's own "Stop sharing" control ends the track without going through us.
    displayTrack.addEventListener(
      "ended",
      () => {
        if (displayTrackRef.current !== displayTrack) return;
        enqueue(stopScreenShare).catch((err) => console.error("Could not restore the camera:", err));
      },
      { once: true }
    );

    try {
      await applyStream(buildStream(firstTrack(cameraStream, "audio"), displayTrack), { videoEnabled: true });
    } catch (err) {
      displayTrackRef.current = null;
      setScreenSharing(false);
      displayTrack.stop();
      throw err;
    }
    firstTrack(cameraStream, "video")?.stop();
  }, [applyStream, enqueue, stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    const action = isScreenSharing ? stopScreenShare : startScreenShare;
    // Cancelling the browser's share picker rejects; that is not an error worth surfacing.
    enqueue(action).catch((err) => {
      if (err?.name !== "NotAllowedError") console.error("Screen share failed:", err);
    });
  }, [enqueue, isScreenSharing, startScreenShare, stopScreenShare]);

  const switchDevice = useCallback(
    async (kind, deviceId) => {
      if (deviceId === selectedRef.current[kind]) return;
      const mediaKind = mediaKindFor[kind];
      // Output only changes where audio plays; a camera picked mid-share is used when the share stops.
      if (!mediaKind || (mediaKind === "video" && displayTrackRef.current)) {
        setSelected({ ...selectedRef.current, [kind]: deviceId });
        return;
      }

      const current = streamRef.current;
      const freshStream = await navigator.mediaDevices.getUserMedia({ [mediaKind]: deviceConstraint(deviceId) });
      const trackFor = (kind) => (kind === mediaKind ? firstTrack(freshStream, kind) : firstTrack(current, kind));
      await applyStream(buildStream(trackFor("audio"), trackFor("video")));
      firstTrack(current, mediaKind)?.stop();
      setSelected({ ...selectedRef.current, [kind]: deviceId });
    },
    [applyStream, setSelected]
  );

  const selectDevice = useCallback(
    (kind, deviceId) => {
      enqueue(() => switchDevice(kind, deviceId)).catch((err) => console.error("Could not switch device:", err));
    },
    [enqueue, switchDevice]
  );

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(async (stream) => {
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
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
  }, [refreshDevices, syncLocalStream]);

  return { isScreenSharing, toggleScreenShare, devices, selectedDeviceIds, selectDevice };
}
