export type SubjectType =
  | 'Anglais'
  | 'Français'
  | 'Mathématiques'
  | 'Sciences Naturelles'
  | 'Physique'
  | 'Arabe'
  | 'Histoire-Géographie';

export type LevelType = '1AM' | '2AM' | '3AM' | '4AM';

export type LanguageType = 'fr' | 'ar' | 'en';

export type DocType = 'cours' | 'fiche' | 'examen' | 'devoir' | 'exercice';

export type TrimesterType = 'T1' | 'T2' | 'T3' | 'BEM';

export type HandwritingMode = 'standard' | 'handwriting_print' | 'handwriting_cursive';

export type PaperStyle = 'white' | 'seyes' | 'lined' | 'grid';

export type InkColor = 'navy' | 'black' | 'emerald';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  schoolName?: string;
  wilaya?: string;
  defaultSubject?: SubjectType;
  licenseCode?: string;
  licensePlan?: string;
  licenseExpiresAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PedagogicDocument {
  id: string;
  ownerId: string;
  title: string;
  docType: DocType;
  subject: SubjectType;
  level: LevelType;
  language: LanguageType;
  trimester: TrimesterType;
  handwritingMode: HandwritingMode;
  paperStyle: PaperStyle;
  inkColor: InkColor;
  contentMarkdown: string;
  svgDiagram?: string;
  priceDzd: number;
  isPaidTemplate: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type CorrespondentRole =
  | 'Collègue CEM'
  | "Parent d'élève"
  | 'Élève Soutien'
  | 'Établissement';

export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface Correspondent {
  id: string;
  ownerId: string;
  fullName: string;
  roleType: CorrespondentRole;
  email?: string;
  phone?: string;
  wilaya?: string;
  subjectFocus?: string;
  levelFocus: LevelType | 'Tous niveaux';
  planName: string;
  balanceDueDzd: number;
  totalPaidDzd: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  ownerId: string;
  correspondentId: string;
  correspondentName: string;
  documentId?: string;
  documentTitle: string;
  amountDzd: number;
  status: InvoiceStatus;
  dueDate?: string;
  aiMessageDraft?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CurriculumTopic {
  id: string;
  trimester: TrimesterType;
  title: string;
  competency: string;
  keyPoints: string[];
}
