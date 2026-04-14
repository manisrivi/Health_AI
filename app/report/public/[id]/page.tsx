import mongoose from "mongoose";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Patient from "@/models/Patient";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PublicReportPage({ params }: PageProps) {
  const { id } = await params;

  await connectDB();

  // Validate Mongo ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return notFound();
  }

  const patient = await Patient.findById(id).lean();

  if (!patient) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-xl p-6">

        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-6">
          🏥 Health Report Summary
        </h1>

        {/* Patient Info */}
        <div className="mb-6 space-y-1">
          <p><strong>Name:</strong> {patient.name}</p>
          <p><strong>Age:</strong> {patient.age}</p>
          <p><strong>Gender:</strong> {patient.gender}</p>
        </div>

        {/* Risk Level */}
        <div className="mb-6">
          <span className="font-semibold">Risk Level: </span>
          <span
            className={`px-3 py-1 rounded-full text-white text-sm ${
              patient.riskLevel === "High"
                ? "bg-red-500"
                : patient.riskLevel === "Medium"
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
          >
            {patient.riskLevel || "Low"}
          </span>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">🧠 Summary</h2>
          <p className="text-gray-700 leading-relaxed">
            {patient.aiSummary || "No summary available"}
          </p>
        </div>

        {/* Issues */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">⚠️ Key Issues</h2>
          <ul className="list-disc pl-5 text-gray-700">
            {patient.issues?.length ? (
              patient.issues.map((issue: string, i: number) => (
                <li key={i}>{issue}</li>
              ))
            ) : (
              <li>No issues found</li>
            )}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">💡 Recommendations</h2>
          <ul className="list-disc pl-5 text-gray-700">
            {patient.recommendations?.length ? (
              patient.recommendations.map((rec: string, i: number) => (
                <li key={i}>{rec}</li>
              ))
            ) : (
              <li>No recommendations available</li>
            )}
          </ul>
        </div>

        {/* Report Link */}
        <div className="mb-6">
          <a
            href={patient.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            📄 View Original Report
          </a>
        </div>

        {/* Disclaimer */}
        <div className="text-sm text-gray-500 border-t pt-4">
          ⚠️ This is an AI-generated report. Please consult a doctor for medical advice.
        </div>

      </div>
    </div>
  );
}
