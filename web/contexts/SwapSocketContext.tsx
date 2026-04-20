"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { getSwapSocket, disconnectSwapSocket } from "@/lib/socket";

type SwapSocketContextValue = {
  isConnected: boolean;
};

const SwapSocketContext = createContext<SwapSocketContextValue>({
  isConnected: false,
});

type Props = {
  token: string | null;
  onMatchFound?: (data: { match_id: number; match_type: string }) => void;
  onConfirmed?: (data: { match_id: number; confirmed_by: { id: number; display_name: string } }) => void;
  onCompleted?: (data: { match_id: number; points_awarded: number }) => void;
  onExpired?: (data: { swap_request_id: number }) => void;
  children: ReactNode;
};

export function SwapSocketProvider({
  token,
  onMatchFound,
  onConfirmed,
  onCompleted,
  onExpired,
  children,
}: Props) {
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!token) return;

    const socket = getSwapSocket(token);

    socket.on("connect", () => {
      connectedRef.current = true;
    });

    socket.on("disconnect", () => {
      connectedRef.current = false;
    });

    socket.on("swap:matched", (data: { match_id: number; match_type: string }) => {
      toast.success("Swap Match Found!", {
        description: `A ${data.match_type.toLowerCase()} match has been found. Confirm now!`,
        duration: 8000,
      });
      onMatchFound?.(data);
    });

    socket.on("swap:confirmed", (data: { match_id: number; confirmed_by: { id: number; display_name: string } }) => {
      toast.info("Match Confirmed", {
        description: `${data.confirmed_by.display_name} confirmed the swap. Your turn!`,
        duration: 6000,
      });
      onConfirmed?.(data);
    });

    socket.on("swap:completed", (data: { match_id: number; points_awarded: number }) => {
      toast.success("Swap Completed!", {
        description: `+${data.points_awarded} Cooperation Points awarded!`,
        duration: 8000,
      });
      onCompleted?.(data);
    });

    socket.on("swap:expired", (data: { swap_request_id: number }) => {
      toast.warning("Swap Request Expired", {
        description: "Your swap request expired with no match found.",
        duration: 6000,
      });
      onExpired?.(data);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("swap:matched");
      socket.off("swap:confirmed");
      socket.off("swap:completed");
      socket.off("swap:expired");
      disconnectSwapSocket();
    };
  }, [token, onMatchFound, onConfirmed, onCompleted, onExpired]);

  return (
    <SwapSocketContext.Provider value={{ isConnected: connectedRef.current }}>
      {children}
    </SwapSocketContext.Provider>
  );
}

export function useSwapSocket() {
  return useContext(SwapSocketContext);
}