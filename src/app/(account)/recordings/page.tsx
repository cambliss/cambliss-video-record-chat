import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import RecordingsList from "~/components/call/recordings-list";

export const metadata = {
  title: "Recordings | Cambliss",
  description: "View and manage your call recordings",
};

export default async function RecordingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Call Recordings</h1>
        <p className="text-neutral-400">
          View, download, and manage your recorded calls
        </p>
      </div>

      <RecordingsList />
    </div>
  );
}
