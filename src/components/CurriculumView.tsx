import React, { useState } from 'react';
import { ArrowRight, GraduationCap } from 'lucide-react';
import {
  ALGERIAN_CEM_CURRICULUM,
  LEVELS,
  SUBJECTS,
  SUBJECT_META,
} from '../data/algerianCurriculum';
import { LevelType, SubjectType, TrimesterType } from '../types';

interface CurriculumViewProps {
  onSelectTopicForAtelier: (params: {
    subject: SubjectType;
    level: LevelType;
    trimester: TrimesterType;
    topicTitle: string;
    language: 'fr' | 'ar' | 'en';
  }) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({ onSelectTopicForAtelier }) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Mathématiques');
  const [selectedLevel, setSelectedLevel] = useState<LevelType>('4AM');

  const topics = ALGERIAN_CEM_CURRICULUM[selectedSubject][selectedLevel] || [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Programme officiel du Moyen (CEM Algérie)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Progression officielle 2e génération (1AM à 4AM / BEM). Cliquez sur un chapitre pour générer le cours, la fiche ou le sujet d’examen.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                selectedLevel === lvl
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {SUBJECTS.map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => setSelectedSubject(subj)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedSubject === subj
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Curriculum Chapters List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic) => (
          <article
            key={topic.id}
            className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {selectedLevel} · {selectedSubject} · {topic.trimester}
                </span>
                <GraduationCap className="w-4 h-4 text-slate-400" />
              </div>

              <h2
                dir={SUBJECT_META[selectedSubject].defaultLang === 'ar' ? 'rtl' : 'ltr'}
                className="text-base font-bold text-slate-900 leading-snug"
              >
                {topic.title}
              </h2>

              <p
                dir={SUBJECT_META[selectedSubject].defaultLang === 'ar' ? 'rtl' : 'ltr'}
                className="text-xs text-slate-600 leading-relaxed"
              >
                {topic.competency}
              </p>

              <ul
                dir={SUBJECT_META[selectedSubject].defaultLang === 'ar' ? 'rtl' : 'ltr'}
                className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-700"
              >
                {topic.keyPoints.map((kp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-emerald-700 font-bold">
                      ·
                    </span>
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() =>
                onSelectTopicForAtelier({
                  subject: selectedSubject,
                  level: selectedLevel,
                  trimester: topic.trimester,
                  topicTitle: topic.title,
                  language: SUBJECT_META[selectedSubject].defaultLang,
                })
              }
              className="w-full h-10 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Préparer dans l’Atelier IA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};
