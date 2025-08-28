import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator,
  TextInput, TouchableOpacity, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import OCRScanner, { initializeOCR, getOCRStatus } from '../ocr/OCRScanner';
import { addStudent, getSubjects, addGrade, addSubject, getStudents, getGradeScale, setGradeScale } from '../database/database';
import { isValidName } from '../utils/nameUtils';
import { createClassPickerOptions, suggestClassFromText } from '../utils/classUtils';
import { saveScanToHistory } from './ScanHistoryScreen';
import ClassSelector from '../components/ClassSelector';

const ScanOCRScreen = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('initializing');
  const [ocrSystemStatus, setOcrSystemStatus] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [gradeScale, setGradeScaleState] = useState('10');
  const navigation = useNavigation();

  const initializeSystems = useCallback(async () => {
    try {
      setOcrStatus('initializing');
      await Promise.all([
        (async () => {
          const success = await initializeOCR();
          if (success) {
            setOcrSystemStatus(getOCRStatus());
            setOcrStatus('ready');
          } else {
            throw new Error('OCR initialization failed');
          }
        })(),
        (async () => {
          const subjectsList = await getSubjects();
          setSubjects(subjectsList);
        })(),
        (async () => {
          const students = await getStudents();
          const classes = [...new Set(students.map(s => s.className))].filter(c => c && c.trim());
          setAvailableClasses(createClassPickerOptions(classes));
        })(),
        (async () => {
          const s = await getGradeScale();
          setGradeScaleState(s || '10');
        })(),
      ]);
    } catch (error) {
      console.error('Initialization failed:', error);
      setOcrStatus('error');
      Alert.alert("Erreur d'initialisation", "Le système OCR ou la base de données n'a pas pu être initialisé.");
    }
  }, []);

  useEffect(() => {
    initializeSystems();
  }, [initializeSystems]);

  const requestPermissions = async (from) => {
    try {
      if (from === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert('Permission requise', "L'accès à la caméra est nécessaire pour prendre une photo.");
          return false;
        }
      } else if (from === 'gallery') {
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaPermission.granted) {
          Alert.alert('Permission requise', "L'accès à la galerie est nécessaire pour importer une image.");
          return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const pickImage = async (from) => {
    try {
      const hasPermission = await requestPermissions(from);
      if (!hasPermission) return;

      const result = from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setParsedData(null);
        setRawText('');
      }
    } catch (error) {
      Alert.alert('Erreur', `Impossible d\'accéder à ${from === 'camera' ? 'la caméra' : 'la galerie'}.`);
    }
  };

  const pickDocument = async () => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.type === 'success' && res.assets && res.assets[0]) {
        setImageUri(res.assets[0].uri);
        setParsedData(null);
        setRawText('');
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'importer le document/PDF.");
    }
  };

  const runOCR = async () => {
    if (!imageUri) {
      Alert.alert('Erreur', "Veuillez d'abord sélectionner une image.");
      return;
    }

    // Vérifier que la classe est sélectionnée
    if (!selectedClass) {
      Alert.alert(
        'Classe requise',
        'Veuillez sélectionner une classe avant de scanner un document.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);
      setOcrStatus('processing');
      const result = await OCRScanner.extractDataFromImage(imageUri);

      if (result && result.success) {
        setRawText(result.text);
        
        // Améliorer les données parsées avec les utilitaires
        const improvedData = { ...result.parsed };
        
        // Ajouter la classe sélectionnée
        improvedData.className = selectedClass;
        
        // Les données utilisent maintenant fullName au lieu de firstName/lastName
        if (improvedData.student && !improvedData.student.fullName) {
          // Conversion pour compatibilité avec l'ancien format
          if (improvedData.student.firstName || improvedData.student.lastName) {
            improvedData.student.fullName = `${improvedData.student.firstName || ''} ${improvedData.student.lastName || ''}`.trim();
          }
        }
        
        setParsedData(improvedData);
        setOcrStatus('success');
        
        // Sauvegarder dans l'historique
        await saveScanToHistory({
          type: 'single',
          status: 'success',
          source: result.source,
          confidence: result.confidence,
          imageUri: imageUri,
          results: {
            studentName: improvedData.student?.fullName || '',
            gradesCount: improvedData.grades?.length || 0,
            selectedClass: selectedClass
          }
        });
        
        Alert.alert('Succès de l\'OCR', `Extraction réussie via ${result.source} avec une confiance de ${Math.round(result.confidence * 100)}%`);
      } else {
        throw new Error(result.error || "Le résultat de l'OCR est invalide.");
      }
    } catch (error) {
      setOcrStatus('error');
      
      // Sauvegarder l'erreur dans l'historique
      await saveScanToHistory({
        type: 'single',
        status: 'error',
        imageUri: imageUri,
        error: error.message
      });
      
      Alert.alert('Erreur OCR', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (index, field, value) => {
    setParsedData(currentData => {
      const newGrades = [...currentData.grades];
      newGrades[index] = { ...newGrades[index], [field]: value };
      return { ...currentData, grades: newGrades };
    });
  };

  const handleStudentInfoChange = (field, value) => {
    setParsedData(currentData => ({
      ...currentData,
      student: { ...currentData.student, [field]: value },
    }));
  };

  const saveData = async () => {
    const fullName = parsedData?.student?.fullName?.trim() || '';
    if (!fullName) {
      Alert.alert('Erreur', "Le nom complet de l'élève est obligatoire.");
      return;
    }

    if (!isValidName(fullName)) {
      Alert.alert('Erreur', "Le nom complet doit contenir au moins 2 caractères et être valide.");
      return;
    }

    // Vérifier qu'il y a au moins une note valide
    const validGrades = parsedData.grades?.filter(grade => 
      grade.subject && grade.subject.trim() && 
      grade.score !== undefined && grade.score !== null && grade.score !== ''
    ) || [];

    if (validGrades.length === 0) {
      Alert.alert('Erreur', "Au moins une note valide est requise.");
      return;
    }

    // Découper fullName en firstName/lastName pour compatibilité base de données
    const parts = fullName.split(/\s+/);
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : fullName;
    const lastName = parts.length > 1 ? parts.slice(-1).join(' ') : fullName;

    setLoading(true);
    try {
      console.log('Sauvegarde de l\'élève:', { firstName, lastName, className: selectedClass });
      
      const newStudent = await addStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        className: selectedClass || 'Non spécifiée',
      });

      console.log('Élève créé avec ID:', newStudent.id);

      let newSubjectsCreated = 0;
      let gradesAdded = 0;
      
      // Recharger la liste des matières depuis la base de données pour éviter les problèmes de cache
      let currentSubjects = await getSubjects();
      
      for (const grade of validGrades) {
        try {
          let subject = currentSubjects.find(s => s.name.toLowerCase() === grade.subject.toLowerCase());
          if (!subject) {
            console.log('Création de la matière:', grade.subject);
            const newSubject = await addSubject({ name: grade.subject.trim() });
            // Recharger la liste des matières après création
            currentSubjects = await getSubjects();
            subject = newSubject;
            newSubjectsCreated++;
          }
          
          const gradeData = {
            studentId: newStudent.id,
            subjectId: subject.id,
            score: parseFloat(grade.score) || 0,
            gradeScale: grade.scale?.toString() || gradeScale || '10',
          };
          
          console.log('Ajout de la note:', gradeData);
          await addGrade(gradeData);
          gradesAdded++;
        } catch (gradeError) {
          console.error('Erreur lors de l\'ajout de la note:', gradeError);
          // Continue avec les autres notes même si une échoue
        }
      }
      
      // Mettre à jour la liste locale des matières à la fin
      setSubjects(currentSubjects);

      const successMessage = `L'élève "${fullName}" a été ajouté avec ${gradesAdded} note(s).` + 
        (newSubjectsCreated > 0 ? `\n${newSubjectsCreated} nouvelle(s) matière(s) ont été créée(s).` : '');
      
      Alert.alert('Succès', successMessage, [
        {
          text: 'OK',
          onPress: () => {
            // Réinitialiser les données du scan
            setImageUri(null);
            setParsedData(null);
            setRawText('');
            setSelectedClass('');
            // Naviguer vers l'accueil
            navigation.navigate('Home');
          }
        }
      ]);
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      Alert.alert('Erreur de sauvegarde', error.message || 'Une erreur inconnue s\'est produite.');
    } finally {
      setLoading(false);
    }
  };

  const renderOCRStatus = () => {
    const statusConfig = {
      initializing: { text: '🔄 Initialisation OCR...', color: '#FFA500' },
      ready: { text: '✅ OCR Prêt', color: '#4CAF50' },
      processing: { text: '🔍 Traitement en cours...', color: '#2196F3' },
      success: { text: '✅ OCR Réussi', color: '#4CAF50' },
      error: { text: '❌ Erreur OCR', color: '#F44336' }
    };
    const config = statusConfig[ocrStatus];

    return (
      <View style={[styles.statusContainer, { backgroundColor: config.color }]}>
        <Text style={styles.statusText}>{config.text}</Text>
        {ocrSystemStatus && ocrStatus !== 'initializing' && (
          <Text style={styles.statusSubtext}>
            (Gemini: {ocrSystemStatus.gemini ? '✅' : '❌'} | Tesseract: {ocrSystemStatus.tesseract ? '✅' : '❌'})
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>🔍 Scanner un Bulletin</Text>
      {renderOCRStatus()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Sélectionnez une classe (obligatoire)</Text>
        <ClassSelector
          selectedClass={selectedClass}
          onClassSelect={setSelectedClass}
          style={styles.classSelector}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Choisissez une image</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => pickImage('camera')}><Text style={styles.buttonText}>📸 Caméra</Text></TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => pickImage('gallery')}><Text style={styles.buttonText}>🖼️ Galerie</Text></TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={pickDocument}><Text style={styles.buttonText}>📄 Document/PDF</Text></TouchableOpacity>
        </View>
      </View>

      {imageUri && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Lancez l'analyse</Text>
          {imageUri.toLowerCase().endsWith('.pdf') ? (
            <View style={{ padding: 12, backgroundColor: '#f1f3f5', borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Aperçu PDF</Text>
              <Text numberOfLines={2} style={{ color: '#555' }}>{imageUri}</Text>
              <Text style={{ color: '#666', marginTop: 6 }}>Le PDF ne peut pas être prévisualisé ici. Il sera envoyé au moteur OCR.</Text>
            </View>
          ) : (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          )}
          <View style={{ marginTop: 12 }}>
            <Text style={{ marginBottom: 6, color: '#333', fontWeight: '600' }}>Échelle des notes</Text>
            <Picker selectedValue={gradeScale} onValueChange={async (value) => {
              setGradeScaleState(value);
              try { await setGradeScale(value); } catch {}
              // Update parsed data grades scale too
              setParsedData((data) => {
                if (!data?.grades) return data;
                return { ...data, grades: data.grades.map(g => ({ ...g, scale: String(value) })) };
              });
            }} style={styles.picker}>
              <Picker.Item label="/10" value="10" />
              <Picker.Item label="/20" value="20" />
            </Picker>
          </View>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={runOCR} disabled={loading}> <Text style={styles.buttonText}>{loading ? 'Analyse en cours...' : '🚀 Lancer l\'OCR'}</Text></TouchableOpacity>
        </View>
      )}

      {loading && ocrStatus === 'processing' && <ActivityIndicator size="large" color="#2196F3" style={{ marginVertical: 20 }}/>}

      {parsedData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Vérifiez et corrigez les données</Text>
          
          <TextInput
            style={styles.textInput}
            value={parsedData.student?.fullName || ''}
            onChangeText={value => handleStudentInfoChange('fullName', value)}
            placeholder="Nom (complet)"
          />

          {parsedData.grades?.map((grade, index) => (
            <View key={index} style={styles.gradeItem}>
              <TextInput style={[styles.textInput, styles.gradeInput]} value={grade.subject} onChangeText={value => handleGradeChange(index, 'subject', value)} placeholder="Matière" />
              <TextInput style={[styles.textInput, styles.scoreInput]} value={String(grade.score)} onChangeText={value => handleGradeChange(index, 'score', value)} placeholder="Note" keyboardType="numeric" />
              <TextInput style={[styles.textInput, styles.scaleInput]} value={String(grade.scale)} onChangeText={value => handleGradeChange(index, 'scale', value)} placeholder="/20" keyboardType="numeric" />
            </View>
          ))}
        </View>
      )}

      {/* Texte brut masqué - disponible pour debug si nécessaire */}

      <TouchableOpacity 
        style={[styles.button, styles.saveButton, (!parsedData || loading || !(parsedData?.student?.fullName && parsedData.student.fullName.trim())) && styles.disabledButton]}
        onPress={saveData} 
        disabled={!parsedData || loading || !(parsedData?.student?.fullName && parsedData.student.fullName.trim())}
      >
        <Text style={styles.buttonText}>{loading ? 'Sauvegarde en cours...' : '💾 Sauvegarder l\'élève et ses notes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#333' },
  statusContainer: { padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  statusText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  statusSubtext: { color: 'white', fontSize: 12, marginTop: 4, opacity: 0.9 },
  section: { backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  picker: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  button: { backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center', flex: 1, marginHorizontal: 4 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  primaryButton: { backgroundColor: '#4CAF50', marginTop: 12 },
  saveButton: { backgroundColor: '#FF9800', marginTop: 16 },
  disabledButton: { backgroundColor: '#ccc' },
  imagePreview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12, backgroundColor: '#eee' },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9', marginBottom: 12 },
  gradeItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  gradeInput: { flex: 3 },
  scoreInput: { flex: 1 },
  scaleInput: { flex: 1 },
  rawText: { backgroundColor: '#eef', padding: 10, borderRadius: 4, fontFamily: 'monospace', fontSize: 10 }
});

export default ScanOCRScreen;