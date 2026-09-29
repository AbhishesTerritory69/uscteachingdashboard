require("dotenv").config();

const mongoose = require("mongoose");
const { hashPassword } = require("../src/controllers/authController");
const User = require("../src/models/User");
const Department = require("../src/models/Department");
const Program = require("../src/models/Program");
const Faculty = require("../src/models/Faculty");
const Course = require("../src/models/Course");
const TeachingActivity = require("../src/models/TeachingActivity");
const CourseOutline = require("../src/models/CourseOutline");
const DataSource = require("../src/models/DataSource");

const requiredEnvironment = [
  "PHASE8_TEST_MONGO_URI",
  "PHASE8_TEST_ADMIN_EMAIL",
  "PHASE8_TEST_ADMIN_PASSWORD",
  "PHASE8_TEST_EDITOR_EMAIL",
  "PHASE8_TEST_EDITOR_PASSWORD",
];

class Phase8SetupError extends Error {}

const requireTestConfiguration = () => {
  const missing = requiredEnvironment.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Phase8SetupError(`Missing required test environment values: ${missing.join(", ")}.`);
  }

  const uri = process.env.PHASE8_TEST_MONGO_URI;
  if (uri === process.env.MONGO_URI) {
    throw new Phase8SetupError("The Phase 8 test URI must not equal MONGO_URI.");
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Phase8SetupError("PHASE8_TEST_MONGO_URI is not a valid MongoDB URI.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!/(^|[-_])test($|[-_])/i.test(databaseName)) {
    throw new Phase8SetupError("The Phase 8 database name must contain 'test'.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  if (!isLoopback && process.env.PHASE8_ALLOW_REMOTE_TEST_DB !== "true") {
    throw new Phase8SetupError("Remote test databases require PHASE8_ALLOW_REMOTE_TEST_DB=true.");
  }

  for (const name of ["PHASE8_TEST_ADMIN_PASSWORD", "PHASE8_TEST_EDITOR_PASSWORD"]) {
    if (process.env[name].length < 6) {
      throw new Phase8SetupError(`${name} must be at least 6 characters.`);
    }
  }
  if (process.env.PHASE8_TEST_ADMIN_EMAIL === process.env.PHASE8_TEST_EDITOR_EMAIL) {
    throw new Phase8SetupError("Admin and editor test email addresses must differ.");
  }

  return uri;
};

const createFixtures = async () => {
  const validateOnly = process.env.PHASE8_FIXTURE_VALIDATE_ONLY === "true";
  const uri = validateOnly ? null : requireTestConfiguration();
  if (validateOnly) {
    const missing = requiredEnvironment.slice(1).filter((name) => !process.env[name]);
    if (missing.length) {
      throw new Phase8SetupError(`Missing fixture values: ${missing.join(", ")}.`);
    }
  }

  const models = [
    User,
    Department,
    Program,
    Faculty,
    Course,
    TeachingActivity,
    CourseOutline,
    DataSource,
  ];
  const users = [
    new User({
      name: "Phase 8 Test Admin",
      email: process.env.PHASE8_TEST_ADMIN_EMAIL.trim().toLowerCase(),
      password: hashPassword(process.env.PHASE8_TEST_ADMIN_PASSWORD),
      role: "admin",
    }),
    new User({
      name: "Phase 8 Test Editor",
      email: process.env.PHASE8_TEST_EDITOR_EMAIL.trim().toLowerCase(),
      password: hashPassword(process.env.PHASE8_TEST_EDITOR_PASSWORD),
      role: "editor",
    }),
  ];
  if (users.some((user) => !/^\S+@\S+\.\S+$/.test(user.email))) {
    throw new Phase8SetupError("Test account email values must be valid email addresses.");
  }

  const departments = [
    new Department({ name: "Phase 8 Science", slug: "phase8-science" }),
    new Department({ name: "Phase 8 Biology", slug: "phase8-biology" }),
  ];
  const programs = [
    new Program({ name: "Phase 8 Science Program", slug: "phase8-science-program", degree: "BSc", department: departments[0]._id }),
    new Program({ name: "Phase 8 Biology Program", slug: "phase8-biology-program", degree: "BSc", department: departments[1]._id }),
  ];
  const faculty = [
    new Faculty({ name: "Phase 8 Faculty A", designation: "Lecturer", email: "phase8-faculty-a@example.invalid", department: departments[0]._id, isActive: true }),
    new Faculty({ name: "Phase 8 Faculty B", designation: "Lecturer", email: "phase8-faculty-b@example.invalid", department: departments[0]._id, isActive: true }),
    new Faculty({ name: "Phase 8 Faculty C", designation: "Lecturer", email: "phase8-faculty-c@example.invalid", department: departments[1]._id, isActive: false }),
  ];
  const courses = [
    new Course({ code: "P8SCI101", name: "Phase 8 Science 101", department: departments[0]._id, program: programs[0]._id }),
    new Course({ code: "P8SCI102", name: "Phase 8 Science 102", department: departments[0]._id, program: programs[0]._id }),
    new Course({ code: "P8BIO201", name: "Phase 8 Biology 201", department: departments[1]._id, program: programs[1]._id }),
    new Course({ code: "P8BIO202", name: "Phase 8 Biology 202", department: departments[1]._id, program: programs[1]._id }),
  ];
  const activities = [
    new TeachingActivity({ course: courses[0]._id, faculty: faculty[0]._id, academicYear: "2026", academicPeriod: "Trimester 1", activityType: "lecture", day: "Monday", startTime: "09:00", endTime: "10:30", duration: 1.5, occurrences: 12, status: "scheduled" }),
    new TeachingActivity({ course: courses[0]._id, faculty: faculty[0]._id, academicYear: "2026", academicPeriod: "Trimester 1", activityType: "tutorial", day: "Tuesday", startTime: "11:00", endTime: "12:00", duration: 1, occurrences: 10, status: "cancelled" }),
    new TeachingActivity({ course: courses[1]._id, faculty: faculty[0]._id, academicYear: "2026", academicPeriod: "Trimester 2", activityType: "practical", day: "Wednesday", startTime: "13:00", endTime: "15:00", duration: 2, occurrences: 8, status: "completed" }),
    new TeachingActivity({ course: courses[0]._id, faculty: faculty[1]._id, academicYear: "2026", academicPeriod: "Trimester 2", activityType: "lecture", day: "Thursday", startTime: "15:00", endTime: "16:15", duration: 1.25, occurrences: 8, status: "scheduled" }),
    new TeachingActivity({ course: courses[3]._id, faculty: faculty[1]._id, academicYear: "2025", academicPeriod: "Trimester 3", activityType: "seminar", day: "Friday", startTime: "10:00", endTime: "12:00", duration: 2, occurrences: 5, status: "completed" }),
    new TeachingActivity({ course: courses[2]._id, faculty: faculty[2]._id, academicYear: "2025", academicPeriod: "Trimester 3", activityType: "lecture", day: "Monday", startTime: "14:00", endTime: "15:00", duration: 1, occurrences: 15, status: "cancelled" }),
  ];
  const outlines = [
    new CourseOutline({ course: courses[0]._id, title: "Phase 8 Published Outline", description: "Test fixture", academicYear: "2026", academicPeriod: "Trimester 1", status: "published" }),
    new CourseOutline({ course: courses[1]._id, title: "Phase 8 Draft Outline", description: "Test fixture", academicYear: "2026", academicPeriod: "Trimester 2", status: "draft" }),
    new CourseOutline({ course: courses[2]._id, title: "Phase 8 Archived Outline", description: "Test fixture", academicYear: "2025", academicPeriod: "Trimester 3", status: "archived" }),
  ];
  const dataSources = [
    new DataSource({ name: "Phase 8 CSV Source", key: "phase8-csv-source", type: "csv", format: "csv", createdBy: users[0]._id, updatedBy: users[0]._id }),
    new DataSource({ name: "Phase 8 Inactive Source", key: "phase8-inactive-source", type: "manual", status: "inactive", isActive: false, createdBy: users[0]._id, updatedBy: users[0]._id }),
  ];

  const documents = [users, departments, programs, faculty, courses, activities, outlines, dataSources];
  for (const group of documents) {
    for (const document of group) await document.validate();
  }
  const expectedTeachingHours = [18, 10, 16, 10, 10, 15];
  if (activities.some((activity, index) => activity.teachingHours !== expectedTeachingHours[index])) {
    throw new Phase8SetupError("TeachingActivity fixture hours do not match duration multiplied by occurrences.");
  }

  if (validateOnly) {
    console.log("Phase 8 fixture documents passed in-memory Mongoose validation; no database connection or writes were made.");
    return;
  }

  await mongoose.connect(uri, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 8000,
  });

  for (const Model of models) {
    if (await Model.estimatedDocumentCount()) {
      throw new Phase8SetupError(`Refusing to seed non-empty collection '${Model.collection.name}'.`);
    }
  }

  for (const group of documents) {
    for (const document of group) await document.save();
  }

  console.log("Phase 8 fixtures created in the explicitly configured test database.");
  console.log("Fixture counts: 2 users, 2 departments, 2 programs, 3 faculty, 4 courses, 6 activities, 3 outlines, 2 data sources.");
  console.log("Use PHASE8_TEST_ADMIN_EMAIL/PASSWORD and PHASE8_TEST_EDITOR_EMAIL/PASSWORD locally; credentials were not printed.");
};

createFixtures()
  .catch((error) => {
    if (error instanceof Phase8SetupError) {
      console.error(`Phase 8 fixture setup stopped: ${error.message}`);
    } else {
      console.error(`Phase 8 fixture setup failed: ${error.name || "Error"}. Connection and validation details were omitted.`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });