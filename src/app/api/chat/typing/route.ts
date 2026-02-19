import { NextRequest, NextResponse } from "next/server";
import { triggerPusherEvent, getCallChannel, PUSHER_EVENTS } from "~/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const { callId, userName, typing } = await req.json();

    if (!callId || !userName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const event = typing ? PUSHER_EVENTS.TYPING_START : PUSHER_EVENTS.TYPING_STOP;

    // Trigger real-time typing indicator (optional - falls back to polling if Pusher not configured)
    await triggerPusherEvent(
      getCallChannel(callId),
      event,
      { userName }
    );

    // Always return success - typing indicators are optional
    return NextResponse.json({ success: true });
  } catch (error) {
    // Typing indicators are not critical - return success even on error
    console.error("Error updating typing status:", error);
    return NextResponse.json({ success: true });
  }
}
