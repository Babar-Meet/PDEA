const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// Get all active subscriptions
router.get('/', subscriptionController.getSubscriptions);

// Get all pending videos
router.get('/pending-videos', subscriptionController.getPendingVideos);
router.post('/cancel-all-pending', subscriptionController.cancelAllPendingVideos);

// Create a new subscription
router.post('/', subscriptionController.createSubscription);

// Delete a subscription
router.delete('/:channelName', subscriptionController.deleteSubscription);

// Update a subscription
router.put('/:channelName', subscriptionController.updateSubscription);

// Check for new videos in a specific subscription
router.get('/:channelName/check', subscriptionController.checkForNewVideos);

// Download a video from a specific subscription
router.post('/:channelName/download', subscriptionController.downloadVideo);

// Cancel a video from a specific subscription
router.post('/:channelName/cancel', subscriptionController.cancelVideo);

// Check all subscriptions for new videos (manual check)
router.post('/check-all', subscriptionController.checkAllSubscriptions);

module.exports = router;
