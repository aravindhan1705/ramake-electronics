/**
 * REMAKE ELECTRONICS - Matching Controller
 */

const matchingEngine = require('../services/matchingEngine');
const db = require('../services/db');

function findProjects(req, res) {
  try {
    const { components } = req.body;

    // Validate presence of components (Section 93: "Add at least one component to find suitable projects.")
    if (!components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one component to find suitable projects.'
      });
    }

    // Validate quantities (Section 18: "Quantity must be at least 1.")
    for (const comp of components) {
      if (!comp || !comp.name) {
        return res.status(400).json({
          success: false,
          message: 'Please select a component.'
        });
      }
      const qty = parseInt(comp.quantity, 10);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: `Quantity must be at least 1 for ${comp.name}.`
        });
      }
    }

    // Run matching engine
    const matchResult = matchingEngine.findMatchingProjects(components);

    // If user is authenticated, persist components to their profile
    if (req.user) {
      db.setUserInventory(req.user.id, components);
    }

    return res.status(200).json({
      success: true,
      recommendations: matchResult.recommendations,
      stats: matchResult.stats
    });
  } catch (err) {
    console.error('[MATCH ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while matching projects. Please try again.'
    });
  }
}

function checkTargetProject(req, res) {
  try {
    const { projectId, components } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a project to build.'
      });
    }

    const comps = Array.isArray(components) ? components : (req.user ? db.getUserInventory(req.user.id) : []);

    const result = matchingEngine.checkTargetProject(projectId, comps);

    return res.status(200).json({
      success: true,
      targetProject: result.targetProject,
      alternatives: result.alternatives,
      hasAlternatives: result.hasAlternatives
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Unable to check project requirements.'
    });
  }
}

module.exports = {
  findProjects,
  checkTargetProject
};
