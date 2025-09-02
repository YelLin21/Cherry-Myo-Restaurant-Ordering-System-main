const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    name: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "Anonymous",
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true, 
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
