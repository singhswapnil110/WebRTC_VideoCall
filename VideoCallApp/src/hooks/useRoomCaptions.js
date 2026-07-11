import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_CAPTION_TEXT_LENGTH = 500;
const emptyCaptions = { currentCaption: null, previousCaption: null };

const clampText = (text) => {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, MAX_CAPTION_TEXT_LENGTH);
};

const normalizeCaption = (caption) => {
  if (!caption || typeof caption !== "object") return null;

  const text = clampText(caption.text);
  if (text.length === 0) return null;

  const senderId = typeof caption.senderId === "string" ? caption.senderId : "";
  const senderName = typeof caption.senderName === "string" && caption.senderName.trim()
    ? caption.senderName.trim().slice(0, 80)
    : "Speaker";
  const captionId = typeof caption.captionId === "string" && caption.captionId
    ? caption.captionId
    : null;

  if (!senderId || !captionId) return null;

  return {
    captionId,
    senderId,
    senderName,
    text,
    isFinal: Boolean(caption.isFinal),
    seq: Number.isInteger(caption.seq) ? caption.seq : null,
    timestamp: Number.isFinite(caption.timestamp) ? caption.timestamp : Date.now(),
    detectedLanguage:
      typeof caption.detectedLanguage === "string" && caption.detectedLanguage.trim()
        ? caption.detectedLanguage.trim()
        : undefined,
  };
};

const applyCaption = (state, caption) => {
  if (!state.currentCaption) {
    return { ...state, currentCaption: caption };
  }

  if (state.currentCaption.captionId === caption.captionId) {
    return {
      ...state,
      currentCaption: { ...state.currentCaption, ...caption },
    };
  }

  return {
    previousCaption: state.currentCaption.isFinal ? state.currentCaption : state.previousCaption,
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

  const clearCurrentCaption = useCallback(() => {
    activeCaptionIdRef.current = null;
    setCaptions((current) => ({
      ...current,
      currentCaption: current.currentCaption?.isFinal ? current.currentCaption : null,
    }));
  }, []);

  const publishCaption = useCallback(
    ({ text, isFinal = false, detectedLanguage } = {}) => {
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
        timestamp: Date.now(),
        detectedLanguage,
      });

      if (!caption) return null;

      setCaptions((current) => applyCaption(current, caption));
      socket.emit("send_caption", { roomID, caption });

      if (caption.isFinal) {
        activeCaptionIdRef.current = null;
      }

      return caption;
    },
    [enabled, roomID, senderId, senderName, socket]
  );

  useEffect(() => {
    if (enabled) return;
    clearCurrentCaption();
  }, [enabled, clearCurrentCaption]);

  useEffect(() => {
    clearAllCaptions();
    lastSeqBySenderRef.current = {};
  }, [clearAllCaptions, roomID]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleCaption = (incomingCaption) => {
      const caption = normalizeCaption(incomingCaption);
      if (!caption || caption.senderId === senderId) return;

      const lastSeq = lastSeqBySenderRef.current[caption.senderId] ?? -1;
      if (caption.seq !== null && caption.seq <= lastSeq) return;
      if (caption.seq !== null) {
        lastSeqBySenderRef.current[caption.senderId] = caption.seq;
      }

      setCaptions((current) => applyCaption(current, caption));
    };

    socket.on("receive_caption", handleCaption);
    return () => socket.off("receive_caption", handleCaption);
  }, [senderId, socket]);

  return useMemo(
    () => ({
      currentCaption: captions.currentCaption,
      previousCaption: captions.previousCaption,
      publishCaption,
      clearCurrentCaption,
      clearAllCaptions,
    }),
    [captions, publishCaption, clearCurrentCaption, clearAllCaptions]
  );
}

export const __testing = { applyCaption, normalizeCaption, nextCaptionId };
