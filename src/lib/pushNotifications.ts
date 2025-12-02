import { supabase } from "@/integrations/supabase/client";

interface SendPushParams {
  recipientId: string;
  type: "image" | "note";
  content?: string;
  imageUrl?: string;
  fromName?: string;
}

export async function sendPushNotification(params: SendPushParams) {
  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error("No active session for sending push notification");
      return;
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: {
        recipientId: params.recipientId,
        type: params.type,
        content: params.content || "",
        imageUrl: params.imageUrl || "",
        fromName: params.fromName || "Someone",
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      console.error("Error sending push notification:", error);
      return;
    }

    console.log("Push notification sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
}

// Helper to get all friends who should receive the notification
export async function getNotificationRecipients(userId: string): Promise<string[]> {
  try {
    // Get all accepted friend connections
    const { data: connections, error } = await supabase
      .from("friend_connections")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) {
      console.error("Error fetching friend connections:", error);
      return [];
    }

    // Extract friend IDs (the other person in each connection)
    const friendIds = connections.map((conn) =>
      conn.requester_id === userId ? conn.addressee_id : conn.requester_id
    );

    return friendIds;
  } catch (error) {
    console.error("Failed to get notification recipients:", error);
    return [];
  }
}
