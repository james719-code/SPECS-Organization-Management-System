// Interim officers transcribed from the supplied organization roster.
// Set each fileId to the person's Appwrite pictures bucket file ID; leave blank for initials.
export const INTERIM_OFFICERS = [
  {
    "name": "Jay Virgil A. Romero",
    "position": "President",
    "section": "BSCS 4B",
    "fileId": "president"
  },
  {
    "name": "Antonio T. Obias II",
    "position": "Vice President for Internal Affairs",
    "section": "BSCS 2A",
    "fileId": "vice-president-internal"
  },
  {
    "name": "Gil IV Miguel Salvador I. Cea",
    "position": "Vice President for External Affairs",
    "section": "BSCS 4A",
    "fileId": "vice-president-external"
  },
  {
    "name": "Ashley M. Pollero",
    "position": "Executive Secretary",
    "section": "BSCS 2A",
    "fileId": "secretary"
  },
  {
    "name": "Chrisha May U. Guiron",
    "position": "Assistant Secretary",
    "section": "BSCS 1B",
    "fileId": "asst-sec"
  },
  {
    "name": "Kateleen Mae P. Bolocon",
    "position": "Executive Treasurer",
    "section": "BSCS 2A",
    "fileId": "treasurer"
  },
  {
    "name": "Alexa O. Verdejo",
    "position": "Assistant Treasurer",
    "section": "BSCS 1B",
    "fileId": "asst-treasurer"
  },
  {
    "name": "Junvic Andrew C. Almonia",
    "position": "Auditor",
    "section": "BSCS 2A",
    "fileId": "auditor"
  },
  {
    "name": "Faith Anne H. San Buenaventura",
    "position": "P.I.O.",
    "section": "BSCS 1A",
    "fileId": "pio"
  },
  {
    "name": "Lyka P. Barrun",
    "position": "Business Manager",
    "section": "BSCS 1A",
    "fileId": "bussiness-1"
  },
  {
    "name": "Mark Louie F. Bolima",
    "position": "Business Manager",
    "section": "BSCS 1A",
    "fileId": "business-2"
  },
  {
    "name": "Jesabel S. Cea",
    "position": "Sergeant at Arms",
    "section": "BSCS 1B",
    "fileId": "sgt-arms-1"
  },
  {
    "name": "John Carlo Soriao",
    "position": "Sergeant at Arms",
    "section": "BSCS 1A",
    "fileId": "sgt-arms-2"
  },
  {
    "name": "Jay A. Delfino",
    "position": "1A Representative",
    "section": "BSCS 1A",
    "fileId": "rep-1a"
  },
  {
    "name": "Ma. Rodylyn C. Bohayo",
    "position": "1B Representative",
    "section": "BSCS 1B",
    "fileId": "rep-1b"
  },
  {
    "name": "Nica Mae Trono",
    "position": "2A Representative",
    "section": "BSCS 2A",
    "fileId": "rep-2a"
  },
  {
    "name": "Kirby H. Paladan",
    "position": "2B Representative",
    "section": "BSCS 2B",
    "fileId": "rep-2b"
  },
  {
    "name": "Allana Mae B. Estaquio",
    "position": "3A Representative",
    "section": "BSCS 3A",
    "fileId": "rep-3a"
  },
  {
    "name": "Terence Jhon P. Serrano",
    "position": "3B Representative",
    "section": "BSCS 3B",
    "fileId": "rep-3b"
  },
  {
    "name": "Mark Lorence R. Baltazar",
    "position": "4A Representative",
    "section": "BSCS 4A",
    "fileId": "rep-4a"
  },
  {
    "name": "Joan C. Lara",
    "position": "4B Representative",
    "section": "BSCS 4B",
    "fileId": "rep-4b"
  },
  {
    "name": "Eugine Khim R. Talic",
    "position": "Committee in Sports",
    "section": "BSCS 2A",
    "fileId": "sports-1",
    "committee": "Committee in Sports"
  },
  {
    "name": "Mary Kaye B. Sargento",
    "position": "Committee in Sports",
    "section": "BSCS 1A",
    "fileId": "sports-2",
    "committee": "Committee in Sports"
  },
  {
    "name": "Jovert A. Pabon",
    "position": "Public Relations Officer",
    "section": "BSCS 2B",
    "fileId": "pro",
    "committee": "Committee on Publicity and Media"
  },
  {
    "name": "Johann Dane P. Boaquiña",
    "position": "Creative Media Officer",
    "section": "BSCS 2A",
    "fileId": "cmo-1",
    "committee": "Committee on Publicity and Media"
  },
  {
    "name": "Karl Francis Gelo B. Pamada",
    "position": "Creative Media Officer",
    "section": "BSCS 2B",
    "fileId": "cmo-2",
    "committee": "Committee on Publicity and Media"
  },
  {
    "name": "Gian Xyrus P. Pesimo",
    "position": "Documentation Officer",
    "section": "BSCS 1A",
    "fileId": "do-1",
    "committee": "Committee on Publicity and Media"
  },
  {
    "name": "Nicole Q. Dumandan",
    "position": "Documentation Officer",
    "section": "BSCS 2A",
    "fileId": "do-2",
    "committee": "Committee on Publicity and Media"
  }
];

export const SITE_LEADERSHIP = {
  adviser: { name: 'Nicolas A. Pura', position: 'Organization Adviser', fileId: 'adviser' },
  officers: INTERIM_OFFICERS.filter(officer => !officer.committee),
  creativeMedia: INTERIM_OFFICERS.filter(officer => officer.committee),
  developers: [
    { name: 'James Ryan S. Gallego', course: 'BS in Computer Science', year: '4th Year', quote: "It is never too late to be what you might have been", fileId: '' }
  ]
};

export const FAQS = [
  {
    id: 'one',
    question: 'What is SPECS?',
    answer: 'The Society of Programmers and Enthusiasts in Computer Science (SPECS) is the official organization for Computer Science students at the College of Engineering and Computational Sciences. We aim to foster a community of learning, innovation, and collaboration.'
  },
  {
    id: 'two',
    question: 'Who can join SPECS?',
    answer: 'All bona fide students enrolled in the Computer Science program at the College of Engineering and Computational Sciences are automatically members and are encouraged to become active participants in the organization.'
  },
  {
    id: 'three',
    question: 'How can I get updates on events?',
    answer: 'The best way to get updates is to look at our official Facebook page (https://www.facebook.com/parsu.specs) or visit this portal website for the latest announcements, events, and dues information.'
  },
  {
    id: 'four',
    question: 'What kind of events does SPECS organize?',
    answer: 'We organize a variety of events, including coding bootcamps, workshops, programming competitions, hackathons, guest lectures, general assemblies, and student social gatherings.'
  }
];
