"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useUserUids() {
  return useQuery({
    queryKey: ["user-uids"],
    queryFn: async () => {
      const res = await fetch("/api/user-uids", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch UIDs");
      const json = await res.json();
      return json.uids as any[];
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}

export function useAddUserUid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      uid: string;
      exchange_id: string;
      is_active?: boolean;
    }) => {
      const res = await fetch("/api/user-uids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add UID");
      return (await res.json()).uid;
    },
    onMutate: async (payload) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ["user-uids"] });

      // Snapshot the previous value
      const previousUids = qc.getQueryData(["user-uids"]);

      // Optimistically update to the new value
      qc.setQueryData(["user-uids"], (old: any[] = []) => {
        const newUid = {
          id: `temp-${Date.now()}`, // Temporary ID
          exchange_id: payload.exchange_id,
          uid: payload.uid,
          is_active: payload.is_active || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [...old, newUid];
      });

      return { previousUids };
    },
    onError: (err, payload, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUids) {
        qc.setQueryData(["user-uids"], context.previousUids);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      qc.invalidateQueries({ queryKey: ["user-uids"] });
    },
  });
}

export function useUpdateUserUid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      uid?: string;
      exchange_id?: string;
      is_active?: boolean;
    }) => {
      const res = await fetch("/api/user-uids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update UID");
      return (await res.json()).uid;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["user-uids"] });
      const previousUids = qc.getQueryData(["user-uids"]);

      // Optimistically update the UID
      qc.setQueryData(["user-uids"], (old: any[] = []) => {
        return old.map((uid) => {
          if (uid.id === payload.id) {
            return { ...uid, ...payload, updated_at: new Date().toISOString() };
          }
          // If setting this UID as active, deactivate others for same exchange
          if (
            payload.is_active === true &&
            uid.exchange_id === uid.exchange_id
          ) {
            return {
              ...uid,
              is_active: false,
              updated_at: new Date().toISOString(),
            };
          }
          return uid;
        });
      });

      return { previousUids };
    },
    onError: (err, payload, context) => {
      if (context?.previousUids) {
        qc.setQueryData(["user-uids"], context.previousUids);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["user-uids"] });
    },
  });
}

export function useDeleteUserUid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/user-uids?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete UID");
      return true;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["user-uids"] });
      const previousUids = qc.getQueryData(["user-uids"]);

      // Optimistically remove the UID
      qc.setQueryData(["user-uids"], (old: any[] = []) => {
        return old.filter((uid) => uid.id !== id);
      });

      return { previousUids };
    },
    onError: (err, id, context) => {
      if (context?.previousUids) {
        qc.setQueryData(["user-uids"], context.previousUids);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["user-uids"] });
    },
  });
}
