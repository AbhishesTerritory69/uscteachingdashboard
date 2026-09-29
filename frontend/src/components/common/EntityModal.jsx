import { useEffect, useRef, useState } from 'react'
import Button from './Button.jsx'
import Modal from './Modal.jsx'

const toInputValue = (field, record) => {
  const raw = field.getValue ? field.getValue(record ?? {}) : record?.[field.name]
  if (raw === undefined || raw === null) {
    if (field.type === 'checkbox') return Boolean(field.defaultValue)
    if (field.type === 'json') return JSON.stringify(field.defaultValue ?? [], null, 2)
    return field.defaultValue ?? ''
  }
  if (field.type === 'select' && (typeof raw === 'string' || typeof raw === 'number')) return String(raw)
  if (field.type === 'checkbox') return Boolean(raw)
  if (field.type === 'json') return JSON.stringify(raw, null, 2)
  if (field.type === 'lines') return Array.isArray(raw) ? raw.join('\n') : String(raw)
  return String(raw)
}

export default function EntityModal({ open, title, record, fields, onClose, onSubmit, submitLabel = 'Save changes' }) {
  const [values, setValues] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const initializedFor = useRef(null)

  useEffect(() => {
    if (!open) {
      initializedFor.current = null
      return
    }
    const signature = `${record?._id ?? 'new'}:${fields.map((field) => field.name).join('|')}`
    if (initializedFor.current === signature) return
    initializedFor.current = signature
    setValues(Object.fromEntries(fields.map((field) => [field.name, toInputValue(field, record)])))
    setError('')
  }, [open, record?._id, fields])

  const changeValue = (field, value) => {
    setValues((current) => ({ ...current, [field.name]: value }))
    setError('')
  }

  if (!open) return null

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const body = {}
    try {
      for (const field of fields) {
        const value = values[field.name]
        if (field.required && (value === '' || value === undefined || value === null)) {
          throw new Error(`${field.label} is required.`)
        }
        if (value === '' && !field.required && field.type !== 'checkbox') {
          if (field.nullable) body[field.name] = null
          continue
        }
        if (field.type === 'number') {
          const number = Number(value)
          if (!Number.isFinite(number)) throw new Error(`${field.label} must be a number.`)
          body[field.name] = number
        } else if (field.type === 'checkbox') {
          body[field.name] = Boolean(value)
        } else if (field.type === 'json') {
          body[field.name] = JSON.parse(value || '[]')
        } else if (field.type === 'lines') {
          body[field.name] = value.split('\n').map((line) => line.trim()).filter(Boolean)
        } else {
          body[field.name] = value
        }
      }
      setSaving(true)
      await onSubmit(body)
    } catch (submitError) {
      setError(submitError?.message || 'Unable to save these changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={title} onClose={saving ? undefined : onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          {fields.map((field) => (
            <div className={`field${field.type === 'textarea' || field.type === 'json' || field.type === 'lines' ? ' field-wide' : ''}`} key={field.name}>
              {field.type === 'checkbox' ? (
                <label className="checkbox-field">
                  <input type="checkbox" checked={Boolean(values[field.name])} onChange={(event) => changeValue(field, event.target.checked)} />
                  <span>{field.label}</span>
                </label>
              ) : (
                <>
                  <label htmlFor={`entity-${field.name}`}>{field.label}{field.required ? ' *' : ''}</label>
                  {field.type === 'select' ? (
                    <select id={`entity-${field.name}`} value={values[field.name] ?? ''} required={field.required} onChange={(event) => changeValue(field, event.target.value)}>
                      {!field.required && <option value="">None</option>}
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' || field.type === 'json' || field.type === 'lines' ? (
                    <textarea id={`entity-${field.name}`} rows={field.type === 'json' ? 6 : 3} value={values[field.name] ?? ''} required={field.required} placeholder={field.placeholder} onChange={(event) => changeValue(field, event.target.value)} />
                  ) : (
                    <input id={`entity-${field.name}`} type={['number', 'email', 'time', 'date', 'password'].includes(field.type) ? field.type : 'text'} value={values[field.name] ?? ''} required={field.required} min={field.min} step={field.step} autoComplete={field.type === 'password' ? 'new-password' : undefined} onChange={(event) => changeValue(field, event.target.value)} />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-foot">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}