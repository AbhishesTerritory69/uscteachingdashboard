const fs = require("fs/promises");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const Department = require("../models/Department");
const Program = require("../models/Program");
const Faculty = require("../models/Faculty");
const Course = require("../models/Course");
const CourseOutline = require("../models/CourseOutline");
const { importSchemas, normalizeHeader, getHeaderMap } = require("./importSchemas");

const MAX_ROWS = Math.min(
  Math.max(Number.parseInt(process.env.MAX_IMPORT_ROWS, 10) || 5000, 1),
  20000,
);
const MAX_CELL_LENGTH = 10000;
const PREVIEW_LIMIT = 100;
const ERROR_LIMIT = 5000;
const sanitizeFilename = (value) => {
  const base = require("path").win32.basename(String(value || "upload.csv"));
  const safe = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "")
    .trim()
    .slice(0, 200);
  return safe.toLowerCase().endsWith(".csv") ? safe : "upload.csv";
};

const errorRecord = (row, field, value, message) => ({
  row,
  field: String(field || "file").slice(0, 100),
  value: value === undefined || value === null ? "" : String(value).slice(0, 200),
  message: String(message).slice(0, 500),
});

const parseCsvFile = async (uploadedFile) => {
  let buffer;
  if (Buffer.isBuffer(uploadedFile)) {
    buffer = uploadedFile;
  } else if (Buffer.isBuffer(uploadedFile?.buffer)) {
    buffer = uploadedFile.buffer;
    if (process.env.NODE_ENV !== "production") {
      console.info("[csv-import] Reading uploaded file", {
        storage: "memory",
        exists: true,
        size: buffer.length,
      });
    }
  } else {
    const filePath = typeof uploadedFile === "string" ? uploadedFile : uploadedFile?.path;
    if (typeof filePath !== "string" || !filePath.trim()) {
      throw new Error("CSV file upload has no readable path or buffer.");
    }
    const resolvedPath = path.resolve(filePath);
    let exists = false;
    try {
      const stats = await fs.stat(resolvedPath);
      exists = stats.isFile();
      if (process.env.NODE_ENV !== "production") {
        console.info("[csv-import] Reading uploaded file", {
          storage: "disk",
          path: resolvedPath,
          exists,
          size: stats.size,
        });
      }
      if (!stats.isFile()) throw Object.assign(new Error("Uploaded path is not a file."), { code: "EISDIR" });
      buffer = await fs.readFile(resolvedPath);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[csv-import] Uploaded file read failed", {
          path: resolvedPath,
          exists,
          code: error.code,
          message: error.message,
        });
      }
      if (error.code === "ENOENT") throw new Error("CSV file was not found at the uploaded path.");
      if (error.code === "EACCES") throw new Error("CSV file cannot be accessed at the uploaded path.");
      if (error.code === "EISDIR") throw new Error("CSV upload path does not point to a file.");
      throw new Error("CSV file could not be read.");
    }
  }

  if (process.env.NODE_ENV !== "production" && Buffer.isBuffer(uploadedFile)) {
    console.info("[csv-import] Reading uploaded file", {
      storage: "buffer",
      exists: true,
      size: buffer.length,
    });
  }
  if (buffer.includes(0)) throw new Error("CSV file contains null bytes.");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("CSV file must use valid UTF-8 encoding.");
  }
  const records = parse(text, {
    bom: true,
    info: true,
    skip_empty_lines: true,
    relax_column_count: false,
    max_record_size: 65536,
    trim: false,
  });
  if (!records.length) throw new Error("CSV file is empty or missing headers.");

  const headerRecord = records[0].record;
  if (!Array.isArray(headerRecord) || !headerRecord.length) {
    throw new Error("CSV header row is invalid.");
  }
  const headers = headerRecord.map((item) => String(item ?? "").trim());
  if (headers.some((header) => !header)) throw new Error("CSV headers cannot be empty.");

  return {
    headers,
    records: records.slice(1).map((item) => ({
      row: item.info.lines,
      values: item.record,
    })),
  };
};

const normalizeTeachingActivityCsv = (csv) => {
  const aliases = getHeaderMap("teachingActivity");
  const normalizedHeaders = csv.headers.map(normalizeHeader);
  const indexesFor = (target) => normalizedHeaders
    .map((header, index) => aliases.get(header) === target ? index : -1)
    .filter((index) => index >= 0);
  const identifierIndex = normalizedHeaders.findIndex((header) =>
    ["trimesteryearidentifier", "trimesteryear", "trimesterandyear"].includes(header),
  );
  const headers = [...csv.headers];
  const yearIndexes = indexesFor("academicYear");
  const periodIndexes = indexesFor("academicPeriod");
  const dayIndexes = indexesFor("day");
  const durationIndexes = indexesFor("duration");
  const occurrenceIndexes = indexesFor("occurrences");
  let yearIndex = yearIndexes[0] ?? -1;
  let periodIndex = periodIndexes[0] ?? -1;
  let dayIndex = dayIndexes[0] ?? -1;
  let durationIndex = durationIndexes[0] ?? -1;
  let occurrenceIndex = occurrenceIndexes[0] ?? -1;
  const weekdayColumns = new Map([
    ["mon", "Monday"], ["monday", "Monday"],
    ["tue", "Tuesday"], ["tues", "Tuesday"], ["tuesday", "Tuesday"],
    ["wed", "Wednesday"], ["wednesday", "Wednesday"],
    ["thu", "Thursday"], ["thur", "Thursday"], ["thurs", "Thursday"], ["thursday", "Thursday"],
    ["fri", "Friday"], ["friday", "Friday"],
    ["sat", "Saturday"], ["saturday", "Saturday"],
  ]);
  const weekdayIndexes = normalizedHeaders
    .map((header, index) => weekdayColumns.has(header) ? [index, weekdayColumns.get(header)] : null)
    .filter(Boolean);
  const repeatedHeaderLabels = new Set([
    "classid", "term", "subjectcatalog", "descr", "section", "component", "starttime",
  ]);
  const staffNameIndex = normalizedHeaders.findIndex((header) =>
    ["teachingstaff1", "teachingstaff1name"].includes(header),
  );
  const hasFacultyColumn = indexesFor("faculty").length > 0;
  let facultyIndex = indexesFor("faculty")[0] ?? -1;

  if (identifierIndex >= 0 && yearIndex < 0) yearIndex = headers.push("academicYear") - 1;
  if (identifierIndex >= 0 && periodIndex < 0) periodIndex = headers.push("academicPeriod") - 1;
  if (weekdayIndexes.length && dayIndex < 0) dayIndex = headers.push("day") - 1;
  if (durationIndex < 0) durationIndex = headers.push("duration") - 1;
  if (occurrenceIndex < 0) occurrenceIndex = headers.push("occurrences") - 1;
  if (!hasFacultyColumn && staffNameIndex >= 0) {
    facultyIndex = headers.push("faculty") - 1;
  }

  const records = [];
  for (const record of csv.records) {
    const repeatedHeaderCells = record.values.map((value) => normalizeHeader(String(value ?? "")));
    const repeatedHeaderMatches = repeatedHeaderCells.filter((value) => repeatedHeaderLabels.has(value));
    if (
      repeatedHeaderMatches.length >= 5 &&
      repeatedHeaderCells.includes("classid") &&
      repeatedHeaderCells.includes("subjectcatalog") &&
      repeatedHeaderCells.includes("descr")
    ) continue;

    const values = [...record.values];
    if (identifierIndex >= 0) {
      const identifier = String(values[identifierIndex] ?? "");
      const year = identifier.match(/\b(?:19|20)\d{2}(?:\s*[-/]\s*(?:(?:19|20)?\d{2}))?\b/);
      const trimester = identifier.match(/\b(?:trimester|trim|t)\s*([1-3])\b/i);
      if (yearIndexes.length === 0) values[yearIndex] = year?.[0]?.replace(/\s+/g, "").replace("/", "-") || "";
      if (periodIndexes.length === 0) values[periodIndex] = trimester ? `Trimester ${trimester[1]}` : "";
    }
    if (durationIndexes.length === 0) values[durationIndex] = "";
    if (occurrenceIndexes.length === 0) values[occurrenceIndex] = "1";
    if (!hasFacultyColumn && facultyIndex >= 0) {
      values[facultyIndex] = String(values[staffNameIndex] ?? "").trim();
    }

    const activeDays = weekdayIndexes
      .filter(([index]) => /^y$/i.test(String(values[index] ?? "").trim()))
      .map(([, day]) => day);
    if (weekdayIndexes.length) {
      values[dayIndex] = activeDays.length === 1 ? activeDays[0] : "";
    }
    records.push({ ...record, values, selectedDays: activeDays });
  }
  return { headers, records };
};

const makeHeaderMapping = (type, headers) => {
  const aliases = getHeaderMap(type);
  const mapping = [];
  const seen = new Set();
  const errors = [];
  const warnings = [];
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = aliases.get(normalized);
    if (!field) {
      warnings.push({
        row: 1,
        field: String(header).slice(0, 100),
        message: `Unmapped ${type} CSV header was ignored.`,
      });
      return;
    }
    if (seen.has(field)) {
      if (type === "teachingActivity") {
        warnings.push({
          row: 1,
          field: String(header).slice(0, 100),
          message: `Additional timetable column for '${field}' was ignored.`,
        });
      } else {
        errors.push(errorRecord(1, header, header, `CSV header maps to duplicate field '${field}'.`));
      }
      return;
    }
    seen.add(field);
    mapping.push({ index, field });
  });
  for (const required of importSchemas[type].required) {
    if (!seen.has(required)) {
      errors.push(errorRecord(1, required, "", `Required CSV header '${required}' is missing.`));
    }
  }
  return { mapping, errors, warnings };
};

const parseCell = (value, definition, row, name, errors) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    errors.push(errorRecord(row, name, value, "CSV cell must be text."));
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.includes("\u0000")) {
    errors.push(errorRecord(row, name, "", "Null bytes are not allowed."));
    return undefined;
  }
  if (trimmed.length > MAX_CELL_LENGTH) {
    errors.push(errorRecord(row, name, trimmed, `Value exceeds ${MAX_CELL_LENGTH} characters.`));
    return undefined;
  }
  if (!trimmed) return undefined;

  if (definition.kind === "number" || definition.kind === "integer") {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) {
      errors.push(errorRecord(row, name, trimmed, `Value must be a valid ${definition.kind}.`));
      return undefined;
    }
    const number = Number(trimmed);
    if (!Number.isFinite(number) || (definition.kind === "integer" && !Number.isInteger(number))) {
      errors.push(errorRecord(row, name, trimmed, `Value must be a valid ${definition.kind}.`));
      return undefined;
    }
    return number;
  }
  if (definition.kind === "boolean") {
    const normalized = trimmed.toLowerCase();
    if (["true", "1"].includes(normalized)) return true;
    if (["false", "0"].includes(normalized)) return false;
    errors.push(errorRecord(row, name, trimmed, "Value must be true, false, 1, or 0."));
    return undefined;
  }
  if (definition.kind === "jsonArray") {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) throw new Error("must be a JSON array");
      return parsed;
    } catch {
      const values = trimmed.split(/[;|\r\n]+/).map((item) => item.trim()).filter(Boolean);
      return values.length ? values : undefined;
    }
  }
  return trimmed;
};

const parseRow = (record, mapping, schema, type) => {
  const errors = [];
  const rowData = {};
  for (const { index, field } of mapping) {
    const value = parseCell(record.values[index], schema.fields[field], record.row, field, errors);
    if (value !== undefined) rowData[field] = value;
  }
  if (type === "teachingActivity") normalizeTeachingActivityData(rowData);
  for (const required of schema.required) {
    if (type === "teachingActivity" && required === "day" && record.selectedDays?.length > 1) continue;
    if (rowData[required] === undefined || rowData[required] === "") {
      const messages = {
        faculty: "Faculty reference could not be resolved from the timetable row.",
        startTime: "Missing start time.",
        endTime: "Missing end time.",
        day: "No timetable weekday is marked Y.",
      };
      const message = type === "teachingActivity" && messages[required]
        ? messages[required]
        : `Required field '${required}' is missing.`;
      errors.push(errorRecord(record.row, required, "", message));
    }
  }
  return { rowData, errors };
};

const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const findReference = async (Model, value, key, label) => {
  if (mongoose.isObjectIdOrHexString(value)) {
    const found = await Model.findById(value).select("_id").lean();
    return found ? { id: found._id } : { error: `${label} not found.` };
  }
  if (key === "_id") return { error: `${label} requires a valid ID.` };
  const normalizedValue = key === "code"
    ? String(value).toUpperCase()
    : ["slug", "email"].includes(key)
      ? String(value).toLowerCase()
      : value;
  const matches = await Model.find({ [key]: normalizedValue }).select("_id").limit(2).lean();
  if (!matches.length) return { error: `${label} not found by ${key}.` };
  if (matches.length > 1) return { error: `${label} reference is ambiguous; use its ID.` };
  return { id: matches[0]._id };
};

const resolveReferences = async (type, data, row, errors) => {
  const refRules = {
    department: [
      ["headOfDepartment", Faculty, "_id", "Faculty member"],
    ],
    program: [["department", Department, "slug", "Department"]],
    faculty: [["department", Department, "slug", "Department"]],
    course: [
      ["department", Department, "slug", "Department"],
      ["program", Program, "slug", "Program"],
    ],
    teachingActivity: [
      ["course", Course, "code", "Course"],
      ["faculty", Faculty, "name", "Faculty member"],
    ],
    courseOutline: [["course", Course, "code", "Course"]],
  };
  for (const [field, Model, key, label] of refRules[type]) {
    const value = data[field];
    if (value === undefined) continue;
    if (type === "teachingActivity" && field === "course") {
      const code = String(value ?? "").trim().toUpperCase();
      const matches = code
        ? await Course.find({ code }).select("_id").limit(2).lean()
        : [];
      if (matches.length === 1) data.course = matches[0]._id;
      else errors.push(errorRecord(row, "course", code, code ? `Course '${code}' not found.` : "Course Code is missing."));
      continue;
    }
    if (type === "teachingActivity" && field === "faculty") {
      const name = String(value ?? "").trim();
      const matches = name
        ? await Faculty.find({ name }).select("_id").limit(2).lean()
        : [];
      if (matches.length === 1) data.faculty = matches[0]._id;
      else errors.push(errorRecord(row, "faculty", name, "Faculty reference could not be resolved from the timetable row."));
      continue;
    }
    let reference = await findReference(Model, value, key, label);
    if (reference.error && key !== "_id" && !(type === "teachingActivity" && field === "course")) {
      reference = await findReference(Model, value, "name", label);
    } else if (reference.error && type === "department" && field === "headOfDepartment") {
      reference = await findReference(Model, value, "name", label);
    }
    if (reference.error) {
      const message = type === "teachingActivity" && field === "faculty"
        ? "Faculty reference could not be resolved"
        : reference.error;
      errors.push(errorRecord(row, field, value, message));
    } else {
      data[field] = reference.id;
    }
  }
};

const normalizeReferenceField = (type, data) => {
  if (type === "department" && data.name && !data.slug) data.slug = slugify(data.name);
  if (type === "program" && data.name && !data.slug) data.slug = slugify(data.name);
  if (type === "course" && data.code) data.code = data.code.toUpperCase();
  if (type === "faculty" && data.email) data.email = data.email.toLowerCase();
};

const normalizeTeachingActivityData = (data) => {
  if (data.academicPeriod) {
    const trimester = String(data.academicPeriod).match(/^(?:trimester|trim|t)?\s*([1-3])(?:\.0+)?$/i);
    if (trimester) data.academicPeriod = `Trimester ${trimester[1]}`;
  }
  if (data.activityType) {
    const sourceValue = String(data.activityType).trim();
    const supportedTypes = importSchemas.teachingActivity.Model.schema.path("activityType").enumValues;
    data.activityType = supportedTypes.find((value) => value.toLowerCase() === sourceValue.toLowerCase()) || sourceValue;
  }
  if (data.day) {
    const day = String(data.day).trim().toLowerCase();
    const weekdays = { mon: "Monday", tue: "Tuesday", tues: "Tuesday", wed: "Wednesday", thu: "Thursday", thur: "Thursday", thurs: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
    data.day = weekdays[day] || day.charAt(0).toUpperCase() + day.slice(1);
  }
  for (const field of ["startTime", "endTime"]) {
    if (!data[field]) continue;
    const value = String(data[field]).trim();
    const twelveHourTime = value.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (twelveHourTime) {
      let hour = Number(twelveHourTime[1]) % 12;
      if (twelveHourTime[3].toLowerCase() === "pm") hour += 12;
      data[field] = `${String(hour).padStart(2, "0")}:${twelveHourTime[2]}`;
    } else {
      data[field] = value;
    }
  }
  if (data.duration === undefined && data.startTime && data.endTime) {
    const start = data.startTime.match(/^(\d{2}):(\d{2})$/);
    const end = data.endTime.match(/^(\d{2}):(\d{2})$/);
    if (start && end) {
      const startMinutes = Number(start[1]) * 60 + Number(start[2]);
      const endMinutes = Number(end[1]) * 60 + Number(end[2]);
      if (endMinutes > startMinutes) data.duration = (endMinutes - startMinutes) / 60;
    }
  }
  if (data.course !== undefined) data.course = String(data.course).trim().toUpperCase();
  return data;
};

const uniqueKeyFor = (type, data) => {
  if (type === "department" || type === "program") return `${type}:${data.slug}`;
  if (type === "course") return `course:${data.code}`;
  if (type === "courseOutline") {
    return `courseOutline:${data.course}:${data.academicYear ?? "<missing>"}:${data.academicPeriod ?? "<missing>"}`;
  }
  return null;
};

const databaseDuplicate = async (type, data) => {
  if (type === "department" || type === "program") {
    const Model = importSchemas[type].Model;
    return Model.exists({ slug: data.slug });
  }
  if (type === "course") return Course.exists({ code: data.code });
  if (type === "courseOutline") {
    const filter = { course: data.course };
    for (const field of ["academicYear", "academicPeriod"]) {
      filter[field] = data[field] === undefined ? { $exists: false } : data[field];
    }
    return CourseOutline.exists(filter);
  }
  return null;
};

const validateCourseOutlineArrays = (data, row, errors) => {
  for (const field of [
    "learningOutcomes",
    "prerequisites",
    "recommendedReadings",
    "additionalResources",
    "teachingMethods",
  ]) {
    if (data[field] !== undefined &&
      (!Array.isArray(data[field]) || data[field].some((item) => typeof item !== "string" || !item.trim()))) {
      errors.push(errorRecord(row, field, "", `${field} must be a JSON array of non-empty strings.`));
    }
  }

  if (data.assessmentMethods !== undefined) {
    if (!Array.isArray(data.assessmentMethods)) {
      errors.push(errorRecord(row, "assessmentMethods", "", "assessmentMethods must be a JSON array."));
    } else {
      let totalWeight = 0;
      data.assessmentMethods.forEach((item, index) => {
        const valid = item && typeof item === "object" && !Array.isArray(item) &&
          Object.keys(item).every((key) => ["name", "description", "weight"].includes(key)) &&
          typeof item.name === "string" && item.name.trim() &&
          typeof item.description === "string" && item.description.trim() &&
          typeof item.weight === "number" && Number.isFinite(item.weight) &&
          item.weight >= 0 && item.weight <= 100;
        if (!valid) {
          errors.push(errorRecord(row, `assessmentMethods[${index}]`, "", "Assessment requires only name, description, and a numeric weight from 0 to 100."));
        } else {
          totalWeight += item.weight;
        }
      });
      if (totalWeight > 100) {
        errors.push(errorRecord(row, "assessmentMethods", totalWeight, "Total assessment weight must not exceed 100."));
      }
    }
  }

  if (data.weeklyTopics !== undefined) {
    if (!Array.isArray(data.weeklyTopics)) {
      errors.push(errorRecord(row, "weeklyTopics", "", "weeklyTopics must be a JSON array."));
    } else {
      data.weeklyTopics.forEach((item, index) => {
        const valid = item && typeof item === "object" && !Array.isArray(item) &&
          Object.keys(item).every((key) => ["week", "title", "description"].includes(key)) &&
          Number.isInteger(item.week) && item.week > 0 &&
          typeof item.title === "string" && item.title.trim() &&
          (item.description === undefined || typeof item.description === "string");
        if (!valid) {
          errors.push(errorRecord(row, `weeklyTopics[${index}]`, "", "Weekly topic requires a positive integer week, title, and optional description."));
        }
      });
    }
  }
};

const validateImportFile = async (type, uploadedFile) => {
  const errors = [];
  const warnings = [];
  const preview = [];
  const schema = importSchemas[type];
  const parsedCsv = await parseCsvFile(uploadedFile);
  const csv = type === "teachingActivity" ? normalizeTeachingActivityCsv(parsedCsv) : parsedCsv;
  const { mapping, errors: headerErrors, warnings: headerWarnings } = makeHeaderMapping(type, csv.headers);
  errors.push(...headerErrors);
  warnings.push(...headerWarnings);
  const rows = csv.records.filter((record) =>
    record.values.some((value) => String(value ?? "").trim() !== ""),
  );
  if (!rows.length) {
    errors.push(errorRecord(1, "file", "", "CSV must contain at least one data row."));
  }
  if (rows.length > MAX_ROWS) {
    errors.push(errorRecord(1, "file", "", `CSV exceeds the ${MAX_ROWS} row limit.`));
    return { rows: [], errors, warnings, preview, totalRows: rows.length, validRows: 0, invalidRows: rows.length, maxRowsExceeded: true };
  }
  if (headerErrors.length) {
    return { rows: [], errors, warnings, preview, totalRows: rows.length, validRows: 0, invalidRows: rows.length };
  }

  const validRows = [];
  const seenUniqueKeys = new Set();
  for (const record of rows) {
    const parsed = parseRow(record, mapping, schema, type);
    const data = parsed.rowData;
    normalizeReferenceField(type, data);
    if (type === "courseOutline") validateCourseOutlineArrays(data, record.row, parsed.errors);
    if (type === "teachingActivity") {
      if (record.selectedDays?.length > 1) {
        parsed.errors.push(errorRecord(
          record.row,
          "day",
          record.selectedDays.join(", "),
          `Multiple weekdays are marked Y (${record.selectedDays.join(", ")}); one TeachingActivity can represent only one day.`,
        ));
      }
      const supportedTypes = importSchemas.teachingActivity.Model.schema.path("activityType").enumValues;
      if (data.activityType && !supportedTypes.includes(data.activityType)) {
        parsed.errors.push(errorRecord(
          record.row,
          "activityType",
          data.activityType,
          `Unsupported activity type '${data.activityType}' for existing TeachingActivity schema.`,
        ));
      }
      const supportedPeriods = importSchemas.teachingActivity.Model.schema.path("academicPeriod").enumValues;
      if (data.academicPeriod && !supportedPeriods.includes(data.academicPeriod)) {
        parsed.errors.push(errorRecord(
          record.row,
          "academicPeriod",
          data.academicPeriod,
          `Invalid academic period '${data.academicPeriod}'.`,
        ));
      }
      if (Number.isFinite(data.duration) && data.duration <= 0) {
        parsed.errors.push(errorRecord(record.row, "duration", data.duration, "Duration must be greater than zero."));
      }
    }
    await resolveReferences(type, data, record.row, parsed.errors);

    if (type === "department" || type === "program") {
      if (!data.slug) parsed.errors.push(errorRecord(record.row, "slug", "", "A slug could not be generated from the name."));
    }

    if (!parsed.errors.length) {
      const uniqueKey = uniqueKeyFor(type, data);
      if (uniqueKey && seenUniqueKeys.has(uniqueKey)) {
        parsed.errors.push(errorRecord(record.row, type === "courseOutline" ? "course" : "code/slug", uniqueKey, "Duplicate unique value within this CSV."));
      } else if (uniqueKey) {
        seenUniqueKeys.add(uniqueKey);
      }
    }

    if (!parsed.errors.length) {
      const duplicate = await databaseDuplicate(type, data);
      if (duplicate) {
        parsed.errors.push(errorRecord(record.row, "duplicate", "", "Record already exists in the database."));
      }
    }

    if (!parsed.errors.length) {
      try {
        const document = new schema.Model(data);
        await document.validate();
        const normalized = document.toObject({ versionKey: false });
        validRows.push({ row: record.row, data: normalized });
        if (preview.length < PREVIEW_LIMIT) preview.push({ row: record.row, data: normalized });
      } catch (error) {
        if (error.name === "ValidationError") {
          for (const [field, issue] of Object.entries(error.errors || {})) {
            parsed.errors.push(errorRecord(record.row, field, data[field], issue.message));
          }
        } else {
          throw error;
        }
      }
    }
    errors.push(...parsed.errors);
  }

  return {
    rows: validRows,
    errors,
    warnings,
    preview,
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: rows.length - validRows.length,
    maxRowsExceeded: false,
  };
};

module.exports = {
  ERROR_LIMIT,
  MAX_CELL_LENGTH,
  MAX_ROWS,
  PREVIEW_LIMIT,
  makeHeaderMapping,
  normalizeTeachingActivityCsv,
  normalizeTeachingActivityData,
  parseCell,
  parseCsvFile,
  parseRow,
  sanitizeFilename,
  validateImportFile,
};