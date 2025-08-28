import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OCR_CONFIG } from './OCRConfig';

class MultiStudentOCRSystem {
  constructor() {
    this.geminiAI = null;
    this.isGeminiAvailable = false;
    this.currentMethod = 'none';
  }

  async initialize() {
    console.log('Starting Multi-Student OCR system initialization...');
    
    const [geminiResult] = await Promise.allSettled([
      this.initializeGemini(),
    ]);

    if (geminiResult.status === 'rejected') {
      console.error('Failed to initialize Gemini:', geminiResult.reason);
    }

    console.log(`Multi-Student OCR initialization complete. Gemini: ${this.isGeminiAvailable}`);
    
    return true;
  }

  async initializeGemini() {
    try {
      if (OCR_CONFIG.gemini.enabled && OCR_CONFIG.gemini.apiKey) {
        this.geminiAI = new GoogleGenerativeAI(OCR_CONFIG.gemini.apiKey);
        this.isGeminiAvailable = true;
        console.log('Gemini AI initialized successfully for multi-student scanning');
      } else {
        console.log('Gemini AI disabled or API key missing');
        this.isGeminiAvailable = false;
      }
    } catch (error) {
      console.error('Gemini initialization error:', error);
      this.isGeminiAvailable = false;
    }
  }

  // Préprocessing d'image pour améliorer la reconnaissance
  async preprocessImage(imageUri) {
    try {
      console.log('Preprocessing image for multi-student OCR...');
      
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 1400 } }, // Taille plus grande pour les documents multi-élèves
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log('Image preprocessed successfully');
      return manipulatedImage.uri;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return imageUri;
    }
  }

  async extractMultipleStudentsFromImage(imageUri) {
    const processedImageUri = await this.preprocessImage(imageUri);
    
    if (this.isGeminiAvailable) {
      try {
        const result = await this.callGeminiAIForMultipleStudents(processedImageUri);
        if (result && result.success) {
          this.currentMethod = 'gemini';
          return result;
        }
      } catch (error) {
        console.error('Gemini Multi-Student OCR failed:', error);
      }
    }

    // Mode fallback
    try {
      const result = await this.fallbackMultiStudentOCR();
      this.currentMethod = 'fallback';
      return result;
    } catch (error) {
      console.error('Fallback Multi-Student OCR failed:', error);
      throw new Error('Toutes les méthodes OCR multi-élèves ont échoué.');
    }
  }

  async callGeminiAIForMultipleStudents(imageUri) {
    try {
      console.log('Starting Multi-Student Gemini AI call...');
      
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Multi-Student image converted to base64, size:', base64Image.length);

      // Détecter le type MIME selon l'extension
      const lower = (imageUri || '').toLowerCase();
      let mimeType = 'image/jpeg';
      if (lower.endsWith('.png')) mimeType = 'image/png';
      else if (lower.endsWith('.webp')) mimeType = 'image/webp';
      else if (lower.endsWith('.pdf')) mimeType = 'application/pdf';

      const createModel = (modelName, maxTokens = 3000) => this.geminiAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          maxOutputTokens: maxTokens, // Plus de tokens pour plusieurs élèves
          temperature: OCR_CONFIG.gemini.temperature,
        },
        safetySettings: [],
      });

      let modelName = OCR_CONFIG.gemini.model;
      let model = createModel(modelName);

    const multiStudentPrompt = `Tu es un expert OCR pour documents scolaires multi-élèves. Analyse cette image et extrais PRÉCISÉMENT TOUS les élèves avec leurs notes.

MISSION CRITIQUE :
1. SCANNE TOUT le document avec PRÉCISION MAXIMALE (même penché/flou)
2. TROUVE TOUS les noms d'élèves présents (formats variés)
3. ASSOCIE chaque note à son élève correspondant avec PRÉCISION
4. IDENTIFIE l'échelle de notation (5, 10, ou 20)
5. LIS ATTENTIVEMENT tous les chiffres et lettres

FORMATS DE NOMS À DÉTECTER :
- "DUPONT Jean" → nom complet: "DUPONT Jean"
- "Marie MARTIN" → nom complet: "Marie MARTIN"
- "BERNARD Paul" → nom complet: "BERNARD Paul"
- Tableaux : Nom | Matière1 | Matière2 | ...
- Listes : "DUPONT Jean - Math: 15/20, Français: 12/20"

FORMATS DE NOTES À RECONNAÎTRE :
- "15/20", "12 sur 20", "8,5/10", "4/5"
- "Math: 15", "Français 12/20", "Histoire-Géo: 14"
- Tableaux avec colonnes nom/matière/note

RÉPONSE OBLIGATOIRE - JSON PARFAIT UNIQUEMENT :
{
  "students": [
    {
      "student": {
        "fullName": "Nom_Complet_Exact_Trouvé"
      },
      "grades": [
        {
          "subject": "Matière_Exacte",
          "score": 15.5,
          "scale": 20
        }
      ]
    }
  ],
  "totalStudentsFound": 1
}

RÈGLES ABSOLUES :
- JSON valide OBLIGATOIRE
- fullName = nom complet exact trouvé dans le document
- Minimum 1 élève dans le tableau
- Si aucun nom trouvé, utilise fullName: ""
- AUCUN texte avant ou après le JSON
- PRÉCISION MAXIMALE dans la lecture des données
- Associe correctement chaque note à son élève`;

      const imagePart = { inlineData: { data: base64Image, mimeType: 'image/jpeg' } };
      
      // Ajouter un timeout pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Gemini AI multi-élèves ne répond pas')), 45000);
      });

      const geminiPromise = model.generateContent([multiStudentPrompt, imagePart]);
      
      console.log('Calling Multi-Student Gemini AI...');
      const result = await Promise.race([geminiPromise, timeoutPromise]);
      
      console.log('Multi-Student Gemini AI responded');
      const response = await result.response;
      const text = response.text();

      console.log('Multi-Student response text length:', text.length);

      let parsedData = this.parseGeminiMultiStudentResponse(text);
      if (!parsedData) {
        throw new Error("L'analyse de la réponse de Gemini multi-élèves a échoué.");
      }

      // Si aucun élève détecté, escalader vers un modèle plus puissant
      if (parsedData.students.length === 0) {
        try {
          console.log('No students detected with flash, escalating to gemini-1.5-pro...');
          const proModel = this.geminiAI.getGenerativeModel({
            model: 'gemini-1.5-pro',
            generationConfig: { maxOutputTokens: 3500, temperature: OCR_CONFIG.gemini.temperature },
            safetySettings: [],
          });
          const imagePart = { inlineData: { data: base64Image, mimeType: 'image/jpeg' } };
          const proTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout pro')), 45000));
          const proResult = await Promise.race([proModel.generateContent([multiStudentPrompt, imagePart]), proTimeout]);
          const proText = (await proResult.response).text();
          const proParsed = this.parseGeminiMultiStudentResponse(proText);
          if (proParsed && proParsed.students.length > 0) {
            parsedData = proParsed;
          }
        } catch (escalateErr) {
          console.warn('Escalation to pro failed or no students found:', escalateErr?.message);
        }
      }

      const confidence = response.promptFeedback?.blockReason ? 0.5 : 0.95;

      console.log('Multi-Student Gemini AI call successful');
      return {
        success: true,
        text: text,
        parsed: parsedData,
        source: 'gemini-multi',
        confidence: confidence,
      };
    } catch (error) {
      console.error('Multi-Student Gemini AI call failed:', error);
      // Fallback automatique en cas de quota 429 : basculer vers un modèle plus léger
      const message = String(error?.message || '');
      const isQuota = message.includes('429') || message.includes('quota');
      if (isQuota) {
        try {
          console.log('Retrying with lighter model gemini-1.5-flash due to quota limits...');
          const retryModel = this.geminiAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { maxOutputTokens: 2500, temperature: OCR_CONFIG.gemini.temperature },
            safetySettings: [],
          });
          const imagePart = { inlineData: { data: base64Image, mimeType: 'image/jpeg' } };
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Gemini AI multi-élèves retry ne répond pas')), 45000);
          });
          const geminiPromise = retryModel.generateContent([multiStudentPrompt, imagePart]);
          const result = await Promise.race([geminiPromise, timeoutPromise]);
          const response = await result.response;
          const text = response.text();
          const parsedData = this.parseGeminiMultiStudentResponse(text);
          if (!parsedData) throw new Error('Parsing failed after retry');
          const confidence = response.promptFeedback?.blockReason ? 0.5 : 0.9;
          return { success: true, text, parsed: parsedData, source: 'gemini-multi-retry', confidence };
        } catch (retryErr) {
          console.error('Retry with lighter model failed:', retryErr);
        }
      }
      throw error;
    }
  }

  async fallbackMultiStudentOCR() {
    console.log('Using fallback multi-student OCR mode - manual input required');
    return {
      success: true,
      text: "Mode manuel multi-élèves activé. Veuillez saisir les données manuellement.",
      parsed: { 
        students: [
          {
            student: { fullName: '' }, 
            className: '', 
            grades: [
              { subject: '', score: '', scale: '20' }
            ]
          }
        ],
        detectedClass: '',
        totalStudentsFound: 1
      },
      source: 'fallback-multi',
      confidence: 0.1,
      requiresManualCorrection: true
    };
  }

  parseGeminiMultiStudentResponse(text) {
    try {
      console.log('Raw Multi-Student Gemini response:', text);
      
      // Nettoyer la réponse
      let cleanedText = text.trim();
      
      // Supprimer les balises markdown si présentes
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Chercher le JSON dans la réponse
      let jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Essayer de trouver un JSON partiel
        const startIndex = cleanedText.indexOf('{');
        const endIndex = cleanedText.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonMatch = [cleanedText.substring(startIndex, endIndex + 1)];
        } else {
          throw new Error('Aucun JSON trouvé dans la réponse multi-élèves.');
        }
      }
      
      console.log('Extracted Multi-Student JSON:', jsonMatch[0]);
      
      const data = JSON.parse(jsonMatch[0]);
      
      // Validation et nettoyage des données
      if (!data.students || !Array.isArray(data.students)) {
        // Essayer de convertir un format élève unique en multi-élèves
        if (data.student) {
          data.students = [{
            student: data.student,
            grades: data.grades || []
          }];
        } else {
          data.students = [];
        }
      }

      // Valider et nettoyer chaque élève
      const validatedStudents = data.students.map((studentData, index) => {
        if (!studentData || typeof studentData !== 'object') {
          console.warn(`Student ${index} is invalid:`, studentData);
          return null;
        }

        // Assurer la structure de l'élève
        if (!studentData.student) {
          studentData.student = { fullName: '' };
        }
        if (!studentData.grades || !Array.isArray(studentData.grades)) {
          studentData.grades = [];
        }

        // Nettoyer les grades
        const validGrades = studentData.grades.map(grade => {
          if (!grade || typeof grade !== 'object') return null;
          
          return {
            subject: (grade.subject || '').toString().trim(),
            score: parseFloat(grade.score) || 0,
            scale: parseInt(grade.scale) || 20
          };
        }).filter(grade => grade && grade.subject);

        return {
          student: {
            fullName: (studentData.student.fullName || '').toString().trim()
          },
          grades: validGrades
        };
      }).filter(student => student !== null);

      const result = {
        students: validatedStudents,
        totalStudentsFound: data.totalStudentsFound || validatedStudents.length
      };

      console.log('Parsed Multi-Student result:', result);
      return result;
      
    } catch (error) {
      console.error('Error parsing multi-student response:', error);
      console.error('Original text:', text);
      
      // Essayer un parsing de secours
      return this.fallbackMultiStudentTextParsing(text);
    }
  }

  fallbackMultiStudentTextParsing(text) {
    console.log('Attempting fallback multi-student text parsing...');
    
    try {
      const result = {
        students: [],
        totalStudentsFound: 0
      };

      // Chercher des noms complets avec des patterns courants
      const namePatterns = [
        /(?:^|\n)([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]+\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]+)/gm,
        /([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]+\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]+)/gm
      ];

      const foundNames = new Set();
      
      for (const pattern of namePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const fullName = match[1].trim();
          
          if (!foundNames.has(fullName) && fullName.length > 3 && fullName.includes(' ')) {
            foundNames.add(fullName);
            
            const student = {
              student: { fullName },
              grades: []
            };

            // Chercher des notes près de ce nom
            const nameIndex = text.indexOf(match[0]);
            const contextStart = Math.max(0, nameIndex - 100);
            const contextEnd = Math.min(text.length, nameIndex + 200);
            const context = text.substring(contextStart, contextEnd);

            const gradePatterns = [
              /([A-Za-zÀ-ÿ\s]+)[\s:]+(\d{1,2}(?:[.,]\d{1,2})?)\s*[\/sur]\s*(\d{1,2})/gi,
              /(\d{1,2}(?:[.,]\d{1,2})?)\s*[\/sur]\s*(\d{1,2})/gi
            ];

            for (const gradePattern of gradePatterns) {
              let gradeMatch;
              while ((gradeMatch = gradePattern.exec(context)) !== null) {
                const subject = gradeMatch[1] ? gradeMatch[1].trim() : 'Matière';
                const score = parseFloat(gradeMatch[2].replace(',', '.')) || 0;
                const scale = parseInt(gradeMatch[3]) || 20;
                
                if (score > 0 && score <= scale) {
                  student.grades.push({ subject, score, scale });
                }
              }
            }

            result.students.push(student);
          }
        }
      }

      // Note: La classe sera définie par l'utilisateur avant le scan

      result.totalStudentsFound = result.students.length;

      console.log('Fallback multi-student parsing result:', result);
      return result;
      
    } catch (error) {
      console.error('Fallback multi-student parsing failed:', error);
      return null;
    }
  }

  async cleanup() {
    console.log('Multi-Student OCR system cleaned up');
  }

  getStatus() {
    return {
      gemini: this.isGeminiAvailable,
      tesseract: false,
      currentMethod: this.currentMethod,
      isReady: this.isGeminiAvailable || true,
      multiStudentSupport: true
    };
  }
}

const multiStudentOCR = new MultiStudentOCRSystem();

export const extractMultipleStudentsFromImage = (imageUri) => multiStudentOCR.extractMultipleStudentsFromImage(imageUri);
export const initializeMultiStudentOCR = () => multiStudentOCR.initialize();
export const getMultiStudentOCRStatus = () => multiStudentOCR.getStatus();
export const cleanupMultiStudentOCR = () => multiStudentOCR.cleanup();
export default multiStudentOCR;