// Utilitaires de normalisation des matières

export const SUBJECT_SYNONYMS = {
  'math': 'Mathématiques',
  'maths': 'Mathématiques',
  'mathematiques': 'Mathématiques',
  'hg': 'Histoire-Géographie',
  'histoire geo': 'Histoire-Géographie',
  'histoire géo': 'Histoire-Géographie',
  'fr': 'Français',
  'ang': 'Anglais',
};

export const normalizeSubject = (name) => {
  if (!name) return '';
  const key = name.toString().trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[-_]/g, ' ');
  return SUBJECT_SYNONYMS[key] || name.toString().trim();
};

export const normalizeGradesSubjects = (grades) => {
  if (!Array.isArray(grades)) return [];
  return grades.map(g => ({
    ...g,
    subject: normalizeSubject(g.subject || ''),
  }));
};