import React, { useMemo, useState } from 'react';
import { BookOpen, Download, ExternalLink, Image as ImageIcon, Search, Trash2 } from 'lucide-react';
import { CURATED_ILLUSTRATIONS, SUBJECTS } from '../data/algerianCurriculum';
import { PedagogicDocument, SubjectType } from '../types';
import { exportToWordDocx } from '../utils/exportUtils';

interface LibraryViewProps {
  documents: PedagogicDocument[];
  isAuthenticated: boolean;
  onRequestSignIn: () => void;
  onLoadInAtelier: (doc: PedagogicDocument) => void;
  onDeleteDocument: (docId: string) => Promise<void>;
  onInsertIllustration: (imagePath: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  documents,
  isAuthenticated,
  onRequestSignIn,
  onLoadInAtelier,
  onDeleteDocument,
  onInsertIllustration,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<SubjectType | 'all'>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const matchesSubj = subjectFilter === 'all' || d.subject === subjectFilter;
      const matchesText =
        !searchQuery.trim() ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.level.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSubj && matchesText;
    });
  }, [documents, searchQuery, subjectFilter]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Saved Teacher Documents */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bibliothèque pédagogique</h1>
            <p className="text-sm text-slate-500 mt-1">
              Vos cours, fiches, devoirs et sujets d’examens CEM sauvegardés et prêts à imprimer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un titre, 4AM..."
                className="h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value as SubjectType | 'all')}
              className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">Toutes les matières</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <h2 className="text-base font-semibold text-slate-900">
              Connectez-vous pour accéder à votre bibliothèque cloud
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Vos cours, fiches pédagogiques et sujets d’examens seront synchronisés de manière sécurisée avec votre compte enseignant.
            </p>
            <button
              type="button"
              onClick={onRequestSignIn}
              className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg"
            >
              Se connecter avec Google
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-900">Aucun document enregistré pour le moment</p>
            <p className="text-xs text-slate-500">
              Générez un cours, une fiche ou un sujet d’examen dans l’Atelier IA puis cliquez sur « Enregistrer ».
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Titre du document</th>
                  <th className="py-3 px-4">Programme CEM</th>
                  <th className="py-3 px-4">Style</th>
                  <th className="py-3 px-4 text-right">Tarif</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-[340px] truncate">
                      {doc.title}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {doc.level} · {doc.subject} · {doc.docType}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {doc.language.toUpperCase()} ·{' '}
                      {doc.handwritingMode === 'standard' ? 'Imprimé' : 'Manuscrit'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-xs text-slate-700 whitespace-nowrap">
                      {doc.priceDzd > 0 ? `${doc.priceDzd.toLocaleString('fr-DZ')} DZD` : 'Gratuit'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onLoadInAtelier(doc)}
                          className="h-8 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-md inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ouvrir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            exportToWordDocx({
                              title: doc.title,
                              subject: doc.subject,
                              level: doc.level,
                              language: doc.language,
                              docType: doc.docType,
                              trimester: doc.trimester,
                              contentMarkdown: doc.contentMarkdown,
                              svgDiagram: doc.svgDiagram,
                              handwritingMode: doc.handwritingMode,
                            })
                          }
                          className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Word</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDocument(doc.id)}
                          className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 rounded-md"
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
        )}
      </section>

      {/* Curated Pedagogical Illustrations & Visual Supports */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Banque d’images et planches scientifiques CEM
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Illustrations haute résolution prêtes à insérer dans vos cours, fiches et sujets d’examens.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CURATED_ILLUSTRATIONS.map((item) => (
            <article
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                {failedImages[item.id] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-400 bg-gradient-to-br from-slate-50 to-slate-100">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-xs text-center font-medium text-slate-600">{item.title}</span>
                  </div>
                ) : (
                  <img
                    src={item.imagePath}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    {item.subject} · {item.levelHint}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.caption}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onInsertIllustration(item.imagePath)}
                  className="w-full h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg whitespace-nowrap"
                >
                  Insérer dans l’Atelier
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
