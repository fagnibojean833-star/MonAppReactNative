import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput
} from 'react-native';
import { runFullTestSuite, generateTestReport, testJSONParsing } from '../utils/ocrTestUtils';
import { initializeOCR, getOCRStatus } from '../ocr/OCRScanner';
import { initializeMultiStudentOCR, getMultiStudentOCRStatus } from '../ocr/MultiStudentOCRScanner';

const OCRTestScreen = () => {
  const [testResults, setTestResults] = useState(null);
  const [ocrStatus, setOcrStatus] = useState(null);
  const [multiOcrStatus, setMultiOcrStatus] = useState(null);
  const [customJSON, setCustomJSON] = useState('');
  const [customTestResult, setCustomTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeSystems();
  }, []);

  const initializeSystems = async () => {
    setLoading(true);
    try {
      await Promise.all([
        initializeOCR(),
        initializeMultiStudentOCR()
      ]);
      
      setOcrStatus(getOCRStatus());
      setMultiOcrStatus(getMultiStudentOCRStatus());
    } catch (error) {
      console.error('Error initializing OCR systems:', error);
      Alert.alert('Erreur', 'Impossible d\'initialiser les systèmes OCR');
    } finally {
      setLoading(false);
    }
  };

  const runTests = () => {
    setLoading(true);
    try {
      const results = runFullTestSuite();
      setTestResults(results);
      
      const report = generateTestReport(results);
      console.log(report);
      
      Alert.alert(
        'Tests terminés',
        `${results.summary.passed}/${results.summary.totalTests} tests réussis`,
        [
          { text: 'OK' },
          {
            text: 'Voir rapport',
            onPress: () => Alert.alert('Rapport de test', report)
          }
        ]
      );
    } catch (error) {
      console.error('Error running tests:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'exécution des tests');
    } finally {
      setLoading(false);
    }
  };

  const testCustomJSON = () => {
    if (!customJSON.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un JSON à tester');
      return;
    }

    const result = testJSONParsing(customJSON);
    setCustomTestResult(result);

    const message = result.success 
      ? 'JSON valide ✅' 
      : `JSON invalide ❌\nErreurs: ${result.errors.join(', ')}`;
    
    Alert.alert('Résultat du test', message);
  };

  const renderStatusCard = (title, status, icon) => (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>{icon} {title}</Text>
      {status ? (
        <>
          <Text style={[styles.statusText, { color: status.isReady ? '#28a745' : '#dc3545' }]}>
            {status.isReady ? 'Prêt' : 'Non disponible'}
          </Text>
          <Text style={styles.statusDetail}>Gemini: {status.gemini ? '✅' : '❌'}</Text>
          <Text style={styles.statusDetail}>Méthode: {status.currentMethod}</Text>
          {status.multiStudentSupport && (
            <Text style={styles.statusDetail}>Multi-élèves: ✅</Text>
          )}
        </>
      ) : (
        <Text style={styles.statusText}>Chargement...</Text>
      )}
    </View>
  );

  const renderTestResults = () => {
    if (!testResults) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Résultats des tests</Text>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé</Text>
          <Text style={styles.summaryText}>
            ✅ Réussis: {testResults.summary.passed}/{testResults.summary.totalTests}
          </Text>
          <Text style={styles.summaryText}>
            ❌ Échoués: {testResults.summary.failed}
          </Text>
          <Text style={styles.summaryText}>
            ⚠️ Avertissements: {testResults.summary.warnings}
          </Text>
        </View>

        <View style={styles.testGroup}>
          <Text style={styles.testGroupTitle}>👤 Tests élève unique</Text>
          <Text style={styles.testResult}>
            JSON valide: {testResults.singleStudent.valid.success ? '✅' : '❌'}
          </Text>
          <Text style={styles.testResult}>
            JSON invalide: {testResults.singleStudent.invalid.success ? '✅' : '❌'}
          </Text>
          <Text style={styles.testResult}>
            JSON incomplet: {testResults.singleStudent.incomplete.success ? '✅' : '❌'}
          </Text>
        </View>

        <View style={styles.testGroup}>
          <Text style={styles.testGroupTitle}>👥 Tests multi-élèves</Text>
          <Text style={styles.testResult}>
            JSON valide: {testResults.multiStudent.valid.success ? '✅' : '❌'}
          </Text>
          <Text style={styles.testResult}>
            JSON invalide: {testResults.multiStudent.invalid.success ? '✅' : '❌'}
          </Text>
          <Text style={styles.testResult}>
            JSON vide: {testResults.multiStudent.empty.success ? '✅' : '❌'}
          </Text>
        </View>

        <View style={styles.testGroup}>
          <Text style={styles.testGroupTitle}>🔍 Reconnaissance de patterns</Text>
          <Text style={styles.testResult}>
            Noms détectés: {testResults.patterns.names.length}
          </Text>
          <Text style={styles.testResult}>
            Notes détectées: {testResults.patterns.grades.length}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Tests et Diagnostics OCR</Text>

      {/* Statut des systèmes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📡 Statut des systèmes</Text>
        {renderStatusCard('OCR Simple', ocrStatus, '👤')}
        {renderStatusCard('OCR Multi-Élèves', multiOcrStatus, '👥')}
      </View>

      {/* Boutons d'action */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Actions de test</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runTests}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Tests en cours...' : 'Exécuter tous les tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={initializeSystems}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Réinitialiser les systèmes</Text>
        </TouchableOpacity>
      </View>

      {/* Test JSON personnalisé */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Test JSON personnalisé</Text>
        
        <TextInput
          style={styles.jsonInput}
          placeholder="Collez ici un JSON à tester..."
          value={customJSON}
          onChangeText={setCustomJSON}
          multiline
          numberOfLines={8}
        />
        
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={testCustomJSON}
        >
          <Text style={styles.buttonText}>Tester ce JSON</Text>
        </TouchableOpacity>

        {customTestResult && (
          <View style={[styles.resultCard, { 
            backgroundColor: customTestResult.success ? '#d4edda' : '#f8d7da' 
          }]}>
            <Text style={styles.resultTitle}>
              {customTestResult.success ? '✅ JSON Valide' : '❌ JSON Invalide'}
            </Text>
            {customTestResult.errors.length > 0 && (
              <>
                <Text style={styles.resultSubtitle}>Erreurs:</Text>
                {customTestResult.errors.map((error, index) => (
                  <Text key={index} style={styles.resultText}>• {error}</Text>
                ))}
              </>
            )}
            {customTestResult.warnings.length > 0 && (
              <>
                <Text style={styles.resultSubtitle}>Avertissements:</Text>
                {customTestResult.warnings.map((warning, index) => (
                  <Text key={index} style={styles.resultText}>• {warning}</Text>
                ))}
              </>
            )}
          </View>
        )}
      </View>

      {/* Résultats des tests */}
      {renderTestResults()}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  statusCard: { 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  statusTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  statusText: { fontSize: 14, marginBottom: 4 },
  statusDetail: { fontSize: 12, color: '#666', marginBottom: 2 },
  button: { 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginBottom: 12 
  },
  primaryButton: { backgroundColor: '#007bff' },
  secondaryButton: { backgroundColor: '#6c757d' },
  testButton: { backgroundColor: '#28a745' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  jsonInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: 12
  },
  resultCard: {
    padding: 16,
    borderRadius: 8,
    marginTop: 12
  },
  resultTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  resultSubtitle: { fontSize: 14, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  resultText: { fontSize: 12, marginBottom: 2 },
  summaryCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#1976d2' },
  summaryText: { fontSize: 14, marginBottom: 4, color: '#333' },
  testGroup: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1
  },
  testGroupTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  testResult: { fontSize: 12, marginBottom: 4, color: '#666' }
});

export default OCRTestScreen;