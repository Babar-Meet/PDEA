import React, { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  setPreset,
  updateToken,
  updateTokens,
  importTheme,
  resetToDark,
  resetToLight,
  darkTheme,
  lightTheme,
} from '../../store/slices/themeSlice'
import {
  Sun,
  Moon,
  Sliders,
  RotateCcw,
  Download,
  Upload,
  Check,
  Palette,
} from 'lucide-react'
import './Theme.css'

// ─── Token Groups ─────────────────────────────────────────────────────────────

const COLOR_TOKENS = [
  { key: '--bg-primary',         label: 'Background (Primary)',    type: 'color' },
  { key: '--bg-secondary',       label: 'Background (Secondary)',  type: 'color' },
  { key: '--bg-card',            label: 'Card Background',         type: 'color' },
  { key: '--text-primary',       label: 'Text (Primary)',          type: 'color' },
  { key: '--text-secondary',     label: 'Text (Secondary)',        type: 'color' },
  { key: '--accent',             label: 'Accent / Button Color',   type: 'color' },
  { key: '--accent-hover',       label: 'Accent Hover',           type: 'color' },
  { key: '--sidebar-bg',         label: 'Sidebar Background',      type: 'color' },
  { key: '--sidebar-hover',      label: 'Sidebar Hover',           type: 'color' },
  { key: '--sidebar-active',     label: 'Sidebar Active',          type: 'color' },
  { key: '--btn-trash',          label: 'Trash Button Color',      type: 'color' },
  { key: '--btn-delete',         label: 'Delete Button Color',     type: 'color' },
  { key: '--badge-bg',           label: 'Badge / Notification',    type: 'color' },
]

const FONT_FAMILIES = [
  { label: 'Roboto (Default)', value: "'Roboto', sans-serif" },
  { label: 'Inter',            value: "'Inter', sans-serif" },
  { label: 'Poppins',          value: "'Poppins', sans-serif" },
  { label: 'Outfit',           value: "'Outfit', sans-serif" },
  { label: 'System UI',        value: 'system-ui, sans-serif' },
  { label: 'Georgia (Serif)',  value: 'Georgia, serif' },
]

// ─── Helper: parse px value to number ────────────────────────────────────────
const parsePx = (val) => parseInt(val, 10) || 0

// ─── Color token: rgba strings can't be used in <input type="color">,
//     so we only show a color picker for hex values. For rgba we show a text input.
const isHex = (val) => /^#[0-9a-fA-F]{3,8}$/.test((val || '').trim())

// ─── Component ────────────────────────────────────────────────────────────────

const Theme = () => {
  const dispatch = useDispatch()
  const { activeTheme, customTokens } = useSelector((state) => state.theme)
  const [activeTab, setActiveTab] = useState('colors') // 'colors' | 'typography' | 'layout'
  const [savedFlash, setSavedFlash] = useState(false)
  const importRef = useRef(null)

  // ── Preset buttons ──────────────────────────────────────────────────────────
  const handlePreset = (preset) => {
    dispatch(setPreset(preset))
  }

  // ── Token change ────────────────────────────────────────────────────────────
  const handleToken = (key, value) => {
    dispatch(updateToken({ key, value }))
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = JSON.stringify({ activeTheme, customTokens }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${activeTheme}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        dispatch(importTheme(parsed))
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
      } catch {
        alert('Invalid theme file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Saved flash ─────────────────────────────────────────────────────────────
  const flashSaved = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <div className="theme-page">
      {/* Header */}
      <div className="theme-header">
        <div className="theme-header__icon"><Palette /></div>
        <div>
          <h1 className="theme-header__title">Theme Studio</h1>
          <p className="theme-header__sub">Customize every visual element of the app</p>
        </div>
      </div>

      {/* ── Preset Row ─────────────────────────────────────────────────────── */}
      <section className="theme-section">
        <h2 className="theme-section__title">Presets</h2>
        <div className="theme-presets">
          <button
            className={`theme-preset-btn ${activeTheme === 'dark' ? 'active' : ''}`}
            onClick={() => handlePreset('dark')}
          >
            <Moon />
            <span>Dark</span>
            {activeTheme === 'dark' && <Check className="preset-check" />}
          </button>
          <button
            className={`theme-preset-btn ${activeTheme === 'light' ? 'active' : ''}`}
            onClick={() => handlePreset('light')}
          >
            <Sun />
            <span>Light</span>
            {activeTheme === 'light' && <Check className="preset-check" />}
          </button>
          <button
            className={`theme-preset-btn ${activeTheme === 'custom' ? 'active' : ''}`}
            disabled
          >
            <Sliders />
            <span>Custom</span>
            {activeTheme === 'custom' && <Check className="preset-check" />}
          </button>
        </div>
      </section>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="theme-tabs">
        {['colors', 'typography', 'layout'].map((tab) => (
          <button
            key={tab}
            className={`theme-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Colors Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'colors' && (
        <section className="theme-section">
          <div className="theme-token-grid">
            {COLOR_TOKENS.map(({ key, label }) => {
              const val = customTokens[key] || ''
              const hex = isHex(val)
              return (
                <div key={key} className="theme-token-row">
                  <label className="theme-token-label">{label}</label>
                  <div className="theme-token-controls">
                    {hex ? (
                      <input
                        type="color"
                        className="theme-color-swatch"
                        value={val.trim()}
                        onChange={(e) => handleToken(key, e.target.value)}
                        title={val}
                      />
                    ) : (
                      <div
                        className="theme-color-swatch theme-color-swatch--preview"
                        style={{ background: val }}
                        title="rgba/gradient — edit in text field"
                      />
                    )}
                    <input
                      type="text"
                      className="theme-token-input"
                      value={val}
                      onChange={(e) => handleToken(key, e.target.value)}
                      placeholder="#rrggbb or rgba(...)"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Typography Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'typography' && (
        <section className="theme-section">
          <div className="theme-token-grid">
            {/* Font Family */}
            <div className="theme-token-row">
              <label className="theme-token-label">Font Family</label>
              <div className="theme-token-controls">
                <select
                  className="theme-select"
                  value={customTokens['--font-family'] || "'Roboto', sans-serif"}
                  onChange={(e) => handleToken('--font-family', e.target.value)}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Header Font */}
            <div className="theme-token-row">
              <label className="theme-token-label">Header Font</label>
              <div className="theme-token-controls">
                <select
                  className="theme-select"
                  value={customTokens['--font-header'] || "'Roboto', sans-serif"}
                  onChange={(e) => handleToken('--font-header', e.target.value)}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Video Title Font */}
            <div className="theme-token-row">
              <label className="theme-token-label">Video Title Font</label>
              <div className="theme-token-controls">
                <select
                  className="theme-select"
                  value={customTokens['--font-title'] || "'Roboto', sans-serif"}
                  onChange={(e) => handleToken('--font-title', e.target.value)}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sidebar Title Font */}
            <div className="theme-token-row">
              <label className="theme-token-label">Sidebar TITLE Font</label>
              <div className="theme-token-controls">
                <select
                  className="theme-select"
                  value={customTokens['--font-sidebar-title'] || "'Roboto', sans-serif"}
                  onChange={(e) => handleToken('--font-sidebar-title', e.target.value)}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sidebar Label Font */}
            <div className="theme-token-row">
              <label className="theme-token-label">Sidebar LABEL Font</label>
              <div className="theme-token-controls">
                <select
                  className="theme-select"
                  value={customTokens['--font-sidebar-label'] || "'Roboto', sans-serif"}
                  onChange={(e) => handleToken('--font-sidebar-label', e.target.value)}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Font Size */}
            <div className="theme-token-row">
              <label className="theme-token-label">
                Base Font Size — <strong>{customTokens['--font-size-base'] || '14px'}</strong>
              </label>
              <div className="theme-token-controls theme-token-controls--slider">
                <span className="slider-label">12px</span>
                <input
                  type="range"
                  min={12} max={20} step={1}
                  value={parsePx(customTokens['--font-size-base']) || 14}
                  onChange={(e) => handleToken('--font-size-base', `${e.target.value}px`)}
                  className="theme-slider"
                />
                <span className="slider-label">20px</span>
              </div>
            </div>

            {/* Sidebar Label Font Size */}
            <div className="theme-token-row">
              <label className="theme-token-label">
                Sidebar Label Font Size — <strong>{customTokens['--sidebar-label-size'] || '14px'}</strong>
              </label>
              <div className="theme-token-controls theme-token-controls--slider">
                <span className="slider-label">12px</span>
                <input
                  type="range"
                  min={10} max={24} step={1}
                  value={parsePx(customTokens['--sidebar-label-size']) || 14}
                  onChange={(e) => handleToken('--sidebar-label-size', `${e.target.value}px`)}
                  className="theme-slider"
                />
                <span className="slider-label">24px</span>
              </div>
            </div>

            {/* Icon Size */}
            <div className="theme-token-row">
              <label className="theme-token-label">
                Icon Size — <strong>{customTokens['--icon-size'] || '24px'}</strong>
              </label>
              <div className="theme-token-controls theme-token-controls--slider">
                <span className="slider-label">16px</span>
                <input
                  type="range"
                  min={16} max={32} step={2}
                  value={parsePx(customTokens['--icon-size']) || 24}
                  onChange={(e) => handleToken('--icon-size', `${e.target.value}px`)}
                  className="theme-slider"
                />
                <span className="slider-label">32px</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Layout Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'layout' && (
        <section className="theme-section">
          <div className="theme-token-grid">
            {/* Card Min Width */}
            <div className="theme-token-row">
              <label className="theme-token-label">
                Video Card Min Width — <strong>{customTokens['--card-min-width'] || '300px'}</strong>
              </label>
              <div className="theme-token-controls theme-token-controls--slider">
                <span className="slider-label">180px</span>
                <input
                  type="range"
                  min={180} max={500} step={10}
                  value={parsePx(customTokens['--card-min-width']) || 300}
                  onChange={(e) => handleToken('--card-min-width', `${e.target.value}px`)}
                  className="theme-slider"
                />
                <span className="slider-label">500px</span>
              </div>
            </div>

            {/* Sidebar Width */}
            <div className="theme-token-row">
              <label className="theme-token-label">
                Sidebar Width (open) — <strong>{customTokens['--sidebar-open-width'] || '240px'}</strong>
              </label>
              <div className="theme-token-controls theme-token-controls--slider">
                <span className="slider-label">180px</span>
                <input
                  type="range"
                  min={180} max={360} step={10}
                  value={parsePx(customTokens['--sidebar-open-width']) || 240}
                  onChange={(e) => handleToken('--sidebar-open-width', `${e.target.value}px`)}
                  className="theme-slider"
                />
                <span className="slider-label">360px</span>
              </div>
            </div>

            {/* Card Border Radius */}
            <div className="theme-token-row">
              <label className="theme-token-label">
                Card Border Radius — <strong>{customTokens['--radius-card'] || '12px'}</strong>
              </label>
              <div className="theme-token-controls theme-token-controls--slider">
                <span className="slider-label">0px</span>
                <input
                  type="range"
                  min={0} max={24} step={2}
                  value={parsePx(customTokens['--radius-card']) || 12}
                  onChange={(e) => handleToken('--radius-card', `${e.target.value}px`)}
                  className="theme-slider"
                />
                <span className="slider-label">24px</span>
              </div>
            </div>

            {/* Button Border Radius */}
            <div className="theme-token-row">
              <label className="theme-token-label">
                Button Border Radius — <strong>{customTokens['--radius-btn'] || '8px'}</strong>
              </label>
              <div className="theme-token-controls theme-token-controls--slider">
                <span className="slider-label">0px</span>
                <input
                  type="range"
                  min={0} max={999} step={2}
                  value={parsePx(customTokens['--radius-btn']) || 8}
                  onChange={(e) => handleToken('--radius-btn', `${e.target.value}px`)}
                  className="theme-slider"
                />
                <span className="slider-label">pill</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <section className="theme-section theme-actions">
        <button className="theme-action-btn theme-action-btn--reset" onClick={() => { dispatch(resetToDark()); flashSaved() }}>
          <RotateCcw /> Reset to Dark
        </button>
        <button className="theme-action-btn theme-action-btn--reset" onClick={() => { dispatch(resetToLight()); flashSaved() }}>
          <RotateCcw /> Reset to Light
        </button>
        <button className="theme-action-btn theme-action-btn--export" onClick={handleExport}>
          <Download /> Export Theme
        </button>
        <button className="theme-action-btn theme-action-btn--import" onClick={() => importRef.current?.click()}>
          <Upload /> Import Theme
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
        {savedFlash && (
          <span className="theme-saved-flash">
            <Check /> Applied!
          </span>
        )}
      </section>

      {/* ── Live Preview Strip ─────────────────────────────────────────────── */}
      <section className="theme-section">
        <h2 className="theme-section__title">Live Preview</h2>
        <div className="theme-preview">
          <div className="preview-card">
            <div className="preview-card__thumb" />
            <div className="preview-card__body">
              <div className="preview-card__title">Sample Video Title</div>
              <div className="preview-card__meta">Channel Name • 1.2M views</div>
            </div>
          </div>
          <div className="preview-buttons">
            <button className="preview-btn preview-btn--accent">Download</button>
            <button className="preview-btn preview-btn--trash">Move to Trash</button>
            <button className="preview-btn preview-btn--delete">Delete</button>
          </div>
          <div className="preview-sidebar">
            <div className="preview-sidebar__item preview-sidebar__item--active">Home</div>
            <div className="preview-sidebar__item">Download</div>
            <div className="preview-sidebar__item">Settings</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Theme
