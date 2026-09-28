const decode = (value: string | undefined, fallback: string) =>
  (value?.trim() || fallback).replace(/\\n/g, "\n");

export type Letter = { title: string; body: string };

function letters(firstLetter: string): Letter[] {
  const configured = process.env.NEXT_PUBLIC_AURA_LETTERS;
  if (configured) {
    try {
      const parsed: unknown = JSON.parse(configured);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((item) =>
        item && typeof item === "object" && typeof item.title === "string" && typeof item.body === "string" && item.title.trim() && item.body.trim()
      )) return parsed.map((item) => ({ title: item.title.trim(), body: decode(item.body, "") }));
    } catch { /* Keep the default letters until valid JSON is provided. */ }
  }
  return [
    { title: "For you", body: firstLetter },
    { title: "The little moments", body: "I keep thinking about the ordinary moments that somehow became my favorites. The way a day feels lighter when we share it. The small things you do without realizing how much they mean to me.\n\nI hope we keep collecting those moments, one day at a time." },
    { title: "Everything still ahead", body: "There are so many stories we haven’t lived yet. New places, familiar places, quiet days and bright ones. Whatever comes, I’m glad I get to find out with you.\n\nHappy birthday, my love. This is only the beginning of all the letters I want to write you." },
  ];
}

const firstLetter = decode(
  process.env.NEXT_PUBLIC_AURA_LETTER,
  "Happy birthday, my love!\n\nI made this little place for you. Thank you for being you. I hope today feels as lovely as you deserve.",
);

export const content = {
  recipient: decode(process.env.NEXT_PUBLIC_AURA_RECIPIENT, "you"),
  petName: decode(process.env.NEXT_PUBLIC_AURA_PET_NAME, "love"),
  sender: decode(process.env.NEXT_PUBLIC_AURA_SENDER, "Your person"),
  letters: letters(firstLetter),
};
