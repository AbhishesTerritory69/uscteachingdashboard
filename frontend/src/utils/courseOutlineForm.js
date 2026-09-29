const lineArrayFields = [
  'learningOutcomes',
  'prerequisites',
  'recommendedReadings',
  'additionalResources',
  'teachingMethods',
]

export const createOutlineFormState = (outline = {}) => ({
  course: outline.course?._id || outline.course || '',
  title: outline.title || '',
  description: outline.description || '',
  academicYear: outline.academicYear || '',
  academicPeriod: outline.academicPeriod || '',
  status: outline.status || 'draft',
  learningOutcomes: [...(outline.learningOutcomes || [])],
  prerequisites: [...(outline.prerequisites || [])],
  assessmentMethods: (outline.assessmentMethods || []).map((item) => ({
    name: item.name || '',
    description: item.description || '',
    weight: item.weight ?? '',
  })),
  weeklyTopics: (outline.weeklyTopics || []).map((item) => ({
    week: item.week ?? '',
    title: item.title || '',
    description: item.description || '',
  })),
  recommendedReadings: [...(outline.recommendedReadings || [])],
  additionalResources: [...(outline.additionalResources || [])],
  teachingMethods: [...(outline.teachingMethods || [])],
  attendanceRequirements: outline.attendanceRequirements || '',
  gradingPolicy: outline.gradingPolicy || '',
})

export const buildOutlinePayload = (form) => {
  const payload = {
    course: form.course,
    title: form.title.trim(),
    description: form.description.trim(),
    learningOutcomes: form.learningOutcomes.map((value) => value.trim()).filter(Boolean),
    prerequisites: form.prerequisites.map((value) => value.trim()).filter(Boolean),
    assessmentMethods: form.assessmentMethods
      .filter((item) => item.name.trim() || item.description.trim() || item.weight !== '')
      .map((item) => ({
        name: item.name.trim(),
        description: item.description.trim(),
        weight: Number(item.weight),
      })),
    weeklyTopics: form.weeklyTopics
      .filter((item) => item.week !== '' || item.title.trim() || item.description.trim())
      .map((item) => ({
        week: Number(item.week),
        title: item.title.trim(),
        ...(item.description.trim() ? { description: item.description.trim() } : {}),
      })),
    recommendedReadings: form.recommendedReadings.map((value) => value.trim()).filter(Boolean),
    additionalResources: form.additionalResources.map((value) => value.trim()).filter(Boolean),
    teachingMethods: form.teachingMethods.map((value) => value.trim()).filter(Boolean),
    attendanceRequirements: form.attendanceRequirements.trim(),
    gradingPolicy: form.gradingPolicy.trim(),
    status: form.status,
  }
  if (form.academicYear.trim()) payload.academicYear = form.academicYear.trim()
  if (form.academicPeriod) payload.academicPeriod = form.academicPeriod
  return payload
}

export const validateOutlineForm = (form) => {
  if (!form.course) return 'Select a course.'
  if (!form.title.trim()) return 'Title is required.'
  if (!form.description.trim()) return 'Description is required.'
  if (form.academicYear && !/^\d{4}(?:-\d{4})?$/.test(form.academicYear.trim())) {
    return 'Academic year must be a year or year range.'
  }

  let totalWeight = 0
  for (const [index, item] of form.assessmentMethods.entries()) {
    const present = item.name.trim() || item.description.trim() || item.weight !== ''
    if (!present) continue
    const weight = Number(item.weight)
    if (!item.name.trim() || !item.description.trim() || item.weight === '' || !Number.isFinite(weight) || weight < 0 || weight > 100) {
      return `Complete assessment item ${index + 1} with a name, description, and weight from 0 to 100.`
    }
    totalWeight += weight
  }
  if (totalWeight > 100) return 'Total assessment weight must not exceed 100.'

  for (const [index, item] of form.weeklyTopics.entries()) {
    const present = item.week !== '' || item.title.trim() || item.description.trim()
    if (!present) continue
    if (!Number.isInteger(Number(item.week)) || Number(item.week) < 1 || !item.title.trim()) {
      return `Complete topic ${index + 1} with a positive whole week number and title.`
    }
  }
  for (const field of lineArrayFields) {
    if (!Array.isArray(form[field])) return 'List fields are invalid.'
  }
  return ''
}
