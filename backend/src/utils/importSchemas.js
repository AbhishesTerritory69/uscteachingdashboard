const Department = require("../models/Department");
const Program = require("../models/Program");
const Faculty = require("../models/Faculty");
const Course = require("../models/Course");
const TeachingActivity = require("../models/TeachingActivity");
const CourseOutline = require("../models/CourseOutline");

const field = (aliases, kind = "string", options = {}) => ({
  aliases,
  kind,
  ...options,
});

const importSchemas = {
  department: {
    Model: Department,
    required: ["name"],
    fields: {
      name: field(["name", "department", "departmentName", "departmentTitle", "unitName"], "string", { required: true }),
      slug: field(["slug", "departmentSlug"]),
      description: field(["description", "departmentDescription", "overview"]),
      shortDescription: field(["shortDescription", "summary"]),
      image: field(["image", "imageUrl", "logo", "logoUrl"]),
      headOfDepartment: field(["headOfDepartment", "headOfDepartmentId", "hodId"] , "facultyReference"),
      isActive: field(["isActive", "active"], "boolean"),
    },
  },
  program: {
    Model: Program,
    required: ["name", "degree", "duration", "department"],
    fields: {
      name: field(["name", "program", "programme", "programName", "programmeName", "programTitle", "courseName"], "string", { required: true }),
      slug: field(["slug", "programSlug"]),
      degree: field(["degree", "degreeType", "qualification"], "string", { required: true }),
      duration: field(["duration", "programDuration", "durationYears"], "string", { required: true }),
      description: field(["description", "programDescription", "overview"]),
      eligibility: field(["eligibility", "entryRequirements", "admissionRequirements"]),
      department: field(["department", "departmentId", "departmentSlug", "departmentName"], "departmentReference", { required: true }),
      image: field(["image", "imageUrl", "logo", "logoUrl"]),
      isActive: field(["isActive", "active"], "boolean"),
    },
  },
  faculty: {
    Model: Faculty,
    required: ["name", "designation"],
    fields: {
      name: field(["name", "fullName", "faculty", "facultyMember", "facultyName", "staff", "staffName", "teacherName"], "string", { required: true }),
      designation: field(["designation", "jobTitle", "position", "rank", "title"], "string", { required: true }),
      qualification: field(["qualification", "highestQualification", "education"]),
      specialization: field(["specialization", "areaOfSpecialization", "expertise"]),
      email: field(["email", "emailAddress"]),
      phone: field(["phone", "phoneNumber", "telephone", "contactNumber"]),
      bio: field(["bio", "biography", "profile"]),
      image: field(["image", "imageUrl", "photo", "photoUrl"]),
      department: field(["department", "departmentId", "departmentSlug", "departmentName"], "departmentReference"),
      isActive: field(["isActive", "active"], "boolean"),
      displayOrder: field(["displayOrder", "sortOrder", "order"], "number"),
    },
  },
  course: {
    Model: Course,
    required: ["code", "name", "department"],
    fields: {
      code: field(["code", "courseCode", "classId", "subjectCode", "unitCode"], "string", { required: true }),
      name: field(["name", "course", "courseName", "className", "classTitle", "courseTitle", "subjectName", "unitName"], "string", { required: true }),
      description: field(["description", "courseDescription", "courseOverview"]),
      department: field(["department", "departmentId", "departmentSlug", "departmentName"], "departmentReference", { required: true }),
      program: field(["program", "programId", "programSlug", "programName"], "programReference"),
      creditHours: field(["creditHours", "credits", "creditUnits"], "number"),
      level: field(["level", "courseLevel", "studyLevel"]),
      status: field(["status", "courseStatus"]),
    },
  },
  teachingActivity: {
    Model: TeachingActivity,
    required: [
      "course",
      "faculty",
      "academicYear",
      "academicPeriod",
      "activityType",
      "day",
      "startTime",
      "endTime",
      "duration",
      "occurrences",
    ],
    fields: {
      course: field(["course", "courseId", "courseCode", "courseName", "courseTitle"], "courseReference", { required: true }),
      faculty: field(["faculty", "facultyId", "facultyEmail", "teachingStaff", "teachingStaffName", "staff", "staffName", "lecturer", "instructor", "teacher"], "facultyReference", { required: true }),
      academicYear: field(["academicYear", "year"], "string", { required: true }),
      academicPeriod: field(["academicPeriod", "trimester", "period"], "string", { required: true }),
      activityType: field(["activityType", "classType", "classTypeName"], "string", { required: true }),
      day: field(["day", "weekday", "dayOfWeek", "dayOfTheWeek"], "string", { required: true }),
      startTime: field(["startTime", "start", "classStart", "classStartTime"], "string", { required: true }),
      endTime: field(["endTime", "end", "finish", "finishTime", "classEnd", "classEndTime"], "string", { required: true }),
      duration: field(["duration", "classDuration", "durationHours", "durationH"], "number", { required: true }),
      occurrences: field(["occurrences", "sessions", "numberOfSessions", "numberOfClasses", "classesPerWeek", "weeks", "numberOfWeeks", "teachingWeeks"], "integer", { required: true }),
      room: field(["room", "roomName", "location", "venue", "classroom"]),
      section: field(["section", "classCode", "classSection"]),
      status: field(["status"]),
    },
  },
  courseOutline: {
    Model: CourseOutline,
    required: ["course", "title", "description"],
    fields: {
      course: field(["course", "courseId", "courseCode", "courseName"], "courseReference", { required: true }),
      title: field(["title", "outlineTitle", "courseOutlineTitle", "outlineName", "moduleTitle"], "string", { required: true }),
      description: field(["description", "outlineDescription", "courseDescription", "overview"], "string", { required: true }),
      learningOutcomes: field(["learningOutcomes", "learningObjectives", "outcomes"], "jsonArray"),
      prerequisites: field(["prerequisites", "prerequisiteCourses"], "jsonArray"),
      assessmentMethods: field(["assessmentMethods", "assessments", "assessment"], "jsonArray"),
      weeklyTopics: field(["weeklyTopics", "topicsByWeek"], "jsonArray"),
      recommendedReadings: field(["recommendedReadings", "readings", "references"], "jsonArray"),
      additionalResources: field(["additionalResources", "resources"], "jsonArray"),
      teachingMethods: field(["teachingMethods", "instructionalMethods"], "jsonArray"),
      attendanceRequirements: field(["attendanceRequirements", "attendancePolicy"]),
      gradingPolicy: field(["gradingPolicy", "assessmentPolicy"]),
      academicYear: field(["academicYear", "year"]),
      academicPeriod: field(["academicPeriod", "trimester", "period"]),
      status: field(["status", "outlineStatus"]),
    },
  },
};

const importTypes = Object.keys(importSchemas);
const normalizeHeader = (header) =>
  header.normalize("NFKC").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const getHeaderMap = (type) => {
  const schema = importSchemas[type];
  const aliases = new Map();
  for (const [name, definition] of Object.entries(schema.fields)) {
    for (const alias of definition.aliases) {
      aliases.set(normalizeHeader(alias), name);
    }
  }
  return aliases;
};

module.exports = { importSchemas, importTypes, normalizeHeader, getHeaderMap };