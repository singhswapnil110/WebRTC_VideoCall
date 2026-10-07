import { useCallback, useEffect, useRef, useState } from "react";
import { SOCKET_EVENTS, CAPTION_LIMITS } from "../redux/socketEvents";

// A live line with no update for this long is treated as finished, so a
// speaker who drops off mid-sentence does not leave text frozen on screen.
const STALE_CAPTION_MS = 6000;

const emptyCaptions = { currentCaption: null, previousCaption: null };

const clampText = (text) => (typeof text === "string" ? text.trim().slice(0, CAPTION_LIMITS.MAX_TEXT_LENGTH) : "");

const normalizeCaption = (caption) => {
  if (!caption || typeof caption !== "object") return null;

  const text = clampText(caption.text);
  const senderId = typeof caption.senderId === "string" ? caption.senderId : "";
  const captionId = typeof caption.captionId === "string" ? caption.captionId : "";
  if (!text || !senderId || !captionId) return null;

  const senderName =
    typeof caption.senderName === "string" && caption.senderName.trim()
      ? caption.senderName.trim().slice(0, CAPTION_LIMITS.MAX_NAME_LENGTH)
      : "Speaker";

  return { captionId, senderId, senderName, text, isFinal: Boolean(caption.isFinal) };
};

// One line is live at a time. Updates to the same utterance from the same
// sender merge; anything else takes the slot and a finished line moves up.
const applyCaption = (state, caption) => {
  const current = state.currentCaption;

  if (current?.captionId === caption.captionId && current.senderId === caption.senderId) {
    return { ...state, currentCaption: { ...current, ...caption } };
  }

  return {
    previousCaption: current?.isFinal ? current : state.previousCaption,
    currentCaption: caption,
  };
};

const nextCaptionId = (senderId) => `${senderId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useRoomCaptions({ socket, roomID, senderId, senderName, active }) {
  const [captions, setCaptions] = useState(emptyCaptions);
  const activeCaptionIdRef = useRef(null);
  const liveOwnCaptionRef = useRef(null);

  const publishCaption = useCallback(
    ({ text, isFinal = false }) => {
      const clamped = clampText(text);
      if (!active || !socket || !roomID || !senderId || !clamped) return;

      if (!activeCaptionIdRef.current) {
        activeCaptionIdRef.current = nextCaptionId(senderId);
      }

      const caption = { captionId: activeCaptionIdRef.current, senderId, senderName, text: clamped, isFinal };
      liveOwnCaptionRef.current = isFinal ? null : caption;
      if (isFinal) activeCaptionIdRef.current = null;

      setCaptions((current) => applyCaption(current, caption));
      socket.emit(SOCKET_EVENTS.SEND_CAPTION, { roomID, caption });
    },
    [active, roomID, senderId, senderName, socket]
  );

  useEffect(() => {
    if (active) return;

    // Turning captions off mid-sentence would otherwise leave our half line
    // live on everyone else's screen.
    const liveCaption = liveOwnCaptionRef.current;
    if (liveCaption && socket && roomID) {
      socket.emit(SOCKET_EVENTS.SEND_CAPTION, { roomID, caption: { ...liveCaption, isFinal: true } });
    }
    liveOwnCaptionRef.current = null;
    activeCaptionIdRef.current = null;
    setCaptions(emptyCaptions);
  }, [active, roomID, socket]);

  useEffect(() => {
    if (!socket || !active) return undefined;

    const handleCaption = (incoming) => {
      const caption = normalizeCaption(incoming);
      if (caption) setCaptions((current) => applyCaption(current, caption));
    };

    socket.on(SOCKET_EVENTS.RECEIVE_CAPTION, handleCaption);
    return () => socket.off(SOCKET_EVENTS.RECEIVE_CAPTION, handleCaption);
  }, [active, socket]);

  const { currentCaption } = captions;
  useEffect(() => {
    if (!currentCaption || currentCaption.isFinal) return undefined;

    const timer = setTimeout(() => {
      setCaptions((current) =>
        current.currentCaption === currentCaption
          ? { ...current, currentCaption: { ...currentCaption, isFinal: true } }
          : current
      );
    }, STALE_CAPTION_MS);
    return () => clearTimeout(timer);
  }, [currentCaption]);

  useEffect(() => {
    activeCaptionIdRef.current = null;
    liveOwnCaptionRef.current = null;
    setCaptions(emptyCaptions);
  }, [roomID]);

  return { currentCaption, previousCaption: captions.previousCaption, publishCaption };
}

export const __testing = { applyCaption, normalizeCaption, STALE_CAPTION_MS };
