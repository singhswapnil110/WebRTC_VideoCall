import React, { useMemo } from "react";
import { renderAvatarSvgDataUri } from "./avatarSvg";

export const NiceAvatar = ({ id, className = "cam-avatar", size = 64 }) => {
  const src = useMemo(() => renderAvatarSvgDataUri(id, size), [id, size]);

  return (
    <div className={className}>
      <img src={src} alt="" aria-hidden="true" draggable="false" />
    </div>
  );
};
