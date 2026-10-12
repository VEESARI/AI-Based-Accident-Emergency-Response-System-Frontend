import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Ambulance, ArrowUpRight, CheckCircle2, Clock3, MapPin, Plus, RefreshCw, ShieldCheck, Siren, X } from 'lucide-react'
import { createAccident, getAccidents, updateStatus } from './api'

const emptyForm = {
  reporterName: '', location: '', latitude: '', longitude: '', accidentType: 'Vehicle collision',
  peopleAffected: '1', injuries: 'Unknown', emergencyRequired: 'Ambulance', description: ''
}

const demoCases = [
  { id: 1003, reporterName: 'Demo Reporter', location: 'Madhapur, Hyderabad', accidentType: 'Vehicle collision', peopleAffected: 2, injuries: 'Injury reported', emergencyRequired: 'Ambulance', severity: 'HIGH', status: 'UNDER_REVIEW', description: 'Demo record — not a real emergency.', createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: 1002, reporterName: 'Demo Reporter', location: 'Kukatpally, Hyderabad', accidentType: 'Pedestrian accident', peopleAffected: 1, injuries: 'Minor injury reported', emergencyRequired: 'First aid', severity: 'MEDIUM', status: 'ASSISTANCE_ASSIGNED', description: 'Demo record — not a real emergency.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 1001, reporterName: 'Demo Reporter', location: 'LB Nagar, Hyderabad', accidentType: 'Two-wheeler accident', peopleAffected: 1, injuries: 'No injury reported', emergencyRequired: 'Police', severity: 'LOW', status: 'RESOLVED', description: 'Demo record — not a real emergency.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() }
]

const statusLabels = {
  REPORTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ASSISTANCE_ASSIGNED: 'Assistance assigned',
  RESOLVED: 'Resolved'
}

function prettyDate(value) {
  if (!value) return 'Just now'
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export default function App() {
  const [cases, setCases] = useState(demoCases)
  const [apiMode, setApiMode] = useState('demo')
  const [activeTab, setActiveTab] = useState('overview')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')

  async function refresh() {
    try {
      const data = await getAccidents()
      setCases(data)
      setApiMode('connected')
      setNotice('')
    } catch {
      setApiMode('demo')
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => cases.filter(c =>
    `${c.location} ${c.accidentType} ${c.status} ${c.id}`.toLowerCase().includes(search.toLowerCase())
  ), [cases, search])

  const activeCount = cases.filter(c => c.status !== 'RESOLVED').length
  const highCount = cases.filter(c => c.severity === 'HIGH' && c.status !== 'RESOLVED').length
  const resolvedCount = cases.filter(c => c.status === 'RESOLVED').length

  function setField(event) {
    setForm(prev => ({ ...prev, [event.target.name]: event.target.value }))
  }

  async function submitReport(event) {
    event.preventDefault()
    if (!form.reporterName.trim() || !form.location.trim()) {
      setNotice('Please enter the reporter name and accident location.')
      return
    }
    setBusy(true)
    setNotice('')
    const payload = {
      reporterName: form.reporterName.trim(),
      location: form.location.trim(),
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
      accidentType: form.accidentType,
      peopleAffected: Number(form.peopleAffected),
      injuries: form.injuries,
      emergencyRequired: form.emergencyRequired,
      description: form.description.trim()
    }
    try {
      const created = await createAccident(payload)
      setCases(prev => [created, ...prev])
      setApiMode('connected')
      setNotice(`Report submitted successfully. Incident ID: ${created.id}`)
    } catch (error) {
      if (apiMode === 'connected') {
        setNotice(error.message)
        setBusy(false)
        return
      }
      const demo = {
        ...payload, id: Math.max(1000, ...cases.map(c => Number(c.id) || 1000)) + 1,
        severity: estimateSeverity(payload), status: 'REPORTED', createdAt: new Date().toISOString()
      }
      setCases(prev => [demo, ...prev])
      setNotice(`Demo report created (ID: ${demo.id}). Start the Spring Boot backend to save reports permanently.`)
    }
    setBusy(false)
    setShowForm(false)
    setForm(emptyForm)
    setActiveTab('cases')
  }

  async function changeStatus(item, status) {
    try {
      if (apiMode === 'connected') {
        const updated = await updateStatus(item.id, status)
        setCases(prev => prev.map(c => c.id === item.id ? updated : c))
      } else {
        setCases(prev => prev.map(c => c.id === item.id ? { ...c, status } : c))
      }
      setNotice(`Incident ${item.id} updated to ${statusLabels[status]}.`)
    } catch (error) {
      setNotice(error.message)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon"><Siren size={22}/></div><div><strong>SafeRoute <span>AI</span></strong><small>EMERGENCY RESPONSE</small></div></div>
        <div className="side-label">WORKSPACE</div>
        <button className={`nav-item ${activeTab === 'overview' ? 'selected' : ''}`} onClick={() => setActiveTab('overview')}><Activity size={18}/> Overview</button>
        <button className={`nav-item ${activeTab === 'cases' ? 'selected' : ''}`} onClick={() => setActiveTab('cases')}><AlertTriangle size={18}/> Accident cases <span className="nav-count">{cases.length}</span></button>
        <button className={`nav-item ${activeTab === 'hospitals' ? 'selected' : ''}`} onClick={() => setActiveTab('hospitals')}><Ambulance size={18}/> Hospital locator</button>
        <div className="sidebar-bottom">
          <div className="safety-card"><ShieldCheck size={20}/><strong>Response support</strong><p>This prototype helps organize reports. It does not contact emergency services.</p></div>
          <div className="profile"><div className="avatar">VT</div><div><strong>Veesari Tidiksha</strong><small>CSE (Data Science)</small></div></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><div className="eyebrow">ACCIDENT & EMERGENCY MANAGEMENT</div><h1>{activeTab === 'overview' ? 'Emergency overview' : activeTab === 'cases' ? 'Accident cases' : 'Hospital locator'}</h1></div>
          <div className="top-actions"><span className={`connection ${apiMode}`}><i/> {apiMode === 'connected' ? 'Backend connected' : 'Demo mode'}</span><button className="icon-button" title="Refresh cases" onClick={refresh}><RefreshCw size={17}/></button><button className="primary-button" onClick={() => { setShowForm(true); setNotice('') }}><Plus size={17}/> Report accident</button></div>
        </header>

        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}

        {activeTab === 'overview' && <>
          <section className="welcome-panel"><div><span className="welcome-tag"><Activity size={14}/> LIVE RESPONSE WORKSPACE</span><h2>Every second matters.<br/><span>Keep every report in view.</span></h2><p>Centralize incident reports, review preliminary severity estimates and track response progress.</p><button className="light-button" onClick={() => setActiveTab('cases')}>View all cases <ArrowUpRight size={16}/></button></div><div className="welcome-graphic"><div className="radar radar-one"/><div className="radar radar-two"/><div className="radar radar-three"/><div className="radar-pin"><Siren size={31}/></div><div className="radar-label label-one"><span/> Incident monitoring</div><div className="radar-label label-two"><span/> Response coordination</div></div></section>
          <section className="stats-grid">
            <Stat icon={<AlertTriangle/>} label="Total reports" value={cases.length} note="All recorded incidents" tone="blue"/>
            <Stat icon={<Clock3/>} label="Active cases" value={activeCount} note="Not yet resolved" tone="orange"/>
            <Stat icon={<Siren/>} label="High priority" value={highCount} note="Needs careful review" tone="red"/>
            <Stat icon={<CheckCircle2/>} label="Resolved cases" value={resolvedCount} note="Marked as resolved" tone="green"/>
          </section>
          <section className="content-grid">
            <div className="panel case-panel"><div className="panel-heading"><div><h3>Recent accident reports</h3><p>Latest incidents submitted to the platform</p></div><button className="text-button" onClick={() => setActiveTab('cases')}>View all <ArrowUpRight size={15}/></button></div><CaseTable cases={filtered.slice(0, 4)} onStatus={changeStatus}/></div>
            <div className="panel"><div className="panel-heading"><div><h3>Response workflow</h3><p>Typical case lifecycle</p></div></div><div className="workflow">
              <WorkflowStep number="01" title="Report submitted" text="Incident details are recorded." done/>
              <WorkflowStep number="02" title="Review incident" text="Authorized staff check the report." done={cases.some(c => c.status !== 'REPORTED')}/>
              <WorkflowStep number="03" title="Assign assistance" text="Record assignment when confirmed." done={cases.some(c => c.status === 'ASSISTANCE_ASSIGNED' || c.status === 'RESOLVED')}/>
              <WorkflowStep number="04" title="Resolve & document" text="Close the case and preserve history." done={resolvedCount > 0}/>
            </div></div>
          </section>
          <div className="disclaimer"><ShieldCheck size={17}/><span><strong>Safety note:</strong> Severity labels are preliminary software estimates, not medical diagnoses. For a real emergency, contact local emergency services directly.</span></div>
        </>}

        {activeTab === 'cases' && <section className="panel full-panel"><div className="panel-heading"><div><h3>All accident reports</h3><p>Search reports and update their demonstration workflow status.</p></div><div className="search-wrap"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search location, type or ID…"/></div></div><CaseTable cases={filtered} onStatus={changeStatus}/></section>}

        {activeTab === 'hospitals' && <section className="panel full-panel"><div className="panel-heading"><div><h3>Hospital locator</h3><p>Example entries for interface demonstration only — verify real details before use.</p></div></div><div className="hospital-grid">
          <Hospital name="Demo City General Hospital" area="Central Hyderabad" distance="Example location" services="Emergency • Trauma care" phone="Demo contact not configured"/>
          <Hospital name="Demo Metro Medical Centre" area="West Hyderabad" distance="Example location" services="Emergency • Imaging" phone="Demo contact not configured"/>
          <Hospital name="Demo Community Hospital" area="South Hyderabad" distance="Example location" services="First aid • General care" phone="Demo contact not configured"/>
        </div><div className="map-placeholder"><MapPin size={26}/><strong>Map integration not configured</strong><p>Add a mapping provider and verified hospital coordinates to enable distance-based results.</p></div></section>}

        <footer>SAFEROUTE AI <span>•</span> Academic prototype by Veesari Tidiksha <span>•</span> CSE (Data Science)</footer>
      </main>

      {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false) }}><div className="modal"><div className="modal-header"><div><span className="eyebrow">NEW INCIDENT</span><h2>Report an accident</h2><p>Enter the information available to you.</p></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={19}/></button></div>
        <form onSubmit={submitReport}><div className="form-grid">
          <label>Reporter name *<input name="reporterName" value={form.reporterName} onChange={setField} required placeholder="Your name"/></label>
          <label>Accident location *<input name="location" value={form.location} onChange={setField} required placeholder="Street, area or landmark"/></label>
          <label>Accident type<select name="accidentType" value={form.accidentType} onChange={setField}><option>Vehicle collision</option><option>Two-wheeler accident</option><option>Pedestrian accident</option><option>Road obstruction</option><option>Other</option></select></label>
          <label>People affected<input type="number" name="peopleAffected" min="1" max="1000" value={form.peopleAffected} onChange={setField} required/></label>
          <label>Injuries reported<select name="injuries" value={form.injuries} onChange={setField}><option>Unknown</option><option>No injury reported</option><option>Minor injury reported</option><option>Serious injury reported</option></select></label>
          <label>Help required<select name="emergencyRequired" value={form.emergencyRequired} onChange={setField}><option>Ambulance</option><option>Police</option><option>Fire service</option><option>First aid</option><option>Multiple services</option><option>Unknown</option></select></label>
          <label>Latitude (optional)<input name="latitude" type="number" step="any" value={form.latitude} onChange={setField} placeholder="e.g. 17.3850"/></label>
          <label>Longitude (optional)<input name="longitude" type="number" step="any" value={form.longitude} onChange={setField} placeholder="e.g. 78.4867"/></label>
          <label className="span-two">Additional details<textarea name="description" rows="3" value={form.description} onChange={setField} placeholder="Briefly describe what happened"/></label>
        </div><div className="form-foot"><span>* Required fields</span><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Submitting…' : 'Submit report'} <ArrowUpRight size={16}/></button></div><p className="form-note">Prototype only: this form does not alert ambulances, police or hospitals.</p></form>
      </div></div>}
    </div>
  )
}

function estimateSeverity(payload) {
  if (/serious/i.test(payload.injuries) || payload.peopleAffected >= 4 || payload.emergencyRequired === 'Multiple services') return 'HIGH'
  if (/minor/i.test(payload.injuries) || payload.peopleAffected >= 2) return 'MEDIUM'
  return 'LOW'
}

function Stat({ icon, label, value, note, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}
function CaseTable({ cases, onStatus }) {
  if (!cases.length) return <div className="empty-state"><AlertTriangle size={25}/><strong>No reports found</strong><span>Submit a report or change your search.</span></div>
  return <div className="table-scroll"><table><thead><tr><th>INCIDENT</th><th>LOCATION</th><th>PRIORITY</th><th>STATUS</th><th>REPORTED</th><th>UPDATE</th></tr></thead><tbody>{cases.map(c => <tr key={c.id}><td><strong className="incident-id">#{c.id}</strong><small>{c.accidentType}</small></td><td><span className="location-cell"><MapPin size={14}/>{c.location}</span><small>{c.peopleAffected} affected</small></td><td><span className={`severity ${String(c.severity).toLowerCase()}`}>{c.severity || 'PENDING'}</span></td><td><span className={`status ${String(c.status).toLowerCase()}`}>{statusLabels[c.status] || c.status}</span></td><td className="date-cell">{prettyDate(c.createdAt)}</td><td><select className="status-select" aria-label={`Update status for incident ${c.id}`} value={c.status} onChange={e => onStatus(c, e.target.value)}><option value="REPORTED">Submitted</option><option value="UNDER_REVIEW">Under review</option><option value="ASSISTANCE_ASSIGNED">Assistance assigned</option><option value="RESOLVED">Resolved</option></select></td></tr>)}</tbody></table></div>
}
function WorkflowStep({ number, title, text, done }) {
  return <div className="workflow-step"><div className={`step-number ${done ? 'done' : ''}`}>{done ? <CheckCircle2 size={17}/> : number}</div><div><strong>{title}</strong><p>{text}</p></div></div>
}
function Hospital({ name, area, distance, services, phone }) {
  return <div className="hospital-card"><div className="hospital-icon"><Ambulance size={22}/></div><div><h4>{name}</h4><p><MapPin size={14}/> {area}</p><span className="hospital-service">{services}</span><small>{distance} · {phone}</small></div></div>
}