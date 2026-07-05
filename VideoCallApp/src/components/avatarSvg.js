import { createAvatar } from "@dicebear/core";
import * as lorelei from "@dicebear/lorelei";

export const renderAvatarSvgDataUri = (id, size = 64) =>
  createAvatar(lorelei, { seed: String(id), size: Number(size) || 64 }).toDataUri();
