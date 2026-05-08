import ShowsView from "@/components/ShowsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sedang Ditonton - WatchMe.log",
  description: "Pantau progres episode dari serial yang sedang kamu tonton.",
};

export default function WatchingPage() {
  return <ShowsView type="watching" />;
}
