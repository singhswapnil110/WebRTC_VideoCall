# Sum वाद

A real-time peer-to-peer video calling app. Create a room and share the link — anyone with it can join the call.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Signaling | Node.js, Express, Socket.IO |
| P2P Media | WebRTC via PeerJS |
| Routing | React Router |

## Architecture

```
                        SIGNALING SERVER
                       (Express + Socket.IO)
                              │
              ┌───────────────┴───────────────┐
              │  join_room / user_disconnect   │
              │  user_joined / user_disconnected│
              │                               │
        ┌─────┴─────┐                   ┌─────┴─────┐
        │  Client A  │                   │  Client B  │
        │  (Browser) │                   │  (Browser) │
        └─────┬─────┘                   └─────┬─────┘
              │                               │
              └───────────────────────────────┘
                      WebRTC (PeerJS)
                   Direct P2P media stream
```

The signaling server's only job is room membership — it exchanges peer IDs so clients can find each other. Once both sides have each other's ID, all audio/video flows directly peer-to-peer via WebRTC. The server never touches the media.

**Flow:**
1. User A joins a room → socket emits `join_room` with their PeerJS ID
2. User B joins the same room → server emits `user_joined` to A with B's peer ID
3. A calls B via PeerJS using that ID + local stream
4. WebRTC negotiation completes → media streams directly between browsers

## Local Development

**Signaling server**
```bash
cd Socket_Server
npm install
node server.js        # runs on :8002
```

**Frontend**
```bash
cd VideoCallApp
npm install
cp .env.example .env  # set VITE_SOCKET_URL if needed
npm run dev           # runs on :5173
```
