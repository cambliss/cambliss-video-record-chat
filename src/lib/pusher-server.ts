// Server-side Pusher configuration
// To use Pusher, install: pnpm add pusher
// And add to env.mjs: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER

import Pusher from "pusher";

// Lazy initialization to avoid errors if Pusher env vars are not set
let pusherInstance: Pusher | null = null;

function hasPusherCredentials() {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}

export function getPusher(): Pusher {
  if (!pusherInstance) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    // Check if  Pusher credentials are available
    if (!appId || !key || !secret || !cluster) {
      throw new Error(
        "Pusher credentials not found. Please set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, and NEXT_PUBLIC_PUSHER_CLUSTER in your environment variables."
      );
    }

    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  return pusherInstance;
}

// Helper function to trigger events
export async function triggerPusherEvent(
  channel: string,
  event: string,
  data: any
) {
  try {
    if (!hasPusherCredentials()) {
      return false;
    }

    const pusher = getPusher();
    await pusher.trigger(channel, event, data);
    return true;
  } catch (error) {
    console.error("Pusher trigger error:", error);
    return false;
  }
}

// Event types for type safety
export const PUSHER_EVENTS = {
  CHAT_MESSAGE: "chat-message",
  FILE_UPLOADED: "file-uploaded",
  MESSAGE_REACTION: "message-reaction",
  MESSAGE_EDITED: "message-edited",
  MESSAGE_DELETED: "message-deleted",
  PARTICIPANT_JOINED: "participant-joined",
  PARTICIPANT_LEFT: "participant-left",
  TYPING_START: "typing-start",
  TYPING_STOP: "typing-stop",
  RECORDING_STARTED: "recording-started",
  RECORDING_STOPPED: "recording-stopped",
} as const;

// Channel naming convention
export function getCallChannel(callId: string) {
  return `call-${callId}`;
}

export function getPrivateUserChannel(userId: string) {
  return `private-user-${userId}`;
}
