import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { exportData as exportDataFromDB } from '../database/database';
import * as FileSystem from 'expo-file-system';
import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';

const ExportScreen = () => {
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [jsonData, setJsonData] = useState(null);

  const handleJsonExport = async () => {
    setExporting(true);
    try {
      const data = await exportDataFromDB();
      setJsonData(data);
      
      const fileName = `studentmanager_export_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
      
      Alert.alert(
        'Succès', 
        `Données JSON exportées et sauvegardées dans : ${fileUri}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les données JSON.');
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = async () => {
    setExportingPdf(true);
    try {
      const data = await exportDataFromDB();
      const html = createHtmlContent(data);
      const fileName = `studentmanager_export_${new Date().toISOString().split('T')[0]}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const { uri } = await printToFileAsync({
        html: html,
        width: 595, // A4 width in points
        height: 842, // A4 height in points
        base64: false,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      });

      // Vérifier si le fichier a été créé
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Le fichier PDF n\'a pas pu être généré');
      }

      // Déplacer le fichier vers le répertoire de documents
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri,
      });

      // Vérifier que le fichier final existe
      const finalFileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!finalFileInfo.exists) {
        throw new Error('Le fichier PDF n\'a pas pu être sauvegardé');
      }

      // Partager le fichier
      await shareAsync(fileUri, { 
        dialogTitle: 'Partager le rapport PDF',
        mimeType: 'application/pdf'
      });

      Alert.alert(
        'Succès', 
        `PDF généré avec succès !\nTaille: ${(finalFileInfo.size / 1024).toFixed(1)} KB\nEmplacement: ${fileUri}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Export PDF error:', error);
      Alert.alert(
        'Erreur d\'export PDF', 
        `Impossible de générer le PDF.\nDétails: ${error.message}\n\nVérifiez que vous avez suffisamment d'espace de stockage.`,
        [{ text: 'OK' }]
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction utilitaire pour nettoyer les chaînes
  const cleanString = (str) => {
    if (!str || str === null || str === undefined) return '';
    return String(str).replace(/[<>&"']/g, (match) => {
      const escapeMap = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[match];
    });
  };

  const createHtmlContent = (data) => {
    // Vérification et initialisation des données
    const students = data.students || [];
    const subjects = data.subjects || [];
    const grades = data.grades || [];
    const rankings = data.rankings || [];
    
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              margin: 20mm;
              size: A4;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.4;
              color: #333;
              margin: 0;
              padding: 0;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #007bff;
              padding-bottom: 20px;
            }
            
            .header h1 {
              color: #007bff;
              font-size: 28px;
              margin: 0 0 10px 0;
              font-weight: bold;
            }
            
            .header .subtitle {
              color: #666;
              font-size: 14px;
              margin: 5px 0;
            }
            
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            
            .section-title {
              background-color: #f8f9fa;
              color: #007bff;
              font-size: 18px;
              font-weight: bold;
              padding: 12px 15px;
              margin: 0 0 15px 0;
              border-left: 4px solid #007bff;
              border-radius: 4px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            th {
              background-color: #007bff;
              color: white;
              font-weight: bold;
              padding: 12px 8px;
              text-align: left;
              font-size: 14px;
            }
            
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e9ecef;
              font-size: 13px;
            }
            
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            tr:hover {
              background-color: #e3f2fd;
            }
            
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
              margin-bottom: 25px;
            }
            
            .stat-card {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #28a745;
              text-align: center;
            }
            
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #28a745;
              margin-bottom: 5px;
            }
            
            .stat-label {
              color: #666;
              font-size: 14px;
            }
            
            .grade-cell {
              text-align: center;
              font-weight: bold;
            }
            
            .average-cell {
              text-align: center;
              font-weight: bold;
              color: #007bff;
            }
            
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #e9ecef;
              padding-top: 15px;
            }
            
            .no-data {
              text-align: center;
              color: #666;
              font-style: italic;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Student Manager</h1>
            <div class="subtitle">Rapport d'export des données</div>
            <div class="subtitle">Généré le ${currentDate}</div>
          </div>
    `;
    
    // Statistiques générales
    html += `
      <div class="section">
        <div class="section-title">📈 Statistiques générales</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${students.length}</div>
            <div class="stat-label">Élèves</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${subjects.length}</div>
            <div class="stat-label">Matières</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${grades.length}</div>
            <div class="stat-label">Notes</div>
          </div>
        </div>
      </div>
    `;
    
    // Liste des élèves
    html += '<div class="section">';
    html += '<div class="section-title">👥 Liste des élèves</div>';
    if (students.length > 0) {
      html += '<table>';
      html += '<tr><th>Prénom</th><th>Nom</th><th>Classe</th></tr>';
      students.forEach(student => {
        const firstName = cleanString(student.firstName) || 'Non défini';
        const lastName = cleanString(student.lastName) || 'Non défini';
        const className = cleanString(student.className) || 'Non définie';
        html += `<tr>
          <td>${firstName}</td>
          <td>${lastName}</td>
          <td>${className}</td>
        </tr>`;
      });
      html += '</table>';
    } else {
      html += '<div class="no-data">Aucun élève enregistré</div>';
    }
    html += '</div>';
    
    // Liste des matières
    html += '<div class="section">';
    html += '<div class="section-title">📚 Liste des matières</div>';
    if (subjects.length > 0) {
      html += '<table>';
      html += '<tr><th>Nom de la matière</th></tr>';
      subjects.forEach(subject => {
        const subjectName = cleanString(subject.name) || 'Nom non défini';
        html += `<tr><td>${subjectName}</td></tr>`;
      });
      html += '</table>';
    } else {
      html += '<div class="no-data">Aucune matière enregistrée</div>';
    }
    html += '</div>';
    
    // Notes détaillées
    html += '<div class="section">';
    html += '<div class="section-title">📝 Notes détaillées</div>';
    if (grades.length > 0) {
      html += '<table>';
      html += '<tr><th>Élève</th><th>Matière</th><th>Note</th><th>Date</th></tr>';
      grades.forEach(grade => {
        const student = students.find(s => s.id === grade.studentId);
        const subject = subjects.find(s => s.id === grade.subjectId);
        if (student && subject) {
          const studentFirstName = cleanString(student.firstName) || 'Prénom inconnu';
          const studentLastName = cleanString(student.lastName) || 'Nom inconnu';
          const subjectName = cleanString(subject.name) || 'Matière inconnue';
          const score = grade.score !== undefined && grade.score !== null ? grade.score : 'N/A';
          const scale = grade.scale !== undefined && grade.scale !== null ? grade.scale : '20';
          const gradeDate = grade.date ? new Date(grade.date).toLocaleDateString('fr-FR') : 'Non définie';
          
          html += `<tr>
            <td>${studentFirstName} ${studentLastName}</td>
            <td>${subjectName}</td>
            <td class="grade-cell">${score}/${scale}</td>
            <td>${gradeDate}</td>
          </tr>`;
        }
      });
      html += '</table>';
    } else {
      html += '<div class="no-data">Aucune note enregistrée</div>';
    }
    html += '</div>';
    
    // Classements (si disponibles)
    if (rankings && rankings.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">🏆 Classement par moyenne pondérée</div>';
      html += '<table>';
      html += '<tr><th>Position</th><th>Élève</th><th>Classe</th><th>Moyenne</th><th>Nb Notes</th></tr>';
      rankings.forEach((ranking, index) => {
        const firstName = cleanString(ranking.firstName) || '';
        const lastName = cleanString(ranking.lastName) || '';
        const studentName = `${firstName} ${lastName}`.trim() || 'Élève inconnu';
        const className = cleanString(ranking.className) || 'Non définie';
        const averageScore = ranking.averageScore !== undefined && ranking.averageScore !== null ? ranking.averageScore : 0;
        const gradesCount = ranking.gradesCount || 0;
        
        html += `<tr>
          <td class="grade-cell">${index + 1}</td>
          <td>${studentName}</td>
          <td>${className}</td>
          <td class="average-cell">${averageScore.toFixed(2)}/20</td>
          <td class="grade-cell">${gradesCount}</td>
        </tr>`;
      });
      html += '</table>';
      html += '</div>';
    }
    
    html += `
          <div class="footer">
            Document généré par Student Manager - ${currentDate}
          </div>
        </body>
      </html>
    `;
    
    return html;
  };


  

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Export des Données</Text>
        <Text style={styles.headerSubtitle}>
          Exportez toutes les données de l'application
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleJsonExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.exportButtonText}>📤 Exporter en JSON</Text>
            )}
          </TouchableOpacity>
          <View style={{ height: 10 }} />
          <TouchableOpacity 
            style={[styles.exportButton, { backgroundColor: '#28a745' }]}
            onPress={handlePdfExport}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.exportButtonText}>📄 Exporter en PDF</Text>
            )}
          </TouchableOpacity>
        </View>

        {jsonData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Données JSON exportées</Text>
            <View style={styles.dataInfo}>
              <Text style={styles.dataLabel}>Date d'export:</Text>
              <Text style={styles.dataValue}>{formatDate(jsonData.exportDate)}</Text>
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataLabel}>Version:</Text>
              <Text style={styles.dataValue}>{jsonData.version}</Text>
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataLabel}>Élèves:</Text>
              <Text style={styles.dataValue}>{jsonData.students.length}</Text>
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataLabel}>Matières:</Text>
              <Text style={styles.dataValue}>{jsonData.subjects.length}</Text>
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataLabel}>Notes:</Text>
              <Text style={styles.dataValue}>{jsonData.grades.length}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <Text style={styles.infoText}>
            • Les données peuvent être exportées au format JSON ou PDF.
          </Text>
          <Text style={styles.infoText}>
            • Toutes les informations sont incluses (élèves, matières, notes, classements).
          </Text>
          <Text style={styles.infoText}>
            • L'export inclut la date et la version de l'application.
          </Text>
          <Text style={styles.infoText}>
            • Les données peuvent être utilisées pour sauvegarde ou migration.
          </Text>
          <Text style={styles.infoText}>
            • Le PDF est optimisé pour Android et inclut toutes les échelles de notes.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  exportButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  dataLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default ExportScreen;
