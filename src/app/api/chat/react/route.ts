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

    const { messageId, emoji, userName, userEmail } = await req.json();

    if (!messageId || !emoji || !userName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create reaction
    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        emoji,
        userName,
        userEmail: userEmail || null,
      },
    });

    // Get the message to find callId
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (message) {
      // Trigger real-time update
      await triggerPusherEvent(
        getCallChannel(message.callId),
        PUSHER_EVENTS.MESSAGE_REACTION,
        { messageId, reaction }
      );
    }

    return NextResponse.json({ success: true, reaction });
  } catch (error) {
    console.error("Error adding reaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
