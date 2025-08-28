import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { OCR_CONFIG } from '../ocr';

const ClassSelector = ({ selectedClass, onClassSelect, style, disabled = false }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleClassSelect = (className) => {
    onClassSelect(className);
    setModalVisible(false);
  };

  const renderClassItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.classItem,
        selectedClass === item && styles.selectedClassItem
      ]}
      onPress={() => handleClassSelect(item)}
    >
      <Text style={[
        styles.classItemText,
        selectedClass === item && styles.selectedClassItemText
      ]}>
        {item}
      </Text>
      {selectedClass === item && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.selector,
          disabled && styles.disabledSelector,
          !selectedClass && styles.emptySelectorBorder
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={[
          styles.selectorText,
          !selectedClass && styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {selectedClass || 'Sélectionner une classe'}
        </Text>
        <Text style={[styles.arrow, disabled && styles.disabledText]}>▼</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une classe</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={OCR_CONFIG.availableClasses}
              renderItem={renderClassItem}
              keyExtractor={(item) => item}
              style={styles.classList}
              showsVerticalScrollIndicator={false}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  emptySelectorBorder: {
    borderColor: '#dc3545',
    borderStyle: 'dashed',
  },
  disabledSelector: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#dc3545',
    fontStyle: 'italic',
  },
  disabledText: {
    color: '#6c757d',
  },
  arrow: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  classList: {
    maxHeight: 300,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedClassItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff',
  },
  classItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedClassItemText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  checkmark: {
    fontSize: 18,
    color: '#007bff',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ClassSelector;