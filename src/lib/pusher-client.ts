// Client-side Pusher configuration
// To use Pusher, install: pnpm add pusher-js
// And add to env.mjs: NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER

import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      // Return a mock pusher for development without credentials
      console.warn(
        "Pusher credentials not found. Real-time features will be disabled."
      );
      throw new Error("Pusher not configured");
    }

    pusherClient = new PusherClient(key, {
      cluster,
      forceTLS: true,
      authEndpoint: "/api/pusher/auth",
    });
  }

  return pusherClient;
}

export function subscribeToCal(callId: string) {
  try {
    const pusher = getPusherClient();
    return pusher.subscribe(`call-${callId}`);
  } catch (error) {
    console.warn("Pusher not available, using polling fallback");
    return null;
  }
}

export function unsubscribeFromCall(callId: string) {
  try {
    const pusher = getPusherClient();
    pusher.unsubscribe(`call-${callId}`);
  } catch (error) {
    console.warn("Pusher not available");
  }
}
