import React, { useMemo } from "react";
import Avatar from "react-nice-avatar";
import { genConfig } from "react-nice-avatar";

export const NiceAvatar = ({ id, className = "cam-avatar", size = 64 }) => {
  const config = useMemo(() => genConfig(id), [id]);
  return (
    <div className={className}>
      <Avatar style={{ width: size, height: size }} config={config} />
    </div>
  );
};
