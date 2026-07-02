import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: false,
    },
    supervisorId: {
      type: String,
      required: false,
    },
    day: {
      type: String, // ISO date string YYYY-MM-DD
      required: true,
    },
    apontador: {
      type: String,
      enum: ['P', 'F', 'FT', 'FM', 'AT', 'ABF', 'ABT', 'FER', 'FERI', 'FOLGA', ''],
      default: '',
    },
    supervisor: {
      type: String,
      enum: ['P', 'F', 'FT', 'FM', 'AT', 'ABF', 'ABT', 'FER', 'FERI', 'FOLGA', ''],
      default: '',
    },
    justifications: [
      {
        code: String,
        reason: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Compound index for unique records per employee/day
attendanceRecordSchema.index({ employeeId: 1, day: 1, supervisorId: 1 }, { unique: true });
// Secondary index for supervisor-filtered queries (Phase 1 optimization)
attendanceRecordSchema.index({ supervisorId: 1, day: 1 });
// Index for fast date range queries (performance optimization)
attendanceRecordSchema.index({ day: 1 });

export const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
