import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OCR_CONFIG } from './OCRConfig';

class HybridOCRSystem {
  constructor() {
    this.geminiAI = null;
    this.isGeminiAvailable = false;
    this.isTesseractAvailable = false; // Gardé pour compatibilité avec l'interface
    this.currentMethod = 'none';
  }

  async initialize() {
    console.log('Starting OCR system initialization...');
    
    const [geminiResult] = await Promise.allSettled([
      this.initializeGemini(),
    ]);

    if (geminiResult.status === 'rejected') {
      console.error('Failed to initialize Gemini:', geminiResult.reason);
    }

    console.log(`OCR initialization complete. Gemini: ${this.isGeminiAvailable}`);
    
    // Toujours retourner true pour permettre le mode fallback
    return true;
  }

  async initializeGemini() {
    try {
      if (OCR_CONFIG.gemini.enabled && OCR_CONFIG.gemini.apiKey) {
        this.geminiAI = new GoogleGenerativeAI(OCR_CONFIG.gemini.apiKey);
        this.isGeminiAvailable = true;
        console.log('Gemini AI initialized successfully');
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
      // Ne pas pré-traiter les PDF
      if ((imageUri || '').toLowerCase().endsWith('.pdf')) {
        return imageUri;
      }

      console.log('Preprocessing image for better OCR...');
      
      // Améliorer la qualité de l'image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 1200 } }, // Redimensionner pour une taille optimale
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
      return imageUri; // Retourner l'image originale en cas d'erreur
    }
  }

  async extractDataFromImage(imageUri) {
    // Préprocesser l'image pour améliorer la reconnaissance
    const processedImageUri = await this.preprocessImage(imageUri);
    
    if (this.isGeminiAvailable) {
      try {
        const result = await this.callGeminiAI(processedImageUri);
        if (result && result.success) {
          this.currentMethod = 'gemini';
          return result;
        }
      } catch (error) {
        console.error('Gemini OCR failed:', error);
        // Continuer vers le fallback
      }
    }

    // Mode fallback avec saisie manuelle
    try {
        const result = await this.fallbackOCR();
        this.currentMethod = 'fallback';
        return result;
    } catch (error) {
        console.error('Fallback OCR failed:', error);
        throw new Error('Toutes les méthodes OCR ont échoué.');
    }
  }

  async callGeminiAI(imageUri) {
    try {
      console.log('Starting Gemini AI call...');
      
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Image converted to base64, size:', base64Image.length);

      // Détecter le type MIME selon l'extension
      const lower = (imageUri || '').toLowerCase();
      let mimeType = 'image/jpeg';
      if (lower.endsWith('.png')) mimeType = 'image/png';
      else if (lower.endsWith('.webp')) mimeType = 'image/webp';
      else if (lower.endsWith('.pdf')) mimeType = 'application/pdf';

      const model = this.geminiAI.getGenerativeModel({ 
        model: OCR_CONFIG.gemini.model,
        generationConfig: {
          maxOutputTokens: OCR_CONFIG.gemini.maxTokens,
          temperature: OCR_CONFIG.gemini.temperature,
        },
        safetySettings: [], // To avoid blocking
      });

      const imagePart = { inlineData: { data: base64Image, mimeType } };
      
      // Ajouter un timeout pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Gemini AI ne répond pas')), 30000);
      });

      const geminiPromise = model.generateContent([OCR_CONFIG.gemini.prompt, imagePart]);
      
      console.log('Calling Gemini AI...');
      const result = await Promise.race([geminiPromise, timeoutPromise]);
      
      console.log('Gemini AI responded');
      const response = await result.response;
      const text = response.text();

      console.log('Response text length:', text.length);

      const parsedData = this.parseGeminiResponse(text);
      if (!parsedData) {
        throw new Error("L'analyse de la réponse de Gemini a échoué.");
      }

      // Confidence is not directly available, so we'll use a high value for Gemini
      const confidence = response.promptFeedback?.blockReason ? 0.5 : 0.95;

      console.log('Gemini AI call successful');
      return {
        success: true,
        text: text,
        parsed: parsedData,
        source: 'gemini',
        confidence: confidence,
      };
    } catch (error) {
      console.error('Gemini AI call failed:', error);
      throw error;
    }
  }

  // Méthode supprimée - Tesseract remplacé par preprocessing + Gemini amélioré

  async fallbackOCR() {
    console.log('Using fallback OCR mode - manual input required');
    return {
      success: true,
      text: "Mode manuel activé. Veuillez saisir les données manuellement.",
      parsed: { 
        student: { fullName: '' }, 
        className: '', 
        grades: [
          { subject: '', score: '', scale: '20' }
        ] 
      },
      source: 'fallback',
      confidence: 0.1,
      requiresManualCorrection: true
    };
  }

  parseGeminiResponse(text) {
    try {
      console.log('Raw Gemini response:', text);
      
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
          throw new Error('Aucun JSON trouvé dans la réponse.');
        }
      }
      
      console.log('Extracted JSON:', jsonMatch[0]);
      
      const data = JSON.parse(jsonMatch[0]);
      
      // Validation et nettoyage des données
      if (!data.student) {
        data.student = { fullName: '' };
      }
      if (!data.grades || !Array.isArray(data.grades)) {
        data.grades = [];
      }

      // Nettoyer et valider les grades
      const validGrades = data.grades.map(grade => {
        if (!grade || typeof grade !== 'object') return null;
        
        return {
          subject: (grade.subject || '').toString().trim(),
          score: parseFloat(grade.score) || 0,
          scale: parseInt(grade.scale) || 20
        };
      }).filter(grade => grade && grade.subject);

      const result = {
        student: {
          fullName: (data.student.fullName || '').toString().trim()
        },
        grades: validGrades
      };

      console.log('Parsed result:', result);
      return result;
      
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.error('Original text:', text);
      
      // Essayer un parsing de secours
      return this.fallbackTextParsing(text);
    }
  }

  fallbackTextParsing(text) {
    console.log('Attempting fallback text parsing...');
    
    try {
      const result = {
        student: { fullName: '' },
        grades: []
      };

      // Chercher des noms complets avec des patterns courants
      const namePatterns = [
        /(?:nom|name|élève|etudiant|student)[\s:]*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]*\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]*)/i,
        /([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]+\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]+)/,
        /([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß]+\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]+)/
      ];

      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
          result.student.fullName = match[1].trim();
          break;
        }
      }

      // Chercher des notes
      const gradePatterns = [
        /([A-Za-zÀ-ÿ\s]+)[\s:]+(\d{1,2}(?:[.,]\d{1,2})?)\s*[\/sur]\s*(\d{1,2})/gi,
        /(\d{1,2}(?:[.,]\d{1,2})?)\s*[\/sur]\s*(\d{1,2})\s*([A-Za-zÀ-ÿ\s]+)/gi
      ];

      for (const pattern of gradePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const subject = match[1] ? match[1].trim() : match[4] ? match[4].trim() : '';
          const score = parseFloat(match[2].replace(',', '.')) || 0;
          const scale = parseInt(match[3]) || 20;
          
          if (subject && score > 0) {
            result.grades.push({ subject, score, scale });
          }
        }
      }

      // Note: La classe sera définie par l'utilisateur avant le scan

      console.log('Fallback parsing result:', result);
      return result;
      
    } catch (error) {
      console.error('Fallback parsing failed:', error);
      return null;
    }
  }

  // Méthode supprimée - parsing Tesseract remplacé par Gemini AI

  async cleanup() {
    // Pas de nettoyage nécessaire pour Gemini AI
    console.log('OCR system cleaned up');
  }

  getStatus() {
    return {
      gemini: this.isGeminiAvailable,
      tesseract: false, // Toujours false maintenant
      currentMethod: this.currentMethod,
      isReady: this.isGeminiAvailable || true // Toujours prêt grâce au fallback
    };
  }
}

const hybridOCR = new HybridOCRSystem();

export const extractDataFromImage = (imageUri) => hybridOCR.extractDataFromImage(imageUri);
export const initializeOCR = () => hybridOCR.initialize();
export const getOCRStatus = () => hybridOCR.getStatus();
export const cleanupOCR = () => hybridOCR.cleanup();
export default hybridOCR;