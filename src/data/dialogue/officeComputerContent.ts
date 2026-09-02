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
  /** Which hand-drawn pixel-art photo (see emailArt.ts) this attachment shows. */
  photo?: { caption: string; art: "shelves" | "crowd" };
  /** Required reading for the "read your emails" objective. */
  required?: boolean;
}

export const EMAILS: ComputerEmail[] = [
  {
    id: "mum",
    from: "Mum",
    fromAddress: "carol.reyes@fastmail.com",
    subject: "please call me when you get this",
    date: "8:14 AM",
    body: [
      "Danny, I don't know if you're seeing any of this at work but please call me the second you read this.",
      "The news is saying to stay off the roads into the city centre. Your father wants to drive in and get you but I told him to wait until we hear from you first.",
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
      "If they send you home early, don't stop at the shop on the way, we've got enough here for a few days. Just come straight back.",
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
      "ok this isn't just a city thing, it's out by us now too. went to grab a few bits before work and half the shelves were already gone. attaching a pic, it's insane",
      "some bloke in the car park was just shouting at nobody. didn't stick around to find out why.",
      "are you okay?? call when you can, not just mum, ME too",
    ],
    photo: { caption: "IMG_0442.jpg — bread aisle, Tesco on the high street", art: "shelves" },
    required: true,
  },
  {
    id: "marcus",
    from: "Marcus",
    fromAddress: "marcus.odom@proton.me",
    subject: "you seeing this??",
    date: "9:02 AM",
    body: [
      "mate. MATE.",
      "I was walking to the bus stop and there's a whole crowd of people just standing in the middle of Fenwick Street, not moving, not talking. took a picture before I crossed the road to avoid them, look at this",
      "probably nothing. probably just, I don't know, some protest thing. but it did not feel like nothing",
      "text me when you're out of that building",
    ],
    photo: { caption: "IMG_0119.jpg — Fenwick St, taken from across the road", art: "crowd" },
    required: true,
  },
  {
    id: "hr",
    from: "HR — Company Announcements",
    fromAddress: "no-reply@corp-announce.internal",
    subject: "Updated Flexible Working Policy — effective next quarter",
    date: "Yesterday, 4:58 PM",
    body: [
      "Hi all,",
      "As part of our ongoing commitment to flexibility, the updated flexible working policy will take effect next quarter. Please review the attached guidelines and complete the acknowledgement form by end of week.",
      "Questions can be directed to your people partner.",
      "Thanks,",
      "HR Team",
    ],
  },
  {
    id: "calendar",
    from: "Calendar",
    fromAddress: "calendar@corp-announce.internal",
    subject: "Reminder: Team catch-up moved to 2pm",
    date: "Yesterday, 9:00 AM",
    body: [
      "This is an automated reminder.",
      "\"Weekly team catch-up\" has been moved from 11:00am to 2:00pm today at the organiser's request.",
      "Location: Meeting Room A",
      "This event will not send further reminders.",
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
  kicker: "BREAKING NEWS",
  headline: "Residents Told to Stay Indoors Amid Growing Reports of Violent Incidents",
  byline: "By our Home Affairs Correspondent",
  date: "Last updated 11 minutes ago",
  paragraphs: [
    "Emergency services have issued an updated advisory urging residents to stay indoors, after a string of unconfirmed but increasingly widespread reports of violent incidents in public places across at least four areas of the city.",
    "Hospitals in the city centre say they are seeing an unusual volume of bite-related injuries, though a spokesperson would not confirm the cause, citing an ongoing investigation. Two walk-in centres have stopped accepting new patients.",
    "Local transport operators have suspended several bus routes \"as a precaution\", and at least one rail line has reported delays of over two hours with no updated timeline.",
    "Residents are advised to remain indoors, avoid crowds, and check on family members. Officials have not yet given a timeline for when normal services are expected to resume.",
    "This is a developing story and will be updated as more information becomes available.",
  ],
  sidebar: [
    "Bus routes 4, 9 and 12 suspended \"as a precaution\"",
    "Hospitals report unusual patient volume in city centre",
    "Local schools cancel afternoon activities",
    "Council: press conference \"expected later today\"",
  ],
};
