import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface StreamData {
  streamId: string;
  streamKey: string;
  rtmpUrl: string;
  playbackId: string;
  latencyMode: string;
  reconnectWindow: number;
  enableDvr: boolean;
  unlistReplay: boolean;
  status: string;
  userId: string;
  roomId: string;
}

export function useStream(roomId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{
    streams: StreamData[];
    autoCreate?: boolean;
  }>({
    queryKey: ["stream", roomId],
    queryFn: async () => {
      const response = await fetch(`/api/streams?roomId=${roomId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch stream");
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });

  return { data, isLoading, error };
}

export function useUpdateStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      streamId,
      data,
    }: {
      streamId: string;
      data: {
        latency_mode?: string;
        reconnect_window?: number;
        enable_dvr?: boolean;
        unlist_replay?: boolean;
      };
    }) => {
      const response = await fetch(`/api/streams/${streamId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update stream");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stream"] });
    },
  });
}

export function useResetStreamKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (streamId: string) => {
      const response = await fetch(`/api/streams/${streamId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reset stream key");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stream"] });
      toast.success("Stream key reset successfully! Please update your streaming software.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset stream key");
    },
  });
}

