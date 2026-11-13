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
    defaultLang: 'fr',
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
    title: 'Théorème de Pythagore & Repère',
    subject: 'Mathématiques',
    levelHint: '3AM · 4AM',
    imagePath: '/src/assets/images/cem_math_geometry_1794587444122.jpg',
    caption: 'Triangle rectangle, relation a² + b² = c² et repère orthonormé.',
  },
  {
    id: 'asset_physics_circuit',
    title: 'Circuit électrique & Prisme optique',
    subject: 'Physique',
    levelHint: '1AM · 3AM · 4AM',
    imagePath: '/src/assets/images/cem_physics_circuit_1794587443600.jpg',
    caption: 'Montage en série avec ampèremètre, résistance et dispersion de la lumière.',
  },
  {
    id: 'asset_science_bio',
    title: 'Cellule végétale & Photosynthèse',
    subject: 'Sciences Naturelles',
    levelHint: '1AM · 2AM · 4AM',
    imagePath: '/src/assets/images/cem_science_biology_1794587444405.jpg',
    caption: 'Structure cellulaire verte et coupe transversale de feuille (stomates, xylème).',
  },
  {
    id: 'asset_lang_desk',
    title: 'Cahiers trilingues FR · AR · EN',
    subject: 'Français',
    levelHint: '1AM – 4AM',
    imagePath: '/src/assets/images/cem_languages_library_1794587445743.jpg',
    caption: 'Supports d’écriture manuscrite et manuels de langues pour le cycle moyen.',
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
        title: 'Nombres entiers, décimaux & Droites parallèles/perpendiculaires',
        competency: 'Comparer, encadrer des décimaux et tracer des figures géométriques de base.',
        keyPoints: ['Écriture fractionnaire et décimale', 'Ordre et droite graduée', 'Perpendicularité et parallélisme', 'Médiatrice d’un segment'],
      },
      {
        id: 'math_1am_t2',
        trimester: 'T2',
        title: 'Division euclidienne, Fractions & Angles / Triangles',
        competency: 'Calculer avec les fractions simples et construire triangles et bissectrices.',
        keyPoints: ['Critères de divisibilité', 'Addition et multiplication par une fraction', 'Mesure et construction d’angles', 'Symétrie axiale'],
      },
      {
        id: 'math_1am_t3',
        trimester: 'T3',
        title: 'Proportionnalité, Périmètres, Aires & Pavé droit',
        competency: 'Résoudre des problèmes de proportionnalité, pourcentages et géométrie.',
        keyPoints: ['Tableaux de proportionnalité & échelles', 'Aire du rectangle, triangle et disque', 'Repérage dans le plan', 'Volume du pavé droit et cube'],
      },
    ],
    '2AM': [
      {
        id: 'math_2am_t1',
        trimester: 'T1',
        title: 'Enchaînement d’opérations & Constructions géométriques',
        competency: 'Respecter les priorités opératoires et utiliser la distributivité.',
        keyPoints: ['Priorités avec et sans parenthèses', 'Distributivité k(a+b)', 'Angles alternes-internes / correspondants', 'Symétrie centrale et propriétés'],
      },
      {
        id: 'math_2am_t2',
        trimester: 'T2',
        title: 'Nombres relatifs & Parallélogrammes',
        competency: 'Additionner/soustraire les relatifs et démontrer qu’un quadrilatère est un parallélogramme.',
        keyPoints: ['Comparaison et repérage des relatifs', 'Somme algébrique', 'Somme des angles d’un triangle (180°)', 'Parallélogramme, losange, rectangle, carré'],
      },
      {
        id: 'math_2am_t3',
        trimester: 'T3',
        title: 'Calcul littéral (Initiation), Équations & Prisme/Cylindre',
        competency: 'Tester une égalité, résoudre ax = b et calculer l’aire latérale d’un cylindre.',
        keyPoints: ['Expression littérale simple', 'Proportionnalité & vitesse moyenne', 'Statistiques (effectifs, fréquences)', 'Prisme droit et cylindre de révolution'],
      },
    ],
    '3AM': [
      {
        id: 'math_3am_t1',
        trimester: 'T1',
        title: 'Nombres relatifs (Produit/Quotient), Rationnels & Cas d’égalité des triangles',
        competency: 'Calculer avec des nombres rationnels et démontrer l’égalité de deux triangles.',
        keyPoints: ['Règle des signes (multiplication/division)', 'Opérations sur les fractions', 'Droite des milieux dans un triangle', 'Petit théorème de Thalès'],
      },
      {
        id: 'math_3am_t2',
        trimester: 'T2',
        title: 'Puissances de 10, Calcul littéral & Triangle rectangle',
        competency: 'Utiliser l’écriture scientifique, développer et appliquer Pythagore.',
        keyPoints: ['Puissances d’exposant positif et négatif', 'Double distributivité (a+b)(c+d)', 'Théorème de Pythagore et réciproque', 'Cercle circonscrit & Cosinus d’un angle aigu'],
      },
      {
        id: 'math_3am_t3',
        trimester: 'T3',
        title: 'Équations du 1er degré, Ordre & Pyramide / Cône',
        competency: 'Résoudre des problèmes par mise en équation et représenter des solides.',
        keyPoints: ['Résolution d’équations ax+b = cx+d', 'Inégalités et opérations', 'Statistiques (moyenne pondérée)', 'Volume de la pyramide et du cône'],
      },
    ],
    '4AM': [
      {
        id: 'math_4am_t1',
        trimester: 'T1',
        title: 'PGCD, Racines carrées & Théorème de Thalès / Trigonométrie',
        competency: 'Calculer le PGCD, simplifier √a et utiliser Thalès et sin/cos/tan.',
        keyPoints: ['Algorithme d’Euclide & fractions irréductibles', 'Calculs sur les radicaux (a√b)', 'Thalès et sa réciproque', 'Relations trigonométriques (cos²x + sin²x = 1)'],
      },
      {
        id: 'math_4am_t2',
        trimester: 'T2',
        title: 'Calcul littéral, Identités remarquables, Équations & Vecteurs',
        competency: 'Développer, factoriser, résoudre des équations-produits et calculer avec les vecteurs.',
        keyPoints: ['(a+b)², (a-b)², a²-b²', 'Équation produit nul (ax+b)(cx+d)=0', 'Inéquations du 1er degré', 'Vecteurs, translation et coordonnées dans un repère'],
      },
      {
        id: 'math_4am_t3',
        trimester: 'BEM',
        title: 'Systèmes d’équations, Fonctions linéaires/affines & Préparation BEM',
        competency: 'Résoudre un système 2×2, modéliser par fonction affine et traiter le problème BEM.',
        keyPoints: ['Substitution et combinaison linéaire', 'Représentation graphique y = ax + b', 'Médiane et moyenne statistiques', 'Rotation, polygones réguliers et sphère'],
      },
    ],
  },
  'Sciences Naturelles': {
    '1AM': [
      {
        id: 'snv_1am_t1',
        trimester: 'T1',
        title: 'L’alimentation chez l’Homme & Nutrition chez la plante verte',
        competency: 'Classifier les aliments et déterminer les besoins nutritifs des végétaux chlorophylliens.',
        keyPoints: ['Origine et rôle des aliments (plastiques, énergétiques)', 'Ration alimentaire équilibrée', 'Absorption des sels minéraux (poils absorbants)', 'Photosynthèse et sève élaborée'],
      },
      {
        id: 'snv_1am_t2',
        trimester: 'T2',
        title: 'La respiration & L’excrétion chez les êtres vivants',
        competency: 'Expliquer les échanges gazeux respiratoires et le rôle du rein.',
        keyPoints: ['Alvéoles pulmonaires et hémoglobine', 'Hygiène de l’appareil respiratoire', 'Fermentation alcoolique chez la levure', 'Élimination de l’urée et régulation'],
      },
      {
        id: 'snv_1am_t3',
        trimester: 'T3',
        title: 'La cellule & La reproduction sexuée chez les végétaux/animaux',
        competency: 'Identifier les constituants cellulaires et le mécanisme de la fécondation.',
        keyPoints: ['Observation microscopique de la cellule', 'Fécondation interne et externe', 'Fleur, pollen et formation de la graine'],
      },
    ],
    '2AM': [
      {
        id: 'snv_2am_t1',
        trimester: 'T1',
        title: 'Le milieu de vie & Les relations trophiques (Écosystème)',
        competency: 'Analyser les composantes d’un écosystème et les chaînes alimentaires.',
        keyPoints: ['Facteurs biotiques et abiotiques', 'Chaînes et réseaux trophiques', 'Biomasse et équilibre écologique'],
      },
      {
        id: 'snv_2am_t2',
        trimester: 'T2',
        title: 'Adaptation des êtres vivants aux milieux & Respiration aquatique/aérienne',
        competency: 'Relier les structures morphologiques aux modes de locomotion et de respiration.',
        keyPoints: ['Adaptation au milieu désertique', 'Respiration branchiale, trachéenne et cutanée', 'Modes de déplacement (nage, saut, vol)'],
      },
      {
        id: 'snv_2am_t3',
        trimester: 'T3',
        title: 'Reproduction, peuplement des milieux & Classification',
        competency: 'Expliquer les stratégies de reproduction et la classification moderne.',
        keyPoints: ['Stratégies r et K', 'Dissémination des graines et spores', 'Notion d’espèce et critères de classification'],
      },
    ],
    '3AM': [
      {
        id: 'snv_3am_t1',
        trimester: 'T1',
        title: 'Géodynamique interne : Séismes, Volcans & Tectonique des plaques',
        competency: 'Expliquer l’origine des séismes et la dérive des continents.',
        keyPoints: ['Foyer, épicentre, ondes sismiques', 'Dorsales océaniques et subduction', 'Structure interne du globe (lithosphère/asthénosphère)', 'Prévention des risques sismiques'],
      },
      {
        id: 'snv_3am_t2',
        trimester: 'T2',
        title: 'Géodynamique externe : Roches, Érosion & Paysages géologiques',
        competency: 'Relier la nature des roches algériennes à l’évolution des reliefs.',
        keyPoints: ['Propriétés physico-chimiques des roches', 'Action de l’eau, du vent et des variations thermiques', 'Ressources naturelles en Algérie (pétrole, nappes)'],
      },
      {
        id: 'snv_3am_t3',
        trimester: 'T3',
        title: 'Le sol : formation, propriétés et protection',
        competency: 'Sensibiliser à la préservation du sol agricole contre la désertification.',
        keyPoints: ['Constituants minéraux et organiques (humus)', 'Érosion des sols et barrage vert'],
      },
    ],
    '4AM': [
      {
        id: 'snv_4am_t1',
        trimester: 'T1',
        title: 'Nutrition chez l’Homme : Digestion, Absorption & Transport sanguin',
        competency: 'Expliquer la transformation enzymatique des aliments et leur distribution cellulaire.',
        keyPoints: ['Enzymes digestives (amylase, protéase, lipase)', 'Villosités intestinales et voie sanguine/lymphatique', 'Rôle des globules rouges et respiration cellulaire'],
      },
      {
        id: 'snv_4am_t2',
        trimester: 'T2',
        title: 'Coordination nerveuse & Réponse immunitaire',
        competency: 'Analyser l’arc réflexe, les organes sensoriels et les défenses de l’organisme.',
        keyPoints: ['Neurone, synapse et message nerveux', 'Aires corticales et effets des drogues', 'Barrières naturelles, phagocytose, lymphocytes B/T', 'Vaccination, sérothérapie et allergies'],
      },
      {
        id: 'snv_4am_t3',
        trimester: 'BEM',
        title: 'Transmission des caractères héréditaires & Synthèse BEM',
        competency: 'Expliquer la formation des gamètes, le caryotype et les maladies génétiques.',
        keyPoints: ['Caryotype humain (46 chromosomes)', 'Méiose et fécondation', 'Trisomie 21 et hérédité liée au sexe', 'Sujets BEM avec analyse de courbes et expériences'],
      },
    ],
  },
  Physique: {
    '1AM': [
      {
        id: 'phy_1am_t1',
        trimester: 'T1',
        title: 'L’électricité : Circuit électrique simple, Série & Dérivation',
        competency: 'Réaliser des montages électriques et respecter les règles de sécurité.',
        keyPoints: ['Schématisation normalisée', 'Conducteurs et isolants', 'Montage en série, en dérivation et va-et-vient', 'Court-circuit et rôle du fusible'],
      },
      {
        id: 'phy_1am_t2',
        trimester: 'T2',
        title: 'La matière : Grandeurs physiques, États & Changements d’état',
        competency: 'Mesurer masse, volume, masse volumique et expliquer les changements d’état.',
        keyPoints: ['Masse, volume et masse volumique (ρ = m/V)', 'Modèle particulaire des 3 états', 'Fusion, vaporisation, liquéfaction', 'Mélanges homogènes/hétérogènes et séparation'],
      },
      {
        id: 'phy_1am_t3',
        trimester: 'T3',
        title: 'L’optique : Propagation rectiligne de la lumière & Phases lunaires',
        competency: 'Expliquer l’ombre, la pénombre et les éclipses.',
        keyPoints: ['Sources lumineuses primaires et secondaires', 'Faisceau lumineux et ombre portée', 'Système Soleil-Terre-Lune'],
      },
    ],
    '2AM': [
      {
        id: 'phy_2am_t1',
        trimester: 'T1',
        title: 'La matière et ses transformations : Physique vs Chimique & Atomes',
        competency: 'Distinguer transformation physique et chimique et modéliser les molécules.',
        keyPoints: ['Conservation de la masse (Lavoisier)', 'Électrolyse de l’eau', 'Symboles chimiques et modèles moléculaires'],
      },
      {
        id: 'phy_2am_t2',
        trimester: 'T2',
        title: 'Mécanique : Mouvement, Trajectoire & Vitesse',
        competency: 'Décrire la relativité du mouvement et calculer la vitesse moyenne.',
        keyPoints: ['Référentiel d’étude', 'Mouvements rectiligne, circulaire, curviligne', 'Vitesse uniforme, accélérée, décélérée (v = d/t)', 'Transmission du mouvement (poulies, engrenages)'],
      },
      {
        id: 'phy_2am_t3',
        trimester: 'T3',
        title: 'Les aimants et le champ magnétique',
        competency: 'Identifier les pôles magnétiques et l’effet d’un courant sur une aiguille aimantée.',
        keyPoints: ['Attraction/répulsion magnétique', 'Spectre magnétique et boussole', 'Électroaimant (expérience d’Oersted)'],
      },
    ],
    '3AM': [
      {
        id: 'phy_3am_t1',
        trimester: 'T1',
        title: 'Réactions chimiques & Équilibrage d’équations',
        competency: 'Écrire et équilibrer des équations chimiques (combustion des alcanes).',
        keyPoints: ['Combustion complète et incomplète du méthane/butane', 'Facteurs influençant la réaction chimique', 'Conservation des atomes'],
      },
      {
        id: 'phy_3am_t2',
        trimester: 'T2',
        title: 'Chaîne énergétique & Puissance / Énergie électrique',
        competency: 'Construire une chaîne énergétique et calculer la facture d’électricité.',
        keyPoints: ['Formes et modes de transfert d’énergie', 'Bilan énergétique', 'Puissance P = U × I et Énergie E = P × t (kWh)'],
      },
      {
        id: 'phy_3am_t3',
        trimester: 'T3',
        title: 'Courant continu : Intensité, Tension & Loi d’Ohm',
        competency: 'Mesurer I et U et appliquer les lois des nœuds, des mailles et U = R × I.',
        keyPoints: ['Ampèremètre en série, voltmètre en dérivation', 'Lois d’additivité et d’unicité', 'Code des couleurs des résistances et loi d’Ohm'],
      },
    ],
    '4AM': [
      {
        id: 'phy_4am_t1',
        trimester: 'T1',
        title: 'Électrisation, Courant alternatif & Sécurité électrique',
        competency: 'Expliquer l’électrisation, l’oscillogramme d’une tension alternative et les protections.',
        keyPoints: ['Modèle de l’atome et charge électrique', 'Tension max Umax, efficace Ueff, période T et fréquence f', 'Prise de terre, disjoncteur différentiel et fusible'],
      },
      {
        id: 'phy_4am_t2',
        trimester: 'T2',
        title: 'Solutions ioniques, pH & Réactions acide/métal',
        competency: 'Identifier les ions (Cl⁻, Cu²⁺, Fe²⁺, SO₄²⁻) et équilibrer les équations ioniques.',
        keyPoints: ['Électrolyse d’une solution ionique', 'Réaction HCl avec Fe, Zn, Al', 'Réaction acide-calcaire (CaCO₃)'],
      },
      {
        id: 'phy_4am_t3',
        trimester: 'BEM',
        title: 'Mécanique : Forces, Poids, Équilibre & Poussée d’Archimède (BEM)',
        competency: 'Représenter les forces (P, R, T, Fa) et résoudre des situations d’équilibre BEM.',
        keyPoints: ['Action mécanique et principe des actions réciproques', 'Relation P = m × g', 'Condition d’équilibre d’un solide soumis à 2 ou 3 forces', 'Poussée d’Archimède (Fa = ρ·V·g) et optique (miroir plan)'],
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
