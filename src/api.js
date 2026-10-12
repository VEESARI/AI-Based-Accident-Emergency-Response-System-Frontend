const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export async function getAccidents() {
  const response = await fetch(`${API}/accidents`)
  if (!response.ok) throw new Error('Could not load accident reports')
  return response.json()
}

export async function createAccident(payload) {
  const response = await fetch(`${API}/accidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Could not submit report')
  return data
}

export async function updateStatus(id, status) {
  const response = await fetch(`${API}/accidents/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Could not update status')
  return data
}