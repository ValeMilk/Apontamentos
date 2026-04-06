import mongoose from 'mongoose';

const justificationSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  supervisorId: { type: String, index: true }, // Denormalized from employeeId prefix for fast filtering
  day: { type: String, required: true, index: true },
  text: { type: String, required: true },
  attestFile: { type: String, default: null }, // Path to uploaded AT file, e.g. "atestados/uuid.jpg"
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Compound index for supervisor+day queries (Phase 1 optimization)
justificationSchema.index({ supervisorId: 1, day: 1 });

export const Justification = mongoose.model('Justification', justificationSchema);
