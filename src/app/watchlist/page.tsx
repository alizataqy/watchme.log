import ShowsView from "@/components/ShowsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Tunggu - WatchMe.log",
  description: "Daftar film dan serial TV yang ingin kamu tonton nanti.",
};

export default function WatchlistPage() {
  return <ShowsView type="watchlist" />;
}
