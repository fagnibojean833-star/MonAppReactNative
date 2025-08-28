// Utilitaires de test pour les fonctions OCR

/**
 * Teste le parsing d'une réponse JSON Gemini
 * @param {string} jsonResponse - Réponse JSON à tester
 * @returns {Object} - Résultat du test
 */
export const testJSONParsing = (jsonResponse) => {
  const results = {
    success: false,
    errors: [],
    warnings: [],
    parsedData: null
  };

  try {
    // Nettoyer la réponse
    let cleanedText = jsonResponse.trim();
    cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Chercher le JSON
    let jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const startIndex = cleanedText.indexOf('{');
      const endIndex = cleanedText.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonMatch = [cleanedText.substring(startIndex, endIndex + 1)];
      } else {
        results.errors.push('Aucun JSON trouvé dans la réponse');
        return results;
      }
    }

    // Parser le JSON
    const data = JSON.parse(jsonMatch[0]);
    results.parsedData = data;

    // Valider la structure pour élève unique
    if (data.student) {
      if (!data.student.firstName && !data.student.lastName) {
        results.warnings.push('Nom et prénom de l\'élève manquants');
      }
      if (!data.grades || !Array.isArray(data.grades)) {
        results.errors.push('Grades manquants ou invalides');
      } else if (data.grades.length === 0) {
        results.warnings.push('Aucune note trouvée');
      }
    }

    // Valider la structure pour multi-élèves
    if (data.students) {
      if (!Array.isArray(data.students)) {
        results.errors.push('Students doit être un tableau');
      } else if (data.students.length === 0) {
        results.warnings.push('Aucun élève trouvé');
      } else {
        data.students.forEach((student, index) => {
          if (!student.student) {
            results.errors.push(`Élève ${index + 1}: informations manquantes`);
          } else {
            if (!student.student.firstName && !student.student.lastName) {
              results.warnings.push(`Élève ${index + 1}: nom et prénom manquants`);
            }
          }
          if (!student.grades || !Array.isArray(student.grades)) {
            results.warnings.push(`Élève ${index + 1}: notes manquantes`);
          }
        });
      }
    }

    results.success = results.errors.length === 0;
    return results;

  } catch (error) {
    results.errors.push(`Erreur de parsing JSON: ${error.message}`);
    return results;
  }
};

/**
 * Génère des données de test pour l'OCR
 */
export const generateTestData = () => {
  return {
    singleStudent: {
      validJSON: `{
        "student": {
          "firstName": "Jean",
          "lastName": "DUPONT"
        },
        "className": "6ème A",
        "grades": [
          {
            "subject": "Mathématiques",
            "score": 15.5,
            "scale": 20
          },
          {
            "subject": "Français",
            "score": 12,
            "scale": 20
          }
        ]
      }`,
      invalidJSON: `{
        "student": {
          "firstName": "Jean"
        },
        "grades": "invalid"
      }`,
      incompleteJSON: `{
        "student": {
          "firstName": "",
          "lastName": ""
        },
        "grades": []
      }`
    },
    multiStudent: {
      validJSON: `{
        "students": [
          {
            "student": {
              "firstName": "Marie",
              "lastName": "MARTIN"
            },
            "className": "6ème A",
            "grades": [
              {
                "subject": "Mathématiques",
                "score": 16,
                "scale": 20
              }
            ]
          },
          {
            "student": {
              "firstName": "Pierre",
              "lastName": "BERNARD"
            },
            "className": "6ème A",
            "grades": [
              {
                "subject": "Français",
                "score": 14,
                "scale": 20
              }
            ]
          }
        ],
        "detectedClass": "6ème A",
        "totalStudentsFound": 2
      }`,
      invalidJSON: `{
        "students": "not an array"
      }`,
      emptyJSON: `{
        "students": [],
        "totalStudentsFound": 0
      }`
    }
  };
};

/**
 * Teste les patterns de reconnaissance de noms
 * @param {string} text - Texte à analyser
 * @returns {Array} - Noms trouvés
 */
export const testNamePatterns = (text) => {
  const namePatterns = [
    /(?:nom|name|élève|etudiant|student)[\s:]*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]+)\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]+)/i,
    /([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]+)\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]+)/,
    /([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]+)\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]+)/
  ];

  const foundNames = [];

  for (const pattern of namePatterns) {
    const matches = text.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
    for (const match of matches) {
      foundNames.push({
        fullMatch: match[0],
        lastName: match[1],
        firstName: match[2],
        pattern: pattern.source
      });
    }
  }

  return foundNames;
};

/**
 * Teste les patterns de reconnaissance de notes
 * @param {string} text - Texte à analyser
 * @returns {Array} - Notes trouvées
 */
export const testGradePatterns = (text) => {
  const gradePatterns = [
    /([A-Za-zÀ-ÿ\s]+)[\s:]+(\d{1,2}(?:[.,]\d{1,2})?)\s*[\/sur]\s*(\d{1,2})/gi,
    /(\d{1,2}(?:[.,]\d{1,2})?)\s*[\/sur]\s*(\d{1,2})\s*([A-Za-zÀ-ÿ\s]+)/gi
  ];

  const foundGrades = [];

  for (const pattern of gradePatterns) {
    const matches = text.matchAll(new RegExp(pattern.source, pattern.flags));
    for (const match of matches) {
      foundGrades.push({
        fullMatch: match[0],
        subject: match[1] ? match[1].trim() : match[4] ? match[4].trim() : '',
        score: parseFloat(match[2].replace(',', '.')),
        scale: parseInt(match[3]),
        pattern: pattern.source
      });
    }
  }

  return foundGrades;
};

/**
 * Exécute une suite de tests complète
 * @param {Object} testData - Données de test
 * @returns {Object} - Résultats des tests
 */
export const runFullTestSuite = (testData = null) => {
  const data = testData || generateTestData();
  const results = {
    singleStudent: {},
    multiStudent: {},
    patterns: {},
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  // Test élève unique
  console.log('Testing single student JSON parsing...');
  results.singleStudent.valid = testJSONParsing(data.singleStudent.validJSON);
  results.singleStudent.invalid = testJSONParsing(data.singleStudent.invalidJSON);
  results.singleStudent.incomplete = testJSONParsing(data.singleStudent.incompleteJSON);

  // Test multi-élèves
  console.log('Testing multi-student JSON parsing...');
  results.multiStudent.valid = testJSONParsing(data.multiStudent.validJSON);
  results.multiStudent.invalid = testJSONParsing(data.multiStudent.invalidJSON);
  results.multiStudent.empty = testJSONParsing(data.multiStudent.emptyJSON);

  // Test des patterns
  console.log('Testing recognition patterns...');
  const testText = `
    Nom: DUPONT Jean
    Classe: 6ème A
    Mathématiques: 15/20
    Français: 12 sur 20
    
    MARTIN Marie
    Histoire: 14/20
    
    Pierre BERNARD
    Sciences: 16/20
  `;
  
  results.patterns.names = testNamePatterns(testText);
  results.patterns.grades = testGradePatterns(testText);

  // Calculer le résumé
  const allTests = [
    results.singleStudent.valid,
    results.singleStudent.invalid,
    results.singleStudent.incomplete,
    results.multiStudent.valid,
    results.multiStudent.invalid,
    results.multiStudent.empty
  ];

  results.summary.totalTests = allTests.length;
  results.summary.passed = allTests.filter(test => test.success).length;
  results.summary.failed = allTests.filter(test => !test.success).length;
  results.summary.warnings = allTests.reduce((sum, test) => sum + test.warnings.length, 0);

  console.log('Test suite completed:', results.summary);
  return results;
};

/**
 * Affiche un rapport de test lisible
 * @param {Object} testResults - Résultats des tests
 * @returns {string} - Rapport formaté
 */
export const generateTestReport = (testResults) => {
  let report = '=== RAPPORT DE TEST OCR ===\n\n';
  
  report += `📊 RÉSUMÉ:\n`;
  report += `- Tests totaux: ${testResults.summary.totalTests}\n`;
  report += `- Réussis: ${testResults.summary.passed}\n`;
  report += `- Échoués: ${testResults.summary.failed}\n`;
  report += `- Avertissements: ${testResults.summary.warnings}\n\n`;

  report += `👤 TESTS ÉLÈVE UNIQUE:\n`;
  report += `- JSON valide: ${testResults.singleStudent.valid.success ? '✅' : '❌'}\n`;
  report += `- JSON invalide: ${testResults.singleStudent.invalid.success ? '✅' : '❌'}\n`;
  report += `- JSON incomplet: ${testResults.singleStudent.incomplete.success ? '✅' : '❌'}\n\n`;

  report += `👥 TESTS MULTI-ÉLÈVES:\n`;
  report += `- JSON valide: ${testResults.multiStudent.valid.success ? '✅' : '❌'}\n`;
  report += `- JSON invalide: ${testResults.multiStudent.invalid.success ? '✅' : '❌'}\n`;
  report += `- JSON vide: ${testResults.multiStudent.empty.success ? '✅' : '❌'}\n\n`;

  report += `🔍 RECONNAISSANCE DE PATTERNS:\n`;
  report += `- Noms trouvés: ${testResults.patterns.names.length}\n`;
  report += `- Notes trouvées: ${testResults.patterns.grades.length}\n\n`;

  if (testResults.patterns.names.length > 0) {
    report += `📝 NOMS DÉTECTÉS:\n`;
    testResults.patterns.names.forEach((name, index) => {
      report += `${index + 1}. ${name.firstName} ${name.lastName}\n`;
    });
    report += '\n';
  }

  if (testResults.patterns.grades.length > 0) {
    report += `📚 NOTES DÉTECTÉES:\n`;
    testResults.patterns.grades.forEach((grade, index) => {
      report += `${index + 1}. ${grade.subject}: ${grade.score}/${grade.scale}\n`;
    });
    report += '\n';
  }

  return report;
};

export default {
  testJSONParsing,
  generateTestData,
  testNamePatterns,
  testGradePatterns,
  runFullTestSuite,
  generateTestReport
};