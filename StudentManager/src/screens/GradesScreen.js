import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Button, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  RefreshControl,
  TextInput,
  Modal,
  TouchableOpacity
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getStudents, 
  getSubjects, 
  getGradesForStudent, 
  addGrade, 
  deleteGrade, 
  updateGrade,
  deleteAllGrades,
  getGradeScale,
  setGradeScale,
  updateAllGradesScale,
  searchStudents
} from '../database/database';

const GradesScreen = () => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [gradeScale, setGradeScaleState] = useState('10'); // Échelle pour la nouvelle note (défaut global)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [editScore, setEditScore] = useState('');
  const [editGradeScale, setEditGradeScale] = useState('10'); // Échelle pour la modification (défaut global)
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [globalScale, setGlobalScale] = useState('10');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedStudents, fetchedSubjects, fetchedScale] = await Promise.all([
        getStudents(),
        getSubjects(),
        getGradeScale()
      ]);
      setStudents(fetchedStudents);
      setFilteredStudents(fetchedStudents);
      setSubjects(fetchedSubjects);
      setGlobalScale(String(fetchedScale || '10'));
      // aligner les defaults modaux sur l'échelle globale
      setGradeScaleState(String(fetchedScale || '10'));
      setEditGradeScale(String(fetchedScale || '10'));
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudentGrades = useCallback(async (studentId) => {
    if (!studentId) return;
    
    try {
      const grades = await getGradesForStudent(studentId);
      setStudentGrades(grades);
    } catch (error) {
      console.error('Failed to load student grades:', error);
      Alert.alert('Erreur', 'Impossible de charger les notes de l\'élève.');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    if (selectedStudent) {
      await loadStudentGrades(selectedStudent.id);
    }
    setRefreshing(false);
  }, [loadData, selectedStudent, loadStudentGrades]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (modalVisible) {
      // Lorsque l'on ouvre le modal d'ajout, caler l'échelle sur l'échelle globale
      setGradeScaleState(globalScale);
    }
  }, [modalVisible, globalScale]);

  const handleChangeGlobalScale = async (newScale) => {
    if (newScale === globalScale) return;
    Alert.alert(
      'Changer l\'échelle',
      `Nouvelle échelle: /${newScale}. Voulez-vous convertir les notes existantes ?`,
      [
        {
          text: 'Garder telles quelles',
          onPress: async () => {
            try {
              await setGradeScale(String(newScale));
              setGlobalScale(String(newScale));
              // Pas de conversion → les notes gardent leur échelle propre
              if (selectedStudent) await loadStudentGrades(selectedStudent.id);
              Alert.alert('Échelle mise à jour', `Échelle globale définie sur /${newScale}.`);
            } catch (e) {
              console.error(e);
              Alert.alert('Erreur', 'Impossible de changer l\'échelle.');
            }
          },
          style: 'default'
        },
        {
          text: 'Convertir',
          onPress: async () => {
            try {
              await updateAllGradesScale(String(newScale), true);
              await setGradeScale(String(newScale));
              setGlobalScale(String(newScale));
              if (selectedStudent) await loadStudentGrades(selectedStudent.id);
              Alert.alert('Conversion effectuée', `Toutes les notes ont été converties à /${newScale}.`);
            } catch (e) {
              console.error(e);
              Alert.alert('Erreur', 'Conversion impossible.');
            }
          },
          style: 'destructive'
        },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  const handleStudentSelect = async (student) => {
    setSelectedStudent(student);
    await loadStudentGrades(student.id);
  };

  const handleSearch = async (text) => {
    setSearchTerm(text);
    const filtered = await searchStudents(text);
    setFilteredStudents(filtered);
  };

  const handleAddGrade = async () => {
    if (!selectedStudent) {
      Alert.alert('Erreur', 'Veuillez sélectionner un élève.');
      return;
    }

    if (!selectedSubject) {
      Alert.alert('Erreur', 'Veuillez sélectionner une matière.');
      return;
    }

    if (!gradeScore.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une note.');
      return;
    }

    const maxScore = gradeScale === '5' ? 5 : gradeScale === '10' ? 10 : 20;
    const score = parseFloat(gradeScore);
    if (isNaN(score) || score < 0 || score > maxScore) {
      Alert.alert('Erreur', `La note doit être comprise entre 0 et ${maxScore}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await addGrade({
        studentId: selectedStudent.id,
        subjectId: parseInt(selectedSubject),
        score: score,
        gradeScale: gradeScale
      });
      Alert.alert('Succès', 'Note ajoutée avec succès.');
      setModalVisible(false);
      setSelectedSubject('');
      setGradeScore('');
      setGradeScaleState(globalScale); // Reset à l'échelle globale
      await loadStudentGrades(selectedStudent.id);
    } catch (error) {
      console.error('Failed to add grade:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible d\'ajouter la note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGrade = (grade) => {
    setEditingGrade(grade);
    setEditScore(grade.score.toString());
    setEditGradeScale(grade.gradeScale || globalScale);
    setEditModalVisible(true);
  };

  const handleUpdateGrade = async () => {
    if (!editScore.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une note.');
      return;
    }

    const maxScore = editGradeScale === '5' ? 5 : editGradeScale === '10' ? 10 : 20;
    const score = parseFloat(editScore);
    if (isNaN(score) || score < 0 || score > maxScore) {
      Alert.alert('Erreur', `La note doit être comprise entre 0 et ${maxScore}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateGrade(editingGrade.id, {
        score: score,
        gradeScale: editGradeScale
      });
      Alert.alert('Succès', 'Note modifiée avec succès.');
      setEditModalVisible(false);
      setEditingGrade(null);
      setEditScore('');
      setEditGradeScale(globalScale);
      await loadStudentGrades(selectedStudent.id);
    } catch (error) {
      console.error('Failed to update grade:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de modifier la note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGrade = (gradeId, subjectName, score) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la note ${score} en ${subjectName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGrade(gradeId);
              Alert.alert('Succès', 'Note supprimée avec succès.');
              await loadStudentGrades(selectedStudent.id);
            } catch (error) {
              console.error('Failed to delete grade:', error);
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer la note.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllGrades = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer TOUTES les notes ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllGrades();
              Alert.alert('Succès', 'Toutes les notes ont été supprimées.');
              if (selectedStudent) {
                await loadStudentGrades(selectedStudent.id);
              }
            } catch (error) {
              console.error('Failed to delete all grades:', error);
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer toutes les notes.');
            }
          },
        },
      ]
    );
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.studentItem,
        selectedStudent?.id === item.id && styles.selectedStudentItem
      ]}
      onPress={() => handleStudentSelect(item)}
    >
      <Text style={[
        styles.studentText,
        selectedStudent?.id === item.id && styles.selectedStudentText
      ]}>
        {`${item.lastName} ${item.firstName}`}
      </Text>
      <Text style={[
        styles.studentSubText,
        selectedStudent?.id === item.id && styles.selectedStudentSubText
      ]}>
        {item.className}
      </Text>
    </TouchableOpacity>
  );

  const renderGradeItem = ({ item }) => (
    <View style={styles.gradeItem}>
      <View style={styles.gradeDetails}>
        <Text style={styles.gradeSubject}>{item.subjectName}</Text>
        <Text style={styles.gradeScore}>{`${item.score}/${item.gradeScale || globalScale}`}</Text>
      </View>
      <View style={styles.gradeActions}>
        <Button 
          title="Modifier" 
          color="#007bff" 
          onPress={() => handleEditGrade(item)} 
        />
        <View style={{ width: 8 }} />
        <Button 
          title="Supprimer" 
          color="#dc3545" 
          onPress={() => handleDeleteGrade(item.id, item.subjectName, item.score)} 
        />
      </View>
    </View>
  );

  const averageGrade = useMemo(() => {
    if (studentGrades.length === 0) return 0;
    const total = studentGrades.reduce((sum, grade) => sum + parseFloat(grade.score || 0), 0);
    return (total / studentGrades.length).toFixed(2);
  }, [studentGrades]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 Gestion des Notes</Text>
        <Text style={styles.headerSubtitle}>
          {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Sélectionnez un élève'}
        </Text>
      </View>

      {/* Sélection de l'échelle globale */}
      <View style={styles.scaleContainer}>
        <Text style={styles.scaleLabel}>Échelle par défaut</Text>
        <View style={styles.scalePickerContainer}>
          <Picker
            selectedValue={globalScale}
            onValueChange={handleChangeGlobalScale}
            style={styles.scalePicker}
          >
            <Picker.Item label="/5" value="5" />
            <Picker.Item label="/10" value="10" />
            <Picker.Item label="/20" value="20" />
          </Picker>
        </View>
      </View>

      <View style={styles.content}>
        {/* Liste des élèves */}
        <View style={styles.studentsSection}>
          <Text style={styles.sectionTitle}>Élèves</Text>
          
          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Rechercher un élève..."
              value={searchTerm}
              onChangeText={handleSearch}
              placeholderTextColor="#6c757d"
            />
          </View>
          
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderStudentItem}
            style={styles.studentsList}
          />
        </View>

        {/* Notes de l'élève sélectionné */}
        {selectedStudent && (
          <View style={styles.gradesSection}>
            <View style={styles.gradesHeader}>
              <Text style={styles.sectionTitle}>Notes de {selectedStudent.firstName}</Text>
              <Text style={styles.averageText}>Moyenne: {averageGrade}</Text>
            </View>
            
            <View style={styles.gradesButtons}>
              <Button 
                title="➕ Ajouter une note" 
                onPress={() => setModalVisible(true)}
                color="#28a745"
                style={styles.addGradeButton}
              />
              <View style={{ width: 10 }} />
              <Button 
                title="🗑️ Supprimer tout" 
                onPress={handleDeleteAllGrades}
                color="#dc3545"
                style={styles.deleteAllButton}
              />
            </View>

            <FlatList
              data={studentGrades}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderGradeItem}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Aucune note pour cet élève</Text>
                  <Text style={styles.emptySubText}>Ajoutez sa première note !</Text>
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* Modal pour ajouter une note */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter une note</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Matière *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedSubject}
                  onValueChange={setSelectedSubject}
                  style={styles.picker}
                >
                  <Picker.Item label="Sélectionnez une matière" value="" />
                  {subjects.map(subject => (
                    <Picker.Item key={subject.id} label={subject.name} value={subject.id.toString()} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Échelle des notes *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={gradeScale}
                  onValueChange={setGradeScaleState}
                  style={styles.picker}
                >
                  <Picker.Item label="Sur 5" value="5" />
                  <Picker.Item label="Sur 10" value="10" />
                  <Picker.Item label="Sur 20" value="20" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Note (sur {gradeScale === '5' ? '5' : gradeScale === '10' ? '10' : '20'}) *</Text>
              <TextInput 
                value={gradeScore} 
                onChangeText={setGradeScore} 
                style={styles.input} 
                placeholder={`Ex: ${gradeScale === '5' ? '4.5' : gradeScale === '10' ? '8.5' : '15.5'}`}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <Button 
                title="Annuler" 
                onPress={() => {
                  setModalVisible(false);
                  setSelectedSubject('');
                  setGradeScore('');
                  setGradeScaleState(globalScale);
                }}
                color="#6c757d"
              />
              <View style={{ width: 10 }} />
              <Button 
                title={isSubmitting ? 'Ajout...' : 'Ajouter'} 
                onPress={handleAddGrade}
                disabled={isSubmitting}
                color="#007bff"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal pour modifier une note */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier la note</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Matière</Text>
              <Text style={styles.readOnlyText}>{editingGrade?.subjectName}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Échelle des notes *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editGradeScale}
                  onValueChange={setEditGradeScale}
                  style={styles.picker}
                >
                  <Picker.Item label="Sur 5" value="5" />
                  <Picker.Item label="Sur 10" value="10" />
                  <Picker.Item label="Sur 20" value="20" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nouvelle note (sur {editGradeScale === '5' ? '5' : editGradeScale === '10' ? '10' : '20'}) *</Text>
              <TextInput 
                value={editScore} 
                onChangeText={setEditScore} 
                style={styles.input} 
                placeholder={`Ex: ${editGradeScale === '5' ? '4.5' : editGradeScale === '10' ? '8.5' : '15.5'}`}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <Button 
                title="Annuler" 
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingGrade(null);
                  setEditScore('');
                  setEditGradeScale(globalScale);
                }}
                color="#6c757d"
              />
              <View style={{ width: 10 }} />
              <Button 
                title={isSubmitting ? 'Modification...' : 'Modifier'} 
                onPress={handleUpdateGrade}
                disabled={isSubmitting}
                color="#007bff"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  studentsSection: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  searchContainer: {
    marginBottom: 15,
  },
  studentsList: {
    maxHeight: 100,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#333',
  },
  studentItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginRight: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  selectedStudentItem: {
    backgroundColor: '#007bff',
  },
  studentText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedStudentText: {
    color: '#fff',
  },
  studentSubText: {
    fontSize: 12,
    color: '#6c757d',
  },
  selectedStudentSubText: {
    color: '#e3f2fd',
  },
  gradesSection: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  gradesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  averageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  addGradeButton: {
    flex: 1,
  },
  deleteAllButton: {
    flex: 1,
  },
  gradesButtons: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  gradeItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeDetails: {
    flex: 1,
  },
  gradeSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  gradeScore: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  gradeActions: {
    flexDirection: 'row',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scaleContainer: {
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  scaleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scalePickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    width: 120,
  },
  scalePicker: {
    height: 40,
  },
  readOnlyText: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f1f3f4',
    color: '#666',
  },
});

export default GradesScreen;
