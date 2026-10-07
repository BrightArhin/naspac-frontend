import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Typography, message, Select, Spin, Progress, Alert } from "antd";
import { ClockCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Notifications from "../components/Notifications";

const { Title, Text } = Typography;
const { Option } = Select;

interface PersonnelStatus {
  submissionStatus: string | null;
  completionPercentage: number;
  serviceDays: number;
  uploadRejected?: boolean;
  uploadRejectionReason?: string | null;
  verificationRejected?: boolean;
  verificationRejectionReason?: string | null;
}

interface Department {
  departmentId: number;
  departmentName: string;
  personnelCount: number;
}

interface ReportCounts {
  totalPersonnel: number;
  totalNonPersonnel: number;
  totalDepartments: number;
  statusCounts: {
    // pending: number;
    pendingEndorsement: number;
    endorsed: number;
    validated: number;
    completed: number;
    rejected: number;
  };
  acceptedCount: number;
  personnelByDepartment: Department[];
  onboardedStudentCount: number;
  pendingCount: number;
}

const Home: React.FC = () => {
  const { role, name, isLoading: authLoading, userId } = useAuth();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null,
  );
  const [statusData, setStatusData] = useState<PersonnelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementPreviewUrl, setReplacementPreviewUrl] = useState<string | null>(
    null,
  );
  const [replacementUploading, setReplacementUploading] = useState(false);
  const [replacementUploaded, setReplacementUploaded] = useState(false);

  useEffect(() => {
    return () => {
      if (replacementPreviewUrl) URL.revokeObjectURL(replacementPreviewUrl);
    };
  }, [replacementPreviewUrl]);

  useEffect(() => {
    const hasReloaded = sessionStorage.getItem("reloaded");

    if (!hasReloaded) {
      sessionStorage.setItem("reloaded", "true");
      window.location.reload();
    }
  }, []);

  // Fetch report counts from the endpoint
  useEffect(() => {
    const fetchReportCounts = async () => {
      try {
        const response = await axios.get("/users/reports-counts", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setReportData(response.data);
        if (response.data.personnelByDepartment?.length > 0) {
          setSelectedDepartment(
            response.data.personnelByDepartment[0].departmentName,
          );
        }
        setLoading(false);
      } catch (error) {
        message.error("Failed to fetch report counts");
        setLoading(false);
      }
    };
    fetchReportCounts();
  }, []);

  // Fetch personnel status
  useEffect(() => {
    const fetchPersonnelStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/users/personnel-status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch personnel status");
        }

        const data = await response.json();
        setStatusData({
          submissionStatus: data.submissionStatus || "N/A",
          completionPercentage: data.completionPercentage || 0,
          serviceDays: data.serviceDays || 0,
          uploadRejected: data.uploadRejected,
          uploadRejectionReason: data.uploadRejectionReason,
          verificationRejected: data.verificationRejected,
          verificationRejectionReason: data.verificationRejectionReason,
        });
      } catch (err) {
        setError("Unable to load personnel status");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonnelStatus();
  }, [userId]);

  const clearReplacementPreview = () => {
    setReplacementPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setReplacementFile(null);
  };

  const handleChooseReplacementFile = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("The PDF must be 10MB or smaller");
      return;
    }
    setReplacementPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setReplacementFile(file);
  };

  const handleUploadReplacement = async () => {
    if (!replacementFile) {
      toast.error("Choose the PDF first");
      return;
    }
    const formData = new FormData();
    formData.append(
      "postingAppointmentLetter",
      replacementFile,
      "postingAppointmentLetter.pdf",
    );
    setReplacementUploading(true);
    try {
      const response = await fetch(
        "/users/replace-posting-appointment-letter",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: formData,
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload the letter");
      }
      toast.success("file uploaded successfully");
      setReplacementUploaded(true);
      clearReplacementPreview();
      setStatusData((prev) =>
        prev
          ? {
              ...prev,
              uploadRejected: false,
              uploadRejectionReason: null,
              submissionStatus: "PENDING",
            }
          : prev,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to upload the letter");
    } finally {
      setReplacementUploading(false);
    }
  };

  // Role-based dashboard content
  const renderDashboardContent = () => {
    if (role === "ADMIN" || role === "SUPERADMIN" || role === "STAFF") {
      const dashboardTitle =
        role === "ADMIN" || role === "SUPERADMIN"
          ? "Admin Dashboard"
          : "Assistant Admin Dashboard";

      // Define card data based on role
      const cardData =
        role === "ADMIN" || role === "SUPERADMIN"
          ? [
              {
                title: "Personnel",
                value: reportData?.totalPersonnel || 0,
                icon: "/admin-hero-1.svg",
                route: "/manage-personnel",
              },
              {
                title: "Staff",
                value: reportData?.totalNonPersonnel || 0,
                icon: "/admin-hero-2.svg",
                route: "/staff-management",
              },
              {
                title: "Endorse",
                value: reportData?.statusCounts.pendingEndorsement || 0,
                icon: "/admin-hero-3.svg",
                route: "/endorsement",
              },
              {
                title: "Departments",
                value: reportData?.totalDepartments || 0,
                icon: "/admin-hero-4.svg",
                route: "/dept-placements",
              },
            ]
          : [
              {
                title: "Onboarded",
                value: reportData?.onboardedStudentCount || 0,
                icon: "/admin-hero-1.svg",
                route: "/onboarded",
              },
              {
                title: "Personnel",
                value: reportData?.totalPersonnel || 0,
                icon: "/admin-hero-2.svg",
                route: "/shortlist",
              },
              {
                title: "Manage",
                value: reportData?.acceptedCount || 0,
                icon: "/admin-hero-3.svg",
                route: "/manage-personnel",
              },
              {
                title: "Departments",
                value: reportData?.totalDepartments || 0,
                icon: "/admin-hero-4.svg",
                route: "/dept-placements",
              },
            ];

      return (
        <>
          {/* Section 1: Admin/Assistant Admin Dashboard Cards */}
          <section className="mb-8">
            <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#2c241f] sm:text-2xl">
              {dashboardTitle}
            </h2>
            <p className="mb-5 text-sm text-[#6f655c]">
              National service records for the current year.
            </p>
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
              {cardData.map((card, index) => (
                <button
                  key={index}
                  type="button"
                  className="cursor-pointer rounded-xl border border-[#e6dfd6] bg-white p-5 text-left shadow-[0_1px_2px_rgba(44,36,31,0.04)] transition hover:border-[#d4c6b8]"
                  onClick={() => navigate(card.route)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#6f655c]">{card.title}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#2c241f]">
                        {loading ? "..." : card.value}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f6f1ea]">
                      <img
                        src={card.icon}
                        alt=""
                        className="h-5 w-5 object-contain"
                      />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h3 className="mb-4 text-base font-semibold text-[#2c241f]">
              System Overview
            </h3>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="flex min-h-[220px] flex-col justify-between rounded-xl border border-[#e6dfd6] bg-white p-5 shadow-[0_1px_2px_rgba(44,36,31,0.04)] xl:col-span-5">
                <div>
                  <h4 className="text-sm font-medium text-[#6f655c]">
                    Personnel by Department
                  </h4>
                  <Select
                    value={selectedDepartment}
                    onChange={setSelectedDepartment}
                    className="mt-4 w-full"
                    placeholder="Select Department"
                    loading={loading}
                  >
                    {reportData?.personnelByDepartment?.map((dept) => (
                      <Option
                        key={dept.departmentId}
                        value={dept.departmentName}
                      >
                        {dept.departmentName}
                      </Option>
                    ))}
                  </Select>
                </div>
                <p className="mt-6 text-5xl font-semibold tracking-tight text-[#2c241f] sm:text-6xl">
                  {loading
                    ? "..."
                    : reportData?.personnelByDepartment.find(
                        (dept) => dept.departmentName === selectedDepartment,
                      )?.personnelCount || 0}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-7">
                {[
                  {
                    title: "Pending Selection",
                    value: reportData?.pendingCount || 0,
                  },
                  {
                    title: "Total Selections",
                    value: reportData?.statusCounts.pendingEndorsement || 0,
                  },
                  {
                    title: "Total Endorsed",
                    value: reportData?.acceptedCount || 0,
                  },
                  {
                    title: "Unapproved Submissions",
                    value: reportData?.statusCounts.rejected || 0,
                  },
                ].map((card, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[#e6dfd6] bg-white p-5 shadow-[0_1px_2px_rgba(44,36,31,0.04)]"
                  >
                    <h4 className="text-sm font-medium text-[#6f655c]">
                      {card.title}
                    </h4>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-[#2c241f]">
                      {loading ? "..." : card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Recent Activity with Notifications */}
          <Notifications displayMode="homepage" maxDisplay={3} />
        </>
      );
    }

    // Personnel dashboard
    return (
      <>
        {/* Section 1: Horizontal Card */}
        <section className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-xl border border-[#e6dfd6] bg-white p-6 shadow-[0_1px_2px_rgba(44,36,31,0.04)] sm:p-8">
            <div className="relative z-10 max-w-2xl">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[#8a6844]">
                National Service
              </p>
              <h2 className="mb-2 text-2xl font-semibold tracking-tight text-[#2c241f] sm:text-3xl">
                Welcome, {authLoading ? "Loading..." : name || ""}
              </h2>
              <p className="text-sm text-[#6f655c] sm:text-base">
                {isLoading
                  ? "Loading status..."
                  : statusData?.submissionStatus === "VALIDATED" ||
                      statusData?.submissionStatus === "COMPLETED"
                    ? "Your verification is complete! Enjoy your National Service and make the most of this exciting journey."
                    : "Your service period has not yet started. Here is your dashboard overview."}
              </p>
            </div>
            <img
              src="/ghana-flag.svg"
              alt=""
              className="pointer-events-none absolute right-0 top-0 h-full w-auto object-cover opacity-20"
            />
          </div>
        </section>

        {replacementUploaded && (
          <Alert
            className="mb-6"
            type="success"
            showIcon
            message="file uploaded successfully"
          />
        )}
        {statusData?.uploadRejected && (
          <Alert
            className="mb-6"
            type="warning"
            showIcon
            message="Your posting and appointment letter was not accepted"
            description={
              <div>
                <p className="mb-2">{statusData.uploadRejectionReason}</p>
                <p className="mb-3">
                  Upload the correct PDF. It must be 10MB or smaller.
                </p>
                <input
                  ref={replacementInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleChooseReplacementFile}
                />
                <Button
                  className="naspac-btn-secondary"
                  icon={<UploadOutlined />}
                  onClick={() => replacementInputRef.current?.click()}
                >
                  Choose file
                </Button>
                {replacementFile && replacementPreviewUrl && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm text-[#2c241f]">
                      {replacementFile.name}
                    </p>
                    <iframe
                      title="Letter preview"
                      src={replacementPreviewUrl}
                      className="mb-3 h-[420px] w-full rounded-lg border border-[#e6dfd6] bg-white"
                    />
                    <Button
                      className="naspac-btn-primary"
                      loading={replacementUploading}
                      onClick={handleUploadReplacement}
                    >
                      Upload
                    </Button>
                  </div>
                )}
              </div>
            }
          />
        )}
        {statusData?.verificationRejected && (
          <Alert
            className="mb-6"
            type="warning"
            showIcon
            message="Your verification form was not accepted"
            description={
              statusData.verificationRejectionReason ||
              "Upload the correct PDF from Upload Verification in the menu."
            }
          />
        )}

        {/* Section 2: Analytics */}
        <section className="mb-6 sm:mb-8">
          <Title level={4} style={{ color: "#3C3939", marginBottom: 16 }}>
            Analytics of the Overall Progress
          </Title>
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Status Card */}
            <Card
              className="flex-1"
              bodyStyle={{ padding: "16px 24px" }}
              style={{
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <Title
                    level={5}
                    style={{ color: "#625E5C", marginBottom: 8 }}
                  >
                    Status
                  </Title>
                  <Text
                    style={{
                      color: "#a59f9f",
                      fontSize: "14px",
                      textTransform: "capitalize",
                    }}
                  >
                    {isLoading ? (
                      <Spin size="small" />
                    ) : (
                      statusData?.submissionStatus || "N/A"
                    )}
                  </Text>
                </div>
                <ClockCircleOutlined
                  style={{ fontSize: "24px", color: "#5B3418" }}
                />
              </div>
            </Card>

            {/* Process Completion Card */}
            <Card
              className="flex-1"
              bodyStyle={{ padding: "16px 24px" }}
              style={{
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Title level={5} style={{ color: "#625E5C", marginBottom: 8 }}>
                Process Completion
              </Title>
              <Progress
                percent={isLoading ? 0 : statusData?.completionPercentage || 0}
                status="active"
                strokeColor="#5B3418"
                showInfo={true}
                style={{ marginTop: 8 }}
              />
            </Card>

            {/* Service Days Card */}
            <Card
              className="flex-1"
              bodyStyle={{ padding: "16px 24px" }}
              style={{
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Title level={5} style={{ color: "#625E5C", marginBottom: 8 }}>
                Service Days
              </Title>
              <Text
                strong
                style={{ fontSize: "24px", color: "#5B3418", display: "block" }}
              >
                {isLoading ? (
                  <Spin size="small" />
                ) : (
                  statusData?.serviceDays || 0
                )}
              </Text>
              <Text style={{ fontSize: "14px", color: "#5B3418" }}>
                completed
              </Text>
            </Card>
          </div>
        </section>

        {/* Section 3: Notifications */}
        <Notifications displayMode="full" maxDisplay={3} />
      </>
    );
  };

  return <div className="min-w-0">{renderDashboardContent()}</div>;
};

export default Home;
