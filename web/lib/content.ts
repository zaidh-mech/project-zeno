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
    { title: "Open when the day feels heavy", body: "You do not have to turn today into a good day just because someone tells you to. Some days ask more of us than we have ready to give. You are allowed to be tired. You are allowed to take a little longer.\n\nIf I were beside you right now, I would make room for whatever you needed: a conversation, a distraction, or just company without any questions. Until then, let this be a small pause. Unclench your hands. Take a sip of water. Find somewhere comfortable to sit.\n\nThere is no version of you that has to earn my care by being cheerful all the time. I care about the quiet you, the overwhelmed you, the you who has not figured everything out. We can take the next small step when you are ready." },
    { title: "Open when you miss me", body: "I wish this page could do more than hold words. I wish it could bring you the familiar comfort of sitting next to someone you love, with nothing urgent to say and nowhere else to be.\n\nFor now, imagine me saving a place for you. Tell me something small about your day when you can: what made you smile, what you ate, what song got stuck in your head. I want the ordinary details too. They are part of knowing you.\n\nUntil the next time we are together, I hope you find little reminders that you are loved. This is one of them. Come back to it whenever you need to." },
    { title: "Open when you need a little courage", body: "I cannot promise that everything you try will be easy. But I hope you never mistake being nervous for being incapable. You can care deeply about something and still feel unsure as you begin.\n\nYou do not need to become a different person before you take the first step. Start with what you know. Ask a question. Make the imperfect attempt. Let yourself learn along the way.\n\nWhatever happens, I want to hear about it. I want to celebrate the things that went well and sit with you through the things that did not. My affection is not waiting at a finish line. It is here with you already." },
    { title: "Open before you fall asleep", body: "Let the unfinished things wait for a little while. You have carried this day as far as you can, and you are allowed to set it down.\n\nI hope your room feels peaceful tonight. I hope your thoughts grow quieter, and that tomorrow meets you gently. If your mind keeps replaying everything, try remembering one small thing that felt kind: a warm drink, a good song, a message, a moment of sunlight. Nothing is too small.\n\nThis is my goodnight tucked somewhere you can always find it. Rest well, my love. There will be time for the next page tomorrow." },
    { title: "Open on an ordinary day", body: "This letter has no special occasion. It is for a day that might otherwise pass without a marker.\n\nI like the thought of love making its home in everyday things: checking that you got back safely, remembering what you like, listening to the long version of a story. The small gestures matter to me because they say, again and again, that someone is paying attention.\n\nSo here is a little attention for you today. I am glad you exist. I hope you do one thing just because it makes you happy. Play a game here, reread a memory, or go outside for a few minutes. You do not have to wait for your next birthday to have a lovely moment." },
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
