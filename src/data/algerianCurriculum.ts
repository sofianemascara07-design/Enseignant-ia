import { CurriculumTopic, LevelType, SubjectType } from '../types';

export const SUBJECTS: SubjectType[] = [
  'Anglais',
  'Français',
  'Mathématiques',
  'Sciences Naturelles',
  'Physique',
  'Arabe',
];

export const LEVELS: LevelType[] = ['1AM', '2AM', '3AM', '4AM'];

export const SUBJECT_META: Record<
  SubjectType,
  { labelAr: string; labelEn: string; defaultLang: 'fr' | 'ar' | 'en'; accentClass: string }
> = {
  Anglais: {
    labelAr: 'اللغة الإنجليزية',
    labelEn: 'English (MS)',
    defaultLang: 'en',
    accentClass: 'text-sky-700',
  },
  Français: {
    labelAr: 'اللغة الفرنسية',
    labelEn: 'French',
    defaultLang: 'fr',
    accentClass: 'text-indigo-700',
  },
  Mathématiques: {
    labelAr: 'الرياضيات',
    labelEn: 'Mathematics',
    defaultLang: 'ar',
    accentClass: 'text-emerald-700',
  },
  'Sciences Naturelles': {
    labelAr: 'علوم الطبيعة والحياة',
    labelEn: 'Natural Sciences',
    defaultLang: 'ar',
    accentClass: 'text-teal-700',
  },
  Physique: {
    labelAr: 'العلوم الفيزيائية والتكنولوجيا',
    labelEn: 'Physics & Tech',
    defaultLang: 'ar',
    accentClass: 'text-amber-700',
  },
  Arabe: {
    labelAr: 'اللغة العربية',
    labelEn: 'Arabic Language',
    defaultLang: 'ar',
    accentClass: 'text-rose-700',
  },
};

export interface SubjectAsset {
  id: string;
  title: string;
  subject: SubjectType;
  levelHint: string;
  imagePath: string;
  caption: string;
}

export const CURATED_ILLUSTRATIONS: SubjectAsset[] = [
  {
    id: 'asset_math_geom',
    title: 'مبرهنة فيتاغورس والمعلم المتعامد (الرياضيات)',
    subject: 'Mathématiques',
    levelHint: '3AM · 4AM',
    imagePath: '/src/assets/images/cem_math_geometry_1794587444122.jpg',
    caption: 'المثلث القائم، العلاقة a² + b² = c² والإنشاءات الهندسية في التعليم المتوسط.',
  },
  {
    id: 'asset_physics_circuit',
    title: 'الدارة الكهربائية وتبدد الضوء (الفيزياء)',
    subject: 'Physique',
    levelHint: '1AM · 3AM · 4AM',
    imagePath: '/src/assets/images/cem_physics_circuit_1794587443600.jpg',
    caption: 'تركيب دارة كهربائية على التسلسل مع جهاز الأمبيرمتر والمقاومة والموشور الضوئي.',
  },
  {
    id: 'asset_science_bio',
    title: 'الخلية النباتية والتركيب الضوئي (علوم الطبيعة)',
    subject: 'Sciences Naturelles',
    levelHint: '1AM · 2AM · 4AM',
    imagePath: '/src/assets/images/cem_science_biology_1794587444405.jpg',
    caption: 'بنية الخلية النباتية اليخضورية ومقطع عرضي في الورقة (الثغور والأوعية الخشبية).',
  },
  {
    id: 'asset_lang_desk',
    title: 'دفاتر ومراجع اللغات (عربية · فرنسية · إنجليزية)',
    subject: 'Français',
    levelHint: '1AM – 4AM',
    imagePath: '/src/assets/images/cem_languages_library_1794587445743.jpg',
    caption: 'نماذج دفاتر مسطرة للخط اليدوي والكتب المدرسية للطور المتوسط.',
  },
];

export const ALGERIAN_CEM_CURRICULUM: Record<SubjectType, Record<LevelType, CurriculumTopic[]>> = {
  Anglais: {
    '1AM': [
      {
        id: 'en_1am_seq1',
        trimester: 'T1',
        title: 'Seq 1: Me and my friends',
        competency: 'Greet, introduce oneself, ask/give personal info (age, country, school).',
        keyPoints: ['Auxiliary to be (Present Simple)', 'Personal pronouns & Possessive adjectives', 'Punctuation & capitalization', 'Sounds /eɪ/, /aɪ/, /ɪ/'],
      },
      {
        id: 'en_1am_seq2',
        trimester: 'T1',
        title: 'Seq 2: Me and my family',
        competency: 'Describe family members, jobs, and daily preferences.',
        keyPoints: ['Present Simple (affirmative/interrogative)', 'Articles a / an / the', 'Family tree vocabulary & jobs', 'Ordinal & cardinal numbers'],
      },
      {
        id: 'en_1am_seq3',
        trimester: 'T2',
        title: 'Seq 3: Me and my daily activities',
        competency: 'Tell the time and narrate daily school & home routines.',
        keyPoints: ['Telling the time', 'Present Simple (3rd person -s/-es)', 'Prepositions of time (at, in, on)', 'Final -s pronunciation /s/, /z/, /ɪz/'],
      },
      {
        id: 'en_1am_seq4',
        trimester: 'T3',
        title: 'Seq 4: Me and my school',
        competency: 'Describe school rules, rights, duties, and locate places.',
        keyPoints: ['Present Continuous', 'Prepositions of place', 'Can / Must (rights and duties)', 'Written expression: my ideal school'],
      },
    ],
    '2AM': [
      {
        id: 'en_2am_seq1',
        trimester: 'T1',
        title: 'Seq 1: Me, my friends and my family',
        competency: 'Describe physical appearance, personality, and house rooms.',
        keyPoints: ['Adjectives of physical description', 'Have got / Has got', 'Locating rooms with prepositions', 'Pronunciation of silent letters'],
      },
      {
        id: 'en_2am_seq2',
        trimester: 'T2',
        title: 'Seq 2: Me and my shopping',
        competency: 'Shop for food/clothes, express quantity and prices.',
        keyPoints: ['Countable & uncountable nouns', 'How much / How many / Some / Any', 'Imperative for recipes', 'Algerian & British currency'],
      },
      {
        id: 'en_2am_seq3',
        trimester: 'T2',
        title: 'Seq 3: Me and my health',
        competency: 'Talk about common illnesses and give healthy lifestyle advice.',
        keyPoints: ['Should / Shouldn’t', 'Must / Mustn’t', 'Health & balanced diet vocabulary', 'Situation of integration: Doctor-patient dialogue'],
      },
      {
        id: 'en_2am_seq4',
        trimester: 'T3',
        title: 'Seq 4: Me and my travels',
        competency: 'Plan holidays, talk about weather and future intentions.',
        keyPoints: ['Simple Future (will / going to)', 'Weather adjectives', 'Algerian tourist landmarks', 'Reading & writing postcards'],
      },
    ],
    '3AM': [
      {
        id: 'en_3am_seq1',
        trimester: 'T1',
        title: 'Seq 1: Me, my abilities, my interests & personality',
        competency: 'Express abilities, frequency of hobbies, and personality traits.',
        keyPoints: ['Can / Can’t for ability', 'Adverbs of frequency (always, never...)', 'Expressing likes/dislikes + V-ing', 'Strong & weak forms of can'],
      },
      {
        id: 'en_3am_seq2',
        trimester: 'T2',
        title: 'Seq 2: Me and lifestyles',
        competency: 'Compare past and present Algerian lifestyles (clothing, food, habits).',
        keyPoints: ['Past Simple (regular & irregular)', 'Used to / Didn’t use to', 'Time markers (ago, yesterday, in the past)', 'Final -ed pronunciation /t/, /d/, /ɪd/'],
      },
      {
        id: 'en_3am_seq3',
        trimester: 'T2',
        title: 'Seq 3: Me and the scientific world',
        competency: 'Write short biographies of Muslim & Algerian scientists and inventions.',
        keyPoints: ['Past Continuous vs Past Simple (while/when)', 'Relative pronouns (who, which)', 'Biographies: Ibn El Haytham, Bourouis...', 'Passive voice introduction'],
      },
      {
        id: 'en_3am_seq4',
        trimester: 'T3',
        title: 'Seq 4: Me and my environment',
        competency: 'Discuss endangered animals in Algeria and environmental protection.',
        keyPoints: ['Must / Mustn’t & Imperative', 'Comparatives & Superlatives', 'Cause and effect (because, so)', 'Eco-school charter project'],
      },
    ],
    '4AM': [
      {
        id: 'en_4am_seq1',
        trimester: 'T1',
        title: 'Seq 1: Me, universal landmarks & outstanding figures',
        competency: 'Describe monuments & biographies using passive voice and comparatives.',
        keyPoints: ['Passive voice (Past Simple)', 'Comparatives of equality / inferiority', 'Chronological discourse markers', 'Diphthongs & consonant clusters'],
      },
      {
        id: 'en_4am_seq2',
        trimester: 'T2',
        title: 'Seq 2: Me, my personality and life experiences',
        competency: 'Narrate childhood memories, dreams, and personal achievements.',
        keyPoints: ['Present Perfect (ever, never, since, for)', 'Past Simple vs Past Continuous', 'Prefixes for opposites (un-, dis-, im-)', 'BEM writing: Profile & ideal job'],
      },
      {
        id: 'en_4am_seq3',
        trimester: 'BEM',
        title: 'Seq 3: Me, my community and citizenship',
        competency: 'Express opinions on charity, solidarity, and civic engagement.',
        keyPoints: ['Conditional Type 1 (If + present, will)', 'Giving advice & expressing obligation', 'Argumentative connectors (firstly, moreover)', 'Préparation complète Sujet BEM'],
      },
    ],
  },
  Français: {
    '1AM': [
      {
        id: 'fr_1am_p1',
        trimester: 'T1',
        title: 'Projet 1 : Texte explicatif (Hygiène & Alimentation)',
        competency: 'Comprendre et produire un texte explicatif simple sur la santé.',
        keyPoints: ['Procédés explicatifs (définition, énumération)', 'Présent de vérité générale', 'Phrase déclarative & expansion du nom', 'Accord sujet-verbe'],
      },
      {
        id: 'fr_1am_p2',
        trimester: 'T2',
        title: 'Projet 2 : Progrès scientifiques & Nouvelles technologies',
        competency: 'Expliquer le fonctionnement ou l’utilité d’une invention moderne.',
        keyPoints: ['Connecteurs d’énumération et de reformulation', 'Passé composé & Imparfait', 'Proposition subordonnée relative (qui, que)', 'Homophones grammaticaux'],
      },
      {
        id: 'fr_1am_p3',
        trimester: 'T3',
        title: 'Projet 3 : Texte prescriptif (Énergie & Environnement)',
        competency: 'Rédiger des consignes pour préserver l’eau et les énergies propres.',
        keyPoints: ['Impératif présent & Infinitif', 'Il faut + infinitif', 'Adverbes de manière (-ment)', 'Affiche de sensibilisation'],
      },
    ],
    '2AM': [
      {
        id: 'fr_2am_p1',
        trimester: 'T1',
        title: 'Projet 1 : Le conte (Dire et jouer un conte)',
        competency: 'Rédiger le début, les péripéties et la situation finale d’un conte.',
        keyPoints: ['Formules d’ouverture et de clôture', 'Imparfait vs Passé simple', 'Compléments circonstanciels (temps, lieu, manière)', 'Substituts lexicaux et grammaticaux'],
      },
      {
        id: 'fr_2am_p2',
        trimester: 'T2',
        title: 'Projet 2 : La fable (BD et morale)',
        competency: 'Comprendre le récit animalier et dégager sa morale.',
        keyPoints: ['Discours direct et verbes de parole', 'Présent de narration', 'Valeurs des temps du récit', 'Passage du dialogue à la BD'],
      },
      {
        id: 'fr_2am_p3',
        trimester: 'T3',
        title: 'Projet 3 : La légende',
        competency: 'Raconter une légende du patrimoine algérien.',
        keyPoints: ['Nominalisation et expansion du GN', 'Futur simple & Conditionnel', 'Connecteurs chronologiques', 'Production écrite guidée'],
      },
    ],
    '3AM': [
      {
        id: 'fr_3am_p1',
        trimester: 'T1',
        title: 'Projet 1 : Le fait divers (Journal scolaire)',
        competency: 'Rédiger un fait divers insolite, accident ou méfait.',
        keyPoints: ['Voix passive & transformation passive', 'Passé composé (avec être/avoir)', 'Champ lexical de l’accident/insolite', 'Titre nominal sans verbe'],
      },
      {
        id: 'fr_3am_p2',
        trimester: 'T2',
        title: 'Projet 2 : Le récit historique et la biographie',
        competency: 'Raconter un événement historique de l’Algérie et dresser un portrait.',
        keyPoints: ['Temps du récit (imparfait/passé simple)', 'Connecteurs chronologiques', 'Portrait physique et moral', 'Hommage à une figure historique'],
      },
      {
        id: 'fr_3am_p3',
        trimester: 'T3',
        title: 'Projet 3 : Récit de voyage & Patrimoine',
        competency: 'Décrire un lieu touristique algérien pour inciter à le visiter.',
        keyPoints: ['Verbes de perception et localisation', 'Subordonnée de cause et de conséquence', 'Accord du participe passé', 'Dépliant touristique'],
      },
    ],
    '4AM': [
      {
        id: 'fr_4am_p1',
        trimester: 'T1',
        title: 'Projet 1 : Texte argumentatif (Patrimoine & Tourisme)',
        competency: 'Présenter une thèse et des arguments illustrés par des exemples.',
        keyPoints: ['Verbes d’opinion & modalisateurs', 'Connecteurs d’énumération (d’abord, ensuite...)', 'Proposition subordonnée complétive (que)', 'Expression de la cause et de la conséquence'],
      },
      {
        id: 'fr_4am_p2',
        trimester: 'T2',
        title: 'Projet 2 : Vivre ensemble en paix & Solidarité',
        competency: 'Argumenter à travers le dialogue pour défendre une valeur citoyenne.',
        keyPoints: ['Discours direct / indirect (concordance des temps)', 'Expression du but et de l’opposition', 'Subjonctif présent', 'Charte citoyenne'],
      },
      {
        id: 'fr_4am_p3',
        trimester: 'BEM',
        title: 'Projet 3 : Protection de la nature & Préparation BEM',
        competency: 'Maîtriser la compréhension de l’écrit et la situation d’intégration BEM.',
        keyPoints: ['Conditionnel et hypothèse (si + présent)', 'Synthèse des rapports logiques', 'Méthodologie du sujet BEM (13 pts + 7 pts)', 'Sujets blancs corrigés'],
      },
    ],
  },
  Mathématiques: {
    '1AM': [
      {
        id: 'math_1am_t1',
        trimester: 'T1',
        title: 'الأعداد الطبيعية والعشرية والمستقيمات المتوازية والمتعامدة',
        competency: 'قراءة وكتابة ومقارنة وحصر الأعداد العشرية وإنشاء الأشكال الهندسية القاعدية.',
        keyPoints: ['الكتابة الكسرية والعشرية', 'الترتيب والمستقيم المدرج', 'التوازي والتعامد', 'محور قطعة مستقيم'],
      },
      {
        id: 'math_1am_t2',
        trimester: 'T2',
        title: 'القسمة الإقليدية والكسور والزوايا والمثلثات',
        competency: 'إجراء الحسابات على الكسور البسيطة وإنشاء الزوايا والمثلثات ومنصفاتها.',
        keyPoints: ['قواعد قابلية القسمة', 'جمع وطرح وضرب الكسور', 'قياس وإنشاء الزوايا', 'التناظر المحوري'],
      },
      {
        id: 'math_1am_t3',
        trimester: 'T3',
        title: 'التناسبية، المحيطات والمساحات ومتوازي المستطيلات',
        competency: 'حل مشكلات التناسبية والنسب المئوية وحساب المساحات والحجوم.',
        keyPoints: ['جداول التناسبية والمقياس', 'مساحة المستطيل والمثلث والقرص', 'التعليم في المستوي', 'حجم متوازي المستطيلات والمكعب'],
      },
    ],
    '2AM': [
      {
        id: 'math_2am_t1',
        trimester: 'T1',
        title: 'العمليات على الأعداد الطبيعية والعشرية وإنشاء أشكال هندسية',
        competency: 'احترام أولويات العمليات وتطبيق خاصية التوزيعية واستعمال التناظر المركزي.',
        keyPoints: ['أولويات العمليات بالأقواس ودون أقواس', 'التوزيعية k(a+b)', 'الزوايا المتبادلة داخلياً والمتماثلة', 'التناظر المركزي وخواصه'],
      },
      {
        id: 'math_2am_t2',
        trimester: 'T2',
        title: 'الأعداد النسبية ومتوازي الأضلاع',
        competency: 'جمع وطرح الأعداد النسبية والبرهان على أن رباعياً هو متوازي أضلاع.',
        keyPoints: ['مقارنة وتعليم الأعداد النسبية', 'المجموع الجبري', 'مجموع أقياس زوايا مثلث (180°)', 'متوازي الأضلاع، المعين، المستطيل والمربع'],
      },
      {
        id: 'math_2am_t3',
        trimester: 'T3',
        title: 'الحساب الحرفي، المعادلات والموشور القائم وأسطوانة الدوران',
        competency: 'اختبار صحة مساواة وحل معادلات من الشكل ax = b وحساب المساحة الجانبية.',
        keyPoints: ['إنتاج عبارة حرفية وتبسيطها', 'التناسبية والسرعة المتوسطة', 'الإحصاء (التكرارات والتواترات)', 'الموشور القائم والأسطوانة'],
      },
    ],
    '3AM': [
      {
        id: 'math_3am_t1',
        trimester: 'T1',
        title: 'الأعداد النسبية والناطقة وحالات تقايس المثلثات',
        competency: 'حساب جداء وحاصل قسمة الأعداد الناطقة والبرهان على تقايس مثلثين.',
        keyPoints: ['قاعدة الإشارات في الضرب والقسمة', 'العمليات الأربع على الأعداد الناطقة', 'مستقيم المنتصفين في مثلث', 'المثلثات المعينة بمستقيمين متوازيين يقطعهما قاطعان'],
      },
      {
        id: 'math_3am_t2',
        trimester: 'T2',
        title: 'قوى العدد 10، الحساب الحرفي والمثلث القائم والدائرة',
        competency: 'استعمال الكتابة العلمية والنشر وتطبيق خاصية فيتاغورس وجيب تمام زاوية حادة.',
        keyPoints: ['القوى ذات أسس نسبية صحيحة', 'النشر المزدوج (a+b)(c+d)', 'خاصية فيتاغورس وخاصيتها العكسية', 'الدائرة المحيطة بالمثلث القائم و cos'],
      },
      {
        id: 'math_3am_t3',
        trimester: 'T3',
        title: 'المعادلات من الدرجة الأولى، الترتيب والعمليات والهرم والمخروط',
        competency: 'ترييض مشكلات بحل معادلات من الدرجة الأولى وحساب حجم الهرم ومخروط الدوران.',
        keyPoints: ['حل معادلات من الشكل ax+b = cx+d', 'المتباينات والعمليات', 'الإحصاء (المتوسط المتوازن)', 'حجم الهرم والمخروط الدوراني'],
      },
    ],
    '4AM': [
      {
        id: 'math_4am_t1',
        trimester: 'T1',
        title: 'القاسم المشترك الأكبر (PGCD)، الجذور التربيعية، طالس والنسب المثلثية',
        competency: 'حساب PGCD وتبسيط الجذور وتطبيق مبرهنة طالس والعلاقات المثلثية في مثلث قائم.',
        keyPoints: ['خوارزمية إقليدس والكسور غير القابلة للاختزال', 'العمليات على الجذور التربيعية (a√b)', 'مبرهنة طالس وخاصيتها العكسية', 'النسب المثلثية (sin, cos, tan)'],
      },
      {
        id: 'math_4am_t2',
        trimester: 'T2',
        title: 'المتطابقات الشهيرة، التحليل، المعادلات والمتراجحات والأشعة',
        competency: 'نشر وتحليل عبارات جبرية وحل معادلة الجداء المعدوم والحساب الشعاعي في معلم.',
        keyPoints: ['المتطابقات الشهيرة الثلاث', 'معادلة الجداء المعدوم (ax+b)(cx+d)=0', 'المتراجحات من الدرجة الأولى بمجهول واحد', 'الأشعة والانسحاب والمعالم'],
      },
      {
        id: 'math_4am_t3',
        trimester: 'BEM',
        title: 'جملة معادلتين، الدوال الخطية والتآلفية والتحضير لشهادة التعليم المتوسط (BEM)',
        competency: 'حل جملة معادلتين وتمثيل الدوال بيانياً ومعالجة الوضعيات الإدماجية لشهادة BEM.',
        keyPoints: ['طريقتا التعويض والجمع', 'التمثيل البياني للدالة الخطية والتآلفية', 'الإحصاء (الوسيط والمدى)', 'الدوران والمضلعات المنتظمة والكرة'],
      },
    ],
  },
  'Sciences Naturelles': {
    '1AM': [
      {
        id: 'snv_1am_t1',
        trimester: 'T1',
        title: 'التغذية عند الإنسان والتغذية عند النبات الأخضر',
        competency: 'تصنيف الأغذية وتحديد شروط نمو النبات الأخضر ودور التركيب الضوئي.',
        keyPoints: ['أصل ومصدر الأغذية (بسيطة ومركبة)', 'الراتب الغذائي والتوازن الغذائي', 'امتصاص المحلول المعدني عبر الأوبار الماصة', 'التركيب الضوئي والنسغ الكامل'],
      },
      {
        id: 'snv_1am_t2',
        trimester: 'T2',
        title: 'التحصل على الطاقة (التنفس والتخمر) والإطراح',
        competency: 'تفسير المبادلات الغازية التنفسية عند الإنسان والنبات ودور الكلية في الإطراح.',
        keyPoints: ['الأسناخ الرئوية والمبادلات الغازية', 'قواعد صحية للتنفس', 'التخمر الكحولي عند الخميرة', 'تصفية الدم وإطراح البول والعرق'],
      },
      {
        id: 'snv_1am_t3',
        trimester: 'T3',
        title: 'الخلية والتكاثر الجنسي عند الكائنات الحية',
        competency: 'التعرف على مكونات الخلية وآلية الإلقاح عند الحيوان والنبات.',
        keyPoints: ['الفحص المجهري للخلية', 'الإلقاح الداخلي والخارجي', 'الزهرة وتشكل البذرة'],
      },
    ],
    '2AM': [
      {
        id: 'snv_2am_t1',
        trimester: 'T1',
        title: 'الوسط الحي والعلاقات الغذائية في النظام البيئي',
        competency: 'تحليل مكونات الوسط الحي والسلاسل والشبكات الغذائية وتوازن النظام البيئي.',
        keyPoints: ['العناصر الحية واللاحية', 'السلاسل الغذائية والكتلة الحية', 'التوازن البيئي وتأثير الإنسان'],
      },
      {
        id: 'snv_2am_t2',
        trimester: 'T2',
        title: 'توزع الكائنات الحية وتكيفها مع أوساطها (التنفس والتنقل)',
        competency: 'ربط البنيات التشريحية بأنماط التنفس والتنقل والتكيف مع المناخ الجاف.',
        keyPoints: ['التحورات البنيوية للنباتات الصحراوية', 'التنفس الرئوي، الغلصمي، القصبي والجلدي', 'أنماط التنقل عند الحيوانات'],
      },
      {
        id: 'snv_2am_t3',
        trimester: 'T3',
        title: 'التكاثر وإعمار الأوساط وتصنيف الكائنات الحية',
        competency: 'تفسير استراتيجيات التكاثر وتحديد مفهوم النوع ومعايير التصنيف.',
        keyPoints: ['استراتيجية الكم والنوع', 'غزو الأوساط بالبذور والأبواغ', 'مفهوم النوع والتصنيف الحديث'],
      },
    ],
    '3AM': [
      {
        id: 'snv_3am_t1',
        trimester: 'T1',
        title: 'الديناميكية الداخلية للكرة الأرضية: الزلازل، البراكين وتكتونية الصفائح',
        competency: 'تفسير الظواهر الجيولوجية الداخلية وعلاقتها بحركة الصفائح التكتونية.',
        keyPoints: ['البؤرة، المركز السطحي والأمواج الزلزالية', 'الظهرات المحيطية وظاهرة الغوص', 'البنية الداخلية للكرة الأرضية', 'الإجراءات الوقائية من الأخطار الزلزالية'],
      },
      {
        id: 'snv_3am_t2',
        trimester: 'T2',
        title: 'الديناميكية الخارجية: الصخور، الحت وتطور المناظر الطبيعية',
        competency: 'ربط تنوع المناظر الطبيعية في الجزائر بخواص الصخور وتأثير العوامل المناخية.',
        keyPoints: ['الخواص الفيزيوكيميائية للصخور', 'تأثير الماء والرياح والحرارة', 'الثروات الباطنية والمائية في الجزائر'],
      },
      {
        id: 'snv_3am_t3',
        trimester: 'T3',
        title: 'التربة: تشكلها، مكوناتها وحمايتها',
        competency: 'الوعي بأهمية التربة الزراعية وسبل حمايتها من التصحر والانجراف.',
        keyPoints: ['المكونات المعدنية والعضوية (الدبال)', 'تشكل التربة ومراحل تطورها', 'السد الأخضر وحماية الأراضي'],
      },
    ],
    '4AM': [
      {
        id: 'snv_4am_t1',
        trimester: 'T1',
        title: 'التغذية عند الإنسان: الهضم، الامتصاص ونقل المغذيات',
        competency: 'تفسير التحولات الأنزيمية للأغذية وآلية الامتصاص المعوي ونقل المغذيات في الدم.',
        keyPoints: ['الأنزيمات الهاضمة (الأميلاز، البروتياز، الليباز)', 'الزغابة المعوية والطريق الدموي واللمفاوي', 'دور الكريات الحمراء والتنفس الخلوي'],
      },
      {
        id: 'snv_4am_t2',
        trimester: 'T2',
        title: 'التنسيق الوظيفي في العضوية: الاتصال العصبي والاستجابة المناعية',
        competency: 'تحليل القوس الانعكاسي وتأثير المخدرات وشرح آليات الدفاع المناعي.',
        keyPoints: ['العصبون، المشبك والرسالة العصبية', 'الساحات الحسية والحركية في المخ', 'الحواجز الطبيعية، البلعمة واللمفاويات B و T', 'التلقيح، الاستمصال والحساسية'],
      },
      {
        id: 'snv_4am_t3',
        trimester: 'BEM',
        title: 'انتقال الصفات الوراثية والتحضير لشهادة التعليم المتوسط (BEM)',
        competency: 'تفسير تشكل الأمشاج والنمط النووي وانتقال الأمراض الوراثية وحل وضعيات BEM.',
        keyPoints: ['النمط النووي عند الإنسان (46 صبغياً)', 'الانقسام المنصف والإلقاح', 'الصبغيات الجنسية والأمراض الوراثية (التثلاث الصبغي 21)', 'منهجية تحليل المنحنيات والوثائق في BEM'],
      },
    ],
  },
  Physique: {
    '1AM': [
      {
        id: 'phy_1am_t1',
        trimester: 'T1',
        title: 'الظواهر الكهربائية: الدارة الكهربائية البسيطة، التسلسل والتفرع',
        competency: 'تركيب الدارات الكهربائية وتمثيلها بالرموز النظامية واحترام قواعد الأمن الكهربائي.',
        keyPoints: ['الرموز النظامية للعناصر الكهربائية', 'النواقل والعوازل', 'الربط على التسلسل، على التفرع وذهاب وإياب', 'الدارة المستقصرة ودور المنصهرة'],
      },
      {
        id: 'phy_1am_t2',
        trimester: 'T2',
        title: 'المادة وتحولاتها: القياسات، حالات المادة والخلائط',
        competency: 'قياس الكتلة والحجم والكتلة الحجمية وتفسير تحولات المادة وفصل الخلائط.',
        keyPoints: ['الكتلة، الحجم والكتلة الحجمية (ρ = m/V)', 'النموذج الحبيبي لحالات المادة الثلاث', 'الانصهار، التبخر، التكاثف والتجمد', 'فصل الخلائط المتجانسة وغير المتجانسة'],
      },
      {
        id: 'phy_1am_t3',
        trimester: 'T3',
        title: 'الظواهر الضوئية والفلكية: الانتشار المستقيم للضوء وأطوار القمر',
        competency: 'تفسير تشكل الظل والظليل وظاهرتي الكسوف والخسوف.',
        keyPoints: ['المنابع الضوئية الأولية والثانوية', 'الحزمة الضوئية والظل المحمول', 'جملة الشمس-الأرض-القمر'],
      },
    ],
    '2AM': [
      {
        id: 'phy_2am_t1',
        trimester: 'T1',
        title: 'المادة وتحولاتها: التحول الفيزيائي والكيميائي والذرات والجزيئات',
        competency: 'التمييز بين التحول الفيزيائي والكيميائي وتطبيق مبدأ انحفاظ الكتلة ونمذجة الجزيئات.',
        keyPoints: ['انحفاظ الكتلة خلال التحول الكيميائي', 'التحليل الكهربائي للماء', 'الرموز الكيميائية والنماذج الجزيئية'],
      },
      {
        id: 'phy_2am_t2',
        trimester: 'T2',
        title: 'الظواهر الميكانيكية: الحركة، المسار، السرعة ونقل الحركة',
        competency: 'وصف نسبية الحركة وحساب السرعة المتوسطة وتحديد طرق نقل الحركة.',
        keyPoints: ['المرجع ونسبية الحركة', 'المسار المستقيم والمنحني والدائري', 'السرعة الثابتة والمتزايدة والمتناقصة (v = d/t)', 'نقل الحركة بالسيور والمسننات'],
      },
      {
        id: 'phy_2am_t3',
        trimester: 'T3',
        title: 'الظواهر الكهربائية والمغناطيسية: المغانط والحقل المغناطيسي',
        competency: 'تحديد أقطاب المغناطيس وإبراز الفعل المتبادل بين التيار الكهربائي والمغناطيس.',
        keyPoints: ['التجاذب والتنافر المغناطيسي', 'الطيف المغناطيسي والإبرة الممغنطة', 'المغناطيس الكهربائي (تجربة أورستد)'],
      },
    ],
    '3AM': [
      {
        id: 'phy_3am_t1',
        trimester: 'T1',
        title: 'التفاعلات الكيميائية وموازنة المعادلات الكيميائية',
        competency: 'كتابة وموازنة معادلات الاحتراق التام وغير التام للفحوم الهيدروجينية.',
        keyPoints: ['الاحتراق التام وغير التام لغاز الميثان والبوتان', 'العوامل المؤثرة في التفاعل الكيميائي', 'انحفاظ الذرات نوعاً وعدداً'],
      },
      {
        id: 'phy_3am_t2',
        trimester: 'T2',
        title: 'السلسلة الطاقة والحصيلة الطاقوية والاستطاعة الكهربائية',
        competency: 'بناء السلسلة الوظيفية والطاقوية وحساب تكلفة فاتورة الكهرباء والغاز.',
        keyPoints: ['أشكال الطاقة وأنماط التحويل', 'الحصيلة الطاقوية ومبدأ انحفاظ الطاقة', 'الاستطاعة P = U × I والطاقة E = P × t (kWh)'],
      },
      {
        id: 'phy_3am_t3',
        trimester: 'T3',
        title: 'التيار الكهربائي المستمر: الشدة، التوتر وقانون أوم',
        competency: 'قياس الشدة والتوتر وتطبيق قوانين الشدات والتوترات وقانون أوم.',
        keyPoints: ['جهاز الأمبيرمتر على التسلسل والفولتمتر على التفرع', 'قوانين الشدة والتوتر في التسلسل والتفرع', 'شفرة الألوان للمقاومة وقانون أوم U = R × I'],
      },
    ],
    '4AM': [
      {
        id: 'phy_4am_t1',
        trimester: 'T1',
        title: 'الظواهر الكهربائية: التكهرب، التيار المتناوب والأمن الكهربائي',
        competency: 'تفسير التكهرب وقراءة راسم الاهتزاز المهبطي وتأمين الشبكة الكهربائية المنزلية.',
        keyPoints: ['بنية الذرة والشحنة الكهربائية', 'التوتر الأعظمي Umax والفعال Ueff والدور T والتواتر f', 'المأخذ الأرضي، القاطع التفاضلي والمنصهرة'],
      },
      {
        id: 'phy_4am_t2',
        trimester: 'T2',
        title: 'المادة وتحولاتها: المحاليل الشاردية وتفاعلات الأحماض مع المعادن',
        competency: 'الكشف عن الشوارد وكتابة وموازنة المعادلات الكيميائية بالصيغة الشاردية والإحصائية.',
        keyPoints: ['التحليل الكهربائي البسيط لمحلول شاردي', 'تفاعل حمض كلور الماء HCl مع الحديد والزنك والألمنيوم', 'الكشف عن الشوارد (Cl⁻, Cu²⁺, Fe²⁺, SO₄²⁻)'],
      },
      {
        id: 'phy_4am_t3',
        trimester: 'BEM',
        title: 'الميكانيك والضوء: القوى، الثقل، التوازن، دافعة أرخميدس والمرايا (BEM)',
        competency: 'تمثيل القوى وحل وضعيات توازن جسم صلب ودافعة أرخميدس استعداداً لشهادة BEM.',
        keyPoints: ['الجملة الميكانيكية ومبدأ الفعلين المتبادلين', 'علاقة الثقل بالكتلة P = m × g', 'شرطا توازن جسم خاضع لقوتين أو ثلاث قوى', 'دافعة أرخميدس (Fa = ρ·V·g) وقوانين الانعكاس'],
      },
    ],
  },
  Arabe: {
    '1AM': [
      {
        id: 'ar_1am_t1',
        trimester: 'T1',
        title: 'المقطع 1: الحياة العائلية والمقطع 2: حب الوطن',
        competency: 'فهم النصوص السردية والوصفية وتوظيف الضمائر والأزمنة.',
        keyPoints: ['الضمير وأنواعه', 'أقسام الفعل (الماضي، المضارع، الأمر)', 'علامات الترقيم والهمزة', 'إنتاج نص وصفي سردي'],
      },
      {
        id: 'ar_1am_t2',
        trimester: 'T2',
        title: 'المقطع 3: عظماء الإنسانية والمقطع 4: الأخلاق والمجتمع',
        competency: 'تلخيص سير الشخصيات وتوظيف كان وأخواتها وإن وأخواتها.',
        keyPoints: ['الفعل الصحيح والفعل المعتل', 'النواسخ (كان وأخواتها، إن وأخواتها)', 'النعت الحقيقي والتشبيه البليغ'],
      },
    ],
    '2AM': [
      {
        id: 'ar_2am_t1',
        trimester: 'T1',
        title: 'المقطع 1: الحياة العائلية والمقطع 2: حب الوطن والتاريخ',
        competency: 'إنتاج نصوص حوارية وتوجيهية وتوظيف حروف العطف والنداء.',
        keyPoints: ['الاسم المقصور والمنقوص والممدود', 'الأفعال الخمسة وإعرابها', 'حروف العطف والنداء', 'الاستعارة والطباق'],
      },
      {
        id: 'ar_2am_t2',
        trimester: 'T2',
        title: 'المقطع 3: الطبيعة والبيئة والمقطع 4: العلم والاكتشافات',
        competency: 'استثمار النصوص الحوارية والتفسيرية باحترام القواعد الصرفية.',
        keyPoints: ['الفعل المجرد والمزيد', 'نصب وجزم الفعل المضارع', 'التشبيه والجناس والسجع'],
      },
    ],
    '3AM': [
      {
        id: 'ar_3am_t1',
        trimester: 'T1',
        title: 'المقطع 1: الآفات الاجتماعية والمقطع 2: الإعلام والمجتمع',
        competency: 'بناء نصوص تفسيرية وحجاجية مع توظيف أساليب الشرط والتوكيد.',
        keyPoints: ['اسم الفاعل واسم المفعول', 'بناء الفعل الماضي والمضارع', 'أدوات الشرط غير الجازمة', 'الكناية والمقابلة'],
      },
      {
        id: 'ar_3am_t2',
        trimester: 'T2',
        title: 'المقطع 3: التضامن الإنساني والمقطع 4: شعوب العالم',
        competency: 'تحرير مقالات تفسيرية حول التضامن والتنوع الثقافي.',
        keyPoints: ['أفعال الشروع والمقاربة والرجاء', 'الصفة المشبهة باسم الفاعل', 'حروف المعاني (القسم، النفي، التوكيد)'],
      },
    ],
    '4AM': [
      {
        id: 'ar_4am_t1',
        trimester: 'T1',
        title: 'المقطع 1: قضايا اجتماعية والمقطع 2: الإعلام والمجتمع (BEM)',
        competency: 'فهم المنطوق والمكتوب وإتقان الجمل التي لها محل من الإعراب.',
        keyPoints: ['عطف النسق وعطف البيان', 'البدل وأنواعه', 'العدد والمعدود وإعرابه', 'الجملة الواقعة مفعولاً به ونعتاً'],
      },
      {
        id: 'ar_4am_t2',
        trimester: 'BEM',
        title: 'المقطع 3: التضامن والبيئة والتحضير لشهادة التعليم المتوسط',
        competency: 'تحرير وضعية إدماجية متكاملة (حجاج وتفسير) وحل مواضيع شهادة التعليم المتوسط.',
        keyPoints: ['الممنوع من الصرف', 'الجملة الواقعة حالاً ومضافاً إليه', 'الاستعارة المكنية والتصريحية', 'تدريب على مواضيع BEM (20/20)'],
      },
    ],
  },
};

export function buildSubjectStarterContent(params: {
  subject: SubjectType;
  level: LevelType;
  docType: 'cours' | 'fiche' | 'examen' | 'devoir' | 'exercice';
  language: 'fr' | 'ar' | 'en';
  topicTitle: string;
}): { title: string; contentMarkdown: string; svgDiagram: string } {
  const { subject, level, docType, language, topicTitle } = params;

  if (language === 'en') {
    const typeTitle =
      docType === 'fiche'
        ? 'Lesson Plan (Fiche Pédagogique)'
        : docType === 'examen'
          ? 'Term Exam'
          : docType === 'devoir'
            ? 'Class Test'
            : docType === 'exercice'
              ? 'Practice Worksheet'
              : 'Lesson Summary';
    return {
      title: `${typeTitle} — ${topicTitle} (${level})`,
      svgDiagram: '',
      contentMarkdown: `## ${topicTitle}

| Pedagogical Element | Details |
| :--- | :--- |
| **Level** | ${level} (Algerian Middle School) |
| **Subject** | English |
| **Document Type** | ${typeTitle} |

### Learning Objectives & Procedure

1. **Warm-up:** Activate prior knowledge related to **${topicTitle}**.
2. **Presentation & Discovery (PIASP):** Contextualised text, comprehension check, and language isolation.
3. **Practice & Integration:** Graded tasks and situation of integration.

*Click **« Générer avec l’Enseignant IA »** to produce the complete ${level} English ${typeTitle.toLowerCase()} with answer key and marking scale.*`,
    };
  }

  if (language === 'fr') {
    const typeTitle =
      docType === 'fiche'
        ? 'Fiche Pédagogique'
        : docType === 'examen'
          ? 'Composition Trimestrielle'
          : docType === 'devoir'
            ? 'Devoir Surveillé'
            : docType === 'exercice'
              ? 'Série d’Exercices'
              : 'Cours Structuré';
    return {
      title: `${typeTitle} — ${topicTitle} (${level})`,
      svgDiagram: '',
      contentMarkdown: `## ${topicTitle}

| Élément pédagogique | Détail |
| :--- | :--- |
| **Niveau** | ${level} (CEM Algérie) |
| **Matière** | ${subject} |
| **Type** | ${typeTitle} |

### Déroulement prévu

1. **Mise en situation :** Découverte du thème **${topicTitle}**.
2. **Analyse & Construction :** Observation, manipulation des outils linguistiques et structuration.
3. **Réinvestissement / Évaluation :** Exercices ciblés et situation d’intégration.

*Cliquez sur **« Générer avec l’Enseignant IA »** pour rédiger l’intégralité du document avec corrigé type et barème.*`,
    };
  }

  // Arabic (Mathématiques, Sciences Naturelles, Physique, Arabe)
  const typeAr =
    docType === 'fiche'
      ? 'مذكرة بيداغوجية'
      : docType === 'examen'
        ? 'اختبار الثلاثي'
        : docType === 'devoir'
          ? 'فرض محروس'
          : docType === 'exercice'
            ? 'سلسلة تمارين'
            : 'ملخص الدرس';

  return {
    title: `${typeAr} — ${topicTitle} (${level})`,
    svgDiagram: '',
    contentMarkdown: `## ${topicTitle}

| العنصر البيداغوجي | التوضيح |
| :--- | :--- |
| **المستوى** | ${level} (التعليم المتوسط) |
| **المادة** | ${SUBJECT_META[subject].labelAr} |
| **نوع الوثيقة** | ${typeAr} |

### العناصر الأساسية

1. **الوضعية الانطلاقية:** تقديم المشكل العلمي أو المعرفي المرتبط بـ **${topicTitle}**.
2. **سير الحصة / الأنشطة:** بناء المفاهيم، تطبيقات تدريجية، ثم الوضعية الإدماجية.
3. **التقويم والتصحيح:** شبكة التقييم وسلّم التنقيط على 20.

*اضغط على زر **« Générer avec l’Enseignant IA »** لإنتاج الوثيقة الكاملة مع الحل النموذجي وسلّم التنقيط.*`,
  };
}

