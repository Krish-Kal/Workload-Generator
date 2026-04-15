import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    normalizedName: {
      type: String,
      trim: true,
      index: true,
      lowercase: true,
      sparse: true,
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
      index: true,
    },
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    qualifications: [String],
    workloadThreshold: {
      type: Number,
      default: 20,
    },
  },
  { timestamps: true }
);

// Auto-normalize name on save
teacherSchema.pre('save', function (next) {
  if (this.name && !this.normalizedName) {
    this.normalizedName = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '');
  }
  next();
});

const Teacher = mongoose.model('Teacher', teacherSchema);

export default Teacher;

