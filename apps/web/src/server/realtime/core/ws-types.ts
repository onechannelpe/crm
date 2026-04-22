import type { WebSocketPeer } from "h3";

export type WsPeer = WebSocketPeer & {
  context: WebSocketPeer["context"] & {
    session?: unknown;
  };
};
