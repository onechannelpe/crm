import { defineWebSocketHandler } from "h3";

export type WsHooks = Parameters<typeof defineWebSocketHandler>[0];
export type WsPeer = WsHooks extends {
  open?: (peer: infer Peer) => unknown;
}
  ? Peer
  : never;
export type WsMessage = WsHooks extends {
  message?: (peer: WsPeer, message: infer Message) => unknown;
}
  ? Message
  : never;
