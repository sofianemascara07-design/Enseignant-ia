import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  CreditCard,
  KeyRound,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Power,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  Users,
} from 'lucide-react';
import { SUBJECTS } from '../data/algerianCurriculum';
import {
  Correspondent,
  CorrespondentRole,
  Invoice,
  LanguageType,
  LevelType,
  Subscriber,
  SubscriberPlan,
} from '../types';
import { ADMIN_PIN_STORAGE_KEY, buildApiHeaders, getApiBase } from '../utils/authHeaders';

async function safeCopyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below when Clipboard API is blocked inside an iframe
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

interface CorrespondentsViewProps {
  correspondents: Correspondent[];
  invoices: Invoice[];
  userEmail?: string;
  adminToken?: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  globalOpenAccess: boolean;
  subscribers: Subscriber[];
  initialSubTab?: 'correspondents' | 'invoices' | 'licenses' | 'admin';
  onRequestSignIn: () => void;
  onUnlockAdminPin: (pin: string) => Promise<void>;
  onToggleGlobalOpenAccess: (nextValue: boolean) => Promise<void>;
  onAddSubscriber: (params: {
    fullName: string;
    email?: string;
    phone?: string;
    plan: SubscriberPlan;
    active: boolean;
    notes?: string;
  }) => Promise<Subscriber | null>;
  onToggleSubscriberActive: (sub: Subscriber) => Promise<void>;
  onDeleteSubscriber: (id: string) => Promise<void>;
  onAddCorrespondent: (data: Omit<Correspondent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteCorrespondent: (id: string) => Promise<void>;
  onCreateInvoice: (params: {
    correspondentId: string;
    documentTitle: string;
    amountDzd: number;
    dueDate?: string;
  }) => Promise<void>;
  onMarkInvoicePaid: (invoice: Invoice) => Promise<void>;
  onSaveInvoiceDraftMessage: (invoiceId: string, message: string) => Promise<void>;
}

const PLAN_PRESETS = [
  { label: 'Pack Sujets & Corrigés (300 DZD)', amount: 300 },
  { label: 'Pack Trimestre Complet (1 500 DZD)', amount: 1500 },
  { label: 'Abonnement Mensuel Soutien (2 500 DZD)', amount: 2500 },
  { label: 'Préparation Intensive BEM (4 000 DZD)', amount: 4000 },
];

export const CorrespondentsView: React.FC<CorrespondentsViewProps> = ({
  correspondents,
  invoices,
  userEmail,
  adminToken,
  isAuthenticated,
  isAdmin,
  globalOpenAccess,
  subscribers,
  initialSubTab,
  onRequestSignIn,
  onUnlockAdminPin,
  onToggleGlobalOpenAccess,
  onAddSubscriber,
  onToggleSubscriberActive,
  onDeleteSubscriber,
  onAddCorrespondent,
  onDeleteCorrespondent,
  onCreateInvoice,
  onMarkInvoicePaid,
  onSaveInvoiceDraftMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'correspondents' | 'invoices' | 'licenses' | 'admin'>(
    initialSubTab || (isAdmin ? 'admin' : 'correspondents')
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Admin license code generator state
  const [adminPin, setAdminPin] = useState('');
  const [genPlanType, setGenPlanType] = useState<'MENSUEL' | 'TRIMESTRE' | 'ANNUEL'>('MENSUEL');
  const [genClientPhone, setGenClientPhone] = useState('');
  const [genClientName, setGenClientName] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [generatedLicense, setGeneratedLicense] = useState<{ code: string; plan: string; expiresAt: string } | null>(null);
  const [copiedLicense, setCopiedLicense] = useState(false);

  // Admin Access & Subscriber Management state
  const [adminUnlockPinInput, setAdminUnlockPinInput] = useState('');
  const [adminPinBusy, setAdminPinBusy] = useState(false);
  const [globalToggleBusy, setGlobalToggleBusy] = useState(false);
  const [subFullName, setSubFullName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subPlan, setSubPlan] = useState<SubscriberPlan>('TRIMESTRE');
  const [subActive, setSubActive] = useState(true);
  const [subNotes, setSubNotes] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [togglingSubId, setTogglingSubId] = useState<string | null>(null);
  const [copiedSubCodeId, setCopiedSubCodeId] = useState<string | null>(null);

  // Add Correspondent form state
  const [fullName, setFullName] = useState('');
  const [roleType, setRoleType] = useState<CorrespondentRole>('Collègue CEM');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('Alger');
  const [subjectFocus, setSubjectFocus] = useState('Mathématiques');
  const [levelFocus, setLevelFocus] = useState<LevelType | 'Tous niveaux'>('4AM');
  const [planName, setPlanName] = useState(PLAN_PRESETS[1].label);
  const [initialDue, setInitialDue] = useState(0);
  const [isSubmittingCorr, setIsSubmittingCorr] = useState(false);

  // Create Invoice form state
  const [invCorrespondentId, setInvCorrespondentId] = useState('');
  const [invDocTitle, setInvDocTitle] = useState('Pack Trimestre CEM — Sujets + Corrigés');
  const [invAmountDzd, setInvAmountDzd] = useState(1500);
  const [invDueDate, setInvDueDate] = useState('');
  const [isSubmittingInv, setIsSubmittingInv] = useState(false);

  // AI Correspondent Assistant Modal
  const [aiTargetCorr, setAiTargetCorr] = useState<Correspondent | null>(null);
  const [aiTargetInvoice, setAiTargetInvoice] = useState<Invoice | null>(null);
  const [aiGoal, setAiGoal] = useState('Relance courtoise de paiement BaridiMob / CCP');
  const [aiLang, setAiLang] = useState<LanguageType>('fr');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSubjectLine, setAiSubjectLine] = useState('');
  const [aiMessageBody, setAiMessageBody] = useState('');
  const [copiedAi, setCopiedAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const totalCollected = correspondents.reduce((acc, c) => acc + (c.totalPaidDzd || 0), 0);
    const totalPending = correspondents.reduce((acc, c) => acc + (c.balanceDueDzd || 0), 0);
    const pendingInvoices = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue').length;
    return {
      totalCollected,
      totalPending,
      correspondentCount: correspondents.length,
      pendingInvoices,
    };
  }, [correspondents, invoices]);

  const handleAddCorrespondentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setIsSubmittingCorr(true);
    setErrorMsg(null);
    try {
      const due = Math.max(0, Number(initialDue) || 0);
      await onAddCorrespondent({
        fullName: fullName.trim(),
        roleType,
        email: email.trim(),
        phone: phone.trim(),
        wilaya: wilaya.trim(),
        subjectFocus,
        levelFocus,
        planName: planName.trim() || 'Standard',
        balanceDueDzd: due,
        totalPaidDzd: 0,
        paymentStatus: due > 0 ? 'pending' : 'paid',
        notes: '',
      });
      setFullName('');
      setEmail('');
      setPhone('');
      setInitialDue(0);
      setShowAddModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible d’ajouter le correspondant.');
    } finally {
      setIsSubmittingCorr(false);
    }
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invCorrespondentId || !invDocTitle.trim()) return;
    setIsSubmittingInv(true);
    setErrorMsg(null);
    try {
      await onCreateInvoice({
        correspondentId: invCorrespondentId,
        documentTitle: invDocTitle.trim(),
        amountDzd: Math.max(0, Number(invAmountDzd) || 0),
        dueDate: invDueDate.trim(),
      });
      setShowInvoiceModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur création facture.');
    } finally {
      setIsSubmittingInv(false);
    }
  };

  const openAiAssistant = (corr: Correspondent, invoice?: Invoice) => {
    setAiTargetCorr(corr);
    setAiTargetInvoice(invoice || null);
    setAiSubjectLine('');
    setAiMessageBody(invoice?.aiMessageDraft || '');
    setCopiedAi(false);
  };

  const handleGenerateAiMessage = async () => {
    if (!aiTargetCorr) return;
    setAiLoading(true);
    setErrorMsg(null);
    try {
      const amount = aiTargetInvoice ? aiTargetInvoice.amountDzd : aiTargetCorr.balanceDueDzd;
      const docTitle = aiTargetInvoice ? aiTargetInvoice.documentTitle : aiTargetCorr.planName;
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/ai/correspondent-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correspondentName: aiTargetCorr.fullName,
          roleType: aiTargetCorr.roleType,
          messageGoal: aiGoal,
          language: aiLang,
          amountDzd: amount,
          documentTitle: docTitle,
          levelFocus: aiTargetCorr.levelFocus,
          subjectFocus: aiTargetCorr.subjectFocus,
        }),
      });
      const raw = await res.text();
      let data: Record<string, string> = {};
      try {
        data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      } catch {
        throw new Error(`Erreur serveur (${res.status}). Veuillez réessayer.`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Erreur génération message IA.');
      }
      setAiSubjectLine(data.subjectLine || '');
      setAiMessageBody(data.messageBody || '');
      if (aiTargetInvoice && aiTargetInvoice.status !== 'paid' && aiTargetInvoice.status !== 'cancelled') {
        await onSaveInvoiceDraftMessage(aiTargetInvoice.id, data.messageBody || '');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la rédaction IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateLicenseCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenLoading(true);
    setErrorMsg(null);
    setGeneratedLicense(null);
    try {
      const apiBase = getApiBase();
      const headers = await buildApiHeaders({ adminToken });
      const storedPin =
        typeof window !== 'undefined' ? window.localStorage.getItem(ADMIN_PIN_STORAGE_KEY) || '' : '';
      const res = await fetch(`${apiBase}/api/license/generate`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          adminEmail: userEmail || '',
          adminPin: adminPin.trim() || storedPin,
          planType: genPlanType,
        }),
      });
      const raw = await res.text();
      let data: { code?: string; plan?: string; expiresAt?: string; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        throw new Error(`Erreur serveur (${res.status}). Veuillez réessayer.`);
      }
      if (!res.ok || !data.code) {
        throw new Error(data.error || 'Accès refusé pour la génération du code.');
      }
      setGeneratedLicense({
        code: data.code,
        plan: data.plan || genPlanType,
        expiresAt: data.expiresAt || '',
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur génération code.');
    } finally {
      setGenLoading(false);
    }
  };

  const handleCopyLicenseMessage = async () => {
    if (!generatedLicense) return;
    const msg = `Bonjour${genClientName ? ` ${genClientName}` : ''},\nVoici votre code d'activation Madrassati CEM (${generatedLicense.plan}) valable jusqu'au ${generatedLicense.expiresAt} :\n${generatedLicense.code}\n\nMerci pour votre paiement CCP / BaridiMob.`;
    const ok = await safeCopyText(msg);
    if (ok) {
      setCopiedLicense(true);
      setTimeout(() => setCopiedLicense(false), 2000);
    }
  };

  const normalizedClientWa = genClientPhone.replace(/[^0-9]/g, '').replace(/^0/, '213');
  const waSendUrl = generatedLicense
    ? `https://wa.me/${normalizedClientWa || '213557767804'}?text=${encodeURIComponent(
        `Bonjour${genClientName ? ` ${genClientName}` : ''}, voici votre code d'activation Madrassati CEM (${generatedLicense.plan}, valable jusqu'au ${generatedLicense.expiresAt}) : ${generatedLicense.code}`
      )}`
    : '#';

  const handleCopyAiMessage = async () => {
    const full = aiSubjectLine ? `${aiSubjectLine}\n\n${aiMessageBody}` : aiMessageBody;
    const ok = await safeCopyText(full);
    if (ok) {
      setCopiedAi(true);
      setTimeout(() => setCopiedAi(false), 2000);
    }
  };

  const handleAdminPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUnlockPinInput.trim()) return;
    setAdminPinBusy(true);
    setErrorMsg(null);
    try {
      await onUnlockAdminPin(adminUnlockPinInput.trim());
      setAdminUnlockPinInput('');
      setActiveTab('admin');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Code PIN administrateur invalide.');
    } finally {
      setAdminPinBusy(false);
    }
  };

  const handleToggleGlobal = async () => {
    setGlobalToggleBusy(true);
    setErrorMsg(null);
    try {
      await onToggleGlobalOpenAccess(!globalOpenAccess);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de modifier l’accès global.');
    } finally {
      setGlobalToggleBusy(false);
    }
  };

  const handleAddSubscriberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFullName.trim()) return;
    setSubSubmitting(true);
    setErrorMsg(null);
    try {
      await onAddSubscriber({
        fullName: subFullName.trim(),
        email: subEmail.trim(),
        phone: subPhone.trim(),
        plan: subPlan,
        active: subActive,
        notes: subNotes.trim(),
      });
      setSubFullName('');
      setSubEmail('');
      setSubPhone('');
      setSubNotes('');
      setSubActive(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur ajout abonné.');
    } finally {
      setSubSubmitting(false);
    }
  };

  const handleToggleSubscriber = async (sub: Subscriber) => {
    setTogglingSubId(sub.id);
    setErrorMsg(null);
    try {
      await onToggleSubscriberActive(sub);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur changement statut abonné.');
    } finally {
      setTogglingSubId(null);
    }
  };

  const handlePromoteCorrespondentToSubscriber = async (c: Correspondent) => {
    setSubSubmitting(true);
    setErrorMsg(null);
    try {
      await onAddSubscriber({
        fullName: c.fullName,
        email: c.email || '',
        phone: c.phone || '',
        plan: 'TRIMESTRE',
        active: true,
        notes: `${c.roleType} · ${c.levelFocus}`,
      });
      setActiveTab('admin');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur activation abonné.');
    } finally {
      setSubSubmitting(false);
    }
  };

  if (!isAuthenticated && !isAdmin) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-5 max-w-xl mx-auto">
          <Users className="w-9 h-9 text-emerald-700 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">
            Gestion payante & Administration des abonnés
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Centralisez vos collègues CEM, gérez l’accès total ouvert et activez/désactivez vos abonnés en temps réel.
          </p>
          <button
            type="button"
            onClick={onRequestSignIn}
            className="h-10 px-6 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg"
          >
            Se connecter avec Google
          </button>

          <form onSubmit={handleAdminPinSubmit} className="pt-4 border-t border-slate-100 space-y-2.5 text-left">
            <label className="block text-xs font-semibold text-slate-700">
              Ou déverrouiller l’espace Administrateur par PIN
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={adminUnlockPinInput}
                onChange={(e) => setAdminUnlockPinInput(e.target.value)}
                placeholder="Code PIN Admin"
                className="flex-1 h-9 px-3 text-xs font-mono-tabular border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                disabled={adminPinBusy}
                className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
              >
                {adminPinBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Ouvrir Admin</span>
              </button>
            </div>
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gestion payante & Correspondants
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Suivi des abonnements, factures DZD, codes d’activation CCP/WhatsApp et assistant de relance IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setInvCorrespondentId(correspondents[0]?.id || '');
              setShowInvoiceModal(true);
            }}
            disabled={correspondents.length === 0}
            className="h-10 px-4 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Receipt className="w-4 h-4" />
            <span>Nouvelle facture DZD</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter correspondant</span>
          </button>
        </div>
      </div>

      {/* 4-Column Tabular Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Total encaissé</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono-tabular mt-1">
            {metrics.totalCollected.toLocaleString('fr-DZ')} DZD
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Solde en attente</div>
          <div className="text-2xl font-bold text-amber-700 font-mono-tabular mt-1">
            {metrics.totalPending.toLocaleString('fr-DZ')} DZD
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Correspondants actifs</div>
          <div className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
            {metrics.correspondentCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Factures à recouvrer</div>
          <div className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
            {metrics.pendingInvoices}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* Segmented View Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('correspondents')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'correspondents'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Répertoire des correspondants ({correspondents.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Factures & Partages payants ({invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('licenses')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'licenses'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Codes CCP</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'admin'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin & Abonnés ({subscribers.filter((s) => s.active).length}/{subscribers.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'admin' ? (
        !isAdmin ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Accès Administrateur requis</span>
            </div>
            <p className="text-xs text-slate-600">
              Connectez-vous avec le compte propriétaire ou entrez le code PIN administrateur pour gérer l’accès total ouvert et activer/désactiver les abonnés.
            </p>
            <form onSubmit={handleAdminPinSubmit} className="flex gap-2">
              <input
                type="password"
                required
                value={adminUnlockPinInput}
                onChange={(e) => setAdminUnlockPinInput(e.target.value)}
                placeholder="Code PIN Admin"
                className="flex-1 h-10 px-3 text-xs font-mono-tabular border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                disabled={adminPinBusy}
                className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                {adminPinBusy ? 'Vérification...' : 'Déverrouiller'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top 2 Control Cards: Admin Full Access + Global Open Access Toggle */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Accès Total Administrateur : ACTIF</span>
                  </div>
                  <p className="text-xs text-emerald-900/80 leading-relaxed">
                    Votre compte administrateur ({userEmail || 'PIN Admin'}) dispose en permanence d’un accès complet sans limite (Atelier IA, Fiches, Word, PDF A4, Télécharger cartes françaises anglais, Bibliothèque).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-700 text-white text-[11px] font-bold whitespace-nowrap">
                  OUVERT 100%
                </span>
              </div>

              <div
                className={`border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  globalOpenAccess
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    {globalOpenAccess ? (
                      <Unlock className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                    <span>
                      Accès total ouvert à tous : {globalOpenAccess ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {globalOpenAccess
                      ? 'Tous les enseignants et visiteurs ont actuellement accès à toutes les fonctionnalités sans paiement.'
                      : 'Seuls l’admin, les abonnés actifs et les codes CCP valides ont l’accès illimité.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleGlobal}
                  disabled={globalToggleBusy}
                  className={`h-10 px-4 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                    globalOpenAccess
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {globalToggleBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                  <span>
                    {globalOpenAccess ? 'Désactiver accès total' : 'Activer accès total ouvert'}
                  </span>
                </button>
              </div>
            </div>

            {/* Add Subscriber Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span>Ajouter / Activer un abonné</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Renseignez l’email Google de l’abonné pour le débloquer automatiquement à la connexion, et/ou générez son code CCP. Vous pouvez l’activer ou le désactiver à tout moment.
                </p>
              </div>

              <form onSubmit={handleAddSubscriberSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={subFullName}
                    onChange={(e) => setSubFullName(e.target.value)}
                    placeholder="Ex: Prof. Sara Mansouri"
                    className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Email Google (auto-accès)</label>
                  <input
                    type="email"
                    value={subEmail}
                    onChange={(e) => setSubEmail(e.target.value)}
                    placeholder="prof@gmail.com"
                    className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Téléphone WhatsApp</label>
                  <input
                    type="text"
                    value={subPhone}
                    onChange={(e) => setSubPhone(e.target.value)}
                    placeholder="0550123456"
                    className="w-full h-9 px-3 text-xs font-mono-tabular border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Formule</label>
                  <select
                    value={subPlan}
                    onChange={(e) => setSubPlan(e.target.value as SubscriberPlan)}
                    className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="MENSUEL">Mensuel (30j)</option>
                    <option value="TRIMESTRE">Trimestre (90j)</option>
                    <option value="ANNUEL">Annuel (365j)</option>
                    <option value="ACCES_TOTAL">Accès Total (365j)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Statut initial</label>
                  <select
                    value={subActive ? 'active' : 'inactive'}
                    onChange={(e) => setSubActive(e.target.value === 'active')}
                    className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="active">Actif (Ouvert)</option>
                    <option value="inactive">Désactivé (Suspendu)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={subSubmitting}
                  className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  {subSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Enregistrer</span>
                </button>
              </form>
            </div>

            {/* Subscribers Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Liste des abonnés ({subscribers.length})
                </h3>
                <span className="text-xs text-slate-500">
                  {subscribers.filter((s) => s.active).length} actif(s) · {subscribers.filter((s) => !s.active).length} désactivé(s)
                </span>
              </div>

              {subscribers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Aucun abonné enregistré pour le moment. Utilisez le formulaire ci-dessus ou cliquez sur « + Abonné » dans votre répertoire.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                      <th className="py-3 px-4">Abonné</th>
                      <th className="py-3 px-4">Formule & Échéance</th>
                      <th className="py-3 px-4">Code d’activation</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Activer / Désactiver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {subscribers.map((sub) => {
                      const waPhone = (sub.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '213');
                      const waLink = `https://wa.me/${waPhone || '213557767804'}?text=${encodeURIComponent(
                        `Salam ${sub.fullName}, votre accès Madrassati CEM (${sub.plan}) est ${
                          sub.active ? 'ACTIVÉ' : 'SUSPENDU'
                        }.${sub.licenseCode ? ` Code : ${sub.licenseCode}` : ''}`
                      )}`;
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 text-sm">{sub.fullName}</div>
                            <div className="text-slate-500">
                              {[sub.email, sub.phone].filter(Boolean).join(' · ') || 'Sans email/téléphone'}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{sub.plan}</div>
                            {sub.expiresAt && (
                              <div className="text-[11px] text-slate-500 font-mono-tabular">
                                Expire : {sub.expiresAt}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {sub.licenseCode ? (
                              <div className="inline-flex items-center gap-1.5">
                                <code className="px-2 py-1 rounded bg-slate-100 text-slate-900 font-mono-tabular text-[11px]">
                                  {sub.licenseCode}
                                </code>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const ok = await safeCopyText(sub.licenseCode || '');
                                    if (ok) {
                                      setCopiedSubCodeId(sub.id);
                                      setTimeout(() => setCopiedSubCodeId(null), 1500);
                                    }
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-900"
                                  title="Copier le code"
                                >
                                  {copiedSubCodeId === sub.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">Via compte Google</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {sub.active ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                                <Check className="w-3 h-3" />
                                <span>Actif</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold">
                                <Lock className="w-3 h-3" />
                                <span>Désactivé</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleSubscriber(sub)}
                                disabled={togglingSubId === sub.id}
                                className={`h-8 px-3 rounded-md font-semibold inline-flex items-center gap-1.5 ${
                                  sub.active
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                }`}
                              >
                                {togglingSubId === sub.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Power className="w-3 h-3" />
                                )}
                                <span>{sub.active ? 'Désactiver' : 'Activer'}</span>
                              </button>

                              {sub.phone && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-8 px-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-md inline-flex items-center gap-1"
                                  title="Notifier sur WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => onDeleteSubscriber(sub.id)}
                                className="h-8 px-2 text-rose-600 hover:bg-rose-50 rounded-md"
                                title="Supprimer abonné"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      ) : activeTab === 'licenses' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <span>Générateur de codes d’activation (Paiements CCP & WhatsApp)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Lorsqu’un client envoie son reçu de paiement CCP / BaridiMob sur WhatsApp (05 57 76 78 04), générez ici son code d’activation signé.
            </p>
          </div>

          <form onSubmit={handleGenerateLicenseCode} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Formule payée</label>
                <select
                  value={genPlanType}
                  onChange={(e) => setGenPlanType(e.target.value as 'MENSUEL' | 'TRIMESTRE' | 'ANNUEL')}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="MENSUEL">Mensuel — 30 jours (1 500 DZD)</option>
                  <option value="TRIMESTRE">Trimestre — 90 jours (3 500 DZD)</option>
                  <option value="ANNUEL">Annuel — 365 jours (8 000 DZD)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PIN Admin {isAdmin ? '(Admin vérifié)' : ''}
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder={isAdmin ? 'Optionnel (session Admin active)' : 'Code PIN administrateur'}
                  className="w-full h-10 px-3 text-sm font-mono-tabular border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom du client (optionnel)</label>
                <input
                  type="text"
                  value={genClientName}
                  onChange={(e) => setGenClientName(e.target.value)}
                  placeholder="Ex: Prof. Amine"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">WhatsApp client (optionnel)</label>
                <input
                  type="text"
                  value={genClientPhone}
                  onChange={(e) => setGenClientPhone(e.target.value)}
                  placeholder="Ex: 0550123456"
                  className="w-full h-10 px-3 text-sm font-mono-tabular border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={genLoading}
              className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2"
            >
              {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Générer le code d’activation</span>
            </button>
          </form>

          {generatedLicense && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="text-xs font-semibold text-emerald-900">
                Code prêt · Formule {generatedLicense.plan} (Expire le {generatedLicense.expiresAt})
              </div>
              <div className="p-3 bg-white border border-emerald-300 rounded-lg font-mono-tabular text-base font-bold text-slate-900 tracking-wider text-center select-all">
                {generatedLicense.code}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLicenseMessage}
                  className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
                >
                  {copiedLicense ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLicense ? 'Message copié' : 'Copier code + message'}</span>
                </button>
                <a
                  href={waSendUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Envoyer via WhatsApp</span>
                </a>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'correspondents' ? (
        correspondents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">Aucun correspondant enregistré</p>
            <p className="text-xs text-slate-500">
              Ajoutez vos premiers collègues, parents d’élèves ou élèves pour gérer vos packs payants.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg"
            >
              Ajouter un correspondant
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Correspondant</th>
                  <th className="py-3 px-4">Rôle & CEM</th>
                  <th className="py-3 px-4">Offre / Formule</th>
                  <th className="py-3 px-4 text-right">Encaissé</th>
                  <th className="py-3 px-4 text-right">Reste dû</th>
                  <th className="py-3 px-4">État</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {correspondents.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.fullName}</div>
                      <div className="text-xs text-slate-500">
                        {[c.phone, c.email, c.wilaya].filter(Boolean).join(' · ') || 'Contact non renseigné'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {c.roleType} · {c.levelFocus}
                      {c.subjectFocus ? ` · ${c.subjectFocus}` : ''}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-[200px] truncate">
                      {c.planName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-xs font-medium text-slate-900 whitespace-nowrap">
                      {(c.totalPaidDzd || 0).toLocaleString('fr-DZ')} DZD
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {(c.balanceDueDzd || 0).toLocaleString('fr-DZ')} DZD
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                      {c.balanceDueDzd <= 0 || c.paymentStatus === 'paid' ? (
                        <span className="text-emerald-700">À jour (Payé)</span>
                      ) : c.paymentStatus === 'overdue' ? (
                        <span className="text-rose-700">Relance due</span>
                      ) : (
                        <span className="text-amber-700">En attente</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAiAssistant(c)}
                          className="h-8 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-md inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message IA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInvCorrespondentId(c.id);
                            setShowInvoiceModal(true);
                          }}
                          className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Facturer</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handlePromoteCorrespondentToSubscriber(c)}
                            className="h-8 px-2.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md inline-flex items-center gap-1"
                            title="Ajouter comme abonné"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>+ Abonné</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteCorrespondent(c.id)}
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50 rounded-md"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-900">Aucune facture émise</p>
          <p className="text-xs text-slate-500">
            Partagez un document payant depuis l’Atelier IA ou cliquez sur « Nouvelle facture DZD ».
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Correspondant</th>
                <th className="py-3 px-4">Document / Pack</th>
                <th className="py-3 px-4 text-right">Montant</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {invoices.map((inv) => {
                const corr = correspondents.find((c) => c.id === inv.correspondentId);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-900">{inv.correspondentName}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-[300px] truncate">
                      {inv.documentTitle}
                      {inv.dueDate ? ` · Échéance ${inv.dueDate}` : ''}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {inv.amountDzd.toLocaleString('fr-DZ')} DZD
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                      {inv.status === 'paid' ? (
                        <span className="text-emerald-700">Payée</span>
                      ) : inv.status === 'overdue' ? (
                        <span className="text-rose-700">En retard</span>
                      ) : inv.status === 'cancelled' ? (
                        <span className="text-slate-500">Annulée</span>
                      ) : (
                        <span className="text-amber-700">En attente</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {corr && (
                          <button
                            type="button"
                            onClick={() => openAiAssistant(corr, inv)}
                            className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md inline-flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Relance IA</span>
                          </button>
                        )}
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => onMarkInvoicePaid(inv)}
                            className="h-8 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-md inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Marquer payée</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Correspondent */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Nouveau correspondant</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleAddCorrespondentSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Prof. Yacine Benali"
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value as CorrespondentRole)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Collègue CEM">Collègue CEM</option>
                    <option value="Parent d'élève">Parent d’élève</option>
                    <option value="Élève Soutien">Élève Soutien</option>
                    <option value="Établissement">Établissement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0550..."
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.dz"
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Wilaya</label>
                  <input
                    type="text"
                    value={wilaya}
                    onChange={(e) => setWilaya(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Matière principale</label>
                  <select
                    value={subjectFocus}
                    onChange={(e) => setSubjectFocus(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Niveau CEM</label>
                  <select
                    value={levelFocus}
                    onChange={(e) => setLevelFocus(e.target.value as LevelType | 'Tous niveaux')}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="1AM">1AM</option>
                    <option value="2AM">2AM</option>
                    <option value="3AM">3AM</option>
                    <option value="4AM">4AM (BEM)</option>
                    <option value="Tous niveaux">Tous niveaux</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Formule / Pack</label>
                  <select
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {PLAN_PRESETS.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Solde initial dû (DZD)</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={initialDue}
                    onChange={(e) => setInitialDue(Number(e.target.value))}
                    className="w-full h-9 px-3 text-sm font-mono-tabular border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-9 px-4 text-xs font-medium text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorr}
                  className="h-9 px-5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg"
                >
                  {isSubmittingCorr ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Invoice */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Émettre une facture DZD</h2>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Correspondant</label>
                <select
                  value={invCorrespondentId}
                  onChange={(e) => setInvCorrespondentId(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {correspondents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.roleType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Intitulé du document ou pack
                </label>
                <input
                  type="text"
                  required
                  value={invDocTitle}
                  onChange={(e) => setInvDocTitle(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Montant (DZD)</label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    required
                    value={invAmountDzd}
                    onChange={(e) => setInvAmountDzd(Number(e.target.value))}
                    className="w-full h-9 px-3 text-sm font-mono-tabular border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="h-9 px-4 text-xs font-medium text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInv}
                  className="h-9 px-5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg"
                >
                  {isSubmittingInv ? 'Création...' : 'Créer la facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Correspondent Message Assistant */}
      {aiTargetCorr && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Assistant IA · {aiTargetCorr.fullName}</span>
              </h2>
              <button
                type="button"
                onClick={() => setAiTargetCorr(null)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Objectif du message</label>
                <select
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Relance courtoise de paiement BaridiMob / CCP">
                    Relance courtoise paiement (BaridiMob/CCP)
                  </option>
                  <option value="Envoi d'un nouveau pack cours et sujets d'examens">
                    Envoi d’un pack cours & sujets
                  </option>
                  <option value="Compte-rendu pédagogique de progression CEM">
                    Compte-rendu pédagogique élève
                  </option>
                  <option value="Confirmation de réception de paiement et accès débloqué">
                    Confirmation paiement reçu
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Langue</label>
                <select
                  value={aiLang}
                  onChange={(e) => setAiLang(e.target.value as LanguageType)}
                  className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="fr">Français</option>
                  <option value="ar">Arabe (العربية)</option>
                  <option value="en">Anglais</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateAiMessage}
              disabled={aiLoading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{aiLoading ? 'Rédaction...' : 'Rédiger le message personnalisé'}</span>
            </button>

            {(aiMessageBody || aiSubjectLine) && (
              <div className="space-y-2 pt-2 border-t border-slate-100" dir={aiLang === 'ar' ? 'rtl' : 'ltr'}>
                {aiSubjectLine && (
                  <div className="text-xs font-semibold text-slate-900">{aiSubjectLine}</div>
                )}
                <textarea
                  rows={6}
                  value={aiMessageBody}
                  onChange={(e) => setAiMessageBody(e.target.value)}
                  className="w-full p-3 text-xs leading-relaxed border border-slate-200 rounded-lg bg-slate-50 text-slate-900"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCopyAiMessage}
                    className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
                  >
                    {copiedAi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAi ? 'Copié' : 'Copier le message'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
