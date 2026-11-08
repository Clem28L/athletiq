# AthletiQ

## Fonctionnalités actuelles

- **Comptes et tableaux de bord.** Un athlète retrouve ses résultats et ses tentatives récentes. Un expert voit l’activité de ses quiz. Les notes du calendrier sont gardées dans le navigateur.
- **Création de quiz.** L’expert crée un quiz, ajoute ses questions et le publie pour le rendre visible aux athlètes. Il peut aussi modifier, dépublier ou supprimer un quiz.
- **Passage de quiz.** L’athlète ouvre un quiz publié, vérifie ses réponses au fil des questions et reçoit un score quand il envoie sa tentative. Le serveur enregistre le résultat.
- **Recherche de blessures.** On choisit une zone sur le mannequin 3D, on répond à un questionnaire qui s’adapte aux réponses, puis la page affiche la piste la plus cohérente, avec les raisons et les sources.

## Lancer le projet

**Installer les dépendances**

```bash
npm install
npm install --prefix client
npm install --prefix server
```

**Configurer le serveur**

La base MySQL du projet est hébergée sur **Aiven**. Créer le fichier `server/.env` avec les valeurs de connexion fournies par Aiven et le secret utilisé pour signer les tokens.

```dotenv
DB_HOST=<adresse du service Aiven>
DB_PORT=<port du service Aiven>
DB_USER=<utilisateur MySQL>
DB_PASSWORD=<mot de passe MySQL>
DB_NAME=<nom de la base AthletiQ>
JWT_SECRET=<secret de signature du serveur>
```

Placer aussi le certificat CA fourni par Aiven dans `server/ca.pem`. Le serveur l’utilise pour se connecter à la base avec TLS. Ces deux fichiers sont propres à l’environnement et sont ignorés par Git.

**Démarrer le site**

```bash
npm run dev
```

## API

### Connexion et accès

La route de connexion renvoie un **token**, appelé JWT (*JSON Web Token*). C’est une chaîne signée par le serveur qui contient l’identifiant et le rôle du compte. Elle est valable deux heures. Pour les routes qui demandent une connexion, envoyer le token reçu dans cet en-tête.

```http
Authorization: Bearer <token reçu à la connexion>
```

Dans les tableaux, **Public** signifie que la route est accessible sans token. **Connecté** signifie qu’un token valide est nécessaire. **Expert** et **Athlète** signifient que le compte doit aussi avoir ce rôle. **Expert, son quiz** signifie que l’expert doit avoir créé le quiz concerné. Par exemple, pour lire le quiz numéro 12, on remplace `:id` par `12` dans `GET /api/quizzes/:id`.

Pour les requêtes avec un corps JSON, envoyer `Content-Type: application/json`. Les erreurs renvoyées par les contrôleurs et les contrôles d’accès contiennent un champ `error` avec le message, par exemple `{ "error": "Pas de token" }` avec le statut `401`. Les codes principaux sont `400` pour une entrée invalide, `401` pour une connexion requise ou invalide, `403` pour un accès refusé, `404` pour une ressource introuvable et `500` pour une erreur serveur.

### Comptes et vérification du serveur

| Route | Accès | Entrée et action | Réponse en cas de succès |
| --- | --- | --- | --- |
| POST `/api/auth/register` | Public | `name`, `email`, `password` et `role`. Crée le compte. Le formulaire propose `athlete` et `expert`. | **200** · `message` confirme la création et `id` est l’identifiant du nouveau compte. |
| POST `/api/auth/login` | Public | `email` et `password`. Vérifie les identifiants. | **200** · `message`, `token` et `user: { id, name, role }`. Le navigateur garde le token pour les prochains appels. |
| GET `/api/auth/me` | Connecté | Lit les informations du token fourni. | **200** · `message` et `user: { id_user, role, iat, exp }`. `iat` et `exp` indiquent quand le token a été émis et quand il expire. |
| GET `/api/test` | Public | Vérifie que le serveur répond. | **200** · `{ "status": "ok", "message": "AthletiQ API is running" }`. |
| GET `/api/test/db` | Public | Vérifie la connexion MySQL en comptant les comptes. | **200** · `message` confirme la connexion et `nombre_utilisateurs` contient le total. |

### Consultation des quiz et des résultats

| Route | Accès | Entrée et action | Réponse en cas de succès |
| --- | --- | --- | --- |
| GET `/api/quizzes` | Expert | Charge la liste de gestion, brouillons compris. | **200** · tableau de quiz avec `id_quiz`, `title`, `description`, `module`, `category`, `published` et `created_at`. |
| GET `/api/quizzes/published` | Connecté | Charge le catalogue des quiz publiés. | **200** · tableau de quiz avec `id_quiz`, `title`, `description`, `module` et `category`. |
| GET `/api/quizzes/:id` | Expert, son quiz, ou athlète, quiz publié | Charge un quiz et ses questions. | **200** · informations du quiz, `id_user` du créateur et tableau `questions`. L’expert reçoit les réponses attendues pour l’édition. L’athlète reçoit `version` et les questions sans correction initiale. |
| GET `/api/quizzes/results` | Athlète | Charge la dernière tentative du compte pour chaque quiz. | **200** · tableau avec `id_quiz`, `title`, `module`, `id_attempt`, `score` en pourcentage et `attempt_date`. |
| GET `/api/quizzes/dashboard` | Expert ou athlète | Charge les chiffres affichés sur l’accueil du compte. | **200** · `stats` contient les totaux du rôle et le score moyen, `quizzes` liste les quiz avec leur nombre de tentatives et leur moyenne, et `recent` contient jusqu’à cinq tentatives récentes. |

Dans `stats`, les deux rôles reçoivent `total_attempts`, `average_score` et `total_quizzes`. L’athlète reçoit aussi `completed_quizzes`, le nombre de quiz qu’il a terminés. L’expert reçoit `published_quizzes` et `total_athletes`, le nombre d’athlètes différents qui ont répondu à ses quiz.

### Création et gestion du contenu

| Route | Accès | Entrée et action | Réponse en cas de succès |
| --- | --- | --- | --- |
| POST `/api/quizzes` | Expert | `title`, `description`, `module` et `category`. Crée un brouillon. | **201** · `message` et `quizId`, l’identifiant du quiz créé. |
| PUT `/api/quizzes/:id` | Expert | Les mêmes champs, avec `published` à `true` ou `false`. Met à jour le quiz. | **200** · `{ "message": "Quiz mis à jour avec succès" }`. |
| DELETE `/api/quizzes/:id` | Expert | Supprime le quiz indiqué dans l’URL. | **200** · `{ "message": "Quiz supprimé avec succès" }`. |
| PATCH `/api/quizzes/:id/publish` | Expert | Rend le quiz visible dans le catalogue. Aucun corps JSON. | **200** · `{ "message": "Quiz publié avec succès" }`. |
| PATCH `/api/quizzes/:id/unpublish` | Expert | Retire le quiz du catalogue. Aucun corps JSON. | **200** · `{ "message": "Quiz dépublié avec succès" }`. |
| POST `/api/quizzes/:id/questions` | Expert, son quiz | Ajoute au quiz une question et les données de réponse attendues. Voir l’exemple ci-dessous. | **201** · `message` et `questionId`, l’identifiant de la question créée. |
| PUT `/api/questions/:id` | Expert, son quiz | Ici, `:id` est l’identifiant de la question. Envoie les mêmes champs que lors de la création pour remplacer la question et ses options. | **200** · `{ "message": "Question mise à jour avec succès." }`. |
| DELETE `/api/questions/:id` | Expert, son quiz | Supprime la question indiquée dans l’URL. | **200** · `{ "message": "Question supprimée avec succès." }`. |
| POST `/api/questions/:id/options` | Expert | `text` et `is_correct` (booléen). Ajoute une option à la question. | **201** · `message` et `optionId`, l’identifiant de l’option créée. |
| PUT `/api/options/:id` | Expert | `text` et `is_correct` (booléen). Modifie l’option indiquée dans l’URL. | **200** · `{ "message": "Option updated" }`. |
| DELETE `/api/options/:id` | Expert | Supprime l’option indiquée dans l’URL. | **200** · `{ "message": "Option deleted" }`. |

La liste de gestion renvoie actuellement les quiz de tous les experts. Le serveur vérifie le rôle, mais le contrôle du propriétaire manque pour la modification, la suppression, la publication et la dépublication d’un quiz, ainsi que pour les routes qui modifient directement les options.

**Exemple d’ajout d’une question**

Pour ajouter une question à choix unique au quiz 12, l’expert envoie ce JSON à `POST /api/quizzes/12/questions`. Il précise le texte, le type de question, les points possibles et la bonne option.

```json
{
  "text": "Le parcours cumule 300 m puis 200 m de montée. Quel est son dénivelé positif ?",
  "type_answer": "single_choice",
  "points": 2,
  "options": [
    { "text": "500 m", "is_correct": true },
    { "text": "100 m", "is_correct": false }
  ]
}
```

| Autre type de question | Données de réponse à envoyer |
| --- | --- |
| `multiple_choice` | Des options avec `text` et `is_correct`, dont au moins deux bonnes réponses. |
| `true_false` | Deux options, `Vrai` et `Faux`, avec une seule bonne réponse. |
| `numeric` | `correct_number`, et si besoin `tolerance` et `unit`. |
| `slider` | Les champs numériques et `min_value`, `max_value`, `step_value` pour les bornes et le pas du curseur. |
| `short_text` | `accepted_texts`, un tableau des réponses écrites acceptées. |
| `ordering` | Des options avec `text` et `correct_position`, à partir de 1. |
| `matching` | Des options avec `text`, `pair_key` et `pair_side`. Une paire partage la même clé et contient un côté `left` et un côté `right`. |
| `categorization` | Des options avec `text` et `correct_category`, le nom de la catégorie attendue. |

### Répondre à un quiz

| Route | Accès | Entrée et action | Réponse en cas de succès |
| --- | --- | --- | --- |
| POST `/api/quizzes/:id/questions/:questionId/check` | Athlète | `{ version, value }`. Vérifie la réponse à une seule question. | **200** · `correct` indique si la réponse est juste, `items` donne le détail par option pour les types concernés, et `expected` contient les réponses attendues pour les types qui les affichent en texte. |
| POST `/api/quizzes/:id/attempts` | Athlète | `{ version, answers: [{ questionId, value }] }`. Envoie une réponse par question. Le serveur calcule les points et enregistre la tentative. | **201** · `attemptId` identifie la tentative, `score` est le pourcentage obtenu, `earnedPoints` et `totalPoints` sont les points gagnés et possibles, `correctAnswers` et `totalQuestions` sont les nombres de réponses justes et de questions. |

L’athlète commence par charger le quiz. Le serveur lui renvoie une chaîne `version`, calculée à partir de l’identifiant du quiz, des questions et de leurs options. Quand le client vérifie une réponse ou termine le quiz, il renvoie cette même chaîne. Si les questions ou leurs options ont changé entre-temps, le serveur répond `409` et le client demande de recharger le quiz.

Dans cet extrait de la réponse de `GET /api/quizzes/12`, chaque option a une clé texte dans son champ `id`. Les clés et la version sont raccourcies pour l’exemple.

```json
{
  "id_quiz": 12,
  "version": "version-reçue",
  "questions": [
    {
      "id_question": 31,
      "type_answer": "single_choice",
      "points": 2,
      "options": [
        { "id": "option-500m", "text": "500 m" },
        { "id": "option-100m", "text": "100 m" }
      ]
    }
  ]
}
```

Si l’athlète choisit « 500 m », le client envoie la clé de cette option, dans un tableau, à `POST /api/quizzes/12/questions/31/check`.

```json
{ "version": "version-reçue", "value": ["option-500m"] }
```

Pour ce choix correct, la route de vérification renvoie par exemple

```json
{
  "correct": true,
  "items": [
    { "key": "option-500m", "correct": true },
    { "key": "option-100m", "correct": null }
  ],
  "expected": []
}
```

Dans un choix, une option fausse sélectionnée est marquée `false`. Une option fausse qui n’a pas été sélectionnée reste à `null`. Pour un calcul ou un texte court, la correction attendue est fournie dans `expected`.

| Format de question | Format de la réponse `value` |
| --- | --- |
| Choix unique, choix multiple, vrai/faux | Tableau des clés d’options sélectionnées. |
| Ordre | Tableau des clés dans l’ordre choisi. |
| Nombre ou curseur | Nombre JSON. |
| Texte court | Chaîne de caractères. |
| Association | Objet dont chaque clé d’option de gauche pointe vers une clé d’option de droite. |
| Catégorisation | Objet dont chaque clé d’option pointe vers le nom d’une catégorie. |

Si ce quiz ne contient que la question 31, le client envoie `{ "version": "version-reçue", "answers": [{ "questionId": 31, "value": ["option-500m"] }] }` à `POST /api/quizzes/12/attempts`. Après enregistrement, il reçoit par exemple

```json
{
  "attemptId": 42,
  "score": 100,
  "earnedPoints": 2,
  "totalPoints": 2,
  "correctAnswers": 1,
  "totalQuestions": 1
}
```

## Vues Vue

| Vue | URL et accès | Rôle de la vue |
| --- | --- | --- |
| `HomeView` | `/` · public | Présente le projet. Une fois connecté, affiche le tableau de bord du rôle. |
| `LoginView` | `/login` · public | Demande l’e-mail et le mot de passe et ouvre la session. |
| `RegisterView` | `/register` · public | Demande le nom, l’e-mail, le mot de passe et le rôle. |
| `InjuryView` | `/injuries`, alias `/blessures` · public | Affiche le mannequin, les questions et le résultat. Le parcours utilise le JSON local. |
| `QuizzesManager` | `/expert/quizzes` · expert | Liste et filtre les quiz. Donne accès à la création, la modification, les questions, la publication et la suppression. |
| `QuizForm` | `/expert/quizzes/new` ou `/expert/quizzes/:id/edit` · expert | Crée ou modifie les informations d’un quiz. |
| `QuizQuestions` | `/expert/quizzes/:id/questions` · expert | Ajoute, modifie ou supprime les questions d’un quiz. |
| `AthleteQuizzes` | `/athlete/quizzes` · athlète | Affiche le catalogue publié et les derniers résultats du compte. |
| `AthleteQuizView` | `/athlete/quizzes/:id` · athlète | Affiche les questions, vérifie les réponses et soumet la tentative. |
| `NotFound` | Toute URL inconnue | Affiche la page introuvable. |

## Composants Vue

Dans les tableaux, `?` indique une prop facultative. Un champ avec `v-model` reçoit la valeur via `modelValue` et émet `update:modelValue` quand l’utilisateur la change.

| Composant | Utilisé dans | Rôle et props |
| --- | --- | --- |
| `AppHeader` | `App.vue`, sur tout le site | Logo, session et accès à la connexion ou à la déconnexion. Aucune prop. |
| `AppFooter` | `App.vue` | Pied de page. Aucune prop. |
| `AppSidebar` | `App.vue`, sur tout le site | Menu avec lien Quiz adapté au rôle. Aucune prop. |
| `FeatureCard` | `HomeView` | Carte de présentation avec `title`, `description`, `link` (textes) et `image?: string`. |
| `DashboardPlanner` | `HomeView` | Calendrier et notes locales pour `userId: number`. |
| `QuizModuleFilter` | `HomeView`, `AthleteQuizzes`, `QuizzesManager` | Filtre par module avec `id: string` et `modelValue: string`. Émet `update:modelValue`. |
| `BodyInjuryMap` | `InjuryView` | Mannequin, zoom et sélection. `active?: boolean` active le rendu, `readOnly?: boolean` bloque la sélection. Son slot `info` permet à la vue d’afficher le résultat à côté du mannequin. |
| `InjuryQuestionnaire` | `InjuryView` | Affiche une question par étape. Reçoit `zone: object` avec un `id` connu du questionnaire, et `active?: boolean`. |

Le mannequin émet `zone-selected` au clic sur un point, puis `zone-confirmed` quand l’utilisateur confirme la zone. Il transmet son identifiant, son libellé, sa région, son côté et ses coordonnées. Le questionnaire émet `complete` avec le résultat calculé ou `back` pour revenir au choix de zone.

Les composants de `components/questions/` servent tous dans **`QuizQuestions`**. Ils reçoivent `modelValue` et émettent `update:modelValue`.

| Composant | Rôle et type de `modelValue` |
| --- | --- |
| `QuestionChoice` | Édite les choix · tableau de `{ text: string, is_correct: boolean }`. |
| `QuestionTrueFalse` | Choisit la bonne réponse · chaîne `"true"` ou `"false"`. |
| `QuestionNumber` | Configure le nombre attendu · objet avec `correct_number`, `tolerance` numériques et `unit` texte. |
| `QuestionSlider` | Configure le curseur · même objet, plus `min_value`, `max_value`, `step_value` numériques. |
| `QuestionShortText` | Saisit les réponses acceptées · texte, une réponse par ligne. |
| `QuestionOrdering` | Saisit les éléments dans le bon ordre · tableau de textes. |
| `QuestionMatching` | Saisit les paires · tableau de `{ left: string, right: string }`. |
| `QuestionCategories` | Associe les éléments aux catégories · tableau de `{ text: string, category: string }`. |

Les champs de réponse de `components/answers/` servent dans **`AthleteQuizView`**. Ils reçoivent `question: object`, peuvent recevoir `feedback?: object` après la vérification, et émettent `update:modelValue`.

| Composant | Rôle et autres props |
| --- | --- |
| `AnswerChoice` | Boutons radio ou cases à cocher · `modelValue: string[]`, `showHelp?: boolean` pour afficher la consigne de choix. Réutilisé dans `InjuryQuestionnaire` et `AnswerTrueFalse`. |
| `AnswerTrueFalse` | Choix vrai ou faux · `modelValue: string[]`. |
| `AnswerNumber` | Champ numérique · `modelValue?: number`. |
| `AnswerSlider` | Curseur · `modelValue?: number`. |
| `AnswerShortText` | Réponse écrite · `modelValue: string`. |
| `AnswerOrdering` | Réorganise les options · `modelValue: string[]` dans l’ordre choisi. |
| `AnswerMatching` | Relie les options · `modelValue: object`, clé gauche vers clé droite. |
| `AnswerCategories` | Classe les options · `modelValue: object`, clé d’option vers nom de catégorie. |

`AnswerCorrection` est utilisé par `AthleteQuizView` pour afficher la correction. Il reçoit `feedback: object`. `AnswerStatusIcon` est utilisé dans les champs de réponse et le bloc de correction pour indiquer si une réponse est juste. Il reçoit `correct: boolean`.

## Choix techniques et données de départ

- **Vue et Vue Router.** Les deux rôles partagent les mêmes composants quand l’interface est similaire. Le routeur organise les écrans par rôle. Express vérifie aussi le token et les rôles sur les routes qui les demandent.
- **Express, mysql2 et Aiven.** Les quiz, les questions, les comptes et les tentatives sont enregistrés dans MySQL. Quand un athlète termine un quiz, le serveur vérifie les réponses et sauvegarde la tentative, les réponses et les options choisies dans une transaction. En cas d’échec, les écritures de cette tentative sont annulées ensemble.
- **bcrypt et jsonwebtoken.** bcrypt transforme les mots de passe en empreintes avant leur stockage. jsonwebtoken signe les tokens de connexion et vérifie leur validité à chaque appel protégé.
- **Three.js.** Le mannequin devait pouvoir tourner, zoomer et réagir aux clics dans le navigateur. `GLTFLoader` charge le modèle `.glb`, `OrbitControls` gère la caméra et les rayons de sélection permettent de repérer le point visé sur le corps. Les pièces du modèle sont regroupées pour limiter le travail de rendu. Les groupes de muscles restent repérables pour colorer la zone sélectionnée.
- **Lucide.** `@lucide/vue` fournit les icônes du menu, des flèches et des boutons sous forme de composants SVG.
- **Version des quiz.** Le serveur prépare une version pour l’athlète sans les bonnes réponses. Les choix et les catégories sont mélangés à chaque chargement, tandis que la signature `version` reste la même tant que le contenu du quiz ne change pas. Le mélange utilise `crypto.randomInt`, sans seed fixe fourni par le projet.

Un **seed** est un jeu de données initial chargé en base par un script. Le dépôt ne contient pas de script de seed SQL ni de commande de remplissage. Les quiz enregistrés se chargent depuis la base Aiven configurée. Pour préparer une démo sur une base vide qui possède déjà les tables, créer un compte expert, ajouter et publier un quiz, puis répondre avec un compte athlète.

Le questionnaire blessures a ses propres données de départ dans [`injuryQuestionnaire.json`](client/src/data/injuryQuestionnaire.json) et [`injuryZones.js`](client/src/data/injuryZones.js). Elles sont chargées par le client. Les réponses aux blessures restent en mémoire pendant le parcours. Les notes du calendrier sont conservées dans `localStorage`, par compte et par navigateur.

## Comment le questionnaire blessures propose un résultat

Le parcours suit deux règles distinctes. Chaque réponse indique la prochaine question à afficher. Les points servent à classer les pistes à la fin.

1. **Choisir la zone.** Le mannequin transmet l’identifiant de la zone à la vue. Dans le JSON, chaque zone prise en charge a une première question (`start`) et une liste de blessures candidates (`injuries`). Une zone absente du questionnaire affiche un message.
2. **Suivre la réponse choisie.** Chaque option possède un champ `next` qui désigne la question suivante. Au tibia, une douleur étendue le long du bord interne mène à une question sur son évolution pendant la course. Une douleur concentrée sur un petit point de l’os mène à une question différente, sur l’évolution de ce point précis. Le bouton Retour permet de modifier une réponse et de suivre la nouvelle branche.
3. **Savoir quand s’arrêter.** Une option avec `next: "finish"` termine le questionnaire. Le composant transmet alors toutes les réponses du parcours à [`getInjuryResult`](client/src/utils/injuryQuestionnaire.js), qui calcule le classement.
4. **Calculer les scores.** Pour chaque blessure candidate de la zone, on additionne les valeurs `scores` des options choisies. Une réponse peut ajouter des points à une piste, en retirer à une autre, ou laisser une piste inchangée. Une réponse compte aussi comme symptôme significatif si elle donne au moins 2 points à cette piste et que la question n’est pas une question de contexte (`context: true`).
5. **Choisir ce qui s’affiche.** Une piste doit atteindre **6 points** et **2 symptômes significatifs**. La piste admissible qui a le plus de points s’affiche en premier. Si une deuxième piste admissible est à 3 points ou moins de la première, elle apparaît comme autre possibilité. Quand aucune piste n’atteint les deux seuils, le résultat indique que les réponses ne suffisent pas.

**Exemple tiré du parcours tibia**

| Réponse choisie | Question suivante | Points pour `shin-splints` |
| --- | --- | --- |
| Douleur étendue sur le bord interne du tibia | Évolution de la douleur pendant une sortie | +4 |
| La douleur augmente avec les impacts | Évolution entre les sorties | +3 |
| La douleur reste diffuse et baisse avec le repos | Changements récents de l’entraînement | +3 |
| Plus de kilomètres ou moins de repos | Fin du questionnaire | +1 |

Ce parcours donne **11 points et 3 symptômes significatifs** à la piste « Possible shin splints ». La dernière réponse apporte du contexte et des points, sans compter comme un symptôme. Le panneau affiche les raisons liées aux réponses, les conseils et les sources du résultat. Quand une réponse contient un conseil spécifique (`care`), ce conseil remplace le conseil général. Les valeurs servent à classer des pistes d’orientation selon les règles du projet.
