import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId, format } = await req.json();

    if (!callId) {
      return NextResponse.json(
        { error: "Call ID is required" },
        { status: 400 }
      );
    }

    // Fetch call data with messages and files
    const [call, messages, files] = await Promise.all([
      prisma.call.findUnique({
        where: { id: callId },
        include: { participants: true },
      }),
      prisma.chatMessage.findMany({
        where: { callId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.fileTransfer.findMany({
        where: { callId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!call) {
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      );
    }

    if (format === "json") {
      return NextResponse.json({
        call,
        messages,
        files,
      });
    }

    // Generate text export
    let textExport = `Call History Export\n`;
    textExport += `===================\n\n`;
    textExport += `Call Name: ${call.name}\n`;
    textExport += `Room ID: ${call.hmsRoomId || "N/A"}\n`;
    textExport += `Created: ${call.createdAt.toLocaleString()}\n`;
    textExport += `Participants: ${call.participants.length}\n\n`;

    if (messages.length > 0) {
      textExport += `\nChat Messages (${messages.length})\n`;
      textExport += `${"-".repeat(50)}\n`;
      messages.forEach((msg) => {
        textExport += `[${new Date(msg.createdAt).toLocaleString()}] ${msg.senderName}: ${msg.message}\n`;
      });
    }

    if (files.length > 0) {
      textExport += `\n\nFile Transfers (${files.length})\n`;
      textExport += `${"-".repeat(50)}\n`;
      files.forEach((file) => {
        textExport += `• ${file.fileName} (${(file.fileSize / 1024).toFixed(2)} KB) - ${file.senderName}\n`;
        textExport += `  Uploaded: ${new Date(file.createdAt).toLocaleString()}\n`;
      });
    }

    return new NextResponse(textExport, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="call-history-${callId}.txt"`,
      },
    });
  } catch (error) {
    console.error("Error exporting call history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
