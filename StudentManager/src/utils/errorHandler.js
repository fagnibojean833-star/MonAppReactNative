import { Alert } from 'react-native';

// Gestionnaire d'erreurs centralisé
export const handleError = (error, context = '') => {
  console.error(`Error in ${context}:`, error);
  
  let message = 'Une erreur inattendue s\'est produite.';
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  Alert.alert('Erreur', message);
};

// Validation des données
export const validateStudentData = (student) => {
  const errors = [];
  
  if (!student.firstName || !student.firstName.trim()) {
    errors.push('Le prénom est obligatoire');
  }
  
  if (!student.lastName || !student.lastName.trim()) {
    errors.push('Le nom est obligatoire');
  }
  
  if (!student.className || !student.className.trim()) {
    errors.push('La classe est obligatoire');
  }
  
  return errors;
};

import { Alert } from 'react-native';
import { ERROR_MESSAGES } from './constants';

// Gestionnaire d'erreurs centralisé
export const handleError = (error, context = '') => {
  console.error(`Error in ${context}:`, error);
  
  let message = ERROR_MESSAGES.UNKNOWN_ERROR;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  Alert.alert('Erreur', message);
};

// Validation des données
export const validateStudentData = (student) => {
  const errors = [];
  
  if (!student.firstName || !student.firstName.trim()) {
    errors.push(ERROR_MESSAGES.FIRST_NAME_REQUIRED);
  }
  
  if (!student.lastName || !student.lastName.trim()) {
    errors.push(ERROR_MESSAGES.LAST_NAME_REQUIRED);
  }
  
  if (!student.className || !student.className.trim()) {
    errors.push(ERROR_MESSAGES.CLASS_REQUIRED);
  }
  
  return errors;
};

export const validateGradeData = (grade, maxScore = 20) => {
  const errors = [];
  
  if (!grade.studentId || isNaN(grade.studentId)) {
    errors.push(ERROR_MESSAGES.INVALID_STUDENT_ID);
  }
  
  if (!grade.subjectId || isNaN(grade.subjectId)) {
    errors.push(ERROR_MESSAGES.INVALID_SUBJECT_ID);
  }
  
  if (grade.score === undefined || grade.score === null || isNaN(grade.score)) {
    errors.push(ERROR_MESSAGES.SCORE_REQUIRED);
  } else {
    const score = parseFloat(grade.score);
    if (score < 0 || score > maxScore) {
      errors.push(`${ERROR_MESSAGES.INVALID_SCORE} (0-${maxScore})`);
    }
  }
  
  return errors;
};

};
