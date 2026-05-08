import ShowsView from "@/components/ShowsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sudah Ditonton - WatchMe.log",
  description: "Koleksi film dan serial TV yang telah kamu selesaikan.",
};

export default function WatchedPage() {
  return <ShowsView type="watched" />;
}
