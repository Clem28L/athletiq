export const injuryRegions = [ // define  global region of the body
  {
    id: "head",
    label: "Head",
    y: 1.63,
    height: 0.40
  },
  {
    id: "torso",
    label: "Upper body",
    y: 1.26,
    height: 0.65
  },
  {
    id: "arms",
    label: "Arms",
    y: 1.16,
    height: 0.72
  },
  {
    id: "hip",
    label: "Pelvis",
    y: 0.96,
    height: 0.40
  },
  {
    id: "thigh",
    label: "Thigh",
    y: 0.73,
    height: 0.50
  },
  {
    id: "knee",
    label: "Knee",
    y: 0.49,
    height: 0.32
  },
  {
    id: "leg",
    label: "Lower leg",
    y: 0.30,
    height: 0.44
  },
  {
    id: "ankle",
    label: "Ankle",
    y: 0.11,
    height: 0.30
  },
  {
    id: "foot",
    label: "Foot",
    y: 0.045,
    height: 0.34
  },
];
// mapping the different point in the body and defining the coordinates of each point
export const injuryZones = [
  {
    id: "head",
    region: "head",
    label: "Head",
    central: true,
    x: 0,
    y: 1.68,
    z: 0,
    direction: "front"
  },
  {
    id: "torso",
    region: "torso",
    label: "Upper body",
    central: true,
    x: 0,
    y: 1.31,
    z: 0,
    direction: "front"
  },
  {
    id: "back",
    region: "torso",
    label: "Back",
    central: true,
    x: 0,
    y: 1.26,
    z: 0,
    direction: "back"
  },
  {
    id: "arm",
    region: "arms",
    label: "Arms",
    x: 0.25,
    y: 1.23,
    z: 0,
    direction: "front"
  },

  {
    id: "hip",
    region: "hip",
    label: "Hip",
    muscles: ["tensor fasciae latae"],
    x: 0.16,
    y: 0.96,
    z: -0.04,
    direction: "outer"
  },
  {
    id: "glute",
    region: "hip",
    label: "Buttock",
    muscles: ["gluteus maximus"],
    x: 0.10,
    y: 0.91,
    z: 0,
    direction: "back"
  },
  {
    id: "quadriceps",
    region: "thigh",
    label: "Quadriceps",
    muscles: ["rectus femoris", "vastus lateralis", "vastus medialis"],
    x: 0.12,
    y: 0.72,
    z: 0,
    direction: "front"
  },
  {
    id: "hamstring",
    region: "thigh",
    label: "Hamstrings",
    muscles: ["biceps femoris", "semimembranosus", "semitendinosus"],
    x: 0.12,
    y: 0.72,
    z: 0,
    direction: "back"
  },
  {
    id: "adductors",
    region: "thigh",
    label: "Adductors",
    muscles: ["adductor longus", "gracilis"],
    x: 0.07,
    y: 0.77,
    z: -0.04,
    direction: "inner"
  },

  {
    id: "knee",
    region: "knee",
    label: "Knee (front)",
    x: 0.12,
    y: 0.49,
    z: 0,
    direction: "front"
  },
  {
    id: "inner-knee",
    region: "knee",
    label: "Knee (inside)",
    detail: true,
    x: 0.075,
    y: 0.49,
    z: -0.065,
    direction: "inner"
  },
  {
    id: "outer-knee",
    region: "knee",
    label: "Knee (outside)",
    detail: true,
    x: 0.17,
    y: 0.49,
    z: -0.065,
    direction: "outer"
  },
  {
    id: "back-knee",
    region: "knee",
    label: "Knee (back)",
    detail: true,
    x: 0.12,
    y: 0.49,
    z: 0,
    direction: "back"
  },

  {
    id: "shin",
    region: "leg",
    label: "Shin",
    x: 0.12,
    y: 0.30,
    z: 0,
    direction: "front"
  },
  {
    id: "inner-shin",
    region: "leg",
    label: "Shin (inner edge)",
    detail: true,
    x: 0.08,
    y: 0.28,
    z: -0.065,
    direction: "inner"
  },
  {
    id: "calf",
    region: "leg",
    label: "Calf",
    muscles: ["gastrocnemius lateral", "gastrocnemius medial", "soleus"],
    x: 0.12,
    y: 0.32,
    z: 0,
    direction: "back"
  },

  {
    id: "ankle",
    region: "ankle",
    label: "Ankle",
    x: 0.13,
    y: 0.11,
    z: 0,
    direction: "front"
  },
  {
    id: "inner-ankle",
    region: "ankle",
    label: "Ankle (inside)",
    detail: true,
    x: 0.10,
    y: 0.105,
    z: -0.045,
    direction: "inner"
  },
  {
    id: "outer-ankle",
    region: "ankle",
    label: "Ankle (outside)",
    detail: true,
    x: 0.16,
    y: 0.105,
    z: -0.045,
    direction: "outer"
  },
  {
    id: "achilles",
    region: "ankle",
    label: "Achilles tendon",
    x: 0.13,
    y: 0.145,
    z: 0,
    direction: "back"
  },

  {
    id: "instep",
    region: "foot",
    label: "Top of foot",
    x: 0.125,
    y: 0.06,
    z: 0.045,
    direction: "top"
  },
  {
    id: "arch",
    region: "foot",
    label: "Foot arch",
    detail: true,
    x: 0.125,
    y: 0.02,
    z: 0.015,
    direction: "sole"
  },
  {
    id: "heel",
    region: "foot",
    label: "Heel",
    x: 0.13,
    y: 0.045,
    z: 0,
    direction: "back"
  },
  {
    id: "forefoot",
    region: "foot",
    label: "Forefoot",
    detail: true,
    x: 0.125,
    y: 0.025,
    z: 0.13,
    direction: "top"
  },
  {
    id: "outer-foot",
    region: "foot",
    label: "Foot (outer edge)",
    detail: true,
    x: 0.16,
    y: 0.035,
    z: 0.035,
    direction: "outer"
  },
];
