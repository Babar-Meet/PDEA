import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { formatDate, formatDateTime } from '../../utils/format';
import './subscriptions.css';

const qualityOptions = [
  { value: '8K', label: '8K (4320p)' },
  { value: '4K', label: '4K (2160p)' },
  { value: '1440p', label: '1440p (2K)' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' },
  { value: '240p', label: '240p' },
  { value: '144p', label: '144p' }
];

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newQuality, setNewQuality] = useState('1080p');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  
  // Custom date inputs
  const [dateDay, setDateDay] = useState('');
  const [dateMonth, setDateMonth] = useState('');
  const [dateYear, setDateYear] = useState('');
  const [includeShorts, setIncludeShorts] = useState(false);
  const [includeLive, setIncludeLive] = useState(false);
  const [dateError, setDateError] = useState('');
  
  const [customCheckDate, setCustomCheckDate] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [checkingChannels, setCheckingChannels] = useState({}); // channelName -> boolean
  const [checkStatus, setCheckStatus] = useState({}); // channelName -> { status, message, step, current, total, count }
  const [checkingAll, setCheckingAll] = useState(false);
  const navigate = useNavigate();

  // WebSocket connection for real-time updates
  useEffect(() => {
    loadSubscriptions();
    
    // Connect to WebSocket for subscription check status updates
    const hostname = window.location.hostname;
    const ws = new WebSocket(`ws://${hostname}:5000/ws/downloads`);
    
    ws.onopen = () => {
      console.log('WebSocket connected for subscription updates');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle subscription check status updates
        if (data.type === 'subscription_check_status') {
          const { channelName, status, step, message, current, total, count } = data;
          
          setCheckStatus(prev => ({
            ...prev,
            [channelName]: {
              status,
              step,
              message,
              current,
              total,
              count
            }
          }));
          
          // Clear status after completion or error
          if (status === 'complete' || status === 'error') {
            loadSubscriptions(); // Refresh to show new last_checked
            setTimeout(() => {
              setCheckStatus(prev => {
                const newStatus = { ...prev };
                delete newStatus[channelName];
                return newStatus;
              });
            }, 5000); // Keep success/error message for 5 seconds
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    return () => {
      ws.close();
    };
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`);
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName: newChannelName,
          channelUrl: newChannelUrl,
          selected_quality: newQuality
        }),
      });

      if (response.ok) {
        const newSubscription = await response.json();
        setSubscriptions([...subscriptions, newSubscription]);
        setShowAddForm(false);
        setNewChannelName('');
        setNewChannelUrl('');
      } else {
        const errorData = await response.json();
        setAddError(errorData.error || 'Failed to add subscription');
      }
    } catch (error) {
      console.error('Error adding subscription:', error);
      setAddError('Network error. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteSubscription = async (channelName) => {
    if (!window.confirm(`Are you sure you want to delete the subscription for ${channelName}?\nThis will remove the channel folder and all downloaded videos.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(channelName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubscriptions(subscriptions.filter(sub => sub.channelName !== channelName));
      } else {
        const errorData = await response.json();
        alert(`Error deleting subscription: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Failed to delete subscription');
    }
  };

  const handleUpdateSubscription = async (channelName, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(channelName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedSubscription = await response.json();
        setSubscriptions(subscriptions.map(sub => 
          sub.channelName === channelName ? updatedSubscription : sub
        ));
      } else {
        const errorData = await response.json();
        alert(`Error updating subscription: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription');
    }
  };

  const handleCheckNow = async (channelName) => {
    setCheckingChannels(prev => ({ ...prev, [channelName]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(channelName)}/check`);
      const newVideos = await response.json();
      
      if (newVideos.length > 0) {
        // Find if auto-download is enabled for this channel
        const sub = subscriptions.find(s => s.channelName === channelName);
        if (sub && sub.auto_download) {
             navigate('/download/progress');
        } else {
             alert(`Found ${newVideos.length} new videos for ${channelName}`);
        }
      } else {
        alert(`No new videos found for ${channelName}`);
      }
      loadSubscriptions(); // Refresh to show new last_checked
    } catch (error) {
      console.error('Error checking for new videos:', error);
      alert('Failed to check for new videos');
    } finally {
      setCheckingChannels(prev => ({ ...prev, [channelName]: false }));
    }
  };

  const validateDate = () => {
    const day = parseInt(dateDay, 10);
    const month = parseInt(dateMonth, 10);
    const year = parseInt(dateYear, 10);

    if (!dateDay || !dateMonth || !dateYear) {
      setDateError('Please enter a complete date');
      return null;
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      setDateError('Date must be valid numbers');
      return null;
    }

    if (month < 1 || month > 12) {
      setDateError('Month must be between 1 and 12');
      return null;
    }

    // Days in month check
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      setDateError(`Day must be between 1 and ${daysInMonth} for selected month`);
      return null;
    }

    // Removed future date restriction - allow any date
    setDateError('');
    // Return YYYY-MM-DD format for API
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const handleCheckFromCustomDate = async (e) => {
    e.preventDefault();
    console.log('[Subscriptions] Checking from custom date:', { selectedSubscription, dateDay, dateMonth, dateYear });
    
    if (!selectedSubscription) {
      console.error('[Subscriptions] No subscription selected for custom check');
      setSelectedSubscription('all'); // Fallback to all if somehow null
    }

    const formattedDate = validateDate();
    if (!formattedDate) {
      console.warn('[Subscriptions] Date validation failed');
      return; // Validation failed
    }

    try {
      if (selectedSubscription === 'all') {
        console.log('[Subscriptions] Checking ALL subscriptions from', formattedDate);
        await handleCheckAllNow(formattedDate);
      } else {
        console.log(`[Subscriptions] Checking ${selectedSubscription} from`, formattedDate, 'Include Shorts:', includeShorts, 'Include Live:', includeLive);
        const response = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(selectedSubscription)}/check?customDate=${formattedDate}&includeShorts=${includeShorts}&includeLive=${includeLive}`);
        const newVideos = await response.json();
        
        if (newVideos.length > 0) {
          alert(`Found ${newVideos.length} new videos from ${dateDay}/${dateMonth}/${dateYear}`);
          // If auto-download is enabled, maybe we should redirect?
          const sub = subscriptions.find(s => s.channelName === selectedSubscription);
          if (sub && sub.auto_download) {
            navigate('/download/progress');
          }
        } else {
          alert(`No new videos found from ${dateDay}/${dateMonth}/${dateYear}`);
        }
      }
      
      loadSubscriptions(); // Refresh all to show new last_checked
      setShowCustomDateModal(false);
      // Reset fields but keep year for convenience
      setDateDay('');
      setDateMonth('');
      setDateError('');
      setSelectedSubscription(null);
    } catch (error) {
      console.error('[Subscriptions] Error checking for new videos:', error);
      alert('Failed to check for new videos. Please check your connection.');
    }
  };

  const handleCheckAllNow = async (customDate = null) => {
    console.log('[Subscriptions] handleCheckAllNow cold launch:', { customDate });
    setCheckingAll(true);
    try {
      let url = `${API_BASE_URL}/api/subscriptions/check-all`;
      if (customDate) {
        url += `?customDate=${customDate}&includeShorts=${includeShorts}&includeLive=${includeLive}`;
      } else {
        url += `?includeShorts=${includeShorts}&includeLive=${includeLive}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
      });
      
      const results = await response.json();
      
      let successCount = 0;
      let errorCount = 0;
      let totalNewVideos = 0;
      
      results.forEach(result => {
        if (result.status === 'success') {
          successCount++;
          totalNewVideos += (result.newVideosCount || 0);
        } else {
          errorCount++;
        }
      });
      
      if (totalNewVideos > 0) {
          navigate('/download/progress');
      } else {
          const message = customDate 
            ? `Checked ${results.length} subscriptions from ${customDate}\nSuccess: ${successCount}\nErrors: ${errorCount}`
            : `Checked ${results.length} subscriptions\nSuccess: ${successCount}\nErrors: ${errorCount}`;
            
          alert(message);
      }
    } catch (error) {
      console.error('Error checking all subscriptions:', error);
      alert('Failed to check all subscriptions');
    } finally {
      setCheckingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="subscriptions">
        <div className="loading">Loading subscriptions...</div>
      </div>
    );
  }

  return (
    <div className="subscriptions">
      <h1>Subscriptions</h1>
      
      <div className="subscriptions-header">
        <button 
          className="check-all-button"
          onClick={handleCheckAllNow}
          disabled={checkingAll}
        >
          {checkingAll ? 'Checking...' : 'Check All Now'}
        </button>
        
        <button 
          className="check-all-date-button"
          onClick={() => {
            const now = new Date();
            setDateDay(now.getDate().toString());
            setDateMonth((now.getMonth() + 1).toString());
            setDateYear(now.getFullYear().toString());
            setDateYear(now.getFullYear().toString());
            setIncludeShorts(false);
            setIncludeLive(false);
            setDateError('');
            setShowCustomDateModal(true);
            setSelectedSubscription('all');
          }}
          disabled={checkingAll}
        >
          Check All From Date
        </button>
        
        <button 
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          Add Subscription
        </button>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h2>Add New Subscription</h2>
          <form onSubmit={handleAddSubscription}>
            <div className="form-group">
              <label htmlFor="channelName">Channel Name:</label>
              <input
                id="channelName"
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Enter channel name"
                required
                disabled={addLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="channelUrl">Channel URL:</label>
              <input
                id="channelUrl"
                type="url"
                value={newChannelUrl}
                onChange={(e) => setNewChannelUrl(e.target.value)}
                placeholder="https://www.youtube.com/@channel"
                required
                disabled={addLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="selectedQuality">Video Quality:</label>
              <select
                id="selectedQuality"
                value={newQuality}
                onChange={(e) => setNewQuality(e.target.value)}
                disabled={addLoading}
              >
                {qualityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {addError && (
              <div className="error-message">{addError}</div>
            )}
            
            <div className="form-actions">
              <button 
                type="submit"
                disabled={addLoading}
                className="submit-button"
              >
                {addLoading ? 'Adding...' : 'Add Subscription'}
              </button>
              
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                disabled={addLoading}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div className="no-subscriptions">
          <p>No subscriptions yet. Click "Add Subscription" to get started.</p>
        </div>
      ) : (
        <div className="subscriptions-list">
          {subscriptions.map((subscription) => (
            <div key={subscription.channelName} className="subscription-card">
              <div className="subscription-info">
                <h3 className="channel-name">{subscription.channelName}</h3>
                <p className="channel-url">{subscription.channel_url}</p>
                
                <div className="subscription-details">
                  <div className="detail-item">
                    <span className="label">Quality:</span>
                    <select
                      value={subscription.selected_quality}
                      onChange={(e) => handleUpdateSubscription(subscription.channelName, {
                        selected_quality: e.target.value
                      })}
                      className="quality-select"
                    >
                      {qualityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">Auto Download:</span>
                    <span className={`value ${subscription.auto_download ? 'enabled' : 'disabled'}`}>
                      {subscription.auto_download ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">Last Checked:</span>
                    <span className="value">
                      {formatDateTime(subscription.last_checked)}
                    </span>
                  </div>
                  
                  {subscription.last_error && (
                    <div className="detail-item error">
                      <span className="label">Last Error:</span>
                      <span className="value">{subscription.last_error}</span>
                    </div>
                  )}
                  
                  {subscription.retry_count > 0 && (
                    <div className="detail-item">
                      <span className="label">Retry Count:</span>
                      <span className="value">{subscription.retry_count}/3</span>
                    </div>
                  )}

                  <div className="filtering-toggles">
                    <div className="detail-item">
                      <span className="label">Skip Shorts:</span>
                      <button 
                        className={`toggle-shorts-btn ${subscription.skip_shorts !== false ? 'active' : ''}`}
                        onClick={() => handleUpdateSubscription(subscription.channelName, {
                          skip_shorts: subscription.skip_shorts !== false ? false : true
                        })}
                      >
                        {subscription.skip_shorts !== false ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="detail-item">
                      <span className="label">Skip Live:</span>
                      <button 
                        className={`toggle-live-btn ${subscription.skip_live !== false ? 'active' : ''}`}
                        onClick={() => handleUpdateSubscription(subscription.channelName, {
                          skip_live: subscription.skip_live !== false ? false : true
                        })}
                      >
                        {subscription.skip_live !== false ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="subscription-actions">
                <button 
                  className="check-button"
                  onClick={() => handleCheckNow(subscription.channelName)}
                  disabled={checkingChannels[subscription.channelName] || checkingAll}
                >
                  {checkingChannels[subscription.channelName] ? 'Checking...' : 'Check Now'}
                </button>
                
                <button 
                  className="check-date-button"
                  onClick={() => {
                    setSelectedSubscription(subscription.channelName);
                    const now = new Date();
                    setDateDay(now.getDate().toString());
                    setDateMonth((now.getMonth() + 1).toString());
                    setDateYear(now.getFullYear().toString());
                    setIncludeShorts(false);
                    setIncludeLive(false);
                    setDateError('');
                    setShowCustomDateModal(true);
                  }}
                >
                  Check From Date
                </button>
                
                <button 
                  className="toggle-auto-button"
                  onClick={() => handleUpdateSubscription(subscription.channelName, {
                    auto_download: !subscription.auto_download
                  })}
                >
                  {subscription.auto_download ? 'Disable Auto-Download' : 'Enable Auto-Download'}
                </button>
                
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteSubscription(subscription.channelName)}
                >
                  Delete
                </button>
              </div>
              
              {/* Real-time check status */}
              {checkStatus[subscription.channelName] && (
                <div className={`check-status ${checkStatus[subscription.channelName].status}`}>
                  <div className="status-message">
                    {checkStatus[subscription.channelName].message}
                  </div>
                  {checkStatus[subscription.channelName].step === 'filtering' && 
                   checkStatus[subscription.channelName].current !== undefined && 
                   checkStatus[subscription.channelName].total !== undefined && (
                    <div className="status-progress">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${(checkStatus[subscription.channelName].current / checkStatus[subscription.channelName].total) * 100}%` 
                          }}
                        />
                      </div>
                      <div className="progress-text">
                        {checkStatus[subscription.channelName].current} / {checkStatus[subscription.channelName].total} videos checked
                      </div>
                    </div>
                  )}
                  {checkStatus[subscription.channelName].count !== undefined && 
                   checkStatus[subscription.channelName].status === 'complete' && (
                    <div className="status-count">
                      ✓ Found {checkStatus[subscription.channelName].count} new video{checkStatus[subscription.channelName].count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom Date Check Modal */}
      {showCustomDateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Check Videos From Date</h2>
            <form onSubmit={handleCheckFromCustomDate}>
              <div className="form-group">
                <label>Select Date (DD / MM / YYYY):</label>
                <div className="date-inputs-container">
                  <input
                    type="number"
                    placeholder="DD"
                    value={dateDay}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val || (parseInt(val) >= 0 && parseInt(val) <= 31)) {
                        setDateDay(val);
                        setDateError('');
                      }
                    }}
                    required
                    className="date-input"
                  />
                  <span className="date-separator">/</span>
                  <input
                    type="number"
                    placeholder="MM"
                    value={dateMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val || (parseInt(val) >= 0 && parseInt(val) <= 12)) {
                        setDateMonth(val);
                        setDateError('');
                      }
                    }}
                    required
                    className="date-input"
                  />
                  <span className="date-separator">/</span>
                  <input
                    type="number"
                    placeholder="YYYY"
                    value={dateYear}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val || val.length <= 4) {
                        setDateYear(val);
                        setDateError('');
                      }
                    }}
                    required
                    className="date-input year-input"
                  />
                </div>
                {dateError && (
                  <p className="error-message date-error" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                    {dateError}
                  </p>
                )}
                <p className="date-format-hint">
                  Enter date to check videos from (e.g., 15/02/2026)
                </p>
              </div>

              <div className="form-group shorts-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeShorts}
                    onChange={(e) => setIncludeShorts(e.target.checked)}
                  />
                  <span>Include YouTube Shorts</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeLive}
                    onChange={(e) => setIncludeLive(e.target.checked)}
                  />
                  <span>Include Live Streams</span>
                </label>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  Check Now
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setShowCustomDateModal(false);
                    setDateDay('');
                    setDateMonth('');
                    setDateYear('');
                    setDateError('');
                    setSelectedSubscription(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
