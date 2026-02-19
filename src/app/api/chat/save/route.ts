import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { callId, senderName, senderEmail, message, replyToId } = body;

    if (!callId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
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
