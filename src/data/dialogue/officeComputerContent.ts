/** Content for the "use computer" beat at Danny's own desk — his inbox and
 * the news site he pulls up, both read in-fiction rather than played as
 * DialogueScript lines since the player is meant to click through them
 * themselves. */

export interface ComputerEmail {
  id: string;
  from: string;
  fromAddress: string;
  subject: string;
  date: string;
  body: string[];
  /** A rough colour + one-line caption standing in for a real photo. */
  photo?: { caption: string; gradient: string };
  /** Required reading for the "read your emails" objective. */
  required?: boolean;
}

export const EMAILS: ComputerEmail[] = [
  {
    id: "mom",
    from: "Mom",
    fromAddress: "carol.reyes@fastmail.com",
    subject: "please call me when you get this",
    date: "8:14 AM",
    body: [
      "Danny, I don't know if you're seeing any of this at work but please call me the second you read this.",
      "The news is saying to stay off the roads downtown. Your father wants to drive in and get you but I told him to wait until we hear from you first.",
      "I'm sure it's fine. I just want to hear your voice.",
      "Love you. Call me.",
    ],
    required: true,
  },
  {
    id: "dad",
    from: "Dad",
    fromAddress: "greyes1962@outlook.com",
    subject: "come home when you can, don't wait around",
    date: "8:31 AM",
    body: [
      "Your mother's worried sick so I'll keep this short.",
      "If they send you home early, don't stop at the store on the way, we've got enough here for a few days. Just come straight back.",
      "If the trains stop running, call me and I'll figure something out. Don't try to walk it.",
      "We're fine here. Just get home.",
    ],
    required: true,
  },
  {
    id: "jenna",
    from: "Jenna",
    fromAddress: "jennareyes94@gmail.com",
    subject: "it's here too",
    date: "8:47 AM",
    body: [
      "ok this isn't just a city thing, it's out by us now too. went to grab groceries before work and half the shelves were already gone. attaching a pic, it's insane",
      "some guy in the parking lot was just yelling at nobody. didn't stick around to find out why.",
      "are you okay?? call when you can, not just mom, ME too",
    ],
    photo: { caption: "IMG_0442.jpg — bread aisle, Kroger on 5th", gradient: "linear-gradient(135deg, #3a3a2e, #55523f, #6b6650)" },
    required: true,
  },
  {
    id: "marcus",
    from: "Marcus",
    fromAddress: "marcus.odom@proton.me",
    subject: "you seeing this??",
    date: "9:02 AM",
    body: [
      "bro. BRO.",
      "I was walking to the bus and there's a whole crowd of people just standing in the middle of Fenwick, not moving, not talking. took a picture before I crossed the street to avoid them, look at this",
      "probably nothing. probably just, I don't know, some protest thing. but it did not feel like nothing",
      "text me when you're out of that building",
    ],
    photo: { caption: "IMG_0119.jpg — Fenwick & 3rd, taken from across the street", gradient: "linear-gradient(135deg, #1e2530, #2c3644, #232a35)" },
    required: true,
  },
  {
    id: "hr",
    from: "HR — Company Announcements",
    fromAddress: "no-reply@corp-announce.internal",
    subject: "Updated Remote Work Policy — effective next quarter",
    date: "Yesterday, 4:58 PM",
    body: [
      "Hi all,",
      "As part of our ongoing commitment to flexibility, the updated remote work policy will take effect next quarter. Please review the attached guidelines and complete the acknowledgement form by end of week.",
      "Questions can be directed to your people partner.",
      "Thanks,",
      "HR Team",
    ],
  },
];

export const REQUIRED_EMAIL_IDS = EMAILS.filter((e) => e.required).map((e) => e.id);

export interface NewsArticle {
  headline: string;
  kicker: string;
  byline: string;
  date: string;
  paragraphs: string[];
  sidebar: string[];
}

export const NEWS_ARTICLE: NewsArticle = {
  kicker: "BREAKING — CITYWIDE",
  headline: "Officials Urge Residents to \"Shelter in Place\" as Reports of Violent Incidents Spread",
  byline: "By the City Desk",
  date: "Updated 11 minutes ago",
  paragraphs: [
    "Emergency officials issued an updated shelter-in-place advisory this morning after a string of unconfirmed but increasingly widespread reports of violent public incidents across at least four districts.",
    "Hospitals in the downtown corridor say they are seeing an unusual volume of bite-related trauma cases, though a spokesperson would not confirm the cause, citing an ongoing investigation. Two urgent care clinics have stopped accepting new patients.",
    "Public transit authorities have suspended several bus routes \"out of an abundance of caution,\" and at least one train line has reported delays of over two hours with no updated timeline.",
    "Residents are advised to remain indoors, avoid crowds, and check on family members. Officials have not yet provided a timeline for when normal operations are expected to resume.",
    "This is a developing story and will be updated as more information becomes available.",
  ],
  sidebar: ["Transit authority suspends Routes 4, 9, 12", "Hospitals report unusual patient volume downtown", "School district cancels afternoon activities", "Mayor's office: press conference \"expected later today\""],
};
