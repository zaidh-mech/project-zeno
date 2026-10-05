#!/usr/bin/env python3
"""
Imports photos from assets/photos, optimizes them to web dimensions,
populates web/.gallery-data/album.json and creates assets/photos/stories.json.
"""

import os
import sys
import json
import uuid
import base64
import io
from pathlib import Path
from PIL import Image, ImageOps, ExifTags

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = PROJECT_ROOT / "assets" / "photos"
STORIES_FILE = ASSETS_DIR / "stories.json"
GALLERY_DATA_DIR = PROJECT_ROOT / "web" / ".gallery-data"
DESKTOP_GALLERY_DIR = Path("C:/Users/User/Desktop/project-zeno/web/.gallery-data")

PROMPTS = [
    "Where our story began",
    "A day I wish we could replay",
    "The little things about us",
    "Somewhere, with you",
    "A moment that felt like home",
    "Another memory to keep",
    "A smile worth remembering",
    "Just you and me",
    "Our favorite kind of afternoon"
]

def get_exif_date(im):
    try:
        exif = im.getexif()
        if not exif:
            return None
        for tag_id, val in exif.items():
            tag = ExifTags.TAGS.get(tag_id, tag_id)
            if "DateTimeOriginal" in str(tag) or "DateTime" in str(tag):
                return str(val)
    except Exception:
        pass
    return None

def process_photos():
    if not ASSETS_DIR.exists():
        print(f"Error: {ASSETS_DIR} not found.")
        sys.exit(1)

    image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    photo_files = sorted([
        f for f in os.listdir(ASSETS_DIR)
        if Path(f).suffix.lower() in image_extensions
    ])

    print(f"Found {len(photo_files)} photos in {ASSETS_DIR}")

    # Load existing stories if available
    stories_map = {}
    if STORIES_FILE.exists():
        try:
            with open(STORIES_FILE, "r", encoding="utf-8") as f:
                existing_entries = json.load(f)
                for entry in existing_entries:
                    if "file" in entry:
                        stories_map[entry["file"]] = entry
            print(f"Loaded existing stories for {len(stories_map)} files from {STORIES_FILE}")
        except Exception as e:
            print(f"Warning: could not parse {STORIES_FILE}: {e}")

    GALLERY_DATA_DIR.mkdir(parents=True, exist_ok=True)
    if DESKTOP_GALLERY_DIR.parent.exists():
        DESKTOP_GALLERY_DIR.mkdir(parents=True, exist_ok=True)

    album_entries = []
    base64_memories = []
    stories_output = []

    total_optimized_bytes = 0

    for idx, filename in enumerate(photo_files):
        src_path = ASSETS_DIR / filename
        existing = stories_map.get(filename, {})

        try:
            with Image.open(src_path) as im:
                im = ImageOps.exif_transpose(im)
                exif_date = get_exif_date(im)

                # Convert to RGB if needed (e.g. RGBA or P)
                if im.mode not in ("RGB", "L"):
                    im = im.convert("RGB")

                # Downscale if larger than 1400x1400
                max_dim = 1400
                if im.width > max_dim or im.height > max_dim:
                    im.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=85, optimize=True)
                jpeg_data = buf.getvalue()
                total_optimized_bytes += len(jpeg_data)

        except Exception as e:
            print(f"Error processing {filename}: {e}")
            continue

        # Memory IDs
        memory_id = existing.get("id") or str(uuid.uuid4())
        photo_uuid = str(uuid.uuid4())

        caption = existing.get("caption") or PROMPTS[idx % len(PROMPTS)]
        story = existing.get("story") or ""

        # Write photo file to web/.gallery-data/
        photo_path = GALLERY_DATA_DIR / photo_uuid
        with open(photo_path, "wb") as f:
            f.write(jpeg_data)

        if DESKTOP_GALLERY_DIR.exists():
            desktop_photo_path = DESKTOP_GALLERY_DIR / photo_uuid
            with open(desktop_photo_path, "wb") as f:
                f.write(jpeg_data)

        album_entries.append({
            "id": memory_id,
            "caption": caption,
            "story": story,
            "photo": photo_uuid,
            "mime": "image/jpeg"
        })

        b64_str = base64.b64encode(jpeg_data).decode("ascii")
        base64_memories.append({
            "id": memory_id,
            "caption": caption,
            "story": story,
            "photo": f"data:image/jpeg;base64,{b64_str}"
        })

        stories_output.append({
            "file": filename,
            "caption": caption,
            "story": story,
            "date": exif_date or ""
        })

    # Save web/.gallery-data/album.json
    album_json_path = GALLERY_DATA_DIR / "album.json"
    with open(album_json_path, "w", encoding="utf-8") as f:
        json.dump(album_entries, f, indent=2)

    if DESKTOP_GALLERY_DIR.exists():
        with open(DESKTOP_GALLERY_DIR / "album.json", "w", encoding="utf-8") as f:
            json.dump(album_entries, f, indent=2)

    # Save base64 memories for encryption script
    b64_memories_path = GALLERY_DATA_DIR / "memories_base64.json"
    with open(b64_memories_path, "w", encoding="utf-8") as f:
        json.dump(base64_memories, f)

    # Save stories.json template
    with open(STORIES_FILE, "w", encoding="utf-8") as f:
        json.dump(stories_output, f, indent=2, ensure_ascii=False)

    # Also save stories.json to desktop assets if it exists
    desktop_stories_file = Path("C:/Users/User/Desktop/project-zeno/assets/photos/stories.json")
    if desktop_stories_file.parent.exists():
        with open(desktop_stories_file, "w", encoding="utf-8") as f:
            json.dump(stories_output, f, indent=2, ensure_ascii=False)

    print(f"Successfully processed {len(album_entries)} photos.")
    print(f"Total optimized image size: {total_optimized_bytes / (1024 * 1024):.2f} MB")
    print(f"Wrote album database: {album_json_path}")
    print(f"Wrote stories manifest: {STORIES_FILE}")

if __name__ == "__main__":
    process_photos()
