/**
 * REMAKE ELECTRONICS - Smart Matching Engine
 * Deterministic, rule-based recommendation and feasibility engine
 * Featuring typo tolerance, zero-limitation component admission,
 * functional component compatibility, and multi-project keyword search.
 */

const catalog = require('../data/catalog.json');
const projects = require('../data/projects.json');

// Lookup map for catalog components by ID and lowercase name/alias
const catalogMap = new Map();
const aliasMap = new Map();

catalog.forEach((item) => {
  catalogMap.set(item.id, item);
  aliasMap.set(item.name.toLowerCase().trim(), item.id);
  if (item.aliases) {
    item.aliases.forEach((alias) => {
      aliasMap.set(alias.toLowerCase().trim(), item.id);
    });
  }
});

// Common typo corrections dictionary
const TYPO_CORRECTIONS = {
  rader: 'radar',
  senosr: 'sensor',
  senser: 'sensor',
  ardunio: 'arduino',
  raspbery: 'raspberry',
  servomotor: 'servo motor',
  servos: 'servo motor',
  resister: 'resistor',
  capasitor: 'capacitor',
  breadbord: 'breadboard',
  jumpers: 'jumper wires',
  wires: 'jumper wires',
  wire: 'jumper wires',
  displayes: 'display',
  blutooth: 'bluetooth',
  bt: 'bluetooth',
  wif: 'wifi'
};

/**
 * Clean and normalize text for robust fuzzy matching
 */
function cleanSearchText(text) {
  if (!text) return '';
  let cleaned = String(text)
    .toLowerCase()
    .replace(/[-_.,/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Apply common typo fixes word by word
  const words = cleaned.split(' ').map((w) => TYPO_CORRECTIONS[w] || w);
  return words.join(' ');
}

/**
 * Capitalize words for clean display names
 */
function capitalizeWords(str) {
  if (!str) return '';
  return str
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

/**
 * Automatically infer an electronic component category based on keywords
 */
function inferComponentCategory(rawName) {
  const lower = cleanSearchText(rawName);

  if (/(sensor|radar|sonar|probe|meter|gauge|hygrometer|detector|camera|photocell|thermometer|gyro|accelerometer|barometer|transducer)/.test(lower)) {
    return 'Sensors';
  }
  if (/(motor|servo|stepper|actuator|solenoid|pump|valve|cylinder)/.test(lower)) {
    return 'Actuators & Motors';
  }
  if (/(lora|wifi|bluetooth|ble|nrf|zigbee|gsm|gps|rf|transceiver|antenna|wireless|radio)/.test(lower)) {
    return 'Wireless & Communication';
  }
  if (/(display|lcd|oled|tft|screen|matrix|segment|monitor|e paper|epaper)/.test(lower)) {
    return 'Displays';
  }
  if (/(arduino|esp32|esp8266|raspberry|pico|stm32|controller|microcontroller|mcu|chip|attiny|atmega)/.test(lower)) {
    return 'Microcontrollers';
  }
  if (/(battery|relay|power|charger|regulator|converter|buck|boost|solar|adapter|supply|inverter)/.test(lower)) {
    return 'Power & Switching';
  }
  if (/(breadboard|jumper|pcb|shield|prototyping|proto)/.test(lower)) {
    return 'Prototyping';
  }
  if (/(led|buzzer|resistor|capacitor|button|switch|potentiometer|keypad|diode|transistor|mosfet)/.test(lower)) {
    return 'Basic Components';
  }

  return 'Electronic Components';
}

/**
 * Resolve a component name or ID to a catalog item or dynamically admitted custom component
 * GUARANTEE: Never returns null for valid non-empty input!
 * @param {string} inputNameOrId 
 * @returns {object}
 */
function resolveCatalogComponent(inputNameOrId) {
  if (!inputNameOrId) return null;
  const raw = String(inputNameOrId).trim();
  if (raw.length === 0) return null;

  const upper = raw.toUpperCase();

  // 1. Direct ID match
  if (catalogMap.has(upper)) {
    return catalogMap.get(upper);
  }

  // 2. Exact name or alias match
  const lower = raw.toLowerCase();
  if (aliasMap.has(lower)) {
    const id = aliasMap.get(lower);
    return catalogMap.get(id);
  }

  // 3. Typo-normalized lookup
  const cleaned = cleanSearchText(raw);
  if (aliasMap.has(cleaned)) {
    const id = aliasMap.get(cleaned);
    return catalogMap.get(id);
  }

  // 4. Smart keyword detection for common maker hardware
  if (cleaned.includes('radar') || cleaned.includes('mmwave') || cleaned.includes('ld2410') || cleaned.includes('rcwl')) {
    return catalogMap.get('MMWAVE_RADAR_SENSOR') || catalog[0];
  }
  if (cleaned.includes('lora') || cleaned.includes('sx1278') || cleaned.includes('ra 02') || cleaned.includes('rfm95')) {
    return catalogMap.get('LORA_MODULE') || catalog[0];
  }
  if (cleaned.includes('ultrasonic') || cleaned.includes('sonar') || cleaned.includes('hc sr04')) {
    return catalogMap.get('ULTRASONIC_SENSOR') || catalog[0];
  }
  if (cleaned.includes('pir') || cleaned.includes('hc sr501') || cleaned.includes('am312')) {
    return catalogMap.get('PIR_SENSOR') || catalog[0];
  }
  if (cleaned.includes('servo') || cleaned.includes('sg90') || cleaned.includes('mg995') || cleaned.includes('mg996')) {
    return catalogMap.get('SERVO_MOTOR') || catalog[0];
  }
  if (cleaned.includes('breadboard')) {
    return catalogMap.get('BREADBOARD') || catalog[0];
  }
  if (cleaned.includes('jumper') || cleaned.includes('dupont')) {
    return catalogMap.get('JUMPER_WIRES') || catalog[0];
  }
  if (cleaned.includes('uno')) {
    return catalogMap.get('ARDUINO_UNO') || catalog[0];
  }
  if (cleaned.includes('nano')) {
    return catalogMap.get('ARDUINO_NANO') || catalog[0];
  }
  if (cleaned.includes('esp32')) {
    return catalogMap.get('ESP32') || catalog[0];
  }
  if (cleaned.includes('esp8266') || cleaned.includes('nodemcu')) {
    return catalogMap.get('ESP8266') || catalog[0];
  }
  if (cleaned.includes('dht11') || cleaned.includes('dht 11')) {
    return catalogMap.get('DHT11') || catalog[0];
  }
  if (cleaned.includes('dht22') || cleaned.includes('dht 22')) {
    return catalogMap.get('DHT22') || catalog[0];
  }
  if (cleaned.includes('oled') || cleaned.includes('ssd1306')) {
    return catalogMap.get('OLED_DISPLAY') || catalog[0];
  }
  if (cleaned.includes('lcd 16') || cleaned.includes('1602')) {
    return catalogMap.get('LCD_16X2') || catalog[0];
  }
  if (cleaned.includes('relay')) {
    return catalogMap.get('RELAY_MODULE') || catalog[0];
  }
  if (cleaned.includes('buzzer')) {
    return catalogMap.get('BUZZER') || catalog[0];
  }
  if (cleaned.includes('ldr') || cleaned.includes('photoresistor')) {
    return catalogMap.get('LDR') || catalog[0];
  }
  if (cleaned.includes('led') && !cleaned.includes('oled')) {
    return catalogMap.get('LED') || catalog[0];
  }

  // 5. Partial match against catalog items
  for (const item of catalog) {
    if (cleaned.includes(item.name.toLowerCase())) {
      return item;
    }
    if (item.aliases) {
      for (const al of item.aliases) {
        if (cleaned.includes(al.toLowerCase())) {
          return item;
        }
      }
    }
  }

  // 6. ZERO LIMITATIONS DYNAMIC ADMISSION:
  // If user entered ANY custom or obscure component, accept it immediately!
  const category = inferComponentCategory(raw);
  const safeId = 'CUSTOM_' + cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const formattedName = capitalizeWords(raw);

  return {
    id: safeId,
    name: formattedName,
    category,
    averageWeightGrams: 15,
    isCustom: true
  };
}

/**
 * Functional Component Compatibility Map
 * Defines interchangeable / compatible hardware for maker flexibility
 */
const COMPATIBILITY_GROUPS = {
  // Microcontrollers
  ARDUINO_UNO: ['ARDUINO_NANO', 'ARDUINO_MEGA', 'ARDUINO_PRO_MINI', 'ARDUINO_LEONARDO', 'ESP32', 'ESP8266', 'RASPBERRY_PI_PICO', 'STM32'],
  ARDUINO_NANO: ['ARDUINO_UNO', 'ARDUINO_PRO_MINI', 'ESP32', 'ESP8266', 'RASPBERRY_PI_PICO'],
  ESP8266: ['ESP32', 'ARDUINO_UNO', 'WIFI_MODULE'],
  ESP32: ['ESP8266', 'ARDUINO_UNO'],

  // Distance, Proximity & Obstacle Sensors
  ULTRASONIC_SENSOR: ['MMWAVE_RADAR_SENSOR', 'IR_SENSOR', 'LIDAR_TOF_SENSOR'],
  IR_SENSOR: ['ULTRASONIC_SENSOR', 'MMWAVE_RADAR_SENSOR'],
  PIR_SENSOR: ['MMWAVE_RADAR_SENSOR'],
  MMWAVE_RADAR_SENSOR: ['PIR_SENSOR', 'ULTRASONIC_SENSOR', 'IR_SENSOR'],

  // Temperature & Climate
  DHT11: ['DHT22', 'TEMPERATURE_SENSOR'],
  DHT22: ['DHT11', 'TEMPERATURE_SENSOR'],
  TEMPERATURE_SENSOR: ['DHT11', 'DHT22'],

  // Displays
  LCD_16X2: ['LCD_20X4', 'OLED_DISPLAY', 'TFT_DISPLAY'],
  OLED_DISPLAY: ['LCD_16X2', 'LCD_20X4', 'TFT_DISPLAY'],

  // Wireless
  BLUETOOTH_MODULE: ['WIFI_MODULE', 'LORA_MODULE', 'NRF24L01'],
  WIFI_MODULE: ['ESP8266', 'ESP32', 'BLUETOOTH_MODULE', 'LORA_MODULE'],
  LORA_MODULE: ['NRF24L01', 'BLUETOOTH_MODULE', 'WIFI_MODULE']
};

/**
 * Check if user inventory possesses required component OR a compatible equivalent
 */
function findAvailableQuantity(inventoryMap, requiredComponentId) {
  // 1. Direct match
  if (inventoryMap.has(requiredComponentId)) {
    return {
      quantity: inventoryMap.get(requiredComponentId).quantity,
      usedComponent: inventoryMap.get(requiredComponentId).component,
      isExact: true
    };
  }

  // 2. Check compatible substitutes
  const substitutes = COMPATIBILITY_GROUPS[requiredComponentId] || [];
  for (const subId of substitutes) {
    if (inventoryMap.has(subId)) {
      const entry = inventoryMap.get(subId);
      return {
        quantity: entry.quantity,
        usedComponent: entry.component,
        isExact: false,
        substituteName: entry.component.name
      };
    }
  }

  return { quantity: 0, usedComponent: null, isExact: false };
}

/**
 * Normalize an inventory array of user components
 * @param {Array} userComponents - [{ componentId, name, quantity }]
 * @returns {Map<string, { component: object, quantity: number }>}
 */
function normalizeUserInventory(userComponents) {
  const inventory = new Map();

  if (!Array.isArray(userComponents)) {
    return inventory;
  }

  userComponents.forEach((entry) => {
    if (!entry) return;
    const resolved = resolveCatalogComponent(entry.componentId || entry.name);
    if (!resolved) return;

    const qty = parseInt(entry.quantity, 10);
    const validQty = Number.isInteger(qty) && qty > 0 ? qty : 1;

    if (inventory.has(resolved.id)) {
      const existing = inventory.get(resolved.id);
      existing.quantity += validQty;
    } else {
      inventory.set(resolved.id, {
        component: resolved,
        quantity: validQty,
      });
    }
  });

  return inventory;
}

/**
 * Compare a single project against user inventory
 * @param {object} project 
 * @param {Map} inventoryMap 
 * @returns {object} Evaluation result
 */
function evaluateProjectMatch(project, inventoryMap) {
  const totalRequiredTypes = project.components.length;
  let availableRequiredTypes = 0;
  let hasQuantityShortage = false;
  let totalReusedComponentsCount = 0;

  const componentBreakdown = project.components.map((req) => {
    const matchInfo = findAvailableQuantity(inventoryMap, req.componentId);
    const availableQty = matchInfo.quantity;
    const isAvailable = availableQty > 0;
    const isSufficient = availableQty >= req.quantity;
    const shortage = Math.max(0, req.quantity - availableQty);

    if (isAvailable) {
      availableRequiredTypes += 1;
    }
    if (!isSufficient) {
      hasQuantityShortage = true;
    }

    totalReusedComponentsCount += Math.min(availableQty, req.quantity);

    let status = 'MISSING';
    if (isAvailable) {
      status = isSufficient ? 'AVAILABLE' : 'INSUFFICIENT_QTY';
    }

    return {
      componentId: req.componentId,
      name: req.name,
      requiredQuantity: req.quantity,
      availableQuantity: availableQty,
      isAvailable,
      isSufficient,
      isExact: matchInfo.isExact,
      substituteName: matchInfo.substituteName || null,
      shortage,
      status
    };
  });

  // Feasibility calculation strictly following Section 27:
  // (Available Required Component Types / Total Required Component Types) * 100
  const rawFeasibility = totalRequiredTypes > 0
    ? (availableRequiredTypes / totalRequiredTypes) * 100
    : 0;
  const feasibility = Math.round(rawFeasibility);

  // Missing components list
  const missingComponents = componentBreakdown
    .filter((c) => !c.isAvailable)
    .map((c) => ({
      componentId: c.componentId,
      name: c.name,
      quantity: c.requiredQuantity,
      shortage: c.requiredQuantity,
      isTotalMissing: true
    }));

  // Quantity shortage list
  const quantityShortages = componentBreakdown
    .filter((c) => c.isAvailable && !c.isSufficient)
    .map((c) => ({
      componentId: c.componentId,
      name: c.name,
      availableQuantity: c.availableQuantity,
      requiredQuantity: c.requiredQuantity,
      shortage: c.shortage
    }));

  // All needed items to build
  const allNeededItems = componentBreakdown
    .filter((c) => !c.isSufficient)
    .map((c) => ({
      componentId: c.componentId,
      name: c.name,
      neededQuantity: c.shortage,
      reason: !c.isAvailable ? 'Missing component' : 'Insufficient quantity'
    }));

  // Build status determination
  let status = 'LOW FEASIBILITY';
  let statusLabel = 'Low Feasibility';
  if (feasibility === 100 && !hasQuantityShortage) {
    status = 'READY TO BUILD';
    statusLabel = 'Ready to Build';
  } else if (availableRequiredTypes > 0) {
    status = 'PARTIALLY READY';
    statusLabel = 'Partially Ready';
  }

  // User-friendly message explaining status
  let matchMessage = '';
  if (status === 'READY TO BUILD') {
    matchMessage = 'All required components and quantities are available in your inventory. Ready to start building!';
  } else if (missingComponents.length === 1 && !hasQuantityShortage) {
    matchMessage = `You already have most of the components. You only need 1 more component (${missingComponents[0].name} ×${missingComponents[0].quantity}) to build this project.`;
  } else if (allNeededItems.length > 0) {
    matchMessage = `You have ${availableRequiredTypes} of ${totalRequiredTypes} required component types. ${allNeededItems.length} component shortage(s) remaining.`;
  } else {
    matchMessage = 'Add more components to reach feasibility for this project.';
  }

  return {
    projectId: project.id,
    id: project.id,
    name: project.name,
    difficulty: project.difficulty,
    category: project.category,
    description: project.description,
    overview: project.overview,
    buildSteps: project.buildSteps,
    tags: project.tags,
    feasibility,
    status,
    statusLabel,
    matchMessage,
    totalRequiredTypes,
    availableRequiredTypes,
    hasQuantityShortage,
    componentsReused: totalReusedComponentsCount,
    estimatedWasteAvoided: project.estimatedWasteAvoided,
    componentBreakdown,
    missingComponents,
    quantityShortages,
    allNeededItems
  };
}

const difficultyRanks = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3
};

/**
 * Match user components against all predefined projects
 */
function findMatchingProjects(userComponents) {
  const inventoryMap = normalizeUserInventory(userComponents);

  if (inventoryMap.size === 0) {
    return {
      recommendations: [],
      stats: {
        totalComponentsListed: 0,
        uniqueComponentsListed: 0,
        projectsEnabled: 0,
        potentialWasteAvoidedGrams: 0
      }
    };
  }

  const evaluatedProjects = projects.map((proj) => evaluateProjectMatch(proj, inventoryMap));

  // Sort by feasibility descending with tie-breakers
  evaluatedProjects.sort((a, b) => {
    if (b.feasibility !== a.feasibility) {
      return b.feasibility - a.feasibility;
    }
    const aMissing = a.missingComponents.length + a.quantityShortages.length;
    const bMissing = b.missingComponents.length + b.quantityShortages.length;
    if (aMissing !== bMissing) {
      return aMissing - bMissing;
    }
    if (b.estimatedWasteAvoided !== a.estimatedWasteAvoided) {
      return b.estimatedWasteAvoided - a.estimatedWasteAvoided;
    }
    const diffA = difficultyRanks[a.difficulty] || 9;
    const diffB = difficultyRanks[b.difficulty] || 9;
    return diffA - diffB;
  });

  let totalPieces = 0;
  inventoryMap.forEach((item) => {
    totalPieces += item.quantity;
  });

  const readyToBuildCount = evaluatedProjects.filter((p) => p.status === 'READY TO BUILD').length;
  const partiallyReadyCount = evaluatedProjects.filter((p) => p.status === 'PARTIALLY READY').length;
  const topFeasible = evaluatedProjects.filter((p) => p.feasibility >= 50);
  const potentialWaste = topFeasible.reduce((sum, p) => sum + (p.estimatedWasteAvoided || 0), 0);

  return {
    recommendations: evaluatedProjects,
    stats: {
      totalComponentsListed: totalPieces,
      uniqueComponentsListed: inventoryMap.size,
      projectsReadyToBuild: readyToBuildCount,
      projectsPartiallyReady: partiallyReadyCount,
      potentialWasteAvoidedGrams: potentialWaste
    }
  };
}

/**
 * Intelligent Keyword Search for Projects
 * Searches project titles, descriptions, required components, categories, and tags.
 * Evaluates feasibility for each matching project and returns multiple related projects.
 * @param {string} keyword 
 * @param {Array} userComponents 
 */
function searchProjectsByKeyword(keyword, userComponents) {
  const inventoryMap = normalizeUserInventory(userComponents);
  const cleanQ = cleanSearchText(keyword);
  const terms = cleanQ.split(' ').filter((t) => t.length > 1);

  if (terms.length === 0) {
    // Return all projects evaluated
    return projects.map((p) => evaluateProjectMatch(p, inventoryMap));
  }

  const matchingProjects = [];

  for (const proj of projects) {
    let score = 0;
    const projName = cleanSearchText(proj.name);
    const projDesc = cleanSearchText(proj.description);
    const projCategory = cleanSearchText(proj.category);
    const projTags = (proj.tags || []).map((t) => cleanSearchText(t)).join(' ');
    const projComponents = (proj.components || []).map((c) => cleanSearchText(c.name)).join(' ');

    for (const term of terms) {
      if (projName.includes(term)) score += 10;
      if (projCategory.includes(term)) score += 6;
      if (projTags.includes(term)) score += 5;
      if (projComponents.includes(term)) score += 5;
      if (projDesc.includes(term)) score += 3;
    }

    if (score > 0) {
      const evaluation = evaluateProjectMatch(proj, inventoryMap);
      matchingProjects.push({ ...evaluation, relevanceScore: score });
    }
  }

  // Sort by relevance score first, then feasibility descending
  matchingProjects.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return b.feasibility - a.feasibility;
  });

  return matchingProjects;
}

/**
 * Reverse workflow: I WANT TO BUILD
 * Evaluates target project + suggests alternatives
 */
function checkTargetProject(projectId, userComponents) {
  const project = projects.find((p) => p.id === projectId || p.name.toLowerCase() === String(projectId).toLowerCase());
  if (!project) {
    throw new Error('Project not found');
  }

  const inventoryMap = normalizeUserInventory(userComponents);
  const targetMatch = evaluateProjectMatch(project, inventoryMap);

  let alternatives = [];
  const allMatches = projects
    .filter((p) => p.id !== project.id)
    .map((p) => evaluateProjectMatch(p, inventoryMap));

  allMatches.sort((a, b) => b.feasibility - a.feasibility);

  alternatives = allMatches
    .filter((p) => p.feasibility > targetMatch.feasibility || p.feasibility >= 50)
    .slice(0, 4);

  return {
    targetProject: targetMatch,
    alternatives,
    hasAlternatives: alternatives.length > 0
  };
}

module.exports = {
  catalog,
  projects,
  cleanSearchText,
  inferComponentCategory,
  resolveCatalogComponent,
  normalizeUserInventory,
  evaluateProjectMatch,
  findMatchingProjects,
  searchProjectsByKeyword,
  checkTargetProject
};
