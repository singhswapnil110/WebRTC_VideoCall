import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS, CAPTION_LIMITS } from "../redux/socketEvents";

const emptyCaptions = { currentCaption: null, previousCaption: null };

const clampText = (text) => {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, CAPTION_LIMITS.MAX_TEXT_LENGTH);
};

const normalizeCaption = (caption) => {
  if (!caption || typeof caption !== "object") return null;

  const text = clampText(caption.text);
  if (text.length === 0) return null;

  const senderId = typeof caption.senderId === "string" ? caption.senderId : "";
  const captionId = typeof caption.captionId === "string" ? caption.captionId : "";
  if (!senderId || !captionId) return null;

  const senderName =
    typeof caption.senderName === "string" && caption.senderName.trim()
      ? caption.senderName.trim().slice(0, CAPTION_LIMITS.MAX_NAME_LENGTH)
      : "Speaker";

  if (!Number.isInteger(caption.seq) || caption.seq < 1) return null;

  return {
    captionId,
    senderId,
    senderName,
    text,
    isFinal: Boolean(caption.isFinal),
    seq: caption.seq,
  };
};

// One caption is on screen at a time. Updates to the same utterance merge;
// a different utterance takes the slot and promotes a completed one to the
// previous line. Sender is part of the identity so a peer cannot merge into
// somebody else's caption by reusing its id.
const applyCaption = (state, caption) => {
  const current = state.currentCaption;

  if (!current) {
    return { ...state, currentCaption: caption };
  }

  if (current.captionId === caption.captionId && current.senderId === caption.senderId) {
    return { ...state, currentCaption: { ...current, ...caption } };
  }

  return {
    previousCaption: current.isFinal ? current : state.previousCaption,
    currentCaption: caption,
  };
};

const nextCaptionId = (senderId) =>
  `${senderId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useRoomCaptions({ socket, roomID, senderId, senderName, enabled }) {
  const [captions, setCaptions] = useState(emptyCaptions);
  const activeCaptionIdRef = useRef(null);
  const localSeqRef = useRef(0);
  const lastSeqBySenderRef = useRef({});

  const clearAllCaptions = useCallback(() => {
    activeCaptionIdRef.current = null;
    setCaptions(emptyCaptions);
  }, []);

  // Drops only this user's in-progress line — a remote speaker's live caption
  // must survive the local mic being muted.
  const clearOwnCaption = useCallback(() => {
    activeCaptionIdRef.current = null;
    setCaptions((current) => {
      const caption = current.currentCaption;
      if (!caption || caption.isFinal || caption.senderId !== senderId) return current;
      return { ...current, currentCaption: null };
    });
  }, [senderId]);

  const publishCaption = useCallback(
    ({ text, isFinal = false } = {}) => {
      if (!enabled || !socket || !roomID || !senderId) return null;

      const normalizedText = clampText(text);
      if (!normalizedText) return null;

      if (!activeCaptionIdRef.current) {
        activeCaptionIdRef.current = nextCaptionId(senderId);
      }

      const caption = normalizeCaption({
        captionId: activeCaptionIdRef.current,
        senderId,
        senderName: senderName || "You",
        text: normalizedText,
        isFinal,
        seq: ++localSeqRef.current,
      });

      if (!caption) return null;

      setCaptions((current) => applyCaption(current, caption));
      socket.emit(SOCKET_EVENTS.SEND_CAPTION, { roomID, caption });

      if (caption.isFinal) {
        activeCaptionIdRef.current = null;
      }

      return caption;
    },
    [enabled, roomID, senderId, senderName, socket]
  );

  useEffect(() => {
    clearAllCaptions();
    lastSeqBySenderRef.current = {};
  }, [clearAllCaptions, roomID]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleCaption = (incomingCaption) => {
      const caption = normalizeCaption(incomingCaption);
      if (!caption || caption.senderId === senderId) return;

      const lastSeq = lastSeqBySenderRef.current[caption.senderId] ?? 0;
      if (caption.seq <= lastSeq) return;
      lastSeqBySenderRef.current[caption.senderId] = caption.seq;

      setCaptions((current) => applyCaption(current, caption));
    };

    socket.on(SOCKET_EVENTS.RECEIVE_CAPTION, handleCaption);
    return () => socket.off(SOCKET_EVENTS.RECEIVE_CAPTION, handleCaption);
  }, [senderId, socket]);

  return useMemo(
    () => ({
      currentCaption: captions.currentCaption,
      previousCaption: captions.previousCaption,
      publishCaption,
      clearOwnCaption,
      clearAllCaptions,
    }),
    [captions, publishCaption, clearOwnCaption, clearAllCaptions]
  );
}

export const __testing = { applyCaption, normalizeCaption, nextCaptionId };
