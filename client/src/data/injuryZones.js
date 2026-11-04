export const injuryRegions = [
  {
    id: "head",
    label: "Tête",
    y: 1.63,
    height: 0.40
  },
  {
    id: "torso",
    label: "Haut du corps",
    y: 1.26,
    height: 0.65
  },
  {
    id: "arms",
    label: "Bras",
    y: 1.16,
    height: 0.72
  },
  {
    id: "hip",
    label: "Bassin",
    y: 0.96,
    height: 0.40
  },
  {
    id: "thigh",
    label: "Cuisse",
    y: 0.73,
    height: 0.50
  },
  {
    id: "knee",
    label: "Genou",
    y: 0.49,
    height: 0.32
  },
  {
    id: "leg",
    label: "Jambe",
    y: 0.30,
    height: 0.44
  },
  {
    id: "ankle",
    label: "Cheville",
    y: 0.11,
    height: 0.30
  },
  {
    id: "foot",
    label: "Pied",
    y: 0.045,
    height: 0.34
  },
];

// Positions match the 1.75 metre body, with left and right copies for side points
// direction is used to place each point on the correct body surface
export const injuryZones = [
  {
    id: "head",
    region: "head",
    label: "Tête",
    central: true,
    x: 0,
    y: 1.68,
    z: 0,
    direction: "front"
  },
  {
    id: "torso",
    region: "torso",
    label: "Haut du corps",
    central: true,
    x: 0,
    y: 1.31,
    z: 0,
    direction: "front"
  },
  {
    id: "back",
    region: "torso",
    label: "Dos",
    central: true,
    x: 0,
    y: 1.26,
    z: 0,
    direction: "back"
  },
  {
    id: "arm",
    region: "arms",
    label: "Bras",
    x: 0.25,
    y: 1.23,
    z: 0,
    direction: "front"
  },

  {
    id: "hip",
    region: "hip",
    label: "Hanche",
    x: 0.16,
    y: 0.96,
    z: -0.04,
    direction: "outer"
  },
  {
    id: "glute",
    region: "hip",
    label: "Fesse",
    x: 0.10,
    y: 0.91,
    z: 0,
    direction: "back"
  },
  {
    id: "quadriceps",
    region: "thigh",
    label: "Quadriceps",
    x: 0.12,
    y: 0.72,
    z: 0,
    direction: "front"
  },
  {
    id: "hamstring",
    region: "thigh",
    label: "Ischio-jambiers",
    x: 0.12,
    y: 0.72,
    z: 0,
    direction: "back"
  },
  {
    id: "adductors",
    region: "thigh",
    label: "Adducteurs",
    x: 0.07,
    y: 0.77,
    z: -0.04,
    direction: "inner"
  },

  {
    id: "knee",
    region: "knee",
    label: "Genou (avant)",
    x: 0.12,
    y: 0.49,
    z: 0,
    direction: "front"
  },
  {
    id: "inner-knee",
    region: "knee",
    label: "Genou (intérieur)",
    detail: true,
    x: 0.075,
    y: 0.49,
    z: -0.065,
    direction: "inner"
  },
  {
    id: "outer-knee",
    region: "knee",
    label: "Genou (extérieur)",
    detail: true,
    x: 0.17,
    y: 0.49,
    z: -0.065,
    direction: "outer"
  },
  {
    id: "back-knee",
    region: "knee",
    label: "Genou (arrière)",
    detail: true,
    x: 0.12,
    y: 0.49,
    z: 0,
    direction: "back"
  },

  {
    id: "shin",
    region: "leg",
    label: "Tibia",
    x: 0.12,
    y: 0.30,
    z: 0,
    direction: "front"
  },
  {
    id: "inner-shin",
    region: "leg",
    label: "Tibia (bord interne)",
    detail: true,
    x: 0.08,
    y: 0.28,
    z: -0.065,
    direction: "inner"
  },
  {
    id: "calf",
    region: "leg",
    label: "Mollet",
    x: 0.12,
    y: 0.32,
    z: 0,
    direction: "back"
  },

  {
    id: "ankle",
    region: "ankle",
    label: "Cheville",
    x: 0.13,
    y: 0.11,
    z: 0,
    direction: "front"
  },
  {
    id: "inner-ankle",
    region: "ankle",
    label: "Cheville (intérieur)",
    detail: true,
    x: 0.10,
    y: 0.105,
    z: -0.045,
    direction: "inner"
  },
  {
    id: "outer-ankle",
    region: "ankle",
    label: "Cheville (extérieur)",
    detail: true,
    x: 0.16,
    y: 0.105,
    z: -0.045,
    direction: "outer"
  },
  {
    id: "achilles",
    region: "ankle",
    label: "Tendon d’Achille",
    x: 0.13,
    y: 0.145,
    z: 0,
    direction: "back"
  },

  {
    id: "instep",
    region: "foot",
    label: "Dessus du pied",
    x: 0.125,
    y: 0.06,
    z: 0.045,
    direction: "top"
  },
  {
    id: "arch",
    region: "foot",
    label: "Voûte plantaire",
    detail: true,
    x: 0.125,
    y: 0.02,
    z: 0.015,
    direction: "sole"
  },
  {
    id: "heel",
    region: "foot",
    label: "Talon",
    x: 0.13,
    y: 0.045,
    z: 0,
    direction: "back"
  },
  {
    id: "forefoot",
    region: "foot",
    label: "Avant-pied",
    detail: true,
    x: 0.125,
    y: 0.025,
    z: 0.13,
    direction: "top"
  },
  {
    id: "outer-foot",
    region: "foot",
    label: "Pied (bord externe)",
    detail: true,
    x: 0.16,
    y: 0.035,
    z: 0.035,
    direction: "outer"
  },
];
