// Utilitaires pour la gestion et validation des noms d'élèves

/**
 * Normalise un nom (prénom ou nom de famille)
 * @param {string} name - Nom brut
 * @returns {string} - Nom normalisé
 */
export const normalizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .replace(/\s+/g, ' ') // Remplacer les espaces multiples
    .replace(/[^\p{L}\s'-]/gu, '') // Garder seulement lettres, espaces, apostrophes et tirets
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Valide si un nom est acceptable
 * @param {string} name - Nom à valider
 * @returns {boolean} - True si valide
 */
export const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  
  const normalized = normalizeName(name);
  return normalized.length >= 2 && normalized.length <= 50;
};

/**
 * Extrait les noms à partir de différents formats
 * @param {string} fullName - Nom complet dans différents formats
 * @returns {Object} - {firstName: string, lastName: string}
 */
export const parseFullName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' };
  }
  
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  
  // Patterns pour différents formats
  const patterns = [
    // "Nom: DUPONT Prénom: Jean"
    /nom[:\s]*([^\s]+).*prénom[:\s]*([^\s]+)/i,
    // "Prénom: Jean Nom: DUPONT"
    /prénom[:\s]*([^\s]+).*nom[:\s]*([^\s]+)/i,
    // "Élève: Jean DUPONT"
    /élève[:\s]*([^\s]+)\s+([^\s]+)/i,
    // "Étudiant: Jean DUPONT"
    /étudiant[:\s]*([^\s]+)\s+([^\s]+)/i,
    // "DUPONT Jean" (nom en majuscules en premier)
    /^([A-Z]{2,})\s+([A-Za-z]+)$/,
    // "Jean DUPONT" (prénom en premier, nom en majuscules)
    /^([A-Za-z]+)\s+([A-Z]{2,})$/,
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let firstName, lastName;
      
      if (pattern.source.includes('nom.*prénom')) {
        lastName = match[1];
        firstName = match[2];
      } else if (pattern.source.includes('prénom.*nom')) {
        firstName = match[1];
        lastName = match[2];
      } else if (pattern.source.includes('^([A-Z]{2,})')) {
        // Nom en majuscules en premier
        lastName = match[1];
        firstName = match[2];
      } else {
        // Prénom en premier par défaut
        firstName = match[1];
        lastName = match[2];
      }
      
      return {
        firstName: normalizeName(firstName),
        lastName: normalizeName(lastName)
      };
    }
  }
  
  // Fallback: diviser par espaces
  const parts = cleaned.split(' ').filter(part => part.length > 0);
  if (parts.length >= 2) {
    // Si le premier mot est en majuscules, c'est probablement le nom
    if (parts[0] === parts[0].toUpperCase() && parts[0].length > 2) {
      return {
        firstName: normalizeName(parts.slice(1).join(' ')),
        lastName: normalizeName(parts[0])
      };
    } else {
      // Sinon, prénom en premier
      return {
        firstName: normalizeName(parts[0]),
        lastName: normalizeName(parts.slice(1).join(' '))
      };
    }
  } else if (parts.length === 1) {
    // Un seul mot, on ne peut pas deviner
    return {
      firstName: normalizeName(parts[0]),
      lastName: ''
    };
  }
  
  return { firstName: '', lastName: '' };
};

/**
 * Formate un nom complet pour l'affichage
 * @param {string} firstName - Prénom
 * @param {string} lastName - Nom de famille
 * @returns {string} - Nom complet formaté
 */
export const formatFullName = (firstName, lastName) => {
  const normalizedFirst = normalizeName(firstName);
  const normalizedLast = normalizeName(lastName);
  
  if (normalizedFirst && normalizedLast) {
    return `${normalizedFirst} ${normalizedLast}`;
  } else if (normalizedFirst) {
    return normalizedFirst;
  } else if (normalizedLast) {
    return normalizedLast;
  }
  
  return 'Nom non spécifié';
};

/**
 * Vérifie si deux noms sont similaires (pour éviter les doublons)
 * @param {Object} name1 - {firstName, lastName}
 * @param {Object} name2 - {firstName, lastName}
 * @returns {boolean} - True si similaires
 */
export const areNamesSimilar = (name1, name2) => {
  if (!name1 || !name2) return false;
  
  const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, '');
  
  const first1 = normalize(name1.firstName || '');
  const last1 = normalize(name1.lastName || '');
  const first2 = normalize(name2.firstName || '');
  const last2 = normalize(name2.lastName || '');
  
  // Vérifier correspondance exacte
  if (first1 === first2 && last1 === last2) return true;
  
  // Vérifier correspondance inversée (prénom/nom inversés)
  if (first1 === last2 && last1 === first2) return true;
  
  // Vérifier similarité avec distance de Levenshtein simple
  const similarity = (a, b) => {
    if (a.length === 0 || b.length === 0) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };
  
  const firstSimilarity = similarity(first1, first2);
  const lastSimilarity = similarity(last1, last2);
  
  return firstSimilarity > 0.8 && lastSimilarity > 0.8;
};

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * @param {string} a - Première chaîne
 * @param {string} b - Deuxième chaîne
 * @returns {number} - Distance de Levenshtein
 */
const levenshteinDistance = (a, b) => {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
};

/**
 * Suggère des corrections pour des noms mal reconnus
 * @param {string} recognizedName - Nom reconnu par l'OCR
 * @param {Array} existingNames - Liste des noms existants
 * @returns {Array} - Suggestions de correction
 */
export const suggestNameCorrections = (recognizedName, existingNames = []) => {
  if (!recognizedName || !Array.isArray(existingNames)) return [];
  
  const parsed = parseFullName(recognizedName);
  const suggestions = [];
  
  existingNames.forEach(existing => {
    if (areNamesSimilar(parsed, existing)) {
      suggestions.push({
        suggestion: formatFullName(existing.firstName, existing.lastName),
        confidence: 0.8,
        reason: 'Nom similaire existant'
      });
    }
  });
  
  return suggestions.slice(0, 3); // Limiter à 3 suggestions
};

export default {
  normalizeName,
  isValidName,
  parseFullName,
  formatFullName,
  areNamesSimilar,
  suggestNameCorrections
};