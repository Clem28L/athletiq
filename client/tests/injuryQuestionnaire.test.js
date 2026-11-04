import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { injuryZones } from "../src/data/injuryZones.js";
import { rankInjuries, getInjuryResult } from "../src/utils/injuryQuestionnaire.js";

const data = JSON.parse(readFileSync(new URL("../src/data/injuryQuestionnaire.json", import.meta.url), "utf8"));

function followPath(zoneId, choices) {
  let questionId = data.zones[zoneId].start;
  const answers = [];

  for (const id of choices) {
    let choice = null;

    for (const option of data.questions[questionId].options) {
      if (option.id === id) {
        choice = option;
      }
    }

    assert.ok(choice, questionId + ": missing choice " + id);
    answers.push({ questionId: questionId, optionId: id });

    if (choice.next === "finish") {
      assert.equal(answers.length, choices.length);
      return getInjuryResult(data, { id: zoneId }, answers);
    }

    questionId = choice.next;
  }

  assert.fail("The path did not reach a result");
}

const examples = [
  ["shin", ["inner", "impact", "diffuse", "volume"], "shin-splints"],
  ["inner-shin", ["spot", "earlier", "volume"], "stress-fracture"],
  ["shin", ["front", "downhill", "yes", "stable"], "anterior-tibial"],
  ["shin", ["front", "pressure", "quick", "stable"], "compartment"],
  ["outer-knee", ["lateral", "repeat", "downhill", "volume"], "it-band"],
  ["knee", ["around", "flexion", "stairs", "stable"], "kneecap"],
  ["knee", ["below", "push", "same", "stable"], "patellar"],
  ["quadriceps", ["tendon", "yes", "same", "stable"], "quadriceps-tendon"],
  ["inner-knee", ["below", "hills", "volume"], "pes-anserine"],
  ["inner-knee", ["joint", "catch", "stable"], "meniscus"],
  ["back-knee", ["lump", "tension", "stable"], "baker"],
  ["quadriceps", ["muscle", "sudden", "mild", "local"], "elongation"],
  ["calf", ["sudden", "weak", "local"], "muscle-tear"],
  ["quadriceps", ["diffuse", "improves"], "muscle-soreness"],
  ["adductors", ["groin", "stride", "volume"], "adductor-tendon"],
  ["hip", ["side", "lying", "stable"], "outer-hip"],
  ["hamstring", ["high", "sitting", "stable"], "proximal-hamstring"],
  ["achilles", ["morning", "warm", "yes", "intensity", "uphill"], "achilles"],
  ["achilles", ["snap", "lost"], "achilles-rupture"],
  ["inner-ankle", ["yes", "push", "volume"], "tibial-tendon"],
  ["outer-ankle", ["tendon", "yes", "terrain", "trail"], "peroneal-tendon"],
  ["ankle", ["twist", "pain"], "sprain"],
  ["heel", ["sole", "first", "warm", "volume"], "plantar"],
  ["heel", ["centre", "impact", "cushion", "stable"], "heel-pad"],
  ["forefoot", ["diffuse", "load", "volume"], "metatarsalgia"],
  ["forefoot", ["burning", "compression", "shoes", "tight"], "morton"],
  ["instep", ["tendon", "movement", "shoes", "tight"], "extensor-tendon"],
];

for (const [zone, choices, expected] of examples) {
  test("running scenario reaches " + expected, () => {
    assert.equal(followPath(zone, choices).id, expected);
  });
}

test("all lower body points have a flow and upper body points are unsupported", () => {
  for (const zone of injuryZones) {
    const supported = ["hip", "thigh", "knee", "leg", "ankle", "foot"].includes(zone.region);
    assert.equal(Boolean(data.zones[zone.id]), supported, zone.id);
  }
});

test("every question is reachable and every branch ends without a loop", () => {
  const seen = new Set();

  function visit(id, path) {
    assert.ok(data.questions[id], "Missing question: " + id);
    assert.ok(!path.includes(id), "Loop: " + id);
    assert.ok(path.length < 12);
    seen.add(id);
    const options = new Set();

    for (const option of data.questions[id].options) {
      assert.ok(!options.has(option.id), id);
      options.add(option.id);

      if (option.scores) {
        for (const [injury, value] of Object.entries(option.scores)) {
          assert.ok(data.results[injury], "Missing injury: " + injury);
          assert.ok(Number.isFinite(value));

          if (data.questions[id].context) {
            assert.ok(Math.abs(value) <= 1, "Context must not act like a specific symptom");
          }
        }
      }

      if (option.next !== "finish") {
        visit(option.next, [...path, id]);
      }
    }
  }

  for (const zone of Object.values(data.zones)) {
    visit(zone.start, []);

    for (const injury of zone.injuries) {
      assert.ok(data.results[injury]);
    }
  }

  assert.equal(seen.size, Object.keys(data.questions).length);
});

test("training changes and the selected point alone cannot name an injury", () => {
  const answers = [
    { questionId: "training", optionId: "volume" },
    { questionId: "training-session", optionId: "uphill" },
    { questionId: "training-shoes", optionId: "lower" },
    { questionId: "training-terrain", optionId: "hard" },
  ];
  assert.equal(getInjuryResult(data, { id: "shin" }, answers).id, "unclear");
  assert.equal(getInjuryResult(data, { id: "knee" }, []).id, "unclear");
});

test("an unknown answer does not block a later consistent symptom pattern", () => {
  assert.equal(followPath("shin", ["unsure", "warm", "diffuse", "stable"]).id, "shin-splints");
  assert.equal(followPath("outer-knee", ["unsure", "build", "stop", "stable"]).id, "it-band");
  assert.equal(followPath("achilles", ["unsure", "hills", "yes", "stable"]).id, "achilles");
  assert.equal(followPath("shin", ["unsure", "unsure", "unsure", "unsure"]).id, "unclear");
});

test("a progressive focal bone pattern is not called periostitis", () => {
  const result = followPath("shin", ["inner", "impact", "focus", "stable"]);
  assert.equal(result.id, "stress-fracture");
  assert.ok(result.advice.includes("examiner"));
});

test("the same sudden muscle event keeps its injury name when care is needed", () => {
  const mild = followPath("quadriceps", ["muscle", "sudden", "mild", "local"]);
  const severe = followPath("quadriceps", ["muscle", "sudden", "weak", "local"]);
  assert.equal(mild.id, "elongation");
  assert.equal(severe.id, "muscle-tear");
  assert.ok(severe.advice.includes("rapidement"));
  assert.ok(severe.details.title.includes("déchirure"));
});

test("overlapping knee symptoms may give a second qualified hypothesis", () => {
  const result = followPath("outer-knee", ["lateral", "repeat", "both", "yes", "stable"]);
  assert.equal(result.id, "it-band");
  assert.equal(result.alternative, data.results.kneecap);
});

test("changing answers removes the previous muscle hypothesis", () => {
  const original = followPath("quadriceps", ["muscle", "sudden", "weak", "local"]);
  const changed = followPath("quadriceps", ["tendon", "yes", "same", "stable"]);
  assert.equal(original.id, "muscle-tear");
  assert.equal(changed.id, "quadriceps-tendon");
  assert.ok(!changed.reasons.includes("Douleur musculaire soudaine sur une foulée"));
});

test("an injury from another body area cannot win", () => {
  const answers = [
    { questionId: "shin-location", optionId: "inner" },
    { questionId: "shin-pattern", optionId: "impact" },
    { questionId: "shin-recovery", optionId: "diffuse" },
  ];
  assert.equal(rankInjuries(data, { id: "quadriceps" }, answers).length, 0);
});

test("all named results are covered and source links stay valid and unique", () => {
  const covered = new Set();

  for (const example of examples) {
    covered.add(example[2]);
  }

  assert.equal(covered.size, Object.keys(data.results).length - 1);

  for (const result of Object.values(data.results)) {
    assert.ok(result.sources.length > 0);

    for (const id of result.sources) {
      assert.ok(data.sources[id], id);
      assert.ok(data.sources[id].url.startsWith("https://"));
    }
  }

  const result = followPath("outer-knee", ["lateral", "repeat", "both", "yes", "volume"]);
  assert.equal(result.sources.length, new Set(result.sources).size);
});
