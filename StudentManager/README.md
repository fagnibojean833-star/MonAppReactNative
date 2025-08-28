# StudentManager - Gestionnaire d'Élèves avec OCR

Une application React Native/Expo pour la gestion des élèves et de leurs notes, avec reconnaissance optique de caractères (OCR) intégrée.

## 🚀 Fonctionnalités

### Gestion des Élèves
- ✅ Ajout, modification et suppression d'élèves
- ✅ Gestion des classes (chargées dynamiquement)
- ✅ Interface intuitive et responsive

### Gestion des Matières
- ✅ Création et gestion des matières
- ✅ Matières par défaut pré-configurées
- ✅ Support des échelles de notes (5, 10, 20)

### Gestion des Notes
- ✅ Saisie manuelle des notes
- ✅ Calcul automatique des moyennes
- ✅ Classement des élèves
- ✅ Export des données

### OCR (Reconnaissance Optique de Caractères)
- 🆕 **Nouveau !** Système OCR compatible Expo
- 🆕 **Nouveau !** Amélioration automatique des images
- 🆕 **Nouveau !** Reconnaissance intelligente des matières
- 🆕 **Nouveau !** Support de multiples formats de notes
- 🆕 **Nouveau !** Configuration flexible des API OCR

## 📱 Compatibilité

- ✅ **Expo SDK 53+**
- ✅ **React Native 0.76+**
- ✅ **Android 6.0+**
- ✅ **iOS 12.0+**
- ✅ **Web (React Native Web)**

## 🛠️ Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Expo CLI
- Android Studio (pour Android) ou Xcode (pour iOS)

### 1. Cloner le projet
```bash
git clone <votre-repo>
cd StudentManager
```

### 2. Installer les dépendances
```bash
npm install
# ou
yarn install
```

### 3. Démarrer l'application
```bash
npm start
# ou
yarn start
```

### 4. Tester sur un appareil
- Scannez le QR code avec l'app Expo Go
- Ou appuyez sur 'a' pour Android ou 'i' pour iOS

## 🔧 Configuration OCR

L'application utilise un système OCR hybride avec Gemini AI et Tesseract.js. Pour que Gemini AI fonctionne, vous devez configurer votre clé API.

### Google Gemini AI

Créez un fichier `.env` à la racine du projet (au même niveau que `package.json`) et ajoutez votre clé API Gemini :

```
EXPO_PUBLIC_GEMINI_API_KEY="VOTRE_CLE_API_GEMINI"
```

Assurez-vous que cette variable d'environnement est bien chargée lors du démarrage de l'application Expo.

## 📸 Utilisation de l'OCR

### 1. Sélectionner une classe
Choisissez la classe de l'élève dans le menu déroulant.

### 2. Capturer une image
- 📷 **Prendre une photo** : Utilisez la caméra de l'appareil
- 🖼️ **Choisir depuis la galerie** : Sélectionnez une image existante
- 📄 **Choisir un document** : Importez un fichier image

### 3. Analyser avec OCR
- L'image est automatiquement optimisée
- L'OCR extrait le texte et les notes
- Les données sont analysées et structurées

### 4. Vérifier et corriger
- Vérifiez les informations extraites
- Corrigez les erreurs si nécessaire
- Ajustez les matières et notes

### 5. Sauvegarder
- Les données sont enregistrées en base
- Les nouvelles matières sont créées automatiquement
- L'élève est ajouté au système

## 🧪 Test de l'OCR

L'application inclut un bouton de test OCR qui charge des données d'exemple pour démontrer les fonctionnalités :

1. Cliquez sur "🧪 Tester l'OCR (démonstration)"
2. Les données d'exemple sont chargées
3. Vous pouvez tester l'interface de correction
4. Sauvegardez pour voir le processus complet

## 🗄️ Structure de la Base de Données

### Tables
- **students** : Informations des élèves
- **subjects** : Matières enseignées
- **grades** : Notes des élèves par matière

### Stockage
- Utilise AsyncStorage pour la persistance locale
- Données structurées en JSON
- Sauvegarde automatique

## 🔍 Fonctionnalités Avancées

### Reconnaissance Intelligente
- Mapping automatique des matières
- Correction des abréviations
- Support des synonymes

### Validation des Données
- Vérification des formats de notes
- Validation des noms de matières
- Gestion des erreurs robuste

### Interface Utilisateur
- Design moderne et intuitif
- Navigation fluide entre les écrans
- Feedback visuel en temps réel

## 🚨 Résolution des Problèmes

### Erreurs courantes

#### "Permission refusée"
- Vérifiez les permissions caméra et galerie
- Redémarrez l'application
- Vérifiez les paramètres système

#### "Erreur OCR"
- Vérifiez la qualité de l'image
- Assurez-vous que le texte est lisible
- Utilisez le bouton de test pour vérifier

#### "Base de données non initialisée"
- Redémarrez l'application
- Vérifiez l'espace de stockage
- Réinstallez si nécessaire

### Logs et Debug
- Activez les logs dans `OCRConfig.js`
- Vérifiez la console pour les erreurs
- Utilisez les outils de développement Expo

## 🔮 Roadmap

### Prochaines fonctionnalités
- [ ] Support PDF avec conversion automatique
- [ ] Synchronisation cloud
- [ ] Export en Excel/CSV
- [ ] Graphiques de progression
- [ ] Notifications de devoirs
- [ ] Interface parent/élève

### Améliorations OCR
- [ ] Support multi-langues
- [ ] Reconnaissance de tableaux
- [ ] Traitement par lot
- [ ] Apprentissage automatique

## 🤝 Contribution

Les contributions sont les bienvenues ! 

### Comment contribuer
1. Fork le projet
2. Créez une branche feature
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

### Standards de code
- Suivez les conventions ESLint
- Ajoutez des tests pour les nouvelles fonctionnalités
- Documentez les nouvelles APIs
- Respectez la structure du projet

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

### Contact
- **Email** : support@studentmanager.com
- **Issues** : [GitHub Issues](https://github.com/votre-repo/issues)
- **Documentation** : [Wiki](https://github.com/votre-repo/wiki)

### Ressources utiles
- [Documentation Expo](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

---

**Développé avec ❤️ pour les enseignants et les établissements scolaires**
