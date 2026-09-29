import { useEffect, useState } from 'react'
import Button from '../common/Button.jsx'
import Modal from '../common/Modal.jsx'
import {
  buildOutlinePayload,
  createOutlineFormState,
  validateOutlineForm,
} from '../../utils/courseOutlineForm.js'

const periods = ['Trimester 1', 'Trimester 2', 'Trimester 3']
const statuses = ['draft', 'published', 'archived']
const listFields = [
  ['learningOutcomes', 'Learning outcomes'],
  ['prerequisites', 'Prerequisites'],
  ['recommendedReadings', 'Recommended readings'],
  ['additionalResources', 'Additional resources'],
  ['teachingMethods', 'Teaching methods'],
]

export default function CourseOutlineForm({ open, outline, courses, onClose, onSubmit }) {
  const [form, setForm] = useState(() => createOutlineFormState())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(createOutlineFormState(outline || {}))
    setError('')
  }, [open, outline?._id])

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const updateItem = (field, index, name, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => itemIndex === index ? { ...item, [name]: value } : item),
    }))
  }
  const addItem = (field, item) => setForm((current) => ({ ...current, [field]: [...current[field], item] }))
  const removeItem = (field, index) => setForm((current) => ({ ...current, [field]: current[field].filter((_, itemIndex) => itemIndex !== index) }))

  const submit = async (event) => {
    event.preventDefault()
    const validationMessage = validateOutlineForm(form)
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit(buildOutlinePayload(form))
    } catch (submitError) {
      setError(submitError.message || 'Unable to save course outline.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={outline?._id ? 'Edit course outline' : 'Add course outline'} onClose={saving ? undefined : onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="outline-course">Course *</label>
            <select id="outline-course" value={form.course} required onChange={(event) => update('course', event.target.value)}>
              <option value="">Select a course</option>
              {courses.map((course) => <option key={course._id} value={course._id}>{course.code} · {course.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="outline-title">Title *</label>
            <input id="outline-title" value={form.title} required onChange={(event) => update('title', event.target.value)} />
          </div>
          <div className="field field-wide">
            <label htmlFor="outline-description">Description *</label>
            <textarea id="outline-description" rows="3" value={form.description} required onChange={(event) => update('description', event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="outline-year">Academic year</label>
            <input id="outline-year" placeholder="2026 or 2025-2026" value={form.academicYear} onChange={(event) => update('academicYear', event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="outline-period">Academic period</label>
            <select id="outline-period" value={form.academicPeriod} onChange={(event) => update('academicPeriod', event.target.value)}>
              <option value="">All periods</option>
              {periods.map((period) => <option key={period}>{period}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="outline-status">Status</label>
            <select id="outline-status" value={form.status} onChange={(event) => update('status', event.target.value)}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <section className="outline-form-section">
          <div className="section-head"><h3>Assessment methods</h3><Button variant="secondary" onClick={() => addItem('assessmentMethods', { name: '', description: '', weight: '' })}>Add Assessment</Button></div>
          {form.assessmentMethods.length === 0 && <p className="subtle">No assessment methods added.</p>}
          {form.assessmentMethods.map((item, index) => (
            <div className="outline-item-row" key={`assessment-${index}`}>
              <div className="field"><label htmlFor={`assessment-name-${index}`}>Name</label><input id={`assessment-name-${index}`} value={item.name} onChange={(event) => updateItem('assessmentMethods', index, 'name', event.target.value)} /></div>
              <div className="field"><label htmlFor={`assessment-description-${index}`}>Description</label><input id={`assessment-description-${index}`} value={item.description} onChange={(event) => updateItem('assessmentMethods', index, 'description', event.target.value)} /></div>
              <div className="field"><label htmlFor={`assessment-weight-${index}`}>Weight %</label><input id={`assessment-weight-${index}`} type="number" min="0" max="100" step="any" value={item.weight} onChange={(event) => updateItem('assessmentMethods', index, 'weight', event.target.value)} /></div>
              <Button variant="secondary" aria-label={`Remove assessment ${index + 1}`} onClick={() => removeItem('assessmentMethods', index)}>Remove</Button>
            </div>
          ))}
        </section>

        <section className="outline-form-section">
          <div className="section-head"><h3>Weekly topics</h3><Button variant="secondary" onClick={() => addItem('weeklyTopics', { week: '', title: '', description: '' })}>Add Item</Button></div>
          {form.weeklyTopics.length === 0 && <p className="subtle">No weekly items added.</p>}
          {form.weeklyTopics.map((item, index) => (
            <div className="outline-topic-row" key={`topic-${index}`}>
              <div className="field"><label htmlFor={`topic-week-${index}`}>Week</label><input id={`topic-week-${index}`} type="number" min="1" step="1" value={item.week} onChange={(event) => updateItem('weeklyTopics', index, 'week', event.target.value)} /></div>
              <div className="field"><label htmlFor={`topic-title-${index}`}>Topic title</label><input id={`topic-title-${index}`} value={item.title} onChange={(event) => updateItem('weeklyTopics', index, 'title', event.target.value)} /></div>
              <div className="field"><label htmlFor={`topic-description-${index}`}>Description</label><input id={`topic-description-${index}`} value={item.description} onChange={(event) => updateItem('weeklyTopics', index, 'description', event.target.value)} /></div>
              <Button variant="secondary" aria-label={`Remove topic ${index + 1}`} onClick={() => removeItem('weeklyTopics', index)}>Remove</Button>
            </div>
          ))}
        </section>

        {listFields.map(([field, label]) => (
          <div className="field field-wide outline-list-field" key={field}>
            <label htmlFor={`outline-${field}`}>{label} (one per line)</label>
            <textarea id={`outline-${field}`} rows="2" value={form[field].join('\n')} onChange={(event) => update(field, event.target.value.split('\n'))} />
          </div>
        ))}
        <div className="form-grid">
          <div className="field field-wide"><label htmlFor="outline-attendance">Attendance requirements</label><textarea id="outline-attendance" rows="2" value={form.attendanceRequirements} onChange={(event) => update('attendanceRequirements', event.target.value)} /></div>
          <div className="field field-wide"><label htmlFor="outline-grading">Grading policy</label><textarea id="outline-grading" rows="2" value={form.gradingPolicy} onChange={(event) => update('gradingPolicy', event.target.value)} /></div>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-foot">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : outline?._id ? 'Update outline' : 'Create outline'}</Button>
        </div>
      </form>
    </Modal>
  )
}
