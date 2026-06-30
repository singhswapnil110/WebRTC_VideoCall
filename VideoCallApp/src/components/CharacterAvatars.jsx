import React, { useMemo } from "react";
import { renderAvatarSvg } from "./avatarSvg";

export const NiceAvatar = ({ id, className = "cam-avatar", size = 64 }) => {
  const svg = useMemo(() => renderAvatarSvg(id, size), [id, size]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
};
