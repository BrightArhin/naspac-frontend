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
import EndorsePreview from "../components/EndorsePreview";
import {
  defaultEndorsePlacements,
  type EndorsePlacements,
} from "../components/endorsePlacements";
import { API_BASE_URL, resolveFileUrl } from "../lib/api-config";

const apiBase = API_BASE_URL;
const getAbsoluteUrl = resolveFileUrl;

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
  createdAt: string;
  updatedAt: string;
  programStudied: string;
  uploadRejected?: boolean;
}

const parseEndorsePages = (value: string) => [
  ...new Set(
    value
      .split(/[^0-9]+/)
      .map(Number)
      .filter((page) => page > 0),
  ),
];

const Endorsement: React.FC = () => {
  const { role } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>(
    [],
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    "PENDING_ENDORSEMENT",
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<{
    url: string;
    type: string;
    id?: number;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [shortlistModalVisible, setShortlistModalVisible] = useState(false);
  const [endorsedCount, setEndorsedCount] = useState<number>(0);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [endorsePages, setEndorsePages] = useState("4, 5");
  const [placements, setPlacements] = useState<EndorsePlacements>(
    defaultEndorsePlacements,
  );
  const [endorseIds, setEndorseIds] = useState<number[]>([]);
  const [rejectUploadVisible, setRejectUploadVisible] = useState(false);
  const [rejectUploadReason, setRejectUploadReason] = useState("");
  const [rejectUploadIds, setRejectUploadIds] = useState<number[]>([]);

  // Fetch endorsed count
  useEffect(() => {
    const fetchEndorsedCount = async () => {
      try {
        const response = await fetch("/users/submission-status-counts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            statuses: ["ENDORSED"],
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setEndorsedCount(data.ENDORSED || 0);
        } else {
          toast.error(data.message || "Failed to load endorsed count");
        }
      } catch (error) {
        toast.error("Failed to load endorsed count");
      }
    };
    if (role && ["ADMIN", "SUPERADMIN", "STAFF"].includes(role)) {
      fetchEndorsedCount();
    }
  }, [role]);

  // Fetch submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const response = await fetch("/users/submissions", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data: Submission[] = await response.json();
        if (response.ok) {
          // Filter for PENDING_ENDORSEMENT status only
          const filteredSubmissions = data.filter((s) =>
            ["PENDING_ENDORSEMENT", "ENDORSED"].includes(s.status),
          );
          setSubmissions(filteredSubmissions);
          setFilteredSubmissions(
            statusFilter === "All"
              ? filteredSubmissions
              : filteredSubmissions.filter((s) => s.status === statusFilter),
          );
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

  // Filter and search logic
  useEffect(() => {
    let filtered = submissions;
    if (statusFilter !== "All") {
      filtered = filtered.filter((s) => s.status === statusFilter);
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
  }, [statusFilter, searchTerm, submissions]);

  // Selection handlers
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

  // Export to Excel
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
  const showLetter = (
    url: string,
    type: string,
    id?: number,
    idsToEndorse?: number[],
  ) => {
    setEndorseIds(
      idsToEndorse && idsToEndorse.length ? idsToEndorse : id ? [id] : [],
    );
    setModalContent({ url, type, id });
    setModalVisible(true);
  };

  const beginEndorse = () => {
    const chosen = filteredSubmissions.filter((submission) =>
      selectedRows.includes(submission.id),
    );
    const first = chosen.find(
      (submission) =>
        submission.appointmentLetterUrl || submission.postingLetterUrl,
    );
    if (!first) {
      toast.error(
        "Select a personnel who has a posting and appointment letter.",
      );
      return;
    }
    showLetter(
      first.appointmentLetterUrl || first.postingLetterUrl,
      "Posting & Appointment Letter",
      first.id,
      selectedRows,
    );
  };

  // Handle download
  const handleDownload = () => {
    if (modalContent?.url) {
      const fileUrl = getAbsoluteUrl(modalContent.url);
      window.open(fileUrl, "_blank");
    }
  };

  // Handle endorse action
  const handleEndorse = async () => {
    const ids = endorseIds.length
      ? endorseIds
      : modalContent?.id
        ? [modalContent.id]
        : [];
    if (ids.length === 0) return;
    const pages = parseEndorsePages(endorsePages);
    if (pages.length === 0) {
      toast.error("Enter the page numbers to endorse, for example 4, 5");
      return;
    }
    setLoading(true);
    try {
      for (const id of ids) {
        const response = await fetch("/documents/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            submissionId: id,
            documentType: "appointmentLetter",
            pages,
            placements,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to endorse appointment letter",
          );
        }
      }
      setSubmissions((prev) => prev.filter((s) => !ids.includes(s.id)));
      setFilteredSubmissions((prev) => prev.filter((s) => !ids.includes(s.id)));
      setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)));
      setModalVisible(false);
      setEndorsedCount((prev) => prev + ids.length);
      toast.success(
        ids.length === 1
          ? "Appointment letter endorsed successfully"
          : `${ids.length} appointment letters endorsed`,
      );
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to endorse appointment letter");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk endorse
  const handleShortlistConfirm = async () => {
    const pages = parseEndorsePages(endorsePages);
    if (pages.length === 0) {
      toast.error("Enter the page numbers to endorse, for example 4, 5");
      return;
    }
    setLoading(true);
    try {
      const updatePromises = selectedRows.map(async (id) => {
        const response = await fetch("/documents/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            submissionId: id,
            documentType: "appointmentLetter",
            pages,
            placements,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to endorse appointment letter",
          );
        }
      });

      await Promise.all(updatePromises);

      // Update local state
      setSubmissions((prev) =>
        prev.filter((s) => !selectedRows.includes(s.id)),
      );
      setFilteredSubmissions((prev) =>
        prev.filter((s) => !selectedRows.includes(s.id)),
      );
      setEndorsedCount((prev) => prev + selectedRows.length);
      setSelectedRows([]);
      setShortlistModalVisible(false);
      toast.success(`${selectedRows.length} appointment letters endorsed`);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to endorse appointment letters");
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

  // Restrict to ADMIN
  if (!role || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-lg text-[#3C3939]">Access restricted.</Text>
      </div>
    );
  }

  // Truncate text helper
  const truncateText = (text: string, maxLength: number = 15) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  // Table columns
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
          disabled={statusFilter === "ENDORSED"}
        />
      ),
      key: "selection",
      width: 10,
      render: (_: any, record: Submission) => (
        <Checkbox
          checked={selectedRows.includes(record.id)}
          onChange={() => handleRowSelect(record.id)}
          disabled={statusFilter === "ENDORSED"}
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
      width: 150,
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
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-[#2c241f]">
          Endorse Personnel
        </h2>
        <div className="flex flex-col sm:flex-row justify-between mb-3 gap-2">
          <Space>
            <Text className="text-base font-semibold text-[#5B3418] bg-amber-100 px-3 py-1 rounded-md">
              Total Endorsed: {endorsedCount}
            </Text>
            {selectedRows.length > 0 && statusFilter !== "ENDORSED" && (
              <Space>
                <Text>{`${selectedRows.length} selected`}</Text>
                <Button
                  type="primary"
                  onClick={beginEndorse}
                  className="naspac-btn-primary"
                >
                  Endorse
                </Button>
                <Button
                  type="primary"
                  onClick={() => setRejectModalVisible(true)}
                  className="naspac-btn-danger"
                  icon={<FileExcelOutlined />}
                >
                  Reject
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setRejectUploadIds(selectedRows);
                    setRejectUploadReason("");
                    setRejectUploadVisible(true);
                  }}
                  className="naspac-btn-danger"
                >
                  Reject upload
                </Button>
              </Space>
            )}
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="rounded-md w-fit sm:w-48"
              placeholder="Filter by status"
            >
              <Option value="PENDING_ENDORSEMENT">Pending Endorsement</Option>
              <Option value="ENDORSED">Endorsed</Option>
              {/* <Option value="All">All</Option> */}
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
                ) &&
                statusFilter !== "ENDORSED"
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
              className="naspac-btn-primary"
              type="default"
              onClick={handleDownload}
            >
              Download
            </Button>,
            modalContent?.type === "Posting & Appointment Letter" &&
              statusFilter !== "ENDORSED" && (
                <Button
                  key="endorse"
                  className="naspac-btn-primary"
                  type="primary"
                  onClick={handleEndorse}
                  loading={loading}
                >
                  {endorseIds.length > 1
                    ? `Endorse ${endorseIds.length}`
                    : "Endorse"}
                </Button>
              ),
            modalContent?.type === "Posting & Appointment Letter" &&
              statusFilter !== "ENDORSED" &&
              modalContent.id && (
                <Button
                  key="reject-upload"
                  className="naspac-btn-danger"
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
              className="naspac-btn-secondary"
              onClick={() => setModalVisible(false)}
            >
              Close
            </Button>,
          ].filter(Boolean)}
          width={980}
          className="centered-modal"
        >
          {modalContent?.type === "Posting & Appointment Letter" &&
            statusFilter !== "ENDORSED" && (
              <div className="mb-3">
                <Text className="block mb-1">Pages to endorse</Text>
                <Input
                  value={endorsePages}
                  onChange={(e) => setEndorsePages(e.target.value)}
                  placeholder="4, 5"
                />
                <p className="text-xs text-[#625E5C] mt-1">
                  Page 4 has separate boxes for the date, signature, and stamp.
                  Page 5 has separate boxes for the board name, email, and each
                  phone number.
                  {endorseIds.length > 1
                    ? ` These spots are saved on all ${endorseIds.length} selected letters when you click Endorse.`
                    : " Click Endorse after the boxes are in place."}
                </p>
              </div>
            )}
          {modalContent?.url &&
          modalContent.type === "Posting & Appointment Letter" &&
          statusFilter !== "ENDORSED" ? (
            <EndorsePreview
              fileUrl={getAbsoluteUrl(modalContent.url)}
              pages={
                parseEndorsePages(endorsePages).length
                  ? parseEndorsePages(endorsePages)
                  : [4, 5]
              }
              placements={placements}
              onChange={setPlacements}
            />
          ) : modalContent?.url ? (
            <iframe
              src={getAbsoluteUrl(modalContent.url)}
              style={{ width: "100%", height: "80vh", border: "none" }}
              title={modalContent.type}
            />
          ) : null}
        </Modal>
        <Modal
          title="Confirm Endorsement"
          open={shortlistModalVisible}
          onOk={handleShortlistConfirm}
          onCancel={() => setShortlistModalVisible(false)}
          okText="Confirm"
          cancelText="Cancel"
          okButtonProps={{ className: "naspac-btn-primary" }}
          cancelButtonProps={{ className: "naspac-btn-secondary" }}
        >
          <p>
            Are you sure you want to endorse {selectedRows.length} personnel?
            The date, signature, stamp, and contact lines use the positions from
            the letter preview.
          </p>
          <div className="mt-3">
            <Text className="block mb-1">Pages to endorse</Text>
            <Input
              value={endorsePages}
              onChange={(e) => setEndorsePages(e.target.value)}
              placeholder="4, 5"
            />
          </div>
        </Modal>
        <Modal
          title="Reject this upload"
          open={rejectUploadVisible}
          onOk={handleRejectUpload}
          onCancel={() => setRejectUploadVisible(false)}
          okText="Reject and email"
          cancelText="Cancel"
          confirmLoading={loading}
          okButtonProps={{ className: "naspac-btn-danger" }}
          cancelButtonProps={{ className: "naspac-btn-secondary" }}
        >
          <p className="mb-2">
            The personnel keeps their account. They receive an email and can
            upload the correct PDF.
          </p>
          <Input.TextArea
            rows={4}
            value={rejectUploadReason}
            onChange={(e) => setRejectUploadReason(e.target.value)}
            placeholder="Say what is wrong with the document"
          />
        </Modal>
        <Modal
          title="Confirm Rejection"
          open={rejectModalVisible}
          onOk={handleRejectConfirm}
          onCancel={() => setRejectModalVisible(false)}
          okText="Confirm"
          cancelText="Cancel"
          okButtonProps={{ className: "naspac-btn-primary" }}
          cancelButtonProps={{ className: "naspac-btn-secondary" }}
        >
          <p>
            Are you sure you want to reject {selectedRows.length} personnel?
            This action will notify them to do reposting.
          </p>
        </Modal>
      </div>
    </div>
  );
};

export default Endorsement;
