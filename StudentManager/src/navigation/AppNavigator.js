import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import AddEditStudentScreen from '../screens/AddEditStudentScreen';
import RankingScreen from '../screens/RankingScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import GradesScreen from '../screens/GradesScreen';
import ExportScreen from '../screens/ExportScreen';
import ScanOCRScreen from '../screens/ScanOCRScreen';
import MultiStudentScanScreen from '../screens/MultiStudentScanScreen';
import ScanHistoryScreen from '../screens/ScanHistoryScreen';
import OCRTestScreen from '../screens/OCRTestScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007bff' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Liste des Élèves' }} />
      <Stack.Screen
        name="AddEditStudent"
        component={AddEditStudentScreen}
        options={({ route }) => ({
          title: route.params?.student ? 'Modifier l\'Élève' : 'Ajouter un Élève',
        })} />
      <Stack.Screen name="Ranking" component={RankingScreen} options={{ title: 'Classement' }} />
      <Stack.Screen name="Subjects" component={SubjectsScreen} options={{ title: 'Gestion des Matières' }} />
      <Stack.Screen name="Grades" component={GradesScreen} options={{ title: 'Gestion des Notes' }} />
      <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Export des Données' }} />
      <Stack.Screen name="ScanOCR" component={ScanOCRScreen} options={{ title: 'Scan OCR' }} />
      <Stack.Screen name="MultiStudentScan" component={MultiStudentScanScreen} options={{ title: 'Scan Multi-Élèves' }} />
      <Stack.Screen name="ScanHistory" component={ScanHistoryScreen} options={{ title: 'Historique des Scans' }} />
      <Stack.Screen name="OCRTest" component={OCRTestScreen} options={{ title: 'Tests et Diagnostics OCR' }} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
