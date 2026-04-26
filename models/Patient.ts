import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  reportUrl: { type: String },
  aiSummary: { type: String },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
  issues: [{ type: String }],
  recommendations: [{ type: String }],
  resultsThatNeedAttention: [
    {
      testName: { type: String },
      result: { type: String },
      normalRange: { type: String },
      status: { type: String },
      whyImportant: { type: String },
    },
  ],
  resultsNeedingAttention: [{ type: String }],
  keyTakeawaysIntro: { type: String },
  keyTakeaways: [{ type: String }],
  keyTakeawaysClosing: { type: String },
  actionPlanTitle: { type: String },
  actionPlanMarkdown: { type: String },
  actionPlan: [{ type: String }],
  finalSummary: { type: String },
  publicToken: { type: String, unique: true, sparse: true },
  status: { type: String, default: 'Processing', enum: ['Processing', 'Completed'] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Patient || mongoose.model('Patient', PatientSchema);