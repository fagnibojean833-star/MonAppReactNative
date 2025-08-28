import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getStudentRankings } from '../database/database';

const RankingScreen = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRankings = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedRankings = await getStudentRankings();
      setRankings(fetchedRankings);
    } catch (error) {
      console.error('Failed to load rankings:', error);
      Alert.alert('Erreur', 'Impossible de charger le classement.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRankings();
    setRefreshing(false);
  }, [loadRankings]);

  useFocusEffect(
    useCallback(() => {
      loadRankings();
    }, [loadRankings])
  );

  const getRankColor = (rank) => {
    if (rank === 1) return '#ffd700'; // Gold
    if (rank === 2) return '#c0c0c0'; // Silver
    if (rank === 3) return '#cd7f32'; // Bronze
    return '#007bff'; // Blue
  };

  const getGradeColor = (score) => {
    if (score >= 16) return '#28a745'; // Excellent
    if (score >= 14) return '#20c997'; // Très bien
    if (score >= 12) return '#17a2b8'; // Bien
    if (score >= 10) return '#ffc107'; // Passable
    return '#dc3545'; // Insuffisant
  };

  const renderItem = ({ item }) => {
    const rankColor = getRankColor(item.rank);
    const gradeColor = getGradeColor(item.averageScore);
    
    return (
      <View style={styles.itemContainer}>
        <View style={[styles.rankContainer, { backgroundColor: rankColor }]}>
          <Text style={styles.rankText}>{item.rank}</Text>
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemText}>{`${item.lastName} ${item.firstName}`}</Text>
          <Text style={styles.itemSubText}>{`Classe: ${item.className}`}</Text>
          <Text style={styles.itemSubText}>{`${item.gradesCount} note(s) enregistrée(s)`}</Text>
        </View>
        <View style={styles.scoresContainer}>
          <Text style={styles.totalPoints}>{`${item.totalPoints.toFixed(1)} pts`}</Text>
          <Text style={[styles.averageScore, { color: gradeColor }]}>{`Moy: ${item.averageScore.toFixed(1)}`}</Text>
        </View>
      </View>
    );
  };

  const getClassStats = () => {
    if (rankings.length === 0) return { average: 0, best: 0, worst: 0 };
    
    const averages = rankings.map(r => r.averageScore).filter(avg => avg > 0);
    if (averages.length === 0) return { average: 0, best: 0, worst: 0 };
    
    const classAverage = averages.reduce((sum, avg) => sum + avg, 0) / averages.length;
    const bestAverage = Math.max(...averages);
    const worstAverage = Math.min(...averages);
    
    return {
      average: classAverage.toFixed(2),
      best: bestAverage.toFixed(2),
      worst: worstAverage.toFixed(2)
    };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement du classement...</Text>
      </View>
    );
  }

  const stats = getClassStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Classement des Élèves</Text>
        <Text style={styles.headerSubtitle}>
          {rankings.length} élève(s) classé(s) par total de points
        </Text>
      </View>

      {/* Statistiques de la classe */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Moyenne classe</Text>
          <Text style={styles.statValue}>{stats.average}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Meilleure</Text>
          <Text style={styles.statValue}>{stats.best}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Plus faible</Text>
          <Text style={styles.statValue}>{stats.worst}</Text>
        </View>
      </View>

      <FlatList
        data={rankings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun élève pour le classement</Text>
            <Text style={styles.emptySubText}>
              Ajoutez des élèves et des notes pour voir le classement
            </Text>
          </View>
        }
        contentContainerStyle={rankings.length === 0 ? styles.emptyList : undefined}
      />
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
  statsContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  rankContainer: {
    padding: 10,
    borderRadius: 25,
    marginRight: 15,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  itemDetails: {
    flex: 1,
  },
  itemText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemSubText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  scoresContainer: {
    alignItems: 'flex-end',
  },
  totalPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 2,
  },
  averageScore: {
    fontSize: 14,
    fontWeight: 'bold',
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
    textAlign: 'center',
  },
});

export default RankingScreen;
