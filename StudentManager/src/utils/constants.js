// Constantes pour l'application
export const APP_CONSTANTS = {
  MAX_NAME_LENGTH: 100,
  MIN_AGE: 1,
  MAX_AGE: 150,
  DEFAULT_AGE: 7,
  GRADE_SCALE_10: '10',
  GRADE_SCALE_20: '20',
  DEFAULT_GRADE_SCALE: '20',
};

// Classes disponibles
export const AVAILABLE_CLASSES = [
  { label: 'Sélectionnez une classe', value: '' },
  { label: 'CP1', value: 'CP1' },
  { label: 'CP2', value: 'CP2' },
  { label: 'CE1', value: 'CE1' },
  { label: 'CE2', value: 'CE2' },
  { label: 'CM1', value: 'CM1' },
  { label: 'CM2', value: 'CM2' },
  { label: 'CEI', value: 'CEI' }
];

// Matières par défaut
export const DEFAULT_SUBJECTS = [
  { id: 1, name: 'Mathématiques' },
  { id: 2, name: 'Français' },
  { id: 3, name: 'Histoire-Géographie' },
  { id: 4, name: 'Sciences' },
  { id: 5, name: 'Anglais' }
];

// Couleurs pour les notes
export const GRADE_COLORS = {
  EXCELLENT: '#28a745', // >= 16
  VERY_GOOD: '#20c997', // >= 14
  GOOD: '#17a2b8',      // >= 12
  PASSABLE: '#ffc107',  // >= 10
  INSUFFICIENT: '#dc3545' // < 10
};

// Couleurs pour les rangs
export const RANK_COLORS = {
  GOLD: '#ffd700',    // 1er
  SILVER: '#c0c0c0',  // 2ème
  BRONZE: '#cd7f32',  // 3ème
  DEFAULT: '#007bff'  // Autres
};

// Constantes pour l'application
export const APP_CONSTANTS = {
  MAX_NAME_LENGTH: 100,
  MIN_AGE: 1,
  MAX_AGE: 150,
  DEFAULT_AGE: 7,
  GRADE_SCALE_10: '10',
  GRADE_SCALE_20: '20',
  DEFAULT_GRADE_SCALE: '20',
};

// Classes disponibles
export const AVAILABLE_CLASSES = [
  { label: 'Sélectionnez une classe', value: '' },
  { label: 'CP1', value: 'CP1' },
  { label: 'CP2', value: 'CP2' },
  { label: 'CE1', value: 'CE1' },
  { label: 'CE2', value: 'CE2' },
  { label: 'CM1', value: 'CM1' },
  { label: 'CM2', value: 'CM2' },
  { label: 'CEI', value: 'CEI' }
];

// Matières par défaut
export const DEFAULT_SUBJECTS = [
  { id: 1, name: 'Mathématiques' },
  { id: 2, name: 'Français' },
  { id: 3, name: 'Histoire-Géographie' },
  { id: 4, name: 'Sciences' },
  { id: 5, name: 'Anglais' }
];

// Couleurs pour les notes
export const GRADE_COLORS = {
  EXCELLENT: '#28a745', // >= 16
  VERY_GOOD: '#20c997', // >= 14
  GOOD: '#17a2b8',      // >= 12
  PASSABLE: '#ffc107',  // >= 10
  INSUFFICIENT: '#dc3545' // < 10
};

// Couleurs pour les rangs
export const RANK_COLORS = {
  GOLD: '#ffd700',    // 1er
  SILVER: '#c0c0c0',  // 2ème
  BRONZE: '#cd7f32',  // 3ème
  DEFAULT: '#007bff'  // Autres
};

// Messages d'erreur
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet.',
  DATABASE_ERROR: 'Erreur de base de données. Veuillez réessayer.',
  VALIDATION_ERROR: 'Données invalides. Vérifiez vos saisies.',
  UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite.',
  STUDENT_NOT_FOUND: 'Élève non trouvé.',
  SUBJECT_NOT_FOUND: 'Matière non trouvée.',
  GRADE_NOT_FOUND: 'Note non trouvée.',
  FIRST_NAME_REQUIRED: 'Le prénom est obligatoire',
  LAST_NAME_REQUIRED: 'Le nom est obligatoire',
  CLASS_REQUIRED: 'La classe est obligatoire',
  INVALID_STUDENT_ID: 'ID de l\'élève invalide',
  INVALID_SUBJECT_ID: 'ID de la matière invalide',
  SCORE_REQUIRED: 'La note est obligatoire',
  INVALID_SCORE: 'La note doit être comprise entre',
};

// Messages de succès
export const SUCCESS_MESSAGES = {
  STUDENT_ADDED: 'Élève ajouté avec succès.',
  STUDENT_UPDATED: 'Élève modifié avec succès.',
  STUDENT_DELETED: 'Élève supprimé avec succès.',
  GRADE_ADDED: 'Note ajoutée avec succès.',
  GRADE_UPDATED: 'Note modifiée avec succès.',
  GRADE_DELETED: 'Note supprimée avec succès.',
  SUBJECT_ADDED: 'Matière ajoutée avec succès.',
  SUBJECT_DELETED: 'Matière supprimée avec succès.',
  SCALE_UPDATED: 'Échelle des notes mise à jour.',
};


// Messages de succès
export const SUCCESS_MESSAGES = {
  STUDENT_ADDED: 'Élève ajouté avec succès.',
  STUDENT_UPDATED: 'Élève modifié avec succès.',
  STUDENT_DELETED: 'Élève supprimé avec succès.',
  GRADE_ADDED: 'Note ajoutée avec succès.',
  GRADE_UPDATED: 'Note modifiée avec succès.',
  GRADE_DELETED: 'Note supprimée avec succès.',
  SUBJECT_ADDED: 'Matière ajoutée avec succès.',
  SUBJECT_DELETED: 'Matière supprimée avec succès.',
  SCALE_UPDATED: 'Échelle des notes mise à jour.',
};
