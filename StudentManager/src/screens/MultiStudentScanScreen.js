import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator,
  TextInput, TouchableOpacity, Image, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { 
  extractMultipleStudentsFromImage, 
  initializeMultiStudentOCR, 
  getMultiStudentOCRStatus 
} from '../ocr/MultiStudentOCRScanner';
import { addStudent, getSubjects, addGrade, addSubject, getStudents, getGradeScale, setGradeScale } from '../database/database';
import { saveScanToHistory } from './ScanHistoryScreen';
import { generateSmartSuggestions, applyBestSuggestions } from '../utils/smartSuggestions';
import SmartSuggestionsModal from '../components/SmartSuggestionsModal';
// Validation disabled per user request
// import { validateMultiStudentData, generateValidationReport } from '../utils/dataValidation';
import { normalizeSubject } from '../utils/subjectUtils';

const MultiStudentScanScreen = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('initializing');
  const [ocrSystemStatus, setOcrSystemStatus] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, saving: false });
  const [smartSuggestions, setSmartSuggestions] = useState(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [gradeScale, setGradeScaleState] = useState('10'); // global scale 10 or 20
  const navigation = useNavigation();

  const initializeSystems = useCallback(async () => {
    try {
      setOcrStatus('initializing');
      await Promise.all([
        (async () => {
          const success = await initializeMultiStudentOCR();
          if (success) {
            setOcrSystemStatus(getMultiStudentOCRStatus());
            setOcrStatus('ready');
          } else {
            throw new Error('Multi-Student OCR initialization failed');
          }
        })(),
        (async () => {
          const subjectsList = await getSubjects();
          setSubjects(subjectsList);
        })(),
        (async () => {
          // Source statique pour éviter une liste vide quand la base est vide
          const staticClasses = ['CEI','CP1','CP2','CE1','CE2','CM1','CM2'].map(c => ({ label: c, value: c }));
          const students = await getStudents();
          const dbClasses = [...new Set(students.map(s => s.className))]
            .filter(Boolean)
            .filter(c => !staticClasses.some(sc => sc.value === c))
            .map(c => ({ label: c, value: c }));
          setAvailableClasses([{ label: 'Sélectionnez une classe', value: '' }, ...staticClasses, ...dbClasses]);
        })(),
        (async () => {
          const currentScale = await getGradeScale();
          setGradeScaleState(currentScale || '10');
        })(),
      ]);
    } catch (error) {
      console.error('Initialization failed:', error);
      setOcrStatus('error');
      Alert.alert("Erreur d'initialisation", "Le système OCR multi-élèves n'a pas pu être initialisé.");
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

    // Vérifier que la classe par défaut est sélectionnée
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
      const result = await extractMultipleStudentsFromImage(imageUri);

      if (result && result.success) {
        setRawText(result.text);
        // Générer des suggestions intelligentes
        const suggestions = await generateSmartSuggestions(result.parsed);
        setSmartSuggestions(suggestions);
        
        // Appliquer automatiquement les meilleures suggestions + normaliser matières
        let improvedData = applyBestSuggestions(result.parsed, suggestions, 0.9);
        improvedData = {
          ...improvedData,
          students: improvedData.students.map(s => ({
            ...s,
            // Force selected class on each student after scan
            className: selectedClass,
            grades: (s.grades || []).map(g => ({
              ...g,
              subject: normalizeSubject(g.subject),
              // Apply selected global scale to each grade
              scale: String(gradeScale)
            }))
          }))
        };
        setParsedData(improvedData);
        setOcrStatus('success');

        // Pré-remplir la classe détectée si disponible
        if (improvedData.detectedClass && !selectedClass) {
          setSelectedClass(improvedData.detectedClass);
        }
        
        const studentsCount = improvedData.totalStudentsFound || improvedData.students.length;
        
        // Sauvegarder dans l'historique
        await saveScanToHistory({
          type: 'multi',
          status: 'success',
          source: result.source,
          confidence: result.confidence,
          imageUri: imageUri,
          results: {
            studentsCount: studentsCount
          }
        });
        
        Alert.alert(
          'Succès de l\'OCR Multi-Élèves', 
          `${studentsCount} élève(s) détecté(s) via ${result.source} avec une confiance de ${Math.round(result.confidence * 100)}%` +
          (suggestions.confidence > 0 ? `\n${Math.round(suggestions.confidence * 100)}% de confiance sur les suggestions` : ''),
          [
            { text: 'OK' },
            ...(suggestions.confidence > 0 ? [{
              text: 'Voir suggestions',
              onPress: () => setShowSuggestionsModal(true)
            }] : [])
          ]
        );
      } else {
        throw new Error(result.error || "Le résultat de l'OCR multi-élèves est invalide.");
      }
    } catch (error) {
      setOcrStatus('error');
      
      // Sauvegarder l'erreur dans l'historique
      await saveScanToHistory({
        type: 'multi',
        status: 'error',
        imageUri: imageUri,
        error: error.message
      });
      
      Alert.alert('Erreur OCR Multi-Élèves', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentInfoChange = (studentIndex, field, value) => {
    setParsedData(currentData => {
      const newStudents = [...currentData.students];
      newStudents[studentIndex] = {
        ...newStudents[studentIndex],
        student: { ...newStudents[studentIndex].student, [field]: value }
      };
      return { ...currentData, students: newStudents };
    });
  };

  const handleGradeChange = (studentIndex, gradeIndex, field, value) => {
    setParsedData(currentData => {
      const newStudents = [...currentData.students];
      const newGrades = [...newStudents[studentIndex].grades];
      newGrades[gradeIndex] = { ...newGrades[gradeIndex], [field]: value };
      newStudents[studentIndex] = { ...newStudents[studentIndex], grades: newGrades };
      return { ...currentData, students: newStudents };
    });
  };

  const handleClassChange = (studentIndex, className) => {
    setParsedData(currentData => {
      const newStudents = [...currentData.students];
      newStudents[studentIndex] = { ...newStudents[studentIndex], className };
      return { ...currentData, students: newStudents };
    });
  };

  const addGradeToStudent = (studentIndex) => {
    setParsedData(currentData => {
      const newStudents = [...currentData.students];
      newStudents[studentIndex].grades.push({ subject: '', score: '', scale: '20' });
      return { ...currentData, students: newStudents };
    });
  };

  const removeGradeFromStudent = (studentIndex, gradeIndex) => {
    setParsedData(currentData => {
      const newStudents = [...currentData.students];
      newStudents[studentIndex].grades.splice(gradeIndex, 1);
      return { ...currentData, students: newStudents };
    });
  };

  const handleApplySuggestion = (type, original, suggestion, index = null) => {
    setParsedData(currentData => {
      const newData = { ...currentData };
      
      switch (type) {
        case 'student':
          if (index !== null && newData.students && newData.students[index]) {
            newData.students[index].student = {
              fullName: `${suggestion.suggestion.firstName || ''} ${suggestion.suggestion.lastName || ''}`.trim()
            };
            if (suggestion.suggestion.className) {
              newData.students[index].className = suggestion.suggestion.className;
            }
          } else if (original === 'single' && newData.student) {
            newData.student = {
              fullName: `${suggestion.suggestion.firstName || ''} ${suggestion.suggestion.lastName || ''}`.trim()
            };
          }
          break;
          
        case 'subject':
          const replaceSubject = (grades) => {
            grades.forEach(grade => {
              if (grade.subject === original) {
                grade.subject = suggestion.suggestion;
              }
            });
          };
          
          if (newData.grades) {
            replaceSubject(newData.grades);
          }
          if (newData.students) {
            newData.students.forEach(studentData => {
              if (studentData.grades) {
                replaceSubject(studentData.grades);
              }
            });
          }
          break;
          
        case 'class':
          if (newData.className === original) {
            newData.className = suggestion.suggestion;
          }
          if (newData.detectedClass === original) {
            newData.detectedClass = suggestion.suggestion;
          }
          if (newData.students) {
            newData.students.forEach(studentData => {
              if (studentData.className === original) {
                studentData.className = suggestion.suggestion;
              }
            });
          }
          break;
      }
      
      return newData;
    });
  };

  const saveAllStudents = async () => {
    if (!parsedData?.students || parsedData.students.length === 0) {
      Alert.alert('Erreur', "Aucun élève à sauvegarder.");
      return;
    }

    // Validation disabled per user request: proceed to save directly
    await performSave();
  };

  const performSave = async () => {

    setSaveProgress({ current: 0, total: parsedData.students.length, saving: true });
    setLoading(true);

    try {
      let savedStudents = 0;
      let newSubjectsCreated = 0;
      let totalGrades = 0;

      for (let i = 0; i < parsedData.students.length; i++) {
        const studentData = parsedData.students[i];
        setSaveProgress(prev => ({ ...prev, current: i + 1 }));

        // Ajouter l'élève
        // Découper le fullName en firstName/lastName pour la base de données
        const fullName = (studentData.student.fullName || '').trim();
        const parts = fullName.split(/\s+/);
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : fullName;
        const lastName = parts.length > 1 ? parts.slice(-1).join(' ') : fullName;
        const newStudent = await addStudent({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          className: studentData.className || selectedClass || 'Non spécifiée',
        });

        // Ajouter les notes
        for (const grade of studentData.grades) {
          if (grade.subject && grade.score) {
            let subject = subjects.find(s => s.name.toLowerCase() === grade.subject.toLowerCase());
            if (!subject) {
              const newSubject = await addSubject({ name: grade.subject });
              setSubjects(prev => [...prev, newSubject]);
              subject = newSubject;
              newSubjectsCreated++;
            }
            
            await addGrade({
              studentId: newStudent.id,
              subjectId: subject.id,
              score: parseFloat(grade.score) || 0,
              gradeScale: grade.scale?.toString() || '20',
            });
            totalGrades++;
          }
        }
        savedStudents++;
      }

      Alert.alert(
        'Succès', 
        `${savedStudents} élève(s) ajouté(s) avec ${totalGrades} note(s) au total.` + 
        (newSubjectsCreated > 0 ? `\n${newSubjectsCreated} nouvelle(s) matière(s) créée(s).` : '')
      );
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Erreur de sauvegarde', error.message);
    } finally {
      setLoading(false);
      setSaveProgress({ current: 0, total: 0, saving: false });
    }
  };

  const renderOCRStatus = () => {
    const statusConfig = {
      initializing: { text: '🔄 Initialisation OCR Multi-Élèves...', color: '#FFA500' },
      ready: { text: '✅ OCR Multi-Élèves Prêt', color: '#4CAF50' },
      processing: { text: '🔍 Analyse multi-élèves en cours...', color: '#2196F3' },
      success: { text: '✅ OCR Multi-Élèves Réussi', color: '#4CAF50' },
      error: { text: '❌ Erreur OCR Multi-Élèves', color: '#F44336' }
    };
    const config = statusConfig[ocrStatus];

    return (
      <View style={[styles.statusContainer, { backgroundColor: config.color }]}>
        <Text style={styles.statusText}>{config.text}</Text>
        {ocrSystemStatus && ocrStatus !== 'initializing' && (
          <Text style={styles.statusSubtext}>
            (Gemini: {ocrSystemStatus.gemini ? '✅' : '❌'} | Multi-Support: {ocrSystemStatus.multiStudentSupport ? '✅' : '❌'})
          </Text>
        )}
      </View>
    );
  };

  const renderStudentCard = (studentData, index) => (
    <View key={index} style={styles.studentCard}>
      <View style={styles.studentHeader}>
        <Text style={styles.studentTitle}>Élève {index + 1}</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            setSelectedStudentIndex(index);
            setShowStudentModal(true);
          }}
        >
          <Text style={styles.editButtonText}>✏️ Modifier</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.studentName}>
        {studentData.student.fullName}
      </Text>
      <Text style={styles.studentClass}>Classe: {studentData.className}</Text>
      <Text style={styles.gradesCount}>{studentData.grades.length} note(s)</Text>
    </View>
  );

  const renderStudentModal = () => {
    if (!parsedData?.students || selectedStudentIndex >= parsedData.students.length) return null;
    
    const studentData = parsedData.students[selectedStudentIndex];

    return (
      <Modal visible={showStudentModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier Élève {selectedStudentIndex + 1}</Text>
            <TouchableOpacity onPress={() => setShowStudentModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Informations de l'élève</Text>
            <TextInput
              style={styles.textInput}
              value={studentData.student?.fullName || ''}
              onChangeText={value => handleStudentInfoChange(selectedStudentIndex, 'fullName', value)}
              placeholder="Nom (complet)"
            />
            <TextInput
              style={styles.textInput}
              value={studentData.className || ''}
              onChangeText={value => handleClassChange(selectedStudentIndex, value)}
              placeholder="Classe"
            />

            <View style={styles.gradesSection}>
              <View style={styles.gradesSectionHeader}>
                <Text style={styles.sectionTitle}>Notes ({studentData.grades.length})</Text>
                <TouchableOpacity 
                  style={styles.addGradeButton}
                  onPress={() => addGradeToStudent(selectedStudentIndex)}
                >
                  <Text style={styles.addGradeButtonText}>+ Ajouter</Text>
                </TouchableOpacity>
              </View>

              {studentData.grades?.map((grade, gradeIndex) => (
                <View key={gradeIndex} style={styles.gradeItem}>
                  <TextInput 
                    style={[styles.textInput, styles.gradeInput]} 
                    value={grade.subject} 
                    onChangeText={value => handleGradeChange(selectedStudentIndex, gradeIndex, 'subject', value)} 
                    placeholder="Matière" 
                  />
                  <TextInput 
                    style={[styles.textInput, styles.scoreInput]} 
                    value={String(grade.score)} 
                    onChangeText={value => handleGradeChange(selectedStudentIndex, gradeIndex, 'score', value)} 
                    placeholder="Note" 
                    keyboardType="numeric" 
                  />
                  <TextInput 
                    style={[styles.textInput, styles.scaleInput]} 
                    value={String(grade.scale)} 
                    onChangeText={value => handleGradeChange(selectedStudentIndex, gradeIndex, 'scale', value)} 
                    placeholder="/20" 
                    keyboardType="numeric" 
                  />
                  <TouchableOpacity 
                    style={styles.removeGradeButton}
                    onPress={() => removeGradeFromStudent(selectedStudentIndex, gradeIndex)}
                  >
                    <Text style={styles.removeGradeButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>🔍 Scanner Multi-Élèves</Text>
      {renderOCRStatus()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Classe par défaut (obligatoire) et échelle des notes</Text>
        <Picker selectedValue={selectedClass} onValueChange={setSelectedClass} style={styles.picker}>
          {availableClasses.map(c => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
        </Picker>
        <View style={{ marginTop: 12 }}>
          <Text style={{ marginBottom: 6, color: '#333', fontWeight: '600' }}>Échelle des notes</Text>
          <Picker selectedValue={gradeScale} onValueChange={async (value) => {
            setGradeScaleState(value);
            try { await setGradeScale(value); } catch {}
            // Update existing parsed grades scales if present
            setParsedData((data) => {
              if (!data?.students) return data;
              const updated = { ...data, students: data.students.map(s => ({
                ...s,
                grades: (s.grades || []).map(g => ({ ...g, scale: String(value) }))
              })) };
              return updated;
            });
          }} style={styles.picker}>
            <Picker.Item label="/10" value="10" />
            <Picker.Item label="/20" value="20" />
          </Picker>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Choisissez une image</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => pickImage('camera')}>
            <Text style={styles.buttonText}>📸 Caméra</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => pickImage('gallery')}>
            <Text style={styles.buttonText}>🖼️ Galerie</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={pickDocument}>
            <Text style={styles.buttonText}>📄 Document/PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {imageUri && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Lancez l'analyse multi-élèves</Text>
          {imageUri.toLowerCase().endsWith('.pdf') ? (
            <View style={{ padding: 12, backgroundColor: '#f1f3f5', borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Aperçu PDF</Text>
              <Text numberOfLines={2} style={{ color: '#555' }}>{imageUri}</Text>
              <Text style={{ color: '#666', marginTop: 6 }}>Le PDF ne peut pas être prévisualisé ici. Il sera envoyé au moteur OCR.</Text>
            </View>
          ) : (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          )}
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={runOCR} 
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Analyse en cours...' : '🚀 Lancer l\'OCR Multi-Élèves'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && ocrStatus === 'processing' && (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginVertical: 20 }}/>
      )}

      {parsedData && parsedData.students && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              4. Élèves détectés ({parsedData.students.length})
            </Text>
            {smartSuggestions && smartSuggestions.confidence > 0 && (
              <TouchableOpacity 
                style={styles.suggestionsButton}
                onPress={() => setShowSuggestionsModal(true)}
              >
                <Text style={styles.suggestionsButtonText}>
                  💡 Suggestions ({Math.round(smartSuggestions.confidence * 100)}%)
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {parsedData.detectedClass && (
            <Text style={styles.detectedClass}>
              Classe détectée: {parsedData.detectedClass}
            </Text>
          )}

          {parsedData.students.map((studentData, index) => 
            renderStudentCard(studentData, index)
          )}
        </View>
      )}

      {saveProgress.saving && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Sauvegarde en cours: {saveProgress.current}/{saveProgress.total}
          </Text>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, styles.saveButton, (!parsedData || loading || !parsedData?.students?.every(s => s?.student?.fullName && s.student.fullName.trim())) && styles.disabledButton]}
        onPress={saveAllStudents} 
        disabled={!parsedData || loading || !parsedData?.students?.every(s => s?.student?.fullName && s.student.fullName.trim())}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sauvegarde en cours...' : `💾 Sauvegarder ${parsedData?.students?.length || 0} élève(s)`}
        </Text>
      </TouchableOpacity>

      {renderStudentModal()}
      
      <SmartSuggestionsModal
        visible={showSuggestionsModal}
        onClose={() => setShowSuggestionsModal(false)}
        suggestions={smartSuggestions || { students: [], subjects: [], classes: [], confidence: 0 }}
        onApplySuggestion={handleApplySuggestion}
        title="Suggestions d'amélioration Multi-Élèves"
      />
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  suggestionsButton: { backgroundColor: '#ffc107', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  suggestionsButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  picker: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  button: { backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center', flex: 1, marginHorizontal: 4 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  primaryButton: { backgroundColor: '#4CAF50', marginTop: 12 },
  saveButton: { backgroundColor: '#FF9800', marginTop: 16 },
  disabledButton: { backgroundColor: '#ccc' },
  imagePreview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12, backgroundColor: '#eee' },
  detectedClass: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50', marginBottom: 12, textAlign: 'center' },
  studentCard: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#dee2e6' },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  studentTitle: { fontSize: 16, fontWeight: 'bold', color: '#495057' },
  editButton: { backgroundColor: '#007bff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  editButtonText: { color: 'white', fontSize: 12 },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  studentClass: { fontSize: 14, color: '#6c757d', marginBottom: 2 },
  gradesCount: { fontSize: 14, color: '#28a745' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#e3f2fd', borderRadius: 8, marginBottom: 16 },
  progressText: { marginRight: 8, fontSize: 14, color: '#1976d2' },
  
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeButton: { fontSize: 24, color: '#6c757d' },
  modalContent: { flex: 1, padding: 16 },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9', marginBottom: 12 },
  gradesSection: { marginTop: 16 },
  gradesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addGradeButton: { backgroundColor: '#28a745', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  addGradeButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  gradeItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  gradeInput: { flex: 3 },
  scoreInput: { flex: 1 },
  scaleInput: { flex: 1 },
  removeGradeButton: { backgroundColor: '#dc3545', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 4 },
  removeGradeButtonText: { color: 'white', fontSize: 12 },
});

export default MultiStudentScanScreen;