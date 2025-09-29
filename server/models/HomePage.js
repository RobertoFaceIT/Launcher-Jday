const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: "" },
  lastUpdated: { type: Date, default: Date.now }
});

const homePageSchema = new mongoose.Schema({
  featuresApps: [sectionSchema],   // multiple feature items
  aboutUs: sectionSchema,
  pcSpecs: sectionSchema,
  guide: sectionSchema,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("HomePage", homePageSchema);
