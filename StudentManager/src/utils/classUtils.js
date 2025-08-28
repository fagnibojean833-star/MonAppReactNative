// Utilitaires pour la gestion automatique des classes

/**
 * Normalise le nom d'une classe pour éviter les doublons
 * @param {string} className - Nom de classe brut
 * @returns {string} - Nom de classe normalisé
 */
export const normalizeClassName = (className) => {
  if (!className || typeof className !== 'string') return '';
  
  return className
    .trim()
    .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
    .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux sauf tirets
    .toUpperCase(); // Uniformiser en majuscules
};

/**
 * Extrait et normalise les classes à partir d'une liste d'élèves
 * @param {Array} students - Liste des élèves avec leurs classes
 * @returns {Array} - Liste des classes uniques normalisées
 */
export const extractUniqueClasses = (students) => {
  if (!Array.isArray(students)) return [];
  
  const classes = students
    .map(student => normalizeClassName(student.className))
    .filter(className => className.length > 0);
  
  return [...new Set(classes)].sort();
};

/**
 * Suggère une classe basée sur des patterns communs
 * @param {string} detectedText - Texte détecté par l'OCR
 * @returns {string} - Classe suggérée ou chaîne vide
 */
export const suggestClassFromText = (detectedText) => {
  if (!detectedText || typeof detectedText !== 'string') return '';
  
  const text = detectedText.toLowerCase();
  
  // Patterns pour détecter les classes
  const classPatterns = [
    // Formats français
    /classe[:\s]*([a-z0-9]+)/i,
    /niveau[:\s]*([a-z0-9]+)/i,
    /section[:\s]*([a-z0-9]+)/i,
    // Formats numériques
    /([0-9]+)[èe]me/i,
    /([0-9]+)e/i,
    // Formats avec lettres
    /([0-9]+[a-z])/i,
    // Formats spéciaux
    /(cp|ce[12]|cm[12]|6[èe]me|5[èe]me|4[èe]me|3[èe]me|2nde|1[èe]re|terminale)/i
  ];
  
  for (const pattern of classPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return normalizeClassName(match[1]);
    }
  }
  
  return '';
};

/**
 * Valide si un nom de classe est valide
 * @param {string} className - Nom de classe à valider
 * @returns {boolean} - True si valide
 */
export const isValidClassName = (className) => {
  if (!className || typeof className !== 'string') return false;
  
  const normalized = normalizeClassName(className);
  return normalized.length > 0 && normalized.length <= 20;
};

/**
 * Formate un nom de classe pour l'affichage
 * @param {string} className - Nom de classe brut
 * @returns {string} - Nom de classe formaté pour l'affichage
 */
export const formatClassNameForDisplay = (className) => {
  if (!className) return 'Non spécifiée';
  
  const normalized = normalizeClassName(className);
  if (!normalized) return 'Non spécifiée';
  
  // Capitaliser la première lettre de chaque mot
  return normalized
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Crée des options de picker pour les classes
 * @param {Array} classes - Liste des classes
 * @param {boolean} includeEmpty - Inclure une option vide
 * @returns {Array} - Options formatées pour le picker
 */
export const createClassPickerOptions = (classes, includeEmpty = true) => {
  const options = [];
  
  if (includeEmpty) {
    options.push({ label: 'Sélectionnez une classe', value: '' });
  }
  
  const uniqueClasses = extractUniqueClasses(
    classes.map(c => ({ className: c }))
  );
  
  uniqueClasses.forEach(className => {
    options.push({
      label: formatClassNameForDisplay(className),
      value: className
    });
  });
  
  return options;
};

export default {
  normalizeClassName,
  extractUniqueClasses,
  suggestClassFromText,
  isValidClassName,
  formatClassNameForDisplay,
  createClassPickerOptions
};