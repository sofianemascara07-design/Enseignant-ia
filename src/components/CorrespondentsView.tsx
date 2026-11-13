import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  CreditCard,
  Loader2,
  MessageSquare,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { SUBJECTS } from '../data/algerianCurriculum';
import {
  Correspondent,
  CorrespondentRole,
  Invoice,
  LanguageType,
  LevelType,
} from '../types';

interface CorrespondentsViewProps {
  correspondents: Correspondent[];
  invoices: Invoice[];
  isAuthenticated: boolean;
  onRequestSignIn: () => void;
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
  isAuthenticated,
  onRequestSignIn,
  onAddCorrespondent,
  onDeleteCorrespondent,
  onCreateInvoice,
  onMarkInvoicePaid,
  onSaveInvoiceDraftMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'correspondents' | 'invoices'>('correspondents');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

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
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
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

  const handleCopyAiMessage = async () => {
    const full = aiSubjectLine ? `${aiSubjectLine}\n\n${aiMessageBody}` : aiMessageBody;
    await navigator.clipboard.writeText(full);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4 max-w-xl mx-auto">
          <Users className="w-9 h-9 text-emerald-700 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">
            Gestion payante avec vos correspondants
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Centralisez vos collègues CEM, parents d’élèves et élèves en soutien, facturez vos packs de cours ou sujets d’examens en DZD, et générez vos relances IA en français, arabe ou anglais.
          </p>
          <button
            type="button"
            onClick={onRequestSignIn}
            className="h-10 px-6 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg"
          >
            Se connecter avec Google
          </button>
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
            Suivi des abonnements, factures DZD, partages de sujets et assistant de relance IA.
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
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
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
      </div>

      {/* Correspondents Table */}
      {activeTab === 'correspondents' ? (
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
