import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity,
  Alert, FlatList
} from 'react-native';

const SmartSuggestionsModal = ({ 
  visible, 
  onClose, 
  suggestions, 
  onApplySuggestion,
  title = "Suggestions d'amélioration"
}) => {
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());

  const handleApplySuggestion = (type, original, suggestion, index = null) => {
    const key = `${type}_${original}_${index || 0}`;
    
    Alert.alert(
      'Appliquer la suggestion',
      `Remplacer "${original}" par "${suggestion.suggestion || suggestion}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Appliquer',
          onPress: () => {
            onApplySuggestion(type, original, suggestion, index);
            setAppliedSuggestions(prev => new Set([...prev, key]));
          }
        }
      ]
    );
  };

  const renderStudentSuggestions = () => {
    if (!suggestions.students || suggestions.students.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Suggestions pour les élèves</Text>
        {suggestions.students.map((studentSugg, studentIndex) => {
          // Mode multi-élèves
          if (studentSugg.suggestions) {
            return (
              <View key={studentIndex} style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Élève {studentSugg.index + 1}</Text>
                {studentSugg.suggestions.map((sugg, suggIndex) => (
                  <View key={suggIndex} style={styles.suggestionItem}>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionText}>
                        {sugg.suggestion.firstName} {sugg.suggestion.lastName}
                      </Text>
                      <Text style={styles.suggestionReason}>{sugg.reason}</Text>
                      <Text style={styles.suggestionConfidence}>
                        Confiance: {Math.round(sugg.confidence * 100)}%
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.applyButton}
                      onPress={() => handleApplySuggestion(
                        'student', 
                        `${studentSugg.index}`, 
                        sugg, 
                        studentSugg.index
                      )}
                    >
                      <Text style={styles.applyButtonText}>Appliquer</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          }
          // Mode élève unique
          else if (Array.isArray(studentSugg)) {
            return (
              <View key={studentIndex} style={styles.subsection}>
                {studentSugg.map((sugg, suggIndex) => (
                  <View key={suggIndex} style={styles.suggestionItem}>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionText}>
                        {sugg.suggestion.firstName} {sugg.suggestion.lastName}
                      </Text>
                      <Text style={styles.suggestionReason}>{sugg.reason}</Text>
                      <Text style={styles.suggestionConfidence}>
                        Confiance: {Math.round(sugg.confidence * 100)}%
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.applyButton}
                      onPress={() => handleApplySuggestion('student', 'single', sugg)}
                    >
                      <Text style={styles.applyButtonText}>Appliquer</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          }
          return null;
        })}
      </View>
    );
  };

  const renderSubjectSuggestions = () => {
    if (!suggestions.subjects || suggestions.subjects.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Suggestions pour les matières</Text>
        {suggestions.subjects.map((subjectSugg, index) => (
          <View key={index} style={styles.subsection}>
            <Text style={styles.originalText}>Original: "{subjectSugg.original}"</Text>
            {subjectSugg.suggestions.map((sugg, suggIndex) => (
              <View key={suggIndex} style={styles.suggestionItem}>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>{sugg.suggestion}</Text>
                  <Text style={styles.suggestionReason}>{sugg.reason}</Text>
                  <Text style={styles.suggestionConfidence}>
                    Confiance: {Math.round(sugg.confidence * 100)}%
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => handleApplySuggestion(
                    'subject', 
                    subjectSugg.original, 
                    sugg
                  )}
                >
                  <Text style={styles.applyButtonText}>Appliquer</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderClassSuggestions = () => {
    if (!suggestions.classes || suggestions.classes.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏫 Suggestions pour les classes</Text>
        {suggestions.classes.map((classSugg, index) => (
          <View key={index} style={styles.subsection}>
            <Text style={styles.originalText}>Original: "{classSugg.original}"</Text>
            {classSugg.suggestions.map((sugg, suggIndex) => (
              <View key={suggIndex} style={styles.suggestionItem}>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>{sugg.suggestion}</Text>
                  <Text style={styles.suggestionReason}>{sugg.reason}</Text>
                  <Text style={styles.suggestionConfidence}>
                    Confiance: {Math.round(sugg.confidence * 100)}%
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => handleApplySuggestion(
                    'class', 
                    classSugg.original, 
                    sugg
                  )}
                >
                  <Text style={styles.applyButtonText}>Appliquer</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const hasAnySuggestions = () => {
    return (suggestions.students && suggestions.students.length > 0) ||
           (suggestions.subjects && suggestions.subjects.length > 0) ||
           (suggestions.classes && suggestions.classes.length > 0);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {suggestions.confidence > 0 && (
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceText}>
              Confiance globale: {Math.round(suggestions.confidence * 100)}%
            </Text>
          </View>
        )}

        <ScrollView style={styles.content}>
          {!hasAnySuggestions() ? (
            <View style={styles.noSuggestionsContainer}>
              <Text style={styles.noSuggestionsText}>
                ✅ Aucune suggestion d'amélioration
              </Text>
              <Text style={styles.noSuggestionsSubtext}>
                Les données extraites semblent correctes
              </Text>
            </View>
          ) : (
            <>
              {renderStudentSuggestions()}
              {renderSubjectSuggestions()}
              {renderClassSuggestions()}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerButton} onPress={onClose}>
            <Text style={styles.footerButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#dee2e6',
    backgroundColor: '#f8f9fa'
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 24, color: '#6c757d' },
  confidenceContainer: { 
    backgroundColor: '#e3f2fd', 
    padding: 12, 
    alignItems: 'center' 
  },
  confidenceText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1976d2' 
  },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 12 
  },
  subsection: { 
    backgroundColor: '#f8f9fa', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 12 
  },
  subsectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#495057', 
    marginBottom: 8 
  },
  originalText: { 
    fontSize: 14, 
    color: '#6c757d', 
    marginBottom: 8, 
    fontStyle: 'italic' 
  },
  suggestionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 12, 
    borderRadius: 6, 
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  suggestionContent: { flex: 1, marginRight: 12 },
  suggestionText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 4 
  },
  suggestionReason: { 
    fontSize: 14, 
    color: '#6c757d', 
    marginBottom: 2 
  },
  suggestionConfidence: { 
    fontSize: 12, 
    color: '#28a745', 
    fontWeight: 'bold' 
  },
  applyButton: { 
    backgroundColor: '#007bff', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 4 
  },
  applyButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  noSuggestionsContainer: { 
    alignItems: 'center', 
    padding: 40 
  },
  noSuggestionsText: { 
    fontSize: 18, 
    color: '#28a745', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  noSuggestionsSubtext: { 
    fontSize: 14, 
    color: '#6c757d', 
    textAlign: 'center' 
  },
  footer: { 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#dee2e6',
    backgroundColor: '#f8f9fa'
  },
  footerButton: { 
    backgroundColor: '#6c757d', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  footerButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});

export default SmartSuggestionsModal;