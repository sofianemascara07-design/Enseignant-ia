import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ActiveDraft, AtelierView } from './components/AtelierView';
import { CorrespondentsView } from './components/CorrespondentsView';
import { CurriculumView } from './components/CurriculumView';
import { SheetHeaderConfig } from './components/DocumentSheet';
import { FlashcardsView } from './components/FlashcardsView';
import { LibraryView } from './components/LibraryView';
import { OfflineIndicator, PWAInstallAndShareControl } from './components/PWAInstallButton';
import { buildSubjectStarterContent } from './data/algerianCurriculum';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  Correspondent,
  Invoice,
  LevelType,
  PedagogicDocument,
  SubjectType,
  TrimesterType,
} from './types';

type AppTab = 'atelier' | 'flashcards' | 'library' | 'correspondents' | 'curriculum';

const MAX_FREE_TRIALS = 2;
const WHATSAPP_NUMBER_DISPLAY = '05 57 76 78 04';
const WHATSAPP_E164 = '213557767804';
const LICENSE_STORAGE_KEY = 'madrassati_license_v1';
const TRIALS_STORAGE_KEY = 'madrassati_trials_v1';

const STARTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 260" width="600" height="260">
  <rect width="600" height="260" fill="#ffffff" />
  <polygon points="120,220 120,50 440,220" fill="#ecfdf5" stroke="#047857" stroke-width="2.5" />
  <polyline points="120,200 140,200 140,220" fill="none" stroke="#0f172a" stroke-width="2" />
  <line x1="120" y1="135" x2="280" y2="135" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="6,4" />
  <text x="102" y="44" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">A</text>
  <text x="102" y="236" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">B</text>
  <text x="448" y="232" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">C</text>
  <text x="98" y="140" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1d4ed8">M</text>
  <text x="286" y="128" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1d4ed8">N</text>
  <text x="200" y="154" font-family="sans-serif" font-size="13" fill="#1d4ed8">(MN) // (BC)</text>
</svg>`;

const INITIAL_DRAFT: ActiveDraft = {
  title: 'اختبار الفصل الأول في مادة الرياضيات — السنة الرابعة متوسط',
  docType: 'examen',
  subject: 'Mathématiques',
  level: '4AM',
  language: 'ar',
  trimester: 'T1',
  handwritingMode: 'standard',
  paperStyle: 'white',
  inkColor: 'black',
  svgDiagram: STARTER_SVG,
  attachedImageUrl: '',
  priceDzd: 300,
  isPaidTemplate: false,
  contentMarkdown: `## التمرين الأول: الحساب العددي و PGCD (06 نقاط)

1. اختر الإجابة الصحيحة بوضع علامة (×) في الخانة المناسبة: **(02 نقاط)**
   - أ) القاسم المشترك الأكبر للعددين 420 و 252 هو: ☐ 42  ☐ 84  ☐ 126  ☐ 21
   - ب) الكتابة المبسطة للعبارة √75 هي: ☐ 5√3  ☐ 3√5  ☐ 25√3  ☐ 15

2. أكمل الجدول الآتي بعد التبسيط: **(04 نقاط)**

| العبارة | الكتابة على الشكل a√3 | القيمة المقربة إلى 0,01 |
| :--- | :---: | :---: |
| A = √75 − 2√12 + √27 | .................. | .................. |
| B = (√3 + 2)² − 4√3 | .................. | .................. |

## التمرين الثاني: الهندسة — مبرهنة طالس والنسب المثلثية (06 نقاط)

**ABC** مثلث قائم في **B** حيث **AB = 6 cm** و **BC = 8 cm** (انظر الشكل المقابل).
1. احسب الطول **AC** بتطبيق خاصية فيتاغورس. **(02 نقاط)**
2. نعيّن **M** من **[AB]** حيث **AM = 3 cm** و **(MN) // (BC)**. احسب **AN** و **MN**. **(02 نقاط)**
3. احسب قيس الزاوية **ACB** ثم أعط مدوّره إلى الوحدة من الدرجة. **(02 نقاط)**

## الوضعية الإدماجية: تهيئة ممر مائل بالمؤسسة (08 نقاط)

ترغب متوسطة في تهيئة ممر مائل (منحدر) لتسهيل ولوج التلاميذ أمام الجناح الإداري.
- **السند 1:** ارتفاع العتبة هو **0,90 m** والزاوية التي يصنعها الممر مع الأرض الأفقية هي **8°**.
- **السند 2:** تكلفة المتر الطولي الواحد لإنجاز الحاجز الواقي هي **1 800 DA**.

| المشتريات / الأشغال | الكمية / الطول | سعر الوحدة (DA) |
| :--- | :---: | :---: |
| حواجز معدنية | 6,5 m | 1 800 |
| بلاط مانع للانزلاق | 12 m² | 950 |

**التعليمات:**
1. احسب طول الممر المائل مدوّراً إلى **0,01 m** باستعمال النسب المثلثية (**sin 8° ≈ 0,139**). **(03 نقاط)**
2. احسب التكلفة الإجمالية لإنجاز هذا الممر المائل. **(03 نقاط)**
3. قدّم نصيحة وجيزة في سطرين حول أهمية احترام معايير السلامة في المؤسسات التربوية. **(02 نقاط)**

[[CORRECTION_PAGE]]

## التصحيح النموذجي وسلّم التنقيط (20 / 20)

| التمرين / السؤال | عناصر الإجابة النموذجية | العلامة |
| :--- | :--- | :---: |
| التمرين 1 (1) | أ) ☐ 84 · ب) ☐ 5√3 | 02 ن |
| التمرين 1 (2) | A = 5√3 − 4√3 + 3√3 = **4√3** ؛ B = **7** | 04 ن |
| التمرين 2 (1-3) | AC = **10 cm** ؛ AN = **5 cm** ؛ MN = **4 cm** ؛ ACB ≈ **37°** | 06 ن |
| الوضعية الإدماجية | طول الممر = 0,90 / sin 8° ≈ **6,47 m** ؛ التكلفة = **23 100 DA** | 08 ن |`,
};

function makeSafeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface StoredLicense {
  code: string;
  plan: string;
  expiresAt: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('atelier');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<PedagogicDocument[]>([]);
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [draft, setDraft] = useState<ActiveDraft>(INITIAL_DRAFT);
  const [schoolName, setSchoolName] = useState('متوسطة الخوارزمي');
  const [headerConfig, setHeaderConfig] = useState<SheetHeaderConfig>({
    wilayaDirectorate: 'الجزائر شرق',
    schoolYear: '2026/2027',
    durationMinutes: 120,
    showStudentBox: true,
    separateCorrectionPage: true,
    answerSpaceMode: false,
    closingPhrase: 'انتهى — بالتوفيق',
  });

  // License & CCP/WhatsApp Payment Lock State
  const [licenseInfo, setLicenseInfo] = useState<StoredLicense | null>(() => {
    try {
      const saved = localStorage.getItem(LICENSE_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as StoredLicense) : null;
    } catch {
      return null;
    }
  });
  const [trialsUsed, setTrialsUsed] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(TRIALS_STORAGE_KEY) || '0') || 0;
    } catch {
      return 0;
    }
  });
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [selectedPlanOption, setSelectedPlanOption] = useState<'MENSUEL' | 'TRIMESTRE' | 'ANNUEL'>('TRIMESTRE');
  const [codeInput, setCodeInput] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);
  const isLicensed = Boolean(
    licenseInfo && licenseInfo.code && (!licenseInfo.expiresAt || licenseInfo.expiresAt >= todayIso)
  );

  // Validate stored license on startup against backend HMAC
  useEffect(() => {
    if (!licenseInfo?.code) return;
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    fetch(`${apiBase}/api/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: licenseInfo.code }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok || !d.valid) {
          localStorage.removeItem(LICENSE_STORAGE_KEY);
          setLicenseInfo(null);
        }
      })
      .catch(() => {
        // Keep cached state if offline momentarily
      });
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Enseignant CEM',
              email: currentUser.email || '',
              schoolName: 'متوسطة الخوارزمي',
              wilaya: 'Alger',
              defaultSubject: 'Mathématiques',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            const data = snap.data();
            if (data?.schoolName) setSchoolName(data.schoolName);
            if (data?.licenseCode && data?.licenseExpiresAt) {
              const restored: StoredLicense = {
                code: String(data.licenseCode),
                plan: String(data.licensePlan || 'PRO'),
                expiresAt: String(data.licenseExpiresAt),
              };
              setLicenseInfo(restored);
              localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(restored));
            }
          }
        } catch (err) {
          console.error('User profile sync warning:', err);
        }
      } else {
        setDocuments([]);
        setCorrespondents([]);
        setInvoices([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    const docsQuery = query(
      collection(db, 'documents'),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubDocs = onSnapshot(
      docsQuery,
      (snapshot) => {
        setDocuments(snapshot.docs.map((d) => d.data() as PedagogicDocument));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'documents');
      }
    );

    const corrQuery = query(
      collection(db, 'correspondents'),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubCorr = onSnapshot(
      corrQuery,
      (snapshot) => {
        setCorrespondents(snapshot.docs.map((d) => d.data() as Correspondent));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'correspondents');
      }
    );

    const invQuery = query(
      collection(db, 'invoices'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubInv = onSnapshot(
      invQuery,
      (snapshot) => {
        setInvoices(snapshot.docs.map((d) => d.data() as Invoice));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'invoices');
      }
    );

    return () => {
      unsubDocs();
      unsubCorr();
      unsubInv();
    };
  }, [authReady, user]);

  const handleIncrementTrial = () => {
    setTrialsUsed((prev) => {
      const next = prev + 1;
      localStorage.setItem(TRIALS_STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleVerifyActivationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setVerifyingCode(true);
    setActivationError(null);
    setActivationSuccess(null);

    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/license/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.message || 'Code invalide ou expiré.');
      }

      const verified: StoredLicense = {
        code: codeInput.trim().toUpperCase(),
        plan: String(data.plan || 'PRO'),
        expiresAt: String(data.expiresAt || ''),
      };
      setLicenseInfo(verified);
      localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(verified));
      setActivationSuccess(data.message || 'Licence activée avec succès.');

      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          licenseCode: verified.code,
          licensePlan: verified.plan,
          licenseExpiresAt: verified.expiresAt,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      setActivationError(err instanceof Error ? err.message : 'Vérification impossible.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Connexion Google annulée ou bloquée.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleSaveDocument = async (currentDraft: ActiveDraft) => {
    if (!user) return;
    const docId = currentDraft.id || makeSafeId('doc');
    const docRef = doc(db, 'documents', docId);
    const payload = {
      id: docId,
      ownerId: user.uid,
      title: currentDraft.title.slice(0, 200) || 'Document sans titre',
      docType: currentDraft.docType,
      subject: currentDraft.subject,
      level: currentDraft.level,
      language: currentDraft.language,
      trimester: currentDraft.trimester,
      handwritingMode: currentDraft.handwritingMode,
      paperStyle: currentDraft.paperStyle,
      inkColor: currentDraft.inkColor,
      contentMarkdown: currentDraft.contentMarkdown.slice(0, 119000),
      svgDiagram: (currentDraft.svgDiagram || '').slice(0, 119000),
      priceDzd: Math.max(0, Number(currentDraft.priceDzd) || 0),
      isPaidTemplate: Boolean(currentDraft.isPaidTemplate),
      updatedAt: serverTimestamp(),
    };

    try {
      if (currentDraft.id) {
        await updateDoc(docRef, payload);
      } else {
        await setDoc(docRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setDraft((prev) => ({ ...prev, id: docId }));
      }
    } catch (err) {
      handleFirestoreError(err, currentDraft.id ? OperationType.UPDATE : OperationType.CREATE, `documents/${docId}`);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'documents', docId));
      if (draft.id === docId) {
        setDraft((prev) => ({ ...prev, id: undefined }));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `documents/${docId}`);
    }
  };

  const handleAddCorrespondent = async (
    data: Omit<Correspondent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) return;
    const corrId = makeSafeId('corr');
    const corrRef = doc(db, 'correspondents', corrId);
    try {
      await setDoc(corrRef, {
        id: corrId,
        ownerId: user.uid,
        fullName: data.fullName.slice(0, 120),
        roleType: data.roleType,
        email: (data.email || '').slice(0, 180),
        phone: (data.phone || '').slice(0, 40),
        wilaya: (data.wilaya || '').slice(0, 80),
        subjectFocus: (data.subjectFocus || '').slice(0, 80),
        levelFocus: data.levelFocus,
        planName: data.planName.slice(0, 100),
        balanceDueDzd: Math.max(0, Number(data.balanceDueDzd) || 0),
        totalPaidDzd: Math.max(0, Number(data.totalPaidDzd) || 0),
        paymentStatus: data.paymentStatus,
        notes: (data.notes || '').slice(0, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `correspondents/${corrId}`);
    }
  };

  const handleDeleteCorrespondent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'correspondents', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `correspondents/${id}`);
    }
  };

  const handleCreateInvoice = async ({
    correspondentId,
    documentTitle,
    documentId,
    amountDzd,
    dueDate,
  }: {
    correspondentId: string;
    documentTitle: string;
    documentId?: string;
    amountDzd: number;
    dueDate?: string;
  }) => {
    if (!user) return;
    const corr = correspondents.find((c) => c.id === correspondentId);
    if (!corr) return;

    const invId = makeSafeId('inv');
    const invRef = doc(db, 'invoices', invId);
    const safeAmount = Math.max(0, Number(amountDzd) || 0);

    try {
      await setDoc(invRef, {
        id: invId,
        ownerId: user.uid,
        correspondentId,
        correspondentName: corr.fullName.slice(0, 120),
        documentId: (documentId || '').slice(0, 128),
        documentTitle: documentTitle.slice(0, 200),
        amountDzd: safeAmount,
        status: safeAmount === 0 ? 'paid' : 'pending',
        dueDate: (dueDate || '').slice(0, 40),
        aiMessageDraft: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (safeAmount > 0) {
        const newBalance = (corr.balanceDueDzd || 0) + safeAmount;
        await updateDoc(doc(db, 'correspondents', correspondentId), {
          balanceDueDzd: newBalance,
          totalPaidDzd: corr.totalPaidDzd || 0,
          paymentStatus: 'pending',
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invoices/${invId}`);
    }
  };

  const handleMarkInvoicePaid = async (invoice: Invoice) => {
    try {
      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'paid',
        updatedAt: serverTimestamp(),
      });

      const corr = correspondents.find((c) => c.id === invoice.correspondentId);
      if (corr) {
        const newDue = Math.max(0, (corr.balanceDueDzd || 0) - invoice.amountDzd);
        const newPaid = (corr.totalPaidDzd || 0) + invoice.amountDzd;
        await updateDoc(doc(db, 'correspondents', corr.id), {
          balanceDueDzd: newDue,
          totalPaidDzd: newPaid,
          paymentStatus: newDue <= 0 ? 'paid' : 'pending',
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invoices/${invoice.id}`);
    }
  };

  const handleSaveInvoiceDraftMessage = async (invoiceId: string, message: string) => {
    try {
      await updateDoc(doc(db, 'invoices', invoiceId), {
        aiMessageDraft: message.slice(0, 4000),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invoices/${invoiceId}`);
    }
  };

  const handleLoadInAtelier = (d: PedagogicDocument) => {
    setDraft({
      id: d.id,
      title: d.title,
      docType: d.docType,
      subject: d.subject,
      level: d.level,
      language: d.language,
      trimester: d.trimester,
      handwritingMode: d.handwritingMode,
      paperStyle: d.paperStyle,
      inkColor: d.inkColor,
      contentMarkdown: d.contentMarkdown,
      svgDiagram: d.svgDiagram || '',
      attachedImageUrl: '',
      priceDzd: d.priceDzd,
      isPaidTemplate: d.isPaidTemplate,
    });
    setActiveTab('atelier');
  };

  const handleSelectTopicForAtelier = (params: {
    subject: SubjectType;
    level: LevelType;
    trimester: TrimesterType;
    topicTitle: string;
    language: 'fr' | 'ar' | 'en';
  }) => {
    setDraft((prev) => {
      const starter = buildSubjectStarterContent({
        subject: params.subject,
        level: params.level,
        docType: prev.docType,
        language: params.language,
        topicTitle: params.topicTitle,
      });
      return {
        ...prev,
        id: undefined,
        subject: params.subject,
        level: params.level,
        trimester: params.trimester,
        language: params.language,
        title: starter.title,
        contentMarkdown: starter.contentMarkdown,
        svgDiagram: starter.svgDiagram,
      };
    });
    setActiveTab('atelier');
  };

  const navItems: { id: AppTab; label: string }[] = [
    { id: 'atelier', label: 'Atelier IA' },
    { id: 'flashcards', label: 'Flashcards' },
    { id: 'library', label: 'Bibliothèque' },
    { id: 'correspondents', label: 'Correspondants' },
    { id: 'curriculum', label: 'Programme CEM' },
  ];

  const planPrices = {
    MENSUEL: '1 500 DZD / Mois',
    TRIMESTRE: '3 500 DZD / Trimestre',
    ANNUEL: '8 000 DZD / Année',
  };

  const whatsappPaymentText = `Salam, je souhaite activer Madrassati CEM Pro (${planPrices[selectedPlanOption]}). Voici mon reçu de paiement CCP / BaridiMob.${user?.email ? ` Email : ${user.email}` : ''}`;
  const whatsappPaymentHref = `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(whatsappPaymentText)}`;
  const whatsappFloatHref = `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent('Salam, je souhaite des informations ou un code d’activation Madrassati CEM Pro.')}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('atelier')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Madrassati CEM
          </button>

          {/* Zone 2: 4 single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeTab === item.id
                    ? 'text-emerald-700 border-emerald-700 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Install/Share + 1 Primary Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <PWAInstallAndShareControl />
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="h-9 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                title={user.email || ''}
              >
                <span className="max-w-[130px] truncate">{user.displayName || 'Enseignant'}</span>
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Connexion Google</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-700"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap ${
                  activeTab === item.id
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {authError && (
        <div className="no-print max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {authError}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-20">
        {activeTab === 'atelier' && (
          <AtelierView
            draft={draft}
            onUpdateDraft={setDraft}
            schoolName={schoolName}
            onChangeSchoolName={setSchoolName}
            headerConfig={headerConfig}
            onChangeHeaderConfig={setHeaderConfig}
            teacherName={user?.displayName || ''}
            isAuthenticated={Boolean(user)}
            onRequestSignIn={handleSignIn}
            onSaveDocument={handleSaveDocument}
            correspondents={correspondents}
            onCreatePaidShare={handleCreateInvoice}
            licenseCode={licenseInfo?.code || null}
            licensePlan={licenseInfo?.plan || null}
            isLicensed={isLicensed}
            trialsUsed={trialsUsed}
            maxTrials={MAX_FREE_TRIALS}
            onIncrementTrial={handleIncrementTrial}
            onOpenActivationModal={() => setShowActivationModal(true)}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsView
            licenseCode={licenseInfo?.code || null}
            isLicensed={isLicensed}
            trialsUsed={trialsUsed}
            maxTrials={MAX_FREE_TRIALS}
            onIncrementTrial={handleIncrementTrial}
            onOpenActivationModal={() => setShowActivationModal(true)}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            documents={documents}
            isAuthenticated={Boolean(user)}
            onRequestSignIn={handleSignIn}
            onLoadInAtelier={handleLoadInAtelier}
            onDeleteDocument={handleDeleteDocument}
            onInsertIllustration={(imagePath) => {
              setDraft((prev) => ({ ...prev, attachedImageUrl: imagePath }));
              setActiveTab('atelier');
            }}
            isActivated={isLicensed}
            onOpenActivation={() => setShowActivationModal(true)}
          />
        )}

        {activeTab === 'correspondents' && (
          <CorrespondentsView
            correspondents={correspondents}
            invoices={invoices}
            userEmail={user?.email || undefined}
            isAuthenticated={Boolean(user)}
            onRequestSignIn={handleSignIn}
            onAddCorrespondent={handleAddCorrespondent}
            onDeleteCorrespondent={handleDeleteCorrespondent}
            onCreateInvoice={handleCreateInvoice}
            onMarkInvoicePaid={handleMarkInvoicePaid}
            onSaveInvoiceDraftMessage={handleSaveInvoiceDraftMessage}
          />
        )}

        {activeTab === 'curriculum' && (
          <CurriculumView onSelectTopicForAtelier={handleSelectTopicForAtelier} />
        )}
      </main>

      {/* Floating Green WhatsApp Contact Button (Matching Screenshot 1) */}
      <a
        href={whatsappFloatHref}
        target="_blank"
        rel="noopener noreferrer"
        className="no-print fixed bottom-5 left-5 z-40 h-12 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-sm rounded-full shadow-lg flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
      >
        <MessageCircle className="w-5 h-5 fill-white text-white" />
        <span className="font-mono-tabular tracking-wide">{WHATSAPP_NUMBER_DISPLAY}</span>
      </a>

      {/* CCP / BaridiMob & WhatsApp Activation Lock Modal */}
      {showActivationModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Activation Pro — CCP / BaridiMob & WhatsApp
                  </h2>
                  <p className="text-xs text-slate-500">
                    Débloquez l’IA illimitée, l’export Word (.docx) et l’impression PDF A4
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActivationModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>

            {isLicensed && licenseInfo && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <div className="font-bold">Licence active : {licenseInfo.plan}</div>
                  <div>Code : <span className="font-mono-tabular">{licenseInfo.code}</span> · Valable jusqu’au {licenseInfo.expiresAt}</div>
                </div>
              </div>
            )}

            {/* Step 1: Plan Selection */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">1. Choisissez votre formule (DZD)</div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'MENSUEL', label: 'Mensuel', price: '1 500 DZD' },
                    { id: 'TRIMESTRE', label: 'Trimestre', price: '3 500 DZD' },
                    { id: 'ANNUEL', label: 'Annuel', price: '8 000 DZD' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanOption(p.id)}
                    className={`p-3 rounded-xl border text-center transition-colors ${
                      selectedPlanOption === p.id
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{p.label}</div>
                    <div className="text-sm font-bold font-mono-tabular mt-0.5">{p.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: CCP / BaridiMob Payment + WhatsApp Link */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>2. Paiement local CCP / BaridiMob / Edahabia</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pas besoin de carte internationale. Effectuez votre versement en Dinars Algériens (CCP / BaridiMob), puis cliquez ci-dessous pour envoyer la photo du reçu sur WhatsApp et recevoir immédiatement votre code d’activation.
              </p>
              <a
                href={whatsappPaymentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-white text-white" />
                <span>Envoyer le reçu sur WhatsApp ({WHATSAPP_NUMBER_DISPLAY})</span>
              </a>
            </div>

            {/* Step 3: Enter Activation Code */}
            <form onSubmit={handleVerifyActivationCode} className="space-y-2.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                3. Entrez votre code d’activation reçu sur WhatsApp
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="CEM-TRIMESTRE-20270215-XXXXXXXX"
                  className="flex-1 h-10 px-3 text-xs sm:text-sm font-mono-tabular uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="submit"
                  disabled={verifyingCode}
                  className="h-10 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {verifyingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  <span>Activer</span>
                </button>
              </div>
              {activationError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  {activationError}
                </div>
              )}
              {activationSuccess && (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  {activationSuccess}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      <OfflineIndicator />
    </div>
  );
}
