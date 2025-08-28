import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Alert, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addStudent, updateStudent, getStudents } from '../database/database';

const AddEditStudentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const studentToEdit = route.params?.student;

  const [studentName, setStudentName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);

  useEffect(() => {
    const loadClasses = async () => {
      const students = await getStudents();
      const classes = [...new Set(students.map(s => s.className))].map(c => ({ label: c, value: c }));
      setAvailableClasses([{ label: 'Sélectionnez une classe', value: '' }, ...classes]);
    };
    loadClasses();

    if (studentToEdit) {
      const fullName = `${studentToEdit.firstName || ''} ${studentToEdit.lastName || ''}`.trim();
      setStudentName(fullName);
      setSelectedClass(studentToEdit.className || '');
    } else {
      setStudentName('');
      setSelectedClass('');
    }
  }, [studentToEdit]);

  const validateForm = () => {
    if (!studentName.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'élève est obligatoire.');
      return false;
    }

    const nameParts = studentName.trim().split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) {
      Alert.alert('Erreur', 'Veuillez entrer un nom valide.');
      return false;
    }

    if (studentName.trim().length > 100) {
      Alert.alert('Erreur', 'Le nom de l\'élève est trop long (maximum 100 caractères).');
      return false;
    }

    if (!selectedClass) {
      Alert.alert('Erreur', 'Veuillez sélectionner une classe.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const nameParts = studentName.trim().split(' ').filter(part => part.length > 0);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      if (studentToEdit) {
        const updatedData = {
          firstName: firstName,
          lastName: lastName,
          className: selectedClass
        };

        await updateStudent(studentToEdit.id, updatedData);
        Alert.alert('Succès', 'Élève modifié avec succès.');
      } else {
        const newStudent = {
          firstName: firstName,
          lastName: lastName,
          className: selectedClass
        };

        await addStudent(newStudent);
        Alert.alert('Succès', 'Élève ajouté avec succès.');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving student:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de sauvegarder l\'élève.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {studentToEdit ? 'Modifier l\'Élève' : 'Ajouter un Élève'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet de l\'élève</Text>
            <TextInput
              style={styles.textInput}
              value={studentName}
              onChangeText={setStudentName}
              placeholder="Prénom et nom de famille"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Classe</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedClass}
                onValueChange={setSelectedClass}
                style={styles.picker}
              >
                {availableClasses.map((cls) => (
                  <Picker.Item key={cls.value} label={cls.label} value={cls.value} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
});

export default AddEditStudentScreen;