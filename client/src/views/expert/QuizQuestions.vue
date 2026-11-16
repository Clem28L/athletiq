<script setup>
import { ArrowLeft, X } from "@lucide/vue";
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
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  numeric: "Numeric answer",
  slider: "Slider",
  short_text: "Short answer",
  ordering: "Ordering",
  matching: "Matching",
  categorization: "Categorization",
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
    throw new Error(data.error || "The request failed.");
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
    questions.value = data.questions;
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
    formError.value = "Enter the question text.";
    return;
  }

  saving.value = true;

  try {
    const data = prepareQuestionData(form.value);
    let path = "/quizzes/" + quizId + "/questions";
    let method = "POST";

    // Update the question when it already exists.
    if (editingId.value !== null) {
      path = "/questions/" + editingId.value;
      method = "PUT";
    }

    const result = await request(path, method, data);
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
  const confirmed = confirm("Delete this question?");

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

  // Number and slider questions share the same answer fields.
  if (questionForm.type === "numeric" || questionForm.type === "slider") {
    let answer = answers.number;

    if (questionForm.type === "slider") {
      answer = answers.slider;
    }

    lines.push("Answer: " + answer.correct_number + " " + answer.unit);

    if (questionForm.type === "slider") {
      lines.push(
        "Minimum: " + answer.min_value +
        " / Maximum: " + answer.max_value +
        " / Step: " + answer.step_value
      );
    }

    lines.push("Tolerance: " + answer.tolerance);
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

      lines.push(pair.left + " / " + pair.right);
    }
  }

  if (questionForm.type === "categorization") {
    for (let i = 0; i < answers.categories.length; i++) {
      const item = answers.categories[i];

      lines.push(item.text + " : " + item.category);
    }
  }

  if (
    questionForm.type === "choice" ||
    questionForm.type === "true_false"
  ) {
    const options = question.options;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      let marker = "Incorrect: ";

      if (Number(option.is_correct) === 1) {
        marker = "Correct: ";
      }

      let label = option.text;
      if (questionForm.type === "true_false") {
        if (label.trim().toLowerCase() === "vrai") {
          label = "True";
        } else {
          label = "False";
        }
      }
      lines.push(marker + label);
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
        <ArrowLeft :size="16" aria-hidden="true" /> Back to quizzes
      </button>

      <div class="page-heading">
        <div>
          <h1>Quiz questions</h1>

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
          + New question
        </button>
      </div>
    </header>

    <p v-if="loading">Loading…</p>

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
              Questions ({{ questions.length }})
            </h2>
          </div>

          <div v-if="questions.length === 0" class="empty-list">
            No questions yet.
            Add a question to get started.
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
                  Edit
                </button>

                <button
                  class="btn-secondary"
                  :disabled="saving || deleting"
                  @click="deleteQuestion(question.id_question)"
                >
                  Delete
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
              Answer key
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
          aria-label="Question editor"
        >
          <div v-if="!editorOpen" class="editor-placeholder">
            <h2>Question editor</h2>

            <p>
              Select a question to edit
              or add a new one.
            </p>

            <button
              class="btn-primary"
              :disabled="saving || deleting"
              @click="startNewQuestion"
            >
              + New question
            </button>
          </div>

          <div v-else>
            <div class="section-header">
              <h2 v-if="editingId !== null">
                Edit question
              </h2>

              <h2 v-else>
                New question
              </h2>

              <button
                class="btn-close"
                :disabled="saving || deleting"
                aria-label="Close question editor"
                @click="closeEditor"
              >
                <X :size="16" aria-hidden="true" />
              </button>
            </div>

            <form class="question-form" @submit.prevent="saveQuestion">
              <fieldset :disabled="saving || deleting">
                <div class="form-group">
                  <label for="question-text">
                    Question text
                  </label>

                  <textarea
                    id="question-text"
                    v-model="form.text"
                    rows="3"
                    placeholder="Enter your question"
                    required
                  ></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="question-type">
                      Answer type
                    </label>

                    <select
                      id="question-type"
                      v-model="form.type"
                      @change="formError = ''"
                    >
                      <option value="choice">
                        Choice
                      </option>

                      <option value="true_false">
                        True / False
                      </option>

                      <option value="numeric">
                        Numeric answer
                      </option>

                      <option value="slider">
                        Slider
                      </option>

                      <option value="short_text">
                        Short answer
                      </option>

                      <option value="ordering">
                        Ordering
                      </option>

                      <option value="matching">
                        Matching
                      </option>

                      <option value="categorization">
                        Categorization
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
                  v-else-if="form.type === 'true_false'"
                  v-model="form.answers.boolean"
                />

                <QuestionNumber
                  v-else-if="form.type === 'numeric'"
                  v-model="form.answers.number"
                />

                <QuestionSlider
                  v-else-if="form.type === 'slider'"
                  v-model="form.answers.slider"
                />

                <QuestionShortText
                  v-else-if="form.type === 'short_text'"
                  v-model="form.answers.shortText"
                />

                <QuestionOrdering
                  v-else-if="form.type === 'ordering'"
                  v-model="form.answers.ordering"
                />

                <QuestionMatching
                  v-else-if="form.type === 'matching'"
                  v-model="form.answers.matching"
                />

                <QuestionCategories
                  v-else-if="form.type === 'categorization'"
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
                    Cancel
                  </button>

                  <button type="submit" class="btn-primary">
                    <span v-if="saving">
                      Saving…
                    </span>

                    <span v-else-if="editingId !== null">
                      Save
                    </span>

                    <span v-else>
                      Add question
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
