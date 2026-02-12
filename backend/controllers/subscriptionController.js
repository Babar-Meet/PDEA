const subscriptionService = require('../services/subscriptionService');
const pendingVideosService = require('../services/pendingVideosService');

// Get all active subscriptions
async function getSubscriptions(req, res) {
  try {
    const subscriptions = await subscriptionService.loadSubscriptions();
    res.json(subscriptions);
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
}

// Create a new subscription
async function createSubscription(req, res) {
  try {
    const { channelName, channelUrl, selected_quality = '1080p' } = req.body;
    
    if (!channelName || !channelUrl) {
      return res.status(400).json({ error: 'Channel name and URL are required' });
    }
    
    const subscription = await subscriptionService.createSubscription(channelName, channelUrl, selected_quality);
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
}

// Delete a subscription
async function deleteSubscription(req, res) {
  try {
    const { channelName } = req.params;
    
    const success = await subscriptionService.deleteSubscription(channelName);
    
    if (success) {
      res.json({ message: 'Subscription deleted successfully' });
    } else {
      res.status(404).json({ error: 'Subscription not found' });
    }
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
}

// Update a subscription
async function updateSubscription(req, res) {
  try {
    const { channelName } = req.params;
    const updates = req.body;
    
    const subscription = await subscriptionService.updateSubscription(channelName, updates);
    
    if (subscription) {
      res.json(subscription);
    } else {
      res.status(404).json({ error: 'Subscription not found' });
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
}

// Check for new videos in a subscription
async function checkForNewVideos(req, res) {
  try {
    const { channelName } = req.params;
    const { customDate } = req.query;
    
    const subscriptions = await subscriptionService.loadSubscriptions();
    const subscription = subscriptions.find(sub => sub.channelName === channelName);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    const newVideos = await subscriptionService.checkForNewVideos(subscription, customDate);
    res.json(newVideos);
  } catch (error) {
    console.error('Error checking for new videos:', error);
    res.status(500).json({ error: 'Failed to check for new videos' });
  }
}

// Download a video
async function downloadVideo(req, res) {
  try {
    const { channelName } = req.params;
    const video = req.body;
    
    const subscriptions = await subscriptionService.loadSubscriptions();
    const subscription = subscriptions.find(sub => sub.channelName === channelName);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    await subscriptionService.downloadVideo(video, subscription);
    res.json({ message: 'Video downloaded successfully' });
  } catch (error) {
    console.error('Error downloading video:', error);
    
    // Update error metadata
    await subscriptionService.updateSubscription(req.params.channelName, {
      retry_count: (req.body.retry_count || 0) + 1,
      last_error: error.message
    });
    
    res.status(500).json({ error: 'Failed to download video', details: error.message });
  }
}

// Cancel a video (treat as skipped)
async function cancelVideo(req, res) {
  try {
    const { channelName } = req.params;
    const video = req.body;
    
    const subscriptions = await subscriptionService.loadSubscriptions();
    const subscription = subscriptions.find(sub => sub.channelName === channelName);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    const updatedSubscription = await subscriptionService.cancelVideo(video, subscription);
    res.json(updatedSubscription);
  } catch (error) {
    console.error('Error canceling video:', error);
    res.status(500).json({ error: 'Failed to cancel video' });
  }
}

async function cancelAllPendingVideos(req, res) {
  try {
    await subscriptionService.cancelAllPendingVideos();
    res.json({ message: 'All pending videos canceled successfully' });
  } catch (error) {
    console.error('Error canceling all pending videos:', error);
    res.status(500).json({ error: 'Failed to cancel all pending videos' });
  }
}

// Check all subscriptions for new videos (manual check)
async function getPendingVideos(req, res) {
  try {
    const pendingVideos = pendingVideosService.loadAllPendingVideos();
    res.json(pendingVideos);
  } catch (error) {
    console.error('Error getting pending videos:', error);
    res.status(500).json({ error: 'Failed to get pending videos' });
  }
}

async function checkAllSubscriptions(req, res) {
  try {
    const { customDate } = req.query;
    const subscriptions = await subscriptionService.loadSubscriptions();
    const results = [];
    
    for (const subscription of subscriptions) {
      try {
        const newVideos = await subscriptionService.checkForNewVideos(subscription, customDate);
        
        if (subscription.auto_download && newVideos.length > 0) {
          for (const video of newVideos) {
            await subscriptionService.downloadVideo(video, subscription);
          }
        }
        
        results.push({
          channelName: subscription.channelName,
          newVideosCount: newVideos.length,
          status: 'success'
        });
      } catch (error) {
        console.error(`Error checking ${subscription.channelName}:`, error);
        
        // Update error metadata
        await subscriptionService.updateSubscription(subscription.channelName, {
          retry_count: subscription.retry_count + 1,
          last_error: error.message
        });
        
        // Disable auto_download if max retries reached
        if (subscription.retry_count + 1 >= 3) {
          await subscriptionService.updateSubscription(subscription.channelName, {
            auto_download: false
          });
        }
        
        results.push({
          channelName: subscription.channelName,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error checking all subscriptions:', error);
    res.status(500).json({ error: 'Failed to check all subscriptions' });
  }
}

module.exports = {
  getSubscriptions,
  getPendingVideos,
  createSubscription,
  deleteSubscription,
  updateSubscription,
  checkForNewVideos,
  downloadVideo,
  cancelVideo,
  cancelAllPendingVideos,
  checkAllSubscriptions
};
