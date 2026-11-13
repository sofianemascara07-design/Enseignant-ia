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
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { ActiveDraft, AtelierView } from './components/AtelierView';
import { CorrespondentsView } from './components/CorrespondentsView';
import { CurriculumView } from './components/CurriculumView';
import { LibraryView } from './components/LibraryView';
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

type AppTab = 'atelier' | 'library' | 'correspondents' | 'curriculum';

const STARTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 280" width="600" height="280">
  <rect width="600" height="280" fill="#ffffff" />
  <polygon points="120,230 120,60 440,230" fill="#ecfdf5" stroke="#047857" stroke-width="2.5" />
  <polyline points="120,210 140,210 140,230" fill="none" stroke="#0f172a" stroke-width="2" />
  <line x1="120" y1="145" x2="280" y2="145" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="6,4" />
  <text x="102" y="54" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">A</text>
  <text x="102" y="246" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">B</text>
  <text x="448" y="242" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">C</text>
  <text x="98" y="150" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1d4ed8">M</text>
  <text x="286" y="138" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1d4ed8">N</text>
  <text x="200" y="164" font-family="sans-serif" font-size="13" fill="#1d4ed8">(MN) // (BC)</text>
  <text x="46" y="150" font-family="sans-serif" font-size="13" fill="#334155">6 cm</text>
  <text x="260" y="252" font-family="sans-serif" font-size="13" fill="#334155">8 cm</text>
</svg>`;

const INITIAL_DRAFT: ActiveDraft = {
  title: 'Devoir Surveillé N°1 — Théorème de Thalès & Trigonométrie (4AM)',
  docType: 'devoir',
  subject: 'Mathématiques',
  level: '4AM',
  language: 'fr',
  trimester: 'T1',
  handwritingMode: 'standard',
  paperStyle: 'white',
  inkColor: 'black',
  svgDiagram: STARTER_SVG,
  attachedImageUrl: '',
  priceDzd: 300,
  isPaidTemplate: false,
  contentMarkdown: `## Exercice 01 : Calcul numérique et PGCD (6 points)

1. Calculer le **PGCD(420 ; 252)** en utilisant l’algorithme d’Euclide.
2. Rendre la fraction **252 / 420** irréductible en détaillant les étapes.
3. Calculer l’expression : **A = √75 − 2√12 + √27** et l’écrire sous la forme **a√3**.

## Exercice 02 : Géométrie — Théorème de Thalès (6 points)

Soit **ABC** un triangle rectangle en **B** tel que **AB = 6 cm** et **BC = 8 cm** (voir figure ci-dessous).
On place le point **M** sur **[AB]** tel que **AM = 3 cm**, puis on trace la parallèle à **(BC)** passant par **M** ; elle coupe **[AC]** en **N**.

1. Calculer la longueur **AC** en appliquant le théorème de Pythagore.
2. Calculer les longueurs **AN** et **MN** à l’aide du théorème de Thalès.
3. Déterminer la mesure de l’angle **ACB** arrondie au degré près.

## Situation d’intégration (8 points)

Un établissement CEM souhaite aménager une rampe d’accès pour personnes à mobilité réduite devant le bloc administratif. La hauteur du seuil est de **0,90 m** et la rampe forme un angle de **8°** avec le sol horizontal.

| Critère d’évaluation | Indicateur de réussite | Barème |
| :--- | :--- | :---: |
| Modélisation géométrique | Schéma du triangle rectangle annoté | 2,0 pts |
| Calcul trigonométrique | Utilisation correcte de sin(8°) ou tan(8°) | 4,0 pts |
| Rédaction et unité | Phrase réponse claire en mètres | 2,0 pts |`,
};

function makeSafeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  const [schoolName, setSchoolName] = useState('CEM El-Khawarizmi');

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
              schoolName: 'CEM El-Khawarizmi',
              wilaya: 'Alger',
              defaultSubject: 'Mathématiques',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            const data = snap.data();
            if (data?.schoolName) setSchoolName(data.schoolName);
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

  // Firestore Realtime Listeners (only attached when authReady && user)
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
        const list = snapshot.docs.map((d) => d.data() as PedagogicDocument);
        setDocuments(list);
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
        const list = snapshot.docs.map((d) => d.data() as Correspondent);
        setCorrespondents(list);
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
        const list = snapshot.docs.map((d) => d.data() as Invoice);
        setInvoices(list);
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
    setDraft((prev) => ({
      ...prev,
      id: undefined,
      subject: params.subject,
      level: params.level,
      trimester: params.trimester,
      language: params.language,
      title: params.topicTitle,
    }));
    setActiveTab('atelier');
  };

  const navItems: { id: AppTab; label: string }[] = [
    { id: 'atelier', label: 'Atelier IA' },
    { id: 'library', label: 'Bibliothèque' },
    { id: 'correspondents', label: 'Correspondants' },
    { id: 'curriculum', label: 'Programme CEM' },
  ];

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

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
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
      <main className="flex-1">
        {activeTab === 'atelier' && (
          <AtelierView
            draft={draft}
            onUpdateDraft={setDraft}
            schoolName={schoolName}
            teacherName={user?.displayName || ''}
            isAuthenticated={Boolean(user)}
            onRequestSignIn={handleSignIn}
            onSaveDocument={handleSaveDocument}
            correspondents={correspondents}
            onCreatePaidShare={handleCreateInvoice}
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
          />
        )}

        {activeTab === 'correspondents' && (
          <CorrespondentsView
            correspondents={correspondents}
            invoices={invoices}
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
    </div>
  );
}
