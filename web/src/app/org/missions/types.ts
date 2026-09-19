export type MissionStatus =
  | "proposed"
  | "accepted"
  | "refused"
  | "cancelled"
  | "en_route"
  | "in_progress"
  | "completed";

export interface MissionWithNames {
  id: string;
  siteName: string;
  agentName: string;
  scheduledStart: string;
  instructions: string | null;
  status: MissionStatus;
  actualStartAt: string | null;
  isBroadcast: boolean;
}
