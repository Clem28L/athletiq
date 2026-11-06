<script setup>
import { ArrowLeft } from "@lucide/vue";
import { computed, ref } from "vue";
import BodyInjuryMap from "../components/BodyInjuryMap.vue";
import InjuryQuestionnaire from "../components/InjuryQuestionnaire.vue";
import questionnaire from "../data/injuryQuestionnaire.json";
import "../assets/injury-questionnaire.css";

const step = ref("map"); // select the different steps of the paege: map, questions, result, unsupported
const selectedZone = ref(null);// store the selected zone for the injury questionnaire
const result = ref(null); // store the result of the injury questionnaire
const quizKey = ref(0); // used to reset or go back for the questionnaire

// Function to start the injury questionnaire for a selected zone
function startQuestionnaire(zone) {
  selectedZone.value = zone; // record the selected zone
  result.value = null;
  quizKey.value += 1;
  if (!questionnaire.zones[zone.id]) { // check if the selected zone is supported in the questionnaire
    step.value = "unsupported";
    return;
  }
  step.value = "questions";
}
// Function to show the result of the injury questionnaire
function showResult(value) {
  result.value = value;
  step.value = "result";
}

function changeArea() {
  step.value = "map";
  result.value = null;
}

function restartQuestionnaire() {
  quizKey.value += 1;
  result.value = null;
  step.value = "questions";
}
const isResult = computed(() => step.value === "result");
const showBody = computed(() => step.value === "map" || isResult.value);
</script>

<template>
  <div class="injury-flow">
    <BodyInjuryMap
      v-show="showBody"
      :active="showBody"
      :read-only="isResult"
      :class="{ 'injury-lab-result': isResult }"
      @zone-confirmed="startQuestionnaire"
    >
      <template v-if="isResult && result" #info>
        <div class="injury-result">
          <button class="injury-text-button" type="button" @click="changeArea">
            <ArrowLeft :size="16" aria-hidden="true" /> Change area
          </button>

          <h1 id="injury-result-title">
            {{ result.details.title }}
          </h1>
          <p>{{ result.details.description }}</p>
          <p class="injury-result-advice">{{ result.advice }}</p>

          <details class="injury-result-sources">
            <summary>Why this result?</summary>
            <ul v-if="result.reasons.length">
              <li v-for="reason in result.reasons" :key="reason">{{ reason }}</li>
            </ul>
            <p v-if="result.trainingAdvice">{{ result.trainingAdvice }}</p>
            <p v-if="result.alternative">Another possibility: {{ result.alternative.title }}</p>
            <h2>Sources</h2>
            <ul>
              <li v-for="source in result.sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
              </li>
            </ul>
          </details>

          <div class="injury-result-actions">
            <button class="button button-outline" type="button" @click="step = 'questions'">
              Edit my answers
            </button>
            <button class="injury-text-button" type="button" @click="restartQuestionnaire">
              Start again
            </button>
          </div>
        </div>
      </template>
    </BodyInjuryMap>

    <InjuryQuestionnaire
      v-if="selectedZone && (step === 'questions' || step === 'result')"
      v-show="step === 'questions'"
      :key="quizKey"
      :zone="selectedZone"
      :active="step === 'questions'"
      @complete="showResult"
      @back="changeArea"
    />

    <section v-if="step === 'unsupported'" class="injury-question-page" aria-labelledby="unsupported-title">
      <div class="injury-unsupported">
        <h1 id="unsupported-title">This area is not supported yet</h1>
        <p>This prototype covers running pain from the hips to the feet.</p>
        <button class="button button-dark" type="button" @click="changeArea">
          Back to the body
        </button>
      </div>
    </section>
  </div>
</template>
