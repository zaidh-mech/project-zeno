import Link from "next/link";
import MemoryGallery from "@/components/MemoryGallery";
import OnlineGalleryAdmin from "@/components/OnlineGalleryAdmin";

export default function GalleryAdmin() {
  return <main className="universe admin-page"><div className="portal">
    <header className="topline"><span className="brand">Aura · Gallery admin</span><Link href="/">View birthday page</Link></header>
    {process.env.NEXT_PUBLIC_GALLERY_STATIC === "true" ? <OnlineGalleryAdmin /> : <MemoryGallery admin />}
  </div></main>;
}
