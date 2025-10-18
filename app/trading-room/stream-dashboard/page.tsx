import { StreamChat } from "@/components/test-components/test-stream/stream-chat";
import { StreamDashboard } from "@/components/test-components/test-stream/stream-dashboard";

export default function TestStream() {
  return (
    <div className="flex h-full w-full gap-3 p-4">
      <StreamDashboard />
      <StreamChat />
    </div>
  );
}
