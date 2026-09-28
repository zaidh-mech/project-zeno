const decode = (value: string | undefined, fallback: string) =>
  (value?.trim() || fallback).replace(/\\n/g, "\n");

export const content = {
  recipient: decode(process.env.NEXT_PUBLIC_AURA_RECIPIENT, "you"),
  petName: decode(process.env.NEXT_PUBLIC_AURA_PET_NAME, "love"),
  sender: decode(process.env.NEXT_PUBLIC_AURA_SENDER, "Your person"),
  letter: decode(
    process.env.NEXT_PUBLIC_AURA_LETTER,
    "Happy birthday, my love!\n\nI made this little place for you. Thank you for being you. I hope today feels as lovely as you deserve.",
  ),
};
