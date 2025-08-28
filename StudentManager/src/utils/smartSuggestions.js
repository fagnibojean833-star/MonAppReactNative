// Système de suggestions intelligentes pour l'OCR

import { getStudents, getSubjects } from '../database/database';
import { areNamesSimilar, parseFullName } from './nameUtils';
import { normalizeClassName } from './classUtils';

/**
 * Suggère des corrections pour les données OCR basées sur les données existantes
 * @param {Object} ocrData - Données extraites par l'OCR
 * @returns {Object} - Suggestions de corrections
 */
export const generateSmartSuggestions = async (ocrData) => {
  try {
    const [existingStudents, existingSubjects] = await Promise.all([
      getStudents(),
      getSubjects()
    ]);

    const suggestions = {
      students: [],
      subjects: [],
      classes: [],
      confidence: 0
    };

    // Suggestions pour les élèves (mode single)
    if (ocrData.student) {
      const studentSuggestions = await suggestStudentCorrections(
        ocrData.student, 
        existingStudents
      );
      suggestions.students = studentSuggestions;
    }

    // Suggestions pour les élèves (mode multi)
    if (ocrData.students && Array.isArray(ocrData.students)) {
      for (let i = 0; i < ocrData.students.length; i++) {
        const studentData = ocrData.students[i];
        if (studentData.student) {
          const studentSuggestions = await suggestStudentCorrections(
            studentData.student, 
            existingStudents
          );
          suggestions.students.push({
            index: i,
            suggestions: studentSuggestions
          });
        }
      }
    }

    // Suggestions pour les matières
    const allGrades = ocrData.grades || [];
    if (ocrData.students) {
      ocrData.students.forEach(studentData => {
        if (studentData.grades) {
          allGrades.push(...studentData.grades);
        }
      });
    }

    for (const grade of allGrades) {
      if (grade.subject) {
        const subjectSuggestions = suggestSubjectCorrections(
          grade.subject, 
          existingSubjects
        );
        if (subjectSuggestions.length > 0) {
          suggestions.subjects.push({
            original: grade.subject,
            suggestions: subjectSuggestions
          });
        }
      }
    }

    // Suggestions pour les classes
    const classNames = [];
    if (ocrData.className) classNames.push(ocrData.className);
    if (ocrData.detectedClass) classNames.push(ocrData.detectedClass);
    if (ocrData.students) {
      ocrData.students.forEach(studentData => {
        if (studentData.className) classNames.push(studentData.className);
      });
    }

    const existingClasses = [...new Set(existingStudents.map(s => s.className))].filter(c => c);
    for (const className of classNames) {
      if (className) {
        const classSuggestions = suggestClassCorrections(className, existingClasses);
        if (classSuggestions.length > 0) {
          suggestions.classes.push({
            original: className,
            suggestions: classSuggestions
          });
        }
      }
    }

    // Calculer la confiance globale
    suggestions.confidence = calculateSuggestionConfidence(suggestions);

    return suggestions;
  } catch (error) {
    console.error('Error generating smart suggestions:', error);
    return { students: [], subjects: [], classes: [], confidence: 0 };
  }
};

/**
 * Suggère des corrections pour un nom d'élève
 */
const suggestStudentCorrections = async (studentData, existingStudents) => {
  const suggestions = [];
  
  for (const existing of existingStudents) {
    if (areNamesSimilar(studentData, existing)) {
      suggestions.push({
        type: 'similar_name',
        suggestion: {
          firstName: existing.firstName,
          lastName: existing.lastName,
          className: existing.className
        },
        confidence: 0.8,
        reason: 'Nom similaire trouvé dans la base de données'
      });
    }
  }

  // Suggestions basées sur l'analyse du nom
  const fullName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim();
  if (fullName) {
    const parsed = parseFullName(fullName);
    if (parsed.firstName !== studentData.firstName || parsed.lastName !== studentData.lastName) {
      suggestions.push({
        type: 'name_parsing',
        suggestion: parsed,
        confidence: 0.7,
        reason: 'Amélioration du parsing du nom'
      });
    }
  }

  return suggestions.slice(0, 3); // Limiter à 3 suggestions
};

/**
 * Suggère des corrections pour une matière
 */
const suggestSubjectCorrections = (subjectName, existingSubjects) => {
  const suggestions = [];
  const normalizedInput = subjectName.toLowerCase().trim();

  for (const existing of existingSubjects) {
    const normalizedExisting = existing.name.toLowerCase().trim();
    
    // Correspondance exacte
    if (normalizedInput === normalizedExisting) {
      continue; // Pas besoin de suggestion
    }

    // Correspondance partielle
    if (normalizedInput.includes(normalizedExisting) || normalizedExisting.includes(normalizedInput)) {
      suggestions.push({
        suggestion: existing.name,
        confidence: 0.9,
        reason: 'Matière similaire existante'
      });
    }

    // Correspondance par distance de Levenshtein
    const distance = levenshteinDistance(normalizedInput, normalizedExisting);
    const similarity = 1 - (distance / Math.max(normalizedInput.length, normalizedExisting.length));
    
    if (similarity > 0.7) {
      suggestions.push({
        suggestion: existing.name,
        confidence: similarity,
        reason: `Matière similaire (${Math.round(similarity * 100)}% de similarité)`
      });
    }
  }

  // Suggestions basées sur des patterns communs
  const commonSubjects = {
    'math': 'Mathématiques',
    'maths': 'Mathématiques',
    'français': 'Français',
    'francais': 'Français',
    'anglais': 'Anglais',
    'histoire': 'Histoire-Géographie',
    'géographie': 'Histoire-Géographie',
    'geographie': 'Histoire-Géographie',
    'sciences': 'Sciences',
    'physique': 'Physique-Chimie',
    'chimie': 'Physique-Chimie',
    'eps': 'Éducation Physique et Sportive',
    'sport': 'Éducation Physique et Sportive',
    'musique': 'Musique',
    'arts': 'Arts plastiques'
  };

  const commonMatch = commonSubjects[normalizedInput];
  if (commonMatch && !suggestions.find(s => s.suggestion === commonMatch)) {
    suggestions.push({
      suggestion: commonMatch,
      confidence: 0.8,
      reason: 'Matière standard suggérée'
    });
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
};

/**
 * Suggère des corrections pour une classe
 */
const suggestClassCorrections = (className, existingClasses) => {
  const suggestions = [];
  const normalized = normalizeClassName(className);

  for (const existing of existingClasses) {
    const normalizedExisting = normalizeClassName(existing);
    
    if (normalized === normalizedExisting) {
      continue; // Pas besoin de suggestion
    }

    // Correspondance partielle
    if (normalized.includes(normalizedExisting) || normalizedExisting.includes(normalized)) {
      suggestions.push({
        suggestion: existing,
        confidence: 0.9,
        reason: 'Classe similaire existante'
      });
    }

    // Distance de Levenshtein
    const distance = levenshteinDistance(normalized, normalizedExisting);
    const similarity = 1 - (distance / Math.max(normalized.length, normalizedExisting.length));
    
    if (similarity > 0.7) {
      suggestions.push({
        suggestion: existing,
        confidence: similarity,
        reason: `Classe similaire (${Math.round(similarity * 100)}% de similarité)`
      });
    }
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2);
};

/**
 * Calcule la confiance globale des suggestions
 */
const calculateSuggestionConfidence = (suggestions) => {
  let totalSuggestions = 0;
  let totalConfidence = 0;

  // Compter les suggestions d'élèves
  if (Array.isArray(suggestions.students)) {
    suggestions.students.forEach(studentSugg => {
      if (Array.isArray(studentSugg.suggestions)) {
        totalSuggestions += studentSugg.suggestions.length;
        totalConfidence += studentSugg.suggestions.reduce((sum, s) => sum + s.confidence, 0);
      } else if (Array.isArray(studentSugg)) {
        totalSuggestions += studentSugg.length;
        totalConfidence += studentSugg.reduce((sum, s) => sum + s.confidence, 0);
      }
    });
  }

  // Compter les suggestions de matières
  suggestions.subjects.forEach(subjectSugg => {
    totalSuggestions += subjectSugg.suggestions.length;
    totalConfidence += subjectSugg.suggestions.reduce((sum, s) => sum + s.confidence, 0);
  });

  // Compter les suggestions de classes
  suggestions.classes.forEach(classSugg => {
    totalSuggestions += classSugg.suggestions.length;
    totalConfidence += classSugg.suggestions.reduce((sum, s) => sum + s.confidence, 0);
  });

  return totalSuggestions > 0 ? totalConfidence / totalSuggestions : 0;
};

/**
 * Distance de Levenshtein pour calculer la similarité entre chaînes
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
 * Applique automatiquement les meilleures suggestions
 * @param {Object} ocrData - Données OCR originales
 * @param {Object} suggestions - Suggestions générées
 * @param {number} minConfidence - Confiance minimale pour appliquer automatiquement
 * @returns {Object} - Données OCR améliorées
 */
export const applyBestSuggestions = (ocrData, suggestions, minConfidence = 0.8) => {
  const improvedData = JSON.parse(JSON.stringify(ocrData)); // Deep copy

  // Appliquer les suggestions de matières
  suggestions.subjects.forEach(subjectSugg => {
    const bestSuggestion = subjectSugg.suggestions[0];
    if (bestSuggestion && bestSuggestion.confidence >= minConfidence) {
      // Trouver et remplacer dans les données
      const replaceInGrades = (grades) => {
        grades.forEach(grade => {
          if (grade.subject === subjectSugg.original) {
            grade.subject = bestSuggestion.suggestion;
          }
        });
      };

      if (improvedData.grades) {
        replaceInGrades(improvedData.grades);
      }
      if (improvedData.students) {
        improvedData.students.forEach(studentData => {
          if (studentData.grades) {
            replaceInGrades(studentData.grades);
          }
        });
      }
    }
  });

  // Appliquer les suggestions de classes
  suggestions.classes.forEach(classSugg => {
    const bestSuggestion = classSugg.suggestions[0];
    if (bestSuggestion && bestSuggestion.confidence >= minConfidence) {
      if (improvedData.className === classSugg.original) {
        improvedData.className = bestSuggestion.suggestion;
      }
      if (improvedData.detectedClass === classSugg.original) {
        improvedData.detectedClass = bestSuggestion.suggestion;
      }
      if (improvedData.students) {
        improvedData.students.forEach(studentData => {
          if (studentData.className === classSugg.original) {
            studentData.className = bestSuggestion.suggestion;
          }
        });
      }
    }
  });

  return improvedData;
};

export default {
  generateSmartSuggestions,
  applyBestSuggestions
};