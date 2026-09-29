const fs = require("fs/promises");
const mongoose = require("mongoose");
const ImportJob = require("../models/ImportJob");
const DataSource = require("../models/DataSource");
const {
  getPagination,
  handleControllerError,
  isValidObjectId,
  sendError,
} = require("../utils/controllerHelpers");
const { importSchemas, importTypes } = require("../utils/importSchemas");
const {
  ERROR_LIMIT,
  PREVIEW_LIMIT,
  sanitizeFilename,
  validateImportFile,
} = require("../utils/importPipeline");

const historyStatuses = [
  "uploaded",
  "validated",
  "failed",
  "processing",
  "completed",
  "partially_completed",
];
const listSorts = new Set(["createdAt", "type", "status", "filename"]);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const validateRequestFields = (body, expectedMode, res) => {
  if (!isPlainObject(body)) {
    sendError(res, 400, "Multipart fields are required.");
    return false;
  }
  if (Object.keys(body).some((key) => !["type", "mode", "dataSource"].includes(key))) {
    sendError(res, 400, "Unexpected multipart field.");
    return false;
  }
  if (body.dataSource !== undefined && typeof body.dataSource !== "string") {
    sendError(res, 400, "dataSource must be a scalar ID.");
    return false;
  }
  if (typeof body.type !== "string" || !importTypes.includes(body.type)) {
    sendError(res, 400, "Unsupported import type.", { allowedTypes: importTypes });
    return false;
  }
  if (body.mode !== expectedMode) {
    sendError(res, 400, `mode must be '${expectedMode}'.`);
    return false;
  }
  return true;
};

const resolveDataSource = async (req, res) => {
  const id = req.body.dataSource?.trim();
  if (!id) return true;
  if (!isValidObjectId(id)) {
    sendError(res, 400, "Invalid dataSource ID.");
    return false;
  }
  const dataSource = await DataSource.findById(id).select("type format status isActive").lean();
  if (!dataSource) {
    sendError(res, 404, "Data source not found.");
    return false;
  }
  if (dataSource.status !== "active" || !dataSource.isActive) {
    sendError(res, 409, "Data source is inactive.");
    return false;
  }
  if (dataSource.type === "xlsx" || dataSource.format === "xlsx") {
    sendError(res, 400, "XLSX data sources are not supported by the CSV import system.");
    return false;
  }
  req.dataSource = dataSource;
  return true;
};

const baseJobData = (req, mode) => ({
  type: req.body.type,
  filename: req.file.filename,
  originalFilename: sanitizeFilename(req.file.originalname),
  format: "csv",
  mode,
  ...(req.dataSource ? { dataSource: req.dataSource._id } : {}),
  createdBy: req.user._id,
});

const boundedRecords = (records) => records.slice(0, ERROR_LIMIT);

const parseFailureResult = (error) => {
  let message = "CSV file could not be read.";
  if (error.code === "CSV_RECORD_INCONSISTENT_FIELDS_LENGTH") {
    message = "CSV rows have inconsistent column counts.";
  } else if (typeof error.message === "string" && error.message.startsWith("CSV file ")) {
    message = error.message;
  } else if (typeof error.code === "string" && error.code.startsWith("CSV_") && typeof error.message === "string") {
    message = error.message.slice(0, 500);
  }
  return {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    errors: [{ row: 1, field: "file", value: "", message }],
    warnings: [],
    preview: [],
  };
};

const buildJobFields = (result) => ({
  totalRows: result.totalRows,
  validRows: result.validRows,
  invalidRows: result.invalidRows,
  errorCount: result.errors.length,
  errorsTruncated: result.errors.length > ERROR_LIMIT,
  rowErrors: boundedRecords(result.errors),
  warnings: result.warnings.slice(0, ERROR_LIMIT),
  preview: result.preview.slice(0, PREVIEW_LIMIT),
});

const validationFailure = async (req, result, errorMessage) => {
  const failed = await ImportJob.create({
    ...baseJobData(req, "import"),
    status: "failed",
    ...buildJobFields(result),
    failedRows: result.invalidRows || result.totalRows,
    completedAt: new Date(),
  });
  return failed;
};

const validateUpload = async (req, res) => {
  try {
    if (!validateRequestFields(req.body, "validate", res)) return;
    if (!(await resolveDataSource(req, res))) return;
    if (!req.file) return sendError(res, 400, "A CSV file is required in field 'file'.");

    let result;
    try {
      result = await validateImportFile(req.body.type, req.file);
    } catch (error) {
      result = parseFailureResult(error);
    }

    const hasErrors = result.errors.length > 0 || result.invalidRows > 0;
    return res.json({
      success: true,
      data: {
        importId: null,
        importType: req.body.type,
        filename: sanitizeFilename(req.file.originalname),
        status: hasErrors ? "failed" : "validated",
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        errors: boundedRecords(result.errors),
        errorsTruncated: result.errors.length > ERROR_LIMIT,
        warnings: result.warnings.slice(0, ERROR_LIMIT),
        preview: result.preview.slice(0, PREVIEW_LIMIT),
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  } finally {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
  }
};

const executeImport = async (req, res) => {
  try {
    if (!validateRequestFields(req.body, "import", res)) return;
    if (!(await resolveDataSource(req, res))) return;
    if (!req.file) return sendError(res, 400, "A CSV file is required in field 'file'.");

    let result;
    try {
      result = await validateImportFile(req.body.type, req.file);
    } catch (error) {
      result = parseFailureResult(error);
    }

    if (result.errors.length || result.invalidRows || !result.totalRows) {
      const job = await validationFailure(req, result);
      return sendError(res, 400, "Import validation failed; no records were written.", {
        importId: job._id,
        totalRows: job.totalRows,
        validRows: job.validRows,
        importedRows: 0,
        skippedRows: result.validRows,
        failedRows: result.invalidRows || result.totalRows,
        invalidRows: job.invalidRows,
        errors: job.rowErrors,
        errorsTruncated: job.errorsTruncated,
      });
    }

    const { Model } = importSchemas[req.body.type];
    const startedAt = new Date();
    const jobValues = {
      ...baseJobData(req, "import"),
      status: "processing",
      ...buildJobFields(result),
      startedAt,
    };
    let job = await ImportJob.create(jobValues);
    let importedCount = 0;
    let session;
    try {
      session = await mongoose.startSession();
      await Promise.all([Model.init(), ImportJob.init()]);
      await session.withTransaction(async () => {
        const inserted = await Model.insertMany(
          result.rows.map((row) => row.data),
          { session, ordered: true },
        );
        importedCount = inserted.length;
        await ImportJob.updateOne(
          { _id: job._id },
          {
            $set: {
              status: "completed",
              importedRows: importedCount,
              completedAt: new Date(),
            },
          },
          { session },
        );
      });
      job = await ImportJob.findById(job._id).lean();
    } catch (error) {
      const failureMessage = error.code === 11000
        ? "A duplicate record was detected during import; the transaction was rolled back."
        : "Import transaction failed; no records were committed.";
      await ImportJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: "failed",
            importedRows: 0,
            failedRows: result.totalRows,
            completedAt: new Date(),
            errorCount: 1,
            rowErrors: [{ row: 1, field: "import", value: "", message: failureMessage }],
          },
        },
      );
      if (error.code === 11000) {
        return sendError(res, 409, failureMessage, {
          importId: job._id,
          totalRows: result.totalRows,
          validRows: result.validRows,
          importedRows: 0,
          skippedRows: result.totalRows,
          failedRows: result.totalRows,
          errors: job.rowErrors,
        });
      }
      return sendError(res, 500, failureMessage, {
        importId: job._id,
        totalRows: result.totalRows,
        validRows: result.validRows,
        importedRows: 0,
        skippedRows: result.totalRows,
        failedRows: result.totalRows,
        errors: job.rowErrors,
      });
    } finally {
      if (session) await session.endSession();
    }

    return res.status(201).json({
      success: true,
      data: {
        importId: job._id,
        type: job.type,
        status: job.status,
        totalRows: job.totalRows,
        validRows: job.validRows,
        importedRows: job.importedRows,
        skippedRows: job.skippedRows || 0,
        failedRows: job.failedRows || 0,
        errors: job.rowErrors || [],
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  } finally {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
  }
};

const list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type !== undefined) {
      if (typeof req.query.type !== "string" || !importTypes.includes(req.query.type))
        return sendError(res, 400, "Invalid import type.");
      filter.type = req.query.type;
    }
    if (req.query.status !== undefined) {
      if (typeof req.query.status !== "string" || !historyStatuses.includes(req.query.status))
        return sendError(res, 400, "Invalid import status.");
      filter.status = req.query.status;
    }
    if (req.query.createdBy !== undefined) {
      if (typeof req.query.createdBy !== "string" || !isValidObjectId(req.query.createdBy))
        return sendError(res, 400, "Invalid createdBy ID.");
      filter.createdBy = req.query.createdBy;
    }
    const dateFilter = {};
    for (const [queryField, mongoOperator] of [["createdFrom", "$gte"], ["createdTo", "$lte"]]) {
      if (req.query[queryField] === undefined) continue;
      if (typeof req.query[queryField] !== "string" || Number.isNaN(Date.parse(req.query[queryField])))
        return sendError(res, 400, `Invalid ${queryField} date.`);
      dateFilter[mongoOperator] = new Date(req.query[queryField]);
    }
    if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;

    const sortValue = req.query.sort === undefined ? "-createdAt" : req.query.sort;
    if (typeof sortValue !== "string") return sendError(res, 400, "Invalid sort value.");
    const descending = sortValue.startsWith("-");
    const sortField = descending ? sortValue.slice(1) : sortValue;
    if (!listSorts.has(sortField)) return sendError(res, 400, "Unsupported sort field.");
    const sort = { [sortField]: descending ? -1 : 1, _id: 1 };
    const { page, limit, skip } = getPagination(req.query);
    const [data, total] = await Promise.all([
      ImportJob.find(filter)
        .select("type filename originalFilename format status mode totalRows validRows invalidRows importedRows skippedRows failedRows createdBy dataSource startedAt completedAt createdAt updatedAt")
        .populate("createdBy", "name email role")
        .populate("dataSource", "name key type")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ImportJob.countDocuments(filter),
    ]);
    return res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid import ID.");
    const job = await ImportJob.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate("dataSource", "name key type")
      .lean();
    if (!job) return sendError(res, 404, "Import job not found.");
    const { rowErrors, ...metadata } = job;
    return res.json({
      success: true,
      data: {
        ...metadata,
        errors: rowErrors.slice(0, 20),
        warnings: job.warnings.slice(0, 20),
        preview: job.preview.slice(0, 20),
        errorSampleTruncated: rowErrors.length > 20 || job.errorsTruncated,
        warningSampleTruncated: job.warnings.length > 20,
        previewCount: job.preview.length,
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getErrors = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid import ID.");
    const job = await ImportJob.findById(req.params.id).select("rowErrors errorsTruncated").lean();
    if (!job) return sendError(res, 404, "Import job not found.");
    const { page, limit, skip } = getPagination(req.query);
    const errors = job.rowErrors.slice(skip, skip + limit);
    return res.json({
      success: true,
      data: errors,
      pagination: { page, limit, total: job.rowErrors.length, pages: Math.ceil(job.rowErrors.length / limit) },
      errorsTruncated: job.errorsTruncated,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid import ID.");
    const job = await ImportJob.findByIdAndDelete(req.params.id);
    if (!job) return sendError(res, 404, "Import job not found.");
    return res.json({ success: true, message: "Import history deleted successfully. Imported data was not changed." });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = { executeImport, getById, getErrors, list, remove, validateUpload };