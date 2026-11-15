import React, { useState } from 'react';
import { Check, Copy, Download, MessageCircle, Share2, Smartphone, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

const DIRECT_SHARE_URL = 'https://ais-pre-j2rzxhetust6t56sewfsrq-988212701770.europe-west2.run.app';

export const PWAInstallAndShareControl: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' &&
    window.location.hostname &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.startsWith('ais-dev-')
      ? window.location.origin
      : DIRECT_SHARE_URL;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowModal(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const whatsappShareText = `Salam, découvrez Madrassati CEM (Fiches pédagogiques, Examens & Flashcards CEM 1AM–4AM avec Enseignant IA). Ouvrez ce lien et appuyez sur "Installer" pour l'ajouter à votre téléphone : ${shareUrl}`;
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`;

  return (
    <>
      <div className="flex items-center gap-2">
        {!isInstalled && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="h-9 px-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            title="Installer l’application sur téléphone ou PC"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Installer</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          title="Lien de partage pour les enseignants"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Partager</span>
        </button>
      </div>

      {showModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Installer & Partager aux enseignants
                  </h2>
                  <p className="text-xs text-slate-500">
                    Application Web (PWA) prête sans déploiement Render
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Lien direct complet (IA + Export Word + Flashcards)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 h-9 px-2.5 text-xs font-mono-tabular bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            </div>

            <a
              href={whatsappShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-10 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-white text-white" />
              <span>Partager le lien aux enseignants sur WhatsApp</span>
            </a>

            {!isInstalled && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-slate-900">
                  Installer comme application sur téléphone / PC :
                </div>
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={install}
                    className="w-full h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Installer Madrassati CEM maintenant</span>
                  </button>
                ) : isIOS ? (
                  <p className="leading-relaxed">
                    Sur iPhone / iPad (Safari) : appuyez sur le bouton <strong>Partager</strong> en bas puis sur <strong>Sur l’écran d’accueil</strong>.
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    Sur Android (Chrome) ou PC : ouvrez le menu du navigateur (<strong>⋮</strong>) puis cliquez sur <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Hors ligne — Édition manuelle et Flashcards actifs</span>
    </div>
  );
};
