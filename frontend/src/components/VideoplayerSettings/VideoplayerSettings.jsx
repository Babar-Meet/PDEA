import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideoPlayerSettings } from '../../hooks/useVideoPlayerSettings';
import './VideoPlayerSettings.css';

const KeyBindingInput = ({ label, value, onChange, description }) => {
  const [isListening, setIsListening] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Format display value
    let formatted = value;
    if (value === ' ') formatted = 'Space';
    else if (value === 'ArrowLeft') formatted = '←';
    else if (value === 'ArrowRight') formatted = '→';
    else if (value === 'ArrowUp') formatted = '↑';
    else if (value === 'ArrowDown') formatted = '↓';
    else if (value === '[') formatted = '[';
    else if (value === ']') formatted = ']';
    else if (value === ',') formatted = ',';
    else if (value === '.') formatted = '.';
    else if (value.length === 1) formatted = value.toUpperCase();
    
    setDisplayValue(formatted);
  }, [value]);

  const handleClick = () => {
    setIsListening(true);
  };

  useEffect(() => {
    if (!isListening) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      let key = e.key;
      
      // Block escape key from being assigned
      if (key === 'Escape') {
        setIsListening(false);
        return;
      }

      // Handle special cases
      if (key === ' ') key = ' ';
      if (key === '[' || key === ']' || key === ',' || key === '.') {
        // Keep as is
      } else if (key.startsWith('Arrow')) {
        // Keep arrow keys
      } else if (key.length === 1) {
        key = key.toLowerCase();
      }

      onChange(key);
      setIsListening(false);
    };

    const handleClickOutside = (e) => {
      if (!e.target.closest('.key-binding-input')) {
        setIsListening(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isListening, onChange]);

  return (
    <div className="key-binding-item">
      <div className="key-binding-label">
        <span className="label-text">{label}</span>
        {description && <span className="label-description">{description}</span>}
      </div>
      <div className="key-binding-input-wrapper">
        <button
          type="button"
          className={`key-binding-input ${isListening ? 'listening' : ''}`}
          onClick={handleClick}
        >
          <span className="key-display">{isListening ? 'Press any key...' : displayValue}</span>
          <span className="edit-hint">Click to edit</span>
        </button>
      </div>
    </div>
  );
};

const TimeInput = ({ label, value, onChange, min = -999, max = 999, step = 1 }) => {
  const [inputValue, setInputValue] = useState(value);
  const [unit, setUnit] = useState('seconds');

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    setInputValue(val);
    
    // Convert to seconds based on unit
    let seconds = val;
    if (unit === 'minutes') seconds = val * 60;
    else if (unit === 'hours') seconds = val * 3600;
    else if (unit === 'frames') seconds = val * (1/30); // Assuming 30fps
    
    onChange(seconds);
  };

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    setUnit(newUnit);
    
    // Convert value to new unit
    let displayValue = value;
    if (newUnit === 'minutes') displayValue = value / 60;
    else if (newUnit === 'hours') displayValue = value / 3600;
    else if (newUnit === 'frames') displayValue = value * 30; // Assuming 30fps
    
    setInputValue(displayValue);
  };

  return (
    <div className="time-input-group">
      <label>{label}</label>
      <div className="time-input-wrapper">
        <input
          type="number"
          value={inputValue}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className="time-input"
        />
        <select value={unit} onChange={handleUnitChange} className="unit-select">
          <option value="seconds">seconds</option>
          <option value="minutes">minutes</option>
          <option value="hours">hours</option>
          <option value="frames">frames</option>
        </select>
      </div>
    </div>
  );
};

const VideoPlayerSettings = () => {
  const navigate = useNavigate();
  const {
    draftSettings,
    hasUnsavedChanges,
    updateDraftSetting,
    saveSettings,
    resetToDefaults,
    cancelChanges
  } = useVideoPlayerSettings();

  const [activeTab, setActiveTab] = useState('general');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = () => {
    saveSettings();
    setShowSaveSuccess(true);
    
    // Show success message and redirect
    setTimeout(() => {
      setShowSaveSuccess(false);
      navigate('/');
    }, 1500);
  };

  const handleResetConfirm = () => {
    resetToDefaults();
    setShowResetConfirm(false);
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'playback', label: 'Playback' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'interface', label: 'Interface' }
  ];

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <h1 className="settings-title">Video Player Settings</h1>
          <p className="settings-subtitle">Customize your viewing experience</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="settings-main">
        {/* Navigation Tabs */}
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Save Success Notification */}
        {showSaveSuccess && (
          <div className="save-success-notification">
            <div className="success-content">
              <svg className="success-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Settings saved successfully! Redirecting...</span>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="settings-content">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="tab-content">
              <div className="settings-section">
                <h2 className="section-title">Skip Controls</h2>
                <div className="settings-grid">
                  <TimeInput
                    label="Forward Skip"
                    value={draftSettings.forwardSkipAmount}
                    onChange={(value) => updateDraftSetting('forwardSkipAmount', value)}
                    min={1}
                    max={3600}
                    step={0.5}
                  />
                  
                  <TimeInput
                    label="Backward Skip"
                    value={draftSettings.backwardSkipAmount}
                    onChange={(value) => updateDraftSetting('backwardSkipAmount', value)}
                    min={-3600}
                    max={-1}
                    step={0.5}
                  />
                  
                  <TimeInput
                    label="Left Arrow Skip"
                    value={draftSettings.leftArrowSkip}
                    onChange={(value) => updateDraftSetting('leftArrowSkip', value)}
                    min={-3600}
                    max={0}
                    step={0.5}
                  />
                  
                  <TimeInput
                    label="Right Arrow Skip"
                    value={draftSettings.rightArrowSkip}
                    onChange={(value) => updateDraftSetting('rightArrowSkip', value)}
                    min={0}
                    max={3600}
                    step={0.5}
                  />
                </div>
              </div>

              <div className="settings-section">
                <h2 className="section-title">Spacebar Behavior</h2>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="spacebarMode"
                      value="playpause"
                      checked={draftSettings.spacebarMode === 'playpause'}
                      onChange={(e) => updateDraftSetting('spacebarMode', e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <div className="radio-content">
                      <div className="radio-title">Play/Pause with temporary speed on hold</div>
                      <div className="radio-description">
                        Tap: Toggle play/pause • Hold: Temporary speed boost
                      </div>
                    </div>
                  </label>
                  
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="spacebarMode"
                      value="tempspeed"
                      checked={draftSettings.spacebarMode === 'tempspeed'}
                      onChange={(e) => updateDraftSetting('spacebarMode', e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <div className="radio-content">
                      <div className="radio-title">Temporary speed only</div>
                      <div className="radio-description">
                        Hold: Temporary speed boost • Release: Return to normal speed
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Playback Tab */}
          {activeTab === 'playback' && (
            <div className="tab-content">
              <div className="settings-section">
                <h2 className="section-title">Playback Speed</h2>
                <div className="settings-grid">
                  <div className="setting-group">
                    <label>Speed Increment</label>
                    <div className="select-wrapper">
                      <select
                        value={draftSettings.normalSpeedIncrement}
                        onChange={(e) => updateDraftSetting('normalSpeedIncrement', parseFloat(e.target.value))}
                      >
                        <option value="0.1">0.1x (Fine adjustment)</option>
                        <option value="0.25">0.25x (Recommended)</option>
                        <option value="0.5">0.5x (Coarse adjustment)</option>
                      </select>
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Minimum Speed</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={draftSettings.minSpeed}
                        onChange={(e) => updateDraftSetting('minSpeed', parseFloat(e.target.value))}
                      />
                      <span className="unit">x</span>
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Maximum Speed</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="1"
                        max="16"
                        step="0.5"
                        value={draftSettings.maxSpeed}
                        onChange={(e) => updateDraftSetting('maxSpeed', parseFloat(e.target.value))}
                      />
                      <span className="unit">x</span>
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Temporary Speed Amount</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="1.5"
                        max="8"
                        step="0.5"
                        value={draftSettings.tempSpeedAmount}
                        onChange={(e) => updateDraftSetting('tempSpeedAmount', parseFloat(e.target.value))}
                      />
                      <span className="unit">x</span>
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Hold Delay</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="500"
                        max="3000"
                        step="100"
                        value={draftSettings.tempSpeedHoldDelay}
                        onChange={(e) => updateDraftSetting('tempSpeedHoldDelay', parseInt(e.target.value))}
                      />
                      <span className="unit">ms</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h2 className="section-title">Frame Navigation</h2>
                <div className="settings-grid">
                  <div className="setting-group">
                    <label>Frame Step</label>
                    <div className="select-wrapper">
                      <select
                        value={draftSettings.frameStepSeconds}
                        onChange={(e) => updateDraftSetting('frameStepSeconds', parseFloat(e.target.value))}
                      >
                        <option value={1/24}>1 frame (24fps)</option>
                        <option value={1/30}>1 frame (30fps)</option>
                        <option value={1/60}>1 frame (60fps)</option>
                        <option value="0.1">0.1 seconds</option>
                        <option value="0.25">0.25 seconds</option>
                        <option value="0.5">0.5 seconds</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draftSettings.tempSpeedEnabled}
                      onChange={(e) => updateDraftSetting('tempSpeedEnabled', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <div className="checkbox-content">
                      <div className="checkbox-title">Enable temporary speed boost</div>
                      <div className="checkbox-description">
                        Hold spacebar to temporarily increase playback speed
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* NEW: Auto-play and Loop Settings */}
              <div className="settings-section">
                <h2 className="section-title">Auto-play & Loop</h2>
                <div className="settings-grid">
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={draftSettings.autoPlayNext}
                        onChange={(e) => updateDraftSetting('autoPlayNext', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <div className="checkbox-content">
                        <div className="checkbox-title">Auto-play next video</div>
                        <div className="checkbox-description">
                          Automatically play next video when current ends
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={draftSettings.loopSingle}
                        onChange={(e) => updateDraftSetting('loopSingle', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <div className="checkbox-content">
                        <div className="checkbox-title">Loop single video</div>
                        <div className="checkbox-description">
                          Loop current video when it ends
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={draftSettings.showPlaylistControls}
                        onChange={(e) => updateDraftSetting('showPlaylistControls', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <div className="checkbox-content">
                        <div className="checkbox-title">Show playlist controls</div>
                        <div className="checkbox-description">
                          Show next/previous video buttons in player controls
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="setting-group">
                    <label>Auto-play Delay</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={draftSettings.autoPlayDelay}
                        onChange={(e) => updateDraftSetting('autoPlayDelay', parseFloat(e.target.value))}
                      />
                      <span className="unit">seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <div className="tab-content">
              <div className="settings-section">
                <h2 className="section-title">Playback Controls</h2>
                <div className="key-bindings-grid">
                  <KeyBindingInput
                    label="Play/Pause"
                    value={draftSettings.playPauseKey}
                    onChange={(value) => updateDraftSetting('playPauseKey', value)}
                    description="Toggle video playback"
                  />
                  
                  <KeyBindingInput
                    label="Forward Skip"
                    value={draftSettings.forwardSkipKey}
                    onChange={(value) => updateDraftSetting('forwardSkipKey', value)}
                    description="Skip forward"
                  />
                  
                  <KeyBindingInput
                    label="Backward Skip"
                    value={draftSettings.backwardSkipKey}
                    onChange={(value) => updateDraftSetting('backwardSkipKey', value)}
                    description="Skip backward"
                  />
                  
                  <KeyBindingInput
                    label="Mute"
                    value={draftSettings.muteKey}
                    onChange={(value) => updateDraftSetting('muteKey', value)}
                    description="Toggle audio mute"
                  />
                </div>
              </div>

              <div className="settings-section">
                <h2 className="section-title">Navigation</h2>
                <div className="key-bindings-grid">
                  <KeyBindingInput
                    label="Left Arrow"
                    value={draftSettings.leftArrowKey}
                    onChange={(value) => updateDraftSetting('leftArrowKey', value)}
                    description="Skip left"
                  />
                  
                  <KeyBindingInput
                    label="Right Arrow"
                    value={draftSettings.rightArrowKey}
                    onChange={(value) => updateDraftSetting('rightArrowKey', value)}
                    description="Skip right"
                  />
                  
                  <KeyBindingInput
                    label="Volume Up"
                    value={draftSettings.volumeUpKey}
                    onChange={(value) => updateDraftSetting('volumeUpKey', value)}
                    description="Increase volume"
                  />
                  
                  <KeyBindingInput
                    label="Volume Down"
                    value={draftSettings.volumeDownKey}
                    onChange={(value) => updateDraftSetting('volumeDownKey', value)}
                    description="Decrease volume"
                  />
                </div>
              </div>

              <div className="settings-section">
                <h2 className="section-title">Advanced Controls</h2>
                <div className="key-bindings-grid">
                  <KeyBindingInput
                    label="Frame Backward"
                    value={draftSettings.frameBackKey}
                    onChange={(value) => updateDraftSetting('frameBackKey', value)}
                    description="Previous frame"
                  />
                  
                  <KeyBindingInput
                    label="Frame Forward"
                    value={draftSettings.frameForwardKey}
                    onChange={(value) => updateDraftSetting('frameForwardKey', value)}
                    description="Next frame"
                  />
                  
                  <KeyBindingInput
                    label="Speed Down"
                    value={draftSettings.speedDownKey}
                    onChange={(value) => updateDraftSetting('speedDownKey', value)}
                    description="Decrease speed"
                  />
                  
                  <KeyBindingInput
                    label="Speed Up"
                    value={draftSettings.speedUpKey}
                    onChange={(value) => updateDraftSetting('speedUpKey', value)}
                    description="Increase speed"
                  />
                  
                  <KeyBindingInput
                    label="Fullscreen"
                    value={draftSettings.fullscreenKey}
                    onChange={(value) => updateDraftSetting('fullscreenKey', value)}
                    description="Toggle fullscreen"
                  />
                  
                  {/* NEW: Next/Previous Video Shortcuts */}
                  <KeyBindingInput
                    label="Previous Video"
                    value={draftSettings.prevVideoKey}
                    onChange={(value) => updateDraftSetting('prevVideoKey', value)}
                    description="Play previous video"
                  />
                  
                  <KeyBindingInput
                    label="Next Video"
                    value={draftSettings.nextVideoKey}
                    onChange={(value) => updateDraftSetting('nextVideoKey', value)}
                    description="Play next video"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Interface Tab */}
          {activeTab === 'interface' && (
            <div className="tab-content">
              <div className="settings-section">
                <h2 className="section-title">Player Interface</h2>
                <div className="checkbox-list">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draftSettings.showSkipButtons}
                      onChange={(e) => updateDraftSetting('showSkipButtons', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <div className="checkbox-content">
                      <div className="checkbox-title">Show skip buttons</div>
                      <div className="checkbox-description">
                        Display skip forward/backward buttons in controls
                      </div>
                    </div>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draftSettings.showVolumeSlider}
                      onChange={(e) => updateDraftSetting('showVolumeSlider', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <div className="checkbox-content">
                      <div className="checkbox-title">Show volume slider</div>
                      <div className="checkbox-description">
                        Display volume slider in controls
                      </div>
                    </div>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draftSettings.showTimeDisplay}
                      onChange={(e) => updateDraftSetting('showTimeDisplay', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <div className="checkbox-content">
                      <div className="checkbox-title">Show time display</div>
                      <div className="checkbox-description">
                        Display current time and duration
                      </div>
                    </div>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draftSettings.controlsAutoHide}
                      onChange={(e) => updateDraftSetting('controlsAutoHide', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <div className="checkbox-content">
                      <div className="checkbox-title">Auto-hide controls</div>
                      <div className="checkbox-description">
                        Hide controls when inactive
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <h2 className="section-title">Auto-hide Delay</h2>
                <div className="setting-group">
                  <div className="slider-with-value">
                    <input
                      type="range"
                      min="1000"
                      max="10000"
                      step="500"
                      value={draftSettings.autoHideDelay}
                      onChange={(e) => updateDraftSetting('autoHideDelay', parseInt(e.target.value))}
                      className="range-slider"
                    />
                    <div className="slider-value">
                      <span className="value">{(draftSettings.autoHideDelay / 1000).toFixed(1)}</span>
                      <span className="unit">seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="settings-actions">
          <div className="actions-left">
            {hasUnsavedChanges && (
              <div className="unsaved-changes">
                <span className="dot"></span>
                Unsaved changes
              </div>
            )}
          </div>
          
          <div className="actions-right">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowResetConfirm(true)}
            >
              Reset All
            </button>
            
            {hasUnsavedChanges && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelChanges}
              >
                Cancel
              </button>
            )}
            
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Reset Settings</h3>
              <button
                className="modal-close"
                onClick={() => setShowResetConfirm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to reset all settings to default values?</p>
              <p className="modal-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleResetConfirm}
              >
                Reset All Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayerSettings;