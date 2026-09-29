const Course = require("../models/Course");
const Department = require("../models/Department");
const Faculty = require("../models/Faculty");
const TeachingActivity = require("../models/TeachingActivity");
const Program = require("../models/Program");
const {
  handleControllerError,
  isValidObjectId,
  sendError,
} = require("../utils/controllerHelpers");

const academicPeriods = ["Trimester 1", "Trimester 2", "Trimester 3"];
const activityCollection = TeachingActivity.collection.name;
const courseCollection = Course.collection.name;
const facultyCollection = Faculty.collection.name;
const departmentCollection = Department.collection.name;
const programCollection = Program.collection.name;

const courseDetailsLookup = (localField) => ({
  $lookup: {
    from: courseCollection,
    localField,
    foreignField: "_id",
    pipeline: [
      {
        $lookup: {
          from: departmentCollection,
          localField: "department",
          foreignField: "_id",
          as: "departmentDetails",
        },
      },
      {
        $lookup: {
          from: programCollection,
          localField: "program",
          foreignField: "_id",
          as: "programDetails",
        },
      },
      {
        $set: {
          departmentDetails: { $arrayElemAt: ["$departmentDetails", 0] },
          programDetails: { $arrayElemAt: ["$programDetails", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          code: 1,
          name: 1,
          department: {
            $cond: [
              { $ifNull: ["$departmentDetails._id", false] },
              {
                _id: "$departmentDetails._id",
                name: "$departmentDetails.name",
                slug: "$departmentDetails.slug",
              },
              null,
            ],
          },
          program: {
            $cond: [
              { $ifNull: ["$programDetails._id", false] },
              {
                _id: "$programDetails._id",
                name: "$programDetails.name",
                slug: "$programDetails.slug",
                degree: "$programDetails.degree",
              },
              null,
            ],
          },
        },
      },
    ],
    as: "courseDetails",
  },
});

const getAcademicFilter = (query, res) => {
  const filter = {};
  if (query.academicYear !== undefined) {
    if (
      typeof query.academicYear !== "string" ||
      !/^\d{4}(?:-\d{4})?$/.test(query.academicYear)
    ) {
      sendError(res, 400, "Invalid academicYear value.");
      return null;
    }
    filter.academicYear = query.academicYear;
  }
  if (query.academicPeriod !== undefined) {
    if (!academicPeriods.includes(query.academicPeriod)) {
      sendError(res, 400, "Invalid academicPeriod value.");
      return null;
    }
    filter.academicPeriod = query.academicPeriod;
  }
  return filter;
};

const activitySummaryPipeline = (filter) => [
  { $match: filter },
  {
    $group: {
      _id: null,
      activities: { $sum: 1 },
      hours: { $sum: "$teachingHours" },
      facultyIds: { $addToSet: "$faculty" },
      courseIds: { $addToSet: "$course" },
    },
  },
];

const dashboardSummary = async (req, res) => {
  try {
    const activityFilter = getAcademicFilter(req.query, res);
    if (!activityFilter) return;

    const [activityRows, totalFaculty, activeFaculty, totalCourses, activeCourses] =
      await Promise.all([
        TeachingActivity.aggregate(activitySummaryPipeline(activityFilter)),
        Faculty.countDocuments({}),
        Faculty.countDocuments({ isActive: true }),
        Course.countDocuments({}),
        Course.countDocuments({ status: "active" }),
      ]);
    const aggregate = activityRows[0] || {
      activities: 0,
      hours: 0,
      facultyIds: [],
      courseIds: [],
    };
    const [facultyWithAllocation, coursesAllocated] = await Promise.all([
      aggregate.facultyIds.length
        ? Faculty.countDocuments({
            _id: { $in: aggregate.facultyIds },
            isActive: true,
          })
        : 0,
      aggregate.courseIds.length
        ? Course.countDocuments({
            _id: { $in: aggregate.courseIds },
          })
        : 0,
    ]);

    return res.json({
      success: true,
      data: {
        faculty: {
          total: totalFaculty,
          active: activeFaculty,
          withAllocation: facultyWithAllocation,
          withoutAllocation: activeFaculty - facultyWithAllocation,
        },
        courses: {
          total: totalCourses,
          active: activeCourses,
          allocated: coursesAllocated,
          unallocated: activeCourses - coursesAllocated,
        },
        teaching: {
          activities: aggregate.activities,
          hours: aggregate.hours || 0,
        },
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const parseWorkloadSort = (value, res) => {
  const requested = value === undefined ? "name" : value;
  if (typeof requested !== "string") {
    sendError(res, 400, "sort must be name, teachingHours, or courseCount.");
    return null;
  }
  const descending = requested.startsWith("-");
  const field = descending ? requested.slice(1) : requested;
  const fields = {
    name: "faculty.name",
    teachingHours: "teachingHours",
    courseCount: "courseCount",
  };
  if (!fields[field]) {
    sendError(res, 400, "sort must be name, teachingHours, or courseCount.");
    return null;
  }
  return { [fields[field]]: descending ? -1 : 1, "faculty.id": 1 };
};

const workloadSummary = async (req, res) => {
  try {
    const activityFilter = getAcademicFilter(req.query, res);
    if (!activityFilter) return;
    const sort = parseWorkloadSort(req.query.sort, res);
    if (!sort) return;

    const data = await Faculty.aggregate([
      {
        $lookup: {
          from: activityCollection,
          let: { facultyId: "$_id" },
          pipeline: [
            {
              $match: {
                ...activityFilter,
                $expr: { $eq: ["$faculty", "$$facultyId"] },
              },
            },
            {
              $group: {
                _id: null,
                activityCount: { $sum: 1 },
                teachingHours: { $sum: "$teachingHours" },
                courseIds: { $addToSet: "$course" },
              },
            },
          ],
          as: "activitySummary",
        },
      },
      {
        $lookup: {
          from: departmentCollection,
          localField: "department",
          foreignField: "_id",
          as: "departmentDetails",
        },
      },
      {
        $set: {
          activitySummary: {
            $ifNull: [{ $arrayElemAt: ["$activitySummary", 0] }, {}],
          },
          departmentDetails: { $arrayElemAt: ["$departmentDetails", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          faculty: {
            id: "$_id",
            name: "$name",
            designation: "$designation",
            department: {
              $cond: [
                { $ifNull: ["$departmentDetails._id", false] },
                {
                  id: "$departmentDetails._id",
                  name: "$departmentDetails.name",
                },
                null,
              ],
            },
          },
          activityCount: { $ifNull: ["$activitySummary.activityCount", 0] },
          teachingHours: { $ifNull: ["$activitySummary.teachingHours", 0] },
          courseCount: {
            $size: { $ifNull: ["$activitySummary.courseIds", []] },
          },
        },
      },
      { $sort: sort },
    ]);
    return res.json({ success: true, data });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const facultyWorkload = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.facultyId))
      return sendError(res, 400, "Invalid faculty ID.");
    const activityFilter = getAcademicFilter(req.query, res);
    if (!activityFilter) return;

    const faculty = await Faculty.findById(req.params.facultyId)
      .populate("department", "name slug")
      .lean();
    if (!faculty) return sendError(res, 404, "Faculty member not found.");

    const [result] = await TeachingActivity.aggregate([
      { $match: { ...activityFilter, faculty: faculty._id } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                activityCount: { $sum: 1 },
                teachingHours: { $sum: "$teachingHours" },
                courseIds: { $addToSet: "$course" },
              },
            },
            {
              $project: {
                _id: 0,
                activityCount: 1,
                teachingHours: 1,
                courseCount: { $size: "$courseIds" },
              },
            },
          ],
          courses: [
            {
              $group: {
                _id: "$course",
                activityCount: { $sum: 1 },
                teachingHours: { $sum: "$teachingHours" },
              },
            },
            courseDetailsLookup("_id"),
            { $unwind: { path: "$courseDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                course: {
                  _id: "$courseDetails._id",
                  id: "$_id",
                  code: "$courseDetails.code",
                  name: "$courseDetails.name",
                  department: "$courseDetails.department",
                  program: "$courseDetails.program",
                },
                activityCount: 1,
                teachingHours: 1,
              },
            },
            { $sort: { "course.code": 1 } },
          ],
          activities: [
            { $sort: { academicYear: -1, academicPeriod: 1, day: 1, startTime: 1 } },
            courseDetailsLookup("course"),
            { $unwind: { path: "$courseDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                course: {
                  _id: "$courseDetails._id",
                  id: "$courseDetails._id",
                  code: "$courseDetails.code",
                  name: "$courseDetails.name",
                  department: "$courseDetails.department",
                  program: "$courseDetails.program",
                },
                academicYear: 1,
                academicPeriod: 1,
                activityType: 1,
                day: 1,
                startTime: 1,
                endTime: 1,
                duration: 1,
                occurrences: 1,
                teachingHours: 1,
                room: 1,
                section: 1,
                status: 1,
              },
            },
          ],
        },
      },
    ]);
    const summary = result?.summary?.[0] || {
      courseCount: 0,
      activityCount: 0,
      teachingHours: 0,
    };
    return res.json({
      success: true,
      data: {
        faculty,
        filters: activityFilter,
        summary,
        courses: result?.courses || [],
        activities: result?.activities || [],
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const courseAllocation = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.courseId))
      return sendError(res, 400, "Invalid course ID.");
    const activityFilter = getAcademicFilter(req.query, res);
    if (!activityFilter) return;

    const course = await Course.findById(req.params.courseId)
      .populate("department", "name slug")
      .populate("program", "name slug degree")
      .lean();
    if (!course) return sendError(res, 404, "Course not found.");

    const [result] = await TeachingActivity.aggregate([
      { $match: { ...activityFilter, course: course._id } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                activityCount: { $sum: 1 },
                teachingHours: { $sum: "$teachingHours" },
              },
            },
            { $project: { _id: 0, activityCount: 1, teachingHours: 1 } },
          ],
          faculty: [
            { $group: { _id: "$faculty" } },
            {
              $lookup: {
                from: facultyCollection,
                localField: "_id",
                foreignField: "_id",
                as: "facultyDetails",
              },
            },
            { $unwind: { path: "$facultyDetails", preserveNullAndEmptyArrays: false } },
            {
              $lookup: {
                from: departmentCollection,
                localField: "facultyDetails.department",
                foreignField: "_id",
                as: "departmentDetails",
              },
            },
            { $unwind: { path: "$departmentDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                id: "$facultyDetails._id",
                name: "$facultyDetails.name",
                designation: "$facultyDetails.designation",
                department: {
                  $cond: [
                    { $ifNull: ["$departmentDetails._id", false] },
                    { id: "$departmentDetails._id", name: "$departmentDetails.name" },
                    null,
                  ],
                },
              },
            },
            { $sort: { name: 1 } },
          ],
          activities: [
            { $sort: { academicYear: -1, academicPeriod: 1, day: 1, startTime: 1 } },
            {
              $lookup: {
                from: facultyCollection,
                localField: "faculty",
                foreignField: "_id",
                as: "facultyDetails",
              },
            },
            { $unwind: { path: "$facultyDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                faculty: {
                  id: "$facultyDetails._id",
                  name: "$facultyDetails.name",
                  designation: "$facultyDetails.designation",
                },
                academicYear: 1,
                academicPeriod: 1,
                activityType: 1,
                day: 1,
                startTime: 1,
                endTime: 1,
                duration: 1,
                occurrences: 1,
                teachingHours: 1,
                room: 1,
                section: 1,
                status: 1,
              },
            },
          ],
        },
      },
    ]);
    return res.json({
      success: true,
      data: {
        course,
        faculty: result?.faculty || [],
        ...(result?.summary?.[0] || { activityCount: 0, teachingHours: 0 }),
        activities: result?.activities || [],
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const departmentWorkload = async (req, res) => {
  try {
    const activityFilter = getAcademicFilter(req.query, res);
    if (!activityFilter) return;
    const data = await Department.aggregate([
      {
        $lookup: {
          from: facultyCollection,
          let: { departmentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$department", "$$departmentId"] } } },
            { $project: { _id: 1 } },
          ],
          as: "facultyIds",
        },
      },
      {
        $lookup: {
          from: courseCollection,
          let: { departmentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$department", "$$departmentId"] } } },
            { $project: { _id: 1 } },
          ],
          as: "courseIds",
        },
      },
      {
        $lookup: {
          from: activityCollection,
          let: { courseIds: "$courseIds._id" },
          pipeline: [
            {
              $match: {
                ...activityFilter,
                $expr: { $in: ["$course", "$$courseIds"] },
              },
            },
            {
              $group: {
                _id: null,
                activityCount: { $sum: 1 },
                teachingHours: { $sum: "$teachingHours" },
              },
            },
          ],
          as: "activitySummary",
        },
      },
      {
        $set: {
          activitySummary: { $arrayElemAt: ["$activitySummary", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          department: { id: "$_id", name: "$name" },
          facultyCount: { $size: "$facultyIds" },
          courseCount: { $size: "$courseIds" },
          activityCount: { $ifNull: ["$activitySummary.activityCount", 0] },
          teachingHours: { $ifNull: ["$activitySummary.teachingHours", 0] },
        },
      },
      { $sort: { "department.name": 1 } },
    ]);
    return res.json({ success: true, data });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const alerts = async (req, res) => {
  try {
    const activityFilter = getAcademicFilter(req.query, res);
    if (!activityFilter) return;
    const [unallocatedCourses, facultyWithoutAllocation] = await Promise.all([
      Course.aggregate([
        { $match: { status: "active" } },
        {
          $lookup: {
            from: activityCollection,
            let: { courseId: "$_id" },
            pipeline: [
              {
                $match: {
                  ...activityFilter,
                  $expr: { $eq: ["$course", "$$courseId"] },
                },
              },
              { $limit: 1 },
            ],
            as: "activities",
          },
        },
        { $match: { "activities.0": { $exists: false } } },
        { $project: { _id: 1, code: 1, name: 1 } },
        { $sort: { code: 1 } },
      ]),
      Faculty.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: activityCollection,
            let: { facultyId: "$_id" },
            pipeline: [
              {
                $match: {
                  ...activityFilter,
                  $expr: { $eq: ["$faculty", "$$facultyId"] },
                },
              },
              { $limit: 1 },
            ],
            as: "activities",
          },
        },
        { $match: { "activities.0": { $exists: false } } },
        { $project: { _id: 1, name: 1 } },
        { $sort: { name: 1 } },
      ]),
    ]);
    const data = [
      ...unallocatedCourses.map((course) => ({
        type: "unallocated_course",
        severity: "warning",
        message: `${course.code} has no matching teaching activities.`,
        resourceId: course._id,
        resourceType: "course",
      })),
      ...facultyWithoutAllocation.map((faculty) => ({
        type: "faculty_without_allocation",
        severity: "info",
        message: `${faculty.name} has no matching teaching activities.`,
        resourceId: faculty._id,
        resourceType: "faculty",
      })),
    ];
    return res.json({ success: true, data });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  alerts,
  courseAllocation,
  dashboardSummary,
  departmentWorkload,
  facultyWorkload,
  workloadSummary,
};