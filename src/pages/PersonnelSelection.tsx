import React, { useState, useEffect } from "react";
import {
  Table,
  Select,
  Input,
  Button,
  Typography,
  Space,
  Modal,
  Tooltip,
  Checkbox,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAuth } from "../AuthContext";
import "../components/PersonnelSelection.css";
import { API_BASE_URL } from "../lib/api-config";

const apiBase = API_BASE_URL;
const getAbsoluteUrl = (url: string) =>
  url && url.startsWith("http") ? url : `${apiBase}${url || ""}`;

const { Option } = Select;
const { Text } = Typography;

interface Submission {
  id: number;
  fullName: string;
  nssNumber: string;
  gender: string;
  email: string;
  placeOfResidence: string;
  phoneNumber: string;
  universityAttended: string;
  regionOfSchool: string;
  yearOfNSS: string;
  divisionPostedTo: string;
  postingLetterUrl: string;
  appointmentLetterUrl: string;
  status: string;
  uploadRejected?: boolean;
  createdAt: string;
  updatedAt: string;
  programStudied: string;
  user: {
    phoneNumber: string;
  };
}

const PersonnelSelection: React.FC = () => {
  const { role } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>(
    [],
  );
  const [programFilter, setProgramFilter] = useState<string>("All courses");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [programs, setPrograms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<{
    url: string;
    type: string;
    id?: number;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [shortlistModalVisible, setShortlistModalVisible] = useState(false);
  const [shortlistedCount, setShortlistedCount] = useState<number>(0);
  const [departments, setDepartments] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
    null,
  );
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectUploadVisible, setRejectUploadVisible] = useState(false);
  const [rejectUploadReason, setRejectUploadReason] = useState("");
  const [rejectUploadIds, setRejectUploadIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchShortlistedCount = async () => {
      try {
        const response = await fetch(
          `${apiBase}/users/submission-status-counts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              statuses: ["PENDING_ENDORSEMENT"],
            }),
          },
        );
        const data = await response.json();
        if (response.ok) {
          setShortlistedCount(data.PENDING_ENDORSEMENT || 0);
        } else {
          toast.error(data.message || "Failed to load shortlisted count");
        }
      } catch (error) {
        toast.error("Failed to load shortlisted count");
      }
    };
    if (role && ["ADMIN", "STAFF"].includes(role)) {
      fetchShortlistedCount();
    }
  }, [role]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBase}/users/submissions`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data: Submission[] = await response.json();
        if (response.ok) {
          const pendingSubmissions = data.filter(
            (s) => s.status === "PENDING" && !s.uploadRejected,
          );
          setSubmissions(pendingSubmissions);
          setFilteredSubmissions(pendingSubmissions);
          const uniquePrograms = Array.from(
            new Set(data.map((s: Submission) => s.programStudied)),
          );
          setPrograms(["All courses", ...uniquePrograms]);
        } else {
          toast.error((data as any).message || "Failed to load submissions");
        }
      } catch (error) {
        toast.error("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  useEffect(() => {
    let filtered = submissions;
    if (programFilter !== "All courses") {
      filtered = filtered.filter((s) => s.programStudied === programFilter);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.fullName.toLowerCase().includes(lowerSearch) ||
          s.nssNumber.toLowerCase().includes(lowerSearch) ||
          s.email.toLowerCase().includes(lowerSearch) ||
          s.universityAttended.toLowerCase().includes(lowerSearch),
      );
    }
    setFilteredSubmissions(filtered);
    setSelectedRows([]);
  }, [programFilter, searchTerm, submissions]);

  const handleSelectAll = () => {
    if (selectedRows.length === filteredSubmissions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredSubmissions.map((s) => s.id));
    }
  };

  const handleRowSelect = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const exportToExcel = () => {
    const exportData = (
      selectedRows.length > 0
        ? filteredSubmissions.filter((s) => selectedRows.includes(s.id))
        : filteredSubmissions
    ).map((s) => ({
      ID: s.id,
      "Full Name": s.fullName,
      "NSS Number": s.nssNumber,
      Email: s.email,
      Gender: s.gender,
      "Place of Residence": s.placeOfResidence,
      "Phone Number": s.phoneNumber,
      "University Attended": s.universityAttended,
      "Region of School": s.regionOfSchool,
      "Year of NSS": s.yearOfNSS,
      "Program Studied": s.programStudied,
      "Division Posted To": s.divisionPostedTo,
      "Posting & Appointment Letter URL":
        s.appointmentLetterUrl || s.postingLetterUrl,
      Status: s.status,
      "Created At": s.createdAt,
      "Updated At": s.updatedAt,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "personnel_submissions.xlsx");
  };

  // Handle letter view
  const showLetter = (url: string, type: string, id?: number) => {
    setModalContent({ url, type, id });
    setModalVisible(true);
  };

  const handleDownload = () => {
    if (modalContent?.url) {
      const fileUrl = getAbsoluteUrl(modalContent.url);
      window.open(fileUrl, "_blank");
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${apiBase}/users/departments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setDepartments(data);
        } else {
          toast.error(data.message || "Failed to load departments");
        }
      } catch (error) {
        toast.error("Failed to load departments");
      }
    };
    fetchDepartments();
  }, []);

  const handleShortlistConfirm = async () => {
    if (!selectedDepartment) {
      toast.error("Please select a department");
      return;
    }
    const waitingForReplacement = submissions.filter(
      (s) => selectedRows.includes(s.id) && s.uploadRejected,
    );
    if (waitingForReplacement.length > 0) {
      toast.error(
        "A selected letter was rejected and is waiting for a new PDF",
      );
      return;
    }
    setLoading(true);
    try {
      const updatePromises = selectedRows.map(async (id) => {
        const response = await fetch(`/users/update-submission-status/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ status: "PENDING_ENDORSEMENT" }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update status");
        }
        return id;
      });

      const updatedSubmissionIds = await Promise.all(updatePromises);

      const assignResponse = await fetch(
        "/users/assign-personnel-to-department",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            departmentId: selectedDepartment,
            submissionIds: updatedSubmissionIds,
          }),
        },
      );

      if (!assignResponse.ok) {
        const errorData = await assignResponse.json();
        throw new Error(
          errorData.message || "Failed to assign personnel to department",
        );
      }

      setSubmissions((prev) =>
        prev.filter((s) => !selectedRows.includes(s.id)),
      );
      setFilteredSubmissions((prev) =>
        prev.filter((s) => !selectedRows.includes(s.id)),
      );
      setShortlistedCount((prev) => prev + selectedRows.length);
      setSelectedRows([]);
      setShortlistModalVisible(false);
      setSelectedDepartment(null);
      toast.success(
        `${selectedRows.length} personnel shortlisted and assigned to department`,
      );
      window.location.reload();
    } catch (error: any) {
      toast.error(
        error.message ||
          "Failed to shortlist personnel or assign to department",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    setLoading(true);
    try {
      const updatePromises = selectedRows.map(async (id) => {
        const response = await fetch(`/users/update-submission-status/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            status: "REJECTED",
            comment: "Rejected from personnel selection",
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to reject personnel");
        }
        return id;
      });

      await Promise.all(updatePromises);

      setSubmissions((prev) =>
        prev.filter((s) => !selectedRows.includes(s.id)),
      );
      setFilteredSubmissions((prev) =>
        prev.filter((s) => !selectedRows.includes(s.id)),
      );
      setSelectedRows([]);
      setRejectModalVisible(false);
      toast.success(`${selectedRows.length} personnel rejected successfully`);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject personnel");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUpload = async () => {
    if (rejectUploadReason.trim().length < 5) {
      toast.error("Enter a reason of at least 5 characters");
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        rejectUploadIds.map(async (id) => {
          const response = await fetch(`${apiBase}/users/reject-upload/${id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              target: "letter",
              reason: rejectUploadReason.trim(),
            }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to reject upload");
          }
        }),
      );
      toast.success("Upload rejected. The personnel has been emailed.");
      setRejectUploadVisible(false);
      setRejectUploadReason("");
      setModalVisible(false);
      setSelectedRows([]);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject upload");
    } finally {
      setLoading(false);
    }
  };

  if (role !== "ADMIN" && role !== "STAFF") {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-lg text-[#3C3939]">Access restricted.</Text>
      </div>
    );
  }

  const truncateText = (text: string, maxLength: number = 15) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  const columns = [
    {
      title: (
        <Checkbox
          checked={
            selectedRows.length === filteredSubmissions.length &&
            filteredSubmissions.length > 0
          }
          indeterminate={
            selectedRows.length > 0 &&
            selectedRows.length < filteredSubmissions.length
          }
          onChange={handleSelectAll}
        />
      ),
      key: "selection",
      width: 10,
      render: (_: any, record: Submission) => (
        <Checkbox
          checked={selectedRows.includes(record.id)}
          onChange={() => handleRowSelect(record.id)}
        />
      ),
    },
    {
      title: "Name",
      dataIndex: "fullName",
      key: "fullName",
      width: 120,
      ellipsis: true,
    },
    {
      title: "NSS No.",
      dataIndex: "nssNumber",
      key: "nssNumber",
      width: 100,
      ellipsis: true,
    },
    // {
    //   title: 'Email',
    //   dataIndex: 'email',
    //   key: 'email',
    //   width: 100,
    //   render: (text: string) => (
    //     <Tooltip title={text}>
    //       <span>{truncateText(text)}</span>
    //     </Tooltip>
    //   ),
    // },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      width: 80,
    },
    {
      title: "Phone",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      width: 110,
      ellipsis: true,
    },
    // {
    //   title: 'Region',
    //   dataIndex: 'regionOfSchool',
    //   key: 'regionOfSchool',
    //   width: 100,
    //   render: (text: string) => (
    //     <Tooltip title={text}>
    //       <span>{truncateText(text)}</span>
    //     </Tooltip>
    //   ),
    // },
    {
      title: "Division",
      dataIndex: "divisionPostedTo",
      key: "divisionPostedTo",
      width: 130,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{truncateText(text)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 80,
      ellipsis: true,
      render: (status: string) => (
        <span className={`status-${status.toLowerCase()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      title: "Posting & Appt. Letter",
      key: "appointmentLetterUrl",
      width: 160,
      ellipsis: true,
      render: (_: any, record: Submission) => {
        const letterUrl =
          record.appointmentLetterUrl || record.postingLetterUrl;
        return letterUrl ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Button
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                showLetter(
                  letterUrl,
                  "Posting & Appointment Letter",
                  record.id,
                );
              }}
              icon={
                <EyeOutlined style={{ fontSize: "16px", color: "#5B3418" }} />
              }
            />
            {record.uploadRejected && (
              <span className="text-xs text-[#c95757]">Rejected</span>
            )}
          </div>
        ) : (
          ""
        );
      },
    },
  ];

  return (
    <div className="flex flex-col min-h-screen px-2 py-4">
      <div className="w-full max-w-full mx-auto">
        <h2 className="text-xl font-bold text-[#3C3939] mb-4 text-center">
          Shortlist Personnel
        </h2>
        <div className="flex flex-col sm:flex-row justify-between mb-3 gap-2">
          <Space>
            <Text className="text-base font-semibold text-[#5B3418] bg-amber-100 px-3 py-1 rounded-md">
              Total Shortlisted: {shortlistedCount}
            </Text>
            {selectedRows.length > 0 && (
              <Space>
                <Text>{`${selectedRows.length} selected`}</Text>
                {role === "ADMIN" && (
                  <>
                    <Button
                      type="primary"
                      onClick={() => setShortlistModalVisible(true)}
                      className="!bg-[#5B3418] hover:!bg-[#4a2c1c] !border-0"
                    >
                      Shortlist
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => setRejectModalVisible(true)}
                      className="!bg-[#c95757] hover:!bg-[#b34646] !border-0"
                      icon={<FileExcelOutlined />}
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  type="primary"
                  onClick={() => {
                    setRejectUploadIds(selectedRows);
                    setRejectUploadReason("");
                    setRejectUploadVisible(true);
                  }}
                  className="!bg-[#8a5a2b] hover:!bg-[#6b3e1d] !border-0"
                >
                  Reject upload
                </Button>
              </Space>
            )}
            <Select
              value={programFilter}
              onChange={setProgramFilter}
              className="rounded-md w-fit sm:w-48"
              placeholder="Filter by program"
            >
              {programs.map((program) => (
                <Option key={program} value={program}>
                  {program}
                </Option>
              ))}
            </Select>
          </Space>
          <Space className="w-full sm:w-auto">
            <Input
              placeholder="Search by name, NSS, email, or university"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              className="rounded-md border-[#a9a7a7] w-full sm:w-auto"
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={exportToExcel}
              className="export-button !border-amber-50 w-full sm:w-auto"
            >
              Export
            </Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredSubmissions}
          rowKey="id"
          loading={loading}
          className="rounded-md"
          scroll={{ x: "max-content" }}
          size="large"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: (event) => {
              if (
                !(event.target as HTMLElement).closest(
                  ".ant-btn, .ant-checkbox",
                )
              ) {
                handleRowSelect(record.id);
              }
            },
          })}
        />
        <Modal
          title={modalContent?.type}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={[
            <Button
              key="download"
              className="!bg-[#5B3418] !border-0"
              type="default"
              onClick={handleDownload}
            >
              Download
            </Button>,
            modalContent?.id && (
              <Button
                key="reject-upload"
                className="!bg-[#8a5a2b] !border-0"
                type="primary"
                onClick={() => {
                  setRejectUploadIds([modalContent.id as number]);
                  setRejectUploadReason("");
                  setRejectUploadVisible(true);
                }}
              >
                Reject upload
              </Button>
            ),
            <Button
              key="close"
              className="!bg-[#c95757] !border-0"
              onClick={() => setModalVisible(false)}
            >
              Close
            </Button>,
          ].filter(Boolean)}
          width={800}
          className="centered-modal"
        >
          {modalContent?.url && (
            <iframe
              src={getAbsoluteUrl(modalContent.url)}
              style={{ width: "100%", height: "80vh", border: "none" }}
              title={modalContent.type}
            />
          )}
        </Modal>
        <Modal
          title="Confirm Shortlist"
          open={shortlistModalVisible}
          onOk={handleShortlistConfirm}
          onCancel={() => {
            setShortlistModalVisible(false);
            setSelectedDepartment(null);
          }}
          okText="Confirm"
          cancelText="Cancel"
          okButtonProps={{
            className: "!bg-[#5B3418] !text-white !border-0",
            disabled: !selectedDepartment,
          }}
          cancelButtonProps={{ className: "!bg-[#c95757] !border-0" }}
        >
          <div className="flex flex-col gap-4">
            <p>
              Are you sure you want to shortlist {selectedRows.length}{" "}
              personnel?
            </p>
            <div className="flex justify-between items-center">
              <div className="w-1/3">
                <Select
                  showSearch
                  placeholder="Select a department"
                  value={selectedDepartment}
                  onChange={(value) => setSelectedDepartment(value)}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)
                      ?.toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  className="w-full"
                >
                  {departments.map((dept) => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </Modal>
        <Modal
          title="Confirm Rejection"
          open={rejectModalVisible}
          onOk={handleRejectConfirm}
          onCancel={() => setRejectModalVisible(false)}
          okText="Confirm"
          cancelText="Cancel"
          okButtonProps={{ className: "!bg-[#5B3418] !text-white !border-0" }}
          cancelButtonProps={{ className: "!bg-[#c95757] !border-0" }}
        >
          <p>
            Are you sure you want to reject {selectedRows.length} personnel?
            This action will notify them to do reposting.
          </p>
        </Modal>
        <Modal
          title="Reject this upload"
          open={rejectUploadVisible}
          onOk={handleRejectUpload}
          onCancel={() => setRejectUploadVisible(false)}
          okText="Reject and email"
          cancelText="Cancel"
          confirmLoading={loading}
          okButtonProps={{ className: "!bg-[#8a5a2b] !border-0" }}
          cancelButtonProps={{ className: "!bg-[#c95757] !border-0" }}
        >
          <p className="mb-2">
            Use this when the PDF is the wrong document. The personnel keeps
            their account, receives an email, and can upload a new PDF.
          </p>
          <Input.TextArea
            rows={4}
            value={rejectUploadReason}
            onChange={(e) => setRejectUploadReason(e.target.value)}
            placeholder="Say what is wrong with the document"
          />
        </Modal>
      </div>
    </div>
  );
};

export default PersonnelSelection;
