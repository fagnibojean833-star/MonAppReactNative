import React, { useState, useCallback, useEffect } from 'react';
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
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSubjects, addSubjectForUI, deleteSubject, deleteAllSubjects, updateSubject, searchSubjects } from '../database/database';
import { useDebounce } from '../hooks/useDebounce';

const SubjectsScreen = () => {
  const [subjects, setSubjects] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedSubjects = await getSubjects();
      setSubjects(fetchedSubjects);
      setFilteredSubjects(fetchedSubjects);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des matières.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSubjects();
    setRefreshing(false);
  }, [loadSubjects]);

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [loadSubjects])
  );

  useEffect(() => {
    handleSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, subjects]);

  const handleSearch = useCallback(async (term) => {
    setSearchTerm(term);
    const searchResults = await searchSubjects(term);
    setFilteredSubjects(searchResults);
  }, []);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      Alert.alert('Erreur', 'Le nom de la matière est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSubjectForUI({ name: newSubjectName.trim() });
      Alert.alert('Succès', 'Matière ajoutée avec succès.');
      setModalVisible(false);
      setNewSubjectName('');
      loadSubjects();
    } catch (error) {
      console.error('Failed to add subject:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible d\'ajouter la matière.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    setEditSubjectName(subject.name);
    setEditModalVisible(true);
  };

  const handleUpdateSubject = async () => {
    if (!editSubjectName.trim()) {
      Alert.alert('Erreur', 'Le nom de la matière est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSubject(editingSubject.id, {
        name: editSubjectName.trim()
      });
      Alert.alert('Succès', 'Matière modifiée avec succès.');
      setEditModalVisible(false);
      setEditingSubject(null);
      setEditSubjectName('');
      loadSubjects();
    } catch (error) {
      console.error('Failed to update subject:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de modifier la matière.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = (id, subjectName) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la matière "${subjectName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSubject(id);
              Alert.alert('Succès', 'Matière supprimée avec succès.');
              loadSubjects();
            } catch (error) {
              console.error('Failed to delete subject:', error);
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer la matière.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllSubjects = () => {
    Alert.alert(
      'Confirmer la suppression totale',
      `Êtes-vous sûr de vouloir supprimer TOUTES les ${subjects.length} matières ?\n\n⚠️ Cette action supprimera également toutes les notes associées et est IRRÉVERSIBLE.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllSubjects();
              Alert.alert('Succès', 'Toutes les matières et notes associées ont été supprimées.');
              loadSubjects();
            } catch (error) {
              console.error('Failed to delete all subjects:', error);
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer toutes les matières.');
            }
          },
        },
      ]
    );
  };

  const renderSubjectItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemDetails}>
        <Text style={styles.itemText}>{item.name}</Text>
        <Text style={styles.itemSubText}>ID: {item.id}</Text>
      </View>
      <View style={styles.itemActions}>
        <Button 
          title="Modifier" 
          color="#007bff" 
          onPress={() => handleEditSubject(item)} 
        />
        <View style={{ width: 8 }} />
        <Button 
          title="Supprimer" 
          color="#dc3545" 
          onPress={() => handleDeleteSubject(item.id, item.name)} 
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement des matières...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Gestion des Matières</Text>
        <Text style={styles.headerSubtitle}>{filteredSubjects.length} matière(s) trouvée(s)</Text>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher une matière..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="➕ Ajouter une matière" 
          onPress={() => setModalVisible(true)}
          color="#28a745"
        />
        <View style={{ width: 10 }} />
        <Button 
          title={`🗑️ Supprimer tout (${subjects.length})`}
          onPress={handleDeleteAllSubjects}
          color="#dc3545"
          disabled={subjects.length === 0}
        />
      </View>

      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSubjectItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm ? 'Aucune matière trouvée' : 'Aucune matière enregistrée'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchTerm ? 'Essayez avec d\'autres termes de recherche' : 'Ajoutez votre première matière pour commencer !'}
            </Text>
            {!searchTerm && (
              <Button 
                title="Ajouter une matière" 
                onPress={() => setModalVisible(true)}
                color="#007bff"
              />
            )}
          </View>
        }
        contentContainerStyle={filteredSubjects.length === 0 ? styles.emptyList : undefined}
      />

      {/* Modal pour ajouter une matière */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter une nouvelle matière</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la matière *</Text>
              <TextInput 
                value={newSubjectName} 
                onChangeText={setNewSubjectName} 
                style={styles.input} 
                placeholder="Ex: Mathématiques, Français, Histoire..."
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <Button 
                title="Annuler" 
                onPress={() => {
                  setModalVisible(false);
                  setNewSubjectName('');
                }}
                color="#6c757d"
              />
              <View style={{ width: 10 }} />
              <Button 
                title={isSubmitting ? 'Ajout...' : 'Ajouter'} 
                onPress={handleAddSubject}
                disabled={isSubmitting}
                color="#007bff"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal pour modifier une matière */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier la matière</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la matière *</Text>
              <TextInput 
                value={editSubjectName} 
                onChangeText={setEditSubjectName} 
                style={styles.input} 
                placeholder="Ex: Mathématiques, Français, Histoire..."
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <Button 
                title="Annuler" 
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingSubject(null);
                  setEditSubjectName('');
                }}
                color="#6c757d"
              />
              <View style={{ width: 10 }} />
              <Button 
                title={isSubmitting ? 'Modification...' : 'Modifier'} 
                onPress={handleUpdateSubject}
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
  buttonContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  itemDetails: {
    flex: 1,
    marginRight: 10,
  },
  itemText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemSubText: {
    fontSize: 12,
    color: '#6c757d',
  },
  itemActions: {
    flexDirection: 'row',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#adb5bd',
    marginBottom: 30,
    textAlign: 'center',
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
  searchContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
});

export default SubjectsScreen;
