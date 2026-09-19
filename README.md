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
              │  send_caption / receive_caption │
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

The signaling server's job is room membership — it exchanges peer IDs so clients can find each other. Once both sides have each other's ID, all audio/video flows directly peer-to-peer via WebRTC. The server never touches the media; it also relays chat and caption **text**, and stamps the sender identity on both so a participant cannot post as someone else.

**Flow:**
1. User A joins a room → socket emits `join_room` with their PeerJS ID
2. User B joins the same room → server emits `user_joined` to A with B's peer ID
3. A calls B via PeerJS using that ID + local stream
4. WebRTC negotiation completes → media streams directly between browsers

## Live captions

Captions are generated on the speaker's own device and only the resulting text
is sent to the room — microphone audio never leaves the browser.

Microphone audio is tapped by an `AudioWorklet`, buffered into 2048-sample
chunks, and passed to a Web Worker running Whisper (`Xenova/whisper-tiny` via
`@huggingface/transformers`). A simple energy-based voice activity detector
splits the stream into utterances of at most 4 seconds and emits interim and
final lines, which are relayed over Socket.IO and rendered for everyone.

**Requirements**
- `Worker`, `AudioWorkletNode` and `AudioContext`. Without them the captions
  button is disabled with an explanatory tooltip.
- WebGPU is used when available (`fp32`), otherwise the wasm backend (`q8`).
  The wasm path needs `@huggingface/transformers` >= 4.3; the runtime bundled
  with 4.2 cannot build a session for that model export.

**First use** downloads the model from huggingface.co (tens of MB) and the ONNX
runtime from jsdelivr. Both are cached by the browser afterwards, so the first
toggle is slow and later ones are not. The bar shows the loading and error
states while this happens.

**Production builds** must keep `worker.format: 'es'` in `vite.config.js`. The
ONNX runtime's `import.meta.url` shim dereferences `document`, which is absent
in a worker, and Rollup only guards that for non-IIFE output.

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
