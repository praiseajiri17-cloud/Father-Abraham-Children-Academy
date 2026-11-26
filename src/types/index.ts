export type EducationLevel = 'creche' | 'primary' | 'secondary';

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: 'Academic' | 'Sports' | 'Events' | 'Admissions';
  image: string;
  author: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Campus' | 'Classrooms' | 'Sports' | 'Cultural' | 'Creche';
  image: string;
  description: string;
}

export interface AdmissionFormValues {
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childDob: string;
  level: EducationLevel;
  previousSchool?: string;
  message: string;
}

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface PortalRole {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  features: string[];
  color: string;
}
