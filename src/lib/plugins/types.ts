export type PluginSnapshot = {
  manifest: null | { id: string; name: string; version: string };
  enabled: boolean;
  revision: number;
  data: any;
  reminderStatus: string;
  mobile: boolean;
};
