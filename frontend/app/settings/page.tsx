import { Metadata } from "next";
import { SettingsPage } from "@/components/pages/SettingsPage";

export const metadata: Metadata = {
  title: "Settings | GloryPicks",
  description: "Configure your GloryPicks trading dashboard preferences",
};

export default function Settings() {
  return <SettingsPage />;
}
