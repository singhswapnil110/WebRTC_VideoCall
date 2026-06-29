import React from "react";
import {
  ArrowRight,
  Captions,
  Check,
  ChevronDown,
  Copy,
  Hand,
  Languages,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Moon,
  ScreenShare,
  Sun,
  Users,
  Video,
  VideoOff,
  Volume2,
  X,
} from "lucide-react";

const icons = {
  mic: Mic,
  micOff: MicOff,
  cam: Video,
  camOff: VideoOff,
  close: X,
  chevron: ChevronDown,
  check: Check,
  volume: Volume2,
  chat: MessageSquare,
  participants: Users,
  hand: Hand,
  captions: Captions,
  translate: Languages,
  share: ScreenShare,
  copy: Copy,
  leave: LogOut,
  arrowRight: ArrowRight,
  sun: Sun,
  moon: Moon,
  video: Video,
};

export const Icon = ({ name, width = 17, height = 17, strokeWidth = 1.9, ...props }) => {
  const Component = icons[name];
  if (!Component) return null;
  return <Component width={width} height={height} strokeWidth={strokeWidth} {...props} />;
};
