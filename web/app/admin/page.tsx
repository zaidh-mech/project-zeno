import Link from "next/link";
import MemoryGallery from "@/components/MemoryGallery";

export default function GalleryAdmin() {
  return <main className="universe"><div className="portal">
    <header className="topline"><span className="brand">Aura · Gallery admin</span><Link href="/">View birthday page</Link></header>
    <MemoryGallery admin />
  </div></main>;
}
