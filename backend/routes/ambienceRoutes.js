const express = require('express');
const router = express.Router();
const ambienceController = require('../controllers/ambienceController');

router.get('/files', ambienceController.getAmbienceFiles);

module.exports = router;
