import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "~/server/auth";
import CallChatHistory from "~/components/call/call-chat-history";

export const metadata = {
  title: "Call History | Cambliss",
  description: "View your call chats and file transfers",
};

export default async function CallHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Call History</h1>
        <p className="text-neutral-400">
          View all your call chats and file transfers
        </p>
      </div>

      <CallChatHistory />
    </div>
  );
}
