/**
 * REMAKE ELECTRONICS - Core Application API Routes
 */

const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projectsController');
const matchingController = require('../controllers/matchingController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

// Component Catalog
router.get('/components/catalog', projectsController.getCatalog);

// Predefined Projects Database & Keyword Search
router.get('/projects/search', optionalAuth, projectsController.searchProjects);
router.get('/projects', optionalAuth, projectsController.getAllProjects);
router.get('/projects/:id', optionalAuth, projectsController.getProjectById);

// Matching Engine
// POST /api/match/find-projects (I HAVE COMPONENTS workflow)
router.post('/match/find-projects', optionalAuth, matchingController.findProjects);

// POST /api/match/check-project (I WANT TO BUILD workflow)
router.post('/match/check-project', optionalAuth, matchingController.checkTargetProject);

// User Inventory
router.get('/user/inventory', requireAuth, projectsController.getUserInventory);
router.post('/user/inventory', requireAuth, projectsController.setUserInventory);

// Saved Projects (My Projects)
router.get('/user/saved-projects', requireAuth, projectsController.getSavedProjects);
router.post('/user/saved-projects', requireAuth, projectsController.addSavedProject);
router.delete('/user/saved-projects/:id', requireAuth, projectsController.removeSavedProject);

// User Reuse Impact Metrics
router.get('/user/impact', requireAuth, projectsController.getUserImpact);

module.exports = router;
