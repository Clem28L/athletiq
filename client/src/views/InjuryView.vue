<script setup>
import { nextTick, ref } from "vue";
import BodyInjuryMap from "../components/BodyInjuryMap.vue";
import InjuryQuestionnaire from "../components/InjuryQuestionnaire.vue";
import questionnaire from "../data/injuryQuestionnaire.json";
import "../assets/injury-questionnaire.css";

const step = ref("map");
const selectedZone = ref(null);
const result = ref(null);
const quizKey = ref(0);
const resultHeading = ref(null);
const messageHeading = ref(null);

async function startQuestionnaire(zone) {
  selectedZone.value = zone;
  result.value = null;
  quizKey.value += 1;

  if (!questionnaire.zones[zone.id]) {
    step.value = "unsupported";
    await nextTick();
    if (messageHeading.value) {
      messageHeading.value.focus();
    }
    return;
  }

  step.value = "questions";
}

async function showResult(value) {
  result.value = value;
  step.value = "result";
  await nextTick();
  if (resultHeading.value) {
    resultHeading.value.focus();
  }
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
</script>

<template>
  <div class="injury-flow">
    <BodyInjuryMap
      v-show="step === 'map' || step === 'result'"
      :active="step === 'map' || step === 'result'"
      :read-only="step === 'result'"
      :class="{ 'injury-lab-result': step === 'result' }"
      @zone-confirmed="startQuestionnaire"
    >
      <template v-if="step === 'result' && result" #info>
        <div class="injury-result">
          <button class="injury-text-button" type="button" @click="changeArea">
            ← Changer de zone
          </button>

          <h1 id="injury-result-title" ref="resultHeading" tabindex="-1">
            {{ result.details.title }}
          </h1>
          <p>{{ result.details.description }}</p>
          <p class="injury-result-advice">{{ result.advice }}</p>

          <details class="injury-result-sources">
            <summary>Pourquoi cette piste ?</summary>
            <ul v-if="result.reasons.length">
              <li v-for="reason in result.reasons" :key="reason">{{ reason }}</li>
            </ul>
            <p v-if="result.trainingAdvice">{{ result.trainingAdvice }}</p>
            <p v-if="result.alternative">Autre hypothèse : {{ result.alternative.title }}</p>
            <h2>Sources</h2>
            <ul>
              <li v-for="source in result.sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
              </li>
            </ul>
          </details>

          <div class="injury-result-actions">
            <button class="button button-outline" type="button" @click="step = 'questions'">
              Modifier mes réponses
            </button>
            <button class="injury-text-button" type="button" @click="restartQuestionnaire">
              Recommencer
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
        <h1 id="unsupported-title" ref="messageHeading" tabindex="-1">Cette zone n’est pas encore prise en charge</h1>
        <p>Le prototype se concentre sur les douleurs de course à pied, des hanches jusqu’aux pieds.</p>
        <button class="button button-dark" type="button" @click="changeArea">
          Revenir au corps
        </button>
      </div>
    </section>
  </div>
</template>
