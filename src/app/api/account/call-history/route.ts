import { getServerSession } from "next-auth/next";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Get all calls created by the user with chat messages and files
    const callsCreated = await prisma.call.findMany({
      where: { userId: session.user.id },
      include: {
        participants: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Get all calls the user participated in
    const participatedCalls = await prisma.participant.findMany({
      where: { userId: session.user.id },
      include: {
        call: {
          include: {
            participants: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: 50,
    });

    // Combine all unique call IDs
    const createdCallIds = callsCreated.map(call => call.id);
    const participatedCallIds = participatedCalls.map(p => p.call.id);
    const allCallIds = [...new Set([...createdCallIds, ...participatedCallIds])];

    // Fetch chat messages and files for all calls
    const [chatMessages, fileTransfers] = await Promise.all([
      prisma.chatMessage.findMany({
        where: {
          callId: { in: allCallIds },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.fileTransfer.findMany({
        where: {
          callId: { in: allCallIds },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Group messages and files by callId
    const chatsByCall: Record<string, typeof chatMessages> = {};
    const filesByCall: Record<string, typeof fileTransfers> = {};

    chatMessages.forEach((msg) => {
      if (!chatsByCall[msg.callId]) chatsByCall[msg.callId] = [];
      chatsByCall[msg.callId].push(msg);
    });

    fileTransfers.forEach((file) => {
      if (!filesByCall[file.callId]) filesByCall[file.callId] = [];
      filesByCall[file.callId].push(file);
    });

    // Prepare response with all call data
    const callsWithData = callsCreated.map(call => ({
      ...call,
      chatMessages: chatsByCall[call.id] || [],
      fileTransfers: filesByCall[call.id] || [],
    }));

    const participatedCallsWithData = participatedCalls.map(p => ({
      ...p,
      call: {
        ...p.call,
        chatMessages: chatsByCall[p.call.id] || [],
        fileTransfers: filesByCall[p.call.id] || [],
      },
    }));

    return new Response(
      JSON.stringify({
        created: callsWithData,
        participated: participatedCallsWithData,
        chatsByCall,
        filesByCall,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching call history:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to fetch call history",
      }),
      { status: 500 }
    );
  }
}
