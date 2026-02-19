import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";
import { triggerPusherEvent, getCallChannel, PUSHER_EVENTS } from "~/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, message } = await req.json();

    if (!messageId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update message
    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        message,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    // Trigger real-time update
    await triggerPusherEvent(
      getCallChannel(updatedMessage.callId),
      PUSHER_EVENTS.MESSAGE_EDITED,
      { messageId, message }
    );

    return NextResponse.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
