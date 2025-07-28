import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DrawTool,
  LineTool,
  DrawPath,
  LineDrawing,
} from "@/components/room/LineTools";

interface DrawingState {
  selectedCursor: string;
  drawTool: DrawTool;
  pencilColor: string;
  highlighterColor: string;
  lineTool: LineTool;
  eraserActive: boolean;
  drawPaths: DrawPath[];
  lineDrawings: LineDrawing[];
  selectedPeriod: string;
  chartType: string;
  fibDrawings: any[];
  fibPreview: any;
  emojiDrawings: {
    id: string;
    x: number;
    y: number;
    emoji: string;
    size: number;
  }[]; // <-- add this
}

interface UseDrawingSyncProps {
  roomId: string;
  hostId: string;
  isHost: boolean;
  initialState: DrawingState;
}

export function useDrawingSync({
  roomId,
  hostId,
  isHost,
  initialState,
}: UseDrawingSyncProps) {
  const [state, setState] = useState<DrawingState>(initialState);
  const [channel, setChannel] = useState<any>(null);

  // Initialize broadcast channel
  useEffect(() => {
    // Don't create channel if roomId is empty (no sync needed)
    if (!roomId || roomId === "") {
      return;
    }

    const supabase = createClient();

    // Create a unique channel for this room's drawing sync
    const drawingChannel = supabase
      .channel(`drawing-sync-${roomId}`)
      .on("broadcast", { event: "drawing-state-update" }, (payload) => {
        // Only participants receive updates (not the host who sent it)
        if (!isHost) {
          setState(payload.payload);
        }
      })
      .subscribe();

    setChannel(drawingChannel);

    return () => {
      if (drawingChannel) {
        supabase.removeChannel(drawingChannel);
      }
    };
  }, [roomId, isHost, hostId]);

  // Efficiently broadcast only fibDrawings and fibPreview when they change (host only)
  useEffect(() => {
    if (!isHost || !channel) return;
    channel.send({
      type: "broadcast",
      event: "fib-update",
      payload: {
        fibDrawings: state.fibDrawings,
        fibPreview: state.fibPreview,
      },
    });
  }, [isHost, channel, state.fibDrawings, state.fibPreview]);

  // Listen for fib-update and update local state (participant only)
  useEffect(() => {
    if (isHost || !channel) return;
    const handler = (payload: any) => {
      if (payload.fibDrawings !== undefined) {
        setState((prev) => ({ ...prev, fibDrawings: payload.fibDrawings }));
      }
      if (payload.fibPreview !== undefined) {
        setState((prev) => ({ ...prev, fibPreview: payload.fibPreview }));
      }
    };
    channel.on("broadcast", { event: "fib-update" }, handler);
    return () => {
      // Do not call channel.off (it does not exist)
      // If you want to clean up, you can unsubscribe the channel:
      // channel.unsubscribe();
      // Or do nothing if you want to keep the channel alive
    };
  }, [isHost, channel]);

  // Broadcast emojiDrawings when it changes (host only)
  useEffect(() => {
    if (!isHost || !channel) return;
    channel.send({
      type: "broadcast",
      event: "emoji-update",
      payload: {
        emojiDrawings: state.emojiDrawings,
      },
    });
  }, [isHost, channel, state.emojiDrawings]);

  // Listen for emoji-update and update local state (participant only)
  useEffect(() => {
    if (isHost || !channel) return;
    const handler = (payload: any) => {
      if (payload.emojiDrawings !== undefined) {
        setState((prev) => ({ ...prev, emojiDrawings: payload.emojiDrawings }));
      }
    };
    channel.on("broadcast", { event: "emoji-update" }, handler);
    return () => {
      // No channel.off needed
    };
  }, [isHost, channel]);

  // Optimized function to broadcast state updates
  const broadcastState = useCallback(
    (updater: (prevState: DrawingState) => Partial<DrawingState>) => {
      if (!isHost || !channel || !roomId || roomId === "") return;

      setState((prevState) => {
        const newState = updater(prevState);
        const updatedState = { ...prevState, ...newState };

        channel.send({
          type: "broadcast",
          event: "drawing-state-update",
          payload: updatedState,
        });

        return updatedState;
      });
    },
    [isHost, channel, roomId]
  );

  // Individual setters for host (optimized with debouncing)
  const setSelectedCursor = useCallback(
    (value: string) => {
      if (isHost) {
        broadcastState(() => ({ selectedCursor: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setDrawTool = useCallback(
    (value: DrawTool) => {
      if (isHost) {
        broadcastState(() => ({ drawTool: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setPencilColor = useCallback(
    (value: string) => {
      if (isHost) {
        broadcastState(() => ({ pencilColor: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setHighlighterColor = useCallback(
    (value: string) => {
      if (isHost) {
        broadcastState(() => ({ highlighterColor: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setLineTool = useCallback(
    (value: LineTool) => {
      if (isHost) {
        broadcastState(() => ({ lineTool: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setEraserActive = useCallback(
    (value: boolean) => {
      if (isHost) {
        broadcastState(() => ({ eraserActive: value }));
      }
    },
    [isHost, broadcastState]
  );

  // For drawing paths and line drawings, we need immediate updates
  const setDrawPaths = useCallback(
    (value: DrawPath[]) => {
      if (isHost) {
        broadcastState(() => ({ drawPaths: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setLineDrawings = useCallback(
    (value: LineDrawing[]) => {
      if (isHost) {
        broadcastState(() => ({ lineDrawings: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setSelectedPeriod = useCallback(
    (value: string) => {
      if (isHost) {
        broadcastState(() => ({ selectedPeriod: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setChartType = useCallback(
    (value: string) => {
      if (isHost) {
        broadcastState(() => ({ chartType: value }));
      }
    },
    [isHost, broadcastState]
  );

  // Add fibDrawings and fibPreview to the drawing state
  // In the host's broadcastState, include fibDrawings and fibPreview
  // In the participant's listener, update local fibDrawings and fibPreview if present in the payload
  const setFibDrawings = useCallback(
    (value: any[]) => {
      if (isHost) {
        broadcastState(() => ({ fibDrawings: value }));
      }
    },
    [isHost, broadcastState]
  );

  const setFibPreview = useCallback(
    (value: any) => {
      if (isHost) {
        broadcastState(() => ({ fibPreview: value }));
      }
    },
    [isHost, broadcastState]
  );

  // Add emojiDrawings to the drawing state
  // In the host's broadcastState, include emojiDrawings
  // In the participant's listener, update local emojiDrawings if present in the payload
  const setEmojiDrawings = useCallback(
    (
      value: { id: string; x: number; y: number; emoji: string; size: number }[]
    ) => {
      if (isHost) {
        broadcastState(() => ({ emojiDrawings: value }));
      }
    },
    [isHost, broadcastState]
  );

  return {
    // State
    selectedCursor: state.selectedCursor,
    drawTool: state.drawTool,
    pencilColor: state.pencilColor,
    highlighterColor: state.highlighterColor,
    lineTool: state.lineTool,
    eraserActive: state.eraserActive,
    drawPaths: state.drawPaths,
    lineDrawings: state.lineDrawings,
    selectedPeriod: state.selectedPeriod,
    chartType: state.chartType,
    fibDrawings: state.fibDrawings, // Added for Fibonacci drawings
    fibPreview: state.fibPreview, // Added for Fibonacci preview
    emojiDrawings: state.emojiDrawings,

    // Setters (only work for host)
    setSelectedCursor,
    setDrawTool,
    setPencilColor,
    setHighlighterColor,
    setLineTool,
    setEraserActive,
    setDrawPaths,
    setLineDrawings,
    setSelectedPeriod,
    setChartType,
    setFibDrawings, // Added for Fibonacci drawings
    setFibPreview, // Added for Fibonacci preview
    setEmojiDrawings,

    // Utility
    isHost,
    roomId,
  };
}
