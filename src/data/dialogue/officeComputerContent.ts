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

/** My Documents — a bit of lore rather than a dead end: the odds and ends anyone's desktop actually accumulates. */
export interface DesktopDocument {
  id: string;
  name: string;
  modified: string;
  body: string[];
}

export const DOCUMENTS: DesktopDocument[] = [
  {
    id: "cv",
    name: "CV_Danny_Reyes_FINAL_v3.docx",
    modified: "3 months ago",
    body: [
      "Danny Reyes",
      "Objective: seeking a role offering genuine growth opportunities and a healthy work-life balance.",
      "(Never actually sent anywhere. Still saved here, just in case.)",
    ],
  },
  {
    id: "flatshare",
    name: "flatshare rules (do not lose).txt",
    modified: "8 months ago",
    body: [
      "1. Bins go out Tuesday night, not Wednesday morning. We've been over this, Jenna.",
      "2. Whoever finishes the milk buys the milk. No exceptions.",
      "3. We are not getting a cat.",
      "(Update, six weeks later: we have a cat.)",
    ],
  },
  {
    id: "expenses",
    name: "expenses_march.xlsx",
    modified: "2 weeks ago",
    body: [
      "Train ticket — £14.20",
      "Lunch (client meeting that got cancelled — ate the sandwich anyway) — £4.50",
      "Status: Pending approval.",
      "Status, two weeks later: still pending approval.",
    ],
  },
  {
    id: "notes",
    name: "meeting notes — do not delete.txt",
    modified: "Yesterday",
    body: [
      "- follow up with Priya re: Q3 numbers",
      "- find out if Ben's deadline is real or if he's just saying that",
      "- birthday card for Sam, everyone chip in a fiver",
      "- ask Mark if he's actually read the report or just carrying it around",
    ],
  },
];

/** Photos — Danny's own camera roll, not evidence photos like the email attachments. */
export interface PersonalPhoto {
  id: string;
  name: string;
  caption: string;
  art: "leavingdo" | "cat";
}

export const PERSONAL_PHOTOS: PersonalPhoto[] = [
  { id: "leavingdo", name: "IMG_0301.jpg", caption: "Sam's leaving do. The good pub, not the one by the station.", art: "leavingdo" },
  { id: "cat", name: "IMG_0355.jpg", caption: "The cat. Profoundly unbothered, as ever.", art: "cat" },
];

/** Company Portal — the one place this game gets to be openly funny: a boss who does not want anyone leaving, dressed up as "culture." */
export const PORTAL_ANNOUNCEMENT = {
  from: "Gary Instone — Regional Director",
  headline: "A Message From Gary: We're Like a Family Here",
  body: [
    "Morning team!",
    "Reaching out personally (via the Portal — my door is always open, metaphorically, the actual door sticks) to say: this is a WORKPLACE FAMILY, and families don't just leave each other.",
    "I've noticed a few of you have been \"checking the news\" this morning. Totally understand! But worth remembering we've still got the Q3 numbers due — and nothing says team spirit like pushing through a tricky morning together.",
    "Anyway. Chin up! Nobody's going anywhere. Ha. Anyway.",
    "— Gary",
  ],
};

export interface PortalTile {
  id: string;
  label: string;
  message: string;
}

export const PORTAL_TILES: PortalTile[] = [
  {
    id: "wellness",
    label: "Wellness Hub",
    message: "Feeling stressed? Try our 4-minute guided breathing exercise, recorded by Gary personally.\n\n(Recording currently unavailable. Please try again during your unpaid lunch break.)",
  },
  {
    id: "retention",
    label: "Employee Pulse Survey",
    message: "\"On a scale of 1-10, how likely are you to still be here this time next year?\"\n\nYour answer has been recorded and shared with your line manager. Thanks for your honesty!",
  },
  {
    id: "exit",
    label: "Exit Interview Scheduler",
    message: "This page is temporarily unavailable while we review team resourcing.\n\nPlease speak to Gary directly. Gary would like that.",
  },
  {
    id: "fun",
    label: "Team Fun Corner",
    message: "Friday is BAKE-OFF FRIDAY! (Mandatory. Unpaid. Bring your own ingredients.)\n\nGary's banana bread will not be judged this week, following \"the incident.\"",
  },
];

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
