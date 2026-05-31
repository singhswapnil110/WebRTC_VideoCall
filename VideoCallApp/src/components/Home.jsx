import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export const Home = () => {
  const navigate = useNavigate();
  const inputRef = useRef();

  const navigateToRoom = (roomID) => {
    roomID ||= uuidv4();
    navigate(`/room/${roomID}`);
  };

  return (
    <div className="home-page">
      {/* Nav */}
      <nav className="home-nav">
        <div className="brand">
          Sum<span className="brand-accent">वाद</span>
        </div>
      </nav>

      {/* Body */}
      <div className="home-body">
        {/* Fluid gradient blobs */}
        <div className="fluid-blob b1" />
        <div className="fluid-blob b2" />
        <div className="fluid-blob b3" />

        {/* Hero */}
        <div style={{ textAlign: "center", maxWidth: 560, position: "relative", zIndex: 1 }}>
          <h1 className="hero-title">
            Video calls,<br />
            <span className="hero-accent">minus the noise.</span>
          </h1>
          <p className="hero-sub">
            Create a room in one click. Share the link. Everyone joins
            instantly — no accounts, no installs, no friction.
          </p>
        </div>

        {/* Glass action card */}
        <div className="home-sections" style={{ position: "relative", zIndex: 1 }}>
          {/* Create a room */}
          <div className="home-section-col">
            <div className="section-label">Create a room</div>
            <button
              className="btn-primary"
              onClick={() => navigateToRoom()}
            >
              <svg
                width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              New Meeting
            </button>
          </div>

          <div className="section-divider" />

          {/* Join a room */}
          <div className="home-section-col">
            <div className="section-label">Join a room</div>
            <form
              style={{ display: "flex", gap: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                navigateToRoom(inputRef.current.value.trim());
              }}
            >
              <input
                ref={inputRef}
                required
                className="field-input"
                placeholder="Paste room code…"
              />
              <button type="submit" className="btn-secondary">
                Join
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
