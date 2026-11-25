// The personal share key the iPhone Shortcut uses to add things to the Clipboard. The plain key
// is shown once when made (only its hash is stored); making a new one turns the old one off.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./auth";

export const shareKeyAvailable = !env.demo;
/** Where the Shortcut sends things. */
export const shareInUrl = `${env.supabaseUrl}/functions/v1/share-in`;

export function useShareKey() {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ["share-key", userId];
  const status = useQuery({
    queryKey: key,
    enabled: shareKeyAvailable && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("share_tokens").select("created_at, last_used_at").maybeSingle();
      if (error) throw error;
      return data as { created_at: string; last_used_at: string | null } | null;
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_share_token");
      if (error) throw error;
      return data as string;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const revoke = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("revoke_share_token");
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { status: status.data, loading: status.isLoading, create, revoke };
}
