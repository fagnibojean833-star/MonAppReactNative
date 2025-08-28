import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Alert, ActivityIndicator,
  TouchableOpacity, RefreshControl, Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCAN_HISTORY_KEY = 'scan_history';

const ScanHistoryScreen = () => {
  const [scanHistory, setScanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const loadScanHistory = useCallback(async () => {
    try {
      setLoading(true);
      const historyData = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      const history = historyData ? JSON.parse(historyData) : [];
      
      // Trier par date décroissante
      history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setScanHistory(history);
    } catch (error) {
      console.error('Error loading scan history:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique des scans.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScanHistory();
    setRefreshing(false);
  }, [loadScanHistory]);

  useFocusEffect(
    useCallback(() => {
      loadScanHistory();
    }, [loadScanHistory])
  );

  const clearHistory = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer tout l\'historique des scans ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(SCAN_HISTORY_KEY);
              setScanHistory([]);
              Alert.alert('Succès', 'Historique supprimé avec succès.');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'historique.');
            }
          },
        },
      ]
    );
  };

  const deleteScanEntry = (id) => {
    Alert.alert(
      'Confirmer la suppression',
      'Supprimer cette entrée de l\'historique ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedHistory = scanHistory.filter(item => item.id !== id);
              await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updatedHistory));
              setScanHistory(updatedHistory);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'entrée.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'partial': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success': return '✅ Réussi';
      case 'error': return '❌ Échec';
      case 'partial': return '⚠️ Partiel';
      default: return '❓ Inconnu';
    }
  };

  const renderScanItem = ({ item }) => (
    <View style={styles.scanItem}>
      <View style={styles.scanHeader}>
        <View style={styles.scanInfo}>
          <Text style={styles.scanDate}>{formatDate(item.timestamp)}</Text>
          <Text style={[styles.scanStatus, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteScanEntry(item.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scanDetails}>
        <Text style={styles.scanType}>
          Type: {item.type === 'multi' ? 'Multi-Élèves' : 'Élève unique'}
        </Text>
        <Text style={styles.scanSource}>Source: {item.source || 'Inconnue'}</Text>
        {item.confidence && (
          <Text style={styles.scanConfidence}>
            Confiance: {Math.round(item.confidence * 100)}%
          </Text>
        )}
      </View>

      {item.results && (
        <View style={styles.scanResults}>
          <Text style={styles.resultsTitle}>Résultats:</Text>
          {item.type === 'multi' ? (
            <Text style={styles.resultsText}>
              {item.results.studentsCount || 0} élève(s) détecté(s)
            </Text>
          ) : (
            <Text style={styles.resultsText}>
              {item.results.studentName || 'Nom non détecté'} - {item.results.gradesCount || 0} note(s)
            </Text>
          )}
        </View>
      )}

      {item.imageUri && (
        <View style={styles.imageContainer}>
          <Text style={styles.imageLabel}>Image scannée:</Text>
          <Image source={{ uri: item.imageUri }} style={styles.thumbnailImage} />
        </View>
      )}

      {item.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur: {item.error}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement de l'historique...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique des Scans</Text>
        <Text style={styles.headerSubtitle}>{scanHistory.length} scan(s) enregistré(s)</Text>
      </View>

      {scanHistory.length > 0 && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.clearButton]}
            onPress={clearHistory}
          >
            <Text style={styles.actionButtonText}>🗑️ Vider l'historique</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={scanHistory}
        renderItem={renderScanItem}
        keyExtractor={(item) => item.id}
        style={styles.historyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun scan enregistré</Text>
            <Text style={styles.emptySubtext}>
              L'historique de vos scans OCR apparaîtra ici
            </Text>
            <TouchableOpacity 
              style={[styles.actionButton, styles.scanButton]}
              onPress={() => navigation.navigate('ScanOCR')}
            >
              <Text style={styles.actionButtonText}>🔍 Commencer un scan</Text>
            </TouchableOpacity>
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
  actionsContainer: { marginBottom: 16 },
  actionButton: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  clearButton: { backgroundColor: '#dc3545' },
  scanButton: { backgroundColor: '#28a745', marginTop: 16 },
  historyList: { flex: 1 },
  scanItem: { 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 12, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  },
  scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  scanInfo: { flex: 1 },
  scanDate: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  scanStatus: { fontSize: 14, fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#dc3545', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  deleteButtonText: { color: 'white', fontSize: 12 },
  scanDetails: { marginBottom: 12 },
  scanType: { fontSize: 14, color: '#6c757d', marginBottom: 2 },
  scanSource: { fontSize: 14, color: '#6c757d', marginBottom: 2 },
  scanConfidence: { fontSize: 14, color: '#6c757d' },
  scanResults: { marginBottom: 12 },
  resultsTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  resultsText: { fontSize: 14, color: '#495057' },
  imageContainer: { marginBottom: 12 },
  imageLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  thumbnailImage: { width: 100, height: 60, borderRadius: 4, backgroundColor: '#eee' },
  errorContainer: { backgroundColor: '#f8d7da', padding: 8, borderRadius: 4 },
  errorText: { fontSize: 12, color: '#721c24' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#6c757d' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, color: '#6c757d', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#adb5bd', textAlign: 'center', marginBottom: 20 },
});

// Fonction utilitaire pour sauvegarder un scan dans l'historique
export const saveScanToHistory = async (scanData) => {
  try {
    const historyData = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
    const history = historyData ? JSON.parse(historyData) : [];
    
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...scanData
    };
    
    history.unshift(newEntry);
    
    // Limiter l'historique à 50 entrées
    if (history.length > 50) {
      history.splice(50);
    }
    
    await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving scan to history:', error);
  }
};

export default ScanHistoryScreen;