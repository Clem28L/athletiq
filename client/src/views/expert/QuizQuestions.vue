<script setup>
import { ref, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";

import "@/assets/quiz-questions.css";

import {
  prepareQuestionData,
  readQuestionData,
} from "@/utils/QuestionForm";

import QuestionChoice from "@/components/questions/QuestionChoice.vue";
import QuestionTrueFalse from "@/components/questions/QuestionTrueFalse.vue";
import QuestionNumber from "@/components/questions/QuestionNumber.vue";
import QuestionSlider from "@/components/questions/QuestionSlider.vue";
import QuestionShortText from "@/components/questions/QuestionShortText.vue";
import QuestionOrdering from "@/components/questions/QuestionOrdering.vue";
import QuestionMatching from "@/components/questions/QuestionMatching.vue";
import QuestionCategories from "@/components/questions/QuestionCategories.vue";

const route = useRoute();
const router = useRouter();
const quizId = route.params.id;

// Page data
const quiz = ref(null);
const questions = ref([]);

const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);

const error = ref("");
const formError = ref("");
const success = ref("");

const editingId = ref(null);
const form = ref(readQuestionData());

// Right panel
const editorOpen = ref(false);
const editorPanel = ref(null);

const typeLabels = {
  single_choice: "Choix unique",
  multiple_choice: "Choix multiple",
  true_false: "Vrai / Faux",
  numeric: "Réponse numérique",
  slider: "Curseur",
  short_text: "Réponse textuelle courte",
  ordering: "Classement",
  matching: "Association de paires",
  categorization: "Classement par catégorie",
};

// Send a request to the API
async function request(path, method = "GET", body = null) {
  const options = {
    method: method,
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  };

  if (body !== null) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(
    "http://localhost:3000/api" + path,
    options
  );

  const data = await response.json();

  if (!response.ok) {
    let message = "La requête a échoué.";

    if (data.error) {
      message = data.error;
    }

    throw new Error(message);
  }

  return data;
}

// Load the quiz and its questions
async function loadQuiz() {
  loading.value = true;
  error.value = "";

  try {
    const data = await request("/quizzes/" + quizId);

    quiz.value = data;
    questions.value = [];

    if (Array.isArray(data.questions)) {
      questions.value = data.questions;
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// Clear the form
function resetForm() {
  form.value = readQuestionData();
  editingId.value = null;
  formError.value = "";
}

// Open the editor
async function showEditor() {
  editorOpen.value = true;

  // Wait until Vue has displayed the form
  await nextTick();

  // Bring the form into view on smaller screens
  if (window.innerWidth <= 1000 && editorPanel.value) {
    editorPanel.value.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

// Start a new question
function startNewQuestion() {
  resetForm();
  success.value = "";
  showEditor();
}

// Fill the editor with an existing question
function startEdit(question) {
  form.value = readQuestionData(question);
  editingId.value = question.id_question;
  formError.value = "";
  success.value = "";

  showEditor();
}

// Close the editor
function closeEditor() {
  resetForm();
  editorOpen.value = false;
}

// Save the complete question
async function saveQuestion() {
  formError.value = "";
  success.value = "";

  if (!form.value.text.trim()) {
    formError.value = "Écris le texte de la question.";
    return;
  }

  if (
    !Number.isInteger(form.value.points) ||
    form.value.points < 1
  ) {
    formError.value = "Les points doivent être un entier supérieur à 0.";
    return;
  }

  saving.value = true;

  try {
    const data = prepareQuestionData(form.value);
    let result;

    if (editingId.value !== null) {
      result = await request(
        "/questions/" + editingId.value,
        "PUT",
        data
      );
    } else {
      result = await request(
        "/quizzes/" + quizId + "/questions",
        "POST",
        data
      );
    }

    closeEditor();
    success.value = result.message;

    await loadQuiz();
  } catch (err) {
    // Keep the form open when saving fails
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

// Delete the selected question
async function deleteQuestion(id) {
  const confirmed = confirm("Supprimer cette question ?");

  if (!confirmed) {
    return;
  }

  deleting.value = true;
  success.value = "";

  try {
    const result = await request("/questions/" + id, "DELETE");

    for (let i = 0; i < questions.value.length; i++) {
      if (questions.value[i].id_question === id) {
        questions.value.splice(i, 1);
        break;
      }
    }

    if (editingId.value === id) {
      closeEditor();
    }

    success.value = result.message;
  } catch (err) {
    alert(err.message);
  } finally {
    deleting.value = false;
  }
}

// Build the correction displayed under each question
function getAnswerLines(question) {
  const lines = [];
  const questionForm = readQuestionData(question);
  const answers = questionForm.answers;

  if (questionForm.type === "numeric") {
    lines.push(
      "Réponse : " +
        answers.number.correct_number +
        " " +
        answers.number.unit
    );

    lines.push("Tolérance : " + answers.number.tolerance);
  }

  if (questionForm.type === "slider") {
    lines.push(
      "Réponse : " +
        answers.slider.correct_number +
        " " +
        answers.slider.unit
    );

    lines.push(
      "Minimum : " +
        answers.slider.min_value +
        " / Maximum : " +
        answers.slider.max_value +
        " / Pas : " +
        answers.slider.step_value
    );

    lines.push("Tolérance : " + answers.slider.tolerance);
  }

  if (questionForm.type === "short_text") {
    const acceptedTexts = answers.shortText.split("\n");

    for (let i = 0; i < acceptedTexts.length; i++) {
      if (acceptedTexts[i] !== "") {
        lines.push(acceptedTexts[i]);
      }
    }
  }

  if (questionForm.type === "ordering") {
    for (let i = 0; i < answers.ordering.length; i++) {
      lines.push((i + 1) + ". " + answers.ordering[i]);
    }
  }

  if (questionForm.type === "matching") {
    for (let i = 0; i < answers.matching.length; i++) {
      const pair = answers.matching[i];

      lines.push(pair.left + " ↔ " + pair.right);
    }
  }

  if (questionForm.type === "categorization") {
    for (let i = 0; i < answers.categories.length; i++) {
      const item = answers.categories[i];

      lines.push(item.text + " → " + item.category);
    }
  }

  if (
    questionForm.type === "choice" ||
    questionForm.type === "true_false"
  ) {
    const options = question.options;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      let marker = "○ ";

      if (Number(option.is_correct) === 1) {
        marker = "✓ ";
      }

      lines.push(marker + option.text);
    }
  }

  return lines;
}

function goBack() {
  router.push("/expert/quizzes");
}

onMounted(loadQuiz);
</script>

<template>
  <div class="quiz-questions-page">
    <header class="page-header">
      <button
        class="btn-back"
        :disabled="saving || deleting"
        @click="goBack"
      >
        ← Retour aux quiz
      </button>

      <div class="page-heading">
        <div>
          <h1>Questions du quiz</h1>

          <p v-if="quiz" class="subtitle">
            {{ quiz.title }}
          </p>
        </div>

        <button
          v-if="quiz && !loading && !error"
          class="btn-primary"
          :disabled="saving || deleting"
          @click="startNewQuestion"
        >
          + Nouvelle question
        </button>
      </div>
    </header>

    <p v-if="loading">Chargement...</p>

    <p v-else-if="error" class="error-msg" role="alert">
      {{ error }}
    </p>

    <div v-else>
      <p v-if="success" class="success-msg" role="status">
        {{ success }}
      </p>

      <div class="questions-layout">
        <!-- Left panel: existing questions -->
        <section class="questions-panel">
          <div class="section-header">
            <h2>
              Questions existantes ({{ questions.length }})
            </h2>
          </div>

          <div v-if="questions.length === 0" class="empty-list">
            Aucune question pour l’instant.
            Clique sur « Nouvelle question » pour commencer.
          </div>

          <article
            v-for="(question, index) in questions"
            :key="question.id_question"
            class="question-card"
            :class="{ selected: editingId === question.id_question }"
          >
            <div class="question-header">
              <strong class="question-number">
                Q{{ index + 1 }}
              </strong>

              <span class="question-points">
                {{ question.points }} pt
              </span>

              <div class="question-actions">
                <button
                  class="btn-secondary"
                  :disabled="saving || deleting"
                  @click="startEdit(question)"
                >
                  Modifier
                </button>

                <button
                  class="btn-secondary"
                  :disabled="saving || deleting"
                  @click="deleteQuestion(question.id_question)"
                >
                  Supprimer
                </button>
              </div>
            </div>

            <p class="question-type">
              {{ typeLabels[question.type_answer] }}
            </p>

            <p class="question-text">
              {{ question.text }}
            </p>

            <p class="correction-label">
              Correction
            </p>

            <ul class="answers-list">
              <li
                v-for="(line, answerIndex) in getAnswerLines(question)"
                :key="answerIndex"
              >
                {{ line }}
              </li>
            </ul>
          </article>
        </section>

        <!-- Right panel: question editor -->
        <aside
          ref="editorPanel"
          class="editor-panel"
          aria-label="Éditeur de question"
        >
          <div v-if="!editorOpen" class="editor-placeholder">
            <h2>Éditeur de question</h2>

            <p>
              Sélectionne une question à modifier
              ou crée une nouvelle question.
            </p>

            <button
              class="btn-primary"
              :disabled="saving || deleting"
              @click="startNewQuestion"
            >
              + Nouvelle question
            </button>
          </div>

          <div v-else>
            <div class="section-header">
              <h2 v-if="editingId !== null">
                Modifier la question
              </h2>

              <h2 v-else>
                Nouvelle question
              </h2>

              <button
                class="btn-close"
                :disabled="saving || deleting"
                aria-label="Fermer le formulaire"
                @click="closeEditor"
              >
                ✕
              </button>
            </div>

            <form class="question-form" @submit.prevent="saveQuestion">
              <fieldset :disabled="saving || deleting">
                <div class="form-group">
                  <label for="question-text">
                    Texte de la question
                  </label>

                  <textarea
                    id="question-text"
                    v-model="form.text"
                    rows="3"
                    placeholder="Écris ta question"
                    required
                  ></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="question-type">
                      Type de réponse
                    </label>

                    <select
                      id="question-type"
                      v-model="form.type"
                      @change="formError = ''"
                    >
                      <option value="choice">
                        Questionnaire à choix
                      </option>

                      <option value="true_false">
                        Vrai / Faux
                      </option>

                      <option value="numeric">
                        Réponse numérique
                      </option>

                      <option value="slider">
                        Curseur
                      </option>

                      <option value="short_text">
                        Réponse textuelle courte
                      </option>

                      <option value="ordering">
                        Classement dans le bon ordre
                      </option>

                      <option value="matching">
                        Association de paires
                      </option>

                      <option value="categorization">
                        Classement par catégorie
                      </option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="question-points">
                      Points
                    </label>

                    <input
                      id="question-points"
                      v-model.number="form.points"
                      type="number"
                      min="1"
                      step="1"
                      required
                    />
                  </div>
                </div>

                <QuestionChoice
                  v-if="form.type === 'choice'"
                  v-model="form.answers.choice"
                />

                <QuestionTrueFalse
                  v-if="form.type === 'true_false'"
                  v-model="form.answers.boolean"
                />

                <QuestionNumber
                  v-if="form.type === 'numeric'"
                  v-model="form.answers.number"
                />

                <QuestionSlider
                  v-if="form.type === 'slider'"
                  v-model="form.answers.slider"
                />

                <QuestionShortText
                  v-if="form.type === 'short_text'"
                  v-model="form.answers.shortText"
                />

                <QuestionOrdering
                  v-if="form.type === 'ordering'"
                  v-model="form.answers.ordering"
                />

                <QuestionMatching
                  v-if="form.type === 'matching'"
                  v-model="form.answers.matching"
                />

                <QuestionCategories
                  v-if="form.type === 'categorization'"
                  v-model="form.answers.categories"
                />

                <p v-if="formError" class="error-msg" role="alert">
                  {{ formError }}
                </p>

                <div class="form-actions">
                  <button
                    type="button"
                    class="btn-secondary"
                    @click="closeEditor"
                  >
                    Annuler
                  </button>

                  <button type="submit" class="btn-primary">
                    <span v-if="saving">
                      Enregistrement...
                    </span>

                    <span v-else-if="editingId !== null">
                      Enregistrer
                    </span>

                    <span v-else>
                      Ajouter la question
                    </span>
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>