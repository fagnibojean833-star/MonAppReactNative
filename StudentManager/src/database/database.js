import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// === Clés de stockage ===
const STUDENTS_KEY = "students";
const SUBJECTS_KEY = "subjects";
const GRADES_KEY = "grades";
const GRADE_SCALE_KEY = "gradeScale";

// --- Fonctions utilitaires ---
const getStore = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    if (data === null) {
      return null;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error parsing JSON for key ${key}:`, e);
      // Supprimer les données corrompues pour éviter des erreurs répétées
      await AsyncStorage.removeItem(key);
      return null;
    }
  } catch (error) {
    console.error(`Error reading data for key ${key}:`, error);
    throw new Error(`Impossible de lire les données pour la clé ${key}.`);
  }
};

const setStore = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving data for key ${key}:`, error);
    throw new Error(
      `Impossible de sauvegarder les données pour la clé ${key}.`
    );
  }
};

// Générer ID unique avec timestamp pour éviter les collisions
const generateUniqueId = async () => {
  try {
    const allStudents = (await getStore(STUDENTS_KEY)) || [];
    const allSubjects = (await getStore(SUBJECTS_KEY)) || [];
    const allGrades = (await getStore(GRADES_KEY)) || [];

    const maxStudentId = allStudents.reduce((max, s) => Math.max(max, s.id), 0);
    const maxSubjectId = allSubjects.reduce((max, s) => Math.max(max, s.id), 0);
    const maxGradeId = allGrades.reduce((max, g) => Math.max(max, g.id), 0);

    // Utiliser le timestamp pour éviter les collisions lors d'ajouts rapides
    const baseId = Math.max(maxStudentId, maxSubjectId, maxGradeId) + 1;
    const timestamp = Date.now();
    const newId = Math.max(baseId, timestamp);

    return newId;
  } catch (error) {
    console.error("Erreur lors de la génération d'un ID unique:", error);
    throw new Error("Impossible de générer un ID unique.");
  }
};

// Helper pour parser multiGet
const parseMultiGet = (result) => {
  return Object.fromEntries(result.map(([key, value]) => [key, value]));
};

// === Grade scale helpers ===
export const getGradeScale = async () => {
  try {
    const value = await AsyncStorage.getItem(GRADE_SCALE_KEY);
    return value || "10"; // default to 10 if missing
  } catch (e) {
    return "10";
  }
};

export const setGradeScale = async (scale) => {
  try {
    const numScale = parseInt(scale);
    if (numScale < 5 || numScale > 100) {
      throw new Error("L'échelle doit être comprise entre 5 et 100.");
    }
    
    const s = String(numScale);
    await AsyncStorage.setItem(GRADE_SCALE_KEY, s);
    return s;
  } catch (e) {
    throw new Error("Impossible de définir l'échelle des notes.");
  }
};

// --- Initialisation ---
export const initDatabase = async () => {
  try {
    const result = await AsyncStorage.multiGet([
      STUDENTS_KEY,
      SUBJECTS_KEY,
      GRADES_KEY,
      GRADE_SCALE_KEY,
    ]);

    const { students, subjects, grades, gradeScale } = parseMultiGet(result);

    if (students === null) {
      await setStore(STUDENTS_KEY, []);
    }
    if (grades === null) {
      await setStore(GRADES_KEY, []);
    }
    if (gradeScale === null) {
      await AsyncStorage.setItem(GRADE_SCALE_KEY, "10");
    }

    if (subjects === null) {
      const defaultSubjects = [
        { id: 1, name: "Mathématiques" },
        { id: 2, name: "Français" },
        { id: 3, name: "Histoire-Géographie" },
        { id: 4, name: "Sciences" },
        { id: 5, name: "Anglais" },
      ];
      await setStore(SUBJECTS_KEY, defaultSubjects);
    }
  } catch (error) {
    throw new Error("Erreur lors de l'initialisation de la base de données");
  }
};

// === FONCTIONS POUR LES ÉLÈVES ===

export const getStudents = async () => {
  try {
    const students = await getStore(STUDENTS_KEY);
    return students || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves:", error);
    throw new Error("Impossible de récupérer la liste des élèves.");
  }
};

export const addStudent = async (student) => {
  try {
    if (!student.firstName || !student.lastName) {
      throw new Error("Le prénom et le nom sont obligatoires.");
    }

    const students = await getStudents();
    const newId = await generateUniqueId();
    
    const newStudent = {
      id: newId,
      firstName: student.firstName.trim(),
      lastName: student.lastName.trim(),
      className: (student.className && typeof student.className === 'string') ? student.className.trim() : "",
      createdAt: new Date().toISOString(),
    };

    students.push(newStudent);
    await setStore(STUDENTS_KEY, students);
    return newStudent;
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'élève:", error);
    throw error;
  }
};

export const updateStudent = async (id, updatedData) => {
  try {
    if (!updatedData.firstName || !updatedData.lastName) {
      throw new Error("Le prénom et le nom sont obligatoires.");
    }

    const students = await getStudents();
    const studentIndex = students.findIndex(s => s.id === id);
    
    if (studentIndex === -1) {
      throw new Error("Élève non trouvé.");
    }

    students[studentIndex] = {
      ...students[studentIndex],
      firstName: updatedData.firstName.trim(),
      lastName: updatedData.lastName.trim(),
      className: updatedData.className?.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    await setStore(STUDENTS_KEY, students);
    return students[studentIndex];
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'élève:", error);
    throw error;
  }
};

export const deleteStudent = async (id) => {
  try {
    const students = await getStudents();
    const filteredStudents = students.filter(s => s.id !== id);
    
    if (students.length === filteredStudents.length) {
      throw new Error("Élève non trouvé.");
    }

    // Supprimer aussi toutes les notes de cet élève
    const grades = await getStore(GRADES_KEY) || [];
    const filteredGrades = grades.filter(g => g.studentId !== id);
    
    await Promise.all([
      setStore(STUDENTS_KEY, filteredStudents),
      setStore(GRADES_KEY, filteredGrades)
    ]);

    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'élève:", error);
    throw error;
  }
};

export const deleteAllStudents = async () => {
  try {
    await Promise.all([
      setStore(STUDENTS_KEY, []),
      setStore(GRADES_KEY, [])
    ]);
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de tous les élèves:", error);
    throw new Error("Impossible de supprimer tous les élèves.");
  }
};

export const searchStudents = async (searchTerm) => {
  try {
    const students = await getStudents();
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) return students;

    return students.filter(student => 
      student.firstName.toLowerCase().includes(term) ||
      student.lastName.toLowerCase().includes(term) ||
      student.className.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error("Erreur lors de la recherche d'élèves:", error);
    throw new Error("Impossible de rechercher les élèves.");
  }
};

// === FONCTIONS POUR LES MATIÈRES ===

export const getSubjects = async () => {
  try {
    const subjects = await getStore(SUBJECTS_KEY);
    return subjects || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des matières:", error);
    throw new Error("Impossible de récupérer la liste des matières.");
  }
};

export const addSubject = async (subject) => {
  try {
    if (!subject.name || !subject.name.trim()) {
      throw new Error("Le nom de la matière est obligatoire.");
    }

    const subjects = await getSubjects();
    
    // Vérifier si la matière existe déjà
    const existingSubject = subjects.find(s => 
      s.name.toLowerCase() === subject.name.trim().toLowerCase()
    );
    
    if (existingSubject) {
      // Retourner la matière existante au lieu de lever une erreur
      console.log(`Matière "${subject.name}" existe déjà, retour de la matière existante`);
      return existingSubject;
    }

    const newId = await generateUniqueId();
    const newSubject = {
      id: newId,
      name: subject.name.trim(),
      createdAt: new Date().toISOString(),
    };

    subjects.push(newSubject);
    await setStore(SUBJECTS_KEY, subjects);
    return newSubject;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la matière:", error);
    throw error;
  }
};

// Version pour l'interface utilisateur qui lève une erreur si la matière existe
export const addSubjectForUI = async (subject) => {
  try {
    if (!subject.name || !subject.name.trim()) {
      throw new Error("Le nom de la matière est obligatoire.");
    }

    const subjects = await getSubjects();
    
    // Vérifier si la matière existe déjà
    const existingSubject = subjects.find(s => 
      s.name.toLowerCase() === subject.name.trim().toLowerCase()
    );
    
    if (existingSubject) {
      throw new Error("Cette matière existe déjà.");
    }

    const newId = await generateUniqueId();
    const newSubject = {
      id: newId,
      name: subject.name.trim(),
      createdAt: new Date().toISOString(),
    };

    subjects.push(newSubject);
    await setStore(SUBJECTS_KEY, subjects);
    return newSubject;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la matière:", error);
    throw error;
  }
};

export const updateSubject = async (id, updatedData) => {
  try {
    if (!updatedData.name || !updatedData.name.trim()) {
      throw new Error("Le nom de la matière est obligatoire.");
    }

    const subjects = await getSubjects();
    const subjectIndex = subjects.findIndex(s => s.id === id);
    
    if (subjectIndex === -1) {
      throw new Error("Matière non trouvée.");
    }

    // Vérifier si le nouveau nom existe déjà (sauf pour la matière actuelle)
    const existingSubject = subjects.find(s => 
      s.id !== id && s.name.toLowerCase() === updatedData.name.trim().toLowerCase()
    );
    
    if (existingSubject) {
      throw new Error("Une matière avec ce nom existe déjà.");
    }

    subjects[subjectIndex] = {
      ...subjects[subjectIndex],
      name: updatedData.name.trim(),
      updatedAt: new Date().toISOString(),
    };

    await setStore(SUBJECTS_KEY, subjects);
    return subjects[subjectIndex];
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la matière:", error);
    throw error;
  }
};

export const deleteSubject = async (id) => {
  try {
    const subjects = await getSubjects();
    const filteredSubjects = subjects.filter(s => s.id !== id);
    
    if (subjects.length === filteredSubjects.length) {
      throw new Error("Matière non trouvée.");
    }

    // Supprimer aussi toutes les notes de cette matière
    const grades = await getStore(GRADES_KEY) || [];
    const filteredGrades = grades.filter(g => g.subjectId !== id);
    
    await Promise.all([
      setStore(SUBJECTS_KEY, filteredSubjects),
      setStore(GRADES_KEY, filteredGrades)
    ]);

    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la matière:", error);
    throw error;
  }
};

export const deleteAllSubjects = async () => {
  try {
    // Supprimer TOUTES les matières (y compris les matières par défaut)
    // et toutes les notes associées
    await Promise.all([
      setStore(SUBJECTS_KEY, []),
      setStore(GRADES_KEY, [])
    ]);
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de toutes les matières:", error);
    throw new Error("Impossible de supprimer toutes les matières.");
  }
};

export const searchSubjects = async (searchTerm) => {
  try {
    const subjects = await getSubjects();
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) return subjects;

    return subjects.filter(subject => 
      subject.name.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error("Erreur lors de la recherche de matières:", error);
    throw new Error("Impossible de rechercher les matières.");
  }
};

// === FONCTIONS POUR LES NOTES ===

export const getGrades = async () => {
  try {
    const grades = await getStore(GRADES_KEY);
    return grades || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des notes:", error);
    throw new Error("Impossible de récupérer la liste des notes.");
  }
};

export const addGrade = async (grade) => {
  try {
    if (!grade.studentId || !grade.subjectId || grade.score === undefined || grade.score === null) {
      throw new Error("L'élève, la matière et la note sont obligatoires.");
    }

    // Utiliser l'échelle fournie ou l'échelle par défaut
    const providedScale = parseInt(grade.gradeScale) || null;
    const defaultScale = await getGradeScale();
    const maxScore = providedScale || parseInt(defaultScale) || 10;
    
    if (grade.score < 0 || grade.score > maxScore) {
      throw new Error(`La note doit être comprise entre 0 et ${maxScore}.`);
    }

    // Vérifier que l'élève et la matière existent
    const [students, subjects] = await Promise.all([
      getStudents(),
      getSubjects()
    ]);
    
    const studentExists = students.some(s => s.id === grade.studentId);
    const subjectExists = subjects.some(s => s.id === grade.subjectId);
    
    if (!studentExists) {
      throw new Error("Élève non trouvé.");
    }
    
    if (!subjectExists) {
      throw new Error("Matière non trouvée.");
    }

    const grades = await getGrades();
    const newId = await generateUniqueId();
    
    const newGrade = {
      id: newId,
      studentId: grade.studentId,
      subjectId: grade.subjectId,
      score: parseFloat(grade.score),
      coefficient: grade.coefficient || 1,
      gradeScale: String(maxScore),
      date: grade.date || new Date().toISOString(),
      comment: grade.comment?.trim() || "",
      createdAt: new Date().toISOString(),
    };

    grades.push(newGrade);
    await setStore(GRADES_KEY, grades);
    return newGrade;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la note:", error);
    throw error;
  }
};

export const updateGrade = async (id, updatedData) => {
  try {
    if (updatedData.score === undefined || updatedData.score === null) {
      throw new Error("La note est obligatoire.");
    }

    // Utiliser l'échelle fournie ou l'échelle par défaut
    const providedScale = parseInt(updatedData.gradeScale) || null;
    const defaultScale = await getGradeScale();
    const maxScore = providedScale || parseInt(defaultScale) || 10;
    
    if (updatedData.score < 0 || updatedData.score > maxScore) {
      throw new Error(`La note doit être comprise entre 0 et ${maxScore}.`);
    }

    const grades = await getGrades();
    const gradeIndex = grades.findIndex(g => g.id === id);
    
    if (gradeIndex === -1) {
      throw new Error("Note non trouvée.");
    }

    grades[gradeIndex] = {
      ...grades[gradeIndex],
      score: parseFloat(updatedData.score),
      coefficient: updatedData.coefficient || grades[gradeIndex].coefficient,
      gradeScale: updatedData.gradeScale || grades[gradeIndex].gradeScale,
      date: updatedData.date || grades[gradeIndex].date,
      comment: updatedData.comment?.trim() || grades[gradeIndex].comment,
      updatedAt: new Date().toISOString(),
    };

    await setStore(GRADES_KEY, grades);
    return grades[gradeIndex];
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la note:", error);
    throw error;
  }
};

export const deleteGrade = async (id) => {
  try {
    const grades = await getGrades();
    const filteredGrades = grades.filter(g => g.id !== id);
    
    if (grades.length === filteredGrades.length) {
      throw new Error("Note non trouvée.");
    }

    await setStore(GRADES_KEY, filteredGrades);
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la note:", error);
    throw error;
  }
};

export const deleteAllGrades = async () => {
  try {
    await setStore(GRADES_KEY, []);
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de toutes les notes:", error);
    throw new Error("Impossible de supprimer toutes les notes.");
  }
};

export const getGradesForStudent = async (studentId) => {
  try {
    const [grades, subjects] = await Promise.all([
      getGrades(),
      getSubjects()
    ]);
    
    const studentGrades = grades.filter(g => g.studentId === studentId);
    
    // Enrichir avec le nom de la matière
    return studentGrades.map(grade => {
      const subject = subjects.find(s => s.id === grade.subjectId);
      return {
        ...grade,
        subjectName: subject ? subject.name : 'Matière inconnue'
      };
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des notes de l'élève:", error);
    throw new Error("Impossible de récupérer les notes de l'élève.");
  }
};

// === FONCTIONS POUR LES CLASSEMENTS ===

export const getStudentRankings = async () => {
  try {
    const [students, grades] = await Promise.all([
      getStudents(),
      getGrades()
    ]);

    const rankings = students.map(student => {
      const studentGrades = grades.filter(g => g.studentId === student.id);
      
      if (studentGrades.length === 0) {
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          className: student.className,
          averageScore: 0,
          gradesCount: 0,
          totalPoints: 0,
          totalCoefficients: 0
        };
      }

      const totalPoints = studentGrades.reduce((sum, grade) => 
        sum + (grade.score * (grade.coefficient || 1)), 0
      );
      const totalCoefficients = studentGrades.reduce((sum, grade) => 
        sum + (grade.coefficient || 1), 0
      );
      
      const averageScore = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.className,
        averageScore: Math.round(averageScore * 10) / 10,
        gradesCount: studentGrades.length,
        totalPoints,
        totalCoefficients
      };
    });

    // Trier par moyenne décroissante
    rankings.sort((a, b) => b.averageScore - a.averageScore);
    
    // Ajouter le rang
    rankings.forEach((student, index) => {
      student.rank = index + 1;
    });

    return rankings;
  } catch (error) {
    console.error("Erreur lors du calcul des classements:", error);
    throw new Error("Impossible de calculer les classements.");
  }
};

// === FONCTIONS POUR L'ÉCHELLE DE NOTATION ===
// Note: getGradeScale et setGradeScale sont déjà définis plus haut dans le fichier

export const updateAllGradesScale = async (newScale, convertScores = false) => {
  try {
    const grades = await getGrades();
    const numNewScale = parseInt(newScale);
    
    if (convertScores) {
      // Convertir toutes les notes à la nouvelle échelle
      const updatedGrades = grades.map(grade => {
        const currentScale = parseInt(grade.gradeScale) || 20;
        const convertedScore = (grade.score / currentScale) * numNewScale;
        
        return {
          ...grade,
          score: Math.round(convertedScore * 10) / 10, // Arrondir à 1 décimale
          gradeScale: numNewScale,
          updatedAt: new Date().toISOString(),
        };
      });
      
      await setStore(GRADES_KEY, updatedGrades);
    } else {
      // Juste mettre à jour l'échelle par défaut sans convertir les scores
      const updatedGrades = grades.map(grade => ({
        ...grade,
        gradeScale: grade.gradeScale || numNewScale, // Garder l'échelle existante si elle existe
      }));
      
      await setStore(GRADES_KEY, updatedGrades);
    }
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'échelle des notes:", error);
    throw new Error("Impossible de mettre à jour l'échelle des notes.");
  }
};

// --- Export des données ---
export const exportData = async () => {
  try {
    const [students, subjects, grades, rankings, gradeScale] = await Promise.all([
      getStudents(),
      getSubjects(),
      getGrades(),
      getStudentRankings(),
      getGradeScale()
    ]);

    return {
      students,
      subjects,
      grades,
      rankings,
      gradeScale,
      exportDate: new Date().toISOString(),
      version: Constants.expoConfig?.version || "1.0.0",
    };
  } catch (error) {
    console.error("Erreur lors de l'export des données:", error);
    throw new Error("Impossible d'exporter les données.");
  }
};
