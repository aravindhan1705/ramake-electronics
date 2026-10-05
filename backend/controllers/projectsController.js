/**
 * REMAKE ELECTRONICS - Projects and Inventory Controller
 */

const catalog = require('../data/catalog.json');
const projects = require('../data/projects.json');
const db = require('../services/db');
const matchingEngine = require('../services/matchingEngine');

function getCatalog(req, res) {
  return res.status(200).json({
    success: true,
    catalog
  });
}

function getAllProjects(req, res) {
  const { category, difficulty, search, q } = req.query;
  const keyword = search || q;

  let userComponents = [];
  if (req.user) {
    userComponents = db.getUserInventory(req.user.id);
  }

  let results = [];
  if (keyword) {
    results = matchingEngine.searchProjectsByKeyword(keyword, userComponents);
  } else {
    const inventoryMap = matchingEngine.normalizeUserInventory(userComponents);
    results = projects.map((p) => matchingEngine.evaluateProjectMatch(p, inventoryMap));
  }

  if (category && category !== 'All') {
    results = results.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (difficulty && difficulty !== 'All') {
    results = results.filter((p) => p.difficulty.toLowerCase() === difficulty.toLowerCase());
  }

  return res.status(200).json({
    success: true,
    count: results.length,
    projects: results
  });
}

function searchProjects(req, res) {
  const q = req.query.q || req.query.keyword || req.query.search || '';
  let userComponents = [];
  if (req.user) {
    userComponents = db.getUserInventory(req.user.id);
  }
  const results = matchingEngine.searchProjectsByKeyword(q, userComponents);
  return res.status(200).json({
    success: true,
    keyword: q,
    count: results.length,
    projects: results
  });
}

function getProjectById(req, res) {
  const { id } = req.params;
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found.'
    });
  }

  // If user is authenticated, compute feasibility with their inventory
  let matchInfo = null;
  if (req.user) {
    const userComponents = db.getUserInventory(req.user.id);
    const inventoryMap = matchingEngine.normalizeUserInventory(userComponents);
    matchInfo = matchingEngine.evaluateProjectMatch(project, inventoryMap);
  }

  return res.status(200).json({
    success: true,
    project,
    matchInfo
  });
}

function getUserInventory(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const components = db.getUserInventory(req.user.id);
  return res.status(200).json({
    success: true,
    components
  });
}

function setUserInventory(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const { components } = req.body;
  if (!Array.isArray(components)) {
    return res.status(400).json({ success: false, message: 'Invalid components format.' });
  }

  const updated = db.setUserInventory(req.user.id, components);
  return res.status(200).json({
    success: true,
    components: updated
  });
}

function getSavedProjects(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const savedIds = db.getSavedProjects(req.user.id);
  const userComponents = db.getUserInventory(req.user.id);
  const inventoryMap = matchingEngine.normalizeUserInventory(userComponents);

  const savedList = savedIds
    .map((id) => {
      const proj = projects.find((p) => p.id === id);
      if (!proj) return null;
      const evaluation = matchingEngine.evaluateProjectMatch(proj, inventoryMap);
      return {
        ...proj,
        feasibility: evaluation.feasibility,
        status: evaluation.status,
        statusLabel: evaluation.statusLabel,
        savedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    })
    .filter(Boolean);

  return res.status(200).json({
    success: true,
    savedProjects: savedList
  });
}

function addSavedProject(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const { projectId } = req.body;
  if (!projectId) {
    return res.status(400).json({ success: false, message: 'Project ID is required.' });
  }

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  db.addSavedProject(req.user.id, projectId);

  return res.status(200).json({
    success: true,
    message: 'Project saved successfully.',
    saved: true
  });
}

function removeSavedProject(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const { id } = req.params;
  db.removeSavedProject(req.user.id, id);

  return res.status(200).json({
    success: true,
    message: 'Project removed from saved list.',
    saved: false
  });
}

function getUserImpact(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const userComponents = db.getUserInventory(req.user.id);
  const savedIds = db.getSavedProjects(req.user.id);
  const inventoryMap = matchingEngine.normalizeUserInventory(userComponents);

  // Compute components listed
  let totalPieces = 0;
  inventoryMap.forEach((entry) => {
    totalPieces += entry.quantity;
  });

  // Evaluate all projects against inventory
  const allEvaluations = projects.map((p) => matchingEngine.evaluateProjectMatch(p, inventoryMap));
  const projectsEnabled = allEvaluations.filter((p) => p.status === 'READY TO BUILD').length;

  // Saved projects waste avoided sum
  const savedProjectsObjects = savedIds
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean);

  let totalWasteAvoidedGrams = savedProjectsObjects.reduce((acc, p) => acc + (p.estimatedWasteAvoided || 0), 0);

  // If no saved projects yet, provide potential waste avoided from top feasible projects
  if (totalWasteAvoidedGrams === 0 && projectsEnabled > 0) {
    const readyProjects = allEvaluations.filter((p) => p.status === 'READY TO BUILD');
    totalWasteAvoidedGrams = readyProjects.reduce((acc, p) => acc + (p.estimatedWasteAvoided || 0), 0);
  }

  // Fallback defaults for empty profile to look realistic
  const displayPieces = totalPieces > 0 ? totalPieces : 0;
  const displaySaved = savedIds.length;
  const displayEnabled = projectsEnabled;
  const displayWasteKg = (totalWasteAvoidedGrams / 1000).toFixed(1);

  return res.status(200).json({
    success: true,
    impact: {
      componentsReused: displayPieces,
      projectsSaved: displaySaved,
      projectsEnabled: displayEnabled,
      estimatedWasteAvoidedKg: displayWasteKg,
      estimatedWasteAvoidedGrams: totalWasteAvoidedGrams
    }
  });
}

module.exports = {
  getCatalog,
  getAllProjects,
  searchProjects,
  getProjectById,
  getUserInventory,
  setUserInventory,
  getSavedProjects,
  addSavedProject,
  removeSavedProject,
  getUserImpact
};
