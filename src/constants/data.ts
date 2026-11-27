import { NewsItem, GalleryItem, PortalRole } from '../types';

export const SCHOOL_INFO = {
  name: 'Father Abraham Children Academy',
  shortName: 'FACA',
  tagline: 'Building Bright Futures, One Child at a Time',
  levels: 'CRECHE | PRIMARY | SECONDARY',
};

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: '1',
    title: 'Annual Science & Technology Innovation Fair 2026',
    excerpt: 'Secondary students showcase groundbreaking robotics, renewable energy models, and coding projects.',
    content: 'Our annual Science and Technology Fair brought together brilliant minds from the Junior and Senior Secondary sections. Students demonstrated exceptional creativity through functional prototypes, AI-assisted tools, and sustainable agricultural solutions. Parents and guest judges commended the depth of research and practical problem-solving skills displayed.',
    date: 'March 24, 2026',
    category: 'Academic',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    author: 'Dr. E. Okafor (Head of Science)'
  },
  {
    id: '2',
    title: 'Inter-House Sports Competition: Blue House Claims Victory',
    excerpt: 'A thrilling day of track and field events, teamwork, and sportsmanship across all school levels.',
    content: 'The school sports complex was a sea of colour and excitement as Blue House emerged overall champions in our 2026 Inter-House Sports. From the nursery egg-and-spoon race to the secondary 4x400m relay, pupils and students displayed remarkable athletic prowess and camaraderie.',
    date: 'February 15, 2026',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?auto=format&fit=crop&w=800&q=80',
    author: 'Sports Directorate'
  },
  {
    id: '3',
    title: 'Cultural Heritage Day: Celebrating Nigerian Diversity',
    excerpt: 'Pupils and students dressed in vibrant traditional attire to celebrate our rich cultural heritage.',
    content: 'Father Abraham Children Academy came alive with traditional music, dance displays, indigenous food exhibitions, and historical drama presentations. Cultural Heritage Day instills deep pride, unity, and appreciation for our diverse roots among the younger generation.',
    date: 'January 28, 2026',
    category: 'Events',
    image: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=800&q=80',
    author: 'Cultural Committee'
  },
  {
    id: '4',
    title: 'Admissions Open for 2026/2027 Academic Session',
    excerpt: 'Applications are now invited from qualified candidates for Creche, Primary, and Secondary sections.',
    content: 'We welcome prospective parents to apply for admission into our esteemed institution for the upcoming academic session. Entrance assessment dates and tour schedules are available through our admissions portal and front desk office.',
    date: 'January 10, 2026',
    category: 'Admissions',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
    author: 'Admissions Office'
  }
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'g1',
    title: 'Modern ICT Laboratory',
    category: 'Campus',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
    description: 'Equipped with high-speed internet and modern computers for digital literacy.'
  },
  {
    id: 'g2',
    title: 'Interactive Creche Play & Learning Center',
    category: 'Creche',
    image: 'https://images.unsplash.com/photo-1587653969292-0945a0b5f850?auto=format&fit=crop&w=800&q=80',
    description: 'Safe, stimulating, and cozy environment for early childhood care.'
  },
  {
    id: 'g3',
    title: 'Physics & Chemistry Laboratory',
    category: 'Campus',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
    description: 'State-of-the-art apparatus for hands-on scientific experimentation.'
  },
  {
    id: 'g4',
    title: 'Primary Classroom Session',
    category: 'Classrooms',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
    description: 'Engaging, student-centered learning with multimedia instructional tools.'
  },
  {
    id: 'g5',
    title: 'Football & Athletics Field',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    description: 'Spacious grounds for football, track events, and outdoor recreation.'
  },
  {
    id: 'g6',
    title: 'Cultural Dance Troupe Performance',
    category: 'Cultural',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    description: 'Nurturing talents in performing arts, music, and traditional dance.'
  }
];

export const PORTAL_ROLES: PortalRole[] = [
  {
    id: 'admin',
    title: 'Administrator',
    subtitle: 'School Leadership & Management',
    description: 'Manage staff accounts, curriculum oversight, school analytics, admissions approval, and institutional policies.',
    iconName: 'ShieldCheck',
    features: ['Staff & Student Records', 'Academic Calendar Management', 'Financial Oversight', 'Admission Approvals'],
    color: 'bg-[#102B46]'
  },
  {
    id: 'teacher',
    title: 'Teacher / Caregiver',
    subtitle: 'Academic & Pastoral Instruction',
    description: 'Input continuous assessment scores, attendance tracking, lesson planning, and student progress reports.',
    iconName: 'GraduationCap',
    features: ['Gradebook & C.A. Entry', 'Attendance Register', 'Lesson Plans', 'Parent-Teacher Messaging'],
    color: 'bg-[#091C30]'
  },
  {
    id: 'student',
    title: 'Student Portal',
    subtitle: 'Learning & Assignment Center',
    description: 'Access digital assignments, timetable, e-library resources, report cards, and interactive quizzes.',
    iconName: 'BookOpen',
    features: ['Homework & Assignments', 'Exam Timetable', 'Termly Report Cards', 'Digital Library Access'],
    color: 'bg-[#1e3a8a]'
  },
  {
    id: 'parent',
    title: 'Parent / Guardian',
    subtitle: 'Child Progress & Fee Tracker',
    description: 'Monitor your children’s academic performance, attendance, fee payment history, and school notices.',
    iconName: 'Users',
    features: ['Ward Performance Tracking', 'Fee Payment Receipts', 'School Circulars & Events', 'Direct Teacher Chat'],
    color: 'bg-[#b45309]'
  },
  {
    id: 'bursar',
    title: 'Bursar / Finance',
    subtitle: 'Fee Processing & Accounts',
    description: 'Manage tuition invoicing, payment verification, payroll records, and financial statement reports.',
    iconName: 'CreditCard',
    features: ['Fee Invoicing & Verification', 'Payment Reconciliation', 'Expense Tracking', 'Financial Auditing Reports'],
    color: 'bg-[#15803d]'
  }
];

export const FAQS = [
  {
    question: 'What are the school operating hours?',
    answer: 'The school gates open at 7:00 AM. Classes commence promptly at 7:30 AM and close at 3:00 PM for primary/secondary, and 2:00 PM for creche. Extracurricular activities run until 4:00 PM.'
  },
  {
    question: 'What is the teacher-to-student ratio?',
    answer: 'We maintain an optimal ratio of 1:12 for Creche, 1:18 for Primary, and 1:20 for Secondary to ensure personalized attention and effective mentorship.'
  },
  {
    question: 'How do I apply for admission?',
    answer: 'You can begin by filling out our online Enquiry/Application form on the Admissions page or visit our campus for a physical registration form. Our admissions officers will guide you through the entrance assessment schedule.'
  },
  {
    question: 'Are boarding facilities available?',
    answer: 'Currently, Father Abraham Children Academy operates as a world-class day school with robust transport services covering major residential routes within the city.'
  },
  {
    question: 'What curriculum does the academy follow?',
    answer: 'We operate an integrated curriculum combining the Nigerian National Curriculum with robust British educational standards, emphasizing practical STEM, critical thinking, and moral uprightness.'
  }
];
