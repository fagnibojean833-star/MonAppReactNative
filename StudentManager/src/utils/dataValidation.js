// Système de validation avancée pour les données OCR

import { isValidName } from './nameUtils';
import { isValidClassName } from './classUtils';

/**
 * Valide les données d'un élève unique
 * @param {Object} studentData - Données de l'élève
 * @returns {Object} - Résultat de validation
 */
export const validateSingleStudentData = (studentData) => {
  const errors = [];
  const warnings = [];

  // Validation du nom et prénom
  if (!studentData.student) {
    errors.push("Les informations de l'élève sont manquantes");
  } else {
    if (!studentData.student.firstName || !studentData.student.firstName.trim()) {
      errors.push("Le prénom de l'élève est obligatoire");
    } else if (!isValidName(studentData.student.firstName)) {
      errors.push("Le prénom de l'élève n'est pas valide");
    }

    if (!studentData.student.lastName || !studentData.student.lastName.trim()) {
      errors.push("Le nom de l'élève est obligatoire");
    } else if (!isValidName(studentData.student.lastName)) {
      errors.push("Le nom de l'élève n'est pas valide");
    }
  }

  // Validation de la classe
  if (!studentData.className || !studentData.className.trim()) {
    warnings.push("Aucune classe spécifiée pour l'élève");
  } else if (!isValidClassName(studentData.className)) {
    warnings.push("Le nom de la classe semble invalide");
  }

  // Validation des notes
  if (!studentData.grades || !Array.isArray(studentData.grades)) {
    warnings.push("Aucune note trouvée pour l'élève");
  } else {
    const gradeErrors = validateGrades(studentData.grades);
    errors.push(...gradeErrors.errors);
    warnings.push(...gradeErrors.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: calculateValidationScore(errors, warnings)
  };
};

/**
 * Valide les données de plusieurs élèves
 * @param {Object} multiStudentData - Données multi-élèves
 * @returns {Object} - Résultat de validation
 */
export const validateMultiStudentData = (multiStudentData) => {
  const errors = [];
  const warnings = [];
  const studentValidations = [];

  if (!multiStudentData.students || !Array.isArray(multiStudentData.students)) {
    errors.push("Aucun élève trouvé dans les données");
    return {
      isValid: false,
      errors,
      warnings,
      studentValidations,
      score: 0
    };
  }

  if (multiStudentData.students.length === 0) {
    errors.push("La liste des élèves est vide");
    return {
      isValid: false,
      errors,
      warnings,
      studentValidations,
      score: 0
    };
  }

  // Valider chaque élève
  multiStudentData.students.forEach((studentData, index) => {
    const validation = validateSingleStudentData(studentData);
    studentValidations.push({
      index,
      studentName: `${studentData.student?.firstName || 'Inconnu'} ${studentData.student?.lastName || 'Inconnu'}`,
      ...validation
    });

    // Ajouter les erreurs avec le contexte de l'élève
    validation.errors.forEach(error => {
      errors.push(`Élève ${index + 1}: ${error}`);
    });
    validation.warnings.forEach(warning => {
      warnings.push(`Élève ${index + 1}: ${warning}`);
    });
  });

  // Vérifier les doublons
  const duplicates = findDuplicateStudents(multiStudentData.students);
  duplicates.forEach(duplicate => {
    warnings.push(`Élèves potentiellement identiques: ${duplicate.students.join(', ')}`);
  });

  // Validation de la classe commune
  if (multiStudentData.detectedClass && !isValidClassName(multiStudentData.detectedClass)) {
    warnings.push("La classe détectée semble invalide");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    studentValidations,
    score: calculateValidationScore(errors, warnings)
  };
};

/**
 * Valide une liste de notes
 * @param {Array} grades - Liste des notes
 * @returns {Object} - Erreurs et avertissements
 */
const validateGrades = (grades) => {
  const errors = [];
  const warnings = [];

  grades.forEach((grade, index) => {
    // Validation de la matière
    if (!grade.subject || !grade.subject.trim()) {
      errors.push(`Note ${index + 1}: Matière manquante`);
    } else if (grade.subject.length < 2) {
      warnings.push(`Note ${index + 1}: Nom de matière très court`);
    }

    // Validation de la note
    if (grade.score === undefined || grade.score === null || grade.score === '') {
      errors.push(`Note ${index + 1}: Valeur de note manquante`);
    } else {
      const score = parseFloat(grade.score);
      const scale = parseInt(grade.scale) || 20;

      if (isNaN(score)) {
        errors.push(`Note ${index + 1}: Valeur de note invalide`);
      } else if (score < 0) {
        errors.push(`Note ${index + 1}: Note négative`);
      } else if (score > scale) {
        errors.push(`Note ${index + 1}: Note supérieure à l'échelle (${score}/${scale})`);
      } else if (score === 0) {
        warnings.push(`Note ${index + 1}: Note de 0 détectée`);
      }
    }

    // Validation de l'échelle
    if (grade.scale) {
      const scale = parseInt(grade.scale);
      if (isNaN(scale) || ![5, 10, 20].includes(scale)) {
        warnings.push(`Note ${index + 1}: Échelle inhabituelle (${grade.scale})`);
      }
    }
  });

  return { errors, warnings };
};

/**
 * Trouve les élèves potentiellement identiques
 * @param {Array} students - Liste des élèves
 * @returns {Array} - Groupes d'élèves similaires
 */
const findDuplicateStudents = (students) => {
  const duplicates = [];
  const processed = new Set();

  for (let i = 0; i < students.length; i++) {
    if (processed.has(i)) continue;

    const student1 = students[i];
    const similarStudents = [i];

    for (let j = i + 1; j < students.length; j++) {
      if (processed.has(j)) continue;

      const student2 = students[j];
      if (areStudentsSimilar(student1, student2)) {
        similarStudents.push(j);
        processed.add(j);
      }
    }

    if (similarStudents.length > 1) {
      duplicates.push({
        indices: similarStudents,
        students: similarStudents.map(idx => 
          `${students[idx].student?.firstName || 'Inconnu'} ${students[idx].student?.lastName || 'Inconnu'}`
        )
      });
    }

    processed.add(i);
  }

  return duplicates;
};

/**
 * Vérifie si deux élèves sont similaires
 * @param {Object} student1 - Premier élève
 * @param {Object} student2 - Deuxième élève
 * @returns {boolean} - True si similaires
 */
const areStudentsSimilar = (student1, student2) => {
  if (!student1.student || !student2.student) return false;

  const name1 = `${student1.student.firstName || ''} ${student1.student.lastName || ''}`.toLowerCase().trim();
  const name2 = `${student2.student.firstName || ''} ${student2.student.lastName || ''}`.toLowerCase().trim();

  // Noms identiques
  if (name1 === name2 && name1.length > 0) return true;

  // Noms très similaires (distance de Levenshtein)
  if (name1.length > 3 && name2.length > 3) {
    const distance = levenshteinDistance(name1, name2);
    const similarity = 1 - (distance / Math.max(name1.length, name2.length));
    return similarity > 0.8;
  }

  return false;
};

/**
 * Calcule un score de validation (0-100)
 * @param {Array} errors - Liste des erreurs
 * @param {Array} warnings - Liste des avertissements
 * @returns {number} - Score de validation
 */
const calculateValidationScore = (errors, warnings) => {
  if (errors.length === 0 && warnings.length === 0) return 100;
  
  const errorPenalty = errors.length * 20;
  const warningPenalty = warnings.length * 5;
  
  return Math.max(0, 100 - errorPenalty - warningPenalty);
};

/**
 * Distance de Levenshtein
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
 * Génère un rapport de validation lisible
 * @param {Object} validation - Résultat de validation
 * @returns {string} - Rapport formaté
 */
export const generateValidationReport = (validation) => {
  let report = `Score de validation: ${validation.score}/100\n\n`;

  if (validation.errors.length > 0) {
    report += `❌ ERREURS (${validation.errors.length}):\n`;
    validation.errors.forEach((error, index) => {
      report += `${index + 1}. ${error}\n`;
    });
    report += '\n';
  }

  if (validation.warnings.length > 0) {
    report += `⚠️ AVERTISSEMENTS (${validation.warnings.length}):\n`;
    validation.warnings.forEach((warning, index) => {
      report += `${index + 1}. ${warning}\n`;
    });
    report += '\n';
  }

  if (validation.studentValidations) {
    report += `📊 DÉTAIL PAR ÉLÈVE:\n`;
    validation.studentValidations.forEach(studentVal => {
      report += `• ${studentVal.studentName}: ${studentVal.score}/100\n`;
    });
  }

  return report;
};

export default {
  validateSingleStudentData,
  validateMultiStudentData,
  generateValidationReport
};