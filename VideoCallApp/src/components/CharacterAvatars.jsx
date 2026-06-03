/* 3D illustrated character avatars — matching mockup */

export const BoyAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#8b5cf6,#c4b5fd)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <radialGradient id="faceLight_boy" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </radialGradient>
        <linearGradient id="hairGrad_boy" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#451a03"/>
          <stop offset="100%" stopColor="#78350f"/>
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="35" rx="28" ry="22" fill="url(#hairGrad_boy)"/>
      <ellipse cx="35" cy="30" rx="12" ry="10" fill="url(#hairGrad_boy)"/>
      <ellipse cx="65" cy="30" rx="12" ry="10" fill="url(#hairGrad_boy)"/>
      <ellipse cx="50" cy="55" rx="24" ry="28" fill="url(#faceLight_boy)"/>
      <ellipse cx="40" cy="50" rx="5" ry="7" fill="#1f2937"/>
      <ellipse cx="60" cy="50" rx="5" ry="7" fill="#1f2937"/>
      <ellipse cx="42" cy="48" rx="2" ry="3" fill="white"/>
      <ellipse cx="62" cy="48" rx="2" ry="3" fill="white"/>
      <path d="M40 65 Q50 72 60 65" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="32" cy="60" rx="4" ry="3" fill="#fca5a5" opacity="0.6"/>
      <ellipse cx="68" cy="60" rx="4" ry="3" fill="#fca5a5" opacity="0.6"/>
    </svg>
  </div>
);

export const GirlAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#60a5fa,#3b82f6)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="girlHair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a5f"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="40" rx="25" ry="22" fill="url(#girlHair)"/>
      <ellipse cx="50" cy="55" rx="18" ry="22" fill="#fcd34d"/>
      <ellipse cx="42" cy="50" rx="4" ry="5" fill="#1f2937"/><ellipse cx="58" cy="50" rx="4" ry="5" fill="#1f2937"/>
      <ellipse cx="44" cy="48" rx="1.5" ry="2" fill="white"/><ellipse cx="60" cy="48" rx="1.5" ry="2" fill="white"/>
      <path d="M45 63 Q50 68 55 63" stroke="#be123c" strokeWidth="2" fill="none"/>
      <ellipse cx="36" cy="58" rx="4" ry="3" fill="#fca5a5" opacity="0.5"/>
      <ellipse cx="64" cy="58" rx="4" ry="3" fill="#fca5a5" opacity="0.5"/>
    </svg>
  </div>
);

export const AlienAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <ellipse cx="50" cy="52" rx="26" ry="24" fill="#86efac"/>
      <ellipse cx="50" cy="20" rx="12" ry="10" fill="#22c55e"/>
      <ellipse cx="34" cy="48" rx="10" ry="12" fill="#1f2937"/><ellipse cx="66" cy="48" rx="10" ry="12" fill="#1f2937"/>
      <ellipse cx="36" cy="45" rx="3" ry="4" fill="white"/><ellipse cx="68" cy="45" rx="3" ry="4" fill="white"/>
      <ellipse cx="50" cy="70" rx="8" ry="4" fill="#16a34a"/>
      <ellipse cx="28" cy="60" rx="5" ry="8" fill="#86efac"/><ellipse cx="72" cy="60" rx="5" ry="8" fill="#86efac"/>
    </svg>
  </div>
);

export const MonsterAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <ellipse cx="30" cy="25" rx="6" ry="12" fill="#fed7aa"/><ellipse cx="70" cy="25" rx="6" ry="12" fill="#fed7aa"/>
      <ellipse cx="50" cy="55" rx="28" ry="26" fill="#fed7aa"/>
      <ellipse cx="36" cy="50" rx="7" ry="9" fill="#1f2937"/><ellipse cx="64" cy="50" rx="7" ry="9" fill="#1f2937"/>
      <ellipse cx="38" cy="47" rx="2.5" ry="3" fill="white"/><ellipse cx="66" cy="47" rx="2.5" ry="3" fill="white"/>
      <path d="M38 68 Q50 78 62 68" stroke="#ea580c" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="20" cy="55" rx="5" ry="7" fill="#fed7aa"/><ellipse cx="80" cy="55" rx="5" ry="7" fill="#fed7aa"/>
    </svg>
  </div>
);

export const RobotAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#6b7280,#374151)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="metal_robot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f3f4f6"/><stop offset="50%" stopColor="#9ca3af"/><stop offset="100%" stopColor="#4b5563"/>
        </linearGradient>
      </defs>
      <rect x="15" y="30" width="70" height="55" rx="12" fill="#e5e7eb"/>
      <rect x="15" y="30" width="70" height="55" rx="12" fill="url(#metal_robot)" opacity="0.8"/>
      <rect x="40" y="18" width="20" height="18" rx="3" fill="#9ca3af"/><rect x="45" y="12" width="10" height="8" rx="2" fill="#6b7280"/>
      <circle cx="35" cy="52" r="10" fill="#60a5fa"/><circle cx="65" cy="52" r="10" fill="#60a5fa"/>
      <circle cx="35" cy="52" r="6" fill="#1e40af"/><circle cx="65" cy="52" r="6" fill="#1e40af"/>
      <rect x="35" y="48" width="4" height="2" rx="1" fill="white" opacity="0.8"/><rect x="65" y="48" width="4" height="2" rx="1" fill="white" opacity="0.8"/>
      <rect x="32" y="75" width="36" height="6" rx="2" fill="#374151"/>
    </svg>
  </div>
);

export const CatAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <polygon points="25,40 35,15 45,35" fill="#c4b5fd"/><polygon points="75,40 65,15 55,35" fill="#c4b5fd"/>
      <ellipse cx="50" cy="55" rx="28" ry="24" fill="#ddd6fe"/>
      <ellipse cx="36" cy="50" rx="5" ry="7" fill="#1f2937"/><ellipse cx="64" cy="50" rx="5" ry="7" fill="#1f2937"/>
      <ellipse cx="38" cy="47" rx="2" ry="2.5" fill="white"/><ellipse cx="66" cy="47" rx="2" ry="2.5" fill="white"/>
      <ellipse cx="50" cy="58" rx="4" ry="3" fill="#f472b6"/>
      <path d="M35 62 Q50 75 65 62" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <line x1="35" y1="60" x2="30" y2="58" stroke="#f472b6" strokeWidth="2"/>
      <line x1="35" y1="63" x2="30" y2="65" stroke="#f472b6" strokeWidth="2"/>
      <line x1="65" y1="60" x2="70" y2="58" stroke="#f472b6" strokeWidth="2"/>
      <line x1="65" y1="63" x2="70" y2="65" stroke="#f472b6" strokeWidth="2"/>
    </svg>
  </div>
);

export const PinkGirlAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#ec4899,#f472b6)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="pinkHair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#831843"/><stop offset="100%" stopColor="#be185d"/>
        </linearGradient>
        <radialGradient id="pinkFace" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#fce7f3"/><stop offset="100%" stopColor="#fbcfe8"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="38" rx="26" ry="22" fill="url(#pinkHair)"/>
      <ellipse cx="25" cy="35" rx="12" ry="10" fill="url(#pinkHair)"/><ellipse cx="75" cy="35" rx="12" ry="10" fill="url(#pinkHair)"/>
      <ellipse cx="50" cy="56" rx="20" ry="24" fill="url(#pinkFace)"/>
      <ellipse cx="42" cy="52" rx="4" ry="6" fill="#1f2937"/><ellipse cx="58" cy="52" rx="4" ry="6" fill="#1f2937"/>
      <ellipse cx="44" cy="49" rx="1.5" ry="2" fill="white"/><ellipse cx="60" cy="49" rx="1.5" ry="2" fill="white"/>
      <path d="M45 64 Q50 70 55 64" stroke="#be123c" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="36" cy="60" rx="3" ry="2.5" fill="#fda4af" opacity="0.6"/><ellipse cx="64" cy="60" rx="3" ry="2.5" fill="#fda4af" opacity="0.6"/>
    </svg>
  </div>
);

export const TealAndroidAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="tealMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5eead4"/><stop offset="50%" stopColor="#14b8a6"/><stop offset="100%" stopColor="#0f766e"/>
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="28" rx="18" ry="12" fill="#0d9488"/>
      <rect x="22" y="38" width="56" height="50" rx="15" fill="url(#tealMetal)"/>
      <circle cx="38" cy="55" r="10" fill="#ccfbf1"/><circle cx="62" cy="55" r="10" fill="#ccfbf1"/>
      <circle cx="38" cy="55" r="6" fill="#0f766e"/><circle cx="62" cy="55" r="6" fill="#0f766e"/>
      <rect x="40" y="73" width="20" height="6" rx="2" fill="#115e59"/>
    </svg>
  </div>
);

export const CuteCreatureAvatar = ({ size = 64 }) => (
  <div className="cam-avatar" style={{ background: "linear-gradient(135deg,#06b6d4,#22d3ee)" }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <ellipse cx="22" cy="32" rx="10" ry="14" fill="#67e8f9" opacity="0.8"/><ellipse cx="78" cy="32" rx="10" ry="14" fill="#67e8f9" opacity="0.8"/>
      <ellipse cx="50" cy="55" rx="30" ry="26" fill="#cffafe"/>
      <ellipse cx="35" cy="50" rx="7" ry="8" fill="#1f2937"/><ellipse cx="65" cy="50" rx="7" ry="8" fill="#1f2937"/>
      <ellipse cx="38" cy="46" rx="2.5" ry="3" fill="white"/><ellipse cx="68" cy="46" rx="2.5" ry="3" fill="white"/>
      <ellipse cx="50" cy="72" rx="6" ry="5" fill="#22d3ee"/>
      <ellipse cx="50" cy="70" rx="3" ry="2" fill="#0891b2"/>
    </svg>
  </div>
);

/* Small avatar for room-people and participant list */
export const SmallBoyAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#8b5cf6,#c4b5fd)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <defs>
        <linearGradient id="sbHair" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#451a03"/><stop offset="100%" stopColor="#78350f"/></linearGradient>
        <radialGradient id="sbFace" cx="30%" cy="30%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#fbbf24"/></radialGradient>
      </defs>
      <ellipse cx="50" cy="35" rx="28" ry="22" fill="url(#sbHair)"/>
      <ellipse cx="35" cy="30" rx="12" ry="10" fill="url(#sbHair)"/><ellipse cx="65" cy="30" rx="12" ry="10" fill="url(#sbHair)"/>
      <ellipse cx="50" cy="55" rx="24" ry="28" fill="url(#sbFace)"/>
      <ellipse cx="40" cy="50" rx="5" ry="7" fill="#1f2937"/><ellipse cx="60" cy="50" rx="5" ry="7" fill="#1f2937"/>
      <ellipse cx="42" cy="48" rx="2" ry="3" fill="white"/><ellipse cx="62" cy="48" rx="2" ry="3" fill="white"/>
      <path d="M40 65 Q50 72 60 65" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  </div>
);

export const SmallGirlAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#60a5fa,#3b82f6)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <defs>
        <linearGradient id="sgHair" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e3a5f"/><stop offset="100%" stopColor="#0f172a"/></linearGradient>
      </defs>
      <ellipse cx="50" cy="40" rx="25" ry="22" fill="url(#sgHair)"/>
      <ellipse cx="50" cy="55" rx="18" ry="22" fill="#fcd34d"/>
      <ellipse cx="42" cy="50" rx="4" ry="5" fill="#1f2937"/><ellipse cx="58" cy="50" rx="4" ry="5" fill="#1f2937"/>
      <ellipse cx="44" cy="48" rx="1.5" ry="2" fill="white"/><ellipse cx="60" cy="48" rx="1.5" ry="2" fill="white"/>
      <path d="M45 63 Q50 68 55 63" stroke="#be123c" strokeWidth="2" fill="none"/>
    </svg>
  </div>
);

export const SmallAlienAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <ellipse cx="50" cy="52" rx="26" ry="24" fill="#86efac"/>
      <ellipse cx="50" cy="20" rx="12" ry="10" fill="#22c55e"/>
      <ellipse cx="34" cy="48" rx="10" ry="12" fill="#1f2937"/><ellipse cx="66" cy="48" rx="10" ry="12" fill="#1f2937"/>
      <ellipse cx="36" cy="45" rx="3" ry="4" fill="white"/><ellipse cx="68" cy="45" rx="3" ry="4" fill="white"/>
      <ellipse cx="50" cy="70" rx="8" ry="4" fill="#16a34a"/>
      <ellipse cx="28" cy="60" rx="5" ry="8" fill="#86efac"/><ellipse cx="72" cy="60" rx="5" ry="8" fill="#86efac"/>
    </svg>
  </div>
);

export const SmallMonsterAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <ellipse cx="30" cy="25" rx="6" ry="12" fill="#fed7aa"/><ellipse cx="70" cy="25" rx="6" ry="12" fill="#fed7aa"/>
      <ellipse cx="50" cy="55" rx="28" ry="26" fill="#fed7aa"/>
      <ellipse cx="36" cy="50" rx="7" ry="9" fill="#1f2937"/><ellipse cx="64" cy="50" rx="7" ry="9" fill="#1f2937"/>
      <ellipse cx="38" cy="47" rx="2.5" ry="3" fill="white"/><ellipse cx="66" cy="47" rx="2.5" ry="3" fill="white"/>
      <path d="M38 68 Q50 78 62 68" stroke="#ea580c" strokeWidth="3" fill="none" strokeLinecap="round"/>
    </svg>
  </div>
);

export const SmallRobotAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#6b7280,#374151)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <defs>
        <linearGradient id="srMetal" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f3f4f6"/><stop offset="50%" stopColor="#9ca3af"/><stop offset="100%" stopColor="#4b5563"/></linearGradient>
      </defs>
      <rect x="15" y="30" width="70" height="55" rx="12" fill="#e5e7eb"/>
      <rect x="15" y="30" width="70" height="55" rx="12" fill="url(#srMetal)" opacity="0.8"/>
      <rect x="40" y="18" width="20" height="18" rx="3" fill="#9ca3af"/><rect x="45" y="12" width="10" height="8" rx="2" fill="#6b7280"/>
      <circle cx="35" cy="52" r="10" fill="#60a5fa"/><circle cx="65" cy="52" r="10" fill="#60a5fa"/>
      <circle cx="35" cy="52" r="6" fill="#1e40af"/><circle cx="65" cy="52" r="6" fill="#1e40af"/>
    </svg>
  </div>
);

export const SmallCatAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <polygon points="25,40 35,15 45,35" fill="#c4b5fd"/><polygon points="75,40 65,15 55,35" fill="#c4b5fd"/>
      <ellipse cx="50" cy="55" rx="28" ry="24" fill="#ddd6fe"/>
      <ellipse cx="36" cy="50" rx="5" ry="7" fill="#1f2937"/><ellipse cx="64" cy="50" rx="5" ry="7" fill="#1f2937"/>
      <ellipse cx="38" cy="47" rx="2" ry="2.5" fill="white"/><ellipse cx="66" cy="47" rx="2" ry="2.5" fill="white"/>
      <ellipse cx="50" cy="58" rx="4" ry="3" fill="#f472b6"/>
      <path d="M35 62 Q50 75 65 62" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  </div>
);

export const SmallPinkGirlAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#ec4899,#f472b6)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <defs>
        <linearGradient id="spHair" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#831843"/><stop offset="100%" stopColor="#be185d"/></linearGradient>
      </defs>
      <ellipse cx="50" cy="38" rx="26" ry="22" fill="url(#spHair)"/>
      <ellipse cx="25" cy="35" rx="12" ry="10" fill="url(#spHair)"/><ellipse cx="75" cy="35" rx="12" ry="10" fill="url(#spHair)"/>
      <ellipse cx="50" cy="56" rx="20" ry="24" fill="#fce7f3"/>
      <ellipse cx="42" cy="52" rx="4" ry="6" fill="#1f2937"/><ellipse cx="58" cy="52" rx="4" ry="6" fill="#1f2937"/>
      <ellipse cx="44" cy="49" rx="1.5" ry="2" fill="white"/><ellipse cx="60" cy="49" rx="1.5" ry="2" fill="white"/>
      <path d="M45 64 Q50 70 55 64" stroke="#be123c" strokeWidth="2" fill="none"/>
    </svg>
  </div>
);

export const SmallTealAndroidAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <defs>
        <linearGradient id="stMetal" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#5eead4"/><stop offset="50%" stopColor="#14b8a6"/><stop offset="100%" stopColor="#0f766e"/></linearGradient>
      </defs>
      <ellipse cx="50" cy="28" rx="18" ry="12" fill="#0d9488"/>
      <rect x="22" y="38" width="56" height="50" rx="15" fill="url(#stMetal)"/>
      <circle cx="38" cy="55" r="10" fill="#ccfbf1"/><circle cx="62" cy="55" r="10" fill="#ccfbf1"/>
      <circle cx="38" cy="55" r="6" fill="#0f766e"/><circle cx="62" cy="55" r="6" fill="#0f766e"/>
      <rect x="40" y="73" width="20" height="6" rx="2" fill="#115e59"/>
    </svg>
  </div>
);

export const SmallCuteCreatureAvatar = () => (
  <div className="part-avatar" style={{ background: "linear-gradient(135deg,#06b6d4,#22d3ee)" }}>
    <svg viewBox="0 0 100 100" width="18" height="18">
      <ellipse cx="22" cy="32" rx="10" ry="14" fill="#67e8f9" opacity="0.8"/><ellipse cx="78" cy="32" rx="10" ry="14" fill="#67e8f9" opacity="0.8"/>
      <ellipse cx="50" cy="55" rx="30" ry="26" fill="#cffafe"/>
      <ellipse cx="35" cy="50" rx="7" ry="8" fill="#1f2937"/><ellipse cx="65" cy="50" rx="7" ry="8" fill="#1f2937"/>
      <ellipse cx="38" cy="46" rx="2.5" ry="3" fill="white"/><ellipse cx="68" cy="46" rx="2.5" ry="3" fill="white"/>
      <ellipse cx="50" cy="72" rx="6" ry="5" fill="#22d3ee"/>
      <ellipse cx="50" cy="70" rx="3" ry="2" fill="#0891b2"/>
    </svg>
  </div>
);

/* Small avatar for room-people section (rp-avatar sizing) */
const rpStyles = { width: "22px", height: "22px" };

const RpAvatarWrap = ({ children, bg }) => (
  <div className="rp-avatar" style={{ background: bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)", pointerEvents: "none", zIndex: 2 }} />
    {children}
  </div>
);

export const RpGirlAvatar = () => (
  <RpAvatarWrap bg="linear-gradient(135deg,#60a5fa,#3b82f6)">
    <svg viewBox="0 0 100 100" style={{ width: 22, height: 22, position: "relative", zIndex: 1 }}>
      <ellipse cx="50" cy="40" rx="25" ry="22" fill="#1e3a5f"/>
      <ellipse cx="50" cy="55" rx="18" ry="22" fill="#fcd34d"/>
      <ellipse cx="42" cy="50" rx="4" ry="5" fill="#1f2937"/><ellipse cx="58" cy="50" rx="4" ry="5" fill="#1f2937"/>
      <ellipse cx="44" cy="48" rx="1.5" ry="2" fill="white"/><ellipse cx="60" cy="48" rx="1.5" ry="2" fill="white"/>
      <path d="M45 63 Q50 68 55 63" stroke="#be123c" strokeWidth="2" fill="none"/>
    </svg>
  </RpAvatarWrap>
);

export const RpAlienAvatar = () => (
  <RpAvatarWrap bg="linear-gradient(135deg,#22c55e,#16a34a)">
    <svg viewBox="0 0 100 100" style={{ width: 22, height: 22, position: "relative", zIndex: 1 }}>
      <ellipse cx="50" cy="52" rx="26" ry="24" fill="#86efac"/>
      <ellipse cx="50" cy="20" rx="12" ry="10" fill="#22c55e"/>
      <ellipse cx="34" cy="48" rx="10" ry="12" fill="#1f2937"/><ellipse cx="66" cy="48" rx="10" ry="12" fill="#1f2937"/>
      <ellipse cx="36" cy="45" rx="3" ry="4" fill="white"/><ellipse cx="68" cy="45" rx="3" ry="4" fill="white"/>
      <ellipse cx="50" cy="70" rx="8" ry="4" fill="#16a34a"/>
    </svg>
  </RpAvatarWrap>
);

export const RpMonsterAvatar = () => (
  <RpAvatarWrap bg="linear-gradient(135deg,#f97316,#ea580c)">
    <svg viewBox="0 0 100 100" style={{ width: 22, height: 22, position: "relative", zIndex: 1 }}>
      <ellipse cx="30" cy="25" rx="6" ry="12" fill="#fed7aa"/><ellipse cx="70" cy="25" rx="6" ry="12" fill="#fed7aa"/>
      <ellipse cx="50" cy="55" rx="28" ry="26" fill="#fed7aa"/>
      <ellipse cx="36" cy="50" rx="7" ry="9" fill="#1f2937"/><ellipse cx="64" cy="50" rx="7" ry="9" fill="#1f2937"/>
      <ellipse cx="38" cy="47" rx="2.5" ry="3" fill="white"/><ellipse cx="66" cy="47" rx="2.5" ry="3" fill="white"/>
      <path d="M38 68 Q50 78 62 68" stroke="#ea580c" strokeWidth="3" fill="none"/>
    </svg>
  </RpAvatarWrap>
);

export const RpRobotAvatar = () => (
  <RpAvatarWrap bg="linear-gradient(135deg,#6b7280,#374151)">
    <svg viewBox="0 0 100 100" style={{ width: 22, height: 22, position: "relative", zIndex: 1 }}>
      <rect x="15" y="30" width="70" height="55" rx="12" fill="#e5e7eb"/>
      <rect x="40" y="18" width="20" height="18" rx="3" fill="#9ca3af"/><rect x="45" y="12" width="10" height="8" rx="2" fill="#6b7280"/>
      <circle cx="35" cy="52" r="10" fill="#60a5fa"/><circle cx="65" cy="52" r="10" fill="#60a5fa"/>
      <circle cx="35" cy="52" r="6" fill="#1e40af"/><circle cx="65" cy="52" r="6" fill="#1e40af"/>
    </svg>
  </RpAvatarWrap>
);

export const RpCatAvatar = () => (
  <RpAvatarWrap bg="linear-gradient(135deg,#a855f7,#7c3aed)">
    <svg viewBox="0 0 100 100" style={{ width: 22, height: 22, position: "relative", zIndex: 1 }}>
      <polygon points="25,40 35,15 45,35" fill="#c4b5fd"/><polygon points="75,40 65,15 55,35" fill="#c4b5fd"/>
      <ellipse cx="50" cy="55" rx="28" ry="24" fill="#ddd6fe"/>
      <ellipse cx="36" cy="50" rx="5" ry="7" fill="#1f2937"/><ellipse cx="64" cy="50" rx="5" ry="7" fill="#1f2937"/>
      <ellipse cx="38" cy="47" rx="2" ry="2.5" fill="white"/><ellipse cx="66" cy="47" rx="2" ry="2.5" fill="white"/>
      <ellipse cx="50" cy="58" rx="4" ry="3" fill="#f472b6"/>
    </svg>
  </RpAvatarWrap>
);
