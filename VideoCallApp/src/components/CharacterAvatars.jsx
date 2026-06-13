import Avatar from "react-nice-avatar";
import { genConfig } from "react-nice-avatar";

export const NiceAvatar = ({ id, className = "cam-avatar", size = 64 }) => (
  <div className={className}>
    <Avatar style={{ width: size, height: size }} config={genConfig(id)} />
  </div>
);
