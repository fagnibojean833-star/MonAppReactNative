import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getStudents, deleteStudent, searchStudents, getStudentRankings, deleteAllStudents } from '../database/database';
import { useDebounce } from '../hooks/useDebounce';

const HomeScreen = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedStudents, fetchedRankings] = await Promise.all([
        getStudents(),
        getStudentRankings()
      ]);
      setStudents(fetchedStudents);
      setFilteredStudents(fetchedStudents);
      setRankings(fetchedRankings);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    handleSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, students]);

  const handleSearch = useCallback(async (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredStudents(students);
      return;
    }

    try {
      const searchResults = await searchStudents(term);
      setFilteredStudents(searchResults);
    } catch (error) {
      setFilteredStudents(students);
    }
  }, [students]);

  const handleDelete = (id, studentName) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer ${studentName} ? Cette action est irréversible.`, 
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudent(id);
              Alert.alert('Succès', 'Élève supprimé avec succès.');
              loadData();
            } catch (error) {
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer l\'élève.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllStudents = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer TOUS les élèves ? Cette action supprimera aussi toutes les notes et est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllStudents();
              Alert.alert('Succès', 'Tous les élèves ont été supprimés.');
              loadData();
            } catch (error) {
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer tous les élèves.');
            }
          },
        },
      ]
    );
  };

  const renderStudentItem = ({ item }) => {
    const studentRanking = rankings.find(r => r.id === item.id);
    const stats = studentRanking || { averageScore: 0, gradesCount: 0 };
    
    let gradeColor = '#6c757d';
    if (stats.averageScore >= 16) gradeColor = '#28a745';
    else if (stats.averageScore >= 12) gradeColor = '#ffc107';
    else if (stats.averageScore >= 8) gradeColor = '#fd7e14';
    else if (stats.averageScore > 0) gradeColor = '#dc3545';

    return (
      <View style={styles.studentItem}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.studentDetails}>
            Classe: {item.className}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Notes</Text>
            <Text style={styles.statValue}>{stats.gradesCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Moyenne</Text>
            <Text style={[styles.statValue, { color: gradeColor }]}>{stats.averageScore.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('AddEditStudent', { student: item })}
          >
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id, `${item.firstName} ${item.lastName}`)} 
          >
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement des élèves...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestionnaire d'Élèves</Text>
        <Text style={styles.headerSubtitle}>{filteredStudents.length} élève(s) trouvé(s)</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher un élève..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.addButton]}
          onPress={() => navigation.navigate('AddEditStudent', {})}
        >
          <Text style={styles.actionButtonText}>➕ Ajouter un élève</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.subjectsButton]}
          onPress={() => navigation.navigate('Subjects')} 
        >
          <Text style={styles.actionButtonText}>📚 Matières</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.gradesButton]}
          onPress={() => navigation.navigate('Grades')} 
        >
          <Text style={styles.actionButtonText}>📝 Notes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rankingButton]}
          onPress={() => navigation.navigate('Ranking')} 
        >
          <Text style={styles.actionButtonText}>🏆 Classement</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.exportButton]}
          onPress={() => navigation.navigate('Export')} 
        >
          <Text style={styles.actionButtonText}>📊 Export</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.ocrButton]}
          onPress={() => navigation.navigate('ScanOCR')} 
        >
          <Text style={styles.actionButtonText}>🧠 Scan OCR</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.multiScanButton]}
          onPress={() => navigation.navigate('MultiStudentScan')} 
        >
          <Text style={styles.actionButtonText}>👥 Scan Multi-Élèves</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.historyButton]}
          onPress={() => navigation.navigate('ScanHistory')} 
        >
          <Text style={styles.actionButtonText}>📋 Historique Scans</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.debugButton]}
          onPress={() => navigation.navigate('OCRTest')} 
        >
          <Text style={styles.actionButtonText}>🔧 Tests OCR</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteAllButton]}
          onPress={handleDeleteAllStudents}
        >
          <Text style={styles.actionButtonText}>🗑️ Supprimer tout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredStudents}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.studentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun élève trouvé</Text>
            <Text style={styles.emptySubtext}>
              {searchTerm ? 'Essayez de modifier vos critères de recherche' : 'Commencez par ajouter votre premier élève'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  header: { marginBottom: 20, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, color: '#6c757d' },
  searchContainer: { marginBottom: 20 },
  searchInput: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  actionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  actionButton: { width: '48%', marginBottom: 12, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  addButton: { backgroundColor: '#28a745' },
  subjectsButton: { backgroundColor: '#17a2b8' },
  gradesButton: { backgroundColor: '#ffc107' },
  rankingButton: { backgroundColor: '#6f42c1' },
  exportButton: { backgroundColor: '#e83e8c' },
  ocrButton: { backgroundColor: '#20c997' },
  multiScanButton: { backgroundColor: '#6f42c1' },
  historyButton: { backgroundColor: '#17a2b8' },
  debugButton: { backgroundColor: '#fd7e14' },
  deleteAllButton: { backgroundColor: '#dc3545' },
  editButton: { backgroundColor: '#007bff' },
  deleteButton: { backgroundColor: '#dc3545' },
  studentsList: { flex: 1 },
  studentItem: { backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  studentInfo: { marginBottom: 12 },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  studentDetails: { fontSize: 14, color: '#6c757d' },
  statsContainer: { flexDirection: 'row', marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6c757d', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  itemActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#6c757d' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, color: '#6c757d', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#adb5bd', textAlign: 'center' },
});

export default HomeScreen;
