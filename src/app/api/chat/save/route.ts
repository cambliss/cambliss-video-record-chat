import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";
import { triggerPusherEvent, getCallChannel, PUSHER_EVENTS } from "~/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { callId, senderName, senderEmail, message, replyToId } = body;

    if (!callId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const roomIdCookie = req.cookies.get("room-id")?.value;
    const isAuthorized = !!session || roomIdCookie === callId;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Save chat message to database with optional reply
    const chatMessage = await prisma.chatMessage.create({
      data: {
        callId,
        senderName: senderName || "Anonymous",
        senderEmail: senderEmail || null,
        message,
        replyToId: replyToId || null,
      },
      include: {
        reactions: true,
        replyTo: {
          select: {
            id: true,
            senderName: true,
            message: true,
          },
        },
      },
    });

    // Trigger Pusher event for real-time updates to all participants
    const channelName = getCallChannel(callId);
    const eventTriggered = await triggerPusherEvent(
      channelName,
      PUSHER_EVENTS.CHAT_MESSAGE,
      chatMessage
    );
    
    if (eventTriggered) {
      console.log(`Chat message broadcasted via Pusher to ${channelName}`);
    } else {
      console.log('Pusher not configured, relying on polling for real-time updates');
    }

    return NextResponse.json({ 
      success: true,
      message: chatMessage,
    });

  } catch (error) {
    console.error("Error saving chat message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
