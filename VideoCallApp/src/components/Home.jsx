import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export const Home = () => {
  const navigate = useNavigate();
  const inputRef = useRef();

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = html.dataset.theme === "dark" ? "light" : "dark";
    html.dataset.theme = next;
    localStorage.setItem("sumvad-theme", next);
  };

  const navigateToRoom = (roomID) => {
    roomID ||= uuidv4();
    navigate(`/room/${roomID}`);
  };

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="brand">
          Sum<span className="accent">वाद</span>
        </div>
        <button className="theme-pill" onClick={toggleTheme}>
          <div className="pill-icon-wrap">
            <svg className="pill-sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg className="pill-moon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
        </button>
      </nav>

      <div className="home-body">
        <div className="home-hero">
          <h1>Video calls,<br/><span className="accent">minus the noise.</span></h1>
          <p>Create a room in one click. Share the link. Everyone joins instantly.</p>
        </div>

        <div className="home-actions">
          <button className="btn-primary" onClick={() => navigateToRoom()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            New Meeting
          </button>

          <div className="action-divider">or join existing</div>

          <div className="join-row">
            <input
              type="text"
              className="input-solid"
              placeholder="Enter room code"
              ref={inputRef}
            />
            <button
              className="btn-solid"
              onClick={() => {
                const val = inputRef.current?.value?.trim();
                if (val) navigateToRoom(val);
              }}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
